import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchProducts } from '../src/app/menu/products.mjs';

test('menu loads products, empty results, errors and retries', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch');
  const controller = new AbortController();
  fetchMock.mock.mockImplementationOnce(async () => new Response(JSON.stringify([{ id: 1 }])));
  assert.deepEqual(await fetchProducts('http://api', controller.signal), [{ id: 1 }]);
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
