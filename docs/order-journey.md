# Order journey

Customer and staff screens share the database orderNumber, padded to four digits for display. This number is a delivery reference, not an access credential. Public tracking uses a separate 192-bit random token at /order/{token}. New branch/menu links use publicCode. Existing UUID links are supported and the frontend replaces them with canonical public links.

Backend transitions are pending → preparing (acceptedAt) → ready (readyAt) → delivered (deliveredAt). Updates compare the current state atomically; skipped, reversed and competing transitions return HTTP 409. Staff keeps the confirmed state with a disabled loading action, and polling cannot overwrite it with an earlier state. Errors are shown on the affected card.

Elapsed time runs from createdAt until deliveredAt. Historical orders without recorded delivery timestamps display an unknown duration. Phase durations can be computed from the stored milestones for reporting; old timestamps are not fabricated.

## Release order

1. In dinehub-backend, deploy the additive migration with npm run db:migrate:deploy and regenerate Prisma Client with npx prisma generate.
2. Deploy the backend before the frontend: checkout now expects trackingPath, and QR generation uses publicCode.
3. Deploy the frontend. Reprint QR codes to use the new public links; old printed codes still resolve.
4. Verify a real test order with restaurant staff after release. No production orders were created by automated verification.

## Browser regression

Run a frontend preview on port 3100, then run node scripts/verify-order-journey.mjs with Playwright available. Optional PLAYWRIGHT_PACKAGE_JSON points to an external Playwright package.json; FRONTEND_TEST_URL selects another frontend preview. Chrome is used headlessly. All production API requests are intercepted with fixtures; no restaurant data is changed. The regression covers tracking redirects, numeric table navigation, loading locks, stale responses, update failure/retry, delivery and all six target widths.

Backend tests cover branch authorization, public payloads, forward transitions, concurrent updates and milestones. Frontend lint retains two pre-existing native-image optimization warnings.

Compatibility: creation responses and legacy UUID lookups retain the deprecated id field for already-open older clients during rollout. The new UI uses only trackingPath and orderNumber; token-based tracking responses omit internal IDs.
