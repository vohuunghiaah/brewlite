import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../src/components/Header';
import CartDrawer from '../src/components/CartDrawer';
import CheckoutScreen from '../src/components/CheckoutScreen';
import AccountScreen from '../src/components/AccountScreen';
import { OrderHistoryItem } from '../src/components/OrderHistory';
import MenuScreen, { getProductImage, ProductCard, Product } from '../src/components/MenuScreen';
import { CartItem } from '../src/app/menu/session-cart';

describe('PR #41 Review Fixes Verification Suite (FIX-01 through FIX-05)', () => {
  // --------------------------------------------------------------------------
  // FIX-01: Active Navigation Text Visibility & Contrast
  // --------------------------------------------------------------------------
  describe('FIX-01: Header Navigation Text Visibility & High Contrast', () => {
    it('always renders text for Trang chủ, Menu, Lịch sử, Tài khoản', () => {
      render(
        <Header
          currentView="home"
          onNavigate={jest.fn()}
          cartCount={2}
          cartTotal={90000}
          onOpenCart={jest.fn()}
          onOpenAuth={jest.fn()}
          onLogout={jest.fn()}
        />
      );

      const homeLink = screen.getByRole('link', { name: /Trang chủ/i });
      const menuLink = screen.getByRole('link', { name: /Menu/i });
      const ordersLink = screen.getByRole('link', { name: /Lịch sử/i });
      const accountLink = screen.getByRole('link', { name: /Tài khoản/i });

      expect(homeLink).toBeInTheDocument();
      expect(menuLink).toBeInTheDocument();
      expect(ordersLink).toBeInTheDocument();
      expect(accountLink).toBeInTheDocument();

      // Active tab has aria-current="page" and high contrast text color class #FAF6F0
      expect(homeLink).toHaveAttribute('aria-current', 'page');
      expect(homeLink.className).toContain('!text-[#FAF6F0]');
      expect(homeLink.className).toContain('bg-[#3D261D]');

      const homeSpan = homeLink.querySelector('span');
      expect(homeSpan).toHaveTextContent('Trang chủ');
      expect(homeSpan?.className).toContain('text-[#FAF6F0]');

      // Inactive tab has muted text color class
      expect(menuLink).not.toHaveAttribute('aria-current');
      expect(menuLink.className).toContain('!text-[#6B4235]');
    });

    it('updates active contrast classes when switching views', () => {
      const { rerender } = render(
        <Header
          currentView="menu"
          onNavigate={jest.fn()}
          cartCount={0}
          cartTotal={0}
          onOpenCart={jest.fn()}
          onOpenAuth={jest.fn()}
          onLogout={jest.fn()}
        />
      );

      const menuLink = screen.getByRole('link', { name: /Menu/i });
      expect(menuLink).toHaveAttribute('aria-current', 'page');
      expect(menuLink.className).toContain('!text-[#FAF6F0]');

      rerender(
        <Header
          currentView="orders"
          onNavigate={jest.fn()}
          cartCount={0}
          cartTotal={0}
          onOpenCart={jest.fn()}
          onOpenAuth={jest.fn()}
          onLogout={jest.fn()}
        />
      );

      const ordersLink = screen.getByRole('link', { name: /Lịch sử/i });
      expect(ordersLink).toHaveAttribute('aria-current', 'page');
      expect(ordersLink.className).toContain('!text-[#FAF6F0]');
    });
  });

  // --------------------------------------------------------------------------
  // FIX-02: Voucher & Payment Amount Consistency
  // --------------------------------------------------------------------------
  describe('FIX-02: Voucher & Payment Amount Consistency', () => {
    const mockItems: CartItem[] = [
      {
        key: '1-SMALL--',
        productId: 1,
        productName: 'Cà phê Sữa Đá',
        basePrice: 29000,
        size: 'SMALL',
        toppings: [],
        note: '',
        unitPrice: 29000,
        quantity: 2,
        subtotal: 58000,
      },
    ];

    it('rejects unsupported voucher code and does NOT reduce total payment amount', () => {
      render(
        <CartDrawer
          isOpen={true}
          onClose={jest.fn()}
          cartItems={mockItems}
          onUpdateQuantity={jest.fn()}
          onRemoveItem={jest.fn()}
          onClearCart={jest.fn()}
          showCheckoutForm={false}
          onStartCheckout={jest.fn()}
          customerName=""
          onCustomerNameChange={jest.fn()}
          customerPhone=""
          onCustomerPhoneChange={jest.fn()}
          onProceedOrder={jest.fn()}
          isCreatingOrder={false}
          pendingOrder={null}
          onOpenPaymentModal={jest.fn()}
        />
      );

      // Verify subtotal and initial grand total match
      const initialTotals = screen.getAllByText(/58\.000\s*đ/);
      expect(initialTotals.length).toBeGreaterThanOrEqual(1);

      // Enter voucher code BREW10
      const voucherInput = screen.getByPlaceholderText(/Mã ưu đãi/i);
      const applyBtn = screen.getByRole('button', { name: /Áp dụng/i });

      fireEvent.change(voucherInput, { target: { value: 'BREW10' } });
      fireEvent.click(applyBtn);

      // Verify unsupported voucher warning is displayed
      expect(
        screen.getByText(/Tính năng mã ưu đãi \(FR-10\) hiện chưa khả dụng trên hệ thống/i)
      ).toBeInTheDocument();

      // Verify NO fake discount is applied
      expect(screen.queryByText(/Ưu đãi \(10%\)/i)).not.toBeInTheDocument();

      // Total must remain strictly 58.000 đ
      const totalElements = screen.getAllByText(/58\.000\s*đ/);
      expect(totalElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('52.200 đ')).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // FIX-03: Mock Payment Controls Visibility
  // --------------------------------------------------------------------------
  describe('FIX-03: Mock Payment Controls in Production Safety', () => {
    it('hides test mode simulator by default in production UI (showTestControls=false)', () => {
      render(
        <CheckoutScreen
          isOpen={true}
          onClose={jest.fn()}
          orderId={1042}
          totalAmount={58000}
          pickupMethod="AT_COUNTER"
          onPickupMethodChange={jest.fn()}
          tableNumber=""
          onTableNumberChange={jest.fn()}
          paymentMethod="VIETQR"
          onPaymentMethodChange={jest.fn()}
          testMode="SUCCESS"
          onTestModeChange={jest.fn()}
          showTestControls={false}
          onConfirmPayment={jest.fn()}
          processing={false}
        />
      );

      // Production customers must NOT see test controls
      expect(screen.queryByText(/Chế độ thử nghiệm/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Giả lập thất bại/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Thanh toán thành công/i })).not.toBeInTheDocument();
    });

    it('renders test controls only when showTestControls is explicitly true', () => {
      render(
        <CheckoutScreen
          isOpen={true}
          onClose={jest.fn()}
          orderId={1042}
          totalAmount={58000}
          pickupMethod="AT_COUNTER"
          onPickupMethodChange={jest.fn()}
          tableNumber=""
          onTableNumberChange={jest.fn()}
          paymentMethod="VIETQR"
          onPaymentMethodChange={jest.fn()}
          testMode="SUCCESS"
          onTestModeChange={jest.fn()}
          showTestControls={true}
          onConfirmPayment={jest.fn()}
          processing={false}
        />
      );

      expect(screen.getByText(/Chế độ thử nghiệm:/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Giả lập thất bại/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Thanh toán thành công/i })).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // FIX-04: Truthful Menu Claims & Accurate Account Total Spent
  // --------------------------------------------------------------------------
  describe('FIX-04: Truthful Claims & Accurate Account Calculations', () => {
    it('AccountScreen calculates totalSpent strictly from paid/completed orders', () => {
      const mockOrders: OrderHistoryItem[] = [
        {
          id: 1,
          orderCode: '#BL-0001',
          pickupMethod: 'AT_COUNTER',
          tableNumber: null,
          userId: 1,
          customerName: 'Test Customer',
          customerPhone: '0901234567',
          note: null,
          totalAmount: 50000,
          status: 'PAID',
          createdAt: new Date().toISOString(),
          items: [],
        },
        {
          id: 2,
          orderCode: '#BL-0002',
          pickupMethod: 'AT_TABLE',
          tableNumber: '10',
          userId: 1,
          customerName: 'Test Customer',
          customerPhone: '0901234567',
          note: null,
          totalAmount: 45000,
          status: 'COMPLETED',
          createdAt: new Date().toISOString(),
          items: [],
        },
        {
          id: 3,
          orderCode: '#BL-0003',
          pickupMethod: 'AT_COUNTER',
          tableNumber: null,
          userId: 1,
          customerName: 'Test Customer',
          customerPhone: '0901234567',
          note: null,
          totalAmount: 100000,
          status: 'PENDING', // Unpaid - MUST NOT BE SUMMED
          createdAt: new Date().toISOString(),
          items: [],
        },
        {
          id: 4,
          orderCode: '#BL-0004',
          pickupMethod: 'AT_COUNTER',
          tableNumber: null,
          userId: 1,
          customerName: 'Test Customer',
          customerPhone: '0901234567',
          note: null,
          totalAmount: 60000,
          status: 'PAYMENT_FAILED', // Failed - MUST NOT BE SUMMED
          createdAt: new Date().toISOString(),
          items: [],
        },
        {
          id: 5,
          orderCode: '#BL-0005',
          pickupMethod: 'AT_COUNTER',
          tableNumber: null,
          userId: 1,
          customerName: 'Test Customer',
          customerPhone: '0901234567',
          note: null,
          totalAmount: 70000,
          status: 'CANCELLED', // Cancelled - MUST NOT BE SUMMED
          createdAt: new Date().toISOString(),
          items: [],
        },
      ];

      render(
        <AccountScreen
          user={{ id: 1, email: 'customer@brewlite.vn' }}
          isAuthenticated={true}
          onOpenLogin={jest.fn()}
          onLogout={jest.fn()}
          orders={mockOrders}
          onNavigateToHistory={jest.fn()}
        />
      );

      // Expected total: 50.000 + 45.000 = 95.000 đ
      expect(screen.getByText('95.000 đ')).toBeInTheDocument();
      // Should NOT sum all 325.000 đ
      expect(screen.queryByText('325.000 đ')).not.toBeInTheDocument();
    });

    it('MenuScreen renders verifiable dynamic counts without fake claims or favorite badges', () => {
      const products: Product[] = [
        {
          id: 1,
          name: 'Cà phê Đen Đá',
          description: 'Cà phê nguyên chất',
          price: 25000,
          isAvailable: true,
          stock: 10,
        },
        {
          id: 2,
          name: 'Bánh Croissant Bơ Tỏi',
          description: 'Bánh nướng bơ tỏi vàng giòn',
          price: 35000,
          isAvailable: true,
          stock: 5,
        },
      ];

      render(
        <MenuScreen
          products={products}
          loading={false}
          onRetry={jest.fn()}
          search=""
          onSearchChange={jest.fn()}
          selectedCategory="Tất cả"
          onCategoryChange={jest.fn()}
          onOpenProduct={jest.fn()}
          onQuickAdd={jest.fn()}
        />
      );

      // Shows dynamic product count
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Món thực đơn')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('Cashless')).toBeInTheDocument();

      // Does NOT show unverified claims
      expect(screen.queryByText('6+ Món mới')).not.toBeInTheDocument();
      expect(screen.queryByText('0đ Phí giao vận')).not.toBeInTheDocument();
      expect(screen.queryByText(/Yêu thích/i)).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // FIX-05: Product Image Accuracy & Fallbacks
  // --------------------------------------------------------------------------
  describe('FIX-05: Product Image Accuracy & Fallbacks', () => {
    it('maps croissant and bakery products to pastry fallback image, not water or coffee', () => {
      const croissantProduct: Product = {
        id: 4,
        name: 'Bánh Croissant Bơ Tỏi',
        description: 'Bánh sừng bò ngàn lớp thơm nức mùi bơ Pháp',
        price: 32000,
        isAvailable: true,
      };

      const imgSrc = getProductImage(croissantProduct);
      expect(imgSrc).toContain('photo-1555507036-ab1f4038808a'); // Pastry photo
      expect(imgSrc).not.toContain('photo-1548839140-29a749e1cf4d'); // NOT water photo
    });

    it('ProductCard displays fallback text placeholder on image load error without infinite skeleton', () => {
      const product: Product = {
        id: 99,
        name: 'Trà Sen Vàng',
        description: 'Trà sen thơm mát',
        price: 40000,
        isAvailable: true,
        imageUrl: 'https://invalid-url.example/broken.jpg',
      };

      const { container } = render(
        <ProductCard
          product={product}
          onOpenDetail={jest.fn()}
          onQuickAdd={jest.fn()}
        />
      );

      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();

      // Trigger image error
      fireEvent.error(img!);

      // Skeleton should be removed and fallback element displayed
      expect(container.querySelector('.skeleton')).not.toBeInTheDocument();
      const productTitles = screen.getAllByText('Trà Sen Vàng');
      expect(productTitles.length).toBeGreaterThanOrEqual(2);
    });
  });
});
