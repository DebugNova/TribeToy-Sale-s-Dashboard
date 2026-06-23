import { PageHeaderSkeleton, FormSkeleton } from "@/components/skeleton";

export default function NewProductLoading() {
  return (
    <div className="skeleton-group">
      <PageHeaderSkeleton action={false} />
      <FormSkeleton fields={8} />
    </div>
  );
}
