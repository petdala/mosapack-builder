# Mosaic Clean Category Profiles v1

Date: 2026-06-30
Status: implemented on `feature/mosaic-clean-category-profiles-v1`.

## Decision

Derek chose option C from the Mosaic Clean visual review: category-based defaults.

Reason: one universal medium default is too risky. Pets and busy photos can benefit from medium preprocessing, while human faces, memorial photos, baby/kids images, and logo/text graphics need more conservative handling.

## Category Profiles

| Category | Strength | Dither | Detail protection | Buildability cleanup | Cleanup mode | Color bias / tone |
| --- | --- | --- | --- | --- | --- | --- |
| Pet | medium | ordered | on | on | normal | normal |
| Couple / Wedding | light | ordered | on | on | conservative | normal |
| Family | light | ordered | on | on | conservative | normal |
| Baby / Kids | light | ordered | on | on | conservative | normal |
| Memorial | light | none | on | on | conservative | gentle tone |
| Corporate / Logo | none | none | on | on | edge-preserve | lower color budget |
| Holiday Gift | light | ordered | on | on | normal | normal |
| Other / Unknown | light | ordered | on | on | conservative | normal |

`Auto / Not sure` resolves to `Other / Unknown`.

## Public UI

The upload state now includes a small optional selector:

```text
What kind of photo is this?
```

Helper copy:

```text
This helps us optimize the mosaic preview for your photo type.
```

The selector is visually secondary, optional, and syncs with the proof form `photo_category` value.

## Processing Behavior

The default Mosaic Clean mode is:

```text
auto-category
```

Before preview generation, the selected category resolves a profile. That profile determines:

- Mosaic Clean strength
- dither default
- cleanup mode
- target color-count bias
- gentle memorial tone handling when applicable

`strength = none` skips Mosaic Clean tone normalization, smoothing, and posterization. Corporate/logo images use this by default so small text, hard edges, and simple flat graphics are not softened before supplier palette mapping.

## Cleanup Modes

`normal`

- current Mosaic Clean cleanup behavior
- appropriate for pets and busy gift photos

`conservative`

- removes only smaller islands
- avoids 3-4 cell rare-color merges
- keeps stronger edge protection
- used for people, babies/kids, and memorial images

`edge-preserve`

- no dithering by default
- preserves crisp borders
- avoids unique-color budget merging by default
- used for corporate/logo/text-like inputs

Internal metadata records warnings if cleanup changes a high percentage of cells for sensitive categories. These warnings are not shown publicly.

## Dither Policy

Dither is profile-driven by default:

- ordered: pet, couple/wedding, family, baby/kids, holiday gift, other/unknown
- none: memorial, corporate/logo

Advanced manual dither override is deferred. The existing advanced dither options remain internal/advanced; the public guided path uses category defaults.

## B2 Metadata

B2 project JSON preprocess metadata now includes:

```text
preprocess.version = mosaic-clean-category-profiles-v1
preprocess.mode = auto-category
preprocess.selected_photo_category
preprocess.resolved_profile
preprocess.profile_label
preprocess.strength
preprocess.dither
preprocess.cleanup_mode
preprocess.target_max_colors
preprocess.target_max_colors_bias
preprocess.cleanup_stats
preprocess.warnings
```

The top-level project snapshot also includes category-profile convenience fields for support/debugging.

## Netlify Forms Metadata

The proof metadata form remains image-free and includes:

- `photo_category`
- `mosaic_clean_version`
- `mosaic_clean_profile`
- `mosaic_clean_strength`
- `mosaic_clean_dither`
- `mosaic_clean_cleanup_mode`
- `project_id`

Raw image data is still not submitted through Netlify Forms.

## Limitations

- There is no automatic image-type inference yet.
- Universal medium is not approved as a blanket default.
- Corporate/logo defaults are intentionally conservative and may still need manual proof review.
- Hard low-light, blurry, or distant-subject photos may still require manual tuning.
- No physical sample calibration has been performed yet.

## Future Tuning

- Add a true category auto-detect pass only after launch data justifies it.
- Compare category defaults against real customer proof outcomes.
- Add manual proof-review variant comparison for support/admin use.
- Calibrate profiles against printed, sticker, magnetic, and brick samples.
