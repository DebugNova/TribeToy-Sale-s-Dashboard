# Backups & Restore (Phase 5)

> How TribeToy's data is backed up and how to recover it. Confirm the dashboard toggles
> below before going live — they are project-level settings, not code.

## What needs protecting

| Asset | Where | Recovery path |
|---|---|---|
| Postgres data (orders, customers, products, inventory, audit, …) | Supabase Postgres (`itvjtmwteyqqakhtfajd`, ap-south-1) | Automated backup / PITR (below) |
| Schema | `supabase/migrations/0001…0010` (in git) | Re-apply migrations to a fresh project |
| Label PDFs | Supabase Storage, private `labels` bucket | Regenerable from order data (reprint) + bucket retention |
| Auth users | Supabase Auth (`auth.users`) | Included in the full DB backup |

## Automated backups — confirm in the dashboard

Supabase **Dashboard → Project → Database → Backups**:

- **Daily backups** are automatic on the **Pro plan** (retained 7 days). On the **Free plan
  there are no automated backups** — upgrade to Pro (or take manual logical backups, below)
  before this is the system of record.
- **Point-in-Time Recovery (PITR)** is a paid add-on. Enable it if the business needs
  recovery to an arbitrary second (recommended once order volume is real).

> Status to confirm: as of Phase 5 the plan/backup setting has not been verified from code
> (the MCP doesn't expose it). **Action: a founder should open the Backups page and confirm
> daily backups (and ideally PITR) are on.**

### Manual logical backup (works on any plan)

```bash
# Full schema + data dump (run from a trusted machine; needs the DB connection string)
pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges -Fc -f tribetoy_$(date +%F).dump
```

Store the dump off-Supabase (e.g. encrypted cloud storage). Schedule it (cron / GitHub Action)
if staying on Free.

## Restore steps

### A. Restore from an automated backup (same project)
1. Dashboard → Database → **Backups** → pick a backup → **Restore**.
2. Confirm. Supabase replaces the current database with the backup (this is destructive —
   it overwrites current data). The project is briefly unavailable during restore.
3. After restore: sign in as the founder, spot-check recent orders + `audit_logs`.

### B. Point-in-Time Recovery
1. Dashboard → Database → Backups → **Point in Time** → choose the timestamp (IST).
2. Restore and verify as above.

### C. Rebuild a fresh project from migrations + a dump
Use if the project is lost entirely:
1. Create a new Supabase project (same region, `ap-south-1`).
2. Apply migrations in order: `supabase/migrations/0001 … 0010` (via `supabase db push`
   or the MCP `apply_migration`). This recreates schema, enums, RLS, RPCs, the `labels`
   bucket and policies.
3. Restore data from the latest `pg_dump` (`pg_restore --data-only`) **or** the managed
   backup.
4. Recreate auth users if not included (founder + role users), then re-point the app env
   (`NEXT_PUBLIC_SUPABASE_URL`, keys, `INTAKE_WEBHOOK_SECRET`) to the new project.
5. Restore label PDFs to the `labels` bucket if needed (or rely on reprint).

## Storage (`labels`) retention
The `labels` bucket is private and append-only in the app (it never deletes; reprints add a
new versioned file). PDFs are reproducible from order data via **Reprint**, so a lost bucket
is recoverable as long as the Postgres data survives. For belt-and-suspenders, enable bucket
backups or periodically sync the bucket to external storage.
