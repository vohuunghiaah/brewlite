#!/usr/bin/env node
/**
 * BrewLite Targeted Safe Catalog Rollback Strategy (FIX-06)
 *
 * SAFETY & INTEGRITY PRINCIPLES:
 * 1. Targeted Manifest Rollback: Rollback MUST be targeted using a verified deployment manifest or explicit IDs.
 *    REPLACES blind/unguided operations (NEVER "DELETE FROM products WHERE id > 4" or defaulting to all non-baseline).
 * 2. Fail-Closed by Design: Missing, empty, or invalid manifest strictly halts execution (exit 1 / error thrown).
 * 3. Pre-existing Product Protection: Products created before or outside the target deployment are NEVER altered or deactivated.
 * 4. Permanently protects baseline products (ID 1-4: Latte, Trà đào, Cacao sữa, Nước suối).
 * 5. Historical Order & Receipt Safety: Products referenced in order_items are NEVER deleted.
 * 6. Compensating Operation by default (--mode=compensate): marks items unavailable (isAvailable=false),
 *    preserves original stock quantity intact, and increments OCC version (version = version + 1) for concurrency safety.
 * 7. Optional prune mode (--mode=prune): physically removes ONLY unreferenced products from the manifest, requiring --confirm.
 * 8. Transaction-level PostgreSQL advisory lock coordinates across sync and rollback processes.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { parseEnv } from './safe-env.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

// Robust PostgreSQL client resolver supporting repository root, apps/api, and container /app
const require = createRequire(import.meta.url);
function resolvePgClient() {
  const searchPaths = [
    'pg',
    path.join(__dirname, '../node_modules/pg'),
    path.join(root, 'apps/api/node_modules/pg'),
    path.join(root, 'node_modules/pg'),
    path.join(process.cwd(), 'node_modules/pg'),
  ];
  for (const p of searchPaths) {
    try {
      const mod = require(p);
      if (mod && mod.Client) return mod.Client;
    } catch {}
  }
  throw new Error('Không thể tìm thấy thư viện "pg" (node-postgres). Vui lòng cài đặt dependencies.');
}
const Client = resolvePgClient();

// Permanently protected baseline products: NEVER deleted or deactivated by rollback
export const BASELINE_PRODUCT_NAMES = [
  'Cà phê Latte',
  'Trà đào',
  'Cacao sữa',
  'Nước suối',
];

export const BASELINE_PRODUCT_IDS = [1, 2, 3, 4];

// Load environment configuration safely
let envConfig = {};
const envPaths = [
  process.env.ENV_FILE,
  path.resolve('.env'),
  path.join(root, '.env'),
  path.join(root, 'apps/api/.env'),
].filter(Boolean);

for (const p of envPaths) {
  if (existsSync(p)) {
    try {
      envConfig = { ...envConfig, ...parseEnv(readFileSync(p, 'utf8')) };
    } catch {}
  }
}

export function resolveDatabaseConfig(overrideEnv = process.env) {
  const isProduction = overrideEnv.NODE_ENV === 'production';

  const host =
    overrideEnv.DATABASE_HOST ||
    overrideEnv.POSTGRES_HOST ||
    envConfig.DATABASE_HOST ||
    envConfig.POSTGRES_HOST ||
    (isProduction ? undefined : 'localhost');

  const port = Number(
    overrideEnv.DATABASE_PORT ||
    overrideEnv.POSTGRES_PORT ||
    envConfig.DATABASE_PORT ||
    envConfig.POSTGRES_PORT ||
    5432
  );

  const user =
    overrideEnv.DATABASE_USER ||
    overrideEnv.POSTGRES_USER ||
    envConfig.DATABASE_USER ||
    envConfig.POSTGRES_USER ||
    (isProduction ? undefined : 'brewlite');

  const password =
    overrideEnv.DATABASE_PASSWORD ||
    overrideEnv.POSTGRES_PASSWORD ||
    envConfig.DATABASE_PASSWORD ||
    envConfig.POSTGRES_PASSWORD ||
    (isProduction ? undefined : 'brewlite_dev_password');

  const database =
    overrideEnv.DATABASE_NAME ||
    overrideEnv.POSTGRES_DB ||
    envConfig.DATABASE_NAME ||
    envConfig.POSTGRES_DB ||
    (isProduction ? undefined : 'brewlite');

  if (isProduction) {
    if (!host || !user || !password || !database) {
      throw new Error(
        '❌ [FAIL-CLOSED] Môi trường production yêu cầu cấu hình đầy đủ biến kết nối CSDL (DATABASE_HOST/POSTGRES_HOST, DATABASE_USER/POSTGRES_USER, DATABASE_PASSWORD/POSTGRES_PASSWORD, DATABASE_NAME/POSTGRES_DB).'
      );
    }
    if (password === 'brewlite_dev_password') {
      throw new Error(
        '❌ [FAIL-CLOSED] Phát hiện mật khẩu development mặc định ("brewlite_dev_password") trong môi trường production. Từ chối thực thi kết nối để bảo vệ an toàn hệ thống.'
      );
    }
  }

  return { host, port, user, password, database };
}

/**
 * Execute Safe Targeted Catalog Rollback.
 *
 * @param {Object} options
 * @param {import('pg').Client} options.client Active PostgreSQL client
 * @param {'compensate'|'prune'} [options.mode='compensate']
 *   - 'compensate' (Default / Recommended): Soft deactivation (isAvailable=false, keeps stock intact, increments OCC version). Zero data loss.
 *   - 'prune': Physical deletion of ONLY unreferenced products from manifest. Products with existing orders are protected.
 * @param {Object} [options.manifest] Parsed manifest object from syncCatalog
 * @param {string} [options.manifestPath] File path to manifest JSON
 * @param {string} [options.deploymentId] Specific deployment ID to look up in scripts/manifests/
 * @param {number[]} [options.targetProductIds] Specific numeric IDs to rollback
 * @param {string[]} [options.targetProductNames] Specific names to rollback (e.g. for baseline exclusion test)
 * @param {boolean} options.isDryRun Dry run without committing changes
 * @param {boolean} options.isApply Commit changes to database
 */
export async function safeCatalogRollback({
  client,
  mode = 'compensate',
  manifest = null,
  manifestPath = null,
  deploymentId = null,
  targetProductIds = null,
  targetProductNames = null,
  isDryRun = false,
  isApply = false,
}) {
  if (!isDryRun && !isApply) {
    throw new Error('Chế độ thực thi không hợp lệ: phải chọn --dry-run hoặc --apply');
  }

  if (mode !== 'compensate' && mode !== 'prune') {
    throw new Error(`Chế độ rollback không hợp lệ: "${mode}". Chỉ hỗ trợ "compensate" hoặc "prune".`);
  }

  // 1. Resolve target manifest and candidate product IDs
  let resolvedProductIds = [];
  let resolvedManifest = null;

  if (manifest && typeof manifest === 'object') {
    resolvedManifest = manifest;
    if (Array.isArray(manifest.insertedProductIds)) {
      resolvedProductIds = manifest.insertedProductIds;
    } else if (Array.isArray(manifest.insertedItems)) {
      resolvedProductIds = manifest.insertedItems.map((item) => item.id);
    }
  } else if (manifestPath) {
    if (!existsSync(manifestPath)) {
      throw new Error(`❌ [FAIL-CLOSED] File manifest không tồn tại: ${manifestPath}`);
    }
    try {
      resolvedManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      resolvedProductIds = Array.isArray(resolvedManifest.insertedProductIds)
        ? resolvedManifest.insertedProductIds
        : (resolvedManifest.insertedItems || []).map((i) => i.id);
    } catch (err) {
      throw new Error(`❌ [FAIL-CLOSED] Lỗi phân tích file manifest (${manifestPath}): ${err.message}`);
    }
  } else if (deploymentId) {
    const candidatePaths = [
      path.join(__dirname, 'manifests', `catalog-sync-${deploymentId}.json`),
      path.join(root, 'scripts/manifests', `catalog-sync-${deploymentId}.json`),
      path.join(root, 'apps/api/scripts/manifests', `catalog-sync-${deploymentId}.json`),
    ];
    const foundPath = candidatePaths.find((p) => existsSync(p));
    if (!foundPath) {
      throw new Error(`❌ [FAIL-CLOSED] Không tìm thấy manifest cho deployment ID "${deploymentId}".`);
    }
    try {
      resolvedManifest = JSON.parse(readFileSync(foundPath, 'utf8'));
      resolvedProductIds = Array.isArray(resolvedManifest.insertedProductIds)
        ? resolvedManifest.insertedProductIds
        : (resolvedManifest.insertedItems || []).map((i) => i.id);
    } catch (err) {
      throw new Error(`❌ [FAIL-CLOSED] Lỗi đọc manifest của deployment "${deploymentId}": ${err.message}`);
    }
  } else if (Array.isArray(targetProductIds)) {
    resolvedProductIds = targetProductIds;
  }

  // Sanitize IDs: positive integers only
  resolvedProductIds = resolvedProductIds
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);

  const hasTargetNames = Array.isArray(targetProductNames) && targetProductNames.length > 0;

  // 2. Strict Fail-Closed Check: Never allow unguided rollback of all products
  if (resolvedProductIds.length === 0 && !hasTargetNames) {
    throw new Error(
      '❌ [FAIL-CLOSED] Rollback bị từ chối: Bắt buộc phải có manifest hợp lệ từ lần triển khai cần hoàn tác, hoặc chỉ định danh sách product ID cụ thể (--manifest, --deployment-id, --manifest-latest, hoặc --product-ids). Tuyệt đối không thực hiện rollback mặc định trên toàn bộ sản phẩm.'
    );
  }

  await client.query('BEGIN');
  try {
    // Transaction-level advisory lock serializes rollback operations
    await client.query("SELECT pg_advisory_xact_lock(hashtext('brewlite.catalog.lock'))");

    // Query candidate products
    const allRes = await client.query('SELECT id, name, price, stock, "isAvailable", version FROM products ORDER BY id ASC');
    const allProducts = allRes.rows;

    // Filter candidates: strictly exclude baseline products AND restrict to resolved IDs / names
    const candidates = allProducts.filter((p) => {
      // Rule A: Baseline products are permanently protected
      if (BASELINE_PRODUCT_NAMES.includes(p.name) || BASELINE_PRODUCT_IDS.includes(p.id)) {
        return false;
      }
      // Rule B: Must belong to target manifest IDs or explicit target names
      const matchId = resolvedProductIds.includes(p.id);
      const matchName = hasTargetNames && targetProductNames.includes(p.name);
      return matchId || matchName;
    });

    // Inspect references in order_items for each candidate
    const analyzed = [];
    for (const c of candidates) {
      const refRes = await client.query(
        'SELECT count(*) FROM order_items WHERE "productId" = $1',
        [c.id]
      );
      const orderRefCount = Number(refRes.rows[0].count);
      analyzed.push({
        ...c,
        orderRefCount,
        isReferenced: orderRefCount > 0,
      });
    }

    if (mode === 'compensate') {
      // Compensating Operation: Mark unavailable, preserve original stock, increment OCC version
      const toDeactivate = analyzed.filter((p) => p.isAvailable);

      if (isDryRun) {
        await client.query('ROLLBACK');
        return {
          mode: 'compensate',
          isDryRun: true,
          resolvedProductIds,
          totalCandidates: candidates.length,
          toDeactivateCount: toDeactivate.length,
          toDeactivateItems: toDeactivate,
          action: 'DRY-RUN: Sẽ cập nhật isAvailable=false (giữ nguyên tồn kho gốc và tăng version OCC) cho các sản phẩm trong manifest',
        };
      }

      if (isApply) {
        let updatedItems = [];
        if (toDeactivate.length > 0) {
          const ids = toDeactivate.map((p) => p.id);
          const updateRes = await client.query(
            `UPDATE products
             SET "isAvailable" = false,
                 version = version + 1,
                 "updatedAt" = NOW()
             WHERE id = ANY($1)
             RETURNING id, name, "isAvailable", stock, version`,
            [ids]
          );
          updatedItems = updateRes.rows;
        }
        await client.query('COMMIT');
        return {
          mode: 'compensate',
          isApply: true,
          resolvedProductIds,
          totalCandidates: candidates.length,
          deactivatedCount: toDeactivate.length,
          deactivatedItems: toDeactivate,
          updatedItems,
        };
      }
    }

    if (mode === 'prune') {
      // Prune mode: Delete ONLY unreferenced products. Referenced products are strictly protected.
      const unreferenced = analyzed.filter((p) => !p.isReferenced);
      const protectedReferenced = analyzed.filter((p) => p.isReferenced);

      if (isDryRun) {
        await client.query('ROLLBACK');
        return {
          mode: 'prune',
          isDryRun: true,
          resolvedProductIds,
          totalCandidates: candidates.length,
          unreferencedCount: unreferenced.length,
          unreferencedItems: unreferenced,
          protectedCount: protectedReferenced.length,
          protectedItems: protectedReferenced,
          action: 'DRY-RUN: Chỉ xóa các sản phẩm trong manifest chưa có đơn hàng nào tham chiếu. Sản phẩm đã có đơn hàng được BẢO VỆ TUYỆT ĐỐI.',
        };
      }

      if (isApply) {
        if (unreferenced.length > 0) {
          const idsToDelete = unreferenced.map((p) => p.id);
          await client.query('DELETE FROM products WHERE id = ANY($1)', [idsToDelete]);
        }
        await client.query('COMMIT');
        return {
          mode: 'prune',
          isApply: true,
          resolvedProductIds,
          totalCandidates: candidates.length,
          deletedCount: unreferenced.length,
          deletedItems: unreferenced,
          protectedCount: protectedReferenced.length,
          protectedItems: protectedReferenced,
        };
      }
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  }
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const isApply = process.argv.includes('--apply');
  const isPrune = process.argv.includes('--mode=prune');
  const isConfirmed = process.argv.includes('--confirm');

  const mode = isPrune ? 'prune' : 'compensate';

  let manifestPath = null;
  const manifestArg = process.argv.find((a) => a.startsWith('--manifest='));
  if (manifestArg) manifestPath = manifestArg.split('=')[1];

  let deploymentId = null;
  const deployArg = process.argv.find((a) => a.startsWith('--deployment-id='));
  if (deployArg) deploymentId = deployArg.split('=')[1];

  if (process.argv.includes('--manifest-latest')) {
    const candidatePaths = [
      path.join(__dirname, 'manifests', 'catalog-sync-latest.json'),
      path.join(root, 'scripts/manifests', 'catalog-sync-latest.json'),
      path.join(root, 'apps/api/scripts/manifests', 'catalog-sync-latest.json'),
    ];
    manifestPath = candidatePaths.find((p) => existsSync(p)) || candidatePaths[0];
  }

  let targetProductIds = null;
  const pidsArg = process.argv.find((a) => a.startsWith('--product-ids='));
  if (pidsArg) {
    targetProductIds = pidsArg
      .split('=')[1]
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
  }

  if ((!isDryRun && !isApply) || (isDryRun && isApply)) {
    console.error('❌ Lỗi: Bạn phải chỉ định rõ duy nhất một chế độ thực thi:');
    console.error('  node scripts/safe-catalog-rollback.mjs --dry-run --manifest-latest                  (Kiểm tra đối chiếu an toàn)');
    console.error('  node scripts/safe-catalog-rollback.mjs --apply --manifest-latest                   (Bồi hoàn an toàn theo manifest gần nhất)');
    console.error('  node scripts/safe-catalog-rollback.mjs --apply --deployment-id=<id>                 (Bồi hoàn theo deployment ID)');
    console.error('  node scripts/safe-catalog-rollback.mjs --apply --manifest=<path>                    (Bồi hoàn theo file manifest cụ thể)');
    console.error('  node scripts/safe-catalog-rollback.mjs --apply --product-ids=5,6,7                  (Bồi hoàn theo danh sách ID)');
    console.error('  node scripts/safe-catalog-rollback.mjs --apply --manifest-latest --mode=prune --confirm (Chỉ xóa món chưa có đơn hàng)');
    process.exit(1);
  }

  if (!manifestPath && !deploymentId && (!targetProductIds || targetProductIds.length === 0)) {
    console.error('❌ [FAIL-CLOSED] Rollback yêu cầu nguồn manifest hoặc danh sách ID cụ thể:');
    console.error('  --manifest-latest           : Tự động dùng manifest của lần sync gần nhất');
    console.error('  --deployment-id=<id>        : Chỉ định ID của lần sync cần hoàn tác');
    console.error('  --manifest=<path>           : Đường dẫn tới file JSON manifest');
    console.error('  --product-ids=5,6,7         : Danh sách ID sản phẩm cần hoàn tác');
    console.error('  Tuyệt đối không chạy rollback mặc định lên toàn bộ bảng products.');
    process.exit(1);
  }

  if (isApply && mode === 'prune' && !isConfirmed) {
    console.error('❌ Lỗi an toàn: Chế độ prune yêu cầu cờ --confirm để xác nhận bạn đã xem xét danh sách sản phẩm cần xóa.');
    process.exit(1);
  }

  let dbConfig;
  try {
    dbConfig = resolveDatabaseConfig();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  console.log('======================================================================');
  console.log(`🛡️ BREWLITE SAFE TARGETED CATALOG ROLLBACK (${isDryRun ? 'DRY-RUN' : 'APPLY'})`);
  console.log(`📌 Chế độ: ${mode === 'compensate' ? 'COMPENSATE (Vô hiệu hóa an toàn, bảo tồn stock & OCC version)' : 'PRUNE (Chỉ xóa món chưa tham chiếu)'}`);
  console.log(`🔌 Database: ${dbConfig.database} trên ${dbConfig.host}:${dbConfig.port}`);
  console.log('======================================================================\n');

  const client = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
  } catch (err) {
    console.error(`❌ Không thể kết nối cơ sở dữ liệu: ${err.message}`);
    process.exit(1);
  }

  try {
    const result = await safeCatalogRollback({
      client,
      mode,
      manifestPath,
      deploymentId,
      targetProductIds,
      isDryRun,
      isApply,
    });

    if (isDryRun) {
      console.log('✔ KẾT QUẢ KIỂM TRA ĐỐI CHIẾU (DRY-RUN):');
      console.log(`  - Số product ID trong phạm vi manifest: ${result.resolvedProductIds.length}`);
      console.log(`  - Tổng số sản phẩm ứng viên tìm thấy: ${result.totalCandidates}`);
      if (mode === 'compensate') {
        console.log(`  - Sản phẩm sẽ chuyển sang hết hàng (isAvailable=false, giữ nguyên stock): ${result.toDeactivateCount}`);
        for (const item of result.toDeactivateItems) {
          console.log(`    * [ID ${item.id}] ${item.name} (Tồn kho: ${item.stock}, Version: ${item.version}, ${item.orderRefCount} đơn hàng tham chiếu -> BẢO TOÀN)`);
        }
      } else {
        console.log(`  - Sản phẩm có thể xóa (chưa từng có đơn hàng): ${result.unreferencedCount}`);
        for (const item of result.unreferencedItems) {
          console.log(`    * [ID ${item.id}] ${item.name} (0 đơn hàng tham chiếu)`);
        }
        console.log(`  - Sản phẩm ĐƯỢC BẢO VỆ (đã có đơn hàng tham chiếu): ${result.protectedCount}`);
        for (const item of result.protectedItems) {
          console.log(`    * [ID ${item.id}] ${item.name} (${item.orderRefCount} đơn hàng tham chiếu -> KHÔNG ĐƯỢC PHÉP XÓA)`);
        }
      }
      console.log('\n🛡️ Giao dịch đã được ROLLBACK an toàn. CSDL không thay đổi.');
    }

    if (isApply) {
      if (mode === 'compensate') {
        console.log(`🎉 HOÀN TẤT BỒI HOÀN AN TOÀN! Đã vô hiệu hóa: ${result.deactivatedCount} sản phẩm.`);
        console.log('Tồn kho gốc và phiên bản OCC đã được bảo toàn. Tất cả lịch sử đơn hàng nguyên vẹn 100%.');
        if (result.updatedItems && result.updatedItems.length > 0) {
          for (const item of result.updatedItems) {
            console.log(`  - [ID ${item.id}] ${item.name}: isAvailable=${item.isAvailable}, stock=${item.stock}, version=${item.version}`);
          }
        }
      } else {
        console.log(`🎉 HOÀN TẤT PRUNE! Đã xóa: ${result.deletedCount} sản phẩm chưa tham chiếu trong manifest.`);
        console.log(`Đã bảo vệ an toàn: ${result.protectedCount} sản phẩm có liên kết lịch sử đơn hàng.`);
      }
    }
  } catch (err) {
    console.error(`❌ Lỗi trong quá trình rollback: ${err.message}`);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  main().catch((err) => {
    console.error('Lỗi nghiêm trọng:', err);
    process.exit(1);
  });
}
