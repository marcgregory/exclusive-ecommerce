import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import {
  asyncRoute,
  requireAdmin,
  requireUser,
  type AuthedRequest,
} from "./middleware.js";
import {
  addCartItem,
  addWishlistProduct,
  createContactMessage,
  createCoupon,
  createCategory,
  createOrder,
  createProduct,
  createUser,
  deleteCartItem,
  deleteCategory,
  deleteCoupon,
  deleteProduct,
  deleteWishlistProduct,
  findProduct,
  findUserByEmail,
  getAdminOrder,
  getSessionUser,
  getUserCart,
  getRelatedProducts,
  getOrder,
  getWishlistProducts,
  listAdminOrders,
  listContactMessages,
  loadStore,
  listCategories,
  listOrders,
  listProducts,
  publicUser,
  updateCartItem,
  updateCategory,
  updateContactMessageStatus,
  updateCoupon,
  updateOrderStatus,
  updateProduct,
  updateUser,
  validateCoupon,
  toCartResponse,
} from "./store.js";
import { closePool } from "./db.js";
import {
  getSessionSecret,
  validateLoginInput,
  validateProfileInput,
  validateRegisterInput,
} from "./auth.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const webOrigin = process.env.WEB_ORIGIN || "http://127.0.0.1:5173";
const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";
const sessionSecret = getSessionSecret();

app.use(cors({ origin: webOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    name: "exclusive.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 24 * 14,
    },
  }),
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { message: "Too many attempts. Try again later." },
});

const adminWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { message: "Too many admin actions. Try again in a minute." },
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { message: "Too many messages. Please try again later." },
});

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, service: "exclusive-api" }),
);

app.post(
  "/api/auth/register",
  authLimiter,
  asyncRoute(async (req, res) => {
    const { firstName, lastName, email, password, address } =
      validateRegisterInput(req.body);
    if (await findUserByEmail(email))
      return res.status(409).json({ message: "Email already registered" });
    const user = await createUser({
      firstName,
      lastName,
      email,
      address,
      passwordHash: await bcrypt.hash(password, 10),
    });
    req.session.userId = user.id;
    res.status(201).json({ user: publicUser(user) });
  }),
);

app.post(
  "/api/auth/login",
  authLimiter,
  asyncRoute(async (req, res) => {
    const { email, password } = validateLoginInput(req.body);
    const user = await findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return res.status(401).json({ message: "Invalid email or password" });
    req.session.userId = user.id;
    res.json({ user: publicUser(user) });
  }),
);

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", requireUser, (req, res) =>
  res.json({ user: publicUser(req.user) }),
);

app.patch(
  "/api/me",
  requireUser,
  asyncRoute(async (req, res) => {
    const updates = await validateProfileInput(
      req.body,
      req.user,
      findUserByEmail,
    );
    const user = await updateUser(req.user.id, updates);
    res.json({ user: publicUser(user) });
  }),
);

app.get(
  "/api/categories",
  asyncRoute(async (_req, res) =>
    res.json({ categories: await listCategories() }),
  ),
);

app.get(
  "/api/products",
  asyncRoute(async (req, res) => {
    const {
      category,
      q,
      flag,
      sort = "featured",
      page = "1",
      limit = "24",
    } = req.query;
    const result = await listProducts({
      category: category ? String(category) : undefined,
      q: q ? String(q) : undefined,
      flag: flag ? String(flag) : undefined,
      sort: String(sort),
      page: Number(page),
      limit: Number(limit),
    });
    res.json(result);
  }),
);

app.get(
  "/api/products/:id",
  asyncRoute(async (req, res) => {
    const product = await findProduct(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    const related = await getRelatedProducts(product);
    res.json({ product, related });
  }),
);

app.get(
  "/api/cart",
  requireUser,
  asyncRoute(async (req, res) => {
    res.json({
      cart: await toCartResponse(
        await getUserCart(req.user.id),
        req.query.coupon ? String(req.query.coupon) : undefined,
      ),
    });
  }),
);

app.post(
  "/api/cart/items",
  requireUser,
  asyncRoute(async (req, res) => {
    const {
      productId,
      quantity = 1,
      selectedColor = "",
      selectedSize = "",
    } = req.body;
    const cart = await addCartItem(req.user.id, {
      productId,
      quantity: Number(quantity),
      selectedColor,
      selectedSize,
    });
    res.status(201).json({ cart });
  }),
);

app.patch(
  "/api/cart/items/:id",
  requireUser,
  asyncRoute(async (req, res) => {
    const cart = await updateCartItem(
      req.user.id,
      req.params.id,
      Number(req.body.quantity),
    );
    if (!cart) return res.status(404).json({ message: "Cart item not found" });
    res.json({ cart });
  }),
);

app.delete(
  "/api/cart/items/:id",
  requireUser,
  asyncRoute(async (req, res) => {
    res.json({ cart: await deleteCartItem(req.user.id, req.params.id) });
  }),
);

app.get(
  "/api/wishlist",
  requireUser,
  asyncRoute(async (req, res) => {
    res.json({ products: await getWishlistProducts(req.user.id) });
  }),
);

app.post(
  "/api/wishlist/:productId",
  requireUser,
  asyncRoute(async (req, res) => {
    res
      .status(201)
      .json({
        products: await addWishlistProduct(req.user.id, req.params.productId),
      });
  }),
);

app.delete(
  "/api/wishlist/:productId",
  requireUser,
  asyncRoute(async (req, res) => {
    res.json({
      products: await deleteWishlistProduct(req.user.id, req.params.productId),
    });
  }),
);

app.post(
  "/api/coupons/validate",
  asyncRoute(async (req, res) => {
    const coupon = await validateCoupon(String(req.body.code || ""));
    if (!coupon)
      return res
        .status(404)
        .json({ valid: false, message: "Coupon code is not valid" });
    res.json({ valid: true, coupon });
  }),
);

app.post(
  "/api/orders",
  requireUser,
  asyncRoute(async (req, res) => {
    const required = [
      "firstName",
      "streetAddress",
      "townCity",
      "phone",
      "email",
    ];
    const missing = required.filter((field) => !req.body.billing?.[field]);
    if (missing.length)
      return res
        .status(400)
        .json({ message: `Missing billing fields: ${missing.join(", ")}` });
    const order = await createOrder(
      req.user.id,
      req.body.billing,
      req.body.paymentMethod || "bank",
      req.body.couponCode,
    );
    res.status(201).json({ order });
  }),
);

// Payment stub: simulate a payment provider response and mark order shipped
app.post(
  "/api/payments",
  requireUser,
  asyncRoute(async (req, res) => {
    const { orderId, paymentMethod = "bank" } = req.body || {};
    if (!orderId) return res.status(400).json({ message: "orderId is required" });
    const order = await getOrder(req.user.id, orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Simulate successful payment
    const payment = {
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: "succeeded",
      method: String(paymentMethod),
      provider: "stub",
    };

    // Update order status to shipped to represent a completed flow (no real fulfillment here)
    try {
      await updateOrderStatus(orderId, "shipped");
    } catch (err) {
      // ignore update errors; still return payment result
      console.error("Failed to update order status after payment:", err);
    }

    const updatedOrder = await getOrder(req.user.id, orderId);
    res.status(201).json({ payment, order: updatedOrder });
  }),
);

app.get(
  "/api/orders",
  requireUser,
  asyncRoute(async (req, res) => {
    res.json({ orders: await listOrders(req.user.id) });
  }),
);

app.get(
  "/api/orders/:id",
  requireUser,
  asyncRoute(async (req, res) => {
    const order = await getOrder(req.user.id, req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order });
  }),
);

app.post(
  "/api/contact",
  contactLimiter,
  asyncRoute(async (req, res) => {
    const { name, email, phone = "", message } = req.body;
    if (!name || !email || !message)
      return res
        .status(400)
        .json({ message: "Name, email, and message are required" });
    const contactMessage = await createContactMessage({
      name,
      email,
      phone,
      message,
    });
    res.status(201).json({ message: "Message received", contactMessage });
  }),
);

// ---------------------------------------------------------------------------
// Admin API
// ---------------------------------------------------------------------------

// Orders
app.get(
  "/api/admin/orders",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { status, email, from, to, page = "1", limit = "25" } = req.query;
    const result = await listAdminOrders({
      status: status ? String(status) : undefined,
      email: email ? String(email) : undefined,
      from: from ? String(from) : undefined,
      to: to ? String(to) : undefined,
      page: Number(page),
      limit: Number(limit),
    });
    res.json(result);
  }),
);

app.get(
  "/api/admin/orders/:id",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const order = await getAdminOrder(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order });
  }),
);

app.patch(
  "/api/admin/orders/:id",
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const order = await updateOrderStatus(
      req.params.id,
      String(req.body.status || ""),
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order });
  }),
);

// Products
app.get(
  "/api/admin/products",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { q, sort = "featured", page = "1", limit = "25" } = req.query;
    const result = await listProducts({
      q: q ? String(q) : undefined,
      sort: String(sort),
      page: Number(page),
      limit: Number(limit),
    });
    res.json(result);
  }),
);

app.post(
  "/api/admin/products",
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const product = await createProduct(req.body);
    res.status(201).json({ product });
  }),
);

app.patch(
  "/api/admin/products/:id",
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const product = await updateProduct(req.params.id, req.body);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ product });
  }),
);

app.delete(
  "/api/admin/products/:id",
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const removed = await deleteProduct(req.params.id);
    if (!removed) return res.status(404).json({ message: "Product not found" });
    res.json({ ok: true });
  }),
);

// Categories
app.post(
  "/api/admin/categories",
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const category = await createCategory(req.body);
    res.status(201).json({ category });
  }),
);

app.patch(
  "/api/admin/categories/:id",
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const category = await updateCategory(req.params.id, req.body);
    if (!category)
      return res.status(404).json({ message: "Category not found" });
    res.json({ category });
  }),
);

app.delete(
  "/api/admin/categories/:id",
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const removed = await deleteCategory(req.params.id);
    if (!removed)
      return res.status(404).json({ message: "Category not found" });
    res.json({ ok: true });
  }),
);

// Coupons
app.post(
  "/api/admin/coupons",
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const coupon = await createCoupon(req.body);
    res.status(201).json({ coupon });
  }),
);

app.patch(
  "/api/admin/coupons/:code",
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const coupon = await updateCoupon(req.params.code, req.body);
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    res.json({ coupon });
  }),
);

app.delete(
  "/api/admin/coupons/:code",
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const removed = await deleteCoupon(req.params.code);
    if (!removed) return res.status(404).json({ message: "Coupon not found" });
    res.json({ ok: true });
  }),
);

// Contact messages
app.get(
  "/api/admin/contact-messages",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { status, page = "1", limit = "25" } = req.query;
    const result = await listContactMessages({
      status: status ? String(status) : undefined,
      page: Number(page),
      limit: Number(limit),
    });
    res.json(result);
  }),
);

app.patch(
  "/api/admin/contact-messages/:id",
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const message = await updateContactMessageStatus(
      req.params.id,
      String(req.body.status || ""),
    );
    if (!message) return res.status(404).json({ message: "Message not found" });
    res.json({ message });
  }),
);

app.use((err, _req, res, _next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ message: err.status ? err.message : "Something went wrong" });
});

export default app;

// Only start server if running directly (not imported for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
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
}
