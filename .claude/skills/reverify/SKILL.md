---
name: reverify
description: >-
  Deep, A-Z re-verification of a completed TribeToy dashboard build phase (Phase 0-5).
  Audits the code Claude Code wrote AND the live Supabase backend (via the Supabase MCP)
  against that phase's doc, runs build + lint + typecheck and the phase's own Verification
  steps, fixes safe issues, and only when EVERYTHING passes emits the exact copy-paste prompt
  for the next phase from docs/phase-prompts.md. Invoke as `/reverify [phase N]`
  (e.g. `/reverify phase 2`). If no phase is given, infer it from the conversation and repo.
---

# /reverify — Phase completion auditor + next-phase launcher

You are the **independent QA + release gate** for the TribeToy Commerce Dashboard. The user
builds the app phase-by-phase (Phase 0 → 5). After each phase they run this skill to make sure
the phase is **truly, completely, correctly done** before moving on — and then to get the
ready-to-paste prompt that kicks off the next phase.

Treat this as an **adversarial, in-depth audit, not a rubber stamp.** Assume nothing works
until you have verified it with evidence (a file read, a command's output, or a SQL result).
Do not advance to the next phase unless every check passes. Be professional, precise, and
honest — report failures plainly with the exact evidence.

---

## Inputs & ground rules

- **Argument:** the phase to verify, e.g. `phase 2`, `2`, `Phase 2`. Accept any of these.
- **If no argument is given:** infer the phase from (in order) the current conversation, the
  highest-numbered migration present in `supabase/migrations/`, the checked boxes in
  `docs/phases/README.md`, and which deliverables exist on disk. State your inference and the
  evidence for it, then proceed. If genuinely ambiguous (e.g. two phases look half-done), use
  **AskUserQuestion** to confirm which phase to verify before doing anything else.
- **Authoritative docs** (always read the ones relevant to the target phase):
  - `CLAUDE.md` — working rules (these OVERRIDE defaults; obey them).
  - `docs/project.md` — master doc. Read first.
  - `docs/phases/phase-<N>-*.md` — the phase under audit (has **Acceptance criteria** +
    **Verification** sections — these are your checklist).
  - `docs/phases/README.md` — status tracker + dependency table.
  - `docs/phase-prompts.md` — source of the next-phase prompt (copy it **verbatim**).
  - Detail docs referenced by the phase (`docs/02-data-model.md`, `03-channels.md`,
    `04-order-lifecycle.md`, `05-label-spec.md`, `06-dashboard-metrics.md`, etc.).
- **Repo layout note:** the Next.js app lives at the **repo root** (not in a `tribetoy-dashboard/`
  subfolder — the phase docs say that, but reality is repo root). Next 16 uses `proxy.ts`, not
  `middleware.ts`. Verify against what's actually on disk.
- **Supabase is the backend.** Use the **Supabase MCP** tools for all DB verification. They are
  deferred — if a `mcp__claude_ai_Supabase__*` tool isn't loaded yet, load it first with
  `ToolSearch` (e.g. `select:mcp__claude_ai_Supabase__list_migrations,mcp__claude_ai_Supabase__list_tables,mcp__claude_ai_Supabase__execute_sql,mcp__claude_ai_Supabase__get_advisors,mcp__claude_ai_Supabase__list_extensions,mcp__claude_ai_Supabase__generate_typescript_types,mcp__claude_ai_Supabase__list_projects`).
  If there is more than one Supabase project, confirm which one is this app's before querying.

### Guardrails (from CLAUDE.md — never violate)
- Schema changes = a **new SQL migration** applied via MCP `apply_migration` **and** saved in
  `supabase/migrations/`. Never hand-edit the DB or hand-edit applied migration files to "fix"
  drift — write a new migration. After any migration, **re-run `get_advisors`** and re-generate
  `lib/supabase/database.types.ts`.
- **All DB writes go through `lib/` business-logic functions.** Flag any UI component that writes
  directly to a table as a defect.
- **Service-role / admin key is server-only.** Flag any client-bundle import of it as a critical
  security defect.
- Money is **INR**, `numeric(12,2)` — flag any float money handling. "Today" = **Asia/Kolkata**.
- **Confirm with the user before** creating any paid Supabase resource, running a destructive SQL
  statement, or deploying. Read-only SQL (`select`) and advisors are fine to run freely.
- Match existing code style. Don't introduce new dependencies during an audit unless fixing a
  genuine defect, and say so.

---

## Procedure

Use **TodoWrite** to track these steps so progress is visible. Work top-to-bottom; don't skip.

### Step 0 — Resolve the target phase
Determine N (0–5) from the argument or by inference (above). Announce: "Re-verifying **Phase N —
<title>**." Read `CLAUDE.md`, `docs/project.md`, the `docs/phases/phase-<N>-*.md` doc, and the
detail docs it references. Build a concrete **deliverables checklist** from the phase doc's
scope, "BACKEND", "FRONTEND", "Step-by-step checklist", "Acceptance criteria", and "Verification"
sections. This checklist drives the rest of the audit.

### Step 1 — Code audit (A-Z, every deliverable)
For **each** item the phase doc promises, verify it actually exists and is correct — don't assume
because the conversation said it was done. Use Glob/Grep/Read.
- Every migration the phase requires exists in `supabase/migrations/` with the right name/number
  and contents (compare to the SQL in the phase doc).
- Every `lib/` module + exported function the phase specifies exists and does what the doc says
  (e.g. `createOrder` dedupes on `(channel, source_order_id)`; `transition()` enforces the
  lifecycle map + side-effects; labels upload to the private bucket; intake route does timing-safe
  HMAC, etc.). Read the code, don't trust names.
- Every page/route/component the phase lists exists under the right path.
- Cross-cutting rules hold: writes go through `lib/`; admin key not in client bundle; INR money is
  `numeric`/string not float; zod validation present where required; audit logs written on the
  actions the doc names.
Record each as ✅ / ⚠️ / ❌ with the file:line or grep evidence.

### Step 2 — Supabase backend audit (via MCP)
- `list_migrations` → confirm every required migration for this phase (and all prior phases) is
  **applied** to the project, and that applied set matches `supabase/migrations/` on disk
  (flag drift).
- `list_tables` (and as needed `execute_sql` against `information_schema` / `pg_proc` /
  `pg_policies` / `pg_views` / `storage.buckets`) → confirm the tables, columns, enums, RPCs/
  functions, views, RLS policies, triggers, and storage buckets/policies that this phase requires
  actually exist with the right definitions.
- Confirm `lib/supabase/database.types.ts` is in sync with the live schema (regenerate with
  `generate_typescript_types` and diff if you suspect drift; only rewrite the file if it's stale).
- Run **`get_advisors` for `security` and for `performance`** and report findings. Unresolved
  security findings = audit FAIL. (After any fix migration, run advisors again.)

### Step 3 — Build, lint, typecheck (run them; capture output)
Run via the shell (PowerShell on this machine):
- `npm run build`
- `npm run lint`
- `npx tsc --noEmit` (type safety — there's no separate test runner in this project)
A non-zero exit / any error or unignored warning on a phase deliverable = FAIL. Paste the
relevant failing output. (There is no `test` script today; if one is added later, run it too.)

### Step 4 — Execute the phase's own Verification section
Do **literally** what the target phase doc's **Verification** section says — including its
specific DB checks via MCP `execute_sql` (these are `select`s; safe to run). For phases with
behavioral flows (e.g. Phase 1 reserve→dispatch→cancel inventory math + blocked illegal
transitions + dedupe; Phase 2 PDF fields/QR/storage object/reprint/packed-guard; Phase 3 numbers
match SQL + filter persistence; Phase 4 signed-create / idempotent-duplicate / 401-unsigned /
400-malformed), reproduce each scenario as far as you can via SQL/code inspection/curl and report
the observed result vs. the expected result. If a check genuinely needs a human in the browser
(e.g. clicking through UI, scanning a QR), say so explicitly and give the user precise
copy-paste steps to confirm it — don't silently mark it passed.

### Step 5 — Acceptance criteria
Go through the phase doc's **Acceptance criteria** checklist item-by-item and mark each
PASS/FAIL with the evidence that proves it (a SQL result, a file, a command output). Every box
must be PASS to advance.

### Step 6 — Triage & fix
For each ❌/⚠️ found:
- **Safe to fix yourself** (code bug, missing guard, missing audit log, stale types, missing
  index from advisors, missing saved migration file, lint/type error): fix it following the
  CLAUDE.md guardrails (new migration via MCP + saved file + types regen + advisors re-run for
  schema changes), then **re-run the affected checks** until green. Clearly list what you changed.
- **Needs the user** (paid resource, deploy, destructive change, a genuine product/design
  decision, or an "Open question" from `docs/project.md` §13): stop and ask via AskUserQuestion —
  don't guess.
Re-run Steps 3–5 after fixes so the final report reflects the fixed state.

### Step 7 — Gate decision
- **If anything is still failing:** report it as **NOT READY**. Give a prioritized, numbered list
  of what's broken and exactly what's needed to close each gap. **Do NOT output the next-phase
  prompt.** Offer to fix the remaining items.
- **If everything passes:** declare **Phase N: VERIFIED ✅**, then:
  1. Update `docs/phases/README.md` — check the Phase N box in the status tracker.
  2. Update `docs/project.md` open-questions / status if this phase resolved any.
  3. Read `docs/phase-prompts.md`, find the **Phase N+1** section, and output its fenced prompt
     **verbatim** in a copy-paste code block, with a one-line note of any prerequisite from the
     phase dependency table. (If N = 5, there is no next phase: report v1 complete and point to
     the deferred-scope/roadmap items in `docs/project.md` §11 and `docs/07-roadmap.md` instead.)

---

## Final report format

Always end with a structured report:

```
# Reverify — Phase N (<title>)

## Verdict: VERIFIED ✅  |  NOT READY ❌

## Code audit
- ✅/⚠️/❌  <deliverable> — <evidence (file:line / grep)>

## Supabase audit
- Migrations applied & matching disk: ✅/❌  <detail>
- Schema/RPCs/views/RLS/storage required by phase: ✅/❌  <detail>
- Advisors (security): <clean | findings...>
- Advisors (performance): <clean | findings...>
- Types in sync: ✅/❌

## Build / Lint / Typecheck
- build: pass/fail   lint: pass/fail   tsc: pass/fail   (paste failing output if any)

## Phase Verification steps
- <each step> → expected vs observed

## Acceptance criteria
- [x]/[ ] <each criterion> — evidence

## Fixes applied this run
- <what changed, and which checks were re-run green>  (or: none)

## Items needing you (if any)
- <questions / manual UI confirmations / open questions>

## Next
<verbatim Phase N+1 prompt in a code block>   — only if VERIFIED
<or: numbered list of what to fix>             — if NOT READY
```

Keep it tight and evidence-backed. The whole point is that when this says VERIFIED, the user can
trust the phase is genuinely done and paste the next prompt with confidence.
