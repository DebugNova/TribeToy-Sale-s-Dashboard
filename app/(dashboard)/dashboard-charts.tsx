"use client";

// Recharts visualisations for the dashboard. Each takes already-aggregated, serializable data
// from the server page (aggregation happens in SQL, never here). Client-only by necessity
// (Recharts renders to the DOM / SVG).

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { formatINR } from "@/lib/money";
import { CHANNEL_LABEL } from "@/components/status-badge";
import type { TrendPoint, ChannelSlice } from "@/lib/analytics/types";

const CHART_HEIGHT = 256;

/** "2026-06-20" -> "20 Jun" in IST for axis ticks. */
function shortDay(day: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${day}T00:00:00+05:30`));
}

const compactINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

const axisProps = {
  tick: { fontSize: 11, fill: "#9a9084" },
  stroke: "#e9dcc8",
} as const;

const GRID_STROKE = "#f3ebdd";

function Empty() {
  return (
    <div
      className="flex items-center justify-center text-sm text-[#a89e90]"
      style={{ height: CHART_HEIGHT }}
    >
      No data for the selected filters.
    </div>
  );
}

export function RevenueTrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="day" tickFormatter={shortDay} {...axisProps} />
        <YAxis tickFormatter={compactINR} width={56} {...axisProps} />
        <Tooltip
          formatter={(value) => [formatINR(Number(value)), "Revenue"]}
          labelFormatter={(label) => shortDay(String(label))}
        />
        <Bar dataKey="revenue" fill="#54902a" radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OrdersTrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="day" tickFormatter={shortDay} {...axisProps} />
        <YAxis allowDecimals={false} width={32} {...axisProps} />
        <Tooltip
          formatter={(value) => [String(value), "Orders"]}
          labelFormatter={(label) => shortDay(String(label))}
        />
        <Line
          type="monotone"
          dataKey="orders"
          stroke="#e34f8c"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#e34f8c" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

const CHANNEL_COLORS = [
  "#54902a", // brand green
  "#e34f8c", // blush
  "#8fc846", // light leaf
  "#f3a3c6", // light blush
  "#6fad2e", // leaf
  "#cf3576", // deep blush
  "#aed975", // pale leaf
];

export function ChannelSplitChart({ data }: { data: ChannelSlice[] }) {
  if (data.length === 0) return <Empty />;
  const rows = data.map((d) => ({
    ...d,
    label: CHANNEL_LABEL[d.channel] ?? d.channel,
  }));
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis tickFormatter={compactINR} width={56} {...axisProps} />
        <Tooltip
          formatter={(value, _name, item) => [
            formatINR(Number(value)),
            `Revenue · ${item?.payload?.orders ?? 0} orders`,
          ]}
        />
        <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={64}>
          {rows.map((row, i) => (
            <Cell key={row.channel} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
