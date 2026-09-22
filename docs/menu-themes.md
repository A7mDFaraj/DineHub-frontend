# Customer menu and celebration themes

## Production migration verification — 2026-09-22

The production migration `20260914000000_menu_celebrations` was applied successfully using `pnpm db:migrate:deploy` after restoring the ignored backend `.env`. A transient TLS failure cleared on the second attempt. All seven migration-history entries are finished, with none rolled back. Prisma reads of the new branch and product fields succeeded, and the deployed public menu endpoints for both existing branches returned HTTP 200 with the new theme fields. No orders or tenant settings were changed during verification. The rollout and verification notes below describe the original implementation checks; frontend deployment and authenticated editing still require their own verification.

The browse-only menu and QR table menu now share one responsive implementation. Admin → Settings provides six theme choices, a live preview, and a checkbox to show and apply a branch-wide percentage discount. Themes are selected manually; disabling the offer keeps the visual theme and restores regular prices.

## Design reference

[Charcoza’s menu](https://charcoza.com/menu/) uses a clear category hierarchy, generous spacing, food photography with asymmetric corners, prices beside dish names, calorie information, and small ingredient symbols. DineHub adapts these patterns with search, accessible food labels, interactive ordering, bilingual layouts, and original seasonal artwork. Charcoza’s photos, logo, menu copy, and source code are not included in the production menu.

The Saudi themes are original, reusable interpretations rather than year-specific official campaign identities. National Day uses palm green and gold; Founding Day uses earth tones and Najdi architectural linework. The current official identity resources were checked through [GEA](https://www.gea.gov.sa/nd/) and the [Founding Day brand site](https://www.foundingday.sa/en/brand/fonts). Ramadan uses a crescent and lanterns; Eid uses a floral motif.

| Theme | Intended use |
| --- | --- |
| DineHub Signature | Everyday ivory menu; preserves the branch’s chosen accent |
| Charcoal Table | Dark charcoal and warm gold |
| Saudi National Day | Green and gold with palm artwork |
| Founding Day | Earth tones and Najdi architecture |
| Ramadan Nights | Indigo, gold, crescent, and lanterns |
| Eid Gathering | Garden teal and floral linework |

## Settings and food data

Branch fields: `menuTheme`, `showSpecialDiscount`, and `discountPercent`. Defaults are `signature`, `false`, and `0`. An enabled offer requires an integer percentage from 1–100. The database also enforces the theme enum and discount bounds.

Product fields: optional `calories`, `allergens`, `ingredientTags`, and `dietaryTags`. Admin → Menu provides explicit controls for these fields. Empty calorie input saves `null`; empty selections save empty arrays. Food labels are never inferred from names or descriptions. Existing product attributes remain separate customization options.

Public menu responses return the discounted `price` and undiscounted `originalPrice`. Prisma Decimal computes the final unit price with half-up rounding to two decimals. Checkout repeats the same calculation and records that price in `priceAtOrder`. New clients send `expectedUnitPrice`; a changed price returns HTTP 409 instead of silently changing the amount. Already-open older clients can still submit without that optional field.

The cart is scoped to branch and table. Different customizations have distinct line IDs. Refreshing the menu synchronizes prices and removes unavailable products. The product and cart dialogs use Radix focus management and support Escape closing.

## Rollout

1. In the backend deployment, apply `prisma/migrations/20260914000000_menu_celebrations/migration.sql` using the existing `pnpm db:migrate:deploy` workflow.
2. Generate Prisma Client and deploy the backend containing the new DTOs, public response fields, and pricing logic.
3. Deploy the frontend.
4. Open Admin → Settings, select a branch, choose a theme and optional offer, and save. Open that branch’s public menu and table QR menu to confirm the saved result.

The frontend continues to call `https://dinehub-backend-42eq.onrender.com/api` directly. No development backend, proxy, production data edits, or production deployments were performed for this change. The migration is additive and gives existing branches and products safe defaults. Apply the backend first: the previous backend rejects the new form fields.

## Verification

- Backend build passed. Full Vitest suite: **130 tests across 18 files passed**. Includes food-field validation, invalid discount inputs, zero/100% handling, decimal rounding, public-menu pricing, checkout price changes, and forged expected prices.
- Frontend production build and TypeScript passed. Targeted ESLint: no errors; image optimization advisories remain for direct tenant image URLs.
- `node --experimental-strip-types scripts/verify-menu.mjs` passed: contrast, offer visibility, customized cart quantities, repricing, unavailable items, and branch/table isolation. Requires a Node version supporting type stripping.
- Browser checks at **320, 375, 768, 1024, 1440, 1920px**: no horizontal page overflow in the English National Day and Arabic Founding Day menus.
- All six themes tested with offers on and off. Search empty state, clearing search, category filtering, language switching, product details, quantity changes, item notes, cart totals, and Escape closing checked interactively.
- A 48 SAR sample dish becomes 36.96 SAR at 23% off; two units display 73.92 SAR in the dialog and cart.
- Development-only preview: `/en/menu-preview` or `/ar/menu-preview`. It uses labeled sample data, disables order submission, and returns not-found in production. It never changes a branch. The real settings preview shares the same banner and theme components.
- **Not verified against a deployed database:** migration application, authenticated settings persistence, and production order submission. These require the rollout above. No live orders were placed.

## Interface and color review

Full review scope: customer menu, theme controls/preview, product and cart dialogs. Next.js 16.3.3, React, existing CSS Modules and Tailwind conventions. Local Next.js client-component and CSS guides were reviewed after dependencies were installed; equivalent official documentation was consulted while installation was unavailable.

| Category | Evidence | Result |
| --- | --- | --- |
| Typography | English/Arabic browser layouts, numeric prices, wrapped headings | Clear in inspected views |
| Surfaces | Mobile and desktop layouts, food-image fallback, touch controls, dialogs | Clear in inspected views |
| Animations | Menu interactions use short property-specific transitions; dialogs have no custom entrance motion | No staged motion to replay |
| Icons | Shared Lucide food labels with visible text and descriptive titles | Clear in inspected views |
| Performance | Lazy food images, fixed image dimensions in CSS, no new runtime dependencies | Direct image optimization remains an advisory |

Declared color pairs were computed, not estimated. Across all six themes, the lowest body-muted/background contrast is **4.87:1**; the lowest default button contrast is **6.23:1**. Custom brand colors choose contrasting black or white button text. These measurements cover the declared solid token pairs; translucent decorative artwork is not used to communicate information.

Considered and rejected: copying Charcoza’s brand assets (tenant branding and photography should remain their own); reusing option checkboxes as allergens (food information must not look removable); year-specific official campaign logos (these templates should remain reusable); adding a new animation or icon dependency (the existing stack covers the interactions).

Verdict: local implementation checks passed. Production rollout and authenticated persistence remain unverified until deployment.
