# Optimize Layer — Implementation Spec (builder-v7)

Add an **"Optimize for build"** stage between upload/crop and mosaic render. Reference implementation: `docs/optimize/reference/mp_pipeline.py` — port its stage order + thresholds to TypeScript.

## Hard constraints (repo CLAUDE.md + invariants)
- **Append-only.** Do NOT modify `mosaic.ts` engine math, `palette.ts` Master-25 order, ΔE00, tile pitch 0.375″ / 16-panel. Do NOT rename/remove any `proof_request.v1` field — only add.
- Client-side; no server round-trip for analysis (privacy — children's photos).
- No new builder version; publish only `public/`; no prod deploy without approval.
- Engine golden check must still PASS on the **non-optimized** path (see QA).

## Dependencies (client, WASM, self-hosted)
- `@mediapipe/tasks-vision`: `ImageSegmenter` (selfie segmenter) + `FaceDetector` (BlazeFace short-range).
- **Self-host the `.tflite` models under `public/models/`** (selfie_segmenter ~250KB, blaze_face_short_range ~230KB) — do NOT depend on the Google CDN (hard download block observed; self-hosting also removes a runtime dependency). Lazy-load via dynamic import on first upload so first paint is unaffected.

## New module: `src/lib/optimize.ts`
Exports:
- `analyzePhoto(bitmap): IssueReport`
- `segmentSubject(bitmap): {mask: ImageData}` (MediaPipe ImageSegmenter)
- `detectFace(bitmap): FaceBox | null`
- `optimizeForBuild(bitmap, sizeIn, opts): {canvas: HTMLCanvasElement, report: IssueReport, appliedFixes: string[]}`

Stage order (from prototype — keep exactly):
1. **Orient** via `createImageBitmap(file, {imageOrientation:'from-image'})`.
2. **Working copy** downscaled to ~1024px long edge for analysis + segmentation (perf); keep full-res source for the final crop.
3. **Segment** → mask. Two derivations: soft (open + slight feather) for analysis; **hard eroded binary** (MinFilter≈11px-equiv, no feather) for compositing — prevents the blue edge-halo (edge tiles average subject+white → warm light, not cool blue).
4. **Face detect** → box (largest detection).
5. **Detectors → IssueReport** (schema below).
6. **Corrections (face-anchored), in order:** skin-anchored white balance (anchor to skin pixels inside the face box, gentle 0.6 strength) → backlight gamma lift on subject (γ 0.80, → 0.68 if face luma <0.42) → subject-wide skin warm-shift (skin px: B×0.93, R×1.03) → **face-box skin-target exposure** (lift detected face skin toward luma ~185, warm-preserving — less gain on B, cap 1.55×, confined to feathered face box) → contrast (~1.08) → [P2 denoise].
7. **Background flatten** to White (`#F4F4F4`) with the hard eroded mask. [P1: "simplify" (blur+desaturate real bg) as a user option.]
8. **Size-adaptive portrait-fill crop** (POLICY) → saturation (~1.06) → unsharp scaled to grid.
9. Return canvas → feed the **existing** mosaic renderer unchanged.

## IssueReport (TS interface + thresholds → response tier)
```ts
interface IssueReport {
  resolution: string; faces: number; subjectFillPct: number;      // fill<~15% → SUGGEST tighter crop
  faceLuma: number|null; frameLuma: number; backlit: boolean;      // face<frame-12 → AUTO lift
  faceSharpness: number; blurry: boolean;                          // varLaplacian<60 → SUGGEST sharpen / FLAG if <25
  clippedHiPct: number;                                            // >5% → SUGGEST highlight compress
  contrastStd: number; lowContrast: boolean;                       // std<38 → AUTO contrast
  greenCast: boolean; skinRgb: [number,number,number]|null;        // AUTO WB
  bgBusy: boolean; lowResFor24: boolean;                           // minDim<1200 → FLAG at 24"
}
```
Each issue → AUTO-FIX (apply silently), SUGGEST (apply + expose toggle), or FLAG (plain-language message + remedy; can't be auto-fixed: severe blur, occlusion, multi-face-at-small-size, too-low-res).

## Size-adaptive policy (fill fraction, bg mode, sharpen %)
| size | fill | bg | sharpen |
|---|---|---|---|
| 6″ | 0.86 | flatten | 60 |
| 12″ | 0.78 | flatten | 90 |
| 18″ | 0.72 | flatten(→simplify P1) | 110 |
| 24″ | 0.64 | flatten(→simplify P1) | 120 |

## UX integration
- New stage `'optimize'` in `App.tsx` state machine (between crop and preview), or folded into `PreviewStep`.
- Flow: crop approve → "Optimizing your photo…" (~1–2s) → **before/after toggle** (reuse existing compare overlay) + **"What we improved"** chips from `appliedFixes` (e.g., "brightened the face", "calmed the background", "cropped in closer") + any **FLAG** messages in plain language + an **"Adjust"** disclosure with toggles: Background (Flatten/Keep), Brightness (−/+), Zoom. Approve → mosaic.
- Default ON, with a **"Use original"** revert (respects the competitor "Original toggle" best practice).

## Proof payload (append-only — `builder-v7-source/src/lib/api.ts` + `netlify/functions/save-project.mjs`)
Add: `optimize_applied: boolean`, `optimize_fixes: string[]`, `bg_mode: string`, `issue_report: IssueReport`. Persist explicitly in `storedProject` (append-only), mirroring the existing v7 field pattern. Keep `schema_version: 'proof_request.v1'`, `save_version: 'v7'`.

## QA / acceptance
- **Golden check stays on the engine-only (optimize-OFF) path** so it remains an engine regression guard — the pilot tile_map hash `44a4a4…` must not change. Do NOT default-optimize the golden fixture path.
- New **optimize snapshot suite** (port `reference/render_final.py` + `reference/scenarios.py` logic): run a labeled set (good / backlit / busy-bg / loose / low-res / group / pet / color-cast) through `optimizeForBuild` at all sizes; assert subjectFill rises for loose, faceLuma lifts for dark, greenCast neutralized; snapshot mosaic index-grid hashes for regression.

## Phasing
- **P0 (do first):** segmentation + face + WB/backlight/skin-target + flatten + portrait-fill + preview + proof fields. Handles the majority of real uploads.
- **P1:** full detector suite + FLAG messaging + simplify-bg option + per-issue toggles + Original toggle.
- **P2:** denoise, highlight recovery, ML upscale, deskew, multi-face size nudge, text/graphic path, palette preflight.

## Known limitations to design around (from the prototype, honest)
- **Backlight rim-light** → cool edge tiles; needs alpha-matting + rim suppression (P2), beyond the binary-mask mitigation here.
- **Palette gap:** teal/cyan (mint shirt → Green). **Decision required from owner (Derek):** optionally append a teal to the END of Master-25 (safe — Simple/Balanced/Rich tier prefixes stay unchanged since they're prefixes; only Studio-25 gains it). Do NOT do unilaterally — palette order is load-bearing.
- Skin darker than palette's lightest tones → skin-target lift, capped to avoid over-bright/pastel.

## Handoff
Port `reference/mp_pipeline.py` → `src/lib/optimize.ts` matching stage order + thresholds. Branch + PR; run existing `verify-*` + the new optimize suite + the engine golden check; report repo/branch/commit/preview/verification per CLAUDE.md Review Handoff Rule.
