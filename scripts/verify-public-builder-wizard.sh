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
  if rg -n -i "$pattern" "$file" >/tmp/mosapack-wizard-hit.txt; then
    echo "FORBIDDEN: $message"
    cat /tmp/mosapack-wizard-hit.txt
    FAIL=1
  fi
  rm -f /tmp/mosapack-wizard-hit.txt
}

require_rg 'Create your custom mosaic proof' "$BUILDER" 'public wizard headline'
for step_label in 'Upload Photo' 'Crop &amp; Position' 'Preview Mosaic' 'Request Proof' 'Proof Received'; do
  require_rg "$step_label" "$BUILDER" "5-step visual flow label: $step_label"
done
require_rg 'wizardStickyCta|mobile-sticky-cta' "$BUILDER" 'mobile sticky CTA'
require_rg 'Looks good — preview my mosaic' "$BUILDER" 'crop CTA copy'
require_rg 'Request my free proof' "$BUILDER" 'preview proof CTA copy'
require_rg 'Request my proof' "$BUILDER" 'proof submit CTA copy'
require_rg 'Proof request received' "$BUILDER" 'saved proof copy'
require_rg 'Sticker-ready proof' "$BUILDER" 'default recommended sticker-ready format'
require_rg 'Physical formats are reviewed after a feasibility review\. No payment today\.' "$BUILDER" 'post-review other-format note'
require_rg 'operatorToolsMount' "$BUILDER" 'operator tools mount'
require_rg 'function mountOperatorTools' "$BUILDER" 'ops-only operator tools renderer'
require_rg "get\\('ops'\\) === '1'" "$BUILDER" 'ops=1 query gate'
require_rg "textFromParts\\(\\['Advanced', 'tools'\\]\\)" "$BUILDER" 'advanced tools runtime label assembly'
if rg -n '<details[^>]+id="advancedTools"|<details[^>]+class="advanced-tools"' "$BUILDER" >/tmp/mosapack-wizard-advanced-static.txt; then
  echo "FORBIDDEN: advanced tools must not be statically mounted"
  cat /tmp/mosapack-wizard-advanced-static.txt
  FAIL=1
fi
rm -f /tmp/mosapack-wizard-advanced-static.txt
require_rg '/\.netlify/functions/save-project' "$BUILDER" 'B2 save-project call'
require_rg 'name="mosapack-save-design"' "$BUILDER" 'Netlify proof form'
require_rg 'name="project_id"' "$BUILDER" 'project_id hidden field'
require_rg 'id="designStorageConsent"' "$BUILDER" 'design storage consent checkbox'
require_rg 'Raw image data is not submitted through our proof form' "$BUILDER" 'raw image privacy note'

require_no_rg 'Pay \$10|Stripe|Payment Link|PUBLIC_STRIPE|buy\.stripe\.com' "$BUILDER" 'payment UI/copy'
require_no_rg 'Costs & Checkout|Estimated total|Launch access disabled|Checkout disabled' "$BUILDER" 'active checkout/cost copy'
require_no_rg 'Other formats available after proof review: Sticker / Magnetic / Premium Brick' "$BUILDER" 'slash-separated other-format note'
require_no_rg 'LEGO®|LEGO-compatible|Premium Brick|Brick Kit|Netlify Forms|No checkout today' "$BUILDER" 'retired public copy terms'
if rg -n 'quality score|SSIM|DeltaE|ΔE|Gold quality|Silver quality|Bronze quality|gold quality|silver quality|bronze quality' "$BUILDER" >/tmp/mosapack-wizard-quality.txt; then
  echo "FORBIDDEN: public quality score terms"
  cat /tmp/mosapack-wizard-quality.txt
  FAIL=1
fi
rm -f /tmp/mosapack-wizard-quality.txt
require_no_rg 'Wobrick|wobrick\.com|downloadWobrick' "$BUILDER" 'Wobrick public references'

if perl -0ne 'exit(/<form[^>]+name="mosapack-save-design"[\s\S]*?<input[^>]+type="file"/i ? 0 : 1)' "$BUILDER"; then
  echo "FORBIDDEN: raw image/file input inside Netlify proof form"
  FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then
  echo "Public builder wizard verification failed."
  exit 1
fi

echo "Public builder wizard verification passed."
