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
};

export type Navigate = (href: string) => void;

export type AddToCart = (
  productId: string,
  quantity?: number,
  selectedColor?: string,
  selectedSize?: string
) => Promise<void>;

export type AddToWishlist = (productId: string) => Promise<void>;

export type RefreshCart = (coupon?: string) => Promise<void>;

export type ProductsResponse = {
  products: Product[];
};

export type CategoriesResponse = {
  categories: Category[];
};

export type CartResponse = {
  cart: Cart;
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
