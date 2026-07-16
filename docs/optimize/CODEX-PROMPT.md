# Codex prompt — build the "Optimize for build" photo-intake layer

Paste everything below into Codex, run from the `petdala/mosapack-builder` repo root.

---

**Task:** Implement the "Optimize for build" photo-preprocessing layer in the MosaPack builder, following `docs/optimize/BUILD-SPEC.md` exactly. The reference algorithm is `docs/optimize/reference/mp_pipeline.py` (Python, this is the source of truth for stage order + thresholds) — port it to TypeScript. Build **P0 only** in this pass.

**Read first:** `CLAUDE.md`, `docs/optimize/BUILD-SPEC.md`, `docs/optimize/reference/mp_pipeline.py`, `builder-v7-source/src/lib/mosaic.ts`, `builder-v7-source/src/lib/palette.ts`, `builder-v7-source/src/lib/api.ts`, `builder-v7-source/src/App.tsx`, `builder-v7-source/src/components/PreviewStep.tsx`, `netlify/functions/save-project.mjs`.

**Non-negotiable constraints:**
- Append-only. Do NOT modify the mosaic engine math in `mosaic.ts`, the `palette.ts` Master-25 order, ΔE00, or the tile pitch / 16-panel constants. Do NOT rename or remove any `proof_request.v1` field — only add new ones.
- No new builder version file; publish only `public/`; do not deploy to prod.
- The engine golden check must still PASS unchanged (pilot tile_map sha `44a4a42935f8e74d8ee8c80316eb3cd2a963d125aea5520b49a7c66587f6bcb5`) — run the golden fixture on the **optimize-OFF** path so it stays an engine regression guard. Do not default-optimize the golden path.

**P0 scope (build this):**
1. `src/lib/optimize.ts` — port the reference pipeline: MediaPipe `ImageSegmenter` (selfie) + `FaceDetector` (BlazeFace short-range), the detector suite producing `IssueReport`, and the face-anchored corrections in the exact stage order from the spec (skin-anchored WB → backlight gamma lift → subject-wide skin warm-shift → face-box skin-target exposure → contrast → background flatten to `#F4F4F4` with a hard eroded mask → size-adaptive portrait-fill crop → saturation → grid-scaled unsharp). Exports `analyzePhoto`, `segmentSubject`, `detectFace`, `optimizeForBuild(bitmap, sizeIn, opts)`.
2. **Self-host** the two `.tflite` models under `public/models/` (selfie_segmenter, blaze_face_short_range) and load them from there — do NOT depend on the Google CDN. Lazy-load `@mediapipe/tasks-vision` via dynamic import on first upload so first paint is unaffected.
3. Wire a new `'optimize'` stage into `App.tsx` between crop and preview (or fold into `PreviewStep`): "Optimizing…" ~1–2s → before/after toggle (reuse the existing compare overlay) → "What we improved" chips from `appliedFixes` → any FLAG messages in plain language → an "Adjust" disclosure (Background Flatten/Keep, Brightness, Zoom) → Approve. Default ON with a "Use original" revert.
4. Feed the optimized canvas into the **existing** mosaic renderer unchanged.
5. Append to the proof payload in `api.ts` and persist in `save-project.mjs` (append-only): `optimize_applied`, `optimize_fixes`, `bg_mode`, `issue_report`. Keep `schema_version:'proof_request.v1'`, `save_version:'v7'`.
6. Add an **optimize snapshot test suite** (port the logic in `reference/render_final.py` + `reference/scenarios.py`): run a small labeled photo set through `optimizeForBuild` at 6/12/18/24 and assert subject-fill rises for loose framing, face luma lifts for dark inputs, green cast neutralized; snapshot mosaic index-grid hashes for regression.

**Do NOT build in this pass (leave as documented P1/P2):** simplify-background option, per-issue toggles, denoise, highlight recovery, upscaling, deskew, multi-face handling, text/graphic path, palette preflight.

**Open decision — do NOT act on it, surface it to Derek:** the palette has no teal/cyan, so mint/teal clothing maps to Green. The spec proposes optionally appending a teal to the END of Master-25 (safe for tier prefixes). Leave a note in the PR asking Derek to decide; do not change the palette.

**Verify before finishing:** build the app; run existing `scripts/verify-*` relevant checks; run the engine golden check on the optimize-OFF path and confirm the tile_map hash is unchanged; run the new optimize snapshot suite. Then report per the CLAUDE.md Review Handoff Rule: repo path, branch, commit, preview URL if any, verification results, and the review-package path. Push to a branch and open a PR — do not merge to main or deploy without Derek's approval.

---
