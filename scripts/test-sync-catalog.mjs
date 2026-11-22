import { spawnSync } from 'node:child_process';
import assert from 'node:assert';
import test from 'node:test';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TARGET_CATALOG, syncCatalog } from './sync-catalog.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

let pg;
try {
  pg = require(path.join(root, 'apps/api/node_modules/pg'));
} catch {
  pg = require('pg');
}
const { Client } = pg;

test('Catalog Synchronization Strategy: Specification & Safety Tests', async (t) => {
  await t.test('1. Fails safe when run without --dry-run or --apply flag', () => {
    const res = spawnSync('node', ['scripts/sync-catalog.mjs'], { encoding: 'utf8' });
    assert.strictEqual(res.status, 1, 'Process should exit with code 1 when no execution mode is specified');
    assert.match(res.stderr, /--dry-run[\s\S]*--apply/, 'Should output helpful usage instructions');
  });

  await t.test('2. TARGET_CATALOG contains 15 distinct items and preserves existing baseline', () => {
    assert.strictEqual(TARGET_CATALOG.length, 15, 'Target catalog must contain exactly 15 products');

    const first4Names = TARGET_CATALOG.slice(0, 4).map((p) => p.name);
    assert.deepStrictEqual(
      first4Names,
      ['Cà phê Latte', 'Trà đào', 'Cacao sữa', 'Nước suối'],
      'Existing 4 products must be preserved in original baseline order'
    );
  });

  await t.test('3. Demonstrates required inventory states (at least 2 out-of-stock and 1 low-stock)', () => {
    const outOfStock = TARGET_CATALOG.filter((p) => p.stock === 0 || !p.isAvailable);
    assert.ok(outOfStock.length >= 2, `Expected at least 2 out of stock drinks, found ${outOfStock.length}`);
    const outOfStockNames = outOfStock.map((p) => p.name);
    assert.ok(outOfStockNames.includes('Matcha Latte'));
    assert.ok(outOfStockNames.includes('Trà chanh mật ong'));

    const lowStock = TARGET_CATALOG.filter((p) => p.isAvailable && p.stock >= 1 && p.stock <= 10);
    assert.ok(lowStock.length >= 1, `Expected at least 1 low-stock drink (1-10), found ${lowStock.length}`);
    assert.strictEqual(lowStock[0].name, 'Cold Brew cam');
    assert.strictEqual(lowStock[0].stock, 8);
  });

  await t.test('4. All 15 products have valid demonstration prices, descriptions, and non-negative stock', () => {
    for (const item of TARGET_CATALOG) {
      assert.ok(item.name && item.name.trim().length > 0, `Product name must be non-empty`);
      assert.ok(item.description && item.description.trim().length > 0, `Product description must be non-empty`);
      assert.ok(Number(item.price) > 0, `Product price must be positive`);
      assert.ok(item.stock >= 0, `Product stock must be non-negative`);
      assert.ok(item.imageUrl && item.imageUrl.startsWith('https://'), `Product image must have valid https URL`);
    }
  });

  await t.test('5. No duplicate product names in target catalog', () => {
    const names = TARGET_CATALOG.map((p) => p.name.toLowerCase());
    const uniqueNames = new Set(names);
    assert.strictEqual(names.length, uniqueNames.size, 'Every product name in target catalog must be unique');
  });
});

test('Catalog Synchronization: PostgreSQL Integration Tests (FIX-02)', async (t) => {
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = Number(process.env.POSTGRES_PORT || 5432);
  const user = process.env.POSTGRES_USER || 'brewlite';
  const password = process.env.POSTGRES_PASSWORD || 'brewlite_dev_password';
  const database = process.env.POSTGRES_DB || 'brewlite';

  const client = new Client({
    host,
    port,
    user,
    password,
    database,
    connectionTimeoutMillis: 3000,
  });

  let isConnected = false;
  try {
    await client.connect();
    isConnected = true;
  } catch (err) {
    console.log(`[SKIPPED] PostgreSQL không khả dụng (${err.message}) - bỏ qua integration tests.`);
    return;
  }

  try {
    await t.test('6. Dry-run execution strictly does NOT write any data to PostgreSQL', async () => {
      const beforeRes = await client.query('SELECT count(*) FROM products');
      const countBefore = Number(beforeRes.rows[0].count);

      const dryRunResult = await syncCatalog({ client, isDryRun: true });
      assert.strictEqual(dryRunResult.mode, 'dry-run');
      assert.strictEqual(dryRunResult.insertedCount, 0);

      const afterRes = await client.query('SELECT count(*) FROM products');
      const countAfter = Number(afterRes.rows[0].count);

      assert.strictEqual(countAfter, countBefore, 'Dry-run must leave products count completely untouched');
    });

    await t.test('7. Apply execution is idempotent: repeated runs insert 0 duplicate items', async () => {
      const run1 = await syncCatalog({ client, isApply: true });
      assert.strictEqual(run1.mode, 'apply');

      const run2 = await syncCatalog({ client, isApply: true });
      assert.strictEqual(run2.mode, 'apply');
      assert.strictEqual(run2.insertedCount, 0, 'Second apply must insert 0 items and maintain exact catalog');
    });

    await t.test('8. Atomic Rollback: Error during apply rolls back all insertions without partial writes', async () => {
      const uniqueSuffix = Date.now().toString(36);
      const testItemName = `Rollback Test Item ${uniqueSuffix}`;
      const failingCatalog = [
        ...TARGET_CATALOG,
        {
          name: testItemName,
          description: 'Will be rolled back',
          price: '30000',
          imageUrl: 'https://images.unsplash.com/test',
          isAvailable: true,
          stock: 10,
        },
      ];

      await assert.rejects(
        async () => {
          await syncCatalog({
            client,
            isApply: true,
            targetCatalog: failingCatalog,
            simulateError: true,
          });
        },
        /Simulated failure/,
        'Sync should reject with simulated failure'
      );

      // Verify the item was rolled back
      const checkRes = await client.query('SELECT count(*) FROM products WHERE name = $1', [testItemName]);
      assert.strictEqual(Number(checkRes.rows[0].count), 0, 'Item must NOT be inserted after rollback');
    });

    await t.test('9. Concurrent apply execution: Serialized by transaction advisory lock without collision', async () => {
      const client2 = new Client({ host, port, user, password, database, connectionTimeoutMillis: 3000 });
      await client2.connect();

      try {
        const uniqueSuffix = Date.now().toString(36);
        const concurrentItemName = `Concurrent Drink ${uniqueSuffix}`;
        const concurrentCatalog = [
          ...TARGET_CATALOG,
          {
            name: concurrentItemName,
            description: 'Concurrent race test item',
            price: '35000',
            imageUrl: 'https://images.unsplash.com/test',
            isAvailable: true,
            stock: 12,
          },
        ];

        // Run two syncCatalog in parallel
        const [res1, res2] = await Promise.all([
          syncCatalog({ client, isApply: true, targetCatalog: concurrentCatalog }),
          syncCatalog({ client: client2, isApply: true, targetCatalog: concurrentCatalog }),
        ]);

        const totalInserted = res1.insertedCount + res2.insertedCount;
        assert.strictEqual(totalInserted, 1, 'Exactly one concurrent worker must insert the item; the second inserts 0');

        const dbRes = await client.query('SELECT count(*) FROM products WHERE name = $1', [concurrentItemName]);
        assert.strictEqual(Number(dbRes.rows[0].count), 1, 'Database must contain exactly 1 copy of the item');

        // Cleanup the test item
        await client.query('DELETE FROM products WHERE name = $1', [concurrentItemName]);
      } finally {
        await client2.end();
      }
    });
  } finally {
    if (isConnected) {
      await client.end();
    }
  }
});
