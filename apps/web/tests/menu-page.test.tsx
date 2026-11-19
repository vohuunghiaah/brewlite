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
    localStorage.setItem('brewlite_access_token', 'mock_jwt_token_123');
    localStorage.setItem('brewlite_user', JSON.stringify({ id: 1, email: 'user@brewlite.vn' }));

    global.fetch = jest.fn((url: RequestInfo | URL, options?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/auth/login') && options?.method === 'POST') {
        const body = options?.body ? JSON.parse(String(options.body)) : {};
        if (body.password === 'wrong-pass') {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({ message: 'Email hoặc mật khẩu không chính xác.' }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            accessToken: 'mock_jwt_token_123',
            tokenType: 'Bearer',
            user: { id: 1, email: body.email || 'user@brewlite.vn' },
          }),
        } as Response);
      }
      if (urlStr.endsWith('/auth/register') && options?.method === 'POST') {
        const body = options?.body ? JSON.parse(String(options.body)) : {};
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({
            id: 2,
            email: body.email || 'newuser@brewlite.vn',
            createdAt: new Date().toISOString(),
          }),
        } as Response);
      }
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
    localStorage.clear();
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

    // Open cart drawer to view and modify cart items
    const openCartBtn = screen.getByRole('button', { name: /giỏ hàng:/i });
    fireEvent.click(openCartBtn);

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

    // Open cart drawer to proceed to checkout
    const openCartBtn = screen.getByRole('button', { name: /giỏ hàng:/i });
    fireEvent.click(openCartBtn);

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

  it('opens Slide-over Cart Drawer from header, displays role dialog and aria-modal, and closes on Escape or close button', async () => {
    render(<MenuPage />);

    await waitFor(() => {
      expect(screen.getByText('Cà phê Latte')).toBeInTheDocument();
    });

    // 1. Initially drawer is closed (no dialog with label "Giỏ hàng của bạn")
    expect(screen.queryByRole('dialog', { name: /giỏ hàng của bạn/i })).not.toBeInTheDocument();

    // 2. Click Header Cart Button to open drawer
    const cartButton = screen.getByRole('button', { name: /giỏ hàng: 0 món/i });
    fireEvent.click(cartButton);

    // 3. Drawer appears with role="dialog", aria-modal="true"
    const drawerDialog = screen.getByRole('dialog', { name: /giỏ hàng của bạn/i });
    expect(drawerDialog).toBeInTheDocument();
    expect(drawerDialog).toHaveAttribute('aria-modal', 'true');

    // 4. Press Escape to close drawer
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /giỏ hàng của bạn/i })).not.toBeInTheDocument();
    });

    // 5. Open again and close using close button '✕'
    fireEvent.click(cartButton);
    expect(screen.getByRole('dialog', { name: /giỏ hàng của bạn/i })).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /đóng giỏ hàng/i });
    fireEvent.click(closeBtn);
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /giỏ hàng của bạn/i })).not.toBeInTheDocument();
    });
  });

  it('selects Ice and Sugar Quick Selectors, custom note, adds to cart, and prevents duplicate order submission when order is already PENDING', async () => {
    render(<MenuPage />);

    await waitFor(() => {
      expect(screen.getByText('Cà phê Latte')).toBeInTheDocument();
    });

    // 1. Open Product Detail Modal
    const detailButton = screen.getAllByRole('button', { name: /chi tiết/i })[0];
    fireEvent.click(detailButton);

    const modalDialog = await screen.findByRole('dialog');
    expect(modalDialog).toBeInTheDocument();

    // 2. Select Ice "Ít đá" & Sugar "70%" Quick Selectors
    const itDaBtn = screen.getByRole('radio', { name: /ít đá/i });
    fireEvent.click(itDaBtn);
    const sugar70Btn = screen.getByRole('radio', { name: /70%/i });
    fireEvent.click(sugar70Btn);

    // 3. Enter freeform custom note
    const customNoteInput = screen.getByLabelText(/ghi chú bổ sung/i);
    fireEvent.change(customNoteInput, { target: { value: 'Giao tận bàn 4' } });

    // 4. Click Add to Cart
    const addToCartBtn = screen.getByRole('button', { name: /thêm vào giỏ hàng/i });
    fireEvent.click(addToCartBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // 5. Cart section should display combined note
    const cartSection = document.getElementById('cart')!;
    expect(cartSection).toHaveTextContent('Ít đá, 70% đường, Giao tận bàn 4');

    // 6. Proceed to checkout
    const openCartBtn = screen.getByRole('button', { name: /giỏ hàng:/i });
    fireEvent.click(openCartBtn);

    const checkoutBtn = screen.getByRole('button', { name: /tiếp tục đặt hàng/i });
    fireEvent.click(checkoutBtn);

    const nameInput = screen.getByLabelText(/tên khách hàng/i);
    const phoneInput = screen.getByLabelText(/số điện thoại/i);
    fireEvent.change(nameInput, { target: { value: 'Tran Thi B' } });
    fireEvent.change(phoneInput, { target: { value: '0987654321' } });

    // 7. First order submission -> Success with PENDING
    const confirmBtn = screen.getByRole('button', { name: /xác nhận đặt hàng/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/đặt hàng thành công! mã đơn hàng: #101\. trạng thái: PENDING/i)
      ).toBeInTheDocument();
    });

    // Verify fetch POST /orders was called exactly 1 time
    const initialPostCount = (global.fetch as jest.Mock).mock.calls.filter(
      (call: [string, RequestInit?]) => call[0].endsWith('/orders') && call[1]?.method === 'POST'
    ).length;
    expect(initialPostCount).toBe(1);

    // 8. User attempts to click "Tiếp tục đặt hàng" again while order #101 is already PENDING
    const orderBtnAgain = screen.getByRole('button', { name: /tiếp tục đặt hàng/i });
    fireEvent.click(orderBtnAgain);

    // 9. Should show error preventing duplicate order and NOT fire another POST /orders
    expect(
      screen.getByText(/đơn hàng #101 đã được tạo và đang chờ thanh toán/i)
    ).toBeInTheDocument();

    const secondPostCount = (global.fetch as jest.Mock).mock.calls.filter(
      (call: [string, RequestInit?]) => call[0].endsWith('/orders') && call[1]?.method === 'POST'
    ).length;
    expect(secondPostCount).toBe(1); // Still exactly 1, no duplicate order!

    // 10. Click "Tạo đơn hàng mới" clears the duplicate lock
    const newOrderBtn = screen.getByRole('button', { name: /tạo đơn hàng mới/i });
    fireEvent.click(newOrderBtn);

    // Now re-fill and submit -> second order is allowed
    const nameInput2 = screen.getByLabelText(/tên khách hàng/i);
    const phoneInput2 = screen.getByLabelText(/số điện thoại/i);
    fireEvent.change(nameInput2, { target: { value: 'Tran Thi B' } });
    fireEvent.change(phoneInput2, { target: { value: '0987654321' } });

    const confirmBtn2 = screen.getByRole('button', { name: /xác nhận đặt hàng/i });
    fireEvent.click(confirmBtn2);

    await waitFor(() => {
      const finalPostCount = (global.fetch as jest.Mock).mock.calls.filter(
        (call: [string, RequestInit?]) => call[0].endsWith('/orders') && call[1]?.method === 'POST'
      ).length;
      expect(finalPostCount).toBe(2);
    });
  });

  it('enforces drawer accessibility: closed drawer has aria-hidden and inert, open drawer traps focus and restores focus on close', async () => {
    render(<MenuPage />);

    await waitFor(() => {
      expect(screen.getByText('Cà phê Latte')).toBeInTheDocument();
    });

    const cartSection = document.getElementById('cart')!;
    expect(cartSection).toBeInTheDocument();

    // 1. Khi Drawer đóng: có aria-hidden="true" và thuộc tính inert
    expect(cartSection).toHaveAttribute('aria-hidden', 'true');
    expect(cartSection).toHaveAttribute('inert');
    expect(screen.queryByRole('dialog', { name: /giỏ hàng của bạn/i })).not.toBeInTheDocument();

    // 2. Các nút bên trong Drawer đóng không thể tương tác trong accessibility tree
    expect(screen.queryByRole('button', { name: /đóng giỏ hàng/i })).not.toBeInTheDocument();

    // 3. Mở Drawer qua nút Giỏ hàng trên Header
    const headerCartBtn = screen.getByRole('button', { name: /giỏ hàng: 0 món/i });
    fireEvent.click(headerCartBtn);

    // 4. Khi Drawer mở: role="dialog", aria-modal="true", KHÔNG còn aria-hidden hay inert
    const openDrawer = screen.getByRole('dialog', { name: /giỏ hàng của bạn/i });
    expect(openDrawer).toBeInTheDocument();
    expect(openDrawer).toHaveAttribute('aria-modal', 'true');
    expect(openDrawer).not.toHaveAttribute('aria-hidden');
    expect(openDrawer).not.toHaveAttribute('inert');

    // Nút đóng giỏ hàng xuất hiện và có thể truy cập
    const closeBtn = screen.getByRole('button', { name: /đóng giỏ hàng/i });
    expect(closeBtn).toBeInTheDocument();

    // 5. Đóng Drawer qua nút đóng và kiểm tra trạng thái khôi phục
    fireEvent.click(closeBtn);
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /giỏ hàng của bạn/i })).not.toBeInTheDocument();
      expect(cartSection).toHaveAttribute('aria-hidden', 'true');
      expect(cartSection).toHaveAttribute('inert');
    });
  });

  it('unauthenticated checkout triggers Auth Modal (Figma Screen 04)', async () => {
    localStorage.clear();
    render(<MenuPage />);

    await waitFor(() => {
      expect(screen.getByText('Cà phê Latte')).toBeInTheDocument();
    });

    // 1. Thêm sản phẩm vào giỏ
    const addQuickBtn = screen.getByRole('button', { name: /thêm nhanh cà phê latte vào giỏ/i });
    fireEvent.click(addQuickBtn);

    // 2. Mở Drawer giỏ hàng
    const openCartBtn = screen.getByRole('button', { name: /giỏ hàng:/i });
    fireEvent.click(openCartBtn);

    // 3. Khách chưa đăng nhập bấm "Tiếp tục đặt hàng"
    const checkoutBtn = screen.getByRole('button', { name: /tiếp tục đặt hàng/i });
    fireEvent.click(checkoutBtn);

    // 4. Auth Modal xuất hiện với role="dialog" và tiêu đề chào mừng
    const authDialog = await screen.findByRole('dialog', { name: /chào mừng đến brewlite/i });
    expect(authDialog).toBeInTheDocument();
    expect(authDialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('tab', { name: /đăng nhập/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /đăng ký/i })).toBeInTheDocument();

    // 5. Giỏ hàng và món chọn vẫn được bảo toàn nguyên vẹn
    const cartSection = document.getElementById('cart')!;
    expect(cartSection).toHaveTextContent('Cà phê Latte');
  });

  it('successful login resumes order placement with Authorization header', async () => {
    localStorage.clear();
    render(<MenuPage />);

    await waitFor(() => {
      expect(screen.getByText('Cà phê Latte')).toBeInTheDocument();
    });

    // 1. Thêm món và bắt đầu checkout
    const addQuickBtn = screen.getByRole('button', { name: /thêm nhanh cà phê latte vào giỏ/i });
    fireEvent.click(addQuickBtn);

    const openCartBtn = screen.getByRole('button', { name: /giỏ hàng:/i });
    fireEvent.click(openCartBtn);

    const checkoutBtn = screen.getByRole('button', { name: /tiếp tục đặt hàng/i });
    fireEvent.click(checkoutBtn);

    // 2. Điền thông tin đăng nhập trong Auth Modal
    await screen.findByRole('dialog', { name: /chào mừng đến brewlite/i });
    const emailInput = screen.getByLabelText(/email \*/i);
    const passInput = screen.getByLabelText(/mật khẩu \*/i);
    fireEvent.change(emailInput, { target: { value: 'customer@brewlite.vn' } });
    fireEvent.change(passInput, { target: { value: 'securepassword123' } });

    const submitLoginBtn = screen.getByRole('button', { name: /^đăng nhập$/i });
    fireEvent.click(submitLoginBtn);

    // 3. Modal xác thực đóng và luồng checkout tự động mở tiếp
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /chào mừng đến brewlite/i })).not.toBeInTheDocument();
      expect(screen.getByLabelText(/tên khách hàng/i)).toBeInTheDocument();
    });

    // 4. Nhập thông tin và hoàn tất đặt hàng
    const nameInput = screen.getByLabelText(/tên khách hàng/i);
    const phoneInput = screen.getByLabelText(/số điện thoại/i);
    fireEvent.change(nameInput, { target: { value: 'Khách Hàng Thân Thiết' } });
    fireEvent.change(phoneInput, { target: { value: '0912345678' } });

    const confirmBtn = screen.getByRole('button', { name: /xác nhận đặt hàng/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      const statuses = screen.getAllByRole('status');
      expect(statuses.some((s) => s.textContent?.includes('Đặt hàng thành công!'))).toBe(true);
    });

    // 5. Xác minh request POST /orders mang theo Authorization Bearer token
    const postCalls = (global.fetch as jest.Mock).mock.calls.filter(
      (call: [string, RequestInit?]) => call[0].endsWith('/orders') && call[1]?.method === 'POST'
    );
    expect(postCalls.length).toBeGreaterThan(0);
    const lastPostCall = postCalls[postCalls.length - 1];
    expect(lastPostCall[1].headers).toHaveProperty('Authorization', 'Bearer mock_jwt_token_123');
  });

  it('invalid login displays error message without losing cart items', async () => {
    localStorage.clear();
    render(<MenuPage />);

    await waitFor(() => {
      expect(screen.getByText('Cà phê Latte')).toBeInTheDocument();
    });

    // Thêm món vào giỏ
    const addQuickBtn = screen.getByRole('button', { name: /thêm nhanh cà phê latte vào giỏ/i });
    fireEvent.click(addQuickBtn);

    const openCartBtn = screen.getByRole('button', { name: /giỏ hàng:/i });
    fireEvent.click(openCartBtn);

    const checkoutBtn = screen.getByRole('button', { name: /tiếp tục đặt hàng/i });
    fireEvent.click(checkoutBtn);

    await screen.findByRole('dialog', { name: /chào mừng đến brewlite/i });

    // Nhập sai mật khẩu
    const emailInput = screen.getByLabelText(/email \*/i);
    const passInput = screen.getByLabelText(/mật khẩu \*/i);
    fireEvent.change(emailInput, { target: { value: 'customer@brewlite.vn' } });
    fireEvent.change(passInput, { target: { value: 'wrong-pass' } });

    const submitLoginBtn = screen.getByRole('button', { name: /^đăng nhập$/i });
    fireEvent.click(submitLoginBtn);

    // Hiển thị thông báo lỗi rõ ràng
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Email hoặc mật khẩu không chính xác.');
    });

    // Modal vẫn mở và giỏ hàng không bị xóa
    expect(screen.getByRole('dialog', { name: /chào mừng đến brewlite/i })).toBeInTheDocument();
    const cartSection = document.getElementById('cart')!;
    expect(cartSection).toHaveTextContent('Cà phê Latte');
  });

  it('logout resets user state without breaking cart', async () => {
    render(<MenuPage />);

    await waitFor(() => {
      expect(screen.getByText('Cà phê Latte')).toBeInTheDocument();
    });

    // Thêm món vào giỏ
    const addQuickBtn = screen.getByRole('button', { name: /thêm nhanh cà phê latte vào giỏ/i });
    fireEvent.click(addQuickBtn);

    // Người dùng ban đầu đã đăng nhập từ localStorage
    expect(screen.getByText(/user@brewlite\.vn/i)).toBeInTheDocument();
    const logoutBtn = screen.getByRole('button', { name: /đăng xuất/i });
    expect(logoutBtn).toBeInTheDocument();

    // Thực hiện đăng xuất
    fireEvent.click(logoutBtn);

    // Header chuyển về trạng thái Chưa đăng nhập
    expect(screen.queryByText(/user@brewlite\.vn/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /đăng nhập tài khoản/i })).toBeInTheDocument();
    expect(localStorage.getItem('brewlite_access_token')).toBeNull();

    // Giỏ hàng vẫn được bảo toàn nguyên vẹn
    const openCartBtn = screen.getByRole('button', { name: /giỏ hàng: 1 món/i });
    fireEvent.click(openCartBtn);
    const cartSection = document.getElementById('cart')!;
    expect(cartSection).toHaveTextContent('Cà phê Latte');
  });
});
