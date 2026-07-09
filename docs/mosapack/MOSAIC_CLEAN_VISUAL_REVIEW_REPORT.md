# Mosaic Clean Visual Review Report

Date: 2026-06-30
Branch: `feature/mosaic-clean-preprocess-v1`
Source commit: `51ddef5 feat: add Mosaic Clean preprocessing for buildable previews`

## Purpose

Create a private visual review package so Derek can compare Mosaic Clean output before deciding whether the current default is production-ready.

This is a review package only. Mosaic Clean is not production-approved until Derek reviews the comparison gallery and chooses a default strategy.

## Local Review Package

Folder:

```text
/tmp/mosapack-mosaic-clean-review/
```

Zip:

```text
/tmp/mosapack-mosaic-clean-review.zip
```

Gallery:

```text
/tmp/mosapack-mosaic-clean-review/index.html
```

The package is private QA only. It includes cropped source previews and generated mosaic screenshots from the private QA image set. Do not publish or commit the generated image outputs.

## QA Image Set

Private source folder:

```text
/Users/dereksolas/Developer/mosapack-qa-private/b1-5-mixed-photo-set/
```

Images tested: 20

Categories tested:

- pet
- couple/wedding
- family
- memorial
- baby/kids
- corporate/logo/other

## Variants Generated

Each image has five columns in the gallery:

1. Original cropped source
2. Raw current pipeline with Mosaic Clean disabled
3. Mosaic Clean light
4. Mosaic Clean medium
5. Mosaic Clean bold

The generated metadata file records:

- unique color count
- cells changed
- speckles removed
- rare colors merged
- dither mode
- target max colors

## Derek Review Instructions

Open:

```text
/tmp/mosapack-mosaic-clean-review/index.html
```

For each row, compare raw against light, medium, and bold. Score the variants mentally or in notes against:

- best recognizability
- best emotional likeness
- best buildability
- too smooth?
- too noisy?
- preferred default

Decision options:

- A: keep medium default
- B: switch default to light
- C: category-based defaults
- D: disable Mosaic Clean until tuned

## Metadata-Only Tuning Notes

These notes are based on cleanup metadata, not subjective visual judgment.

- Bold did not exceed the 25% cells-changed warning threshold in the generated set.
- Medium did not exceed the 18% cells-changed warning threshold for baby/kids or memorial images.
- Medium stayed within the 16-color target at the current 48x48 review size.
- Raw unique color counts were already within target for this set, so visual review should focus more on likeness, smoothing, and speckle reduction than on color-count reduction alone.
- Corporate/logo/other images did not trigger the metadata warning threshold, but Derek should still inspect small features and text-like details closely.

Tentative metadata-only recommendation: keep `medium` as the default for now, with a likely future category override to `light` or disabled for logos/text if Derek sees small-feature loss.

## Production Recommendation

No production deploy. Production approval should wait until Derek reviews the gallery and chooses A, B, C, or D.
