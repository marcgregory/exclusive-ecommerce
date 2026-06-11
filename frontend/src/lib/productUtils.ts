import { API_BASE } from '../api/client';
import type { Product } from '../types';

export function isImageUrl(value: string | undefined) {
  if (!value) return false;
  return (
    value.startsWith('/uploads/') || value.startsWith('/assets/') || /^https?:\/\//i.test(value)
  );
}

export function imageSrc(value: string) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('/assets/') || value.startsWith('/uploads/'))
    return value;
  return `${API_BASE}${value}`;
}

export function resolveProductImage(product: Product): string | undefined {
  if (isImageUrl(product.imageUrl)) return product.imageUrl;
  if (isImageUrl(product.image)) return product.image;
  if (isImageUrl(product.thumbnail)) return product.thumbnail;
  if (product.images && product.images.length > 0 && isImageUrl(product.images[0])) {
    return product.images[0];
  }
  // Fallback: try to construct from product id
  if (product.id) {
    const fallback = `/assets/products/${product.id}.jpg`;
    if (isImageUrl(fallback)) {
      return fallback;
    }
  }
  return undefined;
}
