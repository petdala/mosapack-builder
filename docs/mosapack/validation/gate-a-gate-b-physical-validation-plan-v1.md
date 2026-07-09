# Gate A / Gate B Physical Validation Plan v1

Date: 2026-07-09
Status: physical validation plan; not production launch approval.

## Purpose

Define what MosaPack can learn from near-term physical samples without over-claiming production readiness.

## Gate A: Controlled First Hello Fixture

Scope:

- First Hello controlled fixture
- 0.5 inch OL2050-class geometry
- `printed_mixed_sheets` only
- no stock/hybrid mode
- black-base board test where applicable

Validate:

- print-to-cut registration
- peelability
- gray separation
- seconds per sticker
- board readability
- label/sticker material handling
- bleed behavior

Do not validate:

- stock color sheets
- hybrid top-off fulfillment
- full production readiness
- public pricing
- shipping or packaging promises
- 24 inch Signature viability as a whole

## Gate B: Expanded Physical Sample

Gate B starts only if Gate A passes or produces a clear fix path.

Scope:

- full First Hello build if Gate A passes
- Pixel Portrait 12 inch synthetic sample after First Hello
- supplier sample comparison once available
- optional board and kitting test

Validate:

- full build fatigue
- section sequencing
- complete placement accuracy
- customer-readable guide/board
- supplier-to-supplier sample comparison
- packaging fit for sample materials

## Measurement Tools Needed

- ruler with millimeter marks
- calipers if available
- flatbed scan or straight-on phone camera
- good lighting
- timer
- printed placement guide
- test log CSV

## Photos To Capture

- full sheet before peeling
- close-up of cut edges
- ruler/caliper against registration marks
- peeled sample cells
- black-base board before placement
- partial build
- completed sample
- side-angle image showing curl/lift
- packaging test if performed

## Pass / Fail Criteria

Gate A pass candidate:

- registration target near <=0.5mm or supplier provides an acceptable fix path
- cells peel without tearing
- rounded-square cuts are clean
- gray separation is usable
- board/grid is readable
- time per sticker is measured and acceptable for next test

Gate A fail:

- cells cannot be peeled reliably
- registration drift breaks placement
- material curls/lifts
- gray separation fails on First Hello
- supplier cannot accept required file format

Gate B pass candidate:

- full First Hello is buildable without excessive frustration
- Pixel Portrait 12 sample is quote/sample-ready
- sample comparison identifies a viable supplier path or backup path

## Decision Limits

Gate A can decide:

- whether to continue with a material/supplier
- whether to downgrade a SKU/material/process
- whether to order a larger sample

Gate A cannot decide:

- public production launch
- 24 inch Signature cancellation
- public pricing
- shipping promises

Rule: a single physical sample may downgrade or flag a SKU, but it cannot kill 24 inch Signature by itself.
