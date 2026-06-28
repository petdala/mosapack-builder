# MosaPack Execution Board V2

This clean repo is for A0/A1/A2/A3/A4 foundation work only. Do not expand product scope or create new builder versions from this file.

## Current Operating Constraints

- Digital launches first.
- Physical R&D runs in parallel and does not block digital.
- Upload builder remains core.
- First monetized product is the $12-15 digital Mystery Reveal Pack.
- No new builder/app/partner system/internal reporting UI/automation/public quality score until first 5 orders are fulfilled.
- No physical sale until sample, safety, assembly, shipping, and landed-margin gates pass.

## A3 — Netlify Forms Capture Verification

A3 — Verify waitlist/save/contact capture writes to Netlify Forms; export manually until funnel proves demand.

Definition of Done:
- Waitlist form submission appears in Netlify Forms.
- Save-design form submission appears in Netlify Forms.
- Contact form submission appears in Netlify Forms.
- No Kit/ConvertKit dependency remains.
- Manual CSV export works.

Metric:
- 3/3 forms captured end-to-end.

Stop Rule:
- If Netlify Forms capture fails, do not start traffic/E-stream work.

Note:
- Paid ESP/automation is deferred until after 3–5 paid customers or meaningful list growth. Do not add Kit/ConvertKit.

### Canonical Builder Protocol

- Production builder: `public/builder/index.html`.
- Approved lineage: v6-derived canonical builder.
- v5 is superseded; do not back-port or expose raw builder versions.
- Forbidden public raw files include `builder-pro-v5.html`, `builder-pro-v6.html`, `builder-pro-v7.html`, and `builder-optimized-v8.html`.

## B2 - Exact Design Save Gate

B2 exact design save is the next build gate after B1/B1.2 QA.

Proof request capture is not enough unless the exact approved design is retrievable. Current B1.2 proof requests capture metadata only; they do not persist the source image, cropped source, generated mosaic output, preview PNG, or project JSON.

B2 must persist the exact approved design before real proof fulfillment, physical checkout, paid custom proof, or any workflow that implies Derek can immediately review the approved mosaic.

## Physical Supplier R&D Workstream

Physical products remain proof/quote paths until supplier R&D gates pass.

Required workstream:

- contact StickerYou
- contact Printful
- request Maghard/JASDI quotes
- prototype 8mm vs 3/4 inch pieces
- test assembly with 3 people
- test shipping/packaging
- model landed cost
- no instant physical checkout until gates pass

## B1.4 Brand Architecture Correction

MosaPack core positioning is photo-agnostic: turn any meaningful photo into a custom mosaic reveal kit. Pets remain the first GTM vertical and a strong campaign example, but the canonical builder should not be pet-only.

What changed:

- Global builder copy now uses photo, image, subject, gift, and custom proof language.
- Pet-specific copy remains only as example/campaign language.
- Proof request metadata includes `photo_category` so future verticals can reuse the same builder.
- B2 exact design save must support multiple photo categories and must not fork the builder by vertical.

New success test: can a user with a pet, couple, family, memorial, baby/kids, corporate/logo, holiday, or other meaningful photo understand the preview to proof path?
