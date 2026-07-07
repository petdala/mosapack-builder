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

## Stock Color Sheet Supplier Questions

- Can you print-on-demand full solid-color `0.5in` sticker sheets per order?
- Or is full-color-sheet fulfillment inventory/pick-pack only?
- What is cost per solid-color sheet vs custom mixed sheet?
- Can you label sheets by color ID/name?
- Can you package full color sheets per order?
- Can you provide sample sheets for a fixed 4, 6, or 8 color palette?
- Can you store client-owned preprinted stock?
- Do you charge storage fees?
- Do you charge pick/pack fees?
- Can you create a numbered board/map?
- Do you support mixed top-off sheets for rare colors?
- Can stock sheets and top-off sheets be packed together?

## Fine Cell Supplier Questions

- Can you produce `0.375in` rounded-square stickers?
- Can you produce `0.25in` rounded-square stickers?
- What is your minimum kiss-cut size?
- What is your minimum safe gap?
- What registration tolerance can you hold?
- Are small cells peelable by hand?
- Can customers place these manually?
- What material options are available at 0.375in and 0.25in?
- Can small-cell sheets be packaged by color or section?
- What are MOQ and sample costs for small-cell sheets?
- Do you offer vendor assembly, transfer film, or pre-mounted panels?

## Warnings

- `OL2050` remains unverified until Gate A passes.
- Do not send private raw photos unless Derek approves.
- Do not claim production readiness from PDF generation alone.
- Do not start paid fulfillment before physical sample validation.

## POD Supplier Validation Packet v1

Plain-paper Gate A alignment was approved by Derek, but exact measurement values were not recorded and label stock is not available locally. `OL2050` remains `pending_measurement_record`.

Next packet path:

```text
/tmp/mosapack-pod-supplier-validation-packet-v1/
```

Supplier validation must distinguish:

- true print-on-demand custom mixed sheets
- solid-color sheet production
- inventory/pick-pack stock-color fulfillment
- hybrid stock plus mixed top-off support

Printed mixed sheets remain the current default. Stock and hybrid are supplier questions and manifest math, not customer-facing commitments.

Fine-cell profiles remain vendor-only future questions. Do not promise 0.375in or 0.25in customer-buildable kits until suppliers and physical tests prove peel/place feasibility.
