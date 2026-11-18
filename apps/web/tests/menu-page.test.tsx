import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MenuPage from '../src/app/menu/page';

describe('MenuPage React Component Tests', () => {
  const mockLatte = {
    id: 1,
    name: 'Cà phê Latte',
    description: 'Cà phê espresso kết hợp cùng sữa tươi béo ngậy',
    price: 45000,
    imageUrl: 'https://images.unsplash.com/photo-latte',
    isAvailable: true,
  };

  beforeEach(() => {
    global.fetch = jest.fn((url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/products/1')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockLatte,
        } as Response);
      }
      if (urlStr.endsWith('/products')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [mockLatte],
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [],
      } as Response);
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders MenuPage, mocks GET /products with Cà phê Latte, opens modal on "Chi tiết" click, displays name and price, and closes on Escape', async () => {
    render(<MenuPage />);

    // 1. Chờ API GET /products phản hồi và hiển thị sản phẩm Cà phê Latte
    await waitFor(() => {
      expect(screen.getByText('Cà phê Latte')).toBeInTheDocument();
    });

    // 2. Tìm nút "Chi tiết"
    const detailButtons = screen.getAllByRole('button', { name: /chi tiết/i });
    expect(detailButtons.length).toBeGreaterThan(0);

    // 3. Giả lập click nút "Chi tiết"
    fireEvent.click(detailButtons[0]);

    // 4. Kiểm tra Modal xuất hiện với role="dialog"
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // 5. Kiểm tra Modal hiển thị đúng tên và giá sản phẩm
    expect(dialog).toHaveTextContent('Cà phê Latte');
    expect(dialog).toHaveTextContent('45.000 đ');

    // 6. Nhấn phím Escape và kiểm tra Modal đóng
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
