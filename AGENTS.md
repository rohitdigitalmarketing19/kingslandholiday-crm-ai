AGENTS.md — Kingsland AI CRM

Repository-wide operating instructions for AI coding agents and human contributors. Read this file completely before analysing, editing, generating, or deleting code.

Document alignment note: the workflow/screen map in this file was updated from the product owner's current Kingsland CRM screenshots and voucher reference. Treat it as approved product/UI intent; verify repository implementation before reporting a feature as working.

Mission

Build and finish Kingsland AI CRM, a single-agency, desktop-first Travel CRM for Indian travel sales, payments, operations, supplier coordination, trip execution, and account-closing work.

The current application and repository may still use the product name TripOps in code or historical documentation. Treat TripOps as the current repository/application name until the user explicitly authorises a repository-wide rename. Do not perform a cosmetic rename as part of unrelated work.

The product owner has supplied an approved CRM workflow/wireframe through current project screenshots. Those screenshots are authoritative for product intent and screen relationships, but they are not proof that the corresponding backend, permissions, integrations, calculations, or edge cases work correctly. Before calling a screen or feature Current, verify it in the repository and through tests/manual execution.

The approved operational chain is:

Lead → Follow-up / Qualification → Itinerary & Proposal → Conversion / Booking → Customer Payment & EMI → Invoice → Operations Handoff → Hotel/Cab/Vendor Fulfilment → Voucher Delivery → Pre-Trip Readiness → Day-Wise Trip Execution → Completed Trip → Accounts & Settlement → Review / Closure

The wider product journey remains organised into seven business stages:

Lead ingestion and qualification → Quoting and proposal generation → Deal closure and customer payments → Controlled Sales-to-Operations handoff → Logistics, vendor payments, and vouchers → Trip readiness and execution → Post-trip review and accounts closing

The application is an internal travel-agency operating system, not a generic CRM, public OTA, GDS, inventory engine, full statutory accounting suite, or multi-tenant SaaS platform.

The winning behaviour is simple:

Capture an enquiry quickly.

Keep the lead owner, follow-ups, notes, status, itinerary, proposal, and customer communication context together.

Convert only an accepted commercial offer into the authoritative booking chain.

Preserve agreed customer revenue as an immutable booking/commercial snapshot.

Keep customer collections separate from supplier/vendor payouts.

Track installment schedules, verified receipts, invoices, hotel/cab fulfilment, vouchers, readiness, live-trip work, completion, and account closing without losing identity or history.

Surface today’s work and exceptions without requiring staff to remember them.

Preserve one authoritative identity chain across Sales, Payments, Operations, Invoices, Vouchers, Accounts, and post-trip records.

Authority and conflict resolution

Use this order when requirements conflict:

The user’s current explicit instruction.

This AGENTS.md.

PRODUCT.md.

DESIGN.md.

Approved architecture, gap-analysis, and PRD documents.

Tests and migrations.

Existing implementation.

Old screenshots, exploratory wireframes, market examples, and historical notes.

Tests and existing code are evidence of current behaviour, not automatic proof that the behaviour is correct.

When two sources conflict:

Identify the conflict before changing code.

Follow the highest-authority source.

Preserve valid production data.

Update code, tests, and affected documentation together.

Record any unresolved product decision as:

NEEDS DATA: <specific decision, owner, and evidence required>

Do not silently choose a money, permission, tax, lifecycle, or data-migration rule.

Existing-project rule: inspect and repair before expanding

This is an existing, partially implemented application. Do not rebuild it from scratch and do not replace working architecture merely because another stack is familiar.

For every broad task such as “fix the CRM,” “complete the flow,” or “continue development”:

Inspect the repository and establish a baseline.

Reproduce and fix existing defects in priority order.

Verify the complete affected workflow.

Continue to the next documented blocker or incomplete MVP requirement.

Stop only when the requested scope is complete or a real blocking decision/data dependency exists.

Never stop after making one page load or one test pass when the requested workflow remains broken.

Required preflight

Run and inspect, as applicable:

git status --shortgit diff --statgit diffphp artisan aboutphp artisan routephp artisan migratecomposer check-platform-reqsphp artisan test./vendor/bin/pint --testnpm run build

Also inspect:

composer.json and composer.lock

package.json and the lockfile

.env.example only, never secrets from .env

migrations and pending migrations

policies, middleware, observers, services, enums, routes, and relevant Livewire components

existing tests for the requested workflow

PRODUCT.md, DESIGN.md, architecture documents, gap analysis, and current audit notes

Do not overwrite or revert pre-existing uncommitted work unless the user explicitly authorises it.

Priority order

Work in this order:

P0 — security, exposed credentials, destructive data behaviour

P1 — money, permissions, lifecycle integrity, concurrency, data corruption

P2 — broken end-to-end core flow and missing MVP requirements

P3 — accessibility, usability, responsive behaviour, performance

New enhancements explicitly approved by the user

Product boundary

Product identity and status language

Use these terms consistently:

Kingsland AI CRM — the full product and approved operating workflow.

TripOps — the current repository/application name where it still exists in code or historical documents.

Verified Current — behaviour reproduced from the repository and verified against the Definition of Done.

UI-approved / Observed — a screen, control, or workflow supplied by the product owner as the approved product direction, but whose backend correctness has not yet been verified.

Partial — a capability exists but is incomplete, inconsistent, insecure, or does not cover the full approved workflow.

Planned — approved direction that is not yet present in the application.

NEEDS DATA — a business, money, tax, permission, lifecycle, AI, integration, or migration decision that must be resolved before safe implementation.

Never convert UI evidence into a false implementation claim. A screenshot can prove intended fields, layout, actions, and workflow placement; it cannot prove authorization, persistence, gateway verification, calculations, database constraints, concurrency safety, or external delivery.

Current release reliability scope

Audit and make reliable, where present in the repository, the following approved product surfaces:

Authentication, active-user control, role/mode access, and User Management

Dashboard / Performance Matrix

New Inquiry Center

All Leads / Active Pipeline and lifecycle filters

Follow-ups workspace

Proposal / quotation workflow and PDF output

Saved Itinerary / Package Template Library, including manual and AI-assisted generation where actually implemented

Sales Team / Sales Experts and lead assignment

Payment Desk:

Payment Links

EMI & Installments

Confirmation

Submissions & UTR

Create Payment Link

Customer payment portal / portal preview where implemented

Payment Settings

Invoice Creation & Printing Hub

Operations:

Converted Leads Operations Management

Pending Vouchers

Uploaded Vouchers

Upcoming Trips & Pre-Trip Readiness

Day-Wise Trip Itinerary Tracker

Operations Payment Management

Completed Trips & Post-Travel Audit

Hotel-Side Vouchers Desk

Official Hotel Confirmation Voucher preview / PDF delivery

Accounts & Settlement Desk and booking-level financial audit details

Protected documents, cancellation, customer aggregation, feedback/review state, and historical records

Role model

The approved UI exposes Admin plus dedicated operational surfaces for Sales, Operations, and Accounts, and also shows an Editor/mode concept. Do not assume the exact role matrix from labels alone.

Before changing authorization:

Inspect existing users, roles, policies, gates, middleware, and permission storage.

Map each UI action to the exact server-side ability.

Preserve least privilege.

NEEDS DATA: if the repository does not already define it unambiguously, obtain the approved permission matrix for Admin, Editor/mode, Sales, Operations, Accounts, and any other role exposed by the UI.

Manual-first and integration-boundary behaviour

Supplier inventory and supplier booking remain external unless a verified integration exists.

The CRM may expose approved integration surfaces such as payment links, Razorpay settings, UPI/customer payment pages, WhatsApp share actions, email actions, and AI itinerary generation. For every such surface:

verify whether it is a real integration, a deep link/manual helper, a demo surface, or an incomplete stub

never fake a successful external action

never mark money received from an unverified customer claim

never expose provider secrets to the browser

never claim WhatsApp/email delivery unless the application or provider confirms it

never claim AI output is authoritative business truth

keep the human-verifiable record and audit trail inside the CRM

Not in the current release unless explicitly approved

Do not start or expand:

multi-agency or multi-tenant architecture

subscription billing

native mobile application

GDS, BSP, OTA, or supplier inventory synchronization

Tally replacement, statutory bookkeeping, or tax-filing automation

automated refund calculation or legally binding tax/refund advice

autonomous agents that change lifecycle, money, permissions, or customer communication without review

broad marketing automation unrelated to the active booking workflow

a public consumer booking engine beyond an explicitly approved payment/confirmation surface

If dormant fields such as agency_id already exist, leave them inert. Do not build tenancy scoping, tenant middleware, branding, or tenant administration around them.

Existing expanded features

Do not delete an implemented feature merely because it exceeded an older MVP document. The approved screenshots show that the product has expanded beyond the original booking-desk scope.

Instead:

verify the feature end to end

keep it connected to the canonical booking identity

harden security and money rules before visual expansion

hide or disable a broken/incomplete action rather than pretending it works

do not duplicate customer collections, vendor payouts, or trip identities into competing data models

remove a feature only with explicit user approval and migration/data-impact review

3.1 Approved CRM workflow and screen map

The approved product workflow is lifecycle-first. Sidebar order is navigation; it is not the business process.

Stage 1 — Lead ingestion and qualification

Approved screens:

Dashboard / Performance Matrix

New Inquiry Center

All Leads / Active Pipeline

Follow-ups

Sales Team / Sales Experts

User & Role Permission Management supports access control across the workflow.

New Inquiry captures, as shown in the approved UI:

Trip ID

lead source

customer name

phone / WhatsApp

destination

travel date

days / nights

traveller matrix

hotel preference/category

stay preference

transport/vehicle preference

flight preference

special requirements/comments

English-speaking driver requirement

assigned sales expert

Approved lead actions include:

Save Lead Directly

Preview AI Assessment where implemented

Save & Give Quote

Lead pipeline UI includes filters and status buckets such as Active Leads, Update Lead, Hot Lead, Postponed, In Process, Converted, and Cancel.

Do not infer database enums directly from these labels. Existing canonical lifecycle rules in section 4 remain authoritative until an explicitly approved migration changes them.

Follow-ups are organised by Overdue, Today, Tomorrow, Upcoming, and Completed, with agent and search filters.

AI lead/intent assessment, if implemented, is advisory only. It must not silently change lifecycle state, assignment, price, or customer communication.

Stage 2 — Itinerary, quoting, and proposal generation

Approved supporting screen:

Saved Itinerary / Saved Package Templates

Observed controls include:

search by destination/title

View Itinerary

Add Manual Itinerary

Generate with AI

API Key Settings

Saved itinerary templates are reusable sales assets. They support proposal/quote creation; they are not themselves the authoritative accepted commercial booking.

The proposal lifecycle remains critical even though the current screenshot set does not include the detailed proposal editor. Verify the repository implementation for proposal creation, revision, acceptance, PDF generation, parallel quote/version rules, and booking conversion.

AI itinerary generation rules:

AI output is a draft/recommendation, never an authoritative price, booking, supplier confirmation, or lifecycle state.

Do not expose provider/API secrets to the browser or logs.

Human review is required before an AI-generated itinerary becomes a customer-facing proposal.

NEEDS DATA: approved AI provider, key-storage approach, retention/privacy terms, model-cost limit, supported languages, and required human-review workflow if the repository does not already resolve them.

Stage 3 — Deal closure, customer payments, and invoice

Approved screens/states:

Payment Desk / Active Payment Links

Create Payment Link

Customer Payment Portal / Portal Preview

Razorpay & Bank Settings

Invoice Creation & Printing Hub

Payment Desk navigation observed in the UI:

Links

Installments & EMI

Confirmation

Submissions

Create Link

Portal Preview

Settings

Approved payment-link actions include Copy, WhatsApp, Email, Pay Now, and Confirm EMI Received.

Create Payment Link captures booking/lead association plus package, customer, destination, travel date, duration, and commercial/payment details as implemented.

Customer-facing payment UI may expose UPI/card/netbanking options, amount, GST, processing fee, and total payable. Treat the payment page as an external/customer-facing security boundary.

Invoice Hub includes:

customer auto-fill/manual entry

booking/invoice reference

trip dates/place of supply

traveller/passenger list

GST mode

service/SAC rows

company GST/PAN/address/terms

live invoice preview

Download PDF

Print Invoice

Share WhatsApp

Customer collection, installment schedule, gateway/payment-link state, customer-submitted UTR/reference, and verified money received are separate concepts. Never collapse them into one status.

Stage 4 — Controlled Sales-to-Operations handoff

Approved screen:

Converted Leads Operations Management

The Operations queue may show:

total revenue

received revenue

overdue installments

pending balance

EMI breakdown

customer/payment/trip/destination filters

All Sales, Payment, Invoice, and Operations views must read the same authoritative Lead → Proposal → Booking → Payment → Trip identities. Do not create a second ops customer/booking database where permission-scoped views of the same records are sufficient.

NEEDS DATA: if not already explicit in code/product rules, determine the exact handoff trigger: booking creation, verified advance, configured minimum/percentage, or manual approval; who can reverse it; and which commercial fields lock at handoff.

Stage 5 — Logistics, vendor payments, and vouchers

Approved screens/states:

Operations Hub / Multi-Hotel & Cab Driver Payment Tracker

Hotel-Side Vouchers Desk

Uploaded Hotel Vouchers Library

Official Hotel Confirmation Voucher preview / PDF state

Operations Payment Management includes:

trip selector

hotel-wise package breakdown

hotel cost, paid, balance

full payment and partial payment controls

driver and vehicle assignment

driver contact

cab/driver cost, paid, balance

payment timestamp

payment mode

UTR/reference

internal operations remarks

Hotel-Side Vouchers Desk includes:

active packages

package hotels

vouchers received

awaiting-from-hotel count

missing vs attached/verified filters

travel-month and destination filters

booking-level hotel voucher status

The internal voucher flow is:

Hotel confirmation/document received → attach to booking/hotel → verify → internal Uploaded Vouchers Library → customer-ready Official Voucher preview/PDF → send/download/print → delivery state

The supplied voucher reference shows a customer-ready confirmation document containing hotel details, booking/voucher number, guest, check-in/check-out, pax, nights, room, meal plan, inclusions, payment status, policies, and reservation-confirmed state. Treat voucher content as booking-linked output, not free-floating files.

Customer collections and supplier/vendor payouts must never share one ledger or one meaning of Paid.

Stage 6 — Pre-trip readiness and live trip execution

Approved screens:

Upcoming Trips & Pre-Trip Readiness

Day-Wise Trip Itinerary Tracker

Upcoming Trips includes readiness states such as:

All Upcoming

Pending Actions

100% Departure Ready

The readiness view should be derived from real booking obligations such as required travel documents/vouchers, hotel/cab confirmation, assigned driver where required, payment/handoff rules, and pre-trip actions. Do not mark a trip Departure Ready from a decorative checkbox alone if mandatory dependencies are incomplete.

Day-Wise Trip includes:

trip/date/status/search filters

Share Itinerary

Print Day Schedule

hotel payment status

cab payment status

operational remarks

day-by-day expandable itinerary/activity rows

driver information where available

The day-wise operational plan must remain linked to the accepted booking/proposal itinerary while allowing operational details/remarks that do not mutate the historical accepted commercial offer.

Stage 7 — Completion, review, accounts, and closure

Approved screens/states:

Completed Trips & Post-Travel Audit

Accounts & Settlement Desk

Booking-level Accounts Financial Audit Details

Completed Trips includes:

completed-trip count

rating/average rating presentation

guest/trip/date/contact context

lead/trip remarks

Share Summary

Request GMB/Google review action where implemented

review-request state

Accounts & Settlement includes:

completed customer inflows

hotel paid amount

cab & driver outflow

net realised operational margin/profit presentation

month/destination/search filters

booking-level inflow/outflow/margin rows

Itinerary PDF / Details

Export Accounts Ledger

Booking audit detail includes:

gross customer inflow

total vendor/supplier outflow

realised gross margin

customer payment/installment rows

hotel/vendor disbursements

cab/driver settlement

payment date/mode/reference/status

View Itinerary PDF

Print Audit

Accounts is a reconciliation/operational gross-margin view, not automatically a statutory accounting profit statement. The meaning of displayed margin must be derived from verified, complete customer collection and vendor-cost data under approved tax/refund/discount rules.

3.2 Cross-module alignment rules

Use this separation everywhere:

Payment Desk = customer receivables and collection verification.

Operations Payment Management = hotel, cab, driver, and other supplier/vendor payouts.

Accounts & Settlement = reconciliation of completed/eligible booking inflows versus verified operational outflows.

Hotel-Side Vouchers = supplier-side document collection and verification.

Uploaded Vouchers Library = internal verified voucher repository/customer-delivery workflow.

Official Voucher Preview/PDF = customer-ready output for one booking/hotel.

Saved Itinerary = reusable sales content.

Day-Wise Trip = operational execution of an actual booking.

User Management = authorization source; Sales Team = sales roster/performance/assignment surface.

Do not create duplicate records merely because two desks need different views. Prefer one authoritative booking identity with permission-scoped read/write models.4. Canonical lifecycle and invariants

The lifecycle chain is the product. A downstream record must always retain its upstream identity.

4.1 Lead

Canonical pipeline:

New → Contacted → Qualified → Proposal Sent → Won

Valid terminal or holding outcomes:

Lost

Postponed

Rules:

Lost requires a reason.

Postponed requires a follow-up date.

A postponed lead may return to an active state through an explicit transition.

A lead must not become Won through a free-form status edit.

A lead becomes Won only as a derived consequence of a proposal being accepted. Acceptance is the moment the deal is won commercially; booking conversion is the operational step that follows it. Won is therefore never a manual choice — the only way to reach it is to record an acceptance on a sent proposal, and booking conversion requires the lead to already be Won.

Direct database writes, seeders, factories, imports, and tests must not bypass lifecycle invariants.

Early customer cancellation creates a cancellation record linked to the lead and closes the lead using the canonical lost/cancelled mapping already approved by the domain. Do not invent a second competing status model.

Status changes must be auditable with actor and timestamp.

Lead creation must remain compact enough to support the product target of under two minutes. This is a target, not a proven claim until timed with real users.

4.2 Proposal

A proposal must belong to a lead.

Rules:

A proposal may be created only for an eligible lead.

Proposal states are explicit and enforced, not arbitrary strings.

Draft, Sent, Accepted, Rejected, Needs Revision, and Superseded behaviour must be consistent across model, service, UI, and tests.

Marking a proposal Sent updates the lead to Proposal Sent when valid.

Only the current eligible version may be accepted.

Revising a proposal creates a new version; it never overwrites the historical version.

Historical versions are immutable and read-only.

Revision creation, old-version superseding, and status updates occur in one database transaction.

If parallel quote options/groups exist, version history is scoped by both lead and quote group. Option A v2 must not replace or hide Option B v1.

Booking conversion must select one accepted proposal version unambiguously.

Proposal totals shown in UI, PDF, booking conversion, dashboard, and customer revenue must come from one authoritative pricing contract.

Do not silently change a pricing formula. Any formula change requires tests, migration/data-impact review, and explicit documentation.

The PDF filename is:

Proposal-{LeadCode}-v{version}.pdf

Do not create hidden database state from a PDF download request.

4.3 Booking

A booking must be created only from an accepted proposal.

Rules:

Conversion runs inside a database transaction.

Lock the relevant lead/proposal rows so duplicate concurrent conversion cannot create multiple bookings.

One lead has at most one active booking in the current release.

The booking stores an immutable commercial snapshot of the accepted proposal, including the accepted total and relevant tax/discount metadata.

Later proposal edits must never change an existing booking’s total, pending balance, dashboard totals, invoice data, or customer revenue.

Booking creation creates or guarantees the corresponding trip record.

Lead, proposal, booking, and trip states must not contradict one another.

Canonical relationship:

Accepted Proposal → Confirmed Booking → Trip

4.4 Payments

Customer payment handling may include manual entries, installment schedules, payment links, gateway events, customer-submitted transaction references, and authorised manual confirmation. These are different states and must remain distinguishable.

If the implementation uses an append-only payment_entries or equivalent ledger, preserve it. Do not replace financial history with editable "paid amount" fields.

Authoritative money rules:

Use decimal database types or integer minor units. Never use floating-point arithmetic for money.

The immutable booking/commercial snapshot is the maximum customer liability unless an explicit authorised adjustment/credit/refund model changes it.

An EMI/installment schedule represents expected amounts/dates. It is not proof of receipt.

A generated payment link represents a collection request. It is not proof of receipt.

A customer-submitted UTR/reference represents a claim/submission. It is not proof of receipt.

A gateway callback/event represents provider evidence only after signature/authenticity checks and idempotent processing.

A manual "Confirm EMI Received" or equivalent action must require an authorised user, record actor/time/reference/reason, and preserve audit history.

Derive received/payment state from valid verified non-voided financial entries:

Pending: verified received amount is zero

Partial: verified received amount is greater than zero and less than the booking snapshot total

Paid: verified received amount equals the booking snapshot total

Non-voided verified receipts must never exceed the immutable booking total except through an explicitly modelled authorised adjustment/refund/credit flow.

Validate and insert/confirm payments inside a transaction while holding the appropriate booking/aggregate lock.

Gateway/webhook processing must verify signatures, use provider event/payment IDs for idempotency, tolerate retries/out-of-order callbacks where the provider contract requires it, and never create duplicate receipts.

Manual confirmation and gateway confirmation must converge on the same authoritative ledger rather than two competing totals.

Voids/corrections must preserve history and identify actor, time, amount, original entry, and reason.

Do not hard-delete financial entries.

Record amount, payment date, method, reference/provider IDs, actor, notes, and verification source where applicable.

Do not store card numbers, CVV, UPI PINs, bank passwords, or customer banking credentials.

Razorpay/API secrets and other provider credentials must be encrypted at rest where stored, server-side only, masked in UI, excluded from logs, and never embedded in client JavaScript or generated customer pages.

Payment Settings may store approved bank/UPI/payee configuration, but editing those values must be restricted and audited.

Processing fee, GST/tax, and fee ownership must come from approved configuration/snapshots. Never hard-code a rate because it appears in a screenshot.

Dashboard and Accounts pending/received amounts must use the immutable booking snapshot and authoritative verified ledger.

Refund status and refund amount must be explicit records. Do not infer a refund from cancellation alone.

NEEDS DATA: if the repository does not already define them, confirm gateway environment/merchant account, fee ownership, refund rules, manual verification roles, installment rescheduling/late rules, link expiry, webhook signature contract, and customer-facing privacy/terms.4.5 Trip

The approved operational lifecycle is broader than the original four-state trip model.

Conceptual progression:

Booking Confirmed → Operations Handoff → Services/Vendors In Progress → Required Documents/Vouchers Ready → Departure Ready → In Transit / Day-Wise Execution → Trip Completed → Accounts/Operational Close

Do not rename existing enums or migrate historical states merely to match these labels. First map the approved workflow to the actual repository states and identify gaps.

Rules:

Enforce valid transitions centrally.

A cancelled booking cannot continue through fulfilment, readiness, live-trip, or completion states.

Booking must not become Completed while its trip remains incomplete.

Trip completion and booking completion must remain synchronized in one controlled transaction where the existing domain requires both.

Completing the trip creates or updates the customer exactly once.

Completion is idempotent; retries must not duplicate customers, revenue, trips, audit rows, or review prompts.

Operations handoff, voucher readiness, vendor payment status, and customer payment status must remain separate dimensions unless the approved transition contract explicitly combines them.

Departure Ready must not be set if mandatory approved dependencies are incomplete.

Day-wise operational updates may add execution details, driver assignment, notes, and activity status without mutating the historical accepted proposal/commercial snapshot.

Trip documents and vouchers remain attached to the authoritative booking/trip chain.4.6 Customer

A customer is created or updated after a completed trip.

Rules:

Do not match customers using raw phone-string equality.

Store the original phone value and a canonical normalized value.

Normalize Indian and international phone numbers through one tested service.

Use a database uniqueness strategy that supports safe concurrent completion.

Do not catch a PostgreSQL unique violation and continue querying in the same failed transaction without rollback or a savepoint.

Recompute or update total_trips and total_revenue from completed booking snapshots, not live proposal values.

Customer aggregation must be idempotent.

4.7 Feedback

Rules:

Feedback belongs to one completed trip.

One trip has at most one active feedback record.

Ratings are validated within the supported range.

Feedback may be absent after trip completion; the UI should show it as pending rather than inventing a rating.

Feedback data must not silently trigger testimonial publishing or marketing automation.

4.8 Cancellation

Support both stages:

Pre-booking cancellation

linked to the lead

reason and cancellation date required

no invented financial impact

lead is closed through the approved canonical state mapping

Post-booking cancellation

linked to the booking

booking becomes Cancelled

trip can no longer advance

refund amount and status are recorded manually

supplier cancellation notes may be stored as plain operational notes

The displayed default policy is reference text only. Do not auto-calculate a legally binding refund from it.

If one table supports both lead and booking cancellation, enforce that exactly one parent is present with validation and a database check where practical.

4.9 Operations and vendor payouts

Supplier/vendor costs are operational outflows, not customer payments.

Rules:

Link each payout/cost to the authoritative Booking and, where applicable, hotel/vendor/service/driver.

Use append-only payment/disbursement entries or an equivalent auditable model.

Support partial and full payouts without overwriting history.

Do not mark a hotel/cab/driver Paid because a voucher/document exists.

Do not infer supplier payment from customer payment.

Record amount, payment date, mode, reference/UTR, actor, notes, and correction/void history.

Prevent payouts from exceeding the approved supplier obligation unless an authorised adjustment changes that obligation.

NEEDS DATA: if not already explicit, confirm vendor master scope, approval roles, TDS/GST treatment, supported currencies, correction/void rules, supplier-document retention, and whether the ledger is operational tracking or accounting evidence.

4.10 Voucher lifecycle

A voucher is a protected booking-linked document with explicit supplier and customer-delivery states.

Rules:

Hotel-side receipt/attachment is separate from internal verification.

Verification must identify actor and timestamp.

Customer-ready voucher generation must read the authoritative booking/hotel snapshot.

Preview/download/print/send actions require authorization.

Do not expose raw storage paths.

Do not mark Sent/Delivered unless the application can prove the required action completed under the approved delivery semantics.

Regeneration must not silently rewrite historical booking facts.

4.11 Accounts closing

Accounts & Settlement reconciles authoritative customer inflow against verified operational outflow for an eligible/completed booking.

Rules:

Do not use live proposal totals after booking conversion.

Do not call a difference "final profit" when supplier costs, refunds, discounts, taxes, complimentary services, or other approved adjustments are incomplete.

Keep the displayed metric definition explicit: e.g. operational gross margin vs statutory/accounting profit.

Booking-level audit detail must reconcile to its summary row.

Export/print/detail views require financial-record authorization.

Financial corrections remain auditable.

4.12 User, role, and desk boundaries

The UI may present Admin, Editor/mode, Sales, Operations, and Accounts concepts.

Rules:

Authorization comes from server-side policy/gate/middleware rules, not labels or hidden navigation.

A user may see/search/select only records allowed by the same scope as the detail view.

Role switching/mode switching must not escalate privilege.

Sales Team performance/assignment screens must not grant User Management permission implicitly.

Accounts access to financial details must not grant unrelated admin capabilities.

NEEDS DATA: exact approved permission matrix if the repository does not already define it.

Dashboard contract

The approved Dashboard / Performance Matrix screenshot defines the current product direction. Verify every metric against repository data before treating it as Current.

Primary lead/status cards observed:

Active Leads

Update Lead

Hot Lead

In Process

Converted

Cancel

Postponed

Payment Desk & EMI Installments Tracker observed:

Total EMIs Created

EMIs Due / Upcoming

EMIs Overdue / Urgent

EMIs Collected / Paid

Analytics observed:

Conversion Pipeline

Market Intent

Rules:

Use real database queries; never use mocked dashboard numbers.

Apply the same authorization scope as the underlying records.

Use immutable booking totals plus authoritative verified customer-payment entries for financial aggregates.

Never include supplier/vendor payouts inside customer collection totals.

EMI counts and amounts must derive from the real installment schedule and verification state.

Overdue must use explicit due-date boundaries in the agency timezone.

Market Intent or other AI-derived analytics must be based on stored/verified advisory output. If no valid source exists, show an empty/not-configured state rather than invented analytics.

Every KPI/card/chart segment that appears interactive must have defined click-through/filter behaviour or be presented as non-interactive.

Do not infer new lifecycle enums from dashboard copy alone.

NEEDS DATA: map the UI label "Update Lead" to the canonical domain meaning/status before changing enums, reports, or migrations.

Dashboard must also preserve access to today's operational work through relevant lead, follow-up, payment, and trip exception views even when those are not shown as separate cards.6. Indian travel and finance context

The CRM is India-native but must not encode unverified tax advice.

Defaults:

Currency display: INR

Agency timezone: Asia/Kolkata

Common payment methods: Cash, UPI, Bank Transfer, Card

Lead sources: Phone, WhatsApp, Walk-in, Referral, Website/Other as approved by the current product

PDF-first proposal workflow

Manual supplier confirmation and external booking references

Rules:

Store timestamps in a consistent canonical timezone and display them in the agency timezone.

Never hard-code GST or TCS rates as permanent truth.

Store applied tax labels, rates, and amounts as transaction snapshots when the feature is enabled.

Tax configuration changes must not retroactively mutate accepted proposals or bookings.

Never present application calculations as legal or accounting advice.

Supplier portals remain the inventory source of truth; TripOps records references and operational status.

GST-ready invoices (per CBIC invoice particulars and the market research report):

The invoice must freeze, at generation time: agency GSTIN and address, optional recipient GSTIN, place of supply, applied tax label and rate, and sequential invoice number.

Recipient GSTIN is optional on leads (B2B capture); never require it on retail leads.

Advance payments should have printable receipt evidence (receipt voucher per payment entry).

Reference data is dynamic, never hardcoded:

Destinations, hotel categories/stars, room types, meal plans, and tax rates come from the admin-managed masters tables.

Views and validation rules must read active master rows (with model DEFAULTS as the empty-database fallback), not literal arrays.

Workflow statuses stay code enums; lead sources and payment methods stay enums until the approved masters conversion.

Security, privacy, and data integrity

Authentication and authorization

All operational routes require authentication and an active user.

Admin-only actions require an explicit Gate or Policy.

Every mutation is authorized server-side.

Do not rely on hidden buttons for authorization.

Admin may manage users and all operational records.

Agent mutations default to assigned/owned records unless the approved policy explicitly permits broader collaboration.

An ability that creates a child record must be authorized against the parent record, not against the child's class. Authorizing "may create a proposal" without naming the lead grants a blanket permission and is a real hole, not a formality — it was exactly how an agent could quote on another agent's lead while being refused the lead itself.

Scoping is a read concern as well as a write concern. Every list, search, autocomplete, and reuse lookup passes through the same visibility scope as the detail screen. A search result that leaks another agent's customer name, record code, or quote total is a disclosure even when the record itself cannot be opened.

Never widen access while fixing an unrelated bug.

Use least privilege for file downloads, exports, and financial records.

Seeders and credentials

Production seeding must never create a predictable admin password.

Development demo users must be created only in local/testing environments.

Production admin provisioning must use an explicit secure path.

Never commit real credentials, tokens, customer data, passports, or payment secrets.

Do not log passwords, document contents, sensitive payment data, or full identity-document numbers.

Integration credentials and external actions

Treat payment gateway, AI provider, email, WhatsApp, and any other external service as security boundaries.

Provider secrets must never be returned to browser code, Livewire public state, HTML, logs, exception pages, analytics, screenshots, or exported documents.

Store secrets in environment/secret storage or an approved encrypted credential store; never in seed data or committed fixtures.

Mask any credential field shown to an authorised admin. A masked field is not proof that the underlying transport/storage is safe; verify server-side handling.

Webhook/callback endpoints must verify authenticity, reject replay/duplicate processing through idempotency, and record sufficient provider identifiers for audit without logging sensitive payload data.

A UI success toast is not evidence that WhatsApp/email/payment/AI delivery actually succeeded. Persist truthful result state from the integration boundary.

Files

Store uploaded files outside the public web root through Laravel Storage.

Authorize every upload, listing, preview, and download.

Validate maximum size, allowed MIME type, extension, and filename.

Generate server-side storage names; preserve the original name only as metadata.

Prevent path traversal and executable uploads.

Do not expose raw local storage paths.

Delete or retain files according to an explicit record lifecycle; never orphan them silently.

Database

PostgreSQL is the production database and the source of truth for concurrency behaviour.

Use foreign keys, unique constraints, check constraints, and indexes where they enforce real invariants.

Use transactions and row-level locks for:

human-readable ID generation

proposal revision

proposal acceptance

booking conversion

payment insertion/voiding

trip completion

customer upsert/aggregation

cancellation state changes

Never assume SQLite test behaviour proves PostgreSQL correctness.

Never use migrate, db, destructive SQL, or seed resets against non-test data.

Migrations must be forward-safe, reviewable, and reversible where practical.

Backfill before making a column non-null or unique when production data may exist.

Do not modify an old applied migration to change production behaviour; create a new migration.

Auditing

Every important write must retain:

actor

timestamp

parent record

before/after state or sufficient event history

reason for destructive-looking corrections such as voids or cancellations

Use application logs for diagnostics, not as the only audit record.

Technology and architecture

Preserve the installed supported stack

The repository’s installed and locked versions are authoritative after verification.

Do not downgrade the current Laravel application to the obsolete version named in an old roadmap.

Do not perform framework, PHP, Node, Livewire, Tailwind, Vite, or database major upgrades as part of an unrelated task.

Do not replace Blade/Livewire with React, Vue, Inertia, or another SPA stack.

Do not replace the current authentication scaffold merely because newer starter kits exist.

Update dependencies only for a documented security, compatibility, or task requirement.

Expected architecture:

Laravel

PHP

Blade

Livewire 3

Alpine.js

Tailwind CSS

PostgreSQL

Laravel Storage

DOMPDF or the currently approved PDF renderer

Verify actual versions before making version-specific claims.

Laravel conventions

Use strict types where practical.

Use native backed enums for finite states.

Cast enums and structured values on models.

Use Form Requests or Livewire validation for input validation.

Use Policies and Gates for authorization.

Keep controllers and Livewire components thin.

Put cross-record business operations in named services.

Keep model methods focused on local invariants.

Use observers only for small, idempotent reactions; prefer explicit services for multi-record financial/lifecycle transactions.

Avoid state-changing side effects in GET requests.

Use POST/PATCH/DELETE for mutations with CSRF protection.

Avoid mass-assignment exposure.

Eager-load relationships to prevent N+1 queries.

Paginate large lists.

Add database indexes for actual search/filter patterns.

Do not add a package when Laravel already provides a maintainable solution.

Do not introduce Filament, Nova, Backpack, Spatie Permission, tenancy packages, or a second frontend framework without explicit approval.

Duplicate simple code twice before extracting a premature abstraction.

Naming

Models: singular PascalCase

Tables: plural snake_case

Enums: singular PascalCase

Routes: kebab-case names and resourceful HTTP verbs

Blade and Livewire view files: kebab-case

Services: action-oriented names such as BookingConversionService

Tests: behaviour-oriented names, not implementation-oriented names

Human-readable IDs

Formats:

Lead: L-{YYYY}-{sequence}

Booking: B-{YYYY}-{sequence}

Generate them transactionally with a database-backed sequence/lock. A max(id) + 1 query without locking is not acceptable.

UI and design contract

The product should feel like a clear working travel desk: fast, plain, dependable, and calm under pressure.

Required behaviour

Desktop-first for office use

Responsive for quick phone access

Fast lead and proposal forms

Clear labels and predictable actions

Visible lifecycle chain on relevant detail screens

One dominant primary action per section

Compact but readable information density

Tables for scanning, cards only where they improve comprehension

Empty, loading, error, and success states for every async surface

Unsaved-change protection on long forms

Destructive actions require confirmation and explain consequences

Avoid

generic admin-template appearance

decorative travel imagery in operational screens

dashboard noise

excessive gradients, shadows, pills, animations, or oversized cards

hidden actions that require hover

horizontal spreadsheet-style forms

inconsistent modal/drawer/page editing patterns

unexplained abbreviations

fake analytics

consumer booking or shopping patterns

Accessibility minimum

Visible keyboard focus with at least 3:1 non-text contrast

Readable text contrast

Semantic headings and one main landmark per page

Every input has a programmatic label

Error messages are associated with fields

Keyboard-operable dialogs and menus

Touch targets approximately 44 × 44 CSS pixels where practical

Reduced-motion support

No colour-only status communication

Tables have headers and meaningful captions/labels when required

Test critical screens at 320px width and 200% zoom

Do not claim accessibility compliance without testing.

Debugging protocol

For every defect:

Reproduce it reliably.

Identify the smallest failing request, action, query, or test.

Rank likely root causes.

Inspect logs, validation, policies, state transitions, database constraints, and transaction boundaries.

Add or update a regression test that fails for the correct reason.

Apply the smallest root-cause fix.

Run the targeted test.

Run neighbouring module tests.

Run the full quality gate.

Verify the user-visible workflow, not only the internal method.

Do not:

suppress exceptions without fixing the cause

add broad try/catch blocks that convert data errors into success messages

weaken validation to make a test pass

remove a database constraint instead of fixing invalid writes

replace real calculations with mocked values

change multiple unrelated subsystems in one speculative patch

claim a concurrency fix using only an SQLite test

When a defect touches money or lifecycle state, verify both success and failure paths.

Testing and verification

Use the existing project test framework consistently.

Required test coverage

Domain/unit

valid and invalid lead transitions

proposal state transitions

proposal version/group selection

authoritative pricing calculation

immutable booking snapshot behaviour

installment schedule calculation/state

verified payment status derivation

payment over-collection prevention

manual payment confirmation authorization/audit

gateway/provider event idempotency primitives where a gateway exists

customer-vs-vendor ledger separation

vendor payout balance calculation

phone normalization

trip/booking state synchronization

readiness transition requirements

voucher attachment/verification/delivery state

accounts reconciliation/margin calculation under the approved semantics

cancellation parent/state rules

ID year rollover and concurrent uniqueness

Feature/integration

active-user authentication

user creation/deactivation and role/mode authorization

sales-expert assignment visibility

complete lead creation and qualification

follow-up buckets/search/agent scope

proposal creation, revision, acceptance, and PDF response

saved-itinerary reuse and AI generation security where implemented

accepted proposal to booking conversion

payment Pending → Partial → Paid

payment link generation and expiry rules where implemented

gateway webhook signature/idempotency where implemented

customer UTR/reference submission and authorised confirmation where implemented

payment void/correction

invoice generation, snapshot data, and print/PDF/share action behaviour

protected document upload and download

hotel voucher upload, verification, preview, download, and delivery-state workflow

operations hotel/cab/driver assignment and payout tracking

upcoming-trip readiness

day-wise trip execution and remarks

trip completion

accounts audit detail and export authorization

repeat-customer aggregation

feedback/review state rules

pre-booking and post-booking cancellation

dashboard metric boundaries and totals

Full-chain regression

Maintain at least one test or verified automated scenario that proves the authoritative chain:

Lead → Follow-up/Qualification → Proposal v1 → Revision → Accepted Proposal → Booking → Installment/Payment Request → Verified Partial Payment → Verified Paid → Operations Handoff → Hotel/Cab/Vendor Fulfilment → Voucher Verified/Delivered → Departure Ready → Day-Wise Trip → Trip Completed → Accounts Reconciliation → Customer → Feedback/Review State

If a gateway, AI provider, WhatsApp, email, or other external service is not available in test, mock only the provider boundary. Do not mock the internal lifecycle, money ledger, authorization, or persistence that the feature is meant to prove.

Also cover rejection, postponement, loss, cancellation, unauthorized access, invalid transition, duplicate submission, duplicate webhook, stale payment link, failed verification, missing voucher, incomplete readiness, and duplicate completion paths.

PostgreSQL-specific verification

Use PostgreSQL-backed tests for:

row locks

unique-violation recovery

concurrent booking conversion

concurrent payment insertion/confirmation

gateway-event idempotency uniqueness

concurrent vendor payout insertion where applicable

concurrent trip completion/customer upsert

database check constraints

case/format-sensitive phone uniqueness assumptions

SQLite may be used for fast local unit tests but cannot be the only evidence for production concurrency.

PDF/document verification

A passing HTTP response is not enough.

Render and inspect realistic samples for every applicable customer/finance document:

proposal

invoice

payment/receipt evidence

hotel confirmation voucher

itinerary/day schedule

accounts audit print/PDF if the product exposes one

Verify:

filename

customer/booking/trip identity

version where applicable

hotel/traveller/service details

tables and totals

tax labels/rates/snapshots

inclusions/exclusions/terms

payment status wording

INR symbol and Unicode rendering

page breaks

clipping and overflow

print readability

authorization for preview/download

Quality gate

Before reporting completion, run:

php artisan test./vendor/bin/pint --testnpm run buildcomposer check-platform-reqsphp artisan routephp artisan migrate

Run relevant PostgreSQL, storage, queue, webhook/provider sandbox, and PDF checks when those areas changed.

No command may be reported as passed unless it was actually run and its result inspected.

Product targets that require real measurement

The following remain targets until measured with representative staff and realistic data:

lead creation under two minutes

proposal creation under five minutes

comfortable all-day desktop use

mobile quick-access usability

payment-link completion usability

voucher/invoice/PDF quality across realistic bookings

operations handoff speed

Report these as NEEDS DATA, not as proven performance.12. Migrations and release safety

Before changing schema:

Inspect existing production-shaped data assumptions.

Identify dirty, pending, duplicate, or environment-specific migrations.

Determine whether the migration can lock a large table or destroy data.

Write the backfill/compatibility path.

Test migrate-up and rollback where rollback is safe.

Test from a clean database and from a database representing the previous release.

Rules:

Development seeders must be environment-gated.

Production deployment must not depend on demo data.

Avoid changing enum definitions in ways that strand existing rows.

Preserve historical financial and proposal data.

Do not rewrite accepted proposal or booking snapshots during a cosmetic migration.

Document any irreversible migration before execution.

Require explicit user approval before destructive remediation of real data.

Historical audit blockers to re-verify first

A prior audit plus the approved expanded UI identify these risks. Treat them as a starting checklist, not current truth. Reproduce each before claiming it remains or is fixed.

Predictable development admin credentials could be seeded outside local/test environments.

Concurrent customer payment submissions/confirmations could exceed the booking total.

A payment-link or customer UTR submission could be treated as money received before gateway/authorised verification.

Duplicate or retried gateway callbacks could create duplicate receipts.

Razorpay/API/AI secrets could be exposed in browser payloads, logs, screenshots, seeders, or committed configuration.

Payment Settings changes could lack authorization/audit history.

Customer collections and hotel/cab/driver payouts could be mixed in one financial meaning or ledger.

Operations supplier payments could be hard-edited/deleted instead of preserving corrections/audit history.

Accounts realised margin could be calculated from incomplete/unverified vendor costs or mutable proposal totals.

PostgreSQL customer creation could continue inside an aborted transaction after a unique violation.

Booking, operations, trip readiness, and completion states could contradict each other.

Proposal option groups could share incorrect version history.

Pricing behaviour could conflict with the documented proposal contract.

A GET request could create invoice/payment/voucher state.

Dashboard follow-up or EMI metrics could query the wrong source/status.

Lead-side cancellation could be missing.

Dashboard/customer/accounts amounts could read live proposal totals instead of booking snapshots.

Raw phone matching could create duplicate customers.

Proposal/invoice/voucher PDF filenames or data could differ from the required identity/snapshot.

Voucher preview/download/send actions could bypass booking/file authorization.

Hotel voucher "sent/delivered" state could be recorded without an actual completed action.

Role switching or role/mode controls could expose sections/actions without server-side permission enforcement.

Global search, autocomplete, itinerary reuse, customer selectors, and operations filters could leak records across authorization scope.

AI itinerary or lead-assessment actions could expose customer data or provider keys, or change business truth without review.

Payment/follow-up/operations controls could lack accessible labels.

Pages could contain nested <main> landmarks.

Focus indicators, control boundaries, dialogs, and touch targets could fail accessibility requirements.

Tests could pass only on SQLite while production behaviour depends on PostgreSQL.

There could be no single verified full-chain regression through payment verification, operations, voucher delivery, trip completion, accounts reconciliation, feedback, and cancellation.

Fix confirmed P0/P1 issues before polishing or adding new modules.14. Definition of Done

The release is complete only when all applicable approved workflow items below are verified.

Security and platform

No predictable production credentials

No provider/API secrets or real customer data committed

Payment/AI secrets are server-side, masked, encrypted where applicable, and excluded from logs/browser payloads

All routes and mutations authorized

Role/mode access is enforced server-side, not only by sidebar visibility

No state-changing GET requests

Production-safe seeders

Protected document/voucher storage and download

Supported installed stack preserved

Migrations safe for existing data

Leads and follow-ups

User can create a lead with required validation

Search, filters, pagination, and assignment work

Valid lifecycle transitions are enforced centrally

Lost and Postponed require supporting data

Won cannot be set manually if the canonical acceptance rule still governs the repository

Notes/activity/follow-ups retain actor and timestamp

Overdue/Today/Tomorrow/Upcoming/Completed follow-up buckets use correct date/status rules

Duplicate submission does not create duplicate leads unintentionally

Proposals and itineraries

Proposal belongs to an eligible lead

Totals use one authoritative pricing contract

Revision history is immutable and correctly grouped

Only the correct active version can be accepted

Accepted proposal converts once to booking

Saved itinerary reuse does not mutate historical accepted proposals

AI-generated itinerary content requires human review and does not expose secrets or auto-change business truth

Proposal PDF data and filename are correct

PDF is rendered and visually checked

Booking, customer payments, and EMI

Booking is created transactionally from an accepted proposal

Booking commercial snapshot is immutable

Installment schedule and verified receipts are separate

Payment link/customer submission does not equal received money

Gateway events are authenticated/idempotent where implemented

Manual confirmation is authorized and auditable

Payment status is derived from authoritative verified entries

Concurrent payments cannot over-collect

Voids/corrections retain history

Due dates and pending balances are correct

Financial dashboard data uses booking snapshots and verified receipts

Invoice

Invoice generation uses authoritative booking/customer/tax snapshot data

Sequential/reference identity follows the approved contract

GST/company/customer/place-of-supply fields are validated according to approved rules

Download/print/share actions do not create hidden financial state

Rendered invoice is visually checked

Operations and vendor payments

Eligible converted bookings appear in the correct Operations queue

Handoff rule is explicit and tested

Hotel/cab/driver assignments remain linked to the booking/trip

Customer collections are never mixed with supplier/vendor payouts

Hotel and cab/driver full/partial payments are auditable

Supplier payout corrections preserve history

Internal operations remarks are access-controlled

Vouchers

Hotel-side voucher requirements are linked to package/hotel/booking

Missing, attached, verified, ready-to-send, and delivered/sent states have explicit semantics

Voucher upload/preview/download/send actions are authorized

Official customer voucher contains correct booking/hotel/guest/date/room/meal/payment-status information

Voucher PDF is rendered and visually checked

A delivery state is not invented without the required action/evidence

Trip readiness and execution

Upcoming-trip readiness uses real dependencies

Incomplete required dependencies prevent Departure Ready where the approved workflow requires them

Day-wise itinerary remains linked to the correct trip

Operational edits do not mutate the historical accepted commercial snapshot

Driver/vehicle/remarks/status visibility follows authorization

Booking and trip completion stay synchronized

Cancellation prevents invalid downstream progression

Completion is idempotent

Accounts, customer, and feedback

Accounts inflow uses verified customer collections/approved booking snapshot semantics

Hotel/cab/driver outflows use authoritative vendor payout records

Displayed realised margin uses the approved operational formula and clearly states its meaning

Incomplete vendor costs do not silently appear as final profit

Booking-level audit details reconcile to summary rows

Accounts export/detail/PDF actions are authorized

Trip completion creates/updates one customer safely

Repeat trips aggregate correctly using normalized identity

Feedback/review state is validated and linked to a completed trip

External review request is not marked sent/requested unless the action actually completed according to its integration contract

The full lifecycle works without manual database intervention

Dashboard and UX

Approved Performance Matrix cards use real data

EMI tracker uses real installment/payment state

Conversion Pipeline uses authoritative lifecycle data

Market Intent shows only real advisory data or a truthful empty/not-configured state

KPI click-through/filter behaviour is defined

Core forms have labels, validation errors, empty/loading/success states

Long forms have unsaved-change protection where needed

Keyboard, focus, landmarks, contrast, dialogs, zoom, and touch targets are checked

No unfinished secondary feature obstructs the primary workflow

Verification

Targeted regression tests pass

Expanded full-chain test/scenario passes

PostgreSQL-specific tests pass where required

Provider sandbox/webhook checks pass where applicable

Voucher/invoice/proposal PDFs are manually rendered and inspected

Pint passes

Frontend build passes

Platform requirements pass

Route and migration status are inspected

Real workflow is manually exercised from inquiry through account closure

Remaining uncertainty is documented as NEEDS DATA

A green test suite alone is not release readiness.15. Agent work report

After each task, report only evidence-backed results in this structure:

Status: GO | CONDITIONAL GO | NEEDS DATA | BLOCKED

Root cause:

<ranked, verified cause>

Changes:



Verification:

<exact command/test/manual flow and result>

Regression risk:



NEEDS DATA:

<specific missing evidence, or "None">

Evidence labels:

[DOC] verified from an authoritative document

[DATA] measured or observed from commands/tests

[INF] inference from verified evidence

[EST] estimate

[UNC] unverified

Never invent command output, test counts, timings, database versions, conversion metrics, or completion percentages.

Final operating rule

Protect the lifecycle, money, customer data, and agent speed before adding breadth.

For a broad completion request:

Audit current state → reproduce defects → fix P0/P1 → verify the full chain → complete missing MVP work → harden accessibility and release safety → then consider enhancements.
