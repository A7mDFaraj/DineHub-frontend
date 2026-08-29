<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Frontend Engineering & Vibe Coding Rules

These rules explicitly support the **DineHub MVP** architecture (QR ordering, POS staff interfaces, Admin management).

## General & Reliability
- **Vibe Coding for Production:** Build production-ready, reliable interfaces. Never implement placeholder-quality UI when a real implementation is possible.
- **Reliable Results:** Write robust code, handle edge cases gracefully, and ensure features are fully working before moving on. Preserve existing functionality when modifying components.

## UI / UX & Premium Aesthetics
- **Premium Design:** The final result must look polished and visually stunning to "wow" users. Prefer clean, modern, premium SaaS aesthetics (e.g., glassmorphism, curated palettes, smooth micro-animations, high-quality typography).
- **Consistency & Clarity:** Prioritize visual hierarchy, simplicity, readability, and consistency (spacing, typography, borders, radii, shadows). Avoid unnecessary gradients, excessive animations, and visual clutter.
- **State Management:** Use loading, empty, error, and success states for every data-driven interface. Never leave broken-looking states. Do not introduce UI inconsistencies between pages.

## Responsive Design (Customer Menu)
- **Mobile-First:** Design mobile-first. The customer QR menu MUST be flawless on mobile.
- **Screen Agnostic:** Every page must work correctly from small touch screens to large desktop monitors. Never assume a fixed screen size.
- **Test targets:** 320px, 375px, 768px, 1024px, 1440px, 1920px.

## Touch / POS Interfaces (Staff & Admin)
- **Touch-Friendly:** Interactive controls must be extremely comfortable for touch (for both customer phones and staff tablets).
- **Spacing:** Avoid tiny buttons and tightly packed controls. Maintain clear spacing between interactive elements.
- **Action Priority:** Important actions (like "Change Order Status") should be visually obvious and single-click.

## Components
- **Reusable UI:** Build small, modular, maintainable, strictly-typed reusable components rather than duplicating code. Extract repeated patterns.
- **Tokens:** Use consistent design tokens across all files.

## Data / API
- **Resilience:** Handle loading, error, empty, and success states. Never assume API data exists.
- **Graceful Failures:** Gracefully handle slow or failed requests, particularly for live polling of orders.
- **Validation:** Always validate user input.
- **Production API Setup (CRITICAL):** ALWAYS use the direct production backend URL (`https://dinehub-backend-42eq.onrender.com`). DO NOT use `localhost`, development proxies (like Next.js `rewrites`), or dummy URLs in `.env` or configurations. The frontend must communicate directly with the production API.
- **Better Auth Integration:** `authClient` must always be configured with the direct production `baseURL` (`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/auth`). Be aware that cross-origin requests directly to the backend must have proper token injection (e.g., Bearer tokens) or rely on the backend correctly configuring CORS and `SameSite=None` cookies.

## Accessibility
- Use semantic HTML, maintain keyboard accessibility, provide visible focus states, use sufficient color contrast, and do not rely only on color to communicate state.
