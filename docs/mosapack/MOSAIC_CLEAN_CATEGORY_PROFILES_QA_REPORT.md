# Mosaic Clean Category Profiles QA Report

Date: 2026-06-30
Branch: `feature/mosaic-clean-category-profiles-v1`
Preview URL: `https://6a435db8dd874ae94a13ecc1--mosapack.netlify.app`
Status: visual review package generated; hosted proof-save regression passed; production approval rejected as of 2026-07-05.

## Purpose

Validate the category-profile implementation and produce a private visual review package comparing:

1. Original Crop
2. Raw Current
3. Universal Medium
4. Category Default
5. Category Alternate

The key release question is whether category defaults are better production candidates than a universal medium default.

## V3 Review Package

Folder:

```text
/tmp/mosapack-mosaic-clean-category-profiles-v1/
```

Zip:

```text
/tmp/mosapack-mosaic-clean-category-profiles-v1.zip
```

Gallery:

```text
/tmp/mosapack-mosaic-clean-category-profiles-v1/index.html
```

Included:

- 100 individual 512x512 PNG comparison images
- 20 detail pages
- 27 contact sheets
- metadata JSON
- metadata summary Markdown
- scorecard CSV
- README

## QA Image Set

Source folder:

```text
/Users/dereksolas/Developer/mosapack-qa-private/b1-5-mixed-photo-set/
```

Images tested: 20

Categories tested:

- Pet: 5
- Couple / Wedding: 3
- Family: 3
- Memorial: 3
- Baby / Kids: 3
- Corporate / Logo: 3

## Generation Result

Local browser generation result:

- 20/20 images uploaded
- 20/20 crop previews captured
- 20/20 category profiles resolved
- 80/80 mosaic variants rendered
- 80/80 mosaic variant canvases reported nonblank
- 100/100 output PNGs normalized to 512x512

No subjective production approval is claimed from this metadata. Derek visual review is required.

## Category Alternate Rules

| Category | Category default | Alternate |
| --- | --- | --- |
| Pet | medium / ordered | light / ordered |
| Couple / Wedding | light / ordered | medium / ordered |
| Family | light / ordered | medium / ordered |
| Baby / Kids | light / ordered | light / none |
| Memorial | light / none | light / ordered |
| Corporate / Logo | none / none | light / ordered |
| Other / Unknown | light / ordered | medium / ordered |

## Proof-Save Regression

Hosted preview proof-save regression passed on:

```text
https://6a435db8dd874ae94a13ecc1--mosapack.netlify.app/builder/
```

Required hosted categories:

- Pet: `b789ce69-6119-43e2-9428-62b6ed676f43`
- Memorial: `7199c453-cecf-414c-a4ec-02340039d344`
- Baby / Kids: `81e62f89-fee3-433b-a856-97fd81368125`
- Corporate / Logo: `6adc5cce-cf75-4273-b9e8-7d90b8bd1331`
- Other / Auto: `9fb8d4cf-c13f-49ab-a221-b07d49575fa6`

Observed profile resolution:

| Category | Resolved profile | Strength | Dither | Cleanup |
| --- | --- | --- | --- | --- |
| Pet | pet | medium | ordered | normal |
| Memorial | memorial | light | none | conservative |
| Baby / Kids | baby_kids | light | ordered | conservative |
| Corporate / Logo | corporate_logo | none | none | edge-preserve |
| Other / Auto | other | light | ordered | conservative |

Each hosted case reached the `Proof request saved!` confirmation. That confirmation only appears after `/.netlify/functions/save-project` returns a project ID and the Netlify Forms POST returns OK.

Netlify Forms metadata-only behavior is covered by:

- `bash scripts/verify-netlify-forms.sh`
- `bash scripts/verify-b2-design-save.sh`
- `bash scripts/verify-mosaic-clean-category-profiles.sh`

The hosted Playwright run intentionally did not retain the B2 save request body because it includes the approved cropped source and preview image payloads by design. No raw image data is submitted through Netlify Forms.

## Verification Results

Passed:

- `bash scripts/security-scan.sh`
- `bash scripts/verify-clean-repo.sh`
- `bash scripts/verify-netlify-forms.sh`
- `bash scripts/verify-b2-design-save.sh`
- `bash scripts/verify-live-exposure.sh`
- `bash scripts/verify-proof-ops-paused-payment.sh`
- `bash scripts/verify-d1-proof-credit.sh`
- `bash scripts/verify-public-builder-wizard.sh`
- `bash scripts/verify-mosaic-clean-preprocess.sh`
- `bash scripts/verify-mosaic-clean-category-profiles.sh`

## Production Recommendation

No production deploy. Production approval is blocked on Derek review of the v3 package.

2026-07-05 update: Derek rejected current Mosaic Clean tuning as production criteria. The package remains useful for diagnostics, but it is not a production gate.

## 2026-07-05 Validation Update

Synthetic-safe category-profile review supports option C directionally, but it is not sufficient for production or paid fulfillment approval.

A private real-photo validation package was created for Derek review:

```text
/tmp/mosapack-real-photo-category-profile-validation/
```

Private ZIP:

```text
/tmp/mosapack-real-photo-category-profile-validation.zip
```

This package contains real/private QA-derived images and must not be deployed publicly, committed, or uploaded unless Derek intentionally shares the private ZIP.

Open-source mosaic-builder research should inform Detail Priority Map v1 and sticker/magnet production-output experiments. GPL code must not be copied directly into MosaPack.

## 2026-07-05 Variant Integrity Audit

Derek reported that the private real-photo contact sheet variants looked too similar.

Audit result:

- The prior private real-photo package was not a valid variant proof package; it reused the same source image with CSS-only variant styling.
- A debug-only variant rendering bug was fixed so category changes do not trigger an un-awaited background render during variant generation.
- Universal Medium now uses an explicit debug override for `medium / ordered / normal` instead of inheriting category cleanup settings.
- Actual builder-rendered private diagnostics are available at:

```text
/tmp/mosapack-category-profile-variant-integrity-audit/
```

Private ZIP:

```text
/tmp/mosapack-category-profile-variant-integrity-audit.zip
```

Category Default vs Universal Medium result across 20 real images:

- Pet: 5/5 identical, expected because pet default equals universal medium
- Non-pet categories: distinct outputs, mostly major differences

Production remains blocked pending Derek review of the diagnostic package.

## 2026-07-05 Tuning Rejection

Derek reviewed the corrected profile tuning package:

```text
/tmp/mosapack-mosaic-clean-profile-tuning-v1/
```

Private ZIP:

```text
/tmp/mosapack-mosaic-clean-profile-tuning-v1.zip
```

Decision: E - reject current Mosaic Clean tuning as production criteria.

Mosaic Clean category profiles are not production-approved. Future image optimization must be validated against Buildable Sticker/Magnet Proof Output v1 rather than standalone visual variants.
