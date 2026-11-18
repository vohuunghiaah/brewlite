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
    global.fetch = jest.fn((url: RequestInfo | URL, options?: RequestInit) => {
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
      if (urlStr.endsWith('/orders') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          text: async () => JSON.stringify({ id: 101, status: 'PENDING' }),
          json: async () => ({ id: 101, status: 'PENDING' }),
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

  it('customizes product size and toppings in modal, and adds item to cart with correct price', async () => {
    render(<MenuPage />);

    await waitFor(() => {
      expect(screen.getByText('Cà phê Latte')).toBeInTheDocument();
    });

    // Open modal
    const detailButton = screen.getAllByRole('button', { name: /chi tiết/i })[0];
    fireEvent.click(detailButton);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // Select Size MEDIUM (+5.000 đ)
    const mediumButton = screen.getByRole('radio', { name: /vừa \(m\)/i });
    fireEvent.click(mediumButton);

    // Select Topping "Kem cheese" (+10.000 đ)
    const toppingCheckbox = screen.getByLabelText(/kem cheese/i);
    fireEvent.click(toppingCheckbox);

    // Dynamic price on add button should be 45.000 + 5.000 + 10.000 = 60.000 đ
    expect(dialog).toHaveTextContent('60.000 đ');

    // Add to cart
    const addToCartButton = screen.getByRole('button', { name: /thêm vào giỏ hàng/i });
    fireEvent.click(addToCartButton);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Cart section should display item with Size M, topping Kem cheese, and 60.000 đ
    const cartSection = document.getElementById('cart');
    expect(cartSection).toBeInTheDocument();
    expect(cartSection).toHaveTextContent('Size M');
    expect(cartSection).toHaveTextContent('+Kem cheese');
    expect(cartSection).toHaveTextContent('60.000 đ');
  });

  it('groups identical configurations and updates quantity, then deletes item', async () => {
    render(<MenuPage />);

    await waitFor(() => {
      expect(screen.getByText('Cà phê Latte')).toBeInTheDocument();
    });

    // Quick add 2 items of Cà phê Latte (Size S, no toppings)
    const addQuickBtn = screen.getByRole('button', { name: /thêm nhanh cà phê latte vào giỏ/i });
    fireEvent.click(addQuickBtn);
    fireEvent.click(addQuickBtn);

    const cartSection = document.getElementById('cart')!;
    // Should be grouped into 1 item with quantity 2
    expect(cartSection).toHaveTextContent('Size S');
    expect(cartSection).toHaveTextContent('Tổng cộng (2 món):');
    expect(cartSection).toHaveTextContent('90.000 đ'); // 45.000 * 2

    // Click "+" in cart to increase quantity to 3
    const incBtn = screen.getByRole('button', { name: /tăng số lượng/i });
    fireEvent.click(incBtn);
    expect(cartSection).toHaveTextContent('Tổng cộng (3 món):');
    expect(cartSection).toHaveTextContent('135.000 đ'); // 45.000 * 3

    // Click "-" in cart to decrease quantity back to 2
    const decBtn = screen.getByRole('button', { name: /giảm số lượng/i });
    fireEvent.click(decBtn);
    expect(cartSection).toHaveTextContent('Tổng cộng (2 món):');

    // Delete item from cart
    const deleteBtn = screen.getByRole('button', { name: /xóa cà phê latte khỏi giỏ/i });
    fireEvent.click(deleteBtn);
    expect(cartSection).toHaveTextContent('Giỏ hàng đang trống');
  });

  it('completes checkout order flow submitting size, toppings, and displays order status PENDING', async () => {
    render(<MenuPage />);

    await waitFor(() => {
      expect(screen.getByText('Cà phê Latte')).toBeInTheDocument();
    });

    // Quick add item to cart
    const addQuickBtn = screen.getByRole('button', { name: /thêm nhanh cà phê latte vào giỏ/i });
    fireEvent.click(addQuickBtn);

    // Click "Tiếp tục đặt hàng"
    const checkoutBtn = screen.getByRole('button', { name: /tiếp tục đặt hàng/i });
    fireEvent.click(checkoutBtn);

    // Fill customer info
    const nameInput = screen.getByLabelText(/tên khách hàng/i);
    const phoneInput = screen.getByLabelText(/số điện thoại/i);
    fireEvent.change(nameInput, { target: { value: 'Nguyen Van A' } });
    fireEvent.change(phoneInput, { target: { value: '0901234567' } });

    // Submit order
    const confirmBtn = screen.getByRole('button', { name: /xác nhận đặt hàng/i });
    fireEvent.click(confirmBtn);

    // Expect success message with Order ID #101 and status PENDING (awaiting payment)
    await waitFor(() => {
      expect(
        screen.getByText(/đặt hàng thành công! mã đơn hàng: #101\. trạng thái: PENDING \(chờ thanh toán\)\. giỏ hàng được giữ nguyên/i)
      ).toBeInTheDocument();
    });

    // FIX-03: Giỏ hàng được bảo toàn khi đơn hàng ở trạng thái PENDING
    const cartSection = document.getElementById('cart')!;
    expect(cartSection).toHaveTextContent('Cà phê Latte');
    expect(cartSection).toHaveTextContent('Size S');
  });
});
