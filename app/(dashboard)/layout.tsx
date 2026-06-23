import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type NavItem } from "@/components/nav-links";
import { AppShell } from "@/components/app-shell";
import { roleCan, ROLE_LABEL, type Role } from "@/lib/auth/roles";
import { getAlertCount } from "@/lib/alerts/queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Backstop: middleware already redirects, but never render the shell signed-out.
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role ?? null) as Role | null;
  const displayName = profile?.name || user.email || "User";
  const alertCount = await getAlertCount();

  // Everyone gets the operational pages (RLS scopes the data); the audit log and
  // settings are admin-only, so we hide them for other roles (RLS blocks them too).
  const items: NavItem[] = [
    { href: "/", label: "Dashboard" },
    { href: "/orders", label: "Orders" },
    { href: "/products", label: "Products" },
    { href: "/customers", label: "Customers" },
    { href: "/inventory", label: "Inventory" },
    { href: "/shipments", label: "Shipments" },
    { href: "/alerts", label: "Alerts", badge: alertCount },
    ...(roleCan(role, "audit.view")
      ? [{ href: "/audit", label: "Audit log" } as NavItem]
      : []),
    ...(roleCan(role, "settings.write")
      ? [{ href: "/settings", label: "Settings" } as NavItem]
      : []),
  ];

  return (
    <AppShell
      items={items}
      displayName={displayName}
      roleLabel={role ? ROLE_LABEL[role] : null}
    >
      {children}
    </AppShell>
  );
}
