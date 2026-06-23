-- Phase 5 — Real role-based access control.
-- Replaces the v1 "authenticated = full access" policies with role-scoped policies
-- driven by profiles.role (enum user_role: admin | ops | warehouse | sales | finance).
--
-- Role matrix (RW = full read/write via FOR ALL; R = SELECT only; INS = INSERT only):
--   table          admin  ops    warehouse  sales  finance
--   customers      RW     R      R          RW     R
--   products       RW     R      R          R      R
--   inventory      RW     RW     RW         R      R
--   orders         RW     RW     R          RW     R
--   order_items    RW     RW     R          RW     R
--   shipments      RW     RW     RW         R      R
--   payments       RW     R      R          R      RW
--   settings       RW     R      R          R      R
--   profiles       RW     R      R          R      R
--   audit_logs     RW     INS    INS        INS    INS   (write-only logging; viewer is admin-only)
--   intake_events  RW     R      -          R      -
--
-- Policies are PERMISSIVE, so multiple policies on a table combine with OR.
-- current_role() is wrapped in a scalar subselect in every policy so Postgres
-- evaluates it once per query (initplan) instead of once per row.

-- ---------------------------------------------------------------------------
-- Helper: the caller's app role. SECURITY DEFINER so it can read profiles
-- regardless of the (about-to-change) RLS on profiles.
-- ---------------------------------------------------------------------------
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_role() from public;
grant execute on function public.current_role() to authenticated;

comment on function public.current_role() is
  'Returns the calling user''s app role (profiles.role); used by role-scoped RLS policies.';

-- ---------------------------------------------------------------------------
-- Drop the v1 blanket policies.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','customers','products','inventory','orders',
    'order_items','shipments','payments','audit_logs','settings'
  ] loop
    execute format('drop policy if exists %I_auth_all on public.%I;', t, t);
  end loop;
end $$;

drop policy if exists intake_events_auth_read on public.intake_events;

-- ---------------------------------------------------------------------------
-- customers — admin RW, sales RW, others read.
-- ---------------------------------------------------------------------------
create policy customers_admin_all on public.customers for all to authenticated
  using ((select public.current_role()) = 'admin')
  with check ((select public.current_role()) = 'admin');
create policy customers_sales_write on public.customers for all to authenticated
  using ((select public.current_role()) = 'sales')
  with check ((select public.current_role()) = 'sales');
create policy customers_read on public.customers for select to authenticated
  using ((select public.current_role()) in ('ops','warehouse','finance'));

-- ---------------------------------------------------------------------------
-- products — admin RW, everyone else read.
-- ---------------------------------------------------------------------------
create policy products_admin_all on public.products for all to authenticated
  using ((select public.current_role()) = 'admin')
  with check ((select public.current_role()) = 'admin');
create policy products_read on public.products for select to authenticated
  using ((select public.current_role()) in ('ops','warehouse','sales','finance'));

-- ---------------------------------------------------------------------------
-- inventory — admin RW, ops + warehouse RW, sales + finance read.
-- ---------------------------------------------------------------------------
create policy inventory_admin_all on public.inventory for all to authenticated
  using ((select public.current_role()) = 'admin')
  with check ((select public.current_role()) = 'admin');
create policy inventory_ops_write on public.inventory for all to authenticated
  using ((select public.current_role()) in ('ops','warehouse'))
  with check ((select public.current_role()) in ('ops','warehouse'));
create policy inventory_read on public.inventory for select to authenticated
  using ((select public.current_role()) in ('sales','finance'));

-- ---------------------------------------------------------------------------
-- orders — admin RW, ops + sales RW, warehouse + finance read.
-- ---------------------------------------------------------------------------
create policy orders_admin_all on public.orders for all to authenticated
  using ((select public.current_role()) = 'admin')
  with check ((select public.current_role()) = 'admin');
create policy orders_ops_write on public.orders for all to authenticated
  using ((select public.current_role()) in ('ops','sales'))
  with check ((select public.current_role()) in ('ops','sales'));
create policy orders_read on public.orders for select to authenticated
  using ((select public.current_role()) in ('warehouse','finance'));

-- ---------------------------------------------------------------------------
-- order_items — mirrors orders.
-- ---------------------------------------------------------------------------
create policy order_items_admin_all on public.order_items for all to authenticated
  using ((select public.current_role()) = 'admin')
  with check ((select public.current_role()) = 'admin');
create policy order_items_ops_write on public.order_items for all to authenticated
  using ((select public.current_role()) in ('ops','sales'))
  with check ((select public.current_role()) in ('ops','sales'));
create policy order_items_read on public.order_items for select to authenticated
  using ((select public.current_role()) in ('warehouse','finance'));

-- ---------------------------------------------------------------------------
-- shipments — admin RW, ops + warehouse RW, sales + finance read.
-- ---------------------------------------------------------------------------
create policy shipments_admin_all on public.shipments for all to authenticated
  using ((select public.current_role()) = 'admin')
  with check ((select public.current_role()) = 'admin');
create policy shipments_ops_write on public.shipments for all to authenticated
  using ((select public.current_role()) in ('ops','warehouse'))
  with check ((select public.current_role()) in ('ops','warehouse'));
create policy shipments_read on public.shipments for select to authenticated
  using ((select public.current_role()) in ('sales','finance'));

-- ---------------------------------------------------------------------------
-- payments — admin RW, finance RW, others read.
-- ---------------------------------------------------------------------------
create policy payments_admin_all on public.payments for all to authenticated
  using ((select public.current_role()) = 'admin')
  with check ((select public.current_role()) = 'admin');
create policy payments_finance_write on public.payments for all to authenticated
  using ((select public.current_role()) = 'finance')
  with check ((select public.current_role()) = 'finance');
create policy payments_read on public.payments for select to authenticated
  using ((select public.current_role()) in ('ops','warehouse','sales'));

-- ---------------------------------------------------------------------------
-- settings — admin RW, everyone else read.
-- ---------------------------------------------------------------------------
create policy settings_admin_all on public.settings for all to authenticated
  using ((select public.current_role()) = 'admin')
  with check ((select public.current_role()) = 'admin');
create policy settings_read on public.settings for select to authenticated
  using ((select public.current_role()) in ('ops','warehouse','sales','finance'));

-- ---------------------------------------------------------------------------
-- profiles — admin RW; everyone else may read (names/roles for joins), no writes.
-- ---------------------------------------------------------------------------
create policy profiles_admin_all on public.profiles for all to authenticated
  using ((select public.current_role()) = 'admin')
  with check ((select public.current_role()) = 'admin');
create policy profiles_read on public.profiles for select to authenticated
  using ((select public.current_role()) in ('ops','warehouse','sales','finance'));

-- ---------------------------------------------------------------------------
-- audit_logs — admin reads/manages; every other role may INSERT only, so their
-- own writes can be logged by lib/ functions, but the trail is admin-readable only.
-- ---------------------------------------------------------------------------
create policy audit_logs_admin_all on public.audit_logs for all to authenticated
  using ((select public.current_role()) = 'admin')
  with check ((select public.current_role()) = 'admin');
create policy audit_logs_insert on public.audit_logs for insert to authenticated
  with check ((select public.current_role()) in ('ops','warehouse','sales','finance'));

-- ---------------------------------------------------------------------------
-- intake_events — admin RW; ops + sales read (order-intake observability).
-- (Inserts happen via the service-role client in the intake API, bypassing RLS.)
-- ---------------------------------------------------------------------------
create policy intake_events_admin_all on public.intake_events for all to authenticated
  using ((select public.current_role()) = 'admin')
  with check ((select public.current_role()) = 'admin');
create policy intake_events_read on public.intake_events for select to authenticated
  using ((select public.current_role()) in ('ops','sales'));
