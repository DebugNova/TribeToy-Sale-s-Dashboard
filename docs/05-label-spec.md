# 05 — Shipping Label Spec

> The parcel label the dashboard generates per order. **A4 page layout** (print on a normal
> printer, cut/tape onto the parcel) — this replaces today's handwritten labels. Built in
> `lib/labels/`. Reference: the real handwritten Speed Post parcel photo provided by the user.

## Goal

One click on a ready-to-ship order → a clean, consistent A4 PDF label with everything the
courier and warehouse need, traceable to who generated it. No manual formatting.

## Page / print

- **Page size:** A4 portrait.
- **Layout:** the label sits in the top portion of the page inside a bordered box sized so
  it can be cut out (≈ 4×6 in / 100×150 mm block centered on the upper A4). Print at 100%
  (no "fit to page" scaling).
- **Multiple per sheet (later):** support 2-up A4 for batch printing; v1 = one label/page.

## Required fields

| Section | Fields |
|---|---|
| **TO (recipient)** | Name, full address line, city, state, **PIN code**, phone |
| **FROM (sender)** | From the editable `settings` row (see default below) |
| **Order ref** | Internal `order_no` (e.g. `TT-2026-0001`) |
| **Shipment** | Courier name, **AWB number** (if recorded), dispatch date |
| **Parcel content** | SKU list + qty (summary), total weight, handling notes |
| **Machine-readable** | **QR code** encoding order_no (+ AWB if present) for warehouse scanning |

## Default FROM (sender) — editable in Settings

Taken from the actual parcel; stored in `settings`, **not hard-coded**:

```
TribeToy Pvt Ltd
TIC, IIT Guwahati
Guwahati, Assam — 781039
Phone: 8003790347   ← confirm exact digits with the team
```

## India Post Speed Post note (important)

The Speed Post **AWB / tracking number** (format like `ES016693300IN`) is issued by **India
Post at booking**, not by our system. So:

- v1 label = a clean **address + contents + QR** block. Staff still book Speed Post at the
  counter and affix India Post's own AWB sticker.
- The AWB can be **typed back into the order** (shipment record) afterward so the dashboard
  shows tracking reference and the QR can include it on a reprint.
- This keeps us courier-agnostic — `label_template` + `courier` fields support Delhivery etc.
  later without redesign.

## Storage, reprint, traceability

- Generated PDF saved to **Supabase Storage**; path stored in `shipments.label_pdf_url`.
- **Reprint** allowed (after damage, etc.); each generation records `created_by` (the user)
  and an `audit_logs` entry → labels are traceable to who printed them.
- Label generation transitions the order to `label_generated` (see
  [04-order-lifecycle.md](04-order-lifecycle.md)).

## Multiple courier templates

`label_template` selects the layout. v1 ships a generic "Speed Post / A4" template; adding a
courier = add a template component, no schema change.

## ASCII sketch (A4, label block)

```
┌──────────────── A4 page ────────────────┐
│  ┌──────────────────────────────────┐   │
│  │ FROM: TribeToy Pvt Ltd           │   │
│  │       TIC, IIT Guwahati          │   │
│  │       Guwahati, Assam 781039     │   │
│  │----------------------------------│   │
│  │ TO:  <Name>            [ QR ]    │   │
│  │      <Address line>    [code]    │   │
│  │      <City>, <State>             │   │
│  │      PIN: <pincode>  Ph: <phone> │   │
│  │----------------------------------│   │
│  │ Order: TT-2026-0001              │   │
│  │ Courier: Speed Post  AWB: ____   │   │
│  │ Items: 2x TOY-DRAGON-01 ...      │   │
│  │ Wt: 250g   Date: 22-Jun-2026     │   │
│  └──────────────────────────────────┘   │
│         (rest of A4 blank)               │
└──────────────────────────────────────────┘
```
