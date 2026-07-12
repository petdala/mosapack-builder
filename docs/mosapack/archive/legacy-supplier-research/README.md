# Legacy Supplier Research Archive

Date: 2026-07-09
Status: reference archive.

## Purpose

This folder contains recovered supplier, fulfillment, physical-product, dashboard, and legacy product research. These files are retained for context only. They are not canonical product requirements and must not be used to change the public builder or launch surface without a new approved spec.

The current source of truth is:

```text
docs/mosapack/supplier-fulfillment-source-of-truth-v1.md
```

## Archive Rule

Files in this archive are reference-only. They must not be used to justify public builder changes, checkout, pricing, shipping promises, supplier APIs, material configurators, Amazon affiliate flows, LEGO/brick positioning, or production claims.

Old Shopify/cart, brick, dashboard, Printful, storefront, and configurator concepts in archived or missing files are not current implementation truth. Do not reintroduce them into the public builder without a new approved spec.

## Public Builder Doctrine

The public builder remains proof-first:

```text
Upload photo -> crop -> preview buildable mosaic -> request proof -> proof saved
```

Normal public UI must not expose supplier research, fulfillment internals, price totals, production promises, or operator/export tools.

## Archived Files

| File | Status | Classification |
| --- | --- | --- |
| `BOM-DISPLAY-HYBRID-UI.html` | archived copy recovered from Drive | do-not-implement |
| `supplier-dashboard-v1.html` | archived copy recovered from Drive | do-not-implement |
| `sticker-supplier-intelligence.html` | archived copy recovered from Drive | future research |
| `PRINTFUL-PRODUCT-TEMPLATE-SPECS.md` | archived copy recovered from Drive | do-not-implement unless supplier-validated later |
| `MAGNET-DROPSHIP-STRATEGY.md` | archived copy recovered from Drive | future research |
| `COLOR-BY-NUMBER-EXPANSION-ANALYSIS.md` | archived copy recovered from Drive | future research |
| `WOBRICK-JIT-ORDERING-WORKFLOW.md` | archived copy recovered from Drive | do-not-implement |
| `US-MEXICO-BRICK-SUPPLIER-RESEARCH.md` | archived copy recovered from Drive | do-not-implement |
| `DOMESTIC-SOURCING-STRATEGY.md` | archived copy recovered from Drive | future research |
| `TARIFF-IMPACT-ANALYSIS-2025.md` | archived copy recovered from Drive | future research |
| `TRANSPARENT-BRICK-SUPPLIER-STRATEGY.md` | archived copy recovered from Drive | do-not-implement |
| `PALETTE-SPEC-FOR-CODEX.md` | archived copy recovered from Drive | future research; use production constants first |
| `FOAM-BOARD-CORK-ASSEMBLY-GUIDE.md` | archived copy recovered from Drive | future research |

## Requested Files Not Recovered

The following requested filenames were not present in this checkout and were not recovered by the exact Drive searches performed for this archive pass:

| File | Status | Classification |
| --- | --- | --- |
| `BUILDER-POD-UPDATES.md` | not found | do-not-implement |
| `BUILDER-PRINTFUL-INTEGRATION-CODE.html` | not found | do-not-implement |
| `CUSTOMER-ASSEMBLY-INSTRUCTIONS.md` | not found | future research after validation |

If any missing file is recovered later, copy it into this folder first, then update:

```text
docs/mosapack/archive/file-audit-matrix-2026-07-09.csv
```
