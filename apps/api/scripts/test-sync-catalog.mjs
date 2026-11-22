import { spawnSync } from 'node:child_process';
import assert from 'node:assert';
import test from 'node:test';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TARGET_CATALOG, syncCatalog, resolveDatabaseConfig, ensureCatalogAuditTable } from './sync-catalog.mjs';
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

test('Catalog Synchronization & Safe Rollback: PostgreSQL Integration Tests (FIX-06 to FIX-11)', async (t) => {
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

    // Ensure catalog_deployments audit table exists
    await ensureCatalogAuditTable(client);

    await t.test('6. Dry-run execution strictly does NOT write any data to products or audit table', async () => {
      const beforeProd = await client.query('SELECT count(*) FROM products');
      const countProdBefore = Number(beforeProd.rows[0].count);

      const beforeAudit = await client.query('SELECT count(*) FROM catalog_deployments');
      const countAuditBefore = Number(beforeAudit.rows[0].count);

      const dryRunResult = await syncCatalog({ client, isDryRun: true });
      assert.strictEqual(dryRunResult.mode, 'dry-run');
      assert.strictEqual(dryRunResult.insertedCount, 0);

      const afterProd = await client.query('SELECT count(*) FROM products');
      const countProdAfter = Number(afterProd.rows[0].count);
      assert.strictEqual(countProdAfter, countProdBefore, 'Dry-run must leave products count completely untouched');

      const afterAudit = await client.query('SELECT count(*) FROM catalog_deployments');
      const countAuditAfter = Number(afterAudit.rows[0].count);
      assert.strictEqual(countAuditAfter, countAuditBefore, 'Dry-run must leave catalog_deployments audit table completely untouched');
    });

    await t.test('7. Apply execution creates products AND authoritative audit record in one transaction', async () => {
      const depId = `test-audit-${Date.now()}`;
      const runRes = await syncCatalog({ client, isApply: true, deploymentId: depId });
      assert.strictEqual(runRes.mode, 'apply');

      // Verify audit record exists in PostgreSQL catalog_deployments
      if (runRes.insertedCount > 0) {
        const auditRes = await client.query(
          'SELECT "deploymentId", mode, "totalInserted", status FROM catalog_deployments WHERE "deploymentId" = $1',
          [depId]
        );
        assert.strictEqual(auditRes.rows.length, 1, 'Authoritative audit record must be committed to PostgreSQL');
        assert.strictEqual(auditRes.rows[0].status, 'APPLIED');
        assert.strictEqual(auditRes.rows[0].totalInserted, runRes.insertedCount);
      }
    });

    await t.test(
      '8. Atomic Multi-Item Rollback (FIX-09): Error on Item B rolls back Item A and leaves zero partial writes',
      async () => {
        const beforeRes = await client.query('SELECT count(*) FROM products');
        const countBefore = Number(beforeRes.rows[0].count);

        const uniqueSuffix = Date.now().toString(36);
        const itemAName = `Atomic Test Drink A ${uniqueSuffix}`;
        const itemBName = `Atomic Test Drink B ${uniqueSuffix}`;
        const failingDepId = `fail-dep-${uniqueSuffix}`;

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

        await assert.rejects(
          async () => {
            await syncCatalog({
              client,
              isApply: true,
              targetCatalog: multiItemFailingCatalog,
              simulateError: true,
              failAfterInsertCount: 1,
              deploymentId: failingDepId,
            });
          },
          /Simulated failure/,
          'Sync should reject with simulated failure after inserting Item A'
        );

        // Verification: Neither Item A nor Item B must exist in the database
        const checkItemA = await client.query('SELECT count(*) FROM products WHERE name = $1', [itemAName]);
        assert.strictEqual(Number(checkItemA.rows[0].count), 0, 'Item A must NOT exist after rollback');

        const checkItemB = await client.query('SELECT count(*) FROM products WHERE name = $1', [itemBName]);
        assert.strictEqual(Number(checkItemB.rows[0].count), 0, 'Item B must NOT exist after rollback');

        // Audit table must NOT contain the failing deployment
        const checkAudit = await client.query('SELECT count(*) FROM catalog_deployments WHERE "deploymentId" = $1', [failingDepId]);
        assert.strictEqual(Number(checkAudit.rows[0].count), 0, 'Failing deployment must NOT exist in audit table');

        const afterRes = await client.query('SELECT count(*) FROM products');
        assert.strictEqual(Number(afterRes.rows[0].count), countBefore, 'Total product count must remain unchanged');
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

        const [res1, res2] = await Promise.all([
          syncCatalog({ client, isApply: true, targetCatalog: concurrentCatalog }),
          syncCatalog({ client: client2, isApply: true, targetCatalog: concurrentCatalog }),
        ]);

        const totalInserted = res1.insertedCount + res2.insertedCount;
        assert.strictEqual(totalInserted, 1, 'Exactly one concurrent worker must insert the item; the second inserts 0');

        const dbRes = await client.query('SELECT count(*) FROM products WHERE name = $1', [concurrentItemName]);
        assert.strictEqual(Number(dbRes.rows[0].count), 1, 'Database must contain exactly 1 copy of the item');

        // Cleanup
        await client.query('DELETE FROM products WHERE name = $1', [concurrentItemName]);
      } finally {
        await client2.end().catch(() => {});
      }
    });

    await t.test(
      '10. Safe Catalog Rollback & Order History Protection (FIX-06 & FIX-11): Updates audit to ROLLED_BACK, protects orders',
      async () => {
        const uniqueSuffix = Date.now().toString(36);
        const testDrinkName = `Rollback Test Drink ${uniqueSuffix}`;
        const testDepId = `dep-order-test-${uniqueSuffix}`;

        const testCatalog = [
          ...TARGET_CATALOG,
          {
            name: testDrinkName,
            description: 'Drink to test order reference and rollback',
            price: '45000',
            imageUrl: 'https://images.unsplash.com/test-order-drink',
            isAvailable: true,
            stock: 20,
          },
        ];

        // 1. Sync catalog with new item and record audit
        const syncRes = await syncCatalog({ client, isApply: true, targetCatalog: testCatalog, deploymentId: testDepId });
        assert.strictEqual(syncRes.insertedCount, 1);
        const testDrinkId = syncRes.insertedItems[0].id;

        // 2. Create an order referencing this drink
        const orderRes = await client.query(
          `INSERT INTO orders ("customerName", "customerPhone", "totalAmount", status, "orderCode", "pickupMethod", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`,
          ['Rollback Tester', '0909999999', '45000', 'PAID', '#BL-ROLLBACK-ORDER', 'AT_COUNTER']
        );
        const orderId = orderRes.rows[0].id;

        const orderItemRes = await client.query(
          `INSERT INTO order_items ("productName", size, quantity, "unitPrice", subtotal, "orderId", "productId")
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [testDrinkName, 'SMALL', 1, '45000', '45000', orderId, testDrinkId]
        );
        const orderItemId = orderItemRes.rows[0].id;

        try {
          // 3. Prune mode: Attempting physical deletion of referenced product MUST BE REJECTED (All-or-Nothing)!
          await assert.rejects(
            async () => {
              await safeCatalogRollback({
                client,
                mode: 'prune',
                deploymentId: testDepId,
                isApply: true,
              });
            },
            /PRUNE REJECTED - ALL OR NOTHING/,
            'Referenced product must cause prune mode to be rejected with All-or-Nothing'
          );

          // Verify audit status is STILL 'APPLIED' after rejected prune
          const auditStatusAfterPruneReject = await client.query(
            'SELECT status FROM catalog_deployments WHERE "deploymentId" = $1',
            [testDepId]
          );
          assert.strictEqual(auditStatusAfterPruneReject.rows[0].status, 'APPLIED');

          // Verify drink still exists in products table (0 products deleted)
          const verifyProduct = await client.query('SELECT count(*) FROM products WHERE id = $1', [testDrinkId]);
          assert.strictEqual(Number(verifyProduct.rows[0].count), 1);

          // 4. Compensate mode: Soft-deactivates (isAvailable=false), keeps stock intact (20), increments OCC version
          const compResult = await safeCatalogRollback({
            client,
            mode: 'compensate',
            deploymentId: testDepId,
            isApply: true,
          });

          assert.strictEqual(compResult.deactivatedCount, 1);

          const checkDeactivated = await client.query(
            'SELECT "isAvailable", stock, version FROM products WHERE id = $1',
            [testDrinkId]
          );
          assert.strictEqual(checkDeactivated.rows[0].isAvailable, false);
          assert.strictEqual(checkDeactivated.rows[0].stock, 20, 'Stock must remain intact');
          assert.strictEqual(checkDeactivated.rows[0].version, 2, 'OCC version must be incremented to 2');

          // 5. Verify audit table status is updated to ROLLED_BACK
          const auditStatusRes = await client.query(
            'SELECT status FROM catalog_deployments WHERE "deploymentId" = $1',
            [testDepId]
          );
          assert.strictEqual(auditStatusRes.rows[0].status, 'ROLLED_BACK');

          // 6. Safeguard: Attempting repeated rollback on already rolled back deployment must fail-closed
          await assert.rejects(
            async () => {
              await safeCatalogRollback({
                client,
                mode: 'compensate',
                deploymentId: testDepId,
                isApply: true,
              });
            },
            /đã được hoàn tác trước đó/,
            'Repeated rollback must throw fail-closed error'
          );
        } finally {
          // Cleanup
          await client.query('DELETE FROM order_items WHERE id = $1', [orderItemId]).catch(() => {});
          await client.query('DELETE FROM orders WHERE id = $1', [orderId]).catch(() => {});
          await client.query('DELETE FROM products WHERE id = $1', [testDrinkId]).catch(() => {});
          await client.query('DELETE FROM catalog_deployments WHERE "deploymentId" = $1', [testDepId]).catch(() => {});
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
      '12. Fail-Closed Rollback: Refuses unguided rollback without verified deployment ID',
      async () => {
        // Case A: Missing deployment ID and no target product IDs
        await assert.rejects(
          async () => {
            await safeCatalogRollback({ client, isApply: true });
          },
          /FAIL-CLOSED/,
          'Rollback without deployment ID must throw FAIL-CLOSED error'
        );

        // Case B: Non-existent deployment ID
        await assert.rejects(
          async () => {
            await safeCatalogRollback({
              client,
              deploymentId: 'non-existent-deployment-xyz',
              isApply: true,
            });
          },
          /FAIL-CLOSED/,
          'Rollback with non-existent deployment ID must throw FAIL-CLOSED error'
        );

        // Case C: CLI without parameters exits with code 1
        const cliRes = spawnSync('node', ['scripts/safe-catalog-rollback.mjs', '--apply'], { encoding: 'utf8' });
        assert.strictEqual(cliRes.status, 1, 'CLI rollback without flags must exit with status 1');
        assert.match(cliRes.stderr, /FAIL-CLOSED/, 'CLI must display FAIL-CLOSED error');
      }
    );

    await t.test(
      '13. Pre-existing Products Protection: Products with ID > 4 existing prior to sync are NEVER altered by rollback',
      async () => {
        const uniqueSuffix = Date.now().toString(36);
        const preExistingName = `Trà sen vàng cổ truyền ${uniqueSuffix}`;
        const testDepId = `dep-preexist-${uniqueSuffix}`;

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
            deploymentId: testDepId,
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

          // 5. Execute safe rollback targeted using the authoritative deployment ID
          const rollbackResult = await safeCatalogRollback({
            client,
            deploymentId: testDepId,
            mode: 'compensate',
            isApply: true,
          });

          assert.ok(rollbackResult.deactivatedCount > 0, 'Rollback should deactivate items from deployment');

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
          await client.query('DELETE FROM catalog_deployments WHERE "deploymentId" = $1', [testDepId]).catch(() => {});
        }
      }
    );

    await t.test(
      '14. Atomicity (FIX-11): Error saving audit record aborts transaction with zero products committed',
      async () => {
        const uniqueSuffix = Date.now().toString(36);
        const testDrinkName = `Audit Failure Test Drink ${uniqueSuffix}`;
        const failingDepId = `audit-fail-dep-${uniqueSuffix}`;

        const testCatalog = [
          ...TARGET_CATALOG,
          {
            name: testDrinkName,
            description: 'Item to test failure during audit insertion',
            price: '39000',
            imageUrl: 'https://images.unsplash.com/test-audit-fail',
            isAvailable: true,
            stock: 20,
          },
        ];

        // Attempt sync with simulated audit failure
        await assert.rejects(
          async () => {
            await syncCatalog({
              client,
              isApply: true,
              targetCatalog: testCatalog,
              simulateAuditError: true,
              deploymentId: failingDepId,
            });
          },
          /Simulated failure during catalog audit record insertion/,
          'Must reject when audit insertion fails'
        );

        // Verification: Zero products committed to products table
        const checkProduct = await client.query('SELECT count(*) FROM products WHERE name = $1', [testDrinkName]);
        assert.strictEqual(Number(checkProduct.rows[0].count), 0, 'No products must be committed if audit record fails');

        // Verification: Zero audit record in catalog_deployments
        const checkAudit = await client.query('SELECT count(*) FROM catalog_deployments WHERE "deploymentId" = $1', [failingDepId]);
        assert.strictEqual(Number(checkAudit.rows[0].count), 0, 'No audit record must exist if transaction rolls back');
      }
    );

    await t.test(
      '15. Targeted Deployment Rollback Isolation (FIX-11): Rolling back Dep A leaves Dep B 100% untouched',
      async () => {
        const uniqueSuffix = Date.now().toString(36);
        const itemAName = `Deployment A Item ${uniqueSuffix}`;
        const itemBName = `Deployment B Item ${uniqueSuffix}`;
        const depAId = `dep-A-${uniqueSuffix}`;
        const depBId = `dep-B-${uniqueSuffix}`;

        // 1. Run Deployment A with Item A
        const catalogA = [
          ...TARGET_CATALOG,
          {
            name: itemAName,
            description: 'Item belonging to Deployment A',
            price: '33000',
            imageUrl: 'https://images.unsplash.com/test-a',
            isAvailable: true,
            stock: 15,
          },
        ];
        await syncCatalog({ client, isApply: true, targetCatalog: catalogA, deploymentId: depAId });

        // 2. Run Deployment B with Item B
        const catalogB = [
          ...catalogA,
          {
            name: itemBName,
            description: 'Item belonging to Deployment B',
            price: '44000',
            imageUrl: 'https://images.unsplash.com/test-b',
            isAvailable: true,
            stock: 25,
          },
        ];
        await syncCatalog({ client, isApply: true, targetCatalog: catalogB, deploymentId: depBId });

        try {
          // 3. Roll back ONLY Deployment A
          const rollbackA = await safeCatalogRollback({
            client,
            mode: 'compensate',
            deploymentId: depAId,
            isApply: true,
          });

          assert.strictEqual(rollbackA.deactivatedCount, 1, 'Only Item A should be deactivated');

          // Verify Item A is deactivated
          const checkA = await client.query('SELECT "isAvailable" FROM products WHERE name = $1', [itemAName]);
          assert.strictEqual(checkA.rows[0].isAvailable, false, 'Item A must be deactivated');

          // Verify Dep A status is ROLLED_BACK
          const auditA = await client.query('SELECT status FROM catalog_deployments WHERE "deploymentId" = $1', [depAId]);
          assert.strictEqual(auditA.rows[0].status, 'ROLLED_BACK');

          // CRITICAL: Verify Item B and Dep B are COMPLETELY UNTOUCHED!
          const checkB = await client.query('SELECT "isAvailable", stock FROM products WHERE name = $1', [itemBName]);
          assert.strictEqual(checkB.rows[0].isAvailable, true, 'Item B must remain active (isAvailable=true)');
          assert.strictEqual(checkB.rows[0].stock, 25, 'Item B stock must remain 25');

          const auditB = await client.query('SELECT status FROM catalog_deployments WHERE "deploymentId" = $1', [depBId]);
          assert.strictEqual(auditB.rows[0].status, 'APPLIED', 'Deployment B status must still be APPLIED');
        } finally {
          // Cleanup
          await client.query('DELETE FROM products WHERE name IN ($1, $2)', [itemAName, itemBName]).catch(() => {});
          await client.query('DELETE FROM catalog_deployments WHERE "deploymentId" IN ($1, $2)', [depAId, depBId]).catch(() => {});
        }
      }
    );

    await t.test(
      '16. Ephemeral Container & Read-Only Volume Resilience (FIX-11): Rollback works directly from PostgreSQL without local files',
      async () => {
        const uniqueSuffix = Date.now().toString(36);
        const ephemeralItemName = `Ephemeral Container Item ${uniqueSuffix}`;
        const ephemeralDepId = `dep-ephemeral-${uniqueSuffix}`;

        const testCatalog = [
          ...TARGET_CATALOG,
          {
            name: ephemeralItemName,
            description: 'Item created in container without disk persistence',
            price: '37000',
            imageUrl: 'https://images.unsplash.com/test-ephemeral',
            isAvailable: true,
            stock: 30,
          },
        ];

        // 1. Sync catalog into PostgreSQL
        await syncCatalog({ client, isApply: true, targetCatalog: testCatalog, deploymentId: ephemeralDepId });

        try {
          // 2. Perform rollback passing ONLY deploymentId (simulating container run --rm with no local manifest files)
          const rollbackRes = await safeCatalogRollback({
            client,
            mode: 'compensate',
            deploymentId: ephemeralDepId,
            isApply: true,
          });

          assert.strictEqual(rollbackRes.deactivatedCount, 1);

          const checkItem = await client.query('SELECT "isAvailable", stock FROM products WHERE name = $1', [ephemeralItemName]);
          assert.strictEqual(checkItem.rows[0].isAvailable, false);
          assert.strictEqual(checkItem.rows[0].stock, 30);
        } finally {
          // Cleanup
          await client.query('DELETE FROM products WHERE name = $1', [ephemeralItemName]).catch(() => {});
          await client.query('DELETE FROM catalog_deployments WHERE "deploymentId" = $1', [ephemeralDepId]).catch(() => {});
        }
      }
    );

    await t.test(
      '17. Production Safeguards (FIX-11): Rejects unverified latest rollback and repeated rollbacks',
      async () => {
        const origEnv = process.env.NODE_ENV;
        try {
          process.env.NODE_ENV = 'production';

          // In production: --manifest-latest without --confirm-deployment must be rejected
          await assert.rejects(
            async () => {
              await safeCatalogRollback({ client, isLatest: true, isApply: true });
            },
            /FAIL-CLOSED/,
            'In production, rollback latest without confirm-deployment must reject'
          );

          // In production: arbitrary targetProductIds without deploymentId must be rejected
          await assert.rejects(
            async () => {
              await safeCatalogRollback({ client, targetProductIds: [5, 6], isApply: true });
            },
            /FAIL-CLOSED/,
            'In production, arbitrary targetProductIds must reject'
          );
        } finally {
          process.env.NODE_ENV = origEnv;
        }
      }
    );

    await t.test(
      '18. Prune All-or-Nothing & Subsequent Compensate (FIX-11 Refinement): Mixed referenced and unreferenced items',
      async () => {
        const uniqueSuffix = Date.now().toString(36);
        const itemAName = `Mixed Item A Ordered ${uniqueSuffix}`;
        const itemBName = `Mixed Item B Unordered ${uniqueSuffix}`;
        const mixedDepId = `dep-mixed-${uniqueSuffix}`;

        const mixedCatalog = [
          ...TARGET_CATALOG,
          {
            name: itemAName,
            description: 'Item A will have an order referencing it',
            price: '35000',
            imageUrl: 'https://images.unsplash.com/item-a',
            isAvailable: true,
            stock: 25,
          },
          {
            name: itemBName,
            description: 'Item B will have zero orders referencing it',
            price: '40000',
            imageUrl: 'https://images.unsplash.com/item-b',
            isAvailable: true,
            stock: 30,
          },
        ];

        // 1. Sync the 2 items under mixedDepId
        const syncRes = await syncCatalog({ client, isApply: true, targetCatalog: mixedCatalog, deploymentId: mixedDepId });
        assert.strictEqual(syncRes.insertedCount, 2);
        const itemAId = syncRes.insertedItems.find((i) => i.name === itemAName).id;
        const itemBId = syncRes.insertedItems.find((i) => i.name === itemBName).id;

        // 2. Create order referencing ONLY Item A! Item B has 0 orders.
        const orderRes = await client.query(
          `INSERT INTO orders ("customerName", "customerPhone", "totalAmount", status, "orderCode", "pickupMethod", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`,
          ['Mixed Tester', '0901112233', '35000', 'PAID', '#BL-MIXED-ORDER', 'AT_COUNTER']
        );
        const orderId = orderRes.rows[0].id;

        const orderItemRes = await client.query(
          `INSERT INTO order_items ("productName", size, quantity, "unitPrice", subtotal, "orderId", "productId")
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [itemAName, 'SMALL', 1, '35000', '35000', orderId, itemAId]
        );
        const orderItemId = orderItemRes.rows[0].id;

        try {
          // 3. Attempt prune mode: MUST BE REJECTED because Item A is referenced!
          await assert.rejects(
            async () => {
              await safeCatalogRollback({
                client,
                mode: 'prune',
                deploymentId: mixedDepId,
                isApply: true,
              });
            },
            /PRUNE REJECTED - ALL OR NOTHING/,
            'Prune must reject entire deployment when at least one item is referenced'
          );

          // 4. CRITICAL VERIFICATION: Zero items deleted! Item B (unreferenced) is NOT deleted!
          const checkA = await client.query('SELECT "isAvailable", stock FROM products WHERE id = $1', [itemAId]);
          assert.strictEqual(Number(checkA.rows.length), 1, 'Item A must still exist');

          const checkB = await client.query('SELECT "isAvailable", stock FROM products WHERE id = $1', [itemBId]);
          assert.strictEqual(Number(checkB.rows.length), 1, 'Item B must still exist (no partial deletion!)');
          assert.strictEqual(checkB.rows[0].isAvailable, true, 'Item B must still be available');
          assert.strictEqual(checkB.rows[0].stock, 30, 'Item B stock must be intact');

          // 5. Verify audit status is STILL 'APPLIED' (allowing subsequent compensate)
          const auditStatus = await client.query(
            'SELECT status FROM catalog_deployments WHERE "deploymentId" = $1',
            [mixedDepId]
          );
          assert.strictEqual(auditStatus.rows[0].status, 'APPLIED', 'Audit status must remain APPLIED after rejected prune');

          // 6. Now, run compensate mode: Must SUCCEED cleanly!
          const compRes = await safeCatalogRollback({
            client,
            mode: 'compensate',
            deploymentId: mixedDepId,
            isApply: true,
          });

          assert.strictEqual(compRes.deactivatedCount, 2, 'Compensate should deactivate both Item A and Item B');

          // Verify both items are now deactivated with stock intact and OCC version incremented
          const postCompA = await client.query('SELECT "isAvailable", stock, version FROM products WHERE id = $1', [itemAId]);
          assert.strictEqual(postCompA.rows[0].isAvailable, false);
          assert.strictEqual(postCompA.rows[0].stock, 25);
          assert.strictEqual(postCompA.rows[0].version, 2);

          const postCompB = await client.query('SELECT "isAvailable", stock, version FROM products WHERE id = $1', [itemBId]);
          assert.strictEqual(postCompB.rows[0].isAvailable, false);
          assert.strictEqual(postCompB.rows[0].stock, 30);
          assert.strictEqual(postCompB.rows[0].version, 2);

          // 7. Verify audit status is NOW updated to 'ROLLED_BACK'
          const finalAuditStatus = await client.query(
            'SELECT status FROM catalog_deployments WHERE "deploymentId" = $1',
            [mixedDepId]
          );
          assert.strictEqual(finalAuditStatus.rows[0].status, 'ROLLED_BACK', 'Audit status must now be ROLLED_BACK');
        } finally {
          // Cleanup
          await client.query('DELETE FROM order_items WHERE id = $1', [orderItemId]).catch(() => {});
          await client.query('DELETE FROM orders WHERE id = $1', [orderId]).catch(() => {});
          await client.query('DELETE FROM products WHERE id IN ($1, $2)', [itemAId, itemBId]).catch(() => {});
          await client.query('DELETE FROM catalog_deployments WHERE "deploymentId" = $1', [mixedDepId]).catch(() => {});
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
  await t.test('19. Production runner scripts exist in apps/api/scripts/ for Docker packaging', () => {
    const apiSyncPath = path.join(root, 'apps/api/scripts/sync-catalog.mjs');
    const apiRollbackPath = path.join(root, 'apps/api/scripts/safe-catalog-rollback.mjs');
    const apiSafeEnvPath = path.join(root, 'apps/api/scripts/safe-env.mjs');

    assert.ok(existsSync(apiSyncPath), 'apps/api/scripts/sync-catalog.mjs must exist');
    assert.ok(existsSync(apiRollbackPath), 'apps/api/scripts/safe-catalog-rollback.mjs must exist');
    assert.ok(existsSync(apiSafeEnvPath), 'apps/api/scripts/safe-env.mjs must exist');
  });

  await t.test('20. apps/api/Dockerfile stage 3 (runner) copies scripts directory into image', () => {
    const dockerfilePath = path.join(root, 'apps/api/Dockerfile');
    assert.ok(existsSync(dockerfilePath), 'apps/api/Dockerfile must exist');
    const dockerfileContent = readFileSync(dockerfilePath, 'utf8');

    assert.match(
      dockerfileContent,
      /COPY\s+--chown=node:node\s+--from=builder\s+\/app\/scripts\s+\.\/scripts/,
      'apps/api/Dockerfile must copy /app/scripts to ./scripts in production runner stage'
    );
  });

  await t.test('21. Database config supports DATABASE_* and fails closed in production with dev password', () => {
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
