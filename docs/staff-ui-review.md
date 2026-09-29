# Staff interface review — 29 September 2026

## Follow-up: collapsible sidebar

Added the requested circular edge control to the shared shell. It switches between a 272px sidebar and an 88px icon rail, recovering 184px for the page. The preference is stored locally with a versioned key; unavailable storage does not prevent toggling. Desktop links retain accessible names and native hover titles. The full mobile drawer remains unchanged.

Full review scope: shared sidebar in Arabic/English, existing Next.js/React and CSS modules.

| Category | Evidence inspected | Result |
| --- | --- | --- |
| Typography | Icon-only labels and mobile drawer text | Explicit accessible names; mobile labels remain visible |
| Surfaces | Edge circle and expanded/collapsed sidebar screenshots | 32px visual circle within a 44px target; existing colors and shadows |
| Animations | CSS and reduced-motion browser check | Immediate layout change; only hover color transitions, disabled with reduced motion |
| Icons | Arabic/English arrows and navigation | Direction-aware Lucide arrows; active navigation retained |
| Performance | 720-order browser regression suite and production build | No new dependency; collapsed layout remains bounded and responsive |

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `components/admin/dashboard-shell.tsx`, `admin-shell.module.css`, locale messages | Fixed-width desktop navigation | Persistent icon rail with circular keyboard-accessible control | More usable workspace without losing navigation |

Rejected: removing the navigation entirely, which hides useful destinations; animating the grid width, which repeatedly lays out the order board during collapse. Verified six widths, expanded/collapsed overflow, 184px workspace gain, Enter/Space activation, persistence across reload and cross-layout navigation, visible mobile labels, permission filtering, lint and production build. The expanded `scripts/verify-staff-ui.mjs` passed including the 720-order cases. No production deployment, assistive-technology session or 10%-speed Animations-panel inspection was performed. **Verdict: Approve for local review.**

## Follow-up: modifiers and large queues

Selected modifiers now use a labeled, non-interactive checklist, separate from the special-note area. Checkout labels selected options explicitly; the parser also accepts the preceding special-note format. Truly unstructured legacy instructions remain intact without guessing. Both serialized options and `selectedAttributes` use the same component.

| Category | Evidence | Result |
| --- | --- | --- |
| Typography | Arabic/English modifiers, long dish names, 160-character unbroken option | Wrapped without horizontal overflow at all six widths |
| Surfaces | Options checklist versus special/general notes | Separate label and lilac surface, no badges |
| Animations | Pagination and reduced-motion browser checks | No added animation; immediate page scrolling |
| Icons | Checklist and pagination arrows | Existing Lucide icons, decorative semantics, RTL arrows |
| Performance | 600 active + 120 delivered fixture orders | At most 24 mounted tickets; all 720 reachable |

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| HIGH | `components/staff/order-card.tsx`, `lib/checkout.ts`, `lib/staff-order-note.ts` | Selected options looked like written notes | Explicit metadata and separate labeled checklist | Distinguish preset choices from written requests |
| MEDIUM | Staff page, `components/staff/order-pagination.tsx`, staff CSS | All tickets and timers mounted simultaneously | 24-ticket pages, controls at both ends, range indicator, cross-page search, focus returning to toolbar, valid-page clamping | Bound rendering cost and keep long queues navigable |

Rejected: guessing the meaning of unstructured historical text; mounting hundreds of tickets simultaneously; clipping long notes. These compromise instruction accuracy, rendering cost or readability.

Verification: the expanded UI suite passed against development and optimized production builds with 600 active and 120 delivered orders, Arabic/English, 320/375/768/1024/1440/1920px, long content, off-page search, every ticket across 30 pages without omissions/duplicates, and remote deliveries shrinking the final pending page. Inspected mobile/desktop screenshots. Lint, production build, parser/checkout scripts, realtime tests and both customized-checkout browser cases passed. Backend source confirms all live orders are returned, with separate cursor pagination for history; no backend change was needed.

**Verdict: Approve for local review.** This is a frontend test using intercepted API responses, not a production backend load test. Physical-device performance, assistive technology and production throughput remain unverified.

Full review of `/staff`, its shared dashboard navigation, and permission-sensitive overview shortcuts. Next.js 16.3.3 / React 19, existing CSS and Tailwind conventions, existing dashboard color tokens. Reviewed Arabic and English against mocked API responses in a real Chromium browser, including the optimized production build. No production orders were created.

## Coverage

| Category | Evidence inspected | Result |
| --- | --- | --- |
| Typography | Order cards, timers, Arabic notes within English UI, six viewport widths | Larger order identifiers, 20–23px dishes, 18px notes, stable numeric widths, explicit Arabic font fallback |
| Surfaces | Status filters, tickets, takeaway callouts, separate note areas, mobile layout | Shared dashboard palette, soft translucent surfaces, structural separators, 48–58px primary controls |
| Animations | Refresh/update feedback, reduced-motion browser emulation, source inspection | Removed recurring card entrance/layout animation; limited transitions to color and press feedback |
| Icons | Navigation, refresh, search, takeaway, notes and directional action arrows | Existing Lucide family, decorative icons hidden from accessibility tree, RTL arrows preserved |
| Performance | Production build, API request interception, code review | Removed staff motion dependency, reused navigation, avoided duplicate staff branch-provider fetch, retained reconciliation and single-flight updates |

## Findings addressed

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| HIGH | `components/staff/order-card.tsx`, `app/[locale]/(staff)/staff/staff.css` | Very small dish names, quantities and notes | Larger type, prominent order/table identifiers, generous action controls | Readability and touch hit areas |
| HIGH | `lib/checkout.ts`, `lib/staff-order-note.ts`, `components/staff/order-card.tsx`, `messages/ar.json`, `messages/en.json` | Special notes mixed with modifiers; general notes labeled generically | New special-note marker, separate special/general labels, multiline parsing, full-width takeaway instruction | Prevent preparation mistakes; preserve note meaning |
| MEDIUM | `components/staff/order-card.tsx` | Dish totals repeated above preparation breakdown | Matching portions and instructions displayed together; ambiguous legacy notes kept separately | Reduce ticket height without guessing or discarding instructions |
| HIGH | `components/admin/dashboard-shell.tsx`, `components/admin/permission-gate.tsx`, admin and staff layouts, admin overview | Standalone staff header; overview shortcuts not permission-filtered | Shared desktop/mobile navigation, permission-filtered shortcuts and guide, account-security link, permitted return to live orders | Consistent navigation and authorized actions |
| MEDIUM | `app/[locale]/(staff)/staff/page.tsx` | Tiny pill filters, no search, limited retry affordance | Plain status/count controls, search by order/table/dish, clear empty results and retry action | Faster scanning and recovery |
| MEDIUM | `components/orders/order-elapsed.tsx` | Delay status calculated separately from live timer | Delay indication updates with timer and is suppressed for delivered orders | Keep operational information current |
| MEDIUM | `app/[locale]/(staff)/staff/staff.css` | Small note text and inconsistent mixed-language fallback | Explicit Arabic font for RTL content in either locale, wrapping, contrasting note treatments | Preserve readability for bilingual orders |
| LOW | Staff card/page and CSS | Layout animation on frequent order updates, `transition-all` | Stable tickets, specific transitions, reduced-motion support, visible focus outlines | Motion restraint and predictable interaction |

## Considered but rejected

| Candidate | Reason |
| --- | --- |
| Decorative badges and status capsules | User explicitly rejected badges; status is communicated by plain text and a structural edge |
| Repeated animated card entrances | Distracting for a frequently updated kitchen display |
| Guessing which legacy modifier is a special note | Old saved strings do not distinguish options from free text; preserving original instructions avoids changing meaning |
| Database/API migration | Explicit note labels fit the existing supported order-note payload |

## Verification

- `pnpm lint`: passed.
- `pnpm build`: passed, including TypeScript and all route generation. Existing middleware deprecation warning remains unrelated to this work.
- `pnpm exec tsc --noEmit`: passed after generated route types were available.
- `node --experimental-strip-types scripts/verify-staff-notes.mjs`: passed Arabic/English serialization, takeaway, multiline notes and legacy notes.
- `node --experimental-strip-types scripts/verify-checkout.mjs`: passed.
- `node --experimental-strip-types scripts/verify-realtime.mjs`: all four tests passed.
- `node scripts/verify-menu.mjs`: passed.
- `pnpm exec playwright test tests/customer/checkout.spec.ts --grep 'customized portions' --project chromium`: both Arabic/English cases passed.
- `node scripts/verify-staff-ui.mjs`: passed on development and optimized production builds. Checked 320, 375, 768, 1024, 1440 and 1920px in Arabic and English, note labels, takeaway, search, failed updates, pending actions, all status transitions, delivered filtering, read recovery, empty results, mobile drawer/Escape, reduced motion, restricted navigation, direct denied routes, and absence of denied API reads.
- Inspected rendered desktop/mobile screenshots and refined the layout afterward; final screenshots use fixture data.
- `git diff --check`: passed.

**Verdict: Approve for local review.** Not verified: physical viewing distance, assistive-technology use, a 10%-speed browser Animations-panel review, production-account permissions or deployed behavior. No deployment was requested or performed. Existing unlabeled legacy note strings remain under item instructions because their options and special notes cannot be reliably separated retroactively.
