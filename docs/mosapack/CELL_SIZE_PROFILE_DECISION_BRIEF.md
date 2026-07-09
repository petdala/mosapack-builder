# Cell Size Profile Decision Brief

Date: 2026-07-07
Status: decision brief; no runtime fine-cell implementation.

## Recommendation

Document cell-size profiles now. Do not implement runtime fine-cell output yet.

## Current Decision

- Keep Gate A at `OL2050 / 0.5in`.
- Treat `0.375in` cells as vendor-first and physically unproven.
- Treat `0.25in` cells as vendor-only and deferred.
- Do not expose smaller cells publicly until peel/place is proven.

## Why

Smaller cells can improve image fidelity, but they introduce production and customer-build risk:

- harder peeling
- slower placement
- higher error rate
- tighter registration tolerance
- more supplier constraints
- likely need for vendor assembly or pre-mounted transfer workflows

## Schema Implication

Current schema v1.1 uses:

```text
size_in == grid / 2
```

Future schema v1.2 should add:

- `cell_size_in`
- `finished_size_in`
- `vendor_only`
- `customer_buildable`

## Production Gate

Fine-cell profiles should wait until after:

1. Gate A plain-paper alignment passes.
2. Gate A label-stock sheet 1 passes.
3. 100-150 sticker instrumented build produces sec/sticker and error-rate evidence.
4. Supplier answers confirm kiss-cut limits, gap, registration tolerance, and peelability.
