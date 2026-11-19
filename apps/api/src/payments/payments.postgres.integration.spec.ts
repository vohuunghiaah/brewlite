import * as crypto from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { ConflictException, ForbiddenException } from '@nestjs/common';

import { PaymentsService } from './payments.service';
import { MockPaymentGateway } from './mock-payment-gateway.service';
import { Payment, PaymentMethod, PaymentStatus } from './entities/payment.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderItem, ProductSize } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { CreatePaymentDto, PickupMethod } from './dto/create-payment.dto';

describe('PaymentsService - Real PostgreSQL Concurrency & Idempotency Integration Tests (UC-10 / FR-06 / FR-08 / FR-09)', () => {
  let dataSource: DataSource;
  let service: PaymentsService;
  let mockGateway: MockPaymentGateway;
  let paymentRepo: Repository<Payment>;
  let orderRepo: Repository<Order>;
  let orderItemRepo: Repository<OrderItem>;
  let productRepo: Repository<Product>;
  let userRepo: Repository<User>;

  let testUser1: User;
  let testUser2: User;

  beforeAll(async () => {
    // FIX-08: Kết nối thực sự tới PostgreSQL; nếu không kết nối được thì FAIL trực tiếp
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: Number(process.env.POSTGRES_PORT || 5432),
      username: process.env.POSTGRES_USER || 'brewlite',
      password: process.env.POSTGRES_PASSWORD || 'brewlite_dev_password',
      database: process.env.POSTGRES_DB || 'brewlite_test',
      entities: [User, Product, Order, OrderItem, Payment],
      synchronize: false,
    });

    await dataSource.initialize();

    // Đồng bộ cấu trúc schema trên database kiểm thử để sẵn sàng cho các test concurrency
    await dataSource.synchronize();

    paymentRepo = dataSource.getRepository(Payment);
    orderRepo = dataSource.getRepository(Order);
    orderItemRepo = dataSource.getRepository(OrderItem);
    productRepo = dataSource.getRepository(Product);
    userRepo = dataSource.getRepository(User);

    mockGateway = new MockPaymentGateway();
    service = new PaymentsService(paymentRepo, orderRepo, productRepo, dataSource, mockGateway);

    // Tạo test users cho kiểm thử thực tế
    const email1 = `test-pg-user1-${Date.now()}@brewlite.vn`;
    const email2 = `test-pg-user2-${Date.now()}@brewlite.vn`;

    testUser1 = await userRepo.save(
      userRepo.create({
        email: email1,
        passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
      }),
    );

    testUser2 = await userRepo.save(
      userRepo.create({
        email: email2,
        passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
      }),
    );
  }, 30000);

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(() => {
    mockGateway.clear();
  });

  // Helper tạo sản phẩm và đơn hàng thực tế trong PostgreSQL
  async function createTestProductAndOrder(initialStock: number, quantity: number, user = testUser1) {
    const product = await productRepo.save(
      productRepo.create({
        name: `Test Drink ${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        price: '40000.00',
        stock: initialStock,
        version: 1,
        isAvailable: true,
      }),
    );

    const subtotal = 40000 * quantity;
    const order = await orderRepo.save(
      orderRepo.create({
        userId: user.id,
        customerName: 'Khách Kiểm Thử PG',
        customerPhone: '0901234567',
        status: OrderStatus.PENDING,
        totalAmount: String(subtotal),
        pickupMethod: 'AT_COUNTER',
      }),
    );

    await orderItemRepo.save(
      orderItemRepo.create({
        orderId: order.id,
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice: '40000.00',
        subtotal: String(subtotal),
        size: ProductSize.SMALL,
        toppings: [],
      }),
    );

    return { product, order };
  }

  it('1. PENDING -> PAID, trừ stock đúng một lần trên PostgreSQL thật', async () => {
    const { product, order } = await createTestProductAndOrder(10, 2);
    const key = crypto.randomUUID();

    const dto: CreatePaymentDto = {
      orderId: order.id,
      amount: 80000,
      method: PaymentMethod.MOMO,
      idempotencyKey: key,
      pickupMethod: PickupMethod.AT_COUNTER,
    };

    const result = await service.processPayment(dto, testUser1.id);

    expect(result.success).toBe(true);
    expect(result.status).toBe(PaymentStatus.SUCCESS);
    expect(result.order.status).toBe(OrderStatus.PAID);
    expect(result.order.orderCode).toBe(`#BL-${order.id.toString().padStart(4, '0')}`);

    // Xác minh trực tiếp trong CSDL PostgreSQL
    const freshProduct = await productRepo.findOneByOrFail({ id: product.id });
    expect(freshProduct.stock).toBe(8); // 10 - 2 = 8
    expect(freshProduct.version).toBe(2);

    const freshOrder = await orderRepo.findOneByOrFail({ id: order.id });
    expect(freshOrder.status).toBe(OrderStatus.PAID);
    expect(freshOrder.orderCode).toBe(`#BL-${order.id.toString().padStart(4, '0')}`);
  });

  it('2. Hai request cùng key gửi đồng thời: chỉ 1 transaction trừ kho, request còn lại nhận kết quả cũ', async () => {
    const { product, order } = await createTestProductAndOrder(10, 2);
    const key = crypto.randomUUID();

    const dto: CreatePaymentDto = {
      orderId: order.id,
      amount: 80000,
      method: PaymentMethod.VIETQR,
      idempotencyKey: key,
      pickupMethod: PickupMethod.AT_COUNTER,
    };

    // Gửi 2 request cùng khóa hoàn toàn đồng thời
    const [res1, res2] = await Promise.all([
      service.processPayment(dto, testUser1.id),
      service.processPayment(dto, testUser1.id),
    ]);

    expect(res1.status).toBe(PaymentStatus.SUCCESS);
    expect(res2.status).toBe(PaymentStatus.SUCCESS);

    // Một trong hai request phải được đánh dấu là duplicate
    const duplicateCount = (res1.isDuplicate ? 1 : 0) + (res2.isDuplicate ? 1 : 0);
    expect(duplicateCount).toBeGreaterThanOrEqual(1);

    // Tồn kho chỉ được trừ đúng một lần (10 - 2 = 8)
    const freshProduct = await productRepo.findOneByOrFail({ id: product.id });
    expect(freshProduct.stock).toBe(8);
  });

  it('3. Hai request khác key gửi đồng thời cho cùng một order: chỉ 1 request thành công, request còn lại bị chặn (FIX-01)', async () => {
    const { product, order } = await createTestProductAndOrder(10, 1);
    const key1 = crypto.randomUUID();
    const key2 = crypto.randomUUID();

    const dto1: CreatePaymentDto = {
      orderId: order.id,
      amount: 40000,
      method: PaymentMethod.MOMO,
      idempotencyKey: key1,
    };

    const dto2: CreatePaymentDto = {
      orderId: order.id,
      amount: 40000,
      method: PaymentMethod.CARD,
      idempotencyKey: key2,
    };

    const results = await Promise.allSettled([
      service.processPayment(dto1, testUser1.id),
      service.processPayment(dto2, testUser1.id),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Chính xác một request thành công và một request bị chặn (Conflict / BadRequest)
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Tồn kho chỉ giảm đúng 1 ly (10 - 1 = 9), tuyệt đối không bị trừ 2 lần
    const freshProduct = await productRepo.findOneByOrFail({ id: product.id });
    expect(freshProduct.stock).toBe(9);
  });

  it('4. Hai khách mua sản phẩm cuối cùng (stock = 1): 1 đơn PAID, 1 đơn bồi hoàn hoàn tiền BR-REFUND-OCC', async () => {
    // Sản phẩm chỉ còn 1 ly duy nhất trong kho
    const product = await productRepo.save(
      productRepo.create({
        name: `Last Cup Coffee ${Date.now()}`,
        price: '40000.00',
        stock: 1,
        version: 1,
        isAvailable: true,
      }),
    );

    // Đơn hàng của Khách 1
    const order1 = await orderRepo.save(
      orderRepo.create({
        userId: testUser1.id,
        customerName: 'Khách 1',
        customerPhone: '0901111111',
        status: OrderStatus.PENDING,
        totalAmount: '40000.00',
      }),
    );
    await orderItemRepo.save(
      orderItemRepo.create({
        orderId: order1.id,
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: '40000.00',
        subtotal: '40000.00',
        size: ProductSize.SMALL,
      }),
    );

    // Đơn hàng của Khách 2
    const order2 = await orderRepo.save(
      orderRepo.create({
        userId: testUser2.id,
        customerName: 'Khách 2',
        customerPhone: '0902222222',
        status: OrderStatus.PENDING,
        totalAmount: '40000.00',
      }),
    );
    await orderItemRepo.save(
      orderItemRepo.create({
        orderId: order2.id,
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: '40000.00',
        subtotal: '40000.00',
        size: ProductSize.SMALL,
      }),
    );

    const dto1: CreatePaymentDto = {
      orderId: order1.id,
      amount: 40000,
      method: PaymentMethod.MOMO,
      idempotencyKey: crypto.randomUUID(),
    };

    const dto2: CreatePaymentDto = {
      orderId: order2.id,
      amount: 40000,
      method: PaymentMethod.VIETQR,
      idempotencyKey: crypto.randomUUID(),
    };

    const results = await Promise.allSettled([
      service.processPayment(dto1, testUser1.id),
      service.processPayment(dto2, testUser2.id),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // 1 khách thành công, 1 khách bị xung đột OCC
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Kho thành phẩm giảm từ 1 về 0, không bao giờ âm!
    const freshProduct = await productRepo.findOneByOrFail({ id: product.id });
    expect(freshProduct.stock).toBe(0);

    // Đơn thất bại được bồi hoàn tự động thành CANCELLED và có bản ghi REFUNDED
    const cancelledOrders = await orderRepo.find({
      where: [{ id: order1.id }, { id: order2.id }],
    });
    const paidCount = cancelledOrders.filter((o) => o.status === OrderStatus.PAID).length;
    const cancelledCount = cancelledOrders.filter((o) => o.status === OrderStatus.CANCELLED).length;
    expect(paidCount).toBe(1);
    expect(cancelledCount).toBe(1);
  });

  it('5. FAILED không trừ kho thành phẩm trong PostgreSQL', async () => {
    const { product, order } = await createTestProductAndOrder(15, 2);
    const key = crypto.randomUUID();

    const dto: CreatePaymentDto = {
      orderId: order.id,
      amount: 80000,
      method: PaymentMethod.CARD,
      idempotencyKey: key,
      mockOutcome: 'FAILED',
    };

    const result = await service.processPayment(dto, testUser1.id);

    expect(result.success).toBe(false);
    expect(result.status).toBe(PaymentStatus.FAILED);

    // Tồn kho nguyên vẹn 15 ly
    const freshProduct = await productRepo.findOneByOrFail({ id: product.id });
    expect(freshProduct.stock).toBe(15);
    expect(freshProduct.version).toBe(1);

    // Đơn hàng chuyển sang PAYMENT_FAILED
    const freshOrder = await orderRepo.findOneByOrFail({ id: order.id });
    expect(freshOrder.status).toBe(OrderStatus.PAYMENT_FAILED);
  });

  it('6. FAILED -> retry với key mới -> SUCCESS (chuyển PAID và trừ kho)', async () => {
    const { product, order } = await createTestProductAndOrder(20, 2);

    // Lần 1: Thanh toán FAILED
    const failKey = crypto.randomUUID();
    await service.processPayment(
      {
        orderId: order.id,
        amount: 80000,
        method: PaymentMethod.CARD,
        idempotencyKey: failKey,
        mockOutcome: 'FAILED',
      },
      testUser1.id,
    );

    // Lần 2: Retry với KEY MỚI và phương thức khác (VIETQR) -> SUCCESS
    const newKey = crypto.randomUUID();
    const retryResult = await service.processPayment(
      {
        orderId: order.id,
        amount: 80000,
        method: PaymentMethod.VIETQR,
        idempotencyKey: newKey,
      },
      testUser1.id,
    );

    expect(retryResult.success).toBe(true);
    expect(retryResult.status).toBe(PaymentStatus.SUCCESS);
    expect(retryResult.order.status).toBe(OrderStatus.PAID);

    // Tồn kho giảm từ 20 xuống 18
    const freshProduct = await productRepo.findOneByOrFail({ id: product.id });
    expect(freshProduct.stock).toBe(18);

    // Cả 2 giao dịch đều tồn tại trong CSDL để đảm bảo tính minh bạch kiểm toán
    const payments = await paymentRepo.find({ where: { orderId: order.id } });
    expect(payments.length).toBe(2);
    expect(payments.some((p) => p.status === PaymentStatus.FAILED)).toBe(true);
    expect(payments.some((p) => p.status === PaymentStatus.SUCCESS)).toBe(true);
  });

  it('7. Timeout / PENDING -> đối soát reconcile thành công sang PAID và trừ tồn kho OCC (FIX-04, FIX-09 & FIX-11)', async () => {
    const { product, order } = await createTestProductAndOrder(10, 1);
    const key = crypto.randomUUID();

    const dto: CreatePaymentDto = {
      orderId: order.id,
      amount: 40000,
      method: PaymentMethod.MOMO,
      idempotencyKey: key,
      mockOutcome: 'PENDING',
    };

    const res1 = await service.processPayment(dto, testUser1.id);
    expect(res1.status).toBe(PaymentStatus.PENDING);

    // Đơn hàng duy trì PENDING và CHƯA bị trừ kho trong CSDL
    const freshOrder1 = await orderRepo.findOneByOrFail({ id: order.id });
    expect(freshOrder1.status).toBe(OrderStatus.PENDING);

    const productBeforeReconcile = await productRepo.findOneByOrFail({ id: product.id });
    expect(productBeforeReconcile.stock).toBe(10); // Chưa trừ kho
    expect(productBeforeReconcile.version).toBe(1);

    // Giả lập cổng thanh toán cập nhật trạng thái SUCCESS sau timeout
    const merchantRef = res1.payment.merchantReference!;
    mockGateway.setTransactionStatus(merchantRef, 'SUCCESS');

    // Thực hiện đối soát giao dịch (reconciliation)
    const reconcileResult = await service.reconcilePayment(key, testUser1.id);
    expect(reconcileResult.success).toBe(true);
    expect(reconcileResult.status).toBe(PaymentStatus.SUCCESS);
    expect(reconcileResult.order.status).toBe(OrderStatus.PAID);

    // FIX-09: Xác minh trực tiếp trong CSDL PostgreSQL rằng tồn kho đã được trừ và version đã tăng
    const productAfterReconcile = await productRepo.findOneByOrFail({ id: product.id });
    expect(productAfterReconcile.stock).toBe(9); // Đã trừ 1 ly: 10 -> 9
    expect(productAfterReconcile.version).toBe(2); // Version tăng: 1 -> 2

    // Gọi lại reconcile lần 2: phải trả kết quả cũ (idempotency) và KHÔNG trừ kho thêm lần nào
    const reconcileAgain = await service.reconcilePayment(key, testUser1.id);
    expect(reconcileAgain.isDuplicate).toBe(true);
    expect(reconcileAgain.status).toBe(PaymentStatus.SUCCESS);

    const productAfterSecondReconcile = await productRepo.findOneByOrFail({ id: product.id });
    expect(productAfterSecondReconcile.stock).toBe(9); // Vẫn là 9 ly
  });

  it('8. Gateway SUCCESS nhưng OCC fail -> bồi hoàn hoàn tiền BR-REFUND-OCC (FIX-12)', async () => {
    // Tạo sản phẩm ban đầu có 1 ly
    const { order } = await createTestProductAndOrder(1, 2); // Đơn đặt 2 ly > tồn kho 1 ly

    const dto: CreatePaymentDto = {
      orderId: order.id,
      amount: 80000,
      method: PaymentMethod.MOMO,
      idempotencyKey: crypto.randomUUID(),
    };

    await expect(service.processPayment(dto, testUser1.id)).rejects.toThrow(ConflictException);

    // Đơn hàng bị CANCELLED
    const freshOrder = await orderRepo.findOneByOrFail({ id: order.id });
    expect(freshOrder.status).toBe(OrderStatus.CANCELLED);

    // Bản ghi Payment REFUNDED tồn tại kèm refundKey cố định
    const refundPayment = await paymentRepo.findOneByOrFail({
      orderId: order.id,
      status: PaymentStatus.REFUNDED,
    });
    expect(refundPayment.refundKey).toMatch(/^refund-/);
  });

  it('9. Owner/IDOR: User 2 không thể thanh toán đơn hàng của User 1', async () => {
    const { order } = await createTestProductAndOrder(10, 1, testUser1);

    const dto: CreatePaymentDto = {
      orderId: order.id,
      amount: 40000,
      method: PaymentMethod.MOMO,
      idempotencyKey: crypto.randomUUID(),
    };

    await expect(service.processPayment(dto, testUser2.id)).rejects.toThrow(ForbiddenException);
  });

  it('10. Database Schema Safety: Foreign Keys và cấu trúc bảng được bảo toàn', async () => {
    const rawFk = await dataSource.query(`
      SELECT tc.constraint_name, rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.table_name = 'payments' AND tc.constraint_name = 'FK_payments_orderId';
    `);

    expect(rawFk.length).toBeGreaterThan(0);
    expect(rawFk[0].delete_rule).toBe('RESTRICT');
  });

  it('11. Concurrent reconciliation: Hai request đối soát gửi đồng thời cho cùng 1 đơn PENDING, chỉ 1 transaction trừ kho OCC (FIX-09)', async () => {
    const { product, order } = await createTestProductAndOrder(10, 1);
    const key = crypto.randomUUID();

    const dto: CreatePaymentDto = {
      orderId: order.id,
      amount: 40000,
      method: PaymentMethod.MOMO,
      idempotencyKey: key,
      mockOutcome: 'PENDING',
    };

    const res1 = await service.processPayment(dto, testUser1.id);
    expect(res1.status).toBe(PaymentStatus.PENDING);

    // Cổng thanh toán ghi nhận SUCCESS
    mockGateway.setTransactionStatus(res1.payment.merchantReference!, 'SUCCESS');

    // Gửi 2 request đối soát hoàn toàn đồng thời
    const [reconcile1, reconcile2] = await Promise.all([
      service.reconcilePayment(key, testUser1.id),
      service.reconcilePayment(key, testUser1.id),
    ]);

    expect(reconcile1.status).toBe(PaymentStatus.SUCCESS);
    expect(reconcile2.status).toBe(PaymentStatus.SUCCESS);

    // Tồn kho chỉ được trừ đúng 1 lần (10 - 1 = 9)
    const freshProduct = await productRepo.findOneByOrFail({ id: product.id });
    expect(freshProduct.stock).toBe(9);
    expect(freshProduct.version).toBe(2);
  });

  it('12. Đơn hàng đang có payment PENDING chưa đối soát: chặn request với key mới (FIX-11)', async () => {
    const { order } = await createTestProductAndOrder(10, 1);
    const pendingKey = crypto.randomUUID();

    await service.processPayment(
      {
        orderId: order.id,
        amount: 40000,
        method: PaymentMethod.MOMO,
        idempotencyKey: pendingKey,
        mockOutcome: 'PENDING',
      },
      testUser1.id,
    );

    // Request với key mới cho cùng order khi pending chưa giải quyết -> ném ConflictException
    const newKey = crypto.randomUUID();
    await expect(
      service.processPayment(
        {
          orderId: order.id,
          amount: 40000,
          method: PaymentMethod.CARD,
          idempotencyKey: newKey,
        },
        testUser1.id,
      ),
    ).rejects.toThrow(ConflictException);
  });
});
