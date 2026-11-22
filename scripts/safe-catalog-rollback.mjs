#!/usr/bin/env node
/**
 * BrewLite Safe Catalog Rollback Strategy (FIX-06)
 *
 * SAFETY & INTEGRITY PRINCIPLES:
 * 1. Never execute unguided or blind deletions (REPLACES "DELETE FROM products WHERE id > 4").
 * 2. Permanently protects baseline products (ID 1-4: Latte, Trà đào, Cacao sữa, Nước suối).
 * 3. Never deletes products referenced by order_items (Strict Foreign Key & Historical Receipt Preservation).
 * 4. Compensating Operation by default (--mode=compensate): marks items unavailable (isAvailable=false, stock=0),
 *    removing them from active menu without corrupting existing user orders or transaction history.
 * 5. Optional prune mode (--mode=prune): physically removes ONLY unreferenced products, requiring manual confirmation.
 * 6. Transaction-level PostgreSQL advisory lock coordinates across sync and rollback processes.
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
 * Execute Safe Catalog Rollback.
 *
 * @param {Object} options
 * @param {import('pg').Client} options.client Active PostgreSQL client
 * @param {'compensate'|'prune'} options.mode
 *   - 'compensate' (Default / Recommended): Soft deactivation (isAvailable=false, stock=0). Zero data loss.
 *   - 'prune': Physical deletion of ONLY unreferenced products. Products with existing orders are protected.
 * @param {number[]} [options.targetProductIds] Specific IDs to rollback (optional)
 * @param {string[]} [options.targetProductNames] Specific names to rollback (optional)
 * @param {boolean} options.isDryRun Dry run without committing changes
 * @param {boolean} options.isApply Commit changes to database
 */
export async function safeCatalogRollback({
  client,
  mode = 'compensate',
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

  await client.query('BEGIN');
  try {
    // Transaction-level advisory lock serializes rollback operations
    await client.query("SELECT pg_advisory_xact_lock(hashtext('brewlite.catalog.lock'))");

    // Query candidate products
    const allRes = await client.query('SELECT id, name, price, stock, "isAvailable" FROM products ORDER BY id ASC');
    const allProducts = allRes.rows;

    // Filter candidates: strictly exclude baseline products
    const candidates = allProducts.filter((p) => {
      if (BASELINE_PRODUCT_NAMES.includes(p.name) || BASELINE_PRODUCT_IDS.includes(p.id)) {
        return false; // Permanently protected baseline
      }
      if (Array.isArray(targetProductIds) && targetProductIds.length > 0) {
        return targetProductIds.includes(p.id);
      }
      if (Array.isArray(targetProductNames) && targetProductNames.length > 0) {
        return targetProductNames.includes(p.name);
      }
      return true; // All non-baseline expanded products
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
      // Compensating Operation: Mark unavailable and zero stock
      const toDeactivate = analyzed.filter((p) => p.isAvailable || p.stock > 0);

      if (isDryRun) {
        await client.query('ROLLBACK');
        return {
          mode: 'compensate',
          isDryRun: true,
          totalCandidates: candidates.length,
          toDeactivateCount: toDeactivate.length,
          toDeactivateItems: toDeactivate,
          action: 'DRY-RUN: Sẽ cập nhật isAvailable=false và stock=0 cho các sản phẩm mở rộng (bảo vệ lịch sử đơn hàng 100%)',
        };
      }

      if (isApply) {
        if (toDeactivate.length > 0) {
          const ids = toDeactivate.map((p) => p.id);
          await client.query(
            'UPDATE products SET "isAvailable" = false, stock = 0, "updatedAt" = NOW() WHERE id = ANY($1)',
            [ids]
          );
        }
        await client.query('COMMIT');
        return {
          mode: 'compensate',
          isApply: true,
          totalCandidates: candidates.length,
          deactivatedCount: toDeactivate.length,
          deactivatedItems: toDeactivate,
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
          totalCandidates: candidates.length,
          unreferencedCount: unreferenced.length,
          unreferencedItems: unreferenced,
          protectedCount: protectedReferenced.length,
          protectedItems: protectedReferenced,
          action: 'DRY-RUN: Chỉ xóa các sản phẩm chưa có đơn hàng nào tham chiếu. Sản phẩm đã có đơn hàng được BẢO VỆ TUYỆT ĐỐI.',
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

  if ((!isDryRun && !isApply) || (isDryRun && isApply)) {
    console.error('❌ Lỗi: Bạn phải chỉ định rõ duy nhất một chế độ thực thi:');
    console.error('  node scripts/safe-catalog-rollback.mjs --dry-run                     (Kiểm tra đối chiếu an toàn, 0 thay đổi CSDL)');
    console.error('  node scripts/safe-catalog-rollback.mjs --apply --mode=compensate     (Khuyến nghị: Ẩn món khỏi menu, bảo toàn lịch sử)');
    console.error('  node scripts/safe-catalog-rollback.mjs --apply --mode=prune --confirm (Chỉ xóa các món chưa có đơn hàng tham chiếu)');
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
  console.log(`🛡️ BREWLITE SAFE CATALOG ROLLBACK (${isDryRun ? 'DRY-RUN' : 'APPLY'})`);
  console.log(`📌 Chế độ: ${mode === 'compensate' ? 'COMPENSATE (Vô hiệu hóa an toàn, bảo vệ đơn hàng)' : 'PRUNE (Chỉ xóa món chưa tham chiếu)'}`);
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
    const result = await safeCatalogRollback({ client, mode, isDryRun, isApply });

    if (isDryRun) {
      console.log('✔ KẾT QUẢ KIỂM TRA ĐỐI CHIẾU (DRY-RUN):');
      console.log(`  - Tổng số sản phẩm mở rộng: ${result.totalCandidates}`);
      if (mode === 'compensate') {
        console.log(`  - Sản phẩm sẽ chuyển sang hết hàng (isAvailable=false): ${result.toDeactivateCount}`);
        for (const item of result.toDeactivateItems) {
          console.log(`    * [ID ${item.id}] ${item.name} (${item.orderRefCount} đơn hàng tham chiếu -> ĐƯỢC BẢO TOÀN)`);
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
        console.log('Tất cả lịch sử đơn hàng, hóa đơn và vé chuông điện tử vẫn nguyên vẹn 100%.');
      } else {
        console.log(`🎉 HOÀN TẤT PRUNE! Đã xóa: ${result.deletedCount} sản phẩm chưa tham chiếu.`);
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
