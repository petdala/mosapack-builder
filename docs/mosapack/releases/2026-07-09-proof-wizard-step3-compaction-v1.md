# Proof Wizard Step 3 Compaction v1 Production Release

Date: 2026-07-09

## Production Deployment

- Production URL: https://mosapack.netlify.app
- Unique production deploy: https://6a4f55b62d38d56055102ee7--mosapack.netlify.app
- Deployed commit: `360b5e28995330c6e9eb0f5e873b87830fd64aea`
- Source branch: `fix/builder-step3-conversion-compaction-v1`
- Deploy timestamp: `2026-07-09T08:03:04.432Z`
- Netlify deploy title: `production deploy 360b5e2 step3 compaction`

Netlify recorded `commit_ref: null` because this was a manual/static CLI deploy from the verified local checkout, not a Git-triggered deploy.

## Production Smoke Test

- Smoke test email: `derek+mosapack-production-step3-compaction-smoke@example.com`
- Saved project ID: `6ecd6dde-00a0-4772-a4dd-5104232aeba1`
- Test data status: retained in production; not deleted.

The smoke test covered:

- root homepage hero above the fold
- public `/builder/` proof wizard load
- Step 3 defaulting to Mosaic preview
- one teal Step 3 primary CTA
- quiet Adjust crop action
- collapsed fine-tune by default
- fine-tune regeneration
- proof request submission
- proof saved state
- exact design save
- form submission
- `/builder/?ops=1` operator mounting

## Metadata Captured

Production smoke captured:

- `product_interest=sticker_proof`
- `format_interest=sticker_ready`
- `preferred_size_in=12`
- `photo_category=Other / Unknown`
- `preview_tweaks={"brightness":1,"contrast":1,"background_simplify":1,"regen_count":1}`

Exact design save captured matching proof metadata, including `preview_tweaks`.

## Verification Suite Summary

Final pre-deploy verification passed:

- root above-fold visual render
- public proof wizard UX
- public builder hard split
- final public surface cleanup
- Step 3 top-gap verifier
- final conversion polish verifier
- Step 3 compaction verifier
- fine-tune metadata verifier
- dark-field speckle verifier
- mosaic-honesty guard
- `/` copy/DOM audit
- `/builder/` copy/DOM audit
- `/builder/?ops=1` operator audit

Post-deploy production smoke passed against `https://mosapack.netlify.app`.

## Guardrails Preserved

This release intentionally preserves:

- public proof-first journey
- no public legacy/pro/export builder panels
- no public pricing or checkout
- no public shipping or production promises
- no public supplier workflow
- no public Mosaic Clean UI/runtime/copy
- no public LEGO/brick positioning
- no public peel-to-reveal concept
- no Detail Priority Map
- no physical production approval claim

Magnets remain a proof-interest metadata signal only, not an active production promise.

## Intentionally Not Included

This production release does not include:

- checkout
- pricing
- shipping
- supplier APIs
- LEGO/brick positioning
- peel-to-reveal
- Mosaic Clean public UI
- Detail Priority Map
- physical production promises

## Known Non-Blocking Notes

- The manual/static Netlify deploy reports `commit_ref: null`; the local checkout was verified at `360b5e28995330c6e9eb0f5e873b87830fd64aea` immediately before deploy.
- The production smoke test remains in production test data for traceability.
- Existing source still contains legacy/internal strings in non-public code paths; public `/builder/` DOM and visible text audits passed, and operator content is gated behind `?ops=1`.
