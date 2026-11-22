import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCatalogDeployments1732320000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const products = await queryRunner.getTable('products');
    if (!products) {
      throw new Error('The products table must exist before applying catalog deployments migration.');
    }

    // Tạo bảng catalog_deployments để lưu trữ manifest và audit an toàn gắn với giao dịch
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "catalog_deployments" (
        "id" SERIAL PRIMARY KEY,
        "deploymentId" varchar(255) NOT NULL,
        "mode" varchar(50) NOT NULL,
        "insertedProductIds" jsonb NOT NULL,
        "insertedItems" jsonb NOT NULL,
        "totalInserted" integer NOT NULL,
        "status" varchar(50) NOT NULL DEFAULT 'APPLIED',
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_catalog_deployments_deploymentId" UNIQUE ("deploymentId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_catalog_deployments_deploymentId" ON "catalog_deployments" ("deploymentId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_catalog_deployments_status" ON "catalog_deployments" ("status");
    `);
  }

  async down(): Promise<void> {
    throw new Error(
      'Rollback is prohibited by project policy: AddCatalogDeployments1732320000000 is a forward-only migration.',
    );
  }
}
