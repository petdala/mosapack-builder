# Supplier Outreach Master v1

Date: 2026-07-09
Status: execution plan; not a production commitment.

## Source-of-Truth Summary

MosaPack is proof-first. The public builder collects a photo, creates an honest buildable mosaic preview, and saves a proof request. No checkout, pricing, payment, shipping, production promise, supplier API, material configurator, or physical-product guarantee belongs in the public builder.

Current fulfillment research is governed by:

- `docs/mosapack/supplier-fulfillment-source-of-truth-v1.md`
- `docs/mosapack/suppliers/onlinelabels-rfq-v1.md`
- `docs/mosapack/suppliers/local-print-shop-rfq-v1.md`
- `docs/mosapack/suppliers/stickeryou-magnet-sticker-rfq-v1.md`
- `docs/mosapack/validation/cricut-first-hello-mini-validation-v1.md`
- `config/unit-costs.example.json`

Archived supplier research is reference-only and must not be used as implementation truth.

## Current Product Scope

Current launch path:

- Sticker-ready proof is the default public format.
- Magnets are interest metadata only until supplier validation proves materials and fulfillment.
- Premium display is quote-only.
- Payment happens only after proof approval.
- First Hello is the controlled physical sample vehicle.
- Pixel Portrait 12 inch is the commercial-MVP quoting sample.

## What Suppliers Are Being Asked To Validate

Suppliers are being asked to validate:

- full-color mixed sticker sheets from supplied artwork
- 0.5 inch rounded-square kiss-cut cells
- dense grids with many unique cell colors per sheet
- press-ready PDF acceptance
- matte or low-glare material options
- print-to-cut registration, with <=0.5mm preferred
- peelability for customer craft placement
- 0.03 inch and 0.05 inch bleed handling where applicable
- optional placement board or black-base board support
- optional kitting, labeling, and packaging support
- future magnet feasibility as an interest path only

## What Is Intentionally Not Being Asked Yet

Do not ask suppliers to support or assume:

- live customer checkout
- production scale commitments
- public pricing
- shipping promises
- supplier API integration
- material configurators
- stock/hybrid fulfillment launch
- brick or LEGO positioning
- fine-cell output
- public DIY template products

## Outreach Order

1. OnlineLabels / custom label-sheet vendor
   - Primary launch candidate if registration and sample quality pass.
2. Local print/die-cut shop
   - Rush backup and physical validation partner.
3. StickerYou
   - Sticker and magnet feasibility inquiry; magnets remain interest-only.
4. Sticker Mule or Sticker Ninja
   - Backup quote and quality comparison.
5. Magnet supplier only for interest-path validation
   - Do not create a public magnet promise.

## Status Categories

Use these exact tracker statuses:

- `not_contacted`
- `contacted`
- `replied`
- `sample_quote_requested`
- `sample_ordered`
- `sample_received`
- `failed`
- `viable`
- `backup`
- `rejected`
- `reference_only`

## Decision Gate After Supplier Replies

After the first supplier replies, update:

- `docs/mosapack/suppliers/supplier-outreach-tracker-v1.csv`
- `docs/mosapack/suppliers/supplier-claim-validation-ledger-v1.md`
- `docs/mosapack/suppliers/quote-intake-template-v1.csv`
- `config/unit-costs.example.json` only if copied into a real config later with dated quotes or receipts

Decision gate:

1. Can at least one supplier produce a physical sample?
2. Can the supplier accept press-ready PDF artwork?
3. Can the supplier confirm or test 0.5 inch rounded-square cells?
4. Can the supplier give registration tolerance or sample evidence?
5. Is material peelability suitable for customer placement?
6. Are sample cost, MOQ, and lead time acceptable for validation?
7. Does the reply support sticker-ready proof first without public production promises?

## Current Direction

OnlineLabels/custom print is the primary launch candidate if registration and samples pass. Cricut Maker 3 is validation/beta only. Magnets are interest-only until supplier proof exists. No public product promises are changed by this outreach.
