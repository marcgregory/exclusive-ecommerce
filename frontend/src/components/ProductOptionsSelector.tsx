import { useMemo } from 'react';
import {
  findVariantByOptions,
  getProductOptionGroups,
  getSelectedColor,
  getSelectedSize,
  hasRequiredOptions,
  isOptionValueAvailable,
  type SelectedProductOptions,
} from '../lib/productVariants';
import type { Product, ProductVariant } from '../types';
import { formatMoney } from '../lib/format';

type ProductOptionsSelectorProps = {
  product: Product;
  variants?: ProductVariant[];
  selectedOptions: SelectedProductOptions;
  onChange: (options: SelectedProductOptions) => void;
  showValidation?: boolean;
};

export function ProductOptionsSelector({
  product,
  variants = [],
  selectedOptions,
  onChange,
  showValidation = false,
}: ProductOptionsSelectorProps) {
  const groups = useMemo(() => getProductOptionGroups(product), [product]);
  const selectedVariant = findVariantByOptions(variants, selectedOptions);
  const requiredComplete = hasRequiredOptions(product, selectedOptions);
  const hasVariants = variants.length > 0;
  const currentPrice = selectedVariant?.price ?? product.price;
  const isOutOfStock = product.stockStatus === 'Out of Stock';
  const missing = groups.filter((group) => group.required && !selectedOptions[group.name]);

  const stockText = (() => {
    if (isOutOfStock) return 'Out of Stock';
    if (!hasVariants) return product.stockStatus;
    if (!requiredComplete) return 'Select options to check availability.';
    if (!selectedVariant || selectedVariant.stock <= 0) return 'Out of Stock';
    return `${selectedVariant.stock} in stock${selectedVariant.sku ? ` | SKU: ${selectedVariant.sku}` : ''}`;
  })();

  const selectedSummary = groups
    .filter((group) => selectedOptions[group.name])
    .map((group) => `${group.name}: ${selectedOptions[group.name]}`)
    .join(', ');

  const updateOption = (name: string, value: string) => {
    onChange({ ...selectedOptions, [name]: selectedOptions[name] === value ? '' : value });
  };

  return (
    <div className="product-options-selector">
      {groups.map((group) => (
        <fieldset className="option-group" key={group.name}>
          <legend>
            {group.name}
            {group.required && <span aria-label="required"> *</span>}
          </legend>
          <div
            className={group.name === 'Color' ? 'choice-row choice-row--swatches' : 'choice-row'}
          >
            {group.values.map((value) => {
              const selected = selectedOptions[group.name] === value;
              const disabled =
                isOutOfStock ||
                !isOptionValueAvailable(variants, group.name, value, selectedOptions);
              const isColor = group.name === 'Color';
              return (
                <button
                  key={value}
                  type="button"
                  className={
                    isColor
                      ? selected
                        ? 'swatch selected'
                        : 'swatch'
                      : selected
                        ? 'selected size'
                        : 'size'
                  }
                  style={isColor ? { background: value } : undefined}
                  onClick={() => updateOption(group.name, value)}
                  aria-label={isColor ? `${group.name} ${value}` : undefined}
                  aria-pressed={selected}
                  disabled={disabled}
                  title={
                    disabled ? 'Unavailable with the current selection' : `${group.name} ${value}`
                  }
                >
                  {isColor ? <span className="sr-only">{value}</span> : value}
                </button>
              );
            })}
          </div>
          {showValidation && group.required && !selectedOptions[group.name] && (
            <p className="option-group__error">Select a {group.name.toLowerCase()}.</p>
          )}
        </fieldset>
      ))}

      <div className="option-summary" aria-live="polite">
        <p>
          <span>Selection:</span>
          <strong>{selectedSummary || 'Choose required options'}</strong>
        </p>
        <p>
          <span>Price:</span>
          <strong>{formatMoney(currentPrice)}</strong>
        </p>
        <p className={!requiredComplete || stockText === 'Out of Stock' ? 'stock-out' : 'stock-in'}>
          {stockText}
        </p>
        {showValidation && missing.length > 0 && (
          <p className="option-group__error">
            Missing {missing.map((group) => group.name.toLowerCase()).join(', ')}.
          </p>
        )}
      </div>
    </div>
  );
}

export function getSelectorCartPayload(
  product: Product,
  variants: ProductVariant[] = [],
  selectedOptions: SelectedProductOptions
) {
  const selectedVariant = findVariantByOptions(variants, selectedOptions);
  const selectedColor = getSelectedColor(selectedOptions);
  const selectedSize = getSelectedSize(selectedOptions);
  return {
    selectedColor,
    selectedSize,
    selectedOptions,
    unitPrice: selectedVariant?.price ?? product.price,
    variantId: selectedVariant?.id,
    sku: selectedVariant?.sku,
    stock: selectedVariant?.stock,
    selectedVariant,
    isComplete: hasRequiredOptions(product, selectedOptions),
    isAvailable:
      product.stockStatus !== 'Out of Stock' &&
      hasRequiredOptions(product, selectedOptions) &&
      (!variants.length || Boolean(selectedVariant && selectedVariant.stock > 0)),
  };
}
