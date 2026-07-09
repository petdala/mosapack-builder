#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_PAGE="$ROOT/public/index.html"
BUILDER="$ROOT/public/builder/index.html"
PWCLI="${PWCLI:-$HOME/.codex/skills/playwright/scripts/playwright_cli.sh}"

fail() {
  echo "Root above-fold visual render verification failed: $*" >&2
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
print(re.sub(r"\s+", " ", unescape(body)).strip())
PY
}

check_blocked_terms() {
  local label="$1"
  local text="$2"
  python3 - "$label" "$text" <<'PY'
import sys

label, text = sys.argv[1], sys.argv[2]
blocked = [
    "LEGO", "LEGO-compatible", "brick", "bricks", "Brick quote", "Premium Brick",
    "Total Bricks", "Build Time", "Pack Efficiency", "Advanced exports", "BOM", "PDF",
    "canonical JSON", "Production JSON", "Netlify", "B2", "OL2050", "Gate A",
    "generator", "stock sheets", "hybrid", "topoff", "Mosaic Clean", "Advanced Tools",
    "Proof Export Tools", "Save Your Design", "Saved design", "Saved preview", "$0.00",
    "DIY Templates", "Download SVG", "Cricut", "Silhouette", "Instant download", "$5",
    "shipping", "shipped", "delivered", "production begins", "peel-to-reveal"
]
lower = text.lower()
hits = [term for term in blocked if term.lower() in lower]
if hits:
    raise SystemExit(f"{label} contains blocked terms: {hits}")
PY
}

check_blocked_terms "/" "$(static_visible_text "$ROOT_PAGE")"
check_blocked_terms "/builder/" "$(static_visible_text "$BUILDER")"

grep -q 'data-testid="root-hero"' "$ROOT_PAGE" || fail "root hero test id missing"
grep -q 'data-testid="root-hero-title"' "$ROOT_PAGE" || fail "root hero title test id missing"
grep -q 'data-testid="root-hero-primary-cta"' "$ROOT_PAGE" || fail "root hero primary CTA test id missing"
grep -q 'data-testid="root-proof-path-cards"' "$ROOT_PAGE" || fail "root proof path cards test id missing"
grep -q "Create your custom mosaic proof" "$ROOT_PAGE" || fail "root hero title copy missing"
grep -q "Start Proof Builder" "$ROOT_PAGE" || fail "root hero CTA copy missing"

PORT="$(python3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
)"

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT/public" >/tmp/mosapack-root-visual-server.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true' EXIT
sleep 1

"$PWCLI" open "http://127.0.0.1:$PORT/" >/dev/null

audit_root() {
  local path="$1"
  local width="$2"
  local height="$3"
  "$PWCLI" goto "http://127.0.0.1:$PORT$path" >/dev/null
  "$PWCLI" resize "$width" "$height" >/dev/null
  "$PWCLI" goto "http://127.0.0.1:$PORT$path" >/dev/null
  "$PWCLI" --raw eval "$(cat <<'JS'
JSON.stringify((() => {
  const blocked = [
    'LEGO','LEGO-compatible','brick','bricks','Brick quote','Premium Brick','Total Bricks',
    'Build Time','Pack Efficiency','Advanced exports','BOM','PDF','canonical JSON',
    'Production JSON','Netlify','B2','OL2050','Gate A','generator','stock sheets','hybrid',
    'topoff','Mosaic Clean','Advanced Tools','Proof Export Tools','Save Your Design',
    'Saved design','Saved preview','$0.00','DIY Templates','Download SVG','Cricut',
    'Silhouette','Instant download','$5','shipping','shipped','delivered',
    'production begins','peel-to-reveal'
  ];
  const text = `${document.body.innerText}\n${document.body.textContent}`;
  const leaks = blocked.filter((term) => text.toLowerCase().includes(term.toLowerCase()));
  const nav = document.querySelector('#nav');
  const hero = document.querySelector('[data-testid="root-hero"]');
  const badge = hero?.querySelector('.lead-badge');
  const title = document.querySelector('[data-testid="root-hero-title"]');
  const cta = document.querySelector('[data-testid="root-hero-primary-cta"]');
  const cards = document.querySelector('[data-testid="root-proof-path-cards"]');
  const rect = (node) => {
    if (!node) return null;
    const box = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      top: box.top,
      bottom: box.bottom,
      height: box.height,
      width: box.width,
      opacity: Number(style.opacity),
      display: style.display,
      visibility: style.visibility
    };
  };
  const navRect = rect(nav);
  const badgeRect = rect(badge);
  const titleRect = rect(title);
  const ctaRect = rect(cta);
  const cardsRect = rect(cards);
  const heroRect = rect(hero);
  const visible = (info) => Boolean(info && info.display !== 'none' && info.visibility !== 'hidden' && info.opacity > 0.95 && info.height > 0 && info.width > 0);
  return {
    path: location.pathname + location.search,
    width: window.innerWidth,
    height: window.innerHeight,
    leaks,
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    navBottom: navRect?.bottom ?? null,
    badgeTop: badgeRect?.top ?? null,
    titleTop: titleRect?.top ?? null,
    ctaTop: ctaRect?.top ?? null,
    ctaHeight: ctaRect?.height ?? null,
    cardsTop: cardsRect?.top ?? null,
    heroHeight: heroRect?.height ?? null,
    blankGapAfterHeader: navRect && badgeRect ? badgeRect.top - navRect.bottom : null,
    titleVisible: visible(titleRect),
    ctaVisible: visible(ctaRect),
    cardsVisible: visible(cardsRect),
    bodyHasHeroCopy: text.includes('Create your custom mosaic proof') && text.includes('Start Proof Builder')
  };
})())
JS
)"
}

ROOT_1440="$(audit_root "/" 1440 900)"
ROOT_390="$(audit_root "/" 390 844)"
BUILDER_1440="$(audit_root "/builder/" 1440 900)"

python3 - "$ROOT_1440" "$ROOT_390" "$BUILDER_1440" <<'PY'
import json
import sys

def decode(raw):
    value = json.loads(raw)
    if isinstance(value, str):
        value = json.loads(value)
    return value

root_desktop, root_mobile, builder = [decode(arg) for arg in sys.argv[1:4]]

def require(condition, message):
    if not condition:
        raise SystemExit(message)

for label, audit in (("root desktop", root_desktop), ("root mobile", root_mobile), ("builder desktop", builder)):
    require(not audit["leaks"], f"{label} leaked blocked terms: {audit['leaks']}")
    require(audit["overflowX"] <= 1, f"{label} horizontal overflow: {audit['overflowX']}")

for label, audit in (("root desktop", root_desktop), ("root mobile", root_mobile)):
    require(audit["bodyHasHeroCopy"], f"{label} missing hero copy")
    require(audit["titleVisible"], f"{label} hero title is not visible")
    require(audit["ctaVisible"], f"{label} primary CTA is not visible")
    require(audit["cardsVisible"], f"{label} proof path cards are not visible")
    require(audit["blankGapAfterHeader"] is not None and audit["blankGapAfterHeader"] <= 96, f"{label} blank gap after header too large: {audit['blankGapAfterHeader']}")
    require(audit["titleTop"] is not None and audit["titleTop"] < 260, f"{label} hero title starts too low: {audit['titleTop']}")
    require(audit["ctaTop"] is not None and audit["ctaTop"] < 560, f"{label} CTA starts too low: {audit['ctaTop']}")
    require(audit["ctaHeight"] is not None and audit["ctaHeight"] >= 44, f"{label} CTA tap/click target too short: {audit['ctaHeight']}")

require(root_desktop["heroHeight"] is not None and root_desktop["heroHeight"] < 760, f"root desktop hero is excessively tall: {root_desktop['heroHeight']}")
require(root_mobile["heroHeight"] is not None and root_mobile["heroHeight"] < 1200, f"root mobile hero is excessively tall: {root_mobile['heroHeight']}")

print("Root visual audits passed:")
for label, audit in (("desktop", root_desktop), ("mobile", root_mobile)):
    print(f"- {label}: titleTop={audit['titleTop']:.1f}, ctaTop={audit['ctaTop']:.1f}, gap={audit['blankGapAfterHeader']:.1f}, overflow={audit['overflowX']}")
PY

echo "Root above-fold visual render verification passed."
