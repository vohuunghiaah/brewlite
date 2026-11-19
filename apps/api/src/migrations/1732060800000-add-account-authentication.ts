import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountAuthentication1732060800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const orders = await queryRunner.getTable('orders');
    if (!orders) {
      throw new Error(
        'The BrewLite order schema must exist before applying the authentication migration.',
      );
    }

    // A development database may already have these objects from synchronization.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "email" varchar(254) NOT NULL,
        "passwordHash" varchar(60) NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "userId" integer
    `);

    if (
      !orders.foreignKeys.some(({ name }) => name === 'FK_orders_userId_users')
    ) {
      await queryRunner.query(`
        ALTER TABLE "orders"
        ADD CONSTRAINT "FK_orders_userId_users" FOREIGN KEY ("userId") REFERENCES "users" ("id")
      `);
    }

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orders_userId" ON "orders" ("userId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_userId_users"',
    );
    await queryRunner.query('DROP INDEX "IDX_orders_userId"');
    await queryRunner.query('ALTER TABLE "orders" DROP COLUMN "userId"');
    await queryRunner.query('DROP TABLE "users"');
  }
}
