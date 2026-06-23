# TribeToy Dashboard — Deploy to Vercel (A–Z, beginner-friendly)

This guide takes you from "code on GitHub" to a **live URL anyone can use**, step by step.
You don't need to be a developer. Follow each step in order and don't skip the
**Environment Variables** part — that's the one thing people usually get wrong.

> **The big picture (read this once):**
> - Your **database, login system, and file storage** already live in the cloud on
>   **Supabase** (project `tribetoy-dashboard`, ref `itvjtmwteyqqakhtfajd`). Nothing to set up
>   there — it's already running with all your tables, orders and products.
> - **Vercel** will host the **website/app part** (the Next.js dashboard). When someone opens
>   your Vercel URL, the app talks to Supabase using 4 secret "environment variables".
> - So deployment = "put the app on Vercel + give it the 4 keys + tell Supabase the new URL".

**Total time:** ~15–20 minutes.

---

## What you need before starting

1. A **GitHub account** that can see this repo:
   `https://github.com/DebugNova/TribeToy-Sale-s-Dashboard`
   *(The code is already pushed there — see the bottom of this guide.)*
2. A **Vercel account** — free. Sign up at <https://vercel.com/signup> and choose
   **"Continue with GitHub"** (easiest — it links the two automatically).
3. Access to the **Supabase dashboard** at <https://supabase.com/dashboard> for the
   `tribetoy-dashboard` project (log in with the account that owns it).

---

## Step 1 — Collect your 4 environment variables

Open the Supabase dashboard for the project, then gather these **4 values**. Keep them in a
temporary note; you'll paste them into Vercel in Step 3.

| # | Variable name (type exactly) | Where to find it in Supabase |
|---|---|---|
| 1 | `NEXT_PUBLIC_SUPABASE_URL` | **Project Settings → Data API → Project URL**. It is `https://itvjtmwteyqqakhtfajd.supabase.co` |
| 2 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Project Settings → API Keys** → copy the **`anon` / publishable** key (a long string). This one is *public/safe*. |
| 3 | `SUPABASE_SERVICE_ROLE_KEY` | **Project Settings → API Keys** → copy the **`service_role`** key. ⚠️ **SECRET** — never share or put in the browser. |
| 4 | `INTAKE_WEBHOOK_SECRET` | This is **your own** secret (not from Supabase). Reuse the same value already in your local `.env.local`, **or** make a new strong one. To generate one: open a terminal and run `openssl rand -hex 32` (or any random 32+ char string). The website that sends orders must use the **same** value. |

> 💡 You can see the exact names anytime in the committed file `.env.example`.

> 🔎 **Tip:** the fastest way to copy 1–3 is to open your existing local file `.env.local`
> (in the project folder) — values 1, 2 and 3 are already in there from development. Value 4
> (`INTAKE_WEBHOOK_SECRET`) is also in there.

---

## Step 2 — Create the Vercel project (import from GitHub)

1. Go to <https://vercel.com/new>.
2. If asked, click **"Install"/"Configure"** to give Vercel access to your GitHub. Choose the
   account/org **DebugNova** (or wherever the repo lives).
3. In the list of repositories, find **`TribeToy-Sale-s-Dashboard`** and click **Import**.
4. On the configuration screen:
   - **Framework Preset:** it should auto-detect **Next.js**. Leave it.
   - **Root Directory:** leave as `./` (the app is at the repo root).
   - **Build Command / Output Directory / Install Command:** leave the defaults
     (`next build` / auto / `npm install`). You do **not** need to change these.
   - **Node.js Version:** the default (20 or 22) is fine for Next.js 16.
5. **Do NOT click Deploy yet** — first expand **"Environment Variables"** (next step).

---

## Step 3 — Add the 4 environment variables in Vercel

Still on the import/configuration screen (or later under **Project → Settings → Environment
Variables**):

1. For **each** of the 4 variables from Step 1, add a row:
   - **Key** = the variable name (e.g. `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value** = the value you copied
   - **Environments** = tick **Production**, **Preview**, and **Development** (all three).
2. Add all four:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `INTAKE_WEBHOOK_SECRET`
3. Double-check there are **no extra spaces** and **no quotes** around the values.

> ⚠️ If you miss `SUPABASE_SERVICE_ROLE_KEY`, the website **intake API** will return a 500;
> if you miss the two `NEXT_PUBLIC_*` keys, the app can't reach the database at all.

---

## Step 4 — Deploy

1. Click **Deploy**.
2. Wait ~1–3 minutes. You'll see the build log; it should end with **"Build Completed"** and
   confetti 🎉.
3. Vercel gives you a URL like `https://tribetoy-sale-s-dashboard.vercel.app`
   (your exact name may differ). **Copy this URL** — you need it for Step 5.

> If the build **fails**, jump to **Troubleshooting** at the bottom.

---

## Step 5 — Tell Supabase about your new URL (Auth settings)

So login and any email links work correctly on the live site:

1. In the **Supabase dashboard** → **Authentication → URL Configuration**.
2. Set **Site URL** to your Vercel URL, e.g. `https://tribetoy-sale-s-dashboard.vercel.app`.
3. Under **Redirect URLs**, add the same URL with a wildcard, e.g.
   `https://tribetoy-sale-s-dashboard.vercel.app/**`.
4. Click **Save**.

> Why: v1 login is email + password, so this is mostly belt-and-suspenders, but it's required
> if you ever use password-reset or email-confirmation links, and it avoids redirect warnings.

---

## Step 6 — Verify the live site works

Open your Vercel URL in a browser and check:

1. **You're redirected to `/login`** when not signed in. ✅
2. **Log in** with the founder account (`kaustab.borah44@gmail.com` + its password). You land
   on the Dashboard, and the top-right shows **Admin**. ✅
3. The **Dashboard shows numbers and charts** (it's reading the live Supabase data). ✅
4. Open **Orders** — your existing orders are listed. ✅
5. Create a quick **manual order** to confirm writes work end-to-end. ✅
6. **(Optional) Test the intake API** is reachable: visit
   `https://YOUR-URL/api/intake/website` in the browser. You should see a small JSON
   **405** "Method not allowed" message — **not** a login page and **not** a 404. ✅
   (A real signed POST is tested in `manual-test.md` Section 8 — just change `localhost:3000`
   to your Vercel URL.)

If all six pass, **you're live.** 🚀

---

## Step 7 — Point your website at the intake endpoint (when ready)

Your custom website should POST new orders to:
```
https://YOUR-VERCEL-URL/api/intake/website
```
with header `x-tribetoy-signature: <HMAC-SHA256 hex of the raw body, keyed with INTAKE_WEBHOOK_SECRET>`.
The request shape and a signing snippet are shown **inside the app** under
**Settings → Website intake**. The same `INTAKE_WEBHOOK_SECRET` must be set on both sides.

---

## Updating the site later (how redeploys work)

Vercel is now linked to GitHub. **Every time you push to the `main` branch, Vercel
auto-deploys** the new version. You don't repeat this whole guide — just:
```
git add -A
git commit -m "your change"
git push
```
Within a couple of minutes the live site updates. (Pull requests get their own preview URLs.)

If you change an **environment variable**, you must **redeploy** for it to take effect:
Vercel → your project → **Deployments** → top deployment → **⋯ → Redeploy**.

---

## Optional — a custom domain

1. Vercel → your project → **Settings → Domains → Add**.
2. Type your domain (e.g. `dashboard.tribetoy.com`) and follow the DNS instructions Vercel
   shows (usually adding a `CNAME` record at your domain registrar).
3. After it verifies, **repeat Step 5** with the new domain as the Supabase Site URL.

---

## ✅ Go-live security checklist (do these before real use)

These don't block the deploy, but do them before the dashboard becomes the real system of
record (full context in `AUDIT.md` §3.3):

- [ ] **Change the founder password** (the bootstrap one was shared in plain text).
- [ ] **Remove the 4 test staff users** `*.test@tribetoy.test` (weak shared password). In
      Supabase → **Authentication → Users**, delete each (their profiles auto-remove).
- [ ] **Rotate `SUPABASE_SERVICE_ROLE_KEY`** if it was ever pasted into a chat: Supabase →
      Project Settings → API Keys → roll the key, then update it in **Vercel** env vars **and**
      your local `.env.local`, and **redeploy**.
- [ ] **Enable leaked-password protection**: Supabase → **Authentication → Password security**.
- [ ] **Turn on automated backups**: Supabase → **Database → Backups** (requires the Pro plan;
      enable PITR). See `docs/backups.md`.
- [ ] Demo data: you chose to **keep the `DEMO-####` orders for now** (still testing). Clear
      them later with `delete from orders where order_no like 'DEMO-%';` (delete their
      `order_items` first) when you want a clean production slate.

---

## Troubleshooting

| Problem | Cause / Fix |
|---|---|
| Build fails with a TypeScript or module error | The same `npm run build` passes locally, so it's almost always a missing env var or a stale cache. Confirm all 4 env vars are set, then **Redeploy**. |
| Site loads but every page bounces to `/login` and login fails | `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is wrong/missing. Re-check Step 1–3, redeploy. |
| Login works but you see "Invalid login credentials" | Wrong password, or you're using a test user that was deleted. Use the founder account. |
| Intake API returns **500** "SERVICE_ROLE_KEY missing" | `SUPABASE_SERVICE_ROLE_KEY` isn't set in Vercel. Add it, redeploy. |
| Intake API returns **401** on a real POST | The website's signature doesn't match — the `INTAKE_WEBHOOK_SECRET` differs between the website and Vercel. Make them identical. |
| `/api/intake/website` shows the login page instead of 405 | Shouldn't happen (it's exempted in the proxy), but if it does, confirm you deployed the latest `main`. |
| Changed an env var but nothing changed | Env var changes require a **manual Redeploy** (see "Updating the site"). |
| Dashboard numbers look off | Revenue **excludes** cancelled/refunded orders, and "today" is **IST** — this is by design. |

---

## Appendix — the code is already on GitHub

The repository is pushed to:
```
https://github.com/DebugNova/TribeToy-Sale-s-Dashboard   (branch: main)
```
Vercel imports straight from there. Note that `.env.local` is **gitignored** and is **not** in
the repo (that's why you set the env vars in Vercel manually). The safe template `.env.example`
**is** in the repo so you always know which 4 keys are needed.
