import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRole1732233600000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE users ADD COLUMN role varchar(16) NOT NULL DEFAULT 'CUSTOMER'
      CONSTRAINT "CHK_users_role" CHECK (role IN ('CUSTOMER', 'STAFF', 'ADMIN'))
    `);
  }

  async down(): Promise<void> {
    throw new Error('Forward-only migration: retain account roles.');
  }
}
