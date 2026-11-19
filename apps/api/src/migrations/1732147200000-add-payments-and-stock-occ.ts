import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentsAndStockOcc1732147200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const orders = await queryRunner.getTable('orders');
    if (!orders) {
      throw new Error('The orders table must exist before applying payments migration.');
    }

    // 1. Thêm cột tồn kho stock và version khóa lạc quan OCC cho bảng products
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "stock" integer NOT NULL DEFAULT 50,
      ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1
    `);

    // 2. Thêm cột mã nhận nước buzzer, phương thức nhận hàng và số bàn cho bảng orders
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "orderCode" varchar(20),
      ADD COLUMN IF NOT EXISTS "pickupMethod" varchar(30) NOT NULL DEFAULT 'AT_COUNTER',
      ADD COLUMN IF NOT EXISTS "tableNumber" varchar(20)
    `);

    // 3. Tạo bảng payments với ràng buộc toàn vẹn và idempotency key
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" SERIAL PRIMARY KEY,
        "orderId" integer NOT NULL,
        "userId" integer NOT NULL,
        "amount" numeric(12, 2) NOT NULL,
        "method" varchar(30) NOT NULL,
        "status" varchar(30) NOT NULL,
        "idempotencyKey" varchar(128) NOT NULL,
        "transactionId" varchar(100),
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_payments_idempotencyKey" UNIQUE ("idempotencyKey"),
        CONSTRAINT "FK_payments_orderId" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_payments_userId" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payments_orderId" ON "payments" ("orderId");
      CREATE INDEX IF NOT EXISTS "IDX_payments_userId" ON "payments" ("userId");
      CREATE INDEX IF NOT EXISTS "IDX_payments_idempotencyKey" ON "payments" ("idempotencyKey");
    `);
  }

  async down(): Promise<void> {
    throw new Error(
      'Rollback is prohibited by project policy: AddPaymentsAndStockOcc1732147200000 is a forward-only migration. Dropping payments or inventory tracking columns would cause permanent financial data loss.',
    );
  }
}
