#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILDER="$ROOT/public/builder/index.html"
FAIL=0

require_rg() {
  local pattern="$1"
  local file="$2"
  local message="$3"
  if ! rg -q "$pattern" "$file"; then
    echo "MISSING: $message"
    FAIL=1
  fi
}

require_no_rg() {
  local pattern="$1"
  local file="$2"
  local message="$3"
  if rg -n -i "$pattern" "$file" >/tmp/mosapack-mosaic-clean-hit.txt; then
    echo "FORBIDDEN: $message"
    cat /tmp/mosapack-mosaic-clean-hit.txt
    FAIL=1
  fi
  rm -f /tmp/mosapack-mosaic-clean-hit.txt
}

for term in \
  'applyMosaicCleanPreprocess' \
  'cleanupMappedMosaic' \
  'mosaic-clean-(v1|category-profiles-v1)' \
  'mosaicCleanMeta' \
  'settings\.mosaicClean' \
  'getMosaicCleanOptions' \
  'buildabilityCleanup' \
  'preprocess'
do
  require_rg "$term" "$BUILDER" "Mosaic Clean source term: $term"
done

for preserved in \
  '/\.netlify/functions/save-project' \
  'mosapack-save-design' \
  'project_id' \
  'designStorageConsent' \
  'mosaicCanvas' \
  'cropCanvas'
do
  require_rg "$preserved" "$BUILDER" "preserved builder contract: $preserved"
done

require_rg 'dithering:[[:space:]]*'\''ordered'\''' "$BUILDER" 'ordered dithering default'
require_rg 'getMosaicCleanMeta' "$BUILDER" 'debug metadata helper'

require_no_rg 'Wobrick|wobrick\.com|downloadWobrick' "$BUILDER" 'Wobrick public references'
require_no_rg 'Pay \$10|Stripe|Payment Link|PUBLIC_STRIPE|buy\.stripe\.com' "$BUILDER" 'payment UI/copy'
require_no_rg 'Costs & Checkout|Estimated total|Launch access disabled|Checkout disabled' "$BUILDER" 'active checkout/cost copy'

if rg -n 'quality score|SSIM|DeltaE|ΔE|\bGold\b|\bSilver\b|\bBronze\b|gold quality|silver quality|bronze quality' "$BUILDER" >/tmp/mosapack-mosaic-clean-quality.txt; then
  echo "FORBIDDEN: public quality score or internal metric terms in builder UI/source"
  cat /tmp/mosapack-mosaic-clean-quality.txt
  FAIL=1
fi
rm -f /tmp/mosapack-mosaic-clean-quality.txt

if [ "$FAIL" -ne 0 ]; then
  echo "Mosaic Clean preprocess verification failed."
  exit 1
fi

echo "Mosaic Clean preprocess verification passed."
