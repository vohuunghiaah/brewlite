#!/usr/bin/env node
/**
 * BrewLite Idempotent Catalog Synchronization Strategy
 * Controlled provisioning script for expanding the drink catalog to 15 items.
 *
 * SAFETY & INTEGRITY:
 * - Requires explicit execution flag: --dry-run or --apply
 * - Never alters existing product IDs, prices, stock, or historical order references
 * - Detects duplicates by exact product name
 * - Uses transactional execution with PostgreSQL advisory lock
 * - Provides clear audit summary and diff output
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { parseEnv } from './safe-env.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

// Load pg from apps/api if not locally in scripts
const require = createRequire(import.meta.url);
let pg;
try {
  pg = require(path.join(root, 'apps/api/node_modules/pg'));
} catch {
  pg = require('pg');
}
const { Client } = pg;

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

const host = process.env.POSTGRES_HOST || envConfig.POSTGRES_HOST || 'localhost';
const port = Number(process.env.POSTGRES_PORT || envConfig.POSTGRES_PORT || 5432);
const user = process.env.POSTGRES_USER || envConfig.POSTGRES_USER || 'brewlite';
const password = process.env.POSTGRES_PASSWORD || envConfig.POSTGRES_PASSWORD || 'brewlite_dev_password';
const database = process.env.POSTGRES_DB || envConfig.POSTGRES_DB || 'brewlite';

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
  // 5-7: Cà phê truyền thống
  {
    name: 'Cà phê đen đá',
    description: 'Cà phê Robusta Đắk Lắk pha phin truyền thống đậm đà, vị đắng thanh thoát',
    price: '28000',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 45,
  },
  {
    name: 'Cà phê sữa đá',
    description: 'Cà phê phin đậm vị kết hợp sữa đặc ngọt béo hài hòa chuẩn gu Sài Gòn',
    price: '32000',
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 50,
  },
  {
    name: 'Bạc xỉu',
    description: 'Nhiều sữa ít cà phê, vị béo ngọt thanh nhẹ thơm lừng buổi sáng',
    price: '35000',
    imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 30,
  },
  // 8-12: Espresso & Cold Brew
  {
    name: 'Espresso',
    description: 'Chiết xuất áp suất cao từ hạt Arabica Cầu Đất nguyên chất, lớp crema sánh mịn',
    price: '30000',
    imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 40,
  },
  {
    name: 'Americano đá',
    description: 'Espresso đậm đà pha loãng với nước tinh khiết và đá lạnh sảng khoái',
    price: '35000',
    imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 25,
  },
  {
    name: 'Cappuccino',
    description: 'Tỉ lệ hoàn hảo giữa Espresso, sữa nóng và lớp bọt sữa bồng bềnh mịn màng',
    price: '48000',
    imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 20,
  },
  {
    name: 'Caramel Macchiato',
    description: 'Cà phê Espresso hòa quyện vani ngọt dịu, sữa tươi và sốt caramel hảo hạng',
    price: '52000',
    imageUrl: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 15,
  },
  {
    name: 'Cold Brew cam',
    description: 'Cà phê ủ lạnh 16 giờ kết hợp nước cam vàng mọng nước, thanh mát sảng khoái',
    price: '49000',
    imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 8, // Demonstrates low stock
  },
  // 13: Matcha & Cacao
  {
    name: 'Matcha Latte',
    description: 'Bột trà xanh Uji Nhật Bản nguyên chất đánh bọt cùng sữa tươi thanh trùng',
    price: '45000',
    imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=800&q=80',
    isAvailable: false,
    stock: 0, // Demonstrates out of stock
  },
  // 14-15: Trà trái cây
  {
    name: 'Trà vải',
    description: 'Trà lài thơm ngát kết hợp trái vải thiều ngọt lịm mọng nước giải nhiệt',
    price: '38000',
    imageUrl: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 20,
  },
  {
    name: 'Trà chanh mật ong',
    description: 'Trà đen ủ ấm pha cùng chanh tươi và mật ong hoa rừng ngọt dịu thanh cổ họng',
    price: '32000',
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
    isAvailable: false,
    stock: 0, // Demonstrates out of stock
  },
];

/**
 * Execute catalog synchronization with transaction-level advisory locking.
 * Transaction-level locking guarantees automatic lock release upon COMMIT or ROLLBACK,
 * preventing any lingering session locks while strictly serializing concurrent workers.
 *
 * Docker production execution example (no public DB port needed):
 *   docker compose -f docker-compose.prod.yml run --rm --no-deps api node scripts/sync-catalog.mjs --dry-run
 *   docker compose -f docker-compose.prod.yml run --rm --no-deps api node scripts/sync-catalog.mjs --apply
 */
export async function syncCatalog({
  client,
  isDryRun = false,
  isApply = false,
  targetCatalog = TARGET_CATALOG,
  simulateError = false,
}) {
  if (!isDryRun && !isApply) {
    throw new Error('Chế độ thực thi không hợp lệ: phải chọn --dry-run hoặc --apply');
  }

  // 1. Begin atomic transaction
  await client.query('BEGIN');

  try {
    // 2. Standardized transaction-level advisory lock coordinates across seed and sync
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
      };
    }

    if (isApply) {
      if (toInsert.length > 0) {
        for (const item of toInsert) {
          if (simulateError) {
            throw new Error('Simulated failure during catalog synchronization transaction');
          }
          await client.query(
            `INSERT INTO products (name, description, price, "imageUrl", "isAvailable", stock, version, "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, 1, NOW(), NOW())`,
            [item.name, item.description, item.price, item.imageUrl, item.isAvailable, item.stock]
          );
        }
      }

      await client.query('COMMIT');
      return {
        mode: 'apply',
        existingProducts,
        preserved,
        toInsert,
        insertedCount: toInsert.length,
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

  if (!isDryRun && !isApply) {
    console.error('Lỗi: Bạn phải chỉ định rõ chế độ thực thi:');
    console.error('  node scripts/sync-catalog.mjs --dry-run  (Kiểm tra đối chiếu không thay đổi dữ liệu)');
    console.error('  node scripts/sync-catalog.mjs --apply    (Thực hiện đồng bộ vào cơ sở dữ liệu)');
    console.error('\nĐường dẫn chạy an toàn trong môi trường Docker production (mạng nội bộ, không mở cổng DB):');
    console.error('  docker compose -f docker-compose.prod.yml run --rm --no-deps api node scripts/sync-catalog.mjs --dry-run');
    console.error('  docker compose -f docker-compose.prod.yml run --rm --no-deps api node scripts/sync-catalog.mjs --apply');
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(` BREWLITE CATALOG SYNCHRONIZATION (${isDryRun ? 'DRY-RUN' : 'APPLY'})`);
  console.log(` Target DB: ${database} @ ${host}:${port}`);
  console.log(`======================================================\n`);

  const client = new Client({
    host,
    port,
    user,
    password,
    database,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
  } catch (err) {
    console.error(`Không thể kết nối đến PostgreSQL (${host}:${port}/${database}):`, err.message);
    process.exit(1);
  }

  try {
    const result = await syncCatalog({ client, isDryRun, isApply });

    console.log(`Số lượng sản phẩm hiện có trong CSDL: ${result.existingProducts.length}`);
    result.existingProducts.forEach((p) => {
      console.log(`  - [ID ${p.id}] ${p.name}: ${Number(p.price).toLocaleString('vi-VN')} đ | Tồn kho: ${p.stock} | Có sẵn: ${p.isAvailable}`);
    });

    console.log(`\n--- KẾT QUẢ ĐỐI CHIẾU ---`);
    console.log(`Bảo toàn nguyên vẹn: ${result.preserved.length} sản phẩm`);
    result.preserved.forEach(({ existing }) => {
      console.log(`  ✔ [Giữ nguyên ID ${existing.id}] ${existing.name}`);
    });

    console.log(`Cần bổ sung mới:     ${result.toInsert.length} sản phẩm`);
    result.toInsert.forEach((item) => {
      console.log(`  + [Bổ sung] ${item.name} (${Number(item.price).toLocaleString('vi-VN')} đ, tồn kho: ${item.stock}, có sẵn: ${item.isAvailable})`);
    });

    if (isDryRun) {
      console.log(`\n[DRY-RUN HOÀN TẤT] Không có thay đổi nào được ghi vào cơ sở dữ liệu.`);
      console.log(`Nếu muốn thực thi, hãy chạy lệnh với cờ --apply.\n`);
    } else if (isApply) {
      if (result.insertedCount === 0) {
        console.log(`\n[APPLY] Tất cả sản phẩm mục tiêu đã tồn tại. Không có dữ liệu nào cần thêm.`);
      } else {
        console.log(`\n[APPLY THÀNH CÔNG] Đã thêm mới ${result.insertedCount} sản phẩm vào cơ sở dữ liệu!`);
      }
    }
  } catch (err) {
    console.error('Lỗi trong quá trình đồng bộ danh mục:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
