# Builder Focused Guided Walkthrough Report

Date: 2026-07-07

## Purpose

Fix the public builder into a clean guided walkthrough: Step 1 explains, Steps 2-5 focus on one centered task card, and normal customers do not see operator/pro/export tooling.

## Changes Implemented

- Added explicit upload vs focused layouts:
  - Step 1 uses `wizard-layout--with-rail`.
  - Steps 2-5 use `wizard-layout--focus`.
- Unmounted the guidance rail outside Step 1 for normal public mode.
- Preserved operator guidance/export tools only in `?ops=1`.
- Compressed the active-step hero into a compact progress header for Steps 2-5.
- Added a small assurance strip for focused steps:
  - We review every proof
  - No payment today
  - Your photo stays private
- Reworked the crop state so the crop card, canvas, controls, and primary CTA are fully visible.
- Scoped crop primary CTA styling to teal while proof/request CTAs remain pink.

## Step 2 Crop Fix

The crop UI no longer renders as a narrow nested mobile card on desktop. The focused crop task uses a centered card, a viewport-clamped crop frame, visible crop controls, and a desktop inline primary action.

Hosted 1440x900 crop measurements:

- Right rail mounted: no
- Layout class: `wizard-layout--focus`
- Crop card: `521px` wide, bottom `887px`
- Crop frame: `390px` square, bottom `721px`
- Crop CTA: bottom `874px`
- Horizontal overflow: `0px`

## Rail Mounting

Hosted preview measurements:

- Step 1 upload: rail mounted, `wizard-layout--with-rail`
- Step 2 crop: rail not mounted, `wizard-layout--focus`
- Step 3 preview: rail not mounted, `wizard-layout--focus`
- Step 4 proof: rail not mounted, `wizard-layout--focus`
- Step 5 saved: rail not mounted after proof save
- `/builder/?ops=1`: operator tools mounted

## Preview URL

`https://6a4d3686419cc83aeaf4ecfb--mosapack.netlify.app`

Production deploy: no.

## Smoke Test

Hosted smoke path completed:

1. Uploaded synthetic-safe image.
2. Cropped image.
3. Generated mosaic preview.
4. Opened proof request form.
5. Submitted proof request using `derek+mosapack-focused-walkthrough-smoke@example.com`.
6. Proof saved state appeared.

Saved proof project ID:

`fc4a5c9a-8462-4d2d-9fad-f48f67ba946c`

Submitted proof metadata:

- `request_type=custom_proof`
- `proof_requested=true`
- `project_saved=true`
- `product_interest=sticker_proof`

The Netlify form body was metadata-only and did not include raw image/file fields.

## Copy and DOM Audit

Hosted `/` audit:

- Blocked public copy leaks: none
- Horizontal overflow: `0px`

Hosted `/builder/` audit:

- Blocked public copy leaks: none
- `Advanced Tools` mounted: no
- `Proof Export Tools` mounted: no
- Right rail mounted only on upload
- Horizontal overflow: `0px`

Hosted `/builder/?ops=1` audit:

- `Advanced Tools` mounted: yes
- `Proof Export Tools` mounted: yes
- Operator terms visible by design
- Horizontal overflow: `0px`

## Mobile Measurements

Hosted 390x844 upload state:

- Horizontal overflow: `0px`
- Rail mounted: yes, Step 1 only
- Upload card top: `352px`
- Upload card bottom: `728px`
- Sticky CTA visible: yes, `68px` high

Local 390x844 crop state:

- Horizontal overflow: `0px`
- Rail mounted: no
- Crop card bottom: `771px`
- Crop frame bottom: `650px`
- Sticky CTA visible: yes

## Screenshots

`docs/mosapack/qa/builder-focused-guided-walkthrough/`

- `step-1-upload-desktop-1440x900.png`
- `step-2-crop-desktop-1440x900.png`
- `step-3-preview-desktop-1440x900.png`
- `step-4-proof-form-desktop-1440x900.png`
- `step-5-saved-desktop-1440x900.png`
- `step-1-upload-mobile-390x844.png`
- `step-2-crop-mobile-390x844.png`
- `step-3-preview-mobile-390x844.png`
- `step-4-proof-mobile-390x844.png`
- `ops-mode-desktop-1440x900.png`

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

Security scan note: existing low-confidence sensitive identifier hits remain in docs/scripts, but no high-confidence credential matches were reported.

## Recommendation

Ready for Derek visual review on the preview URL. Production deploy remains blocked until explicit approval.
