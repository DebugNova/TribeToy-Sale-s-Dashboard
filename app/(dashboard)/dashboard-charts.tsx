"use client";

// Recharts visualisations for the dashboard. Each takes already-aggregated, serializable data
// from the server page (aggregation happens in SQL, never here). Client-only by necessity
// (Recharts renders to the DOM / SVG). The styling leans on the TribeToy palette: leaf-green
// gradients for money, blush for counts, warm-cream gridlines, and a shared branded tooltip.

import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
  LabelList,
} from "recharts";
import { formatINR } from "@/lib/money";
import { CHANNEL_LABEL } from "@/components/status-badge";
import type { TrendPoint, ChannelSlice } from "@/lib/analytics/types";

const CHART_HEIGHT = 264;

/** "2026-06-20" -> "20 Jun" in IST for axis ticks. */
function shortDay(day: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${day}T00:00:00+05:30`));
}

/** "2026-06-20" -> "Saturday, 20 Jun" for tooltips. */
function longDay(day: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
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
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
} as const;

const GRID_STROKE = "#f1e9da";

type TipItem = { label: string; value: string; color: string };

/** Shared branded tooltip card. `items` maps the hovered payload point into rows. */
function BrandTooltip({
  active,
  payload,
  label,
  labelFormat,
  items,
}: {
  active?: boolean;
  payload?: { value?: number | string; payload?: Record<string, number> }[];
  label?: string | number;
  labelFormat?: (l: string) => string;
  items?: (p: { value?: number | string; payload?: Record<string, number> }) => TipItem[];
}) {
  if (!active || !payload || payload.length === 0 || !items) return null;
  const rows = items(payload[0]);
  return (
    <div className="min-w-[10rem] rounded-xl border border-line bg-white/95 px-3 py-2 shadow-lg shadow-black/10 backdrop-blur">
      {label != null && (
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#9a9084]">
          {labelFormat ? labelFormat(String(label)) : String(label)}
        </p>
      )}
      {rows.map((it) => (
        <div key={it.label} className="flex items-center justify-between gap-5 py-0.5 text-sm">
          <span className="flex items-center gap-1.5 text-[#7a7066]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />
            {it.label}
          </span>
          <span className="font-bold tabular-nums text-[#332f29]">{it.value}</span>
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 text-sm text-[#a89e90]"
      style={{ height: CHART_HEIGHT }}
    >
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#d8cdbb]">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
      No data for the selected filters.
    </div>
  );
}

export function RevenueTrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) return <Empty />;
  const avg = data.reduce((s, d) => s + d.revenue, 0) / data.length;
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="revBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8fcb3f" />
            <stop offset="100%" stopColor="#5f9e2b" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
        <XAxis
          dataKey="day"
          tickFormatter={shortDay}
          minTickGap={24}
          interval="preserveStartEnd"
          {...axisProps}
        />
        <YAxis tickFormatter={compactINR} width={56} {...axisProps} />
        <Tooltip
          cursor={{ fill: "rgba(95,158,43,0.06)" }}
          content={
            <BrandTooltip
              labelFormat={longDay}
              items={(p) => [
                { label: "Revenue", value: formatINR(Number(p.value)), color: "#5f9e2b" },
              ]}
            />
          }
        />
        {avg > 0 && (
          <ReferenceLine
            y={avg}
            stroke="#bba98a"
            strokeDasharray="5 4"
            label={{
              value: `Avg ${compactINR(avg)}`,
              position: "right",
              fill: "#a89e90",
              fontSize: 10,
            }}
          />
        )}
        <Bar dataKey="revenue" fill="url(#revBar)" radius={[6, 6, 0, 0]} maxBarSize={46} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function OrdersTrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <AreaChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e34f8c" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#e34f8c" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
        <XAxis
          dataKey="day"
          tickFormatter={shortDay}
          minTickGap={24}
          interval="preserveStartEnd"
          {...axisProps}
        />
        <YAxis allowDecimals={false} width={32} {...axisProps} />
        <Tooltip
          cursor={{ stroke: "#e34f8c", strokeWidth: 1, strokeDasharray: "4 4" }}
          content={
            <BrandTooltip
              labelFormat={longDay}
              items={(p) => [
                { label: "Orders", value: String(p.value ?? 0), color: "#e34f8c" },
              ]}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="orders"
          stroke="#e34f8c"
          strokeWidth={2.5}
          fill="url(#ordersFill)"
          dot={{ r: 3, fill: "#fff", stroke: "#e34f8c", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: "#e34f8c", stroke: "#fff", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const CHANNEL_COLORS = [
  "#5f9e2b", // brand green (600)
  "#e34f8c", // blush
  "#99d04c", // light leaf (400)
  "#f3a3c6", // light blush
  "#7fbb34", // leaf (500)
  "#cf3576", // deep blush
  "#b6e074", // pale leaf (300)
];

export function ChannelSplitChart({ data }: { data: ChannelSlice[] }) {
  if (data.length === 0) return <Empty />;
  const rows = data.map((d, i) => ({
    ...d,
    label: CHANNEL_LABEL[d.channel] ?? d.channel,
    fill: CHANNEL_COLORS[i % CHANNEL_COLORS.length],
  }));
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={rows} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis tickFormatter={compactINR} width={56} {...axisProps} />
        <Tooltip
          cursor={{ fill: "rgba(95,158,43,0.06)" }}
          content={
            <BrandTooltip
              items={(p) => [
                { label: "Revenue", value: formatINR(Number(p.value)), color: "#5f9e2b" },
                { label: "Orders", value: String(p.payload?.orders ?? 0), color: "#e34f8c" },
              ]}
            />
          }
        />
        <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={64}>
          <LabelList
            dataKey="revenue"
            position="top"
            formatter={(v) => compactINR(Number(v ?? 0))}
            style={{ fill: "#8a8076", fontSize: 11, fontWeight: 700 }}
          />
          {rows.map((row) => (
            <Cell key={row.channel} fill={row.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
