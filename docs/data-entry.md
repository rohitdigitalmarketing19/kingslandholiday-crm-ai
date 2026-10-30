# B2B Data and fixed entry pages

Admin → B2B Data manages name, phone number, city, state and quality (Partner, Potential, Not Active). Admin editors can add, edit and soft-delete; view-only administrators can browse. Every change retains an audit snapshot. Contacts remain separate from travel leads and bookings.

Fixed links on the current CRM origin:

- `/forms/hotel-rates`
- `/forms/b2b-data`

Each admin directory offers Copy link and Open form. Anyone with the link can create a new record without signing in. The public endpoints cannot list, edit, delete or download existing records. Hotel categories are the only public lookup. Successful submissions return a reference only. Public submissions are recorded as `public-entry`; this label does not identify a verified person.

The hotel entry page shares its detail, rate and blackout fields with the admin editor, including contact number, category, city, off-season/season start dates and prices, blackout rate/date periods and optional PDF up to 10 MB. PDFs use the existing server validation and protected admin preview. B2B fields are also shared between admin and public forms.

Public creates are limited to 10 attempts per minute per IP and endpoint within a server process. A hidden spam field rejects basic bots. This is not a CAPTCHA. Browser-generated request IDs are persisted in the same transaction as each new record so a retried submission creates one record. Add-another starts a fresh request. Admin authentication and role rules are unchanged for other modules.

Schema migration is additive and repeatable. It creates B2B contacts/history and public submission identifiers without rewriting existing hotel or booking data. Production deep links are served by the existing frontend fallback. No GitHub push or hosted deployment is part of this change.

Verification:

- `npm run build`
- `node --import tsx scripts/test-data-entry.cjs`
- `node --import tsx scripts/test-hotel-rates.cjs`
- `node scripts/test-data-entry-ui.cjs`
