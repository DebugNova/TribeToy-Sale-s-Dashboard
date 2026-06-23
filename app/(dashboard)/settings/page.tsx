import { createClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/auth/roles";
import { SettingsForm } from "./settings-form";
import { IntakePanel } from "./intake-panel";

export default async function SettingsPage() {
  await requireCapability("settings.write"); // admin-only; others redirected to /
  const supabase = await createClient();
  const { data: settings, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single();

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
      <p className="mt-1 text-sm text-gray-500">
        Sender details printed on shipping labels and the default courier.
      </p>

      <div className="mt-6">
        {error || !settings ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Could not load settings{error ? `: ${error.message}` : ""}.
          </p>
        ) : (
          <SettingsForm settings={settings} />
        )}
      </div>

      <div className="mt-10 border-t border-gray-200 pt-8">
        <h2 className="text-lg font-semibold text-gray-900">Website intake (Phase 4)</h2>
        <p className="mt-1 text-sm text-gray-500">
          Auto-import orders from the custom website via the signed intake API.
        </p>
        <div className="mt-6">
          <IntakePanel />
        </div>
      </div>
    </div>
  );
}
