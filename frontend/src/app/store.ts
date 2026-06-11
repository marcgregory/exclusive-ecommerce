import { configureStore } from '@reduxjs/toolkit';
import { ecommerceApi } from '../api/ecommerceApi';

export const store = configureStore({
  reducer: {
    [ecommerceApi.reducerPath]: ecommerceApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(ecommerceApi.middleware),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
