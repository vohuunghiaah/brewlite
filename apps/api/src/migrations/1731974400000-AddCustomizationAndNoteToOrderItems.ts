import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCustomizationAndNoteToOrderItems1731974400000
  implements MigrationInterface
{
  name = 'AddCustomizationAndNoteToOrderItems1731974400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Thêm cột 'size' nếu chưa tồn tại (mặc định 'SMALL' cho các bản ghi cũ)
    const hasSize = await queryRunner.hasColumn('order_items', 'size');
    if (!hasSize) {
      await queryRunner.addColumn(
        'order_items',
        new TableColumn({
          name: 'size',
          type: 'varchar',
          length: '20',
          default: "'SMALL'",
          isNullable: false,
        }),
      );
    }

    // 2. Thêm cột 'toppings' nếu chưa tồn tại (mặc định mảng rỗng '[]')
    const hasToppings = await queryRunner.hasColumn('order_items', 'toppings');
    if (!hasToppings) {
      await queryRunner.addColumn(
        'order_items',
        new TableColumn({
          name: 'toppings',
          type: 'jsonb',
          default: "'[]'",
          isNullable: false,
        }),
      );
    }

    // 3. Thêm cột 'note' nếu chưa tồn tại (cho phép null)
    const hasNote = await queryRunner.hasColumn('order_items', 'note');
    if (!hasNote) {
      await queryRunner.addColumn(
        'order_items',
        new TableColumn({
          name: 'note',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback an toàn theo thứ tự ngược lại
    const hasNote = await queryRunner.hasColumn('order_items', 'note');
    if (hasNote) {
      await queryRunner.dropColumn('order_items', 'note');
    }

    const hasToppings = await queryRunner.hasColumn('order_items', 'toppings');
    if (hasToppings) {
      await queryRunner.dropColumn('order_items', 'toppings');
    }

    const hasSize = await queryRunner.hasColumn('order_items', 'size');
    if (hasSize) {
      await queryRunner.dropColumn('order_items', 'size');
    }
  }
}
