"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const SettingsSchema = z.object({
  sender_name: z.string().trim().min(1, "Sender name is required"),
  sender_address: z.string().trim().min(1, "Address is required"),
  sender_city: z.string().trim().min(1, "City is required"),
  sender_state: z.string().trim().min(1, "State is required"),
  sender_pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Pincode must be 6 digits"),
  sender_phone: z.string().trim().min(1, "Phone is required"),
  default_courier: z.enum(["speedpost", "delhivery", "other"]),
});

export type SettingsFormState = { ok: boolean; message: string };

export async function updateSettings(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const parsed = SettingsSchema.safeParse({
    sender_name: formData.get("sender_name") ?? "",
    sender_address: formData.get("sender_address") ?? "",
    sender_city: formData.get("sender_city") ?? "",
    sender_state: formData.get("sender_state") ?? "",
    sender_pincode: formData.get("sender_pincode") ?? "",
    sender_phone: formData.get("sender_phone") ?? "",
    default_courier: formData.get("default_courier") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update(parsed.data)
    .eq("id", 1);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/settings");
  return { ok: true, message: "Settings saved." };
}
