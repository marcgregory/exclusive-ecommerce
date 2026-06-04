import type { PoolClient, QueryResultRow } from "pg";
import { query, withTransaction } from "./db.js";
import type { Cart, CartItem, CartResponse, Category, ContactMessage, Coupon, Order, Product, User } from "./types.js";

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

type NewUser = Omit<User, "id">;
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
    passwordHash: String(row.password_hash || "")
  };
}

function mapCategory(row: QueryResultRow): Category {
  return {
    id: String(row.id),
    label: String(row.label || ""),
    slug: String(row.slug || ""),
    icon: String(row.icon || ""),
    children: Array.isArray(row.children) ? row.children.map(String) : []
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
    image: String(row.image_key || "")
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

export async function loadStore(): Promise<void> {
  await query("SELECT 1");
}

export function publicUser(user?: User | null) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function getSessionUser(req: { session?: { userId?: string } }): Promise<User | undefined> {
  const userId = req.session?.userId || "demo-user";
  const byId = await query("SELECT * FROM users WHERE id = $1 LIMIT 1", [userId]);
  if (byId.rows[0]) return mapUser(byId.rows[0]);
  const first = await query("SELECT * FROM users ORDER BY created_at, id LIMIT 1");
  return first.rows[0] ? mapUser(first.rows[0]) : undefined;
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const result = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [email]);
  return result.rows[0] ? mapUser(result.rows[0]) : undefined;
}

export async function createUser(input: NewUser): Promise<User> {
  const id = nowId("user");
  const result = await query(
    "INSERT INTO users (id, first_name, last_name, email, address, password_hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [id, input.firstName, input.lastName, input.email, input.address, input.passwordHash]
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
  const result = await query("SELECT id, label, slug, icon, children FROM categories ORDER BY sort_order ASC, id ASC");
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
  const cart = await getUserCart(userId);
  const existing = cart.items.find(
    (item) => item.productId === input.productId && item.selectedColor === input.selectedColor && item.selectedSize === input.selectedSize
  );
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
  if (!cart.items.some((item) => item.id === itemId)) return undefined;
  await query("UPDATE cart_items SET quantity = $2 WHERE id = $1", [itemId, Math.max(1, Number(quantity))]);
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

export async function createOrder(userId: string, billing: Record<string, string>, paymentMethod = "bank", couponCode?: string): Promise<Order> {
  return withTransaction(async (client: PoolClient) => {
    const cart = await getCartByUserId(userId, client);
    const totals = await toCartResponse(cart, couponCode, client);
    if (!totals.items.length) throw Object.assign(new Error("Cart is empty"), { status: 400 });

    const orderId = nowId("order");
    const orderResult = await client.query(
      `INSERT INTO orders (id, user_id, billing, payment_method, subtotal, discount, shipping, total, status)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, 'processing')
       RETURNING *`,
      [orderId, userId, JSON.stringify(billing), paymentMethod, totals.subtotal, totals.discount, totals.shipping, totals.total]
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
      orderItems.push(orderItem);
    }

    await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cart.id]);
    return mapOrder(orderResult.rows[0], orderItems);
  });
}

async function getOrderItems(orderId: string): Promise<Array<CartItem & { name: string; price: number }>> {
  const result = await query("SELECT * FROM order_items WHERE order_id = $1 ORDER BY id", [orderId]);
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
