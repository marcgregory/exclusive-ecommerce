# RTK Query Admin Products API - Quick Reference

## New Hooks Available

### Queries (Data Fetching)

```typescript
import {
  useGetAdminProductsQuery,
  useGetAdminProductDetailQuery,
  useGetAdminProductVariantsQuery,
  useGetCategoriesQuery,
} from "../api/ecommerceApi";

// List products with search and pagination
const { data, isLoading, error, refetch } = useGetAdminProductsQuery(
  { q: "keyboard", limit: 50 },
  { skip: !isAdmin }  // Skip if not admin
);

// Get single product details
const { data: product, isLoading } = useGetAdminProductDetailQuery(productId);

// Get product variants
const { data: variantsData, isLoading } = useGetAdminProductVariantsQuery(productId);

// Categories (existing, but reused)
const { data: categoriesData } = useGetCategoriesQuery();
```

### Mutations (Data Modification)

```typescript
import {
  useCreateAdminProductMutation,
  useUpdateAdminProductMutation,
  useDeleteAdminProductMutation,
  useUpdateAdminProductVariantsMutation,
} from "../api/ecommerceApi";

// Create product
const [createAdminProduct, { isLoading }] = useCreateAdminProductMutation();
await createAdminProduct({
  name: "New Product",
  category: "electronics",
  price: 9900,
  // ... other fields
}).unwrap();

// Update product
const [updateAdminProduct] = useUpdateAdminProductMutation();
await updateAdminProduct({
  id: "product-1",
  updates: { name: "Updated Name", price: 10900 }
}).unwrap();

// Delete product
const [deleteAdminProduct] = useDeleteAdminProductMutation();
await deleteAdminProduct("product-1").unwrap();

// Update variants
const [updateVariants] = useUpdateAdminProductVariantsMutation();
await updateVariants({
  productId: "product-1",
  variants: [
    { color: "Black", size: "M", sku: "KEY-BLK-M", stock: 5 },
    { id: "variant-2", color: "White", size: "L", sku: "KEY-WHT-L", stock: 3 }
  ]
}).unwrap();
```

## Error Handling

RTK Query errors have a different structure than the old API client:

```typescript
const { error } = useGetAdminProductsQuery();

// Check for fetch errors
if (error?.status === "FETCH_ERROR") {
  console.log(error.error?.message); // Network error
}

// Check for API errors  
if (error?.status) {
  console.log(error.data?.message); // Server error message
}

// Use helper function
const getApiErrorMessage = (error: any): string => {
  if (!error) return "";
  if (error.status === "FETCH_ERROR") {
    return error.error?.message || "Network error";
  }
  if (error.data?.message) {
    return error.data.message;
  }
  return error.message || "An error occurred";
};
```

## Cache Invalidation & Refetching

RTK Query automatically manages cache, but you can control it:

```typescript
// Automatic cache invalidation
// When you call a mutation, RTK Query invalidates matching tags
await createAdminProduct(payload).unwrap();
// ^ Automatically invalidates "AdminProducts" tag queries

// Manual refetch when needed
const { refetch } = useGetAdminProductsQuery();
await refetch(); // Force refetch from server

// Skip query initially (conditional fetching)
useGetAdminProductsQuery(
  { q: query },
  { skip: !isAdmin }  // Don't fetch until isAdmin is true
);

// Refetch on mount or when args change
useGetAdminProductsQuery(
  filters,
  { refetchOnMountOrArgChange: true }
);
```

## Comparison: Old vs New

### Before (Manual State)
```typescript
const [productsState, setProductsState] = useState({ data: [], loading: false, error: "" });

const loadProducts = useCallback(async () => {
  setProductsState(current => ({ ...current, loading: true }));
  try {
    const data = await api<AdminProductListResponse>(`/api/admin/products?...`);
    setProductsState({ data: data.products, loading: false, error: "" });
  } catch (error) {
    setProductsState(current => ({ ...current, loading: false, error: getErrorMessage(error) }));
  }
}, []);
```

### After (RTK Query)
```typescript
const { data: productsData, isLoading: productsLoading, error: productsError } = 
  useGetAdminProductsQuery({ q: submittedQuery, limit: 50 });
const products = productsData?.products || [];
```

## File Structure

```
frontend/
├── src/
│   ├── api/
│   │   ├── ecommerceApi.ts          ← Admin product endpoints added here
│   │   └── client.ts                ← Old api() function (still used for image upload)
│   ├── pages/
│   │   ├── AdminProductsPage.tsx    ← Migrated to RTK Query
│   │   └── AdminProductsPage.test.tsx ← Updated tests
│   └── types/
│       └── index.ts                 ← API request/response types
```

## Types

```typescript
// Request types
type AdminProductsFilter = {
  q?: string;        // Search query
  limit?: number;    // Pagination limit
};

type AdminProductInput = {
  name: string;
  category: string;
  description: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  stockStatus: string;
  colors: string[];
  sizes: string[];
  isNew: boolean;
  flags: string[];
  image: string;
};

// Response types
type AdminProductListResponse = {
  products: Product[];
  total: number;
  page: number;
  limit: number;
};

type AdminProductResponse = {
  product: Product;
};

type AdminProductVariantsResponse = {
  variants: ProductVariant[];
};
```

## API Endpoints

```
GET    /api/admin/products?limit=50&q={query}
GET    /api/admin/products/{id}
POST   /api/admin/products                          (body: AdminProductInput)
PATCH  /api/admin/products/{id}                     (body: Partial<AdminProductInput>)
DELETE /api/admin/products/{id}
GET    /api/admin/products/{id}/variants
PUT    /api/admin/products/{id}/variants            (body: { variants: VariantDraft[] })
POST   /api/admin/uploads/product-image             (multipart form, still uses api() client)
```

## Key Changes in AdminProductsPage

1. **Removed manual state management** for products, categories, variants
2. **Added RTK Query hooks** for all data fetching and mutations
3. **Preserved validation logic** and form draft pattern
4. **Image upload still uses standalone `api()` client** (RTK Query limitation with multipart)
5. **Error handling** updated for RTK Query error format
6. **Loading states** now use `isLoading` flags from hooks
7. **Cache invalidation** automatic on mutations

## Testing

Tests use global `fetch` mock to simulate API responses:

```typescript
// Mock handler for list
if (path.startsWith("/api/admin/products?")) {
  return { products: [...], total: 1, page: 1, limit: 50 };
}

// Mock handler for create
if (path === "/api/admin/products" && method === "POST") {
  const body = await request.json();
  return { product: { ...body, id: "product-2" } };
}
```

## Recommendations for Future Migrations

1. Apply same pattern to AdminCategoriesPage, AdminCouponsPage, AdminOrdersPage
2. Consider adding optimistic updates for better UX
3. Use RTK Query DevTools browser extension for debugging
4. Document API schemas in OpenAPI/Swagger format
5. Add request/response logging middleware for debugging
