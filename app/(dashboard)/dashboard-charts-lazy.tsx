"use client";

// Recharts is ~370KB gzipped-ish — by far the largest client chunk in the app. Loading it
// through next/dynamic with `ssr: false` keeps it out of the dashboard's initial bundle: the
// shell, KPI cards, tables and filter bar hydrate immediately, and each chart streams in (with
// a height-matched skeleton, so there's no layout shift) once its chunk arrives. The charts are
// analytical, not interactive-critical, so deferring them is the right trade-off — especially on
// low-end devices. `ssr: false` is allowed here because this module is a Client Component.

import dynamic from "next/dynamic";

const CHART_HEIGHT = 264;

function ChartSkeleton() {
  return (
    <div
      className="skeleton w-full rounded-xl"
      style={{ height: CHART_HEIGHT }}
      aria-hidden
    />
  );
}

export const RevenueTrendChart = dynamic(
  () => import("./dashboard-charts").then((m) => m.RevenueTrendChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export const OrdersTrendChart = dynamic(
  () => import("./dashboard-charts").then((m) => m.OrdersTrendChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export const ChannelSplitChart = dynamic(
  () => import("./dashboard-charts").then((m) => m.ChannelSplitChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
