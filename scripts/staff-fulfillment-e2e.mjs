import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { queryDb, verifyLiveDatabase } from './env-safety.mjs';

export async function verifyFulfillment({ browser, page, api, web, order, productId }) {
  verifyLiveDatabase();
  const endpoint = `${api}/orders/${order.id}/status`;
  const customer = await page.evaluate(() => localStorage.getItem('brewlite_access_token'));
  const headers = token => ({ Authorization: `Bearer ${token}` });
  const patch = (status, token, url = endpoint) => page.request.patch(url, {
    data: { status }, headers: token ? headers(token) : {},
  });
  async function provision(role) {
    const credentials = { email: `${randomUUID()}@example.test`, password: randomUUID() };
    const registration = await page.request.post(api + '/auth/register', { data: credentials });
    assert.equal(registration.status(), 201);
    const user = await registration.json();
    assert.equal(user.role, 'CUSTOMER');
    assert.ok(Number.isSafeInteger(user.id));
    // Only the verified disposable database grants roles. The application cannot.
    queryDb(`UPDATE users SET role = '${role}' WHERE id = ${user.id}`);
    const login = await page.request.post(api + '/auth/login', { data: credentials });
    assert.equal(login.status(), 200);
    const session = await login.json();
    assert.equal(session.user.role, role);
    return session;
  }
  const staff = await provision('STAFF');
  const admin = await provision('ADMIN');
  const secondStaff = await provision('STAFF');
  for (const [status, token, expected] of [
    ['PREPARING', null, 401], ['PREPARING', customer, 403],
    ['COMPLETED', staff.accessToken, 409], ['PAID', staff.accessToken, 400],
    ['CANCELLED', admin.accessToken, 400],
  ]) assert.equal((await patch(status, token)).status(), expected);
  assert.equal((await patch('READY', staff.accessToken, api + '/orders/2147483647/status')).status(), 404);
  assert.equal((await page.request.get(api + '/orders/staff', { headers: headers(customer) })).status(), 403);
  assert.equal(await page.getByRole('link', { name: 'Quầy pha chế' }).count(), 0);

  const financialSnapshot = () => queryDb(`SELECT o."totalAmount", p.id, p.status, p.amount, i.stock, i.version
    FROM orders o JOIN payments p ON p."orderId"=o.id CROSS JOIN products i
    WHERE o.id=${order.id} AND i.id=${productId} ORDER BY p.id`);
  const before = financialSnapshot();
  assert.ok(before.includes('SUCCESS'));
  await page.getByRole('button', { name: 'Theo dõi vé chuông ' + order.orderCode }).click();
  const ticket = page.getByRole('dialog', { name: order.orderCode });
  await ticket.getByText('Đã thanh toán — Đang chờ cửa hàng tiếp nhận.').waitFor();

  const staffContext = await browser.newContext();
  try {
    await staffContext.addInitScript(session => {
      localStorage.setItem('brewlite_access_token', session.accessToken);
      localStorage.setItem('brewlite_user', JSON.stringify(session.user));
    }, staff);
    const counter = await staffContext.newPage();
    await counter.goto(web + '/staff/orders');
    const card = counter.getByRole('article', { name: order.orderCode });
    async function verifyStep(status, text) {
      assert.equal(queryDb(`SELECT status FROM orders WHERE id=${order.id}`), status);
      const result = await page.request.get(`${api}/orders/${order.id}`, { headers: headers(customer) });
      assert.equal(result.status(), 200);
      assert.equal((await result.json()).status, status);
      await ticket.getByText(text, { exact: true }).waitFor({ timeout: 12000 });
      console.log(`PASS ${status}: PostgreSQL, owner GET and customer ticket agree`);
    }
    async function advanceOnScreen(label) {
      const [result] = await Promise.all([
        counter.waitForResponse(r => r.url() === endpoint && r.request().method() === 'PATCH'),
        card.getByRole('button', { name: label }).click(),
      ]);
      assert.equal(result.status(), 200);
    }
    await advanceOnScreen('Bắt đầu pha chế');
    await verifyStep('PREPARING', 'Đang pha chế — BrewLite đang chuẩn bị đồ uống của bạn.');
    const concurrent = await Promise.all([patch('READY', staff.accessToken), patch('READY', secondStaff.accessToken)]);
    for (const result of concurrent) {
      assert.equal(result.status(), 200);
      assert.equal((await result.json()).status, 'READY');
    }
    await verifyStep('READY', 'Đồ uống đã sẵn sàng — Vui lòng đến quầy nhận món.');
    await advanceOnScreen('Đánh dấu sẵn sàng'); // replay from the stale staff card
    assert.equal((await patch('COMPLETED', admin.accessToken)).status(), 200);
    await verifyStep('COMPLETED', 'Hoàn tất — Cảm ơn bạn đã lựa chọn BrewLite.');
    await advanceOnScreen('Xác nhận đã giao món');
    await card.waitFor({ state: 'detached' });
    assert.equal((await patch('PREPARING', staff.accessToken)).status(), 409);
    assert.equal(financialSnapshot(), before);
    await ticket.getByRole('button', { name: /Xem trong Lịch sử/ }).click();
    await page.getByRole('tab', { name: /Hoàn tất/ }).click();
    await page.getByRole('article', { name: order.orderCode }).waitFor();
  } finally {
    await staffContext.close();
  }
}

export async function verifyNavigation(page) {
  const nav = page.getByRole('navigation', { name: 'Điều hướng chính' });
  await nav.getByRole('link', { name: 'Trang chủ' }).click();
  await page.getByRole('heading', { name: /Mỗi ly cà phê/ }).waitFor();
  assert.equal(await page.getByRole('searchbox').count(), 0);
  assert.equal(await nav.getByRole('link', { name: 'Trang chủ' }).getAttribute('aria-current'), 'page');
  await page.getByRole('button', { name: 'Khám phá thực đơn' }).click();
  await page.getByRole('searchbox').waitFor();
  assert.equal(await nav.getByRole('link', { name: 'Menu', exact: true }).getAttribute('aria-current'), 'page');
  for (const width of [1440, 1024, 768, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const metrics = await nav.evaluate(el => {
      const links = el.querySelectorAll('a');
      return {
        center: (links[0].getBoundingClientRect().left + links[links.length - 1].getBoundingClientRect().right) / 2,
        viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth,
      };
    });
    assert.ok(Math.abs(metrics.center - metrics.viewport / 2) < 2, JSON.stringify(metrics));
    assert.ok(metrics.content <= metrics.viewport, JSON.stringify(metrics));
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}
