# 04 — Order Lifecycle

> The states an order moves through, the **allowed transitions**, and the **guard rules**
> enforced server-side. Implemented in `lib/orders/lifecycle.ts`. Statuses are the
> `order_status` enum in [02-data-model.md](02-data-model.md).

## States

```
created
  → validated
      → payment_confirmed   (prepaid)   ┐
      → cod_approved        (COD)       ┘
          → reserved
              → packed
                  → label_generated
                      → dispatched
                          → in_transit
                              → delivered
```

Side branches (reachable from most active states):
```
cancelled     (before dispatch)
returned      (after delivered / in_transit)
refunded      (after returned, or for prepaid cancellation)
```

## Transition map

| From | Allowed next |
|---|---|
| created | validated, cancelled |
| validated | payment_confirmed, cod_approved, cancelled |
| payment_confirmed / cod_approved | reserved, cancelled |
| reserved | packed, cancelled |
| packed | label_generated, cancelled |
| label_generated | dispatched, cancelled |
| dispatched | in_transit, returned |
| in_transit | delivered, returned |
| delivered | returned |
| returned | refunded |
| cancelled / refunded | (terminal) |

Any other transition is rejected with a clear error.

## Guard rules (enforced in `lib/orders/lifecycle.ts`)

1. **No skipping** — only transitions in the map above are allowed.
2. **Reserve requires payment cleared** — must be `payment_confirmed` (prepaid) or
   `cod_approved` (COD) before `reserved`.
3. **Reserve checks stock** — `available (= on_hand - reserved) >= qty` for each item;
   otherwise the order is flagged as a packing exception, not reserved.
4. **Packed requires reserved** — cannot mark `packed` unless inventory was reserved.
   (Spec rule: "an order should not be marked as packed unless inventory has been reserved.")
5. **Label requires packed** — `label_generated` only after `packed`.
6. **Dispatch requires a label** — and a shipment row with courier (+ AWB if recorded).

## Inventory side-effects

| Transition | Effect on `inventory` |
|---|---|
| → reserved | `reserved += qty` per item |
| → dispatched | `on_hand -= qty`, `reserved -= qty` (stock leaves the building) |
| → cancelled (while reserved, pre-dispatch) | `reserved -= qty` (release hold) |
| → returned (post-dispatch) | `on_hand += qty` if restockable (or `damaged += qty`) |

All inventory mutations + status changes write an `audit_logs` row (who/what/before/after).

## Notes

- Transitions are functions, not free-form status edits — UI buttons call specific actions
  (e.g. `markPacked(orderId)`), each running the guard then the side-effect atomically.
- Admin override (skip a step) is a Phase 5 / role-gated capability; v1 keeps it strict.
- `order_items.fulfillment_status` mirrors progress for split/partial dispatch later.
