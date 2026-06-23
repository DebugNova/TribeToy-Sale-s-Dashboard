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

  const [role, { data: customer }] = await Promise.all([
    getCurrentRole(),
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
  ]);
  const canWrite = roleCan(role, "customers.write");
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
        <dl className="grid max-w-xl grid-cols-1 gap-x-4 gap-y-1 rounded-xl border border-line bg-white p-5 text-sm sm:grid-cols-3 sm:gap-y-3">
          <dt className="text-gray-500">Type</dt>
          <dd className="mb-1.5 sm:mb-0 sm:col-span-2 uppercase text-gray-900">{customer.type}</dd>
          <dt className="text-gray-500">Phone</dt>
          <dd className="mb-1.5 sm:mb-0 sm:col-span-2 text-gray-900">
            <RevealField masked={maskPhone(customer.phone)} revealKey="customer.phone" id={customer.id} />
          </dd>
          <dt className="text-gray-500">Email</dt>
          <dd className="mb-1.5 sm:mb-0 sm:col-span-2 text-gray-900">{customer.email ?? "—"}</dd>
          <dt className="text-gray-500">GSTIN</dt>
          <dd className="mb-1.5 sm:mb-0 sm:col-span-2 text-gray-900">{customer.gstin ?? "—"}</dd>
          <dt className="text-gray-500">Address</dt>
          <dd className="mb-1.5 sm:mb-0 sm:col-span-2 text-gray-900">
            {[customer.address_line, customer.city, customer.state, customer.pincode]
              .filter(Boolean)
              .join(", ") || "—"}
          </dd>
          {customer.notes && (
            <>
              <dt className="text-gray-500">Notes</dt>
              <dd className="mb-1.5 sm:mb-0 sm:col-span-2 text-gray-700">{customer.notes}</dd>
            </>
          )}
        </dl>
      )}
    </div>
  );
}
