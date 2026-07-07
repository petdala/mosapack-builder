# Builder Upload Simplification Report

Date: 2026-07-07

Branch: `fix/builder-upload-state-simplification`

Preview URL: `https://6a4d078de6fe2e49bfd02c8a--mosapack.netlify.app`

## Summary

Derek's review found that the upload state was technically fixed but still felt too much like an internal builder. This pass simplifies only the public upload state and operator-tool visibility while preserving the upload, crop, preview, proof request, B2 save, Netlify Forms metadata-only behavior, and existing export/generator code.

## Layout Changes

- Increased the public wizard content width so desktop uses horizontal space better.
- Added an upload-state-specific two-column desktop layout.
- Kept the upload card/dropzone/category selector as the primary left column.
- Moved guidance into a compact right column.
- Reduced upload-state vertical height so the first screen does not require unnecessary scrolling.
- Preserved single-column mobile and tablet behavior with no horizontal overflow.

## Guidance Changes

- Replaced separate stacked `Best results` and `Avoid` cards with one compact `Photo tips` card.
- Kept `What happens next` as a compact proof-first card:
  1. Upload and crop your photo.
  2. Preview a buildable mosaic layout.
  3. Request a proof for review.
  4. We confirm feasibility before anything is made.

## Advanced And Operator Tools

- Normal `/builder/` upload state hides Advanced Tools entirely.
- `?ops=1` adds `is-ops-mode`; Advanced Tools still stay hidden during upload and appear after preview/crop where operator QA needs them.
- Proof Export Tools remain hidden in the normal customer path.
- Proof Export Tools are visible only in ops mode inside Advanced Tools.
- Advanced/operator button hover, active, and focus states now use neutral/teal MosaPack styling instead of dark blue fills.

## Rendered Text Audit

Normal public path `/builder/` was checked with `document.body.innerText`.

No matches found for:

`LEGO`, `LEGO-compatible`, `Netlify Forms`, `Stripe`, `Shopify`, `checkout`, `order placed`, `production started`, `money back`, `DeltaE`, `SSIM`, `OL2050`, `Gate A`, `sheet profile`, `generator`, `canonical JSON`, `Production JSON`, `Proof Export Tools`, stock/hybrid/supplier internals.

Allowed launch copy remains:

- `No payment required right now`
- `Free preview`
- `Custom proof`
- `Sticker-ready`

## Live Proof Smoke

- Test email: `derek+mosapack-upload-simplification-smoke@example.com`
- Test image: synthetic-safe local image at `/tmp/mosapack-upload-simplification-smoke.png`
- Category used: `Pet`
- Result: upload -> crop -> preview -> proof form -> proof saved completed on draft deploy.
- Saved proof project ID: `3a1a1868-3970-4545-a102-a6c6b155bc29`
- Netlify Forms body check: metadata only; no raw image data or data URLs in the form body. The separate B2 save request stored the approved design data as expected.

## Screenshots

Screenshots are in:

`docs/mosapack/qa/builder-upload-simplification/`

Files:

- `desktop-upload-after.png`
- `mobile-upload-after.png`
- `tablet-upload-after.png`
- `proof-request-state.png`
- `ops-mode-advanced-tools.png`
- `preview-state-after.png`

## Verification

Passed:

- `bash scripts/security-scan.sh`
- `bash scripts/verify-clean-repo.sh`
- `bash scripts/verify-live-exposure.sh`
- `bash scripts/verify-netlify-forms.sh`
- `bash scripts/verify-b2-design-save.sh`
- `bash scripts/verify-proof-ops-paused-payment.sh`
- `bash scripts/verify-d1-proof-credit.sh`
- `bash scripts/verify-public-builder-wizard.sh`
- `bash scripts/verify-mosaic-clean-preprocess.sh`
- `bash scripts/verify-mosaic-clean-category-profiles.sh`
- `bash scripts/verify-buildable-proof-output.sh`
- `bash scripts/verify-production-constants-schema.sh`
- `bash scripts/verify-canonical-design-export.sh`
- `bash scripts/verify-generate-kit-pack.sh`
- `bash scripts/verify-builder-upload-layout.sh`
- `bash scripts/verify-builder-public-copy.sh`
- `bash scripts/verify-builder-upload-simplification.sh`

## Production Recommendation

No production deploy. Ready for Derek visual review on the draft deploy.
