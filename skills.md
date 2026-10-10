# Kingsland CRM - Project Skills

This document contains specialized skills and guidelines for working on the Kingsland Holidays CRM project.

---

## UI/UX Pro Max - Design Intelligence

Searchable local UI/UX guidance: 79 searchable styles (50 active), 192 product palettes and exact reasoning profiles, 74 font pairings, 119 UX guidelines, 105 curated icons, 17 GSAP presets, 25 chart types, and 22 technology stacks.

### When to Apply

Use this Skill when the task involves UI structure, visual design decisions, interaction patterns, or user experience quality control: designing new pages, creating/refactoring UI components, choosing color/typography/spacing/layout systems, reviewing UI for UX/accessibility/consistency, implementing navigation/animation/responsive behavior, or improving perceived quality and usability.

Skip it for pure backend logic, API/database design, non-visual performance work, infrastructure/DevOps, or non-visual scripts — unless the task changes how something looks, feels, moves, or is interacted with.

### Rule Categories by Priority

Follow priority 1→10 to decide which category to focus on first; use `--domain <Domain>` to query full details. The full rule text for every category lives in `references/quick-reference.md` — read it on demand rather than loading it every time.

| Priority | Category | Impact | Domain | Key Checks (Must Have) | Anti-Patterns (Avoid) |
|----------|----------|--------|--------|------------------------|----------------------|
| 1 | Accessibility | CRITICAL | ux | Contrast 4.5:1, Alt text, Keyboard nav, Aria-labels | Removing focus rings, Icon-only buttons without labels |
| 2 | Touch & Interaction | CRITICAL | ux | Min size 44×44px, 8px+ spacing, Loading feedback | Reliance on hover only, Instant state changes (0ms) |
| 3 | Performance | HIGH | ux | WebP/AVIF, Lazy loading, Reserve space (CLS < 0.1) | Layout thrashing, Cumulative Layout Shift |
| 4 | Style Selection | HIGH | style, product | Match product type, Consistency, SVG icons (no emoji) | Mixing flat & skeuomorphic randomly, Emoji as icons |
| 5 | Layout & Responsive | HIGH | ux | Mobile-first breakpoints, Viewport meta, No horizontal scroll | Horizontal scroll, Fixed px container widths, Disable zoom |
| 6 | Typography & Color | MEDIUM | typography, color | Base 16px, Line-height 1.5, Semantic color tokens | Text < 12px body, Gray-on-gray, Raw hex in components |
| 7 | Animation | MEDIUM | ux, gsap | Context-aware timing, Motion conveys meaning, Spatial continuity | One duration for every transition, Animating width/height, No reduced-motion |
| 8 | Forms & Feedback | MEDIUM | ux | Visible labels, Error near field, Helper text, Progressive disclosure | Placeholder-only label, Errors only at top, Overwhelm upfront |
| 9 | Navigation Patterns | HIGH | ux | Predictable back, Bottom nav ≤5, Deep linking | Overloaded nav, Broken back behavior, No deep links |
| 10 | Charts & Data | LOW | chart | Legends, Tooltips, Accessible colors | Relying on color alone to convey meaning |

For the full rule list per category (all 119 UX guidelines with rationale), read `references/quick-reference.md`. For app-specific polish rules (icons, touch feedback, dark mode contrast, safe areas) and the canonical pre-delivery checklist, read `references/pro-rules.md`.

### Running the Search Tool

The search script lives inside this skill's own directory, not the project directory. Always invoke it by its full path — do not assume a particular working directory:

```bash
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "<query>" --domain <domain>
```

If `python` is not found, try `python3`, then `py -3`. Requires Python 3.x, no external dependencies.

### Workflow

#### Query Contract

Choose the smallest search mode that fits the request:

- **New project/page or system-wide visual direction** → use `--design-system`.
- **Targeted concern or component bug** → use one explicit `--domain`.
- **Known implementation stack** → use `--stack`; add a separate domain search only for a distinct design concern.

Build each query around one dominant intent, using 2–5 meaningful terms and one useful constraint such as product, platform, or interaction.

#### Step 1: Analyze User Requirements

Extract from the user request:

- **Product type**: SaaS, e-commerce, portfolio, dashboard, entertainment, tool, productivity, or hybrid
- **Target audience & context**: age group, usage context (commute, leisure, work)
- **Style keywords**: playful, vibrant, minimal, dark mode, content-first, immersive, etc.
- **Stack**: detect from the project — check `package.json` deps (react/next/vue/svelte/nuxt/@angular)

#### Step 2: Generate Design System (REQUIRED for new pages/projects)

Use `--design-system` when the task needs a coherent product-wide visual direction:

```bash
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

This aggregates product/style/color/landing/typography matches, applies reasoning rules, and returns pattern, style, colors, typography, effects, and anti-patterns to avoid.

**Example:**

```bash
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "travel CRM dashboard business" --design-system -p "Kingsland CRM"
```

#### Step 2b: Persist Design System (Master + Overrides Pattern)

To save the design system for retrieval across sessions, add `--persist` and always pass `--output-dir` pointed at the project root:

```bash
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "<query>" --design-system --persist -p "Project Name" --output-dir "<project-root>"
```

This creates:

- `design-system/<project-slug>/MASTER.md` — Global Source of Truth
- `design-system/<project-slug>/pages/` — Folder for page-specific overrides

#### Step 2c: Design Dials (optional)

Three optional 1-10 sliders that tune `--design-system` output:

```bash
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "<query>" --design-system --variance <1-10> --motion <1-10> --density <1-10>
```

| Dial | Low (1-3) | Mid (4-7) | High (8-10) |
|------|-----------|----------|-------------|
| `--variance` | Centered / minimal | Balanced / modern | Bold / asymmetric |
| `--motion` | Subtle micro-interactions | Standard scroll/stagger motion | Complex choreography |
| `--density` | Spacious (24-96px spacing) | Standard (16-64px) | Dense/dashboard (8-32px) |

#### Step 3: Supplement with Detailed Searches (as needed)

```bash
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "<keyword>" --domain <domain> [-n <max_results>]
```

| Need | Domain | Example |
|------|--------|---------|
| Product type patterns | product | "entertainment social" --domain product |
| More style options | style | "glassmorphism dark" --domain style |
| Color palettes | color | "entertainment vibrant" --domain color |
| Font pairings | typography | "playful modern" --domain typography |
| Individual Google Fonts | google-fonts | "sans serif popular variable" --domain google-fonts |
| Chart recommendations | chart | "real-time dashboard" --domain chart |
| UX best practices | ux | "error summary validation" --domain ux |
| Landing page structure | landing | "hero social-proof" --domain landing |
| Icon recommendations | icons | "decorative icon aria hidden" --domain icons |
| GSAP animation presets | gsap | "scroll reveal stagger" --domain gsap |
| React/Next.js performance | react | "rerender memo list" --domain react |

#### Step 4: Stack Guidelines

```bash
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "<keyword>" --stack <stack>
```

**Available stacks**: react, nextjs, vue, svelte, astro, nuxtjs, nuxt-ui, angular, laravel, swiftui, react-native, flutter, jetpack-compose, html-tailwind, shadcn, threejs, javafx, wpf, winui, avalonia, uno, uwp.

**For Kingsland CRM**: Use `--stack react` (detected from package.json)

### Example Workflow for Kingsland CRM

```bash
# Step 2: design system for CRM
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "travel CRM dashboard business professional" --design-system -p "Kingsland CRM" --density 7

# Step 3: supplement with specific concerns
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "keyboard focus modal" --domain ux

# Step 4: React-specific guidelines
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "dark theme toggle state" --stack react
```

### Common Use Cases for Kingsland CRM

#### Dark Mode Enhancement
```bash
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "dark mode contrast accessibility" --domain ux
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "theme toggle animation" --domain gsap
```

#### Form Improvements
```bash
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "inline validation error clarity" --domain ux
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "form input focus state" --stack react
```

#### Dashboard Charts
```bash
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "conversion pipeline bar chart" --domain chart
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "real-time dashboard metrics" --domain chart
```

#### Modal Dialogs
```bash
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "modal focus trap keyboard" --domain ux
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "confirmation dialog pattern" --domain ux
```

#### Navigation & Sidebar
```bash
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "sidebar navigation collapse" --domain ux
python "${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/search.py" "nav hierarchy depth" --domain ux
```

### Output Formats

`--design-system` supports:
- `-f ascii` (default, terminal display)
- `-f markdown` (documentation)
- `--json` (machine-readable)

### Tips for Better Results

1. Keep one dominant intent and 2–5 meaningful terms per query: "keyboard focus modal", not a full audit checklist
2. Retry once with a narrower phrase or explicit domain/stack; do not cycle through unrelated keywords
3. Use `--design-system` for a new project/page and `--domain` for a focused concern
4. Pass the detected stack explicitly for implementation-specific guidance

### Troubleshooting Guide

| Problem | What to Do |
|---------|-----------|
| Can't decide on style/color | Re-run `--design-system` with different keywords |
| Dark mode contrast issues | `references/quick-reference.md` §6: color-dark-mode + color-accessible-pairs |
| Animations feel unnatural | `references/quick-reference.md` §7: spring-physics + easing + exit-faster-than-enter |
| Form UX is poor | `references/quick-reference.md` §8: inline-validation + error-clarity + focus-management |
| Navigation feels confusing | `references/quick-reference.md` §9: nav-hierarchy + bottom-nav-limit + back-behavior |
| Layout breaks on small screens | `references/quick-reference.md` §5: mobile-first + breakpoint-consistency |
| Performance / jank | `references/quick-reference.md` §3: virtualize-lists + main-thread-budget + debounce-throttle |

### Before Delivering UI Updates

Read `references/pro-rules.md` and run through its canonical Pre-Delivery Checklist. It covers icon/visual-element discipline, interaction feedback, light/dark contrast, safe-area layout, and accessibility.

---

## Project-Specific Guidelines

### Kingsland CRM Tech Stack

- **Framework**: React + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom dark theme
- **Icons**: Lucide React
- **Charts**: Recharts
- **Server**: Node.js/Express with SQLite

### Current Theme System

The CRM uses a sophisticated dual-theme system:

**Light Theme**:
- Primary: Indigo-600 (#4f46e5)
- Backgrounds: White, Slate-50
- Text: Slate-900, Slate-700

**Dark Theme**:
- Primary: Lime-400 (#c6f135)
- Backgrounds: #161713, #0e0f0c (dark zinc/black)
- Text: Zinc-100, Zinc-300
- Borders: Zinc-800

### Design Principles

1. **Executive Aesthetic**: Professional, high-contrast, minimal distractions
2. **Data Density**: Dashboard-focused with efficient information display
3. **Dual Theme Excellence**: Both themes are first-class citizens
4. **Accessibility First**: Proper contrast ratios, keyboard navigation, screen reader support
5. **Performance**: Fast load times, smooth animations, efficient rendering

### Key UI Patterns

- **Cards**: Rounded-xl borders with shadow-xs, hover effects
- **Buttons**: Primary (lime-400 dark / indigo-600 light), Secondary (outlined), Destructive (rose-600)
- **Forms**: Consistent input styling with focus states
- **Modals**: Backdrop blur with z-index layering
- **Navigation**: Collapsible sidebar with active state indicators

---

## Usage Examples for AI Assistant

When working on Kingsland CRM, use the UI/UX Pro Max skill for:

### New Feature Development
```
Before implementing: Query design system for consistent patterns
During implementation: Check domain-specific UX guidelines
After implementation: Run pre-delivery checklist
```

### Bug Fixes
```
UI issue reported → Query relevant domain (ux/accessibility/forms)
Apply recommended fix → Verify against checklist
```

### Theme Updates
```
Query dark mode best practices → Apply to specific component
Test contrast ratios → Validate accessibility
```

### Performance Optimization
```
Query performance domain → Identify bottlenecks
Apply React-specific optimizations → Measure improvement
```

---

*Last Updated: 2026-10-07*
*Maintained by: Development Team*
