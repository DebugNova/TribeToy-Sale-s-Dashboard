# Phase 1 — Core Operations (Products, Customers, Orders, Inventory, Lifecycle)

> **Goal:** The operational heart. Manage products + inventory, manage customers, create
> orders manually for any channel (incl. Amazon), and move orders through their lifecycle
> with **server-side guards** and **inventory reservation**. This is the data that every
> later phase (labels, dashboard) reads.

**Depends on:** Phase 0 (schema + auth + nav). **Unlocks:** Phases 2, 3, 4.

---

## 1.1 Scope

**In scope:**
- Products CRUD (+ the linked inventory row).
- Customers CRUD.
- Inventory list + manual stock adjustment (with reason → audit log).
- Manual order creation form (channel selector incl. Amazon/IG/WhatsApp/phone/B2B).
- Order list (search/filter) + order detail.
- Order lifecycle actions with guards + inventory side-effects + audit logging.

**NOT in scope:** label PDF (Phase 2), dashboard charts (Phase 3), website intake API
(Phase 4), role enforcement (Phase 5).

---

## 1.2 Prerequisites
Phase 0 complete: schema applied, auth works, nav + Supabase clients exist, types generated.
No new npm packages required (zod already installed).

---

## 1.3 BACKEND — Supabase

No new tables. This phase adds **business-logic functions** (in `lib/`) and may add **two
helper RPCs** for atomic inventory math. All DB writes go through `lib/`, never ad-hoc.

### 1.3.1 Migration `0004_inventory_rpcs.sql` — atomic inventory + audit helpers

```sql
-- Atomically adjust reserved/on_hand and write an audit row, all in one transaction.

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
```

> Apply via MCP `apply_migration` (name `0004_inventory_rpcs`) and save the file. These run
> with the caller's auth via the server client; `security definer` lets them write audit rows.

### 1.3.2 Inventory on product create
When a product is created, also create its `inventory` row (on_hand 0). Do this in the
product server action (or a DB trigger). Recommended: do it in `lib/products` so the
threshold can be set at creation.

---

## 1.4 BACKEND — business logic (`lib/`)

### 1.4.1 `lib/channels/normalizeOrder.ts`
The single funnel all order sources use. Exports:
```ts
type NormalizedItem   = { product_id?: string; sku?: string; name?: string;
                          qty: number; unit_price: number; discount?: number; tax?: number };
type NormalizedOrder  = {
  channel: OrderChannel;
  source_order_id?: string;
  customer: { id?: string; name: string; phone?: string; email?: string;
              address_line?: string; city?: string; state?: string; pincode?: string };
  items: NormalizedItem[];
  payment_type: PaymentType; payment_status?: PaymentStatus;
  shipping_charge?: number; discount?: number; notes?: string;
  source_payload?: unknown;
};
async function createOrder(input: NormalizedOrder, actorId: string): Promise<{order_id, order_no}>
```
`createOrder` responsibilities (server-side, in a transaction where possible):
1. Validate with **zod**.
2. Upsert/find customer (match on phone or email; else create). Snapshot ship-to onto order.
3. Compute line totals + order totals (`subtotal`, `tax`, `discount`, `shipping`, `total`).
4. Insert `orders` (status `created`) + `order_items`; store `source_payload`.
5. Write `audit_logs` (`order.create`).
   (Inventory is reserved later, at the `reserved` transition — see lifecycle.)
On a duplicate `(channel, source_order_id)` unique violation → return existing order, mark
`duplicate` (important for Phase 4 reuse).

### 1.4.2 `lib/orders/lifecycle.ts`
Implements [../04-order-lifecycle.md](../04-order-lifecycle.md). Exports one guarded
transition function + thin wrappers:
```ts
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = { /* the transition map */ };

async function transition(orderId: string, to: OrderStatus, actorId: string): Promise<void>
// validates current→to is allowed, runs side-effects, updates status, writes audit.

// convenience wrappers used by UI buttons:
validateOrder, confirmPayment, approveCod, reserveOrder, markPacked,
markLabelGenerated, dispatchOrder, markInTransit, markDelivered,
cancelOrder, markReturned, refundOrder
```
Side-effects per transition (call the RPCs from 1.3.1):
- `→ reserved` → `reserve_order_inventory` (must be `payment_confirmed`/`cod_approved` first).
- `→ packed` → guard: must be `reserved`.
- `→ dispatched` → `dispatch_order_inventory` (guard: needs a shipment row from Phase 2; in
  Phase 1 allow dispatch without label but still decrement stock).
- `→ cancelled` while reserved/pre-dispatch → `release_order_inventory`.
- `→ returned` post-dispatch → restock (`on_hand += qty`) or `damaged += qty` (ask reason).
Every transition writes `audit_logs` (`order.status_change`, before/after status).

### 1.4.3 `lib/products`, `lib/customers`, `lib/inventory`
Thin server-action modules wrapping CRUD + validation + audit:
- products: create (also creates inventory row), update, deactivate.
- customers: create, update.
- inventory: `adjustStock(productId, field, delta, reason, actorId)` → updates on_hand/
  damaged/threshold and writes `audit_logs` (`inventory.adjust`, includes reason).

---

## 1.5 FRONTEND — pages & components

### Products — `app/(dashboard)/products/`
- `page.tsx` — table (SKU, name, category, price, available stock, active). Search + filter.
- `new/page.tsx` + `[id]/page.tsx` — create/edit form (all product fields + initial stock +
  low-stock threshold). Uses server actions from `lib/products`.

### Customers — `app/(dashboard)/customers/`
- `page.tsx` — table (name, phone, type, city). Search.
- `new` + `[id]` — create/edit form. Type b2c/b2b, address, GSTIN (B2B).

### Inventory — `app/(dashboard)/inventory/`
- `page.tsx` — table from `inventory_available` (product, on_hand, reserved, available,
  damaged, threshold; highlight rows where available ≤ threshold).
- Adjust-stock modal → `inventory.adjustStock` with a **reason** (required).

### Orders — `app/(dashboard)/orders/`
- `page.tsx` — order list: order_no, date, channel, customer, total, status badge.
  Filters: status, channel, date range, search (order_no/customer/phone/SKU).
- `new/page.tsx` — **manual order form**:
  - Channel dropdown (manual/amazon/instagram/whatsapp/phone/b2b).
  - Customer: pick existing (search) or enter new.
  - Items: add product rows (search by SKU/name), qty, unit price (defaults from product).
  - Payment type + status; shipping charge, discount, notes; live total.
  - Submit → `normalizeOrder.createOrder`.
- `[id]/page.tsx` — order detail:
  - Header (order_no, channel, status, timestamps), customer + ship-to, items, totals.
  - **Lifecycle action buttons** (only the legal next transitions enabled) → `lib/orders`.
  - Activity/audit list for this order (read `audit_logs` where entity_id = order).

### Components
Reusable `DataTable`, `StatusBadge`, `OrderItemsEditor`, `CustomerPicker`, `ProductPicker`,
form fields. Keep consistent Tailwind styling with Phase 0's shell.

---

## 1.6 Step-by-step checklist
1. Apply migration `0004_inventory_rpcs` (1.3.1); re-gen types.
2. Build `lib/products`, `lib/customers`, `lib/inventory` server actions.
3. Build Products screens (+ inventory row on create).
4. Build Customers screens.
5. Build Inventory screen + adjust-stock (with reason).
6. Build `lib/channels/normalizeOrder.ts` (`createOrder`).
7. Build `lib/orders/lifecycle.ts` (transition map + wrappers + side-effects).
8. Build Orders list, manual order form, order detail + lifecycle buttons + audit view.
9. `npm run build` + `lint`; manual end-to-end test (1.8).

---

## 1.7 Acceptance criteria
- [ ] Create a product → an `inventory` row appears; stock adjustments require a reason and
      write an audit log.
- [ ] Create a customer; reuse them on an order (no duplicate customer).
- [ ] Create a manual order (any channel) → it appears in the list with a generated `order_no`.
- [ ] Walking the order to **reserved** increments `inventory.reserved`; **dispatched**
      decrements `on_hand`; **cancel** (while reserved) releases the hold.
- [ ] Illegal transitions are **blocked** (e.g. packed before reserved; reserve without
      payment cleared; reserve with insufficient stock).
- [ ] Each status change + inventory change appears in `audit_logs`.

---

## 1.8 Verification
- **UI flow:** create product (stock 10) → create customer → create manual order (qty 3) →
  validate → confirm payment → reserve (reserved becomes 3, available 7) → packed →
  dispatched (on_hand 7, reserved 0). Confirm via Inventory screen.
- **Guards:** try to mark packed directly from created → blocked; try to reserve more than
  available → blocked with INSUFFICIENT_STOCK.
- **DB checks (MCP `execute_sql`):**
  `select status from orders where order_no='...';`
  `select on_hand, reserved from inventory where product_id='...';`
  `select action, before, after from audit_logs order by created_at desc limit 10;`
- **Dedupe:** call `createOrder` twice with the same `channel`+`source_order_id` → second
  returns the same order flagged duplicate (sets up Phase 4).
