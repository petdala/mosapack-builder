#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_PAGE="$ROOT/public/index.html"
BUILDER="$ROOT/public/builder/index.html"

fail() {
  echo "Public builder hardening verification failed: $*" >&2
  exit 1
}

test -f "$ROOT_PAGE" || fail "public/index.html missing"
test -f "$BUILDER" || fail "public/builder/index.html missing"

visible_text() {
  python3 - "$1" <<'PY'
from html import unescape
from pathlib import Path
import re
import sys

html = Path(sys.argv[1]).read_text(encoding="utf-8")
html = re.sub(r"<!--.*?-->", " ", html, flags=re.S)
html = re.sub(r"<script\b[^>]*>.*?</script>", " ", html, flags=re.S | re.I)
html = re.sub(r"<style\b[^>]*>.*?</style>", " ", html, flags=re.S | re.I)
html = re.sub(r"<[^>]+>", " ", html)
text = unescape(html)
text = re.sub(r"\s+", " ", text).strip()
print(text)
PY
}

ROOT_VISIBLE="$(visible_text "$ROOT_PAGE")"

for forbidden in \
  "LEGO" \
  "LEGO-compatible" \
  "brick" \
  "bricks" \
  "Brick quote" \
  "Brick Packs" \
  "Premium Brick" \
  "Total Bricks" \
  "Build Time" \
  "Pack Efficiency" \
  "Advanced exports" \
  "Pro members" \
  "BOM" \
  "PDF" \
  "canonical JSON" \
  "Production JSON" \
  "Netlify Forms" \
  "B2" \
  "OL2050" \
  "Gate A" \
  "generator" \
  "stock sheets" \
  "hybrid" \
  "topoff" \
  "Mosaic Clean" \
  "Advanced Tools" \
  "Proof Export Tools" \
  "Delivered to your door" \
  "shipping" \
  "ships" \
  "shipped" \
  "pre-cut magnetic sheets" \
  "magnetic pieces" \
  "everything included" \
  "production begins" \
  "Total $"; do
  if [[ "$ROOT_VISIBLE" == *"$forbidden"* ]]; then
    fail "root visible/public copy contains blocked term: $forbidden"
  fi
done

grep -q "function hardenPublicBuilderDom" "$BUILDER" || fail "public DOM hardening function missing"
grep -q "public-proof-wizard-only" "$BUILDER" || fail "public-only body marker missing"
grep -q "MOSAPACK_BUILDER_SCRIPT_NODE?.remove()" "$BUILDER" || fail "builder body script removal missing"
grep -q "selectorsToRemove" "$BUILDER" || fail "public DOM removal selector list missing"
grep -q "#workspacePanelTemplates" "$BUILDER" || fail "legacy workspace template removal missing"
grep -q "#builder-tab" "$BUILDER" || fail "legacy builder tab removal missing"
grep -q "#insightsPanel" "$BUILDER" || fail "legacy insights panel removal missing"
grep -q "#scenePreviewModal" "$BUILDER" || fail "legacy scene modal removal missing"
grep -q "get('ops') === '1'" "$BUILDER" || fail "ops=1 detection missing"
grep -q "mountOperatorTools(isOpsMode)" "$BUILDER" || fail "operator tools are not gated by ops mode"
grep -q "getSubmittedProductInterest" "$BUILDER" || fail "product_interest normalizer missing"
grep -q "sticker_proof" "$BUILDER" || fail "sticker_proof metadata value missing"

if grep -q "product_interest.*bricks" "$BUILDER"; then
  fail "product_interest default must not be bricks"
fi

if grep -q 'value="bricks"' "$BUILDER"; then
  fail "hidden/default form value must not be bricks"
fi

grep -q "/.netlify/functions/save-project" "$BUILDER" || fail "save-project reference missing"
grep -q "project_id" "$BUILDER" || fail "project_id missing"
grep -q "designStorageConsent" "$BUILDER" || fail "designStorageConsent missing"

echo "Public builder hardening verification passed."
