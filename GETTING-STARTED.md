# Getting Started — TribeToy Dashboard (Beginner's Guide)

This guide assumes **you've never run a web app before**. Follow it top to bottom and you'll
have the dashboard running on your own computer. Don't skip steps. 🙂

> **What is this thing?** It's the TribeToy sales & operations dashboard — a website that runs
> on your computer (and later on the internet). It captures orders, prints A4 shipping labels,
> shows sales charts, and now (Phase 5) has user roles, an audit log, and stock alerts.

---

## 0. The 30-second mental model

- The app is built with **Next.js** (a website framework) and **TypeScript**.
- The **database, login, and file storage** all live on **Supabase** (a cloud service). You
  don't install a database — it's already set up in the cloud.
- "**Running it locally**" means: your computer runs the website, but it still talks to the
  Supabase cloud for data. So you need **internet**.
- You open the running app in your **web browser** at `http://localhost:3000`.

---

## 1. Install the tools you need (one time only)

### 1a. Node.js (this runs the app)
1. Go to **https://nodejs.org** and download the **LTS** version (the big green button).
2. Install it (just keep clicking Next / Continue).
3. To confirm it worked, open a terminal (see next step) and type:
   ```bash
   node -v
   ```
   You should see something like `v20.x` or `v24.x`. Any version **20 or higher** is fine.

### 1b. A terminal (this is where you type commands)
- **Windows:** press the Start button, type **"PowerShell"**, open it. (Or use the terminal
  built into VS Code — see below.)
- A "terminal" is just a black/blue window where you type commands and press Enter.

### 1c. (Recommended) VS Code (a nice code editor with a built-in terminal)
1. Download from **https://code.visualstudio.com** and install.
2. Open VS Code → **File → Open Folder** → choose the
   `TribeToy Dashboard` folder.
3. Open its terminal with **Terminal → New Terminal** (top menu). Now you can type commands
   right inside VS Code, already in the right folder. ✅

---

## 2. Open the project folder in the terminal

If you're **not** using VS Code's terminal, you need to "go into" the project folder. In
PowerShell, type this (adjust if your path is different) and press Enter:

```bash
cd "C:\Users\kaust\OneDrive\Desktop\TribeToy Dashboard"
```

> `cd` means "change directory" (go into a folder). The quotes are needed because the folder
> name has a space in it.

To check you're in the right place, type `ls` (or `dir`) — you should see files like
`package.json`, `README.md`, and folders like `app`, `lib`, `docs`.

---

## 3. Install the app's building blocks (one time, ~2 minutes)

In the terminal (inside the project folder), run:

```bash
npm install
```

- This downloads all the libraries the app needs into a folder called `node_modules`.
- It can take 1–3 minutes and prints a lot of text. That's normal.
- When it finishes you'll get your prompt back. If you see scary-looking "warnings", that's
  usually fine — only **errors** (red, saying "ERR!") matter.

> You only need to do this once (or again if someone changes the dependencies).

---

## 4. Check the secret settings file (`.env.local`)

The app needs some secret keys to talk to Supabase. They live in a file called **`.env.local`**
in the project folder. **It already exists** in this project, so you probably don't need to
touch it. It contains 4 lines:

| Key | What it is | Needed for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | The address of our Supabase project | Everything |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | A public key for logging in | Everything |
| `SUPABASE_SERVICE_ROLE_KEY` | A **secret** admin key | Website order auto-import (Phase 4) |
| `INTAKE_WEBHOOK_SECRET` | A shared password for the website's order feed | Phase 4 |

**You normally don't open this file.** Just know it exists. If the app later complains about a
"missing Supabase URL/key", that means this file is missing or empty — ask whoever set up the
project for it.

> ⚠️ Never share `.env.local` or paste its contents into chats/screenshots — the
> `service_role` key is like a master password to the database.

---

## 5. Run the app! 🚀

In the terminal, run:

```bash
npm run dev
```

You'll see something like:

```
▲ Next.js 16.2.9
- Local:   http://localhost:3000
✓ Ready in 2s
```

Now open your web browser (Chrome, Edge, etc.) and go to:

### 👉 http://localhost:3000

- **Leave the terminal open** — it's running the app. If you close it, the website stops.
- The first time you open a page it may take a few seconds to load (it's "building" that page).
- To **stop** the app later: click the terminal and press **`Ctrl + C`**.

---

## 6. Log in

The app will send you to a **login page** (you can't see anything without logging in).

**Founder account (full admin):**
- Email: `kaustab.borah44@gmail.com`
- Temporary password: `TtLbkENgq6LLWTB8#9`

> 🔐 Please change this password after your first login (it was a setup password).

Once logged in, you'll see the dashboard with a sidebar on the left.

---

## 7. What each page does (the tour)

The sidebar (left side) is your menu. As an **admin** you see all of these:

| Menu item | What it's for |
|---|---|
| **Dashboard** | The home screen: sales totals, charts, top-selling toys, low stock. Use the filter bar to slice by date/channel/city. CSV download buttons export tables. |
| **Orders** | Every order from every channel. Click an order to see details, change its status (e.g. mark Packed → generate label → Dispatched), and print the shipping label. "New order" adds one manually; "Import Amazon CSV" bulk-loads Amazon orders. |
| **Products** | Your catalog of toys (SKU, price, size, GST). "Add product" creates one. |
| **Customers** | People/dealers you sell to. Phone numbers are **masked** (•••••1234) — click **Reveal** to see the full number (this gets logged). |
| **Inventory** | Stock levels (on hand / reserved / available). "Adjust stock" changes quantities (needs a reason). |
| **Shipments** | List of generated labels with courier + tracking (AWB). |
| **Alerts** | ⚠️ Things needing attention: low stock + orders stuck before dispatch. The red number badge on this menu item is the count. |
| **Audit log** | (Admin only) Who did what, when, with before→after changes. Filter by person, type, or date. |
| **Settings** | (Admin only) The "From" address printed on labels + the website order-import setup. |

---

## 8. Trying it out locally (a simple test run)

Here's a safe little walkthrough to see it working end-to-end. **Note: this writes real data
to the cloud database**, so use obviously-fake names and delete them after if you want.

1. **Add a product:** Products → Add product → fill SKU (e.g. `TEST-1`), name, price → Save.
2. **Give it stock:** Inventory → find your product → Adjust stock → set On hand to e.g. 10
   (reason: "test") → Save.
3. **Create an order:** Orders → New order → pick a channel, add the customer's name/phone/
   address, add your product as a line item → Save.
4. **Walk the order through its life:** open the order → use the action buttons:
   `Reserve` → `Pack` → then in the **Shipping label** box click **Generate label** (a PDF
   opens) → `Dispatch`.
5. **See the numbers move:** go to **Dashboard** — your order shows in the totals. Go to
   **Inventory** — stock dropped after dispatch.
6. **See the audit trail:** **Audit log** — every step you did is listed with before→after.

That's the whole system working. 🎉

---

## 9. Testing the user roles (admin / ops / warehouse / sales / finance)

Phase 5 added roles. Different roles see/do different things. Some **test accounts** exist so
you can experience this (password for all of them is `Test1234!`):

| Login email | Role | Roughly what they can do |
|---|---|---|
| `ops.test@tribetoy.test` | Operations | Edit orders, inventory, shipments; read the rest |
| `warehouse.test@tribetoy.test` | Warehouse | Edit inventory + shipments; read orders |
| `sales.test@tribetoy.test` | Sales | Edit customers + orders; read the rest |
| `finance.test@tribetoy.test` | Finance | Edit payments; read the rest |

**How to test:** sign out (top-right) → log in as one of these → notice the sidebar is smaller
(no Audit log / Settings) and some buttons (like "Add product") are gone or read-only. That's
the role system working.

> 🧹 **When you're done testing**, delete these test accounts (they have a weak shared
> password). Ask the developer, or it's documented in `PROGRESS.md` → "Action needed".

---

## 10. Other useful commands

Run these in the terminal (stop the app first with `Ctrl + C` if it's running):

| Command | What it does |
|---|---|
| `npm run dev` | Start the app for local use (what you normally run). |
| `npm run build` | Make a production-ready version + check for code errors. Good to run before deploying. |
| `npm run start` | Run the production version (after `npm run build`). |
| `npm run lint` | Check the code style/quality for problems. |

You mostly only need **`npm run dev`**.

---

## 11. When something goes wrong (troubleshooting)

**"`npm` is not recognized" / "command not found"**
→ Node.js isn't installed or the terminal was open before you installed it. Install Node
(step 1a), then **close and reopen** the terminal.

**"Cannot find module" or weird missing-package errors**
→ You skipped `npm install`, or it didn't finish. Run `npm install` again.

**The page says "Missing Supabase URL/key" or login does nothing**
→ The `.env.local` file is missing or empty. Get it from whoever set up the project (step 4).
After adding/fixing it, **stop the app (`Ctrl+C`) and run `npm run dev` again** — env changes
only load on restart.

**"Port 3000 is already in use"**
→ The app is already running in another terminal. Either use that one, or stop it. To free the
port you can close the other terminal window. Next.js may also offer to use port 3001 — that's
fine, just open `http://localhost:3001`.

**I changed something and nothing updates**
→ For code changes, the dev server auto-reloads. For `.env.local` changes you must restart
(`Ctrl+C`, then `npm run dev`). In the browser, a hard refresh is `Ctrl + Shift + R`.

**The site is blank / spinner forever**
→ Check the terminal for red error text — it usually tells you the file and line. Also make
sure you have **internet** (the app needs to reach Supabase).

**I think I broke the data**
→ Don't panic. Restore steps are in [`docs/backups.md`](docs/backups.md). The cloud database
has backups (on the paid plan).

---

## 12. Where to learn more (the project's "brain")

- [`README.md`](README.md) — short project intro.
- [`PROGRESS.md`](PROGRESS.md) — what's built so far, phase by phase, + action items for you.
- [`CLAUDE.md`](CLAUDE.md) — the rules/overview for anyone (or any AI) building on this.
- [`docs/`](docs/) — deep docs: data model, order lifecycle, label spec, dashboard metrics,
  and [`docs/backups.md`](docs/backups.md) for backup/restore.

---

### TL;DR (the only 3 commands you really need)
```bash
cd "C:\Users\kaust\OneDrive\Desktop\TribeToy Dashboard"   # go to the folder
npm install                                                # first time only
npm run dev                                                # start it, then open http://localhost:3000
```
Log in, explore, and press `Ctrl + C` in the terminal to stop. That's it! 🎈
