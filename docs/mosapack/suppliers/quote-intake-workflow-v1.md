# Quote Intake Workflow v1

Date: 2026-07-09
Status: operating workflow for supplier replies.

## Purpose

Convert supplier replies into structured quote records without turning assumptions into production costs.

## Workflow

1. Save the supplier reply in the tracker.
2. Add one row to `docs/mosapack/suppliers/quote-intake-template-v1.csv`.
3. Mark incomplete values as blank or pending.
4. Update `docs/mosapack/suppliers/supplier-claim-validation-ledger-v1.md` only for claims actually supported by the reply.
5. Request clarification if registration, sample terms, or material data are missing.
6. Do not update production cost config from estimates.

## Unit-Cost Rules

- Do not update `config/unit-costs.json` from guesses.
- Only update unit costs from dated supplier quotes, receipts, or invoices.
- Every cost must include `source`, `as_of`, `confidence`, and `notes`.
- If a quote is incomplete, keep the decision status `pending`.
- Keep `config/unit-costs.example.json` as the null/example template.

## Decision Values

Use:

- `pending`
- `needs_clarification`
- `sample_quote_requested`
- `sample_order_candidate`
- `backup_candidate`
- `rejected`
- `viable_after_sample`

## What Counts As Evidence

Stronger:

- physical sample measured by MosaPack
- dated supplier quote
- current vendor email response
- current vendor page with tolerances and materials

Weaker:

- archived research
- old price tables
- unofficial forum posts
- assumptions from adjacent products
