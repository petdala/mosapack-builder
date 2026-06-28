# B1.3 Visual CX Audit

Date: 2026-06-28
Branch: `feature/b1-3-visual-cx-audit`
Canonical builder: `public/builder/index.html`

## Scope

This audit reviewed the current MosaPack launch journey as a first-time pet owner or gift buyer. The review used the existing v6-derived canonical builder, with v7/v8 treated as pattern references only.

No B2 exact design save, checkout, supplier automation, public quality scores, hard email gate, new builder version, or framework migration was started.

## Screenshot Set

Screenshots are stored in `docs/mosapack/qa/b1-3-visual-cx/screenshots/`.

- `desktop-01-landing.png`
- `desktop-02-builder-initial.png`
- `desktop-03-crop-editor.png`
- `desktop-04-crop-zoom-drag.png`
- `desktop-05-generated-preview.png`
- `desktop-06-proof-section.png`
- `desktop-07-proof-modal.png`
- `desktop-08-scene-preview.png`
- `tablet-01-builder-initial.png`
- `tablet-02-crop-editor.png`
- `tablet-03-proof-cta.png`
- `mobile-01-builder-initial.png`
- `mobile-02-crop-editor.png`
- `mobile-03-proof-cta.png`
- `mobile-04-focus-proof-cta.png`

## Scores

| Area | Score | Evidence | Issues | Recommendation |
| --- | ---: | --- | --- | --- |
| First impression / trust | 3 | Landing and builder communicate pet preview, but old trust copy included physical-sale promises. | P1 | Fixed landing shipping/guarantee promises. Keep physical language proof-based. |
| Clarity of product | 4 | Hero and upload overlay state free pet mosaic preview. | P2 | Add stronger example output later. |
| Available now vs later | 4 | Builder says no checkout today and proof/launch access follow-up. | P1 | Fixed landing promises; keep B2 caveat in docs. |
| Upload friction | 4 | Upload overlay is obvious and first preview remains free. | P2 | Real-device upload still needed. |
| Crop/positioning clarity | 4 | Crop overlay says Position your pet and supports drag/zoom/reset. | P2 | Add keyboard crop controls later. |
| Preview emotional wow | 3 | Preview generates, but scene/product context remains secondary. | P2 | Before/after and better example scenes later. |
| Proof request clarity | 4 | Proof CTA appears after preview and says no checkout today. | P1 | Fixed automatic handoff to proof tab after generation. |
| Recommended format clarity | 3 | Card helps but still competes with product path controls. | P2 | Simplify product path further after B2. |
| Mobile usability | 3 | Core flow works, but layout is still dense. | P1 | Fixed pre-preview control noise and kept progress labels visible. |
| Keyboard/focus usability | 4 | Focus-visible exists and primary proof CTA can be focused. | P2 | Full keyboard traversal remains manual QA. |
| Visual hierarchy | 3 | Before fix, advanced controls competed with upload. | P1 | Fixed by hiding advanced rail/header controls until preview exists. |
| CTA hierarchy | 4 | Upload and proof CTA are now staged. | P1 | Fixed auto stage transition. |
| Copy consistency | 4 | Proof copy now avoids exact-design overpromise. | P2 | Continue removing checkout wording from internal class/comment names later only if useful. |
| Brand consistency | 4 | Teal/pink/gold brand is present; progress now uses brand tokens. | P2 | Reduce remaining legacy visual clutter later. |
| Accessibility | 4 | Labels, aria-pressed, focus-visible, status region present. | P2 | Add keyboard crop manipulation later. |
| Performance perception | 3 | Synchronous generation still pauses UI on larger images. | P2 | Web Worker or chunked processing later. |
| Production honesty / no overpromise | 4 | No public quality score or checkout success. Landing promises were corrected. | P1 | B2 remains required before real proof fulfillment. |

Overall score after fixes: 3.7 / 5.

## Specific Checklist Answers

1. User immediately knows this is for pet photos: yes.
2. User knows first preview is free: yes.
3. User knows physical kits are made-to-order/proof-based, not instant checkout: mostly yes after landing copy fix.
4. User knows checkout is disabled: yes.
5. Primary CTA is visually obvious: yes after hiding pre-preview advanced controls.
6. Too many competing buttons at once: improved, but still P2 after preview.
7. Layout feels like a guided flow or control panel: now closer to guided flow, but still not a full staged mobile redesign.
8. Proof request CTA visible at the right moment: yes after automatic handoff to Formats & Proofs.
9. Recommended format card reduces decisions or adds noise: mixed; helpful but still near too many product controls.
10. Mobile allocates enough space to image/crop/preview: adequate, not excellent.
11. Tap targets large enough: mostly yes.
12. Keyboard focus reveals path: yes for primary CTA; full traversal still needs manual QA.
13. Old-builder artifacts: visible advanced/export/baseplate language remains after preview; acceptable for now but P2.
14. Public promises before B2: fixed obvious landing physical-sale promises; proof remains intent-only.
15. Visual regressions from deleting emoji/Wobrick: no blocking regression observed.
16. Page feels worth paying for: partially; proof trust is better, but preview presentation needs richer product context later.

## P0 Issues

None found after smoke testing. Upload, crop, preview generation, proof CTA, and proof modal are functional. No raw file input is in the Netlify proof form.

## P1 Issues Found And Fixed

| Issue | Evidence | Fix |
| --- | --- | --- |
| Post-preview proof CTA was not on the active tab after generation. | Desktop/mobile generated states stayed in Create Preview while proof CTA lived in Formats & Proofs. | After preview generation, the app switches to Formats & Proofs and scrolls to the proof flow. |
| Initial builder exposed too much expert UI before the customer had a preview. | Initial desktop/mobile showed advanced rail/header controls such as enhance, adjust, palette, settings, view, display, and scene preview. | Advanced rail/header controls are hidden until `builder-has-preview` is set. |
| Progress indicator was not a persistent descriptive guide. | Initial state did not show the funnel, and mobile labels collapsed. | Four labeled stages are now visible: Upload, Position, Preview, Request Proof. |
| Progress styling used non-brand blue/green. | CSS used `#007bff` and `#28a745`. | Progress now uses MosaPack brand tokens. |
| Landing trust copy overpromised physical shipping/refund. | Public index promised free shipping, 5-7 day delivery, and money-back guarantee. | Replaced with digital-launch-first and design-review copy. |

## P2 Backlog

- Convert builder into a true mobile-first 4-stage layout instead of tabs plus dense panels.
- Move exports/downloads behind a low-priority Download options section after proof CTA.
- Simplify product path controls so one recommendation is primary and alternatives are secondary.
- Add before/after compare as a later v7-pattern extraction.
- Add optional clean-background or center-pet coaching later, without AI overclaiming.
- Add keyboard crop controls.
- Move processing to a worker or otherwise reduce synchronous generation blocking.
- Run 20-photo pet test set and real-device mobile QA.

## Design Debt Classification

Visible and harmful before fixes:

- Too many pre-preview advanced controls.
- Proof CTA was hidden behind a non-active tab.
- Landing physical shipping/refund promises were not launch-safe.

Visible but acceptable for launch:

- Settings, Baseplates, view modes, export/BOM mentions after preview.
- Checkout-disabled language, as long as it stays explicit and honest.

Hidden/internal:

- Internal CIEDE2000/deltaE function names.
- Internal JSON/BOM export functions.
- Internal `checkout` class/id names.

Docs only:

- B2 exact-design save requirements and supplier R&D notes.

## Fixes Implemented

- Added always-visible four-stage progress with descriptive labels.
- Kept mobile progress labels visible instead of only numbered dots.
- Changed progress colors to brand tokens.
- Added `builder-has-photo` and `builder-has-preview` UI state classes.
- Hid advanced rail/header controls until preview exists.
- Advanced user automatically from preview generation to Formats & Proofs.
- Scrolled to proof flow after generation.
- Reset returns user to Create Preview and clears staged UI classes.
- Softened unsafe landing trust copy.
- Added `scripts/verify-b1-3-visual-cx.sh`.

## Local Smoke Results

Passed:

- Upload surrogate image opens crop editor.
- Crop editor appears with drag/zoom/reset controls.
- Generate preview works.
- First preview remains free.
- Proof CTA appears after preview.
- Proof modal opens.
- Proof form has no raw file input.
- Recommended format card is present.
- Mobile proof CTA is reachable.
- Keyboard focus state can be shown on proof CTA.
- Browser console: 0 errors, 0 warnings.
- Local network: no local 404s observed; only external analytics abort/204 entries.
- No public Wobrick reference found.
- No visible public quality score added.
- Checkout remains disabled with honest copy.

## Production Readiness Recommendation

Do not production deploy from this task yet. Preview deploy only.

The builder is materially safer and clearer after B1.3, but production approval still requires Derek's manual QA:

- 20-photo pet test set.
- Real mobile device upload/crop/generate test.
- Live Netlify proof-request submission on the preview deploy.

If manual B1/B1.2/B1.3 QA passes, the next true build gate is B2 exact design save.
