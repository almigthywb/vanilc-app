import { useSyncExternalStore } from "react";

export interface CartItem {
  id: string; // unique line id
  productId: string;
  name: string;
  unitPrice: number;
  qty: number;
  image?: string | null;
  weightLabel?: string | null;
  notes?: string;
}

const STORAGE_KEY = "vanilc-cart-v1";

let items: CartItem[] = [];
const listeners = new Set<() => void>();

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) items = JSON.parse(raw);
  } catch {
    items = [];
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

let initialized = false;
function ensureInit() {
  if (initialized) return;
  initialized = true;
  load();
}

export const cart = {
  add(item: Omit<CartItem, "id" | "qty"> & { qty?: number }) {
    ensureInit();
    const qty = item.qty ?? 1;
    const existing = items.find((i) => i.productId === item.productId && !i.notes);
    if (existing) {
      existing.qty += qty;
    } else {
      items = [
        ...items,
        {
          ...item,
          qty,
          id: crypto.randomUUID(),
        },
      ];
    }
    emit();
  },
  remove(id: string) {
    items = items.filter((i) => i.id !== id);
    emit();
  },
  setQty(id: string, qty: number) {
    if (qty <= 0) {
      cart.remove(id);
      return;
    }
    items = items.map((i) => (i.id === id ? { ...i, qty } : i));
    emit();
  },
  clear() {
    items = [];
    emit();
  },
  getItems(): CartItem[] {
    ensureInit();
    return items;
  },
};

export function useCart(): CartItem[] {
  return useSyncExternalStore(
    (cb) => {
      ensureInit();
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => items,
    () => [],
  );
}

export function cartSubtotal(list: CartItem[]): number {
  return list.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
}

export function cartCount(list: CartItem[]): number {
  return list.reduce((sum, i) => sum + i.qty, 0);
}
