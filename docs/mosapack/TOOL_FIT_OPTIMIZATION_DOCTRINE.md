# Tool-Fit Optimization Doctrine

Date: 2026-07-05
Status: doctrine document created on `feature/mosaic-clean-category-profiles-v1`.

## Product Promise

Your photo, optimized into a buildable mosaic proof.

MosaPack may modify and optimize the uploaded source photo so it works better as a buildable sticker, magnetic, digital, or plastic-brick-style mosaic.

MosaPack must not fake the final mosaic with overlays, hallucinated visuals, or preview effects that cannot be reproduced with real cells/colors/pieces.

## Allowed Transformations

- Crop and subject centering
- Exposure and contrast correction
- Background simplification
- Edge preservation
- Subject/detail priority
- Color region simplification
- Palette-aware optimization
- Buildability cleanup

## Disallowed Transformations

- Hidden alpha overlay as final proof
- Fake mosaic texture as final proof
- Hallucinated non-buildable details
- Changing identity or likeness
- Preview that cannot be built
- Product images not tied to saved project data

## Current Category-Profile Gate

Synthetic-safe review supports category profiles directionally.

Private real-photo validation is required before production deploy or paid fulfillment.

## Open-Source Guardrail

Open-source mosaic builders can inform architecture and experiments.

Do not copy GPL code directly into MosaPack. Rebuild useful ideas from scratch or use permissive dependencies only after license review.

## Future AI Usage

AI can assist subject, background, saliency, face, pet-face, logo, and detail detection.

The final output must remain constrained by supplier palette and physical cell rules.

## Proof Transparency

Record and preserve:

- Original crop
- Optimized crop/preprocessed state
- Buildable mosaic output
- Preprocess metadata
- Proof operator decision

Do not send raw image data through Netlify Forms.
