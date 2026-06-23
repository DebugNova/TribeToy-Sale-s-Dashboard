-- Fixes for Supabase advisor findings after the initial schema.

-- 1) ERROR: security_definer_view — make the view respect the querying user's RLS.
alter view public.inventory_available set (security_invoker = true);

-- 2) WARN: function_search_path_mutable — pin a non-mutable search_path.
--    Both functions reference only pg_catalog builtins and fully-qualified objects.
alter function public.set_updated_at() set search_path = '';
alter function public.set_order_no()  set search_path = '';

-- 3) WARN: SECURITY DEFINER function exposed via RPC — it only needs to run as the
--    on_auth_user_created trigger, never be called directly through the API.
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- 4) INFO: unindexed foreign keys — add covering indexes.
create index if not exists audit_logs_actor_idx     on public.audit_logs (actor_id);
create index if not exists shipments_created_by_idx  on public.shipments (created_by);
