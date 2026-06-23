# Phase 0 — Scaffold & Database Foundation

> **Goal:** Stand up the Next.js app, create the Supabase project, apply the **complete
> database schema** (all tables, enums, indexes, RLS, triggers, storage), wire founder
> login, build the base layout/nav, and deploy a skeleton to Vercel.
>
> After this phase you have an empty-but-real app a founder can log into, with the full DB
> ready for Phase 1 to write data.

**Depends on:** nothing. **Unlocks:** all other phases.

---

## 0.1 Scope

**In scope:** project setup, dependencies, Supabase project + schema migration, auth
(email/password), protected dashboard shell + nav, settings row seed, Vercel deploy.

**NOT in scope:** any business screens (products/orders/etc.) — that's Phase 1. No data
entry yet beyond seeding the single `settings` row and (optionally) one founder user.

---

## 0.2 Prerequisites / accounts

- Node.js 18+ and npm installed.
- A **Supabase** account + a project (create via the Supabase MCP `create_project`, or the
  dashboard). Note the **Project URL**, **anon key**, **service-role key**.
- A **Vercel** account (for deploy) — optional until the end of the phase.

---

## 0.3 Dependencies to install

```bash
# scaffold (run once, in the parent folder)
npx create-next-app@latest tribetoy-dashboard \
  --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*"

cd tribetoy-dashboard

# Supabase + helpers
npm install @supabase/supabase-js @supabase/ssr
npm install zod

# (used in later phases, safe to install now)
npm install recharts @react-pdf/renderer qrcode
npm install -D @types/qrcode
```

> Note: this project lives at the repo root `TribeToy Dashboard/`. Either scaffold into a
> subfolder `tribetoy-dashboard/` or initialize Next.js in place — keep `docs/` and
> `CLAUDE.md` at the repo root. Decide and stay consistent.

---

## 0.4 Environment variables

Create `.env.local` (gitignored) and add the same keys to Vercel project settings:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server-only, NEVER exposed to client
INTAKE_WEBHOOK_SECRET=<random long string>     # used in Phase 4
```

---

## 0.5 BACKEND — Supabase

Apply the migration below via the Supabase MCP `apply_migration` (name:
`0001_init_schema`) **and** save it as `supabase/migrations/0001_init_schema.sql`. Before
applying, run `list_tables` to confirm a clean schema. After applying, run `get_advisors`
(security + performance) and address warnings.

### 0.5.1 Migration `0001_init_schema.sql` — enums, tables, indexes

```sql
-- ============== EXTENSIONS ==============
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ============== ENUMS ==============
create type user_role        as enum ('admin','ops','warehouse','sales','finance');
create type customer_type     as enum ('b2c','b2b');
create type order_channel     as enum ('website','amazon','instagram','whatsapp','phone','manual','b2b');
create type order_status      as enum (
  'created','validated','payment_confirmed','cod_approved','reserved','packed',
  'label_generated','dispatched','in_transit','delivered','returned','refunded','cancelled');
create type payment_type      as enum ('prepaid','cod','pending');
create type payment_status    as enum ('unpaid','paid','partially_paid','refunded');
create type courier_type      as enum ('speedpost','delhivery','other');
create type fulfillment_state as enum ('pending','packed','shipped','delivered','returned','cancelled');

-- ============== PROFILES (mirror of auth.users) ==============
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  role       user_role not null default 'admin',
  status     text not null default 'active',
  created_at timestamptz not null default now()
);

-- ============== CUSTOMERS ==============
create table public.customers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  phone        text,
  email        text,
  type         customer_type not null default 'b2c',
  gstin        text,
  address_line text,
  city         text,
  state        text,
  pincode      text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index customers_phone_idx on public.customers (phone);
create index customers_name_idx  on public.customers (name);

-- ============== PRODUCTS ==============
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  sku         text not null unique,
  name        text not null,
  category    text,
  description text,
  length_cm   numeric(8,2),
  width_cm    numeric(8,2),
  height_cm   numeric(8,2),
  weight_g    numeric(10,2),
  tax_rate    numeric(5,2) not null default 0,    -- GST %
  price       numeric(12,2) not null default 0,    -- selling price INR
  cost        numeric(12,2) not null default 0,    -- for margin
  image_url   text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index products_category_idx on public.products (category);
create index products_active_idx    on public.products (active);

-- ============== INVENTORY (one row per product in v1) ==============
create table public.inventory (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null unique references public.products(id) on delete cascade,
  on_hand             integer not null default 0,
  reserved            integer not null default 0,
  damaged             integer not null default 0,
  low_stock_threshold integer not null default 5,
  location            text,
  updated_at          timestamptz not null default now(),
  constraint inventory_nonneg check (on_hand >= 0 and reserved >= 0 and damaged >= 0)
);

-- available = on_hand - reserved
create view public.inventory_available as
  select i.*, (i.on_hand - i.reserved) as available
  from public.inventory i;

-- ============== ORDERS ==============
create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  order_no        text not null unique,
  channel         order_channel not null,
  source_order_id text,                                   -- external ref; null for manual
  customer_id     uuid references public.customers(id) on delete set null,
  -- ship-to snapshot at order time
  ship_name       text,
  ship_phone      text,
  ship_address    text,
  ship_city       text,
  ship_state      text,
  ship_pincode    text,
  status          order_status not null default 'created',
  payment_type    payment_type not null default 'pending',
  payment_status  payment_status not null default 'unpaid',
  subtotal        numeric(12,2) not null default 0,
  discount        numeric(12,2) not null default 0,
  tax             numeric(12,2) not null default 0,
  shipping_charge numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  currency        text not null default 'INR',
  notes           text,
  source_payload  jsonb,                                  -- raw original input
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- dedupe / idempotency: same external id can't be imported twice per channel
  constraint orders_channel_source_uniq unique (channel, source_order_id)
);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_channel_idx    on public.orders (channel);
create index orders_status_idx     on public.orders (status);
create index orders_customer_idx   on public.orders (customer_id);

-- ============== ORDER ITEMS ==============
create table public.order_items (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders(id) on delete cascade,
  product_id         uuid references public.products(id) on delete set null,
  sku                text,     -- snapshot
  name               text,     -- snapshot
  qty                integer not null check (qty > 0),
  unit_price         numeric(12,2) not null default 0,
  discount           numeric(12,2) not null default 0,
  tax                numeric(12,2) not null default 0,
  line_total         numeric(12,2) not null default 0,
  fulfillment_status fulfillment_state not null default 'pending'
);
create index order_items_order_idx   on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

-- ============== SHIPMENTS ==============
create table public.shipments (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  courier         courier_type not null default 'speedpost',
  awb             text,
  label_template  text not null default 'speedpost_a4',
  label_pdf_url   text,
  dispatch_date   date,
  tracking_status text,
  pickup_info     jsonb,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index shipments_order_idx on public.shipments (order_id);
create index shipments_awb_idx   on public.shipments (awb);

-- ============== PAYMENTS ==============
create table public.payments (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  method         text,
  amount         numeric(12,2) not null default 0,
  status         payment_status not null default 'unpaid',
  txn_ref        text,
  settlement_ref text,
  refund_amount  numeric(12,2) not null default 0,
  created_at     timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);

-- ============== AUDIT LOGS ==============
create table public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text not null,           -- e.g. 'order.status_change'
  entity     text not null,           -- 'order' | 'inventory' | ...
  entity_id  uuid,
  before     jsonb,
  after      jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx     on public.audit_logs (entity, entity_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- ============== SETTINGS (single row) ==============
create table public.settings (
  id              integer primary key default 1,
  sender_name     text not null default 'TribeToy Pvt Ltd',
  sender_address  text not null default 'TIC, IIT Guwahati',
  sender_city     text not null default 'Guwahati',
  sender_state    text not null default 'Assam',
  sender_pincode  text not null default '781039',
  sender_phone    text not null default '8003790347',
  default_courier courier_type not null default 'speedpost',
  updated_at      timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);
insert into public.settings (id) values (1) on conflict (id) do nothing;
```

### 0.5.2 Migration `0002_functions_triggers.sql` — order_no, updated_at, new-user

```sql
-- ---- updated_at auto-touch ----
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_customers_updated  before update on public.customers
  for each row execute function public.set_updated_at();
create trigger trg_products_updated   before update on public.products
  for each row execute function public.set_updated_at();
create trigger trg_inventory_updated  before update on public.inventory
  for each row execute function public.set_updated_at();
create trigger trg_orders_updated     before update on public.orders
  for each row execute function public.set_updated_at();
create trigger trg_settings_updated   before update on public.settings
  for each row execute function public.set_updated_at();

-- ---- order_no generator: TT-<YYYY>-#### ----
create sequence if not exists public.order_no_seq;

create or replace function public.set_order_no()
returns trigger language plpgsql as $$
begin
  if new.order_no is null or new.order_no = '' then
    new.order_no := 'TT-' || to_char(now() at time zone 'Asia/Kolkata','YYYY')
                    || '-' || lpad(nextval('public.order_no_seq')::text, 4, '0');
  end if;
  return new;
end; $$;

create trigger trg_orders_set_no before insert on public.orders
  for each row execute function public.set_order_no();
-- NOTE: sequence is global (does not reset per year). Confirm desired behavior (open Q #2).

-- ---- create a profile automatically when an auth user signs up ----
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'admin')
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 0.5.3 Migration `0003_rls.sql` — Row Level Security (v1: founders = full access)

```sql
-- Enable RLS on every public table
alter table public.profiles    enable row level security;
alter table public.customers   enable row level security;
alter table public.products    enable row level security;
alter table public.inventory   enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.shipments   enable row level security;
alter table public.payments    enable row level security;
alter table public.audit_logs  enable row level security;
alter table public.settings    enable row level security;

-- v1 policy: any authenticated user (founder) can do everything.
-- (Role-scoped policies are a Phase 5 concern.)
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','customers','products','inventory','orders',
    'order_items','shipments','payments','audit_logs','settings'
  ] loop
    execute format(
      'create policy %I_auth_all on public.%I for all to authenticated using (true) with check (true);',
      t, t);
  end loop;
end $$;
```

> The **service-role** key bypasses RLS and is used only server-side (Phase 4 intake).
> The `inventory_available` view inherits access from its base table.

### 0.5.4 Storage bucket (for label PDFs — created now, used in Phase 2)

Create a **private** bucket named `labels` (via MCP/dashboard or SQL below), and a policy
so authenticated users can read/write it:

```sql
insert into storage.buckets (id, name, public)
values ('labels','labels', false) on conflict (id) do nothing;

create policy "labels auth read"  on storage.objects for select to authenticated
  using (bucket_id = 'labels');
create policy "labels auth write" on storage.objects for insert to authenticated
  with check (bucket_id = 'labels');
create policy "labels auth update" on storage.objects for update to authenticated
  using (bucket_id = 'labels');
```

### 0.5.5 Generate TypeScript types

After migrations, generate types via MCP `generate_typescript_types` and save to
`lib/supabase/database.types.ts`. Re-generate whenever the schema changes.

---

## 0.6 FRONTEND — app scaffold

### 0.6.1 Supabase clients (`lib/supabase/`)
Using `@supabase/ssr`:
- `browser.ts` — `createBrowserClient(URL, ANON)` for client components.
- `server.ts` — `createServerClient(...)` reading cookies (for SSR pages + server actions).
- `admin.ts` — `createClient(URL, SERVICE_ROLE, { auth: { persistSession:false }})`,
  **server-only** (guard with a check that it's never imported client-side).

### 0.6.2 Middleware
`middleware.ts` — refresh the Supabase session and **redirect unauthenticated users to
`/login`** for any `(dashboard)` route.

### 0.6.3 Auth
- `app/(auth)/login/page.tsx` — email/password sign-in form using the browser client
  (`signInWithPassword`). On success redirect to `/`.
- A sign-out action in the nav.
- Founder account: create the first user via Supabase dashboard/MCP (or a one-time sign-up
  page you remove later). The `handle_new_user` trigger makes their `profiles` row.

### 0.6.4 Layout & nav
- `app/(dashboard)/layout.tsx` — protected shell: sidebar nav with links to **Dashboard,
  Orders, Products, Customers, Inventory, Shipments, Settings**, a header with the user's
  name + sign-out. Use Tailwind. Most links route to placeholder pages this phase.
- `app/(dashboard)/page.tsx` — placeholder "Dashboard coming in Phase 3".
- Placeholder pages for each nav item (empty states) so navigation works.

### 0.6.5 Settings page (minimal)
`app/(dashboard)/settings/page.tsx` — read + edit the single `settings` row (sender
address/phone, default courier) via a server action. This feeds the label FROM block.

---

## 0.7 Step-by-step checklist

1. Scaffold Next.js app (0.3), commit.
2. Create Supabase project; copy URL + keys into `.env.local`.
3. Apply migrations `0001`, `0002`, `0003` (MCP `apply_migration` + save files). Run
   `list_tables` and `get_advisors`; fix warnings.
4. Create the `labels` storage bucket + policies (0.5.4).
5. Generate DB types → `lib/supabase/database.types.ts` (0.5.5).
6. Add Supabase clients (0.6.1) + middleware (0.6.2).
7. Build login page + sign-out (0.6.3); create the first founder user.
8. Build dashboard layout + nav + placeholder pages (0.6.4).
9. Build minimal Settings page (0.6.5).
10. `npm run build` + `npm run lint`; fix issues.
11. Deploy to Vercel; add env vars there; verify login works on the deployed URL.

---

## 0.8 Acceptance criteria

- [ ] All 10 tables + `inventory_available` view exist (`list_tables` confirms).
- [ ] Enums, indexes, triggers, and RLS policies are present; `get_advisors` is clean.
- [ ] `settings` has exactly one row (id=1) with the TribeToy sender defaults.
- [ ] A founder can log in; unauthenticated users are redirected to `/login`.
- [ ] Nav renders and routes to placeholder pages; Settings can edit the sender block.
- [ ] App builds, lints, and is deployed to Vercel with login working.

---

## 0.9 Verification

- **DB:** MCP `list_tables` (schema), `execute_sql` `select * from public.settings;` (one row),
  `get_advisors` (no critical security/perf issues).
- **order_no:** `insert into orders(channel) values ('manual') returning order_no;` →
  returns `TT-2026-0001` (then delete the test row). Confirms the trigger.
- **Auth:** open the deployed URL logged-out → redirected to `/login`; sign in → reach `/`.
- **Types:** `lib/supabase/database.types.ts` exists and compiles.
- **Run:** `npm run dev`, click every nav item; edit + save Settings, reload, value persists.
