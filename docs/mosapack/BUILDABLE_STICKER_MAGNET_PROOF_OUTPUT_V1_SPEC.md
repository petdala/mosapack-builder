# Buildable Sticker/Magnet Proof Output v1 Spec

Date: 2026-07-05
Status: draft spec for next build milestone.

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
- `numbered-grid.pdf`
- `color-legend.pdf`
- `sticker-magnet-layout.svg`
- `assembly-guide.pdf`
- `proof-email-image.png`
- `production.json`

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
- PDF placement grid is readable at 24x24 and 32x32.
- Proof email image is customer-friendly and not a fake overlay.
- Netlify Forms remain metadata-only.
- No supplier API required.
- No checkout.
- No production deploy.
