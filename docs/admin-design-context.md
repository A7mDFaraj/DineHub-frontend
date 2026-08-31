# DineHub admin design context

Read this file before building or changing an admin page. The implementation is local and does not require an external design generator.

## Source of truth

- Reusable CSS tokens: `app/(admin)/admin/admin-tokens.module.css`
- Authenticated shell: `app/(admin)/admin/layout.tsx`
- Shell behavior and layout: `app/(admin)/admin/admin-shell.module.css`
- Reference data-management page: `app/(admin)/admin/users/page.tsx`
- Reference page styling: `app/(admin)/admin/users/users.module.css`

## Visual language

- Arabic-first RTL using the configured Thmanyah Sans font.
- Near-black plum canvas (`#19131f`) and deep-plum surfaces (`#201827`).
- Coral (`#f2644b`) is reserved for primary actions, focus, and the active operational signal.
- Teal (`#47aaa1`) communicates connected, ready, saved, and successful states.
- Lilac (`#dfd2eb`) provides quiet borders and secondary emphasis.
- Glass is restrained: low-opacity surfaces, crisp borders, and limited blur. Avoid generic gold, blue-purple SaaS gradients, and excessive glow.
- Large surfaces use 22–26px radii. Inputs and controls use 13–14px radii.
- Interactive targets are at least 44px. All keyboard focus states must be clearly visible.
- Press feedback is subtle (`scale(0.97–0.98)`); honor `prefers-reduced-motion`.

## Product patterns

- Lead with the operational outcome, then show live API-derived facts. Do not invent percentages or trends.
- Keep loading, error, empty, validation, saving, saved, and permission states explicit.
- Management lists become cards on narrower screens instead of forcing horizontal scrolling.
- Destructive or lockout-prone actions require server enforcement and a clear explanation in the UI.
- Admins can see all branches. Cashiers are bound to one assigned branch and must never receive a branch-management control.
