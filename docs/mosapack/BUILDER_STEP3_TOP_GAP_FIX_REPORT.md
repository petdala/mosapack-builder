# Builder Step 3 Top Gap Fix Report

Date: 2026-07-07

## Issue

The public builder Step 3 preview state rendered with a large empty vertical gap before the preview card. The root page above-fold fix held, but the active builder wizard still reserved preview-canvas space after the preview step became active.

## Root Cause

`renderMosaic()` wrote an inline `min-height` onto `#canvasContainer` for the mosaic canvas. In the public proof wizard, Step 3 renders the proof preview flow after the canvas container. Because the container remained in the layout with the old inline reservation, the preview card was pushed down by an empty canvas area.

## Changes

- Cleared public focused-state canvas reservations for preview, proof, and saved states.
- Prevented `renderMosaic()` from reapplying canvas min-height while the public wizard is in preview/proof/saved states.
- Top-aligned the post-preview flow with compact spacing after the stepper.
- Added stable visual test IDs for the Step 3 verifier:
  - `wizard-stepper`
  - `preview-step-card`
  - `preview-before-after`
  - `preview-primary-cta`
- Added `scripts/verify-builder-step3-top-gap.sh`, which drives upload -> crop -> preview and measures the actual Step 3 layout.

## Local QA Measurements

Desktop 1440x900:
- Step 3 preview card top: 167.25px
- Stepper bottom to preview card gap: 36.83px
- Before/after preview top: 271.66px
- Horizontal overflow: 0px
- Right rail mounted on Step 3: no

Mobile 390x844:
- Step 3 preview card top: 233.41px
- Before/after preview top: 412.06px
- Sticky CTA visible: yes
- Horizontal overflow: 0px
- Right rail mounted on Step 3: no

Step 2/4 regression:
- Step 2 crop card top: 222.36px desktop
- Step 4 proof card top: 142.75px desktop
- Right rail absent on Steps 2-4 after upload

## Preview QA

Preview URL: https://6a4d6cbdf2c01f3fa1e88d94--mosapack.netlify.app

Hosted Step 3 measurements:
- Preview card top: 209.25px
- Stepper bottom to preview card gap: 36.83px
- Before/after preview top: 313.66px
- Horizontal overflow: 0px
- Right rail mounted on Step 3: no

Hosted proof smoke:
- Test email: `derek+mosapack-step3-gap-fix-smoke@example.com`
- Project reference: `3b0ea488-c15d-4276-8d58-92db0d576300`
- Saved state reached: yes
- `product_interest`: `sticker_proof`
- `format_interest`: `sticker_ready`

## Screenshots

Screenshots are in:

`docs/mosapack/qa/builder-step3-top-gap-v1/`

## Verification

Passed:
- Full public/security/buildable/generator verification suite
- `scripts/verify-builder-step3-top-gap.sh`
- Hosted `/`, `/builder/`, and `/builder/?ops=1` copy/DOM audit

## Production Recommendation

No production deploy. Ready for Derek visual review on the preview URL.
