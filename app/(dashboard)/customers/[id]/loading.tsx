import { PageHeaderSkeleton, DetailSkeleton } from "@/components/skeleton";

export default function CustomerDetailLoading() {
  return (
    <div className="skeleton-group">
      <PageHeaderSkeleton />
      <DetailSkeleton />
    </div>
  );
}
