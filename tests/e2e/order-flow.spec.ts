import { test, expect } from '@playwright/test';

test.describe('BrewLite E2E Flow: Menu -> Customization -> Cart -> Login -> Checkout -> Payment -> Order History', () => {
  test('Complete Customer Ordering Lifecycle', async ({ page }) => {
    // 1. Visit Menu Page
    await page.goto('/');
    await expect(page).toHaveTitle(/BrewLite/i);
    await expect(page.locator('text=BrewLite Cafe')).toBeVisible();

    // 2. Select first available product
    const productCard = page.locator('a[href^="/products/"]').first();
    await expect(productCard).toBeVisible();
    await productCard.click();

    // 3. Customize product (Size, Toppings, Quantity)
    await expect(page.locator('text=Chọn kích cỡ')).toBeVisible();
    
    // Select Size Medium if available
    const mediumSizeBtn = page.locator('button:has-text("Medium (M)")');
    if (await mediumSizeBtn.isVisible()) {
      await mediumSizeBtn.click();
    }

    // Select a topping if available
    const toppingBtn = page.locator('button:has-text("Trân châu")').first();
    if (await toppingBtn.isVisible()) {
      await toppingBtn.click();
    }

    // Click Add to Cart
    const addToCartBtn = page.locator('button:has-text("Thêm vào giỏ hàng")');
    await expect(addToCartBtn).toBeEnabled();
    await addToCartBtn.click();

    // 4. Navigate to Cart
    await page.goto('/cart');
    await expect(page.locator('text=Giỏ hàng')).toBeVisible();
    await expect(page.locator('text=Tạm tính')).toBeVisible();

    // 5. Click Checkout
    const checkoutBtn = page.locator('button:has-text("Tiến hành đặt món")');
    await checkoutBtn.click();

    // 6. Handle Auth if prompted
    if (page.url().includes('/login')) {
      await page.fill('input[type="email"]', 'customer@brewlite.com');
      await page.fill('input[type="password"]', 'Password123!');
      await page.click('button[data-testid="auth-submit-button"]');
    }

    // 7. Complete Checkout
    await page.waitForURL('**/checkout');
    await expect(page.locator('text=Tóm tắt đơn hàng')).toBeVisible();

    // Set mock outcome to SUCCESS
    const successRadio = page.locator('input[value="SUCCESS"]');
    if (await successRadio.isVisible()) {
      await successRadio.check();
    }

    // Submit Payment
    const payBtn = page.locator('button:has-text("Thanh toán & Đặt hàng")');
    await expect(payBtn).toBeEnabled();
    await payBtn.click();

    // 8. Verify Order Confirmation
    await page.waitForURL('**/order/confirmation**');
    await expect(page.locator('text=Đặt hàng thành công!')).toBeVisible();
    await expect(page.locator('text=Mã đơn hàng')).toBeVisible();

    // 9. View Order History
    const historyLink = page.locator('a:has-text("Xem lịch sử đơn của bạn")');
    await historyLink.click();
    await page.waitForURL('**/orders');
    await expect(page.locator('text=Lịch sử đơn hàng')).toBeVisible();
  });
});
