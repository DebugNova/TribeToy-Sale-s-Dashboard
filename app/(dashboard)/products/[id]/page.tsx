import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "../product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!product) notFound();

  const { data: inventory } = await supabase
    .from("inventory")
    .select("on_hand, low_stock_threshold")
    .eq("product_id", id)
    .maybeSingle();

  return (
    <div>
      <PageHeader title={product.name} description={`SKU ${product.sku}`} />
      <ProductForm product={product} inventory={inventory} />
    </div>
  );
}
