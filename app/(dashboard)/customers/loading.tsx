import {
  PageHeaderSkeleton,
  FilterBarSkeleton,
  TableSkeleton,
} from "@/components/skeleton";

export default function CustomersLoading() {
  return (
    <div className="skeleton-group">
      <PageHeaderSkeleton />
      <FilterBarSkeleton fields={1} />
      <TableSkeleton columns={6} rows={10} />
    </div>
  );
}
