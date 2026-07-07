#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILDER="$ROOT/public/builder/index.html"
FAIL=0

require_term() {
  local term="$1"
  local message="$2"
  if ! rg -q "$term" "$BUILDER"; then
    echo "MISSING: $message"
    FAIL=1
  fi
}

forbidden_public() {
  local pattern="$1"
  local message="$2"
  if rg -n -i "$pattern" "$BUILDER" >/tmp/mosapack-category-profile-ban.txt; then
    echo "FORBIDDEN: $message"
    cat /tmp/mosapack-category-profile-ban.txt
    FAIL=1
  fi
  rm -f /tmp/mosapack-category-profile-ban.txt
}

require_term "MOSAIC_CLEAN_CATEGORY_PROFILES" "category profile table"
require_term "getMosaicCleanProfileForCategory" "profile resolver"
require_term "getResolvedMosaicCleanProfile" "resolved profile helper"
require_term "photoCategorySelect" "upload category selector"
require_term "Auto / Not sure" "auto category option"
require_term "What kind of photo is this\\?" "category selector label"
require_term "This helps us tune your mosaic preview\\." "category selector helper copy"
require_term "pet:[[:space:]]*\\{" "pet profile"
require_term "strength:[[:space:]]*['\"]medium['\"]" "medium profile strength"
require_term "memorial:[[:space:]]*\\{" "memorial profile"
require_term "dither:[[:space:]]*['\"]none['\"]" "none dither profile"
require_term "corporate_logo:[[:space:]]*\\{" "corporate/logo profile"
require_term "mosaic-clean-category-profiles-v1" "category profile preprocess version"
require_term "selected_photo_category" "B2 selected category metadata"
require_term "resolved_profile" "B2 resolved profile metadata"
require_term "mosaic_clean_profile" "Netlify Forms profile metadata"
require_term "mosaic_clean_strength" "Netlify Forms strength metadata"
require_term "mosaic_clean_dither" "Netlify Forms dither metadata"
require_term "mosaic_clean_cleanup_mode" "Netlify Forms cleanup metadata"
require_term "/.netlify/functions/save-project" "save-project reference"
require_term "project_id" "project_id field"
require_term "designStorageConsent" "design storage consent checkbox"

forbidden_public "\\bSSIM\\b" "public SSIM text"
forbidden_public ">[^<]*(DeltaE|ΔE)[^<]*<" "public DeltaE text"
forbidden_public "quality score" "public quality score text"
forbidden_public ">[^<]*(Gold|Silver|Bronze)[^<]*<" "public quality badge labels"
forbidden_public 'Pay \$10|Stripe|Costs & Checkout|Checkout disabled|Launch access disabled' "checkout/payment UI text"

if [ "$FAIL" -ne 0 ]; then
  echo "Mosaic Clean category profiles verification failed."
  exit 1
fi

echo "Mosaic Clean category profiles verification passed."
