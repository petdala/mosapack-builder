# MosaPack Kit Pack Generator

Local/operator-only PDF renderer for canonical MosaPack design JSON.

This tool is not part of the public builder runtime and is not deployed to Netlify Functions.

## Input Contract

The generator consumes:

- canonical design JSON shaped by `config/design-schema.v1.json` (v1.1) or
  `config/design-schema.v1_2.json` (v1.2)
- production constants from `config/production-constants.json`

The canonical design JSON is the design truth. Production constants are the production-physics truth. The generator is only a downstream renderer.

Schema v1.2 separates the physical sticker size (`cell_size_in`) from the finished board size
(`finished_size_in`). For the SL680 profile, a 24x24 board uses 0.375in stickers on a 0.40in board
pitch and finishes at approximately 9.6in. Legacy v1.1 inputs remain supported unchanged.

Convert a saved builder proof/project into canonical design v1.2 before generating fulfillment files:

```bash
python3 tools/kitpack/proof_to_design.py \
  path/to/saved-project.json \
  /tmp/order.design.v1_2.json \
  --dedication "Made for Grandma - December 2026"
```

The converter validates the grid, tile map, palette indices, profile geometry, and fixed-palette
mapping before it writes anything. It prints the exact customer/board and vendor-pack commands to run
next. It performs no network access and does not modify the saved proof.

## Usage

```bash
python3 tools/kitpack/generate_kit_pack.py \
  fixtures/designs/sample-design-first-hello.v1_1.json \
  /tmp/mosapack-generate-kit-pack-qa/first-hello-kit.pdf \
  --constants config/production-constants.json
```

If `--constants` is omitted, the generator defaults to `config/production-constants.json` relative to the repo root.

The default sheet profile is `sl680_0375` (SheetLabels SL680, 0.375in rounded square). Designs may still select `OL2050` explicitly for historical process tests.

Gate A validation mode:

```bash
python3 tools/kitpack/generate_kit_pack.py \
  fixtures/designs/sample-design-first-hello.v1_1.json \
  /tmp/mosapack-gate-a-pdf-qa/first-hello-gate-a.pdf \
  --constants config/production-constants.json \
  --gate-a
```

Generate the three-page vendor-facing qualification pack and its measurement-log CSV:

```bash
python3 tools/kitpack/generate_kit_pack.py \
  path/to/adaptive-design.json \
  /tmp/mosapack-vendor-qualification-pack.pdf \
  --constants config/production-constants.json \
  --vendor-pack \
  --ship-to "{ship_to}" \
  --contact "{contact}"
```

Generate the internal operator pack. With `--gate-a`, every planned sticker sheet is emitted in both
the `0.03in` and `0.05in` bleed variants:

```bash
python3 tools/kitpack/generate_kit_pack.py \
  path/to/adaptive-design.json \
  /tmp/mosapack-operator-pack.pdf \
  --constants config/production-constants.json \
  --operator-pack \
  --gate-a
```

Add the 25 Master colors and the 40-patch full-gamut target to the alignment page:

```bash
python3 tools/kitpack/generate_kit_pack.py \
  path/to/adaptive-design.json \
  /tmp/mosapack-gate-a-sl680.pdf \
  --gate-a \
  --color-target-strip
```

Adaptive designs declare `palette_id: "adaptive"` or `palette_mode: "adaptive"`. Their colors are validated against the configured gamut profile and minimum Delta E 00 separation. Adaptive designs require `printed_mixed_sheets`; `stock_color_sheets` is rejected.

Bleed override for normal full-sheet output:

```bash
python3 tools/kitpack/generate_kit_pack.py \
  fixtures/designs/sample-design-first-hello.v1_1.json \
  /tmp/mosapack-gate-a-pdf-qa/first-hello-bleed-005.pdf \
  --constants config/production-constants.json \
  --bleed 0.05
```

## Dependency

```bash
python3 -m pip install -r tools/kitpack/requirements.txt
```

Use a temporary virtual environment under `/tmp` for QA if needed. Do not commit virtual environments or generated PDFs.

## Output

The legacy/default PDF includes:

- cover / overview page
- alignment / registration page
- sticker sheet pages
- build guide / section map pages
- sidecar `.manifest.json` unless `--no-manifest` is passed

The PDF is an operator proof pack, not a customer order, checkout artifact, or production approval.

`--vendor-pack` emits exactly three vendor-facing pages: print instructions, registration reference,
and a solid-ink color/gradient target. It also writes a `.measurement-log.csv` beside the PDF with 65
numbered target colors and blank measured Lab / Delta E 00 columns.

`--operator-pack` emits the internal cover, every planned sticker sheet, and the build guide. It does
not include the vendor instructions or measurement target.

`--customer-pack` emits the customer Start Here guide, numbered board pages, and color-grouped
sticker pages. Internal profile IDs, palette IDs, and bleed values remain in the sidecar manifest and
are not printed in customer copy. Use `--board-art` with this mode to write the standalone true-size
board artwork PDF. Customer mode also emits a separate `.qc-checklist.pdf` for packing verification;
that internal checklist is not part of the customer PDF.

In the legacy/default output, Gate A mode emits only sheet 1 at `0.03in` and `0.05in` bleed. The new
`--operator-pack --gate-a` path emits every planned sheet in both variants. `--color-target-strip`
remains available for legacy combined packs; vendor measurement work should use `--vendor-pack`.

## Gate

Gate A remains required:

- SL680 alignment and full-gamut target test
- re-derived registration budget for the 0.375in die
- 100-150 sticker instrumented physical sample
- material/printer path validation

No production deploy is implied by this tool.
