# Open-Source Leverage For Buildable Output

Date: 2026-07-05
Status: reference plan; no code copied.

## Rule

Do not replace the MosaPack engine with an open-source mosaic toy. Extract patterns, not product identity.

Do not copy GPL code into MosaPack unless Derek intentionally accepts the license obligations. For now, GPL projects are study-only.

## Legofy

- URL: `https://github.com/JuanPotato/Legofy`
- License: MIT
- Use as a permissively licensed reference for size handling, palette choices, and dither/no-dither concepts.
- Do not copy blindly; MosaPack has a proof-first sticker/magnet output goal, not a generic LEGO-style image output goal.

## Lego Art Remix

- URL: `https://github.com/debkbanerji/lego-art-remix`
- License: GPL-3.0
- Use as a browser-local architecture and instruction-generation reference.
- Useful concepts:
  - client-side processing
  - palette/set constraints
  - instruction-style outputs
  - worker architecture
  - privacy model
- GPL risk: study only unless license obligations are accepted.

## OpenCV / Pillow

Use concepts for:

- quantization
- edge detection
- posterization
- smoothing
- downsampling
- future backend/operator tooling

No dependency is added yet.

## Photo Mosaic Repositories

Use generic photo mosaic repos for:

- matching/ranking ideas
- duplicate/repetition controls
- review-gallery patterns

Do not treat photo-tile mosaic logic as a direct replacement for MosaPack's color-cell proof output.

## LDraw / LeoCAD

Use only for future brick-kit output. LDraw conventions may help with BOM/instructions later, but they are not required for sticker/magnet-first launch.

## Near-Term Leverage

The practical next step is not another Mosaic Clean profile comparison. The next step is to create reproducible sticker/magnet proof outputs:

- SVG layout
- numbered grid
- color legend
- assembly guide
- production metadata
