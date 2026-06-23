import { PageHeaderSkeleton, DetailSkeleton } from "@/components/skeleton";

export default function OrderDetailLoading() {
  return (
    <div className="skeleton-group">
      <PageHeaderSkeleton />
      <DetailSkeleton />
    </div>
  );
}
