# Supplier Fulfillment Source of Truth v1

Date: 2026-07-09
Status: canonical planning source for supplier and fulfillment research.

## Purpose

This file is the canonical supplier and fulfillment planning reference for MosaPack. It consolidates the current proof-first doctrine, supplier RFQ direction, fulfillment mode decisions, validation gates, and cost-data rules.

Older supplier experiments, dropship ideas, print-on-demand integration drafts, affiliate-style paths, brick sourcing research, and pre-validation physical-product assumptions are not current product direction. Those materials are archival reference only if present in the repo.

## Public Product Doctrine

MosaPack is a sticker-ready custom mosaic proof system.

The public customer journey remains:

```text
Upload photo -> crop -> preview buildable mosaic -> request proof -> proof saved
```

The public builder must not become:

- checkout
- pricing
- shipping or production promise
- supplier-integrated production platform
- material configurator
- public pro/operator dashboard
- LEGO/brick product
- peel-to-reveal product
- Amazon affiliate flow

Normal public UI may express:

- free preview
- custom mosaic proof
- sticker-ready proof
- magnet interest as metadata only
- premium display review as metadata only
- no payment today
- follow-up after proof review

## Current Fulfillment Decision

Current/default fulfillment mode:

```text
printed_mixed_sheets
```

Printed mixed sheets remain default because they preserve per-design sticker efficiency and build sequence. They are the only current visual print-layout artifact in supplier packets.

Internal math / research modes:

- `stock_color_sheets`: math and supplier question only
- `hybrid_stock_plus_topoff`: future math and supplier question only

Do not expose stock/hybrid as public fulfillment choices. Do not generate public stock/hybrid print pages until separately approved.

## Physical Validation Status

Plain-paper Gate A alignment was visually approved by Derek, but exact measurement values were not recorded.

Current status:

```text
OL2050 = pending_measurement_record
label_stock = not_available_locally
```

The next physical validation path is supplier/POD sample validation, not local label-stock production.

## Current Sample Vehicles

Synthetic validation samples:

- First Hello black-base sample for geometry and Gate A packet review
- Pixel Portrait 12 sample for commercial-MVP quoting

These samples must not include private customer images.

## Current Supplier Questions

Suppliers should be asked to validate:

- `0.5in` rounded-square sticker cells
- custom mixed sticker sheets per order
- `0.03in` and `0.05in` bleed handling
- registration target near `<= 0.5mm`
- skew target near `<= 0.7mm`
- material options
- kiss-cut/die-cut tolerance
- full solid-color sheet feasibility
- whether solid-color sheets are true POD or inventory/pick-pack
- hybrid stock plus mixed top-off support
- packaging by color or section
- optional placement board / printed grid board support
- optional full-kit assembly support

## Current RFQ Targets

The current RFQ file set is:

- `docs/mosapack/suppliers/onlinelabels-rfq-v1.md`
- `docs/mosapack/suppliers/local-print-shop-rfq-v1.md`
- `docs/mosapack/suppliers/stickeryou-magnet-sticker-rfq-v1.md`

RFQs are feasibility requests only. They must not imply active production launch or order fulfillment.

## Stock / Hybrid Decision

Pure stock sheets are only likely economic for very low-color designs. For 12 inch MVP work, pure stock is only likely viable around four colors or fewer. High-color Pixel Portrait stock mode is shown for completeness and is already disfavored because extras/waste are too high.

Hybrid stock plus top-off remains the only stock-adjacent path worth exploring long term, subject to supplier support and real cost data.

## Cost Data Rule

Do not place guessed costs in production config.

Example cost placeholders belong in:

```text
config/unit-costs.example.json
```

Every cost entry must include:

- `source`
- `as_of`
- `confidence`
- `notes`

Unknown numeric costs must be `null`, not invented.

## Validation Gates Before Physical Product Promise

Before any public physical-product promise:

1. Supplier confirms file acceptance and geometry requirements.
2. Supplier sample confirms cut, registration, peelability, material quality, and color separation.
3. Cost model is populated from dated supplier quotes, not estimates.
4. Packaging and placement-board requirements are validated.
5. Public copy remains proof-first until production, pricing, timing, and fulfillment are approved.

## Canonical Current References

Current repo references used for this consolidation:

- `docs/mosapack/FULFILLMENT_MODES_V1.md`
- `docs/mosapack/STOCK_COLOR_SHEET_MATH_MODEL.md`
- `docs/mosapack/POD_SUPPLIER_VALIDATION_PACKET_V1.md`
- `docs/mosapack/POD_SUPPLIER_TECHNICAL_SPEC.md`
- `docs/mosapack/SUPPLIER_SAMPLE_PACKET_CHECKLIST.md`
- `docs/mosapack/POD_BASE_BOARD_AND_KIT_ASSEMBLY_QUESTIONS.md`
- `docs/mosapack/CELL_SIZE_GRID_PROFILE_STANDARD.md`
- `docs/mosapack/BUILDABLE_STICKER_MAGNET_PROOF_OUTPUT_V1_SPEC.md`

Recovered legacy research copies are quarantined under:

- `docs/mosapack/archive/legacy-supplier-research/`

Those archive files are reference-only. They do not supersede this source of truth and must not be used to change public builder doctrine, public copy, checkout, pricing, shipping, supplier APIs, or physical-product promises.

Named source inputs not present in this checkout by exact filename:

- `MosaPack_Supplier_Fulfillment_Canonical_v1.md`
- `MosaPack_File_Audit_Matrix.csv`
- `mosapack-PRD-v2.md`
- `mosapack-fulfillment-bom-plan.md`
- `step3-compaction-spec.md`
