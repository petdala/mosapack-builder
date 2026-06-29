# Mosaic Clean Preprocess Protocol

Date: 2026-06-29
Status: Mosaic Clean v1 implemented in `public/builder/index.html`.

## Problem

Raw photos contain more visual detail than small mosaic grids can carry. Fur, hair, skin gradients, compression noise, low-light grain, and busy backgrounds can map into scattered one-off colors. That creates previews that are harder to recognize and harder to build.

## Goals

- Simplify cropped images before supplier palette mapping.
- Preserve important edges and subject silhouettes.
- Reduce speckles and low-value color variation.
- Keep the result faithful to the original photo style.
- Keep final color assignment tied to real supplier palettes.

## Pipeline Order

Mosaic Clean v1 runs in the existing browser pipeline:

1. Draw approved crop to the current mosaic grid.
2. Apply existing preset.
3. Apply existing manual adjustments.
4. Apply Mosaic Clean preprocess.
5. Apply existing optional local filters.
6. Map to supplier palette with the existing CIEDE2000 color matcher.
7. Run mapped-grid buildability cleanup.
8. Render the public preview.
9. Save preprocess metadata inside the B2 project JSON when proof save is requested.

## Preprocess Steps

Mosaic Clean v1 is deterministic and browser-local.

- `applyMildToneNormalization()` applies a mild contrast and saturation lift with shadow recovery.
- `computeLuminanceEdgeMap()` builds a simple gradient map and dilates protected edge cells.
- `applyEdgePreservingSmooth()` smooths low-gradient regions while preserving protected edges.
- `applyAdaptivePosterization()` gently bands non-edge color variation.
- `cleanupMappedMosaic()` removes small mapped-color components and merges low-count colors when the grid exceeds the target color budget.

## Supplier Palette Mapping

Mosaic Clean does not replace final supplier color matching. The cleaned image is still mapped to the selected supplier palette using the existing CIEDE2000 matcher. This keeps preview colors tied to real piece/material palettes.

## Dither Policy

Default dithering changed from Floyd-Steinberg to ordered dithering:

```text
ordered-default-for-buildability
```

Reason: Floyd-Steinberg can produce high-frequency build noise on small grids. Ordered dithering is still available as a controlled texture, while advanced users can choose none, Floyd-Steinberg, or Atkinson in advanced tools.

## Color Budget

Target max color policy:

- `<= 32`: 12 colors
- `<= 48`: 16 colors
- `<= 64`: 20 colors
- `> 64`: up to 24-25 colors

Stickers and solid/vinyl-style materials bias lower. Magnetic formats bias toward 16-18 colors. Premium brick quote paths can retain more colors.

## Public Language

Allowed public language:

```text
Mosaic Clean
Auto-optimized for mosaic clarity.
```

Do not expose internal metrics, quality scores, or color-distance terminology in public UI.

## B2 Metadata

B2 project JSON now includes:

```text
preprocess.version = mosaic-clean-v1
preprocess.enabled
preprocess.strength
preprocess.detail_protection
preprocess.buildability_cleanup
preprocess.cleanup_stats
preprocess.dither_policy
```

Netlify Forms remain metadata-only and do not receive raw image data.

## Limitations

- v1 runs at the final grid resolution, not a higher working resolution.
- Edge detection is gradient-based, not semantic.
- It does not detect faces, pets, logos, or text explicitly.
- It is tuned for buildability proxies; physical sample calibration is still needed.

## Future Improvements

- Higher-resolution working preprocess before final grid downsample.
- True bilateral filter.
- Guided filter.
- Saliency, face, pet, or logo/text detection.
- Web Worker migration.
- Side-by-side variant comparison for manual proof review.
- Calibrated physical sample review across real supplier materials.
