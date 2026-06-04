import { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ApiError, api } from "./api/client";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { ErrorState, LoadingState } from "./components/StateViews";
import { TopHeader } from "./components/TopHeader";
import { getErrorMessage } from "./lib/errors";
import { useRoute } from "./lib/router";
import { AboutPage } from "./pages/AboutPage";
import { AccountPage } from "./pages/AccountPage";
import { CartPage } from "./pages/CartPage";
import { CategoryPage } from "./pages/CategoryPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { ContactPage } from "./pages/ContactPage";
import { HomePage } from "./pages/HomePage";
import { OrderPage } from "./pages/OrderPage";
import { ProductDetailsPage } from "./pages/ProductDetailsPage";
import { WishlistPage } from "./pages/WishlistPage";
import type { AsyncState, AuthStatus, Cart, CategoriesResponse, Category, MeResponse, ProductsResponse, Product, PublicUser, WishlistResponse } from "./types";
import "./styles.css";

const emptyCart: Cart = { items: [], subtotal: 0, discount: 0, shipping: 0, total: 0 };

function App() {
  const { path, query, navigate } = useRoute();
  const [products, setProducts] = useState<AsyncState<Product[]>>({ data: [], loading: true, error: "" });
  const [categories, setCategories] = useState<AsyncState<Category[]>>({ data: [], loading: true, error: "" });
  const [userState, setUserState] = useState<AsyncState<PublicUser | null>>({ data: null, loading: true, error: "" });
  const [cart, setCart] = useState<AsyncState<Cart>>({ data: emptyCart, loading: false, error: "" });
  const [wishlistCount, setWishlistCount] = useState<AsyncState<number>>({ data: 0, loading: false, error: "" });
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [logoutSaving, setLogoutSaving] = useState(false);

  const authStatus: AuthStatus = userState.loading ? "checking" : userState.data ? "authenticated" : "guest";

  const resetPrivateState = useCallback(() => {
    setCart({ data: emptyCart, loading: false, error: "" });
    setWishlistCount({ data: 0, loading: false, error: "" });
  }, []);

  const loadProducts = useCallback(async () => {
    setProducts((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await api<ProductsResponse>("/api/products");
      setProducts({ data: data.products, loading: false, error: "" });
    } catch (error) {
      setProducts((current) => ({ ...current, loading: false, error: getErrorMessage(error) }));
    }
  }, []);

  const loadCategories = useCallback(async () => {
    setCategories((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await api<CategoriesResponse>("/api/categories");
      setCategories({ data: data.categories, loading: false, error: "" });
    } catch (error) {
      setCategories((current) => ({ ...current, loading: false, error: getErrorMessage(error) }));
    }
  }, []);

  const refreshCart = useCallback(async (coupon = "") => {
    if (!userState.data) {
      resetPrivateState();
      return;
    }
    setCart((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await api<{ cart: Cart }>(`/api/cart${coupon ? `?coupon=${encodeURIComponent(coupon)}` : ""}`);
      setCart({ data: data.cart, loading: false, error: "" });
    } catch (error) {
      setCart((current) => ({ ...current, loading: false, error: getErrorMessage(error) }));
    }
  }, [resetPrivateState, userState.data]);

  const refreshWishlist = useCallback(async () => {
    if (!userState.data) {
      resetPrivateState();
      return;
    }
    setWishlistCount((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await api<WishlistResponse>("/api/wishlist");
      setWishlistCount({ data: data.products.length, loading: false, error: "" });
    } catch (error) {
      setWishlistCount((current) => ({ ...current, loading: false, error: getErrorMessage(error) }));
    }
  }, [resetPrivateState, userState.data]);

  const loadUser = useCallback(async () => {
    setUserState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await api<MeResponse>("/api/me");
      setUserState({ data: data.user, loading: false, error: "" });
    } catch (error) {
      setUserState({ data: null, loading: false, error: error instanceof ApiError && error.status === 401 ? "" : getErrorMessage(error) });
      resetPrivateState();
    }
  }, [resetPrivateState]);

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadUser();
  }, [loadProducts, loadCategories, loadUser]);

  useEffect(() => {
    if (!userState.data) return;
    refreshCart();
    refreshWishlist();
  }, [refreshCart, refreshWishlist, userState.data]);

  const onAdd = useCallback(async (productId: string, quantity = 1, selectedColor = "", selectedSize = "") => {
    if (!userState.data) {
      navigate("/account");
      return;
    }
    await api("/api/cart/items", { method: "POST", body: JSON.stringify({ productId, quantity, selectedColor, selectedSize }) });
    refreshCart();
  }, [navigate, refreshCart, userState.data]);

  const onWishlist = useCallback(async (productId: string) => {
    if (!userState.data) {
      navigate("/account");
      return;
    }
    await api(`/api/wishlist/${productId}`, { method: "POST" });
    refreshWishlist();
  }, [navigate, refreshWishlist, userState.data]);

  const onRemoveFromWishlist = useCallback(async (productId: string) => {
    await api(`/api/wishlist/${productId}`, { method: "DELETE" });
    refreshWishlist();
  }, [refreshWishlist]);

  const onMoveToCart = useCallback(async (productId: string) => {
    await api("/api/cart/items", { method: "POST", body: JSON.stringify({ productId, quantity: 1, selectedColor: "", selectedSize: "" }) });
    await api(`/api/wishlist/${productId}`, { method: "DELETE" });
    await Promise.all([refreshCart(), refreshWishlist()]);
  }, [refreshCart, refreshWishlist]);

  const handleAuthChanged = useCallback((user: PublicUser) => {
    setUserState({ data: user, loading: false, error: "" });
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      setLogoutSaving(true);
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      setLogoutSaving(false);
      setUserState({ data: null, loading: false, error: "" });
      resetPrivateState();
    }
  }, [resetPrivateState]);

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
          categories={categories.data}
          navigate={navigate}
          onAdd={onAdd}
          onWishlist={onWishlist}
        />
      );
    }
    if (path.startsWith("/product/")) return <ProductDetailsPage id={path.split("/").pop()} navigate={navigate} onAdd={onAdd} onWishlist={onWishlist} />;
    if (path.startsWith("/orders/")) return <OrderPage authStatus={authStatus} id={path.split("/").pop()} navigate={navigate} />;
    if (path === "/cart") return <CartPage authStatus={authStatus} cart={cart.data} cartLoading={cart.loading} cartError={cart.error} navigate={navigate} refreshCart={refreshCart} appliedCoupon={appliedCoupon} onAppliedCouponChange={setAppliedCoupon} />;
    if (path === "/checkout") return <CheckoutPage authStatus={authStatus} cart={cart.data} cartLoading={cart.loading} cartError={cart.error} refreshCart={refreshCart} navigate={navigate} appliedCoupon={appliedCoupon} onCouponConsumed={() => setAppliedCoupon("")} />;
    if (path === "/account") return <AccountPage userState={userState} onAuthChanged={handleAuthChanged} onUserRefresh={loadUser} navigate={navigate} />;
    if (path === "/about") return <AboutPage />;
    if (path === "/contact") return <ContactPage />;
    if (path === "/wishlist") return <WishlistPage authStatus={authStatus} navigate={navigate} onAdd={onAdd} onRemove={onRemoveFromWishlist} onMoveToCart={onMoveToCart} />;
    if (catalogLoading) return catalogLoadingView;
    if (catalogError) return catalogErrorView;
    return <HomePage products={products.data} categories={categories.data} navigate={navigate} onAdd={onAdd} onWishlist={onWishlist} />;
  }, [path, products, categories, userState, authStatus, cart, navigate, loadProducts, loadCategories, refreshCart, loadUser, handleAuthChanged, onAdd, onWishlist]);

  return (
    <>
      <TopHeader />
      <Header
        navigate={navigate}
        user={userState.data}
        cartCount={cart.data.items.reduce((sum, item) => sum + item.quantity, 0)}
        wishlistCount={wishlistCount.data}
        onLogout={handleLogout}
        logoutSaving={logoutSaving}
      />
      {page}
      <button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑</button>
      <Footer />
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
