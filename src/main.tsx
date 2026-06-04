import { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { api } from "./api/client";
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
import { ProductDetailsPage } from "./pages/ProductDetailsPage";
import { WishlistPage } from "./pages/WishlistPage";
import type { AsyncState, Cart, CategoriesResponse, Category, ProductsResponse, Product, WishlistResponse } from "./types";
import "./styles.css";

const emptyCart: Cart = { items: [], subtotal: 0, discount: 0, shipping: 0, total: 0 };

function App() {
  const { path, navigate } = useRoute();
  const [products, setProducts] = useState<AsyncState<Product[]>>({ data: [], loading: true, error: "" });
  const [categories, setCategories] = useState<AsyncState<Category[]>>({ data: [], loading: true, error: "" });
  const [cart, setCart] = useState<AsyncState<Cart>>({ data: emptyCart, loading: true, error: "" });
  const [wishlistCount, setWishlistCount] = useState<AsyncState<number>>({ data: 0, loading: true, error: "" });

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
    setCart((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await api<{ cart: Cart }>(`/api/cart${coupon ? `?coupon=${encodeURIComponent(coupon)}` : ""}`);
      setCart({ data: data.cart, loading: false, error: "" });
    } catch (error) {
      setCart((current) => ({ ...current, loading: false, error: getErrorMessage(error) }));
    }
  }, []);

  const refreshWishlist = useCallback(async () => {
    setWishlistCount((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await api<WishlistResponse>("/api/wishlist");
      setWishlistCount({ data: data.products.length, loading: false, error: "" });
    } catch (error) {
      setWishlistCount((current) => ({ ...current, loading: false, error: getErrorMessage(error) }));
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCategories();
    refreshCart();
    refreshWishlist();
  }, [loadProducts, loadCategories, refreshCart, refreshWishlist]);

  const onAdd = useCallback(async (productId: string, quantity = 1, selectedColor = "", selectedSize = "") => {
    await api("/api/cart/items", { method: "POST", body: JSON.stringify({ productId, quantity, selectedColor, selectedSize }) });
    refreshCart();
  }, [refreshCart]);

  const onWishlist = useCallback(async (productId: string) => {
    await api(`/api/wishlist/${productId}`, { method: "POST" });
    refreshWishlist();
  }, [refreshWishlist]);

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
      if (catalogLoading) return catalogLoadingView;
      if (catalogError) return catalogErrorView;
      return (
        <CategoryPage
          categorySlug={path.split("/").pop()}
          categories={categories.data}
          products={products.data}
          navigate={navigate}
          onAdd={onAdd}
          onWishlist={onWishlist}
        />
      );
    }
    if (path.startsWith("/product/")) return <ProductDetailsPage id={path.split("/").pop()} navigate={navigate} onAdd={onAdd} onWishlist={onWishlist} />;
    if (path === "/cart") return <CartPage cart={cart.data} cartLoading={cart.loading} cartError={cart.error} navigate={navigate} refreshCart={refreshCart} />;
    if (path === "/checkout") return <CheckoutPage cart={cart.data} cartLoading={cart.loading} cartError={cart.error} refreshCart={refreshCart} navigate={navigate} />;
    if (path === "/account") return <AccountPage />;
    if (path === "/about") return <AboutPage />;
    if (path === "/contact") return <ContactPage />;
    if (path === "/wishlist") return <WishlistPage navigate={navigate} onAdd={onAdd} />;
    if (catalogLoading) return catalogLoadingView;
    if (catalogError) return catalogErrorView;
    return <HomePage products={products.data} categories={categories.data} navigate={navigate} onAdd={onAdd} onWishlist={onWishlist} />;
  }, [path, products, categories, cart, navigate, loadProducts, loadCategories, refreshCart, onAdd, onWishlist]);

  return (
    <>
      <TopHeader />
      <Header navigate={navigate} cartCount={cart.data.items.reduce((sum, item) => sum + item.quantity, 0)} wishlistCount={wishlistCount.data} />
      {page}
      <button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑</button>
      <Footer />
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
