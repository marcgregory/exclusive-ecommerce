import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import path from 'node:path';
import { asyncRoute, requireAdmin, requireUser } from './middleware.js';
import {
  addCartItem,
  addWishlistProduct,
  completeStripeWebhookEventRecord,
  createContactMessage,
  createCoupon,
  createCategory,
  createOrder,
  createProduct,
  createStripeWebhookEventRecord,
  createUser,
  deleteCartItem,
  deleteCategory,
  deleteCoupon,
  deleteProduct,
  deleteProductVariant,
  deleteWishlistProduct,
  findProduct,
  findUserByEmail,
  getAdminOrder,
  getUserCart,
  getRelatedProducts,
  getOrder,
  getWishlistProducts,
  listAdminOrders,
  listContactMessages,
  listCoupons,
  listProductVariants,
  loadStore,
  listCategories,
  listOrders,
  listProducts,
  publicUser,
  reconcileStripePaymentIntentOrder,
  updateCartItem,
  updateCategory,
  updateContactMessageStatus,
  updateCoupon,
  updateAdminOrder,
  updateOrderStatus,
  updateProduct,
  updateUser,
  validateCoupon,
  saveProductVariants,
  toCartResponse,
} from './store.js';
import { closePool, query } from './db.js';
import { validateLoginInput, validateProfileInput, validateRegisterInput } from './auth.js';
import { loadRuntimeConfig } from './config.js';
import { createPayment } from './payments.js';
import { verifyStripeWebhookEvent } from './payments.js';
import { createSessionOptions } from './session-store.js';
import { getErrorLogFields, logError, logInfo } from './logger.js';
import { migrate } from './migrate.js';
import { createProductImageStorage, productImageUploadsRoot } from './image-storage.js';
import {
  addCartItemSchema,
  adminCategorySchema,
  adminCategoryUpdateSchema,
  adminCouponSchema,
  adminOrderListQuerySchema,
  adminOrderUpdateSchema,
  adminProductSchema,
  adminProductUpdateSchema,
  adminProductVariantsSchema,
  clientErrorSchema,
  contactMessageStatusSchema,
  contactSchema,
  couponValidationSchema,
  createOrderSchema,
  createPaymentSchema,
  parseInput,
  productListQuerySchema,
  updateCartItemSchema,
} from './validation.js';

const config = loadRuntimeConfig();
const productImageStorage = createProductImageStorage(config);
const app = express();
const shouldSkipRateLimit = () =>
  process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT_BYPASS !== 'true';
const allowedWebOrigins = new Set(config.webOrigins);

if (config.isProduction) app.set('trust proxy', 1);

app.use((req, res, next) => {
  req.requestId =
    typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id'].trim()
      ? req.headers['x-request-id'].trim()
      : crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);
  const startedAt = performance.now();
  res.on('finish', () => {
    const durationMs = Math.round(performance.now() - startedAt);
    logInfo('api.request', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
    });
  });
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedWebOrigins.has(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  asyncRoute(async (req, res) => {
    const event = verifyStripeWebhookEvent(
      req.body as Buffer,
      req.headers['stripe-signature'] as string | undefined
    );
    const intent = event.data?.object;
    const eventId = event.id || `stripe-event-${crypto.randomUUID()}`;
    const eventType = event.type || 'unknown';
    const paymentIntentId = intent?.id;
    const orderId = intent?.metadata?.orderId;
    const webhookRecord = await createStripeWebhookEventRecord({
      id: eventId,
      eventType,
      paymentIntentId,
      orderId,
    });

    if (webhookRecord.duplicate) {
      return res.json({ received: true, duplicate: true });
    }

    try {
      if (!orderId) {
        await completeStripeWebhookEventRecord(eventId, 'skipped');
        return res.json({ received: true });
      }

      const order = await reconcileStripePaymentIntentOrder(orderId, eventType);
      await completeStripeWebhookEventRecord(
        eventId,
        order ? 'processed' : 'skipped',
        order ? '' : 'Order not found'
      );
    } catch (error) {
      await completeStripeWebhookEventRecord(
        eventId,
        'failed',
        error instanceof Error ? error.message : 'Stripe webhook failed'
      );
      throw error;
    }

    res.json({ received: true });
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(session(createSessionOptions(config)));

app.use(
  '/uploads/product-images',
  express.static(productImageUploadsRoot, {
    dotfiles: 'deny',
    fallthrough: false,
    index: false,
    immutable: true,
    maxAge: config.isProduction ? '30d' : 0,
    setHeaders(res) {
      res.setHeader('x-content-type-options', 'nosniff');
      res.setHeader('content-security-policy', "default-src 'none'; img-src 'self'");
    },
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  message: { message: 'Too many attempts. Try again later.' },
});

const adminWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  message: { message: 'Too many admin actions. Try again in a minute.' },
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  message: { message: 'Too many messages. Please try again later.' },
});

const clientErrorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  message: { message: 'Too many error reports. Try again later.' },
});

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'exclusive-api' }));

app.get(
  '/api/ready',
  asyncRoute(async (_req, res) => {
    try {
      await query('SELECT 1');
      res.json({ ok: true, service: 'exclusive-api', database: 'ok' });
    } catch {
      res.status(503).json({
        ok: false,
        service: 'exclusive-api',
        database: 'unavailable',
      });
    }
  })
);

app.get(
  '/api/diagnostics/database',
  asyncRoute(async (_req, res) => {
    const startedAt = performance.now();
    try {
      await query('SELECT 1');
      const responseTimeMs = Math.round(performance.now() - startedAt);
      res.json({
        ok: true,
        service: 'exclusive-api',
        database: {
          status: 'ok',
          responseTimeMs,
          checkedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      const responseTimeMs = Math.round(performance.now() - startedAt);
      logError('database.diagnostic_failed', {
        responseTimeMs,
        ...getErrorLogFields(error),
      });
      res.status(503).json({
        ok: false,
        service: 'exclusive-api',
        database: {
          status: 'unavailable',
          responseTimeMs,
          checkedAt: new Date().toISOString(),
        },
      });
    }
  })
);

app.post(
  '/api/client-errors',
  clientErrorLimiter,
  asyncRoute(async (req, res) => {
    const body = parseInput(clientErrorSchema, req.body || {});
    logError('client.error', {
      requestId: req.requestId,
      message: String(body.message || 'Client error').slice(0, 500),
      name: typeof body.name === 'string' ? body.name.slice(0, 120) : undefined,
      path: typeof body.path === 'string' ? body.path.slice(0, 300) : undefined,
      source: typeof body.source === 'string' ? body.source.slice(0, 120) : undefined,
      userAgent: typeof body.userAgent === 'string' ? body.userAgent.slice(0, 300) : undefined,
      stack: typeof body.stack === 'string' ? body.stack.slice(0, 2000) : undefined,
      componentStack:
        typeof body.componentStack === 'string' ? body.componentStack.slice(0, 2000) : undefined,
    });
    res.status(202).json({ ok: true, requestId: req.requestId });
  })
);

app.post(
  '/api/auth/register',
  authLimiter,
  asyncRoute(async (req, res) => {
    const { firstName, lastName, email, password, address } = validateRegisterInput(req.body);
    if (await findUserByEmail(email))
      return res.status(409).json({ message: 'Email already registered' });
    const user = await createUser({
      firstName,
      lastName,
      email,
      address,
      passwordHash: await bcrypt.hash(password, 10),
    });
    req.session.userId = user.id;
    res.status(201).json({ user: publicUser(user) });
  })
);

app.post(
  '/api/auth/login',
  authLimiter,
  asyncRoute(async (req, res) => {
    const { email, password } = validateLoginInput(req.body);
    const user = await findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return res.status(401).json({ message: 'Invalid email or password' });
    req.session.userId = user.id;
    res.json({ user: publicUser(user) });
  })
);

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', requireUser, (req, res) => res.json({ user: publicUser(req.user) }));

app.patch(
  '/api/me',
  requireUser,
  asyncRoute(async (req, res) => {
    const updates = await validateProfileInput(req.body, req.user, findUserByEmail);
    const user = await updateUser(req.user.id, updates);
    res.json({ user: publicUser(user) });
  })
);

app.get(
  '/api/categories',
  asyncRoute(async (_req, res) => res.json({ categories: await listCategories() }))
);

app.get(
  '/api/products',
  asyncRoute(async (req, res) => {
    const { category, q, flag, sort, page, limit } = parseInput(productListQuerySchema, req.query);
    const result = await listProducts({
      category: category || undefined,
      q: q || undefined,
      flag: flag || undefined,
      sort,
      page,
      limit,
    });
    res.json(result);
  })
);

app.get(
  '/api/products/:id',
  asyncRoute(async (req, res) => {
    const product = await findProduct(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const variants = await listProductVariants(product.id);
    const related = await getRelatedProducts(product);
    res.json({ product, variants: variants || [], related });
  })
);

app.get(
  '/api/cart',
  requireUser,
  asyncRoute(async (req, res) => {
    res.json({
      cart: await toCartResponse(
        await getUserCart(req.user.id),
        req.query.coupon ? String(req.query.coupon) : undefined
      ),
    });
  })
);

app.post(
  '/api/cart/items',
  requireUser,
  asyncRoute(async (req, res) => {
    const { productId, quantity, selectedColor, selectedSize } = parseInput(
      addCartItemSchema,
      req.body
    );
    const cart = await addCartItem(req.user.id, {
      productId,
      quantity,
      selectedColor,
      selectedSize,
    });
    res.status(201).json({ cart });
  })
);

app.patch(
  '/api/cart/items/:id',
  requireUser,
  asyncRoute(async (req, res) => {
    const { quantity } = parseInput(updateCartItemSchema, req.body);
    const cart = await updateCartItem(req.user.id, req.params.id, quantity);
    if (!cart) return res.status(404).json({ message: 'Cart item not found' });
    res.json({ cart });
  })
);

app.delete(
  '/api/cart/items/:id',
  requireUser,
  asyncRoute(async (req, res) => {
    res.json({ cart: await deleteCartItem(req.user.id, req.params.id) });
  })
);

app.get(
  '/api/wishlist',
  requireUser,
  asyncRoute(async (req, res) => {
    res.json({ products: await getWishlistProducts(req.user.id) });
  })
);

app.post(
  '/api/wishlist/:productId',
  requireUser,
  asyncRoute(async (req, res) => {
    res.status(201).json({
      products: await addWishlistProduct(req.user.id, req.params.productId),
    });
  })
);

app.delete(
  '/api/wishlist/:productId',
  requireUser,
  asyncRoute(async (req, res) => {
    res.json({
      products: await deleteWishlistProduct(req.user.id, req.params.productId),
    });
  })
);

app.post(
  '/api/coupons/validate',
  asyncRoute(async (req, res) => {
    const { code } = parseInput(couponValidationSchema, req.body);
    const coupon = await validateCoupon(code);
    if (!coupon) return res.status(404).json({ valid: false, message: 'Coupon code is not valid' });
    res.json({ valid: true, coupon });
  })
);

app.post(
  '/api/orders',
  requireUser,
  asyncRoute(async (req, res) => {
    const body = parseInput(createOrderSchema, req.body);
    const billing = Object.fromEntries(
      Object.entries(body.billing).map(([key, value]) => [key, String(value)])
    );
    const order = await createOrder(
      req.user.id,
      billing,
      body.paymentMethod || 'bank',
      body.couponCode || undefined,
      body.idempotencyKey || undefined
    );
    res.status(201).json({ order });
  })
);

// Payment provider entrypoint. Defaults to the local simulator unless
// PAYMENT_PROVIDER=stripe is configured.
app.post(
  '/api/payments',
  requireUser,
  asyncRoute(async (req, res) => {
    const { orderId, paymentMethod } = parseInput(createPaymentSchema, req.body || {});
    const order = await getOrder(req.user.id, orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const payment = await createPayment(order, req.user.id, String(paymentMethod));

    if (payment.status === 'succeeded') {
      const paidOrder = await updateOrderStatus(orderId, 'shipped');
      if (!paidOrder)
        throw Object.assign(new Error('Payment could not update order status'), {
          status: 500,
        });
    }
    const updatedOrder = await getOrder(req.user.id, orderId);
    if (!updatedOrder)
      throw Object.assign(new Error('Payment completed but order was not found'), {
        status: 500,
      });
    res.status(201).json({ payment, order: updatedOrder });
  })
);

app.get(
  '/api/orders',
  requireUser,
  asyncRoute(async (req, res) => {
    res.json({ orders: await listOrders(req.user.id) });
  })
);

app.get(
  '/api/orders/:id',
  requireUser,
  asyncRoute(async (req, res) => {
    const order = await getOrder(req.user.id, req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ order });
  })
);

app.post(
  '/api/contact',
  contactLimiter,
  asyncRoute(async (req, res) => {
    const { name, email, phone, message } = parseInput(contactSchema, req.body);
    const contactMessage = await createContactMessage({
      name,
      email,
      phone,
      message,
    });
    res.status(201).json({ message: 'Message received', contactMessage });
  })
);

// ---------------------------------------------------------------------------
// Admin API
// ---------------------------------------------------------------------------

// Orders
app.get(
  '/api/admin/orders',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { status, email, from, to, page, limit } = parseInput(
      adminOrderListQuerySchema,
      req.query
    );
    const result = await listAdminOrders({
      status: status || undefined,
      email: email || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      limit,
    });
    res.json(result);
  })
);

app.get(
  '/api/admin/orders/:id',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const order = await getAdminOrder(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ order });
  })
);

app.patch(
  '/api/admin/orders/:id',
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const body = parseInput(adminOrderUpdateSchema, req.body || {});
    const order = await updateAdminOrder(req.params.id, {
      ...(Object.prototype.hasOwnProperty.call(body, 'status')
        ? { status: String(body.status || '') }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, 'internalNote')
        ? { internalNote: String(body.internalNote ?? '') }
        : {}),
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ order });
  })
);

// Products
app.post(
  '/api/admin/uploads/product-image',
  requireAdmin,
  adminWriteLimiter,
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: '5mb',
  }),
  asyncRoute(async (req, res) => {
    const contentType = String(req.headers['content-type'] || '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    const originalName =
      typeof req.headers['x-file-name'] === 'string'
        ? path.basename(req.headers['x-file-name'])
        : undefined;
    const upload = await productImageStorage.saveProductImage({
      buffer: Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0),
      contentType,
      originalName,
    });

    res.status(201).json({ upload });
  })
);

app.get(
  '/api/admin/products',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { q, sort, page, limit } = parseInput(productListQuerySchema, {
      ...req.query,
      limit: req.query.limit || '25',
    });
    const result = await listProducts({
      q: q || undefined,
      sort,
      page,
      limit,
    });
    res.json(result);
  })
);

app.get(
  '/api/admin/products/:id/variants',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const variants = await listProductVariants(req.params.id);
    if (!variants) return res.status(404).json({ message: 'Product not found' });
    res.json({ variants });
  })
);

app.put(
  '/api/admin/products/:id/variants',
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const body = parseInput(adminProductVariantsSchema, req.body || {});
    const variants = await saveProductVariants(req.params.id, body.variants);
    if (!variants) return res.status(404).json({ message: 'Product not found' });
    res.json({ variants });
  })
);

app.delete(
  '/api/admin/products/:id/variants/:variantId',
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const removed = await deleteProductVariant(req.params.id, req.params.variantId);
    if (removed === undefined) return res.status(404).json({ message: 'Product not found' });
    if (!removed) return res.status(404).json({ message: 'Variant not found' });
    res.json({ ok: true });
  })
);

app.post(
  '/api/admin/products',
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const product = await createProduct(parseInput(adminProductSchema, req.body));
    res.status(201).json({ product });
  })
);

app.patch(
  '/api/admin/products/:id',
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const product = await updateProduct(
      req.params.id,
      parseInput(adminProductUpdateSchema, req.body)
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  })
);

app.delete(
  '/api/admin/products/:id',
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const removed = await deleteProduct(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Product not found' });
    res.json({ ok: true });
  })
);

// Categories
app.post(
  '/api/admin/categories',
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const category = await createCategory(parseInput(adminCategorySchema, req.body));
    res.status(201).json({ category });
  })
);

app.patch(
  '/api/admin/categories/:id',
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const category = await updateCategory(
      req.params.id,
      parseInput(adminCategoryUpdateSchema, req.body)
    );
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ category });
  })
);

app.delete(
  '/api/admin/categories/:id',
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const removed = await deleteCategory(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Category not found' });
    res.json({ ok: true });
  })
);

// Coupons
app.get(
  '/api/admin/coupons',
  requireAdmin,
  asyncRoute(async (_req, res) => {
    res.json({ coupons: await listCoupons() });
  })
);

app.post(
  '/api/admin/coupons',
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const coupon = await createCoupon(parseInput(adminCouponSchema, req.body));
    res.status(201).json({ coupon });
  })
);

app.patch(
  '/api/admin/coupons/:code',
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const coupon = await updateCoupon(
      req.params.code,
      parseInput(adminCouponSchema.partial().passthrough(), req.body)
    );
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json({ coupon });
  })
);

app.delete(
  '/api/admin/coupons/:code',
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const removed = await deleteCoupon(req.params.code);
    if (!removed) return res.status(404).json({ message: 'Coupon not found' });
    res.json({ ok: true });
  })
);

// Contact messages
app.get(
  '/api/admin/contact-messages',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { status, page = '1', limit = '25' } = req.query;
    const result = await listContactMessages({
      status: status ? String(status) : undefined,
      page: Number(page),
      limit: Number(limit),
    });
    res.json(result);
  })
);

app.patch(
  '/api/admin/contact-messages/:id',
  requireAdmin,
  adminWriteLimiter,
  asyncRoute(async (req, res) => {
    const { status } = parseInput(contactMessageStatusSchema, req.body);
    const message = await updateContactMessageStatus(req.params.id, status);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    res.json({ message });
  })
);

app.use((err, req, res, _next) => {
  logError('api.error', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    status: err.status || 500,
    ...getErrorLogFields(err),
  });
  res.status(err.status || 500).json({
    message: err.status ? err.message : 'Something went wrong',
    requestId: req.requestId,
  });
});

export default app;

// Only start server if running directly (not imported for testing)
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  await migrate();
  await loadStore();
  app.listen(config.port, () => {
    console.log(`Exclusive API listening on http://127.0.0.1:${config.port}`);
  });

  const shutdown = async () => {
    await closePool();
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
