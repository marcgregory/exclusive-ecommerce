import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE } from "./client";
import type {
  AdminOrder,
  AdminOrdersResponse,
  CartResponse,
  CategoriesResponse,
  MeResponse,
  OrderResponse,
  OrdersResponse,
  PaymentResponse,
  ProductDetailResponse,
  ProductsResponse,
  WishlistResponse,
} from "../types";

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

type AdminOrderUpdate = {
  status?: string;
  internalNote?: string;
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
    role: "customer" | "admin";
  };
};

export const ecommerceApi = createApi({
  reducerPath: "ecommerceApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE,
    credentials: "include",
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  tagTypes: ["Catalog", "Session", "Cart", "Wishlist", "Orders", "AdminOrders"],
  endpoints: (builder) => ({
    getProducts: builder.query<ProductsResponse, void>({
      query: () => "/api/products",
      providesTags: ["Catalog"],
    }),
    getProductDetail: builder.query<ProductDetailResponse, string>({
      query: (id) => `/api/products/${encodeURIComponent(id)}`,
      providesTags: ["Catalog"],
    }),
    getCategories: builder.query<CategoriesResponse, void>({
      query: () => "/api/categories",
      providesTags: ["Catalog"],
    }),
    getMe: builder.query<MeResponse, void>({
      query: () => "/api/me",
      providesTags: ["Session"],
    }),
    getCart: builder.query<CartResponse, string | undefined>({
      query: (coupon) => `/api/cart${coupon ? `?coupon=${encodeURIComponent(coupon)}` : ""}`,
      providesTags: ["Cart"],
    }),
    getWishlist: builder.query<WishlistResponse, void>({
      query: () => "/api/wishlist",
      providesTags: ["Wishlist"],
    }),
    addCartItem: builder.mutation<CartResponse, AddCartItemInput>({
      query: (body) => ({ url: "/api/cart/items", method: "POST", body }),
      invalidatesTags: ["Cart"],
    }),
    updateCartItem: builder.mutation<CartResponse, UpdateCartItemInput>({
      query: ({ id, quantity }) => ({
        url: `/api/cart/items/${id}`,
        method: "PATCH",
        body: { quantity },
      }),
      invalidatesTags: ["Cart"],
    }),
    deleteCartItem: builder.mutation<CartResponse, string>({
      query: (id) => ({ url: `/api/cart/items/${id}`, method: "DELETE" }),
      invalidatesTags: ["Cart"],
    }),
    addWishlistProduct: builder.mutation<WishlistResponse, string>({
      query: (productId) => ({ url: `/api/wishlist/${productId}`, method: "POST" }),
      invalidatesTags: ["Wishlist"],
    }),
    deleteWishlistProduct: builder.mutation<WishlistResponse, string>({
      query: (productId) => ({ url: `/api/wishlist/${productId}`, method: "DELETE" }),
      invalidatesTags: ["Wishlist"],
    }),
    createOrder: builder.mutation<OrderResponse, CreateOrderInput>({
      query: (body) => ({ url: "/api/orders", method: "POST", body }),
      invalidatesTags: ["Cart", "Orders"],
    }),
    getOrders: builder.query<OrdersResponse, void>({
      query: () => "/api/orders",
      providesTags: ["Orders"],
    }),
    getOrderDetail: builder.query<OrderResponse, string>({
      query: (id) => `/api/orders/${encodeURIComponent(id)}`,
      providesTags: ["Orders"],
    }),
    createPayment: builder.mutation<PaymentResponse, CreatePaymentInput>({
      query: (body) => ({ url: "/api/payments", method: "POST", body }),
      invalidatesTags: ["Cart"],
    }),
    logout: builder.mutation<{ ok: true }, void>({
      query: () => ({ url: "/api/auth/logout", method: "POST" }),
      invalidatesTags: ["Session", "Cart", "Wishlist"],
    }),
    register: builder.mutation<AuthResponse, RegisterInput>({
      query: (body) => ({ url: "/api/auth/register", method: "POST", body }),
      invalidatesTags: ["Session", "Cart", "Wishlist"],
    }),
    login: builder.mutation<AuthResponse, LoginInput>({
      query: (body) => ({ url: "/api/auth/login", method: "POST", body }),
      invalidatesTags: ["Session", "Cart", "Wishlist"],
    }),
    updateProfile: builder.mutation<AuthResponse, UpdateProfileInput>({
      query: (body) => ({ url: "/api/me", method: "PATCH", body }),
      invalidatesTags: ["Session"],
    }),
    getAdminOrders: builder.query<AdminOrdersResponse, AdminOrdersFilter | undefined>({
      query: (filters) => {
        const params = new URLSearchParams({ limit: "50" });
        if (filters?.status) params.set("status", filters.status);
        if (filters?.email) params.set("email", filters.email);
        return `/api/admin/orders?${params.toString()}`;
      },
      providesTags: ["AdminOrders"],
    }),
    getAdminOrderDetail: builder.query<{ order: AdminOrder }, string>({
      query: (id) => `/api/admin/orders/${encodeURIComponent(id)}`,
      providesTags: ["AdminOrders"],
    }),
    updateAdminOrder: builder.mutation<{ order: AdminOrder }, { id: string; updates: AdminOrderUpdate }>({
      query: ({ id, updates }) => ({
        url: `/api/admin/orders/${encodeURIComponent(id)}`,
        method: "PATCH",
        body: updates,
      }),
      invalidatesTags: ["AdminOrders"],
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
  useGetCartQuery,
  useGetCategoriesQuery,
  useGetMeQuery,
  useGetOrderDetailQuery,
  useGetOrdersQuery,
  useGetProductDetailQuery,
  useGetProductsQuery,
  useGetWishlistQuery,
  useLazyGetProductDetailQuery,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
  useUpdateAdminOrderMutation,
  useUpdateCartItemMutation,
  useUpdateProfileMutation,
} = ecommerceApi;
