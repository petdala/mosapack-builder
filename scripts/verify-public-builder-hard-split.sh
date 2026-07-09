#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_PAGE="$ROOT/public/index.html"
BUILDER="$ROOT/public/builder/index.html"
PWCLI="${PWCLI:-$HOME/.codex/skills/playwright/scripts/playwright_cli.sh}"

fail() {
  echo "Public builder hard split verification failed: $*" >&2
  exit 1
}

test -f "$ROOT_PAGE" || fail "public/index.html missing"
test -f "$BUILDER" || fail "public/builder/index.html missing"

static_visible_text() {
  python3 - "$1" <<'PY'
from html import unescape
from pathlib import Path
import re
import sys

html = Path(sys.argv[1]).read_text(encoding="utf-8")
start = re.search(r"<body\b[^>]*>", html, flags=re.S | re.I)
if start:
    body = html[start.end():]
    lower = body.lower()
    end = lower.rfind("</body>")
    if end != -1:
        body = body[:end]
else:
    body = html
body = re.sub(r"<!--.*?-->", " ", body, flags=re.S)
body = re.sub(r"<script\b[^>]*>.*?</script>", " ", body, flags=re.S | re.I)
body = re.sub(r"<style\b[^>]*>.*?</style>", " ", body, flags=re.S | re.I)
body = re.sub(r"<[^>]+>", " ", body)
text = unescape(body)
text = re.sub(r"\s+", " ", text).strip()
print(text)
PY
}

check_static_leaks() {
  local label="$1"
  local text="$2"
  shift 2
  local term
  for term in "$@"; do
    if [[ "$text" == *"$term"* ]]; then
      fail "$label static body text contains blocked term: $term"
    fi
  done
}

BLOCKED_TERMS=(
  "LEGO"
  "LEGO-compatible"
  "brick"
  "bricks"
  "Brick quote"
  "Brick Packs"
  "Premium Brick"
  "Total Bricks"
  "Build Time"
  "Pack Efficiency"
  "Advanced exports"
  "Pro members"
  "BOM"
  "PDF"
  "canonical JSON"
  "Production JSON"
  "Netlify"
  "Netlify Forms"
  "B2"
  "OL2050"
  "Gate A"
  "generator"
  "stock sheets"
  "hybrid"
  "topoff"
  "Mosaic Clean"
  "Advanced Tools"
  "Proof Export Tools"
  "Total $"
  "Color Palette & Dithering"
  "Dithering Algorithm"
  "Linear Light Processing"
  "Despeckle Filter"
  "Quick Start Presets"
  "Choose Custom Product Path"
  "Choose Your Material"
  "Made-to-Order Finishes"
  "Backing Options"
  "Framed Display"
  "LED Backlit"
  "Premium Magnetic Board"
  "Save for Launch Access"
  "Save Your Design"
  "Save design"
  "Saved design"
  "Saved Design Summary"
  "No saved design yet"
  "Saved preview"
  "\$0.00"
  "Proof request only"
  "DIY Templates"
  "Download SVG"
  "Cricut"
  "Silhouette"
  "cutting machines"
  "Instant download"
  "\$5"
  "4-8 hour"
  "Source & Cut Materials"
  "Assemble & Display"
  "Waitlist paused"
  "export signups manually"
  "digital launch access"
  "cart"
  "order"
  "checkout"
  "Production begins"
  "shipping"
  "ships"
  "shipped"
  "Delivered to your door"
  "everything included"
)

ROOT_TEXT="$(static_visible_text "$ROOT_PAGE")"
BUILDER_TEXT="$(static_visible_text "$BUILDER")"
check_static_leaks "/" "$ROOT_TEXT" "${BLOCKED_TERMS[@]}"
check_static_leaks "/builder/" "$BUILDER_TEXT" "${BLOCKED_TERMS[@]}"

if grep -Eq '<(aside|section|details|div)[^>]+(class|id)="[^"]*(canvas-tools-rail|canvas-header|workspace-mega|workspacePanelTemplates|builder-tab|insightsPanel|scenePreviewModal|advanced-tools|proof-export-tools)' "$BUILDER"; then
  fail "legacy/pro/export panel markup is still statically mounted"
fi

grep -q "function mountOperatorTools" "$BUILDER" || fail "operator tools renderer missing"
grep -q "mountOperatorTools(isOpsMode)" "$BUILDER" || fail "operator tools must mount only from ops-mode helper"
grep -q "get('ops') === '1'" "$BUILDER" || fail "ops=1 detection missing"
grep -q "hardenPublicBuilderDom" "$BUILDER" || fail "public DOM hardening missing"
grep -q "MOSAPACK_BUILDER_SCRIPT_NODE?.remove()" "$BUILDER" || fail "normal builder body script removal missing"
grep -q "getSubmittedProductInterest" "$BUILDER" || fail "product interest normalizer missing"
grep -q "sticker_proof" "$BUILDER" || fail "sticker_proof metadata value missing"

if grep -q "product_interest.*bricks" "$BUILDER"; then
  fail "product_interest default must not be bricks"
fi

grep -q "/.netlify/functions/save-project" "$BUILDER" || fail "save-project reference missing"
grep -q "project_id" "$BUILDER" || fail "project_id missing"
grep -q "designStorageConsent" "$BUILDER" || fail "designStorageConsent missing"
grep -q "width: min(100%, 560px, calc(100vh - 300px))" "$BUILDER" || fail "desktop crop 560px target missing"
grep -q "grid-template-columns: minmax(0, 860px)" "$BUILDER" || fail "desktop crop focused grid track missing"

if [[ ! -x "$PWCLI" ]]; then
  fail "Playwright CLI wrapper missing at $PWCLI"
fi

PORT="$(python3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
)"

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT/public" >/tmp/mosapack-hard-split-server.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true' EXIT
sleep 1

audit_url() {
  local path="$1"
  "$PWCLI" goto "http://127.0.0.1:$PORT$path" >/dev/null
  "$PWCLI" --raw eval "$(cat <<'JS'
JSON.stringify((() => {
  const terms = [
    'LEGO','LEGO-compatible','brick','bricks','Brick quote','Brick Packs','Premium Brick',
    'Total Bricks','Build Time','Pack Efficiency','Advanced exports','Pro members','BOM',
    'PDF','canonical JSON','Production JSON','Netlify','Netlify Forms','B2','OL2050',
    'Gate A','generator','stock sheets','hybrid','topoff','Mosaic Clean','Advanced Tools',
    'Proof Export Tools','Total $','Color Palette & Dithering','Dithering Algorithm',
    'Linear Light Processing','Despeckle Filter','Quick Start Presets','Choose Custom Product Path',
    'Choose Your Material','Made-to-Order Finishes','Backing Options','Framed Display',
    'LED Backlit','Premium Magnetic Board','Save for Launch Access','Save Your Design',
    'Save design','Saved design','Saved Design Summary','No saved design yet','Saved preview',
    '$0.00','Proof request only','DIY Templates','Download SVG','Cricut','Silhouette',
    'cutting machines','Instant download','$5','4-8 hour','Source & Cut Materials',
    'Assemble & Display','Waitlist paused','export signups manually','digital launch access',
    'cart','order','checkout','Production begins',
    'shipping','ships','shipped','Delivered to your door','everything included'
  ];
  const text = `${document.body.innerText}\n${document.body.textContent}`;
  const leaks = terms.filter((term) => text.toLowerCase().includes(term.toLowerCase()));
  const selectors = [
    '.canvas-tools-rail','.canvas-header','#workspaceMega','#workspacePanelTemplates',
    '#builder-tab','#insightsPanel','#scenePreviewModal','details.advanced-tools',
    'section.proof-export-tools'
  ];
  const mounted = selectors.filter((selector) => document.querySelector(selector));
  return {
    path: location.pathname + location.search,
    leaks,
    mounted,
    scriptCount: document.body.querySelectorAll('script').length,
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    hasOpsClass: document.body.classList.contains('is-ops-mode'),
    hasProofExport: document.body.textContent.includes('Proof Export Tools'),
    productInterest: document.getElementById('saveProductInterest')?.value || null
  };
})())
JS
)"
}

ROOT_AUDIT="$(audit_url "/")"
BUILDER_AUDIT="$(audit_url "/builder/")"
OPS_AUDIT="$(audit_url "/builder/?ops=1")"

python3 - "$ROOT_AUDIT" "$BUILDER_AUDIT" "$OPS_AUDIT" <<'PY'
import json
import sys

def decode(arg):
    value = json.loads(arg)
    if isinstance(value, str):
        value = json.loads(value)
    return value

root, builder, ops = [decode(arg) for arg in sys.argv[1:4]]
for label, audit in (("/", root), ("/builder/", builder)):
    if audit["leaks"]:
        raise SystemExit(f"{label} live body text leaks blocked terms: {audit['leaks']}")
    if audit["mounted"]:
        raise SystemExit(f"{label} mounts blocked legacy/pro/export selectors: {audit['mounted']}")
    if audit["overflowX"] > 1:
        raise SystemExit(f"{label} horizontal overflow: {audit['overflowX']}")

if not ops["hasOpsClass"]:
    raise SystemExit("/builder/?ops=1 missing ops-mode class")
if not ops["hasProofExport"]:
    raise SystemExit("/builder/?ops=1 did not mount Proof Export Tools")
print("Live hard-split audits passed.")
PY

echo "Public builder hard split verification passed."
