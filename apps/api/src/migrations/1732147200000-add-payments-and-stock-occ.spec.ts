import { QueryRunner } from 'typeorm';
import { AddPaymentsAndStockOcc1732147200000 } from './1732147200000-add-payments-and-stock-occ';

describe('AddPaymentsAndStockOcc1732147200000 Migration Safeguard', () => {
  let migration: AddPaymentsAndStockOcc1732147200000;
  let mockQueryRunner: Partial<QueryRunner>;

  beforeEach(() => {
    migration = new AddPaymentsAndStockOcc1732147200000();
  });

  describe('up()', () => {
    it('executes SQL queries to add stock, version, orderCode, pickupMethod, tableNumber and payments table', async () => {
      mockQueryRunner = {
        getTable: jest.fn().mockResolvedValue({ name: 'orders' } as any),
        query: jest.fn().mockResolvedValue([]),
      };

      await migration.up(mockQueryRunner as QueryRunner);

      expect(mockQueryRunner.getTable).toHaveBeenCalledWith('orders');
      expect(mockQueryRunner.query).toHaveBeenCalledTimes(4);
    });

    it('throws error if orders table does not exist', async () => {
      mockQueryRunner = {
        getTable: jest.fn().mockResolvedValue(null),
        query: jest.fn(),
      };

      await expect(migration.up(mockQueryRunner as QueryRunner)).rejects.toThrow(
        'The orders table must exist before applying payments migration.',
      );
    });
  });

  describe('down() with Forward-Only Migration Policy', () => {
    it('prohibits automatic rollback and throws explicit forward-only policy error', async () => {
      mockQueryRunner = {
        query: jest.fn(),
      };

      await expect(migration.down()).rejects.toThrow(
        'Rollback is prohibited by project policy: AddPaymentsAndStockOcc1732147200000 is a forward-only migration.',
      );
      expect(mockQueryRunner.query).not.toHaveBeenCalled();
    });
  });
});
