import { PageHeader } from "@/components/page-header";
import { CustomerForm } from "../customer-form";

export default function NewCustomerPage() {
  return (
    <div>
      <PageHeader title="New customer" />
      <CustomerForm />
    </div>
  );
}
