# Customer ordering reliability release gate

## Contract and behavior

Customer cart lines identify a preparation by product ID, sorted option IDs and trimmed note. Checkout sends one line per product (maximum 99 portions in total), plus quantity-specific preparation instructions in the existing order note. Plain portions are included when a dish also has customized portions. Limits: 100 distinct products, 500 characters per preparation note, 1,000 general-note characters, 5,000 for the generated note. Instructions are never truncated.

The cart is versioned and scoped by branch/table in session storage. Menu refresh retains unavailable lines and requires explicit acceptance of changed prices. Session storage failure blocks submission with recovery guidance, because an order must have a saved retry key before it is sent. This protects against page reloads; it is not cross-device cart synchronization.

Pending submissions lock edits. Lost responses, malformed confirmations and server errors retain the exact payload/key; the confirmation action replays that same request. Only definitive rejection releases it. The confirmed tracking path is retained. A late response for another context must never clear the active table's cart.

Backend error codes: `PRICE_CHANGED`, `UNAVAILABLE`, `TABLE`, `DUPLICATE_PRODUCTS`, `IDEMPOTENCY_CONFLICT`, `VALIDATION`, `RATE_LIMIT`. Customer messages use a localized allowlist, never the server's raw message. Unknown outcomes are not represented as confirmed failures.

## Automated evidence

Run frozen installation before checks. Frontend:

```sh
pnpm install --frozen-lockfile && pnpm lint
pnpm test:checkout
node --experimental-strip-types scripts/verify-menu.mjs
node --experimental-strip-types scripts/verify-realtime.mjs
node scripts/check-deployment.mjs
pnpm build:cf
pnpm exec playwright install --with-deps chromium webkit
pnpm test:customer
```

On Windows, installed Chrome can be used with `PLAYWRIGHT_CHROME=1` and `--project=chromium`. This does not verify WebKit. Browser routes intercept the production API URL; these tests must never create real orders. Failure traces/screenshots are retained under ignored `test-results` and `playwright-report` directories and uploaded on CI failure.

The browser suite starts the production Next server, so build before running it. Do not run a dev server on test port 3100 or reuse an unrelated server there. CI builds with the actual production API origin; only browser test routing substitutes fixtures.

Backend: deployment check, frozen installation, lint, tests and production build. The `checkout-contract` CI job creates a disposable PostgreSQL service and consumes `scripts/export-checkout-fixture.mjs` from the frontend checkout. It validates the real DTO and executes creation, concurrent idempotent retries, preparation-note storage, staff transitions and rating against the real database. It rejects any database host other than localhost and any database name other than `dinehub_checkout_test`.

Set `FRONTEND_CONTRACT_REF` to the exact frontend commit being released. Until set, the job checks frontend `master`. For private cross-repository checkout, provision the read-only `CONTRACT_READ_TOKEN` secret. The frontend commit must contain the exporter before this new job can pass. No production database or credentials are used for this test. Its fresh database uses schema bootstrap, not the incomplete historical baseline migrations.

## Journey acceptance checklist

For every row record browser/device, language, frontend/backend commits, result and evidence. Unchecked items are unverified, not passed.

| Interaction | Required observations |
| --- | --- |
| QR/menu entry | Correct branch/table; invalid table recovery; browsing without a table; load failure and retry; empty menu |
| Browse/search | Categories; no-result recovery; missing images; Arabic and English names; sold-out dish cannot be added |
| Customize | Stable options across languages; long notes; 99-per-dish limit across all preparations; cancel; return focus |
| Cart | Edit options/notes; quantities; remove/undo; accurate totals; full-note limit; refresh and language-change persistence; table isolation |
| Checkout | Combined dish with exact preparation quantities; plain portion retained; double-tap lock; slow/offline/rate-limited states; retry same key after lost response; no raw errors |
| Menu change | Unavailable item retained; review/accept changed price; recovery does not discard cart |
| Kitchen | Combined quantity and every preparation note visible and readable to staff |
| Tracking | Confirmation code; previous-order link; reconnect; last known state retained; no backward status transitions; return to correct table |
| Feedback | Rating only after delivery; failed rating retains choice and offers retry |
| Accessibility | Focus visible and restored; keyboard operation; announced errors; touch targets; 200% text; reduced motion |
| Mobile | 320/375/768/1024/1440/1920 widths; long content; open keyboard; safe-area footer; scroll reaches every control |

Physical **Android Chrome and iPhone Safari** checks are mandatory before promotion. Desktop browser emulation cannot verify their virtual keyboard or OS behavior. Also inspect all six existing themes and slow-network loading/error states. Do not represent this checklist as a completed WCAG audit.

## Promotion and rollback

1. Require both repositories' verification jobs and backend checkout-contract job in repository rules and provider deployment gates. Committing workflows alone does not configure these external controls.
2. This change requires no migration. If a later release does, migrate and verify separately before backend deployment.
3. Deploy the compatible backend with stable error codes and exposed `Retry-After`, then verify readiness and a populated public menu. Keep `start:prod` unchanged.
4. Promote frontend only after automated and physical-device gates pass. Preserve direct production URLs, Cloudflare patches and the frozen lockfile.
5. Verify provider build results and read-only deployed browser/menu/table behavior; a Git push is not deployment evidence. Do not submit production orders for smoke testing.
6. Review existing incident logs for `checkout.outcome` (rejected/confirmation_unknown) and request errors after release. Do not log notes, cart payloads, private tracking tokens or credentials. A repeated unknown/error pattern blocks further promotion and requires investigation.
7. Roll back to a previously verified compatible frontend/backend pair if ordering, quantities or recovery regress. Keep session-storage v2 and idempotency records; do not clear pending orders or reset the database as a rollback step. Record the rollback versions and verify read-only behavior again.

Every customer-impacting fix requires a regression test. Release is blocked by known order loss, duplicates, wrong prices, missing preparation instructions, inaccessible primary controls, or incomplete required evidence.

## Local verification — September 28, 2026

- Frontend lint, checkout/store checks, menu checks, realtime checks, deployment checks and Cloudflare production build passed.
- Backend: 218 tests, lint, deployment checks and production build passed. The broader `tsc --noEmit` command also includes existing menu-test typing errors at `src/modules/menu/menu.service.spec.ts:79–81`; these are outside the production build and were not suppressed.
- Fourteen Chrome browser scenarios passed against the production build, including Arabic/English and all six target widths. The Arabic cart was visually inspected. Focus restoration and short-viewport large-text clipping found by this suite were repaired.
- WebKit execution remains unverified: browser downloads timed out from the available mirrors.
- The database contract suite is implemented and wired into CI, but was not run locally because the Docker database engine is not running. Its passing CI evidence remains mandatory.
- Physical Android/iPhone checks, hosted CI execution, external repository/provider gate settings and deployed behavior remain unverified. These changes have not been pushed or deployed; no production orders were created.
