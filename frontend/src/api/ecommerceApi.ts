import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE } from './client';
import type {
  AdminCategoryInput,
  AdminCategoryResponse,
  AdminCouponInput,
  AdminCouponListResponse,
  AdminCouponResponse,
  AdminOrder,
  AdminOrdersResponse,
  AdminProductInput,
  AdminProductListResponse,
  AdminProductResponse,
  AdminProductVariantsResponse,
  CartResponse,
  CategoriesResponse,
  CouponValidationResponse,
  MeResponse,
  OrderResponse,
  OrdersResponse,
  PaymentResponse,
  ProductDetailResponse,
  ProductsResponse,
  WishlistResponse,
} from '../types';

type AddCartItemInput = {
  productId: string;
  quantity?: number;
  selectedColor?: string;
  selectedSize?: string;
};

type UpdateCartItemInput = {
  id: string;
  quantity: number;
};

type CreateOrderInput = {
  billing: Record<string, string>;
  paymentMethod: string;
  couponCode?: string;
  idempotencyKey: string;
  saveBillingInfo?: boolean;
  items?: Array<{
    productId: string;
    quantity: number;
    selectedColor?: string;
    selectedSize?: string;
  }>;
};

type CreatePaymentInput = {
  orderId: string;
  paymentMethod: string;
};

type AdminOrdersFilter = {
  status?: string;
  email?: string;
  limit?: number;
};

type ContactInput = {
  name: string;
  email: string;
  phone?: string;
  message: string;
};

type AdminOrderUpdate = {
  status?: string;
  internalNote?: string;
};

type AdminProductsFilter = {
  q?: string;
  limit?: number;
};

type ProductsFilter = {
  category?: string;
  q?: string;
  flag?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

type RegisterInput = {
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  confirmPassword?: string;
  address?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type GoogleAuthInput = {
  code: string;
};

type UpdateProfileInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  address?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

type AuthResponse = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    address: string;
    checkoutBilling?: Record<string, string>;
    role: 'customer' | 'admin';
  };
};

const customBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  credentials: 'include',
  prepareHeaders: (headers) => {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return headers;
  },
});

export const ecommerceApi = createApi({
  reducerPath: 'ecommerceApi',
  baseQuery: customBaseQuery,
  tagTypes: [
    'Catalog',
    'Session',
    'Cart',
    'Wishlist',
    'Orders',
    'AdminOrders',
    'AdminProducts',
    'AdminProductVariants',
    'AdminCoupons',
  ],
  endpoints: (builder) => ({
    getProducts: builder.query<ProductsResponse, void>({
      query: () => '/api/products',
      providesTags: ['Catalog'],
    }),
    getFilteredProducts: builder.query<ProductsResponse, ProductsFilter>({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters.category) params.set('category', filters.category);
        if (filters.q) params.set('q', filters.q);
        if (filters.flag) params.set('flag', filters.flag);
        if (filters.sort && filters.sort !== 'featured') params.set('sort', filters.sort);
        if (filters.page) params.set('page', String(filters.page));
        if (filters.limit) params.set('limit', String(filters.limit));
        return `/api/products?${params.toString()}`;
      },
      providesTags: ['Catalog'],
    }),
    getProductDetail: builder.query<ProductDetailResponse, string>({
      query: (id) => `/api/products/${encodeURIComponent(id)}`,
      providesTags: ['Catalog'],
    }),
    getCategories: builder.query<CategoriesResponse, void>({
      query: () => '/api/categories',
      providesTags: ['Catalog'],
    }),
    getMe: builder.query<MeResponse, void>({
      query: () => '/api/auth/me',
      providesTags: ['Session'],
    }),
    getCart: builder.query<CartResponse, string | undefined>({
      query: (coupon) => `/api/cart${coupon ? `?coupon=${encodeURIComponent(coupon)}` : ''}`,
      providesTags: ['Cart'],
    }),
    validateCoupon: builder.mutation<CouponValidationResponse, string>({
      query: (code) => ({ url: '/api/coupons/validate', method: 'POST', body: { code } }),
    }),
    getWishlist: builder.query<WishlistResponse, void>({
      query: () => '/api/wishlist',
      providesTags: ['Wishlist'],
    }),
    addCartItem: builder.mutation<CartResponse, AddCartItemInput>({
      query: (body) => ({ url: '/api/cart/items', method: 'POST', body }),
      invalidatesTags: ['Cart'],
    }),
    updateCartItem: builder.mutation<CartResponse, UpdateCartItemInput>({
      query: ({ id, quantity }) => ({
        url: `/api/cart/items/${id}`,
        method: 'PATCH',
        body: { quantity },
      }),
      invalidatesTags: ['Cart'],
    }),
    deleteCartItem: builder.mutation<CartResponse, string>({
      query: (id) => ({ url: `/api/cart/items/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Cart'],
    }),
    addWishlistProduct: builder.mutation<WishlistResponse, string>({
      query: (productId) => ({ url: `/api/wishlist/${productId}`, method: 'POST' }),
      invalidatesTags: ['Wishlist'],
    }),
    deleteWishlistProduct: builder.mutation<WishlistResponse, string>({
      query: (productId) => ({ url: `/api/wishlist/${productId}`, method: 'DELETE' }),
      invalidatesTags: ['Wishlist'],
    }),
    createOrder: builder.mutation<OrderResponse, CreateOrderInput>({
      query: (body) => ({ url: '/api/orders', method: 'POST', body }),
      invalidatesTags: ['Cart', 'Orders'],
    }),
    getOrders: builder.query<OrdersResponse, void>({
      query: () => '/api/orders',
      providesTags: ['Orders'],
    }),
    getOrderDetail: builder.query<OrderResponse, string>({
      query: (id) => `/api/orders/${encodeURIComponent(id)}`,
      providesTags: ['Orders'],
    }),
    createPayment: builder.mutation<PaymentResponse, CreatePaymentInput>({
      query: (body) => ({ url: '/api/payments', method: 'POST', body }),
      invalidatesTags: ['Cart'],
    }),
    logout: builder.mutation<{ ok: true }, void>({
      query: () => ({ url: '/api/auth/logout', method: 'POST' }),
      invalidatesTags: ['Session', 'Cart', 'Wishlist'],
    }),
    register: builder.mutation<AuthResponse, RegisterInput>({
      query: (body) => ({ url: '/api/auth/register', method: 'POST', body }),
      invalidatesTags: ['Session', 'Cart', 'Wishlist'],
    }),
    login: builder.mutation<AuthResponse, LoginInput>({
      query: (body) => ({ url: '/api/auth/login', method: 'POST', body }),
      invalidatesTags: ['Session', 'Cart', 'Wishlist'],
    }),
    googleAuth: builder.mutation<AuthResponse, GoogleAuthInput>({
      query: (body) => ({ url: '/api/auth/google', method: 'POST', body }),
      invalidatesTags: ['Session', 'Cart', 'Wishlist'],
    }),
    updateProfile: builder.mutation<AuthResponse, UpdateProfileInput>({
      query: (body) => ({ url: '/api/auth/me', method: 'PATCH', body }),
      invalidatesTags: ['Session'],
    }),
    getAdminOrders: builder.query<AdminOrdersResponse, AdminOrdersFilter | undefined>({
      query: (filters) => {
        const params = new URLSearchParams({ limit: '50' });
        if (filters?.status) params.set('status', filters.status);
        if (filters?.email) params.set('email', filters.email);
        return `/api/admin/orders?${params.toString()}`;
      },
      providesTags: ['AdminOrders'],
    }),
    getAdminOrderDetail: builder.query<{ order: AdminOrder }, string>({
      query: (id) => `/api/admin/orders/${encodeURIComponent(id)}`,
      providesTags: ['AdminOrders'],
    }),
    updateAdminOrder: builder.mutation<
      { order: AdminOrder },
      { id: string; updates: AdminOrderUpdate }
    >({
      query: ({ id, updates }) => ({
        url: `/api/admin/orders/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: ['AdminOrders'],
    }),
    getAdminProducts: builder.query<AdminProductListResponse, AdminProductsFilter | undefined>({
      query: (filters) => {
        const params = new URLSearchParams({ limit: '50' });
        if (filters?.q) params.set('q', filters.q);
        return `/api/admin/products?${params.toString()}`;
      },
      providesTags: ['AdminProducts'],
    }),
    getAdminProductDetail: builder.query<AdminProductResponse, string>({
      query: (id) => `/api/admin/products/${encodeURIComponent(id)}`,
      providesTags: ['AdminProducts'],
    }),
    createAdminProduct: builder.mutation<AdminProductResponse, AdminProductInput>({
      query: (body) => ({
        url: '/api/admin/products',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminProducts'],
    }),
    updateAdminProduct: builder.mutation<
      AdminProductResponse,
      { id: string; updates: Partial<AdminProductInput> }
    >({
      query: ({ id, updates }) => ({
        url: `/api/admin/products/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: ['AdminProducts'],
    }),
    deleteAdminProduct: builder.mutation<{ ok: true }, string>({
      query: (id) => ({
        url: `/api/admin/products/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminProducts'],
    }),
    getAdminProductVariants: builder.query<AdminProductVariantsResponse, string>({
      query: (productId) => `/api/admin/products/${encodeURIComponent(productId)}/variants`,
      providesTags: ['AdminProductVariants'],
    }),
    updateAdminProductVariants: builder.mutation<
      AdminProductVariantsResponse,
      { productId: string; variants: any[] }
    >({
      query: ({ productId, variants }) => ({
        url: `/api/admin/products/${encodeURIComponent(productId)}/variants`,
        method: 'PUT',
        body: { variants },
      }),
      invalidatesTags: ['AdminProductVariants'],
    }),
    createAdminCategory: builder.mutation<AdminCategoryResponse, AdminCategoryInput>({
      query: (body) => ({
        url: '/api/admin/categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Catalog'],
    }),
    updateAdminCategory: builder.mutation<
      AdminCategoryResponse,
      { id: string; updates: Partial<AdminCategoryInput> }
    >({
      query: ({ id, updates }) => ({
        url: `/api/admin/categories/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: ['Catalog'],
    }),
    deleteAdminCategory: builder.mutation<{ ok: true }, string>({
      query: (id) => ({
        url: `/api/admin/categories/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Catalog'],
    }),
    getAdminCoupons: builder.query<AdminCouponListResponse, void>({
      query: () => '/api/admin/coupons',
      providesTags: ['AdminCoupons'],
    }),
    createAdminCoupon: builder.mutation<AdminCouponResponse, AdminCouponInput>({
      query: (body) => ({
        url: '/api/admin/coupons',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminCoupons'],
    }),
    updateAdminCoupon: builder.mutation<
      AdminCouponResponse,
      { code: string; updates: Partial<AdminCouponInput> }
    >({
      query: ({ code, updates }) => ({
        url: `/api/admin/coupons/${encodeURIComponent(code)}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: ['AdminCoupons'],
    }),
    deleteAdminCoupon: builder.mutation<{ ok: true }, string>({
      query: (code) => ({
        url: `/api/admin/coupons/${encodeURIComponent(code)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminCoupons'],
    }),
    sendContactMessage: builder.mutation<{ message: { id: string } }, ContactInput>({
      query: (body) => ({ url: '/api/contact', method: 'POST', body }),
    }),
  }),
});

export const {
  useAddCartItemMutation,
  useAddWishlistProductMutation,
  useCreateOrderMutation,
  useCreatePaymentMutation,
  useDeleteCartItemMutation,
  useDeleteWishlistProductMutation,
  useGetAdminOrderDetailQuery,
  useGetAdminOrdersQuery,
  useGetAdminProductDetailQuery,
  useGetAdminProductsQuery,
  useGetAdminProductVariantsQuery,
  useGetCartQuery,
  useGetCategoriesQuery,
  useGetMeQuery,
  useGetOrderDetailQuery,
  useGetOrdersQuery,
  useGetProductDetailQuery,
  useGetProductsQuery,
  useGetFilteredProductsQuery,
  useGetWishlistQuery,
  useLazyGetProductDetailQuery,
  useLoginMutation,
  useGoogleAuthMutation,
  useLogoutMutation,
  useRegisterMutation,
  useCreateAdminProductMutation,
  useUpdateAdminProductMutation,
  useDeleteAdminProductMutation,
  useUpdateAdminProductVariantsMutation,
  useUpdateAdminOrderMutation,
  useUpdateCartItemMutation,
  useUpdateProfileMutation,
  useCreateAdminCategoryMutation,
  useUpdateAdminCategoryMutation,
  useDeleteAdminCategoryMutation,
  useGetAdminCouponsQuery,
  useCreateAdminCouponMutation,
  useUpdateAdminCouponMutation,
  useDeleteAdminCouponMutation,
  useValidateCouponMutation,
  useSendContactMessageMutation,
  useLazyGetFilteredProductsQuery,
} = ecommerceApi;
