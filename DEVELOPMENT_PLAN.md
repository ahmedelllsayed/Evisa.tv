# evisa.tv development status

This replaces the older roadmap. The homepage and visa page layouts stay as they are. Passport files stay in the Coolify Postgres database.

## Done in the application

- Sign-in redirects reject control characters and off-site URLs (`src/lib/safe-path.ts`).
- A rejected document can be replaced by the customer after payment, for the same traveller and document type.
- The target date is recalculated when payment is confirmed, and unpaid drafts are not counted as late.
- The departure date uses the calendar day, and date plus express survive the sign-in round trip.
- A pending checkout older than 30 minutes, or one whose amount changed, no longer blocks a new checkout. An expired Stripe session is marked failed.
- Paymob checkout asks for a mobile number on the review step.
- `refunded` is not a manual status. Refunds require an amount and a confirmation, and they are written to the audit log.
- An admin cannot ban, demote or anonymise a super admin. Deleting a user hides the profile and refuses the action when payments exist.
- Only the account owner can edit a draft. Viewers and support cannot download other people's passports. Downloads are logged in `file_access_events`.
- Security headers include HSTS and a report-only content security policy.
- Uploads are checked from the file bytes, not the browser's declared type.
- Sign-in codes are limited per IP and per email, and resending a code does not reset the guess counter.
- Production refuses a short or example `AUTH_SECRET`.
- The `cn` package is replaced by a local helper. Unused chart and date packages were removed from `package.json`.
- Sample reviews can be flagged with `is_sample` and are excluded from the public rating. The approval sentence is site-wide and hidden below 20 decisions.
- Migrations run once. `0029` no longer overwrites edited permissions. `0013` no longer deletes fee history. `0019` no longer forces embassy visits onto edited rows.
- `POST /api/cron/{mail,payments,cleanup}` retries mail, expires stale checkouts, and deletes old passport bytes after the retention window.
- The container image has a health check.

## Done on the server

- `evisa-postgres` has a backup every 6 hours, kept 14 days on the server. The first dump succeeded.

## Still an operator task

See [docs/RUNBOOK.md](docs/RUNBOOK.md): Traefik apply and upgrade, Ubuntu updates, closing port 8000, replacing Root API tokens, `staging.evisa.tv`, GitHub branch protection, the new Paymob integration id, `CRON_SECRET`, and a one-week beta before calling the launch public.

Staff TOTP, support conversation threads and PDF receipts are prepared in the schema (`totp_secret`, `message_replies`) and are the next product increment. They are not switched on, because forcing TOTP would lock the current admin session before a setup screen is in use.
