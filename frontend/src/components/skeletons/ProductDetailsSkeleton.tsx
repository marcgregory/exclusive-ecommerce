import React from 'react';
import { ProductCardSkeleton } from '../ProductCardSkeleton';

export function ProductDetailsSkeleton() {
  return (
    <main className="container page product-detail-page" aria-busy="true">
      <div className="breadcrumbs">
        <span className="skeleton" style={{ width: '40%', height: '16px' }}></span>
        <span className="skeleton" style={{ width: '30%', height: '16px' }}></span>
      </div>
      <section className="product-detail">
        <div className="thumbs">
          {/* Skeleton for thumbnail images */}
          {[1, 2, 3].map((_, i) => (
            <button key={i} className="skeleton-thumb">
              <div
                data-testid="product-visual-thumbnail-skeleton"
                className="skeleton skeleton-product-image"
              />
            </button>
          ))}
        </div>
        <div className="main-product-image">
          <div
            data-testid="product-visual-large-skeleton"
            className="skeleton skeleton-product-image-large"
          />
        </div>
        <div className="product-info">
          <h1 className="skeleton skeleton-product-title skeleton-text" />
          <div className="review-line">
            <div className="skeleton skeleton-product-rating" style={{ width: '80px' }}></div>
            <span
              className="skeleton skeleton-product-review-count"
              style={{ width: '40px', display: 'inline-block' }}
            ></span>
            <i
              className="skeleton-line"
              style={{ width: '1px', height: '16px', background: 'var(--line)' }}
            ></i>
            <strong className="skeleton skeleton-product-stock" style={{ width: '60px' }}></strong>
          </div>
          <p className="skeleton skeleton-product-price" />
          <p className="skeleton skeleton-product-description" style={{ width: '80%' }} />
          <hr />
          {/* Color selector skeleton */}
          <div className="choice-row">
            <span>Colours:</span>
            <div className="skeleton-color-options">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="skeleton skeleton-color-swatch" />
              ))}
            </div>
          </div>
          {/* Size selector skeleton */}
          <div className="choice-row">
            <span>Size:</span>
            <div className="skeleton-size-options">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="skeleton skeleton-size" />
              ))}
            </div>
          </div>
          <p className="skeleton skeleton-product-variant-feedback" style={{ width: '100%' }} />
          <div className="buy-row">
            <div
              data-testid="quantity-stepper-skeleton"
              className="skeleton skeleton-quantity-stepper"
            />
            <div
              data-testid="product-button-skeleton"
              className="skeleton skeleton-product-button"
            />
            <button
              className="wishlist-square skeleton-wishlist"
              aria-label="Add to wishlist"
              aria-hidden="true"
            >
              <div className="skeleton skeleton-heart" />
            </button>
          </div>
          <div className="delivery-box">
            <div>
              <div className="skeleton skeleton-truck" />
              <div>
                <h4>Free Delivery</h4>
                <p>Enter your postal code for Delivery Availability</p>
              </div>
            </div>
            <div>
              <div className="skeleton skeleton-shield" />
              <div>
                <h4>Return Delivery</h4>
                <p>Free 30 Days Delivery Returns. Details</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section">
        <section className="section-header">
          <h2>Related Item</h2>
        </section>
        <div className="product-grid four">
          {/* Skeleton for related products */}
          {[1, 2, 3, 4, 5, 6, 7, 8].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </main>
  );
}
