"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActorId } from "@/lib/audit";
import { persistOrder } from "./persistOrder";
import type { NormalizedOrder, CreateOrderResult } from "./types";

/**
 * Server action used by the manual order form. Resolves the cookie-bound Supabase client
 * and the founder's actor id, then funnels through the shared `persistOrder` core (the same
 * core the website intake API uses with the service-role client). See ./persistOrder.ts.
 */
export async function createOrder(input: NormalizedOrder): Promise<CreateOrderResult> {
  const supabase = await createClient();
  const actorId = await getActorId(supabase);

  const result = await persistOrder(supabase, actorId, input);
  if (result.ok && !result.duplicate) {
    revalidatePath("/orders");
  }
  return result;
}
