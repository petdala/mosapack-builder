#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAIL=0
BUILDER="$ROOT/public/builder/index.html"
PRIVACY="$ROOT/public/legal/privacy.html"

require_file() {
  local file="$1"
  if [ ! -f "$ROOT/$file" ]; then
    echo "MISSING B2 file: $file"
    FAIL=1
  fi
}

require_file "netlify/functions/save-project.mjs"
require_file "netlify/functions/get-project.mjs"
require_file "netlify/functions/delete-project.mjs"
require_file "package.json"

if [ -f "$ROOT/package.json" ] && ! rg -q '"@netlify/blobs"' "$ROOT/package.json"; then
  echo "MISSING @netlify/blobs dependency in package.json"
  FAIL=1
fi

if ! rg -q 'directory[[:space:]]*=[[:space:]]*"netlify/functions"' "$ROOT/netlify.toml"; then
  echo "MISSING Netlify Functions directory in netlify.toml"
  FAIL=1
fi

if ! rg -q '/\.netlify/functions/save-project' "$BUILDER"; then
  echo "MISSING save-project client call in builder"
  FAIL=1
fi

if ! rg -q 'designStorageConsent' "$BUILDER" || ! rg -q 'temporarily store this design and preview image|I consent to save my cropped preview and mosaic details|I’d like MosaPack to review my design and follow up by email|I’d like MosaPack to check my design and follow up by email' "$BUILDER"; then
  echo "MISSING design storage consent checkbox/copy in proof modal"
  FAIL=1
fi

for field in 'name="project_id"' 'name="project_saved"' 'name="save_version"' 'name="design_storage"'; do
  if ! rg -q "$field" "$BUILDER"; then
    echo "MISSING Netlify form metadata field: $field"
    FAIL=1
  fi
done

if perl -0ne 'while (/<form\b[^>]*id="emailGateForm"[^>]*>.*?<\/form>/sig) { if ($& =~ /type=["'\'' ](?:file|image)["'\'' ]/i || $& =~ /name=["'\'' ][^"'\''>]*(?:data_url|image_data|preview_image|cropped_source)[^"'\''>]*["'\'' ]/i) { exit 1 } }' "$BUILDER"; then
  echo "Netlify proof form image-payload check: metadata only."
else
  echo "Netlify proof form image-payload check failed."
  FAIL=1
fi

if ! rg -q -i 'Custom proof design storage|proof design storage' "$PRIVACY"; then
  echo "MISSING privacy policy custom proof design storage section"
  FAIL=1
fi

if rg -n 'MOSA_ADMIN_TOKEN[[:space:]]*=[[:space:]]*[A-Za-z0-9]' "$ROOT/public" "$ROOT/netlify/functions" >/tmp/mosapack-b2-public-admin-token.txt; then
  echo "POSSIBLE public admin token assignment found:"
  cat /tmp/mosapack-b2-public-admin-token.txt
  FAIL=1
fi
rm -f /tmp/mosapack-b2-public-admin-token.txt

if rg -n -i 'quality score|museum quality score|94% match|gold quality|silver quality|bronze quality|\bSSIM\b|ΔE' "$BUILDER" >/tmp/mosapack-b2-public-quality.txt; then
  echo "FORBIDDEN public quality score/badge language found in builder:"
  cat /tmp/mosapack-b2-public-quality.txt
  FAIL=1
fi
rm -f /tmp/mosapack-b2-public-quality.txt

if rg -n -i 'wobrick|wobrick.com|downloadWobrick|supplier comparison' "$ROOT/public" >/tmp/mosapack-b2-public-wobrick.txt; then
  echo "FORBIDDEN Wobrick public CTA/path found:"
  cat /tmp/mosapack-b2-public-wobrick.txt
  FAIL=1
fi
rm -f /tmp/mosapack-b2-public-wobrick.txt

if rg -n -i 'order placed|checkout successful|payment received|fake checkout|buy now' "$ROOT/public/index.html" "$BUILDER" "$ROOT/public/contact/index.html" >/tmp/mosapack-b2-public-checkout.txt; then
  echo "FORBIDDEN checkout/payment language found in public launch files:"
  cat /tmp/mosapack-b2-public-checkout.txt
  FAIL=1
fi
rm -f /tmp/mosapack-b2-public-checkout.txt

if [ "$FAIL" -ne 0 ]; then
  echo "B2 exact design save verification failed."
  exit 1
fi

echo "B2 exact design save verification passed."
