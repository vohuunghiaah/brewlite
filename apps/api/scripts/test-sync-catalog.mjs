import { spawnSync } from 'node:child_process';
import assert from 'node:assert';
import test from 'node:test';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TARGET_CATALOG, syncCatalog, resolveDatabaseConfig } from './sync-catalog.mjs';
import { safeCatalogRollback, BASELINE_PRODUCT_NAMES, BASELINE_PRODUCT_IDS } from './safe-catalog-rollback.mjs';

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

test('Catalog Synchronization & Safe Rollback: PostgreSQL Integration Tests (FIX-06 to FIX-09)', async (t) => {
  const isCi = process.env.CI === 'true' || process.env.REQUIRE_DB === 'true';

  let dbConfig;
  try {
    dbConfig = resolveDatabaseConfig();
  } catch (err) {
    if (isCi) {
      throw new Error(`[FAIL] Không thể xác định cấu hình CSDL trong CI: ${err.message}`);
    }
    console.log(`[SKIPPED] Cấu hình CSDL không hợp lệ (${err.message}) - bỏ qua integration tests.`);
    return;
  }

  // Guard against accidental production connection
  if (
    dbConfig.database.includes('prod') ||
    dbConfig.database.includes('live') ||
    /brewlite\.click|lightsail/i.test(dbConfig.host)
  ) {
    throw new Error(
      `❌ FATAL: test-sync-catalog.mjs phát hiện kết nối tới database có tên nguy hiểm (${dbConfig.database}) hoặc host (${dbConfig.host}). Chặn đứng ngay lập tức để bảo vệ dữ liệu production!`
    );
  }

  const client = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    connectionTimeoutMillis: 4000,
  });

  let isConnected = false;
  let connectionError = '';
  try {
    await client.connect();
    isConnected = true;
  } catch (err) {
    connectionError = err.message;
  }

  if (!isConnected) {
    if (isCi) {
      throw new Error(
        `❌ [FAIL-MANDATORY-CI] Kết nối PostgreSQL là BẮT BUỘC trong CI (${dbConfig.host}:${dbConfig.port}/${dbConfig.database}) nhưng thất bại: ${connectionError}. Không cho phép SKIP trên CI!`
      );
    } else {
      console.log(`[SKIPPED] PostgreSQL không khả dụng (${connectionError}) - bỏ qua integration tests trên máy cục bộ.`);
      return;
    }
  }

  try {
    // Ensure table products exists
    const tableRes = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products'"
    );
    if (tableRes.rows.length === 0) {
      if (isCi) {
        throw new Error('❌ [FAIL-MANDATORY-CI] Bảng "products" chưa được khởi tạo schema trong CSDL test!');
      } else {
        console.log('[SKIPPED] Bảng "products" chưa được khởi tạo trong CSDL - bỏ qua integration tests.');
        return;
      }
    }

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

    await t.test('7. Apply execution is idempotent and produces durable manifest', async () => {
      const run1 = await syncCatalog({ client, isApply: true });
      assert.strictEqual(run1.mode, 'apply');
      assert.ok(run1.manifest, 'Apply must return a manifest object');
      assert.strictEqual(typeof run1.manifest.deploymentId, 'string');

      const run2 = await syncCatalog({ client, isApply: true });
      assert.strictEqual(run2.mode, 'apply');
      assert.strictEqual(run2.insertedCount, 0, 'Second apply must insert 0 items and maintain exact catalog');
    });

    await t.test(
      '8. Atomic Rollback (FIX-09): Inserts Item A, simulates failure on Item B, rolls back both with zero partial writes',
      async () => {
        const beforeRes = await client.query('SELECT count(*) FROM products');
        const countBefore = Number(beforeRes.rows[0].count);

        const uniqueSuffix = Date.now().toString(36);
        const itemAName = `Atomic Test Drink A ${uniqueSuffix}`;
        const itemBName = `Atomic Test Drink B ${uniqueSuffix}`;

        const multiItemFailingCatalog = [
          ...TARGET_CATALOG,
          {
            name: itemAName,
            description: 'Item A inserted inside transaction before error',
            price: '30000',
            imageUrl: 'https://images.unsplash.com/test-a',
            isAvailable: true,
            stock: 10,
          },
          {
            name: itemBName,
            description: 'Item B where failure is injected',
            price: '35000',
            imageUrl: 'https://images.unsplash.com/test-b',
            isAvailable: true,
            stock: 15,
          },
        ];

        // Inject simulated failure after inserting 1 item (Item A is inserted, then error triggers on/after Item A before commit)
        await assert.rejects(
          async () => {
            await syncCatalog({
              client,
              isApply: true,
              targetCatalog: multiItemFailingCatalog,
              simulateError: true,
              failAfterInsertCount: 1,
            });
          },
          /Simulated failure/,
          'Sync should reject with simulated failure after inserting Item A'
        );

        // Verification: After ROLLBACK, neither Item A nor Item B must exist in the database!
        const checkItemA = await client.query('SELECT count(*) FROM products WHERE name = $1', [itemAName]);
        assert.strictEqual(Number(checkItemA.rows[0].count), 0, 'Item A must NOT exist after rollback');

        const checkItemB = await client.query('SELECT count(*) FROM products WHERE name = $1', [itemBName]);
        assert.strictEqual(Number(checkItemB.rows[0].count), 0, 'Item B must NOT exist after rollback');

        // Verify baseline product count is completely unchanged
        const afterRes = await client.query('SELECT count(*) FROM products');
        const countAfter = Number(afterRes.rows[0].count);
        assert.strictEqual(countAfter, countBefore, 'Total product count must remain identical before and after rollback');

        // Verify safe re-run after error: sync without error succeeds cleanly
        const rerunResult = await syncCatalog({ client, isApply: true, targetCatalog: TARGET_CATALOG, simulateError: false });
        assert.strictEqual(rerunResult.mode, 'apply');
      }
    );

    await t.test('9. Concurrent apply execution: Serialized by transaction advisory lock without collision', async () => {
      const client2 = new Client({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        connectionTimeoutMillis: 3000,
      });
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

        // Run two syncCatalog workers in parallel
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
        await client2.end().catch(() => {});
      }
    });

    await t.test(
      '10. Safe Catalog Rollback & Order History Protection (FIX-06): Preserves stock, increments OCC version, NEVER deletes referenced products',
      async () => {
        // 1. Ensure target products exist
        await syncCatalog({ client, isApply: true });

        // 2. Query Cold Brew cam (ID > 4, non-baseline product)
        const coldBrewRes = await client.query('SELECT id, name, stock, version FROM products WHERE name = $1', ['Cold Brew cam']);
        assert.ok(coldBrewRes.rows.length > 0, 'Cold Brew cam must exist');
        const coldBrewId = coldBrewRes.rows[0].id;
        const coldBrewInitialStock = coldBrewRes.rows[0].stock;
        const coldBrewInitialVersion = coldBrewRes.rows[0].version;

        // 3. Create a simulated order referencing Cold Brew cam
        const orderRes = await client.query(
          `INSERT INTO orders ("customerName", "customerPhone", "totalAmount", status, "orderCode", "pickupMethod", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`,
          ['Rollback Tester', '0909999999', '49000', 'PAID', '#BL-ROLLBACK-ORDER', 'AT_COUNTER']
        );
        const orderId = orderRes.rows[0].id;

        const orderItemRes = await client.query(
          `INSERT INTO order_items ("productName", size, quantity, "unitPrice", subtotal, "orderId", "productId")
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          ['Cold Brew cam', 'SMALL', 1, '49000', '49000', orderId, coldBrewId]
        );
        const orderItemId = orderItemRes.rows[0].id;

        try {
          // 4. Test prune mode: Attempting physical deletion of referenced product MUST BE REFUSED!
          const pruneResult = await safeCatalogRollback({
            client,
            mode: 'prune',
            targetProductIds: [coldBrewId],
            isApply: true,
          });

          assert.strictEqual(pruneResult.deletedCount, 0, 'Referenced product must NOT be deleted in prune mode');
          assert.strictEqual(pruneResult.protectedCount, 1, 'Referenced product must be marked as protected');
          assert.strictEqual(pruneResult.protectedItems[0].id, coldBrewId);

          // Verify Cold Brew cam still exists in products table!
          const verifyProduct = await client.query('SELECT count(*) FROM products WHERE id = $1', [coldBrewId]);
          assert.strictEqual(Number(verifyProduct.rows[0].count), 1, 'Cold Brew cam must still exist in products');

          // Verify order_items and orders remain 100% intact!
          const verifyOrderItem = await client.query('SELECT count(*) FROM order_items WHERE id = $1', [orderItemId]);
          assert.strictEqual(Number(verifyOrderItem.rows[0].count), 1, 'Order item must remain intact');

          // 5. Test compensate mode: Soft-deactivates (isAvailable=false), keeps stock intact, and increments OCC version
          const compResult = await safeCatalogRollback({
            client,
            mode: 'compensate',
            targetProductIds: [coldBrewId],
            isApply: true,
          });

          assert.strictEqual(compResult.deactivatedCount, 1, 'Cold Brew cam should be deactivated');

          const checkDeactivated = await client.query(
            'SELECT "isAvailable", stock, version FROM products WHERE id = $1',
            [coldBrewId]
          );
          assert.strictEqual(checkDeactivated.rows[0].isAvailable, false, 'isAvailable must be false');
          assert.strictEqual(checkDeactivated.rows[0].stock, coldBrewInitialStock, 'Stock must be preserved intact (NOT wiped to 0)');
          assert.strictEqual(checkDeactivated.rows[0].version, coldBrewInitialVersion + 1, 'OCC version must be incremented by 1');

          // Verify order history is STILL intact
          const verifyOrderStillIntact = await client.query('SELECT count(*) FROM orders WHERE id = $1', [orderId]);
          assert.strictEqual(Number(verifyOrderStillIntact.rows[0].count), 1, 'Order must remain intact');
        } finally {
          // Cleanup test order and restore Cold Brew cam
          await client.query('DELETE FROM order_items WHERE id = $1', [orderItemId]).catch(() => {});
          await client.query('DELETE FROM orders WHERE id = $1', [orderId]).catch(() => {});
          await client.query(
            'UPDATE products SET "isAvailable" = true, stock = $1, version = $2 WHERE id = $3',
            [coldBrewInitialStock, coldBrewInitialVersion, coldBrewId]
          ).catch(() => {});
        }
      }
    );

    await t.test(
      '11. Baseline Protection: Rollback refuses to touch baseline drinks (IDs 1-4: Latte, Trà đào, Cacao sữa, Nước suối)',
      async () => {
        const res = await safeCatalogRollback({
          client,
          mode: 'compensate',
          targetProductNames: BASELINE_PRODUCT_NAMES,
          isApply: true,
        });

        assert.strictEqual(res.deactivatedCount, 0, 'Baseline drinks must NEVER be deactivated by rollback');
      }
    );

    await t.test(
      '12. Fail-Closed Rollback: Throws error and refuses unguided operations when manifest is missing or empty',
      async () => {
        // Case A: No manifest and no IDs provided
        await assert.rejects(
          async () => {
            await safeCatalogRollback({ client, isApply: true });
          },
          /FAIL-CLOSED/,
          'Rollback without manifest or IDs must throw FAIL-CLOSED error'
        );

        // Case B: Empty manifest object (insertedProductIds: [])
        await assert.rejects(
          async () => {
            await safeCatalogRollback({
              client,
              manifest: { insertedProductIds: [] },
              isApply: true,
            });
          },
          /FAIL-CLOSED/,
          'Rollback with empty manifest must throw FAIL-CLOSED error'
        );

        // Case C: Non-existent manifest path
        await assert.rejects(
          async () => {
            await safeCatalogRollback({
              client,
              manifestPath: 'scripts/manifests/non-existent-manifest.json',
              isApply: true,
            });
          },
          /FAIL-CLOSED/,
          'Rollback with non-existent manifest file must throw FAIL-CLOSED error'
        );

        // Case D: CLI without manifest flags exits with 1
        const cliRes = spawnSync('node', ['scripts/safe-catalog-rollback.mjs', '--apply'], { encoding: 'utf8' });
        assert.strictEqual(cliRes.status, 1, 'CLI rollback without manifest flags must exit with status 1');
        assert.match(cliRes.stderr, /FAIL-CLOSED/, 'CLI must display FAIL-CLOSED error');
      }
    );

    await t.test(
      '13. Pre-existing Products Protection: Products with ID > 4 existing prior to sync are NEVER altered by rollback',
      async () => {
        const uniqueSuffix = Date.now().toString(36);
        const preExistingName = `Trà sen vàng cổ truyền ${uniqueSuffix}`;

        // 1. Insert a pre-existing custom product (ID > 4, non-baseline) before sync
        const insertPreRes = await client.query(
          `INSERT INTO products (name, description, price, "imageUrl", "isAvailable", stock, version, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, 1, NOW(), NOW())
           RETURNING id, name, "isAvailable", stock, version`,
          [preExistingName, 'Món đặc sản có trước lần đồng bộ mở rộng', '42000', 'https://images.unsplash.com/tra-sen', true, 18]
        );
        const preExistingId = insertPreRes.rows[0].id;
        assert.ok(preExistingId > 4, `Pre-existing product ID (${preExistingId}) must be > 4`);

        try {
          // 2. Define a batch of target items to sync
          const testItemName = `Sync Item For PreExisting Test ${uniqueSuffix}`;
          const customCatalog = [
            ...TARGET_CATALOG,
            {
              name: testItemName,
              description: 'Item to be synced and rolled back',
              price: '38000',
              imageUrl: 'https://images.unsplash.com/test-sync-item',
              isAvailable: true,
              stock: 25,
            },
          ];

          // 3. Execute sync-catalog --apply
          const syncResult = await syncCatalog({
            client,
            isApply: true,
            targetCatalog: customCatalog,
            deploymentId: `test-preexist-${uniqueSuffix}`,
          });

          assert.ok(syncResult.manifest, 'Sync must produce a valid manifest');
          assert.ok(
            !syncResult.manifest.insertedProductIds.includes(preExistingId),
            'Manifest must NOT include pre-existing product ID'
          );

          // 4. Verify pre-existing product is still untouched after sync
          const preCheck = await client.query(
            'SELECT "isAvailable", stock, version FROM products WHERE id = $1',
            [preExistingId]
          );
          assert.strictEqual(preCheck.rows[0].isAvailable, true);
          assert.strictEqual(preCheck.rows[0].stock, 18);
          assert.strictEqual(preCheck.rows[0].version, 1);

          // 5. Execute safe rollback targeted using the deployment manifest
          const rollbackResult = await safeCatalogRollback({
            client,
            manifest: syncResult.manifest,
            mode: 'compensate',
            isApply: true,
          });

          assert.ok(rollbackResult.deactivatedCount > 0, 'Rollback should deactivate items from manifest');

          // 6. CRITICAL VERIFICATION: Pre-existing product ID > 4 MUST REMAIN 100% UNCHANGED!
          const postRollbackPre = await client.query(
            'SELECT name, "isAvailable", stock, version FROM products WHERE id = $1',
            [preExistingId]
          );
          assert.strictEqual(postRollbackPre.rows[0].name, preExistingName);
          assert.strictEqual(postRollbackPre.rows[0].isAvailable, true, 'Pre-existing product must remain isAvailable=true');
          assert.strictEqual(postRollbackPre.rows[0].stock, 18, 'Pre-existing product stock must remain 18');
          assert.strictEqual(postRollbackPre.rows[0].version, 1, 'Pre-existing product OCC version must remain 1 (untouched)');

          // Verify the newly synced item WAS deactivated
          const syncedItemCheck = await client.query(
            'SELECT "isAvailable" FROM products WHERE name = $1',
            [testItemName]
          );
          assert.strictEqual(syncedItemCheck.rows[0].isAvailable, false, 'Item in manifest must be deactivated');

          // Clean up the synced test item
          await client.query('DELETE FROM products WHERE name = $1', [testItemName]).catch(() => {});
        } finally {
          // Cleanup pre-existing test product
          await client.query('DELETE FROM products WHERE id = $1', [preExistingId]).catch(() => {});
        }
      }
    );
  } finally {
    if (isConnected) {
      await client.end().catch(() => {});
    }
  }
});

test('Production Catalog Runner Verification (FIX-07)', async (t) => {
  await t.test('14. Production runner scripts exist in apps/api/scripts/ for Docker packaging', () => {
    const apiSyncPath = path.join(root, 'apps/api/scripts/sync-catalog.mjs');
    const apiRollbackPath = path.join(root, 'apps/api/scripts/safe-catalog-rollback.mjs');
    const apiSafeEnvPath = path.join(root, 'apps/api/scripts/safe-env.mjs');

    assert.ok(existsSync(apiSyncPath), 'apps/api/scripts/sync-catalog.mjs must exist');
    assert.ok(existsSync(apiRollbackPath), 'apps/api/scripts/safe-catalog-rollback.mjs must exist');
    assert.ok(existsSync(apiSafeEnvPath), 'apps/api/scripts/safe-env.mjs must exist');
  });

  await t.test('15. apps/api/Dockerfile stage 3 (runner) copies scripts directory into image', () => {
    const dockerfilePath = path.join(root, 'apps/api/Dockerfile');
    assert.ok(existsSync(dockerfilePath), 'apps/api/Dockerfile must exist');
    const dockerfileContent = readFileSync(dockerfilePath, 'utf8');

    assert.match(
      dockerfileContent,
      /COPY\s+--chown=node:node\s+--from=builder\s+\/app\/scripts\s+\.\/scripts/,
      'apps/api/Dockerfile must copy /app/scripts to ./scripts in production runner stage'
    );
  });

  await t.test('16. Database config supports DATABASE_* and fails closed in production with dev password', () => {
    // Test resolution of DATABASE_*
    const cfg = resolveDatabaseConfig({
      DATABASE_HOST: 'custom-db-host',
      DATABASE_PORT: '5433',
      DATABASE_NAME: 'custom-db-name',
      DATABASE_USER: 'custom-user',
      DATABASE_PASSWORD: 'custom-secret-password',
      NODE_ENV: 'test',
    });

    assert.strictEqual(cfg.host, 'custom-db-host');
    assert.strictEqual(cfg.port, 5433);
    assert.strictEqual(cfg.database, 'custom-db-name');
    assert.strictEqual(cfg.user, 'custom-user');
    assert.strictEqual(cfg.password, 'custom-secret-password');

    // Test fail-closed in production with dev password
    assert.throws(
      () => {
        resolveDatabaseConfig({
          NODE_ENV: 'production',
          DATABASE_HOST: 'db',
          DATABASE_NAME: 'brewlite',
          DATABASE_USER: 'brewlite',
          DATABASE_PASSWORD: 'brewlite_dev_password', // Development default password
        });
      },
      /FAIL-CLOSED/,
      'Should throw FAIL-CLOSED error in production when dev password is used'
    );
  });
});
