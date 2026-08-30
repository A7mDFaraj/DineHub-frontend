# DineHub brand and interface system

> Canonical source of truth for every DineHub interface, marketing page, product surface, illustration, and AI-generated design.

Read this file before proposing or implementing UI. An explicit prompt may override it; otherwise this file is the default.

## 1. Brand thesis

DineHub shortens the distance between a customer's intent and a team's ability to serve it. The brand is not “restaurant software.” It is the **order signal**: a clear path that begins at the camera, carries customer choices without loss, reaches the team in an actionable form, and keeps every branch visible from one place.

Every experience must feel:

1. **Immediate for the customer** — no app, account, or learning curve.
2. **Calm for the team** — clear hierarchy, comfortable touch targets, obvious next actions.
3. **Connected for the operator** — every order, menu, and branch belongs to one system.

Primary buyers are operators of cafés, restaurants, bakeries, quick-service shops, and multi-branch hospitality businesses in Arabic-speaking markets. Daily users include cashiers, baristas, service teams, branch managers, and administrators. The end customer is often one-handed, in a real venue, with no patience for training.

Brand promise: **طلب أسهل للعميل. تشغيل أوضح للفريق.**

If an element does not make ordering easier or operating clearer, remove it.

## 2. Signature: the order signal

Show connection through a fine path linking phone, order, team, and branch; connected cards whose sequence is real; a dot showing progress; a venue constellation around one DineHub core; or translucent layers showing that customer and operator experiences belong together.

This motif explains connection, direction, status, or flow. It is never empty decoration. Avoid neon grids, random glowing orbs, meaningless numbers, and blue-purple “AI” gradients.

## 3. Logo and naming

- Product name is always `DineHub`, with capital D and H.
- Arabic copy stays Arabic; the wordmark stays Latin and left-to-right.
- Canonical asset: `/public/brand/dinehub-logo-3d.png`.
- Never substitute initials, emoji, a generic restaurant icon, or an invented mark.
- Header mark: 42–46px. Footer mark: at least 38px.
- Preserve clear space of at least one quarter of the mark width.
- Never stretch, recolor, rotate, crop, or place it on a noisy image.

## 4. Color system

Reuse these tokens. Do not improvise neighboring hex values inside components.

| Token | Value | Role |
| --- | --- | --- |
| `--dh-ink` | `#22182A` | Primary text, main CTA, device frames |
| `--dh-plum` | `#4B2F51` | Brand depth and connected-system elements |
| `--dh-coral` | `#F2644B` | Signal, progress, new orders, active moments |
| `--dh-coral-deep` | `#CC4937` | Accessible coral text and compact accents |
| `--dh-teal` | `#47AAA1` | Readiness, completion, operational calm |
| `--dh-teal-soft` | `#CCE8E1` | Teal icon wells and support surfaces |
| `--dh-lilac` | `#DFD2EB` | Bridge between customer and operator layers |
| `--dh-porcelain` | `#F7F3ED` | Primary page background |
| `--dh-paper` | `#FFFDF9` | Elevated light surface and cards |
| `--dh-muted` | `#685F6D` | Secondary copy on light surfaces |
| `--dh-night` | `#201827` | Premium dark operations sections |
| `--dh-footer` | `#19131F` | Deepest surface |
| `--dh-line` | `rgba(34, 24, 42, 0.12)` | Structural separators |

Use roughly 65% porcelain/paper, 20% ink/plum/night, 10% lilac/soft teal, and 5% coral/teal. Primary CTA is ink with white text. Coral signals attention or movement; teal signals readiness or completion; lilac connects layers. Never rely on color alone for meaning. Use deep coral rather than signal coral for small text on light backgrounds. All text meets WCAG 2.2 AA contrast.

## 5. Typography

- All landing-page typography—Arabic, Latin wordmark, numbers, and utility labels—uses the local `Thmanyah Sans` family from `/public/fonts` via `--font-thmanyah`.
- Available weights: 300 Light, 400 Regular, 500 Medium, 700 Bold, and 900 Black.
- Do not introduce serif fonts, Google fonts, generic luxury faces, or a second family on the landing page.
- Arabic personality comes from scale, rhythm, and line breaks—not ornament.

| Role | Size | Weight | Line height |
| --- | --- | --- | --- |
| Hero | `clamp(2.45rem, 3.85vw, 4.35rem)` | 650–680 | 1.16–1.2 |
| Section title | `clamp(2rem, 4vw, 4rem)` | 650 | 1.24–1.3 |
| Card title | `1.18rem–1.85rem` | 600–650 | 1.35 |
| Body lead | `1rem–1.08rem` | 400 | 1.8–1.9 |
| Body compact | `0.84rem–0.94rem` | 400 | 1.7–1.8 |
| Eyebrow | `0.78rem–0.82rem` | 700 | 1.5 |
| Utility/data | `0.68rem–0.82rem` | 500–650 | 1.4 |

Use `text-wrap: balance` on short headings and `text-wrap: pretty` on short-to-medium paragraphs. Use tabular numerals for prices, timers, order IDs, counters, and changing metrics. Apply font smoothing once at the root. Avoid all-caps Arabic, centered long paragraphs, excessive bold, and dangling one-word final lines.

## 6. Layout and composition

- Marketing shell: `min(100% - 40px, 1200px)`.
- Hero may expand to 1480px when art needs space.
- Mobile gutters: 14px at 320px; 20px from 375px when practical.
- Marketing rhythm: 82–140px vertical. Product rhythm: 56–88px. Dense operations: 24–40px.
- RTL is the primary truth. The story begins on the right and resolves left unless the physical flow requires otherwise.
- Use purposeful asymmetry: one dominant copy block and one visual system, not a generic grid of equal cards.
- Alternate quiet porcelain/paper with one deep operational section.
- Each section gets one thesis, one dominant visual, and one clear next idea.
- Numbers such as 01/02/03 are allowed only for a real ordered process.

### Hero

```text
┌──────────────────────────────────────────────────────────┐
│ [logo/nav]                                               │
│  Arabic promise + actions     supplied hero illustration │
│  short proof points           with restrained signals    │
│  connected journey: scan → choose → team → insight       │
└──────────────────────────────────────────────────────────┘
```

Use `/public/brand/herosection image.png` for the landing hero. Do not use the older `dinehub-hero-3d*` assets unless explicitly requested.

### System section

```text
┌──────────────────────────────────────────────────────────┐
│ operational promise        transparent abstract system   │
│ 2–3 concise capabilities   phone → orders → team → shops │
└──────────────────────────────────────────────────────────┘
```

Use `/public/brand/dinehub-system-illustration.png`. It is text-free and conceptual, not a product screenshot. Do not build a fake CSS dashboard when this illustration is present.

### Venue constellation

```text
             [restaurant]
                   ╲
 [bakery] ─── [DineHub core] ─── [café]
                   ╱
          [quick-service shop]
```

This replaces ordinary “coffee / restaurant / bakery / shop” lists. Cards may orbit, overlap slightly, or connect through signal paths, but must remain readable and responsive.

## 7. Spacing, shape, and depth

Spacing scale: `4, 8, 12, 16, 20, 24, 32, 40, 56, 72, 96, 128` px.

| Radius | Value | Use |
| --- | --- | --- |
| Control | 12px | Compact controls |
| Icon | 14px | Icon wells |
| Glass | 18px | Floating status cards |
| Nav | 24px | Header shell |
| Card | 26px | Standard marketing card |
| Panel | 32px | Large operational panel |
| Stage | 36px | Full-width visual stage or CTA |
| Pill | 999px | Buttons, chips, status pills |

Nested surfaces must be concentric: `outer radius = inner radius + padding` when layers sit close together.

```css
--shadow-soft:
  0 0 0 1px rgb(34 24 42 / 0.06),
  0 2px 4px rgb(34 24 42 / 0.04),
  0 18px 46px rgb(34 24 42 / 0.06);
--shadow-raised:
  0 0 0 1px rgb(34 24 42 / 0.07),
  0 12px 28px rgb(34 24 42 / 0.08),
  0 28px 70px rgb(34 24 42 / 0.10);
--shadow-dark:
  0 0 0 1px rgb(255 255 255 / 0.10),
  0 40px 90px rgb(0 0 0 / 0.30);
```

Shadows create depth; borders communicate structure or state. Keep dividers as borders. Rectangular photos/screenshots get an inset 1px pure-black outline at 10% in light mode or pure-white at 10% in dark mode. Transparent cutouts do not get a rectangular outline; use a restrained object drop shadow.

## 8. Components and interaction

### Buttons

- Minimum target: 44×44px; hero CTA height: 56px.
- Primary: ink pill, white label, layered shadow.
- Secondary: translucent paper pill, ink label, neutral shadow ring.
- Icon follows the Arabic label in reading order when it indicates continuation.
- Use 2px less padding on the icon side when optical balance requires it.
- Press feedback is always `scale(0.96)` with an interruptible 150ms transform transition.
- Focus ring is always visible: 2–3px coral with adequate offset.
- Never use `transition: all`.

### Cards and icons

- One card equals one thought or operating object.
- Large visual cards use 26–36px radii and 24–40px padding.
- Repeated cards vary through hierarchy or meaningful state, not arbitrary colors.
- Use Lucide consistently. Do not mix icon libraries on one surface.
- Icon stroke: 1.5–1.7px beside regular text; 2px beside semibold text.
- Outline is default; fill is active/selected. Icons use `currentColor`.
- Decorative icons are `aria-hidden`; icon-only controls require an Arabic accessible name.
- Directional arrows flip in RTL; logos, checkmarks, clocks, cups, and play icons do not.

### Navigation

- Header is a quiet translucent paper surface, not nightclub glass.
- Desktop links have a 44px minimum hit area.
- Mobile navigation is one obvious 44–46px control and a readable full-width panel.
- Keep four or fewer top-level marketing links plus one primary CTA.

## 9. Illustration and imagery

DineHub imagery is tactile, clear, and product-adjacent without becoming fake UI.

- Preferred medium: clay-and-glass 3D with frosted acrylic, satin ceramic, and dark plum metal.
- Lighting: soft studio light with contained shadows.
- Use transparent backgrounds for system and feature cutouts.
- UI-like marks may use dots, bars, toggles, charts, and pills only when abstract and illegible.
- Never generate fake words, tiny text, numbers, logos, browser chrome, or a realistic dashboard and present it as the product.
- Avoid generic restaurant stock, food glamour shots, photoreal people, neon, cyberpunk, excessive glow, and generic blue-purple AI palettes.

| Asset | Role |
| --- | --- |
| `/public/brand/herosection image.png` | Current landing hero and service world |
| `/public/brand/dinehub-system-illustration.png` | Connected system; transparent, no text, not a screenshot |
| `/public/brand/feature-qr-menu.png` | QR/customer-menu concept |
| `/public/brand/feature-custom-order.png` | Order-customization concept |
| `/public/brand/feature-analytics.png` | Analytics concept |
| `/public/brand/dinehub-logo-3d.png` | Canonical logo mark |

Use `next/image` with static imports when practical so dimensions, aspect ratio, and blur placeholder are known at build time. Reserve image space to prevent layout shift. Give informative imagery accurate Arabic alt text and decorative imagery empty alt text.

## 10. Motion

- Hover/color feedback: 100–160ms, ease-out.
- Button press: 150ms, interruptible, scale 0.96.
- Contextual icon swap: opacity 0→1, scale 0.25→1, blur 4px→0, spring 300ms with zero bounce.
- Hero entrance: meaningful groups with 70–100ms stagger; 300–620ms total.
- Section reveal: 300–450ms, opacity plus no more than 20px travel.
- Illustration drift: 6–8 seconds, maximum 8px, only on hero-grade art.
- A repeated pulse is allowed only when it represents live movement or status.
- Never animate width/height for routine interactions; never use `transition: all`.
- Under `prefers-reduced-motion`, keep static cues and remove floating, pulses, and decorative travel.

## 11. Responsive behavior

Mobile is the primary truth for customer surfaces. Verify at 320, 375, 768, 1024, 1440, and 1920px.

- No horizontal scroll, clipped CTA, hidden required label, or overlapping hit area at 320px.
- Two-column marketing sections collapse to copy first, then visual.
- Mobile CTAs become full width when two actions would crowd.
- Venue constellations become a readable two-column or centered radial stack, not a squeezed desktop orbit.
- Transparent art retains its ratio and may extend inside its stage, never beyond page overflow.
- Staff/admin tablet controls remain at least 44px with 8px separation.
- Respect safe-area insets for sticky or edge-aligned mobile controls.

## 12. Accessibility and states

- Use semantic landmarks, one unique `h1`, and unskipped heading levels.
- Give every route a unique descriptive title for Next.js route announcements.
- Provide a visible-on-focus skip link.
- Every interaction works by keyboard; focus is never removed or obscured.
- Text contrast is at least 4.5:1; large text at least 3:1.
- Do not depend on hover, motion, color, or position alone.
- Loading, error, empty, and success states are part of the design.
- Images have accurate alt text when informative and empty alt text when decorative.

## 13. Arabic voice

Write from the operator's or customer's side of the screen. The voice is direct, calm, operational, human, and modern Saudi Arabic without forced slang. Use sentence case, short clauses, active voice, and concrete verbs.

Prefer “يمسح العميل QR,” “يصل الطلب إلى الفريق,” “حدّث القائمة,” “تابع كل فرع,” and “ابدأ إعداد DineHub.” Avoid “ثورة في عالم المطاعم,” “حل متكامل مدعوم بأحدث التقنيات,” vague superiority claims, technical implementation terms, and English filler when a clear Arabic term exists.

Controls keep the same verb through the result: “نشر” leads to “تم النشر.” Errors explain what happened and how to recover; they do not apologize vaguely.

## 14. Do / do not

### Do

- Begin each screen with one job and one dominant action.
- Reuse the order-signal motif when it explains a relationship.
- Give Arabic type generous line height and deliberate breaks.
- Spend boldness on one memorable visual move per page.
- Show customer ease and operator clarity as two sides of one system.
- Verify loading, error, empty, success, focus, hover, active, and reduced-motion states.

### Do not

- Add gold because the product is “premium.”
- Add a serif font to manufacture luxury.
- Use generic dark SaaS gradients, blue-purple AI lighting, or excessive glass.
- Fill every section with equal bento cards.
- Build CSS fake dashboards to imply a product that does not exist.
- Use emoji icons, tiny controls, low-contrast gray, or animation without a static cue.
- Invent a second palette, font system, logo, or illustration style for one feature.

## 15. Contract for future prompts

Begin every future UI task with:

> Read `design.md` before designing or coding. Preserve the DineHub order-signal identity, Arabic-first typography, locked color tokens, spacing/radius scales, illustration rules, interaction details, accessibility floor, and responsive test targets. Reuse existing components and assets before inventing new ones. If a page needs a new pattern, extend `design.md` explicitly rather than silently creating a second visual language.

Before shipping, answer:

1. Is this recognizably DineHub without the logo?
2. Does one clear action dominate?
3. Does it make ordering easier or operating clearer?
4. Are colors, fonts, radii, shadows, and motion derived from this file?
5. Does it work at 320px and with keyboard/reduced motion?
6. Is imagery honest about real UI versus conceptual illustration?
7. Did we remove one nonessential accessory before finalizing?

If any answer is “no,” the design is not finished.

## 16. Authentication and first-run administration

The admin entry is part of the product story, not a generic SaaS gate.

- The authentication composition uses the order signal directly: customer scan → order arrival → team preparation. It should still read as DineHub with the wordmark removed.
- Keep the form calm and light, paired with one deep operational story surface. Do not use blue-purple gradients, floating login glass, gold, stock photography, or a substitute initial.
- Render '/public/brand/dinehub-logo-3d.png' as a transparent object with clear space and a restrained drop shadow. Never add a white logo tile.
- Arabic is primary. Use visible labels, inline recovery errors, autofill attributes, password visibility controls, paste support, 44px targets, loading feedback, and a single dominant submit action.
- Sign in, signup, session verification, and logout always use the direct production Better Auth API. Never invent local auth, mock a session, mirror the secret session token into a JavaScript-readable cookie, or let signup choose a privileged role.
- Operational figures must come from an API. Until a metric endpoint returns real data, show an honest setup or empty state—never plausible-looking sample revenue, orders, or customer counts.

The first-run guide follows the real setup sequence: **branch → menu → QR → operations**.

- Keep it to four or fewer short steps, show progress, allow back and skip, trap focus correctly, and respect reduced motion.
- 'dinehub_admin_guide=v1' is a non-sensitive, presentation-only completion cookie. It may remember dismissal on one browser; it must never be treated as authentication or business data.
- If guide completion must follow the user across browsers or devices, add a backend user-preference field and authenticated endpoint, then use that API as the source of truth instead of adding more client storage.
