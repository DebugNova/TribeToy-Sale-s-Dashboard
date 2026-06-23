import Link from "next/link";
import { PageHeader, buttonSecondaryClass } from "@/components/page-header";
import { ImportForm } from "./import-form";

export default function ImportOrdersPage() {
  return (
    <div>
      <PageHeader
        title="Import Amazon CSV"
        description="Bulk-import an Amazon order report. Orders are tagged channel=amazon and deduped on the Amazon order id, so re-importing the same file is safe."
        action={
          <Link href="/orders" className={buttonSecondaryClass}>
            Back to orders
          </Link>
        }
      />
      <ImportForm />
    </div>
  );
}
