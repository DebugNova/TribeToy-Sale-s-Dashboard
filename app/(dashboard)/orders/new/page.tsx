import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { OrderForm } from "../order-form";

export default async function NewOrderPage() {
  const supabase = await createClient();

  const [{ data: products }, { data: customers }] = await Promise.all([
    supabase
      .from("products")
      .select("id, sku, name, price")
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("customers")
      .select("id, name, phone, email, type, address_line, city, state, pincode")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div>
      <PageHeader
        title="New order"
        description="Manually capture an order from any channel. The customer is reused if it already exists."
      />
      <OrderForm products={products ?? []} customers={customers ?? []} />
    </div>
  );
}
