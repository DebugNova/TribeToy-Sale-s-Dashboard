# 01 — Architecture

> Stack, project structure, conventions, and environment. Read [00-overview.md](00-overview.md) first.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js (App Router)** + **React** + **TypeScript** | One framework for UI + API routes; SSR for fast dashboards |
| Styling | **Tailwind CSS** | Fast, consistent UI without bespoke CSS |
| UI charts | **Recharts** | Lightweight, declarative charts for the dashboard |
| Backend logic | **Next.js Route Handlers + Server Actions** | Co-located business logic, no separate server to run |
| Database | **Supabase Postgres** | Managed Postgres, relational integrity, row-level security |
| Auth | **Supabase Auth** | Email/password founder login; extensible to roles |
| File storage | **Supabase Storage** | Stores generated label PDFs |
| PDF / labels | **@react-pdf/renderer** (or print-CSS fallback) | Generate A4 label PDFs server-side |
| QR codes | **qrcode** | Encode order ID / tracking into the label |
| Hosting | **Vercel** | First-class Next.js hosting + preview deploys |
| Migrations | **Supabase SQL migrations** (`supabase/migrations/`) | Versioned, migration-based schema changes |

> Decisions are intentionally boring/standard so the app is easy to maintain and hand off.

## Folder structure (target)

```
tribetoy-dashboard/
├─ app/
│  ├─ (auth)/login/            # login page
│  ├─ (dashboard)/
│  │  ├─ page.tsx              # main dashboard (KPIs + charts)
│  │  ├─ orders/
│  │  │  ├─ page.tsx           # order list
│  │  │  ├─ new/page.tsx       # manual order form
│  │  │  └─ [id]/page.tsx      # order detail + status actions + label
│  │  ├─ products/            # catalog
│  │  ├─ customers/
│  │  ├─ inventory/
│  │  ├─ shipments/
│  │  └─ settings/            # sender address, couriers, intake secret
│  └─ api/
│     └─ intake/website/route.ts   # secure custom-site order intake
├─ components/                 # tables, forms, KPI cards, charts, label
├─ lib/
│  ├─ supabase/                # server.ts, browser.ts, admin.ts clients
│  ├─ channels/                # normalizeOrder.ts + per-channel adapters
│  ├─ orders/                  # lifecycle.ts (transition guards + inventory effects)
│  ├─ labels/                  # label component, pdf.ts, qr.ts
│  └─ analytics/               # metric queries for the dashboard
├─ supabase/
│  └─ migrations/              # SQL migrations
├─ docs/                       # this second brain
└─ ...config (next, tailwind, tsconfig, eslint)
```

## Conventions

- **TypeScript everywhere**, strict mode. Shared types for DB rows generated from Supabase.
- **Server components by default**; client components only for forms, charts, interactivity.
- **All writes go through `lib/`** business-logic functions (never ad-hoc DB writes in UI), so guards/audit are consistent.
- **One normalized `orders` shape**; every channel maps into it via `lib/channels/`.
- **Migration-based schema** — never hand-edit the DB; add a migration file.
- **Money** stored as integer paise (or numeric) to avoid float errors; currency = INR.
- **RLS on from day one**; v1 policy = authenticated founder has full access.

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only (intake API, admin tasks)
INTAKE_WEBHOOK_SECRET=            # shared secret the custom website signs requests with
```

Secrets live in Vercel env settings / `.env.local` (gitignored), never committed.

## Data access pattern

- Browser client (anon key) → read/write under RLS for the logged-in user.
- Server client → SSR data fetching for dashboard pages.
- Admin client (service role) → used **only** in the intake API route to insert website orders.

See [02-data-model.md](02-data-model.md) for the schema and [03-channels.md](03-channels.md)
for how the intake API uses the admin client safely.
