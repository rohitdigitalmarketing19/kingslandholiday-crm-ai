# CRM workflow audit — 29 October 2026

Status: BLOCKED for production use. The requested audit is complete within the scope below; the CRM is not fully reliable.

## Evidence and scope

[DATA] Actual project: `D:/kingsland-ai-crm/kingsland-ai-crm`.

[DATA] Final automated workflow audit: **32 passed, 5 failed, 37 checks**. The non-zero audit exit code is intentional because release-blocking checks still fail.

The test starts the actual Express route modules and production React build against a new temporary SQLite database. It creates synthetic customers and exercises real persistence, quoting, conversion, operations, payments, vouchers, itineraries and Accounts. Nothing is mocked inside those workflows. The UI is opened in headless Chrome. Cloud synchronization is disabled and no email, WhatsApp message, real payment or third-party provider action is sent.

Full results: `D:/kingsland-ai-crm/kingsland-ai-crm/tmp/crm-health/2026-10-29T11-14-38-741Z/results.json`. Screenshots of Accounts, Operations, Payment Desk, Invoices and Hotel Rates are in the same folder. Detailed console log: `tmp/crm-health/final-audit.log`.

## What passed

- Lead creation/reopening, traveller details, follow-up date and saved note.
- Quote saving/reopening with two hotels, meal plans and four itinerary days.
- Conversion creates one operations booking, preserves identity and booking value, and does not duplicate on repeated conversion.
- Operations driver, cab, remarks and hotel/cab costs save and reopen.
- Two installment rows total INR 10,000. Customer-submitted receipt stays Pending Review. Manual advance/balance confirmations synchronize Sales and Operations. Repeating the same tested confirmation does not double the stored amount.
- Hotel voucher generation now uses the quoted meal plan and individual hotel check-in/check-out dates. Missing documents are rejected. Actual PDF data can be attached and the voucher readiness flag then saved.
- Day-wise activity updates persist; completed bookings are available to Accounts.
- Accounts, Hotel Rates, Operations, Payment Desk and Invoices screens render without a browser crash. An unpaid completed booking is no longer labelled fully collected.

## Reproduced blockers still open

1. **P0 — Anonymous lead data is refused**

   `The expression evaluated to a falsy value:    assert.ok([401,403].includes((await call('/leads','GET',undefined,true)).status)) `

2. **P0 — Anonymous database backup download is refused**

   `The expression evaluated to a falsy value:    assert.ok([401,403].includes((await call('/settings/backup/download','GET',undefined,true)).status)) `

3. **P1 — Partial receipt is not marked as full payment**

   `A receipt of 100 on a 1000 request was marked Paid`

4. **P1 — Total booking collections cannot exceed the converted amount**

   `Additional collection accepted after the 10000 booking was fully collected`

5. **P1 — Lead without a quote cannot convert**

   `The expression evaluated to a falsy value:    assert.ok((await call('/leads/qa-noquote/status','PATCH',{status:'Closed Won'})).status>=400) `

These failures mean an anonymous caller can still read lead records and download a database backup; a partial receipt can be marked Paid; separate requests can collect beyond a booking's amount; and a lead can convert without a quote. Hiding controls in the frontend does not repair these server-side problems. The current identity-header mechanism is not a signed server session.

## Repairs made and verified

1. Removed automatic operations-history deletion when a lead no longer matches the converted status filter.
2. Preserved the operations booking value already captured at conversion instead of overwriting it whenever a quote is edited.
3. Removed automatic sample operations/customer/itinerary seeding from list requests.
4. Corrected hotel voucher dates from each hotel's selected nights and used its quoted meal plan.
5. Required an attached PDF/image URL or document data before marking a voucher Uploaded.
6. Blocked hotel-voucher readiness while required voucher documents are missing; rejected feedback scores outside 0–5.
7. Removed stored passwords from user API responses and existing-password display in User Management. Password storage/login architecture still needs hardening.
8. Rejected confirmations for missing payment requests and amounts exceeding the individual request. This is not yet an aggregate booking-level over-collection guard.
9. Removed fabricated Accounts revenue/paid-installment fallbacks and synthetic completed-lead settlements. Displayed collection totals now use explicitly Paid installment rows; expected booking value remains separate. The cash-difference metric is labelled “Collected less supplier payments”.

## Other verification commands

[DATA] All passed:

```
npm run build
node --import tsx scripts/test-hotel-options.cjs
node --import tsx scripts/test-hotel-rates.cjs
node scripts/test-hotel-options-editor.cjs
node scripts/test-proposal-pdf-preview.cjs
```

The proposal PDF test verified preview/download consistency in all six themes and long hotel tables. It is not evidence that an invoice's legal/tax fields, numbering, historical snapshots or delivery are correct.

To reproduce the full audit:

```
node --import tsx scripts/check-crm-workflow.cjs
```

This command creates its own temporary test database and deliberately exits with code 1 while any recorded blocker remains.

## Practical limits and next priorities

- P0: implement server-verified sessions and per-route/per-record authorization; protect backups, user administration, payments and document access. Preserve the approved public customer endpoints deliberately.
- P1: converge customer receipts on a transactional, auditable ledger; correct partial receipt states, booking-level caps, correction history and idempotency across both desks.
- P1: implement explicit proposal acceptance and immutable booking snapshots, then enforce conversion eligibility. A quoted amount alone is not accepted commercial evidence.
- Review supplier payout caps, cancellation/reversal handling and historical voucher changes separately; the current happy-path tests do not prove these invariants.
- NEEDS DATA: real gateway sandbox/webhook evidence, SMTP/WhatsApp delivery evidence, approved invoice identity/tax configuration and a supported production database/concurrency test setup. No external provider or statutory invoice correctness is certified by this audit.

Regression risk: existing records are retained, but the fixes intentionally change previously incorrect dates, display amounts and validation behavior. Existing stored passwords and frontend caches from earlier sessions may still contain previously exposed values. The remaining P0/P1 findings prevent a production GO, despite the successful build and normal workflow tests.
