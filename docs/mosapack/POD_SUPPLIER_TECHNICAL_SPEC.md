# POD Supplier Technical Spec

Date: 2026-07-07
Status: supplier RFQ spec; not production-approved.

## Requested Product

MosaPack is evaluating a buildable sticker mosaic kit made from `0.5in` rounded-square sticker cells.

Starter target:

```text
24x24 cells / 12in finished kit
```

Sample vehicles:

```text
First Hello black-base validation PDF
Pixel Portrait 12 commercial-MVP sample
```

## Product Format

- Individual cell size: `0.5in`
- Cell shape: rounded square
- Starter grid: `24x24`
- Premium grid: `32x32`
- Made-to-order beta grid: `48x48`
- Current fulfillment default: custom printed mixed sheets
- Alternative fulfillment questions: stock solid-color sheets and hybrid top-off sheets, manifest math only

## Current OL2050-Class Die Geometry

Current internal validation profile:

- 13 columns x 17 rows
- 221-up sheet
- `0.5in` die
- `0.625in` pitch
- `0.125in` gap
- `0.25in` left/top margins
- US Letter page
- `0.03in` and `0.05in` bleed comparison

Status:

```text
pending_measurement_record
```

Plain-paper alignment was visually approved, but exact scale/crosshair/drift/skew values were not recorded and local label stock is not available.

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

Current outbound packet sends mixed-layout PDFs only. Stock and hybrid are provided as manifest math summaries, not print-layout pages.

Future supplier formats may include:

- SVG
- color legend
- numbered grid
- production metadata

## Optional Full-Kit Components

Sticker-sheet feasibility is the primary request. For suppliers that can support full kits, MosaPack also needs:

- `12in` placement board / printed grid board
- numbered or color-coded build map
- instruction card
- sticker sheets
- spare sticker policy
- packaging for board, sheets, and instructions

This section is optional for sticker-only suppliers. It is required for full-kit suppliers.

Additional questions are in:

```text
docs/POD_BASE_BOARD_AND_KIT_ASSEMBLY_QUESTIONS.md
```

## Privacy

The validation packet uses synthetic/demo design data only. No customer private images should be required for initial feasibility review.

## Non-Goals

- no public checkout
- no production launch commitment
- no supplier API integration
- no customer order fulfillment
- no magnet commitment in this packet
