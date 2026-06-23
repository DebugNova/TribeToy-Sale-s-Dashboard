import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeleton";

export default function ShipmentsLoading() {
  return (
    <div className="skeleton-group">
      <PageHeaderSkeleton action={false} />
      <TableSkeleton columns={7} rows={10} />
    </div>
  );
}
