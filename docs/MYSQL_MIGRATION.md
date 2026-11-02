# MySQL migration and backup import

The CRM now supports SQLite (the default) and MySQL using `mysql2/promise`. MySQL is the primary record store when `DB_CLIENT=mysql`; the application does not fall back to SQLite or Supabase if MySQL fails.

## Live cutover

1. Keep the downloaded `.db` backup and take a fresh backup immediately before cutover. Pause staff edits during the final import and activation so that changes made after the backup are not left behind.
2. Keep the existing SQLite/Supabase environment values during the preparation stage. Add `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, and `MYSQL_PASSWORD` privately in Hostinger. Allow the Node application's actual outbound IP in the database access rule. No passwords belong in Git or chat.
3. Deploy this code while `DB_CLIENT` is absent or set to `sqlite`. Sign in with the existing CRM administrator account.
4. Open Settings → MySQL database → Test connection. If the test fails, check the hosting access rule and environment values. If the database server supports a trusted TLS certificate, set `MYSQL_SSL=true`; certificate verification remains enabled.
5. Select Import .db backup into MySQL and upload the fresh backup. This action replaces records in the configured MySQL database, not the active SQLite database. The importer validates integrity, required tables, record identities, field digests, counts, and declared relationships. It saves a recovery copy of the existing MySQL records before replacing them and rolls back failed replacements.
6. Check the successful import's lead and quotation counts against the backup. Then add `DB_CLIENT=mysql` to Hostinger and redeploy. The five connection settings alone never activate MySQL.
7. Sign in with an account from the imported backup. Confirm Settings reports MySQL, check leads, quotation details, installments, verified collections, booking balances, and a fresh backup download before resuming staff edits.

Do not run both SQLite and MySQL as writable live databases. Once new records have been saved in MySQL, switching back to an older SQLite copy would hide those newer records. A rollback then needs a current MySQL export, not simply an environment-variable change.

## Backup behavior

- Settings backup downloads in MySQL mode produce portable `.db` files with current MySQL data. They are not copies of the old local database file.
- Direct binary uploads support backups up to 100 MB. The original uploaded file is unchanged.
- Before a MySQL import, a full recovery copy is stored in `crm_restore_archives` and `crm_restore_chunks`. Settings provides authenticated downloads of these copies after Test connection. Recovery copies are stored within MySQL, so also retain independent downloaded/hosting backups.
- Import replaces users and sessions with backup records. After an active-MySQL restore, signing in again may be necessary.
- Keep any separately stored customer documents and upload directories in persistent hosting storage. A database migration does not migrate filesystem files.
- MySQL mode does not upload SQLite snapshots to Supabase.

## Backend details

Database work is asynchronous. Each HTTP request uses one pooled MySQL connection, which retains transaction boundaries. Mutating route handlers obtain a database-scoped advisory lock after upload parsing and authorization; transaction sections also lock the workflow mutex row. This preserves existing read-then-write booking/payment invariants across application instances. Lead lists and payment summaries batch related reads to avoid per-lead network queries.

The schema uses InnoDB, primary/unique keys, foreign keys, checks, a generated nullable mobile key for the existing partial unique constraint, and the audited booking-revision trigger. SQLite upsert and timestamp syntax is translated at the adapter boundary. Existing schema additions are forward-only.

The initial integration checks ran on an isolated local MariaDB 10.4.32 server using the MySQL protocol. The Hostinger connection and server-specific privileges still require the live Settings connection/import checks. Use a MySQL/MariaDB release supporting enforced checks and expression defaults; older MySQL releases are not verified by these tests.

## Verification performed

- `npm run build`: frontend type checking, Vite build, server bundle.
- SQLite regression checks: inquiry idempotency, payment workspace, accepted quotation revisions/completion lock, Razorpay signature/capture/replay behavior, and the supplied large backup import.
- Isolated MySQL checks: schema, authenticated API access, lead save/read, concurrent over-collection rejection, receipt replay, audited quotation revisions, dashboard balances, portable downloads, and Razorpay verification/recovery with a mocked provider boundary.
- Supplied backup: 42 tables, 12 leads, 13 quotations imported; every incoming field was compared with its MySQL copy before commit. No actual live records were modified by these tests.
- Browser checks: connection test, actual approximately 52 MB backup upload, verified counts, recovery downloads, unchanged active SQLite records, desktop/mobile render, no browser errors.

MySQL integration scripts require `MYSQL_TEST_CONFIG` pointing to a private JSON file containing the test connection environment values and `CRM_TEST_BACKUP_PATH` pointing to the private fixture. They restrict the server to localhost and a disposable `crm_migration_*` database. Never point test scripts at the live database.
