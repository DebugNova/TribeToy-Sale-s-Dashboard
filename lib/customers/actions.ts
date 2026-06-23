"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActorId, logAudit } from "@/lib/audit";
import { requiredText, optionalText } from "@/lib/validation";
import type { FormState } from "@/lib/types";

const optionalEmail = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : String(v).trim()),
  z.email("Enter a valid email").nullable(),
);

const CustomerSchema = z.object({
  name: requiredText,
  phone: optionalText,
  email: optionalEmail,
  type: z.enum(["b2c", "b2b"]),
  gstin: optionalText,
  address_line: optionalText,
  city: optionalText,
  state: optionalText,
  pincode: optionalText,
  notes: optionalText,
});

function fromForm(formData: FormData) {
  return {
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    type: formData.get("type"),
    gstin: formData.get("gstin"),
    address_line: formData.get("address_line"),
    city: formData.get("city"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    notes: formData.get("notes"),
  };
}

/** Create or update a customer. A hidden `id` field decides which. */
export async function saveCustomer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = ((formData.get("id") as string) || "").trim() || null;
  const parsed = CustomerSchema.safeParse(fromForm(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const actorId = await getActorId(supabase);

  if (!id) {
    const { data: customer, error } = await supabase
      .from("customers")
      .insert(d)
      .select("id")
      .single();
    if (error) return { ok: false, message: error.message };
    await logAudit(supabase, {
      actorId,
      action: "customer.create",
      entity: "customer",
      entityId: customer.id,
      after: { name: d.name, phone: d.phone, email: d.email, type: d.type },
    });
  } else {
    const { data: before } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single();
    const { error } = await supabase.from("customers").update(d).eq("id", id);
    if (error) return { ok: false, message: error.message };
    await logAudit(supabase, {
      actorId,
      action: "customer.update",
      entity: "customer",
      entityId: id,
      before: before ?? null,
      after: d,
    });
  }

  revalidatePath("/customers");
  redirect("/customers");
}
