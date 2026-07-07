# Stock Color Sheet Math Model

Date: 2026-07-07
Status: internal math model; no stock-sheet print pages implemented.

## Purpose

Define the stock-color-sheet and hybrid-stock math used for manifest-only evaluation.

This is not a printing mode. It is a supplier and fulfillment planning model.

## Per-Color Stock Formula

For each non-base color:

```text
placed = non-base cell count for color
spares = ceil(placed * spare_rate)
needed = placed + spares
sheets = ceil(needed / stickers_per_sheet)
included = sheets * stickers_per_sheet
extras = included - needed
```

## Totals

```text
total_stock_sheets = sum sheets across colors
total_included_stickers = total_stock_sheets * stickers_per_sheet
total_extras = total_included_stickers - total_needed
```

## Hybrid Rule Proposal

```text
if placed + spares >= stock_min_per_color:
  allocate full stock sheets
else:
  allocate to mixed top-off sheet
```

Defaults:

```text
stock_min_per_color = 150
```

The threshold is configurable in `config/production-constants.json` under:

```text
fulfillment_modes.hybrid_stock_plus_topoff.stock_min_per_color_default
```

## Black-Base Exclusion

Black-base cells remain in `cell_map`, but are excluded from the sticker sequence and fulfillment counts when:

```text
design.black_base == true
palette entry id == constants.black_base.excluded_color_id
```

Base cells do not need stock sheets. The manifest still records base/on-base count so downstream QA can reconcile the design truth.

## When Stock Works

Stock works better for:

- dense low-color designs
- designs with common colors above the stock threshold
- designs where extras are acceptable as spares
- supplier workflows that can pick/pack by color

Stock works poorly for:

- sparse many-color portraits
- high-color emotional likeness designs
- cases where peel-in-order sequencing matters
- designs with many rare colors

## Inventory vs POD

Stock color sheets may not be true print-on-demand. A supplier may treat them as:

- preprinted inventory
- client-owned stock
- batched solid-color production
- pick/pack fulfillment

MosaPack must ask suppliers how each model affects cost, storage, MOQ, and lead time.
