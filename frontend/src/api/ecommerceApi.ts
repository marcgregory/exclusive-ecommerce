import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE } from "./client";
import type {
  CartResponse,
  CategoriesResponse,
  MeResponse,
  ProductsResponse,
  WishlistResponse,
} from "../types";

type AddCartItemInput = {
  productId: string;
  quantity?: number;
  selectedColor?: string;
  selectedSize?: string;
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
    addWishlistProduct: builder.mutation<WishlistResponse, string>({
      query: (productId) => ({ url: `/api/wishlist/${productId}`, method: "POST" }),
      invalidatesTags: ["Wishlist"],
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
  useGetCartQuery,
  useGetCategoriesQuery,
  useGetMeQuery,
  useGetProductsQuery,
  useGetWishlistQuery,
  useLogoutMutation,
} = ecommerceApi;
