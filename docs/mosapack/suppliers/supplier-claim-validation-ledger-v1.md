# Supplier Claim Validation Ledger v1

Date: 2026-07-09
Status: active claim-control ledger.

## Purpose

This ledger prevents archived research, assumptions, and untested vendor claims from being treated as production facts. A claim becomes operational only after current quote, current vendor page evidence, or physical sample validation is recorded.

Allowed statuses:

- `verified_by_current_quote`
- `verified_by_current_vendor_page`
- `verified_by_physical_sample`
- `repo_assumption`
- `archived_research_only`
- `contradicted`
- `needs_rfq`
- `needs_physical_test`

| Claim | Current status | Evidence source | Evidence date | Confidence | Risk if wrong | How to validate | Owner | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OnlineLabels can print full-color custom labels | needs_rfq | Existing RFQ intent only | 2026-07-09 | low | Primary supplier path may be invalid | Ask OnlineLabels/custom print contact for file acceptance and sample terms | Derek | Send OnlineLabels email |
| OnlineLabels can produce 0.5 inch rounded-square kiss-cut dense mosaic sheets | needs_rfq | No current quote/sample | 2026-07-09 | low | Geometry may require another vendor | Ask exact 0.5 inch rounded-square dense-grid question; request physical sample | Derek | Request sample quote |
| OnlineLabels can hold <=0.5mm registration | needs_physical_test | MosaPack target standard, not vendor proof | 2026-07-09 | low | Misregistration could fail customer placement | Require tolerance claim and measure sample | Derek | Ask tolerance question |
| Printful supports required 8.5x11 dense sticker sheet format | needs_rfq | Archived specs are not current truth | 2026-07-09 | low | Wrong supplier assumption could waste integration work | Ask only if needed; require dense 0.5 inch grid confirmation | Derek | Keep reference-only |
| StickerYou can produce/dropship exact mosaic sticker sheets | needs_rfq | Current RFQ only | 2026-07-09 | low | Dropship assumption could create false public promise | Ask for exact sheet format, sample, and fulfillment model | Derek | Send StickerYou email |
| StickerYou can provide magnet sheets suitable for MosaPack | needs_rfq | Current RFQ only | 2026-07-09 | low | Magnet path could be infeasible or unsafe | Ask material, minimum piece size, peel/place handling, packaging | Derek | Ask as separate magnet section |
| Sticker Mule can produce dense 0.5 inch rounded-square grid sheets | needs_rfq | No current quote/sample | 2026-07-09 | low | Backup vendor may not support dense sheets | Send backup supplier questions | Derek | Contact if primary replies weak |
| Sticker Ninja can hold claimed high color accuracy / kiss-cut precision | needs_rfq | Archived research only | 2026-07-09 | low | Quality assumptions may be wrong | Ask for tolerance specs and sample; measure sample | Derek | Contact as backup |
| Cricut Maker 3 can cut 0.5 inch rounded-square stock stickers reliably | needs_physical_test | Local validation plan only | 2026-07-09 | low | In-house beta path may be too slow or low yield | Run First Hello Mini material and timed cut test | Derek | Buy/test materials |
| Cricut Maker 3 can support First Hello Mini first batch | needs_physical_test | Local validation plan only | 2026-07-09 | low | Beta batch could be too labor intensive | Run 100-150 sticker timed build and score peel/weed/place | Derek | Run test log |
| Black board can replace black stickers for First Hello | needs_physical_test | Production planning assumption | 2026-07-09 | medium | Board color/readability may fail | Build sample on black 12x12 board and photograph/readability test | Derek | Include in Gate A |
| Sono-4 Essential is enough for first Cricut batch | needs_physical_test | Current validation hypothesis | 2026-07-09 | low | Gray separation may be insufficient | Cut/place First Hello Mini and score gray separation | Derek | Test Sono-4 first |
| preferred_size_in should drive later production planning, not public builder promises | repo_assumption | Live builder doctrine and source-of-truth | 2026-07-09 | high | Public could overpromise physical output | Keep as metadata; no pricing/production copy | Derek | Preserve doctrine |
| OnlineLabels is primary launch candidate | repo_assumption | Source-of-truth decision pending sample | 2026-07-09 | medium | Primary path may fail sample | Run RFQ and sample validation | Derek | Send first |
| Local shop is rush backup | repo_assumption | Source-of-truth decision pending quote | 2026-07-09 | medium | Backup may be too expensive or unavailable | Contact two shops and compare sample terms | Derek | Identify contacts |
| Magnets are interest-only | repo_assumption | Public builder doctrine | 2026-07-09 | high | Magnet public promise could be premature | Keep as metadata until material/sample validation | Derek | Ask RFQ only as validation |
