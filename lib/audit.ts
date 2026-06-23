import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";

type DB = SupabaseClient<Database>;

/**
 * Resolve the current authenticated founder's id (== profiles.id == audit actor).
 * Throws if there is no session — every write path runs behind auth, so this is a
 * programming error, not a user-facing one.
 */
export async function getActorId(supabase: DB): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

type AuditInput = {
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  before?: Json;
  after?: Json;
};

/**
 * Append a row to audit_logs. Used by every lib/ business-logic function for
 * status changes and stock mutations so who/what/when/before/after stays consistent.
 * (Inventory RPCs write their own inventory.* audit rows server-side.)
 */
export async function logAudit(supabase: DB, input: AuditInput): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: input.actorId,
    action: input.action,
    entity: input.entity,
    entity_id: input.entityId,
    before: input.before ?? null,
    after: input.after ?? null,
  });
  if (error) {
    // Audit failures shouldn't crash the user action, but must be visible in logs.
    console.error("audit_logs insert failed:", error.message, input.action);
  }
}
