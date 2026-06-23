import {
  PageHeaderSkeleton,
  FilterBarSkeleton,
  TableSkeleton,
} from "@/components/skeleton";

export default function AuditLoading() {
  return (
    <div className="skeleton-group">
      <PageHeaderSkeleton action={false} />
      <FilterBarSkeleton fields={4} />
      <TableSkeleton columns={5} rows={10} />
    </div>
  );
}
