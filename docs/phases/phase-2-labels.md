# Phase 2 — Shipping Label Generation (A4 PDF)

> **Goal:** One click on a ready-to-ship order generates a clean **A4 PDF label** (TO/FROM,
> order ref, courier + AWB, item summary, weight, dispatch date, **QR code**), saves it to
> Supabase Storage, records the shipment, transitions the order to `label_generated`, and
> supports **reprint** with traceability. Replaces handwritten labels.

**Depends on:** Phase 1 (orders + items + settings). **Unlocks:** real dispatch workflow.

Spec reference: [../05-label-spec.md](../05-label-spec.md).

---

## 2.1 Scope
**In scope:** label PDF generation, QR encoding, Supabase Storage upload + signed URL,
`shipments` record creation/update, AWB entry, reprint + print history, `label_generated`
transition. Courier template selection (v1 ships `speedpost_a4`).

**NOT in scope:** real courier API/AWB booking (AWB is typed in manually), tracking webhooks,
bulk label printing across many orders (single-order in v1; note 2-up as a stretch).

---

## 2.2 Prerequisites
Phase 1 complete. Packages from Phase 0 already installed: `@react-pdf/renderer`, `qrcode`.
Storage bucket `labels` already created in Phase 0 (§0.5.4).

---

## 2.3 BACKEND — Supabase

No schema change required (`shipments` + `settings` already exist). Confirm the `labels`
bucket + policies exist (Phase 0 §0.5.4); if missing, apply them now.

### 2.3.1 Storage usage
- Bucket: `labels` (private).
- Path convention: `labels/{order_no}/{shipment_id}-v{n}.pdf` (versioned for reprints).
- Access: generate a **signed URL** (e.g. 1-hour) server-side when the user downloads/prints;
  do not make the bucket public. Store the storage **path** in `shipments.label_pdf_url`.

### 2.3.2 Data writes
- On label generation: insert a `shipments` row (`order_id`, `courier`, `label_template`,
  `created_by`, optionally `awb`, `dispatch_date`), upload the PDF, set `label_pdf_url`.
- AWB can be added/edited later (update the shipment).
- Reprint: new version file; keep old rows/files as history (or add `version` to the path).
- Write `audit_logs` (`shipment.label_generated`, `shipment.reprint`, `shipment.awb_update`).

---

## 2.4 BACKEND/LOGIC — `lib/labels/`

### 2.4.1 `lib/labels/qr.ts`
`async function makeQrDataUrl(text: string): Promise<string>` using `qrcode` — encodes
`order_no` (and AWB if present). Returns a data URL embeddable in the PDF.

### 2.4.2 `lib/labels/label.tsx`
A `@react-pdf/renderer` `<Document>` component, **A4 page**, with the label inside a bordered
~100×150mm block in the upper area (cut-out friendly). Props: sender (from settings),
recipient (order ship-to), order_no, courier, awb, items summary, weight, dispatch_date,
qrDataUrl. Layout per the ASCII sketch in [../05-label-spec.md](../05-label-spec.md).

### 2.4.3 `lib/labels/pdf.ts` (server action / route)
`async function generateLabel(orderId, { courier, awb?, dispatchDate? }, actorId)`:
1. Load order + items + settings (server client).
2. Guard: order must be `packed` (or beyond) — see lifecycle.
3. Build QR (`makeQrDataUrl`).
4. Render PDF to a buffer (`@react-pdf/renderer` `renderToBuffer`).
5. Upload to `labels/...` (admin or server client with Storage access).
6. Insert/Update `shipments`; set `label_pdf_url`.
7. Transition order → `label_generated` (via `lib/orders/lifecycle.ts`).
8. Audit log. Return the storage path (+ a signed URL for immediate download).

`async function getLabelSignedUrl(shipmentId, actorId)` → returns a fresh signed URL for
download/print.

---

## 2.5 FRONTEND
On the **order detail** page (`app/(dashboard)/orders/[id]`), when status is `packed`+:
- "Generate Label" button → opens a small form: courier (default from settings), optional
  AWB, dispatch date → calls `generateLabel`.
- After generation: show "Download/Print Label" (opens the signed-URL PDF in a new tab; the
  browser print dialog prints A4), the AWB field (editable), and **print history** (list of
  shipment rows/versions with who + when).
- A dedicated print view route (optional): `app/(dashboard)/orders/[id]/label` that renders
  the PDF inline for quick printing.

Also add a **Shipments** list page (`app/(dashboard)/shipments/page.tsx`): all shipments with
order_no, courier, AWB, dispatch date, label link, created_by.

---

## 2.6 Step-by-step checklist
1. Verify `labels` bucket + policies exist.
2. `lib/labels/qr.ts` (QR data URL).
3. `lib/labels/label.tsx` (A4 PDF component).
4. `lib/labels/pdf.ts` (`generateLabel`, `getLabelSignedUrl`).
5. Wire order-detail "Generate Label" + download/print + AWB edit + history.
6. Build Shipments list page.
7. `npm run build` + `lint`; test (2.8).

---

## 2.7 Acceptance criteria
- [ ] For a `packed` order, "Generate Label" produces an **A4 PDF** with TO/FROM, order_no,
      courier, AWB (if entered), items, weight, dispatch date, and a scannable **QR**.
- [ ] The PDF is stored in the `labels` bucket; the order moves to `label_generated`.
- [ ] AWB can be added/edited after generation.
- [ ] Reprint works and prior versions are retained (print history shows who + when).
- [ ] Generating a label without the order being `packed` is blocked.

---

## 2.8 Verification
- Take a Phase-1 order to `packed`, generate a label → open the PDF, confirm all fields +
  scan the QR (decodes to the order_no).
- MCP: `select * from shipments where order_id='...';` shows the row + `label_pdf_url`.
- Storage: confirm the object exists under `labels/{order_no}/...` (MCP/dashboard).
- Reprint → a new version file/row; history lists both with `created_by`.
- `select action from audit_logs where entity='shipment' ...;` shows the events.
