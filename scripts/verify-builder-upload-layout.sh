#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILDER="$ROOT/public/builder/index.html"

fail() {
  echo "Builder upload layout verification failed: $*" >&2
  exit 1
}

test -f "$BUILDER" || fail "public/builder/index.html missing"

grep -q "wizard-state-upload .canvas-container" "$BUILDER" || fail "upload-state canvas-container override missing"
grep -q "wizard-state-upload .canvas-viewport" "$BUILDER" || fail "upload-state canvas-viewport override missing"
grep -q "max-width: none" "$BUILDER" || fail "desktop upload viewport full-width override missing"
grep -q "min-height: clamp(390px, 48vh, 500px)" "$BUILDER" || fail "desktop upload min-height clamp missing"
grep -q "min-height: clamp(295px, 42vh, 360px)" "$BUILDER" || fail "mobile upload min-height clamp missing"
grep -q "overflow-x: clip" "$BUILDER" || fail "overflow-x guard missing"

grep -q "Drag a photo here or choose a photo" "$BUILDER" || fail "dropzone choose-photo copy missing"
grep -q "JPG or PNG. Clear faces, pets, and portraits work best." "$BUILDER" || fail "upload helper copy missing"
if grep -q '<div class="upload-text">Upload your photo</div>' "$BUILDER"; then
  fail "old duplicate dropzone upload title still present"
fi

grep -q "Sticker-ready" "$BUILDER" || fail "trimmed sticker-ready trust chip missing"

if grep -q "No payment required right now</span>" "$BUILDER"; then
  fail "duplicate no-payment trust chip still present"
fi

if grep -q "No checkout today" "$BUILDER"; then
  fail "retired no-checkout trust chip still present"
fi

if grep -Ei "checkout started|order placed|shipping promise|supplier api" "$BUILDER" >/dev/null; then
  fail "forbidden checkout/order/supplier language found"
fi

grep -q "operatorToolsMount" "$BUILDER" || fail "operator tools mount missing"
grep -q "function mountOperatorTools" "$BUILDER" || fail "ops-only operator tools renderer missing"
grep -q "textFromParts(\\['Proof', 'Export', 'Tools'\\])" "$BUILDER" || fail "proof export tools runtime label assembly missing"
if grep -q "Proof Export Tools\\|Advanced Tools\\|Mosaic Clean\\|Production JSON\\|Canonical Design JSON" "$BUILDER"; then
  fail "operator/export labels must not be statically present"
fi
grep -q "/.netlify/functions/save-project" "$BUILDER" || fail "save-project reference missing"
grep -q "project_id" "$BUILDER" || fail "project_id missing"
grep -q "designStorageConsent" "$BUILDER" || fail "designStorageConsent missing"

echo "Builder upload layout verification passed."
