"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { transition } from "@/lib/orders/lifecycle";
import { TRANSITION_LABEL } from "@/lib/orders/transitions";
import type { OrderStatus } from "@/lib/types";

const DANGER: OrderStatus[] = ["cancelled", "returned", "refunded"];

export function LifecycleActions({
  orderId,
  allowed,
}: {
  orderId: string;
  allowed: OrderStatus[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(to: OrderStatus) {
    setError(null);
    const opts: { restock?: boolean } = {};

    if (to === "cancelled") {
      if (!window.confirm("Cancel this order? Any reserved stock will be released."))
        return;
    } else if (to === "refunded") {
      if (!window.confirm("Mark this order refunded?")) return;
    } else if (to === "returned") {
      opts.restock = window.confirm(
        "Items returned. OK = restock (add back to on-hand). Cancel = write off as damaged.",
      );
    }

    setPending(to);
    const res = await transition(orderId, to, opts);
    setPending(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  if (allowed.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        No further actions — this order is in a terminal state.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {allowed.map((to) => {
          const danger = DANGER.includes(to);
          return (
            <button
              key={to}
              type="button"
              onClick={() => run(to)}
              disabled={pending !== null}
              className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                danger
                  ? "border border-red-300 text-red-700 hover:bg-red-50"
                  : "bg-gray-900 text-white hover:bg-gray-800"
              }`}
            >
              {pending === to ? "Working…" : TRANSITION_LABEL[to]}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
