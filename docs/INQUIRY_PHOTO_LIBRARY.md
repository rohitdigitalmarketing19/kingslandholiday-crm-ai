# Inquiry selection and photo library — 31 October 2026

Active project: D:\kingsland-ai-crm\kingsland-ai-crm.

- Add Inquiry now displays the selected salesperson's name, a checkmark, a selected label, and a strong highlight in both themes. The existing salesPersonId/assignedTo save contract and permission rules are unchanged.
- PDF Designs provides a multi-file chooser from Upload images and a bulk-upload panel. Files are compressed and saved sequentially, with per-file progress/errors. Retries skip successful items and retain a stable upload ID, so a repeated server request returns the existing photo.
- Original filenames are stored separately from editable titles. A non-destructive migration adds file_name with an empty default for existing rows; older photos retain their title/city/tag search behavior.
- Filename, title, city, and tags are searchable, ignoring case and treating hyphens/underscores as spaces. Search applies in PDF Designs, the itinerary photo picker, and the photo API. A no-match query returns an empty list instead of unrelated suggested photos.

Verification: scripts/test-inquiry-photo-ui.cjs uses an isolated database and Chrome. It covers selection state in light/dark modes, multiple image files, a rejected non-image file, retries, persisted original filenames, idempotent server upload requests, case-insensitive filename search, reordered search words, empty results, itinerary-picker search, and repeat-safe migration preserving a legacy photo. No user photos or leads were created by the tests. Screenshots: tmp/inquiry-photo-qa.
