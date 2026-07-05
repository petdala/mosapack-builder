# Open Source Mosaic Builder Audit

Date: 2026-07-05
Branch: `feature/mosaic-clean-category-profiles-v1`
Status: research audit only. No code copied into MosaPack.

## Purpose

Identify open-source mosaic-builder concepts that can improve MosaPack without changing the product promise.

MosaPack is not a traditional photo-tile mosaic generator. It is a photo-to-buildable color-cell proof system for digital, sticker, magnetic, and brick-style products. The useful lessons are pipeline architecture, palette constraints, preview validation, and operator review patterns.

## License Rule

Do not copy GPL code into MosaPack.

GPL projects can inform ideas and experiments, but implementation must be original or use compatible permissive libraries after license review.

## 1. Legofy

URL: https://github.com/JuanPotato/Legofy

Observed license: MIT.

Observed project focus:

- Python image-to-LEGO-style renderer.
- README describes `--size` for longest-side brick count.
- README exposes `--dither / --no-dither`.
- README exposes `--palette` modes including real LEGO color categories.

What applies to MosaPack:

- Size handling maps well to MosaPack's grid-size policy. Small grids need fewer colors and less dither.
- Dither should be a deliberate profile choice, not a universal default.
- Palette category selection is relevant to supplier/material modes.

What not to copy directly:

- The output goal is LEGO-style rendering, not MosaPack's proof-first sticker/magnet/digital pipeline.
- MosaPack should keep final mapping through its existing supplier palette and perceptual color matching.

Adaptation recommendation:

- Use Legofy as a permissive-license reference for dither/no-dither UX and palette scope, but implement original browser-side logic.

## 2. Lego Art Remix

URL: https://github.com/debkbanerji/lego-art-remix

Observed license: GPL-3.0.

Observed project focus:

- Browser-local computer-vision assisted LEGO mosaic creation.
- Uses client-side processing and web workers.
- README states image data is not sent to a server for core processing.
- Uses set/palette constraints and client-side instruction generation.

What applies to MosaPack:

- Browser-local processing supports MosaPack's privacy-first message.
- Worker architecture is relevant if Mosaic Clean, proof variants, or future saliency masks become too slow on mobile.
- Set/palette constraints are relevant to future brick-kit output.
- Client-side instruction generation is relevant only after sticker/magnet/digital proof flows are stable.

GPL risk:

- Do not copy implementation code, UI structure, model integration, or worker code.
- Keep this as concept-level research only unless legal review approves a separate compatible path.

Adaptation recommendation:

- Study the architecture conceptually: browser-local, worker-backed, low-resolution processing, constrained output. Rebuild any useful ideas from scratch.

## 3. Generic Photo Mosaic Repositories

Examples reviewed or queued:

- https://github.com/I82Much/Scala-Photomosaic
- https://github.com/SouthbankSoftware/photo-mosaic
- https://github.com/andrewhannebrink/photo-mosaic-video-generator
- https://github.com/JRoussos/mosaic-generator
- https://github.com/futureprogrammer360/Python-Photomosaic
- https://github.com/DarinM223/photo-mosaic

Useful concepts:

- Average-color matching by tile.
- Tile candidate ranking by distance to target color.
- Repetition or duplicate spacing to avoid visual clutter.
- Review contact sheets and side-by-side comparison outputs.
- Parallel/asynchronous rendering for large grids.

MosaPack differences:

- MosaPack does not pick photographic source tiles.
- MosaPack maps each final cell to a buildable supplier color or material.
- Duplicate spacing in photo mosaics should be translated into buildability cleanup, not copied literally.

Adaptation recommendation:

- Use the ranking idea for operator comparison views: raw, universal medium, category default, category alternate.
- Use duplicate-spacing ideas as inspiration for speckle cleanup and rare-color merge policies.

## 4. OpenCV and Pillow Concepts

References:

- OpenCV k-means color quantization: https://docs.opencv.org/4.x/d1/d5c/tutorial_py_kmeans_opencv.html
- OpenCV Canny edge detection: https://docs.opencv.org/4.x/da/d22/tutorial_py_canny.html
- Pillow Image module: https://pillow.readthedocs.io/en/stable/reference/Image.html

Useful concepts:

- K-means color quantization can prototype source simplification, but should not replace final supplier palette matching.
- Edge detection can help generate detail-priority masks for eyes, mouths, pet faces, logo borders, text-like details, and silhouettes.
- Pillow-style backend/operator tooling may be useful for offline QA and batch contact sheets.

MosaPack policy:

- Browser pipeline remains primary for public previews.
- Backend/offline experiments are allowed for operator QA, but public final mosaics must remain reproducible with real cells/colors.

## 5. LeoCAD / LDraw Ecosystem

References:

- LDraw ecosystem: https://www.ldraw.org/

Useful concepts:

- Future brick-kit output could use BOM and instruction conventions from the LEGO CAD ecosystem.
- Physical brick exports should remain future R&D, not sticker-first launch scope.

Non-goals today:

- No LDraw export in this task.
- No brick supplier API integration.
- No BOM or instruction generator in public launch.

## Product Architecture Takeaways

1. Keep MosaPack proof-first and buildable.
2. Optimize source photos before supplier palette mapping.
3. Use category profiles now, but require real-photo validation before production.
4. Add Detail Priority Map v1 before making heavier cleanup decisions.
5. Treat GPL projects as concept references only.
