# Public Builder Guided Wizard Report

Date: 2026-06-29
Branch: `feature/public-builder-guided-wizard`
Preview URL: `https://6a42f9a656055ac506b236d3--mosapack.netlify.app`

Mosaic Clean preview addendum: `https://6a4301a104cec7b17c1bd734--mosapack.netlify.app`

## Decision

Implemented Hybrid C: a guided public proof-request wizard by default, with the advanced builder engine preserved behind a collapsed `Advanced tools` section.

Public default flow:

```text
Upload -> Crop -> Preview -> Request Proof -> Proof Saved
```

## Visual Target

The public builder now follows the approved mockup direction:

- clean white cards
- teal and pink MosaPack accents
- mobile-first guided steps
- large simple action states
- trust chips above the builder
- no payment required today
- no checkout/cost/cart dashboard clutter by default

## What Changed

- Added public hero: `Create your custom mosaic proof`.
- Added five-state visual stepper: Upload Photo, Crop & Position, Preview Mosaic, Request Proof, Proof Saved.
- Added compact mobile progress text.
- Added state-driven mobile sticky CTA:
  - Upload: `Choose Photo`
  - Crop: `Looks good — create my preview`
  - Preview: `Request my free proof`
  - Proof: `Save my proof request`
  - Saved: hidden
- Reframed post-submit state as `Proof request saved!`.
- Set the public recommended format to `Digital Mystery Reveal Pack` by default.
- Replaced visible format-picking with a post-review note: `Other formats available after proof review: Sticker · Magnetic · Premium Brick`.
- Added photo guidance, trust, and what-happens-next cards.
- Added collapsed `Advanced tools` section with presets, adjust, palette, grid, numbers, scene preview, and save design for later.
- Added Mosaic Clean preprocess internally for cleaner, more buildable previews. Public wizard flow and layout remain unchanged.

## Old Dashboard Elements Hidden

The default public wizard hides:

- cart/saved-design header controls
- workspace tabs
- tool rail
- checkout/cost mode controls
- express payment row
- bundle gallery
- insights/cost panels
- launch access button
- visible cart/cost/checkout language

The underlying engine and internal calculations remain in the file for B2 save and future use.

## Backend Contracts Preserved

Preserved:

- `/.netlify/functions/save-project`
- save version `b2-v1`
- server-returned `project_id`
- `project_saved`
- `design_storage=netlify_blobs`
- `mosapack-save-design` Netlify Form
- honeypot field
- hidden `form-name`
- `designStorageConsent`
- no image/file field in Netlify Forms
- `recommended_format=Digital Mystery Reveal Pack`
- Mosaic Clean preprocess metadata in B2 project JSON
- cropped approved source and rendered preview image sent only to B2 save-project, not Forms

## Verification Results

Shell checks passed:

- `bash scripts/security-scan.sh`
- `bash scripts/verify-clean-repo.sh`
- `bash scripts/verify-netlify-forms.sh`
- `bash scripts/verify-b2-design-save.sh`
- `bash scripts/verify-live-exposure.sh`
- `bash scripts/verify-proof-ops-paused-payment.sh`
- `bash scripts/verify-d1-proof-credit.sh`
- `bash scripts/verify-public-builder-wizard.sh`

Local browser QA passed:

- Mobile 390 x 844 full upload -> crop -> preview -> proof -> saved flow with mocked B2/Form responses.
- Consent blocking verified before submit.
- Mobile sticky CTA labels verified.
- Desktop full flow verified.
- Advanced tools collapsed by default and openable.
- No horizontal overflow.
- No payment UI.

Preview QA passed:

- Mobile preview proof save project ID: `b7b6cb16-9b9d-4185-9161-6b82d0a4d559`.
- Desktop preview proof save project ID: `a0f4f55f-2090-4918-9d81-c2f6caf7d20b`.
- Netlify Forms metadata contained matching `project_id`, `project_saved=true`, `save_version=b2-v1`, and `design_storage=netlify_blobs`.
- Netlify Forms metadata contained no raw image fields or image data.
- No payment, checkout, cost dashboard, or cart UI visible in default flow.
- B2 save and Netlify Forms worked through the real hosted UI path.

## Screenshot / State Summary

Screenshots/state snapshots were reviewed through Playwright browser checks rather than committed as image files.

Observed states:

1. Upload state: hero, trust chips, five-step flow, large upload card, mobile CTA `Choose Photo`.
2. Crop state: crop card centered, zoom/reset/change-photo controls, mobile CTA `Looks good — create my preview`.
3. Preview state: mosaic preview visible, `Digital Mystery Reveal Pack` recommendation visible, mobile CTA `Request my free proof`.
4. Proof form state: proof overlay opens, consent checkbox visible, mobile CTA `Save my proof request`.
5. Proof saved state: saved card visible, project ID reference visible, sticky CTA hidden.
6. Advanced tools collapsed: visible as one secondary `Advanced tools` control.
7. Advanced tools opened: presets, adjust, palette, grid, numbers, scene preview, and save design controls visible.
8. Mobile sticky CTA crop: visible and usable.
9. Mobile sticky CTA preview: visible and usable.

## Remaining UX Debt

P0: none found.

P1: none found in automated/local/preview smoke.

P2:

- The proof form still uses a modal overlay instead of an inline wizard form; it works, but a future pass could make proof state fully inline.
- Advanced tools open into legacy controls; useful, but visually less polished than the public wizard shell.
- Preview QA created two test B2 projects; delete through the B2 admin runbook if cleanup is needed.

## Production Recommendation

Not approved for production automatically. The preview is ready for Derek visual review on mobile and desktop. Production deploy should wait until Derek approves the new public wizard experience.

## Mosaic Clean Addendum

Mosaic Clean v1 was added internally after the public wizard launch. The public flow, mobile sticky CTA behavior, proof request copy, B2 exact design save contract, and Netlify Forms contract remain unchanged.
