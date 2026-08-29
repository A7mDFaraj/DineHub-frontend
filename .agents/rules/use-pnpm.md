---
description: Always use pnpm instead of npm or npx
---

# Package Manager Rule

- **ALWAYS** use `pnpm` for all package management commands (e.g., `pnpm install`, `pnpm add`, `pnpm remove`, `pnpm run`).
- **ALWAYS** use `pnpm dlx` instead of `npx` when you need to execute a package (e.g., `pnpm dlx create-next-app` or `pnpm dlx @next/codemod`).
- **NEVER** use `npm`, `yarn`, or `npx` in this project.
