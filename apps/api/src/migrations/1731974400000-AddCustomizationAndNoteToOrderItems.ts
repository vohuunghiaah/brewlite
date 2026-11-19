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

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Chính sách FORWARD-ONLY MIGRATION của dự án BrewLite:
    // Tuyệt đối nghiêm cấm rollback tự động (automatic revert) đối với các cột lưu trữ
    // dữ liệu đơn hàng (size, toppings, note) để bảo vệ toàn vẹn dữ liệu (Zero Data Loss).
    // Không được âm thầm 'return' để tránh TypeORM cập nhật sai bảng migrations history
    // trong khi schema thực tế vẫn còn nguyên, cũng như tránh drop cột đã tồn tại từ trước.
    //
    // Quy trình chuẩn khi cần thay đổi schema:
    // 1. Sao lưu dữ liệu (backup) cơ sở dữ liệu hiện tại.
    // 2. Tạo một migration mới dạng tiến tới (forward-only migration) có phương án chuyển đổi dữ liệu.
    // 3. Kiểm thử trên môi trường staging trước khi áp dụng lên production.
    // 4. Tuyệt đối không chạy rollback trên database production.
    throw new Error(
      'FORWARD_ONLY_MIGRATION: Automatic rollback is prohibited. ' +
        'Use a new migration and an approved data recovery procedure.',
    );
  }
}
