# Frontend deployment runbook (Vercel)

## Release order

1. Apply and verify additive database migrations using the backend runbook.
2. Deploy the compatible backend and verify `/api/health/ready` plus a populated public menu.
3. Run `pnpm install --frozen-lockfile`, `node scripts/check-deployment.mjs`, `pnpm lint`, `node --experimental-strip-types scripts/verify-menu.mjs`, `node --experimental-strip-types scripts/verify-realtime.mjs`, and `pnpm build`.
4. Import this repository into Vercel as a native Next.js project. The committed `vercel.json` uses the frozen pnpm install and native production build.
5. Configure Production and Preview values for `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`, and `NEXT_PUBLIC_IMAGE_ORIGIN`. These values are public and embedded during the build. Never add database, Better Auth, or Supabase service-role credentials to Vercel.
6. Add the exact Vercel production and preview origins to backend `FRONTEND_URLS`, deploy the backend, and verify credentialed CORS and Better Auth before promoting the preview.
7. Verify Arabic and English menus, QR/table links, images, login/logout, password changes, permissions, dashboard, staff order streams, customer tracking, and error states. Use a staging branch for write tests.
8. Point the existing custom web hostname to Vercel only after TLS and preview verification. Keeping the hostname preserves printed QR links. Cloudflare may continue providing DNS; moving nameservers is unnecessary.

## Cutover and rollback

Keep the Cloudflare Worker deployment and its configuration intact during the Vercel preview and initial custom-domain cutover. The old `workers.dev` hostname cannot be transferred to Vercel, so retain a redirect Worker if any printed or shared URL uses it. Do not delete Worker routes, KV namespaces, DNS records, or secrets until access logs and the agreed rollback window show they are unused.

If Vercel verification fails, restore the previous DNS record or promote the previous Vercel deployment. Do not change database migrations or backend startup to repair a frontend deployment.

## Plan limitation

Vercel Hobby may be used only where its current terms permit. A commercial restaurant SaaS must use an eligible commercial plan before production traffic. Provider billing and terms are an operational requirement, independent of whether the build succeeds.

## GitHub checks

`Deployment checks / verify` validates the lockfile, lint, menu fixture, and native Next.js production build. It does not publish or mutate the database. Require it in repository rules before production promotion.
