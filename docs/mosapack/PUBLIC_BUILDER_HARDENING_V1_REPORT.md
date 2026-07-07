# Public Builder Hardening v1 Report

Date: 2026-07-07T16:49:20Z

Branch: `fix/public-builder-hardening-v1`

Preview URL: `https://6a4d2d6f3db3743655c93609--mosapack.netlify.app`

## Purpose

Final public builder hardening before production approval. This was not a visual redesign. The goal was to remove legacy/pro/operator/product-system baggage from normal public paths while preserving the proof wizard, B2 exact design save, Netlify Forms metadata submission, and ops-only export tools.

## Changes

- Rewrote root page physical-fulfillment copy to proof-first language.
- Removed root public claims around delivery, shipping, included physical kits, pre-cut magnetic sheets, magnetic pieces, launch discounts, and active physical fulfillment.
- Added normal-mode public builder DOM pruning via `hardenPublicBuilderDom()`.
- Normal `/builder/` removes legacy pro panels, workspace templates, insights panels, scene modal, and operator mount content.
- `/builder/?ops=1` still mounts Advanced Tools and Proof Export Tools.
- Removed inline body script nodes after initialization so normal public `document.body.textContent` does not expose legacy implementation strings.
- Normalized proof submission metadata so public proof requests submit `product_interest=sticker_proof`, not `bricks`.
- Added null-safe guards for legacy panel updaters after public DOM pruning.
- Added `scripts/verify-public-builder-hardening.sh`.

## Audits

Root page audit:
- `/` returned no blocked public leaks in rendered text or body text for LEGO/brick/internal/export/shipping terms tested.

Normal builder audit:
- `/builder/` returned no blocked public leaks in rendered text or body text for legacy product, ops, export, internal infrastructure, or shipping terms tested.
- Advanced Tools mounted: no.
- Proof Export Tools mounted: no.
- Legacy workspace templates mounted: no.
- Builder tab mounted: no.
- Insights panel mounted: no.
- Scene preview modal mounted: no.
- Body script count: 0.

Ops audit:
- `/builder/?ops=1` mounted Advanced Tools and Proof Export Tools.
- Production JSON and Canonical Design JSON exports remain ops-only.

## Smoke Test

Preview smoke test email: `derek+mosapack-public-hardening-smoke@example.com`

Result: passed.

Project ID: `c340bcd1-f01e-4072-865d-3d73b0e8fa06`

Submitted metadata:
- `product_interest=sticker_proof`
- `product_interest` is not `bricks`
- form POST remained metadata-only
- `save-project` function returned 200
- Netlify Forms POST returned 200

## Measurements

Desktop 1440x900:
- Canvas column: 878px wide
- Canvas viewport: 844px x 432px
- Guidance rail: 380px wide
- Horizontal overflow: 0px

Mobile 390x844:
- Upload card begins at y=373px
- Upload card height: 354px
- Sticky CTA visible: yes
- Horizontal overflow: 0px

## Screenshots

- Root page: `docs/mosapack/qa/public-builder-hardening-v1/root-page.png`
- Desktop upload 1440x900: `docs/mosapack/qa/public-builder-hardening-v1/builder-upload-1440x900.png`
- Desktop upload 1920x1080: `docs/mosapack/qa/public-builder-hardening-v1/builder-upload-1920x1080.png`
- Mobile upload 390x844: `docs/mosapack/qa/public-builder-hardening-v1/builder-upload-mobile-390x844.png`
- Mobile crop: `docs/mosapack/qa/public-builder-hardening-v1/builder-mobile-crop.png`
- Preview state: `docs/mosapack/qa/public-builder-hardening-v1/builder-preview-state.png`
- Proof form: `docs/mosapack/qa/public-builder-hardening-v1/builder-proof-form.png`
- Proof saved: `docs/mosapack/qa/public-builder-hardening-v1/builder-proof-saved.png`
- Ops mode: `docs/mosapack/qa/public-builder-hardening-v1/builder-ops-mode.png`

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
- `bash scripts/verify-public-copy-and-ops-gating.sh`
- `bash scripts/verify-builder-upload-simplification.sh`
- `bash scripts/verify-public-builder-hardening.sh`

Production deploy: no.

Recommendation: ready for Derek visual approval.
