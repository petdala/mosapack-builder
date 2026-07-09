# Public Builder Hard Split v1 Report

Date: 2026-07-07

## Purpose

Hard split the public MosaPack proof wizard from legacy advanced builder/product-system UI so normal `/builder/` contains only the customer proof flow.

## Summary

Normal public `/builder/` now mounts the public proof wizard only. The old workspace templates, canvas tools rail, canvas header, scene preview modal, advanced product panels, export panels, material/backing/finish panels, and empty legacy workspace mount were removed from the normal public DOM. Operator proof export tooling remains available only when `?ops=1` is present.

## Files Changed

- `public/builder/index.html`
- `scripts/verify-builder-focused-walkthrough.sh`
- `scripts/verify-builder-upload-simplification.sh`
- `scripts/verify-public-builder-hard-split.sh`

## Ops Split

- Normal `/builder/`: no `Advanced Tools`, `Proof Export Tools`, legacy workspace templates, product configurator panels, export panels, or pricing/product-system panels mount in the DOM.
- `/builder/?ops=1`: operator tools mount through `mountOperatorTools(isOpsMode)` after `ops=1` detection.
- The builder body script removes itself after initialization so normal `document.body.textContent` does not retain legacy JavaScript text.

## Crop Sizing

Desktop 1440x900 crop measurement:

- Crop card: 860px wide, bottom 886px
- Crop frame: 520px by 520px
- Primary CTA: bottom 879px
- Horizontal overflow: 0px
- Right rail mounted: no

## Public Audit Results

Hosted preview:

`https://6a4d4b75d5b457de5af57e64--mosapack.netlify.app`

Root `/`:

- Blocked public copy leaks: none
- Horizontal overflow: 0px

Normal `/builder/`:

- Blocked `innerText` / `textContent` leaks: none
- Blocked legacy/pro/export mounted selectors: none
- Body script count after load: 0
- Horizontal overflow: 0px

Ops `/builder/?ops=1`:

- Ops mode class present: yes
- Proof Export Tools mounted: yes
- Horizontal overflow: 0px

## Hidden Metadata

Hosted smoke proof request submitted `product_interest=sticker_proof`.

The submitted proof project id was:

`f043e60d-19b2-4a14-9664-a2e57b163291`

## Smoke Test

Smoke email:

`derek+mosapack-hard-split-smoke@example.com`

Result:

- Upload worked
- Crop worked
- Crop canvas was not clipped
- Crop CTA was not clipped
- Preview rendered
- Proof form opened
- Proof request submitted
- Proof saved state appeared
- B2 exact design save returned a project id
- Netlify Forms submission stayed metadata-only
- Normal customer path had no legacy/pro/export/product-system panels
- Ops path still mounted Proof Export Tools with `?ops=1`

## Screenshots

Screenshots are stored in:

`docs/mosapack/qa/public-builder-hard-split-v1/`

Files:

- `root-page.png`
- `builder-step1-desktop-1440x900.png`
- `builder-step2-crop-desktop-1440x900.png`
- `builder-step3-preview-desktop-1440x900.png`
- `builder-step4-proof-form-desktop-1440x900.png`
- `builder-step5-saved-desktop-1440x900.png`
- `builder-step1-mobile-390x844.png`
- `builder-step2-crop-mobile-390x844.png`
- `builder-step3-preview-mobile-390x844.png`
- `builder-step4-proof-mobile-390x844.png`
- `builder-ops-mode-desktop-1440x900.png`

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
- `bash scripts/verify-builder-focused-walkthrough.sh`
- `bash scripts/verify-public-builder-hard-split.sh`

## Production Recommendation

No production deploy. Ready for Derek review on the preview deploy.
