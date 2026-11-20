import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import MenuPage from '../src/app/menu/page';

describe('Screen 07: Order History Component Tests (FR-11, UC-05, UC-06, FIX-01..07)', () => {
  const mockLatte = {
    id: 1,
    name: 'Cà phê Latte',
    description: 'Cà phê espresso kết hợp cùng sữa tươi béo ngậy',
    price: 45000,
    imageUrl: 'https://images.unsplash.com/photo-latte',
    isAvailable: true,
    stock: 20,
  };

  const mockTea = {
    id: 2,
    name: 'Trà Đào Cam Sả',
    description: 'Trà đào thơm mát kết hợp cam vàng và sả tươi',
    price: 42000,
    imageUrl: 'https://images.unsplash.com/photo-tea',
    isAvailable: true,
    stock: 15,
  };

  const mockUnavailableProduct = {
    id: 3,
    name: 'Cold Brew Đào',
    description: 'Cold brew ủ lạnh ngâm đào',
    price: 50000,
    imageUrl: 'https://images.unsplash.com/photo-coldbrew',
    isAvailable: false,
    stock: 0,
  };

  const mockOutOfStockProduct = {
    id: 4,
    name: 'Bạc Xỉu Sữa Tươi',
    description: 'Bạc xỉu ba tầng',
    price: 39000,
    imageUrl: 'https://images.unsplash.com/photo-bacxiu',
    isAvailable: true,
    stock: 0,
  };

  const mockLowStockProduct = {
    id: 5,
    name: 'Matcha Latte',
    description: 'Matcha Nhật Bản',
    price: 55000,
    imageUrl: 'https://images.unsplash.com/photo-matcha',
    isAvailable: true,
    stock: 1,
  };

  const mockInvalidStockProduct = {
    id: 6,
    name: 'Trà Sữa Oolong',
    description: 'Trà sữa đậm vị',
    price: 45000,
    imageUrl: 'https://images.unsplash.com/photo-oolong',
    isAvailable: true,
    stock: undefined, // Missing stock
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
      id: 103,
      orderCode: '#BL-5555',
      userId: 1,
      customerName: 'Nguyễn Văn Test',
      customerPhone: '0901234567',
      pickupMethod: 'AT_COUNTER',
      tableNumber: null,
      note: null,
      totalAmount: '45000.00',
      status: 'PAYMENT_FAILED',
      createdAt: '2026-11-20T10:05:00Z',
      items: [
        {
          id: 6,
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
    sessionStorage.clear();
    window.history.replaceState(null, "", "/menu");
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

      if (urlStr.includes('/orders/101')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockOrders[0],
        } as Response);
      }

      if (urlStr.endsWith('/products')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [mockLatte, mockTea, mockUnavailableProduct, mockOutOfStockProduct, mockLowStockProduct],
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

    const historyNavLink = screen.getByText('Lịch sử');
    fireEvent.click(historyNavLink);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Lịch sử đơn hàng/i })).toBeInTheDocument();
    });

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
    localStorage.clear();
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

  it('3. Three status tabs: accurately groups processing (3), completed (1), and cancelled (1) orders (FIX-03)', async () => {
    render(<MenuPage />);

    const historyNavLink = screen.getByText('Lịch sử');
    fireEvent.click(historyNavLink);

    await waitFor(() => {
      expect(screen.getByText('#BL-9216')).toBeInTheDocument();
      expect(screen.getByText('#BL-1042')).toBeInTheDocument();
      expect(screen.getByText('#BL-5555')).toBeInTheDocument();
    });

    const processingTab = screen.getByRole('tab', { name: /Đang xử lý/i });
    expect(processingTab).toBeInTheDocument();
    expect(processingTab).toHaveTextContent('3');

    const completedTab = screen.getByRole('tab', { name: /Hoàn tất/i });
    expect(completedTab).toHaveTextContent('1');

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
      expect(screen.queryByText('#BL-5555')).not.toBeInTheDocument();
    });
  });

  it('4. Status badges: renders correct status labels and color styles including PAYMENT_FAILED (FIX-03)', async () => {
    render(<MenuPage />);

    const historyNavLink = screen.getByText('Lịch sử');
    fireEvent.click(historyNavLink);

    await waitFor(() => {
      expect(screen.getByText('• Đã thanh toán')).toBeInTheDocument();
      expect(screen.getByText('• Đang pha chế')).toBeInTheDocument();
      expect(screen.getByText('• Thanh toán lỗi (Thử lại)')).toBeInTheDocument();
    });
  });

  it('5. Order details expand/collapse: displays item breakdown, toppings, note, and recipient info', async () => {
    render(<MenuPage />);

    const historyNavLink = screen.getByText('Lịch sử');
    fireEvent.click(historyNavLink);

    await waitFor(() => {
      expect(screen.getByText('#BL-9216')).toBeInTheDocument();
    });

    const detailButtons = screen.getAllByRole('button', { name: /Chi tiết/i });
    fireEvent.click(detailButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Chi tiết đồ uống:/i)).toBeInTheDocument();
      expect(screen.getByText(/Topping: Kem cheese/i)).toBeInTheDocument();
      expect(screen.getByText(/Ghi chú: 50% đường, ít đá/i)).toBeInTheDocument();
      expect(screen.getByText(/Mang đá riêng/i)).toBeInTheDocument();
      expect(screen.getByText(/VIP B-12/i)).toBeInTheDocument();
    });

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

    const reorderButtons = screen.getAllByRole('button', { name: /Đặt lại/i });
    fireEvent.click(reorderButtons[0]);

    await waitFor(() => {
      const drawerHeading = screen.getByRole('heading', { level: 2, name: /Giỏ hàng/i });
      expect(drawerHeading).toBeInTheDocument();
    });

    expect(screen.getByText('Cà phê Latte')).toBeInTheDocument();
    expect(screen.getByText('Trà Đào Cam Sả')).toBeInTheDocument();
    expect(screen.getByText(/Đã thêm toàn bộ món từ đơn #BL-9216 vào giỏ hàng/i)).toBeInTheDocument();

    const postOrderCalls = (global.fetch as jest.Mock).mock.calls.filter((call) => {
      return String(call[0]).endsWith('/orders') && call[1]?.method === 'POST';
    });
    expect(postOrderCalls).toHaveLength(0);
  });

  it('7. Re-order with unavailable items: alerts user and skips discontinued products (FIX-01)', async () => {
    render(<MenuPage />);

    const historyNavLink = screen.getByText('Lịch sử');
    fireEvent.click(historyNavLink);

    const cancelledTab = screen.getByRole('tab', { name: /Đã hủy/i });
    fireEvent.click(cancelledTab);

    await waitFor(() => {
      expect(screen.getByText('#BL-7000')).toBeInTheDocument();
    });

    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    const reorderBtn = screen.getByRole('button', { name: /Đặt lại đơn #BL-7000/i });
    fireEvent.click(reorderBtn);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        expect.stringContaining('Cold Brew Đào')
      );
    });
    alertMock.mockRestore();
  });

  it('8. Re-order with stock = 0: alerts user product is out of stock (FIX-01)', async () => {
    const outOfStockOrder = {
      id: 104,
      orderCode: '#BL-4040',
      userId: 1,
      customerName: 'Nguyễn Văn Test',
      customerPhone: '0901234567',
      pickupMethod: 'AT_COUNTER',
      tableNumber: null,
      note: null,
      totalAmount: '39000.00',
      status: 'PAID',
      createdAt: '2026-11-20T10:00:00Z',
      items: [
        {
          id: 7,
          productId: 4, // stock = 0
          productName: 'Bạc Xỉu Sữa Tươi',
          size: 'SMALL',
          toppings: [],
          note: null,
          quantity: 2,
          unitPrice: '39000.00',
          subtotal: '78000.00',
          product: mockOutOfStockProduct,
        },
      ],
    };

    (global.fetch as jest.Mock).mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/orders/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [outOfStockOrder],
        } as Response);
      }
      if (urlStr.endsWith('/products')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [mockOutOfStockProduct],
        } as Response);
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as Response);
    });

    render(<MenuPage />);
    fireEvent.click(screen.getByText('Lịch sử'));

    await waitFor(() => {
      expect(screen.getByText('#BL-4040')).toBeInTheDocument();
    });

    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const reorderBtn = screen.getByRole('button', { name: /Đặt lại đơn #BL-4040/i });
    fireEvent.click(reorderBtn);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        expect.stringContaining('đã hết hàng (tồn kho: 0)')
      );
    });
    alertMock.mockRestore();
  });

  it('9. Re-order with stock smaller than requested quantity: adds only available stock and warns (FIX-01)', async () => {
    const lowStockOrder = {
      id: 105,
      orderCode: '#BL-5050',
      userId: 1,
      customerName: 'Nguyễn Văn Test',
      customerPhone: '0901234567',
      pickupMethod: 'AT_COUNTER',
      tableNumber: null,
      note: null,
      totalAmount: '165000.00',
      status: 'PAID',
      createdAt: '2026-11-20T10:00:00Z',
      items: [
        {
          id: 8,
          productId: 5, // stock = 1, requested = 3
          productName: 'Matcha Latte',
          size: 'SMALL',
          toppings: [],
          note: null,
          quantity: 3,
          unitPrice: '55000.00',
          subtotal: '165000.00',
          product: mockLowStockProduct,
        },
      ],
    };

    (global.fetch as jest.Mock).mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/orders/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [lowStockOrder],
        } as Response);
      }
      if (urlStr.endsWith('/products')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [mockLowStockProduct],
        } as Response);
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as Response);
    });

    render(<MenuPage />);
    fireEvent.click(screen.getByText('Lịch sử'));

    await waitFor(() => {
      expect(screen.getByText('#BL-5050')).toBeInTheDocument();
    });

    const reorderBtn = screen.getByRole('button', { name: /Đặt lại đơn #BL-5050/i });
    fireEvent.click(reorderBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Giỏ hàng/i })).toBeInTheDocument();
      expect(screen.getByText(/chỉ còn 1 ly khả dụng/i)).toBeInTheDocument();
    });
  });

  it('10. Re-order fails safely when catalog refresh fails with network error (FIX-05, FIX-07 #1)', async () => {
    let callCount = 0;
    (global.fetch as jest.Mock).mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/orders/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockOrders,
        } as Response);
      }
      if (urlStr.endsWith('/products')) {
        callCount++;
        // First call on page mount succeeds
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => [mockLatte],
          } as Response);
        }
        // Second call on re-order fails!
        return Promise.reject(new Error('Network error: 503 Service Unavailable'));
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as Response);
    });

    render(<MenuPage />);
    fireEvent.click(screen.getByText('Lịch sử'));

    await waitFor(() => {
      expect(screen.getByText('#BL-9216')).toBeInTheDocument();
    });

    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const reorderBtn = screen.getByRole('button', { name: /Đặt lại đơn #BL-9216/i });
    fireEvent.click(reorderBtn);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        expect.stringContaining('không thể xác minh dữ liệu sản phẩm mới nhất')
      );
    });

    // Cart drawer must NOT open
    expect(screen.queryByRole('heading', { level: 2, name: /Giỏ hàng/i })).not.toBeInTheDocument();
    alertMock.mockRestore();
  });

  it('11. Re-order fails safely when catalog returns empty array (FIX-05, FIX-07 #2)', async () => {
    let callCount = 0;
    (global.fetch as jest.Mock).mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/orders/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockOrders,
        } as Response);
      }
      if (urlStr.endsWith('/products')) {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => [mockLatte],
          } as Response);
        }
        // Returns empty list on re-order
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [],
        } as Response);
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as Response);
    });

    render(<MenuPage />);
    fireEvent.click(screen.getByText('Lịch sử'));

    await waitFor(() => {
      expect(screen.getByText('#BL-9216')).toBeInTheDocument();
    });

    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const reorderBtn = screen.getByRole('button', { name: /Đặt lại đơn #BL-9216/i });
    fireEvent.click(reorderBtn);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        expect.stringContaining('danh mục sản phẩm từ hệ thống hiện đang trống')
      );
    });
    expect(screen.queryByRole('heading', { level: 2, name: /Giỏ hàng/i })).not.toBeInTheDocument();
    alertMock.mockRestore();
  });

  it('12. Re-order rejects product when stock data is missing or invalid without defaulting to 50 (FIX-05, FIX-07 #3)', async () => {
    const invalidStockOrder = {
      id: 106,
      orderCode: '#BL-6060',
      userId: 1,
      customerName: 'Nguyễn Văn Test',
      customerPhone: '0901234567',
      pickupMethod: 'AT_COUNTER',
      tableNumber: null,
      note: null,
      totalAmount: '45000.00',
      status: 'PAID',
      createdAt: '2026-11-20T10:00:00Z',
      items: [
        {
          id: 9,
          productId: 6, // stock is undefined
          productName: 'Trà Sữa Oolong',
          size: 'SMALL',
          toppings: [],
          note: null,
          quantity: 2,
          unitPrice: '45000.00',
          subtotal: '90000.00',
          product: mockInvalidStockProduct,
        },
      ],
    };

    (global.fetch as jest.Mock).mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/orders/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [invalidStockOrder],
        } as Response);
      }
      if (urlStr.endsWith('/products')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [mockInvalidStockProduct],
        } as Response);
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as Response);
    });

    render(<MenuPage />);
    fireEvent.click(screen.getByText('Lịch sử'));

    await waitFor(() => {
      expect(screen.getByText('#BL-6060')).toBeInTheDocument();
    });

    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const reorderBtn = screen.getByRole('button', { name: /Đặt lại đơn #BL-6060/i });
    fireEvent.click(reorderBtn);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        expect.stringContaining('thiếu dữ liệu tồn kho hợp lệ từ hệ thống')
      );
    });
    expect(screen.queryByRole('heading', { level: 2, name: /Giỏ hàng/i })).not.toBeInTheDocument();
    alertMock.mockRestore();
  });

  it('13. Re-order synchronizes basePrice, unitPrice and subtotal when variant already exists in cart with price change (FIX-06, FIX-07 #4)', async () => {
    // 1. Initial product price is 45,000 đ
    // 2. Add 1 Latte Medium (+5,000 đ size) + Kem cheese (+10,000 đ) -> unitPrice = 60,000 đ
    render(<MenuPage />);

    await waitFor(() => {
      expect(screen.getByText('Cà phê Latte')).toBeInTheDocument();
    });

    // Switch to Order History
    fireEvent.click(screen.getByText('Lịch sử'));
    await waitFor(() => {
      expect(screen.getByText('#BL-9216')).toBeInTheDocument();
    });

    // Live product catalog now has price increased to 50,000 đ
    // For Medium (+5,000 đ) + Kem cheese (+10,000 đ), new unitPrice should be 65,000 đ
    const updatedLatte = {
      ...mockLatte,
      price: 50000,
      stock: 20,
    };

    (global.fetch as jest.Mock).mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.endsWith('/orders/me')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => mockOrders } as Response);
      }
      if (urlStr.endsWith('/products')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => [updatedLatte, mockTea] } as Response);
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as Response);
    });

    // Click "Đặt lại" on #BL-9216
    const reorderButtons = screen.getAllByRole('button', { name: /Đặt lại/i });
    fireEvent.click(reorderButtons[0]);

    // Cart Drawer opens
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Giỏ hàng/i })).toBeInTheDocument();
    });

    // Now re-order the SAME order again: variant key already exists in cart
    // It must synchronize unitPrice to 65,000 đ, accumulate quantity to 2, subtotal to 130,000 đ
    fireEvent.click(reorderButtons[0]);

    await waitFor(() => {
      // Expect 130,000 đ subtotal for 2 Latte Medium + Kem cheese
      expect(screen.getByText(/130\.000/)).toBeInTheDocument();
    });
  });

  it('keeps one request in flight and ignores a late response after closing the ticket', async () => {
    jest.useFakeTimers();
    try {
      let release!: (r: Response) => void;
      const pending = new Promise<Response>(resolve => { release = resolve; });
      const mockFetch = global.fetch as jest.Mock;
      const original = mockFetch.getMockImplementation()!;
      mockFetch.mockImplementation((url, options) => String(url).endsWith('/orders/101')
        ? pending : original(url, options));
      render(<MenuPage />);
      fireEvent.click(screen.getByText('Lịch sử'));
      fireEvent.click((await screen.findAllByRole('button', { name: /Xem vé xác nhận/ }))[0]);
      const calls = () => mockFetch.mock.calls.filter(([url]) => String(url).endsWith('/orders/101'));
      expect(calls()).toHaveLength(1);
      act(() => { jest.advanceTimersByTime(10000); });
      expect(calls()).toHaveLength(1);
      fireEvent.click(screen.getAllByRole('button', { name: /Đóng vé/ })[0]);
      expect(calls()[0][1].signal.aborted).toBe(true);
      await act(async () => {
        release({ ok: true, json: async () => ({ ...mockOrders[0], status: 'COMPLETED' }) } as Response);
        await pending;
      });
      expect(screen.getByText('#BL-9216')).toBeVisible();
      act(() => { jest.advanceTimersByTime(6000); });
      expect(calls()).toHaveLength(1);
    } finally { jest.useRealTimers(); }
  });

  it('reads the owner ticket on open and keeps the confirmed payment stable over time', async () => {
    jest.useFakeTimers();
    try {
      const fetchMock = global.fetch as jest.Mock;
      const original = fetchMock.getMockImplementation()!;
      fetchMock.mockImplementation((url, options) => String(url).endsWith('/orders/101')
        ? Promise.resolve({ ok: true, json: async () => ({ ...mockOrders[0], status: 'PAID' }) }) : original(url, options));
      render(<MenuPage />);
      fireEvent.click(screen.getByText('Lịch sử'));
      const open = (await screen.findAllByRole('button', { name: /Xem vé xác nhận/ }))[0];
      await act(async () => { fireEvent.click(open); });
      const confirmation = await screen.findByText(/Đã thanh toán thành công/);
      expect(screen.queryByLabelText('Tiến trình đơn hàng')).toBeNull();
      act(() => { jest.advanceTimersByTime(30000); });
      expect(confirmation).toBeVisible();
      const reads = () => fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/orders/101'));
      expect(reads()).toHaveLength(1);
      expect(reads()[0][1].headers.Authorization).toBe('Bearer mock_jwt_token_123');
      fireEvent.click(screen.getAllByRole('button', { name: /Đóng vé/ })[0]);
      await act(async () => { fireEvent.click(open); });
      expect(reads()).toHaveLength(2);
    } finally { jest.useRealTimers(); }
  });

  it('16. Error state and retry: displays error and recovers upon retry', async () => {
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

    const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('#BL-9216')).toBeInTheDocument();
    });
  });

  it('17. Empty state: displays empty notice when orders list is empty', async () => {
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

    const goMenuBtn = screen.getByRole('button', { name: /Khám phá Menu ngay/i });
    fireEvent.click(goMenuBtn);

    await waitFor(() => {
      expect(screen.getByText('Cà phê Latte')).toBeInTheDocument();
    });
  });
});
