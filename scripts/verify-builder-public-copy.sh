#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILDER="$ROOT/public/builder/index.html"

fail() {
  echo "Builder public copy verification failed: $*" >&2
  exit 1
}

test -f "$BUILDER" || fail "public/builder/index.html missing"

VISIBLE_TEXT="$(python3 - "$BUILDER" <<'PY'
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
)"

for forbidden in \
  "LEGO" \
  "LEGO®" \
  "LEGO-compatible" \
  "brick fans" \
  "Netlify Forms" \
  "No checkout today" \
  "Premium Brick" \
  "Brick Kit" \
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
  "sheet profile" \
  "generator"; do
  if [[ "$VISIBLE_TEXT" == *"$forbidden"* ]]; then
    fail "forbidden rendered/public text found: $forbidden"
  fi
done

if [[ "$VISIBLE_TEXT" == *"checkout"* || "$VISIBLE_TEXT" == *"Checkout"* ]]; then
  fail "checkout wording found in rendered/public text"
fi

grep -q "Proof Export Tools" "$BUILDER" || fail "Proof Export Tools missing"
grep -q "/.netlify/functions/save-project" "$BUILDER" || fail "save-project reference missing"
grep -q "project_id" "$BUILDER" || fail "project_id missing"
grep -q "designStorageConsent" "$BUILDER" || fail "designStorageConsent missing"

echo "Builder public copy verification passed."
