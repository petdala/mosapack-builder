# Buildable Output Architecture Plan

Date: 2026-07-05
Status: v1 browser/operator export implemented; local kit-pack renderer implemented.

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
3. Generate local/operator PDF kit packs from canonical design JSON. Implemented.
4. Validate with suppliers/local production. Pending.
5. Add Netlify Function export only after the output format is proven. Deferred.

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
- local `tools/kitpack/generate_kit_pack.py` PDF renderer implemented for operator QA

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

Kit-pack generator QA generated operator PDFs under:

```text
/tmp/mosapack-generate-kit-pack-qa/
```

Generated PDFs are not committed and are not production-approved.

## Schema/Constants Reconciliation

Draft production constants and canonical design schema now live at:

- `config/production-constants.json`
- `config/design-schema.v1.json`

The current browser export JSON does not yet feed the future kit-pack generator directly. Required reconciliation is documented in:

- `docs/mosapack/PRODUCTION_JSON_SCHEMA_DIFF_REPORT.md`
- `docs/mosapack/PRODUCTION_JSON_ADAPTER_PLAN.md`
- `docs/mosapack/PRODUCTION_CONSTANTS_LOADER_PLAN.md`

Architecture rule:

- Buildable Proof Output v1 remains the operator proof-export layer.
- A JS adapter emits canonical schema v1.1 design JSON.
- The Python generator has been ported as local/operator tooling only.
- The generator must load shared constants instead of hard-coding OL2050 values.
- The generator must remain out of Netlify/customer runtime until physical validation passes.

## Physical Sample Gate

- Gate A: 100-150 sticker instrumented build with OL2050 alignment verification.
- Gate B: full First Hello sample.
- Material/printer combinations are validated as pairs.
- OL2050 is a draft sheet profile until Gate A passes.
- 12-inch Pixel Portrait remains the commercial MVP.
- 16-inch Gallery is a premium proof option.
- 24-inch Signature remains made-to-order beta.
- Magnets remain waitlist until material validation.
