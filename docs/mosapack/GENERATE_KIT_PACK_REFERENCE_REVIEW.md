# Generate Kit Pack Reference Review

Date: 2026-07-07
Branch: `feature/production-schema-constants-v1`
Status: reference reviewed; ported as local/operator tooling only.

## Source

Claude provided `generate_kit_pack.py` in:

```text
/Users/dereksolas/Downloads/claude_mosapack_files-2.zip
```

The file was inspected from:

```text
/tmp/mosapack-claude-schema-source/generate_kit_pack.py
```

The original source was not committed directly. A repo-adapted local/operator port now lives at:

```text
tools/kitpack/generate_kit_pack.py
```

## Runtime Dependencies

- Python 3
- `reportlab`

Dependencies are documented in:

```text
tools/kitpack/requirements.txt
```

## Current Role

`generate_kit_pack.py` should be treated as a downstream renderer.

The doctrine remains:

- saved production JSON = design truth
- shared production constants = production physics truth
- generator = downstream renderer

The generator must not become the design source of truth and must not be wired into public customer runtime without a separate approval gate.

## Expected CLI

Current local/operator usage:

```text
python3 tools/kitpack/generate_kit_pack.py design.json output.pdf --constants config/production-constants.json
```

Input is canonical MosaPack design JSON. Output is a printable operator PDF kit pack.

## What It Currently Does

- Loads design JSON.
- Normalizes some legacy camelCase fields to snake_case.
- Accepts palette objects and older `[name, hex]` pairs.
- Uses hard-coded OL2050-class sheet constants.
- Builds a section-major sticker placement sequence.
- Adds 5 percent color spares.
- Skips `ink_black` cells when `black_base` is true.
- Emits an alignment-test page.
- Emits sticker sheets.
- Emits overview, color manifest, and section/runs build guide pages.
- Recomputes a small production block and warns if stored values disagree.

## Port Changes Completed

- Loads `config/production-constants.json`.
- Validates against critical invariants from `config/design-schema.v1.json`.
- Avoids hard-coded OL2050 constants.
- Treats OL2050 as unverified until Gate A alignment tests pass.
- Preserves `proof_ref` headers and footers.
- Preserves UUID-compatible `project_id`.
- Supports palette objects as canonical input, with legacy palette normalization only as a loader compatibility path.
- Supports grid sizes 24, 32, and 48.
- Supports `size_in` pairings 24->12, 32->16, and 48->24.
- Supports derived production mismatch warnings against the constants-driven production plan.
- Checks black-base exclusion keyed only by `ink_black`.
- Remains local/operator-only until physical samples are validated.

## License/Risk Note

This generator is Claude-provided reference material for this repo task. It is not copied from a GPL project. Do not copy GPL code from open-source mosaic builders into MosaPack.

## Port Recommendation

The generator has been ported as local/operator tooling only.

Next step is not production deployment. Run Gate A alignment testing and a 100-150 sticker physical sample before trusting generator output for paid fulfillment.
