/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_ENABLE_CLIENT_ERROR_REPORTING?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
}
