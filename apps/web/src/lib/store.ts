import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ProductSize = 'SMALL' | 'MEDIUM' | 'LARGE';

export interface CartItem {
  id: string; // unique item id based on productId + size + sorted toppings
  productId: string;
  name: string;
  imageUrl: string;
  basePrice: number;
  size: ProductSize;
  toppings: string[];
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  loyaltyPoints: number;
}

interface AppState {
  // Cart State
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'id' | 'lineTotal'>) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  getCartSubtotal: () => number;
  getCartTotalCount: () => number;

  // Auth State
  token: string | null;
  user: UserProfile | null;
  setAuth: (token: string, user: UserProfile) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      cart: [],
      token: null,
      user: null,

      addToCart: (item) => {
        const sortedToppings = [...item.toppings].sort();
        const id = `${item.productId}-${item.size}-${sortedToppings.join('-')}`;
        const existingIndex = get().cart.findIndex((i) => i.id === id);

        if (existingIndex > -1) {
          const updated = [...get().cart];
          const current = updated[existingIndex];
          const newQty = current.quantity + item.quantity;
          updated[existingIndex] = {
            ...current,
            quantity: newQty,
            lineTotal: current.unitPrice * newQty,
          };
          set({ cart: updated });
        } else {
          const newItem: CartItem = {
            ...item,
            id,
            toppings: sortedToppings,
            lineTotal: item.unitPrice * item.quantity,
          };
          set({ cart: [...get().cart, newItem] });
        }
      },

      updateQuantity: (id, delta) => {
        const updated = get()
          .cart.map((item) => {
            if (item.id === id) {
              const newQty = item.quantity + delta;
              if (newQty <= 0) return null;
              return {
                ...item,
                quantity: newQty,
                lineTotal: item.unitPrice * newQty,
              };
            }
            return item;
          })
          .filter(Boolean) as CartItem[];

        set({ cart: updated });
      },

      removeFromCart: (id) => {
        set({ cart: get().cart.filter((item) => item.id !== id) });
      },

      clearCart: () => {
        set({ cart: [] });
      },

      getCartSubtotal: () => {
        return get().cart.reduce((sum, item) => sum + item.lineTotal, 0);
      },

      getCartTotalCount: () => {
        return get().cart.reduce((sum, item) => sum + item.quantity, 0);
      },

      setAuth: (token, user) => {
        set({ token, user });
      },

      logout: () => {
        set({ token: null, user: null });
      },
    }),
    {
      name: 'brewlite_storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : ({} as any),
      ),
    },
  ),
);

