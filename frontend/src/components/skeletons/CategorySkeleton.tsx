import { SectionHeader } from '../SectionHeader';
import { Breadcrumbs } from '../Breadcrumbs';
import { ProductGridSkeleton } from '../ProductGridSkeleton';
import { ProductControlsSkeleton } from '../ProductControlsSkeleton';

type CategorySkeletonProps = {
  count?: number;
};

export function CategorySkeleton({ count = 12 }: CategorySkeletonProps) {
  return (
    <main className="container page">
      <Breadcrumbs items={['Home', 'Category']} />
      <div className="listing-toolbar">
        <SectionHeader kicker="Category" title="Category" />
        <ProductControlsSkeleton />
      </div>
      <ProductGridSkeleton count={count} />
    </main>
  );
}
