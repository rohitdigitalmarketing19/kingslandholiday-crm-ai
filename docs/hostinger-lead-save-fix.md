# Hostinger lead-save fix — 30 October 2026

## Verified findings

The screenshot's “Failed to save lead. Please check network connection.” text is a frontend catch-all. It does not identify a network outage.

An isolated regression reproduced HTTP 403 for a signed-in administrator saving a lead with public Origin `https://crm.kingslandholiday.com` while the Node application received an internal Host header. The earlier origin check compared the public hostname only with that internal hostname. This is a confirmed application defect; the exact live response has not been observed because the live domain was unreachable from the diagnostic environment.

## Changes

- Accept the explicitly configured public `APP_ORIGIN` when hosting forwards an internal Host. Other origins remain rejected. Forwarded headers alone do not authorize an origin.
- Show the actual API rejection in the lead form. Expired sessions request sign-in; duplicate Trip IDs explain the conflict; network errors have a separate message. A failed request leaves the form filled.
- Use random UUIDs for generated lead identities and return HTTP 409 for duplicate Trip IDs without changing existing records.
- Frontend API calls explicitly include same-origin session cookies.

## Hostinger deployment

1. Back up the existing database and uploads. Preserve all current database/cloud configuration and credentials. The archive contains no database, credentials or customer documents. It does not provide persistent database storage by itself; retain the deployment's current persistent storage or configured cloud backup.
2. Upload the refreshed `kingsland-ai-crm-professional.zip` as **new source files** when redeploying, or deploy the updated source from your configured repository. Reusing the previously uploaded ZIP will continue to use the old code.
3. In the Node.js website dashboard, open **Environment variables**, add `APP_ORIGIN` with value `https://crm.kingslandholiday.com` (without quotes), and apply the change. `.env.example` is documentation, not live configuration.
4. Redeploy the updated application. The start command is `npm start` (`node server.js`). If using the supplied prebuilt bundle, both frontend builds and the backend bundle are already included. Install the root runtime dependencies using `npm ci --omit=dev`.
5. Refresh the CRM with Ctrl+Shift+R. Sign out and sign back in, then retry the saved form. The security update requires a server-issued session cookie; old local-storage login state is insufficient.
6. If saving still fails, the updated alert should display the actual server error. Capture the status and JSON response of `POST /api/leads` from browser Network tools; do not share passwords, cookie values or authorization tokens.

Hostinger documentation:
- https://www.hostinger.com/support/how-to-edit-or-add-environment-variables-after-deployment/
- https://www.hostinger.com/support/how-to-redeploy-a-node-js-application/

## Verification

`node --import tsx scripts/test-crm-hardening.cjs`: 39 passed, 0 failed, including public-domain save behind an internal Host, hostile origin rejection, spoofed forwarded-host rejection, duplicate Trip ID handling, authenticated sessions and payment caps.

A successful local reproduction and fix do not prove that the live deployment has been updated. The Hostinger environment change and deployment remain required.

## Follow-up: Hostinger 503 startup repair

The earlier archive placed `puppeteer-core` in devDependencies even though the server imports it during startup. A production-only dependency install could therefore fail before the server listens. The package now declares it as a runtime dependency and the lockfile is updated. Its installed version requires Node >=22.12.0; select Node 24 in Hostinger.

Hostinger managed Node.js apps expect port 3000. Set runtime variables `PORT=3000`, `NODE_ENV=production`, and `APP_ORIGIN=https://crm.kingslandholiday.com`. Use start command `npm start` (or `node server.js`). For the prebuilt ZIP use install command `npm ci --omit=dev`; a source rebuild needs development build tools installed before `npm run build`. The server now defaults to port 3000 in production when PORT is unset, explicitly binds to 0.0.0.0, and reports an unhealthy readiness status if initialization fails.

Back up the live database and preserve the configured persistent database path before redeploying. A 503 alone cannot distinguish missing modules, incompatible Node, wrong port, database initialization errors or hosting resource limits; the first runtime error is still needed to confirm the exact live cause.

Regression commands: `node scripts/test-production-dependencies.cjs` and `node scripts/test-production-startup.cjs`. The startup test installs production-only dependencies into a temporary folder, boots the actual built server against a new isolated database, checks frontend/health/protected API responses, and terminates only that test process.

Hostinger port/startup reference: https://www.hostinger.com/support/fix-failed-to-build-application-error-hostinger-node-js/

## Confirmed live failure from October 30 runtime logs

The supplied logs confirm `table booking_snapshots has no column named total_paise` as the startup crash. The older database stores `total_minor` and `snapshot_json`; CREATE TABLE IF NOT EXISTS did not upgrade it. The repair adds the missing columns, copies existing values only into empty aliases, and writes both layouts for future bookings, preserving the original amounts and accepted snapshots. No database reset or table deletion is required.

Schema initialization now runs in one transaction and persists once, rather than exporting a large database after each statement. The HTTP listener starts before cloud restore and migration; health reports 503 until initialization succeeds and API requests wait for initialization. On initialization failure health stays 503 and logs the error (the process remains available for diagnosis).

Verification: the isolated legacy migration test preserves original records, backfills existing bookings, accepts new quotes against the old NOT NULL constraints, repeats safely, and retains a synthetic 26 MB database fixture. Run `node --import tsx scripts/test-legacy-booking-migration.cjs` then `node scripts/test-production-startup.cjs --legacy` to boot the production bundle with that fixture.

Upload the newly rebuilt kingsland-ai-crm-professional.zip using Hostinger Upload new files and redeploy. Preserve the live database, Supabase configuration and uploaded documents. Existing deployments continue to fail until the updated server bundle is deployed.

