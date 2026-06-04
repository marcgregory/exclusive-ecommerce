import "dotenv/config";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import {
  addCartItem,
  addWishlistProduct,
  createContactMessage,
  createOrder,
  createUser,
  deleteCartItem,
  deleteWishlistProduct,
  findProduct,
  findUserByEmail,
  getSessionUser,
  getUserCart,
  getRelatedProducts,
  getOrder,
  getWishlistProducts,
  loadStore,
  listCategories,
  listOrders,
  listProducts,
  publicUser,
  updateCartItem,
  updateUser,
  validateCoupon,
  toCartResponse
} from "./store.js";
import { closePool } from "./db.js";

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

type AuthedRequest = Request & { user?: Awaited<ReturnType<typeof getSessionUser>> };

const asyncRoute = (handler: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<unknown> | unknown) => {
  return (req: AuthedRequest, res: Response, next: NextFunction) => Promise.resolve(handler(req, res, next)).catch(next);
};

const requireUser = asyncRoute(async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ message: "Authentication required" });
  req.user = user;
  next();
});

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "exclusive-api" }));

app.post("/api/auth/register", asyncRoute(async (req, res) => {
  const { firstName = "", lastName = "", email, password, address = "" } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
  if (await findUserByEmail(email)) return res.status(409).json({ message: "Email already registered" });
  const user = await createUser({
    firstName,
    lastName,
    email,
    address,
    passwordHash: await bcrypt.hash(password, 10)
  });
  req.session.userId = user.id;
  res.status(201).json({ user: publicUser(user) });
}));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const { email, password } = req.body;
  const user = await findUserByEmail(String(email || ""));
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
  const updates: Record<string, string> = {};
  allowed.forEach((field) => {
    if (typeof req.body[field] === "string") updates[field] = req.body[field];
  });
  if (req.body.password) updates.passwordHash = await bcrypt.hash(req.body.password, 10);
  const user = await updateUser(req.user.id, updates);
  res.json({ user: publicUser(user) });
}));

app.get("/api/categories", asyncRoute(async (_req, res) => res.json({ categories: await listCategories() })));

app.get("/api/products", asyncRoute(async (req, res) => {
  const { category, q, flag, sort = "featured", page = "1", limit = "24" } = req.query;
  const result = await listProducts({
    category: category ? String(category) : undefined,
    q: q ? String(q) : undefined,
    flag: flag ? String(flag) : undefined,
    sort: String(sort),
    page: Number(page),
    limit: Number(limit)
  });
  res.json(result);
}));

app.get("/api/products/:id", asyncRoute(async (req, res) => {
  const product = await findProduct(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  const related = await getRelatedProducts(product);
  res.json({ product, related });
}));

app.get("/api/cart", requireUser, asyncRoute(async (req, res) => {
  res.json({ cart: await toCartResponse(await getUserCart(req.user.id), req.query.coupon ? String(req.query.coupon) : undefined) });
}));

app.post("/api/cart/items", requireUser, asyncRoute(async (req, res) => {
  const { productId, quantity = 1, selectedColor = "", selectedSize = "" } = req.body;
  const cart = await addCartItem(req.user.id, { productId, quantity: Number(quantity), selectedColor, selectedSize });
  res.status(201).json({ cart });
}));

app.patch("/api/cart/items/:id", requireUser, asyncRoute(async (req, res) => {
  const cart = await updateCartItem(req.user.id, req.params.id, Number(req.body.quantity));
  if (!cart) return res.status(404).json({ message: "Cart item not found" });
  res.json({ cart });
}));

app.delete("/api/cart/items/:id", requireUser, asyncRoute(async (req, res) => {
  res.json({ cart: await deleteCartItem(req.user.id, req.params.id) });
}));

app.get("/api/wishlist", requireUser, asyncRoute(async (req, res) => {
  res.json({ products: await getWishlistProducts(req.user.id) });
}));

app.post("/api/wishlist/:productId", requireUser, asyncRoute(async (req, res) => {
  res.status(201).json({ products: await addWishlistProduct(req.user.id, req.params.productId) });
}));

app.delete("/api/wishlist/:productId", requireUser, asyncRoute(async (req, res) => {
  res.json({ products: await deleteWishlistProduct(req.user.id, req.params.productId) });
}));

app.post("/api/coupons/validate", asyncRoute(async (req, res) => {
  const coupon = await validateCoupon(String(req.body.code || ""));
  if (!coupon) return res.status(404).json({ valid: false, message: "Coupon code is not valid" });
  res.json({ valid: true, coupon });
}));

app.post("/api/orders", requireUser, asyncRoute(async (req, res) => {
  const required = ["firstName", "streetAddress", "townCity", "phone", "email"];
  const missing = required.filter((field) => !req.body.billing?.[field]);
  if (missing.length) return res.status(400).json({ message: `Missing billing fields: ${missing.join(", ")}` });
  const order = await createOrder(req.user.id, req.body.billing, req.body.paymentMethod || "bank", req.body.couponCode);
  res.status(201).json({ order });
}));

app.get("/api/orders", requireUser, asyncRoute(async (req, res) => {
  res.json({ orders: await listOrders(req.user.id) });
}));

app.get("/api/orders/:id", requireUser, asyncRoute(async (req, res) => {
  const order = await getOrder(req.user.id, req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json({ order });
}));

app.post("/api/contact", asyncRoute(async (req, res) => {
  const { name, email, phone = "", message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ message: "Name, email, and message are required" });
  const contactMessage = await createContactMessage({ name, email, phone, message });
  res.status(201).json({ message: "Message received", contactMessage });
}));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : "Something went wrong" });
});

await loadStore();
app.listen(port, () => {
  console.log(`Exclusive API listening on http://127.0.0.1:${port}`);
});

const shutdown = async () => {
  await closePool();
  process.exit(0);
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
