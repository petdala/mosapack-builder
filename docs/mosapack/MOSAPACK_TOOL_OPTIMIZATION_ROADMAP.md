# MosaPack Tool Optimization Roadmap

Date: 2026-07-05
Status: roadmap document created on `feature/mosaic-clean-category-profiles-v1`.

## Current Gate

Synthetic-safe category-profile review supports option C directionally: category-based defaults.

Private real-photo validation is still required before production deploy, paid proof credit, or paid fulfillment.

## P0

### Photo Suitability Coach v1

Why it matters: users need fast guidance before generating noisy mosaics from dark, blurry, distant, or busy photos.

Implementation complexity: medium.

Business impact: reduces bad proof requests and manual support time.

Non-goals: no public numeric score, no public SSIM, no public DeltaE, no quality badge.

### Detail Priority Map v1

Why it matters: cleanup must protect eyes, mouths, pet faces, logo borders, text-like details, and silhouettes.

Implementation complexity: medium-high.

Business impact: improves visual likeness and reduces over-smoothing risk.

Non-goals: no identity-changing generation, no fake overlay preview, no final image that cannot be built.

### Category-Based Mosaic Clean Production Approval

Why it matters: universal medium is too blunt across pets, people, memorial images, babies/kids, and logos.

Implementation complexity: low for QA, medium for tuning.

Business impact: unlocks a safer public default after real-photo review.

Non-goals: no production approval from synthetic images alone.

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
