import { PageHeaderSkeleton, FormSkeleton } from "@/components/skeleton";

export default function EditProductLoading() {
  return (
    <div className="skeleton-group">
      <PageHeaderSkeleton action={false} />
      <FormSkeleton fields={8} />
    </div>
  );
}
