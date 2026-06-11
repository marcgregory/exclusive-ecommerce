import { configureStore } from '@reduxjs/toolkit';
import { ecommerceApi } from '../api/ecommerceApi';
import { cartSlice, persistCart } from './cartSlice';

export const store = configureStore({
  reducer: {
    cart: cartSlice.reducer,
    [ecommerceApi.reducerPath]: ecommerceApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(ecommerceApi.middleware),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;

let previousCart = store.getState().cart;
store.subscribe(() => {
  const nextCart = store.getState().cart;
  if (nextCart !== previousCart) {
    previousCart = nextCart;
    persistCart(nextCart);
  }
});
