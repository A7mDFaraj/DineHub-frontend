import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(pkg.scripts['build:cf'], 'opennextjs-cloudflare build', 'Keep the complete Cloudflare production build.');
assert.equal(pkg.scripts.deploy, 'opennextjs-cloudflare build && wrangler deploy', 'Publishing must stop if the build fails.');
const config = readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8');
assert.ok(!/ignoreBuildErrors\s*:\s*true/.test(config), 'Do not bypass production TypeScript checks.');
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0');
const secrets = tracked.filter((file) => /(^|\/)\.env($|\.)/.test(file) && !/\.example$/.test(file));
assert.deepEqual(secrets, [], 'Environment files must not be tracked.');
console.log('Deployment rules passed: build before publishing, type checking enabled, no tracked environment files.');
