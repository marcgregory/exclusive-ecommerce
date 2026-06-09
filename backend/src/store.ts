import type { PoolClient, QueryResultRow } from "pg";
import { query, withTransaction } from "./db.js";
import type { AdminOrder, Cart, CartItem, CartResponse, Category, ContactMessage, Coupon, Order, Product, ProductVariant, User } from "./types.js";

type Queryable = {
  query<T extends QueryResultRow = QueryResultRow>(sql: string, values?: unknown[]): Promise<{ rows: T[]; rowCount: number }>;
};

type ProductFilters = {
  category?: string;
  q?: string;
  flag?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

type NewUser = Omit<User, "id" | "role"> & { role?: User["role"] };
type UpdateUserInput = Partial<Pick<User, "firstName" | "lastName" | "email" | "address" | "passwordHash">>;

const nowId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const run = (client?: Queryable) => client || { query };
const toNumber = (value: unknown) => Number(value || 0);
const toIso = (value: unknown) => (value instanceof Date ? value.toISOString() : String(value));

function mapUser(row: QueryResultRow): User {
  return {
    id: String(row.id),
    firstName: String(row.first_name || ""),
    lastName: String(row.last_name || ""),
    email: String(row.email || ""),
    address: String(row.address || ""),
    passwordHash: String(row.password_hash || ""),
    role: row.role === "admin" ? "admin" : "customer"
  };
}

function mapCategory(row: QueryResultRow): Category {
  return {
    id: String(row.id),
    label: String(row.label || ""),
    slug: String(row.slug || ""),
    icon: String(row.icon || ""),
    children: Array.isArray(row.children) ? row.children.map(String) : [],
    sortOrder: Number(row.sort_order ?? 0),
    parentId: row.parent_id ? String(row.parent_id) : null
  };
}

function mapProduct(row: QueryResultRow): Product {
  return {
    id: String(row.id),
    name: String(row.name || ""),
    category: String(row.category_id || ""),
    description: String(row.description || ""),
    price: toNumber(row.price),
    originalPrice: toNumber(row.original_price),
    discountPercent: Number(row.discount_percent || 0),
    rating: toNumber(row.rating),
    reviewCount: Number(row.review_count || 0),
    stockStatus: String(row.stock_status || "In Stock"),
    colors: Array.isArray(row.colors) ? row.colors.map(String) : [],
    sizes: Array.isArray(row.sizes) ? row.sizes.map(String) : [],
    isNew: Boolean(row.is_new),
    flags: Array.isArray(row.flags) ? row.flags.map(String) : [],
    image: String(row.image_key || ""),
    imageUrl: String(row.image_key || "")
  };
}

function mapProductVariant(row: QueryResultRow): ProductVariant {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    sku: String(row.sku || ""),
    color: String(row.color || ""),
    size: String(row.size || ""),
    stock: Number(row.stock || 0)
  };
}

function mapCoupon(row: QueryResultRow): Coupon {
  return {
    code: String(row.code),
    type: row.type === "fixed" ? "fixed" : "percent",
    amount: toNumber(row.amount),
    active: Boolean(row.active)
  };
}

function mapCartItem(row: QueryResultRow): CartItem {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    quantity: Number(row.quantity || 1),
    selectedColor: String(row.selected_color || ""),
    selectedSize: String(row.selected_size || "")
  };
}

function mapOrder(row: QueryResultRow, items: Array<CartItem & { name: string; price: number }>): Order {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    items,
    billing: (row.billing || {}) as Record<string, string>,
    paymentMethod: String(row.payment_method),
    subtotal: toNumber(row.subtotal),
    discount: toNumber(row.discount),
    shipping: toNumber(row.shipping),
    total: toNumber(row.total),
    status: String(row.status),
    createdAt: toIso(row.created_at)
  };
}

async function getIdempotentOrder(
  userId: string,
  idempotencyKey: string | undefined,
  client?: Queryable,
): Promise<Order | undefined> {
  if (!idempotencyKey) return undefined;
  const result = await run(client).query(
    "SELECT * FROM orders WHERE user_id = $1 AND idempotency_key = $2 LIMIT 1",
    [userId, idempotencyKey],
  );
  if (!result.rows[0]) return undefined;
  const orderId = String(result.rows[0].id);
  return mapOrder(result.rows[0], await getOrderItemsWithClient(orderId, client));
}

function mapContactMessage(row: QueryResultRow): ContactMessage {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    phone: String(row.phone || ""),
    message: String(row.message),
    status: String(row.status),
    createdAt: toIso(row.created_at)
  };
}

async function getCartByUserId(userId: string, client?: Queryable): Promise<Cart> {
  const db = run(client);
  let cartRow = (await db.query("SELECT id, user_id FROM carts WHERE user_id = $1 LIMIT 1", [userId])).rows[0];
  if (!cartRow) {
    const inserted = await db.query("INSERT INTO carts (id, user_id) VALUES ($1, $2) RETURNING id, user_id", [nowId("cart"), userId]);
    cartRow = inserted.rows[0];
  }
  const items = await db.query("SELECT id, product_id, quantity, selected_color, selected_size FROM cart_items WHERE cart_id = $1 ORDER BY id", [cartRow.id]);
  return { id: String(cartRow.id), userId: String(cartRow.user_id), items: items.rows.map(mapCartItem) };
}

async function getWishlistId(userId: string, client?: Queryable): Promise<string> {
  const db = run(client);
  const existing = await db.query("SELECT id FROM wishlists WHERE user_id = $1 LIMIT 1", [userId]);
  if (existing.rows[0]) return String(existing.rows[0].id);
  const inserted = await db.query("INSERT INTO wishlists (id, user_id) VALUES ($1, $2) RETURNING id", [`wishlist-${userId}`, userId]);
  return String(inserted.rows[0].id);
}

async function findCoupon(code: string | undefined, client?: Queryable): Promise<Coupon | null> {
  if (!code) return null;
  const result = await run(client).query("SELECT code, type, amount, active FROM coupons WHERE UPPER(code) = UPPER($1) AND active = TRUE LIMIT 1", [code]);
  return result.rows[0] ? mapCoupon(result.rows[0]) : null;
}

async function getVariantStock(productId: string, selectedColor: string, selectedSize: string, client?: Queryable): Promise<number | null> {
  const db = run(client);
  const variantCount = await db.query<{ count: string }>("SELECT COUNT(*) AS count FROM product_variants WHERE product_id = $1", [productId]);
  if (Number(variantCount.rows[0]?.count || 0) === 0) return null;

  const result = await db.query<{ stock: string | number }>(
    `SELECT stock
     FROM product_variants
     WHERE product_id = $1
       AND COALESCE(color, '') = $2
       AND COALESCE(size, '') = $3
     LIMIT 1`,
    [productId, selectedColor || "", selectedSize || ""]
  );
  return result.rows[0] ? Number(result.rows[0].stock || 0) : 0;
}

async function assertCartItemStock(
  product: Product,
  quantity: number,
  selectedColor: string,
  selectedSize: string,
  client?: Queryable,
): Promise<void> {
  if (product.stockStatus === "Out of Stock") {
    throw Object.assign(new Error(`${product.name} is out of stock`), { status: 409 });
  }
  const stock = await getVariantStock(product.id, selectedColor, selectedSize, client);
  if (stock !== null && quantity > stock) {
    throw Object.assign(new Error(stockAvailabilityMessage(product.name, stock)), { status: 409 });
  }
}

function stockAvailabilityMessage(productName: string, stock: number) {
  return `Only ${stock} ${productName} item${stock === 1 ? "" : "s"} ${stock === 1 ? "is" : "are"} available`;
}

async function decrementVariantStock(
  product: Product,
  quantity: number,
  selectedColor: string,
  selectedSize: string,
  client: Queryable,
): Promise<void> {
  const stock = await getVariantStock(product.id, selectedColor, selectedSize, client);
  if (stock === null) return;
  if (quantity > stock) {
    throw Object.assign(new Error(stockAvailabilityMessage(product.name, stock)), { status: 409 });
  }

  const result = await client.query(
    `UPDATE product_variants
     SET stock = stock - $4
     WHERE product_id = $1
       AND COALESCE(color, '') = $2
       AND COALESCE(size, '') = $3
       AND stock >= $4`,
    [product.id, selectedColor || "", selectedSize || "", quantity]
  );
  if ((result.rowCount ?? 0) === 0) {
    throw Object.assign(new Error(`${product.name} does not have enough stock`), { status: 409 });
  }
}

export async function loadStore(): Promise<void> {
  await query("SELECT 1");
}

export function publicUser(user?: User | null) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return { ...safeUser, role: user.role };
}

export async function getSessionUser(req: { session?: { userId?: string } }): Promise<User | undefined> {
  const userId = req.session?.userId;
  if (!userId) return undefined;
  const byId = await query("SELECT * FROM users WHERE id = $1 LIMIT 1", [userId]);
  if (byId.rows[0]) return mapUser(byId.rows[0]);
  return undefined;
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const result = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [email]);
  return result.rows[0] ? mapUser(result.rows[0]) : undefined;
}

export async function createUser(input: NewUser): Promise<User> {
  const id = nowId("user");
  const result = await query(
    "INSERT INTO users (id, first_name, last_name, email, address, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'customer')) RETURNING *",
    [id, input.firstName, input.lastName, input.email, input.address, input.passwordHash, input.role ?? null]
  );
  return mapUser(result.rows[0]);
}

export async function updateUser(userId: string, input: UpdateUserInput): Promise<User | undefined> {
  const current = await query("SELECT * FROM users WHERE id = $1 LIMIT 1", [userId]);
  if (!current.rows[0]) return undefined;
  const user = { ...mapUser(current.rows[0]), ...input };
  const result = await query(
    `UPDATE users
     SET first_name = $2, last_name = $3, email = $4, address = $5, password_hash = $6
     WHERE id = $1
     RETURNING *`,
    [user.id, user.firstName, user.lastName, user.email, user.address, user.passwordHash]
  );
  return mapUser(result.rows[0]);
}

export async function listCategories(): Promise<Category[]> {
  const result = await query(
    "SELECT id, label, slug, icon, children, sort_order, parent_id FROM categories ORDER BY sort_order ASC, id ASC"
  );
  return result.rows.map(mapCategory);
}

export async function listProducts(filters: ProductFilters = {}): Promise<{ products: Product[]; total: number; page: number; limit: number }> {
  const where: string[] = [];
  const values: unknown[] = [];

  if (filters.category) {
    values.push(filters.category);
    where.push(`category_id = $${values.length}`);
  }
  if (filters.flag) {
    values.push(filters.flag);
    where.push(`$${values.length} = ANY(flags)`);
  }
  if (filters.q) {
    values.push(`%${filters.q.toLowerCase()}%`);
    where.push(`LOWER(name || ' ' || description) LIKE $${values.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const totalResult = await query<{ count: string }>(`SELECT COUNT(*) AS count FROM products ${whereSql}`, values);

  const sortSql =
    filters.sort === "price-asc"
      ? "ORDER BY price ASC"
      : filters.sort === "price-desc"
        ? "ORDER BY price DESC"
        : filters.sort === "rating"
          ? "ORDER BY rating DESC"
          : "ORDER BY sort_order ASC, id ASC";

  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.max(1, Number(filters.limit || 24));
  const offset = (page - 1) * limit;
  const pageValues = [...values, limit, offset];
  const result = await query(
    `SELECT * FROM products ${whereSql} ${sortSql} LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues
  );

  // Debug: log raw rows
  console.log("listProducts raw rows:", result.rows.map(r => ({ id: r.id, name: r.name, image_key: r.image_key })));

  return { products: result.rows.map(mapProduct), total: Number(totalResult.rows[0]?.count || 0), page, limit };
}

export async function findProduct(productId: string, client?: Queryable): Promise<Product | undefined> {
  const result = await run(client).query("SELECT * FROM products WHERE id = $1 LIMIT 1", [productId]);
  return result.rows[0] ? mapProduct(result.rows[0]) : undefined;
}

export async function getRelatedProducts(product: Product): Promise<Product[]> {
  const result = await query(
    "SELECT * FROM products WHERE id <> $1 AND (category_id = $2 OR 'related' = ANY(flags)) ORDER BY sort_order ASC, id ASC LIMIT 4",
    [product.id, product.category]
  );
  return result.rows.map(mapProduct);
}

export async function getUserCart(userId: string): Promise<Cart> {
  return getCartByUserId(userId);
}

export async function toCartResponse(cart: Cart, couponCode?: string, client?: Queryable): Promise<CartResponse> {
  const items = [];
  for (const item of cart.items) {
    const product = await findProduct(item.productId, client);
    if (!product) continue;
    items.push({ ...item, product, lineTotal: product.price * item.quantity });
  }
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const coupon = await findCoupon(couponCode, client);
  const discount = coupon ? (coupon.type === "percent" ? Math.round(subtotal * (coupon.amount / 100)) : coupon.amount) : 0;
  const shipping = subtotal > 0 && subtotal < 500 ? 16 : 0;
  const total = Math.max(0, subtotal - discount + shipping);
  return { id: cart.id, items, subtotal, discount, shipping, total, coupon };
}

export async function addCartItem(userId: string, input: Omit<CartItem, "id">): Promise<CartResponse> {
  const product = await findProduct(input.productId);
  if (!product) throw Object.assign(new Error("Product not found"), { status: 404 });
  if (product.colors.length > 0 && !input.selectedColor) {
    throw Object.assign(new Error(`Please choose a color for ${product.name}`), { status: 400 });
  }
  if (product.sizes.length > 0 && !input.selectedSize) {
    throw Object.assign(new Error(`Please choose a size for ${product.name}`), { status: 400 });
  }
  if (!Number.isFinite(input.quantity) || input.quantity < 1) {
    throw Object.assign(new Error(`Quantity must be at least 1 for ${product.name}`), { status: 400 });
  }
  const cart = await getUserCart(userId);
  const existing = cart.items.find(
    (item) => item.productId === input.productId && item.selectedColor === input.selectedColor && item.selectedSize === input.selectedSize
  );
  const requestedQuantity = input.quantity + (existing?.quantity || 0);
  await assertCartItemStock(product, requestedQuantity, input.selectedColor, input.selectedSize);
  if (existing) {
    await query("UPDATE cart_items SET quantity = quantity + $2 WHERE id = $1", [existing.id, input.quantity]);
  } else {
    await query("INSERT INTO cart_items (id, cart_id, product_id, quantity, selected_color, selected_size) VALUES ($1, $2, $3, $4, $5, $6)", [
      nowId("ci"),
      cart.id,
      input.productId,
      input.quantity,
      input.selectedColor,
      input.selectedSize
    ]);
  }
  return toCartResponse(await getUserCart(userId));
}

export async function updateCartItem(userId: string, itemId: string, quantity: number): Promise<CartResponse | undefined> {
  const cart = await getUserCart(userId);
  const item = cart.items.find((entry) => entry.id === itemId);
  if (!item) return undefined;
  const product = await findProduct(item.productId);
  if (!product) throw Object.assign(new Error("Product not found"), { status: 404 });
  const nextQuantity = Math.max(1, Number(quantity));
  await assertCartItemStock(product, nextQuantity, item.selectedColor, item.selectedSize);
  await query("UPDATE cart_items SET quantity = $2 WHERE id = $1", [itemId, nextQuantity]);
  return toCartResponse(await getUserCart(userId));
}

export async function deleteCartItem(userId: string, itemId: string): Promise<CartResponse> {
  const cart = await getUserCart(userId);
  await query("DELETE FROM cart_items WHERE id = $1 AND cart_id = $2", [itemId, cart.id]);
  return toCartResponse(await getUserCart(userId));
}

export async function getWishlist(userId: string): Promise<{ userId: string; productIds: string[] }> {
  const wishlistId = await getWishlistId(userId);
  const items = await query("SELECT product_id FROM wishlist_items WHERE wishlist_id = $1 ORDER BY product_id", [wishlistId]);
  return { userId, productIds: items.rows.map((row) => String(row.product_id)) };
}

export async function getWishlistProducts(userId: string): Promise<Product[]> {
  const wishlist = await getWishlist(userId);
  const products = [];
  for (const productId of wishlist.productIds) {
    const product = await findProduct(productId);
    if (product) products.push(product);
  }
  return products;
}

export async function addWishlistProduct(userId: string, productId: string): Promise<Product[]> {
  if (!(await findProduct(productId))) throw Object.assign(new Error("Product not found"), { status: 404 });
  const wishlistId = await getWishlistId(userId);
  await query("INSERT INTO wishlist_items (wishlist_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [wishlistId, productId]);
  return getWishlistProducts(userId);
}

export async function deleteWishlistProduct(userId: string, productId: string): Promise<Product[]> {
  const wishlistId = await getWishlistId(userId);
  await query("DELETE FROM wishlist_items WHERE wishlist_id = $1 AND product_id = $2", [wishlistId, productId]);
  return getWishlistProducts(userId);
}

export async function validateCoupon(code: string): Promise<Coupon | null> {
  return findCoupon(code);
}

export async function createOrder(
  userId: string,
  billing: Record<string, string>,
  paymentMethod = "bank",
  couponCode?: string,
  idempotencyKey?: string,
): Promise<Order> {
  const normalizedIdempotencyKey = idempotencyKey?.trim() || undefined;

  try {
    return await withTransaction(async (client: PoolClient) => {
      const existingOrder = await getIdempotentOrder(userId, normalizedIdempotencyKey, client);
      if (existingOrder) return existingOrder;

      const cart = await getCartByUserId(userId, client);
      const totals = await toCartResponse(cart, couponCode, client);
      if (!totals.items.length) throw Object.assign(new Error("Cart is empty"), { status: 400 });

      for (const item of totals.items) {
        const product = await findProduct(item.productId, client);
        if (!product) throw Object.assign(new Error(`Product ${item.productId} is no longer available`), { status: 409 });
        if (product.colors.length > 0 && !item.selectedColor) {
          throw Object.assign(new Error(`Please choose a color for ${product.name}`), { status: 400 });
        }
        if (product.sizes.length > 0 && !item.selectedSize) {
          throw Object.assign(new Error(`Please choose a size for ${product.name}`), { status: 400 });
        }
        await assertCartItemStock(product, item.quantity, item.selectedColor, item.selectedSize, client);
      }

      const orderId = nowId("order");
      const orderResult = await client.query(
        `INSERT INTO orders (id, user_id, idempotency_key, billing, payment_method, subtotal, discount, shipping, total, status)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, 'processing')
         RETURNING *`,
        [
          orderId,
          userId,
          normalizedIdempotencyKey || null,
          JSON.stringify(billing),
          paymentMethod,
          totals.subtotal,
          totals.discount,
          totals.shipping,
          totals.total
        ]
      );

      const orderItems: Array<CartItem & { name: string; price: number }> = [];
      for (const item of totals.items) {
        const orderItem = {
          id: nowId("oi"),
          productId: item.productId,
          quantity: item.quantity,
          selectedColor: item.selectedColor,
          selectedSize: item.selectedSize,
          name: item.product.name,
          price: item.product.price
        };
        await client.query(
          `INSERT INTO order_items (id, order_id, product_id, name, price, quantity, selected_color, selected_size)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [orderItem.id, orderId, orderItem.productId, orderItem.name, orderItem.price, orderItem.quantity, orderItem.selectedColor, orderItem.selectedSize]
        );
        await decrementVariantStock(item.product, item.quantity, item.selectedColor, item.selectedSize, client);
        orderItems.push(orderItem);
      }

      await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cart.id]);
      return mapOrder(orderResult.rows[0], orderItems);
    });
  } catch (error: any) {
    if (normalizedIdempotencyKey && error?.code === "23505") {
      const existingOrder = await getIdempotentOrder(userId, normalizedIdempotencyKey);
      if (existingOrder) return existingOrder;
    }
    throw error;
  }
}

async function getOrderItemsWithClient(orderId: string, client?: Queryable): Promise<Array<CartItem & { name: string; price: number }>> {
  const result = await run(client).query("SELECT * FROM order_items WHERE order_id = $1 ORDER BY id", [orderId]);
  return result.rows.map((row) => ({
    id: String(row.id),
    productId: String(row.product_id),
    quantity: Number(row.quantity || 1),
    selectedColor: String(row.selected_color || ""),
    selectedSize: String(row.selected_size || ""),
    name: String(row.name),
    price: toNumber(row.price)
  }));
}

async function getOrderItems(orderId: string): Promise<Array<CartItem & { name: string; price: number }>> {
  return getOrderItemsWithClient(orderId);
}

export async function listOrders(userId: string): Promise<Order[]> {
  const result = await query("SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC, id DESC", [userId]);
  const orders = [];
  for (const row of result.rows) orders.push(mapOrder(row, await getOrderItems(String(row.id))));
  return orders;
}

export async function getOrder(userId: string, orderId: string): Promise<Order | undefined> {
  const result = await query("SELECT * FROM orders WHERE id = $1 AND user_id = $2 LIMIT 1", [orderId, userId]);
  if (!result.rows[0]) return undefined;
  return mapOrder(result.rows[0], await getOrderItems(orderId));
}

export async function createContactMessage(input: Pick<ContactMessage, "name" | "email" | "phone" | "message">): Promise<ContactMessage> {
  const result = await query(
    "INSERT INTO contact_messages (id, name, email, phone, message, status) VALUES ($1, $2, $3, $4, $5, 'new') RETURNING *",
    [nowId("msg"), input.name, input.email, input.phone, input.message]
  );
  return mapContactMessage(result.rows[0]);
}

// ---------------------------------------------------------------------------
// Admin functions
// ---------------------------------------------------------------------------

export type AdminOrderFilters = {
  status?: string;
  email?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

const ORDER_STATUSES = ["processing", "shipped", "delivered", "cancelled"] as const;
export const ORDER_STATUS_VALUES = ORDER_STATUSES;
const MAX_INTERNAL_NOTE_LENGTH = 5000;

function isValidOrderStatus(value: string): value is (typeof ORDER_STATUSES)[number] {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

async function getOrderItemsWithProduct(orderId: string, client?: Queryable) {
  const result = await run(client).query("SELECT * FROM order_items WHERE order_id = $1 ORDER BY id", [orderId]);
  return result.rows.map((row) => ({
    id: String(row.id),
    productId: String(row.product_id),
    quantity: Number(row.quantity || 1),
    selectedColor: String(row.selected_color || ""),
    selectedSize: String(row.selected_size || ""),
    name: String(row.name),
    price: toNumber(row.price)
  }));
}

function mapAdminOrder(row: QueryResultRow, items: Array<CartItem & { name: string; price: number }>): AdminOrder {
  const billing = (row.billing || {}) as Record<string, string>;
  return {
    ...mapOrder(row, items),
    customerEmail: String(row.user_email || ""),
    customerName: `${billing.firstName || ""} ${billing.lastName || ""}`.trim() || String(row.user_email || ""),
    internalNote: String(row.internal_note || "")
  };
}

export async function listAdminOrders(filters: AdminOrderFilters = {}): Promise<{ orders: AdminOrder[]; total: number; page: number; limit: number }> {
  const where: string[] = [];
  const values: unknown[] = [];

  if (filters.status && isValidOrderStatus(filters.status)) {
    values.push(filters.status);
    where.push(`o.status = $${values.length}`);
  }
  if (filters.email) {
    values.push(`%${filters.email.toLowerCase()}%`);
    where.push(`LOWER(u.email) LIKE $${values.length}`);
  }
  if (filters.from) {
    values.push(filters.from);
    where.push(`o.created_at >= $${values.length}`);
  }
  if (filters.to) {
    values.push(filters.to);
    where.push(`o.created_at <= $${values.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const totalResult = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM orders o LEFT JOIN users u ON u.id = o.user_id ${whereSql}`,
    values
  );

  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.max(1, Number(filters.limit || 25));
  const offset = (page - 1) * limit;
  const pageValues = [...values, limit, offset];
  const result = await query(
    `SELECT o.*, u.email AS user_email
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     ${whereSql}
     ORDER BY o.created_at DESC, o.id DESC
     LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues
  );

  const orders: AdminOrder[] = [];
  for (const row of result.rows) orders.push(mapAdminOrder(row, await getOrderItemsWithProduct(String(row.id))));
  return { orders, total: Number(totalResult.rows[0]?.count || 0), page, limit };
}

export async function getAdminOrder(orderId: string): Promise<AdminOrder | undefined> {
  const result = await query(
    "SELECT o.*, u.email AS user_email FROM orders o LEFT JOIN users u ON u.id = o.user_id WHERE o.id = $1 LIMIT 1",
    [orderId]
  );
  if (!result.rows[0]) return undefined;
  return mapAdminOrder(result.rows[0], await getOrderItemsWithProduct(orderId));
}

export async function updateOrderStatus(orderId: string, status: string): Promise<AdminOrder | undefined> {
  if (!isValidOrderStatus(status)) {
    throw Object.assign(new Error(`Invalid order status: ${status}`), { status: 400 });
  }
  const result = await query("UPDATE orders SET status = $2 WHERE id = $1 RETURNING *", [orderId, status]);
  if (!result.rows[0]) return undefined;
  return getAdminOrder(orderId);
}

export type StripeWebhookEventInput = {
  id: string;
  eventType: string;
  paymentIntentId?: string | null;
  orderId?: string | null;
};

export async function createStripeWebhookEventRecord(
  input: StripeWebhookEventInput,
): Promise<{ duplicate: boolean }> {
  const result = await query(
    `INSERT INTO stripe_webhook_events
       (id, event_type, payment_intent_id, order_id, processing_status)
     VALUES ($1, $2, $3, $4, 'processing')
     ON CONFLICT (id) DO NOTHING
     RETURNING id`,
    [
      input.id,
      input.eventType,
      input.paymentIntentId || null,
      input.orderId || null,
    ],
  );
  return { duplicate: (result.rowCount ?? 0) === 0 };
}

export async function completeStripeWebhookEventRecord(
  eventId: string,
  processingStatus: "processed" | "skipped" | "failed",
  errorMessage = "",
): Promise<void> {
  await query(
    `UPDATE stripe_webhook_events
     SET processing_status = $2,
         error_message = $3,
         processed_at = NOW()
     WHERE id = $1`,
    [eventId, processingStatus, errorMessage],
  );
}

export async function reconcileStripePaymentIntentOrder(
  orderId: string,
  eventType: string,
): Promise<AdminOrder | undefined> {
  if (eventType === "payment_intent.succeeded") {
    const result = await query(
      `UPDATE orders
       SET status = 'shipped'
       WHERE id = $1
         AND status IN ('processing', 'cancelled')
       RETURNING *`,
      [orderId],
    );
    if (result.rows[0]) return getAdminOrder(orderId);
    return getAdminOrder(orderId);
  }

  if (
    eventType === "payment_intent.payment_failed" ||
    eventType === "payment_intent.canceled"
  ) {
    const result = await query(
      `UPDATE orders
       SET status = 'cancelled'
       WHERE id = $1
         AND status = 'processing'
       RETURNING *`,
      [orderId],
    );
    if (result.rows[0]) return getAdminOrder(orderId);
    return getAdminOrder(orderId);
  }

  return getAdminOrder(orderId);
}

export type AdminOrderUpdate = {
  status?: string;
  internalNote?: string;
};

export async function updateAdminOrder(orderId: string, input: AdminOrderUpdate): Promise<AdminOrder | undefined> {
  const updates: string[] = [];
  const values: unknown[] = [orderId];

  if (Object.prototype.hasOwnProperty.call(input, "status")) {
    const status = String(input.status || "");
    if (!isValidOrderStatus(status)) {
      throw Object.assign(new Error(`Invalid order status: ${status}`), { status: 400 });
    }
    values.push(status);
    updates.push(`status = $${values.length}`);
  }

  if (Object.prototype.hasOwnProperty.call(input, "internalNote")) {
    const internalNote = String(input.internalNote ?? "");
    if (internalNote.length > MAX_INTERNAL_NOTE_LENGTH) {
      throw Object.assign(new Error("Internal note cannot exceed 5000 characters"), { status: 400 });
    }
    values.push(internalNote);
    updates.push(`internal_note = $${values.length}`);
  }

  if (!updates.length) {
    throw Object.assign(new Error("No admin order updates provided"), { status: 400 });
  }

  const result = await query(`UPDATE orders SET ${updates.join(", ")} WHERE id = $1 RETURNING *`, values);
  if (!result.rows[0]) return undefined;
  return getAdminOrder(orderId);
}

// ---------------------------------------------------------------------------
// Admin: products
// ---------------------------------------------------------------------------

export type ProductInput = {
  name: string;
  category: string;
  description: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  stockStatus: string;
  colors: string[];
  sizes: string[];
  isNew: boolean;
  flags: string[];
  image: string;
};

export type ProductVariantInput = {
  id?: string;
  sku?: string;
  color?: string;
  size?: string;
  stock: number;
};

const STOCK_STATUSES = ["In Stock", "Out of Stock", "Preorder"] as const;

function validateProductInput(input: Partial<ProductInput>): ProductInput {
  const name = String(input.name || "").trim();
  if (!name) throw Object.assign(new Error("Product name is required"), { status: 400 });
  const category = String(input.category || "").trim();
  if (!category) throw Object.assign(new Error("Category is required"), { status: 400 });
  const description = String(input.description || "").trim();
  const price = Number(input.price ?? 0);
  if (!Number.isFinite(price) || price < 0) throw Object.assign(new Error("Price must be a non-negative number"), { status: 400 });
  const originalPrice = Number(input.originalPrice ?? 0);
  if (!Number.isFinite(originalPrice) || originalPrice < 0) throw Object.assign(new Error("Original price must be a non-negative number"), { status: 400 });
  const discountPercent = Math.max(0, Math.min(100, Math.round(Number(input.discountPercent ?? 0))));
  const rating = Math.max(0, Math.min(5, Number(input.rating ?? 0)));
  const reviewCount = Math.max(0, Math.round(Number(input.reviewCount ?? 0)));
  const stockStatus = String(input.stockStatus || "In Stock");
  if (!(STOCK_STATUSES as readonly string[]).includes(stockStatus)) {
    throw Object.assign(new Error("Invalid stock status"), { status: 400 });
  }
  const colors = Array.isArray(input.colors) ? input.colors.map(String) : [];
  const sizes = Array.isArray(input.sizes) ? input.sizes.map(String) : [];
  const isNew = Boolean(input.isNew);
  const flags = Array.isArray(input.flags) ? input.flags.map(String) : [];
  const image = String(input.image || "").trim();
  return { name, category, description, price, originalPrice, discountPercent, rating, reviewCount, stockStatus, colors, sizes, isNew, flags, image };
}

export async function createProduct(input: Partial<ProductInput>): Promise<Product> {
  const data = validateProductInput(input);
  const id = nowId("prod");
  const result = await query(
    `INSERT INTO products (
      id, name, category_id, description, price, original_price, discount_percent,
      rating, review_count, stock_status, colors, sizes, is_new, image_key, flags, sort_order
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 0) RETURNING *`,
    [
      id,
      data.name,
      data.category,
      data.description,
      data.price,
      data.originalPrice,
      data.discountPercent,
      data.rating,
      data.reviewCount,
      data.stockStatus,
      data.colors,
      data.sizes,
      data.isNew,
      data.image,
      data.flags
    ]
  );
  return mapProduct(result.rows[0]);
}

export async function updateProduct(productId: string, input: Partial<ProductInput>): Promise<Product | undefined> {
  const existing = await findProduct(productId);
  if (!existing) return undefined;
  const merged: ProductInput = { ...existing, ...input };
  const data = validateProductInput(merged);
  const result = await query(
    `UPDATE products SET
      name = $2, category_id = $3, description = $4, price = $5, original_price = $6,
      discount_percent = $7, rating = $8, review_count = $9, stock_status = $10,
      colors = $11, sizes = $12, is_new = $13, image_key = $14, flags = $15
     WHERE id = $1 RETURNING *`,
    [
      productId,
      data.name,
      data.category,
      data.description,
      data.price,
      data.originalPrice,
      data.discountPercent,
      data.rating,
      data.reviewCount,
      data.stockStatus,
      data.colors,
      data.sizes,
      data.isNew,
      data.image,
      data.flags
    ]
  );
  return result.rows[0] ? mapProduct(result.rows[0]) : undefined;
}

export async function deleteProduct(productId: string): Promise<boolean> {
  const result = await query("DELETE FROM products WHERE id = $1", [productId]);
  return (result.rowCount ?? 0) > 0;
}

function validateProductVariantInput(input: ProductVariantInput): ProductVariantInput & { sku: string; color: string; size: string; stock: number } {
  const id = input.id ? String(input.id).trim() : undefined;
  const sku = String(input.sku || "").trim();
  const color = String(input.color || "").trim();
  const size = String(input.size || "").trim();
  const stock = Number(input.stock);
  if (!Number.isInteger(stock) || stock < 0) {
    throw Object.assign(new Error("Stock must be a non-negative integer"), { status: 400 });
  }
  return { id, sku, color, size, stock };
}

function validateProductVariantsInput(variants: ProductVariantInput[]) {
  const normalized = variants.map(validateProductVariantInput);
  const seen = new Set<string>();
  for (const variant of normalized) {
    const key = `${variant.color}\u0000${variant.size}`;
    if (seen.has(key)) {
      throw Object.assign(new Error("Variant color and size combinations must be unique"), { status: 400 });
    }
    seen.add(key);
  }
  return normalized;
}

export async function listProductVariants(productId: string, client?: Queryable): Promise<ProductVariant[] | undefined> {
  if (!(await findProduct(productId, client))) return undefined;
  const result = await run(client).query(
    "SELECT id, product_id, sku, color, size, stock FROM product_variants WHERE product_id = $1 ORDER BY COALESCE(color, '') ASC, COALESCE(size, '') ASC, id ASC",
    [productId]
  );
  return result.rows.map(mapProductVariant);
}

export async function saveProductVariants(productId: string, input: ProductVariantInput[]): Promise<ProductVariant[] | undefined> {
  const variants = validateProductVariantsInput(input);

  return withTransaction(async (client) => {
    if (!(await findProduct(productId, client))) return undefined;

    const existing = await client.query<{ id: string }>(
      "SELECT id FROM product_variants WHERE product_id = $1",
      [productId]
    );
    const existingIds = new Set(existing.rows.map((row) => String(row.id)));
    const submittedIds = new Set(variants.map((variant) => variant.id).filter(Boolean) as string[]);
    for (const id of submittedIds) {
      if (!existingIds.has(id)) {
        throw Object.assign(new Error("Variant not found"), { status: 404 });
      }
    }

    for (const id of existingIds) {
      if (!submittedIds.has(id)) {
        await client.query("DELETE FROM product_variants WHERE product_id = $1 AND id = $2", [productId, id]);
      }
    }

    for (const variant of variants) {
      if (variant.id) {
        await client.query(
          "UPDATE product_variants SET sku = $3, color = $4, size = $5, stock = $6 WHERE product_id = $1 AND id = $2",
          [productId, variant.id, variant.sku, variant.color, variant.size, variant.stock]
        );
      } else {
        await client.query(
          "INSERT INTO product_variants (id, product_id, sku, color, size, stock) VALUES ($1, $2, $3, $4, $5, $6)",
          [nowId("pv"), productId, variant.sku, variant.color, variant.size, variant.stock]
        );
      }
    }

    return listProductVariants(productId, client) as Promise<ProductVariant[]>;
  });
}

export async function deleteProductVariant(productId: string, variantId: string): Promise<boolean | undefined> {
  if (!(await findProduct(productId))) return undefined;
  const result = await query("DELETE FROM product_variants WHERE product_id = $1 AND id = $2", [productId, variantId]);
  return (result.rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Admin: categories
// ---------------------------------------------------------------------------

export type CategoryInput = {
  label: string;
  slug: string;
  icon: string;
  children: string[];
  sortOrder: number;
  parentId: string | null;
};

function validateCategoryInput(input: Partial<CategoryInput>): CategoryInput {
  const label = String(input.label || "").trim();
  if (!label) throw Object.assign(new Error("Category label is required"), { status: 400 });
  const slug = String(input.slug || label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")).trim();
  if (!slug) throw Object.assign(new Error("Category slug is required"), { status: 400 });
  const icon = String(input.icon || "").trim();
  const children = Array.isArray(input.children) ? input.children.map(String) : [];
  const sortOrder = Math.round(Number(input.sortOrder ?? 0));
  const parentId = input.parentId ? String(input.parentId) : null;
  return { label, slug, icon, children, sortOrder, parentId };
}

export async function createCategory(input: Partial<CategoryInput>): Promise<Category> {
  const data = validateCategoryInput(input);
  const id = nowId("cat");
  const result = await query(
    "INSERT INTO categories (id, label, slug, icon, children, sort_order, parent_id) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7) RETURNING *",
    [id, data.label, data.slug, data.icon, JSON.stringify(data.children), data.sortOrder, data.parentId]
  );
  return mapCategory(result.rows[0]);
}

export async function updateCategory(categoryId: string, input: Partial<CategoryInput>): Promise<Category | undefined> {
  const existing = (await listCategories()).find((category) => category.id === categoryId);
  if (!existing) return undefined;
  const merged: CategoryInput = {
    label: existing.label,
    slug: existing.slug,
    icon: existing.icon,
    children: existing.children,
    sortOrder: existing.sortOrder ?? 0,
    parentId: existing.parentId ?? null,
    ...input
  };
  const data = validateCategoryInput(merged);
  const result = await query(
    "UPDATE categories SET label = $2, slug = $3, icon = $4, children = $5::jsonb, sort_order = $6, parent_id = $7 WHERE id = $1 RETURNING *",
    [categoryId, data.label, data.slug, data.icon, JSON.stringify(data.children), data.sortOrder, data.parentId]
  );
  return result.rows[0] ? mapCategory(result.rows[0]) : undefined;
}

export async function deleteCategory(categoryId: string): Promise<boolean> {
  const result = await query("DELETE FROM categories WHERE id = $1", [categoryId]);
  return (result.rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Admin: coupons
// ---------------------------------------------------------------------------

export type CouponInput = {
  code: string;
  type: "percent" | "fixed";
  amount: number;
  active: boolean;
};

function validateCouponInput(input: Partial<CouponInput>): CouponInput {
  const code = String(input.code || "").trim().toUpperCase();
  if (!code) throw Object.assign(new Error("Coupon code is required"), { status: 400 });
  if (code.length > 32) throw Object.assign(new Error("Coupon code is too long"), { status: 400 });
  const type: "percent" | "fixed" = input.type === "fixed" ? "fixed" : "percent";
  const amount = Number(input.amount ?? 0);
  if (!Number.isFinite(amount) || amount < 0) throw Object.assign(new Error("Amount must be a non-negative number"), { status: 400 });
  if (type === "percent" && amount > 100) throw Object.assign(new Error("Percent coupons cannot exceed 100"), { status: 400 });
  const active = input.active === false ? false : true;
  return { code, type, amount, active };
}

export async function createCoupon(input: Partial<CouponInput>): Promise<Coupon> {
  const data = validateCouponInput(input);
  const result = await query(
    "INSERT INTO coupons (code, type, amount, active) VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO UPDATE SET type = EXCLUDED.type, amount = EXCLUDED.amount, active = EXCLUDED.active RETURNING *",
    [data.code, data.type, data.amount, data.active]
  );
  return mapCoupon(result.rows[0]);
}

export async function listCoupons(): Promise<Coupon[]> {
  const result = await query(
    "SELECT * FROM coupons ORDER BY active DESC, code ASC",
  );
  return result.rows.map(mapCoupon);
}

export async function updateCoupon(code: string, input: Partial<CouponInput>): Promise<Coupon | undefined> {
  const existing = await query("SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) LIMIT 1", [code]);
  if (!existing.rows[0]) return undefined;
  const current = mapCoupon(existing.rows[0]);
  const merged: CouponInput = { ...current, ...input };
  const data = validateCouponInput(merged);
  const result = await query(
    "UPDATE coupons SET type = $2, amount = $3, active = $4 WHERE UPPER(code) = UPPER($1) RETURNING *",
    [code, data.type, data.amount, data.active]
  );
  return result.rows[0] ? mapCoupon(result.rows[0]) : undefined;
}

export async function setCouponActive(code: string, active: boolean): Promise<Coupon | undefined> {
  const result = await query("UPDATE coupons SET active = $2 WHERE UPPER(code) = UPPER($1) RETURNING *", [code, Boolean(active)]);
  return result.rows[0] ? mapCoupon(result.rows[0]) : undefined;
}

export async function deleteCoupon(code: string): Promise<boolean> {
  const result = await query("DELETE FROM coupons WHERE UPPER(code) = UPPER($1)", [code]);
  return (result.rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Admin: contact messages
// ---------------------------------------------------------------------------

export type ContactMessageFilters = {
  status?: string;
  page?: number;
  limit?: number;
};

const CONTACT_STATUSES = ["new", "read", "replied"] as const;

export async function listContactMessages(filters: ContactMessageFilters = {}): Promise<{ messages: ContactMessage[]; total: number; page: number; limit: number }> {
  const where: string[] = [];
  const values: unknown[] = [];
  if (filters.status && (CONTACT_STATUSES as readonly string[]).includes(filters.status)) {
    values.push(filters.status);
    where.push(`status = $${values.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const totalResult = await query<{ count: string }>(`SELECT COUNT(*) AS count FROM contact_messages ${whereSql}`, values);
  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.max(1, Number(filters.limit || 25));
  const offset = (page - 1) * limit;
  const pageValues = [...values, limit, offset];
  const result = await query(
    `SELECT * FROM contact_messages ${whereSql} ORDER BY created_at DESC, id DESC LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues
  );
  return {
    messages: result.rows.map(mapContactMessage),
    total: Number(totalResult.rows[0]?.count || 0),
    page,
    limit
  };
}

export async function updateContactMessageStatus(messageId: string, status: string): Promise<ContactMessage | undefined> {
  if (!(CONTACT_STATUSES as readonly string[]).includes(status)) {
    throw Object.assign(new Error("Invalid contact status"), { status: 400 });
  }
  const result = await query("UPDATE contact_messages SET status = $2 WHERE id = $1 RETURNING *", [messageId, status]);
  return result.rows[0] ? mapContactMessage(result.rows[0]) : undefined;
}
