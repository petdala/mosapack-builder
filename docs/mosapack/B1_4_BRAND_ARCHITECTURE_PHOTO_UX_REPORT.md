# B1.4 Brand Architecture + Photo UX Report

Date: 2026-06-28
Branch: `feature/b1-4-brand-architecture-photo-ux`

## Purpose

Correct MosaPack's public positioning so the core brand and canonical builder are photo-agnostic while preserving pets as the first go-to-market vertical.

## Reason For Correction

B1/B1.3 improvements made the builder easier to use, but several global labels still made the product feel pet-only. That was too narrow for the actual product architecture. MosaPack should support any meaningful photo, with Pet Reveal Kits as the first campaign wedge.

## Before / After Positioning

Before:

- Core builder language centered on pet mosaics and pet photos.
- Some landing copy implied physical products were ready to ship or assemble immediately.
- `photo_category` existed as hidden metadata but was populated from the style preset instead of the user category.

After:

- Core positioning: “Turn any meaningful photo into a custom mosaic reveal kit.”
- Builder copy uses photo, subject, image, gift, and custom proof language.
- Pets remain visible as the popular first use case.
- Physical products remain proof/quote paths, not instant checkout.
- Proof modal captures photo category explicitly.

## Public Copy Changes

Landing page:

- Updated title to `MosaPack - Custom Photo Mosaic Reveal Kits`.
- Updated hero to `Turn Any Meaningful Photo Into a Custom Mosaic Reveal Kit`.
- Added campaign example copy: pet portraits and memorial gifts, plus couples, family memories, baby photos, logos, and holiday gifts.
- Replaced physical shipping/assembly promises with proof/quote and digital-launch-first language.

Builder:

- `Custom Pet Mosaic Preview` became `Custom Photo Mosaic Preview`.
- `Create a free pet mosaic preview` became `Create a free photo mosaic preview`.
- `Upload your pet photo` became `Upload your photo`.
- `Position your pet` became `Position your subject`.
- `Drag to center the face` became `Drag to center the subject`.
- Proof body now states that MosaPack reviews mosaic details and follows up before production.
- Digital product label changed to `Digital Mystery Reveal Pack`.

## Photo Category Field

The proof/save Netlify form now includes:

- hidden `photo_category`
- hidden `selected_vertical`
- visible optional category select with values:
  - Pet
  - Couple / Wedding
  - Family
  - Baby / Kids
  - Memorial
  - Corporate / Logo
  - Holiday Gift
  - Other

Default is `Pet` because the current GTM campaign can still default to pets. The field is not a hard gate and does not upload a raw photo.

## Future Vertical Support

Future verticals should reuse the same canonical builder and pass category/campaign metadata. Do not fork the builder for weddings, families, memorials, corporate logos, or other verticals unless later conversion evidence justifies a separate route.

## Screenshots

Stored in `docs/mosapack/qa/b1-4-brand-architecture/screenshots/`:

- `desktop-01-landing-hero.png`
- `desktop-02-builder-initial.png`
- `desktop-03-crop-editor.png`
- `desktop-04-generated-preview.png`
- `desktop-05-proof-modal-category.png`
- `tablet-01-landing-hero.png`
- `tablet-02-builder-initial.png`
- `mobile-01-builder-initial.png`
- `mobile-02-proof-cta.png`
- `mobile-03-proof-modal-category.png`

## Verification Results

Local checks run during B1.4:

- `bash scripts/security-scan.sh` passed.
- `bash scripts/verify-clean-repo.sh` passed.
- `bash scripts/verify-netlify-forms.sh` passed.
- `bash scripts/verify-b1-crop-control.sh` passed after updating photo-agnostic expected copy.
- `bash scripts/verify-live-exposure.sh` passed against current production exposure.
- `bash scripts/verify-b1-3-visual-cx.sh` passed after repairing the expected builder copy.
- `bash scripts/verify-b1-4-brand-architecture.sh` passed.

Browser smoke:

- Landing page communicates custom photo mosaic positioning.
- Pet use case remains visible as the first campaign example.
- Builder upload/crop/generate works with a synthetic image.
- First preview remains free.
- Proof CTA appears after preview.
- Proof modal includes the photo category field.
- Proof note says “photo or gift,” not only pet.
- Recommended format card still works for a general photo.
- Physical products remain proof/quote paths.
- Checkout remains disabled.
- Console: 0 errors, 0 warnings after syntax fix.
- Local static requests: no local 404s; external analytics requests show expected abort/204 behavior.

## Remaining Manual QA

- 20-photo mixed category test:
  - 5 pet
  - 3 couple/wedding
  - 3 family
  - 3 memorial
  - 3 baby/kids
  - 3 corporate/logo or other
- Mobile real-device test.
- Keyboard/focus pass.
- Live Netlify proof request on preview.

## Production Recommendation

Do not production deploy from B1.4 yet. Preview deploy only.

Production should wait until Derek completes the mixed-category photo QA, mobile real-device check, keyboard/focus pass, and a live Netlify proof request on the preview deploy.

## Next Recommended Task

If B1.4 manual QA passes, proceed to B2 exact design save. If manual QA finds P0/P1 UX issues, fix those before B2.
