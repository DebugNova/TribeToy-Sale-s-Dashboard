import {
  PageHeaderSkeleton,
  FilterBarSkeleton,
  TableSkeleton,
} from "@/components/skeleton";

export default function OrdersLoading() {
  return (
    <div className="skeleton-group">
      <PageHeaderSkeleton />
      <FilterBarSkeleton fields={4} />
      <TableSkeleton columns={7} rows={10} />
    </div>
  );
}
