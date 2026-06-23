"use client";

// Reusable custom <Select> (listbox) — the single professional dropdown used across the whole
// dashboard, replacing every native <select> (which opens the bare OS menu). It renders a
// branded trigger pill + a styled popover list with full keyboard support, optional inline
// search for long lists, and click-outside / Escape to close.
//
// Works in three modes so it can drop into any existing form:
//   • Controlled:    pass `value` + `onValueChange`.
//   • Uncontrolled:  pass `defaultValue` (and `name` to submit in a form).
//   • Native form:   pass `name` — a hidden <input> mirrors the value, so plain GET forms and
//                    server-action forms serialise it exactly like the old <select> did.

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SelectOption = { value: string; label: string; hint?: string };

export function Select({
  options,
  value,
  defaultValue = "",
  onValueChange,
  name,
  id,
  placeholder = "Select…",
  disabled = false,
  searchable = false,
  className = "",
  ariaLabel,
}: {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const selected = (controlled ? value : internal) ?? "";

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typeahead = useRef<{ buf: string; t: ReturnType<typeof setTimeout> | null }>({
    buf: "",
    t: null,
  });
  const listId = useId();

  const selectedOption = options.find((o) => o.value === selected) ?? null;

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  // Close on outside click while open.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Keep the highlighted row in view.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open, filtered.length]);

  // Open + highlight the current value (and focus the search box for searchable lists). Done in
  // the handler rather than an effect so we never call setState inside an effect body.
  function openMenu() {
    const idx = filtered.findIndex((o) => o.value === selected);
    setActive(idx >= 0 ? idx : 0);
    setOpen(true);
    if (searchable) requestAnimationFrame(() => searchRef.current?.focus());
  }

  function choose(opt: SelectOption) {
    if (!controlled) setInternal(opt.value);
    onValueChange?.(opt.value);
    setOpen(false);
    setQuery("");
    buttonRef.current?.focus();
  }

  // Arrow / Enter / Escape / Home / End — shared by the trigger and the search box.
  function navKey(e: React.KeyboardEvent) {
    switch (e.key) {
      case "Escape":
      case "Tab":
        setOpen(false);
        return;
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(i + 1, filtered.length - 1));
        return;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        return;
      case "Home":
        e.preventDefault();
        setActive(0);
        return;
      case "End":
        e.preventDefault();
        setActive(filtered.length - 1);
        return;
      case "Enter": {
        e.preventDefault();
        const opt = filtered[active];
        if (opt) choose(opt);
        return;
      }
    }
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === " ") {
      e.preventDefault();
      const opt = filtered[active];
      if (opt) choose(opt);
      return;
    }
    navKey(e);
    // Typeahead for non-searchable lists.
    if (!searchable && e.key.length === 1 && /\S/.test(e.key)) {
      const ta = typeahead.current;
      ta.buf += e.key.toLowerCase();
      if (ta.t) clearTimeout(ta.t);
      ta.t = setTimeout(() => (ta.buf = ""), 600);
      const idx = filtered.findIndex((o) => o.label.toLowerCase().startsWith(ta.buf));
      if (idx >= 0) setActive(idx);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={selected} />}

      <button
        ref={buttonRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (open) setOpen(false);
          else openMenu();
        }}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-left text-sm shadow-sm transition disabled:cursor-not-allowed disabled:bg-cream-100 disabled:text-[#9a9084] ${
          open ? "border-brand-400 ring-2 ring-brand-200" : "border-line hover:border-brand-300"
        }`}
      >
        <span className={`flex-1 truncate ${selectedOption ? "text-[#3a352f]" : "text-[#b3a99b]"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          className={`shrink-0 text-[#9a9084] transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          id={listId}
          className="animate-fade-rise absolute left-0 top-full z-50 mt-2 max-h-72 w-max min-w-full max-w-[calc(100vw-2rem)] overflow-auto rounded-xl border border-line bg-white p-1 shadow-xl shadow-black/10"
        >
          {searchable && (
            <div className="sticky top-0 -m-1 mb-1 border-b border-line bg-white p-2">
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={navKey}
                placeholder="Search…"
                className="w-full rounded-lg border border-line bg-cream-50 px-2.5 py-1.5 text-sm outline-none transition placeholder:text-[#b3a99b] focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              />
            </div>
          )}

          <div ref={listRef} role="listbox" aria-label={ariaLabel}>
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-center text-sm text-[#a89e90]">No matches.</p>
            ) : (
              filtered.map((opt, i) => {
                const isSelected = opt.value === selected;
                const isActive = i === active;
                return (
                  <button
                    key={opt.value || `__${i}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-idx={i}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(opt)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-brand-50 font-semibold text-brand-700"
                        : isActive
                          ? "bg-cream-100 text-[#3a352f]"
                          : "text-[#3a352f]"
                    }`}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{opt.label}</span>
                      {opt.hint && (
                        <span className="truncate text-xs font-normal text-[#9a9084]">{opt.hint}</span>
                      )}
                    </span>
                    {isSelected && (
                      <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        className="shrink-0 text-brand-600" aria-hidden="true"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
