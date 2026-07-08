#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_PAGE="$ROOT/public/index.html"
BUILDER="$ROOT/public/builder/index.html"
PWCLI="${PWCLI:-$HOME/.codex/skills/playwright/scripts/playwright_cli.sh}"

fail() {
  echo "Public proof wizard UX v1 verification failed: $*" >&2
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
body = html[start.end():] if start else html
end = body.lower().rfind("</body>")
if end != -1:
    body = body[:end]
body = re.sub(r"<!--.*?-->", " ", body, flags=re.S)
body = re.sub(r"<script\b[^>]*>.*?</script>", " ", body, flags=re.S | re.I)
body = re.sub(r"<style\b[^>]*>.*?</style>", " ", body, flags=re.S | re.I)
body = re.sub(r"<[^>]+>", " ", body)
text = unescape(body)
text = re.sub(r"\s+", " ", text).strip()
print(text)
PY
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
  "peel-to-reveal"
)

check_static_leaks() {
  local label="$1"
  local text="$2"
  local term
  for term in "${BLOCKED_TERMS[@]}"; do
    if python3 - "$text" "$term" <<'PY'
import sys
sys.exit(0 if sys.argv[2].lower() in sys.argv[1].lower() else 1)
PY
    then
      fail "$label static body text contains blocked term: $term"
    fi
  done
}

ROOT_TEXT="$(static_visible_text "$ROOT_PAGE")"
BUILDER_TEXT="$(static_visible_text "$BUILDER")"
check_static_leaks "/" "$ROOT_TEXT"
check_static_leaks "/builder/" "$BUILDER_TEXT"

grep -q "Create your sticker-ready mosaic proof" "$BUILDER" || fail "upload hero copy missing"
grep -q "Here’s your mosaic" "$BUILDER" || fail "preview step title missing"
grep -q "preview-confidence-panel" "$BUILDER" || fail "preview confidence panel missing"
grep -q "format-interest-selector" "$BUILDER" || fail "format interest selector missing"
grep -q "value=\"sticker_ready\"" "$BUILDER" || fail "sticker_ready format interest missing"
grep -q "value=\"magnetic_interest\"" "$BUILDER" || fail "magnetic_interest format interest missing"
grep -q "value=\"premium_display_review\"" "$BUILDER" || fail "premium_display_review format interest missing"
grep -q "name=\"format_interest\"" "$BUILDER" || fail "format_interest submitted field missing"
grep -q "name=\"preferred_size_in\"" "$BUILDER" || fail "preferred_size_in submitted field missing"
grep -q "Proof request received" "$BUILDER" || fail "saved proof copy missing"
grep -q "Request my proof" "$BUILDER" || fail "proof submit CTA missing"
grep -q "Building your mosaic preview" "$BUILDER" || fail "preview loading skeleton text missing"
grep -q "We review every proof" "$BUILDER" || fail "assurance strip copy missing"
grep -q "product_interest\" id=\"saveProductInterest\" value=\"sticker_proof\"" "$BUILDER" || fail "product_interest default is not sticker_proof"
grep -q "format_interest: formatInterest" "$BUILDER" || fail "exact design payload missing format_interest"
grep -q "photo_category: photoCategory" "$BUILDER" || fail "exact design payload missing photo_category"
grep -q "/.netlify/functions/save-project" "$BUILDER" || fail "save-project reference missing"
grep -q "designStorageConsent" "$BUILDER" || fail "designStorageConsent missing"
grep -q "mountOperatorTools(isOpsMode)" "$BUILDER" || fail "ops-only tool mount missing"
grep -q "wizard guidance rail unmounted outside upload step" "$BUILDER" || fail "rail unmount behavior missing"
grep -q "width: min(100%, 560px, calc(100vh - 300px))" "$BUILDER" || fail "larger crop viewport target missing"

if grep -q "product_interest.*bricks" "$BUILDER"; then
  fail "product_interest must not default to bricks"
fi

if grep -q "peel-and-place" "$BUILDER"; then
  fail "peel-and-place copy must not appear"
fi

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

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT/public" >/tmp/mosapack-proof-wizard-ux-v1-server.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true' EXIT
sleep 1

"$PWCLI" open "http://127.0.0.1:$PORT/" >/dev/null

audit_url() {
  local path="$1"
  "$PWCLI" goto "http://127.0.0.1:$PORT$path" >/dev/null
  "$PWCLI" --raw eval "$(cat <<'JS'
JSON.stringify((() => {
  const blocked = [
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
    'cart','order','checkout','Production begins','shipping','ships','shipped',
    'Delivered to your door','everything included','peel-to-reveal'
  ];
  const text = `${document.body.innerText}\n${document.body.textContent}`;
  const lowerText = text.toLowerCase();
  const leaks = blocked.filter((term) => lowerText.includes(term.toLowerCase()));
  const legacySelectors = [
    '.canvas-tools-rail','.canvas-header','#workspaceMega','#workspacePanelTemplates',
    '#builder-tab','#insightsPanel','#scenePreviewModal','details.advanced-tools',
    'section.proof-export-tools'
  ];
  const mounted = legacySelectors.filter((selector) => document.querySelector(selector));
  return {
    path: location.pathname + location.search,
    leaks,
    mounted,
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    hasUploadRail: Boolean(document.querySelector('#wizardSideStack')),
    hasAssurance: Boolean(document.querySelector('#wizardAssuranceStrip')),
    hasPreviewConfidence: Boolean(document.querySelector('#previewConfidencePanel')),
    hasFormatSelector: Boolean(document.querySelector('#formatInterestSelector')),
    hasProofSummary: Boolean(document.querySelector('#proofRequestSummary')),
    hasSticky: Boolean(document.querySelector('#wizardStickyCta')),
    productInterest: document.getElementById('saveProductInterest')?.value || null,
    formatInterest: document.getElementById('saveFormatInterest')?.value || null,
    isOps: document.body.classList.contains('is-ops-mode'),
    hasProofExport: document.body.textContent.includes('Proof Export Tools')
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

def decode(raw):
    value = json.loads(raw)
    if isinstance(value, str):
        value = json.loads(value)
    return value

root, builder, ops = [decode(arg) for arg in sys.argv[1:4]]
for label, audit in (("/", root), ("/builder/", builder)):
    if audit["leaks"]:
        raise SystemExit(f"{label} live body text leaks blocked terms: {audit['leaks']}")
    if audit["mounted"]:
        raise SystemExit(f"{label} mounts blocked selectors: {audit['mounted']}")
    if audit["overflowX"] > 1:
        raise SystemExit(f"{label} horizontal overflow: {audit['overflowX']}")

if builder["productInterest"] != "sticker_proof":
    raise SystemExit(f"/builder/ product_interest default is {builder['productInterest']!r}")
if builder["formatInterest"] != "sticker_ready":
    raise SystemExit(f"/builder/ format_interest default is {builder['formatInterest']!r}")
if not builder["hasUploadRail"]:
    raise SystemExit("/builder/ upload guidance rail missing")
if not builder["hasAssurance"]:
    raise SystemExit("/builder/ assurance strip missing")
if not builder["hasPreviewConfidence"] or not builder["hasFormatSelector"] or not builder["hasProofSummary"]:
    raise SystemExit("/builder/ proof wizard UX components are not mounted")
if not builder["hasSticky"]:
    raise SystemExit("/builder/ mobile sticky CTA missing")
if not ops["isOps"] or not ops["hasProofExport"]:
    raise SystemExit("/builder/?ops=1 did not mount operator export tools")
print("Public proof wizard live audits passed.")
PY

echo "Public proof wizard UX v1 verification passed."
