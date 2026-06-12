import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { closePool, query } from './db.js';
import { migrate } from './migrate.js';
import { seedDatabase } from './seed-db.js';

vi.mock('./image-storage.js', async () => {
  const actual = await vi.importActual('./image-storage.js');
  return {
    ...actual,
    uploadBufferToCloudinary: vi.fn().mockResolvedValue({
      secure_url: 'http://localhost/image.jpg',
      width: 800,
      height: 600,
      bytes: 1000,
      public_id: 'test/public_id',
    }),
  };
});

import {
  addCartItem,
  addWishlistProduct,
  createContactMessage,
  createCategory,
  createCoupon,
  createOrder,
  createProduct,
  createUser,
  deleteCartItem,
  deleteCategory,
  deleteCoupon,
  deleteProduct,
  deleteProductVariant,
  deleteWishlistProduct,
  findUserByEmail,
  getAdminOrder,
  getSessionUser,
  getUserCart,
  getWishlistProducts,
  listAdminOrders,
  listContactMessages,
  listCoupons,
  listCategories,
  listProductVariants,
  listProducts,
  saveProductVariants,
  setCouponActive,
  toCartResponse,
  updateCartItem,
  updateCategory,
  updateContactMessageStatus,
  updateAdminOrder,
  updateOrderStatus,
  updateProduct,
  updateUser,
  validateCoupon,
} from './store.js';

beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL is required for PostgreSQL persistence tests');
  }
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  // Ensure we use local image storage for tests to avoid needing Cloudinary credentials
  process.env.IMAGE_STORAGE_PROVIDER = 'local';
  await migrate();
  return async () => {
    await closePool();
  };
});

beforeEach(async () => {
  await seedDatabase();
});

describe('PostgreSQL persistence', () => {
  it('runs migrations and seeds catalog data', async () => {
    const tables = await query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('products', 'categories', 'coupons', 'users')"
    );
    expect(tables.rows).toHaveLength(4);

    const products = await listProducts();
    expect(products.total).toBeGreaterThan(0);
    expect(await validateCoupon('EXCLUSIVE10')).toMatchObject({
      code: 'EXCLUSIVE10',
      active: true,
    });
    expect(await getSessionUser({})).toBeUndefined();
    expect(await getSessionUser({ session: { userId: 'demo-user' } })).toMatchObject({
      id: 'demo-user',
      email: 'rimel@example.com',
    });
  });

  it('filters, searches, sorts, and paginates products', async () => {
    const electronics = await listProducts({
      category: 'electronics',
      flag: 'best',
      sort: 'price-desc',
      page: 1,
      limit: 2,
    });

    expect(electronics.products).toHaveLength(2);
    expect(
      electronics.products.every(
        (product) => product.category === 'electronics' && product.flags.includes('best')
      )
    ).toBe(true);
    expect(electronics.products[0].price).toBeGreaterThanOrEqual(electronics.products[1].price);

    const search = await listProducts({ q: 'keyboard' });
    expect(search.products.map((product) => product.id)).toContain('ak-keyboard');
  });

  it('calculates cart totals from repository-backed products and coupons', async () => {
    const cart = {
      id: 'test-cart',
      userId: 'demo-user',
      items: [
        {
          id: 'item-1',
          productId: 'havic-gamepad',
          quantity: 2,
          selectedColor: '#db4444',
          selectedSize: 'M',
        },
        {
          id: 'item-2',
          productId: 'rgb-cooler',
          quantity: 1,
          selectedColor: '#111111',
          selectedSize: '',
        },
      ],
    };

    const result = await toCartResponse(cart, 'EXCLUSIVE10');

    expect(result.subtotal).toBe(400);
    expect(result.discount).toBe(40);
    expect(result.shipping).toBe(16);
    expect(result.total).toBe(376);
    expect(result.items).toHaveLength(2);
  });

  it('creates, updates, and deletes cart items', async () => {
    const added = await addCartItem('demo-user', {
      productId: 'rgb-cooler',
      quantity: 2,
      selectedColor: '#111111',
      selectedSize: '',
    });
    const item = added.items.find((entry) => entry.productId === 'rgb-cooler');
    expect(item?.quantity).toBe(2);

    const updated = await updateCartItem('demo-user', item!.id, 3);
    expect(updated?.items.find((entry) => entry.id === item!.id)?.quantity).toBe(3);

    const deleted = await deleteCartItem('demo-user', item!.id);
    expect(deleted.items.some((entry) => entry.id === item!.id)).toBe(false);
  });

  it('rejects cart quantities above available variant stock', async () => {
    // Create a product with a single variant
    const category = (await listCategories()).find((c) => c.slug === 'electronics');
    const productName = `Test Product ${Date.now()}`;
    const product = await createProduct({
      name: productName,
      category: category.id,
      description: 'Test product',
      price: 10,
      originalPrice: 15,
      discountPercent: 0,
      rating: 0,
      reviewCount: 0,
      stockStatus: 'In Stock',
      colors: ['#ff0000'],
      sizes: ['M'],
      isNew: false,
      flags: [],
    });

    // Create a variant for the product with stock 2
    await saveProductVariants(product.id, [
      {
        sku: 'TEST-SKU',
        color: '#ff0000',
        size: 'M',
        stock: 2,
      },
    ]);

    // Attempt to add 3 items -> should fail
    await expect(
      addCartItem('demo-user', {
        productId: product.id,
        quantity: 3,
        selectedColor: '#ff0000',
        selectedSize: 'M',
      })
    ).rejects.toThrow(`Only 2 ${productName} items are available`);

    // Add 2 items -> should succeed
    const added = await addCartItem('demo-user', {
      productId: product.id,
      quantity: 2,
      selectedColor: '#ff0000',
      selectedSize: 'M',
    });
    const item = added.items.find((entry) => entry.productId === product.id);

    // Attempt to increase quantity to 3 -> should fail
    await expect(updateCartItem('demo-user', item!.id, 3)).rejects.toThrow(
      `Only 2 ${productName} items are available`
    );
  });

  it('adds, lists, and removes wishlist products', async () => {
    const added = await addWishlistProduct('demo-user', 'havic-gamepad');
    expect(added.map((product) => product.id)).toContain('havic-gamepad');

    const listed = await getWishlistProducts('demo-user');
    expect(listed.map((product) => product.id)).toContain('havic-gamepad');

    const removed = await deleteWishlistProduct('demo-user', 'havic-gamepad');
    expect(removed.map((product) => product.id)).not.toContain('havic-gamepad');
  });

  it('creates and updates users', async () => {
    const user = await createUser({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      address: 'London',
      passwordHash: 'hashed',
    });

    expect(user.role).toBe('customer');
    expect(await findUserByEmail('ADA@example.com')).toMatchObject({
      id: user.id,
      role: 'customer',
    });

    const updated = await updateUser(user.id, { address: 'New address' });
    expect(updated).toMatchObject({
      address: 'New address',
      email: 'ada@example.com',
      role: 'customer',
    });
  });

  it('creates orders transactionally and clears the cart', async () => {
    const order = await createOrder(
      'demo-user',
      {
        firstName: 'Md',
        streetAddress: '123 Main',
        townCity: 'Dhaka',
        phone: '123',
        email: 'rimel@example.com',
      },
      'bank',
      'EXCLUSIVE10'
    );

    expect(order.items).toHaveLength(1);
    expect(order.total).toBe(232);
    expect((await getUserCart('demo-user')).items).toHaveLength(0);
  });

  it('saves checkout billing details to the user profile when requested', async () => {
    const billing = {
      firstName: 'Saved',
      companyName: 'Exclusive Co',
      streetAddress: '789 Billing Lane',
      apartment: 'Floor 4',
      townCity: 'Dhaka',
      phone: '555-0188',
      email: 'saved-billing@example.com',
    };

    await createOrder('demo-user', billing, 'bank', undefined, undefined, true);

    const user = await getSessionUser({ session: { userId: 'demo-user' } });
    expect(user?.address).toBe('789 Billing Lane');
    expect(user?.checkoutBilling).toMatchObject(billing);
  });

  it('returns the same pending order when checkout retries with the same idempotency key', async () => {
    const billing = {
      firstName: 'Md',
      streetAddress: '123 Main',
      townCity: 'Dhaka',
      phone: '123',
      email: 'rimel@example.com',
    };
    const firstOrder = await createOrder(
      'demo-user',
      billing,
      'stripe',
      'EXCLUSIVE10',
      'checkout-retry-1'
    );
    const retriedOrder = await createOrder(
      'demo-user',
      billing,
      'stripe',
      'EXCLUSIVE10',
      'checkout-retry-1'
    );

    expect(retriedOrder.id).toBe(firstOrder.id);
    expect(retriedOrder.items).toHaveLength(firstOrder.items.length);
    expect((await getUserCart('demo-user')).items).toHaveLength(0);
  });

  it('checks stock during checkout and decrements purchased variants', async () => {
    await query(
      'UPDATE product_variants SET stock = 1 WHERE product_id = $1 AND color = $2 AND size = $3',
      ['havic-gamepad', '#db4444', 'M']
    );

    await expect(
      createOrder(
        'demo-user',
        {
          firstName: 'Md',
          streetAddress: '123 Main',
          townCity: 'Dhaka',
          phone: '123',
          email: 'rimel@example.com',
        },
        'bank'
      )
    ).rejects.toThrow('Only 1 HAVIT HV-G92 Gamepad item is available');

    await query('UPDATE cart_items SET quantity = 1 WHERE id = $1', ['ci-1']);
    const order = await createOrder(
      'demo-user',
      {
        firstName: 'Md',
        streetAddress: '123 Main',
        townCity: 'Dhaka',
        phone: '123',
        email: 'rimel@example.com',
      },
      'bank'
    );
    const stock = await query(
      'SELECT stock FROM product_variants WHERE product_id = $1 AND color = $2 AND size = $3',
      ['havic-gamepad', '#db4444', 'M']
    );

    expect(order.items[0].quantity).toBe(1);
    expect(Number(stock.rows[0].stock)).toBe(0);
  });

  it('persists contact submissions with API-shaped fields', async () => {
    const message = await createContactMessage({
      name: 'Ada',
      email: 'ada@example.com',
      phone: '',
      message: 'Hello',
    });

    expect(message).toMatchObject({ name: 'Ada', email: 'ada@example.com', status: 'new' });
    expect(message.createdAt).toEqual(expect.any(String));
  });

  it('exposes role on the session user', async () => {
    const adminSession = await getSessionUser({ session: { userId: 'demo-user' } });
    expect(adminSession).toMatchObject({ role: 'admin' });
  });

  it('creates, updates, and deletes products via the admin repo', async () => {
    const product = await createProduct({
      name: 'Test Drone',
      category: 'electronics',
      description: 'Quadcopter with HD camera',
      price: 199,
      originalPrice: 249,
      discountPercent: 20,
      rating: 4.5,
      reviewCount: 12,
      stockStatus: 'In Stock',
      colors: ['#111111'],
      sizes: [],
      isNew: true,
      flags: ['flash'],
      image: 'drone',
    });

    expect(product).toMatchObject({ name: 'Test Drone', price: 199, isNew: true });
    const found = await query('SELECT * FROM products WHERE id = $1', [product.id]);
    expect(found.rows[0].image_key).toBe('drone');

    const updated = await updateProduct(product.id, { price: 150, stockStatus: 'Out of Stock' });
    expect(updated).toMatchObject({ price: 150, stockStatus: 'Out of Stock' });

    expect(await deleteProduct(product.id)).toBe(true);
    expect(await deleteProduct(product.id)).toBe(false);
  });

  it('lists, saves, validates, and deletes product variants via the admin repo', async () => {
    const beforeProduct = (
      await query('SELECT colors, sizes FROM products WHERE id = $1', ['havic-gamepad'])
    ).rows[0];
    const original = await listProductVariants('havic-gamepad');
    expect(original?.length).toBeGreaterThan(0);

    const saved = await saveProductVariants('havic-gamepad', [
      {
        id: original![0].id,
        color: '#db4444',
        size: 'M',
        sku: 'GAMEPAD-RED-M',
        stock: 7,
      },
      {
        color: '#222222',
        size: 'XL',
        sku: 'GAMEPAD-BLK-L',
        stock: 3,
      },
    ]);

    expect(saved).toHaveLength(2);
    expect(saved).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sku: 'GAMEPAD-RED-M', stock: 7 }),
        expect.objectContaining({ color: '#222222', size: 'XL', sku: 'GAMEPAD-BLK-L', stock: 3 }),
      ])
    );
    expect(saved?.some((variant) => variant.id === original![1]?.id)).toBe(false);

    const afterProduct = (
      await query('SELECT colors, sizes FROM products WHERE id = $1', ['havic-gamepad'])
    ).rows[0];
    expect(afterProduct.colors).toEqual(beforeProduct.colors);
    expect(afterProduct.sizes).toEqual(beforeProduct.sizes);

    await expect(
      saveProductVariants('havic-gamepad', [{ color: 'Black', size: 'M', stock: -1 }])
    ).rejects.toThrow('Stock must be a non-negative integer');
    await expect(
      saveProductVariants('havic-gamepad', [
        { color: 'Black', size: 'M', stock: 1 },
        { color: 'Black', size: 'M', stock: 2 },
      ])
    ).rejects.toThrow('Variant color and size combinations must be unique');

    expect(await deleteProductVariant('havic-gamepad', saved![0].id)).toBe(true);
    expect(await deleteProductVariant('havic-gamepad', saved![0].id)).toBe(false);
    expect(await listProductVariants('missing-product')).toBeUndefined();
  });

  it('creates, partially updates, and deletes categories via the admin repo', async () => {
    const parent = await createCategory({
      label: 'Admin Test Parent',
      slug: 'admin-test-parent',
      icon: 'folder',
      children: [],
      sortOrder: 7,
      parentId: null,
    });
    const category = await createCategory({
      label: 'Admin Test Accessories',
      slug: 'admin-test-accessories',
      icon: 'spark',
      children: ['cables'],
      sortOrder: 12,
      parentId: parent.id,
    });

    expect(category).toMatchObject({
      label: 'Admin Test Accessories',
      slug: 'admin-test-accessories',
      sortOrder: 12,
      parentId: parent.id,
    });

    const updated = await updateCategory(category.id, {
      label: 'Admin Test Gear',
      children: ['cables', 'chargers'],
    });

    expect(updated).toMatchObject({
      label: 'Admin Test Gear',
      slug: 'admin-test-accessories',
      children: ['cables', 'chargers'],
      sortOrder: 12,
      parentId: parent.id,
    });

    expect(await deleteCategory(category.id)).toBe(true);
    expect(await deleteCategory(parent.id)).toBe(true);
    expect(await deleteCategory(category.id)).toBe(false);
  });

  it('advances order status through valid transitions', async () => {
    const order = await createOrder(
      'demo-user',
      {
        firstName: 'Md',
        streetAddress: '1 St',
        townCity: 'Dhaka',
        phone: '1',
        email: 'rimel@example.com',
      },
      'bank'
    );

    const initial = await getAdminOrder(order.id);
    expect(initial).toMatchObject({ id: order.id, internalNote: '' });

    const shipped = await updateOrderStatus(order.id, 'shipped');
    expect(shipped).toMatchObject({ id: order.id, status: 'shipped' });

    const fetched = await getAdminOrder(order.id);
    expect(fetched).toMatchObject({
      id: order.id,
      status: 'shipped',
      customerEmail: 'rimel@example.com',
    });

    await expect(updateOrderStatus(order.id, 'nope')).rejects.toThrow('Invalid order status');
  });

  it('saves a persistent internal admin order note', async () => {
    const order = await createOrder(
      'demo-user',
      {
        firstName: 'Md',
        streetAddress: '1 St',
        townCity: 'Dhaka',
        phone: '1',
        email: 'rimel@example.com',
      },
      'bank'
    );

    const noted = await updateAdminOrder(order.id, {
      internalNote: 'Customer called about expedited handling.',
    });
    expect(noted).toMatchObject({
      id: order.id,
      internalNote: 'Customer called about expedited handling.',
    });

    const fetched = await getAdminOrder(order.id);
    expect(fetched).toMatchObject({
      id: order.id,
      internalNote: 'Customer called about expedited handling.',
    });

    await expect(updateAdminOrder(order.id, { internalNote: 'x'.repeat(5001) })).rejects.toThrow(
      'Internal note cannot exceed 5000 characters'
    );
  });

  it('filters admin order listings by status and email', async () => {
    await createOrder(
      'demo-user',
      {
        firstName: 'Md',
        streetAddress: '1 St',
        townCity: 'Dhaka',
        phone: '1',
        email: 'rimel@example.com',
      },
      'bank'
    );
    const all = await listAdminOrders();
    expect(all.orders).toHaveLength(1);

    const filtered = await listAdminOrders({ status: 'processing' });
    expect(filtered.orders).toHaveLength(1);

    const empty = await listAdminOrders({ email: 'nobody@example.com' });
    expect(empty.orders).toHaveLength(0);
    expect(empty.total).toBe(0);
  });

  it('soft-toggles and creates coupons', async () => {
    const created = await createCoupon({
      code: 'SUMMER25',
      type: 'percent',
      amount: 25,
      active: true,
    });
    expect(created).toMatchObject({ code: 'SUMMER25', amount: 25, active: true });
    expect((await listCoupons()).map((coupon) => coupon.code)).toContain('SUMMER25');

    const toggled = await setCouponActive('SUMMER25', false);
    expect(toggled).toMatchObject({ code: 'SUMMER25', active: false });
    expect(await validateCoupon('SUMMER25')).toBeNull();

    expect(await deleteCoupon('SUMMER25')).toBe(true);
    expect(await deleteCoupon('SUMMER25')).toBe(false);
  });

  it('lists and updates contact message status', async () => {
    const message = await createContactMessage({
      name: 'Ada',
      email: 'ada@example.com',
      phone: '555',
      message: 'Hi',
    });
    const listed = await listContactMessages({ status: 'new' });
    expect(listed.messages.map((m) => m.id)).toContain(message.id);

    const updated = await updateContactMessageStatus(message.id, 'replied');
    expect(updated).toMatchObject({ id: message.id, status: 'replied' });
  });
});
