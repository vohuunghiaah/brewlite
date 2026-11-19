import { QueryRunner, TableColumn } from 'typeorm';
import { AddCustomizationAndNoteToOrderItems1731974400000 } from './1731974400000-AddCustomizationAndNoteToOrderItems';

describe('AddCustomizationAndNoteToOrderItems Migration Safeguard', () => {
  let migration: AddCustomizationAndNoteToOrderItems1731974400000;
  let mockQueryRunner: Partial<QueryRunner>;

  beforeEach(() => {
    migration = new AddCustomizationAndNoteToOrderItems1731974400000();
  });

  describe('up()', () => {
    it('adds missing columns size, toppings, and note if they do not exist', async () => {
      const addedColumns: { table: string; column: TableColumn }[] = [];
      mockQueryRunner = {
        hasColumn: jest.fn().mockResolvedValue(false),
        addColumn: jest.fn().mockImplementation((table, column) => {
          addedColumns.push({ table, column });
          return Promise.resolve();
        }),
      };

      await migration.up(mockQueryRunner as QueryRunner);

      expect(mockQueryRunner.hasColumn).toHaveBeenCalledTimes(3);
      expect(mockQueryRunner.addColumn).toHaveBeenCalledTimes(3);
      expect(addedColumns.map((c) => c.column.name)).toEqual(['size', 'toppings', 'note']);
    });

    it('skips adding columns if they already exist', async () => {
      mockQueryRunner = {
        hasColumn: jest.fn().mockResolvedValue(true),
        addColumn: jest.fn(),
      };

      await migration.up(mockQueryRunner as QueryRunner);

      expect(mockQueryRunner.hasColumn).toHaveBeenCalledTimes(3);
      expect(mockQueryRunner.addColumn).not.toHaveBeenCalled();
    });
  });

  describe('down() with Zero Data Loss Safeguard', () => {
    it('aborts rollback if table does not exist', async () => {
      mockQueryRunner = {
        hasTable: jest.fn().mockResolvedValue(false),
        query: jest.fn(),
        dropColumn: jest.fn(),
      };

      await migration.down(mockQueryRunner as QueryRunner);

      expect(mockQueryRunner.hasTable).toHaveBeenCalledWith('order_items');
      expect(mockQueryRunner.query).not.toHaveBeenCalled();
      expect(mockQueryRunner.dropColumn).not.toHaveBeenCalled();
    });

    it('ABORTS DROP COLUMN when order_items table has live records (prevents data loss)', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockQueryRunner = {
        hasTable: jest.fn().mockResolvedValue(true),
        query: jest.fn().mockResolvedValue([{ count: 42 }]),
        dropColumn: jest.fn(),
      };

      await migration.down(mockQueryRunner as QueryRunner);

      expect(mockQueryRunner.hasTable).toHaveBeenCalledWith('order_items');
      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        'SELECT COUNT(*)::int AS count FROM "order_items"',
      );
      // Safeguard must prevent any dropColumn calls
      expect(mockQueryRunner.dropColumn).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MIGRATION SAFEGUARD] Bảng "order_items" hiện chứa 42 bản ghi dữ liệu'),
      );
      warnSpy.mockRestore();
    });

    it('safely drops columns when table is completely empty (e.g. CI/isolated rollback)', async () => {
      const droppedColumns: { table: string; column: string }[] = [];
      mockQueryRunner = {
        hasTable: jest.fn().mockResolvedValue(true),
        query: jest.fn().mockResolvedValue([{ count: 0 }]),
        hasColumn: jest.fn().mockResolvedValue(true),
        dropColumn: jest.fn().mockImplementation((table, column) => {
          droppedColumns.push({ table, column });
          return Promise.resolve();
        }),
      };

      await migration.down(mockQueryRunner as QueryRunner);

      expect(mockQueryRunner.dropColumn).toHaveBeenCalledTimes(3);
      expect(droppedColumns.map((c) => c.column)).toEqual(['note', 'toppings', 'size']);
    });
  });
});
