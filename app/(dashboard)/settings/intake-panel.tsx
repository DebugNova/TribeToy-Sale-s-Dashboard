import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SIGNATURE_HEADER } from "@/lib/intake/verifySignature";
import { formatDateTime } from "@/lib/format";

const STATUS_STYLE: Record<string, string> = {
  created: "bg-green-100 text-green-700",
  duplicate: "bg-amber-100 text-amber-800",
  error: "bg-red-100 text-red-700",
};

function EventStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        STATUS_STYLE[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}

/** Resolve the public origin for this deployment from the request headers. */
async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function IntakePanel() {
  const origin = await getOrigin();
  const endpoint = `${origin}/api/intake/website`;

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("intake_events")
    .select("id, channel, status, source_order_id, order_no, message, created_at")
    .order("created_at", { ascending: false })
    .limit(15);

  const nodeSnippet = `import { createHmac } from "node:crypto";

// Sign the EXACT bytes you POST (stringify once, reuse the same string).
const body = JSON.stringify(order);
const signature = createHmac("sha256", process.env.INTAKE_WEBHOOK_SECRET)
  .update(body, "utf8")
  .digest("hex");

await fetch("${endpoint}", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "${SIGNATURE_HEADER}": signature,
  },
  body,
});`;

  return (
    <div className="max-w-3xl space-y-6">
      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Website intake endpoint</h2>
          <p className="mt-1 text-sm text-gray-500">
            Point your website&apos;s order webhook here. Each request must be signed with the
            shared secret <code className="font-mono text-gray-700">INTAKE_WEBHOOK_SECRET</code>{" "}
            (server-side env). Imports are idempotent on{" "}
            <code className="font-mono text-gray-700">source_order_id</code> — safe to retry.
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="font-medium text-gray-600">Method &amp; URL</dt>
          <dd className="font-mono text-gray-900">
            <span className="mr-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold">
              POST
            </span>
            <span className="break-all">{endpoint}</span>
          </dd>
          <dt className="font-medium text-gray-600">Signature header</dt>
          <dd className="font-mono text-gray-900">{SIGNATURE_HEADER}</dd>
          <dt className="font-medium text-gray-600">Signature value</dt>
          <dd className="text-gray-700">hex HMAC-SHA256 of the raw JSON body</dd>
        </dl>

        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
            Signing snippet (website side)
          </p>
          <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs leading-relaxed text-gray-100">
            <code>{nodeSnippet}</code>
          </pre>
        </div>

        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Rotating the secret is env-managed: set a new{" "}
          <code className="font-mono">INTAKE_WEBHOOK_SECRET</code> in your host (Vercel) and on
          the website, then redeploy both. There is no in-app rotation so the secret never
          touches the browser.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Recent intake activity</h2>
          <p className="mt-1 text-sm text-gray-500">
            Last 15 intake attempts (website &amp; CSV imports) for debugging.
          </p>
        </div>

        {!events || events.length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-3 py-6 text-center text-sm text-gray-400">
            No intake activity yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4 font-medium">When</th>
                  <th className="py-2 pr-4 font-medium">Channel</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Source ID</th>
                  <th className="py-2 pr-4 font-medium">Order</th>
                  <th className="py-2 font-medium">Message</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100 last:border-0">
                    <td className="whitespace-nowrap py-2 pr-4 text-gray-500">
                      {formatDateTime(e.created_at)}
                    </td>
                    <td className="py-2 pr-4 text-gray-700">{e.channel}</td>
                    <td className="py-2 pr-4">
                      <EventStatusBadge status={e.status} />
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-gray-700">
                      {e.source_order_id ?? "—"}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-gray-700">
                      {e.order_no ?? "—"}
                    </td>
                    <td className="max-w-xs truncate py-2 text-gray-500" title={e.message ?? ""}>
                      {e.message ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
