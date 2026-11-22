import { spawnSync } from 'node:child_process';
import assert from 'node:assert';
import test from 'node:test';
import { TARGET_CATALOG } from './sync-catalog.mjs';

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
