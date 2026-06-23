-- Phase 1 — atomic inventory + audit helpers.
-- Each function adjusts inventory for an order's items AND writes audit rows in a single
-- transaction. They are SECURITY DEFINER so they can write audit_logs regardless of the
-- caller's RLS; search_path is pinned (non-mutable) per the advisor guidance.
-- Inventory math is centralised here so the lifecycle (lib/orders/lifecycle.ts) never does
-- ad-hoc stock writes. See docs/04-order-lifecycle.md.

-- Reserve stock for an order's items (reserved += qty). Raises if insufficient available.
create or replace function public.reserve_order_inventory(p_order_id uuid, p_actor uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select oi.product_id, sum(oi.qty) qty
    from order_items oi where oi.order_id = p_order_id and oi.product_id is not null
    group by oi.product_id
  loop
    update inventory
       set reserved = reserved + r.qty
     where product_id = r.product_id
       and (on_hand - reserved) >= r.qty;
    if not found then
      raise exception 'INSUFFICIENT_STOCK for product %', r.product_id;
    end if;
    insert into audit_logs(actor_id, action, entity, entity_id, after)
    values (p_actor, 'inventory.reserve', 'inventory', r.product_id,
            jsonb_build_object('order_id', p_order_id, 'qty', r.qty));
  end loop;
end; $$;

-- Release a reservation (e.g. on cancel before dispatch): reserved -= qty.
create or replace function public.release_order_inventory(p_order_id uuid, p_actor uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select oi.product_id, sum(oi.qty) qty
    from order_items oi where oi.order_id = p_order_id and oi.product_id is not null
    group by oi.product_id
  loop
    update inventory set reserved = greatest(reserved - r.qty, 0)
     where product_id = r.product_id;
    insert into audit_logs(actor_id, action, entity, entity_id, after)
    values (p_actor, 'inventory.release', 'inventory', r.product_id,
            jsonb_build_object('order_id', p_order_id, 'qty', r.qty));
  end loop;
end; $$;

-- Ship: stock leaves the building (on_hand -= qty, reserved -= qty).
create or replace function public.dispatch_order_inventory(p_order_id uuid, p_actor uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select oi.product_id, sum(oi.qty) qty
    from order_items oi where oi.order_id = p_order_id and oi.product_id is not null
    group by oi.product_id
  loop
    update inventory
       set on_hand = on_hand - r.qty, reserved = greatest(reserved - r.qty, 0)
     where product_id = r.product_id;
    insert into audit_logs(actor_id, action, entity, entity_id, after)
    values (p_actor, 'inventory.dispatch', 'inventory', r.product_id,
            jsonb_build_object('order_id', p_order_id, 'qty', r.qty));
  end loop;
end; $$;

-- Return (post-dispatch): goods come back. Restockable → on_hand += qty; else damaged += qty.
-- The caller decides restock vs damaged (asked as a reason in the UI).
create or replace function public.return_order_inventory(p_order_id uuid, p_actor uuid, p_restock boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select oi.product_id, sum(oi.qty) qty
    from order_items oi where oi.order_id = p_order_id and oi.product_id is not null
    group by oi.product_id
  loop
    if p_restock then
      update inventory set on_hand = on_hand + r.qty where product_id = r.product_id;
    else
      update inventory set damaged = damaged + r.qty where product_id = r.product_id;
    end if;
    insert into audit_logs(actor_id, action, entity, entity_id, after)
    values (p_actor, 'inventory.return', 'inventory', r.product_id,
            jsonb_build_object('order_id', p_order_id, 'qty', r.qty, 'restock', p_restock));
  end loop;
end; $$;

-- These RPCs are invoked by the authenticated server client (the founder's session), never
-- by anon. Lock execution to authenticated to match the privilege hygiene in 0005.
revoke execute on function public.reserve_order_inventory(uuid, uuid)         from anon, public;
revoke execute on function public.release_order_inventory(uuid, uuid)         from anon, public;
revoke execute on function public.dispatch_order_inventory(uuid, uuid)        from anon, public;
revoke execute on function public.return_order_inventory(uuid, uuid, boolean) from anon, public;
grant  execute on function public.reserve_order_inventory(uuid, uuid)         to authenticated;
grant  execute on function public.release_order_inventory(uuid, uuid)         to authenticated;
grant  execute on function public.dispatch_order_inventory(uuid, uuid)        to authenticated;
grant  execute on function public.return_order_inventory(uuid, uuid, boolean) to authenticated;
