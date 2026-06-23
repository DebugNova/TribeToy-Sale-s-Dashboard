"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActorId, logAudit } from "@/lib/audit";
import {
  requiredText,
  optionalText,
  optionalNumber,
  moneyOrZero,
  intOrZero,
} from "@/lib/validation";
import type { ActionResult, FormState } from "@/lib/types";

const ProductSchema = z.object({
  sku: requiredText,
  name: requiredText,
  category: optionalText,
  description: optionalText,
  length_cm: optionalNumber,
  width_cm: optionalNumber,
  height_cm: optionalNumber,
  weight_g: optionalNumber,
  tax_rate: moneyOrZero,
  price: moneyOrZero,
  cost: moneyOrZero,
  active: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  // inventory-row fields (on_hand only applied on create — later changes go via adjustStock)
  on_hand: intOrZero,
  low_stock_threshold: intOrZero,
});

function fromForm(formData: FormData) {
  return {
    sku: formData.get("sku"),
    name: formData.get("name"),
    category: formData.get("category"),
    description: formData.get("description"),
    length_cm: formData.get("length_cm"),
    width_cm: formData.get("width_cm"),
    height_cm: formData.get("height_cm"),
    weight_g: formData.get("weight_g"),
    tax_rate: formData.get("tax_rate"),
    price: formData.get("price"),
    cost: formData.get("cost"),
    active: formData.get("active"),
    on_hand: formData.get("on_hand"),
    low_stock_threshold: formData.get("low_stock_threshold"),
  };
}

/**
 * Create or update a product. A hidden `id` field decides which.
 * Creating a product also creates its single inventory row (Phase 1 = one location).
 * Stock movements after creation must go through inventory.adjustStock (reason + audit);
 * the edit form only changes the low-stock threshold.
 */
export async function saveProduct(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = ((formData.get("id") as string) || "").trim() || null;
  const parsed = ProductSchema.safeParse(fromForm(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const actorId = await getActorId(supabase);

  const productFields = {
    sku: d.sku,
    name: d.name,
    category: d.category,
    description: d.description,
    length_cm: d.length_cm,
    width_cm: d.width_cm,
    height_cm: d.height_cm,
    weight_g: d.weight_g,
    tax_rate: d.tax_rate,
    price: d.price,
    cost: d.cost,
    active: d.active,
  };

  if (!id) {
    const { data: product, error } = await supabase
      .from("products")
      .insert(productFields)
      .select("id")
      .single();
    if (error) {
      return {
        ok: false,
        message:
          error.code === "23505"
            ? `A product with SKU "${d.sku}" already exists.`
            : error.message,
      };
    }
    const { error: invErr } = await supabase.from("inventory").insert({
      product_id: product.id,
      on_hand: d.on_hand,
      low_stock_threshold: d.low_stock_threshold,
    });
    if (invErr) {
      // keep the catalog clean: roll back the orphan product
      await supabase.from("products").delete().eq("id", product.id);
      return { ok: false, message: `Could not create inventory: ${invErr.message}` };
    }
    await logAudit(supabase, {
      actorId,
      action: "product.create",
      entity: "product",
      entityId: product.id,
      after: {
        sku: d.sku,
        name: d.name,
        price: d.price,
        on_hand: d.on_hand,
        low_stock_threshold: d.low_stock_threshold,
      },
    });
  } else {
    const { data: before } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();
    const { error } = await supabase
      .from("products")
      .update(productFields)
      .eq("id", id);
    if (error) {
      return {
        ok: false,
        message:
          error.code === "23505"
            ? `A product with SKU "${d.sku}" already exists.`
            : error.message,
      };
    }
    // threshold lives on the inventory row; on_hand is intentionally not touched here.
    await supabase
      .from("inventory")
      .update({ low_stock_threshold: d.low_stock_threshold })
      .eq("product_id", id);
    await logAudit(supabase, {
      actorId,
      action: "product.update",
      entity: "product",
      entityId: id,
      before: before ?? null,
      after: { ...productFields, low_stock_threshold: d.low_stock_threshold },
    });
  }

  revalidatePath("/products");
  revalidatePath("/inventory");
  redirect("/products");
}

/** Toggle a product's active flag from the list (soft delete / restore). */
export async function setProductActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const actorId = await getActorId(supabase);
  const { error } = await supabase.from("products").update({ active }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logAudit(supabase, {
    actorId,
    action: "product.update",
    entity: "product",
    entityId: id,
    after: { active },
  });
  revalidatePath("/products");
  return { ok: true, data: undefined };
}
