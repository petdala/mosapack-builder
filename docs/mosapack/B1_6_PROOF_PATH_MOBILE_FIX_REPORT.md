# B1.6 Proof Path Reachability and Mobile Layout Fix Report

Date: 2026-06-28T19:40:52Z
Repo: `/Users/dereksolas/Developer/mosapack-clean`
Branch: `fix/b1-6-proof-path-mobile`
Preview: `https://6a417891ca97689b8ff5819c--mosapack.netlify.app`

## Purpose

Fix the B1.5 P0 blocker where users could generate a preview but could not reach the proof request CTA through the rendered customer path.

## Root Cause

`#postPreviewFlow` was unhidden after preview generation, but it lived inside `#insightsPanel`. That parent panel remained `display:none`, so `Request My Custom Proof` existed in the DOM but had no rendered box and could not be clicked, focused, or tested through the real customer path.

## Files Changed

- `public/builder/index.html`
- `scripts/verify-b1-5-proof-path.sh`
- `docs/mosapack/B1_5_MIXED_PHOTO_QA_REPORT.md`
- `docs/mosapack/B1_6_PROOF_PATH_MOBILE_FIX_REPORT.md`
- `docs/mosapack/B1_5_PRODUCTION_DEPLOY_CHECKLIST.md`

## Code Fix Summary

- Moved the single existing `#postPreviewFlow` section out of the hidden insights drawer and into the active preview/canvas flow.
- Kept one proof CTA and one form state; no duplicate proof form was introduced.
- Kept the user on the visible preview journey after generation instead of switching to a hidden proof drawer.
- Updated the live region after preview generation to: `Preview ready. You can request a custom proof.`
- Allowed standard plus-addressed emails so QA/live test addresses like `derek+...@example.com` submit correctly.

## Mobile Fix Summary

- Removed the failing horizontal overflow condition at `390x844`.
- Tightened mobile tab sizing and button sizing.
- Added mobile constraints for the proof flow, modal, canvas wrappers, and proof cards.
- Verified 6/6 mobile subset passed with no horizontal overflow.

## Keyboard/Focus Fix Summary

- Added an accessible close button to the proof modal.
- Moved focus into the email field when the proof modal opens.
- Escape closes the proof modal.
- Focus returns to the proof CTA after modal close.
- Keyboard rerun passed.

## Script Regression Coverage

Created `scripts/verify-b1-5-proof-path.sh`.

The script performs a browser-level check and fails if:

- Playwright/browser automation is unavailable.
- The proof flow is hidden by itself or any parent.
- `Request My Custom Proof` is not visible/focusable.
- The proof modal does not open.
- The form is missing email/category/proof metadata.
- The proof payload does not include `request_type=custom_proof` and `proof_requested=true`.
- The form includes raw file/image upload fields.
- Mobile `390x844` has horizontal overflow.
- Public quality-score terms are visible.
- Checkout-disabled copy is missing.

## QA Rerun Summary

20-photo desktop rerun:

- Images tested: 20
- Upload/crop/preview: 20/20
- Nonblank preview: 20/20
- Proof CTA reachable: 20/20
- Proof modal opens: 20/20
- Metadata-only proof payload: 20/20
- Recognizable preview automated proxy: 20/20
- Full pass: 20/20

Mobile rerun:

- Images tested at `390x844`: 6
- Pass: 6/6
- Horizontal overflow: 0/6

Keyboard/focus rerun:

- Pass
- Proof CTA focusable
- Enter opens modal
- Focus starts in email field
- Submit and Escape/close path reachable
- Focus returns to proof CTA

Live preview proof request:

- Preview URL: `https://6a417891ca97689b8ff5819c--mosapack.netlify.app/builder/`
- Test email: `derek+mosapack-b16-preview-test@example.com`
- HTTP response: 200
- UI response: `Proof request saved. We'll follow up with the next step to confirm your approved design.`
- Derek should verify the submission in Netlify dashboard -> Forms.

## Remaining Risks

- Human subjective likeness review is still recommended; automation verifies nonblank/varied output and proof path, not emotional likeness.
- Format recommendation still returns `Magnetic Reveal Kit` for all automated cases. This is acceptable for B1.6 proof-path release because proof is intent-only and checkout is disabled, but recommendation logic should be revisited after B2.

## Production Recommendation

Approved for production deploy from the B1.6 preview, pending Derek's subjective review of the preview and Netlify Forms dashboard confirmation.

## B2 Recommendation

Ready to start `B2 exact design save` after production deploy decision.

## Production Deploy Record

Date: 2026-06-28T19:53:12Z

Production deploy command used:

```bash
/Users/dereksolas/.npm-global/bin/netlify deploy --dir=public --no-build --prod
```

Production URL:

```text
https://mosapack.netlify.app
```

Unique deploy URL:

```text
https://6a417b2cc419d8d5989a7893--mosapack.netlify.app
```

Deploy logs:

```text
https://app.netlify.com/projects/mosapack/deploys/6a417b2cc419d8d5989a7893
```

Production verification:

- `bash scripts/verify-live-exposure.sh` passed after deploy.
- Required production routes returned 200.
- Forbidden old builders/dashboards remained 404.
- Production builder scan found no public Wobrick CTA, fake order success copy, public quality-score labels, old builder route references, dashboard, or affiliate strings.

Production proof request smoke test:

- Submitted exactly one request through the production UI path.
- Email: `derek+mosapack-b16-prod-test@example.com`
- HTTP response: 200
- UI confirmation: `Proof request saved. We'll follow up with the next step to confirm your approved design.`
- Derek should verify in Netlify dashboard -> Forms.

B1.x production status: deployed.

B2 readiness: ready for `B2 exact design save` next.
