# Mosaic Clean Visual Review v2 Report

Date: 2026-06-30
Branch: `feature/mosaic-clean-preprocess-v1`
Source commit: `e3fe24e docs: create Mosaic Clean visual review package`

## Purpose

Create a stronger private QA review package for Derek to evaluate Mosaic Clean before any production decision.

The v1 package was insufficient because:

- thumbnails were too small for visual judgment
- the gallery read like a spreadsheet instead of a decision tool
- screenshot-based captures produced off-by-one dimensions and visually awkward framing
- notes were repetitive and did not help choose a default
- the previous default recommendation was premature

## What Changed In v2

- Regenerated all individual review images as exact 512x512 PNG exports.
- Replaced the table with a large card-based gallery.
- Added category filters.
- Added one large contact sheet per QA image.
- Added one detail page per QA image.
- Added a scorecard CSV template with filename/category prefilled only.
- Added metadata JSON and metadata-only summary markdown.
- Added six dither mini-check contact sheets.
- Added README instructions in the package.

## Output Paths

Folder:

```text
/tmp/mosapack-mosaic-clean-review-v2/
```

Zip:

```text
/tmp/mosapack-mosaic-clean-review-v2.zip
```

Gallery:

```text
/tmp/mosapack-mosaic-clean-review-v2/index.html
```

Contact sheets:

```text
/tmp/mosapack-mosaic-clean-review-v2/contact-sheets/
```

Detail pages:

```text
/tmp/mosapack-mosaic-clean-review-v2/detail-pages/
```

## QA Coverage

Images tested: 20

Categories:

- pet
- couple/wedding
- family
- memorial
- baby/kids
- corporate/logo/other

Generated per image:

1. Original Crop
2. Raw Current
3. Clean Light
4. Clean Medium
5. Clean Bold

Dither mini-check included: yes

Representative dither checks:

- 2 pet images
- 1 memorial image
- 1 baby/kids image
- 1 corporate/logo/other image
- 1 family image

## Dimension Audit

V1 audit:

- 100 PNG files checked
- 100 were not exact square dimensions because they came from styled element screenshots

V2 audit:

- 100 individual review images checked
- all 100 are exact square 512x512 PNGs
- contact sheets are intentionally wide review images

## Metadata-Only Notes

This is metadata-only. Derek visual review is required.

- Raw Current average unique colors: 11.7
- Clean Light average unique colors: 11.95
- Clean Medium average unique colors: 12.35
- Clean Bold average unique colors: 12.55
- No variant exceeded the metadata high-cell-change threshold.
- No bold variant exceeded the metadata-only over-smoothing threshold.
- Corporate/logo/other images still need direct visual review for small feature loss.

Tentative metadata-only recommendation: review medium as a candidate default, but do not choose from metadata alone. The dither checks and corporate/logo rows should determine whether a category-based default is needed.

## Derek Decision Options

- A: Keep medium default
- B: Switch default to light
- C: Use category-based defaults
- D: Disable Mosaic Clean until tuned

## Production Recommendation

No production deploy. Visual decision is still pending.

After Derek chooses:

- If C: implement category-based Mosaic Clean defaults.
- If A, B, or D: apply that default and run proof-save regression.

## Category Profile Follow-Up

Derek chose C: category-based Mosaic Clean defaults.

Follow-up package:

```text
/tmp/mosapack-mosaic-clean-category-profiles-v1/
```

The v3 package compares Raw Current, Universal Medium, Category Default, and Category Alternate. Universal medium remains unapproved as a blanket default until Derek completes visual review of the v3 package.
