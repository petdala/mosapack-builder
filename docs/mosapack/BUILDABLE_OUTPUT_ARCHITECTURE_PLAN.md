# Buildable Output Architecture Plan

Date: 2026-07-05
Status: v1 browser/operator export implemented.

## Recommendation

Start with browser/operator export from the current project, then add Netlify Function export after proof operations require regeneration from `project_id`.

## Option A - Browser/Client Export First

Why:

- fastest path
- uses existing canvas, SVG, and PDF-friendly browser patterns
- good for a proof operator
- no new backend dependency
- easy to compare output with the current on-screen preview

Tradeoffs:

- operator must have the project open
- output generation depends on browser runtime
- proof emails still need manual attachment/review

## Option B - Netlify Function Export

Why:

- better for saved B2 projects
- can regenerate from `project_id`
- better later for proof emails/admin flow
- more deterministic for operator workflows

Tradeoffs:

- needs server-side image/rendering strategy
- more privacy and payload handling complexity
- may require more robust PDF/SVG generation libraries

## Recommended v1 Path

1. Browser/operator export from the currently loaded project. Implemented.
2. Store/export `production.json` and deterministic SVG/HTML/PNG assets. Implemented.
3. Validate with suppliers/local production. Pending.
4. Add Netlify Function export only after the output format is proven. Deferred.

## Files Likely Touched

- `public/builder/index.html`
- `netlify/functions/save-project.mjs`
- a future `netlify/functions/export-proof-package.mjs`
- `scripts/verify-buildable-proof-output.sh`
- new docs under `docs/mosapack/`

## Export Functions Needed

- `generateOptimizedSourcePng()` implemented
- `generateProofPreviewPng()` implemented
- `generateNumberedGridSvg()` implemented
- `generateColorLegendHtmlOrSvg()` implemented
- sticker/magnet SVG layout covered by rounded-square numbered grid SVG in v1
- PDF placement grid deferred
- PDF assembly guide deferred
- `generateProofEmailImage()` implemented
- `generateProductionJson()` implemented

## B2 Metadata Needed

- `project_id`
- grid size
- selected material intent
- selected category
- palette name/version
- cell map
- color counts
- preprocess metadata
- photo suitability metadata
- proof output version

## Privacy Constraints

- Do not send raw image data through Netlify Forms.
- Keep full source image out of public form submissions.
- Use only approved cropped source and preview assets in B2 proof storage.
- Do not expose internal quality scores publicly.
- Do not deploy private QA outputs.

## QA Plan

- Generate proof package for at least 10 saved projects.
- Confirm SVG cell count matches grid dimensions.
- Confirm legend color IDs match every cell.
- Confirm PDF grid remains readable on letter/A4.
- Confirm proof email image is customer-readable on mobile.
- Confirm `production.json` can regenerate the same layout.
- Send sample SVG/PDF files to sticker/magnet suppliers or a local shop.
- Record supplier comments before production approval.

## v1 QA Status

Synthetic local QA generated and validated one full export package under `/tmp/mosapack-buildable-proof-output-qa/`.

Hosted QA and supplier validation remain required before production approval.
