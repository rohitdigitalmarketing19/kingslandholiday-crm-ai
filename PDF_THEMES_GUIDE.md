# Kingsland AI CRM — PDF Themes & Festival Skins Guide

This guide details the **PDF Themes** system in Kingsland AI CRM, allowing administrators to upload seasonal festival themes (Diwali, Holi, Eid, Christmas, New Year, etc.), schedule when each theme is active, generate multi-day package itinerary PDFs, and enforce clean page-packing without empty spaces.

---

## 1. Brand Defaults & Design System

The default brand presentation follows Kingsland Holiday's visual identity:

| Element | Specification |
| :--- | :--- |
| **Primary Orange** | `#FF6B35` |
| **Deep Navy** | `#14142B` |
| **Cream Neutral** | `#FFF9F0` |
| **Rust Heading Title** | `#D9582B` |
| **Typography** | Headings in **Playfair Display**, body in **Nunito** |
| **Image Styling** | Border radius: `16px`, Cover images: `16:9`, Day images: `3:2` (`object-fit: cover`) |
| **Hero Badge** | If a package badge is set, a navy strip runs along the bottom of the cover photo with an orange flame icon and badge label |

---

## 2. PDF Page Sequence

All generated package PDFs follow this exact canonical page sequence:

1. **Cover Page**: Hero photo (16:9), package title, destination, duration, price, agency branding. Optional bottom navy badge strip with orange flame icon.
2. **Overview & Highlights**: Destination synopsis, trip highlights, travel style badges.
3. **Inclusions & Exclusions**: Side-by-side or stacked verified inclusions and exclusions.
4. **Itinerary at a Glance**: Minimalist one-line-per-day summary (Day N, title, short sentence, icon). Always fits on one page.
   - *Special Rule*: If total days $\le 3$, "Itinerary at a glance" and detailed days are **merged** into a single page.
5. **Detailed Day-Wise Itinerary**: Multi-day packed cards with alternating photos (image on left on odd days, right on even days). Missing images render full-width text cards with no empty image placeholders.
6. **Hotels & Pricing**: Hotel category breakdown, room types, meal plans, pricing matrix.
7. **Terms & Payment**: Deposit schedule, cancellation policy, bank details.
8. **Contact & Closing Page**: Kingsland contact details, trust markers, emergency numbers, GMB review callout.

---

## 3. Supported Theme Types

The theme engine accepts three distinct formats:

### Type A: Theme Pack (`.zip`)
A `.zip` archive containing template markup, CSS styling, and local image assets:

```
my-festival-theme.zip/
├── theme.json         # Metadata, active dates, color tokens, font declarations
├── cover.html         # Custom cover page Handlebars template
├── page.html          # Inner content wrapper Handlebars template
├── styles.css         # Custom CSS overrides and animations
└── assets/            # Theme assets (PNG, JPG, WebP, SVG, WOFF2)
    ├── diya.svg
    └── header-bg.png
```

#### `theme.json` Specification
```json
{
  "name": "Diwali Festival of Lights 2026",
  "festival": "Diwali",
  "version": "1.0.0",
  "startDate": "2026-10-20",
  "endDate": "2026-11-15",
  "colors": {
    "primary": "#FF6B35",
    "accent": "#FFD700",
    "background": "#FFF9F0",
    "text": "#14142B"
  },
  "fonts": {
    "heading": "Playfair Display",
    "body": "Nunito"
  },
  "safeMargin": 12
}
```

#### Handlebars Variables & Slots
The templates are rendered with safe Handlebars context:
- `{{package.title}}`: Package title
- `{{package.destination}}`: Destination name
- `{{package.duration}}`: Duration text (e.g. "4N / 5D")
- `{{package.price}}`: Formatted price string (e.g. "₹24,999")
- `{{package.badge}}`: Badge text (e.g. "Trending", "Diwali Special")
- `{{package.overview}}`: Package overview paragraph
- `{{package.inclusions}}`: Array of inclusion items
- `{{package.exclusions}}`: Array of exclusion items
- `{{#each itinerary}}`: Day-by-day itinerary array (`{{this.day}}`, `{{this.title}}`, `{{this.description}}`, `{{this.image}}`, `{{this.isEven}}`)
- `{{theme.colors.primary}}`, `{{theme.colors.accent}}`: Color tokens

### Type B: Artwork PDF (`.pdf`)
A pre-designed A4 portrait PDF with **strictly 3 pages**:
1. **Page 1**: Cover artwork background
2. **Page 2**: Inner content page header/footer frame (repeats for every content page)
3. **Page 3**: Back cover / closing artwork

*Rendering pipeline*: Content is rendered in Puppeteer with a transparent background (`background: transparent`), then composited onto the artwork PDF pages using `pdf-lib`.

### Type C: Single Image (`.png`, `.jpg`, `.webp`, `.svg`)
A high-resolution image used as a decorative cover background or watermarked page backdrop.

---

## 4. Smart Page-Packing & Fill Algorithm (≤ 30% Empty Space)

To prevent awkward blank spaces or sparse single-day pages:
1. **Continuous Content Flow**: Elements flow naturally across pages. Day cards, tables, and photo blocks use `break-inside: avoid` so cards never split awkwardly across page breaks.
2. **Two-Pass Measurement (`page.evaluate`)**:
   - The engine measures content height on each rendered A4 page.
   - If empty space exceeds **30% of page height** (`emptySpace / 1123 > 0.30`):
   - Injects contextual filler modules in strict priority order:
     1. **Destination Highlights Strip** (scenic tags, altitude, best time, top spots)
     2. **Hotel Photo Gallery** (curated 2–3 photo grid)
     3. **Why Choose Kingsland Holiday Trust Block** (5000+ happy travelers, 4.8★, 24/7 concierge)
     4. **Contact & Helpline Card**
3. **Vertical Centering Fallback**: If no filler module is available or space remains after 2 passes, remaining content is vertically centered on that page rather than leaving a blank block at the bottom.

---

## 5. Security & Upload Validation

All theme uploads are strictly validated:

| Security Layer | Enforcement Rule |
| :--- | :--- |
| **Magic Bytes** | Validates real file signatures (`PK\x03\x04` for Zip, `%PDF-` for PDF, image headers). Extensions alone are never trusted. |
| **Size & Count Limits** | Zip: max **20 MB** (50 MB uncompressed, max 200 files). PDF: max **10 MB**. Image: max **5 MB**. |
| **Zip-Slip Protection** | Resolves destination paths and rejects any entry containing `..` or leading slashes. |
| **Script Sanitization** | Scans HTML and SVG files for `<script>`, `<iframe>`, inline `on*` event handlers (`onclick`, `onload`, `onerror`), and external URLs (`http://`, `https://`). Rejects malicious packages immediately. |
| **Puppeteer Sandbox** | Rendered with `page.setJavaScriptEnabled(false)`. Network access is blocked; only local file assets within the theme package are served. |
| **Private Storage** | Theme files are stored outside the public document root (`storage/pdf-themes/`) and served strictly via authenticated API. |

---

## 6. Theme Selection Logic

When generating an itinerary PDF:
1. **Package Override**: If the package or quote specifies a `themeOverrideId`, use it.
2. **Date-Based Active Theme**: If today's date falls within `[startDate, endDate]` of an active theme, use that seasonal festival theme automatically.
3. **System Default**: Otherwise, use the designated default theme (`'brand-default'`).
4. **Fail-Safe Fallback**: If an uploaded theme encounters an unexpected template or rendering error, it logs the exception and falls back to `'brand-default'` seamlessly.

---

## 7. Admin UI Guide

### Accessing the Themes Workspace
Administrators can access the PDF Themes manager from:
- **Sidebar Admin Menu**: Click **PDF Themes** (with the Sparkles icon).
- **Settings**: Navigate to **Settings** → click the **PDF Themes & Festival Skins** tab.
- **PDF Designs**: Navigate to **PDF designs** → click the **PDF Themes & Festival Skins** top tab.

### Actions Available
- **Upload Theme**: Drag and drop a `.zip`, `.pdf`, or image file. Set festival name and active date window.
- **Live Preview**: Click **Preview** on any theme card. Switch between **1 Day**, **3 Days**, **7 Days**, and **15 Days** sample packages to test layout and page-packing in real-time.
- **Download Sample PDF**: Render and download the full A4 PDF directly from the preview modal.
- **Activate / Archive**: Toggle seasonal themes on and off.
- **Set as Default**: Set any theme as the year-round fallback.

### Generating a Themed PDF from Package Screen
1. Go to **Admin** → **Templates** (Itinerary Library).
2. On any package card or in the package preview, click **Generate PDF**.
3. Select your desired theme from the dropdown:
   - *Auto (Active Festival / Seasonal Window)*
   - *Kingsland Brand Default*
   - Any uploaded festival theme (e.g. *Diwali Festival of Lights*)
4. Toggle **Detailed Itinerary** on or off.
5. Click **Download PDF**.

---

## 8. API Endpoints

- `GET /api/pdf-themes`: List all themes.
- `GET /api/pdf-themes/active`: Get the currently active theme (date-matched or default).
- `GET /api/pdf-themes/:id`: Get metadata for a specific theme.
- `POST /api/pdf-themes`: Upload a new theme (`multipart/form-data`).
- `POST /api/pdf-themes/:id/activate`: Activate a theme.
- `POST /api/pdf-themes/:id/set-default`: Set a theme as the system default.
- `POST /api/pdf-themes/:id/archive`: Archive a theme.
- `DELETE /api/pdf-themes/:id`: Delete a non-default theme.
- `POST /api/pdf-themes/generate-pdf`: Generate binary A4 PDF (`application/pdf`).
- `GET /api/pdf-themes/preview-html`: Render preview HTML for iframe display.
