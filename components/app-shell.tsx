"use client";

import { useEffect, useState } from "react";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { BrandLogo } from "@/components/brand-logo";
import { signOut } from "@/lib/auth/actions";

/**
 * Responsive dashboard chrome. The server layout fetches the user/role and the
 * nav items, then hands them here for rendering. On large screens the sidebar is
 * always visible; below `lg` it collapses into a slide-in drawer opened from a
 * hamburger in the header. All business data is fetched server-side — this only
 * owns the open/closed UI state.
 */
export function AppShell({
  items,
  displayName,
  roleLabel,
  children,
}: {
  items: NavItem[];
  displayName: string;
  roleLabel: string | null;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // The drawer closes itself on nav-link clicks (onNavigate) and on backdrop
  // taps; here we just lock body scroll while it's open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const sidebarBody = (
    <>
      <div className="border-b border-line px-5 py-4">
        <BrandLogo />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <NavLinks items={items} onNavigate={() => setMobileOpen(false)} />
      </div>
      <div className="border-t border-line px-5 py-3">
        <p className="text-[11px] font-medium text-brand-900/40">
          TIC · IIT Guwahati
        </p>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-cream-100 text-[#3a352f]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-white lg:flex">
        {sidebarBody}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-brand-900/40 backdrop-blur-[2px]"
          />
          <aside className="animate-drawer absolute inset-y-0 left-0 flex w-64 max-w-[80%] flex-col border-r border-line bg-white shadow-2xl">
            {sidebarBody}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-cream-50/90 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-brand-700 transition hover:bg-brand-50 lg:hidden"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {/* Compact logo for mobile, where the sidebar is hidden */}
            <div className="lg:hidden">
              <BrandLogo showTagline={false} imgClassName="h-11 w-auto" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm leading-tight text-[#7a7066] sm:block">
              <span className="text-xs">Signed in as</span>{" "}
              <span className="font-semibold text-[#3a352f]">{displayName}</span>
              {roleLabel && (
                <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                  {roleLabel}
                </span>
              )}
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex items-center rounded-xl border border-line bg-white px-3 py-1.5 text-sm font-semibold text-[#5a524a] shadow-sm transition hover:border-blush-200 hover:bg-blush-50 hover:text-blush-600"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
