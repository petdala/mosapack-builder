# POD Supplier Validation Packet v1

Date: 2026-07-07
Status: supplier validation packet; production deploy not approved.

## Purpose

Create a supplier-facing packet for POD and short-run sticker vendors to evaluate whether MosaPack's buildable proof output can become a real sticker/magnet production workflow.

Derek does not currently have local label stock, so local label-stock Gate A cannot be completed now. The next practical validation step is to ask suppliers whether they can produce and test the geometry, material, cut, and packaging requirements using the current synthetic First Hello packet.

## What Is Being Validated

- supplier file acceptance
- 0.5in rounded-square sticker geometry
- die/kiss-cut registration tolerance
- material options
- `0.03in` vs `0.05in` bleed behavior
- `printed_mixed_sheets` feasibility
- `stock_color_sheets` feasibility
- `hybrid_stock_plus_topoff` feasibility
- packaging and assembly support
- sample cost, MOQ, lead time, and RFQ process

## What Is Not Being Validated

- public checkout
- full production launch
- customer demand
- magnet fulfillment
- fine-cell profiles
- production readiness
- supplier API integration

## Current Production Facts

- Current physical cell target: `0.5in`
- Current cell shape: rounded square
- Current internal sheet profile: OL2050-class, pending measurement record
- Commercial MVP target: `24x24` / `12in`
- Premium proof option: `32x32` / `16in`
- Made-to-order beta: `48x48` / `24in`
- Sample vehicle: First Hello black-base validation packet
- Default fulfillment mode: `printed_mixed_sheets`
- Stock and hybrid modes: manifest math / supplier questions only

## Local Packet

Folder:

```text
/tmp/mosapack-pod-supplier-validation-packet-v1/
```

ZIP:

```text
/tmp/mosapack-pod-supplier-validation-packet-v1.zip
```

The packet is synthetic/sample-only. It is not a customer order and does not include private customer images.

## Included Sample Files

- Gate A PDF if available
- Gate A sidecar manifest if available
- production constants JSON
- design schema JSON
- First Hello sample design JSON
- supplier-facing technical spec
- RFQ email template
- supplier questionnaire
- comparison tracker
- fulfillment mode documentation

## Generated Local Sample Files

Generated files are local QA artifacts and are not committed.

```text
/tmp/mosapack-pod-supplier-validation-packet-v1/manifests/first-hello-mixed.pdf
/tmp/mosapack-pod-supplier-validation-packet-v1/manifests/first-hello-mixed.manifest.json
/tmp/mosapack-pod-supplier-validation-packet-v1/manifests/first-hello-stock.pdf
/tmp/mosapack-pod-supplier-validation-packet-v1/manifests/first-hello-stock.manifest.json
/tmp/mosapack-pod-supplier-validation-packet-v1/manifests/first-hello-hybrid.pdf
/tmp/mosapack-pod-supplier-validation-packet-v1/manifests/first-hello-hybrid.manifest.json
```

First Hello manifest summary:

| Mode | Sheets | Included stickers | Extras | Notes |
| --- | ---: | ---: | ---: | --- |
| `printed_mixed_sheets` | 2 | current mixed output | 0 stock extras | current/default |
| `stock_color_sheets` | 6 | 1326 | 919 | inefficient for this 6-color sparse design |
| `hybrid_stock_plus_topoff` | 2 | top-off math only | n/a | all colors fell below stock threshold |

The stock and hybrid warnings are expected and useful for supplier conversations:

- active design uses 6 colors while launch stock hint is 4
- average placed per color is below the stock efficiency threshold

## Supplier Review Questions

Suppliers should answer whether they can support:

- custom mixed sheets per order
- full solid-color sheets per approved color
- hybrid stock plus mixed top-off sheets
- numbered board/map inserts
- packaging by color or section
- 0.03in and 0.05in bleed tests
- 24x24 starter kits first
- 32x32 and 48x48 later
- smaller 0.375in or 0.25in cells as future vendor-only profiles

## Production Recommendation

No production deploy. Supplier validation must happen before label-stock production, paid fulfillment, or any public customer promise.
