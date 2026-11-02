# Lead display recovery

The live database was confirmed to contain 12 leads, and the authenticated live lead endpoint returned lead data. Removing Supabase variables does not remove MySQL records. No database restore was performed for this repair.

A browser failure was reproduced using a malformed saved AI key: the API service previously attached that key to ordinary CRM requests, so the browser rejected the request headers. The UI then silently replaced the lead list with an empty array. This is a reproduced failure mode, not confirmation that the live browser had that particular key value.

The API service now reads and sends the custom AI key only for AI endpoints. Lead loading reports failures, retains already loaded records on transient errors, clears protected cached data for denied/expired sessions, and offers Retry. Successful loads clear the error.

Verification: npm run build; scripts/test-cache-quota.cjs; isolated MySQL/browser lead display with the 12-lead fixture, malformed saved AI settings, a forced HTTP 503, Retry recovery, and no browser rendering errors. MySQL integration tests require a private MYSQL_TEST_CONFIG pointing to a disposable localhost crm_migration_* database.

After deployment, hard-refresh the CRM and open All Leads. Clear all filters if needed. If a loading error remains, use Retry and report the displayed error. Do not re-import a backup just because a list is temporarily blank.
