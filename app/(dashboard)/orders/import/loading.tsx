import { PageHeaderSkeleton, FormSkeleton } from "@/components/skeleton";

export default function ImportOrdersLoading() {
  return (
    <div className="skeleton-group">
      <PageHeaderSkeleton action={false} />
      <FormSkeleton fields={2} />
    </div>
  );
}
