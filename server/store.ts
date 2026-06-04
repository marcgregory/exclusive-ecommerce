import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInitialStore } from "./seed.js";
import type { Cart, CartResponse, Product, StoreState, User } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "store.json");

let store: StoreState | undefined;

export async function loadStore(): Promise<StoreState> {
  if (store) return store;
  await fs.mkdir(dataDir, { recursive: true });
  try {
    const raw = await fs.readFile(dataFile, "utf8");
    store = JSON.parse(raw);
  } catch {
    store = createInitialStore();
    await saveStore();
  }
  return store;
}

export async function saveStore(): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(store, null, 2));
}

export function currentStore(): StoreState {
  if (!store) throw new Error("Store has not been loaded");
  return store;
}

export function publicUser(user?: User | null) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export function getSessionUser(req: { session?: { userId?: string } }): User | undefined {
  const state = currentStore();
  const userId = req.session?.userId || "demo-user";
  return state.users.find((user) => user.id === userId) || state.users[0];
}

export function findProduct(productId: string): Product | undefined {
  return currentStore().products.find((product) => product.id === productId);
}

export function getUserCart(userId: string): Cart {
  const state = currentStore();
  let cart = state.carts.find((entry) => entry.userId === userId);
  if (!cart) {
    cart = { id: `cart-${Date.now()}`, userId, items: [] };
    state.carts.push(cart);
  }
  return cart;
}

export function getWishlist(userId: string) {
  const state = currentStore();
  let wishlist = state.wishlists.find((entry) => entry.userId === userId);
  if (!wishlist) {
    wishlist = { userId, productIds: [] };
    state.wishlists.push(wishlist);
  }
  return wishlist;
}

export function toCartResponse(cart: Cart, couponCode?: string): CartResponse {
  const items = cart.items
    .map((item) => {
      const product = findProduct(item.productId);
      if (!product) return null;
      const lineTotal = product.price * item.quantity;
      return { ...item, product, lineTotal };
    })
    .filter(Boolean);
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const coupon = couponCode ? currentStore().coupons.find((entry) => entry.code.toUpperCase() === couponCode.toUpperCase() && entry.active) : null;
  const discount = coupon ? (coupon.type === "percent" ? Math.round(subtotal * (coupon.amount / 100)) : coupon.amount) : 0;
  const shipping = subtotal > 0 && subtotal < 500 ? 16 : 0;
  const total = Math.max(0, subtotal - discount + shipping);
  return { id: cart.id, items, subtotal, discount, shipping, total, coupon: coupon || null };
}
