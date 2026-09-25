import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(pkg.scripts.build, 'next build', 'Keep the native Next.js build for the adapter and future Vercel deployment.');
assert.equal(pkg.scripts['build:cf'], 'opennextjs-cloudflare build', 'Cloudflare requires the complete adapter build.');
assert.equal(pkg.scripts.deploy, 'pnpm run build:cf && opennextjs-cloudflare deploy', 'Deploy must stop if the build fails.');
assert.ok(pkg.devDependencies?.wrangler && pkg.devDependencies?.['@opennextjs/cloudflare'], 'Keep Cloudflare tooling until the hosting cutover is complete.');
const worker = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
assert.equal(worker.main, '.open-next/worker.js');
assert.equal(worker.assets.directory, '.open-next/assets');
assert.ok(worker.compatibility_flags.includes('nodejs_compat'));
const config = readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8');
assert.ok(!/ignoreBuildErrors\s*:\s*true/.test(config), 'Do not bypass production TypeScript checks.');
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0');
const secrets = tracked.filter((file) => /(^|\/)\.env($|\.)/.test(file) && !/\.example$/.test(file));
assert.deepEqual(secrets, [], 'Environment files must not be tracked.');
console.log('Deployment rules passed: build before publishing, type checking enabled, no tracked environment files.');
