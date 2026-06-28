#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILDER="$ROOT/public/builder/index.html"
FAIL=0

require_rg() {
  local pattern="$1"
  local file="$2"
  local label="$3"
  if ! rg -q "$pattern" "$file"; then
    echo "MISSING: $label"
    FAIL=1
  fi
}

if [ ! -f "$BUILDER" ]; then
  echo "MISSING: public/builder/index.html"
  exit 1
fi

require_rg "Position your pet" "$BUILDER" "crop editor heading"
require_rg "Drag to center the face" "$BUILDER" "drag-to-pan instruction"
require_rg "id=\"cropCanvas\"" "$BUILDER" "crop preview canvas"
require_rg "id=\"cropZoomSlider\"" "$BUILDER" "zoom slider"
require_rg "Reset crop" "$BUILDER" "reset crop control"
require_rg "Fit photo" "$BUILDER" "fit photo control"
require_rg "Looks good.*generate preview" "$BUILDER" "generate preview crop action"
require_rg "b1-crop-v1" "$BUILDER" "crop state version"
require_rg "cropState" "$BUILDER" "crop state object"
require_rg "function initializeCropEditor" "$BUILDER" "crop editor initializer"
require_rg "function getCropSourceRect" "$BUILDER" "crop source rectangle sampler"
require_rg "drawImage\(currentImage, sx, sy, sw, sh" "$BUILDER" "mosaic generation uses cropped source"
require_rg "Your pet may be too close to the edge" "$BUILDER" "crop edge warning copy"

require_rg "/assets/scenes/office-1920x1080\.jpg" "$BUILDER" "root office scene path"
require_rg "/assets/scenes/gallery-1920x1080\.jpg" "$BUILDER" "root gallery scene path"
require_rg "/assets/scenes/kids-room-1920x1080\.jpg" "$BUILDER" "root kids-room scene path"
require_rg "/assets/scenes/cafe-1920x1080\.jpg" "$BUILDER" "root cafe scene path"
require_rg "aria-label=" "$BUILDER" "accessible control labels"
require_rg "focus-visible" "$BUILDER" "visible keyboard focus style"
require_rg "role=\"img\"" "$BUILDER" "canvas text alternative"
require_rg "aria-pressed" "$BUILDER" "toggle selected state"

require_rg "MosaPack Custom Pet Mosaic Builder" "$BUILDER" "single accessible builder h1"
require_rg "Create a free pet mosaic preview" "$BUILDER" "free preview public copy"
require_rg "Made-to-order custom proof" "$BUILDER" "made-to-order proof public copy"
require_rg "Custom quote" "$BUILDER" "custom quote public copy"
require_rg "Checkout is temporarily disabled while we finalize launch access" "$BUILDER" "honest disabled checkout copy"
require_rg "id=\"builderStatus\"" "$BUILDER" "polite builder status region"
require_rg "function showStatus" "$BUILDER" "live status updater"
require_rg "aria-label=\"Open saved design summary\"" "$BUILDER" "saved design summary accessible label"

for field in crop_x crop_y crop_zoom focal_point_x focal_point_y crop_version; do
  require_rg "name=\"$field\"" "$BUILDER" "save-design crop metadata field $field"
done

require_rg "mosapack-save-design" "$BUILDER" "save-design Netlify form"
require_rg "data-netlify=\"true\"" "$BUILDER" "Netlify form marker"
require_rg "name=\"form-name\" value=\"mosapack-save-design\"" "$BUILDER" "save-design hidden form-name"

if rg -n "/builder/assets/scenes/|-[Tt]humb\.jpg" "$BUILDER"; then
  echo "Forbidden stale scene asset reference found."
  FAIL=1
fi

if rg -n -i "ConvertKit|Kit API|YOUR_PIXEL_ID|order placed|checkout success|quality score|museum quality score|94% match|gold quality|silver quality|bronze quality|\bSSIM\b|ΔE" "$BUILDER"; then
  echo "Forbidden public provider/fake-success/quality-metric language found in builder."
  FAIL=1
fi


if rg -n "builder-pro-v5|builder-pro-v6|builder-pro-v7|builder-optimized-v8|Builder Pro v6|PRO v6" "$BUILDER"; then
  echo "Forbidden public raw/versioned builder language found in canonical builder."
  FAIL=1
fi

if rg -n -i "founder|prototype|beta|pilot|validation|test batch|interest-only|help us validate" "$BUILDER"; then
  echo "Forbidden startup-validation language found in builder public UI."
  FAIL=1
fi

if rg -n "💩|😊|🙂|✨|🎯|⬆️|✏️|🗂️|🗂|🎨|⚙️|📄|📊|💾|🖼" "$BUILDER"; then
  echo "Forbidden emoji/symbol functional control copy found in builder."
  FAIL=1
fi

if rg -n "#4c6fff|#b3277e|#ff6b35|--accent-purple|--accent-orange|purple|indigo" "$BUILDER"; then
  echo "Forbidden obvious off-brand token drift found in builder."
  FAIL=1
fi

if perl -0ne 'while (/<form\b[^>]*(?:data-netlify|netlify)[^>]*>.*?<\/form>/sig) { if ($& =~ /type=["'"'"' ]file["'"'"' ]/i) { exit 1 } }' "$ROOT/public/index.html" "$ROOT/public/builder/index.html" "$ROOT/public/contact/index.html"; then
  echo "B1 Netlify form file-upload check: no raw image/file uploads in Netlify forms."
else
  echo "B1 Netlify form file-upload check failed: a Netlify form includes a file input."
  FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then
  echo "B1 crop control verification failed."
  exit 1
fi

echo "B1 crop control verification passed."
