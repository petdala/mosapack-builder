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
