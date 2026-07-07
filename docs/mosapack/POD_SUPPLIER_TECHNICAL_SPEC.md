# POD Supplier Technical Spec

Date: 2026-07-07
Status: supplier RFQ spec; not production-approved.

## Requested Product

MosaPack is evaluating a buildable sticker mosaic kit made from `0.5in` rounded-square sticker cells.

Starter target:

```text
24x24 cells / 12in finished kit
```

Sample vehicle:

```text
First Hello black-base validation PDF
```

## Product Format

- Individual cell size: `0.5in`
- Cell shape: rounded square
- Starter grid: `24x24`
- Premium grid: `32x32`
- Made-to-order beta grid: `48x48`
- Current fulfillment default: custom printed mixed sheets
- Alternative fulfillment questions: stock solid-color sheets and hybrid top-off sheets

## Material Questions

Please identify options for:

- matte label stock
- weatherproof polyester
- removable adhesive
- permanent adhesive
- laser compatibility
- inkjet compatibility
- sheet rigidity and curl risk
- color durability

## Geometry Requirements

- `0.5in` rounded-square stickers
- `0.03in` and `0.05in` bleed comparison
- registration target: `<= 0.5mm`
- skew target: `<= 0.7mm`
- clean kiss-cut or die-cut edge
- hand-peelable cells
- low risk of tearing or adhesive lift

## File Types

Current packet can include:

- PDF
- manifest JSON
- production constants JSON
- design schema JSON
- sample design JSON

Future supplier formats may include:

- SVG
- color legend
- numbered grid
- production metadata

## Privacy

The validation packet uses synthetic/demo design data only. No customer private images should be required for initial feasibility review.

## Non-Goals

- no public checkout
- no production launch commitment
- no supplier API integration
- no customer order fulfillment
- no magnet commitment in this packet
