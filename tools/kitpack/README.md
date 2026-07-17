# MosaPack Kit Pack Generator

Local/operator-only PDF renderer for canonical MosaPack design JSON.

This tool is not part of the public builder runtime and is not deployed to Netlify Functions.

## Input Contract

The generator consumes:

- canonical design JSON shaped by `config/design-schema.v1.json`
- production constants from `config/production-constants.json`

The canonical design JSON is the design truth. Production constants are the production-physics truth. The generator is only a downstream renderer.

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

The PDF includes:

- cover / overview page
- alignment / registration page
- sticker sheet pages
- build guide / section map pages
- sidecar `.manifest.json` unless `--no-manifest` is passed

The PDF is an operator proof pack, not a customer order, checkout artifact, or production approval.

Gate A mode emits only sheet 1 at `0.03in` and `0.05in` bleed so Derek can validate scale, registration, bleed, color, and partial build feasibility before committing label stock. `--color-target-strip` combines registration, fixed-palette, and adaptive gamut measurements on the alignment page.

## Gate

Gate A remains required:

- SL680 alignment and full-gamut target test
- re-derived registration budget for the 0.375in die
- 100-150 sticker instrumented physical sample
- material/printer path validation

No production deploy is implied by this tool.
