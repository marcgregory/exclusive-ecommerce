import { useCallback, useMemo, useState } from "react";
import { Provider, useDispatch } from "react-redux";
import { createRoot } from "react-dom/client";
import {
  ecommerceApi,
  useAddCartItemMutation,
  useAddWishlistProductMutation,
  useGetCartQuery,
  useGetCategoriesQuery,
  useGetMeQuery,
  useGetProductsQuery,
  useGetWishlistQuery,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
  useUpdateProfileMutation,
} from "./api/ecommerceApi";
import { store, type AppDispatch } from "./app/store";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ErrorState, LoadingState } from "./components/StateViews";
import { TopHeader } from "./components/TopHeader";
import { getErrorMessage } from "./lib/errors";
import { getRtkErrorMessage, getRtkStatus } from "./lib/rtkErrors";
import { useRoute } from "./lib/router";
import { useClientErrorReporting } from "./lib/useClientErrorReporting";
import { AboutPage } from "./pages/AboutPage";
import { AccountPage } from "./pages/AccountPage";
import { AdminCategoriesPage } from "./pages/AdminCategoriesPage";
import { AdminCouponsPage } from "./pages/AdminCouponsPage";
import { AdminOrderDetailPage } from "./pages/AdminOrderDetailPage";
import { AdminOrdersPage } from "./pages/AdminOrdersPage";
import { AdminProductsPage } from "./pages/AdminProductsPage";
import { CartPage } from "./pages/CartPage";
import { CategoryPage } from "./pages/CategoryPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { ContactPage } from "./pages/ContactPage";
import { HomePage } from "./pages/HomePage";
import { OrderPage } from "./pages/OrderPage";
import { ProductDetailsPage } from "./pages/ProductDetailsPage";
import { WishlistPage } from "./pages/WishlistPage";
import type { AsyncState, AuthStatus, Cart, Category, Product, PublicUser } from "./types";
import "./styles.css";

const emptyCart: Cart = { items: [], subtotal: 0, discount: 0, shipping: 0, total: 0 };

function App() {
  useClientErrorReporting();
  const dispatch = useDispatch<AppDispatch>();
  const { path, query, navigate } = useRoute();
  const [appliedCoupon, setAppliedCoupon] = useState("");

  const productsQuery = useGetProductsQuery();
  const categoriesQuery = useGetCategoriesQuery();
  const userQuery = useGetMeQuery();
  const user = userQuery.data?.user ?? null;
  const cartQuery = useGetCartQuery(appliedCoupon || undefined, { skip: !user });
  const wishlistQuery = useGetWishlistQuery(undefined, { skip: !user });
  const [addCartItem] = useAddCartItemMutation();
  const [addWishlistProduct] = useAddWishlistProductMutation();
  const [logout, logoutState] = useLogoutMutation();

  const products: AsyncState<Product[]> = {
    data: productsQuery.data?.products ?? [],
    loading: productsQuery.isLoading,
    error: getRtkErrorMessage(productsQuery.error),
  };
  const categories: AsyncState<Category[]> = {
    data: categoriesQuery.data?.categories ?? [],
    loading: categoriesQuery.isLoading,
    error: getRtkErrorMessage(categoriesQuery.error),
  };
  const userState: AsyncState<PublicUser | null> = {
    data: user,
    loading: userQuery.isLoading,
    error: getRtkStatus(userQuery.error) === 401 ? "" : getRtkErrorMessage(userQuery.error),
  };
  const cart: AsyncState<Cart> = {
    data: cartQuery.data?.cart ?? emptyCart,
    loading: cartQuery.isLoading,
    error: getRtkErrorMessage(cartQuery.error),
  };
  const wishlistCount: AsyncState<number> = {
    data: wishlistQuery.data?.products.length ?? 0,
    loading: wishlistQuery.isLoading,
    error: getRtkErrorMessage(wishlistQuery.error),
  };

  const authStatus: AuthStatus = userState.loading ? "checking" : userState.data ? "authenticated" : "guest";

  const refreshCart = useCallback(async (coupon = "") => {
    if (coupon !== appliedCoupon) setAppliedCoupon(coupon);
    await dispatch(ecommerceApi.endpoints.getCart.initiate(coupon || undefined, { forceRefetch: true })).unwrap();
  }, [appliedCoupon, dispatch]);

  const refreshWishlist = useCallback(async () => {
    if (!userState.data) return;
    await dispatch(ecommerceApi.endpoints.getWishlist.initiate(undefined, { forceRefetch: true })).unwrap();
  }, [dispatch, userState.data]);

  const loadUser = useCallback(async () => {
    await dispatch(ecommerceApi.endpoints.getMe.initiate(undefined, { forceRefetch: true })).unwrap();
  }, [dispatch]);
  const loadProducts = productsQuery.refetch;
  const loadCategories = categoriesQuery.refetch;

  const onAdd = useCallback(async (productId: string, quantity = 1, selectedColor = "", selectedSize = "") => {
    if (!userState.data) {
      navigate("/account");
      return;
    }
    await addCartItem({ productId, quantity, selectedColor, selectedSize }).unwrap();
  }, [addCartItem, navigate, userState.data]);

  const onWishlist = useCallback(async (productId: string) => {
    if (!userState.data) {
      navigate("/account");
      return;
    }
    await addWishlistProduct(productId).unwrap();
  }, [addWishlistProduct, navigate, userState.data]);

  const handleAuthChanged = useCallback((user: PublicUser) => {
    dispatch(ecommerceApi.util.upsertQueryData("getMe", undefined, { user }));
    dispatch(ecommerceApi.util.invalidateTags(["Cart", "Wishlist"]));
  }, [dispatch]);

  const handleLogout = useCallback(async () => {
    try {
      await logout().unwrap();
    } finally {
      dispatch(ecommerceApi.util.resetApiState());
    }
  }, [dispatch, logout]);

  const page = useMemo(() => {
    const catalogRetry = () => {
      if (products.error) loadProducts();
      if (categories.error) loadCategories();
    };
    const catalogError = products.error || categories.error;
    const catalogLoading = products.loading || categories.loading;
    const catalogErrorView = (
      <main className="container page">
        <ErrorState title="We could not load the catalog" message={catalogError} action={{ label: "Try Again", onClick: catalogRetry }} />
      </main>
    );
    const catalogLoadingView = (
      <main className="container page">
        <LoadingState title="Loading products" message="We are getting the catalog ready." />
      </main>
    );

    if (path.startsWith("/category/")) {
      if (categories.loading) return catalogLoadingView;
      if (categories.error) return catalogErrorView;
      return (
        <CategoryPage
          categorySlug={path.split("/").pop()}
          query={query}
          categories={categories.data}
          navigate={navigate}
          onAdd={onAdd}
          onWishlist={onWishlist}
        />
      );
    }
    if (path === "/search") {
      if (categories.loading) return catalogLoadingView;
      if (categories.error) return catalogErrorView;
      return (
        <CategoryPage
          searchQuery={query.get("q") || ""}
          query={query}
          categories={categories.data}
          navigate={navigate}
          onAdd={onAdd}
          onWishlist={onWishlist}
        />
      );
    }
    if (path.startsWith("/product/")) return <ProductDetailsPage id={path.split("/").pop()} navigate={navigate} onAdd={onAdd} onWishlist={onWishlist} />;
    if (path.startsWith("/orders/")) return <OrderPage authStatus={authStatus} id={path.split("/").pop()} navigate={navigate} />;
    if (path === "/admin" || path === "/admin/products") return <AdminProductsPage userState={userState} navigate={navigate} />;
    if (path === "/admin/categories") return <AdminCategoriesPage userState={userState} navigate={navigate} />;
    if (path === "/admin/coupons") return <AdminCouponsPage userState={userState} navigate={navigate} />;
    if (path.startsWith("/admin/orders/")) return <AdminOrderDetailPage id={path.split("/").pop()} userState={userState} navigate={navigate} />;
    if (path === "/admin/orders") return <AdminOrdersPage userState={userState} navigate={navigate} />;
    if (path === "/cart") return <CartPage authStatus={authStatus} cart={cart.data} cartLoading={cart.loading} cartError={cart.error} navigate={navigate} refreshCart={refreshCart} appliedCoupon={appliedCoupon} onAppliedCouponChange={setAppliedCoupon} />;
    if (path === "/checkout") return <CheckoutPage authStatus={authStatus} cart={cart.data} cartLoading={cart.loading} cartError={cart.error} refreshCart={refreshCart} navigate={navigate} appliedCoupon={appliedCoupon} onCouponConsumed={() => setAppliedCoupon("")} />;
    if (path === "/account") return <AccountPage userState={userState} onAuthChanged={handleAuthChanged} onUserRefresh={loadUser} navigate={navigate} />;
    if (path === "/about") return <AboutPage />;
    if (path === "/contact") return <ContactPage />;
    if (path === "/wishlist") return <WishlistPage authStatus={authStatus} navigate={navigate} onAdd={onAdd} refreshCart={refreshCart} refreshWishlist={refreshWishlist} />;
    if (catalogLoading) return catalogLoadingView;
    if (catalogError) return catalogErrorView;
    return <HomePage products={products.data} categories={categories.data} navigate={navigate} onAdd={onAdd} onWishlist={onWishlist} />;
  }, [path, products, categories, userState, authStatus, cart, navigate, loadProducts, loadCategories, refreshCart, refreshWishlist, loadUser, handleAuthChanged, onAdd, onWishlist]);

  return (
    <>
      <TopHeader />
      <Header
        navigate={navigate}
        user={userState.data}
        cartCount={cart.data.items.reduce((sum, item) => sum + item.quantity, 0)}
        wishlistCount={wishlistCount.data}
        onLogout={handleLogout}
        logoutSaving={logoutState.isLoading}
      />
      {page}
      <button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑</button>
      <Footer />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <Provider store={store}>
      <App />
    </Provider>
  </ErrorBoundary>,
);
