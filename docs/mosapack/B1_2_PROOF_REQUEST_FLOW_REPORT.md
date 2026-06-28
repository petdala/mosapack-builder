# B1.2 Proof Request Flow Report

## Purpose

Add a post-preview proof request path to the canonical builder without enabling checkout, blocking the first preview, exposing public quality scores, or creating a new builder version.

## Public Proof Language

- Headline: “Request Your Custom Proof”
- Body: “We’ll review your pet mosaic and send a custom proof before production. You approve the design before anything is made.”
- Supporting points: free preview first, proof approval before production, recommended format based on the photo, no checkout today.
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
