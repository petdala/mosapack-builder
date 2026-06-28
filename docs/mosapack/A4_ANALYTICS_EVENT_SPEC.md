# A4 Analytics Baseline

## Status

A4 uses Netlify Analytics only.

- Enabled in Netlify for site `mosapack`.
- Netlify API reports `analytics_instance_id: 6a40894a82224c70018fb288`.
- No third-party analytics script is added to public app files.
- No Google Analytics, Plausible, PostHog, Meta Pixel, TikTok Pixel, or ad pixels are approved for this phase.
- No custom funnel event payloads are implemented in A4.

## Purpose

Use Netlify Analytics as the pre-launch baseline for traffic and route-level behavior while keeping the clean launch app free of extra tracking vendors.

Track from Netlify dashboard:

- Visits and page views
- Top pages
- Referrers
- Browser/device/location breakdowns if available
- Basic performance/RUM data if available in the current Netlify plan

Priority routes:

- `/`
- `/builder/`
- `/contact/`
- `/legal/privacy.html`
- `/legal/terms.html`
- `/legal/returns.html`

## Privacy Rules

Do not send or store analytics payloads containing:

- Email addresses
- Raw photo data
- Uploaded filenames
- Project JSON
- Full generated mosaic data
- Purchase/payment intent data
- Secret keys or environment variables

## Deferred Event Ideas

These are not implemented in A4. Revisit only after the Netlify Analytics baseline is stable and there is a clear need for first-party product funnel telemetry.

- `builder_start`
- `photo_upload_started`
- `photo_upload_completed`
- `mosaic_generate_started`
- `mosaic_generate_completed`
- `email_waitlist_submitted`
- `save_design_submitted`
- `contact_form_submitted`
- `checkout_clicked_disabled`

If custom events are later needed, prefer a first-party Netlify Function endpoint with strict payload allowlists and no personal/photo data.

## Verification

A4 verification does not require a production code change.

Required checks:

- Netlify project remains connected to `petdala/mosapack-clean`.
- Production branch remains `release/a2-clean-netlify-deploy`.
- Publish directory remains `public`.
- Build command remains blank.
- Netlify Analytics remains enabled.
- `bash scripts/verify-live-exposure.sh` passes.

## Current Result

A4 baseline is complete once Netlify Analytics remains enabled and the live exposure check passes. No deploy is required unless documentation changes are pushed.
