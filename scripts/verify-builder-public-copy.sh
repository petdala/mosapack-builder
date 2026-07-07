#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILDER="$ROOT/public/builder/index.html"
ROOT_PAGE="$ROOT/public/index.html"

fail() {
  echo "Builder public copy verification failed: $*" >&2
  exit 1
}

test -f "$BUILDER" || fail "public/builder/index.html missing"
test -f "$ROOT_PAGE" || fail "public/index.html missing"

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

ROOT_VISIBLE_TEXT="$(visible_text "$ROOT_PAGE")"
BUILDER_VISIBLE_TEXT="$(visible_text "$BUILDER")"

for forbidden in \
  "LEGO" \
  "LEGO®" \
  "LEGO-compatible" \
  "Brick Packs" \
  "brick fans" \
  "Netlify Forms" \
  "Premium Brick" \
  "Brick Kit" \
  "Try Brick Builder" \
  "For LEGO Fans" \
  "Stripe" \
  "Shopify" \
  "order placed" \
  "production started" \
  "Production starts" \
  "money back" \
  "DeltaE" \
  "SSIM" \
  "OL2050" \
  "Gate A" \
  "B2" \
  "sheet profile" \
  "generator" \
  "stock sheets" \
  "hybrid" \
  "topoff" \
  "Mosaic Clean" \
  "Advanced Tools" \
  "Proof Export Tools" \
  "Production JSON" \
  "canonical JSON"; do
  if [[ "$ROOT_VISIBLE_TEXT" == *"$forbidden"* ]]; then
    fail "forbidden root rendered/public text found: $forbidden"
  fi
  if [[ "$BUILDER_VISIBLE_TEXT" == *"$forbidden"* ]]; then
    fail "forbidden builder rendered/public text found: $forbidden"
  fi
done

if [[ "$ROOT_VISIBLE_TEXT" == *"checkout"* || "$ROOT_VISIBLE_TEXT" == *"Checkout"* ]]; then
  fail "checkout wording found in root rendered/public text"
fi

if [[ "$BUILDER_VISIBLE_TEXT" == *"checkout"* || "$BUILDER_VISIBLE_TEXT" == *"Checkout"* ]]; then
  fail "checkout wording found in rendered/public text"
fi

if grep -q "Proof Export Tools\|Advanced Tools\|Mosaic Clean\|Production JSON\|Canonical Design JSON\|Netlify Forms" "$BUILDER"; then
  fail "operator/internal labels are statically present in builder source"
fi

grep -q "operatorToolsMount" "$BUILDER" || fail "operator tools mount missing"
grep -q "mountOperatorTools" "$BUILDER" || fail "operator tools conditional renderer missing"
grep -q "/.netlify/functions/save-project" "$BUILDER" || fail "save-project reference missing"
grep -q "project_id" "$BUILDER" || fail "project_id missing"
grep -q "designStorageConsent" "$BUILDER" || fail "designStorageConsent missing"

echo "Builder public copy verification passed."
