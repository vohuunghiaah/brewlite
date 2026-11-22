import assert from 'node:assert/strict';
import * as crypto from 'crypto';
import {
  getEffectiveDbConfig,
  verifyLiveDatabase,
  queryDb,
} from './env-safety.mjs';

// ================= CẤU HÌNH MÔI TRƯỜNG & PORTABLE DB =================
const config = getEffectiveDbConfig();
const API_URL = config.apiUrl;

async function apiRequest(path, options = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, headers: res.headers, data };
}

// ================= TIẾN TRÌNH KIỂM THỬ BẢO MẬT & NGOẠI LỆ =================
async function runSecurityAndExceptionsTests() {
  // Xác minh môi trường an toàn và đối chiếu database thực tế qua SELECT current_database() trước mọi thao tác (DEF-02)
  const liveDb = verifyLiveDatabase();

  console.log('======================================================================');
  console.log('🛡️ BẮT ĐẦU KIỂM THỬ BẢO MẬT VÀ NGOẠI LỆ (SECTION 3)');
  console.log(`🔌 Backend API: ${API_URL}`);
  console.log(`🗄️ Database thực tế: ${liveDb} (Chế độ: ${config.isDirectPsql ? 'Direct PSQL' : 'Docker ' + config.container})`);
  console.log('======================================================================\n');

  const results = [];
  const catalogAdminKey = process.env.CATALOG_ADMIN_KEY || 'brewlite-dev-catalog-secret';

  // Separate stock for this run, including repeated runs on the same test database.
  const drink = await apiRequest('/products', {
    method: 'POST',
    headers: { 'X-Catalog-Admin-Key': catalogAdminKey },
    body: JSON.stringify({ name: `Payment fixture ${crypto.randomUUID()}`, price: '35000', stock: 10 }),
  });
  assert.equal(drink.status, 201);
  const activeProductId = drink.data.id;
  console.log(`✔ Fixture thanh toán #${activeProductId} có tồn kho riêng`);

  // 1. Tạo 2 người dùng để kiểm thử xác thực và IDOR
  const user1Email = `sec-user1-${Date.now()}@brewlite.vn`;
  const user2Email = `sec-user2-${Date.now()}@brewlite.vn`;
  const userPassword = 'SecurityPassword123!';

  await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: user1Email, password: userPassword }),
  });
  const login1 = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: user1Email, password: userPassword }),
  });
  const token1 = login1.data.accessToken;
  const user1Id = login1.data.user.id;

  await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: user2Email, password: userPassword }),
  });
  const login2 = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: user2Email, password: userPassword }),
  });
  const token2 = login2.data.accessToken;
  const user2Id = login2.data.user.id;

  console.log(`✔ Đã tạo User 1 (#${user1Id}) và User 2 (#${user2Id})`);

  // -------------------------------------------------------------
  // Test 1: JWT Thiếu (Missing Token)
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: JWT Thiếu ---');
  const missingRes = await apiRequest('/orders', {
    method: 'POST',
    body: JSON.stringify({ customerName: 'No Auth', customerPhone: '0901234567', items: [] }),
  });
  console.log(`Status code khi không có Authorization header: ${missingRes.status}`);
  if (missingRes.status === 401) {
    results.push({ test: 'JWT Missing -> 401 Unauthorized', status: 'PASS' });
  } else {
    results.push({ test: 'JWT Missing -> 401 Unauthorized', status: 'FAIL', detail: missingRes.status });
  }

  // -------------------------------------------------------------
  // Test 2: JWT Sai (Invalid Token)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: JWT Sai / Token Rác ---');
  const invalidRes = await apiRequest('/orders', {
    method: 'POST',
    headers: { Authorization: 'Bearer this.is.an.invalid.token' },
    body: JSON.stringify({ customerName: 'Bad Auth', customerPhone: '0901234567', items: [] }),
  });
  console.log(`Status code khi gửi token không hợp lệ: ${invalidRes.status}`);
  if (invalidRes.status === 401) {
    results.push({ test: 'JWT Invalid -> 401 Unauthorized', status: 'PASS' });
  } else {
    results.push({ test: 'JWT Invalid -> 401 Unauthorized', status: 'FAIL', detail: invalidRes.status });
  }

  // -------------------------------------------------------------
  // Test 3: IDOR - User 2 truy cập hoặc thanh toán đơn hàng của User 1
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Bảo vệ IDOR (User 2 cố truy cập đơn của User 1) ---');
  const orderRes = await apiRequest('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      customerName: 'User 1 Order',
      customerPhone: '0901111111',
      items: [{ productId: activeProductId, quantity: 1, size: 'SMALL', toppings: [] }],
    }),
  });
  const order1Id = orderRes.data.id;
  const order1Amount = Number(orderRes.data.totalAmount);
  console.log(`User 1 tạo thành công đơn #${order1Id} (Số tiền: ${order1Amount} đ)`);

  assert.equal(orderRes.status, 201);
  const history = token => apiRequest('/orders/me', { headers: { Authorization: `Bearer ${token}` } });
  const own = await history(token1);
  const other = await history(token2);
  assert.equal(own.status, 200);
  assert.equal(other.status, 200);
  assert.deepEqual(own.data.map(order => order.id), [order1Id]);
  assert.deepEqual(other.data, []);

  // User 2 gọi GET /orders/:id của User 1
  const idorGet = await apiRequest(`/orders/${order1Id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token2}` },
  });
  console.log(`User 2 GET /orders/${order1Id} -> HTTP ${idorGet.status}`);

  // User 2 gọi POST /payments cho đơn hàng của User 1
  const idorPay = await apiRequest('/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token2}`,
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      orderId: order1Id,
      amount: order1Amount,
      method: 'MOMO',
      idempotencyKey: crypto.randomUUID(),
      pickupMethod: 'AT_COUNTER',
    }),
  });
  console.log(`User 2 POST /payments cho đơn #${order1Id} -> HTTP ${idorPay.status}`);

  if (idorGet.status === 403 && idorPay.status === 403) {
    results.push({ test: 'IDOR Protection -> 403 Forbidden', status: 'PASS' });
    console.log('✔ Hệ thống từ chối truy cập và thanh toán chéo với 403 Forbidden');
  } else {
    results.push({ test: 'IDOR Protection -> 403 Forbidden', status: 'FAIL', detail: { idorGet: idorGet.status, idorPay: idorPay.status } });
  }

  // -------------------------------------------------------------
  // Test 4: Thanh toán Thất bại và Thử lại (EX-06)
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Thanh toán thất bại và retry (EX-06) ---');
  const failKey = crypto.randomUUID();
  const payFailRes = await apiRequest('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}`, 'Idempotency-Key': failKey },
    body: JSON.stringify({
      orderId: order1Id,
      amount: order1Amount,
      method: 'CARD',
      idempotencyKey: failKey,
      mockOutcome: 'FAILED',
      pickupMethod: 'AT_COUNTER',
    }),
  });
  console.log(`Payment FAILED response status: ${payFailRes.data.status}`);

  const orderAfterFail = queryDb(`SELECT status FROM orders WHERE id = ${order1Id};`);
  const paymentAfterFail = queryDb(`SELECT status FROM payments WHERE "idempotencyKey" = '${failKey}';`);
  console.log(`Trạng thái trong PostgreSQL: Order = ${orderAfterFail}, Payment = ${paymentAfterFail}`);

  // Khách bấm thanh toán lại với outcome = SUCCESS
  const retryKey = crypto.randomUUID();
  const retryRes = await apiRequest('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}`, 'Idempotency-Key': retryKey },
    body: JSON.stringify({
      orderId: order1Id,
      amount: order1Amount,
      method: 'CARD',
      idempotencyKey: retryKey,
      mockOutcome: 'SUCCESS',
      pickupMethod: 'AT_COUNTER',
    }),
  });
  console.log(`Retry Payment SUCCESS response status: ${retryRes.data.status}`);
  const orderAfterRetry = queryDb(`SELECT status, "orderCode" FROM orders WHERE id = ${order1Id};`);
  console.log(`Trạng thái Order sau retry trong DB: ${orderAfterRetry}`);

  if (
    payFailRes.data.status === 'FAILED' &&
    orderAfterFail === 'PAYMENT_FAILED' &&
    retryRes.data.status === 'SUCCESS' &&
    orderAfterRetry.includes('PAID')
  ) {
    results.push({ test: 'Payment FAILED & Retry to PAID (EX-06)', status: 'PASS' });
    console.log('✔ Luồng FAILED -> Retry thành công, chuyển đơn sang PAID');
  } else {
    results.push({ test: 'Payment FAILED & Retry to PAID (EX-06)', status: 'FAIL' });
  }

  // -------------------------------------------------------------
  // Test 5: Replay Idempotency Key (FR-08)
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Idempotency Replay (FR-08) ---');
  const stockBeforeReplay = parseInt(queryDb(`SELECT stock FROM products WHERE id = ${activeProductId};`), 10);
  const versionBeforeReplay = parseInt(queryDb(`SELECT version FROM products WHERE id = ${activeProductId};`), 10);

  const replayRes = await apiRequest('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}`, 'Idempotency-Key': retryKey },
    body: JSON.stringify({
      orderId: order1Id,
      amount: order1Amount,
      method: 'CARD',
      idempotencyKey: retryKey,
      mockOutcome: 'SUCCESS',
      pickupMethod: 'AT_COUNTER',
    }),
  });
  console.log(`Replay response isDuplicate: ${replayRes.data.isDuplicate}, status: ${replayRes.data.status}`);

  const stockAfterReplay = parseInt(queryDb(`SELECT stock FROM products WHERE id = ${activeProductId};`), 10);
  const versionAfterReplay = parseInt(queryDb(`SELECT version FROM products WHERE id = ${activeProductId};`), 10);
  console.log(`Tồn kho: Trước (${stockBeforeReplay}, v${versionBeforeReplay}), Sau (${stockAfterReplay}, v${versionAfterReplay})`);

  if (
    queryDb(`SELECT count(*) FROM payments WHERE "idempotencyKey" = '${retryKey}'`) === '1' &&
    replayRes.data.isDuplicate === true &&
    replayRes.data.status === 'SUCCESS' &&
    stockAfterReplay === stockBeforeReplay &&
    versionAfterReplay === versionBeforeReplay
  ) {
    results.push({ test: 'Idempotency Replay (Zero duplicate stock deduction)', status: 'PASS' });
    console.log('✔ Idempotency bảo toàn tuyệt đối: không trừ kho lần 2');
  } else {
    results.push({ test: 'Idempotency Replay (Zero duplicate stock deduction)', status: 'FAIL' });
  }

  // -------------------------------------------------------------
  // Test 6: Hai Request Thanh Toán Đồng Thời (Race Condition)
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Hai Request Thanh Toán Đồng Thời ---');
  const orderRes2 = await apiRequest('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      customerName: 'Concurrent User',
      customerPhone: '0902222222',
      items: [{ productId: activeProductId, quantity: 1, size: 'SMALL', toppings: [] }],
    }),
  });
  const order2Id = orderRes2.data.id;
  const order2Amount = Number(orderRes2.data.totalAmount);

  const stockBeforeRace = parseInt(queryDb(`SELECT stock FROM products WHERE id = ${activeProductId};`), 10);

  const keyA = crypto.randomUUID();
  const keyB = crypto.randomUUID();

  const [raceA, raceB] = await Promise.all([
    apiRequest('/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}`, 'Idempotency-Key': keyA },
      body: JSON.stringify({
        orderId: order2Id,
        amount: order2Amount,
        method: 'VIETQR',
        idempotencyKey: keyA,
        mockOutcome: 'SUCCESS',
        pickupMethod: 'AT_COUNTER',
      }),
    }),
    apiRequest('/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}`, 'Idempotency-Key': keyB },
      body: JSON.stringify({
        orderId: order2Id,
        amount: order2Amount,
        method: 'VIETQR',
        idempotencyKey: keyB,
        mockOutcome: 'SUCCESS',
        pickupMethod: 'AT_COUNTER',
      }),
    }),
  ]);

  console.log(`Request A status: ${raceA.status}, Request B status: ${raceB.status}`);
  const stockAfterRace = parseInt(queryDb(`SELECT stock FROM products WHERE id = ${activeProductId};`), 10);
  console.log(`Tồn kho: ${stockBeforeRace} -> ${stockAfterRace} (chênh lệch: ${stockBeforeRace - stockAfterRace})`);

  const exactlyOneSucceeded =
    (raceA.status === 201 && (raceB.status === 400 || raceB.status === 409)) ||
    (raceB.status === 201 && (raceA.status === 400 || raceA.status === 409));

  if (exactlyOneSucceeded && stockBeforeRace - stockAfterRace === 1) {
    results.push({ test: 'Concurrent Payment Protection (Pessimistic Row Lock)', status: 'PASS' });
    console.log('✔ Pessimistic Row Lock chặn race condition: chỉ 1 request thành công, kho trừ đúng 1 ly');
  } else {
    results.push({
      test: 'Concurrent Payment Protection (Pessimistic Row Lock)',
      status: 'FAIL',
      detail: { statusA: raceA.status, statusB: raceB.status, diff: stockBeforeRace - stockAfterRace },
    });
  }

  // -------------------------------------------------------------
  // Test 7: Timeout và Tự Động Đối Soát (EX-07)
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Timeout và Đối Soát (EX-07) ---');
  const orderRes3 = await apiRequest('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      customerName: 'Timeout User',
      customerPhone: '0903333333',
      items: [{ productId: activeProductId, quantity: 1, size: 'SMALL', toppings: [] }],
    }),
  });
  const order3Id = orderRes3.data.id;
  const order3Amount = Number(orderRes3.data.totalAmount);
  const timeoutKey = crypto.randomUUID();

  const timeoutPayRes = await apiRequest('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}`, 'Idempotency-Key': timeoutKey },
    body: JSON.stringify({
      orderId: order3Id,
      amount: order3Amount,
      method: 'VIETQR',
      idempotencyKey: timeoutKey,
      mockOutcome: 'PENDING',
      pickupMethod: 'AT_COUNTER',
    }),
  });
  console.log(`Pending payment response: status = ${timeoutPayRes.data.status}`);

  // Lấy merchantReference và cập nhật Mock Gateway sang SUCCESS (mô phỏng đối soát sau timeout)
  const merchantRef = queryDb(`SELECT "merchantReference" FROM payments WHERE "idempotencyKey" = '${timeoutKey}';`);
  queryDb(`UPDATE mock_gateway_transactions SET status = 'SUCCESS' WHERE "merchantReference" = '${merchantRef}';`);
  console.log(`Đã cập nhật trạng thái Mock Gateway merchantRef "${merchantRef}" sang SUCCESS`);

  // Gọi API reconcile
  const reconcileRes = await apiRequest(`/payments/reconcile/${timeoutKey}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
  });
  console.log(`Reconcile response: status = ${reconcileRes.data.status}, orderStatus = ${reconcileRes.data.order?.status}`);

  const order3InDb = queryDb(`SELECT status FROM orders WHERE id = ${order3Id};`);

  if (
    timeoutPayRes.data.status === 'PENDING' &&
    reconcileRes.data.status === 'SUCCESS' &&
    order3InDb === 'PAID'
  ) {
    results.push({ test: 'Payment Timeout & Reconcile to PAID (EX-07)', status: 'PASS' });
    console.log('✔ Đối soát chuyển thành công đơn PENDING sang PAID');
  } else {
    results.push({
      test: 'Payment Timeout & Reconcile to PAID (EX-07)',
      status: 'FAIL',
      detail: { pendingStatus: timeoutPayRes.data.status, reconcileStatus: reconcileRes.data.status, dbStatus: order3InDb },
    });
  }

  // -------------------------------------------------------------
  // Test 8: Hoàn Tiền Bồi Hoàn Khi Xung Đột Tồn Kho (BR-REFUND-OCC)
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: Bồi hoàn hoàn tiền BR-REFUND-OCC (Tồn kho không đủ tại TX2) ---');
  const specialProdId = parseInt(
    queryDb(`INSERT INTO products ("name", "price", "isAvailable", "stock", "version", "createdAt", "updatedAt")
             VALUES ('Exclusive Gesha ${Date.now()}', 100000.00, true, 2, 1, now(), now()) RETURNING id;`),
    10,
  );
  console.log(`Tạo sản phẩm giới hạn #${specialProdId} với tồn kho = 2 ly`);

  const orderRes4 = await apiRequest('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      customerName: 'OCC Conflict Customer',
      customerPhone: '0904444444',
      items: [{ productId: specialProdId, quantity: 2, size: 'SMALL', toppings: [] }],
    }),
  });
  const order4Id = orderRes4.data.id;
  if (orderRes4.status !== 201) throw new Error('Expected TX1 to commit before the stock change');
  queryDb(`UPDATE products SET stock = 1, version = version + 1 WHERE id = ${specialProdId}`);
  const occRefundKey = crypto.randomUUID();

  const occPayRes = await apiRequest('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}`, 'Idempotency-Key': occRefundKey },
    body: JSON.stringify({
      orderId: order4Id,
      amount: 200000,
      method: 'CARD',
      idempotencyKey: occRefundKey,
      mockOutcome: 'SUCCESS',
      pickupMethod: 'AT_COUNTER',
    }),
  });
  console.log(`OCC Payment response HTTP status: ${occPayRes.status}, body status: ${occPayRes.data.status}`);

  const order4InDb = queryDb(`SELECT status FROM orders WHERE id = ${order4Id};`);
  const payment4InDb = queryDb(`SELECT status, "refundKey" FROM payments WHERE "idempotencyKey" = '${occRefundKey}';`);
  const prodStockAfterOcc = parseInt(queryDb(`SELECT stock FROM products WHERE id = ${specialProdId};`), 10);
  console.log(`Dữ liệu DB sau bồi hoàn: Order = ${order4InDb}, Payment = ${payment4InDb}, Stock = ${prodStockAfterOcc}`);

  if (
    occPayRes.status === 409 &&
    order4InDb === 'CANCELLED' &&
    payment4InDb.includes('REFUNDED') &&
    prodStockAfterOcc === 1
  ) {
    results.push({ test: 'BR-REFUND-OCC Compensation (Atomic CANCELLED + REFUNDED)', status: 'PASS' });
    console.log('✔ BR-REFUND-OCC hoàn tất chính xác: Order CANCELLED, Payment REFUNDED, kho bảo toàn 1 ly');
  } else {
    results.push({ test: 'BR-REFUND-OCC Compensation (Atomic CANCELLED + REFUNDED)', status: 'FAIL' });
  }

  // -------------------------------------------------------------
  // Test 9: Advisory Lock Session Safety & Zero Lingering Lock (FIX-23)
  // -------------------------------------------------------------
  console.log('\n--- TEST 9: Kiểm tra không còn Advisory Lock tồn đọng trong PostgreSQL ---');
  const activeLocks = parseInt(
    queryDb(`SELECT count(*) FROM pg_locks WHERE locktype = 'advisory';`),
    10,
  );
  console.log(`Số lượng PostgreSQL Advisory Lock đang hoạt động: ${activeLocks}`);
  if (activeLocks === 0) {
    results.push({ test: 'PostgreSQL Zero Lingering Advisory Locks (FIX-23)', status: 'PASS' });
    console.log('✔ Zero advisory locks tồn đọng trong PostgreSQL');
  } else {
    results.push({ test: 'PostgreSQL Zero Lingering Advisory Locks (FIX-23)', status: 'FAIL', detail: activeLocks });
  }

  // -------------------------------------------------------------
  // Test 10: Actual CORS Preflight OPTIONS Check (Section A)
  // -------------------------------------------------------------
  console.log('\n--- TEST 10: Kiểm thử Preflight OPTIONS thực tế cho Idempotency-Key (Section A) ---');
  const preflightRes = await fetch(`${API_URL}/payments`, {
    method: 'OPTIONS',
    headers: {
      Origin: config.webUrl,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,content-type,idempotency-key',
    },
  });

  const corsStatus = preflightRes.status;
  const allowOrigin = preflightRes.headers.get('access-control-allow-origin');
  const allowHeaders = (preflightRes.headers.get('access-control-allow-headers') || '').toLowerCase();
  const allowMethods = preflightRes.headers.get('access-control-allow-methods') || '';

  console.log(`Preflight OPTIONS response status: ${corsStatus}`);
  console.log(`Access-Control-Allow-Origin: ${allowOrigin}`);
  console.log(`Access-Control-Allow-Headers: ${allowHeaders}`);
  console.log(`Access-Control-Allow-Methods: ${allowMethods}`);

  const hasIdempotencyHeader = allowHeaders.includes('idempotency-key');
  const hasAuthHeader = allowHeaders.includes('authorization');
  const hasContentType = allowHeaders.includes('content-type');
  const allowsPost = allowMethods.includes('POST');
  const validStatus = corsStatus === 204 || corsStatus === 200;

  if (validStatus && allowOrigin === config.webUrl && hasIdempotencyHeader && hasAuthHeader && hasContentType && allowsPost) {
    results.push({ test: 'Actual CORS Preflight OPTIONS for Idempotency-Key (Section A)', status: 'PASS' });
    console.log('✔ Preflight OPTIONS thực tế được chấp thuận 100%: Cho phép Idempotency-Key, Authorization, POST');
  } else {
    results.push({
      test: 'Actual CORS Preflight OPTIONS for Idempotency-Key (Section A)',
      status: 'FAIL',
      detail: { corsStatus, allowOrigin, allowHeaders, allowMethods },
    });
  }

  // Use a new fixture so a price change never alters a sample or another run's order.
  const fixture = await apiRequest('/products', {
    method: 'POST',
    headers: { 'X-Catalog-Admin-Key': catalogAdminKey },
    body: JSON.stringify({ name: `TX1-${crypto.randomUUID()}`, price: '31000', stock: 2 }),
  });
  assert.equal(fixture.status, 201);
  const productId = fixture.data.id;
  const create = items => apiRequest('/orders', {
    method: 'POST', headers: { Authorization: `Bearer ${token2}` },
    body: JSON.stringify({ customerName: 'Integration', customerPhone: '0901234567', items }),
  });
  const missingId = Number(queryDb('SELECT max(id) + 1 FROM products'));
  for (const [item, status] of [
    [{ productId, quantity: 0 }, 400], [{ productId, quantity: 3 }, 400],
    [{ productId: missingId, quantity: 1 }, 404],
  ]) {
    assert.equal((await create([item])).status, status);
  }
  assert.deepEqual((await history(token2)).data, []);
  const changed = await apiRequest(`/products/${productId}`, {
    method: 'PATCH',
    headers: { 'X-Catalog-Admin-Key': catalogAdminKey },
    body: JSON.stringify({ price: '32000' }),
  });
  assert.equal(changed.status, 200);
  const placed = await create([{ productId, quantity: 2 }]);
  assert.equal(placed.status, 201);
  assert.equal(queryDb(`SELECT o.status, o."totalAmount", i."unitPrice", i.quantity, p.stock
    FROM orders o JOIN order_items i ON i."orderId" = o.id JOIN products p ON p.id = i."productId"
    WHERE o.id = ${placed.data.id} AND o."userId" = ${user2Id}`), 'PENDING|64000.00|32000.00|2|2');
  results.push({ test: 'TX1 validation, current price, history ownership and preserved stock', status: 'PASS' });

  console.log('\n======================================================================');
  console.log(`📊 KẾT QUẢ KIỂM THỬ BẢO MẬT VÀ NGOẠI LỆ (${results.length} CA TEST)`);
  console.log('======================================================================');
  console.table(results);

  const allPass = results.length === 11 && results.every((r) => r.status === 'PASS');
  if (allPass) {
    console.log('\n🎉 TẤT CẢ 11 BÀI TEST BẢO MẬT & NGOẠI LỆ ĐÃ PASS 100%!');
    process.exit(0);
  } else {
    console.error('\n⚠️ CÓ BÀI TEST NGOẠI LỆ THẤT BẠI!');
    process.exit(1);
  }
}

runSecurityAndExceptionsTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
