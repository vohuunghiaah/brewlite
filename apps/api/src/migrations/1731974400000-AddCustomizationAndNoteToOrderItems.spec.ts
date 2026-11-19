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

  describe('down() with Forward-Only Migration Policy', () => {
    it('prohibits automatic rollback and rejects with explicit FORWARD_ONLY_MIGRATION error', async () => {
      mockQueryRunner = {
        dropColumn: jest.fn(),
      };

      await expect(migration.down(mockQueryRunner as QueryRunner)).rejects.toThrow(
        'FORWARD_ONLY_MIGRATION: Automatic rollback is prohibited. ' +
          'Use a new migration and an approved data recovery procedure.',
      );
    });

    it('ensures dropColumn is NEVER called on queryRunner', async () => {
      mockQueryRunner = {
        dropColumn: jest.fn(),
      };

      try {
        await migration.down(mockQueryRunner as QueryRunner);
      } catch {
        // Expected throw from forward-only migration policy
      }

      expect(mockQueryRunner.dropColumn).not.toHaveBeenCalled();
    });
  });
});
