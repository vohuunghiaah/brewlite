import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = path.join(root, 'docs/ui/restoration-evidence');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const mockProducts = [
  {
    id: 1,
    name: 'Cà phê Sữa Đá',
    description: 'Hạt Robusta Buôn Ma Thuột đậm đà kết hợp sữa đặc ngọt béo chuẩn gu truyền thống.',
    price: 29000,
    imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 50,
  },
  {
    id: 2,
    name: 'Cà phê Latte',
    description: 'Espresso nguyên chất hòa quyện lớp sữa tươi mịn màng cùng nghệ thuật tạo hình bọt sữa.',
    price: 45000,
    imageUrl: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 35,
  },
  {
    id: 3,
    name: 'Trà Đào Cam Sả',
    description: 'Vị trà thanh nhẹ, tinh dầu sả cay ấm kết hợp những miếng đào giòn thơm ngọt.',
    price: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 20,
  },
  {
    id: 4,
    name: 'Bánh Croissant Bơ Tỏi',
    description: 'Bánh sừng bò ngàn lớp thơm nức mùi bơ Pháp nhập khẩu và phô mai nướng vàng giòn.',
    price: 32000,
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    stock: 15,
  },
];

const mockOrders = [
  {
    id: 1042,
    orderCode: '#BL-1042',
    pickupMethod: 'AT_TABLE',
    tableNumber: '12',
    userId: 1,
    customerName: 'Nghĩa Võ',
    customerPhone: '0901234567',
    note: 'Uống nóng, ít ngọt',
    totalAmount: 60000,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    items: [
      {
        id: 1,
        productId: 2,
        productName: 'Cà phê Latte',
        size: 'MEDIUM',
        toppings: ['Kem cheese'],
        note: 'Đá 70%, Đường 50%',
        quantity: 1,
        unitPrice: 60000,
        subtotal: 60000,
      },
    ],
  },
  {
    id: 1038,
    orderCode: '#BL-1038',
    pickupMethod: 'AT_COUNTER',
    tableNumber: null,
    userId: 1,
    customerName: 'Nghĩa Võ',
    customerPhone: '0901234567',
    note: '',
    totalAmount: 29000,
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    items: [
      {
        id: 2,
        productId: 1,
        productName: 'Cà phê Sữa Đá',
        size: 'SMALL',
        toppings: [],
        note: '',
        quantity: 1,
        unitPrice: 29000,
        subtotal: 29000,
      },
    ],
  },
];

async function main() {
  const PORT = '3344';
  const webServer = spawn('npx', ['next', 'start', '-p', PORT], {
    cwd: path.join(root, 'apps/web'),
    stdio: 'ignore',
    shell: true,
  });

  // Chờ server sẵn sàng
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/menu`);
      if (res.ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }

  const browser = await chromium.launch({ headless: true });

  async function createConfiguredPage(viewport) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    // Intercept API routes
    await page.route('**/products*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProducts),
      });
    });

    await page.route('**/orders/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOrders),
      });
    });

    await page.route('**/orders*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1045, orderCode: '#BL-1045', status: 'PENDING' }),
      });
    });

    // Preset authenticated state and cart
    await page.addInitScript(() => {
      window.localStorage.setItem('brewlite_access_token', 'mock_jwt_token_123');
      window.localStorage.setItem(
        'brewlite_user',
        JSON.stringify({ id: 1, email: 'nghia.vo@brewlite.vn', name: 'Nghĩa Võ' })
      );
      window.sessionStorage.setItem(
        'brewlite_cart_v1',
        JSON.stringify([
          {
            key: '2-MEDIUM-["Kem cheese"]-70-50',
            productId: 2,
            productName: 'Cà phê Latte',
            basePrice: 45000,
            size: 'MEDIUM',
            toppings: ['Kem cheese'],
            note: 'Đá 70%, Đường 50%',
            unitPrice: 60000,
            quantity: 1,
            subtotal: 60000,
          },
        ])
      );
    });

    return { context, page };
  }

  try {
    console.log('📸 1. Chụp 01-menu-desktop.png (1440x900)...');
    {
      const { context, page } = await createConfiguredPage({ width: 1440, height: 900 });
      await page.goto(`http://127.0.0.1:${PORT}/menu#menu`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outDir, '01-menu-desktop.png'), fullPage: false });
      await context.close();
    }

    console.log('📸 2. Chụp 02-menu-mobile.png (375x812)...');
    {
      const { context, page } = await createConfiguredPage({ width: 375, height: 812 });
      await page.goto(`http://127.0.0.1:${PORT}/menu#menu`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(outDir, '02-menu-mobile.png'), fullPage: false });
      await context.close();
    }

    console.log('📸 3. Chụp 03-customizer-modal.png...');
    {
      const { context, page } = await createConfiguredPage({ width: 1440, height: 900 });
      await page.goto(`http://127.0.0.1:${PORT}/menu#menu`, { waitUntil: 'networkidle' });
      const detailBtn = page.locator('article button:has-text("Chi tiết")').first();
      await detailBtn.click();
      await page.locator('div[role="dialog"]').waitFor({ state: 'visible' });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outDir, '03-customizer-modal.png'), fullPage: false });
      await context.close();
    }

    console.log('📸 4. Chụp 04-cart-drawer.png...');
    {
      const { context, page } = await createConfiguredPage({ width: 1440, height: 900 });
      await page.goto(`http://127.0.0.1:${PORT}/menu#menu`, { waitUntil: 'networkidle' });
      const cartBtn = page.locator('button[class*="cartSummary"]').first();
      await cartBtn.click();
      await page.locator('#cart').waitFor({ state: 'visible' });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outDir, '04-cart-drawer.png'), fullPage: false });
      await context.close();
    }

    console.log('📸 5. Chụp 05-auth-modal.png...');
    {
      const { context, page } = await createConfiguredPage({ width: 1440, height: 900 });
      // Clear token to show unauthenticated auth modal
      await page.addInitScript(() => {
        window.localStorage.removeItem('brewlite_access_token');
        window.localStorage.removeItem('brewlite_user');
      });
      await page.goto(`http://127.0.0.1:${PORT}/menu#menu`, { waitUntil: 'networkidle' });
      const cartBtn = page.locator('button[class*="cartSummary"]').first();
      await cartBtn.click();
      await page.locator('button:has-text("Tiếp tục đặt hàng")').first().click();
      await page.locator('div[role="dialog"]:has-text("Chào mừng đến BrewLite")').waitFor({ state: 'visible' });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outDir, '05-auth-modal.png'), fullPage: false });
      await context.close();
    }

    console.log('📸 6. Chụp 06-checkout-flow.png...');
    {
      const { context, page } = await createConfiguredPage({ width: 1440, height: 900 });
      await page.goto(`http://127.0.0.1:${PORT}/menu#menu`, { waitUntil: 'networkidle' });
      const cartBtn = page.locator('button[class*="cartSummary"]').first();
      await cartBtn.click();
      await page.locator('button:has-text("Tiếp tục đặt hàng")').first().click();
      await page.fill('input#customerName', 'Nghĩa Võ');
      await page.fill('input#customerPhone', '0901234567');
      await page.locator('button:has-text("Xác nhận đặt hàng")').click();
      await page.locator('button:has-text("Tiếp tục thanh toán")').first().click();
      await page.locator('div[role="dialog"]:has-text("Thanh toán không tiền mặt")').waitFor({ state: 'visible' });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(outDir, '06-checkout-flow.png'), fullPage: false });
      await context.close();
    }

    console.log('📸 7. Chụp 07-order-confirmation.png...');
    {
      const { context, page } = await createConfiguredPage({ width: 1440, height: 900 });
      await page.goto(`http://127.0.0.1:${PORT}/menu#history`, { waitUntil: 'networkidle' });
      await page.locator('article[aria-label="#BL-1042"]').waitFor({ state: 'visible' });
      await page.locator('button:has-text("Xem vé xác nhận #BL-1042")').click();
      await page.locator('div[role="dialog"][aria-label="#BL-1042"]').waitFor({ state: 'visible' });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, '07-order-confirmation.png'), fullPage: false });
      await context.close();
    }

    console.log('📸 8. Chụp 08-order-history.png...');
    {
      const { context, page } = await createConfiguredPage({ width: 1440, height: 900 });
      await page.goto(`http://127.0.0.1:${PORT}/menu#history`, { waitUntil: 'networkidle' });
      await page.locator('article[aria-label="#BL-1042"]').waitFor({ state: 'visible' });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, '08-order-history.png'), fullPage: false });
      await context.close();
    }

    console.log('📸 9. Chụp 09-account-screen.png...');
    {
      const { context, page } = await createConfiguredPage({ width: 1440, height: 900 });
      await page.goto(`http://127.0.0.1:${PORT}/menu#account`, { waitUntil: 'networkidle' });
      await page.locator('h1:has-text("Tài khoản")').waitFor({ state: 'visible' });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, '09-account-screen.png'), fullPage: false });
      await context.close();
    }

    console.log('\n🎉 ĐÃ CHỤP THÀNH CÔNG TẤT CẢ 9 ẢNH CHỨNG MINH GIAO DIỆN!');
  } finally {
    await browser.close();
    try {
      webServer.kill();
    } catch {}
  }
}

main().catch((err) => {
  console.error('Lỗi chụp ảnh:', err);
  process.exit(1);
});
