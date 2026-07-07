# Production JSON Adapter Plan

Date: 2026-07-07
Status: JS adapter implemented; generator port still deferred.

## Purpose

Current Buildable Proof Output v1 exports useful operator proof files, but its `production.json` is not the canonical design JSON expected by the future kit-pack generator.

This plan defines the adapter path from current builder output to schema v1.1.

## Current Builder Output

The browser currently exports proof-output JSON from `generateProductionJson()` in `public/builder/index.html`.

That JSON is optimized for operator review:

- proof output version
- preview/export file expectations
- 2D cell map with color IDs
- color legend
- crop/render metadata
- source policy

## Canonical Design JSON v1.1

`config/design-schema.v1.json` defines design truth for downstream rendering:

- `schema_version`
- `project_id`
- optional `proof_ref`
- `grid`
- `size_in`
- `sheet_profile`
- `palette_id`
- embedded palette objects
- flat row-major integer `cell_map`
- `black_base`
- flexible `source`
- derived/cache `production`

## JS Adapter Responsibilities

Canonical Design Export Adapter v1 is now implemented in the browser/operator export path.

The adapter should:

1. Read from `getBuildableProofState()`.
2. Require a saved `project_id` for generator-ready output, or clearly mark unsaved preview output as non-generator-ready.
3. Resolve `grid` from the square rendered grid.
4. Resolve `size_in` from the launch mapping:
   - 24 -> 12
   - 32 -> 16
   - 48 -> 24
5. Resolve `palette_id`.
6. Normalize palette objects to stable snake_case IDs.
7. Flatten 2D `cell_map` into a row-major array.
8. Convert color IDs to integer palette indexes.
9. Add `black_base`.
10. Add or preserve `proof_ref`.
11. Move crop, suitability, Mosaic Clean, and export metadata into `source`.
12. Leave `production` as derived/cache only.
13. Validate against the critical invariants from `config/design-schema.v1.json`.

Implemented output path:

```text
Download Canonical Design JSON -> mosapack-design-v1.json
```

The current proof-output `production.json` also embeds `canonical_design` and `canonical_design_validation` for review continuity.

## Future Python Adapter Responsibilities

The generator-side loader should:

- load `config/production-constants.json`
- validate design JSON against schema v1.1
- recompute production facts from constants and cell map
- warn on stored derived/cache mismatches
- preserve `project_id`
- use `proof_ref` for customer-facing headers/footers
- support grid sizes 24, 32, and 48
- support palette objects only as canonical input
- support black-base exclusion keyed by `ink_black`

## Validation Order

1. Parse JSON.
2. Validate schema-required fields.
3. Enforce grid/size pairing.
4. Check palette IDs are unique.
5. Check cell map length is `grid * grid`.
6. Check every cell map value is a valid palette index.
7. Check sheet profile exists in constants.
8. Check selected SKU rules are compatible.
9. Recompute production block.
10. Emit warnings for derived/cache mismatches.

## What Blocks Generator Port

- Current `cell_map` shape and type mismatch.
- Missing `schema_version`.
- Missing concrete `grid` and `size_in` fields.
- Missing `palette_id`.
- Missing `black_base`.
- Missing `sheet_profile`.
- Missing `proof_ref`.
- OL2050 is not yet alignment verified.
- No Gate A physical sticker build evidence.

## Safe To Implement Now

- Commit schema and constants as draft runtime specs.
- Commit synthetic fixture.
- Add no-dependency validation script.
- Add adapter spec and diff docs.
- Keep generator reference outside runtime.

## Recommendation

The JS canonical-design export adapter has been implemented.

Port the Python generator only after:

- the adapter emits schema-valid JSON,
- OL2050 passes alignment validation,
- the First Hello or Pixel Portrait sample packet is physically tested.

Current recommendation:

Port the generator next as a local/operator renderer only, using `mosapack-design-v1.json` and `config/production-constants.json`.
