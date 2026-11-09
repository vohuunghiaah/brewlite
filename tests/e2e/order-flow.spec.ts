import { test, expect } from '@playwright/test';

test.describe('BrewLite E2E Flow: Menu -> Customization -> Cart -> Login -> Checkout -> Payment -> Order History', () => {
  test('Complete Customer Ordering Lifecycle', async ({ page }) => {
    // 1. Visit Menu Page
    await page.goto('/');
    await expect(page).toHaveTitle(/BrewLite/i);
    await expect(page.locator('header').getByText('BrewLite')).toBeVisible();

    // 2. Select first available product
    const productCards = page.locator('a[href^="/products/"]');
    await expect(productCards.first()).toBeVisible({ timeout: 15000 });
    await productCards.first().click();

    // 3. Customize product (Size, Toppings, Quantity)
    await page.waitForURL('**/products/**');
    await expect(page.locator('text=Chọn kích cỡ')).toBeVisible();

    // Select Size M if available
    const mediumSizeBtn = page.locator('button:has-text("Size M")');
    if (await mediumSizeBtn.isVisible()) {
      await mediumSizeBtn.click();
    }

    // Select a topping if available
    const toppingBtn = page.locator('button:has-text("Trân châu")').first();
    if (await toppingBtn.isVisible()) {
      await toppingBtn.click();
    }

    // Click Add to Cart
    const addToCartBtn = page.locator('footer button:has-text("Thêm vào giỏ hàng")');
    await expect(addToCartBtn).toBeEnabled();
    await addToCartBtn.click();

    // 4. Navigate to Cart
    await page.goto('/cart');
    await page.waitForURL('**/cart');
    await expect(page.locator('h1:has-text("Giỏ hàng")')).toBeVisible();

    // 5. Click Checkout
    const checkoutBtn = page.locator('[data-testid="checkout-button"]');
    await expect(checkoutBtn).toBeVisible();
    await checkoutBtn.click();

    // 6. Handle Auth if redirected to /login
    await page.waitForURL((url) => url.pathname.includes('/login') || url.pathname.includes('/checkout'));
    if (page.url().includes('/login')) {
      await page.fill('input[type="email"]', 'customer@brewlite.com');
      await page.fill('input[type="password"]', 'Password123!');
      await page.click('button[data-testid="auth-submit-button"]');
      await page.waitForURL('**/checkout');
    }

    // 7. Complete Checkout
    await expect(page.locator('text=Tóm tắt đơn hàng')).toBeVisible();

    // Ensure mock outcome is SUCCESS
    const outcomeSelect = page.locator('select');
    if (await outcomeSelect.isVisible()) {
      await outcomeSelect.selectOption('SUCCESS');
    }

    // Submit Payment
    const payBtn = page.locator('[data-testid="pay-now-button"]');
    await expect(payBtn).toBeEnabled();
    await payBtn.click();

    // 8. Verify Order Confirmation
    await page.waitForURL('**/order/confirmation**', { timeout: 15000 });
    await expect(page.locator('text=ĐÃ THANH TOÁN THÀNH CÔNG')).toBeVisible();
    await expect(page.locator('text=Mã đơn')).toBeVisible();

    // 9. View Order History
    const historyLink = page.locator('a[href="/orders"]').last();
    await expect(historyLink).toBeVisible();
    await historyLink.click();
    await page.waitForURL('**/orders');
    await expect(page.locator('h1:has-text("Lịch sử đơn hàng")')).toBeVisible();
  });
});
