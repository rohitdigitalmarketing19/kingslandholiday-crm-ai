PDF download performance

Root cause: html2canvas cloned the surrounding CRM, source proposal and rendered preview for every exported PDF page. CSS color normalization also visited those unrelated nodes repeatedly.

Fix: each capture excludes unrelated body branches before they are cloned. Capture ancestors, page content and styles remain available. Scale 2, JPEG quality, pagination, actual prices and the existing PDF cache remain unchanged. The helper is used for sheets, itinerary headers, continuous itinerary content and generic continuous documents.

Measured four-page synthetic benchmark with 4,000 CRM rows: 4,067 ms before, 1,141 ms after. The PDF page image bytes were identical across all four pages. These are local sample measurements, not a guaranteed time for every itinerary or network.

Regression: node scripts/test-pdf-export-isolation.cjs. Checks four exported pages, capture isolation, unchanged live DOM and modern CSS colors. TypeScript: node node_modules/typescript/bin/tsc --noEmit.
