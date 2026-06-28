# MosaPack Execution Board V2

This clean repo is for A0/A1/A2/A3/A4 foundation work only. Do not expand product scope or create new builder versions from this file.

## Current Operating Constraints

- Digital launches first.
- Physical R&D runs in parallel and does not block digital.
- Upload builder remains core.
- First monetized product is the $12–15 digital Mystery Pet Reveal Pack.
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
