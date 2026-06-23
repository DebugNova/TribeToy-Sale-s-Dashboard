"use client";

// Single-date branded picker — the one custom date control, mirroring the look &
// behaviour of the dashboard's DateRangePicker but for picking ONE day (e.g. a
// shipment's dispatch date). Replaces native <input type="date"> (whose tiny OS
// icon trigger reads as dated on desktop). The whole pill is clickable, the
// popover fits a 320px phone, and it closes on outside-click / Escape.
//
// Modes:
//   • Controlled:   pass `value` + `onValueChange`.
//   • Native form:  pass `name` — a hidden <input> mirrors the value so plain
//                   GET / server-action forms serialise it like the old input.
// All days are plain YYYY-MM-DD strings (IST calendar days), so string order ==
// chronological order with no timezone off-by-one surprises.

import { useEffect, useId, useMemo, useRef, useState } from "react";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parse(ymd: string): { y: number; m: number; d: number } {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m: m - 1, d };
}

/** "2026-05-24" -> "24 May 2026". */
function fmt(ymd: string): string {
  const { y, m, d } = parse(ymd);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m, d)));
}

/** Today as a YYYY-MM-DD string in IST. */
function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** 42 cells (6 weeks, Monday-first) covering the given month plus spill-over. */
function buildGrid(viewY: number, viewM: number) {
  const firstDow = new Date(Date.UTC(viewY, viewM, 1)).getUTCDay();
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

export function DatePicker({
  value,
  onValueChange,
  name,
  id,
  ariaLabel,
  placeholder = "Select a date",
  className = "",
}: {
  value: string;
  onValueChange?: (value: string) => void;
  name?: string;
  id?: string;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const anchor = value || todayIST();
  const [view, setView] = useState(() => {
    const { y, m } = parse(anchor);
    return { y, m };
  });

  const ref = useRef<HTMLDivElement>(null);
  const popId = useId();
  const today = todayIST();

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

  function pick(ymd: string) {
    onValueChange?.(ymd);
    setView(parse(ymd));
    setOpen(false);
  }

  return (
    <div className={`relative ${className}`} ref={ref}>
      {name && <input type="hidden" name={name} value={value} />}

      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        aria-label={ariaLabel}
        className={`flex w-full items-center gap-2 rounded-xl border bg-white px-3 py-2 text-left text-sm shadow-sm transition ${
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
        <span className={`flex-1 truncate font-medium ${value ? "text-[#3a352f]" : "text-[#b3a99b]"}`}>
          {value ? fmt(value) : placeholder}
        </span>
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
          aria-label={ariaLabel ?? "Choose a date"}
          className="animate-fade-rise absolute left-0 top-full z-50 mt-2 w-[18rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-white p-3 shadow-xl shadow-black/10"
        >
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
          <div className="grid grid-cols-7">
            {grid.map((c) => {
              const selected = !!value && c.ymd === value;
              const isToday = c.ymd === today;
              return (
                <div key={c.ymd} className="flex h-10 items-center justify-center">
                  <button
                    type="button"
                    aria-label={fmt(c.ymd)}
                    aria-pressed={selected}
                    onClick={() => pick(c.ymd)}
                    className={`grid h-9 w-9 place-items-center rounded-full text-sm transition ${
                      selected
                        ? "bg-brand-600 font-bold text-white shadow-sm shadow-brand-600/30"
                        : c.inMonth
                          ? "text-[#3a352f] hover:bg-brand-50 hover:text-brand-700"
                          : "text-[#cbc3b6] hover:bg-cream-100"
                    } ${isToday && !selected ? "font-bold text-brand-700 ring-1 ring-brand-300" : ""}`}
                  >
                    {c.day}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer: quick "Today" + close */}
          <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-xs">
            <button
              type="button"
              onClick={() => pick(today)}
              className="rounded-full border border-line bg-cream-50 px-2.5 py-1 font-semibold text-[#5a524a] transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              Today
            </button>
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
