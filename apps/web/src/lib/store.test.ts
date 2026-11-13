import { useAppStore } from './store';
import { Product } from './api-client';

describe('App Zustand Store (Cart & Auth)', () => {
  beforeEach(() => {
    // Reset store before each test
    useAppStore.setState({
      cart: [],
      token: null,
      user: null,
    });
  });

  describe('Cart Management', () => {
    const mockProduct1: Product = {
      id: 'p1',
      name: 'Cà phê Muối',
      slug: 'ca-phe-muoi',
      basePrice: 35000,
      category: 'COFFEE',
      stock: 10,
      isAvailable: true,
      description: 'Cà phê muối xứ Huế',
    };

    const mockProduct2: Product = {
      id: 'p2',
      name: 'Trà Sữa Ô Long',
      slug: 'tra-sua-o-long',
      basePrice: 40000,
      category: 'TEA',
      stock: 10,
      isAvailable: true,
      description: 'Trà sữa đậm vị',
    };

    it('starts with an empty cart and count = 0', () => {
      const state = useAppStore.getState();
      expect(state.cart).toHaveLength(0);
      expect(state.getCartTotalCount()).toBe(0);
      expect(state.getCartSubtotal()).toBe(0);
    });

    it('adds an item to cart and calculates subtotal correctly', () => {
      const { addToCart } = useAppStore.getState();

      addToCart({
        productId: mockProduct1.id,
        product: mockProduct1,
        size: 'MEDIUM',
        toppings: ['Trân châu đen'],
        unitPrice: 49000,
        quantity: 1,
      });

      const state = useAppStore.getState();
      expect(state.cart).toHaveLength(1);
      expect(state.getCartTotalCount()).toBe(1);
      expect(state.getCartSubtotal()).toBe(49000);
    });

    it('merges identical items (same product, size, and toppings) by increasing quantity', () => {
      const { addToCart } = useAppStore.getState();

      addToCart({
        productId: mockProduct1.id,
        product: mockProduct1,
        size: 'MEDIUM',
        toppings: ['Trân châu đen'],
        unitPrice: 49000,
        quantity: 1,
      });
      addToCart({
        productId: mockProduct1.id,
        product: mockProduct1,
        size: 'MEDIUM',
        toppings: ['Trân châu đen'],
        unitPrice: 49000,
        quantity: 2,
      });

      const state = useAppStore.getState();
      expect(state.cart).toHaveLength(1);
      expect(state.cart[0].quantity).toBe(3);
      expect(state.getCartTotalCount()).toBe(3);
      expect(state.getCartSubtotal()).toBe(49000 * 3);
    });

    it('keeps items separate when size or toppings differ', () => {
      const { addToCart } = useAppStore.getState();

      // Same product, different size
      addToCart({
        productId: mockProduct1.id,
        product: mockProduct1,
        size: 'SMALL',
        toppings: ['Trân châu đen'],
        unitPrice: 43000,
        quantity: 1,
      });
      addToCart({
        productId: mockProduct1.id,
        product: mockProduct1,
        size: 'LARGE',
        toppings: ['Trân châu đen'],
        unitPrice: 55000,
        quantity: 1,
      });

      // Different product
      addToCart({
        productId: mockProduct2.id,
        product: mockProduct2,
        size: 'SMALL',
        toppings: [],
        unitPrice: 40000,
        quantity: 1,
      });

      const state = useAppStore.getState();
      expect(state.cart).toHaveLength(3);
      expect(state.getCartTotalCount()).toBe(3);
      expect(state.getCartSubtotal()).toBe(43000 + 55000 + 40000);
    });

    it('updates item quantity and removes item when quantity reaches 0', () => {
      const { addToCart, updateQuantity } = useAppStore.getState();

      addToCart({
        productId: mockProduct1.id,
        product: mockProduct1,
        size: 'SMALL',
        toppings: [],
        unitPrice: 35000,
        quantity: 2,
      });
      const cartItemId = useAppStore.getState().cart[0].id;

      updateQuantity(cartItemId, 3); // 2 + 3 = 5
      expect(useAppStore.getState().cart[0].quantity).toBe(5);
      expect(useAppStore.getState().cart[0].lineTotal).toBe(35000 * 5);

      updateQuantity(cartItemId, -5); // 5 - 5 = 0 -> removed
      expect(useAppStore.getState().cart).toHaveLength(0);
    });

    it('removes specific item using removeFromCart', () => {
      const { addToCart, removeFromCart } = useAppStore.getState();

      addToCart({
        productId: mockProduct1.id,
        product: mockProduct1,
        size: 'SMALL',
        toppings: [],
        unitPrice: 35000,
        quantity: 1,
      });
      addToCart({
        productId: mockProduct2.id,
        product: mockProduct2,
        size: 'LARGE',
        toppings: [],
        unitPrice: 50000,
        quantity: 2,
      });

      const itemId = useAppStore.getState().cart[0].id;
      removeFromCart(itemId);

      const state = useAppStore.getState();
      expect(state.cart).toHaveLength(1);
      expect(state.cart[0].product.id).toBe('p2');
    });

    it('clears entire cart using clearCart', () => {
      const { addToCart, clearCart } = useAppStore.getState();

      addToCart({
        productId: mockProduct1.id,
        product: mockProduct1,
        size: 'SMALL',
        toppings: [],
        unitPrice: 35000,
        quantity: 2,
      });
      addToCart({
        productId: mockProduct2.id,
        product: mockProduct2,
        size: 'LARGE',
        toppings: [],
        unitPrice: 50000,
        quantity: 1,
      });

      clearCart();
      expect(useAppStore.getState().cart).toHaveLength(0);
      expect(useAppStore.getState().getCartTotalCount()).toBe(0);
    });
  });

  describe('Auth Session Management', () => {
    it('sets and clears authentication tokens and profile', () => {
      const { setAuth, logout } = useAppStore.getState();

      const mockUser = {
        id: 'u1',
        email: 'customer@brewlite.com',
        fullName: 'Nguyễn Văn A',
        role: 'CUSTOMER',
        loyaltyPoints: 120,
      };

      setAuth('fake-jwt-token', mockUser);

      let state = useAppStore.getState();
      expect(state.token).toBe('fake-jwt-token');
      expect(state.user).toEqual(mockUser);

      logout();

      state = useAppStore.getState();
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
    });
  });
});
