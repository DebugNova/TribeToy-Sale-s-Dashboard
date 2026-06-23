# TribeToy Dashboard — Manual Test Guide (for absolute beginners)

This guide walks you through testing **every feature** of the TribeToy Commerce Dashboard,
step by step. You don't need to be a programmer. Just follow each step in order and compare
what you see on screen with the **"✅ Expected"** line.

> **How to use this guide**
> - Do the sections **in order** the first time (some steps create data later steps use).
> - Each test has a checkbox `[ ]`. Tick it once the result matches.
> - If something doesn't match, write down the test number — that's a bug to report.
> - Words in `code font` are exact things to type or click.

---

## 0. Before you start (one-time setup)

You only do this section once.

### 0.1 Install the tools
1. Install **Node.js** (version 20 or newer) from <https://nodejs.org> — pick the "LTS" button.
2. Install **Git** (optional, only if you'll pull updates) from <https://git-scm.com>.

To check Node installed correctly, open a terminal (on Windows: **PowerShell**) and type:
```
node -v
```
✅ Expected: it prints something like `v20.x.x` or higher.

### 0.2 Open the project folder
The project lives at:
```
c:\Users\kaust\OneDrive\Desktop\TribeToy Dashboard
```
In PowerShell, go there:
```
cd "c:\Users\kaust\OneDrive\Desktop\TribeToy Dashboard"
```

### 0.3 Install the app's building blocks
Run this once (it downloads the libraries the app needs):
```
npm install
```
✅ Expected: it finishes with no red `ERROR` lines. Warnings (yellow) are fine.

### 0.4 Check the secret config file exists
The app needs a file called `.env.local` (it holds the database keys and the website
webhook secret). It should already exist. Confirm it:
```
Test-Path .env.local
```
✅ Expected: prints `True`.

> ⚠️ **Never** share `.env.local` or commit it to git. It contains private keys.
> It already contains four values: `NEXT_PUBLIC_SUPABASE_URL`,
> `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `INTAKE_WEBHOOK_SECRET`.

### 0.5 Start the app
```
npm run dev
```
✅ Expected: after a few seconds you see `Ready` and a line like
`- Local: http://localhost:3000`.

Leave this terminal window **open and running**. The app is now live at
<http://localhost:3000>. To stop it later, click that terminal and press `Ctrl + C`.

> 💡 If you want to test the **production build** instead (closer to the real deployed app):
> stop the dev server, run `npm run build`, then `npm run start`. Same URL.

---

## 1. Logging in

### Test 1.1 — Unauthenticated redirect
1. Open a **private/incognito** browser window (so you're definitely logged out).
2. Go to <http://localhost:3000>.

✅ Expected: you are **redirected to the login page** (`/login`). You should NOT see the
dashboard. The page says "TribeToy — Commerce Dashboard" with Email/Password boxes.
`[ ]`

### Test 1.2 — Log in as the founder (Admin)
1. On the login page, enter:
   - **Email:** `kaustab.borah44@gmail.com`
   - **Password:** `TtLbkENgq6LLWTB8#9`  *(this is a temporary bootstrap password)*
2. Click **Sign in**.

✅ Expected: you land on the **Dashboard** home page. Top-right shows
"Signed in as **Kaustab Borah**" with a grey **Admin** chip next to it.
`[ ]`

> 🔐 **Important:** Change this password after your first successful login
> (Supabase Dashboard → Authentication → Users, or build a change-password screen later).
> It was shared in plain text, so treat it as temporary.

### Test 1.3 — Wrong password is rejected
1. Sign out (top-right **Sign out** button), then on `/login` type the email above and a
   wrong password like `wrongpass`.
2. Click **Sign in**.

✅ Expected: a red error message appears (e.g. "Invalid login credentials") and you stay on
the login page.
`[ ]`

Now sign back in as the founder (Test 1.2) before continuing.

---

## 2. The navigation & layout

### Test 2.1 — Sidebar links
Look at the left sidebar.

✅ Expected (as **Admin**) you see these links: **Dashboard, Orders, Products, Customers,
Inventory, Shipments, Alerts, Audit log, Settings**. The **Alerts** link has a small **red
number badge** (the count of low-stock + stuck orders).
`[ ]`

### Test 2.2 — Each page opens
Click each sidebar link one by one.

✅ Expected: every page opens without an error screen. The current page's link is
highlighted dark in the sidebar.
`[ ]`

---

## 3. Products & Inventory

### Test 3.1 — View seeded products
Click **Products**.

✅ Expected: a table lists 6 demo products with SKUs `TT-BLOX-05`, `TT-DINO-01`,
`TT-PUZ-03`, `TT-ROBO-02`, `TT-PLUSH-06`, `TT-CAR-04` (names/prices vary). Each row shows
its stock and an Active state.
`[ ]`

### Test 3.2 — Create a new product
1. Click **Add product** (top-right).
2. Fill in:
   - **SKU:** `TEST-SKU-01`
   - **Name:** `Test Wooden Train`
   - **Category:** `Test`
   - **Price:** `499`
   - **Cost:** `200`
   - **Weight (g):** `350`
   - **Opening stock (on hand):** `25`
   - **Low-stock threshold:** `5`
3. Click **Save**.

✅ Expected: you return to the Products list and `TEST-SKU-01 · Test Wooden Train` appears
with stock **25**.
`[ ]`

### Test 3.3 — Duplicate SKU is blocked
1. Click **Add product** again.
2. Use the **same SKU** `TEST-SKU-01`, name `Another`, price `1`.
3. Click **Save**.

✅ Expected: a clear red error: *A product with SKU "TEST-SKU-01" already exists.* No second
product is created.
`[ ]`

### Test 3.4 — Inventory list shows the new product
Click **Inventory**.

✅ Expected: a row for `TEST-SKU-01` shows **On hand 25**, **Reserved 0**, **Available 25**.
`[ ]`

### Test 3.5 — Adjust stock requires a reason
1. On the Inventory page, find `TEST-SKU-01` and click **Adjust stock**.
2. In the popup, choose field **On hand**, enter change **`-5`**, and leave the **Reason**
   box **empty**.
3. Try to submit.

✅ Expected: it refuses and asks for a reason (the reason is mandatory).
`[ ]`

### Test 3.6 — Adjust stock with a reason works
1. Same popup: change **`-5`**, Reason: `Damaged in storage`.
2. Submit.

✅ Expected: success message; `TEST-SKU-01` now shows **On hand 20**, **Available 20**.
`[ ]`

### Test 3.7 — Stock can't go negative
1. Adjust `TEST-SKU-01` **On hand** by **`-9999`** with reason `test`.
2. Submit.

✅ Expected: it refuses with a message like *on-hand stock cannot go below 0 (current 20)*.
`[ ]`

---

## 4. Customers

### Test 4.1 — Create a customer
1. Click **Customers → Add customer**.
2. Fill:
   - **Name:** `Riya Sharma`
   - **Type:** `B2C`
   - **Phone:** `9876543210`
   - **Email:** `riya@example.com`
   - **City:** `Guwahati`, **State:** `Assam`, **Pincode:** `781001`
3. Save.

✅ Expected: returns to the Customers list with `Riya Sharma` shown.
`[ ]`

### Test 4.2 — Invalid email is rejected
1. Add another customer, Name `Bad Email`, Email `not-an-email`.
2. Save.

✅ Expected: red error "Enter a valid email". Customer not created.
`[ ]`

### Test 4.3 — Phone is masked on the detail page
1. Open `Riya Sharma`'s detail page (click the name).

✅ Expected: the phone shows **masked**, like `••••••3210` (only last 4 digits visible),
with a **Reveal** button next to it.
`[ ]`

### Test 4.4 — Reveal shows the full phone
1. Click **Reveal** next to the masked phone.

✅ Expected: the full number `9876543210` appears. *(Behind the scenes this writes a
`sensitive.reveal` audit row — you'll see it later in the Audit log.)*
`[ ]`

---

## 5. Manual orders & the order lifecycle (the big one)

This is the core workflow. We'll create an order and walk it through every stage, watching
inventory move.

### Test 5.1 — Create a manual order
1. Click **Orders → New order**.
2. **Channel:** `Manual / walk-in`.
3. **Customer:** choose **Existing customer** → select `Riya Sharma`.
   (Her ship-to details auto-fill — leave them.)
4. **Items:** in the first item row, open the **Product** dropdown and pick
   `TEST-SKU-01 · Test Wooden Train`. The SKU, name and unit price (499) auto-fill.
5. Set **Qty** to `3`.
6. **Payment type:** `Prepaid`. **Payment status:** `Unpaid`.
7. Watch the **Totals** box at the bottom update live: Subtotal `₹1,497.00`, Total
   `₹1,497.00`.
8. Click **Create order**.

✅ Expected: you're taken to the new order's detail page. Its order number looks like
**`TT-2026-00xx`** (auto-generated). Status badge says **Created**.
`[ ]`

> 📝 Write down this order number — call it **ORDER-A**. You'll use it through Section 5–6.

### Test 5.2 — Reserve is blocked until validated (illegal transition guard)
Look at the **Actions** buttons on the order page. In the **Created** state you should only
see buttons for **Validate** and **Cancel** (you should NOT see "Mark packed" or "Dispatch").

✅ Expected: only the legal next steps are offered. You cannot skip stages.
`[ ]`

### Test 5.3 — Walk the order forward
Click the buttons in this order, checking the status badge changes each time:

1. **Validate** → status becomes **Validated**.
2. **Confirm payment** → status **Payment confirmed** (and the payment badge flips to
   **Paid**).
3. **Reserve stock** → status **Reserved**.

✅ Expected: each step succeeds and the badge updates.
`[ ]`

### Test 5.4 — Reserving moved inventory
Open **Inventory** in a new tab and find `TEST-SKU-01`.

✅ Expected: **On hand 20**, **Reserved 3**, **Available 17** (3 units are now held for
ORDER-A).
`[ ]`

### Test 5.5 — Continue to packed
Back on ORDER-A, click **Mark packed**.

✅ Expected: status becomes **Packed**. Notice the **Generate label** action is now handled
by the **Shipping label** panel (next section) — it's intentionally not a plain status
button, because a label must produce a real PDF.
`[ ]`

> ⏸️ **Pause here** and do **Section 6 (Labels)** for ORDER-A, then come back to Test 5.6.

### Test 5.6 — Dispatch removes stock
After generating a label (Section 6), ORDER-A is in **Label generated**. Click **Dispatch**.

✅ Expected: status becomes **Dispatched**. Now check **Inventory** for `TEST-SKU-01`:
**On hand 17**, **Reserved 0**, **Available 17** (the 3 units left the building).
`[ ]`

### Test 5.7 — Finish the journey
On ORDER-A click **Mark in transit** → **Mark delivered**.

✅ Expected: status ends at **Delivered**.
`[ ]`

### Test 5.8 — Cancelling a reserved order releases stock
Now test the cancel path with a **fresh** order:
1. Create another manual order for `Riya Sharma`, product `TEST-SKU-01`, qty `2`
   (call it **ORDER-B**).
2. Walk it: **Validate → Confirm payment → Reserve stock**.
3. Check Inventory: `TEST-SKU-01` Reserved should now be **2**.
4. On ORDER-B click **Cancel**.

✅ Expected: ORDER-B status **Cancelled**, and Inventory `TEST-SKU-01` **Reserved back to 0**
(the hold was released).
`[ ]`

### Test 5.9 — Not enough stock is blocked
1. Create a manual order for `Riya Sharma`, product `TEST-SKU-01`, qty **`9999`**
   (call it **ORDER-C**).
2. Walk it: **Validate → Confirm payment → Reserve stock**.

✅ Expected: when you click **Reserve stock** you get a red error like *Not enough available
stock to reserve every item on this order.* The order stays in Payment confirmed, and
Inventory is unchanged (no partial reservation).
`[ ]`

### Test 5.10 — Order filters & search
Go to **Orders** (the list).
1. Use the **Status** filter → choose `Delivered`. ✅ Only delivered orders show.
2. Use the **Channel** filter → choose `Manual`. ✅ Only manual-channel orders show.
3. Type ORDER-A's number into the **Search** box. ✅ Only that order shows.
4. Clear filters. ✅ All orders return.
`[ ]`

---

## 6. Shipping labels (A4 PDF + QR)

Do this for **ORDER-A** while it is in the **Packed** state (from Test 5.5).

### Test 6.1 — Generate a label
1. On ORDER-A's page, find the **Shipping label** panel.
2. Choose a **Courier** (e.g. `Speed Post`). Leave **AWB** blank for now. Optionally set a
   **Dispatch date**.
3. Click **Generate label**.

✅ Expected: a success state appears with a **Download / Print** button, and the order status
moves to **Label generated**.
`[ ]`

### Test 6.2 — The PDF looks right
1. Click **Download / Print** (opens the PDF in a new tab).

✅ Expected: an **A4 PDF** with a bordered label block containing:
- **FROM**: TribeToy Pvt Ltd, TIC IIT Guwahati, PIN 781039, the sender phone.
- **TO**: Riya Sharma, her address, PIN.
- A **QR code** with the order number printed under it.
- **Order No.**, **Courier**, **AWB / Tracking** (— if blank), **Dispatch Date**.
- **Parcel Contents** (`3 × TEST-SKU-01 …`) and **Total weight** (`1050 g` = 3 × 350 g).
`[ ]`

### Test 6.3 — The QR scans to the order number
1. Use your phone's camera or any QR scanner app on the QR in the PDF.

✅ Expected: it decodes to the order number, e.g. `TT-2026-00xx`.
`[ ]`

### Test 6.4 — Add an AWB and reprint
1. In the Shipping label panel, type an AWB like `ES016693300IN` in the **AWB** field and
   save it (there's an edit/update control).
2. Click **Reprint** (or Generate again).

✅ Expected: a **new version** of the PDF is produced (the old one is kept). The **print
history** list below now shows multiple events (label generated → AWB update → reprint) each
with **who** and **when**. The reprinted PDF's QR now decodes to `TT-2026-00xx ES016693300IN`.
`[ ]`

### Test 6.5 — Can't make a label too early
1. Open **ORDER-C** (the one stuck in Payment confirmed from Test 5.9).

✅ Expected: the Shipping label panel says a label can't be generated yet (the order must be
**Packed** first). There's no way to produce a PDF before packing.
`[ ]`

### Test 6.6 — Shipments page
Click **Shipments** in the sidebar.

✅ Expected: a table lists each shipment (order number, status, courier, AWB, dispatch date,
who created it, when), with a **Download** button per row.
`[ ]`

---

## 7. The Sales Dashboard

Click **Dashboard** (home).

### Test 7.1 — KPI cards
✅ Expected: cards at the top show **Revenue**, **Orders**, **Avg order value (AOV)**,
**Returns**, **Pending fulfillment**, **Shipments today** — all with real numbers (the demo
data + your test orders). Revenue **excludes** cancelled and refunded orders.
`[ ]`

### Test 7.2 — Charts render
✅ Expected: you see a **Revenue trend** chart, an **Orders trend** chart, and a **Channel
split** chart, all drawn with bars/lines (not blank).
`[ ]`

### Test 7.3 — Filters change the numbers
Use the filter bar at the top:
1. Set **Channel** = `website`. ✅ KPIs + charts shrink to only website orders.
2. Clear channel, set **City** = `Mumbai` (if present) or any listed city. ✅ Numbers change.
3. Set **Customer type** = `b2b`. ✅ Numbers change to business orders only.
4. Narrow the **date range** to the last 5 days. ✅ Fewer orders shown.
`[ ]`

### Test 7.4 — Filters survive a refresh (URL state)
1. With some filters applied, **copy the browser URL**, then press **F5** (refresh).

✅ Expected: the same filters are still applied after the refresh (they're stored in the
URL). Pasting that URL in a new tab shows the same filtered view.
`[ ]`

### Test 7.5 — Top SKUs sort toggle
In the **Top SKUs** panel, click the sort options **Qty / Revenue / Margin**.

✅ Expected: the ranking **reorders** for each (the three give different orders). Your active
date/channel filters stay applied while sorting.
`[ ]`

### Test 7.6 — Low-stock panel
✅ Expected: the **Low stock** panel lists products at/under their threshold. With the demo
data that's `TT-PUZ-03` (available 3 ≤ 5) and `TT-ROBO-02` (available 5 ≤ 10).
`[ ]`

### Test 7.7 — CSV export
Click a **Download CSV** / **Export** button on any panel (e.g. Top SKUs).

✅ Expected: a `.csv` file downloads. Open it in Excel — the ₹ amounts and headers look
correct (no broken characters).
`[ ]`

---

## 8. Website auto-import API (signed webhook)

This tests the secure endpoint your website would POST orders to. We'll send a **signed**
request from a tiny script (it reads the secret from `.env.local` so you never copy secrets).

### Test 8.1 — Create the test script
Keep `npm run dev` running. Open a **second** PowerShell window in the project folder and
create a file called `test-intake.mjs` with this content (copy exactly):

```js
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";

// read INTAKE_WEBHOOK_SECRET from .env.local
const env = readFileSync(".env.local", "utf8");
const secret = env.split("\n").find(l => l.startsWith("INTAKE_WEBHOOK_SECRET"))
  ?.split("=")[1]?.trim().replace(/^["']|["']$/g, "");
if (!secret) throw new Error("INTAKE_WEBHOOK_SECRET not found in .env.local");

const body = JSON.stringify({
  source_order_id: "WEB-TEST-" + Date.now(),
  customer: { name: "Web Buyer", phone: "9000000001", email: "web@example.com",
              address_line: "1 Web St", city: "Guwahati", state: "Assam", pincode: "781001" },
  items: [
    { sku: "TT-DINO-01", name: "Dino", qty: 1, unit_price: 699 },
    { sku: "UNKNOWN-SKU-XYZ", name: "Mystery item", qty: 2, unit_price: 224 }
  ],
  payment: { type: "prepaid", status: "paid" },
  amounts: { shipping: 0 }
});

const sig = createHmac("sha256", secret).update(body, "utf8").digest("hex");

async function post(headers, label) {
  const res = await fetch("http://localhost:3000/api/intake/website", {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body
  });
  console.log(label, "→", res.status, await res.text());
}

// 1) correctly signed
await post({ "x-tribetoy-signature": sig }, "SIGNED   ");
// 2) duplicate (same body, same signature) — should say duplicate
await post({ "x-tribetoy-signature": sig }, "DUPLICATE");
// 3) wrong signature — should be 401
await post({ "x-tribetoy-signature": "deadbeef" }, "BAD SIG  ");
// 4) no signature — should be 401
await post({}, "NO SIG   ");
```

### Test 8.2 — Run the tests
In that second window run:
```
node test-intake.mjs
```

✅ Expected output (status codes are what matter):
- `SIGNED    → 200 {"status":"created","order_no":"TT-2026-00xx"}`
- `DUPLICATE → 200 {"status":"duplicate","order_no":"TT-2026-00xx"}` (same number — no second
  order created)
- `BAD SIG   → 401 ...`
- `NO SIG    → 401 ...`
`[ ]`

### Test 8.3 — Bad data is rejected (400) without creating an order
Add this to the bottom of `test-intake.mjs` and re-run, OR just trust the shape rules:
- A **malformed JSON** body → **400** "Malformed JSON body".
- A valid-JSON but **wrong shape** (e.g. no items) → **400** with a clear validation message.
- A `GET` request to the same URL → **405** "Method not allowed".

(You can test the GET quickly in a browser: visit
<http://localhost:3000/api/intake/website> → you should see a 405 JSON message, **not** the
login page.)
`[ ]`

### Test 8.4 — The imported website order shows up
1. In the dashboard, go to **Orders**. Filter **Channel = website**.

✅ Expected: the new order from Test 8.2 appears. Open it:
- It has **two line items**, including `UNKNOWN-SKU-XYZ` (an unknown SKU is **stored, not
  rejected** — its product link is just empty).
- Channel is **website**, with the `WEB-TEST-…` source id.
`[ ]`

### Test 8.5 — Intake activity log
Go to **Settings → Website intake** panel.

✅ Expected: a **recent intake activity** table shows your `created` and `duplicate` events,
plus the endpoint URL and the signature header name + a signing snippet.
`[ ]`

> 🧹 When done, delete the helper file: `Remove-Item test-intake.mjs`

---

## 9. Amazon CSV import

### Test 9.1 — Make a sample CSV
In the project folder create a file `amazon-sample.csv` with this content:
```
order-id,sku,product-name,quantity-purchased,item-price,item-tax,ship-city,recipient-name
404-1111111-0000001,TT-CAR-04,Toy Car,2,1198,0,Delhi,Aман Verma
404-1111111-0000001,TT-PLUSH-06,Plush Bear,1,599,0,Delhi,Aman Verma
404-2222222-0000002,TT-DINO-01,Dino,1,699,0,Pune,Sara Khan
```
(The first two rows share an order id, so they become **one order with two items**.)

### Test 9.2 — Preview then import
1. Go to **Orders → Import (Amazon CSV)**.
2. Choose `amazon-sample.csv`.

✅ Expected: a **preview** shows 2 orders (one with 2 items, one with 1) **before** anything
is saved.
3. Click **Import / Confirm**.

✅ Expected: a summary like **Created: 2, Duplicate: 0, Errors: 0**.
`[ ]`

### Test 9.3 — Re-import is safe (dedupe)
Import the **same file again**.

✅ Expected: summary now shows **Created: 0, Duplicate: 2** (no duplicate orders created — the
Amazon order ids are recognised).
`[ ]`

### Test 9.4 — The Amazon orders appear
Go to **Orders**, filter **Channel = amazon**.

✅ Expected: the two imported orders are listed.
`[ ]`

---

## 10. Role-based access (RLS) — test as different staff

The build created **4 test staff logins** so you can see what each role can and can't do.
All four use password **`Test1234!`**:

| Login email | Role |
|---|---|
| `ops.test@tribetoy.test` | Operations |
| `warehouse.test@tribetoy.test` | Warehouse |
| `sales.test@tribetoy.test` | Sales |
| `finance.test@tribetoy.test` | Finance |

For each, **sign out** then sign in as that user and check the table below.

### Test 10.1 — Operations (`ops.test`)
✅ Expected:
- **No** "Audit log" or "Settings" link in the sidebar.
- Can open Orders and **create/advance** orders. Can adjust **Inventory**.
- Products page: the **Add product** / edit buttons are **hidden/disabled** (ops can read,
  not write products).
`[ ]`

### Test 10.2 — Warehouse (`warehouse.test`)
✅ Expected:
- No Audit/Settings links.
- Can manage **Inventory** and **Shipments/labels**.
- Orders are **read-only** (no lifecycle action buttons — there's a note saying read-only).
`[ ]`

### Test 10.3 — Sales (`sales.test`)
✅ Expected:
- No Audit/Settings links.
- Can **create orders** and **add/edit customers**.
- Cannot adjust inventory (Adjust button hidden/disabled).
`[ ]`

### Test 10.4 — Finance (`finance.test`)
✅ Expected:
- No Audit/Settings links.
- Orders/products/inventory are **read-only**.
- (Finance owns payments — there's no payments UI in v1, but the data layer allows it.)
`[ ]`

### Test 10.5 — Non-admins can't reach admin pages by URL
While logged in as `ops.test`, type `http://localhost:3000/settings` directly in the address
bar, then try `http://localhost:3000/audit`.

✅ Expected: you are **redirected to the dashboard** for both — non-admins can't open Settings
or the Audit log even by guessing the URL.
`[ ]`

> Sign back in as the **founder (admin)** for the rest.

---

## 11. Audit log & Alerts (admin only)

### Test 11.1 — Audit log viewer
Click **Audit log**.

✅ Expected: a table of activity (order created, status changes, inventory adjustments, the
`sensitive.reveal` from Test 4.4, label events). There are **filters** by entity, actor and
date. Clicking an entry shows a **before → after** diff for changes.
`[ ]`

### Test 11.2 — Alerts page
Click **Alerts**.

✅ Expected: panels for **Low stock** (PUZ, ROBO and anything else under threshold),
**Packing exceptions** (orders stuck pre-dispatch for 3+ days), and the **full backlog**.
The red number on the **Alerts** sidebar badge equals (low-stock count + stuck-order count).
`[ ]`

---

## 12. Cleanup (after testing)

Once you've finished testing, tidy up the data you created.

### 12.1 — Remove your manual test orders/products
You can delete test orders from the database, or simply leave them — they don't harm
anything. The test products `TEST-SKU-01` can be set **inactive** from the Products list
(soft delete) so they stop appearing in new-order dropdowns.

### 12.2 — Before going live (important)
These are **go-live chores**, not test steps:
- [ ] **Change the founder password** (it was shared in plain text).
- [ ] **Delete the 4 test staff users** (`*.test@tribetoy.test`) — they have a weak shared
      password. Supabase → Authentication → Users → delete each (their profiles auto-remove).
- [ ] **Clear the demo data** if you want a clean slate: the 17 `DEMO-####` orders are sample
      analytics data. (Deleting order items first, then orders.)
- [ ] **Rotate the Supabase service-role key** if it was ever pasted into a chat, and update
      `.env.local` + Vercel.
- [ ] **Enable leaked-password protection** (Supabase → Authentication → Password security).
- [ ] **Set up automated backups** (Supabase → Database → Backups; needs the Pro plan).

---

## 13. Troubleshooting

| Symptom | Fix |
|---|---|
| `npm run dev` fails to start | Run `npm install` again. Make sure no other app uses port 3000. |
| Login says "Invalid login credentials" | Double-check email/password. Caps lock off. |
| Every page redirects to `/login` | Your session expired — just log in again. |
| Intake script prints `INTAKE_WEBHOOK_SECRET not found` | Make sure `.env.local` has a line `INTAKE_WEBHOOK_SECRET=...`. |
| Intake returns 500 "SERVICE_ROLE_KEY missing" | `SUPABASE_SERVICE_ROLE_KEY` isn't set in `.env.local`. |
| Label PDF won't open | It opens in a new tab via a temporary signed link; allow pop-ups. |
| Dashboard numbers look "off" | Remember revenue **excludes** cancelled & refunded orders, and "today" is **IST**. |

---

### Quick pass/fail summary (fill in at the end)

- [ ] Section 1 — Login & auth
- [ ] Section 2 — Navigation
- [ ] Section 3 — Products & inventory
- [ ] Section 4 — Customers & masking
- [ ] Section 5 — Orders & lifecycle
- [ ] Section 6 — Labels
- [ ] Section 7 — Dashboard
- [ ] Section 8 — Website intake API
- [ ] Section 9 — Amazon CSV import
- [ ] Section 10 — Roles / RLS
- [ ] Section 11 — Audit & alerts

If every box is ticked, the dashboard is working end-to-end. 🎉
