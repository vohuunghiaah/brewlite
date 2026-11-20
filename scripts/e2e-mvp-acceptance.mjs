import assert from 'node:assert/strict';
import { verifyFulfillment, verifyNavigation } from './staff-fulfillment-e2e.mjs';
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import {
  getEffectiveDbConfig,
  verifyLiveDatabase,
  queryDb,
} from './env-safety.mjs';

// ================= CẤU HÌNH MÔI TRƯỜNG & PORTABLE PATHS =================
const config = getEffectiveDbConfig();
const WEB_URL = config.webUrl;
const API_URL = config.apiUrl;

// Đường dẫn lưu ảnh chụp màn hình nghiệm thu (tương đối theo process.cwd() hoặc env)
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR
  ? path.resolve(process.env.SCREENSHOT_DIR)
  : path.resolve(process.cwd(), 'docs/testing/screenshots');

// Tuỳ chọn lưu thêm vào thư mục artifacts nếu được cấu hình qua env
const ARTIFACT_DIR = process.env.ARTIFACTS_DIR
  ? path.resolve(process.env.ARTIFACTS_DIR, 'e2e_screenshots')
  : null;

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}
if (ARTIFACT_DIR && !fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

// ================= LƯU ẢNH BẰNG CHỨNG =================
async function saveScreenshot(page, filename) {
  const mainPath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: mainPath, fullPage: true });
  if (ARTIFACT_DIR) {
    const artifactPath = path.join(ARTIFACT_DIR, filename);
    await page.screenshot({ path: artifactPath, fullPage: true });
  }
}

// ================= TIẾN TRÌNH KIỂM THỬ E2E CHÍNH (14 BƯỚC) =================
async function runAcceptanceTest() {
  // Xác minh môi trường an toàn và đối chiếu database thực tế qua SELECT current_database() trước mọi thao tác (DEF-02)
  const liveDb = verifyLiveDatabase();

  console.log('======================================================================');
  console.log('🚀 BẮT ĐẦU END-TO-END ACCEPTANCE VERIFICATION CHO BREWLITE ASM2');
  console.log(`🌐 Frontend: ${WEB_URL}`);
  console.log(`🔌 Backend API: ${API_URL}`);
  console.log(`🗄️ Database thực tế: ${liveDb} (Chế độ: ${config.isDirectPsql ? 'Direct PSQL' : 'Docker ' + config.container})`);
  console.log('======================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const testResults = [];
  const testUserEmail = `test-mvp-${Date.now()}@brewlite.vn`;
  const testPassword = 'Password123!';
  let createdOrderId = null;
  let targetProductId = null;
  let targetProductName = null;
  const orderedQuantity = 2;
  let stockBefore = null;
  let versionBefore = null;
  let buzzerCode = null;

  try {
    // -------------------------------------------------------------
    // Bước 1: Khách truy cập Menu (Figma Screen 01 - Menu Discovery)
    // -------------------------------------------------------------
    console.log('--- BƯỚC 1: Khách truy cập Menu (Figma Screen 01) ---');
    await page.goto(`${WEB_URL}/menu`, { waitUntil: 'networkidle' });

    // Tìm thẻ sản phẩm có sẵn đầu tiên trên Menu
    const firstProductCard = page.locator('article[class*="productCard"], article').first();
    await firstProductCard.waitFor({ state: 'visible' });

    const productNameEl = firstProductCard.locator('h3').first();
    targetProductName = (await productNameEl.innerText()).trim();
    console.log(`✔ Menu hiển thị thành công. Đồ uống chọn thử nghiệm: "${targetProductName}"`);
    await saveScreenshot(page, '01-menu-discovery.png');
    testResults.push({ step: '1. Khách truy cập Menu (Screen 01)', status: 'PASS' });

    // -------------------------------------------------------------
    // Bước 2: Xem chi tiết và tùy chỉnh đồ uống (Figma Screen 02 - Customizer Modal)
    // -------------------------------------------------------------
    console.log(`\n--- BƯỚC 2: Xem chi tiết và tùy chỉnh đồ uống (Figma Screen 02) ---`);
    const detailBtn = firstProductCard.locator('button:has-text("Chi tiết")').first();
    await detailBtn.click();

    const modal = page.locator('div[role="dialog"]').first();
    await modal.waitFor({ state: 'visible' });
    console.log('✔ Modal Tùy chỉnh (Figma Screen 02) đã mở');

    // Chọn Size MEDIUM (+5.000đ)
    await modal.getByRole('radio', { name: /Vừa \(M\)/ }).click();
    await modal.getByRole('checkbox', { name: /Kem cheese/ }).check();
    const catalogResponse = await context.request.get(`${API_URL}/products`);
    assert.equal(catalogResponse.status(), 200);
    const catalog = await catalogResponse.json();
    const product = catalog.find(p => p.name === targetProductName);
    assert.ok(product?.isAvailable);
    const unitPrice = Number(product.price) + 5000 + 10000;
    const expectedTotal = unitPrice * orderedQuantity;
    const displayedTotal = expectedTotal.toLocaleString('vi-VN') + ' đ';

    // Chọn mức đá 70% và mức đường 50%
    const ice70 = modal.locator('button[role="radio"]:has-text("70% đá")').first();
    if (await ice70.count() > 0) {
      await ice70.click();
      console.log('✔ Đã chọn Mức đá 70%');
    }
    const sugar50 = modal.locator('button[role="radio"]:has-text("50% đường")').first();
    if (await sugar50.count() > 0) {
      await sugar50.click();
      console.log('✔ Đã chọn Mức đường 50%');
    }

    // Ghi chú riêng
    const noteInput = modal.locator('input#modal-item-note').first();
    if (await noteInput.count() > 0) {
      await noteInput.fill('Uống nóng, ít ngọt');
      console.log('✔ Đã nhập ghi chú: Uống nóng, ít ngọt');
    }

    await saveScreenshot(page, '02-customizer-modal.png');
    testResults.push({ step: '2. Xem chi tiết và tùy chỉnh đồ uống (Screen 02)', status: 'PASS' });

    // -------------------------------------------------------------
    // Bước 3: Thêm món, thay đổi số lượng và quản lý giỏ hàng (Figma Screen 03)
    // -------------------------------------------------------------
    console.log('\n--- BƯỚC 3: Thêm món, thay đổi số lượng và quản lý giỏ (Figma Screen 03) ---');
    const addToCartModalBtn = modal.locator('button:has-text("Thêm vào giỏ")').first();
    await addToCartModalBtn.click();
    console.log('✔ Đã bấm Thêm vào giỏ hàng');

    // Mở Cart Drawer qua nút cartSummary trên topbar
    const cartSummaryBtn = page.locator('button[class*="cartSummary"]').first();
    const beforeNavigation = await cartSummaryBtn.getAttribute('aria-label');
    await verifyNavigation(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: beforeNavigation, exact: true }).waitFor();
    assert.equal(await cartSummaryBtn.getAttribute('aria-label'), beforeNavigation);
    await cartSummaryBtn.click();

    const drawer = page.locator('#cart');
    await drawer.waitFor({ state: 'visible' });
    console.log('✔ Slide-over Cart Drawer (Figma Screen 03) đã mở');

    // Kiểm tra món đã tùy chỉnh nằm trong giỏ
    const cartText = await drawer.innerText();
    if (!cartText.includes(targetProductName)) {
      throw new Error(`Sản phẩm "${targetProductName}" không có trong giỏ hàng!`);
    }
    console.log(`✔ Giỏ hàng chứa "${targetProductName}" với các tùy chọn đã cấu hình`);

    // Tăng số lượng lên 2
    const plusBtn = drawer.locator('button:has-text("+")').first();
    await plusBtn.click();
    await drawer.getByText(`Tổng cộng (${orderedQuantity} món):`, { exact: true })
      .locator('..').getByText(displayedTotal, { exact: true }).waitFor();

    await saveScreenshot(page, '03-cart-drawer.png');
    testResults.push({ step: '3. Thêm món, thay đổi số lượng và quản lý giỏ (Screen 03)', status: 'PASS' });

    // -------------------------------------------------------------
    // Bước 4: Đăng ký / Đăng nhập tài khoản (Figma Screen 04 - Auth Modal)
    // -------------------------------------------------------------
    console.log('\n--- BƯỚC 4: Đăng ký hoặc đăng nhập (Figma Screen 04) ---');
    const proceedCheckoutBtn = drawer.locator('button:has-text("Tiếp tục đặt hàng")').first();
    await proceedCheckoutBtn.click();

    // Xác nhận Auth Modal tự động xuất hiện do chưa đăng nhập
    const authDialog = page.locator('div[role="dialog"]:has-text("Chào mừng đến BrewLite")').first();
    await authDialog.waitFor({ state: 'visible' });
    console.log('✔ Auth Modal (Figma Screen 04) tự động xuất hiện do khách chưa đăng nhập');

    // Chuyển sang tab Đăng ký
    const registerTabBtn = authDialog.locator('button[role="tab"]:has-text("Đăng ký")').first();
    await registerTabBtn.click();

    // Điền form đăng ký
    const emailInput = authDialog.locator('input#auth-email').first();
    const passInput = authDialog.locator('input#auth-password').first();
    await emailInput.fill(testUserEmail);
    await passInput.fill(testPassword);

    await saveScreenshot(page, '04-auth-modal.png');

    const submitAuthBtn = authDialog.locator('button[type="submit"]').first();
    await submitAuthBtn.click();

    // Chờ Auth modal đóng sau khi đăng nhập thành công
    await authDialog.waitFor({ state: 'hidden' });
    console.log(`✔ Đăng ký và đăng nhập thành công với email: ${testUserEmail}`);
    testResults.push({ step: '4. Đăng ký hoặc đăng nhập (Screen 04)', status: 'PASS' });

    // -------------------------------------------------------------
    // Bước 5: Khôi phục giỏ hàng sau đăng nhập
    // -------------------------------------------------------------
    console.log('\n--- BƯỚC 5: Khôi phục giỏ hàng sau đăng nhập ---');
    if (!(await drawer.isVisible())) {
      await cartSummaryBtn.click();
      await drawer.waitFor({ state: 'visible' });
    }
    const restoredCartText = await drawer.innerText();
    if (!restoredCartText.includes(targetProductName)) {
      throw new Error(`Giỏ hàng bị mất dữ liệu món "${targetProductName}" sau khi đăng nhập!`);
    }
    console.log('✔ Giỏ hàng được bảo toàn 100% sau khi đăng nhập');
    testResults.push({ step: '5. Khôi phục giỏ hàng sau đăng nhập', status: 'PASS' });

    // -------------------------------------------------------------
    // Bước 6: Tạo đơn hàng với trạng thái PENDING trong PostgreSQL
    // -------------------------------------------------------------
    console.log('\n--- BƯỚC 6: Tạo đơn với trạng thái PENDING ---');
    const checkoutSection = drawer.locator('input#customerName');
    if (!(await checkoutSection.isVisible())) {
      await proceedCheckoutBtn.click();
    }

    const nameField = drawer.locator('input#customerName').first();
    const phoneField = drawer.locator('input#customerPhone').first();
    await nameField.fill('Nguyễn Văn Khách Hàng E2E');
    await phoneField.fill('0912345678');

    const confirmOrderBtn = drawer.locator('button:has-text("Xác nhận đặt hàng")').first();
    await confirmOrderBtn.click();

    // Chờ nút "Tiếp tục thanh toán" xuất hiện
    const payNowBtn = page.locator('button:has-text("Tiếp tục thanh toán")').first();
    await payNowBtn.waitFor({ state: 'visible' });

    // Lấy ID đơn hàng từ text nút
    const payNowText = await payNowBtn.innerText();
    const match = payNowText.match(/#(\d+)/);
    createdOrderId = match ? parseInt(match[1], 10) : null;
    console.log(`✔ Đã tạo đơn hàng thành công #${createdOrderId}`);

    // Truy vấn PostgreSQL kiểm tra đơn hàng có trạng thái PENDING
    const dbOrder = queryDb(`SELECT id, status, "totalAmount" FROM orders WHERE id = ${createdOrderId};`);
    console.log(`✔ Kiểm tra PostgreSQL: ${dbOrder}`);
    if (!dbOrder.includes('PENDING')) {
      throw new Error(`Đơn hàng #${createdOrderId} trong PostgreSQL không có trạng thái PENDING! Dữ liệu: ${dbOrder}`);
    }

    // Lấy productId động từ order_items trong database để không phụ thuộc cứng vào productId=1 (Section C)
    const dbOrderItem = queryDb(`SELECT "productId", quantity, size, toppings, "unitPrice", subtotal
      FROM order_items WHERE "orderId" = ${createdOrderId}`);
    assert.equal(dbOrderItem, [product.id, orderedQuantity, 'MEDIUM', '["Kem cheese"]',
      unitPrice.toFixed(2), expectedTotal.toFixed(2)].join('|'));
    assert.equal(dbOrder, [createdOrderId, 'PENDING', expectedTotal.toFixed(2)].join('|'));
    targetProductId = product.id;

    testResults.push({ step: '6. Tạo đơn với trạng thái PENDING', status: 'PASS' });

    // -------------------------------------------------------------
    // Bước 7: Chọn phương thức nhận hàng (Figma Screen 05 - Cashless Checkout)
    // -------------------------------------------------------------
    console.log('\n--- BƯỚC 7: Chọn phương thức nhận hàng (Screen 05) ---');
    await payNowBtn.click();

    const checkoutModal = page.locator('div[role="dialog"]:has-text("Thanh toán đơn #")').first();
    await checkoutModal.waitFor({ state: 'visible' });
    console.log('✔ Cashless Checkout Flow (Figma Screen 05) đã mở');

    // Chọn "Giao tận bàn" và nhập số bàn B-12
    const atTableBtn = checkoutModal.locator('button:has-text("Giao tận bàn")').first();
    await atTableBtn.click();
    const tableInput = checkoutModal.locator('input#table-number-input').first();
    await tableInput.fill('Bàn VIP B-12');
    console.log('✔ Đã chọn Giao tận bàn và nhập số bàn: Bàn VIP B-12');

    // Chọn phương thức VietQR
    const vietqrOption = checkoutModal.locator('div[role="radio"]:has-text("VietQR")').first();
    await vietqrOption.click();
    console.log('✔ Đã chọn phương thức thanh toán VietQR');

    await saveScreenshot(page, '05-checkout-flow.png');
    testResults.push({ step: '7. Chọn phương thức nhận hàng', status: 'PASS' });

    // -------------------------------------------------------------
    // Bước 8: Thanh toán bằng Mock Gateway
    // -------------------------------------------------------------
    console.log('\n--- BƯỚC 8: Thanh toán bằng Mock Gateway ---');
    // Ghi nhận tồn kho của sản phẩm động trước khi thanh toán
    stockBefore = parseInt(queryDb(`SELECT stock FROM products WHERE id = ${targetProductId};`), 10);
    versionBefore = parseInt(queryDb(`SELECT version FROM products WHERE id = ${targetProductId};`), 10);
    console.log(`📊 Tồn kho sản phẩm #${targetProductId} trước thanh toán: stock = ${stockBefore}, version = ${versionBefore}`);

    const submitPayBtn = checkoutModal.locator('button:has-text("Xác nhận thanh toán")').first();
    await submitPayBtn.click();
    console.log('✔ Đã gửi yêu cầu thanh toán qua Mock Gateway');
    testResults.push({ step: '8. Thanh toán bằng Mock Gateway', status: 'PASS' });

    // -------------------------------------------------------------
    // Bước 9: Xác nhận Order chuyển sang PAID trong PostgreSQL
    // -------------------------------------------------------------
    console.log('\n--- BƯỚC 9: Xác nhận Order chuyển sang PAID ---');
    const buzzerDialog = page.locator('div[role="dialog"]:has-text("Digital Buzzer")').first();
    await buzzerDialog.waitFor({ state: 'visible' });

    // Kiểm tra dữ liệu Order trong PostgreSQL
    const orderInDb = queryDb(`SELECT id, status, "pickupMethod", "tableNumber", "orderCode" FROM orders WHERE id = ${createdOrderId};`);
    console.log(`✔ Dữ liệu Order trong PostgreSQL: ${orderInDb}`);
    if (!orderInDb.includes('PAID') || !orderInDb.includes('AT_TABLE') || !orderInDb.includes('Bàn VIP B-12')) {
      throw new Error(`Order #${createdOrderId} trong DB không chuyển sang PAID/AT_TABLE! ${orderInDb}`);
    }

    // Kiểm tra Payment trong PostgreSQL
    const paymentInDb = queryDb(`SELECT id, status, amount, method FROM payments WHERE "orderId" = ${createdOrderId};`);
    console.log(`✔ Dữ liệu Payment trong PostgreSQL: ${paymentInDb}`);
    if (!paymentInDb.includes('SUCCESS') || !paymentInDb.includes('VIETQR')) {
      throw new Error(`Payment trong DB không đúng SUCCESS/VIETQR! ${paymentInDb}`);
    }
    testResults.push({ step: '9. Xác nhận Order chuyển sang PAID', status: 'PASS' });

    // -------------------------------------------------------------
    // Bước 10: Kiểm tra tồn kho giảm chính xác bằng OCC trong DB thật
    // -------------------------------------------------------------
    console.log('\n--- BƯỚC 10: Kiểm tra tồn kho giảm chính xác bằng OCC trong DB thật ---');
    const stockAfter = parseInt(queryDb(`SELECT stock FROM products WHERE id = ${targetProductId};`), 10);
    const versionAfter = parseInt(queryDb(`SELECT version FROM products WHERE id = ${targetProductId};`), 10);
    console.log(`📊 Tồn kho sản phẩm #${targetProductId} sau thanh toán: stock = ${stockAfter}, version = ${versionAfter}`);

    if (stockAfter !== stockBefore - orderedQuantity) {
      throw new Error(`Tồn kho trừ sai! Trước: ${stockBefore}, Sau: ${stockAfter}, Kỳ vọng giảm: ${orderedQuantity}`);
    }
    if (versionAfter !== versionBefore + 1) {
      throw new Error(`Version OCC không tăng đúng 1! Trước: ${versionBefore}, Sau: ${versionAfter}`);
    }
    console.log(`✔ Tồn kho giảm đúng ${orderedQuantity} ly (${stockBefore} -> ${stockAfter}) và version OCC tăng đúng 1 (${versionBefore} -> ${versionAfter})`);
    testResults.push({ step: '10. Kiểm tra tồn kho giảm chính xác bằng OCC trong DB thật', status: 'PASS' });

    // -------------------------------------------------------------
    // Bước 11: Hiển thị Vé Chuông Điện Tử (Figma Screen 06)
    // -------------------------------------------------------------
    console.log('\n--- BƯỚC 11: Hiển thị Vé Chuông Điện Tử (Screen 06) ---');
    const buzzerText = await buzzerDialog.innerText();
    const codeMatch = buzzerText.match(/#BL-\d+/);
    buzzerCode = codeMatch ? codeMatch[0] : 'N/A';
    console.log(`✔ Vé Chuông Điện Tử xuất hiện với mã số chuông: ${buzzerCode}`);

    // Xác thực hiển thị thẻ vé chuông và thanh tiến trình
    const expectedOrderCode = `#BL-${createdOrderId.toString().padStart(4, '0')}`;
    if (buzzerCode !== expectedOrderCode) {
      throw new Error(`Mã vé chuông không khớp định dạng chuẩn! Thực tế: ${buzzerCode}, Kỳ vọng: ${expectedOrderCode}`);
    }

    await saveScreenshot(page, '06-pickup-ticket.png');
    testResults.push({ step: '11. Hiển thị Vé Chuông Điện Tử', status: 'PASS' });

    // -------------------------------------------------------------
    // Bước 12: Xóa giỏ hàng sau khi hoàn tất (FR-06 & Section C)
    // -------------------------------------------------------------
    console.log('\n--- BƯỚC 12: Xóa giỏ hàng sau khi hoàn tất ---');
    const closeBuzzerBtn = buzzerDialog.locator('button[aria-label="Đóng vé chuông"]').first();
    await closeBuzzerBtn.click();
    await buzzerDialog.waitFor({ state: 'hidden' });

    // Kiểm tra trực tiếp Drawer nếu đang mở hoặc mở drawer để kiểm tra
    if (!(await drawer.isVisible())) {
      await cartSummaryBtn.click();
      await drawer.waitFor({ state: 'visible' });
    }

    const drawerEmptyNotice = drawer.locator('div[class*="drawerEmptyNotice"]');
    const hasEmptyNotice = await drawerEmptyNotice.isVisible();
    const cartItemCards = drawer.locator('div[class*="cartItemCard"]');
    const remainingItemsCount = await cartItemCards.count();

    console.log(`✔ Kiểm tra trong Drawer: Thông báo giỏ trống hiển thị = ${hasEmptyNotice}, Số thẻ món còn lại = ${remainingItemsCount}`);

    if (!hasEmptyNotice || remainingItemsCount !== 0) {
      throw new Error(`Giỏ hàng chưa được xóa sạch sau thanh toán PAID! (Thẻ món còn lại: ${remainingItemsCount})`);
    }

    // Đóng drawer sau khi kiểm tra xong
    const closeDrawerBtn = drawer.locator('button[class*="drawerCloseBtn"], button:has-text("✕")').first();
    if (await closeDrawerBtn.isVisible()) {
      await closeDrawerBtn.click();
      await drawer.waitFor({ state: 'hidden' });
    }

    // Xác minh nút giỏ hàng trên topbar
    const cartSummaryAria = await cartSummaryBtn.getAttribute('aria-label');
    console.log(`✔ aria-label nút giỏ hàng: "${cartSummaryAria}"`);
    if (!cartSummaryAria || !cartSummaryAria.includes('0 món') || !cartSummaryAria.includes('0 đ')) {
      throw new Error(`Nút giỏ hàng không phản ánh 0 món / 0 đ! Thực tế: "${cartSummaryAria}"`);
    }

    console.log('✔ Xác minh hoàn tất: Số lượng món giỏ hàng = 0, Tổng tiền = 0 đ theo đúng quy định FR-06');
    testResults.push({ step: '12. Xóa giỏ hàng sau khi hoàn tất', status: 'PASS' });

    console.log('--- BƯỚC 13: Đối chiếu lịch sử với GET /orders/me ---');
    const [historyResponse] = await Promise.all([
      page.waitForResponse(r => r.url() === `${API_URL}/orders/me` && r.request().method() === 'GET'),
      page.getByRole('link', { name: 'Lịch sử', exact: true }).click(),
    ]);
    assert.equal(historyResponse.status(), 200);
    const history = await historyResponse.json();
    assert.equal(history.length, 1);
    const [paid] = history;
    assert.equal(paid.id, createdOrderId);
    assert.equal(paid.status, 'PAID');
    assert.equal(Number(paid.totalAmount), expectedTotal);
    const card = page.getByRole('article', { name: paid.orderCode, exact: true });
    for (const text of ['Đã thanh toán', targetProductName, displayedTotal]) {
      await card.getByText(text, { exact: false }).first().waitFor();
    }
    await saveScreenshot(page, '07-order-history.png');
    testResults.push({ step: '13. Đối chiếu lịch sử UI/API', status: 'PASS' });
    await verifyFulfillment({ browser, page, api: API_URL, web: WEB_URL, order: paid, productId: targetProductId });
    await verifyNavigation(page);
    testResults.push({ step: '14. Staff, PostgreSQL, customer ticket and responsive navigation', status: 'PASS' });

  } catch (err) {
    console.error('❌ LỖI TRONG QUÁ TRÌNH KIỂM THỬ:', err);
    await saveScreenshot(page, 'error-failure.png').catch(() => {});
    testResults.push({ step: 'MVP Flow Execution', status: 'FAIL', error: err.message });
  } finally {
    await browser.close();
  }

  return { testResults, createdOrderId, buzzerCode };
}

runAcceptanceTest().then((res) => {
  console.log('\n======================================================================');
  console.log(`📊 KẾT QUẢ NGHIỆM THU E2E CHROMIUM & POSTGRESQL (${res.testResults.length}/14 BƯỚC)`);
  console.log('======================================================================');
  console.table(res.testResults);

  const allPass = res.testResults.length === 14 && res.testResults.every((r) => r.status === 'PASS');
  if (allPass) {
    console.log('\n🎉 TẤT CẢ 14 BƯỚC LUỒNG MVP ĐÃ PASS 100% TRÊN CHROMIUM & POSTGRESQL!');
    process.exit(0);
  } else {
    console.error('\n⚠️ CÓ BƯỚC KIỂM THỬ THẤT BẠI HOẶC CHƯA ĐỦ 14 BƯỚC!');
    process.exit(1);
  }
}).catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
