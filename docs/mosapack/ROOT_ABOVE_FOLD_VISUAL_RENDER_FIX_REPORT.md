# Root Above-Fold Visual Render Fix Report

Date: 2026-07-07
Branch: `fix/root-above-fold-visual-render-v1`
Preview URL: `https://6a4d654e0580ee0fc0a9de0a--mosapack.netlify.app`

## Issue

The root homepage passed copy and DOM audits but visually rendered with a large empty gradient area below the header. The first viewport did not reliably show the proof value proposition, H1, or primary CTA.

## Diagnosis

The root page still used an older split-screen hero with a viewport-height minimum, a large before/after slider placeholder, and a decorative gradient overlay. After prior root content cleanup, that structure could leave a blank-looking above-fold area, especially when the old slider/placeholder rendered poorly.

## Changes

- Replaced the root above-fold hero with a simple proof-first layout.
- Removed the full-viewport hero reservation and disabled the old bottom gradient overlay.
- Added stable visual test IDs:
  - `root-hero`
  - `root-hero-title`
  - `root-hero-primary-cta`
  - `root-proof-path-cards`
- Replaced the old hero slider above the fold with compact proof-path cards:
  - Sticker-ready proof
  - Magnetic proof interest
  - Premium display quote
- Guarded the old slider script so it no-ops when the old slider element is absent.
- Updated the final-surface verifier to assert the current root proof-first hero.
- Added `scripts/verify-root-above-fold-visual-render.sh` for browser-backed layout assertions.

## Measurements

Local Chromium, root `/`:

- Desktop 1440x900:
  - header-to-hero content gap: 48px
  - H1 top: 185.4px
  - primary CTA top: 461.6px
  - primary CTA height: 64px
  - horizontal overflow: 0px
- Desktop 1920x1080:
  - header-to-hero content gap: 48px
  - H1 top: 185.4px
  - primary CTA top: 461.6px
  - primary CTA height: 64px
  - horizontal overflow: 0px
- Mobile 390x844:
  - header-to-hero content gap: 32px
  - H1 top: 157.8px
  - primary CTA top: 476.4px
  - primary CTA height: 64px
  - horizontal overflow: 0px

## Safari/WebKit

Playwright WebKit screenshot capture was attempted, but the local Playwright WebKit browser binary is not installed:

`Executable doesn't exist at ~/Library/Caches/ms-playwright/webkit-2311/pw_run.sh`

The new verifier checks opacity, visibility, display, bounding boxes, CTA size, gap after header, and overflow using Chromium. The root hero no longer depends on hidden reveal animation or the old slider placeholder for critical above-fold content.

## Screenshots

Screenshots are stored in:

`docs/mosapack/qa/root-above-fold-visual-render-v1/`

Included:

- `root-desktop-1440x900.png`
- `root-desktop-1920x1080.png`
- `root-mobile-390x844.png`
- `builder-step1-desktop-1440x900.png`
- `builder-step1-mobile-390x844.png`
- `builder-step3-preview-desktop-1440x900.png`
- `builder-step4-proof-desktop-1440x900.png`

## Builder Regression

No builder files were changed. Local browser checks confirmed `/builder/` still has no horizontal overflow at 1440px and no blocked public terms in body text. The existing public proof wizard, hard split, copy, upload layout, proof-output, canonical export, and generator verifiers passed.

## Production Recommendation

No production deploy. Use the preview deploy for Derek visual review before production approval.
