import { QueryRunner } from 'typeorm';
import { AddCatalogDeployments1732320000000 } from './1732320000000-add-catalog-deployments';

describe('AddCatalogDeployments1732320000000 Migration Safeguard', () => {
  let migration: AddCatalogDeployments1732320000000;
  let mockQueryRunner: Partial<QueryRunner>;

  beforeEach(() => {
    migration = new AddCatalogDeployments1732320000000();
  });

  describe('up()', () => {
    it('executes SQL queries to create catalog_deployments table and indexes', async () => {
      mockQueryRunner = {
        getTable: jest.fn().mockResolvedValue({ name: 'products' } as any),
        query: jest.fn().mockResolvedValue([]),
      };

      await migration.up(mockQueryRunner as QueryRunner);

      expect(mockQueryRunner.getTable).toHaveBeenCalledWith('products');
      expect(mockQueryRunner.query).toHaveBeenCalledTimes(3);
    });

    it('throws error if products table does not exist', async () => {
      mockQueryRunner = {
        getTable: jest.fn().mockResolvedValue(null),
        query: jest.fn(),
      };

      await expect(migration.up(mockQueryRunner as QueryRunner)).rejects.toThrow(
        'The products table must exist before applying catalog deployments migration.',
      );
    });
  });

  describe('down() with Forward-Only Migration Policy', () => {
    it('prohibits automatic rollback and throws explicit forward-only policy error', async () => {
      mockQueryRunner = {
        query: jest.fn(),
      };

      await expect(migration.down()).rejects.toThrow(
        'Rollback is prohibited by project policy: AddCatalogDeployments1732320000000 is a forward-only migration.',
      );
      expect(mockQueryRunner.query).not.toHaveBeenCalled();
    });
  });
});
