import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Role = Database["public"]["Enums"]["user_role"];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  ops: "Operations",
  warehouse: "Warehouse",
  sales: "Sales",
  finance: "Finance",
};

/**
 * Coarse UI capabilities, mirroring the RLS role matrix in
 * `supabase/migrations/0009_roles_rls.sql`. RLS is the real gate — these only
 * hide/disable controls a role can't use (defense-in-depth, not the boundary).
 */
export const CAPABILITIES = {
  "products.write": ["admin"],
  "customers.write": ["admin", "sales"],
  "inventory.write": ["admin", "ops", "warehouse"],
  "orders.write": ["admin", "ops", "sales"],
  "shipments.write": ["admin", "ops", "warehouse"],
  "payments.write": ["admin", "finance"],
  "settings.write": ["admin"],
  "audit.view": ["admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Capability = keyof typeof CAPABILITIES;

export function roleCan(role: Role | null, cap: Capability): boolean {
  if (!role) return false;
  return (CAPABILITIES[cap] as readonly Role[]).includes(role);
}

/** The caller's app role (profiles.role), or null if unauthenticated. */
export async function getCurrentRole(): Promise<Role | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return data?.role ?? null;
}

/**
 * Server-page guard: redirect to the dashboard unless the caller has `cap`.
 * Returns the resolved role for convenience. RLS still enforces data access;
 * this just keeps a role out of a screen it can't use.
 */
export async function requireCapability(cap: Capability): Promise<Role> {
  const role = await getCurrentRole();
  if (!roleCan(role, cap)) redirect("/");
  return role as Role;
}
