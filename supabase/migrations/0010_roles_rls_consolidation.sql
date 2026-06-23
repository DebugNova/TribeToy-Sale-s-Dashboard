-- Phase 5 — RLS consolidation + advisor fixes (refines 0009_roles_rls).
--
-- 0009 used a broad admin "FOR ALL" policy alongside narrower per-role policies, which
-- left every table with *multiple permissive policies* per command (a performance advisor
-- WARN — each policy is evaluated for every row). This migration replaces that with exactly
-- ONE policy per (table, command), folding admin into each command's allowed-role list.
-- Same role matrix, fewer policies, no `multiple_permissive_policies` and no
-- `rls_policy_always_true` findings.
--
-- Role matrix (unchanged from 0009):
--   table          read (SELECT)                       write (INSERT/UPDATE/DELETE)
--   customers      all                                 admin, sales
--   products       all                                 admin
--   inventory      all                                 admin, ops, warehouse
--   orders         all                                 admin, ops, sales
--   order_items    all                                 admin, ops, sales
--   shipments      all                                 admin, ops, warehouse
--   payments       all                                 admin, finance
--   settings       all                                 admin
--   profiles       all                                 admin
--   audit_logs     admin                               INSERT: all · UPDATE/DELETE: admin
--   intake_events  admin, ops, sales                   admin
--
-- current_role() is wrapped in a scalar subselect so it is evaluated once per query.

-- ---------------------------------------------------------------------------
-- Advisor fix: Supabase default privileges grant EXECUTE on new public functions
-- directly to anon + authenticated. 0009 only revoked from PUBLIC, leaving the anon
-- grant in place. current_role() must never be callable unauthenticated.
-- ---------------------------------------------------------------------------
revoke all on function public.current_role() from anon, public;
grant execute on function public.current_role() to authenticated;

-- ---------------------------------------------------------------------------
-- Drop every existing policy on the in-scope tables (the 0009 set), so we can
-- recreate a single policy per command.
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles','customers','products','inventory','orders','order_items',
        'shipments','payments','audit_logs','settings','intake_events'
      )
  loop
    execute format('drop policy if exists %I on public.%I;', r.policyname, r.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- customers — read: all; write: admin, sales
-- ---------------------------------------------------------------------------
create policy customers_sel on public.customers for select to authenticated
  using ((select public.current_role()) in ('admin','ops','warehouse','sales','finance'));
create policy customers_ins on public.customers for insert to authenticated
  with check ((select public.current_role()) in ('admin','sales'));
create policy customers_upd on public.customers for update to authenticated
  using ((select public.current_role()) in ('admin','sales'))
  with check ((select public.current_role()) in ('admin','sales'));
create policy customers_del on public.customers for delete to authenticated
  using ((select public.current_role()) in ('admin','sales'));

-- ---------------------------------------------------------------------------
-- products — read: all; write: admin
-- ---------------------------------------------------------------------------
create policy products_sel on public.products for select to authenticated
  using ((select public.current_role()) in ('admin','ops','warehouse','sales','finance'));
create policy products_ins on public.products for insert to authenticated
  with check ((select public.current_role()) = 'admin');
create policy products_upd on public.products for update to authenticated
  using ((select public.current_role()) = 'admin')
  with check ((select public.current_role()) = 'admin');
create policy products_del on public.products for delete to authenticated
  using ((select public.current_role()) = 'admin');

-- ---------------------------------------------------------------------------
-- inventory — read: all; write: admin, ops, warehouse
-- ---------------------------------------------------------------------------
create policy inventory_sel on public.inventory for select to authenticated
  using ((select public.current_role()) in ('admin','ops','warehouse','sales','finance'));
create policy inventory_ins on public.inventory for insert to authenticated
  with check ((select public.current_role()) in ('admin','ops','warehouse'));
create policy inventory_upd on public.inventory for update to authenticated
  using ((select public.current_role()) in ('admin','ops','warehouse'))
  with check ((select public.current_role()) in ('admin','ops','warehouse'));
create policy inventory_del on public.inventory for delete to authenticated
  using ((select public.current_role()) in ('admin','ops','warehouse'));

-- ---------------------------------------------------------------------------
-- orders — read: all; write: admin, ops, sales
-- ---------------------------------------------------------------------------
create policy orders_sel on public.orders for select to authenticated
  using ((select public.current_role()) in ('admin','ops','warehouse','sales','finance'));
create policy orders_ins on public.orders for insert to authenticated
  with check ((select public.current_role()) in ('admin','ops','sales'));
create policy orders_upd on public.orders for update to authenticated
  using ((select public.current_role()) in ('admin','ops','sales'))
  with check ((select public.current_role()) in ('admin','ops','sales'));
create policy orders_del on public.orders for delete to authenticated
  using ((select public.current_role()) in ('admin','ops','sales'));

-- ---------------------------------------------------------------------------
-- order_items — mirrors orders
-- ---------------------------------------------------------------------------
create policy order_items_sel on public.order_items for select to authenticated
  using ((select public.current_role()) in ('admin','ops','warehouse','sales','finance'));
create policy order_items_ins on public.order_items for insert to authenticated
  with check ((select public.current_role()) in ('admin','ops','sales'));
create policy order_items_upd on public.order_items for update to authenticated
  using ((select public.current_role()) in ('admin','ops','sales'))
  with check ((select public.current_role()) in ('admin','ops','sales'));
create policy order_items_del on public.order_items for delete to authenticated
  using ((select public.current_role()) in ('admin','ops','sales'));

-- ---------------------------------------------------------------------------
-- shipments — read: all; write: admin, ops, warehouse
-- ---------------------------------------------------------------------------
create policy shipments_sel on public.shipments for select to authenticated
  using ((select public.current_role()) in ('admin','ops','warehouse','sales','finance'));
create policy shipments_ins on public.shipments for insert to authenticated
  with check ((select public.current_role()) in ('admin','ops','warehouse'));
create policy shipments_upd on public.shipments for update to authenticated
  using ((select public.current_role()) in ('admin','ops','warehouse'))
  with check ((select public.current_role()) in ('admin','ops','warehouse'));
create policy shipments_del on public.shipments for delete to authenticated
  using ((select public.current_role()) in ('admin','ops','warehouse'));

-- ---------------------------------------------------------------------------
-- payments — read: all; write: admin, finance
-- ---------------------------------------------------------------------------
create policy payments_sel on public.payments for select to authenticated
  using ((select public.current_role()) in ('admin','ops','warehouse','sales','finance'));
create policy payments_ins on public.payments for insert to authenticated
  with check ((select public.current_role()) in ('admin','finance'));
create policy payments_upd on public.payments for update to authenticated
  using ((select public.current_role()) in ('admin','finance'))
  with check ((select public.current_role()) in ('admin','finance'));
create policy payments_del on public.payments for delete to authenticated
  using ((select public.current_role()) in ('admin','finance'));

-- ---------------------------------------------------------------------------
-- settings — read: all; write: admin
-- ---------------------------------------------------------------------------
create policy settings_sel on public.settings for select to authenticated
  using ((select public.current_role()) in ('admin','ops','warehouse','sales','finance'));
create policy settings_ins on public.settings for insert to authenticated
  with check ((select public.current_role()) = 'admin');
create policy settings_upd on public.settings for update to authenticated
  using ((select public.current_role()) = 'admin')
  with check ((select public.current_role()) = 'admin');
create policy settings_del on public.settings for delete to authenticated
  using ((select public.current_role()) = 'admin');

-- ---------------------------------------------------------------------------
-- profiles — read: all (names/roles for joins); write: admin
-- ---------------------------------------------------------------------------
create policy profiles_sel on public.profiles for select to authenticated
  using ((select public.current_role()) in ('admin','ops','warehouse','sales','finance'));
create policy profiles_ins on public.profiles for insert to authenticated
  with check ((select public.current_role()) = 'admin');
create policy profiles_upd on public.profiles for update to authenticated
  using ((select public.current_role()) = 'admin')
  with check ((select public.current_role()) = 'admin');
create policy profiles_del on public.profiles for delete to authenticated
  using ((select public.current_role()) = 'admin');

-- ---------------------------------------------------------------------------
-- audit_logs — admin reads/manages; every role may INSERT (so lib/ can log their
-- writes), but the trail is admin-readable only.
-- ---------------------------------------------------------------------------
create policy audit_logs_sel on public.audit_logs for select to authenticated
  using ((select public.current_role()) = 'admin');
create policy audit_logs_ins on public.audit_logs for insert to authenticated
  with check ((select public.current_role()) in ('admin','ops','warehouse','sales','finance'));
create policy audit_logs_upd on public.audit_logs for update to authenticated
  using ((select public.current_role()) = 'admin')
  with check ((select public.current_role()) = 'admin');
create policy audit_logs_del on public.audit_logs for delete to authenticated
  using ((select public.current_role()) = 'admin');

-- ---------------------------------------------------------------------------
-- intake_events — admin manages; ops + sales read. Inserts come from the
-- service-role client in the intake API, which bypasses RLS.
-- ---------------------------------------------------------------------------
create policy intake_events_sel on public.intake_events for select to authenticated
  using ((select public.current_role()) in ('admin','ops','sales'));
create policy intake_events_ins on public.intake_events for insert to authenticated
  with check ((select public.current_role()) = 'admin');
create policy intake_events_upd on public.intake_events for update to authenticated
  using ((select public.current_role()) = 'admin')
  with check ((select public.current_role()) = 'admin');
create policy intake_events_del on public.intake_events for delete to authenticated
  using ((select public.current_role()) = 'admin');
