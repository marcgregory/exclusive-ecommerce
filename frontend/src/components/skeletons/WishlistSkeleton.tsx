import { SectionHeader } from '../SectionHeader';
import { Breadcrumbs } from '../Breadcrumbs';
import { ProductGridSkeleton } from '../ProductGridSkeleton';

type WishlistSkeletonProps = {
  count?: number;
};

export function WishlistSkeleton({ count = 4 }: WishlistSkeletonProps) {
  return (
    <main className="container page">
      <Breadcrumbs items={['Home', 'Wishlist']} />
      <SectionHeader kicker="Wishlist" title="Wishlist" />
      <ProductGridSkeleton count={count} />
    </main>
  );
}
