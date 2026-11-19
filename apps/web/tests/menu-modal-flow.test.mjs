import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMenuModalController,
  createMenuLifecycleController,
  filterProducts,
  getCategory,
  calculateItemPrice,
  buildCartItemKey,
  AVAILABLE_SIZES,
  AVAILABLE_TOPPINGS,
  AVAILABLE_ICE_LEVELS,
  AVAILABLE_SUGAR_LEVELS,
  combineItemNote,
} from '../src/app/menu/menu-controller.mjs';

test('1. Loading state: Menu lifecycle starts with loading true then resolves products', async () => {
  let resolvePromise;
  const mockFetch = async () =>
    new Promise((resolve) => {
      resolvePromise = () => resolve([{ id: 1, name: 'Latte', description: 'Ngon', price: '45000', isAvailable: true }]);
    });

  const controller = createMenuLifecycleController({
    apiUrl: 'http://test-api',
    fetchProductsFn: mockFetch,
  });

  assert.equal(controller.getState().loading, true, 'Initial state must be loading');
  assert.deepEqual(controller.getState().products, [], 'Initial products must be empty');

  const loadPromise = controller.loadProducts();
  assert.equal(controller.getState().loading, true, 'State remains loading while in-flight');

  resolvePromise();
  await loadPromise;

  assert.equal(controller.getState().loading, false, 'Loading must be false after response');
  assert.equal(controller.getState().products.length, 1, 'Products populated');
  assert.equal(controller.getState().products[0].name, 'Latte');
});

test('2. Empty state: Handles empty API product list and empty search results', async () => {
  const controller = createMenuLifecycleController({
    apiUrl: 'http://test-api',
    fetchProductsFn: async () => [],
  });

  await controller.loadProducts();
  assert.equal(controller.getState().loading, false);
  assert.deepEqual(controller.getState().products, [], 'Products array is empty');
  assert.deepEqual(controller.getFilteredProducts(), [], 'Filtered products is empty');

  // Case with products but no matching search term
  const sampleProducts = [
    { id: 1, name: 'Cà phê Latte', description: 'Cà phê sữa', price: '45000', isAvailable: true },
  ];
  assert.deepEqual(filterProducts(sampleProducts, 'Matcha không tồn tại', 'Tất cả'), []);
});

test('3. Error state & Retry: Displays error when API fails and recovers on retry', async () => {
  let attempts = 0;
  const mockFetch = async () => {
    attempts++;
    if (attempts === 1) {
      throw new Error('Connection refused (503)');
    }
    return [{ id: 1, name: 'Trà đào cam sả', price: '35000', isAvailable: true }];
  };

  const controller = createMenuLifecycleController({
    apiUrl: 'http://test-api',
    fetchProductsFn: mockFetch,
  });

  await controller.loadProducts();
  assert.equal(controller.getState().loading, false);
  assert.equal(controller.getState().error, 'Connection refused (503)', 'Error state set');
  assert.deepEqual(controller.getState().products, []);

  // Retry
  await controller.loadProducts();
  assert.equal(controller.getState().loading, false);
  assert.equal(controller.getState().error, '', 'Error cleared on retry');
  assert.equal(controller.getState().products.length, 1, 'Products loaded on retry');
});

test('4. Open and close Product Detail Modal: Updates state and loads fresh details', async () => {
  const preview = { id: 1, name: 'Cà phê Latte', description: 'Xem trước', price: '45000', isAvailable: true };
  const fresh = { id: 1, name: 'Cà phê Latte Đặc Biệt', description: 'Chi tiết đầy đủ từ API', price: '45000', isAvailable: true };

  const controller = createMenuModalController({
    apiUrl: 'http://test-api',
    fetchDetailFn: async () => fresh,
  });

  assert.equal(controller.getState().isOpen, false);
  assert.equal(controller.getState().selectedProduct, null);

  const openPromise = controller.openProductDetail(preview);
  // Immediately opened with preview
  assert.equal(controller.getState().isOpen, true);
  assert.equal(controller.getState().selectedProduct.name, 'Cà phê Latte');
  assert.equal(controller.getState().loadingDetail, true);

  await openPromise;
  assert.equal(controller.getState().isOpen, true);
  assert.equal(controller.getState().loadingDetail, false);
  assert.equal(controller.getState().selectedProduct.name, 'Cà phê Latte Đặc Biệt', 'Updated with fresh API data');

  // Close modal
  controller.closeProductDetail();
  assert.equal(controller.getState().isOpen, false);
  assert.equal(controller.getState().selectedProduct, null);
});

test('5. Close modal with Escape: handleEscape dismisses dialog and returns true', () => {
  const controller = createMenuModalController({
    apiUrl: 'http://test-api',
    fetchDetailFn: async () => ({ id: 1, name: 'Latte' }),
  });

  assert.equal(controller.handleEscape(), false, 'Returns false when modal not open');

  void controller.openProductDetail({ id: 1, name: 'Latte' });
  assert.equal(controller.getState().isOpen, true);

  const handled = controller.handleEscape();
  assert.equal(handled, true, 'Returns true when modal was open');
  assert.equal(controller.getState().isOpen, false, 'Modal closed');
  assert.equal(controller.getState().selectedProduct, null);
});

test('6. API responds AFTER modal closed: Must NOT reopen modal or set state', async () => {
  let resolveDetail;
  const mockFetchDetail = async (_apiUrl, _id, signal) =>
    new Promise((resolve, reject) => {
      resolveDetail = () => resolve({ id: 1, name: 'Latte Từ Máy Chủ Trễ' });
      signal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });

  const controller = createMenuModalController({
    apiUrl: 'http://test-api',
    fetchDetailFn: mockFetchDetail,
  });

  // Step 1: User opens product detail
  const openPromise = controller.openProductDetail({ id: 1, name: 'Latte Preview' });
  assert.equal(controller.getState().isOpen, true);
  assert.equal(controller.getState().loadingDetail, true);

  // Step 2: User closes modal BEFORE API responds
  controller.closeProductDetail();
  assert.equal(controller.getState().isOpen, false, 'Modal closed immediately');
  assert.equal(controller.getState().selectedProduct, null);

  // Step 3: Delayed API response arrives
  resolveDetail();
  await openPromise;

  // Verification: Modal MUST remain closed, selectedProduct MUST remain null
  assert.equal(controller.getState().isOpen, false, 'Modal MUST NOT reopen');
  assert.equal(controller.getState().selectedProduct, null, 'State MUST NOT be overwritten');
});

test('7. Two requests respond out of order: Stale response does NOT overwrite latest product', async () => {
  let resolveProductA;
  let resolveProductB;

  const mockFetchDetail = async (_apiUrl, id, signal) => {
    return new Promise((resolve, reject) => {
      if (id === 1) {
        resolveProductA = () => resolve({ id: 1, name: 'Sản Phẩm A (Mới)' });
      } else if (id === 2) {
        resolveProductB = () => resolve({ id: 2, name: 'Sản Phẩm B (Mới)' });
      }
      signal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });
  };

  const controller = createMenuModalController({
    apiUrl: 'http://test-api',
    fetchDetailFn: mockFetchDetail,
  });

  // User opens Product A (Request 1 begins, slow)
  const promiseA = controller.openProductDetail({ id: 1, name: 'Sản Phẩm A' });
  assert.equal(controller.getState().selectedProduct.id, 1);

  // User quickly switches to Product B (Request 2 begins, fast)
  const promiseB = controller.openProductDetail({ id: 2, name: 'Sản Phẩm B' });
  assert.equal(controller.getState().selectedProduct.id, 2);

  // Request B finishes first
  resolveProductB();
  await promiseB;
  assert.equal(controller.getState().selectedProduct.name, 'Sản Phẩm B (Mới)');

  // Request A subsequently finishes late
  resolveProductA();
  await promiseA;

  // Verification: State MUST remain Product B, NOT overwritten by Product A!
  assert.equal(controller.getState().selectedProduct.id, 2, 'Active product must remain Product B');
  assert.equal(controller.getState().selectedProduct.name, 'Sản Phẩm B (Mới)', 'Data must remain Product B');
});

test('8. Detail API error inside modal: Shows detailError and preserves preview for cart', async () => {
  const controller = createMenuModalController({
    apiUrl: 'http://test-api',
    fetchDetailFn: async () => {
      throw new Error('HTTP 404: Không tìm thấy sản phẩm');
    },
  });

  const preview = { id: 99, name: 'Món Thử Nghiệm', price: '20000', isAvailable: true };
  await controller.openProductDetail(preview);

  assert.equal(controller.getState().isOpen, true, 'Modal stays open');
  assert.equal(controller.getState().loadingDetail, false);
  assert.equal(controller.getState().detailError, 'HTTP 404: Không tìm thấy sản phẩm');
  assert.equal(controller.getState().selectedProduct.id, 99, 'Preview is preserved');
});

test('9. Utility: getCategory categorizes products accurately', () => {
  assert.equal(getCategory({ name: 'Trà sen vàng' }), 'Trà trái cây');
  assert.equal(getCategory({ name: 'Cà phê Espresso' }), 'Cold Brew & Espresso');
  assert.equal(getCategory({ name: 'Cà phê Sữa Đá' }), 'Cà phê truyền thống');
  assert.equal(getCategory({ name: 'Bánh Tiramisu' }), 'Bánh ngọt');
  assert.equal(getCategory({ name: 'Nước lọc khoáng' }), 'Khác');
});

test('10. Customization Pricing: calculateItemPrice calculates size and topping surcharges according to SRS FR-02', () => {
  // Verify SRS options metadata
  assert.equal(AVAILABLE_SIZES.length, 3);
  assert.equal(AVAILABLE_TOPPINGS.length, 5);

  const base = 45000;

  // Sizes: SMALL (+0), MEDIUM (+5.000), LARGE (+10.000)
  assert.equal(calculateItemPrice(base, 'SMALL', []), 45000);
  assert.equal(calculateItemPrice(base, 'MEDIUM', []), 50000);
  assert.equal(calculateItemPrice(base, 'LARGE', []), 55000);

  // Single Toppings
  assert.equal(calculateItemPrice(base, 'SMALL', ['Kem cheese']), 55000); // 45k + 10k
  assert.equal(calculateItemPrice(base, 'SMALL', ['Trân châu trắng']), 53000); // 45k + 8k
  assert.equal(calculateItemPrice(base, 'SMALL', ['Thạch đào']), 53000); // 45k + 8k
  assert.equal(calculateItemPrice(base, 'SMALL', ['Sốt caramel']), 51000); // 45k + 6k
  assert.equal(calculateItemPrice(base, 'SMALL', ['Thạch sương sáo']), 51000); // 45k + 6k

  // Multiple Toppings + Size LARGE
  // 45.000 + 10.000 (LARGE) + 10.000 (Kem cheese) + 8.000 (Trân châu trắng) + 6.000 (Sốt caramel) = 79.000
  const multiToppings = ['Kem cheese', 'Trân châu trắng', 'Sốt caramel'];
  assert.equal(calculateItemPrice(base, 'LARGE', multiToppings), 79000);

  // Boundary check: negative or zero base price returns non-negative
  assert.equal(calculateItemPrice(0, 'SMALL', []), 0);
  assert.equal(calculateItemPrice(-5000, 'SMALL', []), 0);
});

test('11. Cart Item Key: buildCartItemKey produces canonical keys, normalizes topping order, separates variants', () => {
  // Same product, size, toppings in different order -> identical key
  const key1 = buildCartItemKey(1, 'MEDIUM', ['Kem cheese', 'Thạch đào'], 'Ít đá');
  const key2 = buildCartItemKey(1, 'MEDIUM', ['Thạch đào', 'Kem cheese'], ' ít đá ');
  assert.equal(key1, key2, 'Keys with different topping order or whitespace in note must match');

  // Different size -> different key
  const keySmall = buildCartItemKey(1, 'SMALL', ['Kem cheese'], 'Ít đá');
  assert.notEqual(key1, keySmall);

  // Different topping -> different key
  const keyTopping = buildCartItemKey(1, 'MEDIUM', ['Kem cheese'], 'Ít đá');
  assert.notEqual(key1, keyTopping);

  // Different note -> different key
  const keyNote = buildCartItemKey(1, 'MEDIUM', ['Kem cheese', 'Thạch đào'], 'Không đá');
  assert.notEqual(key1, keyNote);

  // Different productId -> different key
  const keyOtherProduct = buildCartItemKey(2, 'MEDIUM', ['Kem cheese', 'Thạch đào'], 'Ít đá');
  assert.notEqual(key1, keyOtherProduct);
});

test('12. Quick Selectors: combineItemNote properly formats ice, sugar, freeform note and prevents duplicate labels', () => {
  // Check constants
  assert.deepEqual(AVAILABLE_ICE_LEVELS, ['Không đá', 'Ít đá', 'Đá đầy']);
  assert.deepEqual(AVAILABLE_SUGAR_LEVELS, ['0%', '30%', '70%', '100%']);

  // Default ice and sugar with no extra note
  assert.equal(combineItemNote('Đá đầy', '100%', ''), 'Đá đầy, 100% đường');

  // Custom options with extra note
  assert.equal(
    combineItemNote('Ít đá', '70%', 'Uống tại bàn 3'),
    'Ít đá, 70% đường, Uống tại bàn 3'
  );

  // Duplication avoidance: user types 'Ít đá' again in custom note
  assert.equal(
    combineItemNote('Ít đá', '50%', 'Ít đá'),
    'Ít đá, 50% đường'
  );

  // Long note truncation at 255 chars
  const superLongNote = 'a'.repeat(300);
  const combined = combineItemNote('Đá đầy', '100%', superLongNote);
  assert.ok(combined.length <= 255, 'Combined note must never exceed 255 chars');
});


