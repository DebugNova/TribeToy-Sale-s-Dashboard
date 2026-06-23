import { PageHeaderSkeleton, TableSectionSkeleton } from "@/components/skeleton";

export default function AlertsLoading() {
  return (
    <div className="skeleton-group space-y-6">
      <PageHeaderSkeleton action={false} />
      <TableSectionSkeleton columns={7} rows={4} />
      <TableSectionSkeleton columns={6} rows={4} />
      <TableSectionSkeleton columns={6} rows={4} />
    </div>
  );
}
