import { execSync } from 'child_process';
import * as crypto from 'crypto';

const API_URL = process.env.API_URL || 'http://localhost:3001';

function queryDb(sql) {
  const singleLine = sql.replace(/\r?\n/g, ' ').replace(/"/g, '\\"');
  const cmd = `docker exec brewlite-db psql -U brewlite -d brewlite -t -A -c "${singleLine}"`;
  const result = execSync(cmd, { encoding: 'utf8' }).trim();
  return result;
}

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
  return { status: res.status, ok: res.ok, data };
}

async function runSecurityAndExceptionsTests() {
  console.log('======================================================================');
  console.log('🛡️ BẮT ĐẦU KIỂM THỬ BẢO MẬT VÀ NGOẠI LỆ (SECTION 3)');
  console.log('======================================================================\n');

  const results = [];

  // 1. Tạo 2 người dùng để kiểm thử xác thực và IDOR
  const user1Email = `sec-user1-${Date.now()}@brewlite.vn`;
  const user2Email = `sec-user2-${Date.now()}@brewlite.vn`;
  const userPassword = 'SecurityPassword123!';

  const reg1 = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: user1Email, password: userPassword }),
  });
  const login1 = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: user1Email, password: userPassword }),
  });
  const token1 = login1.data.accessToken;
  const user1Id = login1.data.user.id;

  const reg2 = await apiRequest('/auth/register', {
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
  // User 1 tạo đơn hàng
  const orderRes = await apiRequest('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      customerName: 'User 1 Order',
      customerPhone: '0901111111',
      items: [{ productId: 1, quantity: 1, size: 'SMALL', toppings: [] }],
    }),
  });
  const order1Id = orderRes.data.id;
  console.log(`User 1 tạo thành công đơn #${order1Id}`);

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
      amount: 45000,
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
  // Test 4: Thanh toán Thất bại & Thử lại (EX-06)
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Thanh toán thất bại và retry (EX-06) ---');
  const failKey = crypto.randomUUID();
  const payFailRes = await apiRequest('/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token1}`,
      'Idempotency-Key': failKey,
    },
    body: JSON.stringify({
      orderId: order1Id,
      amount: 45000,
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

  // Thử lại với idempotency key mới và outcome SUCCESS
  const retryKey = crypto.randomUUID();
  const payRetryRes = await apiRequest('/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token1}`,
      'Idempotency-Key': retryKey,
    },
    body: JSON.stringify({
      orderId: order1Id,
      amount: 45000,
      method: 'MOMO',
      idempotencyKey: retryKey,
      mockOutcome: 'SUCCESS',
      pickupMethod: 'AT_COUNTER',
    }),
  });
  console.log(`Retry Payment SUCCESS response status: ${payRetryRes.data.status}`);

  const orderAfterRetry = queryDb(`SELECT status, "orderCode" FROM orders WHERE id = ${order1Id};`);
  console.log(`Trạng thái Order sau retry trong DB: ${orderAfterRetry}`);

  if (
    orderAfterFail === 'PAYMENT_FAILED' &&
    paymentAfterFail === 'FAILED' &&
    payRetryRes.data.status === 'SUCCESS' &&
    orderAfterRetry.includes('PAID')
  ) {
    results.push({ test: 'Payment FAILED & Retry to PAID (EX-06)', status: 'PASS' });
    console.log('✔ Luồng FAILED -> Retry thành công, chuyển đơn sang PAID');
  } else {
    results.push({ test: 'Payment FAILED & Retry to PAID (EX-06)', status: 'FAIL' });
  }

  // -------------------------------------------------------------
  // Test 5: Idempotency Replay & Tránh trừ kho hai lần (FR-08)
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Idempotency Replay (FR-08) ---');
  const stockBeforeReplay = parseInt(queryDb(`SELECT stock FROM products WHERE id = 1;`), 10);
  const versionBeforeReplay = parseInt(queryDb(`SELECT version FROM products WHERE id = 1;`), 10);

  const replayRes = await apiRequest('/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token1}`,
      'Idempotency-Key': retryKey,
    },
    body: JSON.stringify({
      orderId: order1Id,
      amount: 45000,
      method: 'MOMO',
      idempotencyKey: retryKey,
      pickupMethod: 'AT_COUNTER',
    }),
  });

  const stockAfterReplay = parseInt(queryDb(`SELECT stock FROM products WHERE id = 1;`), 10);
  const versionAfterReplay = parseInt(queryDb(`SELECT version FROM products WHERE id = 1;`), 10);

  console.log(`Replay response isDuplicate: ${replayRes.data.isDuplicate}, status: ${replayRes.data.status}`);
  console.log(`Tồn kho: Trước (${stockBeforeReplay}, v${versionBeforeReplay}), Sau (${stockAfterReplay}, v${versionAfterReplay})`);

  if (
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
  // Test 6: Hai Request Thanh Toán Đồng Thời (Pessimistic Row Lock)
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Hai Request Thanh Toán Đồng Thời ---');
  // Tạo đơn hàng mới cho User 1
  const orderRes2 = await apiRequest('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      customerName: 'Concurrent Test Order',
      customerPhone: '0902222222',
      items: [{ productId: 1, quantity: 1, size: 'SMALL', toppings: [] }],
    }),
  });
  const order2Id = orderRes2.data.id;
  const keyA = crypto.randomUUID();
  const keyB = crypto.randomUUID();

  const stockBeforeConcurrent = parseInt(queryDb(`SELECT stock FROM products WHERE id = 1;`), 10);

  // Gửi 2 request thanh toán đồng thời với 2 key khác nhau
  const [resA, resB] = await Promise.all([
    apiRequest('/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}`, 'Idempotency-Key': keyA },
      body: JSON.stringify({
        orderId: order2Id,
        amount: 45000,
        method: 'MOMO',
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
        amount: 45000,
        method: 'VIETQR',
        idempotencyKey: keyB,
        mockOutcome: 'SUCCESS',
        pickupMethod: 'AT_COUNTER',
      }),
    }),
  ]);

  const stockAfterConcurrent = parseInt(queryDb(`SELECT stock FROM products WHERE id = 1;`), 10);
  console.log(`Request A status: ${resA.status}, Request B status: ${resB.status}`);
  console.log(`Tồn kho: ${stockBeforeConcurrent} -> ${stockAfterConcurrent} (chênh lệch: ${stockBeforeConcurrent - stockAfterConcurrent})`);

  // Đúng 1 request thành công (201) và 1 request bị từ chối (400 hoặc 409)
  const oneSuccess = (resA.status === 201 && (resB.status === 400 || resB.status === 409)) ||
                     (resB.status === 201 && (resA.status === 400 || resA.status === 409));
  const deductedOnce = stockBeforeConcurrent - stockAfterConcurrent === 1;

  if (oneSuccess && deductedOnce) {
    results.push({ test: 'Concurrent Payment Protection (Pessimistic Row Lock)', status: 'PASS' });
    console.log('✔ Pessimistic Row Lock chặn race condition: chỉ 1 request thành công, kho trừ đúng 1 ly');
  } else {
    results.push({ test: 'Concurrent Payment Protection (Pessimistic Row Lock)', status: 'FAIL', detail: { resA: resA.status, resB: resB.status, diff: stockBeforeConcurrent - stockAfterConcurrent } });
  }

  // -------------------------------------------------------------
  // Test 7: Timeout & Đối Soát (EX-07)
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Timeout và Đối Soát (EX-07) ---');
  const orderRes3 = await apiRequest('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
    body: JSON.stringify({
      customerName: 'Pending Reconcile Order',
      customerPhone: '0903333333',
      items: [{ productId: 1, quantity: 1, size: 'SMALL', toppings: [] }],
    }),
  });
  const order3Id = orderRes3.data.id;
  const pendingKey = crypto.randomUUID();

  // Gọi với mockOutcome PENDING
  const pendingPayRes = await apiRequest('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}`, 'Idempotency-Key': pendingKey },
    body: JSON.stringify({
      orderId: order3Id,
      amount: 45000,
      method: 'MOMO',
      idempotencyKey: pendingKey,
      mockOutcome: 'PENDING',
      pickupMethod: 'AT_COUNTER',
    }),
  });
  console.log(`Pending payment response: status = ${pendingPayRes.data.status}`);

  // Cổng thanh toán chuyển sang SUCCESS
  const merchantRef = pendingPayRes.data.payment.merchantReference;
  queryDb(`UPDATE mock_gateway_transactions SET status = 'SUCCESS' WHERE "merchantReference" = '${merchantRef}';`);

  // Thực hiện đối soát qua POST /payments/reconcile/:key
  const reconcileRes = await apiRequest(`/payments/reconcile/${pendingKey}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
  });
  console.log(`Reconcile response: status = ${reconcileRes.data.status}, orderStatus = ${reconcileRes.data.order?.status}`);

  const order3InDb = queryDb(`SELECT status FROM orders WHERE id = ${order3Id};`);
  if (reconcileRes.data.status === 'SUCCESS' && order3InDb === 'PAID') {
    results.push({ test: 'Payment Timeout & Reconcile to PAID (EX-07)', status: 'PASS' });
    console.log('✔ Đối soát chuyển thành công đơn PENDING sang PAID');
  } else {
    results.push({ test: 'Payment Timeout & Reconcile to PAID (EX-07)', status: 'FAIL' });
  }

  // -------------------------------------------------------------
  // Test 8: Hoàn Tiền Bồi Hoàn Khi Xung Đột Tồn Kho (BR-REFUND-OCC)
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: Bồi hoàn hoàn tiền BR-REFUND-OCC (Tồn kho không đủ tại TX2) ---');
  // Tạo sản phẩm đặc biệt chỉ có tồn kho 1 ly
  const specialProdId = parseInt(
    queryDb(`INSERT INTO products ("name", "price", "isAvailable", "stock", "version", "createdAt", "updatedAt")
             VALUES ('Exclusive Gesha ${Date.now()}', 100000.00, true, 1, 1, now(), now()) RETURNING id;`),
    10,
  );
  console.log(`Tạo sản phẩm giới hạn #${specialProdId} với tồn kho = 1 ly`);

  // Đặt mua 2 ly -> chắc chắn gây xung đột tồn kho OCC
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

  console.log('\n======================================================================');
  console.log('📊 KẾT QUẢ KIỂM THỬ BẢO MẬT VÀ NGOẠI LỆ (SECTION 3)');
  console.log('======================================================================');
  console.table(results);

  const allPass = results.every((r) => r.status === 'PASS');
  if (allPass) {
    console.log('\n🎉 TẤT CẢ CÁC BÀI TEST BẢO MẬT & NGOẠI LỆ ĐÃ PASS 100%!');
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
