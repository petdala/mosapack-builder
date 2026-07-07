#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILDER="$ROOT/public/builder/index.html"

fail() {
  echo "Builder focused walkthrough verification failed: $*" >&2
  exit 1
}

test -f "$BUILDER" || fail "public/builder/index.html missing"

grep -q "wizard-layout--with-rail" "$BUILDER" || fail "upload rail layout class missing"
grep -q "wizard-layout--focus" "$BUILDER" || fail "focused step layout class missing"
grep -q "wizardSideStack" "$BUILDER" || fail "guidance rail id missing"
grep -q "updateFocusedWizardLayout" "$BUILDER" || fail "focused layout updater missing"
grep -q "wizard guidance rail unmounted outside upload step" "$BUILDER" || fail "rail unmount placeholder missing"
grep -q "state === 'upload'" "$BUILDER" || fail "upload-only rail state check missing"
grep -q "isOpsMode" "$BUILDER" || fail "ops-mode rail exception missing"
grep -q "wizard-assurance-strip" "$BUILDER" || fail "focused-step assurance strip missing"

grep -q "public-wizard.wizard-state-crop .crop-frame" "$BUILDER" || fail "crop frame focused override missing"
grep -q "calc(100vh - 330px)" "$BUILDER" || fail "crop frame viewport clamp missing"
grep -q "grid-template-columns: minmax(0, 860px)" "$BUILDER" || fail "desktop crop grid track missing"
grep -q "public-wizard.wizard-state-crop .crop-actions .btn" "$BUILDER" || fail "desktop crop action sizing override missing"
grep -q "public-wizard.wizard-state-crop .crop-heading" "$BUILDER" || fail "duplicate crop heading override missing"
grep -q "heroLead" "$BUILDER" || fail "compact per-step hero lead missing"

if grep -q '<details class="advanced-tools"' "$BUILDER"; then
  fail "advanced tools must not be statically mounted"
fi
if grep -q '<section class="proof-export-tools"' "$BUILDER"; then
  fail "proof export tools must not be statically mounted"
fi

grep -q "mountOperatorTools" "$BUILDER" || fail "operator tool conditional mount missing"
grep -q "get('ops') === '1'" "$BUILDER" || fail "ops=1 detection missing"
grep -q "hardenPublicBuilderDom" "$BUILDER" || fail "public DOM hardening missing"
grep -q "MOSAPACK_BUILDER_SCRIPT_NODE?.remove()" "$BUILDER" || fail "normal builder script removal missing"
grep -q "getSubmittedProductInterest" "$BUILDER" || fail "submitted product interest helper missing"
grep -q "sticker_proof" "$BUILDER" || fail "sticker proof metadata value missing"

if grep -q "product_interest.*bricks" "$BUILDER"; then
  fail "product_interest must not default to bricks"
fi

grep -q "/.netlify/functions/save-project" "$BUILDER" || fail "save-project reference missing"
grep -q "project_id" "$BUILDER" || fail "project_id missing"
grep -q "designStorageConsent" "$BUILDER" || fail "designStorageConsent missing"

echo "Builder focused walkthrough verification passed."
