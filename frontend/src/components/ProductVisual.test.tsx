/** @vitest-environment jsdom */
import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ProductVisual } from './ProductVisual';

describe('ProductVisual', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders an img tag when a valid image URL is provided via src', () => {
    render(<ProductVisual src="/assets/products/test.jpg" alt="test" />);
    const img = screen.getByRole('img', { name: 'test' });
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('/assets/products/test.jpg');

    // Ensure no fake shapes are rendered
    const fakeShapes = document.querySelectorAll(
      '.product-visual span, .product-visual i, .product-visual b'
    );
    expect(fakeShapes.length).toBe(0);
  });

  it('renders an img tag when a valid image URL is provided via type', () => {
    render(<ProductVisual type="/assets/products/test.jpg" alt="test" />);
    const img = screen.getByRole('img', { name: 'test' });
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('/assets/products/test.jpg');

    // Ensure no fake shapes are rendered
    const fakeShapes = document.querySelectorAll(
      '.product-visual span, .product-visual i, .product-visual b'
    );
    expect(fakeShapes.length).toBe(0);
  });

  it('renders empty state when no valid image is provided', () => {
    render(<ProductVisual type="gamepad-black" />);

    // Should render empty state div
    const emptyState = screen.getByText('No image');
    // Since we got the element via getByText, it is in the document.
    // Check the class
    expect(emptyState.classList.contains('product-visual__empty')).toBe(true);

    // img should NOT be present
    const img = screen.queryByRole('img');
    expect(img).toBeNull();

    // Ensure no fake shapes are rendered
    const fakeShapes = document.querySelectorAll(
      '.product-visual span, .product-visual i, .product-visual b'
    );
    expect(fakeShapes.length).toBe(0);
  });

  it('renders empty state when type is missing and src is missing', () => {
    render(<ProductVisual />);

    // Should render empty state div
    const emptyState = screen.getByText('No image');
    expect(emptyState.classList.contains('product-visual__empty')).toBe(true);

    // img should NOT be present
    const img = screen.queryByRole('img');
    expect(img).toBeNull();

    // Ensure no fake shapes are rendered
    const fakeShapes = document.querySelectorAll(
      '.product-visual span, .product-visual i, .product-visual b'
    );
    expect(fakeShapes.length).toBe(0);
  });

  it('renders the fallback content when the image fails to load', async () => {
    // Mocking image error event
    render(<ProductVisual src="/assets/products/broken.jpg" alt="test" />);
    const img = screen.getByRole('img', { name: 'test' });

    // Trigger error event manually in JSDOM
    const event = new Event('error');
    img.dispatchEvent(event);

    // Wait for the next tick to allow state update
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Now fallback should be visible
    const fallbackText = screen.getByText('Image unavailable');
    // Since we got the element via getByText, it is in the document.
    expect(fallbackText.textContent).toBe('Image unavailable');

    const fallbackIcon = screen.getByText('🖼️');
    expect(fallbackIcon.textContent).toBe('🖼️');
  });
});
