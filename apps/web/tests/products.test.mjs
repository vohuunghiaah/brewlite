import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchProducts, fetchProductById } from '../src/app/menu/products.mjs';

test('menu loads products, empty results, errors and retries', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch');
  const controller = new AbortController();
  fetchMock.mock.mockImplementationOnce(async () => new Response(JSON.stringify([{ id: 1, name: 'Latte' }])));
  assert.deepEqual(await fetchProducts('http://api', controller.signal), [{ id: 1, name: 'Latte' }]);
  assert.equal(fetchMock.mock.calls[0].arguments[0], 'http://api/products');
  assert.equal(fetchMock.mock.calls[0].arguments[1].signal, controller.signal);
  fetchMock.mock.mockImplementationOnce(async () => new Response('[]'));
  assert.deepEqual(await fetchProducts('http://api'), []);
  fetchMock.mock.mockImplementationOnce(async () => new Response('', { status: 503 }));
  await assert.rejects(fetchProducts('http://api'), /HTTP 503/);
  fetchMock.mock.mockImplementationOnce(async () => { throw new TypeError('Network error'); });
  await assert.rejects(fetchProducts('http://api'), /Network error/);
  fetchMock.mock.mockImplementationOnce(async () => new Response('[{"id":2}]'));
  assert.deepEqual(await fetchProducts('http://api'), [{ id: 2 }]);
});

test('fetchProductById loads detail, handles 404, 400 and network errors', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch');
  const controller = new AbortController();

  // Valid ID detail
  fetchMock.mock.mockImplementationOnce(async () => new Response(JSON.stringify({ id: 1, name: 'Cà phê Latte', price: '45000' })));
  const product = await fetchProductById('http://api', 1, controller.signal);
  assert.deepEqual(product, { id: 1, name: 'Cà phê Latte', price: '45000' });
  assert.equal(fetchMock.mock.calls[0].arguments[0], 'http://api/products/1');
  assert.equal(fetchMock.mock.calls[0].arguments[1].signal, controller.signal);

  // 404 Not Found
  fetchMock.mock.mockImplementationOnce(async () => new Response(JSON.stringify({ message: 'Không tìm thấy sản phẩm có ID 999' }), { status: 404 }));
  await assert.rejects(fetchProductById('http://api', 999), /HTTP 404/);

  // 400 Bad Request (invalid non-numeric ID)
  fetchMock.mock.mockImplementationOnce(async () => new Response(JSON.stringify({ message: 'Validation failed' }), { status: 400 }));
  await assert.rejects(fetchProductById('http://api', 'invalid'), /HTTP 400/);

  // Network error
  fetchMock.mock.mockImplementationOnce(async () => { throw new TypeError('Connection failed'); });
  await assert.rejects(fetchProductById('http://api', 1), /Connection failed/);
});
