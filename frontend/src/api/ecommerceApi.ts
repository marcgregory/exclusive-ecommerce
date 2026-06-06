import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE } from "./client";
import type {
  CartResponse,
  CategoriesResponse,
  MeResponse,
  OrderResponse,
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
  tagTypes: ["Catalog", "Session", "Cart", "Wishlist"],
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
      invalidatesTags: ["Cart"],
    }),
    createPayment: builder.mutation<PaymentResponse, CreatePaymentInput>({
      query: (body) => ({ url: "/api/payments", method: "POST", body }),
      invalidatesTags: ["Cart"],
    }),
    logout: builder.mutation<{ ok: true }, void>({
      query: () => ({ url: "/api/auth/logout", method: "POST" }),
      invalidatesTags: ["Session", "Cart", "Wishlist"],
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
  useGetCartQuery,
  useGetCategoriesQuery,
  useGetMeQuery,
  useGetProductDetailQuery,
  useGetProductsQuery,
  useGetWishlistQuery,
  useLazyGetProductDetailQuery,
  useLogoutMutation,
  useUpdateCartItemMutation,
} = ecommerceApi;
