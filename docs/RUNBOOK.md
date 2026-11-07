# evisa.tv incident runbook

The site is the Coolify application `evisa` on `https://evisa.tv`. The database is `evisa-postgres` in the Evisa project. Passport files stay in that database (`stored_files`). Do not move them to an outside bucket.

## Backups

A local backup runs every 6 hours and keeps 14 days on the server disk. The first successful dump was about 40 MB at `/data/coolify/backups/databases/.../evisa-postgres-...`.

Restore test, on a new empty database, never on `evisa-postgres`:

1. Create a temporary Postgres database in Coolify.
2. Copy one `.gz` dump onto that database container.
3. Run `gunzip -c dump.gz | psql` against the temporary database.
4. Run `select count(*) from applications;` and confirm it matches production.
5. Delete the temporary database.

Download one dump to this computer once a week. That copy is still yours; it is not a third-party file host.

## Payments stopped

1. Confirm `PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`, `PAYMOB_HMAC_SECRET` and `PAYMOB_INTEGRATION_IDS` exist on the evisa application. `PAYMOB_INTEGRATION_IDS` is not set yet, so live checkout correctly reports that payments are not configured.
2. Create a new Paymob Online card integration. Do not reuse integration `2729467`.
3. Set the notification URL to `https://evisa.tv/api/payments/paymob` and the browser return URL to `https://evisa.tv/en-EG/payment/result`.
4. Put the new id in `PAYMOB_INTEGRATION_IDS` and redeploy.
5. Pay a small real amount, then refund it from the admin payment tab. The amount field is required and must be confirmed. Status `refunded` cannot be set by hand.

## Mail stopped

Pending mail is retried by `POST /api/cron/mail` with `Authorization: Bearer $CRON_SECRET`. Schedule that call, plus `/api/cron/payments` and `/api/cron/cleanup`, as Coolify scheduled tasks every minute, 15 minutes and one day. Until `CRON_SECRET` is set, those routes refuse the call. The admin alerts poll still retries a few messages when a staff member has the console open.

## Disk full

Passport bytes live in Postgres, so a full disk stops the database. Coolify already warns at 80 percent. Delete old Docker images from the Coolify cleanup task before deleting database files. Retention deletes passport bytes 90 days after an application is closed (`PASSPORT_RETENTION_DAYS`).

## Site down

1. `GET https://evisa.tv/api/health` must return `{"ok":true}`.
2. In Coolify, the application status should be `running:healthy`.
3. If the proxy was restarted, wait one minute and check again.
4. Roll back the application image from Coolify if the new deploy fails health.

## Still to do on the server, by hand

These change the live machine and were left for a person at the console:

- Apply the saved Traefik configuration and upgrade Traefik from 3.6.6 to 3.7. The saved and applied settings hashes differ, which is why the server row says attention is required. A proxy restart makes the site unreachable for a short time.
- Install the pending Ubuntu updates and turn on automatic security updates. There were 73 updates and no reboot required at the last check.
- Close public port 8000 after confirming `https://amail.bar` is the only way you open Coolify.
- Revoke the unused Root tokens named `api` and `grokbot`. Replace the `cursur1` Root token with a `read` token for review and a `deploy` token for releases.
- Add `staging.evisa.tv` DNS to this server, then create a second Coolify app from the `staging` branch with its own Postgres database and Paymob test keys.
- Turn on GitHub branch protection for `main` so a failed CI check cannot be merged.
