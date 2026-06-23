import { PageHeader } from "@/components/page-header";
import { ProductForm } from "../product-form";

export default function NewProductPage() {
  return (
    <div>
      <PageHeader
        title="New product"
        description="Creating a product also creates its inventory row."
      />
      <ProductForm />
    </div>
  );
}
