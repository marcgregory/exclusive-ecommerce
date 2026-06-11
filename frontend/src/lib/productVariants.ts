import type { Product, ProductVariant } from '../types';

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
    return { selectedColor: '', selectedSize: '' };
  }

  const variant = findFirstInStockVariant(product, variants);
  if (!variant) return null;

  return {
    selectedColor: variant.color,
    selectedSize: variant.size,
  };
}

export type SelectedProductOptions = Record<string, string>;

export type ProductOptionGroup = {
  name: string;
  values: string[];
  required: boolean;
};

export function getProductOptionGroups(product: Product): ProductOptionGroup[] {
  return [
    { name: 'Color', values: product.colors, required: product.colors.length > 0 },
    { name: 'Size', values: product.sizes, required: product.sizes.length > 0 },
  ].filter((group) => group.values.length > 0);
}

export function getVariantOptions(variant: ProductVariant): SelectedProductOptions {
  return {
    ...(variant.color ? { Color: variant.color } : {}),
    ...(variant.size ? { Size: variant.size } : {}),
    ...(variant.options ?? {}),
  };
}

export function getSelectedColor(options: SelectedProductOptions) {
  return options.Color ?? '';
}

export function getSelectedSize(options: SelectedProductOptions) {
  return options.Size ?? '';
}

export function findVariantByOptions(
  variants: ProductVariant[] = [],
  options: SelectedProductOptions
) {
  return variants.find((variant) => {
    const variantOptions = getVariantOptions(variant);
    return Object.entries(variantOptions).every(([name, value]) => options[name] === value);
  });
}

export function hasRequiredOptions(product: Product, options: SelectedProductOptions) {
  return getProductOptionGroups(product).every(
    (group) => !group.required || Boolean(options[group.name])
  );
}

export function isOptionValueAvailable(
  variants: ProductVariant[] = [],
  groupName: string,
  value: string,
  selectedOptions: SelectedProductOptions = {}
) {
  if (!variants.length) return true;
  return variants.some((variant) => {
    if (variant.stock <= 0) return false;
    const options = getVariantOptions(variant);
    if (options[groupName] !== value) return false;
    return Object.entries(selectedOptions).every(([name, selectedValue]) => {
      if (!selectedValue || name === groupName) return true;
      return options[name] === selectedValue;
    });
  });
}
