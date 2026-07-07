# Buildable Sticker/Magnet Proof Output v1 Spec

Date: 2026-07-05
Status: v1 browser/operator export implemented; local/operator kit-pack renderer implemented.

## Inputs

- B2 saved project
- cropped approved source
- mosaic preview
- selected category
- photo suitability metadata
- Mosaic Clean metadata if available
- grid size
- palette/cell map
- material/product intent: sticker or magnet

## Outputs

- `proof-preview.png`
- `optimized-source.png`
- `numbered-grid.svg`
- `color-legend.html`
- `sticker-magnet-layout.svg`
- `proof-email-image.png`
- `production.json`

PDF placement grid, PDF legend, and assembly-guide PDF are deferred until the SVG/HTML/JSON output format is supplier-reviewed.

Local/operator kit-pack PDF generation is now available for QA and Gate A sample preparation:

```text
tools/kitpack/generate_kit_pack.py
```

This renderer consumes canonical design JSON and production constants. It is not exposed to customers and is not part of Netlify runtime.

## Grid Defaults

- starter: 24x24
- premium proof: 32x32
- defer 48x48 until production process is validated

## Shape Defaults

- preview: rounded square or circle allowed
- production: rounded square
- no circle production until cut/waste/alignment is tested

## Color Limits

- 24x24: target 8-12 colors
- 32x32: target 10-16 colors
- corporate/logo: preserve brand colors and edges
- memorial/family/baby: preserve likeness over color count
- pets: allow more simplification

These are production-output targets, not public quality scores.

## SVG Requirements

- fixed artboard
- cell grid
- unique color IDs
- optional labels/numbers
- cut-safe spacing
- margin/bleed
- rounded-square production cells
- export-compatible with Cricut/local cutter/supplier RFQ
- deterministic output from saved project data

## PDF Requirements

- placement grid
- color legend
- simple instructions
- proof disclaimer
- project ID
- material intent
- no checkout/order/shipping promise

## Production JSON Requirements

`production.json` should include:

- `project_id`
- `proof_output_version`
- `grid_width`
- `grid_height`
- `cell_shape`
- `cell_size`
- `palette`
- `cell_map`
- `color_counts`
- `material_intent`
- `source_policy`
- `preprocess_metadata`
- `photo_suitability`
- `created_at`

It must not contain raw original photo data submitted through Netlify Forms.

## Acceptance Criteria

- Can generate package from a saved B2 project.
- Grid is buildable.
- Legend matches cells.
- SVG layout matches the rendered preview.
- SVG placement grid is readable and self-contained.
- Proof email image is customer-friendly and not a fake overlay.
- Netlify Forms remain metadata-only.
- No supplier API required.
- No checkout.
- No production deploy.

## v1 Implementation Notes

- Proof export is browser/operator-only inside collapsed Advanced tools.
- Export buttons are disabled until a mosaic preview exists.
- Current grid is exported as-is.
- Fixed 24x24 and 32x32 output resampling is deferred to v1.1.
- Export files are local downloads and are not submitted through Netlify Forms.

## Canonical Schema And Constants

Draft runtime specs now exist:

- constants: `config/production-constants.json`
- design schema: `config/design-schema.v1.json`

Production doctrine:

- saved production JSON is design truth
- shared production constants are production physics truth
- generator output is downstream rendering only

Current Buildable Proof Output v1 `production.json` is an operator proof-export format. Canonical Design Export Adapter v1 now emits schema-aligned design JSON for future generator input. See:

- `docs/mosapack/PRODUCTION_JSON_SCHEMA_DIFF_REPORT.md`
- `docs/mosapack/PRODUCTION_JSON_ADAPTER_PLAN.md`
- `docs/mosapack/PRODUCTION_CONSTANTS_LOADER_PLAN.md`

## Physical Validation Gates

- OL2050 is a sheet profile, not universal truth.
- OL2050 remains unverified until alignment testing passes.
- Material and printer combinations must be validated together.
- Gate A: 100-150 sticker instrumented build and alignment test.
- Gate B: full First Hello sample.
- 12-inch Pixel Portrait is the commercial MVP.
- 32x32 / 16-inch is a premium proof option.
- 48x48 / 24-inch is made-to-order beta.
- Magnets remain waitlist until material and supplier validation.

Do not port the kit-pack generator into customer runtime. The local/operator generator consumes `mosapack-design-v1.json` and `config/production-constants.json`; next gate is Gate A evidence.

## Canonical Design Export Adapter v1

Implemented operator-only export:

```text
Download Canonical Design JSON
```

Output filename:

```text
mosapack-design-v1.json
```

The adapter converts current proof state into:

- schema version 1.1
- internal `project_id`
- customer-facing `proof_ref`
- supported `grid`
- `size_in`
- `sheet_profile`
- `palette_id`
- stable palette objects
- flat row-major integer `cell_map`
- `black_base`
- flexible `source`
- derived/cache `production`

Generated canonical JSON is local/operator download only and is not submitted through Netlify Forms.

## Local Kit-Pack Renderer

Implemented CLI:

```bash
python3 tools/kitpack/generate_kit_pack.py \
  fixtures/designs/sample-design-first-hello.v1_1.json \
  /tmp/mosapack-generate-kit-pack-qa/first-hello-kit.pdf \
  --constants config/production-constants.json
```

The generated PDF includes:

- cover / overview
- alignment / registration page
- sticker sheet pages
- build guide / section map

The PDF is an operator QA artifact. It is not a customer order document and does not imply production approval.
