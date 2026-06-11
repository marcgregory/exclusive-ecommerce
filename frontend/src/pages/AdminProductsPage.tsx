import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Edit3, ImageUp, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
import { api } from '../api/client';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Button } from '../components/Button';
import { ProductVisual } from '../components/ProductVisual';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { getErrorMessage } from '../lib/errors';
import { formatMoney } from '../lib/format';
import {
  useGetAdminProductsQuery,
  useGetCategoriesQuery,
  useGetAdminProductVariantsQuery,
  useCreateAdminProductMutation,
  useUpdateAdminProductMutation,
  useDeleteAdminProductMutation,
  useUpdateAdminProductVariantsMutation,
} from '../api/ecommerceApi';
import type {
  AdminProductInput,
  AsyncState,
  Navigate,
  Product,
  ProductVariant,
  ProductImageUploadResponse,
  PublicUser,
} from '../types';

type AdminProductsPageProps = {
  userState: AsyncState<PublicUser | null>;
  navigate: Navigate;
};

type ProductDraft = {
  name: string;
  category: string;
  description: string;
  price: string;
  originalPrice: string;
  discountPercent: string;
  rating: string;
  reviewCount: string;
  stockStatus: string;
  colors: string;
  sizes: string;
  isNew: boolean;
  flags: string;
  image: string;
};

type VariantDraft = {
  localId: string;
  id?: string;
  color: string;
  size: string;
  sku: string;
  stock: string;
};

const emptyDraft: ProductDraft = {
  name: '',
  category: '',
  description: '',
  price: '0',
  originalPrice: '0',
  discountPercent: '0',
  rating: '0',
  reviewCount: '0',
  stockStatus: 'In Stock',
  colors: '',
  sizes: '',
  isNew: false,
  flags: '',
  image: '',
};

const stockStatuses = ['In Stock', 'Out of Stock', 'Preorder'];
const variantDraftId = () => `variant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function listToText(values: string[] = []) {
  return values.join(', ');
}

function textToList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function productToDraft(product: Product): ProductDraft {
  return {
    name: product.name,
    category: product.category,
    description: product.description,
    price: String(product.price),
    originalPrice: String(product.originalPrice),
    discountPercent: String(product.discountPercent),
    rating: String(product.rating),
    reviewCount: String(product.reviewCount),
    stockStatus: product.stockStatus,
    colors: listToText(product.colors),
    sizes: listToText(product.sizes),
    isNew: product.isNew,
    flags: listToText(product.flags),
    image: product.image,
  };
}

function draftToPayload(draft: ProductDraft): AdminProductInput {
  return {
    name: draft.name.trim(),
    category: draft.category.trim(),
    description: draft.description.trim(),
    price: Number(draft.price || 0),
    originalPrice: Number(draft.originalPrice || 0),
    discountPercent: Number(draft.discountPercent || 0),
    rating: Number(draft.rating || 0),
    reviewCount: Number(draft.reviewCount || 0),
    stockStatus: draft.stockStatus,
    colors: textToList(draft.colors),
    sizes: textToList(draft.sizes),
    isNew: draft.isNew,
    flags: textToList(draft.flags),
    image: draft.image.trim(),
  };
}

function variantToDraft(variant: ProductVariant): VariantDraft {
  return {
    localId: variant.id,
    id: variant.id,
    color: variant.color,
    size: variant.size,
    sku: variant.sku,
    stock: String(variant.stock),
  };
}

export function AdminProductsPage({ userState, navigate }: AdminProductsPageProps) {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [variantsError, setVariantsError] = useState('');
  const [variantsSuccess, setVariantsSuccess] = useState('');

  const canLoadProducts = userState.data?.role === 'admin';

  // RTK Query hooks
  const {
    data: productsData,
    isLoading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = useGetAdminProductsQuery(canLoadProducts ? { q: submittedQuery, limit: 50 } : undefined, {
    skip: !canLoadProducts,
    refetchOnMountOrArgChange: true,
  });

  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useGetCategoriesQuery(undefined, { skip: !canLoadProducts });

  const {
    data: variantsData,
    isLoading: variantsLoading,
    refetch: refetchVariants,
  } = useGetAdminProductVariantsQuery(editingProductId || '', { skip: !editingProductId });

  // Mutations
  const [createAdminProduct, { isLoading: createLoading }] = useCreateAdminProductMutation();
  const [updateAdminProduct, { isLoading: updateLoading }] = useUpdateAdminProductMutation();
  const [deleteAdminProduct, { isLoading: deleteLoading }] = useDeleteAdminProductMutation();
  const [updateAdminProductVariants, { isLoading: updateVariantsLoading }] =
    useUpdateAdminProductVariantsMutation();

  const saving = createLoading || updateLoading;
  const deletingId = deleteLoading ? editingProductId : '';
  const variantsSaving = updateVariantsLoading;

  // Transform RTK Query response to component state format
  const products = productsData?.products || [];
  const total = productsData?.total || 0;
  const categories = categoriesData?.categories || [];

  // Initialize category in draft when categories load
  useEffect(() => {
    if (!categoriesLoading && categories.length && !draft.category) {
      setDraft((current) =>
        current.category ? current : { ...current, category: categories[0].id }
      );
    }
  }, [categories, categoriesLoading, draft.category]);

  // Load variants when editing product changes
  useEffect(() => {
    if (editingProductId && variantsData) {
      setVariants(variantsData.variants.map(variantToDraft));
    }
  }, [variantsData, editingProductId]);

  // Format error messages from RTK Query errors
  const getApiErrorMessage = useCallback((error: any): string => {
    if (!error) return '';
    if (error.status === 'FETCH_ERROR') {
      return error.error?.message || 'Network error';
    }
    if (error.data?.message) {
      return error.data.message;
    }
    return error.message || 'An error occurred';
  }, []);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedQuery(query.trim());
  };

  const startCreate = () => {
    setEditingProductId(null);
    setDraft({
      ...emptyDraft,
      category: categories[0]?.id || '',
    });
    setVariants([]);
    setVariantsError('');
    setVariantsSuccess('');
    setFormError('');
    setFormSuccess('');
  };

  const startEdit = (product: Product) => {
    setEditingProductId(product.id);
    setDraft(productToDraft(product));
    setFormError('');
    setFormSuccess('');
    setVariantsError('');
    setVariantsSuccess('');
  };

  const submitProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setFormSuccess('');
    try {
      const payload = draftToPayload(draft);
      if (editingProductId) {
        await updateAdminProduct({
          id: editingProductId,
          updates: payload,
        }).unwrap();
        setFormSuccess('Product updated.');
      } else {
        const result = await createAdminProduct(payload).unwrap();
        setEditingProductId(result.product.id);
        setDraft(productToDraft(result.product));
        setVariants([]);
        setVariantsError('');
        setVariantsSuccess('Product created. Add variants when ready.');
        setFormSuccess('Product created.');
      }
      // Manually refetch products after any mutation
      await new Promise((resolve) => setTimeout(resolve, 0)); // Yield to event loop
      refetchProducts();
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  };

  const uploadProductImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setFormError('');
    setFormSuccess('');
    try {
      const data = await api<ProductImageUploadResponse>('/api/admin/uploads/product-image', {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          'X-File-Name': file.name,
        },
        body: file,
      });
      setDraft((current) => ({ ...current, image: data.upload.url }));
      setFormSuccess(
        `Image uploaded (${data.upload.width}x${data.upload.height}). Save the product to publish it.`
      );
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    setFormError('');
    setFormSuccess('');
    try {
      await deleteAdminProduct(product.id).unwrap();
      if (editingProductId === product.id) startCreate();
      setFormSuccess('Product deleted.');
      // Manually refetch products after deletion
      await new Promise((resolve) => setTimeout(resolve, 0)); // Yield to event loop
      refetchProducts();
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  };

  const updateDraft = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const addVariantRow = () => {
    setVariants((current) => [
      ...current,
      { localId: variantDraftId(), color: '', size: '', sku: '', stock: '0' },
    ]);
    setVariantsError('');
    setVariantsSuccess('');
  };

  const updateVariant = <K extends keyof VariantDraft>(
    localId: string,
    key: K,
    value: VariantDraft[K]
  ) => {
    setVariants((current) =>
      current.map((variant) =>
        variant.localId === localId ? { ...variant, [key]: value } : variant
      )
    );
    setVariantsError('');
    setVariantsSuccess('');
  };

  const removeVariantRow = (localId: string) => {
    setVariants((current) => current.filter((variant) => variant.localId !== localId));
    setVariantsError('');
    setVariantsSuccess('');
  };

  const saveVariants = async () => {
    if (!editingProductId) return;
    setVariantsError('');
    setVariantsSuccess('');
    try {
      await updateAdminProductVariants({
        productId: editingProductId,
        variants: variants.map((variant) => ({
          ...(variant.id ? { id: variant.id } : {}),
          color: variant.color.trim(),
          size: variant.size.trim(),
          sku: variant.sku.trim(),
          stock: Number(variant.stock || 0),
        })),
      }).unwrap();
      if (variantsData) {
        setVariants(variantsData.variants.map(variantToDraft));
      }
      setVariantsSuccess('Variants saved.');
    } catch (error) {
      setVariantsError(getApiErrorMessage(error));
    }
  };

  const categoryNames = useMemo(
    () =>
      new Map(categories.map((category) => [category.id, `${category.label} (${category.id})`])),
    [categories]
  );

  if (userState.loading) {
    return (
      <main className="container page">
        <LoadingState title="Loading admin" message="We are checking your access." />
      </main>
    );
  }

  if (!userState.data) {
    return (
      <main className="container page">
        <Breadcrumbs items={['Home', 'Admin', 'Products']} />
        <EmptyState
          title="Admin access requires sign in"
          message="Sign in with an administrator account to manage products."
          action={{ label: 'Sign In', onClick: () => navigate('/account') }}
          secondaryAction={{ label: 'Return To Shop', onClick: () => navigate('/') }}
        />
      </main>
    );
  }

  if (userState.data.role !== 'admin') {
    return (
      <main className="container page">
        <Breadcrumbs items={['Home', 'Admin', 'Products']} />
        <ErrorState
          title="Admin access required"
          message="Product management is only available to administrators."
          action={{ label: 'View Account', onClick: () => navigate('/account') }}
          secondaryAction={{ label: 'Return To Shop', onClick: () => navigate('/') }}
        />
      </main>
    );
  }

  return (
    <main className="container page admin-catalog-page">
      <Breadcrumbs items={['Home', 'Admin', 'Products']} />
      <section className="admin-orders-hero">
        <div>
          <p className="eyebrow">Admin console</p>
          <h1 className="page-title">Product catalog</h1>
          <p>Manage product records, merchandising flags, option labels, and product images.</p>
        </div>
        <div className="admin-catalog-nav" aria-label="Admin sections">
          <Button onClick={() => navigate('/admin/products')}>Products</Button>
          <Button variant="ghost" onClick={() => navigate('/admin/categories')}>
            Categories
          </Button>
          <Button variant="ghost" onClick={() => navigate('/admin/coupons')}>
            Coupons
          </Button>
          <Button variant="ghost" onClick={() => navigate('/admin/orders')}>
            Orders
          </Button>
        </div>
      </section>

      <section className="admin-orders-toolbar" aria-label="Product tools">
        <form className="admin-orders-search" onSubmit={submitSearch}>
          <label>
            Product search
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Keyboard, jacket, sale"
            />
          </label>
          <Button type="submit" variant="ghost">
            <Search size={16} />
            Search
          </Button>
        </form>
        <Button onClick={() => refetchProducts()} disabled={productsLoading}>
          <RefreshCw size={16} />
          {productsLoading ? 'Refreshing' : 'Refresh'}
        </Button>
        <Button onClick={startCreate}>
          <Plus size={16} />
          New Product
        </Button>
        <span className="admin-catalog-count">{total} total</span>
      </section>

      {(productsError || categoriesError) && (
        <p className="form-status form-status--error">
          {getApiErrorMessage(productsError) || getApiErrorMessage(categoriesError)}
        </p>
      )}
      {formError && <p className="form-status form-status--error">{formError}</p>}
      {formSuccess && <p className="form-status form-status--success">{formSuccess}</p>}

      <section className="admin-catalog-layout">
        <div className="admin-catalog-list" aria-label="Admin product list">
          {!productsLoading && !productsError && !products.length && (
            <p className="admin-orders-empty">No products match this search.</p>
          )}
          {products.map((product) => (
            <article className="admin-catalog-row" key={product.id}>
              <div className="admin-catalog-row__main">
                <strong>{product.name}</strong>
                <span>{product.id}</span>
              </div>
              <div className="admin-catalog-row__meta">
                <span>{categoryNames.get(product.category) || product.category}</span>
                <strong>{formatMoney(product.price)}</strong>
                <span>{product.stockStatus}</span>
                <span>{product.flags.length ? product.flags.join(', ') : 'No flags'}</span>
                <span>{product.image || 'No image'}</span>
              </div>
              <div className="admin-catalog-row__actions">
                <Button variant="ghost" onClick={() => startEdit(product)}>
                  <Edit3 size={16} />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => deleteProduct(product)}
                  disabled={deletingId === product.id}
                >
                  <Trash2 size={16} />
                  {deletingId === product.id ? 'Deleting' : 'Delete'}
                </Button>
              </div>
            </article>
          ))}
        </div>

        <aside className="admin-catalog-form-card">
          <div className="admin-catalog-form-card__header">
            <div>
              <p className="eyebrow">{editingProductId ? 'Edit product' : 'Create product'}</p>
              <h2>{editingProductId || 'New product'}</h2>
            </div>
            {editingProductId && (
              <Button variant="ghost" onClick={startCreate}>
                <X size={16} />
                Clear
              </Button>
            )}
          </div>
          <form className="admin-catalog-form" onSubmit={submitProduct}>
            <label>
              Name
              <input
                value={draft.name}
                onChange={(event) => updateDraft('name', event.target.value)}
                required
              />
            </label>
            <label>
              Category
              <select
                value={draft.category}
                onChange={(event) => updateDraft('category', event.target.value)}
                required
              >
                <option value="" disabled>
                  Select category
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label} ({category.id})
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-catalog-form__wide">
              Description
              <textarea
                value={draft.description}
                onChange={(event) => updateDraft('description', event.target.value)}
              />
            </label>
            <label>
              Price
              <input
                type="number"
                min="0"
                value={draft.price}
                onChange={(event) => updateDraft('price', event.target.value)}
              />
            </label>
            <label>
              Original price
              <input
                type="number"
                min="0"
                value={draft.originalPrice}
                onChange={(event) => updateDraft('originalPrice', event.target.value)}
              />
            </label>
            <label>
              Discount percent
              <input
                type="number"
                min="0"
                max="100"
                value={draft.discountPercent}
                onChange={(event) => updateDraft('discountPercent', event.target.value)}
              />
            </label>
            <label>
              Rating
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={draft.rating}
                onChange={(event) => updateDraft('rating', event.target.value)}
              />
            </label>
            <label>
              Review count
              <input
                type="number"
                min="0"
                value={draft.reviewCount}
                onChange={(event) => updateDraft('reviewCount', event.target.value)}
              />
            </label>
            <label>
              Stock status
              <select
                value={draft.stockStatus}
                onChange={(event) => updateDraft('stockStatus', event.target.value)}
              >
                {stockStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Colors
              <input
                value={draft.colors}
                onChange={(event) => updateDraft('colors', event.target.value)}
                placeholder="Black, White"
              />
            </label>
            <label>
              Sizes
              <input
                value={draft.sizes}
                onChange={(event) => updateDraft('sizes', event.target.value)}
                placeholder="S, M, L"
              />
            </label>
            <section className="admin-variants-editor" aria-label="Product variants">
              <div className="admin-variants-editor__header">
                <div>
                  <p className="eyebrow">Variants</p>
                  <h3>Stock by option</h3>
                </div>
                <Button
                  variant="ghost"
                  onClick={addVariantRow}
                  disabled={!editingProductId || variantsLoading}
                >
                  <Plus size={16} />
                  Add row
                </Button>
              </div>
              {!editingProductId && (
                <p className="admin-variants-editor__note">
                  Create the product before adding stock variants.
                </p>
              )}
              {variantsLoading && (
                <p className="admin-variants-editor__note">Loading variants...</p>
              )}
              {variantsError && <p className="form-status form-status--error">{variantsError}</p>}
              {variantsSuccess && (
                <p className="form-status form-status--success">{variantsSuccess}</p>
              )}
              <datalist id="admin-product-color-options">
                {textToList(draft.colors).map((color) => (
                  <option key={color} value={color} />
                ))}
              </datalist>
              <datalist id="admin-product-size-options">
                {textToList(draft.sizes).map((size) => (
                  <option key={size} value={size} />
                ))}
              </datalist>
              <div className="admin-variants-table">
                <div className="admin-variants-table__head" aria-hidden="true">
                  <span>Color</span>
                  <span>Size</span>
                  <span>SKU</span>
                  <span>Stock</span>
                  <span />
                </div>
                {variants.map((variant, index) => (
                  <div className="admin-variants-row" key={variant.localId}>
                    <label>
                      Color
                      <input
                        value={variant.color}
                        list="admin-product-color-options"
                        onChange={(event) =>
                          updateVariant(variant.localId, 'color', event.target.value)
                        }
                        placeholder="Default"
                        aria-label={`Variant ${index + 1} color`}
                        disabled={!editingProductId || variantsSaving}
                      />
                    </label>
                    <label>
                      Size
                      <input
                        value={variant.size}
                        list="admin-product-size-options"
                        onChange={(event) =>
                          updateVariant(variant.localId, 'size', event.target.value)
                        }
                        placeholder="Default"
                        aria-label={`Variant ${index + 1} size`}
                        disabled={!editingProductId || variantsSaving}
                      />
                    </label>
                    <label>
                      SKU
                      <input
                        value={variant.sku}
                        onChange={(event) =>
                          updateVariant(variant.localId, 'sku', event.target.value)
                        }
                        placeholder="Optional"
                        aria-label={`Variant ${index + 1} sku`}
                        disabled={!editingProductId || variantsSaving}
                      />
                    </label>
                    <label>
                      Stock
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={variant.stock}
                        onChange={(event) =>
                          updateVariant(variant.localId, 'stock', event.target.value)
                        }
                        aria-label={`Variant ${index + 1} stock`}
                        disabled={!editingProductId || variantsSaving}
                      />
                    </label>
                    <Button
                      variant="ghost"
                      onClick={() => removeVariantRow(variant.localId)}
                      disabled={!editingProductId || variantsSaving}
                      aria-label={`Delete variant ${index + 1}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
                {editingProductId && !variantsLoading && !variants.length && (
                  <p className="admin-variants-editor__note">
                    No variants yet. Add one row to begin tracking option stock.
                  </p>
                )}
              </div>
              <div className="admin-variants-editor__actions">
                <Button
                  variant="ghost"
                  onClick={() => editingProductId && refetchVariants()}
                  disabled={!editingProductId || variantsLoading || variantsSaving}
                >
                  <RefreshCw size={16} />
                  Reload
                </Button>
                <Button
                  onClick={saveVariants}
                  disabled={!editingProductId || variantsLoading || variantsSaving}
                >
                  <Save size={16} />
                  {variantsSaving ? 'Saving variants' : 'Save variants'}
                </Button>
              </div>
            </section>
            <label>
              Flags
              <input
                value={draft.flags}
                onChange={(event) => updateDraft('flags', event.target.value)}
                placeholder="flash, best"
              />
            </label>
            <div className="admin-catalog-image-field">
              <div className="admin-catalog-image-preview">
                <ProductVisual
                  type={draft.image || 'default'}
                  alt={draft.name || 'Product image preview'}
                />
              </div>
              <label>
                Image URL or key
                <input
                  value={draft.image}
                  onChange={(event) => updateDraft('image', event.target.value)}
                  placeholder="product-image-key or /uploads/product-images/..."
                />
              </label>
              <label className="admin-catalog-upload-button">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={uploadProductImage}
                  disabled={createLoading || updateLoading}
                />
                <span>
                  <ImageUp size={16} />
                  {createLoading || updateLoading ? 'Uploading image' : 'Upload image'}
                </span>
              </label>
              <p>JPG, PNG, or WebP. 64px minimum, 4096px maximum, 5MB limit.</p>
            </div>
            <label className="admin-catalog-check">
              <input
                type="checkbox"
                checked={draft.isNew}
                onChange={(event) => updateDraft('isNew', event.target.checked)}
              />
              New arrival
            </label>
            <div className="admin-catalog-form__actions">
              <Button type="submit" disabled={saving}>
                <Save size={16} />
                {saving ? 'Saving' : editingProductId ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </form>
        </aside>
      </section>
    </main>
  );
}
