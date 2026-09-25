import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(pkg.scripts.build, 'next build', 'Vercel must use the native Next.js production build.');
assert.ok(!pkg.scripts.deploy, 'Vercel deploys from Git; keep publishing out of package scripts.');
assert.ok(!pkg.devDependencies?.wrangler && !pkg.devDependencies?.['@opennextjs/cloudflare'], 'Cloudflare deployment dependencies must stay removed.');
const config = readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8');
assert.ok(!/ignoreBuildErrors\s*:\s*true/.test(config), 'Do not bypass production TypeScript checks.');
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0');
const secrets = tracked.filter((file) => /(^|\/)\.env($|\.)/.test(file) && !/\.example$/.test(file));
assert.deepEqual(secrets, [], 'Environment files must not be tracked.');
console.log('Deployment rules passed: build before publishing, type checking enabled, no tracked environment files.');
