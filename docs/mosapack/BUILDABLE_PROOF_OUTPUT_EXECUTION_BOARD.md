# Buildable Proof Output Execution Board

Date: 2026-07-05
Status: new execution board after Mosaic Clean tuning rejection.

## A. Proof Package Export

| Task | Owner | Status | Stop Rule | Definition Of Done |
| --- | --- | --- | --- | --- |
| Proof-preview PNG | Codex/Derek | Pending | Output does not match cell map | PNG generated from saved project data |
| Optimized-source PNG | Codex/Derek | Pending | Source policy unclear | Cropped/optimized source preview exported without raw form submission |
| Numbered grid PDF | Codex/Derek | Pending | Grid unreadable at 24x24 | PDF shows every cell position clearly |
| Color legend PDF | Codex/Derek | Pending | Legend does not match cell IDs | Every used color appears with count and ID |
| Sticker/magnet SVG layout | Codex/Derek | Pending | Supplier/local cutter cannot parse SVG | SVG has fixed artboard, cell grid, margin/bleed, rounded-square cells |
| Production JSON | Codex/Derek | Pending | Cannot regenerate layout | JSON includes project ID, cell map, palette, counts, output version |

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
| Export proof package | Codex/Derek | Pending | Missing SVG/PDF/JSON | Operator creates complete proof package |
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
