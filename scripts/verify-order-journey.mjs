// Compatibility entry point: use the pinned, contract-checked customer and kitchen suite.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const cli = fileURLToPath(
  new URL("../node_modules/@playwright/test/cli.js", import.meta.url),
);
const result = spawnSync(
  process.execPath,
  [cli, "test", ...process.argv.slice(2)],
  { cwd: root, stdio: "inherit", env: process.env },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
