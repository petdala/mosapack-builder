# Fulfillment Modes v1

Date: 2026-07-07
Status: strategy/spec plus internal manifest math; production deploy not approved.

## Purpose

Define sticker-kit fulfillment modes before supplier conversations and physical sample validation.

Current recommendation from Claude review:

- B now: add `stock_color_sheets` as internal test/math mode.
- D later: evaluate `hybrid_stock_plus_topoff` after Gate A and supplier validation.

Printed mixed sheets remain the current default.

## `printed_mixed_sheets`

Current default.

Definition:

- custom per-design mixed sheets
- ordered by build sequence
- efficient sticker count
- supports high-color and made-to-order designs
- more prepress complexity

Best for:

- premium designs
- high-color portraits
- fine control
- made-to-order proof output

## `stock_color_sheets`

Internal math candidate.

Definition:

- full pre-approved color sheets per palette color
- extras included
- simpler supplier and pick-pack conversation
- may be inventory/pick-pack rather than true print-on-demand

Best for:

- low-color starter kits
- grayscale/simple kits
- supplier quoting conversations
- testing whether extras can be positioned as useful spares

Customer-facing framing for extras:

```text
Includes spare stickers in every color for mistakes, repairs, and finishing touches.
```

## `hybrid_stock_plus_topoff`

Future target.

Definition:

- stock sheets for dense/common colors
- custom mixed top-off sheet for rare colors
- likely best long-term economics if suppliers support it

Default proposed threshold:

```text
stock_min_per_color = 150
```

## Why Pure Stock Is Not Automatically Cheaper

Pure stock shifts complexity away from custom sheet generation, but it creates extras. The economics are driven by:

- color count
- placed cells per color
- sheet capacity
- spares rate
- pick/pack fees
- whether supplier can print full-color sheets on demand

Grid size alone is not enough. A 12 inch design with 4 colors can be reasonable; the same size with 10-12 colors becomes inefficient.

## Waste Table

Assumptions:

- 12 inch kit
- 24x24 grid
- 576 cells
- about 605 stickers with spares
- mixed default = 3 sheets
- OL2050 sheet capacity = 221 stickers

| Colors | Approx placed / color | Stock sheets | Included stickers | Extras | Waste | Relative to mixed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 4 | 144 | 4 | 884 | 279 | about 46% | tolerable |
| 6 | 96 | 6 | 1326 | 721 | about 119% | about 2x mixed |
| 8 | 72 | 8 | 1768 | 1163 | about 192% | about 3x mixed |
| 10 | 58 | 10 | 2210 | 1605 | about 265% | about 3.3x mixed |
| 12 | 48 | 12 | 2652 | 2047 | about 338% | about 4x mixed |

## Product Conclusions

- Pure stock is only economic for 12 inch MVP around 4 colors.
- 12 inch Pixel Portrait pure stock is likely viable only at 4 colors or fewer.
- First Hello is economically poor for pure stock despite being UX-simple, because its active color distribution is sparse after black-base exclusion.
- Hybrid is likely the long-term target.
- Printed mixed remains default until supplier and physical evidence says otherwise.

## Operational Tradeoff

Stock color sheets destroy peel-in-order sequencing. A stock kit needs:

- numbered board/map
- color IDs on packaging
- stronger section guide
- operator QA to confirm all colors are included

Printed mixed sheets preserve sequence order and remain better for current Gate A.

## Supplier Packet Rule

Stock and hybrid PDFs are not print-layout artifacts. Current stock and hybrid modes affect manifest math only.

The supplier packet should receive:

- mixed visual PDF
- mixed manifest
- stock manifest/math summary
- hybrid manifest/math summary

The supplier packet should not include stock/hybrid PDFs unless a future print-layout mode is implemented or the files are explicitly stamped as mixed-layout/math-only.

## POD Supplier Validation Status

Plain-paper Gate A alignment was approved by Derek, but local label-stock testing is blocked because label stock is not available. `OL2050` remains `pending_measurement_record` until exact scale, crosshair, drift, and skew values are recorded.

Next validation packet:

```text
/tmp/mosapack-pod-supplier-validation-packet-v1/
```

Supplier conversations must explicitly separate:

- true POD custom mixed sheets
- solid-color sheets printed per order
- inventory/pick-pack stock-color sheets
- hybrid stock plus top-off support

No customer-facing fulfillment mode should be promised until supplier sample evidence exists.
