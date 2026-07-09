# Buildable Sticker/Magnet Proof Output v1 Strategy

Date: 2026-07-05
Status: proposed next milestone after Mosaic Clean tuning rejection.

## Product Goal

Create a buildable proof package for sticker/magnet-first MosaPack.

## Public Promise

Your photo, optimized into a buildable mosaic proof.

## What This Is

- A proof-first production-output system.
- Sticker/magnet first.
- Premium brick later.
- Buildable color-cell output.
- A package Derek can review, send to suppliers, or use for manual assembly.
- A customer-facing proof that is tied to saved project data.

## What This Is Not

- Not an AI image generator.
- Not fake overlay mosaic art.
- Not checkout.
- Not full supplier automation.
- Not brick-first UX.
- Not a public algorithm playground.
- Not a public quality-score system.

## MVP Proof Package

For each saved proof project, generate:

1. optimized source preview
2. buildable mosaic preview
3. numbered placement grid
4. color legend
5. sticker/magnet SVG layout
6. simple assembly guide
7. proof email image
8. project JSON / production metadata

## First Physical Target

- 24x24 cell sticker/magnet reveal kit
- optional 32x32 premium proof
- rounded-square cells for production
- circle/rounded preview allowed visually
- production shape defaults to rounded square

Circle production should wait until cut waste, alignment tolerance, and supplier constraints are tested.

## Why

The customer needs to see a clear, buildable result.

Derek needs a production package that can be sent to suppliers, reviewed manually, or assembled as a controlled sticker/magnet proof.

Mosaic Clean can support this pipeline, but it is not the release gate by itself. The release gate is whether the saved proof can become a reproducible sticker/magnet output.

## Release Gate

Buildable Sticker/Magnet Proof Output v1 is not approved until:

- generated proof files match the saved project cell map
- the legend matches real colors
- the SVG/PDF package is usable by a human operator
- no raw image data is submitted through Netlify Forms
- no checkout/order/shipping promise is introduced
- at least one supplier/local production path reviews sample files
