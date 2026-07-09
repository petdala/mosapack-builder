# Production Constants Loader Plan

Date: 2026-07-07
Status: plan plus no-dependency validation script.

## Why Constants Live In `config/production-constants.json`

MosaPack needs one production-physics source of truth shared by:

- web builder sheet math
- future local/operator generator
- future Netlify Function export
- QA scripts
- supplier/sample documentation

The constants file is not customer copy. It records physical assumptions that must be validated with real material, printer, and cutting workflow evidence.

## What The Web Builder Imports

Future builder/runtime imports should use constants for:

- supported grids and SKU targets
- sheet profile selection
- sticker capacity
- bleed and margin constraints
- palette IDs
- black-base exclusion rules
- board tokens

The current builder does not import this file yet.

## What The Future Python Generator Imports

The generator should import constants for:

- OL2050/OL5425 sheet geometry
- page size
- rows and columns
- die size, pitch, gap, margins
- bleed rules
- spares rule
- section rules
- palette data
- black-base exclusion
- board tokens
- launch SKU metadata
- fulfillment mode metadata
- future cell-size profile metadata

It must not hard-code OL2050 values.

## Validation Rules

The loader/verifier should enforce:

- every sheet profile has `profile_id`
- every sheet profile has `verified`
- sheet capacity equals `rows * cols`
- OL2050 bleed is less than or equal to `gap / 2`
- section rules divide supported grids
- palette IDs are unique
- palette IDs are stable snake_case
- palette hex values are valid sRGB hex strings
- `black_base.excluded_color_id` exists in `heirloom_v1`
- launch SKU grid/size pairs match schema
- unverified profiles cannot be presented as production-ready

## Current Validation Script

Added:

```text
scripts/verify-production-constants-schema.sh
```

It checks:

- valid JSON for constants, schema, and synthetic fixture
- expected sheet profiles
- sheet profile IDs and `verified` booleans
- sheet profile capacity math
- OL2050 bleed constraint
- section divisibility for 24, 32, and 48 grids
- unique palette IDs
- black-base excluded color in heirloom palette
- schema grid/size oneOf pairs
- fixture `cell_map` length and palette indexes

## OL2050 Status

OL2050 is a sheet profile, not universal truth.

It is currently marked:

```text
verified: false
verification_status: pending_measurement_record
```

Gate A must validate OL2050 alignment before it becomes production-ready.

## OL5425 Status

OL5425 remains a future unverified profile.

It must not be used for production until geometry, material, printer, and cut behavior are validated.

## Loader Recommendation

Use the validation script for now. Add a shared JS loader only when the builder or adapter begins importing constants at runtime. Add a Python loader when the generator is ported.

## Fulfillment Mode Constants

`config/production-constants.json` now documents:

- `printed_mixed_sheets`
- `stock_color_sheets`
- `hybrid_stock_plus_topoff`

These constants are used for manifest math only. They do not imply a production-ready stock-sheet workflow and do not alter Gate A output.

Loader v1.2 should validate:

- exactly one default fulfillment mode
- stock mode launch color cap
- hybrid stock threshold
- customer extra note text

## Future Cell-Size Constants

Cell-size profiles are documented, not implemented in runtime constants yet.

Schema v1.2 should later add:

- `cell_size_in`
- `finished_size_in`
- `vendor_only`
- `customer_buildable`
