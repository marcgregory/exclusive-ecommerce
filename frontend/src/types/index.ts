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
  imageUrl?: string;
  thumbnail?: string;
  images?: string[];
};

export type ProductVariant = {
  id: string;
  productId: string;
  sku: string;
  color: string;
  size: string;
  stock: number;
  price?: number;
  options?: Record<string, string>;
};

export type Category = {
  id: string;
  label: string;
  slug: string;
  icon: string;
  children?: string[];
  sortOrder?: number;
  parentId?: string | null;
  productCount?: number;
};

export type Coupon = {
  code: string;
  type: 'percent' | 'fixed';
  amount: number;
  active: boolean;
};

export type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  selectedColor: string;
  selectedSize: string;
  selectedOptions?: Record<string, string>;
  unitPrice?: number;
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
  role: 'customer' | 'admin';
};

export type Navigate = (href: string) => void;
export type AuthStatus = 'checking' | 'authenticated' | 'guest';

export type AddToCart = (
  productOrId: Product | string,
  quantity?: number,
  selectedColor?: string,
  selectedSize?: string,
  options?: {
    selectedOptions?: Record<string, string>;
    unitPrice?: number;
    variantId?: string;
    sku?: string;
    stock?: number;
  }
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

export type AdminProductInput = {
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
  imageUrl?: string;
  thumbnail?: string;
  images?: string[];
};

export type AdminProductListResponse = ProductsResponse;

export type AdminProductResponse = {
  product: Product;
};

export type AdminProductVariantInput = {
  id?: string;
  sku?: string;
  color?: string;
  size?: string;
  stock: number;
};

export type AdminProductVariantsResponse = {
  variants: ProductVariant[];
};

export type ProductImageUploadResponse = {
  upload: {
    url: string;
    key: string;
    width: number;
    height: number;
    contentType: string;
    size: number;
  };
};

export type ProductSort = 'featured' | 'price-asc' | 'price-desc' | 'rating';

export const PRODUCT_SORTS: { value: ProductSort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
];

export type CategoriesResponse = {
  categories: Category[];
};

export type AdminCategoryInput = {
  label: string;
  slug: string;
  icon: string;
  children: string[];
  sortOrder: number;
  parentId: string | null;
};

export type AdminCategoryListResponse = CategoriesResponse;

export type AdminCategoryResponse = {
  category: Category;
};

export type AdminCouponInput = Coupon;

export type AdminCouponListResponse = {
  coupons: Coupon[];
};

export type AdminCouponResponse = {
  coupon: Coupon;
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
  provider: 'local' | 'stripe';
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
  variants: ProductVariant[];
  related: Product[];
};

export type MeResponse = {
  user: PublicUser;
};

export type AuthResponse = MeResponse;
