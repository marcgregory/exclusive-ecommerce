import { useCallback, useMemo, useState } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { createRoot } from 'react-dom/client';
import {
  ecommerceApi,
  useAddCartItemMutation,
  useAddWishlistProductMutation,
  useDeleteWishlistProductMutation,
  useGetCartQuery,
  useGetCategoriesQuery,
  useGetMeQuery,
  useGetProductsQuery,
  useGetWishlistQuery,
  useLogoutMutation,
} from './api/ecommerceApi';
import { store, type AppDispatch } from './app/store';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorState } from './components/StateViews';
import { TopHeader } from './components/TopHeader';
import { getRtkErrorMessage, getRtkStatus } from './lib/rtkErrors';
import { useRoute } from './lib/router';
import { useClientErrorReporting } from './lib/useClientErrorReporting';
import { AboutPage } from './pages/AboutPage';
import { AccountPage } from './pages/AccountPage';
import { AdminCategoriesPage } from './pages/AdminCategoriesPage';
import { AdminCouponsPage } from './pages/AdminCouponsPage';
import { AdminOrderDetailPage } from './pages/AdminOrderDetailPage';
import { AdminOrdersPage } from './pages/AdminOrdersPage';
import { AdminProductsPage } from './pages/AdminProductsPage';
import { CartPage } from './pages/CartPage';
import { CategoryPage } from './pages/CategoryPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ContactPage } from './pages/ContactPage';
import { HomePage } from './pages/HomePage';
import { HomeSkeleton } from './components/skeletons/HomeSkeleton';
import { OrderPage } from './pages/OrderPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { WishlistPage } from './pages/WishlistPage';
import type { AsyncState, AuthStatus, Cart, Category, Product, PublicUser } from './types';
import './styles.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

const emptyCart: Cart = { items: [], subtotal: 0, discount: 0, shipping: 0, total: 0 };

function App() {
  // Set Google Sign-In client ID meta tag
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (clientId) {
    let meta = document.querySelector('meta[name="google-signin-client_id"]') as HTMLMetaElement;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'google-signin-client_id';
      document.head.appendChild(meta);
    }
    meta.content = clientId;
  }

  useClientErrorReporting();
  const dispatch = useDispatch<AppDispatch>();
  const { path, query, navigate } = useRoute();
  const [appliedCoupon, setAppliedCoupon] = useState('');

  const productsQuery = useGetProductsQuery();
  const categoriesQuery = useGetCategoriesQuery();
  const userQuery = useGetMeQuery();
  const user = userQuery.data?.user ?? null;
  const cartQuery = useGetCartQuery(appliedCoupon || undefined, { skip: !user });
  const wishlistQuery = useGetWishlistQuery(undefined, { skip: !user });
  const [addCartItem] = useAddCartItemMutation();
  const [addWishlistProduct] = useAddWishlistProductMutation();
  const [deleteWishlistProduct] = useDeleteWishlistProductMutation();
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
    error: getRtkStatus(userQuery.error) === 401 ? '' : getRtkErrorMessage(userQuery.error),
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

  const authStatus: AuthStatus = userState.loading
    ? 'checking'
    : userState.data
      ? 'authenticated'
      : 'guest';

  const refreshCart = useCallback(
    async (coupon = '') => {
      if (coupon !== appliedCoupon) setAppliedCoupon(coupon);
      await dispatch(
        ecommerceApi.endpoints.getCart.initiate(coupon || undefined, { forceRefetch: true })
      ).unwrap();
    },
    [appliedCoupon, dispatch]
  );

  const refreshWishlist = useCallback(async () => {
    if (!userState.data) return;
    await dispatch(
      ecommerceApi.endpoints.getWishlist.initiate(undefined, { forceRefetch: true })
    ).unwrap();
  }, [dispatch, userState.data]);

  const loadUser = useCallback(async () => {
    await dispatch(
      ecommerceApi.endpoints.getMe.initiate(undefined, { forceRefetch: true })
    ).unwrap();
  }, [dispatch]);
  const loadProducts = productsQuery.refetch;
  const loadCategories = categoriesQuery.refetch;

  const onAdd = useCallback(
    async (productId: string, quantity = 1, selectedColor = '', selectedSize = '') => {
      if (!userState.data) {
        navigate('/account');
        return;
      }
      await addCartItem({ productId, quantity, selectedColor, selectedSize }).unwrap();
    },
    [addCartItem, navigate, userState.data]
  );

  const wishlistProductIds = wishlistQuery.data?.products.map((p) => p.id) ?? [];

  const onWishlist = useCallback(
    async (productId: string) => {
      if (!userState.data) {
        navigate('/account');
        return;
      }
      if (wishlistProductIds.includes(productId)) {
        await deleteWishlistProduct(productId).unwrap();
      } else {
        await addWishlistProduct(productId).unwrap();
      }
    },
    [addWishlistProduct, deleteWishlistProduct, navigate, userState.data, wishlistProductIds]
  );

  const handleAuthChanged = useCallback(
    (user: PublicUser) => {
      dispatch(ecommerceApi.util.upsertQueryData('getMe', undefined, { user }));
      dispatch(ecommerceApi.util.invalidateTags(['Cart', 'Wishlist']));
    },
    [dispatch]
  );

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
    const catalogErrorView = (
      <main className="container page">
        <ErrorState
          title="We could not load the catalog"
          message={catalogError}
          action={{ label: 'Try Again', onClick: catalogRetry }}
        />
      </main>
    );

    if (path.startsWith('/category/')) {
      return (
        <CategoryPage
          categorySlug={path.split('/').pop()}
          query={query}
          categories={categories.data}
          categoriesLoading={categories.loading}
          navigate={navigate}
          onAdd={onAdd}
          onWishlist={onWishlist}
          wishlistProductIds={wishlistProductIds}
        />
      );
    }
    if (path === '/search') {
      return (
        <CategoryPage
          searchQuery={query.get('q') || ''}
          query={query}
          categories={categories.data}
          categoriesLoading={categories.loading}
          navigate={navigate}
          onAdd={onAdd}
          onWishlist={onWishlist}
          wishlistProductIds={wishlistProductIds}
        />
      );
    }
    if (path.startsWith('/product/'))
      return (
        <ProductDetailsPage
          id={path.split('/').pop()}
          navigate={navigate}
          onAdd={onAdd}
          onWishlist={onWishlist}
          wishlistProductIds={wishlistProductIds}
        />
      );
    if (path.startsWith('/orders/'))
      return <OrderPage authStatus={authStatus} id={path.split('/').pop()} navigate={navigate} />;
    if (path === '/admin' || path === '/admin/products')
      return <AdminProductsPage userState={userState} navigate={navigate} />;
    if (path === '/admin/categories')
      return <AdminCategoriesPage userState={userState} navigate={navigate} />;
    if (path === '/admin/coupons')
      return <AdminCouponsPage userState={userState} navigate={navigate} />;
    if (path.startsWith('/admin/orders/'))
      return (
        <AdminOrderDetailPage
          id={path.split('/').pop()}
          userState={userState}
          navigate={navigate}
        />
      );
    if (path === '/admin/orders')
      return <AdminOrdersPage userState={userState} navigate={navigate} />;
    if (path === '/cart')
      return (
        <CartPage
          authStatus={authStatus}
          cart={cart.data}
          cartLoading={cart.loading}
          cartError={cart.error}
          navigate={navigate}
          refreshCart={refreshCart}
          appliedCoupon={appliedCoupon}
          onAppliedCouponChange={setAppliedCoupon}
        />
      );
    if (path === '/checkout')
      return (
        <CheckoutPage
          authStatus={authStatus}
          cart={cart.data}
          cartLoading={cart.loading}
          cartError={cart.error}
          refreshCart={refreshCart}
          navigate={navigate}
          appliedCoupon={appliedCoupon}
          onCouponConsumed={() => setAppliedCoupon('')}
        />
      );
    if (path === '/account')
      return (
        <AccountPage
          userState={userState}
          onAuthChanged={handleAuthChanged}
          onUserRefresh={loadUser}
          navigate={navigate}
          authModeQuery={query.get('mode')}
        />
      );
    if (path === '/about') return <AboutPage />;
    if (path === '/contact') return <ContactPage />;
    if (path === '/wishlist')
      return (
        <WishlistPage
          authStatus={authStatus}
          navigate={navigate}
          onAdd={onAdd}
          refreshCart={refreshCart}
          refreshWishlist={refreshWishlist}
          recommendedProducts={products.data}
        />
      );
    if (catalogError) return catalogErrorView;
    // Show skeleton while loading products or categories
    if (products.loading || categories.loading) {
      return <HomeSkeleton />;
    }
    return (
      <HomePage
        products={products.data}
        categories={categories.data}
        navigate={navigate}
        onAdd={onAdd}
        onWishlist={onWishlist}
        wishlistProductIds={wishlistProductIds}
      />
    );
  }, [
    path,
    query,
    products,
    categories,
    userState,
    authStatus,
    cart,
    navigate,
    loadProducts,
    loadCategories,
    refreshCart,
    refreshWishlist,
    loadUser,
    handleAuthChanged,
    onAdd,
    onWishlist,
    wishlistProductIds,
  ]);

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
      <button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        ↑
      </button>
      <Footer />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <Provider store={store}>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    </Provider>
  </ErrorBoundary>
);
