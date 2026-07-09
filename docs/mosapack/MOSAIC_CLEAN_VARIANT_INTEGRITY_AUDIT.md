# Mosaic Clean Variant Integrity Audit

Date: 2026-07-05
Branch: `feature/mosaic-clean-category-profiles-v1`
Status: private diagnostic package generated; production deploy remains blocked.

## Purpose

Derek reported that the real-photo contact sheet variants looked too similar. This audit checks whether the generated variants are actually distinct outputs and whether differences are visually meaningful.

## Private Diagnostic Package

Folder:

```text
/tmp/mosapack-category-profile-variant-integrity-audit/
```

Zip:

```text
/tmp/mosapack-category-profile-variant-integrity-audit.zip
```

Open locally:

```text
/tmp/mosapack-category-profile-variant-integrity-audit/index.html
```

Privacy: PRIVATE QA ONLY. The package contains real/private QA-derived outputs and was not committed or deployed.

## Bug Found

Yes.

The prior private real-photo validation package was not a valid variant proof package. It reused the same source image for all variant columns and relied on CSS filters/overlays to make the columns look different.

That package did not prove that:

- Raw Current
- Universal Medium
- Category Default
- Category Alternate

were actual distinct builder-rendered mosaic outputs.

## Bug Fix Applied

The debug-only variant rendering path in `public/builder/index.html` was corrected:

- category selection for debug variants is now set silently so it does not trigger an un-awaited background `processImage()` call;
- Universal Medium now uses an explicit debug override:
  - Mosaic Clean enabled
  - strength `medium`
  - dither `ordered`
  - cleanup mode `normal`
  - profile `universal_medium`
  - normal target color budget

No public wizard UX was changed.

## Variant Settings Audited

| Variant | Mosaic Clean | Strength | Dither | Cleanup | Profile |
| --- | --- | --- | --- | --- | --- |
| Raw Current | off | none | ordered | none | none |
| Universal Medium | on | medium | ordered | normal | universal_medium |
| Category Default | on | category profile | category profile | category profile | selected category |
| Category Alternate | profile dependent | alternate | alternate | category profile | selected category |

## Metrics Generated

Private files:

- `/tmp/mosapack-category-profile-variant-integrity-audit/data/variant-integrity-metrics.json`
- `/tmp/mosapack-category-profile-variant-integrity-audit/data/variant-integrity-summary.md`
- `/tmp/mosapack-category-profile-variant-integrity-audit/data/duplicate-image-report.md`

For every variant image, the audit records:

- file hash
- width
- height
- unique color count
- average pixel difference vs Raw Current
- average pixel difference vs Universal Medium
- percent pixels changed vs Raw Current
- percent pixels changed vs Universal Medium
- MSE
- RMSE

## Difference Thresholds

- Identical: same output / 0 changed pixels
- Effectively identical: less than 0.5% pixels changed
- Subtle: 0.5% to 2% pixels changed
- Meaningful: 2% to 8% pixels changed
- Major: more than 8% pixels changed

## Overall Result

Category Default vs Universal Medium across 20 real QA images:

- Identical: 5
- Effectively identical: 0
- Subtle: 0
- Meaningful: 2
- Major: 13

Interpretation: mixed but mostly distinct.

The five identical cases are all Pet images, which is expected because Pet Category Default intentionally matches Universal Medium (`medium / ordered / normal`).

## Category Summary

| Category | Result |
| --- | --- |
| Pet | 5/5 identical vs Universal Medium; expected because pet default equals universal medium |
| Baby / Kids | 3/3 major differences |
| Couple / Wedding | 3/3 major differences |
| Family | 3/3 major differences |
| Memorial | 3/3 major differences |
| Corporate / Logo / Other | 2 meaningful, 1 major |

## Duplicate Image Warning

No exact duplicate source hashes were detected.

Near-duplicate aHash pairs were detected:

- `couple-01.jpg` / `couple-03.jpg`
- `family-01.jpg` / `family-03.jpg`
- `memorial-01.jpg` / `memorial-02.jpg`
- `memorial-03.jpg` / `pet-02.jpg`
- `memorial-03.jpg` / `pet-04.jpg`
- `pet-01.jpg` / `pet-03.jpg`
- `pet-01.jpg` / `pet-05.jpg`
- `pet-02.jpg` / `pet-04.jpg`
- `pet-03.jpg` / `pet-05.jpg`

These are near-duplicate perceptual hash warnings, not proof of identical files. They reduce confidence because repeated visual conditions can overweight the audit.

## Recommendation

B: tune profiles before production approval.

Reason:

- Actual builder-rendered variants are distinct for non-pet categories.
- The previous private review package was invalid for approval because it was CSS-only.
- The integrity package proves settings and outputs differ, but Derek still needs to judge whether the differences are visually better, not merely different.

Do not simplify to one default yet, because non-pet category defaults are producing distinct outputs.

Do not approve production yet, because the visual quality decision remains open.

## Production Recommendation

No production deploy.

## Next Recommended Task

Use Derek's review of the private diagnostic package to tune category profiles. If the variants are distinct but not good enough, tune Mosaic Clean profile strengths/dither/cleanup first, then revisit Detail Priority Map v1.
