# Menu photo import

## Implementation plan

1. Run pinned Tesseract.js Arabic/English OCR in a lazy-loaded browser worker. Keep photos on device; load model assets only when requested. Offer camera capture, upload, rotation and crop controls, progress, cancellation, and explicit retry.
2. Parse labelled prices and calories independently. Preserve source text. Never infer nutrition, allergens, discounts, or variants. A single trailing unlabelled number is a visibly warned suggestion; ambiguous numbers remain unresolved. Every row needs human review; uncertain text remains visible.
3. Suggest existing category matches using conservative normalized names and a small bilingual category glossary. Require explicit category selection; create missing categories only with the approved batch. English-only products need an Arabic name under the existing contract; no fabricated translations.
4. Save selected, reviewed items through an authenticated, branch-scoped atomic import endpoint. A durable receipt makes the exact batch safe to retry after network failures. Reject duplicate names and cross-branch category references. Never overwrite existing products.
5. Verify parser edge cases, request validation, authorization, rollback/replay behavior, browser worker lifecycle and mobile review layout. Release migration, backend, then frontend, with production verification at each step.

## Constraints

OCR is an assistive transcription tool, not a guarantee of correctness. Decorative fonts, glare, blur, columns, and bilingual layouts can cause missed or incorrect text. Compare every result against the photograph. Crop one column/section at a time for complicated layouts. Missing calories stay null, never zero by default. Multiple sizes/prices require separate manually reviewed rows. First use needs a network connection to download open-source recognition assets; processing then stays local. Translation generation is deferred: no paid API or additional model hosting is introduced.

## Bilingual photo improvements

- Wide photos are checked for sustained whitespace between columns before recognition. A manual one/two/three-column override is available; equal-column overrides should only be used for equally spaced columns. Crop irregular layouts when automatic separation is unsuitable.
- Physical text positions associate nearby Arabic/English names, wrapped titles, and detached numeric rows. Explicit column boundaries prevent cross-column associations. Portion tables retain their source evidence and conflicting prices for manual resolution.
- Decimal SAR prices and `كالوري` labels are parsed separately. In bilingual mode, a second English-model pass cross-checks Western decimal digits at the same image coordinates; the Arabic model can otherwise truncate `16.00` to `0`. Changed readings remain flagged for review. This extra pass increases reading time without uploading the photo.
- Existing branch categories are selectable immediately. Empty branches explain how to create a category, category creation is available from an item, and unassigned selected items can receive a category together.
- Review cards show a source-photo excerpt, full-width bilingual name fields on mobile, required-field feedback, and checked-item counts. Source text stays available in a disclosure. Manual merge and split controls help correct associations; neither confirms an item automatically.

Run the optional real restaurant-photo check with `OCR_MENU_PHOTO` set to a local image path and `pnpm test:ocr:browser --grep "supplied"`. The fixture is not committed or uploaded. The regression checks the pictured beef burger's bilingual pairing, `16.00` price, and `200` calories; it is not an accuracy guarantee for every entry in the photograph.

## Release gate

Do not release the frontend before the import receipt migration and compatible backend are verified. The new feature must report an unavailable import API rather than falling back to non-atomic individual writes. Never test imports against real production menus without explicit authorization.

## Implemented flow

Open **Admin → Menu → Import photo** with a selected branch and `menu.create` permission. Upload a photo or use the phone's native camera picker. Rotate and crop before reading; for multi-column menus, read one section at a time. Recognition supports Arabic, English, or both. Match category headings to existing branch categories or propose new categories (`categories.create` required). Unknown headings can be promoted from a line, and missed products can be entered manually.

Review each selected item's Arabic/English names, SAR price, optional calories, category, and optional descriptions alongside the photograph and original OCR text. Existing product rules require an Arabic name; English-only scans need a manually entered Arabic name. Changing a field or category mapping clears its review confirmation. There is no automatic translation, nutrition estimation, allergen inference, multi-size interpretation, or reliable automatic description-to-product association.

Import uses `POST /api/admin/menu-imports`. The backend validates the current user's branch access, category ownership, category-creation permission, decimal prices, numeric bounds, and duplicates. A transaction creates categories, products, and a receipt together. Branch-level advisory locks serialize imports; receipts reject reuse with changed data and replay the result for identical retries. Other menu-edit endpoints do not participate in this lock, so concurrent manual edits still need ordinary operational coordination.

The browser saves the exact pending payload in per-user, per-branch `sessionStorage` before sending it. An unknown network result locks editing and allows only the same import to be retried, including after closing and reopening the dialog in the same tab. Definite rejection restores an editable draft. Photos are not stored or uploaded; unsaved photo drafts are discarded when the dialog closes. Closing the browser tab also ends session-storage recovery, so uncertain imports should be resolved before doing that.

## Open-source foundation and runtime

- [Tesseract.js](https://github.com/naptha/tesseract.js), Apache-2.0, pinned to `7.0.0`; dynamically loaded only when scanning.
- [Official Tesseract models](https://github.com/tesseract-ocr/tessdata), pinned to commit `ced78752cc61322fb554c280d13360b35b8684e4`. These include integerized LSTM models compatible with the browser engine. Runtime assets load from jsDelivr; models load from `raw.githubusercontent.com`. A jsDelivr GitHub URL rejected the larger English model, so it is deliberately not used for models.
- `patches/tesseract.js@7.0.0.patch` adds an early worker callback and its type. This lets cancellation, timeout, or errors terminate the worker even before initialization finishes. Preserve this patch and its lockfile entry; the browser cancellation regression test exercises it.

All photo processing runs on the device. Asset providers receive normal download requests, not photographs or recognized menu text. Recognition assets can be tens of megabytes on first use; language data is cached by Tesseract in IndexedDB where available. Network access may still be needed for runtime assets, so offline operation is not guaranteed. No paid AI service or additional backend OCR server is introduced. CSP policies added later must accommodate blob workers, WebAssembly, jsDelivr runtime scripts, and GitHub model downloads.

Limits: JPG/PNG/WebP, 15 MB file size, 40 megapixels decoded, minimum side 100 pixels, longest processed side 2,800 pixels, 180-second recognition timeout, 100 products and 50 category mappings per import. HEIC must first be exported as JPEG. Native camera behavior depends on the phone/browser; the desktop automation verifies the capture attribute, not a physical camera.

## Verification — September 29, 2026

Passed locally:

- Frozen dependency installation, parser regression checks, feature lint, frontend TypeScript/production build, and the complete Cloudflare adapter build.
- Frontend deployment rules, existing menu verification, and all four realtime checks.
- 38 focused backend import and authentication tests; backend build and lint; backend deployment rules.
- Five deterministic browser checks: review-required save/reopen/retry, populated English and Arabic review at 320/375/768/1024/1440/1920 px, invalid image/model failure recovery, and immediate worker termination during initialization.
- Two real-model browser checks: correct English price/calorie separation and Arabic source preservation plus manual correction before import. All browser backend traffic is intercepted; tests do not create production products or orders.

**Arabic exact transcription is not a passed accuracy gate.** The clean Arial fixture `برجر لحم ٢٥ ر.س ٦٥٠ سعرة حرارية` was recognized with an unreadable price and `150` calories instead of `650`. Both legacy and alternative models were evaluated; changing models did not establish reliable Arabic-Indic digit recognition. The assisted-flow test records expected versus observed values and verifies correction to price `25.00` and calories `650` before saving. Its success must not be described as automatic Arabic accuracy. Every result, including high-confidence results, needs comparison with the source photo.

Run the checks with `pnpm test:ocr`, then `pnpm build` and `pnpm test:ocr:browser`. Set `OCR_STRICT_ACCURACY=1` and run the `real Arabic` browser test to enforce exact transcription; this stricter gate is known to fail for the fixture above. CI includes the parser and deterministic browser checks; real-model tests remain explicit because they download external assets.

Existing unrelated checks remain failing: frontend lint rejects `Date.now()` during render in `components/events/manual-match-form.tsx` (and reports two unused imports in `table-event-banner.tsx`); the full backend suite has four failures in `events.service.spec.ts` / `football.service.spec.ts` involving manual fixtures and provider-count expectations. These files were not modified. The full backend run reports 224 passing tests and four failures.

Not verified: physical Android/iPhone camera and Safari behavior, representative restaurant-photo accuracy, live database rollback/concurrency, migration application, backend deployment, frontend deployment, or production browser/API behavior. Service transaction tests use a Prisma mock; they do not substitute for a database integration test.

The additive backend migration is `prisma/migrations/20260929010000_menu_import_receipts/migration.sql`. Apply and verify it first, deploy and verify the compatible backend second, then release the frontend under `docs/deployment.md`. No migrations, production imports, pushes, or deployments were performed during implementation.
