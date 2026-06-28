# B1.1 Builder Trust + Accessibility Report

## Purpose

Harden the canonical builder for trust, accessibility, and launch-scope clarity without creating a new builder version or enabling checkout.

## Changed Files

- `public/builder/index.html`
- `docs/mosapack/CANONICAL_BUILDER_PROTOCOL.md`
- `docs/mosapack/B1_CROP_FOCAL_CONTROL_QA.md`
- `docs/mosapack/B1_1_BUILDER_TRUST_ACCESSIBILITY_REPORT.md`
- `scripts/verify-clean-repo.sh`
- `scripts/verify-b1-crop-control.sh`
- `AGENTS.md`
- `CLAUDE.md`

## Accessibility Checklist

- Meaningful hidden `h1` is present.
- Functional emoji controls were replaced with text labels.
- Icon-only controls have accessible names or visible labels.
- Existing `:focus-visible` focus treatment remains in place.
- Segmented controls keep `aria-pressed` state.
- Main preview canvas has an accessible label before and after generation.
- Builder status region uses `role="status"` and `aria-live="polite"`.
- Crop drag remains pointer-first; keyboard panning is still manual QA scope.

## Product-Format Copy Matrix

| Format | Public state |
| --- | --- |
| Free pet preview | Active. User can upload, crop, and generate a free preview. |
| Digital Mystery Pet Reveal Pack | First paid path after D1; current wording is launch access. |
| Sticker Reveal Kit | Made-to-order custom proof request. |
| Magnetic Reveal Kit | Made-to-order premium custom proof option. |
| Premium Brick Kit | Premium custom quote path. |
| Checkout | Temporarily disabled until D1. |

## Launch-Scope Enforcement

- No public raw builder version route was added.
- Public builder no longer presents active checkout, express payment, or add-to-cart success language.
- Save/request actions remain metadata-only and do not upload raw photos through Netlify Forms.
- Public quality score/badge language remains forbidden.

## Verification Results

Fill final command results in the release report after checks run.

## Remaining Risks

- Browser manual QA is still required on mobile and keyboard focus order.
- 20-photo pet test set remains required before production approval.
- The builder is still a large single HTML file, so future accessibility regressions need script coverage.

## Production Deploy Recommendation

Do not production deploy from this task. Production approval should wait until Derek tests the preview deploy.

## B1.2 Follow-Up

- Added a post-preview proof request section to the canonical builder.
- Extended the existing metadata-only `mosapack-save-design` Netlify Form with proof request fields.
- Added rule-based recommended-format copy after preview generation.
- Removed the unused public Wobrick supplier export file and script reference.
- Public proof flow keeps first preview free and checkout disabled.
