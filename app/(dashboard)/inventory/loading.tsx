import {
  PageHeaderSkeleton,
  FilterBarSkeleton,
  TableSkeleton,
} from "@/components/skeleton";

export default function InventoryLoading() {
  return (
    <div className="skeleton-group">
      <PageHeaderSkeleton action={false} />
      <FilterBarSkeleton fields={2} />
      <TableSkeleton columns={8} rows={10} />
    </div>
  );
}
