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

The PDF is an operator proof pack, not a customer order, checkout artifact, or production approval.

## Gate

Gate A remains required:

- OL2050 alignment test
- 100-150 sticker instrumented physical sample
- material/printer path validation

No production deploy is implied by this tool.
