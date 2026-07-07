# Generate Kit Pack Port Implementation Report

Date: 2026-07-07
Branch: `feature/production-schema-constants-v1`
Status: implemented as a local/operator renderer; production deploy not approved.

## Purpose

`generate_kit_pack.py` has been ported as downstream tooling for Gate A sample validation.

The renderer consumes:

- canonical design JSON shaped by `config/design-schema.v1.json`
- production constants from `config/production-constants.json`

It does not define design truth or production physics truth.

## Generator Path

```text
tools/kitpack/generate_kit_pack.py
```

## CLI Usage

```bash
python3 tools/kitpack/generate_kit_pack.py \
  fixtures/designs/sample-design-first-hello.v1_1.json \
  /tmp/mosapack-generate-kit-pack-qa/first-hello-kit.pdf \
  --constants config/production-constants.json
```

If `--constants` is omitted, the generator defaults to:

```text
config/production-constants.json
```

## Dependencies

```text
tools/kitpack/requirements.txt
```

Current dependency:

- `reportlab`

`pypdf` is optional for verification text/page checks when available.

## Input Contract

The generator accepts canonical design JSON, not the legacy proof-output wrapper.

Required production-relevant fields:

- `project_id`
- `proof_ref` when available
- `grid`
- `size_in`
- `sheet_profile`
- `palette`
- flat row-major integer `cell_map`
- `black_base`

The generator preserves `project_id` as the internal storage ID and uses `proof_ref` for operator-facing headers and footers.

## Validation

The generator validates:

- grid is 24, 32, or 48
- `size_in` equals `grid / 2`
- `sheet_profile` exists in production constants
- palette IDs are unique
- optional palette `index` equals array position
- `cell_map` length equals `grid * grid`
- every cell map value is an integer in palette range
- `black_base` requires the configured excluded color ID to exist in the palette
- no data URLs
- no commerce/order/payment fields

The `production` block is treated as derived/cache only. The generator recomputes production facts from `cell_map`, palette, and constants, then emits non-fatal warnings if stored production facts disagree.

## PDF Output

Generated PDF includes:

1. Cover / overview page
2. Alignment / registration page
3. Sticker sheet pages using the selected sheet profile geometry
4. Build guide / section map

The output is intentionally operator-focused and not a customer order document.

## Gate A PDF Mode

Gate A mode was added after the initial port.

CLI:

```bash
python3 tools/kitpack/generate_kit_pack.py \
  fixtures/designs/sample-design-first-hello.v1_1.json \
  /tmp/mosapack-gate-a-pdf-qa/first-hello-gate-a.pdf \
  --constants config/production-constants.json \
  --gate-a
```

Gate A mode includes:

- die-grid bounding-box crosshairs
- 1.000 inch calibration bar
- feed/skew fiducials
- sheet 1 at `0.03in` bleed
- sheet 1 at `0.05in` bleed
- sidecar production manifest JSON
- palette drift warnings against `constants.palettes[palette_id]`

Normal output also supports:

```text
--bleed 0.03
--bleed 0.05
--no-manifest
```

## QA Outputs

Fixture PDF:

```text
/tmp/mosapack-generate-kit-pack-qa/first-hello-kit.pdf
```

Builder-export PDF, generated when the prior canonical export QA file is present:

```text
/tmp/mosapack-generate-kit-pack-qa/builder-export-kit.pdf
```

Generated PDFs are QA artifacts and were not committed.

Gate A QA outputs:

```text
/tmp/mosapack-gate-a-pdf-qa/first-hello-gate-a.pdf
/tmp/mosapack-gate-a-pdf-qa/first-hello-gate-a.manifest.json
/tmp/mosapack-gate-a-pdf-qa/page-02-alignment.png
/tmp/mosapack-gate-a-pdf-qa/page-03-sheet1-bleed-003.png
/tmp/mosapack-gate-a-pdf-qa/page-04-sheet1-bleed-005.png
```

## QA Result

`scripts/verify-generate-kit-pack.sh` passed.

Verified:

- generator file exists
- README and requirements exist
- schema/constants/fixture files exist
- Python syntax check passes with pycache redirected to `/tmp`
- `reportlab` is available
- sample PDF is generated and non-empty
- `pypdf` text/page check passes when available
- output PDF text includes `MosaPack` and `MP-FH24A`
- Gate A PDF is generated
- Gate A manifest includes `0.03` and `0.05` bleed values
- output PDF text includes `Actual Size`
- output PDF text includes `Measure me: 1.000 in`

`pdftoppm` is not available in this environment, so raster page rendering was not performed.

## Warnings

- `OL2050` is still marked unverified: `pending_alignment_test`.
- The generated PDF is not production-approved.
- Gate A alignment and 100-150 sticker physical sample validation are still required.

## Limitations

- Local/operator tooling only.
- Not wired into Netlify Functions.
- Not exposed in public customer UX.
- No supplier API integration.
- No ZIP packet generation.
- No physical sample evidence yet.

## Production Recommendation

No production deploy.

## Next Gate

Gate A alignment test page plus 100-150 sticker physical sample protocol execution.
