import type { MigrationInterface, QueryRunner } from 'typeorm';

// Earlier installations created these three tables through synchronize.
export class CreateOrderCatalog1731888000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS products (
        id serial PRIMARY KEY, name varchar(150) NOT NULL, description text,
        price numeric(10,2) NOT NULL, "imageUrl" varchar(500),
        "isAvailable" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS orders (
        id serial PRIMARY KEY, "customerName" varchar(100) NOT NULL, "customerPhone" varchar(20) NOT NULL,
        note text, "totalAmount" numeric(12,2) NOT NULL, status varchar(20) NOT NULL DEFAULT 'PENDING',
        "createdAt" timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS order_items (
        id serial PRIMARY KEY, "productName" varchar(150) NOT NULL, quantity integer NOT NULL,
        "unitPrice" numeric(12,2) NOT NULL, subtotal numeric(12,2) NOT NULL,
        "orderId" integer REFERENCES orders(id) ON DELETE CASCADE,
        "productId" integer REFERENCES products(id) ON DELETE RESTRICT
      )
    `);
  }

  async down(): Promise<void> {
    throw new Error('FORWARD_ONLY_MIGRATION: preserve existing orders and catalog.');
  }
}
