# Production JSON Schema Diff Report

Date: 2026-07-07
Branch: `feature/production-schema-constants-v1`
Status: adapter implemented; generator still deferred.

## 1. Current Sample Source

Current Buildable Proof Output v1 sample:

```text
/tmp/mosapack-schema-diff/current-production-json-sample.json
```

The sample was generated from the synthetic-safe Buildable Proof Output QA export. It is not committed.

## 2. Current Production JSON Fields

Current top-level fields:

- `proof_output_version`
- `project_id`
- `project_saved`
- `grid_width`
- `grid_height`
- `cell_shape`
- `preview_shape`
- `material_intent`
- `recommended_output`
- `palette`
- `color_legend`
- `cell_map`
- `crop_state`
- `category`
- `photo_suitability`
- `preprocess_metadata`
- `render_settings`
- `source_policy`
- `output_files_expected`
- `created_at`

Current sample details:

- `project_id`: `null` for unsaved preview samples.
- `grid_width`: `48`
- `grid_height`: `48`
- `palette`: array of used colors with IDs such as `C01`.
- `cell_map`: 48 rows by 48 columns.
- `cell_map` entries: color IDs such as `C03`.

## 3. Canonical Schema Required Fields

`config/design-schema.v1.json` requires:

- `schema_version`
- `project_id`
- `grid`
- `size_in`
- `palette_id`
- `palette`
- `cell_map`
- `black_base`

Schema v1.1 also supports:

- `proof_ref`
- `sheet_profile`
- `kit`
- `kit_format`
- `render_style`
- `pipeline_variant`
- `photo_category`
- `gift_mode`
- `proof_status`
- `production`
- `source`

## 4. Exact Matches

- `project_id` exists in both shapes, but current unsaved preview exports may set it to `null`.
- `palette` exists in both shapes and already uses object entries with `id`, `name`, and `hex`.
- `cell_map` exists in both shapes as the main design map.
- Current export and schema both use row-major, top-left origin assumptions.

## 5. Missing In Current Output

Current Buildable Proof Output `production.json` is missing:

- `schema_version`
- `grid`
- `size_in`
- `palette_id`
- `black_base`
- `proof_ref`
- `sheet_profile`
- `kit`
- `kit_format`
- `render_style`
- `pipeline_variant`
- `proof_status`
- canonical `production` derived/cache block
- canonical `source` metadata block

## 6. Extra Current Fields

Current fields that are not canonical schema v1.1 fields:

- `proof_output_version`
- `project_saved`
- `grid_width`
- `grid_height`
- `cell_shape`
- `preview_shape`
- `material_intent`
- `recommended_output`
- `color_legend`
- `crop_state`
- `category`
- `photo_suitability`
- `preprocess_metadata`
- `render_settings`
- `source_policy`
- `output_files_expected`
- `created_at`

These are useful proof-output metadata, but they need to be moved or mirrored into canonical `source`, `production`, or a schema extension block before feeding a generator.

## 7. Naming Mismatches

| Current output | Canonical schema v1.1 |
| --- | --- |
| `proof_output_version` | `schema_version` plus output-specific metadata |
| `grid_width` / `grid_height` | `grid` |
| `category` | `photo_category` |
| `material_intent` | `kit_format` |
| `output_files_expected` | output/export metadata, not design truth |
| `preprocess_metadata` | source/proof-ops metadata |
| `crop_state` | source/proof-ops metadata |

## 8. Type Mismatches

- Current `project_id` may be `null`; canonical schema requires a string.
- Current `cell_map` is a 2D array of color ID strings.
- Canonical `cell_map` is a flat row-major array of integer palette indexes.
- Current `palette` IDs are generated `C01`, `C02`, etc.
- Canonical palette IDs are stable snake_case production IDs such as `snow_white` and `ink_black`.

## 9. Unit Mismatches

- Current output has no physical `size_in`.
- Canonical schema requires `size_in` in inches.
- Current output carries a `recommended_output` object with text ranges; canonical schema needs concrete grid/size pairing.
- Production constants use inches for sheet, bleed, die, pitch, margin, and board values.

## 10. Coordinate-System Assumptions

Both current output and canonical schema assume:

- top-left origin
- row-major ordering
- full grid present

The adapter must flatten current 2D rows into a single row-major array.

## 11. Palette/Cell Map Compatibility

Current output cannot feed the generator directly because:

- cell values are `Cxx` strings, not integer palette indexes.
- `Cxx` IDs are generated export labels, not stable production palette IDs.
- current palette may include only used colors; canonical designs should embed the palette needed for every referenced cell index.

An adapter can normalize this by:

1. preserving current palette order,
2. mapping each `Cxx` ID to its palette index,
3. flattening `cell_map`,
4. adding canonical palette IDs once the production palette mapping is resolved.

## 12. Black-Base Support Status

Current output has no `black_base` field.

Canonical schema requires:

- `black_base: true|false`
- black-base exclusion keyed by palette entry `id == "ink_black"`

The current Buildable Proof Output branch does not yet emit black-base production behavior.

## 13. Proof Ref Status

Current output has no `proof_ref`.

Canonical schema supports:

- `project_id`: storage UUID-compatible identity
- `proof_ref`: customer-facing short code like `MP-FH24A`

The adapter should generate or preserve `proof_ref` without replacing `project_id`.

## 14. Production Derived/Cache Status

Current output places proof/export metadata at the top level.

Canonical schema treats `production` as derived/cache only. The generator must recompute production facts from:

- canonical `cell_map`
- canonical `palette`
- `config/production-constants.json`

Stored production data can be useful for review, but generator-computed production data should be authoritative.

## 15. Output Files Status

Current output includes:

- `output_files_expected`

Canonical schema does not treat output files as design truth. Output file lists should remain in proof/export metadata or a wrapper manifest, not in the canonical design JSON required by the generator.

## 16. Migration Plan

1. Keep current Buildable Proof Output v1 unchanged for operator QA.
2. Add a JS export adapter that creates canonical design schema v1.1 JSON from current `getBuildableProofState()`.
3. Add concrete SKU selection or operator override for `grid`, `size_in`, `palette_id`, `sheet_profile`, and `black_base`.
4. Convert 2D string-ID `cell_map` into flat integer index `cell_map`.
5. Generate or preserve `proof_ref`.
6. Move crop, suitability, Mosaic Clean, and export metadata under `source` or a wrapper manifest.
7. Validate against `config/design-schema.v1.json`.
8. Only then port `generate_kit_pack.py` as a local/operator renderer.

## Conclusion

Current Buildable Proof Output `production.json` could not feed the generator without an adapter because it used 2D `Cxx` cell IDs and proof-export fields.

Canonical Design Export Adapter v1 now emits schema-aligned design JSON from the browser/operator export path.

## Adapter Update

Implemented:

- `generateCanonicalDesignJson()`
- `validateCanonicalDesignJson()`
- flat row-major integer `cell_map`
- `grid` and `size_in`
- `palette_id`
- `black_base`
- `proof_ref`
- derived/cache `production`
- flexible `source`

Current production JSON also includes:

```text
canonical_design
canonical_design_validation
```

Remaining mismatch:

- Current proof-output JSON remains an operator export wrapper.
- `mosapack-design-v1.json` is the generator candidate, not the legacy proof-output JSON wrapper.
- Runtime palette IDs are normalized from current proof colors; production palette calibration remains future work.
- Generator port remains deferred.
