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
