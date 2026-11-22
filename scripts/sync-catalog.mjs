#!/usr/bin/env node
/**
 * BrewLite Idempotent Catalog Synchronization Strategy
 * Controlled provisioning script for expanding the drink catalog to 15 items.
 *
 * SAFETY & INTEGRITY:
 * - Requires explicit execution flag: --dry-run or --apply
 * - Never alters existing product IDs, prices, stock, or historical order references
 * - Detects duplicates by exact product name
 * - Uses transactional execution with PostgreSQL transaction-level advisory lock
 * - Supports both DATABASE_* (Docker Compose) and POSTGRES_* environment variables
 * - Fails-closed in production if credentials are missing or default dev password is used
 * - Provides clear audit summary, manifest, and diff output
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

/**
 * Resolve database connection configuration with support for both Compose (DATABASE_*)
 * and traditional (POSTGRES_*) variable naming.
 */
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

export const TARGET_CATALOG = [
  // 1-4: Existing baseline products
  {
    name: 'Cà phê Latte',
    description: 'Cà phê Espresso kết hợp sữa tươi',
    price: '45000',
    imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 50,
  },
  {
    name: 'Trà đào',
    description: 'Trà đào cam sả thanh mát',
    price: '35000',
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 40,
  },
  {
    name: 'Cacao sữa',
    description: 'Cacao nguyên chất kết hợp sữa',
    price: '40000',
    imageUrl: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 35,
  },
  {
    name: 'Nước suối',
    description: 'Nước uống đóng chai',
    price: '10000',
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 100,
  },
  // 5-15: Expanded products
  {
    name: 'Cà phê đen đá',
    description: 'Cà phê Robusta Đắk Lắk pha phin truyền thống đậm đà',
    price: '28000',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 45,
  },
  {
    name: 'Cà phê sữa đá',
    description: 'Cà phê phin đậm vị kết hợp sữa đặc ngọt béo hài hòa',
    price: '32000',
    imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 50,
  },
  {
    name: 'Bạc xỉu',
    description: 'Nhiều sữa ít cà phê, béo ngọt thanh nhẹ chuẩn vị Sài Gòn',
    price: '35000',
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 30,
  },
  {
    name: 'Espresso',
    description: 'Chiết xuất áp suất cao từ hạt Arabica Cầu Đất nguyên chất',
    price: '30000',
    imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 40,
  },
  {
    name: 'Americano đá',
    description: 'Espresso đậm đà pha loãng với nước tinh khiết giải nhiệt sảng khoái',
    price: '35000',
    imageUrl: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 25,
  },
  {
    name: 'Cappuccino',
    description: 'Tỉ lệ hoàn hảo giữa Espresso, sữa nóng và lớp bọt sữa bồng bềnh',
    price: '48000',
    imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 20,
  },
  {
    name: 'Caramel Macchiato',
    description: 'Cà phê Espresso hòa quyện vani ngọt dịu và sốt caramel thơm lừng',
    price: '52000',
    imageUrl: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 15,
  },
  {
    name: 'Cold Brew cam',
    description: 'Cà phê ủ lạnh 16 giờ kết hợp nước cam vàng mọng nước thanh tao',
    price: '49000',
    imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 8, // Low-stock item
  },
  {
    name: 'Matcha Latte',
    description: 'Bột trà xanh Uji Nhật Bản nguyên chất đánh bọt cùng sữa tươi',
    price: '45000',
    imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=800&q=80',
    isAvailable: false, // Out-of-stock item
    stock: 0,
  },
  {
    name: 'Trà vải',
    description: 'Trà lài thơm ngát kết hợp trái vải thiều ngọt lịm mọng nước',
    price: '38000',
    imageUrl: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 20,
  },
  {
    name: 'Trà chanh mật ong',
    description: 'Trà đen ủ ấm pha cùng chanh tươi và mật ong hoa rừng nguyên chất',
    price: '32000',
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
    isAvailable: false, // Out-of-stock item
    stock: 0,
  },
];

/**
 * Execute catalog synchronization with transaction-level advisory locking.
 * Transaction-level locking guarantees automatic lock release upon COMMIT or ROLLBACK.
 *
 * Docker production execution example:
 *   docker compose -f docker-compose.prod.yml run --rm --no-deps api node scripts/sync-catalog.mjs --dry-run
 *   docker compose -f docker-compose.prod.yml run --rm --no-deps api node scripts/sync-catalog.mjs --apply
 */
export async function syncCatalog({
  client,
  isDryRun = false,
  isApply = false,
  targetCatalog = TARGET_CATALOG,
  simulateError = false,
  failAfterInsertCount = 1,
  deploymentId = `sync-${Date.now()}`,
}) {
  if (!isDryRun && !isApply) {
    throw new Error('Chế độ thực thi không hợp lệ: phải chọn --dry-run hoặc --apply');
  }

  // 1. Begin atomic transaction
  await client.query('BEGIN');

  try {
    // 2. Standardized transaction-level advisory lock coordinates across seed, sync and rollback
    await client.query("SELECT pg_advisory_xact_lock(hashtext('brewlite.catalog.lock'))");

    // 3. Query existing catalog inside the locked transaction snapshot
    const res = await client.query('SELECT id, name, price, stock, "isAvailable" FROM products ORDER BY id ASC');
    const existingProducts = res.rows;
    const existingByName = new Map(existingProducts.map((p) => [p.name.trim().toLowerCase(), p]));

    const toInsert = [];
    const preserved = [];

    for (const item of targetCatalog) {
      const match = existingByName.get(item.name.trim().toLowerCase());
      if (match) {
        preserved.push({ target: item, existing: match });
      } else {
        toInsert.push(item);
      }
    }

    if (isDryRun) {
      // In dry-run mode, safely ROLLBACK so absolutely zero changes are committed
      await client.query('ROLLBACK');
      return {
        mode: 'dry-run',
        existingProducts,
        preserved,
        toInsert,
        insertedCount: 0,
        deploymentId,
      };
    }

    if (isApply) {
      const insertedItems = [];
      let inserted = 0;

      for (const item of toInsert) {
        // Multi-item atomic rollback injection: simulate error after inserting N items
        if (simulateError && inserted >= failAfterInsertCount) {
          throw new Error(
            `Simulated failure during catalog synchronization transaction before inserting '${item.name}' (already inserted ${inserted} items in transaction)`
          );
        }

        const insertRes = await client.query(
          `INSERT INTO products (name, description, price, "imageUrl", "isAvailable", stock, version, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, 1, NOW(), NOW())
           RETURNING id, name, price, stock, "isAvailable"`,
          [item.name, item.description, item.price, item.imageUrl, item.isAvailable, item.stock]
        );

        inserted++;
        insertedItems.push({
          id: insertRes.rows[0].id,
          name: insertRes.rows[0].name,
          deploymentId,
          insertedAt: new Date().toISOString(),
        });

        if (simulateError && inserted >= failAfterInsertCount) {
          throw new Error(
            `Simulated failure during catalog synchronization transaction immediately after inserting '${item.name}' (inserted ${inserted} items in transaction)`
          );
        }
      }

      await client.query('COMMIT');
      return {
        mode: 'apply',
        existingProducts,
        preserved,
        toInsert,
        insertedCount: insertedItems.length,
        insertedItems,
        deploymentId,
      };
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  }
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const isApply = process.argv.includes('--apply');

  if ((!isDryRun && !isApply) || (isDryRun && isApply)) {
    console.error('❌ Lỗi: Bạn phải chỉ định rõ duy nhất một chế độ thực thi:');
    console.error('  node scripts/sync-catalog.mjs --dry-run  (Kiểm tra đối chiếu an toàn, 0 thay đổi CSDL)');
    console.error('  node scripts/sync-catalog.mjs --apply    (Thực hiện đồng bộ bổ sung vào CSDL)');
    console.error('\nĐường dẫn chạy an toàn trong môi trường Docker production (mạng nội bộ, không mở cổng DB):');
    console.error('  docker compose -f docker-compose.prod.yml run --rm --no-deps api node scripts/sync-catalog.mjs --dry-run');
    console.error('  docker compose -f docker-compose.prod.yml run --rm --no-deps api node scripts/sync-catalog.mjs --apply');
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
  console.log(`☕ BREWLITE CATALOG SYNCHRONIZATION (${isDryRun ? 'DRY-RUN' : 'APPLY'})`);
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
    const deploymentId = `catalog-sync-${Date.now()}`;
    const result = await syncCatalog({ client, isDryRun, isApply, deploymentId });

    console.log(`✔ Chế độ: ${result.mode.toUpperCase()}`);
    console.log(`✔ Mã triển khai: ${result.deploymentId}`);
    console.log(`✔ Sản phẩm hiện có trong CSDL: ${result.existingProducts.length}`);
    console.log(`✔ Sản phẩm giữ nguyên không đổi: ${result.preserved.length}`);
    console.log(`✔ Sản phẩm cần bổ sung mới: ${result.toInsert.length}`);

    if (result.preserved.length > 0) {
      console.log('\n--- CÁC SẢN PHẨM HIỆN CÓ ĐƯỢC BẢO TOÀN (ID & DỮ LIỆU KHÔNG ĐỔI) ---');
      for (const item of result.preserved) {
        console.log(`  [ID ${item.existing.id}] ${item.existing.name} — ${item.existing.price} đ (Tồn kho: ${item.existing.stock})`);
      }
    }

    if (result.toInsert.length > 0) {
      console.log('\n--- CÁC SẢN PHẨM MỚI ---');
      for (const item of result.toInsert) {
        console.log(`  + [${item.isAvailable ? 'Còn hàng' : 'Hết hàng'}] ${item.name} — ${item.price} đ (Tồn kho: ${item.stock})`);
      }
    }

    if (isDryRun) {
      console.log('\n🛡️ KẾT QUẢ DRY-RUN: Giao dịch đã được ROLLBACK an toàn. Không có bất kỳ thay đổi nào được ghi vào CSDL.');
      console.log('Để áp dụng các thay đổi trên, hãy chạy lại lệnh với cờ --apply.');
    }

    if (isApply) {
      console.log(`\n🎉 ĐÃ COMMIT THÀNH CÔNG VÀO CƠ SỞ DỮ LIỆU! Đã thêm mới: ${result.insertedCount} sản phẩm.`);
      if (result.insertedItems && result.insertedItems.length > 0) {
        console.log('\n--- MANIFEST SẢN PHẨM MỚI BỔ SUNG (DÙNG CHO AUDIT & SAFE ROLLBACK) ---');
        console.log(JSON.stringify(result.insertedItems, null, 2));
      }
    }
  } catch (err) {
    console.error(`❌ Lỗi trong quá trình đồng bộ: ${err.message}`);
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
