import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { RevealField } from "@/components/reveal-field";
import { maskPhone } from "@/lib/mask";
import { getCurrentRole, roleCan } from "@/lib/auth/roles";
import { CustomerForm } from "../customer-form";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const canWrite = roleCan(await getCurrentRole(), "customers.write");

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!customer) notFound();

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={canWrite ? "Edit customer" : "Customer details (read-only)"}
      />
      {canWrite ? (
        <CustomerForm customer={customer} />
      ) : (
        <dl className="grid max-w-xl grid-cols-3 gap-x-4 gap-y-3 rounded-xl border border-gray-200 bg-white p-5 text-sm">
          <dt className="text-gray-500">Type</dt>
          <dd className="col-span-2 uppercase text-gray-900">{customer.type}</dd>
          <dt className="text-gray-500">Phone</dt>
          <dd className="col-span-2 text-gray-900">
            <RevealField masked={maskPhone(customer.phone)} revealKey="customer.phone" id={customer.id} />
          </dd>
          <dt className="text-gray-500">Email</dt>
          <dd className="col-span-2 text-gray-900">{customer.email ?? "—"}</dd>
          <dt className="text-gray-500">GSTIN</dt>
          <dd className="col-span-2 text-gray-900">{customer.gstin ?? "—"}</dd>
          <dt className="text-gray-500">Address</dt>
          <dd className="col-span-2 text-gray-900">
            {[customer.address_line, customer.city, customer.state, customer.pincode]
              .filter(Boolean)
              .join(", ") || "—"}
          </dd>
          {customer.notes && (
            <>
              <dt className="text-gray-500">Notes</dt>
              <dd className="col-span-2 text-gray-700">{customer.notes}</dd>
            </>
          )}
        </dl>
      )}
    </div>
  );
}
