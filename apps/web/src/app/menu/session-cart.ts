import { useMemo, useSyncExternalStore } from "react";

export interface CartItem {
  key: string;
  productId: number;
  productName: string;
  basePrice: number;
  size: "SMALL" | "MEDIUM" | "LARGE";
  toppings: string[];
  note: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

const storageKey = "brewlite_cart_v1";
const emptyCart: CartItem[] = [];
const serverSnapshot = () => emptyCart;

function isCartItem(item: Partial<CartItem> | null): item is CartItem {
  return !!item && typeof item.key === "string" && typeof item.productName === "string" &&
    typeof item.note === "string" && Number.isInteger(item.productId) &&
    Number.isInteger(item.quantity) && Number(item.quantity) > 0 &&
    Number.isFinite(item.basePrice) && Number.isFinite(item.unitPrice) && Number.isFinite(item.subtotal) &&
    ["SMALL", "MEDIUM", "LARGE"].includes(item.size ?? "") &&
    Array.isArray(item.toppings) && item.toppings.every(value => typeof value === "string");
}

function createCartStore() {
  let items: CartItem[] | undefined;
  const listeners = new Set<() => void>();

  function getSnapshot() {
    if (items === undefined) {
      try {
        const saved = JSON.parse(window.sessionStorage.getItem(storageKey) ?? "[]");
        items = Array.isArray(saved) && saved.every(isCartItem) ? saved : emptyCart;
      } catch {
        items = emptyCart;
      }
    }
    return items;
  }

  function update(action: CartItem[] | ((previous: CartItem[]) => CartItem[])) {
    items = typeof action === "function" ? action(getSnapshot()) : action;
    try {
      if (items.length) window.sessionStorage.setItem(storageKey, JSON.stringify(items));
      else window.sessionStorage.removeItem(storageKey);
    } catch {
      // Keep the current tab usable when browser storage is unavailable.
    }
    listeners.forEach(notify => notify());
  }

  function subscribe(notify: () => void) {
    listeners.add(notify);
    return () => { listeners.delete(notify); };
  }

  return { getSnapshot, update, subscribe };
}

export function useSessionCart() {
  const store = useMemo(() => createCartStore(), []);
  const items = useSyncExternalStore(store.subscribe, store.getSnapshot, serverSnapshot);
  return [items, store.update] as const;
}
