# Public Proof Wizard UX v1 Report

Date: 2026-07-07

Branch: `fix/public-proof-wizard-ux-v1`

Preview URL: `https://6a4d5749d705670e1e435cb6--mosapack.netlify.app`

## Summary

Implemented the public proof wizard UX pass on top of the hard-split builder. The normal public `/builder/` path remains a proof-only customer flow: upload, crop, preview, request proof, saved.

Production deploy recommendation: no. This is ready for Derek visual review on the preview deploy.

## UX Implementation

- Updated the public wizard hero to `Create your custom mosaic proof`.
- Kept Step 1 as the only two-column step with upload card plus compact proof/photo guidance rail.
- Kept Steps 2-5 in focused single-card mode with no right rail.
- Replaced preview-state thinness with a before/after preview, confidence panel, and proof-interest selector.
- Replaced save/launch language in the proof modal with proof-request language.
- Added a concise proof request summary before form fields.
- Updated saved state to `Proof request received`.
- Preserved the hard split: normal `/builder/` does not mount Advanced Tools or Proof Export Tools; `/builder/?ops=1` still mounts operator tools.

## Components Added Or Refactored

- `proof-preview-step-card`
- `preview-loading-skeleton`
- `preview-confidence-panel`
- `format-interest-selector`
- `proof-request-summary`
- `MobileStickyCTA` step copy updates
- `setFormatInterest()`
- `updateProofPreviewThumbnails()`
- `updateProofRequestSummary()`
- `setPreviewSkeleton()`

## Format Interest

Default: `sticker_ready`

Options:

- `sticker_ready`: Sticker-ready proof, recommended first proof path
- `magnetic_interest`: Magnetic proof interest, reviewed after proof
- `premium_display_quote`: Premium display quote, optional review path

Hosted smoke changed the selected value to `magnetic_interest`; the saved design payload and proof form both included `format_interest=magnetic_interest`.

## Proof Request

The proof request modal now says `Request your free proof` and uses:

- Name
- Email
- Consent checkbox

Consent copy:

`I’d like MosaPack to review my design and follow up by email. No payment is collected today, and my photo stays private.`

The submitted metadata uses `product_interest=sticker_proof`; it does not default to `bricks`.

## Preview Step

Step 3 now includes:

- Before/after labels: `Your photo` and `Buildable mosaic`
- Mobile toggle between the two preview panes
- Confidence cues:
  - Buildable mosaic preview
  - We review every proof before any next step
  - Details preserved best at this crop
  - Request a proof when this looks right
- Proof-interest selector below the confidence panel

No fake quality scores, pricing, export options, production claims, or internal metrics are shown in the public path.

## Mobile Sticky CTA

Sticky CTA text now follows the active step:

- Step 1: Choose a photo
- Step 2: Preview my mosaic
- Step 3: Request my free proof
- Step 4: Request my proof
- Step 5: Create another preview

The sticky CTA is suppressed while the proof modal is open so it does not cover the consent checkbox or submit action.

## Measurements

Desktop:

- 1440px overflow: `0px`
- 1920px overflow: `0px`
- 1920px layout width: `1280px`
- Crop frame: `560px x 522px`
- Crop CTA: visible, `310.3px x 48px`
- Step 3 before/after, confidence panel, and format selector present
- Right rail present on Step 1 only; absent after crop/preview/proof/saved transitions

Mobile:

- 390px overflow: `0px`
- Sticky CTA visible on initial upload state
- Proof consent visible in modal and not overlapped by sticky CTA
- Product interest default: `sticker_proof`
- Format interest default: `sticker_ready`

## Copy And DOM Audits

Hosted preview `/`:

- Blocked-copy leaks: none
- Blocked legacy selectors mounted: none
- Horizontal overflow: `0px`

Hosted preview `/builder/`:

- Blocked-copy leaks: none
- Blocked legacy selectors mounted: none
- `Proof Export Tools`: not in body text
- `Advanced Tools`: not in body text
- `product_interest`: `sticker_proof`
- `format_interest`: `sticker_ready`
- Horizontal overflow: `0px`

Hosted preview `/builder/?ops=1`:

- Ops class present
- Proof Export Tools mounted
- Advanced Tools mounted
- Operator-only terms are allowed in ops mode
- Horizontal overflow: `0px`

## Hosted Smoke Test

Test email: `derek+mosapack-proof-wizard-ux-v1-smoke@example.com`

Result: passed.

Project ID: `d6c0dcca-8c8a-4187-9be9-615e96d0b292`

Confirmed:

- Upload worked
- Crop worked
- Preview rendered
- Before/after preview present
- Confidence panel present
- Format selector present
- Default format interest was `sticker_ready`
- Changed format interest submitted as `magnetic_interest`
- Proof form submitted
- Proof saved state appeared
- Exact design save returned project ID
- Netlify Forms proof post captured
- `product_interest` was not `bricks`
- `photo_category` was submitted

The preview loading skeleton exists and is verified statically. It was not visually observable during hosted smoke because preview generation completed too quickly.

## Screenshots

Screenshot folder:

`docs/mosapack/qa/public-proof-wizard-ux-v1/`

Captured:

- `root-page.png`
- `builder-step1-desktop-1440x900.png`
- `builder-step1-desktop-1920x1080.png`
- `builder-step2-crop-desktop-1440x900.png`
- `builder-step3-preview-desktop-1440x900.png`
- `builder-step4-request-proof-desktop-1440x900.png`
- `builder-step5-saved-desktop-1440x900.png`
- `builder-step1-mobile-390x844.png`
- `builder-step2-crop-mobile-390x844.png`
- `builder-step3-preview-mobile-390x844.png`
- `builder-step4-request-proof-mobile-390x844.png`
- `builder-step5-saved-mobile-390x844.png`
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
- `bash scripts/verify-public-proof-wizard-ux-v1.sh`

Notes:

- `security-scan.sh` still reports existing low-confidence sensitive identifier hits in docs/scripts. High-confidence credential scan passed.
- `verify-generate-kit-pack.sh` still warns that OL2050 is not production verified, which is expected.

Production deploy: no.
