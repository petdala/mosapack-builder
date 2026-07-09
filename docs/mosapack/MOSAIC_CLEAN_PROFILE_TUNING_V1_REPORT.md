# Mosaic Clean Profile Tuning v1 Report

## Purpose

Mosaic Clean category profiles need tuning before production approval. Derek's real-photo review found that the earlier category-profile comparison did not provide enough visual separation to approve defaults, and the Variant Integrity Audit later confirmed the prior private package was invalid because variants reused the same source output and used CSS-only visual treatments.

This tuning package gives Derek a private, real-photo review set for choosing final per-category settings. Different output is not automatically better; the review goal is recognizability, emotional likeness, and buildability.

## Prior Bug Context

The prior real-photo package is not approval evidence. The debug-only variant path was corrected so diagnostic and tuning variants now use actual `mosaicCanvas` outputs under controlled settings.

For this tuning pass, the debug-only renderer was extended to accept explicit tuning overrides for strength, dither mode, cleanup mode, tone mode, target color bias, and buildability cleanup. This was needed to generate candidates such as `none / none / conservative` without changing production defaults.

## Private Package

- Private tuning package: `/tmp/mosapack-mosaic-clean-profile-tuning-v1/`
- Private tuning zip: `/tmp/mosapack-mosaic-clean-profile-tuning-v1.zip`
- Privacy status: PRIVATE QA ONLY
- Public deploy: none
- Repo commit: generated images and ZIP are not committed

## Package Contents

- `index.html`
- `README.md`
- `images/`
- `contact-sheets/`
- `detail-pages/`
- `data/profile-tuning-scorecard.csv`
- `data/profile-tuning-metrics.json`
- `data/profile-tuning-metadata-summary.md`

## Categories Tested

- Baby / Kids: 3 images
- Corporate / Logo: 3 images
- Couple / Wedding: 3 images
- Family: 3 images
- Memorial: 3 images
- Pet: 5 images

The private folder did not include a distinct Other / Unknown image set. The `other-*` files were treated as Corporate / Logo per the current QA category mapping.

## Tuning Candidates

### Pet

- Raw Current
- Current Pet Default: `medium / ordered / normal`
- Candidate 1: `medium / none / normal`
- Candidate 2: `light / ordered / normal`

### Couple / Wedding

- Raw Current
- Universal Medium
- Current Default: `light / ordered / conservative`
- Candidate 1: `light / none / conservative`
- Candidate 2: `medium / none / conservative`

### Family

- Raw Current
- Universal Medium
- Current Default: `light / ordered / conservative`
- Candidate 1: `light / none / conservative`
- Candidate 2: `medium / none / conservative`

### Baby / Kids

- Raw Current
- Universal Medium
- Current Default: `light / ordered / conservative`
- Candidate 1: `light / none / conservative`
- Candidate 2: `none / none / conservative`

### Memorial

- Raw Current
- Universal Medium
- Current Default: `light / none / conservative`
- Candidate 1: `none / none / conservative`
- Candidate 2: `light / ordered / conservative`

### Corporate / Logo

- Raw Current
- Universal Medium
- Current Default: `none / none / edge-preserve`
- Candidate 1: `light / none / edge-preserve`
- Candidate 2: `none / ordered / edge-preserve`

### Other / Unknown

- Raw Current
- Universal Medium
- Current Default: `light / ordered / conservative`
- Candidate 1: `light / none / conservative`
- Candidate 2: `none / none / conservative`

No dedicated Other / Unknown real-photo examples were available in this pass.

## Metadata-Only Summary

This summary is not a visual approval. Derek must review the private gallery before production settings are changed.

- Pet current default is identical to Universal Medium by design.
- Baby / Kids candidates changed substantially from the current default by pixel metrics, so visual review should watch for loss of facial likeness.
- Couple / Wedding and Family no-dither candidates changed substantially from current defaults, which may reduce speckling but could also alter likeness.
- Memorial Candidate 1 is closer to the current default than Universal Medium or Candidate 2 by pixel-change metrics.
- Corporate / Logo Candidate 1 is close to the current default by pixel-change metrics, while Candidate 2 is more distinct and uses ordered dithering.
- No exact crop duplicates were detected after regenerating with stricter crop-load waits.
- Several near-duplicate source candidates were flagged by simple aHash; repeated or visually similar inputs reduce confidence and should be considered during Derek's review.

## Decision Options

- A keep current category defaults
- B tune selected categories
- C simplify to one conservative default plus logo exception
- D disable Mosaic Clean pending physical sample validation

## Production Recommendation

No production deploy. Do not approve category profiles for production or paid fulfillment until Derek reviews the private tuning package and chooses final defaults.

## 2026-07-05 Rejection Decision

Derek chose E - reject current Mosaic Clean tuning as production criteria.

The tuning package is useful as diagnostic evidence, but it does not validate the real sticker/magnet proof output. Current Mosaic Clean variants are not approved as production criteria, and category-profile tuning is paused as the main release gate.

The next milestone is Buildable Sticker/Magnet Proof Output v1. Future image optimization must be evaluated against actual buildable proof files: SVG layout, numbered grid, color legend, assembly guide, proof preview, and production metadata.

## Next Step

Derek should review Buildable Sticker/Magnet Proof Output v1 next. The private tuning package remains private QA reference material, not production approval evidence.
