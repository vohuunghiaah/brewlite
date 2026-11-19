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
    const hasTable = await queryRunner.hasTable('order_items');
    if (!hasTable) {
      return;
    }

    // Zero Data Loss Safeguard:
    // Nếu bảng order_items đã chứa dữ liệu đơn hàng thực tế, việc DROP COLUMN
    // sẽ làm mất vĩnh viễn dữ liệu tùy chỉnh (size, toppings, note) của các đơn hàng.
    // Theo quy chuẩn vận hành sản xuất của BrewLite:
    // Tuyệt đối không hủy cột khi bảng chứa dữ liệu live. Thay vào đó, áp dụng
    // Forward-Only Migrations hoặc sao lưu (backup) dữ liệu trước khi can thiệp.
    try {
      const rowCountResult = await queryRunner.query(
        'SELECT COUNT(*)::int AS count FROM "order_items"',
      );
      const rowCount = Number(rowCountResult[0]?.count ?? 0);

      if (rowCount > 0) {
        console.warn(
          `[MIGRATION SAFEGUARD] Bảng "order_items" hiện chứa ${rowCount} bản ghi dữ liệu. ` +
            `Hủy bỏ thao tác DROP COLUMN (size, toppings, note) để bảo vệ toàn vẹn dữ liệu đơn hàng. ` +
            `Vui lòng sử dụng forward-only migration hoặc backup dữ liệu trước khi rollback thủ công.`,
        );
        return;
      }
    } catch (error) {
      console.warn(
        '[MIGRATION SAFEGUARD] Không thể kiểm tra số lượng bản ghi trong "order_items", hủy thao tác drop để an toàn:',
        error,
      );
      return;
    }

    // Nếu bảng hoàn toàn rỗng (ví dụ: teardown trong môi trường test/staging cô lập),
    // cho phép rollback an toàn theo thứ tự ngược lại:
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
