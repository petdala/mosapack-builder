# Generate Kit Pack Reference Review

Date: 2026-07-07
Branch: `feature/production-schema-constants-v1`
Status: reference only; not ported into runtime.

## Source

Claude provided `generate_kit_pack.py` in:

```text
/Users/dereksolas/Downloads/claude_mosapack_files-2.zip
```

The file was inspected from:

```text
/tmp/mosapack-claude-schema-source/generate_kit_pack.py
```

It was not committed as runtime code.

## Runtime Dependencies

- Python 3
- `reportlab`

No dependency was added to the repo in this task.

## Current Role

`generate_kit_pack.py` should be treated as a downstream renderer reference.

The doctrine remains:

- saved production JSON = design truth
- shared production constants = production physics truth
- generator = downstream renderer

The generator must not become the design source of truth.

## Expected CLI

Current reference usage:

```text
python3 generate_kit_pack.py design.json output.pdf
```

Input is a design JSON. Output is a printable PDF kit pack.

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

## What Must Change Before Port

- Load `config/production-constants.json`.
- Validate or normalize against `config/design-schema.v1.json`.
- Avoid hard-coded OL2050 constants.
- Treat OL2050 as an unverified sheet profile until Gate A alignment tests pass.
- Preserve `proof_ref` headers and footers.
- Preserve UUID-compatible `project_id`.
- Support palette objects as the canonical input.
- Support grid sizes 24, 32, and 48.
- Support `size_in` pairings 24->12, 32->16, and 48->24.
- Support derived production mismatch warnings against the full constants-driven production plan.
- Confirm Python version compatibility.
- Add tests for black-base exclusion keyed only by `ink_black`.
- Keep generator local/operator-only until physical samples are validated.

## License/Risk Note

This generator is Claude-provided reference material for this repo task. It is not copied from a GPL project. Do not copy GPL code from open-source mosaic builders into MosaPack.

## Port Recommendation

Do not port the generator yet.

First resolve the schema diff between current Buildable Proof Output `production.json` and `config/design-schema.v1.json`. Then implement a JS export adapter that can emit canonical schema v1.1 design JSON. After that, port the Python generator as an operator/local renderer that consumes only canonical design JSON plus `config/production-constants.json`.
