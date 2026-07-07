# Gate A PDF Mode Implementation Report

Date: 2026-07-07
Branch: `feature/production-schema-constants-v1`
Status: implemented for local/operator QA; production deploy not approved.

## Claude Red-Team Summary

The local kit-pack generator was structurally sound for a plain-paper dry-run, but three geometry/QA gaps blocked trustworthy label-stock testing:

1. Crosshairs were page-corner marks, not die-grid registration references.
2. No 1.000 inch calibration bar existed to catch printer auto-scaling.
3. No Gate A mode compared sheet 1 at both `0.03in` and `0.05in` bleed.

Additional Gate A-adjacent gaps:

4. No production manifest JSON was emitted beside the PDF.
5. Embedded design palettes were not checked against `constants.palettes[palette_id]`.

## Fixes Implemented

- Corrected alignment crosshairs to use the die-grid bounding-box corners from the selected sheet profile.
- Added a black 1.000 inch / 25.4 mm calibration bar.
- Added top-edge feed/skew fiducial ticks.
- Added `--bleed` CLI override for normal output.
- Added `--gate-a` mode.
- Added sidecar manifest JSON generation.
- Added palette drift warnings against `config/production-constants.json`.

## Crosshair Geometry

For `OL2050`, the die-grid bounding box is calculated from:

- `margin_left_in`
- `margin_top_in`
- `page_w_in`
- `page_h_in`
- `cols`
- `rows`
- `pitch_in`
- `die_in`

Expected nominal crosshair centers:

| Corner | Coordinate |
| --- | --- |
| bottom left | `0.25, 0.25 in` |
| bottom right | `8.25, 0.25 in` |
| top left | `0.25, 10.75 in` |
| top right | `8.25, 10.75 in` |

Crosshairs are black-only, open-center marks with `0.15in` arms, a `0.04in` center gap, and `0.5pt` stroke.

## Calibration Bar

The alignment page and sticker sheet pages include:

```text
Measure me: 1.000 in / 25.4 mm
```

Print instruction:

```text
Print at 100% / Actual Size. Do not use Fit to Page.
```

## Bleed Comparison

Gate A mode emits:

1. Cover / overview page
2. Alignment page
3. Sheet 1 at `0.03in` bleed
4. Sheet 1 at `0.05in` bleed
5. Build guide / section map

It does not print all sheets. Gate A exists to validate scale, registration, bleed, and partial build feasibility.

## Manifest JSON

Every PDF now emits a sibling manifest unless `--no-manifest` is passed.

Manifest includes:

- manifest version
- generated timestamp
- `proof_ref`
- `project_id`
- source design path
- output PDF path
- constants path
- sheet profile
- page size
- grid and finished size
- `palette_id`
- black-base status
- base index and total base cells
- per-color placed counts
- spares per color
- total placed stickers
- total spares
- total stickers
- sheet count
- Gate A mode flag
- bleed values used
- sections
- warnings
- palette drift warnings
- stored production mismatch warnings

For black-base designs, `ink_black` remains in the `cell_map` and manifest, while the sticker sequence omits only excluded base cells.

## Palette Validation

If `palette_id` exists in production constants, the generator compares:

- design palette IDs
- hex values for matching IDs
- generated IDs such as `color_01`

Warnings are emitted for drift or missing IDs. Black-base designs fail validation unless the design palette contains the configured excluded color ID, currently `ink_black`.

## QA Output Paths

QA folder:

```text
/tmp/mosapack-gate-a-pdf-qa/
```

Gate A PDF:

```text
/tmp/mosapack-gate-a-pdf-qa/first-hello-gate-a.pdf
```

Gate A manifest:

```text
/tmp/mosapack-gate-a-pdf-qa/first-hello-gate-a.manifest.json
```

Rendered page previews:

```text
/tmp/mosapack-gate-a-pdf-qa/page-02-alignment.png
/tmp/mosapack-gate-a-pdf-qa/page-03-sheet1-bleed-003.png
/tmp/mosapack-gate-a-pdf-qa/page-04-sheet1-bleed-005.png
```

The PNGs were created with macOS Quick Look after splitting the relevant pages into single-page PDFs. `pdftoppm` is not installed in this environment.

## QA Result

`scripts/verify-generate-kit-pack.sh` passed.

Verified:

- normal PDF generation
- Gate A PDF generation
- normal manifest generation
- Gate A manifest generation
- Gate A manifest includes `0.03` and `0.05` bleed values
- PDF text includes proof reference
- PDF text includes `MosaPack`
- PDF text includes `Actual Size`
- PDF text includes `Measure me: 1.000 in`
- manifest includes counts, spares, sheet profile, and proof reference

## Physical Print Recommendation

No label stock yet.

First print order:

1. Print alignment page on plain paper at `100% / Actual Size`.
2. Measure the `1.000in` calibration bar.
3. Overlay plain paper onto a blank OL2050 label sheet.
4. If geometry aligns, print sheet 1 at `0.03in` bleed on actual label stock.
5. Print sheet 1 at `0.05in` bleed.
6. Place 100-150 stickers from section 1.

## Pass/Fail Table

| Check | Pass rule | Fail / stop rule |
| --- | --- | --- |
| scale | 1.000in bar measures 1.000in | printer scaling or Fit to Page detected |
| x/y drift | crosshairs align to die-grid corners | repeated offset exceeds tolerance |
| skew | top feed ticks stay parallel to sheet | corner differential suggests feed skew |
| white slivers | no visible liner slivers at chosen bleed | visible slivers after 0.05in bleed |
| peelability | stickers peel cleanly | tearing, curling, or adhesive failure |
| sec/sticker | instrumented placement rate recorded | placement rate not measured |
| placement errors | errors are counted and recoverable | repeated misplacement or unreadable guide |
| sheet feed | sheet feeds consistently | jams, skew, or repeatable registration drift |
| color separation | key grays/tones remain distinguishable | colors collapse into ambiguous groups |

## Production Recommendation

No production deploy.

Plain-paper Gate A alignment dry-run only after Derek reviews the Gate A PDF page 2 and page 3/4 rendered outputs. Label-stock testing only after scale and overlay checks pass.
