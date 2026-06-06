import type { Product, ProductVariant } from "../types";

export function requiresVariantSelection(product: Product) {
  return product.colors.length > 0 || product.sizes.length > 0;
}

export function findFirstInStockVariant(product: Product, variants: ProductVariant[] = []) {
  return variants.find((variant) => {
    if (variant.stock <= 0) return false;
    if (product.colors.length > 0 && !product.colors.includes(variant.color)) return false;
    if (product.sizes.length > 0 && !product.sizes.includes(variant.size)) return false;
    return true;
  });
}

export function getQuickAddSelection(product: Product, variants?: ProductVariant[]) {
  if (!requiresVariantSelection(product)) {
    return { selectedColor: "", selectedSize: "" };
  }

  const variant = findFirstInStockVariant(product, variants);
  if (!variant) return null;

  return {
    selectedColor: variant.color,
    selectedSize: variant.size
  };
}
