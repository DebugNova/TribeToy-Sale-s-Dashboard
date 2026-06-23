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
