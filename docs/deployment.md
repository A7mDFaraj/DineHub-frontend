# Frontend deployment runbook

## Release order

1. Coordinate with the backend repository's `docs/deployment.md`. Apply and verify required additive database migrations separately from server startup.
2. Deploy the compatible backend and verify a real branch menu returns the required fields. `/api/health` only proves that the process is running.
3. Install with `pnpm install --frozen-lockfile`. Run `node scripts/check-deployment.mjs`, `pnpm lint`, `node --experimental-strip-types scripts/verify-menu.mjs`, and `pnpm build:cf`. The Cloudflare build includes the Next.js production build and type checking.
4. Verify hosting environment values: `NEXT_PUBLIC_API_URL=https://dinehub-backend-42eq.onrender.com/api` and `NEXT_PUBLIC_BETTER_AUTH_URL=https://dinehub-backend-42eq.onrender.com`. Public variables are embedded at build time. Never put database credentials in frontend variables.
5. Push/deploy only after checks pass. Keep dependency patches and the lockfile committed. Do not replace build failures with `ignoreBuildErrors` or shell commands that swallow errors.
6. Confirm the provider actually deployed the intended commit. Check public and QR menus in Arabic and English, loading/error states, and authorized admin editing where access is available. Do not place real orders as a release test.

## Recovery

If the frontend release fails, keep or restore the previous frontend deployment. If the API fails, diagnose its response and backend/database state; do not couple migrations to server startup. Use additive migrations so the previous application remains compatible during a rollback.

Local `.env` files do not move with Git and do not update provider settings. Keep them ignored and restore them securely when changing computers.

## GitHub checks

`Deployment checks / verify` runs deployment guards, frozen installation, lint, menu/cart verification, and the Cloudflare build on pushes and pull requests. It needs no production secrets and does not publish or mutate the database. Runtime and pnpm setup follow the [pnpm setup action documentation](https://github.com/pnpm/setup).

Require the check in GitHub repository rules and configure the hosting provider to wait for successful checks, or release manually after success. The workflow alone does not block an existing automatic deployment or direct push. No provider settings are changed by these files.

A green build cannot guarantee working production credentials, network availability, or correct database state. Report Git push, CI result, migration result, and hosting verification separately.
