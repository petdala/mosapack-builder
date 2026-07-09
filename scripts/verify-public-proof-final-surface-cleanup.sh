#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_PAGE="$ROOT/public/index.html"
BUILDER="$ROOT/public/builder/index.html"
PWCLI="${PWCLI:-$HOME/.codex/skills/playwright/scripts/playwright_cli.sh}"

fail() {
  echo "Public proof final surface cleanup verification failed: $*" >&2
  exit 1
}

test -f "$ROOT_PAGE" || fail "public/index.html missing"
test -f "$BUILDER" || fail "public/builder/index.html missing"
test -x "$PWCLI" || fail "Playwright CLI wrapper missing at $PWCLI"

static_visible_text() {
  python3 - "$1" <<'PY'
from html import unescape
from pathlib import Path
import re
import sys

html = Path(sys.argv[1]).read_text(encoding="utf-8")
match = re.search(r"<body\b[^>]*>", html, flags=re.S | re.I)
body = html[match.end():] if match else html
end = body.lower().rfind("</body>")
if end != -1:
    body = body[:end]
body = re.sub(r"<!--.*?-->", " ", body, flags=re.S)
body = re.sub(r"<script\b[^>]*>.*?</script>", " ", body, flags=re.S | re.I)
body = re.sub(r"<style\b[^>]*>.*?</style>", " ", body, flags=re.S | re.I)
body = re.sub(r"<[^>]+>", " ", body)
text = re.sub(r"\s+", " ", unescape(body)).strip()
print(text)
PY
}

check_text_leaks() {
  local label="$1"
  local text="$2"
  python3 - "$label" "$text" <<'PY'
import re
import sys

label, text = sys.argv[1], sys.argv[2]
blocked_literals = [
    "Save Your Design", "Save design", "Saved design", "Saved Design Summary",
    "No saved design yet", "Saved preview", "$0.00", "Total $", "Proof request only",
    "DIY Templates", "Download SVG", "Cricut", "Silhouette", "cutting machines",
    "Instant download", "$5", "4-8 hour", "Source & Cut Materials", "Assemble & Display",
    "Waitlist paused", "export signups manually", "digital launch access", "cart", "order",
    "checkout", "shipping", "ships", "delivered", "production begins", "LEGO", "brick",
    "BOM", "PDF", "Advanced Tools", "Proof Export Tools", "Netlify", "B2", "canonical JSON",
    "Production JSON", "Mosaic Clean", "peel-to-reveal"
]
lower = text.lower()
leaks = [term for term in blocked_literals if term.lower() in lower]
if re.search(r"\bSave\b", text):
    leaks.append("Save")
if leaks:
    raise SystemExit(f"{label} visible/static body text leaks blocked terms: {leaks}")
PY
}

ROOT_TEXT="$(static_visible_text "$ROOT_PAGE")"
BUILDER_TEXT="$(static_visible_text "$BUILDER")"
check_text_leaks "/" "$ROOT_TEXT"
check_text_leaks "/builder/" "$BUILDER_TEXT"

grep -q "Start Proof Builder" "$ROOT_PAGE" || fail "root proof-builder CTA missing"
grep -q "Create your custom mosaic proof" "$ROOT_PAGE" || fail "root proof-first hero title missing"
grep -q "Free buildable mosaic preview" "$BUILDER" || fail "builder product label not converted to proof language"
grep -q "product_interest\" id=\"saveProductInterest\" value=\"sticker_proof\"" "$BUILDER" || fail "product_interest default is not sticker_proof"
grep -q "name=\"format_interest\" id=\"saveFormatInterest\" value=\"sticker_ready\"" "$BUILDER" || fail "format_interest default is not sticker_ready"

if grep -Eq '<div class="header-cart"|id="cartToggle"|id="cartDropdown"|id="cartItemsPreview"|id="cartTotalPreview"' "$BUILDER"; then
  fail "saved-design/cart wrapper is still statically mounted"
fi

PORT="$(python3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
)"

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT/public" >/tmp/mosapack-final-surface-server.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true' EXIT
sleep 1

"$PWCLI" open "http://127.0.0.1:$PORT/" >/dev/null

audit_url() {
  local path="$1"
  "$PWCLI" goto "http://127.0.0.1:$PORT$path" >/dev/null
  "$PWCLI" --raw eval "$(cat <<'JS'
JSON.stringify((() => {
  const text = `${document.body.innerText}\n${document.body.textContent}`;
  const blocked = [
    'Save Your Design','Save design','Saved design','Saved Design Summary','No saved design yet',
    'Saved preview','$0.00','Total $','Proof request only','DIY Templates','Download SVG',
    'Cricut','Silhouette','cutting machines','Instant download','$5','4-8 hour',
    'Source & Cut Materials','Assemble & Display','Waitlist paused','export signups manually',
    'digital launch access','cart','order','checkout','shipping','ships','delivered',
    'production begins','LEGO','brick','BOM','PDF','Advanced Tools','Proof Export Tools',
    'Netlify','B2','canonical JSON','Production JSON','Mosaic Clean','peel-to-reveal'
  ];
  const lower = text.toLowerCase();
  const leaks = blocked.filter((term) => lower.includes(term.toLowerCase()));
  if (/\bSave\b/.test(text)) leaks.push('Save');
  const mountedSelectors = [
    '.header-cart','#cartToggle','#cartDropdown','#cartItemsPreview','#cartTotalPreview',
    '.canvas-tools-rail','.canvas-header','#workspaceMega','#workspacePanelTemplates',
    '#builder-tab','#insightsPanel','#scenePreviewModal','details.advanced-tools',
    'section.proof-export-tools'
  ];
  return {
    path: location.pathname + location.search,
    leaks,
    mounted: mountedSelectors.filter((selector) => document.querySelector(selector)),
    textHasProofPreview: text.includes('Free buildable mosaic preview'),
    productInterest: document.getElementById('saveProductInterest')?.value || null,
    formatInterest: document.getElementById('saveFormatInterest')?.value || null,
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    isOps: document.body.classList.contains('is-ops-mode'),
    hasProofExport: text.includes('Proof Export Tools')
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
        raise SystemExit(f"{label} mounts blocked wrapper/legacy selectors: {audit['mounted']}")
    if audit["overflowX"] > 1:
        raise SystemExit(f"{label} horizontal overflow: {audit['overflowX']}")

if not builder["textHasProofPreview"]:
    raise SystemExit("/builder/ missing proof-preview product label")
if builder["productInterest"] != "sticker_proof":
    raise SystemExit(f"/builder/ product_interest default is {builder['productInterest']!r}")
if builder["formatInterest"] != "sticker_ready":
    raise SystemExit(f"/builder/ format_interest default is {builder['formatInterest']!r}")
if not ops["isOps"] or not ops["hasProofExport"]:
    raise SystemExit("/builder/?ops=1 did not mount operator tools")
print("Final public surface live audits passed.")
PY

echo "Public proof final surface cleanup verification passed."
