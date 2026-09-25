# Frontend deployment runbook (Cloudflare active; Vercel deferred)

## Current Cloudflare release

The frontend remains on the existing `dinehub` Worker. All application performance and order fixes are retained. No backend or database changes are needed for this hosting repair.

- Install: `pnpm install --frozen-lockfile`.
- Build command in Cloudflare Workers Builds: `pnpm run build:cf`.
- Deploy command after that build: `pnpm exec opennextjs-cloudflare deploy`.
- For a complete manual build and publish: `pnpm deploy`.
- Local Worker preview: `pnpm preview`.

Keep the existing Worker name, routes and KV namespace. The adapter and Wrangler versions are pinned, and both pnpm patches must be committed with the lockfile. CI runs the full Cloudflare build. Keep the legacy `middleware.ts` entry point for this adapter: Next.js deprecates the name, but its Edge middleware path avoids the experimental Node proxy path. Revisit the rename when changing adapters. Before release also run deployment checks, lint, menu verification and realtime verification. Confirm the compatible backend is deployed first.

Set `NEXT_PUBLIC_API_URL=https://dinehub-backend-42eq.onrender.com/api` and `NEXT_PUBLIC_BETTER_AUTH_URL=https://dinehub-backend-42eq.onrender.com` in the Cloudflare build environment. These public values are embedded at build time. Never add database or auth secrets to the frontend. Keep the active Cloudflare origin allowed by the backend.

Images use their original URLs on Cloudflare because the Worker has no `IMAGES` binding. Lazy loading, dimensions, and existing image fallbacks remain. Enable and verify a Cloudflare image service before opting into resizing; see https://opennext.js.org/cloudflare/howtos/image. Native Vercel image optimization remains enabled when `VERCEL=1`.

Run a provider deployment and browser/API smoke checks after pushing; local build success does not prove the live deployment. Do not create real orders for smoke tests.

## Deferred Vercel migration

The following is a future cutover plan, not the current hosting configuration. Keep `build:cf` and all Cloudflare configuration until the switch is confirmed.

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

`Deployment checks / verify` validates the lockfile, lint, menu fixture, and full Cloudflare adapter build. It does not publish or mutate the database. Require it in repository rules before production promotion.
