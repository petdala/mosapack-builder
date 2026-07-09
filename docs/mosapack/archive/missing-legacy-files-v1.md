# Missing Legacy Files v1

Date: 2026-07-09
Status: missing-local-source note.

## Purpose

Three requested archive filenames were not available locally during the supplier/fulfillment archival pass. Do not fabricate them. Do not block the current execution kit on them.

## Missing Files

### `BUILDER-POD-UPDATES.md`

- Expected reason it matters: may contain old POD/builder update notes.
- Why it was not archived: exact filename was not found locally or in the exact Drive searches performed.
- Similar content elsewhere: current source-of-truth, RFQ docs, and archived supplier dashboards cover supplier research without using this as implementation truth.
- Status: missing locally.
- Action: locate only if needed; do not block current execution.

### `BUILDER-PRINTFUL-INTEGRATION-CODE.html`

- Expected reason it matters: may contain old Printful integration or supplier API code.
- Why it was not archived: exact filename was not found locally or in the exact Drive searches performed.
- Similar content elsewhere: `PRINTFUL-PRODUCT-TEMPLATE-SPECS.md` was recovered to archive, but it is do-not-implement unless revalidated.
- Status: missing locally.
- Action: locate only if needed; do not implement supplier APIs from legacy material.

### `CUSTOMER-ASSEMBLY-INSTRUCTIONS.md`

- Expected reason it matters: may contain old physical kit/customer instruction drafts.
- Why it was not archived: exact filename was not found locally or in the exact Drive searches performed.
- Similar content elsewhere: `FOAM-BOARD-CORK-ASSEMBLY-GUIDE.md` was recovered to archive, but it is future research only.
- Status: missing locally.
- Action: locate only if needed; customer instructions should wait for physical sample validation.

## Future Rule

If these files are later found, archive them under:

```text
docs/mosapack/archive/legacy-supplier-research/
```

Default classification is `do-not-implement` unless manually reclassified.
