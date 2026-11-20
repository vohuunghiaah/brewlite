import { AddUserRole1732233600000 } from '../migrations/1732233600000-add-user-role';
import { OrdersService } from '../orders/orders.service';
import { migrations } from '../database';
import * as crypto from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

import { PaymentsService } from './payments.service';
import { MockPaymentGateway } from './mock-payment-gateway.service';
import { Payment, PaymentMethod, PaymentStatus } from './entities/payment.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderItem, ProductSize } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { CreatePaymentDto, PickupMethod } from './dto/create-payment.dto';
import { AddPaymentsAndStockOcc1732147200000 } from '../migrations/1732147200000-add-payments-and-stock-occ';
import { PaymentsRecoveryWorker } from './payments-recovery.worker';
import { PaymentsController } from './payments.controller';

describe('PaymentsService - Real PostgreSQL Concurrency, Durability & Recovery Tests (FIX-08..18 / UC-10)', () => {
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
    const database = process.env.POSTGRES_DB ?? 'brewlite_test';
    if (!database.endsWith('_test') || /prod|live|master/i.test(database) || process.env.NODE_ENV === 'production') {
      throw new Error('Payment integration tests require a dedicated *_test database.');
    }
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: Number(process.env.POSTGRES_PORT || 5432),
      username: process.env.POSTGRES_USER || 'brewlite',
      password: process.env.POSTGRES_PASSWORD || 'brewlite_dev_password',
      database: process.env.POSTGRES_DB || 'brewlite_test',
      entities: [User, Product, Order, OrderItem, Payment],
      synchronize: false,
      migrations,
    });

    await dataSource.initialize();

    const [live] = await dataSource.query('SELECT current_database() AS name');
    if (live.name !== database) throw new Error('Unexpected integration database');
    await dataSource.runMigrations();

    paymentRepo = dataSource.getRepository(Payment);
    orderRepo = dataSource.getRepository(Order);
    orderItemRepo = dataSource.getRepository(OrderItem);
    productRepo = dataSource.getRepository(Product);
    userRepo = dataSource.getRepository(User);

    mockGateway = new MockPaymentGateway(dataSource);
    await mockGateway.ensureTables();

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

  beforeEach(async () => {
    await mockGateway.clear();
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

  // =========================================================================
  // PHẦN 1: 12 INTEGRATION TESTS THỰC TẾ TRÊN POSTGRESQL (BẢO TOÀN TỪ BASELINE)
  // =========================================================================

  it('keeps a pending order and stock intact when service progress or payment status is requested', async () => {
    const { order, product } = await createTestProductAndOrder(3, 1);
    const orders = new OrdersService(orderRepo, productRepo, dataSource);
    await expect(orders.updateServiceStatus(order.id, OrderStatus.READY)).rejects.toBeInstanceOf(ConflictException);
    expect(() => orders.updateServiceStatus(order.id, OrderStatus.PAID)).toThrow(BadRequestException);
    expect((await orderRepo.findOneByOrFail({ id: order.id })).status).toBe(OrderStatus.PENDING);
    expect((await productRepo.findOneByOrFail({ id: product.id })).stock).toBe(3);
  });

  it('replays a delayed gateway success after reconciliation and staff acceptance without refunding the last drink', async () => {
    const { product, order } = await createTestProductAndOrder(1, 1);
    const orders = new OrdersService(orderRepo, productRepo, dataSource);
    const key = crypto.randomUUID();
    const charge = mockGateway.charge.bind(mockGateway);
    const delayed = jest.spyOn(mockGateway, 'charge').mockImplementationOnce(async request => {
      const result = await charge(request);
      await service.reconcilePayment(key, testUser1.id);
      await orders.updateServiceStatus(order.id, OrderStatus.PREPARING);
      return result;
    });
    try {
      const result = await service.processPayment({
        orderId: order.id, amount: 40000, method: PaymentMethod.MOMO,
        idempotencyKey: key, pickupMethod: PickupMethod.AT_COUNTER,
      }, testUser1.id);
      expect(result.isDuplicate).toBe(true);
      expect(result.payment.status).toBe(PaymentStatus.SUCCESS);
      expect(result.order.status).toBe(OrderStatus.PREPARING);
      expect((await productRepo.findOneByOrFail({ id: product.id })).stock).toBe(0);
      expect((await orderRepo.findOneByOrFail({ id: order.id })).status).toBe(OrderStatus.PREPARING);
    } finally {
      delayed.mockRestore();
    }
  });

  it('defaults legacy users to CUSTOMER and preserves linked orders', async () => {
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query('CREATE TEMP TABLE users (id integer PRIMARY KEY, email text)');
      await runner.query('CREATE TEMP TABLE orders (id integer PRIMARY KEY, owner integer REFERENCES users(id))');
      await runner.query("INSERT INTO users VALUES (7, 'legacy@example.test')");
      await runner.query('INSERT INTO orders VALUES (12, 7)');
      await new AddUserRole1732233600000().up(runner);
      expect(await runner.query('SELECT o.id, u.email, u.role FROM orders o JOIN users u ON u.id=o.owner'))
        .toEqual([{ id: 12, email: 'legacy@example.test', role: 'CUSTOMER' }]);
      await expect(runner.query("UPDATE users SET role='OWNER'")).rejects.toThrow();
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });

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

    const [res1, res2] = await Promise.all([
      service.processPayment(dto, testUser1.id),
      service.processPayment(dto, testUser1.id),
    ]);

    expect(res1.status).toBe(PaymentStatus.SUCCESS);
    expect(res2.status).toBe(PaymentStatus.SUCCESS);

    const duplicateCount = (res1.isDuplicate ? 1 : 0) + (res2.isDuplicate ? 1 : 0);
    expect(duplicateCount).toBeGreaterThanOrEqual(1);

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

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const freshProduct = await productRepo.findOneByOrFail({ id: product.id });
    expect(freshProduct.stock).toBe(9);
  });

  it('4. Hai khách mua sản phẩm cuối cùng (stock = 1): 1 đơn PAID, 1 đơn bồi hoàn hoàn tiền BR-REFUND-OCC', async () => {
    const product = await productRepo.save(
      productRepo.create({
        name: `Last Cup Coffee ${Date.now()}`,
        price: '40000.00',
        stock: 1,
        version: 1,
        isAvailable: true,
      }),
    );

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

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const freshProduct = await productRepo.findOneByOrFail({ id: product.id });
    expect(freshProduct.stock).toBe(0);

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

    const freshProduct = await productRepo.findOneByOrFail({ id: product.id });
    expect(freshProduct.stock).toBe(15);
    expect(freshProduct.version).toBe(1);

    const freshOrder = await orderRepo.findOneByOrFail({ id: order.id });
    expect(freshOrder.status).toBe(OrderStatus.PAYMENT_FAILED);
  });

  it('6. FAILED -> retry với key mới -> SUCCESS (chuyển PAID và trừ kho)', async () => {
    const { product, order } = await createTestProductAndOrder(20, 2);

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

    const freshProduct = await productRepo.findOneByOrFail({ id: product.id });
    expect(freshProduct.stock).toBe(18);

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

    const freshOrder1 = await orderRepo.findOneByOrFail({ id: order.id });
    expect(freshOrder1.status).toBe(OrderStatus.PENDING);

    const productBeforeReconcile = await productRepo.findOneByOrFail({ id: product.id });
    expect(productBeforeReconcile.stock).toBe(10);
    expect(productBeforeReconcile.version).toBe(1);

    const merchantRef = res1.payment.merchantReference!;
    await mockGateway.setTransactionStatus(merchantRef, 'SUCCESS');

    const reconcileResult = await service.reconcilePayment(key, testUser1.id);
    expect(reconcileResult.success).toBe(true);
    expect(reconcileResult.status).toBe(PaymentStatus.SUCCESS);
    expect(reconcileResult.order.status).toBe(OrderStatus.PAID);

    const productAfterReconcile = await productRepo.findOneByOrFail({ id: product.id });
    expect(productAfterReconcile.stock).toBe(9);
    expect(productAfterReconcile.version).toBe(2);

    const reconcileAgain = await service.reconcilePayment(key, testUser1.id);
    expect(reconcileAgain.isDuplicate).toBe(true);
    expect(reconcileAgain.status).toBe(PaymentStatus.SUCCESS);

    const productAfterSecondReconcile = await productRepo.findOneByOrFail({ id: product.id });
    expect(productAfterSecondReconcile.stock).toBe(9);
  });

  it('8. Gateway SUCCESS nhưng OCC fail -> bồi hoàn hoàn tiền BR-REFUND-OCC (FIX-12)', async () => {
    const { order } = await createTestProductAndOrder(1, 2);

    const dto: CreatePaymentDto = {
      orderId: order.id,
      amount: 80000,
      method: PaymentMethod.MOMO,
      idempotencyKey: crypto.randomUUID(),
    };

    await expect(service.processPayment(dto, testUser1.id)).rejects.toThrow(ConflictException);

    const freshOrder = await orderRepo.findOneByOrFail({ id: order.id });
    expect(freshOrder.status).toBe(OrderStatus.CANCELLED);

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

    await mockGateway.setTransactionStatus(res1.payment.merchantReference!, 'SUCCESS');

    const [reconcile1, reconcile2] = await Promise.all([
      service.reconcilePayment(key, testUser1.id),
      service.reconcilePayment(key, testUser1.id),
    ]);

    expect(reconcile1.status).toBe(PaymentStatus.SUCCESS);
    expect(reconcile2.status).toBe(PaymentStatus.SUCCESS);

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

  // =========================================================================
  // PHẦN 2: 12 MANDATORY ACCEPTANCE TESTS (FIX-14 ĐẾN FIX-18 / DURABILITY & RECOVERY)
  // =========================================================================

  describe('Mandatory Acceptance Tests (FIX-14..18: Durability, Crash Recovery, Migration & HTTP Semantics)', () => {
    it('Acceptance 1: Gateway SUCCESS rồi DB fail trước finalize (FIX-14: Commit-Before-Gateway & Reconcile Recovery)', async () => {
      const { product, order } = await createTestProductAndOrder(10, 2);
      const key = crypto.randomUUID();

      const dto: CreatePaymentDto = {
        orderId: order.id,
        amount: 80000,
        method: PaymentMethod.MOMO,
        idempotencyKey: key,
      };

      // Giả lập DB fail ngay khi Gateway charge thành công (trước hoặc trong TX2 finalize)
      const originalTx = dataSource.transaction.bind(dataSource);
      let txCallCount = 0;
      jest.spyOn(dataSource, 'transaction').mockImplementation(async (...args: any[]) => {
        txCallCount++;
        if (txCallCount === 2) {
          // TX1 đã thành công (Payment PENDING đã commit), TX2 gặp sự cố kết nối DB
          throw new Error('Simulated PostgreSQL Connection Crash during TX2 Finalize');
        }
        return (originalTx as any)(...args);
      });

      await expect(service.processPayment(dto, testUser1.id)).rejects.toThrow(
        'Simulated PostgreSQL Connection Crash during TX2 Finalize',
      );

      // Phục hồi spy
      jest.restoreAllMocks();

      // Dữ liệu attempt PENDING vẫn tồn tại bền vững trong CSDL PostgreSQL (FIX-14)
      const pendingInDb = await paymentRepo.findOneByOrFail({ idempotencyKey: key });
      expect(pendingInDb.status).toBe(PaymentStatus.PENDING);
      expect(pendingInDb.merchantReference).toBeTruthy();

      // Cổng thanh toán đã ghi nhận giao dịch SUCCESS
      const gwTx = await mockGateway.queryTransaction(pendingInDb.merchantReference!);
      expect(gwTx).not.toBeNull();
      expect(gwTx!.status).toBe('SUCCESS');

      // Kho chưa bị trừ do TX2 chưa hoàn tất
      const productPreReconcile = await productRepo.findOneByOrFail({ id: product.id });
      expect(productPreReconcile.stock).toBe(10);

      // Đối soát phục hồi (Reconciliation): Tiếp tục hoàn tất giao dịch dở dang
      const recoveryResult = await service.reconcilePayment(key, testUser1.id);
      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.status).toBe(PaymentStatus.SUCCESS);
      expect(recoveryResult.order.status).toBe(OrderStatus.PAID);

      // Kho được trừ đúng và an toàn
      const productPostReconcile = await productRepo.findOneByOrFail({ id: product.id });
      expect(productPostReconcile.stock).toBe(8);
      expect(productPostReconcile.version).toBe(2);
    });

    it('Acceptance 2: Payment PENDING rồi restart ứng dụng/gateway (FIX-15: Persistent Mock Gateway)', async () => {
      const { order } = await createTestProductAndOrder(10, 1);
      const key = crypto.randomUUID();

      const res = await service.processPayment(
        {
          orderId: order.id,
          amount: 40000,
          method: PaymentMethod.VIETQR,
          idempotencyKey: key,
          mockOutcome: 'PENDING',
        },
        testUser1.id,
      );

      expect(res.status).toBe(PaymentStatus.PENDING);
      const merchantRef = res.payment.merchantReference!;

      // Giả lập restart toàn bộ ứng dụng và gateway: khởi tạo instance mới kết nối cùng PostgreSQL
      const restartedGateway = new MockPaymentGateway(dataSource);
      const restartedPaymentRepo = dataSource.getRepository(Payment);

      // Gateway mới đọc lại được giao dịch đã lưu trong PostgreSQL trước khi restart
      const readTx = await restartedGateway.queryTransaction(merchantRef);
      expect(readTx).not.toBeNull();
      expect(readTx!.status).toBe('PENDING');

      // Trạng thái DB được duy trì
      const dbPayment = await restartedPaymentRepo.findOneByOrFail({ idempotencyKey: key });
      expect(dbPayment.status).toBe(PaymentStatus.PENDING);
    });

    it('Acceptance 3: Restart và đối soát bằng merchantReference cũ (FIX-15 & FIX-17)', async () => {
      const { product, order } = await createTestProductAndOrder(10, 1);
      const key = crypto.randomUUID();

      const res = await service.processPayment(
        {
          orderId: order.id,
          amount: 40000,
          method: PaymentMethod.MOMO,
          idempotencyKey: key,
          mockOutcome: 'PENDING',
        },
        testUser1.id,
      );
      const merchantRef = res.payment.merchantReference!;

      // Giả lập restart ứng dụng
      const restartedGateway = new MockPaymentGateway(dataSource);
      const restartedService = new PaymentsService(
        dataSource.getRepository(Payment),
        dataSource.getRepository(Order),
        dataSource.getRepository(Product),
        dataSource,
        restartedGateway,
      );

      // Cổng thanh toán chuyển sang SUCCESS
      await restartedGateway.setTransactionStatus(merchantRef, 'SUCCESS');

      // Đối soát sau restart bằng chính idempotencyKey và merchantReference cũ
      const reconcileRes = await restartedService.reconcilePayment(key, testUser1.id);
      expect(reconcileRes.success).toBe(true);
      expect(reconcileRes.status).toBe(PaymentStatus.SUCCESS);
      expect(reconcileRes.order.status).toBe(OrderStatus.PAID);

      const freshProduct = await productRepo.findOneByOrFail({ id: product.id });
      expect(freshProduct.stock).toBe(9);
    });

    it('Acceptance 4: Hai charge cùng key sau restart (FIX-14: No Double Charge on Gateway)', async () => {
      const { product, order } = await createTestProductAndOrder(10, 1);
      const key = crypto.randomUUID();

      const dto: CreatePaymentDto = {
        orderId: order.id,
        amount: 40000,
        method: PaymentMethod.MOMO,
        idempotencyKey: key,
      };

      const res1 = await service.processPayment(dto, testUser1.id);
      expect(res1.status).toBe(PaymentStatus.SUCCESS);

      // Restart ứng dụng
      const restartedGateway = new MockPaymentGateway(dataSource);
      const restartedService = new PaymentsService(
        dataSource.getRepository(Payment),
        dataSource.getRepository(Order),
        dataSource.getRepository(Product),
        dataSource,
        restartedGateway,
      );

      // Gửi lại charge với cùng key sau restart
      const res2 = await restartedService.processPayment(dto, testUser1.id);
      expect(res2.isDuplicate).toBe(true);
      expect(res2.status).toBe(PaymentStatus.SUCCESS);

      // Kho không bị trừ thêm lần 2
      const freshProduct = await productRepo.findOneByOrFail({ id: product.id });
      expect(freshProduct.stock).toBe(9);
    });

    it('Acceptance 5: OCC conflict rồi refund SUCCESS (FIX-16: Correct TX3 Compensation & BR-REFUND-OCC)', async () => {
      const { product, order } = await createTestProductAndOrder(1, 2); // Cần 2 ly nhưng kho chỉ còn 1 ly
      const key = crypto.randomUUID();

      const dto: CreatePaymentDto = {
        orderId: order.id,
        amount: 80000,
        method: PaymentMethod.CARD,
        idempotencyKey: key,
      };

      await expect(service.processPayment(dto, testUser1.id)).rejects.toThrow(ConflictException);

      // TX2 đã rollback: tồn kho giữ nguyên 1 ly, không âm kho
      const freshProduct = await productRepo.findOneByOrFail({ id: product.id });
      expect(freshProduct.stock).toBe(1);

      // Đơn hàng CANCELLED
      const freshOrder = await orderRepo.findOneByOrFail({ id: order.id });
      expect(freshOrder.status).toBe(OrderStatus.CANCELLED);

      // Payment REFUNDED với refundKey ổn định
      const refundedPayment = await paymentRepo.findOneByOrFail({ idempotencyKey: key });
      expect(refundedPayment.status).toBe(PaymentStatus.REFUNDED);
      expect(refundedPayment.refundKey).toBe(`refund-${key}`);
    });

    it('Acceptance 6: Refund SUCCESS nhưng DB update thất bại (FIX-16: Recovery Reconcile with Same RefundKey)', async () => {
      const { order } = await createTestProductAndOrder(1, 2);
      const key = crypto.randomUUID();

      // Giả lập tình huống: sau khi gateway refund thành công, cập nhật DB sang REFUNDED gặp sự cố
      // Trong DB payment vẫn lưu REFUND_PENDING
      const refundKey = `refund-${key}`;
      const merchantReference = `BL-REF-${order.id}-${key.replace(/-/g, '').slice(0, 16)}`;

      await paymentRepo.save(
        paymentRepo.create({
          orderId: order.id,
          userId: testUser1.id,
          amount: '80000.00',
          method: PaymentMethod.MOMO,
          status: PaymentStatus.REFUND_PENDING,
          idempotencyKey: key,
          transactionId: 'TX-INIT',
          merchantReference,
          refundKey,
        }),
      );

      // Cổng thanh toán thực hiện refund với refundKey này thành công
      await mockGateway.charge({
        merchantReference,
        amount: 80000,
        method: PaymentMethod.MOMO,
      });
      await mockGateway.refund({
        merchantReference,
        refundKey,
        amount: 80000,
      });

      // Đối soát phục hồi bằng cùng refundKey
      const reconcileResult = await service.reconcilePayment(key, testUser1.id);
      expect(reconcileResult.status).toBe(PaymentStatus.REFUNDED);

      // CSDL đã được cập nhật chính xác
      const dbPayment = await paymentRepo.findOneByOrFail({ idempotencyKey: key });
      expect(dbPayment.status).toBe(PaymentStatus.REFUNDED);
    });

    it('Acceptance 7: Refund PENDING rồi restart và retry cùng refundKey (FIX-16 & FIX-17)', async () => {
      const { order } = await createTestProductAndOrder(1, 2);
      const key = crypto.randomUUID();
      const refundKey = `refund-${key}`;
      const merchantReference = `BL-REF-${order.id}-${key.replace(/-/g, '').slice(0, 16)}`;

      // Lưu trạng thái REFUND_PENDING ban đầu
      await paymentRepo.save(
        paymentRepo.create({
          orderId: order.id,
          userId: testUser1.id,
          amount: '80000.00',
          method: PaymentMethod.MOMO,
          status: PaymentStatus.REFUND_PENDING,
          idempotencyKey: key,
          transactionId: 'TX-REFUND-PENDING',
          merchantReference,
          refundKey,
        }),
      );

      await mockGateway.charge({
        merchantReference,
        amount: 80000,
        method: PaymentMethod.MOMO,
      });
      await mockGateway.refund({
        merchantReference,
        refundKey,
        amount: 80000,
        mockOutcome: 'PENDING',
      });

      // Restart ứng dụng
      const restartedGateway = new MockPaymentGateway(dataSource);
      const restartedService = new PaymentsService(
        dataSource.getRepository(Payment),
        dataSource.getRepository(Order),
        dataSource.getRepository(Product),
        dataSource,
        restartedGateway,
      );

      // Cổng thanh toán hoàn tất refund
      await restartedGateway.setRefundStatus(refundKey, 'SUCCESS');

      // Đối soát lại
      const retryResult = await restartedService.reconcilePayment(key, testUser1.id);
      expect(retryResult.status).toBe(PaymentStatus.REFUNDED);

      const dbPayment = await paymentRepo.findOneByOrFail({ idempotencyKey: key });
      expect(dbPayment.status).toBe(PaymentStatus.REFUNDED);
    });

    it('Acceptance 8: Hai worker xử lý cùng pending payment/refund (Concurrency Protection)', async () => {
      const { product, order } = await createTestProductAndOrder(10, 1);
      const key = crypto.randomUUID();

      const res = await service.processPayment(
        {
          orderId: order.id,
          amount: 40000,
          method: PaymentMethod.MOMO,
          idempotencyKey: key,
          mockOutcome: 'PENDING',
        },
        testUser1.id,
      );

      await mockGateway.setTransactionStatus(res.payment.merchantReference!, 'SUCCESS');

      // Hai worker riêng biệt cùng gọi reconcilePayment song song
      const worker1 = new PaymentsService(
        dataSource.getRepository(Payment),
        dataSource.getRepository(Order),
        dataSource.getRepository(Product),
        dataSource,
        mockGateway,
      );
      const worker2 = new PaymentsService(
        dataSource.getRepository(Payment),
        dataSource.getRepository(Order),
        dataSource.getRepository(Product),
        dataSource,
        mockGateway,
      );

      const [r1, r2] = await Promise.all([
        worker1.reconcilePayment(key, testUser1.id),
        worker2.reconcilePayment(key, testUser1.id),
      ]);

      expect(r1.status).toBe(PaymentStatus.SUCCESS);
      expect(r2.status).toBe(PaymentStatus.SUCCESS);

      // Kho chỉ trừ đúng 1 lần (10 - 1 = 9)
      const freshProduct = await productRepo.findOneByOrFail({ id: product.id });
      expect(freshProduct.stock).toBe(9);
      expect(freshProduct.version).toBe(2);
    });

    it('Acceptance 9: Không có hai Payment SUCCESS cho cùng Order (Atomic Order Finalization)', async () => {
      const { order } = await createTestProductAndOrder(10, 1);
      const key1 = crypto.randomUUID();
      const key2 = crypto.randomUUID();

      // Request 1 thành công
      const res1 = await service.processPayment(
        {
          orderId: order.id,
          amount: 40000,
          method: PaymentMethod.MOMO,
          idempotencyKey: key1,
        },
        testUser1.id,
      );
      expect(res1.status).toBe(PaymentStatus.SUCCESS);

      // Request 2 với key khác cho cùng đơn đã PAID -> bị từ chối
      await expect(
        service.processPayment(
          {
            orderId: order.id,
            amount: 40000,
            method: PaymentMethod.CARD,
            idempotencyKey: key2,
          },
          testUser1.id,
        ),
      ).rejects.toThrow(BadRequestException);

      const successPayments = await paymentRepo.find({
        where: { orderId: order.id, status: PaymentStatus.SUCCESS },
      });
      expect(successPayments.length).toBe(1);
    });

    it('Acceptance 10: Không âm kho, không trừ kho lặp (Zero Inventory Leakage)', async () => {
      const product = await productRepo.save(
        productRepo.create({
          name: `Limited Drink ${Date.now()}`,
          price: '40000.00',
          stock: 2,
          version: 1,
          isAvailable: true,
        }),
      );

      // Đơn 1 mua 2 ly
      const order1 = await orderRepo.save(
        orderRepo.create({
          userId: testUser1.id,
          customerName: 'Khách A',
          customerPhone: '0901234567',
          status: OrderStatus.PENDING,
          totalAmount: '80000.00',
        }),
      );
      await orderItemRepo.save(
        orderItemRepo.create({
          orderId: order1.id,
          productId: product.id,
          productName: product.name,
          quantity: 2,
          unitPrice: '40000.00',
          subtotal: '80000.00',
          size: ProductSize.SMALL,
        }),
      );

      // Đơn 2 cũng mua 2 ly
      const order2 = await orderRepo.save(
        orderRepo.create({
          userId: testUser2.id,
          customerName: 'Khách B',
          customerPhone: '0907654321',
          status: OrderStatus.PENDING,
          totalAmount: '80000.00',
        }),
      );
      await orderItemRepo.save(
        orderItemRepo.create({
          orderId: order2.id,
          productId: product.id,
          productName: product.name,
          quantity: 2,
          unitPrice: '40000.00',
          subtotal: '80000.00',
          size: ProductSize.SMALL,
        }),
      );

      const key1 = crypto.randomUUID();
      const key2 = crypto.randomUUID();

      // Đơn 1 thanh toán thành công
      const res1 = await service.processPayment(
        {
          orderId: order1.id,
          amount: 80000,
          method: PaymentMethod.MOMO,
          idempotencyKey: key1,
        },
        testUser1.id,
      );
      expect(res1.status).toBe(PaymentStatus.SUCCESS);

      // Tồn kho về 0
      const stockAfter1 = await productRepo.findOneByOrFail({ id: product.id });
      expect(stockAfter1.stock).toBe(0);

      // Đơn 2 cố gắng thanh toán: kho đã 0 -> OCC bồi hoàn, kho KHÔNG bao giờ bị âm
      await expect(
        service.processPayment(
          {
            orderId: order2.id,
            amount: 80000,
            method: PaymentMethod.MOMO,
            idempotencyKey: key2,
          },
          testUser2.id,
        ),
      ).rejects.toThrow(ConflictException);

      const stockAfter2 = await productRepo.findOneByOrFail({ id: product.id });
      expect(stockAfter2.stock).toBe(0);

      // Gửi lại request đơn 1 (duplicate retry) -> trả kết quả cũ, không trừ kho lặp
      const retryRes1 = await service.processPayment(
        {
          orderId: order1.id,
          amount: 80000,
          method: PaymentMethod.MOMO,
          idempotencyKey: key1,
        },
        testUser1.id,
      );
      expect(retryRes1.isDuplicate).toBe(true);

      const stockAfterRetry = await productRepo.findOneByOrFail({ id: product.id });
      expect(stockAfterRetry.stock).toBe(0);
    });

    it('Acceptance 11: GET status không gây tác động thay đổi trạng thái (Pure Read-Only Semantics - FIX-17)', async () => {
      const { product, order } = await createTestProductAndOrder(10, 1);
      const key = crypto.randomUUID();

      // Tạo giao dịch PENDING
      await service.processPayment(
        {
          orderId: order.id,
          amount: 40000,
          method: PaymentMethod.MOMO,
          idempotencyKey: key,
          mockOutcome: 'PENDING',
        },
        testUser1.id,
      );

      // Ghi nhận trạng thái kho và đơn trước khi GET
      const productBeforeGet = await productRepo.findOneByOrFail({ id: product.id });
      const orderBeforeGet = await orderRepo.findOneByOrFail({ id: order.id });

      // Gọi getPaymentStatus (tương ứng endpoint GET /payments/status/:idempotencyKey)
      const statusRes = await service.getPaymentStatus(key, testUser1.id);
      expect(statusRes.status).toBe(PaymentStatus.PENDING);
      expect(statusRes.payment.idempotencyKey).toBe(key);

      // Xác minh tuyệt đối: Không có bất kỳ tác động làm thay đổi DB hay tồn kho nào
      const productAfterGet = await productRepo.findOneByOrFail({ id: product.id });
      expect(productAfterGet.stock).toBe(productBeforeGet.stock);
      expect(productAfterGet.version).toBe(productBeforeGet.version);

      const orderAfterGet = await orderRepo.findOneByOrFail({ id: order.id });
      expect(orderAfterGet.status).toBe(orderBeforeGet.status);
    });

    it('Acceptance 12: Migration trên database có dữ liệu cũ thông qua TypeORM runner thật (FIX-22)', async () => {
      // 1. Tạo schema baseline cũ hoàn toàn không có stock, version, payments (mô phỏng trạng thái trước Task 5.1.3)
      const setupRunner = dataSource.createQueryRunner();
      await setupRunner.connect();

      try {
        await setupRunner.query(`
          CREATE SCHEMA IF NOT EXISTS "legacy_migration_test";
        `);
      } finally {
        await setupRunner.release();
      }

      // 2. Cấu hình DataSource độc lập trỏ vào schema kiểm thử với synchronize = false
      const migrationDataSource = new DataSource({
        type: 'postgres',
        host: process.env.POSTGRES_HOST || 'localhost',
        port: Number(process.env.POSTGRES_PORT || 5432),
        username: process.env.POSTGRES_USER || 'brewlite',
        password: process.env.POSTGRES_PASSWORD || 'brewlite_dev_password',
        database: process.env.POSTGRES_DB || 'brewlite_test',
        schema: 'legacy_migration_test',
        synchronize: false,
        migrations: [AddPaymentsAndStockOcc1732147200000],
        migrationsTableName: 'migrations',
        extra: {
          options: '-c search_path=legacy_migration_test',
        },
      });

      await migrationDataSource.initialize();

      try {
        const qr = migrationDataSource.createQueryRunner();
        await qr.connect();

        // Tạo baseline schema cũ trong schema kiểm thử (PR #29 & #30 baseline)
        await qr.query(`
          DROP TABLE IF EXISTS "legacy_migration_test"."order_items" CASCADE;
          DROP TABLE IF EXISTS "legacy_migration_test"."payments" CASCADE;
          DROP TABLE IF EXISTS "legacy_migration_test"."orders" CASCADE;
          DROP TABLE IF EXISTS "legacy_migration_test"."products" CASCADE;
          DROP TABLE IF EXISTS "legacy_migration_test"."users" CASCADE;
          DROP TABLE IF EXISTS "legacy_migration_test"."migrations" CASCADE;

          CREATE TABLE "legacy_migration_test"."users" (
            "id" SERIAL PRIMARY KEY,
            "email" varchar NOT NULL,
            "passwordHash" varchar NOT NULL,
            "createdAt" timestamp NOT NULL DEFAULT now()
          );

          CREATE TABLE "legacy_migration_test"."products" (
            "id" SERIAL PRIMARY KEY,
            "name" varchar NOT NULL,
            "price" numeric(12, 2) NOT NULL,
            "isAvailable" boolean NOT NULL DEFAULT true
          );

          CREATE TABLE "legacy_migration_test"."orders" (
            "id" SERIAL PRIMARY KEY,
            "userId" integer NOT NULL,
            "totalAmount" numeric(12, 2) NOT NULL,
            "status" varchar(30) NOT NULL,
            "createdAt" timestamp NOT NULL DEFAULT now(),
            CONSTRAINT "FK_orders_userId" FOREIGN KEY ("userId") REFERENCES "legacy_migration_test"."users" ("id")
          );

          CREATE TABLE "legacy_migration_test"."order_items" (
            "id" SERIAL PRIMARY KEY,
            "orderId" integer NOT NULL,
            "productId" integer NOT NULL,
            "productName" varchar NOT NULL,
            "quantity" integer NOT NULL,
            "price" numeric(12, 2) NOT NULL,
            CONSTRAINT "FK_order_items_orderId" FOREIGN KEY ("orderId") REFERENCES "legacy_migration_test"."orders" ("id"),
            CONSTRAINT "FK_order_items_productId" FOREIGN KEY ("productId") REFERENCES "legacy_migration_test"."products" ("id")
          );

          -- Thêm dữ liệu ban đầu
          INSERT INTO "legacy_migration_test"."users" ("id", "email", "passwordHash")
          VALUES (1001, 'legacy_user@brewlite.vn', 'hash_legacy_123');

          INSERT INTO "legacy_migration_test"."products" ("id", "name", "price", "isAvailable")
          VALUES (2001, 'Cà phê Phin Cũ', 29000.00, true);

          INSERT INTO "legacy_migration_test"."orders" ("id", "userId", "totalAmount", "status")
          VALUES (3001, 1001, 29000.00, 'PENDING');

          INSERT INTO "legacy_migration_test"."order_items" ("orderId", "productId", "productName", "quantity", "price")
          VALUES (3001, 2001, 'Cà phê Phin Cũ', 1, 29000.00);
        `);
        await qr.release();

        // 3. Thực thi migration thông qua TypeORM Migration Runner thật (không synchronize, không tự INSERT)
        const executedMigrations = await migrationDataSource.runMigrations();
        expect(executedMigrations.length).toBe(1);
        expect(executedMigrations[0].name).toBe('AddPaymentsAndStockOcc1732147200000');

        // 4. Kiểm tra bảng migrations history do TypeORM tự động ghi nhận
        const historyRows = await migrationDataSource.query(
          `SELECT * FROM "legacy_migration_test"."migrations" WHERE "name" = 'AddPaymentsAndStockOcc1732147200000'`,
        );
        expect(historyRows.length).toBe(1);
        expect(Number(historyRows[0].timestamp)).toBe(1732147200000);

        // 5. Kiểm tra dữ liệu cũ còn nguyên và schema mới được cập nhật chuẩn xác
        const products = await migrationDataSource.query(
          `SELECT * FROM "legacy_migration_test"."products" WHERE "id" = 2001`,
        );
        expect(products.length).toBe(1);
        expect(products[0].name).toBe('Cà phê Phin Cũ');
        expect(Number(products[0].price)).toBe(29000);
        expect(products[0].stock).toBe(50); // Mặc định từ migration
        expect(products[0].version).toBe(1); // Mặc định từ migration

        const orders = await migrationDataSource.query(
          `SELECT * FROM "legacy_migration_test"."orders" WHERE "id" = 3001`,
        );
        expect(orders.length).toBe(1);
        expect(orders[0].pickupMethod).toBe('AT_COUNTER'); // Mặc định từ migration
        expect(orders[0].orderCode).toBeNull();

        // 6. Chạy migration lần thứ 2: Không thực hiện lại (idempotent), không thay đổi dữ liệu
        const secondRun = await migrationDataSource.runMigrations();
        expect(secondRun.length).toBe(0);

        // 7. Xác nhận forward-only: down() ném lỗi từ chối rollback
        const migrationInstance = new AddPaymentsAndStockOcc1732147200000();
        const testQr = migrationDataSource.createQueryRunner();
        await testQr.connect();
        try {
          await expect(migrationInstance.down(testQr)).rejects.toThrow(
            /Rollback is prohibited by project policy/,
          );
        } finally {
          await testQr.release();
        }
      } finally {
        await migrationDataSource.destroy();
      }
    });

    it('Acceptance 13: Recovery Worker tự động kích hoạt và điều phối nguyên tử sau restart (FIX-19)', async () => {
      // 1. Tạo 2 giao dịch dở dang trong database: 1 PENDING và 1 REFUND_PENDING
      const { product: prod1, order: ord1 } = await createTestProductAndOrder(10, 1);
      const key1 = crypto.randomUUID();

      const res1 = await service.processPayment(
        {
          orderId: ord1.id,
          amount: 40000,
          method: PaymentMethod.MOMO,
          idempotencyKey: key1,
          mockOutcome: 'PENDING',
        },
        testUser1.id,
      );
      expect(res1.status).toBe(PaymentStatus.PENDING);

      // Cổng thanh toán ghi nhận SUCCESS sau đó cho giao dịch 1
      await mockGateway.setTransactionStatus(res1.payment.merchantReference!, 'SUCCESS');

      // Tạo giao dịch 2 bị kẹt ở REFUND_PENDING
      const { order: ord2 } = await createTestProductAndOrder(1, 2);
      const key2 = crypto.randomUUID();
      const refundKey2 = `refund-${key2}`;
      const merchantRef2 = `BL-REF-${ord2.id}-${key2.replace(/-/g, '').slice(0, 16)}`;

      await paymentRepo.save(
        paymentRepo.create({
          orderId: ord2.id,
          userId: testUser1.id,
          amount: '80000.00',
          method: PaymentMethod.MOMO,
          status: PaymentStatus.REFUND_PENDING,
          idempotencyKey: key2,
          transactionId: 'TX-STUCK-REFUND',
          merchantReference: merchantRef2,
          refundKey: refundKey2,
        }),
      );
      await mockGateway.charge({
        merchantReference: merchantRef2,
        amount: 80000,
        method: PaymentMethod.MOMO,
      });
      await mockGateway.refund({
        merchantReference: merchantRef2,
        refundKey: refundKey2,
        amount: 80000,
      });

      // 2. Khởi tạo Recovery Worker và kích hoạt chu trình phục hồi
      const worker = new PaymentsRecoveryWorker(service);
      const recoveryResult = await worker.runRecovery('bootstrap-test');
      expect(recoveryResult.reconciledCount).toBeGreaterThanOrEqual(2);

      // 3. Kiểm tra kết quả phục hồi trong database
      const p1 = await paymentRepo.findOneByOrFail({ idempotencyKey: key1 });
      expect(p1.status).toBe(PaymentStatus.SUCCESS);

      const o1 = await orderRepo.findOneByOrFail({ id: ord1.id });
      expect(o1.status).toBe(OrderStatus.PAID);

      const p2 = await paymentRepo.findOneByOrFail({ idempotencyKey: key2 });
      expect(p2.status).toBe(PaymentStatus.REFUNDED);

      const o2 = await orderRepo.findOneByOrFail({ id: ord2.id });
      expect(o2.status).toBe(OrderStatus.CANCELLED);

      // Tồn kho sản phẩm 1 được trừ chính xác
      const freshProd1 = await productRepo.findOneByOrFail({ id: prod1.id });
      expect(freshProd1.stock).toBe(9);
    });

    it('Acceptance 14: Refund State Consistency theo BR-REFUND-OCC (FIX-21)', async () => {
      const { order } = await createTestProductAndOrder(1, 2);
      const key = crypto.randomUUID();

      // Đặt 2 ly khi kho chỉ có 1 ly: kích hoạt TX3 bồi hoàn
      await expect(
        service.processPayment(
          {
            orderId: order.id,
            amount: 80000,
            method: PaymentMethod.CARD,
            idempotencyKey: key,
          },
          testUser1.id,
        ),
      ).rejects.toThrow(ConflictException);

      // Kiểm tra trong DB: Order là CANCELLED và Payment là REFUNDED trong cùng transaction
      const p = await paymentRepo.findOneByOrFail({ idempotencyKey: key });
      expect(p.status).toBe(PaymentStatus.REFUNDED);
      expect(p.refundKey).toBe(`refund-${key}`);

      const o = await orderRepo.findOneByOrFail({ id: order.id });
      expect(o.status).toBe(OrderStatus.CANCELLED);

      // Chặn tạo thanh toán mới cho đơn đã CANCELLED
      const newKey = crypto.randomUUID();
      await expect(
        service.processPayment(
          {
            orderId: order.id,
            amount: 80000,
            method: PaymentMethod.MOMO,
            idempotencyKey: newKey,
          },
          testUser1.id,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('Acceptance 15: HTTP GET Endpoint thuần đọc và không có GET reconcile (FIX-20)', async () => {
      // 1. Kiểm tra controller không có phương thức reconcilePaymentGet (loại bỏ hoàn toàn endpoint GET /payments/reconcile/:key)
      const controller = new PaymentsController(service);
      expect((controller as any).reconcilePaymentGet).toBeUndefined();

      // 2. Kiểm tra GET /payments/status/:idempotencyKey thuần đọc
      const { product, order } = await createTestProductAndOrder(10, 1);
      const key = crypto.randomUUID();

      await service.processPayment(
        {
          orderId: order.id,
          amount: 40000,
          method: PaymentMethod.MOMO,
          idempotencyKey: key,
          mockOutcome: 'PENDING',
        },
        testUser1.id,
      );

      const prodBefore = await productRepo.findOneByOrFail({ id: product.id });
      const orderBefore = await orderRepo.findOneByOrFail({ id: order.id });

      const statusRes = await controller.getPaymentStatus(key, { id: testUser1.id } as any);
      expect(statusRes.status).toBe(PaymentStatus.PENDING);

      // Khẳng định không có bất kỳ thay đổi nào trên DB
      const prodAfter = await productRepo.findOneByOrFail({ id: product.id });
      expect(prodAfter.stock).toBe(prodBefore.stock);
      expect(prodAfter.version).toBe(prodBefore.version);

      const orderAfter = await orderRepo.findOneByOrFail({ id: order.id });
      expect(orderAfter.status).toBe(orderBefore.status);
    });

    it('Acceptance 16: PostgreSQL Advisory Lock Session Safety với 2 DataSource độc lập và zero lingering lock (FIX-23)', async () => {
      // 1. Chuẩn bị đơn hàng và payment PENDING
      const { product, order } = await createTestProductAndOrder(10, 1);
      const key = crypto.randomUUID();

      const res = await service.processPayment(
        {
          orderId: order.id,
          amount: 40000,
          method: PaymentMethod.MOMO,
          idempotencyKey: key,
          mockOutcome: 'PENDING',
        },
        testUser1.id,
      );
      expect(res.status).toBe(PaymentStatus.PENDING);

      // Cổng thanh toán chuyển sang SUCCESS
      await mockGateway.setTransactionStatus(res.payment.merchantReference!, 'SUCCESS');

      // 2. Tạo DataSource thứ 2 hoàn toàn độc lập (riêng biệt connection pool)
      const dataSource2 = new DataSource({
        type: 'postgres',
        host: process.env.POSTGRES_HOST || 'localhost',
        port: Number(process.env.POSTGRES_PORT || 5432),
        username: process.env.POSTGRES_USER || 'brewlite',
        password: process.env.POSTGRES_PASSWORD || 'brewlite_dev_password',
        database: process.env.POSTGRES_DB || 'brewlite_test',
        entities: [User, Product, Order, OrderItem, Payment],
        synchronize: false,
      });
      await dataSource2.initialize();

      const worker1 = new PaymentsService(
        dataSource.getRepository(Payment),
        dataSource.getRepository(Order),
        dataSource.getRepository(Product),
        dataSource,
        mockGateway,
      );

      const worker2 = new PaymentsService(
        dataSource2.getRepository(Payment),
        dataSource2.getRepository(Order),
        dataSource2.getRepository(Product),
        dataSource2,
        mockGateway,
      );

      try {
        // Chạy reconcile đồng thời trên 2 worker thuộc 2 connection pool / session độc lập
        const [w1Result, w2Result] = await Promise.all([
          worker1.reconcilePendingPayments(),
          worker2.reconcilePendingPayments(),
        ]);

        // Một worker acquire được lock và xử lý; worker kia nhận false và skip an toàn
        const totalReconciled = w1Result.reconciledCount + w2Result.reconciledCount;
        expect(totalReconciled).toBeGreaterThanOrEqual(1);

        // Giao dịch cụ thể này được đối soát thành công
        const paymentAfter = await paymentRepo.findOneByOrFail({ idempotencyKey: key });
        expect(paymentAfter.status).toBe(PaymentStatus.SUCCESS);

        // Đơn hàng thành PAID và tồn kho chỉ trừ đúng 1 lần
        const freshOrder = await orderRepo.findOneByOrFail({ id: order.id });
        expect(freshOrder.status).toBe(OrderStatus.PAID);

        const freshProduct = await productRepo.findOneByOrFail({ id: product.id });
        expect(freshProduct.stock).toBe(9);
        expect(freshProduct.version).toBe(2);

        // 3. Xác minh không có bất kỳ advisory lock nào bị rò rỉ sau khi xử lý xong
        const activeLocks = await dataSource.query(
          `SELECT count(*) as count FROM pg_locks WHERE locktype = 'advisory'`,
        );
        expect(Number(activeLocks[0].count)).toBe(0);
      } finally {
        await dataSource2.destroy();
      }
    });

    it('Acceptance 17: Kiểm tra trạng thái trung gian hoàn tiền (PENDING, FAILED, SUCCESS) theo hợp đồng BR-REFUND-OCC (FIX-24)', async () => {
      // 1. Chuẩn bị sản phẩm tồn kho 1 ly, đặt 2 ly để gây lỗi OCC stock depletion
      const { product, order } = await createTestProductAndOrder(1, 2);
      const key = crypto.randomUUID();
      const refundKey = `refund-${key}`;
      const merchantReference = `BL-REF-${order.id}-${key.replace(/-/g, '').slice(0, 16)}`;

      // Giả lập cổng thanh toán: charge SUCCESS, nhưng refund trả về PENDING ban đầu
      await mockGateway.charge({
        merchantReference,
        amount: 80000,
        method: PaymentMethod.MOMO,
      });
      await mockGateway.setRefundStatus(refundKey, 'PENDING', merchantReference, 80000);

      // Thực hiện thanh toán: OCC thất bại, TX3 commit Payment REFUND_PENDING
      await expect(
        service.processPayment(
          {
            orderId: order.id,
            amount: 80000,
            method: PaymentMethod.MOMO,
            idempotencyKey: key,
          },
          testUser1.id,
        ),
      ).rejects.toThrow(ConflictException);

      // --- TRẠNG THÁI TRUNG GIAN 1 (Gateway Refund đang PENDING) ---
      // Payment phải ở REFUND_PENDING kèm refundKey
      const intermediatePayment = await paymentRepo.findOneByOrFail({ idempotencyKey: key });
      expect(intermediatePayment.status).toBe(PaymentStatus.REFUND_PENDING);
      expect(intermediatePayment.refundKey).toBe(refundKey);

      // Đơn hàng TUYỆT ĐỐI CHƯA được chuyển sang CANCELLED khi refund chưa hoàn tất (FIX-24 requirement 2)
      const intermediateOrder = await orderRepo.findOneByOrFail({ id: order.id });
      expect(intermediateOrder.status).toBe(OrderStatus.PENDING);

      // Tồn kho không bị trừ sai (vẫn còn 1 ly) (FIX-24 requirement 7)
      const prodCheck1 = await productRepo.findOneByOrFail({ id: product.id });
      expect(prodCheck1.stock).toBe(1);

      // Chặn tạo payment mới cho đơn hàng này với key khác khi đang REFUND_PENDING (FIX-24 requirement 3)
      const otherKey = crypto.randomUUID();
      await expect(
        service.processPayment(
          {
            orderId: order.id,
            amount: 80000,
            method: PaymentMethod.CARD,
            idempotencyKey: otherKey,
          },
          testUser1.id,
        ),
      ).rejects.toThrow(ConflictException);

      // --- TRẠNG THÁI TRUNG GIAN 2 (Cổng thanh toán tạm thời FAILED / TIMEOUT) ---
      await mockGateway.setRefundStatus(refundKey, 'FAILED');
      const reconcileFailedResult = await service.reconcilePayment(key, testUser1.id);
      expect(reconcileFailedResult.status).toBe(PaymentStatus.REFUND_PENDING);

      // Order vẫn giữ PENDING để cho phép retry
      const orderAfterFailed = await orderRepo.findOneByOrFail({ id: order.id });
      expect(orderAfterFailed.status).toBe(OrderStatus.PENDING);

      // --- TRẠNG THÁI HOÀN TẤT (Gateway chuyển sang SUCCESS sau retry/restart) ---
      // Giả lập cổng thanh toán xác nhận hoàn tiền thành công
      await mockGateway.setRefundStatus(refundKey, 'SUCCESS');

      // Worker hoặc reconcile thực hiện đối soát lại với cùng refundKey (FIX-24 requirement 6)
      const worker = new PaymentsRecoveryWorker(service);
      const recoveryResult = await worker.runRecovery('refund-success-test');
      expect(recoveryResult.reconciledCount).toBeGreaterThanOrEqual(1);

      // Sau khi Gateway SUCCESS: TX4 cập nhật nguyên tử Payment REFUNDED và Order CANCELLED (FIX-24 requirement 4)
      const finalPayment = await paymentRepo.findOneByOrFail({ idempotencyKey: key });
      expect(finalPayment.status).toBe(PaymentStatus.REFUNDED);

      const finalOrder = await orderRepo.findOneByOrFail({ id: order.id });
      expect(finalOrder.status).toBe(OrderStatus.CANCELLED);

      // Tồn kho vẫn bảo toàn 1 ly, không bị trừ âm hay lệch version (FIX-24 requirement 7)
      const prodFinal = await productRepo.findOneByOrFail({ id: product.id });
      expect(prodFinal.stock).toBe(1);

      // Gọi lại lần nữa với cùng key để xác minh không hoàn tiền 2 lần (idempotent duplicate)
      const dupReconcile = await service.reconcilePayment(key, testUser1.id);
      expect(dupReconcile.isDuplicate).toBe(true);
      expect(dupReconcile.status).toBe(PaymentStatus.REFUNDED);
    });
  });
});
