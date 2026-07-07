#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_PAGE="$ROOT/public/index.html"
BUILDER="$ROOT/public/builder/index.html"

fail() {
  echo "Public copy and ops gating verification failed: $*" >&2
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
BUILDER_VISIBLE="$(visible_text "$BUILDER")"

for forbidden in \
  "LEGO" \
  "LEGO-compatible" \
  "brick" \
  "bricks" \
  "Brick Packs" \
  "Premium Brick" \
  "Netlify" \
  "Netlify Forms" \
  "B2" \
  "OL2050" \
  "Gate A" \
  "generator" \
  "canonical JSON" \
  "Production JSON" \
  "stock sheets" \
  "hybrid" \
  "topoff" \
  "Mosaic Clean" \
  "Advanced Tools" \
  "Proof Export Tools"; do
  if [[ "$ROOT_VISIBLE" == *"$forbidden"* ]]; then
    fail "root visible copy contains forbidden term: $forbidden"
  fi
  if [[ "$BUILDER_VISIBLE" == *"$forbidden"* ]]; then
    fail "normal builder visible copy contains forbidden term: $forbidden"
  fi
done

if grep -q "Proof Export Tools\|Advanced Tools\|Mosaic Clean\|Production JSON\|Canonical Design JSON\|Netlify Forms" "$BUILDER"; then
  fail "normal builder source contains exact public-path operator/export label"
fi

if grep -q '<details class="advanced-tools"' "$BUILDER"; then
  fail "advanced tools are statically mounted"
fi

if grep -q '<section class="proof-export-tools"' "$BUILDER"; then
  fail "proof export tools are statically mounted"
fi

grep -q "operatorToolsMount" "$BUILDER" || fail "operator tools mount missing"
grep -q "mountOperatorTools" "$BUILDER" || fail "operator tools conditional renderer missing"
grep -q "get('ops') === '1'" "$BUILDER" || fail "ops=1 query detection missing"
grep -q "textFromParts" "$BUILDER" || fail "operator labels are not assembled at runtime"
grep -q "Download', 'Production', 'JSON" "$BUILDER" || fail "ops production export label assembly missing"
grep -q "Download', 'Canonical', 'Design', 'JSON" "$BUILDER" || fail "ops canonical export label assembly missing"
grep -q "/.netlify/functions/save-project" "$BUILDER" || fail "save-project reference missing"
grep -q "project_id" "$BUILDER" || fail "project_id missing"
grep -q "designStorageConsent" "$BUILDER" || fail "designStorageConsent missing"

echo "Public copy and ops gating verification passed."
