# Buildable Proof Output Execution Board

Date: 2026-07-05
Status: v1 browser/operator export implemented; supplier validation pending.

## A. Proof Package Export

| Task | Owner | Status | Stop Rule | Definition Of Done |
| --- | --- | --- | --- | --- |
| Proof-preview PNG | Codex/Derek | Implemented | Output does not match cell map | PNG generated from current mosaic preview |
| Optimized-source PNG | Codex/Derek | Implemented | Source policy unclear | Cropped source preview exported without raw form submission |
| Numbered grid SVG | Codex/Derek | Implemented | Grid unreadable at current size | SVG shows rounded-square cell positions and color IDs |
| Color legend HTML | Codex/Derek | Implemented | Legend does not match cell IDs | Every used color appears with count and ID |
| Sticker/magnet SVG layout | Codex/Derek | Implemented v1 | Supplier/local cutter cannot parse SVG | SVG has fixed artboard, cell grid, margin/bleed, rounded-square cells |
| Production JSON | Codex/Derek | Implemented | Cannot regenerate layout | JSON includes project ID when saved, cell map, palette, counts, output version |

## B. Sticker/Magnet Constraints

| Task | Owner | Status | Stop Rule | Definition Of Done |
| --- | --- | --- | --- | --- |
| 24x24 fixed starter size | Derek | Pending | Preview unreadable | Starter proof uses 576 cells with readable legend |
| Rounded-square production cell | Derek | Pending | Supplier rejects cut shape | Rounded-square cell spec documented and tested |
| Color count cap | Derek | Pending | Too many SKUs/colors for kit | 24x24 target 8-12 colors; 32x32 target 10-16 colors |
| Bleed/margin | Derek | Pending | Cutter/supplier flags unsafe margins | SVG/PDF includes cut-safe margin and spacing |
| Cut spacing | Derek | Pending | Alignment or weeding fails | Sample output validates spacing |

## C. Proof Ops

| Task | Owner | Status | Stop Rule | Definition Of Done |
| --- | --- | --- | --- | --- |
| Retrieve `project_id` | Derek | Pending | Project cannot be retrieved | Operator can locate saved proof project |
| Export proof package | Codex/Derek | Implemented v1 | Missing SVG/HTML/JSON/PNG | Operator creates complete local proof package |
| Send proof email | Derek | Pending | Email implies checkout/order | Email includes proof image and review language only |
| Track user response | Derek | Pending | No response record | Response status is recorded outside public UI |

## D. Supplier Validation

| Task | Owner | Status | Stop Rule | Definition Of Done |
| --- | --- | --- | --- | --- |
| Send SVG/PDF sample to StickerYou/local shop/magnet suppliers | Derek | Pending | Supplier cannot read files | Supplier confirms file requirements |
| Record quotes | Derek | Pending | Quote lacks material/cut assumptions | Quote saved with constraints |
| Order 2 sticker samples | Derek | Pending | Files rejected | Physical samples received |
| Order 2 magnet samples | Derek | Pending | Files rejected | Physical samples received |

## E. QA

| Task | Owner | Status | Stop Rule | Definition Of Done |
| --- | --- | --- | --- | --- |
| Visual proof review | Derek | Pending | Likeness unacceptable | Proof is recognizable and emotionally acceptable |
| Print/cut test | Derek | Pending | Cells misalign or tear | Sample can be cut/printed cleanly |
| Assembly time | Derek | Pending | Assembly is impractical | Starter kit has realistic assembly path |
| Readability | Derek | Pending | Grid/legend confusing | Non-engineer can follow guide |
| Shipping durability | Derek | Pending | Product bends/fails | Sample survives basic handling/shipping review |

## Current Stop Rule

No production deploy, no paid fulfillment, and no checkout until Buildable Sticker/Magnet Proof Output v1 has supplier/local sample evidence.

## v1 Remaining Gate

Run hosted proof-save/export QA, then send SVG/legend/production JSON samples to sticker/magnet suppliers or a local shop.

## F. Schema And Constants

| Task | Owner | Status | Stop Rule | Definition Of Done |
| --- | --- | --- | --- | --- |
| Land draft constants | Codex/Derek | Implemented draft | Constants imply unverified production readiness | `config/production-constants.json` contains sheet profiles, palettes, spares, sections, board tokens, launch SKUs |
| Land canonical design schema | Codex/Derek | Implemented draft | Schema replaces project UUID with customer code | `config/design-schema.v1.json` preserves `project_id` and supports optional `proof_ref` |
| Diff current export JSON | Codex/Derek | Implemented draft | Current output is assumed generator-ready | Diff report identifies missing fields, naming/type mismatches, and adapter plan |
| JS schema adapter | Codex/Derek | Pending | Adapter changes public wizard UX | Adapter emits schema-valid design JSON from current proof state |
| Python generator port | Codex/Derek | Deferred | Generator hard-codes OL2050 or consumes noncanonical JSON | Generator consumes schema v1.1 + production constants only |

## Updated Gate Order

1. Resolve production JSON adapter.
2. Generate canonical design JSON from current proof state.
3. Validate constants/schema.
4. Run Gate A 100-150 sticker instrumented build and alignment test.
5. Run Gate B full First Hello sample.
6. Only then consider generator-backed supplier/sample packets.
