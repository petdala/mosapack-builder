# Builder Final Proof Wizard Polish Report

Date: 2026-07-07

Branch: `fix/builder-final-proof-wizard-polish`

Preview URL: `https://6a4d19266a293fd7cc2596e8--mosapack.netlify.app`

## Purpose

Polish the public MosaPack builder so the first-run customer experience feels like a guided sticker/magnet proof wizard instead of an internal tool or form stack.

## UX Changes

- Reworked the upload state into a desktop two-column workspace:
  - left column: upload card, dropzone, category selector
  - right rail: proof promise, compact photo tips, compact next-step guidance
- Replaced large rectangular progress cards with a connected desktop stepper and compact mobile dot stepper.
- Made the upload card the primary action surface with a soft card, teal-tinted dropzone, clear upload CTA, and compact helper copy.
- Compressed mobile header/hero/stepper so the upload task begins in the first viewport.
- Added brand-consistent teal/pink button hierarchy:
  - teal for upload/crop/continue
  - pink for proof request/save
- Hid the sticky wizard CTA while the proof request dialog is open so it cannot cover consent or form fields.
- Preserved `?ops=1` operator mode and kept Proof Export Tools out of the normal public path.

## Desktop Measurements

### 1440 x 900

- Horizontal overflow: `0px`
- Layout box: `x=80 y=308 w=1280 h=544 bottom=853`
- Upload card: `x=80 y=387 w=878 h=466 bottom=853`
- Guidance rail: `x=980 y=308 w=380 h=544 bottom=853`
- Grid columns: `878.406px 380px`
- Upload card and guidance rail visible without scrolling: yes

### 1920 x 1080

- Horizontal overflow: `0px`
- Layout box: `x=320 y=308 w=1280 h=612 bottom=921`
- Upload card: `x=320 y=387 w=878 h=534 bottom=921`
- Guidance rail: `x=1220 y=308 w=380 h=612 bottom=921`
- Grid columns: `878.406px 380px`
- Upload card and guidance rail visible without scrolling: yes

## Mobile Measurements

### 390 x 844

- Horizontal overflow: `0px`
- Hero: `x=0 y=50 w=390 h=225 bottom=275`
- Upload card: `x=14 y=352 w=363 h=376 bottom=728`
- Sticky CTA: `x=0 y=776 w=390 h=68 bottom=844`
- Upload card begins in first viewport: yes
- Sticky CTA visible: yes

### Mobile Proof Dialog

- Dialog body class: `email-gate-open`
- Sticky CTA display while dialog is open: `none`
- Proof dialog card: `y=4 h=748 bottom=752`
- Horizontal overflow: `0px`

## Copy And DOM Audits

Draft root `/` rendered text audit:

- Hits for requested leak terms: none

Draft `/builder/` public path audit:

- Hits for requested leak terms: none
- `#advancedTools` mounted: no
- `#proofExportTools` mounted: no
- Parsed HTML includes `Advanced Tools`: no
- Parsed HTML includes `Proof Export Tools`: no
- Parsed HTML includes `Mosaic Clean`: no
- Parsed HTML includes `Canonical Design JSON`: no
- Parsed HTML includes `Production JSON`: no

Draft `/builder/?ops=1` operator path audit:

- `#advancedTools` mounted: yes
- `#proofExportTools` mounted: yes
- Parsed HTML includes `Proof Export Tools`: yes
- Parsed HTML includes `Canonical Design JSON`: yes
- Parsed HTML includes `Production JSON`: yes

## Smoke Test

Environment: Netlify draft preview

Test email: `derek+mosapack-final-polish-smoke@example.com`

Result: pass

- Upload worked.
- Crop step opened.
- Preview rendered.
- Proof form opened.
- Proof form submitted.
- Proof saved state appeared.
- B2 save returned a project id.
- Netlify Forms POST returned `200`.
- Form POST contained metadata fields only; no raw image data URL was submitted through the proof form.

Saved project id:

`5961258f-b074-4636-b6a2-56825172fa59`

Note: the existing hidden form metadata still includes legacy `product_interest=bricks`. This is not visible customer copy and was left unchanged because this task explicitly preserves the proof request data model.

## Screenshots

Folder: `docs/mosapack/qa/builder-final-proof-wizard-polish/`

- `desktop-upload-1440x900.png`
- `desktop-upload-1920x1080.png`
- `mobile-upload-390x844.png`
- `mobile-crop.png`
- `mobile-preview.png`
- `mobile-proof-form.png`
- `proof-saved.png`
- `ops-mode.png`
- `root-page.png`

## Production Recommendation

No production deploy. Ready for Derek visual review on the draft preview.
