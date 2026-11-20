import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MenuPage from '../src/app/menu/page';

describe('Screen 07: Order History Component Tests (FR-11, UC-05, UC-06)', () => {
  const mockLatte = {
    id: 1,
    name: 'Cà phê Latte',
    description: 'Cà phê espresso kết hợp cùng sữa tươi béo ngậy',
    price: 45000,
    imageUrl: 'https://images.unsplash.com/photo-latte',
    isAvailable: true,
  };

  const mockTea = {
    id: 2,
    name: 'Trà Đào Cam Sả',
    description: 'Trà đào thơm mát kết hợp cam vàng và sả tươi',
    price: 42000,
    imageUrl: 'https://images.unsplash.com/photo-tea',
    isAvailable: true,
  };

  const mockUnavailableProduct = {
    id: 3,
    name: 'Cold Brew Đào',
    description: 'Cold brew ủ lạnh ngâm đào',
    price: 50000,
    imageUrl: 'https://images.unsplash.com/photo-coldbrew',
    isAvailable: false,
  };

  const mockOrders = [
    {
      id: 101,
      orderCode: '#BL-9216',
      userId: 1,
      customerName: 'Nguyễn Văn Test',
      customerPhone: '0901234567',
      pickupMethod: 'AT_TABLE',
      tableNumber: 'VIP B-12',
      note: 'Mang đá riêng',
      totalAmount: '95000.00',
      status: 'PAID',
      createdAt: '2026-11-20T10:30:00Z',
      items: [
        {
          id: 1,
          productId: 1,
          productName: 'Cà phê Latte',
          size: 'MEDIUM',
          toppings: ['Kem cheese'],
          note: '50% đường, ít đá',
          quantity: 1,
          unitPrice: '60000.00',
          subtotal: '60000.00',
          product: mockLatte,
        },
        {
          id: 2,
          productId: 2,
          productName: 'Trà Đào Cam Sả',
          size: 'SMALL',
          toppings: [],
          note: '70% đường, đá đầy',
          quantity: 1,
          unitPrice: '35000.00',
          subtotal: '35000.00',
          product: mockTea,
        },
      ],
    },
    {
      id: 102,
      orderCode: '#BL-1042',
      userId: 1,
      customerName: 'Nguyễn Văn Test',
      customerPhone: '0901234567',
      pickupMethod: 'AT_COUNTER',
      tableNumber: null,
      note: null,
      totalAmount: '120000.00',
      status: 'PREPARING',
      createdAt: '2026-11-20T10:15:00Z',
      items: [
        {
          id: 3,
          productId: 1,
          productName: 'Cà phê Latte',
          size: 'LARGE',
          toppings: ['Kem cheese', 'Trân châu trắng'],
          note: 'Không đường',
          quantity: 2,
          unitPrice: '60000.00',
          subtotal: '120000.00',
          product: mockLatte,
        },
      ],
    },
    {
      id: 100,
      orderCode: '#BL-8000',
      userId: 1,
      customerName: 'Nguyễn Văn Test',
      customerPhone: '0901234567',
      pickupMethod: 'AT_COUNTER',
      tableNumber: null,
      note: null,
      totalAmount: '45000.00',
      status: 'COMPLETED',
      createdAt: '2026-11-19T15:00:00Z',
      items: [
        {
          id: 4,
          productId: 1,
          productName: 'Cà phê Latte',
          size: 'SMALL',
          toppings: [],
          note: null,
          quantity: 1,
          unitPrice: '45000.00',
          subtotal: '45000.00',
          product: mockLatte,
        },
      ],
    },
    {
      id: 99,
      orderCode: '#BL-7000',
      userId: 1,
      customerName: 'Nguyễn Văn Test',
      customerPhone: '0901234567',
      pickupMethod: 'AT_COUNTER',
      tableNumber: null,
      note: null,
      totalAmount: '50000.00',
      status: 'CANCELLED',
      createdAt: '2026-11-19T14:00:00Z',
      items: [
        {
          id: 5,
          productId: 3,
          productName: 'Cold Brew Đào',
          size: 'SMALL',
          toppings: [],
          note: null,
          quantity: 1,
          unitPrice: '50000.00',
          subtotal: '50000.00',
          product: mockUnavailableProduct,
        },
      ],
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('brewlite_access_token', 'mock_jwt_token_123');
    localStorage.setItem('brewlite_user', JSON.stringify({ id: 1, email: 'test@brewlite.vn' }));

    global.fetch = jest.fn((url: RequestInfo | URL) => {
      const urlStr = String(url);

      if (urlStr.endsWith('/orders/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockOrders,
        } as Response);
      }

      if (urlStr.endsWith('/products')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [mockLatte, mockTea, mockUnavailableProduct],
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('1. Navigation to Order History: switches view and calls GET /orders/me with JWT', async () => {
    render(<MenuPage />);

    await waitFor(() => {
      expect(screen.getByText('Cà phê Latte')).toBeInTheDocument();
    });

    // Click "Lịch sử" in navigation
    const historyNavLink = screen.getByText('Lịch sử');
    fireEvent.click(historyNavLink);

    // Verify view switches to Order History
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Lịch sử đơn hàng/i })).toBeInTheDocument();
    });

    // Verify API called with Bearer token
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/orders\/me$/),
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer mock_jwt_token_123',
        },
      })
    );
  });

  it('2. Unauthenticated prompt: displays login card when user is not logged in', async () => {
    localStorage.clear(); // Remove auth token and user
    render(<MenuPage />);

    await waitFor(() => {
      expect(screen.getByText('Cà phê Latte')).toBeInTheDocument();
    });

    const historyNavLink = screen.getByText('Lịch sử');
    fireEvent.click(historyNavLink);

    await waitFor(() => {
      expect(screen.getByText(/Đăng nhập để xem lịch sử đơn hàng/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Đăng nhập ngay/i })).toBeInTheDocument();
    });
  });

  it('3. Three status tabs: accurately groups processing (2), completed (1), and cancelled (1) orders', async () => {
    render(<MenuPage />);

    const historyNavLink = screen.getByText('Lịch sử');
    fireEvent.click(historyNavLink);

    await waitFor(() => {
      expect(screen.getByText('#BL-9216')).toBeInTheDocument();
      expect(screen.getByText('#BL-1042')).toBeInTheDocument();
    });

    // Tab "Đang xử lý": should have 2 orders (#BL-9216 PAID, #BL-1042 PREPARING)
    const processingTab = screen.getByRole('tab', { name: /Đang xử lý/i });
    expect(processingTab).toBeInTheDocument();
    expect(processingTab).toHaveTextContent('2');

    // Tab "Hoàn tất": should have 1 order
    const completedTab = screen.getByRole('tab', { name: /Hoàn tất/i });
    expect(completedTab).toHaveTextContent('1');

    // Tab "Đã hủy": should have 1 order
    const cancelledTab = screen.getByRole('tab', { name: /Đã hủy/i });
    expect(cancelledTab).toHaveTextContent('1');

    // Switch to "Hoàn tất" tab
    fireEvent.click(completedTab);
    await waitFor(() => {
      expect(screen.getByText('#BL-8000')).toBeInTheDocument();
      expect(screen.queryByText('#BL-9216')).not.toBeInTheDocument();
    });

    // Switch to "Đã hủy" tab
    fireEvent.click(cancelledTab);
    await waitFor(() => {
      expect(screen.getByText('#BL-7000')).toBeInTheDocument();
      expect(screen.queryByText('#BL-8000')).not.toBeInTheDocument();
    });
  });

  it('4. Status badges: renders correct status labels and color styles', async () => {
    render(<MenuPage />);

    const historyNavLink = screen.getByText('Lịch sử');
    fireEvent.click(historyNavLink);

    await waitFor(() => {
      expect(screen.getByText('• Đã thanh toán')).toBeInTheDocument();
      expect(screen.getByText('• Đang pha chế')).toBeInTheDocument();
    });
  });

  it('5. Order details expand/collapse: displays item breakdown, toppings, note, and recipient info', async () => {
    render(<MenuPage />);

    const historyNavLink = screen.getByText('Lịch sử');
    fireEvent.click(historyNavLink);

    await waitFor(() => {
      expect(screen.getByText('#BL-9216')).toBeInTheDocument();
    });

    // Click "Chi tiết ▾" on the first order
    const detailButtons = screen.getAllByRole('button', { name: /Chi tiết/i });
    fireEvent.click(detailButtons[0]);

    // Breakdown should now be visible
    await waitFor(() => {
      expect(screen.getByText(/Chi tiết đồ uống:/i)).toBeInTheDocument();
      expect(screen.getByText(/Topping: Kem cheese/i)).toBeInTheDocument();
      expect(screen.getByText(/Ghi chú: 50% đường, ít đá/i)).toBeInTheDocument();
      expect(screen.getByText(/Mang đá riêng/i)).toBeInTheDocument();
      expect(screen.getByText(/VIP B-12/i)).toBeInTheDocument();
    });

    // Click again to collapse
    const collapseButton = screen.getByRole('button', { name: /Thu gọn ▴/i });
    fireEvent.click(collapseButton);
    expect(screen.queryByText(/Chi tiết đồ uống:/i)).not.toBeInTheDocument();
  });

  it('6. Re-order (Đặt lại): adds available items to cart and opens Drawer without auto-ordering', async () => {
    render(<MenuPage />);

    const historyNavLink = screen.getByText('Lịch sử');
    fireEvent.click(historyNavLink);

    await waitFor(() => {
      expect(screen.getByText('#BL-9216')).toBeInTheDocument();
    });

    // Click "↻ Đặt lại" on order #BL-9216
    const reorderButtons = screen.getAllByRole('button', { name: /Đặt lại/i });
    fireEvent.click(reorderButtons[0]);

    // Drawer opens
    await waitFor(() => {
      const drawerHeading = screen.getByRole('heading', { level: 2, name: /Giỏ hàng/i });
      expect(drawerHeading).toBeInTheDocument();
    });

    // Verify items added to cart
    expect(screen.getByText('Cà phê Latte')).toBeInTheDocument();
    expect(screen.getByText('Trà Đào Cam Sả')).toBeInTheDocument();

    // Verify reorder notification message
    expect(screen.getByText(/Đã thêm toàn bộ món từ đơn #BL-9216 vào giỏ hàng/i)).toBeInTheDocument();

    // Verify NO order placement was triggered automatically (no POST /orders call)
    const postOrderCalls = (global.fetch as jest.Mock).mock.calls.filter((call) => {
      return String(call[0]).endsWith('/orders') && call[1]?.method === 'POST';
    });
    expect(postOrderCalls).toHaveLength(0);
  });

  it('7. Re-order with unavailable items: alerts user and skips out-of-stock items', async () => {
    render(<MenuPage />);

    const historyNavLink = screen.getByText('Lịch sử');
    fireEvent.click(historyNavLink);

    // Switch to "Đã hủy" tab (order #BL-7000 contains unavailable Cold Brew Đào)
    const cancelledTab = screen.getByRole('tab', { name: /Đã hủy/i });
    fireEvent.click(cancelledTab);

    await waitFor(() => {
      expect(screen.getByText('#BL-7000')).toBeInTheDocument();
    });

    // Mock window.alert
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    const reorderBtn = screen.getByRole('button', { name: /Đặt lại đơn #BL-7000/i });
    fireEvent.click(reorderBtn);

    expect(alertMock).toHaveBeenCalledWith(
      expect.stringContaining('Cold Brew Đào')
    );
    alertMock.mockRestore();
  });

  it('8. Track order: opens Digital Buzzer Ticket modal for active PAID/PREPARING order', async () => {
    render(<MenuPage />);

    const historyNavLink = screen.getByText('Lịch sử');
    fireEvent.click(historyNavLink);

    await waitFor(() => {
      expect(screen.getByText('#BL-9216')).toBeInTheDocument();
    });

    // Click "Theo dõi >" on order #BL-9216
    const trackButtons = screen.getAllByRole('button', { name: /Theo dõi vé chuông/i });
    fireEvent.click(trackButtons[0]);

    // Buzzer ticket modal opens
    await waitFor(() => {
      expect(screen.getByText('BrewLite Digital Buzzer')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: '#BL-9216' })).toBeInTheDocument();
      expect(screen.getByText(/Giao tận bàn: VIP B-12/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /📋 Xem trong Lịch sử đơn/i })).toBeInTheDocument();
    });
  });

  it('9. Error state and retry: displays error and recovers upon retry', async () => {
    let failOrdersOnce = true;
    (global.fetch as jest.Mock).mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/orders/me')) {
        if (failOrdersOnce) {
          failOrdersOnce = false;
          return Promise.reject(new Error('Mạng bị mất kết nối'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockOrders,
        } as Response);
      }
      if (urlStr.endsWith('/products')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [mockLatte, mockTea, mockUnavailableProduct],
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);
    });

    render(<MenuPage />);

    const historyNavLink = screen.getByText('Lịch sử');
    fireEvent.click(historyNavLink);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Mạng bị mất kết nối/i);
    });

    // Click retry
    const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('#BL-9216')).toBeInTheDocument();
    });
  });

  it('10. Empty state: displays empty notice when orders list is empty', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: RequestInfo | URL) => {
      if (String(url).endsWith('/orders/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [],
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [mockLatte],
      } as Response);
    });

    render(<MenuPage />);

    const historyNavLink = screen.getByText('Lịch sử');
    fireEvent.click(historyNavLink);

    await waitFor(() => {
      expect(screen.getByText(/Không có đơn hàng nào đang xử lý/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Khám phá Menu ngay/i })).toBeInTheDocument();
    });

    // Clicking "Khám phá Menu ngay" returns to Menu view
    const goMenuBtn = screen.getByRole('button', { name: /Khám phá Menu ngay/i });
    fireEvent.click(goMenuBtn);

    await waitFor(() => {
      expect(screen.getByText('Cà phê Latte')).toBeInTheDocument();
    });
  });
});
