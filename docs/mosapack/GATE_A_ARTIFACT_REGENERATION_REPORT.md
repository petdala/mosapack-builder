# Gate A Artifact Regeneration Report

Date: 2026-07-07
Branch: `feature/production-schema-constants-v1`
Source commit used for regeneration: `79bfe33`
Production deploy: no

## Purpose

Claude reviewed the Gate A source patch and confirmed the code appeared fixed, but the PDF/manifest/PNG artifacts it inspected came from the stale folder:

```text
/tmp/mosapack-gate-a-pdf-qa/
```

That folder contains an older Gate A manifest without the print-readiness P1 fields:

- `calibration`
- `calibration.horizontal_bar_y_in`
- `calibration.vertical_bar`
- `feed_fiducials`
- `feed_fiducials.y_from_top_in`

Fresh artifacts were regenerated into a commit-stamped folder so review paths are unambiguous.

## Fresh Artifact Folder

```text
/tmp/mosapack-gate-a-pdf-qa-79bfe33-fresh/
```

## Generation Command

```bash
python3 tools/kitpack/generate_kit_pack.py \
  fixtures/designs/sample-design-first-hello.v1_1.json \
  /tmp/mosapack-gate-a-pdf-qa-79bfe33-fresh/first-hello-gate-a.pdf \
  --constants config/production-constants.json \
  --gate-a
```

## Fresh Artifacts

```text
/tmp/mosapack-gate-a-pdf-qa-79bfe33-fresh/first-hello-gate-a.pdf
/tmp/mosapack-gate-a-pdf-qa-79bfe33-fresh/first-hello-gate-a.manifest.json
/tmp/mosapack-gate-a-pdf-qa-79bfe33-fresh/page-02-alignment.png
/tmp/mosapack-gate-a-pdf-qa-79bfe33-fresh/page-03-sheet1-bleed-003.png
/tmp/mosapack-gate-a-pdf-qa-79bfe33-fresh/page-04-sheet1-bleed-005.png
/tmp/mosapack-gate-a-pdf-qa-79bfe33-fresh/ARTIFACT_AUDIT.md
/tmp/mosapack-gate-a-pdf-qa-79bfe33-fresh.zip
```

Generated PDFs, PNGs, manifests, and ZIPs are local QA artifacts and were not committed.

## Manifest Verification

Fresh manifest:

```text
/tmp/mosapack-gate-a-pdf-qa-79bfe33-fresh/first-hello-gate-a.manifest.json
```

Verified:

- `calibration` exists
- `calibration.horizontal_bar_y_in = 0.4`
- `calibration.vertical_bar = true`
- `feed_fiducials` exists
- `feed_fiducials.y_from_top_in = 0.22`
- `gate_a_mode = true`
- `bleed_values_used = [0.03, 0.05]`
- `proof_ref` exists
- `project_id` exists
- `sheet_profile` exists
- placed, spares, and total sticker counts exist
- black-base/base-cell counts exist
- `palette_drift_warnings` field exists
- `mismatch_warnings` field exists

## PNG Verification

Fresh page PNGs were rendered from the fresh PDF using macOS Quick Look after splitting pages 2, 3, and 4 into single-page PDFs.

Fresh PNG hashes differ from the stale v1 PNGs in `/tmp/mosapack-gate-a-pdf-qa/`.

| PNG | Fresh SHA1 | Stale v1 SHA1 | Fresh differs from stale |
| --- | --- | --- | --- |
| `page-02-alignment.png` | `3ed36ce2f08352a2cb7d7d3e25dbd52b15b8aaef` | `307ea97d4ec2483e4b515b2cd5c8313d196d323b` | yes |
| `page-03-sheet1-bleed-003.png` | `687bcb50d33eddc246d52387651cf4b52a2c6140` | `832769d5e4471db8fd87754e7683e5d0f1ecce7e` | yes |
| `page-04-sheet1-bleed-005.png` | `f53008737d3500d6e4a64e97c8e540db8330ea1d` | `851de8c481af8ee244de3685074c4d9c4b2c6291` | yes |

The fresh PNG hashes match the known-good v2 folder, which was generated from the same `79bfe33` source.

## Review Instruction

Use only:

```text
/tmp/mosapack-gate-a-pdf-qa-79bfe33-fresh/
```

Ignore older artifacts under:

```text
/tmp/mosapack-gate-a-pdf-qa/
```

## Production Recommendation

No production deploy.

Plain-paper Gate A alignment dry-run remains the next safe step after Derek and Claude review the fresh page 2 alignment PNG and page 3/4 bleed PNGs.
