import { PageHeaderSkeleton, FormSkeleton } from "@/components/skeleton";

export default function NewCustomerLoading() {
  return (
    <div className="skeleton-group">
      <PageHeaderSkeleton action={false} />
      <FormSkeleton fields={6} />
    </div>
  );
}
