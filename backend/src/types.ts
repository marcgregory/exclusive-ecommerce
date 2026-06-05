export type Category = {
  id: string;
  label: string;
  slug: string;
  icon: string;
  children: string[];
  sortOrder: number;
  parentId: string | null;
};

export type Product = {
  id: string;
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

export type Coupon = {
  code: string;
  type: "percent" | "fixed";
  amount: number;
  active: boolean;
};

export type UserRole = "customer" | "admin";

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  passwordHash: string;
  role: UserRole;
};

export type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  selectedColor: string;
  selectedSize: string;
};

export type Cart = {
  id: string;
  userId: string;
  items: CartItem[];
};

export type Wishlist = {
  userId: string;
  productIds: string[];
};

export type Order = {
  id: string;
  userId: string;
  items: Array<CartItem & { name: string; price: number }>;
  billing: Record<string, string>;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  status: string;
  createdAt: string;
};

export type AdminOrder = Order & {
  customerEmail: string;
  customerName: string;
  internalNote: string;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  createdAt: string;
};

export type StoreState = {
  users: User[];
  categories: Category[];
  products: Product[];
  carts: Cart[];
  wishlists: Wishlist[];
  orders: Order[];
  coupons: Coupon[];
  contactMessages: ContactMessage[];
};

export type CartResponseItem = CartItem & {
  product: Product;
  lineTotal: number;
};

export type CartResponse = {
  id: string;
  items: CartResponseItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon: Coupon | null;
};
