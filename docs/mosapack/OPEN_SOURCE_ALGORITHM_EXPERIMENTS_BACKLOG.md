# Open Source Algorithm Experiments Backlog

Date: 2026-07-05
Branch: `feature/mosaic-clean-category-profiles-v1`
Status: backlog only. No product behavior changed.

## Experiment 1: Legofy-Style Dither Comparison

Goal: compare no dither, ordered dither, and heavier error diffusion on real MosaPack categories.

Why it matters: dither can improve gradients but can also create noisy, hard-to-build mosaics.

Expected value: confirm current category dither defaults, especially `none` for memorial/logo and `ordered` for pets/family.

Risk: too much dither may look better digitally while making sticker/magnet/brick output worse.

When to run: after Derek completes private real-photo review.

## Experiment 2: Lego Art Remix Worker Architecture Review

Goal: prototype moving expensive preview variants into a browser worker without copying GPL code.

Why it matters: category variant comparison, edge masks, and future proof review may become slow on mobile.

Expected value: smoother public wizard and better operator variant generation.

Risk: worker complexity can make debugging harder; GPL code must not be copied.

When to run: after Detail Priority Map v1 proves useful.

## Experiment 3: Average RGB vs Perceptual Supplier Matching

Goal: compare simple average RGB matching against the current perceptual supplier-palette mapping.

Why it matters: photo mosaic repos often use average RGB, but MosaPack final output depends on real supplier colors.

Expected value: confirm that average RGB is only acceptable for rough candidate ranking, not final output.

Risk: switching final matching away from perceptual matching would reduce build fidelity.

When to run: offline only, before any future backend/operator tooling.

## Experiment 4: Source Simplification With K-Means / Posterization

Goal: compare current Mosaic Clean posterization against k-means simplification at working resolutions.

Why it matters: raw photos create too many subtle colors for small grids.

Expected value: better source simplification before supplier mapping.

Risk: k-means may flatten faces or shift brand colors if not edge/detail aware.

When to run: after category defaults pass real-photo review.

## Experiment 5: Buildability Cleanup From Duplicate/Repetition Spacing

Goal: translate photo-mosaic duplicate spacing ideas into MosaPack rare-color and speckle cleanup.

Why it matters: isolated one-cell colors are hard to build and can harm recognizability.

Expected value: cleaner sticker/magnet/brick-style outputs.

Risk: over-cleanup can destroy eyes, mouth detail, text strokes, and silhouettes.

When to run: paired with Detail Priority Map v1.

## Experiment 6: LDraw Export Feasibility

Goal: estimate what a future brick-kit export would require for BOM, instructions, and part/color constraints.

Why it matters: brick-style products need physical build conventions, not just preview images.

Expected value: clear feasibility boundary for future brick R&D.

Risk: could distract from sticker-first and digital proof paths.

When to run: only after sticker/magnet/digital proof flow has production approval.
