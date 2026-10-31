# Razorpay card checkout

Active project: D:\kingsland-ai-crm\kingsland-ai-crm.

The customer page retains the cream/maroon/gold design. Selecting Credit Card displays a 2.5% notice. Proceed to payment loads Razorpay Standard Checkout using a server-created order. Prices are integer paise; the server calculates the remaining request principal and 2.5% charge and rejects a stale client amount. Credentials are read from Payment Settings; the secret stays on the server.

Payment verification checks HMAC-SHA256 against the stored order ID, retrieves the payment from Razorpay, checks order/amount/currency/card method, and captures an authorized payment before recording receipt. The booking receives only the principal; the surcharge and charged total remain in razorpay_orders. Duplicate callbacks and recoveries do not duplicate receipts. A public payment-link holder can recheck provider status using POST /api/payments/razorpay/reconcile; captured funds with an incompatible booking balance are retained as reconciliation_required rather than silently discarded or credited incorrectly. No state-changing GET endpoint was added.

Endpoints:
- POST /api/payments/razorpay/orders: payKey and expectedPrincipalPaise.
- POST /api/payments/razorpay/verify: payKey plus Razorpay order ID, payment ID, and signature.
- POST /api/payments/razorpay/reconcile: payKey, optionally orderId.

All customer operations are bound to the opaque payment-link key. Staff manual-confirmation endpoints retain login and ownership checks. Key rotation and abandoned checkouts with a changed balance require staff review. Webhooks are not configured by this change; the browser callback and server-side status reconciliation are implemented.

Verification: scripts/test-razorpay.cjs mocks only the provider boundary and exercises real persistence, signature checks, capture, price validation, replay protection, recovery, and reconciliation. scripts/test-razorpay-ui.cjs uses isolated data and a stub Razorpay SDK to check checkout opening from a logged-out customer page, the exact order and fee, verified callback processing, success display, and receipt idempotency. No real card was charged.

Live configuration check on 31 October 2026: a read-only request to Razorpay using the saved live-mode credential pair returned HTTP 401. Real checkout remains blocked until a valid matching Key ID/Key Secret pair is saved in Payment Desk → Gateway Settings. No live order or charge was created by this check.

Integration references:
- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps
- https://razorpay.com/docs/api/orders/create
- https://razorpay.com/docs/api/payments/capture/

This supersedes the earlier card-checkout-unavailable implementation note in PAYMENT_WORKSPACE.md: the integration is now implemented, but saved credentials need correction.

Checkout visibility fix: preload the Razorpay SDK when Credit Card is selected; show separate loading, order preparation, opening, open, and verification states; bound gateway API requests to 25 seconds; lift the provider container above CRM overlays; and release the action after a 10-second startup failure. The browser regression now loads its JavaScript externally so DOM text assertions inspect rendered UI only. It simulates an invisible checkout, verifies button recovery and same-order retry, and verifies successful receipt recording. The real existing INR 15,375 checkout was opened in Chrome and its visible provider iframe/container confirmed without entering card data or submitting payment.
