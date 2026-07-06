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
  if rg -n -i "$pattern" "$file" >/tmp/mosapack-buildable-proof-hit.txt; then
    echo "FORBIDDEN: $message"
    cat /tmp/mosapack-buildable-proof-hit.txt
    FAIL=1
  fi
  rm -f /tmp/mosapack-buildable-proof-hit.txt
}

require_rg 'function getBuildableProofState' "$BUILDER" 'buildable proof state helper'
require_rg 'function generateProofPreviewPng' "$BUILDER" 'proof preview PNG helper'
require_rg 'function generateOptimizedSourcePng' "$BUILDER" 'optimized source PNG helper'
require_rg 'function generateNumberedGridSvg' "$BUILDER" 'numbered grid SVG helper'
require_rg 'function generateColorLegendHtmlOrSvg' "$BUILDER" 'color legend helper'
require_rg 'function generateProductionJson' "$BUILDER" 'production JSON helper'
require_rg 'function generateProofEmailImage' "$BUILDER" 'proof email image helper'
require_rg 'function downloadBuildableProofFile' "$BUILDER" 'proof export download helper'
require_rg 'Proof Export Tools' "$BUILDER" 'operator export UI label'
require_rg 'Generate buildable proof files for manual review\. Not shown to customers by default\.' "$BUILDER" 'operator export helper copy'

if ! perl -0ne 'exit(/<details[^>]+id="advancedTools"[\s\S]*?Proof Export Tools[\s\S]*?<\/details>/ ? 0 : 1)' "$BUILDER"; then
  echo "MISSING: Proof Export Tools must live inside collapsed Advanced tools"
  FAIL=1
fi

if perl -0ne 'if (/<section class="post-preview-flow"[\s\S]*?<\/section>/) { exit(index($&, "Proof Export Tools") >= 0 ? 0 : 1) } exit 1' "$BUILDER"; then
  echo "FORBIDDEN: Proof Export Tools must not be in main public proof flow"
  FAIL=1
fi

require_rg '/\.netlify/functions/save-project' "$BUILDER" 'B2 save-project call'
require_rg 'name="mosapack-save-design"' "$BUILDER" 'Netlify proof form'
require_rg 'name="project_id"' "$BUILDER" 'project_id hidden field'
require_rg 'id="designStorageConsent"' "$BUILDER" 'design storage consent checkbox'

if perl -0ne 'while (/<form\b[^>]*id="emailGateForm"[^>]*>.*?<\/form>/sig) { if ($& =~ /type=["'\'' ](?:file|image)["'\'' ]/i || $& =~ /name=["'\'' ][^"'\''>]*(?:proof_preview|optimized_source|numbered_grid|color_legend|production_json|email_image|svg|pdf|data_url|image_data|preview_image|cropped_source)[^"'\''>]*["'\'' ]/i) { exit 1 } }' "$BUILDER"; then
  echo "Netlify proof form export/raw image check: metadata only."
else
  echo "FORBIDDEN: Netlify proof form includes raw image/export fields"
  FAIL=1
fi

require_no_rg 'Pay \$10|Stripe|Payment Link|PUBLIC_STRIPE|buy\.stripe\.com|checkout successful|payment received|order placed' "$BUILDER" 'checkout/payment strings'
require_no_rg 'supplier API|supplier webhook|printful|printify|sticker mule api|stickeryou api' "$BUILDER" 'supplier API strings'
if rg -n -i 'quality score|\bSSIM\b|ΔE|Gold quality|Silver quality|Bronze quality|gold quality|silver quality|bronze quality' "$BUILDER" >/tmp/mosapack-buildable-proof-quality.txt; then
  echo "FORBIDDEN: public quality score terms"
  cat /tmp/mosapack-buildable-proof-quality.txt
  FAIL=1
fi
rm -f /tmp/mosapack-buildable-proof-quality.txt

if [ "$FAIL" -ne 0 ]; then
  echo "Buildable proof output verification failed."
  exit 1
fi

echo "Buildable proof output verification passed."
