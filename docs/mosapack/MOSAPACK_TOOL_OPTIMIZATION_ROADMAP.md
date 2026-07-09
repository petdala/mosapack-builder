# MosaPack Tool Optimization Roadmap

Date: 2026-07-05
Status: roadmap document created on `feature/mosaic-clean-category-profiles-v1`.

## Current Gate

Mosaic Clean category-profile tuning is paused and not production-approved.

Derek chose E - reject current Mosaic Clean tuning as production criteria. The next build gate is Buildable Sticker/Magnet Proof Output v1.

## P0

### Buildable Sticker/Magnet Proof Output v1

Why it matters: MosaPack needs a reproducible proof package that can become real sticker/magnet output, not just prettier mosaic variants.

Implementation complexity: medium.

Business impact: creates the bridge from free proof request to supplier/sample validation and eventual paid fulfillment.

Non-goals: no checkout, no supplier API automation, no fake overlay previews, no public quality scores.

### Photo Suitability Coach v1

Why it matters: users need fast guidance before generating noisy mosaics from dark, blurry, distant, or busy photos.

Implementation complexity: medium.

Business impact: reduces bad proof requests and manual support time.

Non-goals: no public numeric score, no public SSIM, no public DeltaE, no quality badge.

### Detail Priority Map v1 - Deferred

Why it matters: cleanup must protect eyes, mouths, pet faces, logo borders, text-like details, and silhouettes.

Implementation complexity: medium-high.

Business impact: improves visual likeness and reduces over-smoothing risk.

Non-goals: no identity-changing generation, no fake overlay preview, no final image that cannot be built.

Defer until the sticker/magnet proof output format is validated.

### Category-Based Mosaic Clean Production Approval - Paused

Why it matters: universal medium is too blunt across pets, people, memorial images, babies/kids, and logos.

Implementation complexity: low for QA, medium for tuning.

Business impact: unlocks a safer public default after real-photo review.

Non-goals: no production approval from synthetic images alone.

Status: not approved. Current tuning was rejected as production criteria.

### Proof Operator Workflow

Why it matters: MosaPack's current promise depends on manual review before anything is made.

Implementation complexity: medium.

Business impact: improves trust and reduces fulfillment errors.

Non-goals: no public admin dashboard in the launch path.

## P1

- Operator proof review mode
- Manual profile, dither, and crop override
- Digital reveal pack export
- Before/after proof email template
- Better photo guidance and warnings

## P2

- Collaborative memory mosaic
- Event/corporate activation mode
- Large-format print/export
- AR wall preview
- Alternative cell shapes
- Community gallery

## Open-Source Audit Influence

Open-source audit should inform:

- Detail Priority Map v1
- Sticker and magnet production output
- Offline/operator comparison tooling
- Future worker-based variant generation

License guardrail: do not copy GPL code directly into MosaPack.
