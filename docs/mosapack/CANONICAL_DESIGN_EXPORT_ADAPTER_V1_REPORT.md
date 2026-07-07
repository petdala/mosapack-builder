# Canonical Design Export Adapter v1 Report

Date: 2026-07-07
Branch: `feature/production-schema-constants-v1`
Status: implemented as operator-only browser export; production deploy not approved.

## Purpose

Canonical Design Export Adapter v1 converts the current Buildable Proof Output state into schema-aligned design JSON for future downstream rendering.

This is the bridge between:

- current operator proof exports, and
- future `generate_kit_pack.py` local/operator rendering.

The generator was not ported in this task.

## Functions Added

Added in `public/builder/index.html` near the Buildable Proof Output utilities:

- `generateProofRef(projectId)`
- `getCanonicalGridSize()`
- `getSizeInForGrid(grid)`
- `normalizePaletteForDesignJson(palette, colorLegend)`
- `convertCellMapToRowMajorIndexes(currentCellMap, palette)`
- `resolveBlackBase(canonicalPalette, photoCategory, options)`
- `generateCanonicalDesignJson()`
- `validateCanonicalDesignJson(design)`

Also added a minimal mirrored `PRODUCTION_CONSTANTS_V1` object for runtime validation. The repo source of truth remains:

```text
config/production-constants.json
```

## Export UI Behavior

Added an operator-only button inside collapsed Advanced tools / Proof Export Tools:

```text
Download Canonical Design JSON
```

The button:

- is disabled until a mosaic preview exists
- is not shown in the main customer proof flow
- downloads `mosapack-design-v1.json`
- validates before download
- shows an operator-visible error if validation fails

Existing proof-output exports remain intact.

## Canonical JSON Shape

The adapter emits:

- `schema_version: 1.1`
- `project_id`
- `proof_ref`
- `grid`
- `size_in`
- `sheet_profile`
- `palette_id`
- embedded palette objects with `{ id, name, hex, index }`
- flat row-major integer `cell_map`
- `black_base`
- `source`
- `proof`
- `output_files`
- derived/cache `production`

For unsaved previews, a local preview UUID is used as `project_id` and `source.unsaved_preview` is true. After proof save, the saved storage `project_id` is used.

## Validation Result

Local synthetic QA path:

```text
/tmp/mosapack-canonical-design-export-qa/mosapack-design-v1.json
```

Hosted synthetic QA path:

```text
/tmp/mosapack-canonical-design-export-hosted-qa/mosapack-design-v1.json
```

Hosted preview URL:

```text
https://6a4c8df439955392fe73d92e--mosapack.netlify.app
```

Hosted proof save returned:

```text
556e7d29-33b3-4d43-8f6c-600bb8a9ec21
```

Validated invariants:

- JSON parses
- `project_id` present
- `proof_ref` present
- grid is supported
- `size_in` equals `grid / 2`
- palette IDs are unique
- cell map length equals `grid * grid`
- every cell map value is an integer in palette range
- no data URLs
- no commerce/order fields
- current production JSON includes valid `canonical_design`

Generated QA JSON files were not committed.

## Limitations

- Runtime constants are minimally mirrored in the builder; full constants import remains v1.1.
- Palette IDs are normalized from current proof colors, not yet mapped to a fully calibrated production palette.
- Unsaved preview exports use a temporary local preview UUID.
- Black-base support is structural only; normal sticker proofs default to `black_base: false`.
- OL2050 remains unverified until Gate A alignment testing.
- Generator output, PDFs, and printable sheets are not implemented in this task.

## Generator Port Readiness

The generator can be ported next as a local/operator renderer only after review confirms the canonical JSON is acceptable.

Recommended next implementation:

1. Port `generate_kit_pack.py` as a local/operator renderer.
2. Make it consume `mosapack-design-v1.json` plus `config/production-constants.json`.
3. Keep it out of public customer UX.
4. Run Gate A alignment and 100-150 sticker instrumented build before production approval.

## Production Recommendation

No production deploy.
