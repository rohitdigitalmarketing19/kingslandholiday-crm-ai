# Professional CRM theme

Status: CONDITIONAL GO pending the existing deployment's real-user smoke test.

## Root cause

The interface mixed hard-coded colors, component dark variants, and broad important overrides. Document previews shared those overrides. Several modules had no local dark handling. Typography, corners, and shadows varied by module.

## Changes

- One shared theme in styles/theme.css for CRM and standalone Operations; Inter is the actual sans font.
- Slate surfaces, readable text, blue primary actions, and semantic success/warning/danger/info colors.
- Interface source uses semantic utilities whose values change together for light/dark themes.
- Saved theme is applied in the HTML head, persists safely, and synchronizes between tabs. Default is light; saved dark preferences remain respected.
- Consistent type sizes, restrained corners/shadows, visible keyboard focus, reduced-motion handling, and compact navigation on small screens.
- Documents retain their existing paper layouts and fonts. The newer hotel comparison, meal-plan, prepared-page preview and scoped PDF cache features are preserved.
- Both portals use the same PDF exporter. Modern CSS colors are converted to RGB only in html2canvas's private clone. Voucher downloads no longer depend on a global CDN script.
- CSS is built locally with the Tailwind version already used by Operations, replacing the main CRM runtime CDN.
- Packaging includes complete source, both builds, the server bundle, and PDF theme assets. Database, .env, backups, customer documents and node_modules are excluded; files have SHA-256 manifest entries.

## Verification

Result: both builds passed. The full theme regression passed 58 screen/document checks plus toggle, persistence, focus and compact navigation. All listed proposal, editor, isolated database and security regressions passed. Generated invoice/voucher pages were rendered and visually inspected in both themes.

- npm run build: TypeScript, production CRM frontend and server bundle.
- npm --prefix operations-team-portal run build: standalone Operations production build.
- node scripts/test-theme.cjs: synthetic API fixtures for main screens, Operations tabs, theme toggle/persistence/focus, compact navigation, standalone Operations, white document backgrounds/ink, actual invoice/voucher PDF generation in both themes. Artifacts are in tmp/theme-review.
- node scripts/test-proposal-pdf-preview.cjs: six existing proposal designs, both hotel tables and prices, repeated headers, whole images, 14 hotel rows without clipping, short-trip terms flow, repeated download reuse.
- node scripts/test-hotel-options-editor.cjs: save/reopen/validate/remove the second hotel option in the real editor.
- node --import tsx scripts/test-hotel-options.cjs: isolated test database; original pricing and meal-plan persistence preserved.
- node scripts/test-security-dependencies.cjs: existing security regression checks.

## Limits

Browser theme tests use synthetic fixtures and do not prove real gateway, SMTP, permission or production-data workflows. Existing bundle-size warnings remain. This update does not claim full accessibility certification. No production deployment or customer communication is performed.

## Maintenance

Use semantic colors such as bg-surface, bg-canvas, text-content, text-secondary, text-brand-ink, bg-brand and text-on-brand in interface code. Use status-specific tokens for status meaning. Keep document content inside a protected document root, with fixed print colors. Avoid adding global overrides of Tailwind color classes.

Run npm run package:zip to rebuild both applications and create the clean archive. Retain the deployment's database, .env and uploaded files when applying it.
