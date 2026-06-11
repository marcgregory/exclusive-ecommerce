import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Cart, CartItem, Product } from '../types';

const CART_STORAGE_KEY = 'exclusive.cart.v1';
const FREE_SHIPPING_THRESHOLD = 5000;
const SHIPPING_FEE = 500;

type AddLocalCartItemInput = {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  selectedOptions?: Record<string, string>;
  unitPrice?: number;
  variantId?: string;
  sku?: string;
  stock?: number;
};

type LocalCartState = Cart & {
  isDrawerOpen: boolean;
  message: string;
};

const emptyState: LocalCartState = {
  items: [],
  subtotal: 0,
  discount: 0,
  shipping: 0,
  total: 0,
  isDrawerOpen: false,
  message: '',
};

function normalizeOptions(options: Record<string, string> = {}) {
  return Object.fromEntries(
    Object.entries(options)
      .filter(([, value]) => value.trim())
      .sort(([a], [b]) => a.localeCompare(b))
  );
}

function getLineKey(
  productId: string,
  selectedColor = '',
  selectedSize = '',
  selectedOptions: Record<string, string> = {}
) {
  return JSON.stringify({
    productId,
    selectedColor,
    selectedSize,
    selectedOptions: normalizeOptions(selectedOptions),
  });
}

function calculateCart(items: CartItem[]) {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  return {
    subtotal,
    shipping,
    discount: 0,
    total: Math.max(0, subtotal + shipping),
  };
}

function recalculate(state: LocalCartState) {
  for (const item of state.items) {
    const unitPrice = item.unitPrice ?? item.product.price;
    item.lineTotal = unitPrice * item.quantity;
  }
  const totals = calculateCart(state.items);
  state.subtotal = totals.subtotal;
  state.shipping = totals.shipping;
  state.discount = totals.discount;
  state.total = totals.total;
}

function safeParseCart(): Cart | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cart;
    if (!Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function loadInitialState(): LocalCartState {
  const saved = safeParseCart();
  if (!saved) return emptyState;
  const items = saved.items.map((item) => ({
    ...item,
    selectedOptions: normalizeOptions({
      ...(item.selectedColor ? { Color: item.selectedColor } : {}),
      ...(item.selectedSize ? { Size: item.selectedSize } : {}),
      ...(item.selectedOptions ?? {}),
    }),
    unitPrice: item.unitPrice ?? item.product.price,
    lineTotal: (item.unitPrice ?? item.product.price) * item.quantity,
  }));
  const totals = calculateCart(items);
  return { ...emptyState, items, ...totals };
}

const initialState = loadInitialState();

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<AddLocalCartItemInput>) => {
      const {
        product,
        quantity,
        selectedColor = '',
        selectedSize = '',
        selectedOptions = {},
        unitPrice = product.price,
        variantId,
        sku,
        stock,
      } = action.payload;
      const normalizedOptions = normalizeOptions({
        ...(selectedColor ? { Color: selectedColor } : {}),
        ...(selectedSize ? { Size: selectedSize } : {}),
        ...selectedOptions,
      });
      const key = getLineKey(product.id, selectedColor, selectedSize, normalizedOptions);
      const existing = state.items.find(
        (item) =>
          getLineKey(
            item.productId,
            item.selectedColor,
            item.selectedSize,
            item.selectedOptions
          ) === key
      );

      if (existing) {
        const nextQuantity =
          typeof stock === 'number'
            ? Math.min(existing.quantity + quantity, stock)
            : existing.quantity + quantity;
        existing.quantity = Math.max(1, nextQuantity);
        existing.unitPrice = unitPrice;
        existing.lineTotal = existing.quantity * unitPrice;
      } else {
        const safeQuantity = typeof stock === 'number' ? Math.min(quantity, stock) : quantity;
        state.items.push({
          id: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          productId: product.id,
          product,
          quantity: Math.max(1, safeQuantity),
          selectedColor,
          selectedSize,
          selectedOptions: normalizedOptions,
          unitPrice,
          lineTotal: unitPrice * Math.max(1, safeQuantity),
          ...(variantId ? { variantId } : {}),
          ...(sku ? { sku } : {}),
        } as CartItem);
      }

      state.isDrawerOpen = true;
      state.message = `${product.name} added to cart`;
      recalculate(state);
    },
    updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const item = state.items.find((entry) => entry.id === action.payload.id);
      if (!item) return;
      item.quantity = Math.max(1, action.payload.quantity);
      recalculate(state);
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      recalculate(state);
    },
    clearCart: (state) => {
      state.items = [];
      state.message = 'Cart cleared';
      recalculate(state);
    },
    openCartDrawer: (state) => {
      state.isDrawerOpen = true;
    },
    closeCartDrawer: (state) => {
      state.isDrawerOpen = false;
    },
    clearCartMessage: (state) => {
      state.message = '';
    },
  },
});

export const {
  addItem,
  updateQuantity,
  removeItem,
  clearCart,
  openCartDrawer,
  closeCartDrawer,
  clearCartMessage,
} = cartSlice.actions;

export function persistCart(cart: Cart) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify({
      items: cart.items,
      subtotal: cart.subtotal,
      discount: cart.discount,
      shipping: cart.shipping,
      total: cart.total,
    })
  );
}
