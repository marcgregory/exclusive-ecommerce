import "dotenv/config";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import {
  currentStore,
  findProduct,
  getSessionUser,
  getUserCart,
  getWishlist,
  loadStore,
  publicUser,
  saveStore,
  toCartResponse
} from "./store.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const webOrigin = process.env.WEB_ORIGIN || "http://127.0.0.1:5173";

app.use(cors({ origin: webOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    name: "exclusive.sid",
    secret: process.env.SESSION_SECRET || "exclusive-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 14
    }
  })
);

type AuthedRequest = Request & { user?: ReturnType<typeof getSessionUser> };

const asyncRoute = (handler: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<unknown> | unknown) => {
  return (req: AuthedRequest, res: Response, next: NextFunction) => Promise.resolve(handler(req, res, next)).catch(next);
};

function requireUser(req: AuthedRequest, res: Response, next: NextFunction) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ message: "Authentication required" });
  req.user = user;
  next();
}

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "exclusive-api" }));

app.post("/api/auth/register", asyncRoute(async (req, res) => {
  const state = currentStore();
  const { firstName = "", lastName = "", email, password, address = "" } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
  if (state.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) return res.status(409).json({ message: "Email already registered" });
  const user = {
    id: `user-${Date.now()}`,
    firstName,
    lastName,
    email,
    address,
    passwordHash: await bcrypt.hash(password, 10)
  };
  state.users.push(user);
  req.session.userId = user.id;
  await saveStore();
  res.status(201).json({ user: publicUser(user) });
}));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const { email, password } = req.body;
  const user = currentStore().users.find((entry) => entry.email.toLowerCase() === String(email || "").toLowerCase());
  if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) return res.status(401).json({ message: "Invalid credentials" });
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
}));

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", requireUser, (req, res) => res.json({ user: publicUser(req.user) }));

app.patch("/api/me", requireUser, asyncRoute(async (req, res) => {
  const allowed = ["firstName", "lastName", "email", "address"];
  allowed.forEach((field) => {
    if (typeof req.body[field] === "string") req.user[field] = req.body[field];
  });
  if (req.body.password) req.user.passwordHash = await bcrypt.hash(req.body.password, 10);
  await saveStore();
  res.json({ user: publicUser(req.user) });
}));

app.get("/api/categories", (_req, res) => res.json({ categories: currentStore().categories }));

app.get("/api/products", (req, res) => {
  const { category, q, flag, sort = "featured", page = "1", limit = "24" } = req.query;
  let products = [...currentStore().products];
  if (category) products = products.filter((product) => product.category === category);
  if (flag) products = products.filter((product) => product.flags.includes(String(flag)));
  if (q) {
    const query = String(q).toLowerCase();
    products = products.filter((product) => `${product.name} ${product.description}`.toLowerCase().includes(query));
  }
  if (sort === "price-asc") products.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") products.sort((a, b) => b.price - a.price);
  if (sort === "rating") products.sort((a, b) => b.rating - a.rating);
  const pageNumber = Math.max(1, Number(page));
  const pageSize = Math.max(1, Number(limit));
  const total = products.length;
  const pagedProducts = products.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
  res.json({ products: pagedProducts, total, page: pageNumber, limit: pageSize });
});

app.get("/api/products/:id", (req, res) => {
  const product = findProduct(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  const related = currentStore().products.filter((entry) => entry.id !== product.id && (entry.category === product.category || entry.flags.includes("related"))).slice(0, 4);
  res.json({ product, related });
});

app.get("/api/cart", requireUser, (req, res) => {
  res.json({ cart: toCartResponse(getUserCart(req.user.id), req.query.coupon ? String(req.query.coupon) : undefined) });
});

app.post("/api/cart/items", requireUser, asyncRoute(async (req, res) => {
  const { productId, quantity = 1, selectedColor = "", selectedSize = "" } = req.body;
  const product = findProduct(productId);
  if (!product) return res.status(404).json({ message: "Product not found" });
  const cart = getUserCart(req.user.id);
  const existing = cart.items.find((item) => item.productId === productId && item.selectedColor === selectedColor && item.selectedSize === selectedSize);
  if (existing) existing.quantity += Number(quantity);
  else cart.items.push({ id: `ci-${Date.now()}`, productId, quantity: Number(quantity), selectedColor, selectedSize });
  await saveStore();
  res.status(201).json({ cart: toCartResponse(cart) });
}));

app.patch("/api/cart/items/:id", requireUser, asyncRoute(async (req, res) => {
  const cart = getUserCart(req.user.id);
  const item = cart.items.find((entry) => entry.id === req.params.id);
  if (!item) return res.status(404).json({ message: "Cart item not found" });
  item.quantity = Math.max(1, Number(req.body.quantity || item.quantity));
  await saveStore();
  res.json({ cart: toCartResponse(cart) });
}));

app.delete("/api/cart/items/:id", requireUser, asyncRoute(async (req, res) => {
  const cart = getUserCart(req.user.id);
  cart.items = cart.items.filter((entry) => entry.id !== req.params.id);
  await saveStore();
  res.json({ cart: toCartResponse(cart) });
}));

app.get("/api/wishlist", requireUser, (req, res) => {
  const wishlist = getWishlist(req.user.id);
  res.json({ products: wishlist.productIds.map(findProduct).filter(Boolean) });
});

app.post("/api/wishlist/:productId", requireUser, asyncRoute(async (req, res) => {
  if (!findProduct(req.params.productId)) return res.status(404).json({ message: "Product not found" });
  const wishlist = getWishlist(req.user.id);
  if (!wishlist.productIds.includes(req.params.productId)) wishlist.productIds.push(req.params.productId);
  await saveStore();
  res.status(201).json({ products: wishlist.productIds.map(findProduct).filter(Boolean) });
}));

app.delete("/api/wishlist/:productId", requireUser, asyncRoute(async (req, res) => {
  const wishlist = getWishlist(req.user.id);
  wishlist.productIds = wishlist.productIds.filter((id) => id !== req.params.productId);
  await saveStore();
  res.json({ products: wishlist.productIds.map(findProduct).filter(Boolean) });
}));

app.post("/api/coupons/validate", (req, res) => {
  const coupon = currentStore().coupons.find((entry) => entry.code.toUpperCase() === String(req.body.code || "").toUpperCase() && entry.active);
  if (!coupon) return res.status(404).json({ valid: false, message: "Coupon code is not valid" });
  res.json({ valid: true, coupon });
});

app.post("/api/orders", requireUser, asyncRoute(async (req, res) => {
  const state = currentStore();
  const cart = getUserCart(req.user.id);
  const totals = toCartResponse(cart, req.body.couponCode);
  if (!totals.items.length) return res.status(400).json({ message: "Cart is empty" });
  const required = ["firstName", "streetAddress", "townCity", "phone", "email"];
  const missing = required.filter((field) => !req.body.billing?.[field]);
  if (missing.length) return res.status(400).json({ message: `Missing billing fields: ${missing.join(", ")}` });
  const order = {
    id: `order-${Date.now()}`,
    userId: req.user.id,
    items: totals.items.map(({ product, ...item }) => ({ ...item, name: product.name, price: product.price })),
    billing: req.body.billing,
    paymentMethod: req.body.paymentMethod || "bank",
    subtotal: totals.subtotal,
    discount: totals.discount,
    shipping: totals.shipping,
    total: totals.total,
    status: "processing",
    createdAt: new Date().toISOString()
  };
  state.orders.push(order);
  cart.items = [];
  await saveStore();
  res.status(201).json({ order });
}));

app.get("/api/orders", requireUser, (req, res) => {
  res.json({ orders: currentStore().orders.filter((order) => order.userId === req.user.id) });
});

app.get("/api/orders/:id", requireUser, (req, res) => {
  const order = currentStore().orders.find((entry) => entry.id === req.params.id && entry.userId === req.user.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json({ order });
});

app.post("/api/contact", asyncRoute(async (req, res) => {
  const { name, email, phone = "", message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ message: "Name, email, and message are required" });
  const contactMessage = { id: `msg-${Date.now()}`, name, email, phone, message, status: "new", createdAt: new Date().toISOString() };
  currentStore().contactMessages.push(contactMessage);
  await saveStore();
  res.status(201).json({ message: "Message received", contactMessage });
}));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Something went wrong" });
});

await loadStore();
app.listen(port, () => {
  console.log(`Exclusive API listening on http://127.0.0.1:${port}`);
});
