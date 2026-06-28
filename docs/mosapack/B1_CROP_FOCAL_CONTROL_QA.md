# B1 Crop / Zoom / Focal Control QA

## Purpose

B1 adds a simple crop-positioning step to the existing canonical MosaPack builder so pet photos can be centered before mosaic generation. The goal is to reduce obvious face clipping without adding a new builder version, a paid gate, external libraries, or public quality scores.

## Files Changed

- `public/builder/index.html`
- `scripts/verify-b1-crop-control.sh`
- `docs/mosapack/B1_CROP_FOCAL_CONTROL_QA.md`

## Behavior Summary

- Uploading a photo opens the crop editor before generation.
- The crop editor shows a visible square crop frame with a preview canvas.
- Users can drag the photo to reposition the focal area.
- Users can zoom with a slider.
- Reset crop / Fit photo centers and fits the crop rectangle.
- "Looks good - generate preview" creates the mosaic from the cropped source rectangle.
- The first generated preview remains free and is not blocked by email.
- Save-design capture includes crop metadata, not raw image data.

## Manual QA Checklist

1. Open `/builder/`.
2. Upload a pet photo.
3. Confirm the crop editor appears with "Position your pet".
4. Drag the image and confirm the crop preview changes.
5. Move the zoom slider and confirm the preview zooms around the current focal point.
6. Click "Reset crop" and confirm the preview recenters/fits.
7. Pan near an edge or zoom while near an edge and confirm the warning appears.
8. Click "Looks good - generate preview".
9. Confirm the mosaic preview reflects the crop position.
10. Confirm no email is required before the first preview.
11. Open Save Preview and confirm the Netlify form still submits metadata only.
12. Confirm no public quality score, percent, medal label, public SSIM badge, or public Delta E badge was added by B1.

## 20-Photo Pet Test Set

Use 20 varied pet photos manually:

- close-up dog face
- full-body dog
- close-up cat face
- full-body cat
- dark pet on dark background
- light pet on light background
- pet near left edge
- pet near right edge
- pet near top edge
- pet near bottom edge
- wide landscape photo
- tall portrait photo
- low-resolution phone photo
- high-resolution photo
- multiple pets
- pet with human
- pet with busy background
- pet with white fur
- pet with black fur
- cropped social-media photo

Success metric: at least 19/20 should be positionable without obvious clipping after user adjustment.

## Acceptance Criteria

1. User can upload a pet photo.
2. User can drag to reposition before generating.
3. User can zoom before generating.
4. Reset centers/fits photo.
5. Crop warning appears when image/crop is near edge.
6. Generated preview reflects crop position.
7. First preview remains free.
8. Save-design form captures crop metadata.
9. Netlify Forms still pass verification.
10. No public quality score/badge appears.

## Known Limitations

- B1 does not perform computer-vision subject detection.
- The edge warning is heuristic and based on crop position, not pet-face detection.
- Crop frame currently follows the square output grid used by the existing builder sizes.
- Browser manual QA with real pet photos is still required before production approval.

## Definition Of Done

B1 is done when automated checks pass and Derek verifies the 20-photo pet test set in a browser, with at least 19/20 photos positionable without obvious clipping.

## Release Hardening Update

- Scene image 404 root cause: the builder runs at `/builder/`, so relative paths like `assets/scenes/office-1920x1080.jpg` resolved to missing `/builder/assets/scenes/...` URLs.
- Fix applied: scene and bundle preview references now use root-relative `/assets/scenes/...` URLs for office, gallery, kids-room, and cafe assets.
- Thumbnail fallback decision: missing `*-thumb.jpg` references were removed; thumbnail/fallback fields now point to the existing full-size scene images until dedicated thumbnails exist.
- Accessibility fixes applied: added a visible focus ring, one hidden page `h1`, accessible names for icon and symbol controls, ARIA pressed state for view/display toggles, keyboard activation for scene choices, and canvas text alternatives.
- Brand-token fixes applied: the builder purple accent variable and obvious purple hard-coded scene accents were replaced with the MosaPack pink accent.
- Public quality metric cleanup: visible SSIM and Delta E metric labels were replaced with plain user-facing match/detail language. Internal color matching code remains unchanged.
- Console status: normal builder scene assets should no longer produce `/builder/assets/scenes/...` or `*-thumb.jpg` 404s.
- First-preview flow: generation no longer opens the save-design email gate automatically; Save actions open the metadata-only form when the user asks to save.
- Remaining manual QA: Derek still needs to run the 20-photo pet test set in a browser before production approval.
- Known limitations: B1 still uses manual crop positioning and heuristic edge warnings; it does not add computer-vision subject detection, checkout, or a new builder version.
## B1.1 Trust + Accessibility Hardening

- Canonical builder decision: `public/builder/index.html` is the only production builder.
- Historical lineage: the canonical builder is v6-derived; v5 is superseded and must not receive back-ports.
- Public route rule: do not expose raw versioned builder files or routes.
- Format-gating copy: free pet preview is active; digital launch access is first paid path; sticker/magnetic/brick products use made-to-order proof or quote language.
- Public language rule: no founder/prototype/beta/pilot/validation/test-batch wording in public builder UI.
- Emoji removal summary: functional emoji controls were replaced with visible text labels or non-emoji control copy.
- Accessibility fixes: retained one meaningful hidden `h1`, accessible control names, focus-visible ring, ARIA pressed toggles, canvas accessible label, and polite status updates.
- Badge/toggle cleanup: view/display/mode controls use clearer text and active-state semantics.
- Brand-token verification: builder uses teal, hot pink, gold, light background, and Inter; obvious old blue secondary token was removed.

Remaining manual QA:

- 20-photo pet test set.
- Mobile check.
- Keyboard/focus check.
- Preview deploy check.

## B1.2 Proof Request QA Addendum

- Confirm the post-preview proof section stays hidden before generation.
- Confirm it appears after successful preview generation.
- Confirm “Request My Custom Proof” opens the metadata-only Netlify form.
- Confirm the form captures `request_type`, `proof_requested`, and `recommended_format`.
- Confirm no raw image/file input appears inside the Netlify form.
- Confirm first preview remains free and is not email-gated.
- Confirm Wobrick/supplier ordering paths are absent from public builder UI and source.

## B1.3 Visual CX Audit Update

B1.3 visual QA confirmed the upload/crop/preview/proof path works locally, but manual QA is still required before production approval. The visual fix moved the post-preview journey to the Formats & Proofs stage, hid advanced controls until preview generation, and kept the proof request metadata-only.

B2 exact design save remains the next true build gate before real proof fulfillment, paid custom proof, or physical checkout.
