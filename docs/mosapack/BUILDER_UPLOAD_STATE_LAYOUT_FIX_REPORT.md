# Builder Upload State Layout Fix Report

Date: 2026-07-07
Branch: `fix/builder-upload-state-layout`
Status: implemented for Derek visual review.

## Issue Summary

Claude audited the running builder and found two P0 first-screen layout bugs:

- Desktop upload state reserved a large empty preview frame before a photo existed.
- Mobile `390px` upload state had horizontal overflow and clipped content.

The fix is scoped to the initial upload state in `public/builder/index.html`. It does not change proof export tools, B2 save, Netlify Forms, the kit-pack generator, Gate A PDFs, or supplier packet docs.

## Root Causes

- Global `.canvas-container` still reserved `70vh` and centered content for the product preview frame.
- Global `.canvas-viewport` still used a large `70%` / `600px` frame before upload.
- Mobile responsive clamps applied to the general public wizard frame, but the upload state still inherited too much desktop preview behavior.
- Upload copy repeated the same title/helper in the card heading and dropzone.
- The trust chip row had six chips, including a duplicated no-payment claim.

## Desktop Fix

- Added `.public-wizard.wizard-state-upload` overrides so the upload state:
  - uses normal content flow instead of a large centered preview reservation,
  - removes the `70vh` feel before a photo exists,
  - uses a constrained upload card with `max-width: 760px`,
  - keeps later crop/preview/proof/saved preview behavior unchanged.

## Mobile Overflow Fix

- Added upload-state mobile clamps at `max-width: 900px`.
- Added overflow guards to the public wizard shell/container.
- Reduced the mobile upload frame to fit required controls above the sticky CTA.
- Hid only decorative mobile upload chrome and the redundant category helper paragraph.
- Verified `document.documentElement.scrollWidth === window.innerWidth` at `390px`.

## Copy / Chip Cleanup

- Kept the card heading: `Upload your photo`.
- Changed dropzone copy to: `Drag a photo here or click to browse`.
- Trimmed trust chips to:
  - Free preview
  - Custom proof
  - Sticker-ready
  - No checkout today

## Screenshots

Screenshots are stored in:

`docs/mosapack/qa/builder-upload-layout-fix/`

- `desktop-upload-after.png`
- `mobile-upload-after.png`
- `mobile-crop-after.png`
- `mobile-preview-after.png`

## QA Results

- Desktop `1440px`: no horizontal overflow; upload dropzone sits in a normal upload card instead of a huge empty preview frame.
- Mobile `390px`: no horizontal overflow; H1 and trust chips fit; upload card fits; category select is above the sticky CTA.
- Synthetic upload reached `wizard-state-crop`.
- Crop CTA generated `wizard-state-preview`.
- Proof request opened `wizard-state-proof` email gate.
- Advanced tools remained collapsed by default; Proof Export Tools remain inside Advanced tools.
- Hosted preview `/builder/` returned `200`.
- Hosted preview mobile smoke reached upload, crop, preview, and proof UI states with no `390px` overflow.

## Preview URL

Preview deploy URL: `https://6a4ceea3620ee17c4a47583a--mosapack.netlify.app`

## Production Recommendation

No production deploy. Pending Derek visual review.
