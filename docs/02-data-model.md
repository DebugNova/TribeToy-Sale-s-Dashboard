# 02 — Data Model

> The Postgres schema (Supabase). Right-sized from the PDF's logical model, but **enums are
> kept full** so we don't have to migrate when later phases arrive. See
> [04-order-lifecycle.md](04-order-lifecycle.md) for status rules and
> [03-channels.md](03-channels.md) for the channel enum's intake meaning.

## Enums

```
user_role        : admin | ops | warehouse | sales | finance      (v1 uses admin only)
customer_type    : b2c | b2b
order_channel    : website | amazon | instagram | whatsapp | phone | manual | b2b
order_status     : created | validated | payment_confirmed | cod_approved
                 | reserved | packed | label_generated | dispatched
                 | in_transit | delivered | returned | refunded | cancelled
payment_type     : prepaid | cod | pending
payment_status   : unpaid | paid | partially_paid | refunded
courier          : speedpost | delhivery | other
fulfillment_state: pending | packed | shipped | delivered | returned | cancelled
```

## Tables

### `profiles`
Mirror of `auth.users` with app metadata.
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | → `auth.users.id` |
| name | text | |
| role | user_role | default `admin` |
| status | text | active/disabled |
| created_at | timestamptz | |

### `customers`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| phone | text | |
| email | text | nullable |
| type | customer_type | default `b2c` |
| gstin | text | nullable (B2B) |
| address_line | text | |
| city | text | |
| state | text | |
| pincode | text | |
| notes | text | |
| created_at | timestamptz | |

### `products`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| sku | text UNIQUE | |
| name | text | |
| category | text | |
| description | text | |
| length_cm / width_cm / height_cm | numeric | for parcel/weight |
| weight_g | numeric | |
| tax_rate | numeric | GST % |
| price | numeric | selling price (INR) |
| cost | numeric | for margin calc |
| image_url | text | nullable |
| active | boolean | default true |
| created_at | timestamptz | |

### `inventory`
One row per product (v1 single location).
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| product_id | uuid FK → products | UNIQUE in v1 |
| on_hand | int | physical stock |
| reserved | int | held by open orders |
| damaged | int | |
| low_stock_threshold | int | drives alerts |
| location | text | nullable (multi-warehouse later) |
| updated_at | timestamptz | |

> `available` = `on_hand - reserved`, exposed via a **view** (`inventory_available`), not stored.

### `orders`
Order header. **Unique (channel, source_order_id)** prevents duplicate imports.
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_no | text UNIQUE | internal human ref (e.g. `TT-2026-0001`) |
| channel | order_channel | |
| source_order_id | text | external ref; nullable for manual |
| customer_id | uuid FK → customers | |
| ship_name / ship_phone | text | snapshot at order time |
| ship_address / ship_city / ship_state / ship_pincode | text | snapshot |
| status | order_status | default `created` |
| payment_type | payment_type | |
| payment_status | payment_status | default `unpaid` |
| subtotal / discount / tax / shipping_charge / total | numeric | |
| currency | text | default `INR` |
| notes | text | |
| source_payload | jsonb | raw original (audit/troubleshoot) |
| created_at / updated_at | timestamptz | |

### `order_items`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK → orders | |
| product_id | uuid FK → products | |
| sku / name | text | snapshot at order time |
| qty | int | |
| unit_price / discount / tax / line_total | numeric | |
| fulfillment_status | fulfillment_state | default `pending` |

### `shipments`
One order can have many (split dispatch).
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK → orders | |
| courier | courier | default `speedpost` |
| awb | text | nullable; entered after booking |
| label_template | text | which template was used |
| label_pdf_url | text | Supabase Storage path |
| dispatch_date | date | |
| tracking_status | text | |
| pickup_info | jsonb | |
| created_by | uuid FK → profiles | label traceability |
| created_at | timestamptz | |

### `payments`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK → orders | |
| method | text | upi/card/cod/bank |
| amount | numeric | |
| status | payment_status | |
| txn_ref | text | |
| settlement_ref | text | marketplace settlement (later) |
| refund_amount | numeric | |
| created_at | timestamptz | |

### `audit_logs`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| actor_id | uuid FK → profiles | nullable for system |
| action | text | e.g. `order.status_change` |
| entity | text | `order` / `inventory` / ... |
| entity_id | uuid | |
| before | jsonb | previous value |
| after | jsonb | new value |
| created_at | timestamptz | |

### `settings`
Single-row app config (sender address, default courier, intake on/off).
| Column | Type | Notes |
|---|---|---|
| id | int PK | always 1 |
| sender_name / sender_address / sender_city / sender_state / sender_pincode / sender_phone | text | label "FROM" block |
| default_courier | courier | |
| updated_at | timestamptz | |

## Relationships

```
customers 1 ── * orders 1 ── * order_items * ── 1 products 1 ── 1 inventory
                       1 ── * shipments
                       1 ── * payments
profiles  1 ── * audit_logs / shipments(created_by)
```

## Indexes / integrity highlights

- `orders` UNIQUE `(channel, source_order_id)` — idempotent imports/dedupe.
- `products.sku` UNIQUE.
- Indexes on `orders(status)`, `orders(channel)`, `orders(created_at)` for dashboard filters.
- `inventory.product_id` UNIQUE (v1 single location).

## RLS (v1)

All tables: authenticated users (founders) → full access. Service-role key bypasses RLS and
is used **only** in the intake API. Role-scoped policies are a Phase 5 concern.
