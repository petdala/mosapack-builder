#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILDER="$ROOT/public/builder/index.html"
CONSTANTS="$ROOT/config/production-constants.json"
SCHEMA="$ROOT/config/design-schema.v1.json"
FIXTURE="$ROOT/fixtures/designs/sample-design-first-hello.v1_1.json"
FAIL=0

require_file() {
  local file="$1"
  local message="$2"
  if [ ! -f "$file" ]; then
    echo "MISSING: $message"
    FAIL=1
  fi
}

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
  if rg -n -i "$pattern" "$file" >/tmp/mosapack-canonical-design-hit.txt; then
    echo "FORBIDDEN: $message"
    cat /tmp/mosapack-canonical-design-hit.txt
    FAIL=1
  fi
  rm -f /tmp/mosapack-canonical-design-hit.txt
}

require_file "$CONSTANTS" 'production constants config'
require_file "$SCHEMA" 'canonical design schema'
require_file "$FIXTURE" 'synthetic First Hello fixture'

node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')); JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8')); JSON.parse(require('fs').readFileSync(process.argv[3], 'utf8'));" "$CONSTANTS" "$SCHEMA" "$FIXTURE"

require_rg 'function generateProofRef' "$BUILDER" 'proof_ref generator'
require_rg 'function getCanonicalGridSize' "$BUILDER" 'canonical grid resolver'
require_rg 'function getSizeInForGrid' "$BUILDER" 'grid to size_in resolver'
require_rg 'function normalizePaletteForDesignJson' "$BUILDER" 'canonical palette normalizer'
require_rg 'function convertCellMapToRowMajorIndexes' "$BUILDER" 'cell map row-major converter'
require_rg 'function resolveBlackBase' "$BUILDER" 'black-base resolver'
require_rg 'function generateCanonicalDesignJson' "$BUILDER" 'canonical design JSON generator'
require_rg 'function validateCanonicalDesignJson' "$BUILDER" 'canonical design JSON validator'
require_rg 'Download Canonical Design JSON' "$BUILDER" 'operator export button'
require_rg 'mosapack-design-v1\.json' "$BUILDER" 'canonical design download filename'
require_rg 'schema_version.*1\.1' "$BUILDER" 'schema_version 1.1 represented'
require_rg '24.*12' "$BUILDER" '24->12 grid size mapping represented'
require_rg '32.*16' "$BUILDER" '32->16 grid size mapping represented'
require_rg '48.*24' "$BUILDER" '48->24 grid size mapping represented'
require_rg 'project_id' "$BUILDER" 'project_id represented'
require_rg 'proof_ref' "$BUILDER" 'proof_ref represented'

if ! perl -0ne 'exit(/<details[^>]+id="advancedTools"[\s\S]*?Proof Export Tools[\s\S]*?Download Canonical Design JSON[\s\S]*?<\/details>/ ? 0 : 1)' "$BUILDER"; then
  echo "MISSING: Download Canonical Design JSON must live inside collapsed Proof Export Tools"
  FAIL=1
fi

if perl -0ne 'if (/<section class="post-preview-flow"[\s\S]*?<\/section>/) { exit(index($&, "Download Canonical Design JSON") >= 0 ? 0 : 1) } exit 1' "$BUILDER"; then
  echo "FORBIDDEN: canonical design export button must not be in main public proof flow"
  FAIL=1
fi

require_rg '/\.netlify/functions/save-project' "$BUILDER" 'B2 save-project call'
require_rg 'name="project_id"' "$BUILDER" 'project_id hidden field'
require_rg 'id="designStorageConsent"' "$BUILDER" 'design storage consent checkbox'

if perl -0ne 'while (/<form\b[^>]*id="emailGateForm"[^>]*>.*?<\/form>/sig) { if ($& =~ /type=["'\'' ](?:file|image)["'\'' ]/i || $& =~ /name=["'\'' ][^"'\''>]*(?:canonical_design|production_json|proof_preview|optimized_source|numbered_grid|color_legend|email_image|svg|pdf|data_url|image_data|preview_image|cropped_source)[^"'\''>]*["'\'' ]/i) { exit 1 } }' "$BUILDER"; then
  echo "Netlify proof form canonical/export/raw image check: metadata only."
else
  echo "FORBIDDEN: Netlify proof form includes raw image/export fields"
  FAIL=1
fi

require_no_rg 'Pay \$10|Stripe|Payment Link|PUBLIC_STRIPE|buy\.stripe\.com|checkout successful|payment received|order placed' "$BUILDER" 'checkout/payment strings'

if [ "$FAIL" -ne 0 ]; then
  echo "Canonical design export verification failed."
  exit 1
fi

echo "Canonical design export verification passed."
