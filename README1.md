# Kingsland Holidays CRM — Improvement & Modernization Guide

> Working guide for Antigravity / coding agents improving the Kingsland Holidays CRM.
>
> **Primary goals:**
> 1. Make the codebase easier and safer to extend.
> 2. Turn the frontend into a serious, modern B2B CRM instead of a playful/cartoon-like UI.
> 3. Preserve existing CRM, Operations, Payments, Voucher, Quote, Itinerary, Accounts, and User workflows while refactoring.

---

## 1. Product Direction

Kingsland is an internal travel-sales and operations system. The interface should optimize for:

- fast scanning;
- low error rate;
- clear ownership and status;
- quick data entry;
- reliable financial and booking information;
- strong desktop productivity with usable tablet/mobile fallbacks.

This is **not** a consumer travel landing page. Avoid decorative UI that competes with operational data.

### Visual target

Think:

- modern B2B SaaS / enterprise CRM;
- clean travel-operations feel;
- neutral surfaces;
- strong typography and hierarchy;
- restrained accent color;
- dense but readable tables;
- consistent forms;
- professional dashboards;
- predictable actions and states.

### Do not make it look cartoon-like

Avoid:

- excessive gradients;
- rainbow status colors;
- giant rounded cards everywhere;
- oversized headings on work screens;
- playful blobs or decorative illustrations;
- bouncing/continuous animations;
- emoji as primary UI icons;
- shadows on every container;
- too many pill-shaped buttons;
- saturated full-page backgrounds;
- multiple competing accent colors;
- every section being its own floating card.

Use color primarily for **meaning**, not decoration.

---

# 2. Current Architecture Problems

The current code works as a prototype but has several structural problems that should be corrected incrementally.

## Priority issues

### P0 — security / data integrity

Before production exposure:

- enforce authentication and authorization on the API, not only in React;
- hash passwords and never return passwords/password hashes to clients;
- replace the current localStorage-based login identity with server-verifiable sessions;
- remove default credentials from source;
- rotate any secrets that were shared in archived `.env` files;
- make password-reset OTP generation cryptographically secure;
- never log OTPs/secrets;
- remove production behavior that reports successful localStorage writes after the backend failed.

UI permission checks remain useful for UX, but they are not a security boundary.

### P1 — application ownership

The Operations app currently has its own frontend while CRM also imports Operations source directly.

Do not keep two ownership models.

Preferred end state:

```text
apps/
  crm/
  ops/
  api/
packages/
  domain/
  api-client/
  ui/
  config/
```

Use workspaces so shared dependencies and types resolve consistently.

### P1 — very large React files

Some current components mix presentation, business logic, network calls, calculations, dialogs, and state in one file.

Examples include:

- `App.tsx`
- `components/PaymentManagerModal.tsx`
- `components/LeadProposalView.tsx`
- `components/HotelVouchersView.tsx`
- `operations-team-portal/src/components/InvoiceModule.tsx`

Do not split files only to make them smaller. Split by stable responsibility.

Recommended extraction order:

1. pure calculations / formatters;
2. types and validation;
3. API requests;
4. feature hooks / state machines;
5. modal and drawer sections;
6. presentational components.

---

# 3. Recommended Project Structure

## Target monorepo

```text
kingsland-crm/
├─ apps/
│  ├─ crm/
│  │  └─ src/
│  │     ├─ app/
│  │     ├─ routes/
│  │     ├─ features/
│  │     ├─ components/
│  │     └─ styles/
│  │
│  ├─ ops/
│  │  └─ src/
│  │     ├─ app/
│  │     ├─ routes/
│  │     ├─ features/
│  │     ├─ components/
│  │     └─ styles/
│  │
│  └─ api/
│     └─ src/
│        ├─ modules/
│        ├─ middleware/
│        ├─ db/
│        ├─ lib/
│        └─ index.ts
│
├─ packages/
│  ├─ domain/
│  │  ├─ leads/
│  │  ├─ quotes/
│  │  ├─ itineraries/
│  │  ├─ payments/
│  │  ├─ vouchers/
│  │  ├─ users/
│  │  └─ permissions/
│  │
│  ├─ api-client/
│  ├─ ui/
│  └─ config/
│
├─ package.json
├─ tsconfig.json
└─ README.md
```

## If a monorepo move is too large right now

Use this structure first without changing deployments:

```text
src/
├─ app/
│  ├─ App.tsx
│  ├─ providers/
│  └─ router/
├─ features/
│  ├─ dashboard/
│  ├─ leads/
│  ├─ quotes/
│  ├─ itineraries/
│  ├─ payments/
│  ├─ accounts/
│  ├─ vouchers/
│  └─ users/
├─ components/
│  └─ ui/
├─ lib/
├─ services/
├─ hooks/
├─ types/
└─ styles/
```

### Feature folder example

```text
features/leads/
├─ api/
│  ├─ getLead.ts
│  ├─ listLeads.ts
│  └─ updateLead.ts
├─ components/
│  ├─ LeadHeader.tsx
│  ├─ LeadDetails.tsx
│  ├─ LeadActivity.tsx
│  └─ LeadStatusMenu.tsx
├─ hooks/
│  └─ useLead.ts
├─ model/
│  ├─ lead.types.ts
│  └─ lead.validation.ts
├─ pages/
│  ├─ LeadListPage.tsx
│  └─ LeadDetailPage.tsx
└─ index.ts
```

## Dependency direction

Keep dependencies flowing in one direction:

```text
pages/routes
    ↓
features
    ↓
shared UI + domain + api-client
    ↓
low-level utilities
```

Do not let shared UI import feature/business modules.

Do not directly import source files across independent apps.

---

# 4. Safe Migration Order

Do not do a complete rewrite.

## Phase 1 — Stabilize

1. Add real API authentication/session middleware.
2. Add API authorization per protected route.
3. Hash passwords and sanitize user responses.
4. Remove secret values from committed/shared files.
5. Remove fake-success localStorage fallback in production.
6. Update retired AI model configuration and expose AI outage clearly.
7. Add `typecheck`, `lint`, `test`, and production `build` scripts.

## Phase 2 — Create shared foundations

1. Introduce design tokens.
2. Bundle Tailwind instead of loading it at runtime from a CDN.
3. Create shared UI primitives.
4. Create shared domain/API types.
5. Create one typed API client.
6. Standardize errors, loading, empty states, dialogs, and toasts.

## Phase 3 — Refactor by feature

Recommended order:

1. App shell / navigation
2. Dashboard
3. Leads
4. Quotes / proposals
5. Itineraries
6. Payments
7. Vouchers
8. Operations
9. Accounts
10. User management

Refactor one working vertical slice at a time.

## Phase 4 — Route and performance cleanup

- move main navigation to URL-backed routing;
- lazy-load large route modules;
- remove dead imports/dependencies after verification;
- add table pagination/filtering where dataset size requires it;
- avoid unnecessary global rerenders;
- optimize heavy PDFs/preview screens separately from ordinary UI.

---

# 5. UI Design System

Create a small design system before redesigning individual pages.

## Typography

Use one professional sans-serif stack consistently.

Recommended hierarchy:

```text
Page title      24–30px / semibold
Section title   18–20px / semibold
Card title      14–16px / semibold
Body            14px / regular
Metadata        12–13px / regular
Table header    12px / medium or semibold
Numeric KPI     24–32px / semibold
```

Avoid 40–60px headings inside operational pages.

## Spacing

Use an 8px-based rhythm:

```text
4px   micro gap
8px   compact gap
12px  related controls
16px  normal component spacing
24px  section spacing
32px  major section spacing
```

Avoid random values per component.

## Radius

Use restrained rounding:

```text
Inputs/buttons: 6–8px
Cards/panels:   8–12px
Dialogs:        10–14px
```

Do not make every element `rounded-2xl` / `rounded-3xl`.

## Elevation

Default panels should usually use a border, not a heavy shadow.

Use shadows only for elements that visually sit above the page:

- menus;
- popovers;
- dialogs;
- drawers;
- drag/drop overlays.

## Color roles

Use tokens instead of arbitrary Tailwind colors in feature code.

Example semantic tokens:

```text
surface
surface-muted
surface-raised
border
text-primary
text-secondary
text-muted
primary
primary-hover
danger
warning
success
info
focus-ring
```

Every status must include a text label. Never communicate meaning with color alone.

### Status example

Good:

```text
● Payment overdue
● Confirmed
● Awaiting voucher
```

Bad:

```text
red blob
bright green pill
orange gradient card
```

---

# 6. Shared UI Components to Build First

Create these primitives once and reuse them.

```text
Button
IconButton
Input
Textarea
Select
Checkbox
RadioGroup
Switch
Field
FieldError
SearchInput
Badge
StatusBadge
Avatar
Tabs
Tooltip
DropdownMenu
Popover
Dialog
Drawer
Toast
EmptyState
ErrorState
Skeleton
Spinner
PageHeader
SectionHeader
DataTable
Pagination
FilterBar
StatCard
DescriptionList
Timeline
```

## Rules

- all buttons need consistent height and focus style;
- destructive actions need a destructive visual treatment;
- icon-only buttons require accessible labels/tooltips;
- form fields need labels and inline error messages;
- do not use browser `alert()` or `confirm()` for normal product flows;
- use Dialog/Toast patterns instead;
- loading states should preserve layout where possible;
- errors should explain what failed and offer a recovery action.

---

# 7. App Shell Redesign

The app shell should immediately feel like business software.

## Desktop

Recommended layout:

```text
┌──────────────┬──────────────────────────────────────────┐
│ Sidebar      │ Top bar                                  │
│              ├──────────────────────────────────────────┤
│ Dashboard    │                                          │
│ Leads        │ Page                                     │
│ Quotes       │                                          │
│ Operations   │                                          │
│ Payments     │                                          │
│ Accounts     │                                          │
│ Users        │                                          │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

### Sidebar

- 220–260px expanded width;
- simple company mark/name;
- Lucide icons + labels;
- active item uses restrained background/accent border;
- group related modules;
- user/account control at bottom;
- no oversized colorful nav tiles.

### Top bar

Contain only globally useful controls:

- current page context/breadcrumb;
- global search if genuinely useful;
- notifications if implemented;
- profile/account menu.

Do not put every page action into the global header.

---

# 8. Page Layout Standard

Every major page should follow the same predictable structure.

```text
PageHeader
  title
  concise subtitle/context
  primary action
  optional secondary actions

FilterBar / Tabs

Primary content

Pagination / summary
```

Example:

```text
Leads                                      + New lead
Manage enquiries and sales follow-ups

[Search...] [Owner] [Stage] [Travel date] [More filters]

------------------------------------------------------------
Customer      Destination      Travel date    Owner    Status
------------------------------------------------------------
...
```

Do not wrap the full page inside a decorative giant card unless the interaction genuinely requires it.

---

# 9. Dashboard UX

The dashboard should answer:

1. What needs attention now?
2. What changed?
3. What is at risk?
4. Where should the user go next?

## Recommended order

### Row 1 — key metrics

Keep 4–6 meaningful metrics maximum.

Examples only when backed by actual data:

- active leads;
- quotes awaiting response;
- upcoming departures;
- payment amount due;
- vouchers pending;
- operational issues.

Never fabricate metrics.

### Row 2 — attention queues

Examples:

- overdue follow-ups;
- payments requiring action;
- missing vouchers;
- operations blockers.

### Row 3 — trends / recent activity

Charts are useful only if they answer a real operational question.

Do not add charts only because dashboards usually have charts.

---

# 10. Data Tables

CRM tables are productivity tools. Prioritize scanning.

## Table rules

- sticky header for long lists;
- consistent row height;
- readable column alignment;
- numbers/currency right-aligned;
- status labels are compact;
- row primary identifier is visually strongest;
- sort only where sorting has value;
- filter state should be visible;
- show result count;
- avoid excessive row-level buttons.

Use a row action menu for secondary actions.

Keep one obvious primary row interaction such as opening the record.

## Responsive behavior

Do not squeeze a 10-column table onto a phone.

For narrow screens:

- show the 3–5 most important fields;
- move secondary metadata to a details drawer/card;
- maintain access to actions;
- preserve status, amount, date, and owner when relevant.

---

# 11. Forms

Use forms that feel calm and predictable.

## Rules

- maximum sensible content width;
- group related fields under plain section headings;
- labels above controls;
- mark required fields clearly;
- validate near the field;
- preserve entered values after recoverable errors;
- use native/input semantics where possible;
- date and money formats must be consistent;
- do not put six different button styles in one form.

### Form actions

For major forms:

```text
Cancel                  Save changes
```

For destructive actions, separate them visually from normal save actions.

---

# 12. Lead Detail UX

Recommended information architecture:

```text
Lead Header
  Customer name
  Lead ID
  Status
  Owner
  Primary action

Tabs
  Overview
  Conversation / Activity
  Proposal
  Itinerary
  Payments
  Documents

Overview
  Contact
  Trip requirements
  Travel dates
  Travellers
  Budget
  Follow-up
  Internal notes
```

Do not show every feature simultaneously in one giant scroll if tabs/sections make the workflow clearer.

Keep critical status/action context visible near the top.

---

# 13. Payment UX

Payment screens require extra clarity.

Always make these visually obvious:

- total booking amount;
- amount received;
- amount outstanding;
- due date;
- payment status;
- installment history;
- who recorded/changed payment information when audit data exists.

Never use decorative styling that reduces financial clarity.

Destructive or irreversible payment actions require explicit confirmation.

Do not silently save only to localStorage when server persistence fails.

---

# 14. Voucher / Operations UX

Operations staff need queues more than decorative dashboards.

Useful grouping:

```text
Needs action
Waiting on supplier
Ready
Sent to customer
Issue / blocked
```

Every item should make these easy to scan:

- booking/customer;
- departure date;
- supplier/service;
- current state;
- owner;
- missing requirement;
- next action.

Prefer actionable queues and filters over many KPI cards.

---

# 15. Interaction Rules

## Buttons

Use a small hierarchy:

```text
Primary      one main action per area
Secondary    normal alternate action
Ghost        tertiary/navigation action
Destructive  delete/cancel dangerous action
```

Avoid making all buttons look primary.

## Modals vs drawers vs pages

Use:

- **Dialog:** short decision or short focused form;
- **Drawer:** inspect/edit contextual details without losing list context;
- **Page:** complicated workflows, long forms, proposals, itineraries, detailed financial work.

Do not put a 100 KB workflow inside one modal component.

## Toasts

Use toast for short confirmation:

```text
Lead updated
Voucher uploaded
Payment recorded
```

Use an inline error state/dialog when the user must take action.

---

# 16. Accessibility Baseline

Required:

- keyboard-accessible controls;
- visible focus state;
- semantic buttons/links;
- labels linked to inputs;
- accessible dialog focus management;
- sufficient text/background contrast;
- status not communicated by color alone;
- icon-only controls have accessible names;
- logical heading hierarchy.

Accessibility improvements generally make operational software faster and safer for everyone.

---

# 17. Responsive Strategy

Design desktop-first for CRM productivity, but intentionally support smaller screens.

Suggested behavior:

### Large desktop

- sidebar expanded;
- full tables;
- 2–3 column details where useful.

### Laptop/tablet

- narrower sidebar or collapsible navigation;
- reduce columns;
- stack secondary panels.

### Mobile

- sidebar becomes drawer;
- one-column content;
- key actions remain reachable;
- tables switch to reduced-column lists/cards;
- dialogs should not exceed viewport height;
- sticky action bars only when they materially improve workflow.

---

# 18. Frontend Engineering Rules

## State

Keep state near the feature that owns it.

Avoid using the root `App.tsx` as a global state bucket.

Separate:

- server state;
- form state;
- UI state;
- derived values.

Do not duplicate derived data in state when it can be calculated safely.

## API calls

Do not scatter raw `fetch()` calls across view components.

Prefer:

```text
features/<feature>/api/*
```

or shared typed API client functions.

Every request should define:

- request type;
- response type;
- expected errors;
- validation where external/untrusted data enters the system.

## Types

Move toward TypeScript strict mode incrementally.

Start with:

1. API request/response boundaries;
2. database/domain models;
3. feature props;
4. form data;
5. utility functions.

Do not solve type errors by spreading `any` or unsafe casts.

---

# 19. AI Feature Rules

AI output must never look like verified business data when the model is unavailable.

- configure model name on the server;
- use a currently supported stable model;
- validate structured model output;
- expose a clear unavailable/degraded state;
- do not fabricate prices, lead scores, dates, or recommendations as fallback truth;
- never expose API keys to client logs/storage.

---

# 20. Definition of Done for Every Refactor

A change is not complete because the screen looks nicer.

For every changed feature verify:

- [ ] existing business workflow still works;
- [ ] loading state exists;
- [ ] empty state exists when applicable;
- [ ] error state exists;
- [ ] success feedback is clear;
- [ ] write errors do not become fake success;
- [ ] server authorization protects writes;
- [ ] desktop layout checked;
- [ ] tablet/mobile behavior checked where relevant;
- [ ] keyboard/focus behavior checked;
- [ ] no new console errors;
- [ ] no secret information is rendered/logged;
- [ ] typecheck passes;
- [ ] production build passes;
- [ ] relevant tests pass;
- [ ] no unrelated feature was rewritten.

If verification cannot be run, report exactly:

```text
NEEDS DATA: <missing verification or environment requirement>
```

Do not claim a build/test passed unless it was actually executed successfully.

---

# 21. Antigravity Execution Instructions

Two skills are included with this project:

```text
.agents/skills/kingsland-architecture-hardener/SKILL.md
.agents/skills/kingsland-frontend-modernizer/SKILL.md
```

Use the architecture skill for:

- project/file structure;
- auth/security;
- API boundaries;
- database/persistence;
- shared types;
- dependency/build cleanup;
- large-file refactoring foundations.

Use the frontend skill for:

- CRM visual redesign;
- page composition;
- responsive UI;
- design-system components;
- accessibility;
- modal/table/form cleanup;
- frontend component splitting.

## Agent working rule

Before making a change:

1. inspect the complete feature flow;
2. identify data/API dependencies;
3. identify the smallest safe implementation slice;
4. implement it;
5. verify it;
6. report exactly what changed.

Never perform a blind full-app rewrite.

---

# 22. Recommended First UI Sprint

Use this as the first visual modernization milestone.

## Step 1 — foundation

- bundle Tailwind properly;
- create tokens for color, spacing, radius, typography, and shadows;
- create `Button`, `Input`, `Select`, `Badge`, `Dialog`, `Toast`, `PageHeader`, `DataTable`, and `EmptyState`;
- remove duplicated visual styles from feature components as each feature is touched.

## Step 2 — shell

- redesign sidebar;
- redesign top bar;
- establish page width and spacing rules;
- implement URL-backed routing if feasible within the same slice.

## Step 3 — one reference feature

Redesign **Leads** first and use it as the reference standard:

- lead list;
- filters/search;
- lead detail header;
- status treatment;
- owner/date/contact display;
- empty/loading/error states;
- responsive behavior.

Do not redesign every screen before this reference feature is validated.

## Step 4 — propagate the system

Apply the same primitives and spacing/hierarchy to:

- Dashboard;
- Proposals;
- Itineraries;
- Payments;
- Vouchers;
- Operations;
- Accounts;
- Users.

---

# 23. Suggested Visual Acceptance Criteria

The new frontend should pass these subjective-but-testable checks:

- at first glance it resembles serious internal business software, not a game or consumer travel page;
- there is one clear primary action per page/section;
- colors are restrained and semantic;
- users can scan status, dates, owners, amounts, and customer names quickly;
- tables feel compact and readable;
- forms use one consistent pattern;
- pages share the same spacing/hierarchy;
- cards are used intentionally rather than around every block of content;
- no essential workflow relies on browser alerts;
- mobile layouts remain usable without hiding critical actions.

---

# 24. Recommended Agent Prompt

Use this when starting work in Antigravity:

```text
Read README.md, AGENTS.md, and the relevant skill files before editing.

Improve Kingsland CRM incrementally. First preserve business behavior and data integrity, then improve maintainability and UI.

For frontend work, make the product look like a professional B2B travel CRM: neutral surfaces, strong typography, restrained colors, compact readable tables, consistent forms, clear statuses, minimal decorative effects, and predictable navigation. Remove cartoon-like styling such as excessive gradients, oversized rounded cards, playful colors, emoji-based UI, and unnecessary animation.

Do not rewrite the whole app. Work one feature at a time. Inspect the component, API calls, server route, types, and persisted fields before changing a feature.

For large files, extract responsibilities in this order: calculations, types/validation, API calls, hooks/state, dialogs/sections, then presentation.

Never claim tests/builds passed unless you ran them successfully. Never replace backend errors with fake local success. Never expose secrets or passwords.

For each completed slice report:
Changed:
Why:
Verified:
Risk:
NEEDS DATA:
```

---

# 25. Immediate Priorities

Recommended implementation queue:

```text
P0  Server authentication + authorization
P0  Password/OTP/secrets fixes
P0  Remove production localStorage fake-success writes
P1  Current stable AI model + honest degraded state
P1  Tailwind/design-token foundation
P1  Shared UI primitives
P1  App shell/navigation redesign
P1  Leads reference redesign
P1  Break apart largest feature files
P1  Shared typed API client/domain contracts
P2  Dashboard modernization
P2  Payment/Voucher/Operations UX modernization
P2  URL routing + lazy loading
P2  Tests/CI/dependency cleanup
```

---

## Final principle

**Do not optimize Kingsland for visual novelty. Optimize it for trust, speed, clarity, and safe operations.**

A clean professional CRM with consistent patterns will look better and will also reduce mistakes, training time, and future development cost.
