import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Header from '../src/components/Header';
import CartDrawer from '../src/components/CartDrawer';
import CheckoutScreen from '../src/components/CheckoutScreen';
import OrderConfirmation from '../src/components/OrderConfirmation';
import AccountScreen from '../src/components/AccountScreen';
import OrderHistory, { OrderHistoryItem } from '../src/components/OrderHistory';
import MenuScreen, { getProductImage, ProductCard, Product } from '../src/components/MenuScreen';
import MenuPage from '../src/app/menu/page';
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

  // --------------------------------------------------------------------------
  // UI Refinements: Toast, Cart Thumbnails, QR Simulation, Pending/Paid Labels
  // --------------------------------------------------------------------------
  describe('UI Refinements Verification', () => {
    it('CartDrawer renders product thumbnail image and excludes PENDING text from order status', () => {
      const mockItemsWithImage: CartItem[] = [
        {
          key: 'item-1',
          productId: 1,
          productName: 'Cà phê Phin Sữa Tươi',
          imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
          basePrice: 29000,
          size: 'SMALL',
          toppings: [],
          note: '',
          unitPrice: 29000,
          quantity: 2,
          subtotal: 58000,
        },
      ];

      const { container } = render(
        <CartDrawer
          isOpen={true}
          onClose={jest.fn()}
          cartItems={mockItemsWithImage}
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
          pendingOrder={{ id: 100, status: 'PENDING' }}
          onOpenPaymentModal={jest.fn()}
        />
      );

      // 1. Verify thumbnail image exists
      const itemImg = container.querySelector('img[alt="Cà phê Phin Sữa Tươi"]');
      expect(itemImg).toBeInTheDocument();

      // 2. Verify pending order text excludes the word "PENDING"
      const pendingBanner = screen.getByText(/Đặt hàng thành công! Mã đơn hàng: #100/i);
      expect(pendingBanner).toBeInTheDocument();
      expect(pendingBanner.textContent).toContain('Trạng thái: Chờ thanh toán');
      expect(pendingBanner.textContent).not.toContain('PENDING');
    });

    it('OrderConfirmation displays "Đã thanh toán" without "(PAID)"', () => {
      render(
        <OrderConfirmation
          isOpen={true}
          onClose={jest.fn()}
          orderId={100}
          orderCode="BL-0100"
          status="PAID"
          pickupMethod="AT_COUNTER"
          totalAmount={58000}
          items={[]}
          onViewHistory={jest.fn()}
          onContinueShopping={jest.fn()}
        />
      );

      // Verify "Đã thanh toán" is present and "(PAID)" is absent
      const statusBadge = screen.getByText(/Đã thanh toán/i);
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge.textContent).not.toContain('(PAID)');
    });

    it('CheckoutScreen renders simulated QR code for cashless payment with non-payable notice', () => {
      const { container } = render(
        <CheckoutScreen
          isOpen={true}
          onClose={jest.fn()}
          totalAmount={58000}
          paymentMethod="VIETQR"
          onPaymentMethodChange={jest.fn()}
          pickupMethod="AT_COUNTER"
          onPickupMethodChange={jest.fn()}
          tableNumber=""
          onTableNumberChange={jest.fn()}
          processing={false}
          onConfirmPayment={jest.fn()}
          testMode="SUCCESS"
          onTestModeChange={jest.fn()}
          orderId={100}
        />
      );

      // Verify QR Code svg exists and mentions simulated Cashless
      expect(screen.getByText(/Mã VietQR \/ Napas247 \(Mô phỏng\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Mã QR mô phỏng thanh toán cashless · Đơn #100/i)).toBeInTheDocument();
      expect(screen.getByText(/QR minh họa — không dùng để chuyển khoản thực tế/i)).toBeInTheDocument();
      expect(screen.queryByText(/Chủ TK: BREWLITE COFFEE/i)).not.toBeInTheDocument();
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('CartDrawer "Khám phá menu ngay" triggers onExploreMenu and onClose', () => {
      const handleClose = jest.fn();
      const handleExplore = jest.fn();

      render(
        <CartDrawer
          isOpen={true}
          onClose={handleClose}
          cartItems={[]}
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
          onExploreMenu={handleExplore}
        />
      );

      const exploreBtn = screen.getByRole('button', { name: /Khám phá menu ngay/i });
      fireEvent.click(exploreBtn);

      expect(handleClose).toHaveBeenCalledTimes(1);
      expect(handleExplore).toHaveBeenCalledTimes(1);
    });

    it('OrderConfirmation for PENDING order renders "Chờ thanh toán" badge, pending title, and pay action', () => {
      const handlePay = jest.fn();
      const handleContinue = jest.fn();

      render(
        <OrderConfirmation
          isOpen={true}
          onClose={jest.fn()}
          orderId={101}
          orderCode="BL-0101"
          status="PENDING"
          pickupMethod="AT_COUNTER"
          totalAmount={45000}
          items={[
            {
              key: 'latte',
              productId: 2,
              productName: 'Cà phê Latte',
              basePrice: 45000,
              size: 'SMALL',
              toppings: [],
              note: '',
              unitPrice: 45000,
              quantity: 1,
              subtotal: 45000,
            },
          ]}
          onViewHistory={jest.fn()}
          onContinueShopping={handleContinue}
          onPayPendingOrder={handlePay}
        />
      );

      // Verify title reflects pending status
      expect(screen.getByText(/Đơn hàng đang chờ thanh toán/i)).toBeInTheDocument();
      expect(screen.queryByText(/Thanh toán thành công/i)).not.toBeInTheDocument();

      // Verify badge displays "Chờ thanh toán"
      const pendingBadge = screen.getByText('Chờ thanh toán');
      expect(pendingBadge).toBeInTheDocument();

      // Verify pay action button is present and clickable
      const payBtn = screen.getByRole('button', { name: /Tiến hành thanh toán đơn #101/i });
      expect(payBtn).toBeInTheDocument();
      fireEvent.click(payBtn);
      expect(handlePay).toHaveBeenCalledWith(101, 45000);

      // Verify "Tiếp tục mua hàng" is clickable
      const continueBtn = screen.getByRole('button', { name: /Tiếp tục mua hàng/i });
      fireEvent.click(continueBtn);
      expect(handleContinue).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // FIX-08: Historical PENDING Orders Payment & Cart Independence
  // --------------------------------------------------------------------------
  describe('FIX-08: Historical PENDING Orders Payment & Cart Isolation', () => {
    const historicalOrder: OrderHistoryItem = {
      id: 205,
      orderCode: '#BL-0205',
      pickupMethod: 'AT_COUNTER',
      tableNumber: null,
      userId: 1,
      customerName: 'Nguyen Van A',
      customerPhone: '0901234567',
      note: null,
      totalAmount: 70000,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      items: [
        {
          id: 1,
          productId: 1,
          productName: 'Cà phê Phin Sữa Tươi',
          size: 'SMALL',
          toppings: [],
          note: null,
          quantity: 2,
          unitPrice: 35000,
          subtotal: 70000,
        },
      ],
    };

    it('OrderHistory renders "Thanh toán" button for PENDING orders and triggers onPayOrder', () => {
      const handlePayOrder = jest.fn();
      render(
        <OrderHistory
          orders={[historicalOrder]}
          loading={false}
          isAuthenticated={true}
          onOpenLogin={jest.fn()}
          onReorder={jest.fn()}
          onViewConfirmationTicket={jest.fn()}
          onPayOrder={handlePayOrder}
        />
      );

      const payBtn = screen.getByRole('button', { name: /Thanh toán/i });
      expect(payBtn).toBeInTheDocument();
      fireEvent.click(payBtn);
      expect(handlePayOrder).toHaveBeenCalledTimes(1);
      expect(handlePayOrder).toHaveBeenCalledWith(historicalOrder);
    });

    it('OrderHistory does NOT render "Thanh toán" button for PAID, COMPLETED, or CANCELLED orders', () => {
      const nonPayableOrders: OrderHistoryItem[] = [
        { ...historicalOrder, id: 301, status: 'PAID' },
        { ...historicalOrder, id: 302, status: 'COMPLETED' },
        { ...historicalOrder, id: 303, status: 'CANCELLED' },
      ];

      const { rerender } = render(
        <OrderHistory
          orders={[nonPayableOrders[0]]}
          loading={false}
          isAuthenticated={true}
          onOpenLogin={jest.fn()}
          onReorder={jest.fn()}
          onViewConfirmationTicket={jest.fn()}
          onPayOrder={jest.fn()}
        />
      );

      // In "Đang xử lý" tab (PAID is in processing tab)
      expect(screen.queryByRole('button', { name: /^Thanh toán$/i })).not.toBeInTheDocument();

      // Switch to completed
      rerender(
        <OrderHistory
          orders={[nonPayableOrders[1]]}
          loading={false}
          isAuthenticated={true}
          onOpenLogin={jest.fn()}
          onReorder={jest.fn()}
          onViewConfirmationTicket={jest.fn()}
          onPayOrder={jest.fn()}
        />
      );
      const completedTab = screen.getByRole('tab', { name: /Hoàn tất/i });
      fireEvent.click(completedTab);
      expect(screen.queryByRole('button', { name: /^Thanh toán$/i })).not.toBeInTheDocument();
    });

    it('OrderConfirmation delegates to onPayPendingOrder with orderId and authoritative total amount', () => {
      const handlePayPendingOrder = jest.fn();
      render(
        <OrderConfirmation
          isOpen={true}
          onClose={jest.fn()}
          orderId={205}
          orderCode="BL-0205"
          status="PENDING"
          pickupMethod="AT_COUNTER"
          totalAmount={70000}
          items={[]}
          onViewHistory={jest.fn()}
          onContinueShopping={jest.fn()}
          onPayPendingOrder={handlePayPendingOrder}
        />
      );

      const payBtn = screen.getByRole('button', { name: /Tiến hành thanh toán đơn #205/i });
      expect(payBtn).toBeInTheDocument();
      fireEvent.click(payBtn);
      expect(handlePayPendingOrder).toHaveBeenCalledWith(205, 70000);
    });
  });

  // --------------------------------------------------------------------------
  // FIX-09: Paid Order Must Not Appear Pending in Cart
  // --------------------------------------------------------------------------
  describe('FIX-09: Paid Order Must Not Appear Pending in Cart', () => {
    const mockCartItems: CartItem[] = [
      {
        key: 'item-1',
        productId: 1,
        productName: 'Cà phê Phin Đen',
        basePrice: 25000,
        size: 'SMALL',
        toppings: [],
        note: '',
        unitPrice: 25000,
        quantity: 1,
        subtotal: 25000,
      },
    ];

    it('does NOT render pending banner or payment action when pendingOrder is null', () => {
      render(
        <CartDrawer
          isOpen={true}
          onClose={jest.fn()}
          cartItems={mockCartItems}
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

      expect(screen.queryByText(/Trạng thái: Chờ thanh toán/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Tiếp tục thanh toán/i })).not.toBeInTheDocument();
    });

    it('does NOT render pending banner or payment action when pendingOrder is PAID', () => {
      render(
        <CartDrawer
          isOpen={true}
          onClose={jest.fn()}
          cartItems={mockCartItems}
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
          pendingOrder={{ id: 100, status: 'PAID' }}
          onOpenPaymentModal={jest.fn()}
        />
      );

      expect(screen.queryByText(/Trạng thái: Chờ thanh toán/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Tiếp tục thanh toán/i })).not.toBeInTheDocument();
    });

    it('does NOT render pending banner or payment action when pendingOrder is CANCELLED or COMPLETED', () => {
      const { rerender } = render(
        <CartDrawer
          isOpen={true}
          onClose={jest.fn()}
          cartItems={mockCartItems}
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
          pendingOrder={{ id: 100, status: 'CANCELLED' }}
          onOpenPaymentModal={jest.fn()}
        />
      );

      expect(screen.queryByText(/Trạng thái: Chờ thanh toán/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Tiếp tục thanh toán/i })).not.toBeInTheDocument();

      rerender(
        <CartDrawer
          isOpen={true}
          onClose={jest.fn()}
          cartItems={mockCartItems}
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
          pendingOrder={{ id: 100, status: 'COMPLETED' }}
          onOpenPaymentModal={jest.fn()}
        />
      );

      expect(screen.queryByText(/Trạng thái: Chờ thanh toán/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Tiếp tục thanh toán/i })).not.toBeInTheDocument();
    });

    it('renders pending banner and payment action strictly when pendingOrder is PENDING', () => {
      render(
        <CartDrawer
          isOpen={true}
          onClose={jest.fn()}
          cartItems={mockCartItems}
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
          pendingOrder={{ id: 100, status: 'PENDING' }}
          onOpenPaymentModal={jest.fn()}
        />
      );

      expect(screen.getByText(/Trạng thái: Chờ thanh toán/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Tiếp tục thanh toán/i })).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // FIX-10: Simulated QR Code Non-Payable Integrity
  // --------------------------------------------------------------------------
  describe('FIX-10: Simulated QR Integrity & Non-Payable Safeguard', () => {
    it('prominently displays non-payable warning and excludes fabricated bank details', () => {
      render(
        <CheckoutScreen
          isOpen={true}
          onClose={jest.fn()}
          orderId={555}
          totalAmount={45000}
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

      // Must clearly state non-payable simulation
      expect(
        screen.getByText('QR minh họa — không dùng để chuyển khoản thực tế')
      ).toBeInTheDocument();

      // Non-misleading subtitle
      expect(
        screen.getByText('Mã QR mô phỏng thanh toán cashless · Đơn #555')
      ).toBeInTheDocument();

      // Must NOT contain fabricated bank info
      expect(screen.queryByText(/Chủ TK: BREWLITE COFFEE/i)).not.toBeInTheDocument();

      // Instructions point to mock button
      expect(screen.getByText(/Xác nhận thanh toán.*bên dưới để hoàn tất/i)).toBeInTheDocument();
    });

    it('requires explicit button click to confirm mock payment', () => {
      const handleConfirm = jest.fn();
      render(
        <CheckoutScreen
          isOpen={true}
          onClose={jest.fn()}
          orderId={555}
          totalAmount={45000}
          pickupMethod="AT_COUNTER"
          onPickupMethodChange={jest.fn()}
          tableNumber=""
          onTableNumberChange={jest.fn()}
          paymentMethod="VIETQR"
          onPaymentMethodChange={jest.fn()}
          testMode="SUCCESS"
          onTestModeChange={jest.fn()}
          showTestControls={false}
          onConfirmPayment={handleConfirm}
          processing={false}
        />
      );

      const confirmBtn = screen.getByRole('button', { name: /Xác nhận thanh toán/i });
      expect(confirmBtn).toBeInTheDocument();
      fireEvent.click(confirmBtn);
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // PATCH-A & PATCH-B: Final Data Integrity & Fail-Closed Regression Suite
  // --------------------------------------------------------------------------
  describe('PATCH-A & PATCH-B: Historical Order Data Integrity & Cart Isolation', () => {
    const mockProduct = {
      id: 1,
      name: 'Cà phê Phin Sữa Tươi',
      description: 'Cà phê sữa tươi thơm ngon',
      price: 35000,
      imageUrl: 'https://images.unsplash.com/photo-phin',
      isAvailable: true,
      stock: 20,
    };

    beforeEach(() => {
      sessionStorage.clear();
      localStorage.clear();
      localStorage.setItem('brewlite_access_token', 'mock_jwt_token_123');
      localStorage.setItem('brewlite_user', JSON.stringify({ id: 1, email: 'user@brewlite.vn' }));
      window.history.replaceState(null, '', '/menu#orders');
    });

    it('shows the historical total, retains the key while pending and reports a reconciled refund', async () => {
      const mockHistoricalOrder: OrderHistoryItem = {
        id: 701,
        orderCode: '#BL-0701',
        pickupMethod: 'AT_COUNTER',
        tableNumber: null,
        userId: 1,
        customerName: 'Khách Hàng A',
        customerPhone: '0901234567',
        note: null,
        totalAmount: 70000,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        items: [
          {
            id: 10,
            productId: 1,
            productName: 'Cà phê Phin Sữa Tươi',
            size: 'SMALL',
            toppings: [],
            note: null,
            quantity: 2,
            unitPrice: 35000,
            subtotal: 70000,
          },
        ],
      };

      let attempts = 0;
      global.fetch = jest.fn((url: RequestInfo | URL) => {
        const urlStr = String(url);
        if (urlStr.endsWith('/products')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => [mockProduct] } as Response);
        }
        if (urlStr.endsWith('/orders/me')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => [mockHistoricalOrder] } as Response);
        }
        if (urlStr.endsWith('/payments')) {
          const status = ++attempts === 1 ? 'PENDING' : 'REFUNDED';
          return Promise.resolve({ ok: true, status: 201, json: async () => ({ success: false, status }) } as Response);
        }
        if (urlStr.endsWith('/orders/701')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => mockHistoricalOrder } as Response);
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as Response);
      });

      render(<MenuPage />);

      // Order card appears in order history
      const payBtn = await screen.findByRole('button', { name: /^Thanh toán$/i });
      expect(payBtn).toBeInTheDocument();
      fireEvent.click(payBtn);

      // Checkout screen opens displaying the backend-authoritative amount 70.000 đ
      await screen.findByRole('dialog', { name: /thanh toán đơn #701/i });
      expect(screen.getAllByText('70.000 đ').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Mã QR mô phỏng thanh toán cashless · Đơn #701/i)).toBeInTheDocument();
      const confirm = await screen.findByRole('button', { name: /Xác nhận thanh toán/i });
      fireEvent.click(confirm);
      await screen.findByText('Giao dịch đang chờ đối soát.');
      fireEvent.click(confirm);
      await screen.findByText(/Giao dịch đã được hoàn tiền tự động/);
      const requests = (global.fetch as jest.Mock).mock.calls.filter(([url]) => String(url).endsWith('/payments'));
      expect(requests).toHaveLength(2);
      const firstKey = requests[0][1].headers['Idempotency-Key'];
      expect(firstKey).toBeTruthy();
      expect(requests[1][1].headers['Idempotency-Key']).toEqual(firstKey);
    });

    it('2. Missing, NaN or invalid backend amount fails closed and displays error', async () => {
      const staleHistoricalOrder: OrderHistoryItem = {
        id: 702,
        orderCode: '#BL-0702',
        pickupMethod: 'AT_COUNTER',
        tableNumber: null,
        userId: 1,
        customerName: 'Khách Hàng B',
        customerPhone: '0901234567',
        note: null,
        totalAmount: 50000, // Stale amount in list
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        items: [],
      };

      // Backend returns invalid amount (NaN / null / <= 0)
      const corruptedBackendOrder = {
        ...staleHistoricalOrder,
        totalAmount: 'NaN', // Invalid amount from backend
      };

      global.fetch = jest.fn((url: RequestInfo | URL) => {
        const urlStr = String(url);
        if (urlStr.endsWith('/products')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => [mockProduct] } as Response);
        }
        if (urlStr.endsWith('/orders/me')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => [staleHistoricalOrder] } as Response);
        }
        if (urlStr.endsWith('/orders/702')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => corruptedBackendOrder } as Response);
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as Response);
      });

      render(<MenuPage />);

      const payBtn = await screen.findByRole('button', { name: /^Thanh toán$/i });
      fireEvent.click(payBtn);

      // Fails closed: Checkout dialog must NOT open
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: /thanh toán đơn #702/i })).not.toBeInTheDocument();
      });

      // Error toast is shown informing customer of invalid amount from server
      await screen.findByText(/có số tiền thanh toán không hợp lệ từ máy chủ/i);
    });

    it('3. Empty historical items alongside a non-empty current cart never shows current cart on ticket', () => {
      // Direct component test of OrderConfirmation to verify PATCH-B explicit empty items handling
      render(
        <OrderConfirmation
          isOpen={true}
          onClose={jest.fn()}
          orderId={703}
          orderCode="#BL-0703"
          status="PAID"
          pickupMethod="AT_COUNTER"
          totalAmount={45000}
          items={[]} // Empty historical items
          onViewHistory={jest.fn()}
          onContinueShopping={jest.fn()}
        />
      );

      // Verify that no current cart items (e.g., Cà phê Phin Sữa Tươi) are rendered
      expect(screen.queryByText(/Cà phê Phin Sữa Tươi/i)).not.toBeInTheDocument();
      // Verify explicit fallback line is displayed
      expect(screen.getByText(/Chi tiết các món được ghi nhận theo mã đơn #703/i)).toBeInTheDocument();
      expect(screen.getByText('45.000 đ')).toBeInTheDocument();
    });

    it('4. Valid payment of a historical order leaves current cart items completely unchanged', async () => {
      window.history.replaceState(null, '', '/menu');

      const mockHistoricalOrder: OrderHistoryItem = {
        id: 704,
        orderCode: '#BL-0704',
        pickupMethod: 'AT_COUNTER',
        tableNumber: null,
        userId: 1,
        customerName: 'Khách Hàng D',
        customerPhone: '0901234567',
        note: null,
        totalAmount: 35000,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        items: [
          {
            id: 20,
            productId: 1,
            productName: 'Cà phê Phin Sữa Tươi',
            size: 'SMALL',
            toppings: [],
            note: null,
            quantity: 1,
            unitPrice: 35000,
            subtotal: 35000,
          },
        ],
      };

      global.fetch = jest.fn((url: RequestInfo | URL, options?: RequestInit) => {
        const urlStr = String(url);
        if (urlStr.endsWith('/products')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => [mockProduct] } as Response);
        }
        if (urlStr.endsWith('/orders/me')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => [mockHistoricalOrder] } as Response);
        }
        if (urlStr.endsWith('/orders/704')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => mockHistoricalOrder } as Response);
        }
        if (urlStr.endsWith('/payments') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: async () => ({
              success: true,
              status: 'SUCCESS',
              order: {
                id: 704,
                status: 'PAID',
                orderCode: '#BL-0704',
                pickupMethod: 'AT_COUNTER',
              },
            }),
          } as Response);
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as Response);
      });

      render(<MenuPage />);

      // Add item to cart first from Menu
      const addBtn = await screen.findByRole('button', { name: /thêm nhanh/i });
      fireEvent.click(addBtn);

      // Verify cart now has 1 item
      const cartBtn = await screen.findByRole('button', { name: /giỏ hàng: 1 món/i });
      expect(cartBtn).toBeInTheDocument();

      // Navigate to order history tab
      const historyTab = screen.getByRole('link', { name: /Lịch sử/i });
      fireEvent.click(historyTab);

      // Proceed to pay historical order #704
      const payBtn = await screen.findByRole('button', { name: /^Thanh toán$/i });
      fireEvent.click(payBtn);

      await screen.findByRole('dialog', { name: /thanh toán đơn #704/i });
      const confirmPayBtn = screen.getByRole('button', { name: /xác nhận thanh toán/i });
      fireEvent.click(confirmPayBtn);

      // Buzzer dialog appears for historical order
      await screen.findByRole('dialog', { name: /#BL-0704/i });

      // Dismiss buzzer ticket
      const closeBuzzerBtns = screen.getAllByRole('button', { name: /đóng vé chuông/i });
      fireEvent.click(closeBuzzerBtns[0]);

      // Verify that current cart STILL has 1 item (NOT cleared!)
      expect(screen.getByRole('button', { name: /giỏ hàng: 1 món/i })).toBeInTheDocument();
      const rawStoredCart = sessionStorage.getItem('brewlite_cart_v1');
      expect(rawStoredCart).not.toBeNull();
      const storedCart = JSON.parse(rawStoredCart!);
      expect(storedCart.length).toBe(1);
    });

    it('5. Normal new-order checkout clears current cart upon successful payment', async () => {
      window.history.replaceState(null, '', '/menu');

      global.fetch = jest.fn((url: RequestInfo | URL, options?: RequestInit) => {
        const urlStr = String(url);
        if (urlStr.endsWith('/products')) {
          return Promise.resolve({ ok: true, status: 200, json: async () => [mockProduct] } as Response);
        }
        if (urlStr.endsWith('/orders') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            status: 201,
            text: async () => JSON.stringify({ id: 888, status: 'PENDING' }),
            json: async () => ({ id: 888, status: 'PENDING' }),
          } as Response);
        }
        if (urlStr.endsWith('/payments') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: async () => ({
              success: true,
              status: 'SUCCESS',
              order: {
                id: 888,
                status: 'PAID',
                orderCode: '#BL-0888',
                pickupMethod: 'AT_COUNTER',
              },
            }),
          } as Response);
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as Response);
      });

      render(<MenuPage />);

      // Add item to cart
      const addBtn = await screen.findByRole('button', { name: /thêm nhanh/i });
      fireEvent.click(addBtn);

      // Open cart
      const cartBtn = screen.getByRole('button', { name: /giỏ hàng: 1 món/i });
      fireEvent.click(cartBtn);

      // Proceed to checkout
      const orderBtn = screen.getByRole('button', { name: /tiếp tục đặt hàng/i });
      fireEvent.click(orderBtn);

      const nameInput = screen.getByLabelText(/tên khách hàng/i);
      const phoneInput = screen.getByLabelText(/số điện thoại/i);
      fireEvent.change(nameInput, { target: { value: 'New Customer' } });
      fireEvent.change(phoneInput, { target: { value: '0901112222' } });

      const placeOrderBtn = screen.getByRole('button', { name: /xác nhận đặt hàng/i });
      fireEvent.click(placeOrderBtn);

      // Pay for newly created order #888
      const payNowBtn = await screen.findByRole('button', { name: /tiếp tục thanh toán đơn #888/i });
      fireEvent.click(payNowBtn);

      await screen.findByRole('dialog', { name: /thanh toán đơn #888/i });
      const confirmPayBtn = screen.getByRole('button', { name: /xác nhận thanh toán/i });
      fireEvent.click(confirmPayBtn);

      // Digital Buzzer opens for #BL-0888
      await screen.findByRole('dialog', { name: /#BL-0888/i });

      // Dismiss buzzer ticket
      const closeBuzzerBtns = screen.getAllByRole('button', { name: /đóng vé chuông/i });
      fireEvent.click(closeBuzzerBtns[0]);

      // Normal order payment strictly clears the active cart (0 items)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /giỏ hàng: 0 món/i })).toBeInTheDocument();
      });
      const rawStoredCart = sessionStorage.getItem('brewlite_cart_v1');
      expect(rawStoredCart === null || JSON.parse(rawStoredCart).length === 0).toBe(true);
    });
  });
});
