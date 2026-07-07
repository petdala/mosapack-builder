# Buildable Sticker/Magnet Proof Output v1 Implementation Report

Date: 2026-07-06
Branch: `feature/buildable-sticker-magnet-proof-output-v1`
Status: implemented for operator/local browser export; production deploy not approved.

## What Was Implemented

Buildable Sticker/Magnet Proof Output v1 adds operator-only export tooling to the existing public builder.

The public customer flow remains:

```text
Upload -> Crop -> Preview -> Request Proof -> Proof Saved
```

The export feature lives inside collapsed Advanced tools under:

```text
Proof Export Tools
```

Helper copy:

```text
Generate buildable proof files for manual review. Not shown to customers by default.
```

## Output Files

The operator can download:

- proof preview PNG
- optimized source PNG
- numbered grid SVG
- color legend HTML
- production JSON
- proof email image PNG

ZIP download is intentionally skipped in v1 to avoid adding a dependency.

## Buildability Assumptions

- Export uses the current rendered grid and current `processedData.mapped` cell map.
- Production cell shape defaults to rounded square.
- SVG cells are rounded squares with deterministic color IDs.
- Color legend IDs match the SVG and production JSON.
- Current grid is exported as-is. Fixed 24x24 starter and 32x32 premium resampling are deferred to v1.1 unless the existing engine is explicitly switched to those sizes before preview generation.

## Operator UX

- Export controls are disabled until a mosaic preview exists.
- Export controls are inside collapsed Advanced tools.
- If a proof has been saved, the exported production JSON includes `project_id`.
- If no proof has been saved, production JSON marks the package as an unsaved preview.
- The UI does not claim files were sent to suppliers.
- The UI does not claim production started.
- The UI does not add checkout or payment language.

## B2 And Netlify Forms Preservation

Preserved:

- `/.netlify/functions/save-project`
- `mosapack-save-design` Netlify form
- `project_id` hidden field
- `designStorageConsent`
- metadata-only Netlify Forms behavior
- no raw image data through Netlify Forms

Export files are local browser downloads only.

## Local QA Result

Synthetic local QA generated all v1 outputs under:

```text
/tmp/mosapack-buildable-proof-output-qa/
```

Generated files:

- `proof-preview.png`
- `optimized-source.png`
- `numbered-grid.svg`
- `color-legend.html`
- `production.json`
- `proof-email-image.png`

The local QA validated:

- non-empty files
- SVG contains rounded-square placement cells and color IDs
- production JSON version is `buildable-proof-output-v1`
- production JSON cell map dimensions match exported grid
- production JSON includes a color legend

Generated QA files were not committed.

## Hosted QA Result

Draft preview:

```text
https://6a4bbeac37969f708f37e9f9--mosapack.netlify.app
```

Hosted QA exercised the full preview flow on `/builder/`:

- upload synthetic QA image
- crop/default position
- create mosaic preview
- generate proof preview PNG
- generate optimized source PNG
- generate numbered grid SVG
- generate color legend HTML
- generate production JSON before proof save
- generate proof email image PNG
- request proof
- submit consent-gated proof request
- confirm saved state
- generate production JSON after proof save

Hosted proof save returned project ID:

```text
b10e53b4-e2dd-492b-bc9f-0a2851567dde
```

Generated hosted QA files were written under:

```text
/tmp/mosapack-buildable-proof-output-hosted-qa/
```

Generated hosted QA files were not committed.

## Canonical Design Adapter Update

Canonical Design Export Adapter v1 was added after Buildable Proof Output v1.

New operator-only export:

```text
Download Canonical Design JSON
```

Output:

```text
mosapack-design-v1.json
```

The adapter emits schema-aligned design JSON for future generator input while preserving the existing proof-output `production.json` export.

QA sample paths:

```text
/tmp/mosapack-canonical-design-export-qa/mosapack-design-v1.json
/tmp/mosapack-canonical-design-export-hosted-qa/mosapack-design-v1.json
```

Hosted canonical adapter QA project ID:

```text
556e7d29-33b3-4d43-8f6c-600bb8a9ec21
```

The generator was not ported.

## Limitations

- No server-side export function yet.
- No PDF generation yet; v1 uses SVG/HTML/PNG/JSON.
- No ZIP packaging.
- No fixed-size resampling yet.
- No supplier feedback yet.
- No physical sticker/magnet sample calibration yet.

## Production Recommendation

No production deploy.

Next approval gate is supplier/sample validation using the generated SVG/legend/production JSON package.
