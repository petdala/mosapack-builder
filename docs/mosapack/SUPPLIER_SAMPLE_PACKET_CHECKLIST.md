# Supplier Sample Packet Checklist

Date: 2026-07-07
Status: Gate A local/operator checklist; production deploy not approved.

## Purpose

Prepare the minimum trustworthy packet for sticker/magnet sample validation after Gate A geometry checks.

Generated PDFs, PNGs, manifests, and private QA files are local artifacts only and must not be committed unless explicitly approved.

## Gate A First Print Order

1. Print Gate A page 2 on plain paper at `100% / Actual Size`.
2. Measure the horizontal `1.000in` calibration bar.
3. Measure the vertical `1.000in` calibration bar.
4. Measure crosshair span: left to right should be `8.000in`; top to bottom should be `10.500in`.
5. Overlay plain paper onto blank OL2050 label stock and hold to light.
6. Continue only if scale and overlay pass.
7. If scale and die-grid corner crosshairs align, print sheet 1 at `0.03in` bleed.
8. Print sheet 1 at `0.05in` bleed.
9. Place 100-150 stickers from section 1.
10. Record build time, placement errors, peelability, and color separation.

## Local QA Packet Paths

```text
/tmp/mosapack-gate-a-pdf-qa-v2/first-hello-gate-a.pdf
/tmp/mosapack-gate-a-pdf-qa-v2/first-hello-gate-a.manifest.json
/tmp/mosapack-gate-a-pdf-qa-v2/page-02-alignment.png
/tmp/mosapack-gate-a-pdf-qa-v2/page-03-sheet1-bleed-003.png
/tmp/mosapack-gate-a-pdf-qa-v2/page-04-sheet1-bleed-005.png
```

## Pass / Fail Table

| Check | Pass | Fail / stop |
| --- | --- | --- |
| scale | horizontal and vertical calibration bars each measure 1.000in | printer scaling detected |
| x/y drift | crosshairs align with die-grid corners | repeated drift exceeds tolerance |
| skew | feed ticks remain parallel | feed skew or corner differential |
| white slivers | no slivers at selected bleed | slivers remain at 0.05in |
| peelability | stickers peel cleanly | tearing, curl, adhesive issues |
| sec/sticker | measured and recorded | unmeasured build rate |
| placement errors | low, recoverable error count | repeated placement errors |
| sheet feed | stable feed path | jams or drift |
| color separation | key tones distinguishable | ambiguous color groups |

## Supplier Packet After Gate A Passes

Only after plain-paper and label-stock Gate A checks pass, prepare:

- canonical design JSON
- production manifest JSON
- proof preview PNG
- optimized source PNG when appropriate
- Gate A PDF or supplier-specific PDF
- color legend
- numbered grid / build guide
- notes on selected bleed and sheet profile

## Warnings

- `OL2050` remains unverified until Gate A passes.
- Do not send private raw photos unless Derek approves.
- Do not claim production readiness from PDF generation alone.
- Do not start paid fulfillment before physical sample validation.
