# B1.2 Proof Request Flow Report

## Purpose

Add a post-preview proof request path to the canonical builder without enabling checkout, blocking the first preview, exposing public quality scores, or creating a new builder version.

## Public Proof Language

- Headline: “Request Your Custom Proof”
- Body: “We'll follow up with the next step to confirm your approved design before production.”
- Supporting points: free preview first, design confirmation before production, recommended format based on the photo, no checkout today.
- Landing page proof copy: preview is free, proof can be requested when ready, and production starts only after design approval.

## Form Fields Captured

The existing `mosapack-save-design` Netlify Form captures metadata only:

- `request_type`
- `proof_requested`
- `recommended_format`
- `product_interest`
- `project_id`
- `grid_size`
- `preview_shape`
- `photo_category`
- `crop_x`
- `crop_y`
- `crop_zoom`
- `focal_point_x`
- `focal_point_y`
- `crop_version`
- `timestamp`
- `page`
- `source`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `email`
- `name` optional
- `note` optional

No raw photo/file input is inside Netlify Forms.

## Recommended-Format Logic

Rule-based only, with no public AI, DeltaE, SSIM, or quality score language:

- default/unsure: Digital Mystery Pet Reveal Pack
- centered medium preview: Magnetic Reveal Kit or Sticker Reveal Kit
- larger grid or large brick path: Premium Brick Kit Quote

Users can choose another format in the post-preview card before submitting the proof request.

## Wobrick Decision

`public/builder/wobrick-integration.js` was classified as an unused public dependency and external supplier funnel leak. It exposed Wobrick/supplier export helpers on `window` and included public upload/order guidance. The script reference and public file were removed for launch. Supplier export logic may return later only as internal order/export metadata after D1/C gates.

## Launch-Scope Restrictions

- No production deploy from B1.2.
- No checkout, Stripe, Shopify, Printful, Printify, dashboard, affiliate, automation, or ESP work.
- No public quality score, public DeltaE/SSIM, Gold/Silver/Bronze quality badge, or fake checkout/cart state.
- First preview remains free and is not email-gated.
- Physical products remain custom proof/custom quote paths, not buy-now products.

## Manual QA Checklist

- Generate preview.
- Confirm proof CTA appears only after preview.
- Submit proof request with test email.
- Confirm Netlify Forms receives it.
- Confirm no raw photo is submitted.
- Confirm physical options are not presented as buy-now products.
- Confirm mobile layout is usable.
- Confirm keyboard focus order reaches proof CTA and form.
- Confirm preview remains free.

## Production Readiness Status

Preview deploy only. Production is not recommended until Derek verifies the preview, a live Netlify proof request reaches Forms, and the 20-photo pet test set/mobile/keyboard checks are complete.

## Remaining Risks

- The builder remains a large single HTML file, so regressions need verifier coverage.
- Rule-based format recommendation is intentionally simple and should be reviewed against real pet photos.
- Live Netlify Forms receipt still requires a preview-deploy submission.

## Post-Implementation Audit

Current proof flow status: B - lead/proof-intent capture only.

B1.2 captures metadata through Netlify Forms, including request type, proof-request flag, recommended format, crop/focal metadata, timestamp, page/source, UTM fields, email, optional name, and optional note.

Exact design save gap:

- `project_id` is generated client-side from a timestamp.
- `project_id` does not map to a retrievable saved design record.
- generated preview image is not saved server-side.
- project JSON is not persisted server-side.
- cropped source image is not persisted server-side.
- original uploaded image is not persisted server-side.
- approved mosaic cannot be reliably reproduced later from the proof-request form alone.

Public copy was adjusted to avoid implying Derek can immediately review the exact saved design. The success message now says: “Proof request saved. We'll follow up with the next step to confirm your approved design.”

Netlify Forms captures metadata only. No raw photo/file input is included in the proof form.

Next required build: B2 exact design save.

Preview URL status: `https://6a412cd172ca55a4d6fa7aa2--mosapack.netlify.app` returned HTTP 200 for `/`, `/builder/`, and `/assets/scenes/office-1920x1080.jpg` during this audit.

Manual QA still needed:

- 20-photo pet test set
- mobile test
- keyboard/focus test
- one real live Netlify Forms proof-request submission

## B1.3 Visual CX Audit Update

B1.3 visual QA confirmed the upload/crop/preview/proof path works locally, but manual QA is still required before production approval. The visual fix moved the post-preview journey to the Formats & Proofs stage, hid advanced controls until preview generation, and kept the proof request metadata-only.

B2 exact design save remains the next true build gate before real proof fulfillment, paid custom proof, or physical checkout.
