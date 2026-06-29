# Mosaic Engine Audit

Date: 2026-06-29
Current status: Mosaic Clean v1 added to the canonical public builder.

## Current Pipeline

The canonical engine in `public/builder/index.html` follows this order:

1. User uploads a photo.
2. User crops and positions the subject.
3. The approved crop is drawn to the selected grid.
4. Existing preset and manual adjustments are applied.
5. Mosaic Clean v1 preprocess runs.
6. Existing optional local filters run.
7. Final supplier palette mapping uses the existing CIEDE2000 matcher.
8. Mapped-grid cleanup reduces isolated build noise.
9. The mosaic preview renders to `mosaicCanvas`.
10. Proof requests save B2 project JSON, cropped source, rendered preview, and metadata.

## Mosaic Clean v1

Implemented functions:

- `cloneImageData`
- `getMosaicCleanOptions`
- `getTargetMaxColors`
- `computeLuminanceEdgeMap`
- `applyMosaicCleanPreprocess`
- `applyMildToneNormalization`
- `applyEdgePreservingSmooth`
- `applyAdaptivePosterization`
- `computeMappedCounts`
- `cleanupMappedMosaic`

Runtime metadata is tracked in `mosaicCleanMeta` and exposed only through `window.MosaPackDebug.getMosaicCleanMeta()`.

## What Changed

- Default dither changed to ordered for buildability.
- Cropped image data is tone-normalized, edge-smoothed, and posterized before supplier mapping.
- Mapped output removes tiny non-protected connected components.
- Mapped output enforces a target color budget where needed.
- B2 project JSON includes `preprocess` metadata.

## What Is Preserved

- Public guided wizard layout.
- Upload, crop, preview, proof, and saved states.
- Supplier palette mapping through the existing color matcher.
- B2 `/.netlify/functions/save-project` flow.
- Netlify Forms metadata submission.
- `project_id` hidden field.
- `designStorageConsent`.
- No raw image data in Netlify Forms.
- No checkout or payment UI.

## Known Limitations

- v1 is grid-resolution preprocess, not high-resolution guided filtering.
- Edge protection is gradient-based and can miss semantic subject details.
- Some difficult photos can still need manual proof review.
- No physical sample calibration has been performed for Mosaic Clean output.

## Recommendation

Use Mosaic Clean v1 as the default proof-preview path, then have Derek visually review generated previews before production deploy.
