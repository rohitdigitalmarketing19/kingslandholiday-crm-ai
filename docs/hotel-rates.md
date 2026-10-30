# Admin hotel rates

Open **Admin → Hotel Rates**. Administrators can add and edit a hotel name, city, category, seasonal price and blackout price. Admin users in View Only mode can browse and preview PDFs but cannot save. Every API route checks the active user and Admin role using the existing CRM `x-user-id` identity contract. This inherits that contract's trust assumptions; it does not introduce a new authentication system.

Prices are INR per room per night, stored as integer paise. These are supplier reference rates and do not change accepted quotes or booking totals. Categories use enabled Hotel Categories in Masters; an existing hotel retains its category when that master is later disabled. Cities support free entry and suggestions from saved hotels.

Add up to 100 inclusive blackout start/end periods. End dates must be on or after start dates. Overlaps are allowed because each hotel has one blackout price. The directory can expand all saved periods.

Search by name and combine city, category and seasonal-price filters. Price bands are ₹0–1,000; above ₹1,000–2,000; above ₹2,000–3,000; above ₹3,000–4,000; above ₹4,000–5,000; above ₹5,000–8,000; above ₹8,000. Upper limits are included. Continuous bands avoid excluding prices in gaps in the original examples. Results show 20 hotels per page.

One optional PDF (10 MB maximum) can be previewed before or after saving, downloaded, replaced or removed. The server validates the filename, signature, size and PDF readability, rejecting encrypted/unreadable files. PDF data is stored within the database so existing database backups include the attachment. Listings exclude PDF bytes; previews fetch them through an Admin-protected endpoint and use temporary browser blob URLs. Saving an ordinary edit retains an existing attachment.

Initialization adds `hotel_rates` and `hotel_rate_history` without altering existing business tables. Saves record the actor, timestamp and before/after metadata in one transaction. File replacement/removal retains filename history but not previous file contents. The new tables follow this runnable project's sql.js database architecture.

Verification:

```
npm run build
node --import tsx scripts/test-hotel-rates.cjs
node scripts/test-hotel-rates-ui.cjs
```

The API test uses an isolated temporary database with cloud sync disabled. The browser test uses synthetic API fixtures and checks form interaction, two blackout periods, PDF preview, filters, save feedback and 320px layout. Screenshots are written under `tmp/hotel-rates`. Start/restart the backend after building to load the new route and additive schema.

## Seasonal pricing and hotel contact

Hotels also support an optional off-season rate, off-season start date, season start date and contact number. Each start date is shown above the corresponding price in the directory; contact numbers appear beneath hotel details with a call link. These dates are reference information, not automatic recurring pricing rules. Existing records retain their rates and PDFs, with new fields blank until entered. Older clients preserve new field values when they omit them. The price-range filter continues to use seasonal prices.

## Delete hotel

Each row has an Admin-only Delete action with a named confirmation. Deletion removes the hotel from the directory and prevents PDF preview and further edits. The server retains the record, attachment and an actor/timestamp audit event; existing quotes and bookings are unaffected. View-only administrators cannot delete.
