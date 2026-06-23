import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";
import { NavLinks, type NavItem } from "@/components/nav-links";
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
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <p className="text-lg font-semibold">TribeToy</p>
          <p className="text-xs text-gray-500">Commerce Dashboard</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks items={items} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <div className="text-sm text-gray-500">
            Signed in as{" "}
            <span className="font-medium text-gray-900">{displayName}</span>
            {role && (
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {ROLE_LABEL[role]}
              </span>
            )}
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Sign out
            </button>
          </form>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
