# Payment workspace update — 31 October 2026

Active project: D:\kingsland-ai-crm\kingsland-ai-crm.

The payment desk now has a dashboard, searchable payment-link table, installment planner, completed receipt history, proof-review queue, create-link form, and a customer transfer page. The interface uses the existing theme tokens, explicit empty/loading/error states, mobile layouts, and a keyboard-operable confirmation dialog. Copy, WhatsApp, email, and customer-page preview remain available.

## Confirmed fixes

- Opening payment screens no longer recalculates or saves installment schedules. Saved booking totals take precedence over later quote options.
- Trip changes clear stale links; overlapping loads cannot replace the current trip with an older response.
- New manual receipts use an amount received now. The API receives its cumulative request amount, preserving existing receipt-service semantics.
- Customer proof amounts represent the individual transfer. Approval adds that amount to prior verified receipts once. An already recorded matching reference approves the proof without adding money again.
- Proof approval and receipt recording commit in one transaction. Approval does not permit a later status reset to erase verified money.
- Installment saves are atomic and batched. Removed unpaid schedule links are cancelled. Cancelled links cannot collect money. Duplicate or cross-booking payment keys are rejected.
- Payment-link amounts use minor-unit validation and may not exceed the linked booking's remaining balance.
- Public link lookup is read-only. Customer submission creates a pending-review record, never a staff confirmation. Invalid links show an error rather than a sample price.
- Dashboard requests deduplicate installment/link pairs. Sales overview results use assigned-owner scope. Confirmation uses the actual request owner rather than a caller-supplied lead override.

## Verification

`npx tsc --noEmit`, `npx vite build --configLoader runner`, and the backend esbuild bundle passed. Financial/API regression: `scripts/test-payment-workspace.cjs`. Real-browser regression: `scripts/test-payment-ui.cjs`. These CommonJS fixtures bundle with esbuild because the environment's direct tsx loader is unreliable. Fixtures use isolated temporary databases and block external browser requests.

The browser scenario covers desktop, 768px and 320px layouts, dark mode, 200% zoom, link creation, partial receipt recording, completed history, trip selection, proof submission and approval, invalid-link handling, and no automatic receipt from customer submission. Screenshots are in `tmp/payment-ui-qa`. Quotation-edit regression also passed after the payment changes.

## Integration boundary

UPI app deep links, bank details, customer-submitted transfer references, and staff verification are implemented. Automatic card checkout requires a server-created gateway order and verified provider response/webhook, which this repository does not implement. The customer page directs card-payment customers to their travel expert instead of claiming an unverified payment succeeded. No provider transaction was run and no live customer receipt was changed by the tests.

Customer design update: restored the previous Haveli cream, maroon, and gold payment page. It remains light inside the staff app's dark theme. Credit Card selection displays a 2.5% charge notice and a separate fee/total breakdown, calculated in paise on the remaining request amount. Card payment instructions do not create a mock transaction or invoke staff confirmation. Browser checks cover the notice, exact fee total, unchanged receipt/submission counts on card selection, and the preserved transfer-proof flow.
