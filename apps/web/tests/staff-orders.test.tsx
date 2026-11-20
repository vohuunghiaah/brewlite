import { fireEvent, render, screen } from '@testing-library/react';
import StaffOrdersPage from '../src/app/staff/orders/page';

const order = {
  id: 42, orderCode: '#BL-0042', createdAt: '2026-11-20T10:00:00Z', status: 'PAID',
  pickupMethod: 'AT_COUNTER', items: [{ id: 1, quantity: 2, productName: 'Latte', size: 'SMALL', toppings: [] }],
};
const response = (status: number, data: unknown) => ({ status, ok: status < 300, json: async () => data });
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('brewlite_access_token', 'test-token');
  localStorage.setItem('brewlite_user', JSON.stringify({ role: 'STAFF' }));
});

it('withholds the queue when the server denies the session regardless of the cached role', async () => {
  global.fetch = jest.fn().mockResolvedValue(response(403, {}));
  render(<StaffOrdersPage />);
  expect(await screen.findByText(/không có quyền/)).toBeVisible();
  expect(screen.queryByRole('article')).toBeNull();
});

it('locks the action during PATCH, then reloads the confirmed state after a conflict', async () => {
  let reply!: (value: unknown) => void;
  global.fetch = jest.fn()
    .mockResolvedValueOnce(response(200, [order]))
    .mockImplementationOnce(() => new Promise(resolve => { reply = resolve; }))
    .mockResolvedValueOnce(response(200, [{ ...order, status: 'READY' }]));
  render(<StaffOrdersPage />);
  const start = await screen.findByRole('button', { name: 'Bắt đầu pha chế' });
  fireEvent.click(start);
  fireEvent.click(start);
  expect(start).toBeDisabled();
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(global.fetch).toHaveBeenLastCalledWith(expect.stringMatching(/orders\/42\/status$/),
    expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'PREPARING' }),
      headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) }));
  reply(response(409, {}));
  expect(await screen.findByRole('button', { name: 'Xác nhận đã giao món' })).toBeEnabled();
  expect(screen.getByRole('status')).toHaveTextContent('Trạng thái đã thay đổi');
});
