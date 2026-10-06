# Visa platform (Atlys-style)

Next.js 16 app with a destination catalog, application wizard, payments, live tracking and an admin panel. Rebrand by editing `src/config/site.config.ts` and replacing files in `public/brand/`.

## Run locally

```bash
cd atlys-clone
cp .env.example .env.local
npm install
npm run db:migrate   # optional; PGlite auto-migrates on first request
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/en-EG`.

Without extra env vars the app uses:

- **Database:** embedded PGlite at `.data/pglite`
- **Auth:** email OTP (the 6-digit code is printed in the terminal and shown on the sign-in page in development)
- **Uploads:** `.data/uploads`
- **Payments:** mock checkout at `/en-EG/payment/mock`

`ADMIN_EMAILS` in `.env.local` (default `admin@example.com`) makes that account an admin after first sign-in. Open `/en-EG/admin`.

## Rebrand

1. `src/config/site.config.ts` — name, colours, market, contact, feature flags.
2. `src/config/fonts.ts` — swap Outfit/Playfair for licensed files if you have them.
3. `public/brand/` — logo, destination photos, flags.
4. `src/data/seed/` — destinations, FAQs, reviews, events. Then `npm run db:reseed`.

## Optional production services

| Feature | Env vars |
| --- | --- |
| Postgres / Supabase DB | `DATABASE_URL` |
| Supabase Auth + Storage + Realtime | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Stripe Checkout | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (webhook path `/api/payments/webhook`) |
| Paymob Intention | `PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`, `PAYMOB_HMAC_SECRET`, `PAYMOB_INTEGRATION_IDS`, optional `PAYMOB_API_KEY` for refunds (webhook path `/api/payments/paymob`) |
| Site URL | `NEXT_PUBLIC_SITE_URL` |
| Session signing (local auth) | `AUTH_SECRET` (required in production) |

Apply the SQL in `supabase/migrations/` to a Supabase project, then `supabase/seed.sql` if you want the catalog preloaded.

## Scripts

- `npm run db:migrate` / `db:reseed` / `db:seed-sql`
- `npm run ref:compare` — Playwright screenshots of local pages at 390 and 1440 widths (dev server must be running)
- `npm run typecheck`

## Deploy on Coolify

Do not commit `.env.local`. Live keys stay in Coolify’s environment settings, not in the image.

1. Push the repository. If the Git root is the parent folder, set the Coolify base directory to `atlys-clone`. The build pack is Dockerfile and the exposed port is `3000`.
2. Create a Postgres database in Coolify and set `DATABASE_URL` to its internal URL. The app applies `supabase/migrations` and seeds an empty catalog on first boot. PGlite is refused in production.
3. Add persistent storage mounted at `/app/.data/uploads` so passport files survive a redeploy.
4. Set `NEXT_PUBLIC_SITE_URL` to `https://<domain>` and mark it available at build time. Set `AUTH_SECRET` to a new long random value. Set `ADMIN_EMAILS` to the admin address.
5. Set `RESEND_API_KEY` and `RESEND_FROM` on a verified domain. Production does not show the sign-in code on the page, so email must be able to send it.
6. Point the Coolify health check at `http://localhost:3000/api/health`.
7. Copy the Paymob keys into Coolify and leave `PAYMOB_INTEGRATION_IDS` empty until a new card integration with channel Online exists. Do not reuse integration `2729467` and do not change the `evisa.tv` webhook or redirect URLs. After that integration exists, set its notification URL to `https://<domain>/api/payments/paymob` and the browser return URL to `https://<domain>/en-EG/payment/result`. Until then, production checkout reports that payments are not configured. `PAYMOB_API_KEY` is required for refunds. Confirmation matches the signed Paymob `order.id` stored as `paymob_order_id`, plus the currency. An amount, currency, or order mismatch returns HTTP 409 and records an internal event titled “Payment needs review”. It does not mark the application paid.
8. Supabase Data API policies live in migrations whose names include `supabase` (`0012_supabase_owner_security.sql`, `0014_supabase_requests.sql`). They are skipped on local PGlite. Apply the full `supabase/migrations` folder before exposing the Data API. The app itself uses `DATABASE_URL` and does not rely on those policies.
9. Local payment check, without Paymob: run `npm run dev`, sign in with the development code shown on the page, finish an application, and complete the mock checkout. The file should leave `draft`, appear in `/en-EG/admin/queue`, and lock travellers and documents. A second checkout for the same pending amount reuses the existing link. Production refuses the mock checkout.

Gilroy and Denton (used on the original site) are commercial fonts; this repo uses Inter, Outfit, Playfair Display, and Cairo for Arabic.
