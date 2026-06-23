import { PageHeaderSkeleton, FormSkeleton } from "@/components/skeleton";

export default function SettingsLoading() {
  return (
    <div className="skeleton-group">
      <PageHeaderSkeleton action={false} />
      <FormSkeleton fields={4} />
    </div>
  );
}
