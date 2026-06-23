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
