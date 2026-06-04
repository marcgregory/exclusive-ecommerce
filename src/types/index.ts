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

export type Category = {
  id: string;
  label: string;
  slug: string;
  icon: string;
  children?: string[];
};

export type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  selectedColor: string;
  selectedSize: string;
  product: Product;
  lineTotal: number;
};

export type Cart = {
  id?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
};

export type OrderItem = {
  id: string;
  productId: string;
  quantity: number;
  selectedColor: string;
  selectedSize: string;
  name: string;
  price: number;
};

export type Order = {
  id: string;
  userId: string;
  items: OrderItem[];
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

export type AsyncState<T> = {
  data: T;
  loading: boolean;
  error: string;
};

export type PublicUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  role: "customer" | "admin";
};

export type Navigate = (href: string) => void;
export type AuthStatus = "checking" | "authenticated" | "guest";

export type AddToCart = (
  productId: string,
  quantity?: number,
  selectedColor?: string,
  selectedSize?: string
) => Promise<void>;

export type AddToWishlist = (productId: string) => Promise<void>;

export type RemoveFromWishlist = (productId: string) => Promise<void>;

export type RefreshCart = (coupon?: string) => Promise<void>;

export type ProductsResponse = {
  products: Product[];
  total: number;
  page: number;
  limit: number;
};

export type ProductSort = "featured" | "price-asc" | "price-desc" | "rating";

export const PRODUCT_SORTS: { value: ProductSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" }
];

export type CategoriesResponse = {
  categories: Category[];
};

export type CartResponse = {
  cart: Cart;
};

export type OrderResponse = {
  order: Order;
};

export type PaymentResult = {
  id: string;
  status: string;
  method: string;
  provider: "local" | "stripe";
  clientSecret?: string | null;
};

export type PaymentResponse = {
  payment: PaymentResult;
  order: Order;
};

export type OrdersResponse = {
  orders: Order[];
};

export type AdminOrdersResponse = {
  orders: AdminOrder[];
  total: number;
  page: number;
  limit: number;
};

export type WishlistResponse = {
  products: Product[];
};

export type ProductDetailResponse = {
  product: Product;
  related: Product[];
};

export type MeResponse = {
  user: PublicUser;
};

export type AuthResponse = MeResponse;
