import {
  PageHeaderSkeleton,
  FilterBarSkeleton,
  TableSkeleton,
} from "@/components/skeleton";

export default function ProductsLoading() {
  return (
    <div className="skeleton-group">
      <PageHeaderSkeleton />
      <FilterBarSkeleton fields={2} />
      <TableSkeleton columns={7} rows={10} />
    </div>
  );
}
