#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILDER="$ROOT/public/builder/index.html"

fail() {
  echo "Builder upload simplification verification failed: $*" >&2
  exit 1
}

test -f "$BUILDER" || fail "public/builder/index.html missing"

grep -q "applyOperatorMode" "$BUILDER" || fail "operator mode helper missing"
grep -q "ops') === '1'" "$BUILDER" || fail "ops=1 query detection missing"
grep -q "is-ops-mode" "$BUILDER" || fail "is-ops-mode class missing"
grep -q "operatorToolsMount" "$BUILDER" || fail "operator tools mount missing"
grep -q "mountOperatorTools" "$BUILDER" || fail "operator tools conditional renderer missing"
if grep -q '<details class="advanced-tools"' "$BUILDER"; then
  fail "advanced tools must not be statically mounted"
fi
if grep -q '<section class="proof-export-tools"' "$BUILDER"; then
  fail "proof export tools must not be statically mounted"
fi
if grep -q "Proof Export Tools\|Advanced Tools\|Mosaic Clean\|Production JSON\|Canonical Design JSON" "$BUILDER"; then
  fail "operator/export labels must be assembled only in ops mode"
fi
grep -q "wizard-state-upload .advanced-tools" "$BUILDER" || fail "upload-state advanced-tools hide rule missing"
if grep -q "is-ops-mode.wizard-state-upload .advanced-tools" "$BUILDER"; then
  fail "ops-mode should not reveal advanced tools in upload state"
fi
grep -q ".proof-export-tools" "$BUILDER" || fail "proof export tools styles missing"

grep -q "Photo tips" "$BUILDER" || fail "Photo tips card missing"
grep -q "wizard-tips-grid" "$BUILDER" || fail "compact photo tips grid missing"
if grep -q "<h3>Best results</h3>" "$BUILDER"; then
  fail "separate Best results card heading still present"
fi
if grep -q "<h3>Avoid</h3>" "$BUILDER"; then
  fail "separate Avoid card heading still present"
fi

grep -q "grid-template-columns: minmax(680px, 1fr) minmax(330px, 380px)" "$BUILDER" || fail "desktop upload two-column layout missing"
grep -q "advanced-tools .btn.btn-secondary:focus-visible" "$BUILDER" || fail "advanced-tools focus-visible style missing"
grep -q "background: var(--primary-pale)" "$BUILDER" || fail "advanced-tools neutral/teal hover background missing"

if grep -Ei "LEGO®|LEGO-compatible|Netlify Forms|No checkout today|Premium Brick|Brick Kit|Stripe|Shopify|order placed|production started" "$BUILDER" >/dev/null; then
  fail "retired public copy or forbidden technical copy found"
fi

grep -q "/.netlify/functions/save-project" "$BUILDER" || fail "save-project reference missing"
grep -q "project_id" "$BUILDER" || fail "project_id missing"
grep -q "designStorageConsent" "$BUILDER" || fail "designStorageConsent missing"

echo "Builder upload simplification verification passed."
