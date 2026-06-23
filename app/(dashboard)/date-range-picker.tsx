"use client";

// Custom date-range picker for the dashboard filter bar — replaces the two native
// <input type="date"> fields (outdated, only openable from the tiny OS icon) with one
// branded popover calendar. The whole pill is clickable, the range highlights as you pick,
// and a preset rail covers the common ranges. Values are mirrored into hidden inputs named
// `from` / `to` so the surrounding <form> still submits them exactly as before. All days are
// plain YYYY-MM-DD strings (IST calendar days), so string comparison == chronological order
// and there are no timezone off-by-one surprises.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { istToday, istDaysAgo } from "@/lib/analytics/types";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parse(ymd: string): { y: number; m: number; d: number } {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m: m - 1, d };
}

/** "2026-05-24" -> "24 May 2026" (optionally without the year). */
function fmt(ymd: string, withYear = true): string {
  const { y, m, d } = parse(ymd);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(new Date(Date.UTC(y, m, d)));
}

function rangeLabel(from: string, to: string): string {
  if (!from && !to) return "Select a range";
  if (from && !to) return `${fmt(from)} – …`;
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return `${fmt(from, !sameYear)} – ${fmt(to)}`;
}

/** 42 cells (6 weeks, Monday-first) covering the given month plus spill-over days. */
function buildGrid(viewY: number, viewM: number) {
  const firstDow = new Date(Date.UTC(viewY, viewM, 1)).getUTCDay(); // 0 Sun … 6 Sat
  const offset = (firstDow + 6) % 7; // Monday-first
  const start = new Date(Date.UTC(viewY, viewM, 1 - offset));
  return Array.from({ length: 42 }, (_, i) => {
    const dt = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i),
    );
    return {
      ymd: dt.toISOString().slice(0, 10),
      day: dt.getUTCDate(),
      inMonth: dt.getUTCMonth() === viewM,
    };
  });
}

const Chevron = ({ dir }: { dir: "left" | "right" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
  </svg>
);

export function DateRangePicker({
  label = "Date range",
  from: initialFrom,
  to: initialTo,
  className = "",
}: {
  label?: string;
  from: string;
  to: string;
  className?: string;
}) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"start" | "end">("start");
  const [hover, setHover] = useState<string | null>(null);

  const anchor = initialTo || initialFrom || istToday();
  const [view, setView] = useState(() => {
    const { y, m } = parse(anchor);
    return { y, m };
  });

  const ref = useRef<HTMLDivElement>(null);
  const popId = useId();
  const today = istToday();

  // Close on outside click / Escape while open.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const grid = useMemo(() => buildGrid(view.y, view.m), [view]);

  // The "live" upper bound while mid-selection (so the band previews under the cursor).
  const previewTo = to || (phase === "end" && hover && hover >= from ? hover : "");

  function pick(ymd: string) {
    if (phase === "start" || (from && to)) {
      setFrom(ymd);
      setTo("");
      setPhase("end");
      return;
    }
    if (ymd < from) {
      setFrom(ymd); // clicked before the start — restart from here
      return;
    }
    setTo(ymd);
    setPhase("start");
    setHover(null);
    setOpen(false);
  }

  function applyRange(f: string, t: string) {
    setFrom(f);
    setTo(t);
    setPhase("start");
    setHover(null);
    setView(parse(t));
    setOpen(false);
  }

  const presets: { label: string; run: () => void }[] = [
    { label: "Today", run: () => applyRange(today, today) },
    { label: "Last 7 days", run: () => applyRange(istDaysAgo(6), today) },
    { label: "Last 30 days", run: () => applyRange(istDaysAgo(29), today) },
    { label: "This month", run: () => applyRange(`${today.slice(0, 7)}-01`, today) },
    { label: "This year", run: () => applyRange(`${today.slice(0, 4)}-01-01`, today) },
  ];

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`} ref={ref}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8076]">
        {label}
      </span>

      {/* Hidden inputs the surrounding <form> serialises on submit. */}
      <input type="hidden" name="from" value={from} />
      <input type="hidden" name="to" value={to} />

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popId}
        className={`flex w-full items-center gap-2 rounded-xl border bg-white px-3 py-2 text-left text-sm text-[#3a352f] shadow-sm transition ${
          open
            ? "border-brand-400 ring-2 ring-brand-200"
            : "border-line hover:border-brand-300"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="shrink-0 text-brand-600" aria-hidden="true">
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18M8 2v4M16 2v4" />
        </svg>
        <span className="flex-1 truncate font-medium">{rangeLabel(from, to)}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 text-[#9a9084] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          id={popId}
          role="dialog"
          aria-label="Choose date range"
          className="animate-fade-rise absolute left-0 top-full z-50 mt-2 w-[20rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-white p-3 shadow-xl shadow-black/10"
        >
          {/* Preset rail */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={p.run}
                className="rounded-full border border-line bg-cream-50 px-2.5 py-1 text-xs font-semibold text-[#5a524a] transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Month header */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))}
              className="grid h-8 w-8 place-items-center rounded-lg text-[#5a524a] transition hover:bg-brand-50 hover:text-brand-700"
            >
              <Chevron dir="left" />
            </button>
            <span className="text-sm font-bold text-[#332f29]">
              {MONTHS[view.m]} {view.y}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))}
              className="grid h-8 w-8 place-items-center rounded-lg text-[#5a524a] transition hover:bg-brand-50 hover:text-brand-700"
            >
              <Chevron dir="right" />
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-center text-[11px] font-semibold text-[#a89e90]">
                {w}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7" onMouseLeave={() => setHover(null)}>
            {grid.map((c) => {
              const a = from;
              const b = previewTo;
              const isA = !!a && c.ymd === a;
              const isB = !!b && c.ymd === b;
              const inRange = !!a && !!b && c.ymd >= a && c.ymd <= b;
              const isToday = c.ymd === today;

              const band =
                inRange && !(isA && isB)
                  ? `bg-brand-100 ${isA ? "rounded-l-full" : ""} ${isB ? "rounded-r-full" : ""}`
                  : "";

              const endpoint = isA || isB;

              return (
                <div key={c.ymd} className={`flex h-10 items-center justify-center ${band}`}>
                  <button
                    type="button"
                    aria-label={fmt(c.ymd)}
                    aria-pressed={endpoint}
                    onClick={() => pick(c.ymd)}
                    onMouseEnter={() => phase === "end" && setHover(c.ymd)}
                    className={`grid h-9 w-9 place-items-center rounded-full text-sm transition ${
                      endpoint
                        ? "bg-brand-600 font-bold text-white shadow-sm shadow-brand-600/30"
                        : inRange
                          ? "font-semibold text-brand-800"
                          : c.inMonth
                            ? "text-[#3a352f] hover:bg-brand-50 hover:text-brand-700"
                            : "text-[#cbc3b6] hover:bg-cream-100"
                    } ${isToday && !endpoint ? "font-bold text-brand-700 ring-1 ring-brand-300" : ""}`}
                  >
                    {c.day}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer: live read-out of the chosen range */}
          <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-xs">
            <span className="font-medium text-[#7a7066]">{rangeLabel(from, to)}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-semibold text-brand-700 hover:text-brand-800"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
