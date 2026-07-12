#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_PAGE="$ROOT/public/index.html"
BUILDER="$ROOT/public/builder/index.html"
PWCLI="${PWCLI:-$HOME/.codex/skills/playwright/scripts/playwright_cli.sh}"

fail() {
  echo "Builder final conversion polish verification failed: $*" >&2
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

check_static_leaks() {
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
    "shipping", "shipped", "delivered", "production begins", "peel-to-reveal",
    "peel-and-place", "digital launch access", "feasibility review",
    "your kit will match this preview"
]
lower = text.lower()
hits = [term for term in blocked if term.lower() in lower]
if hits:
    raise SystemExit(f"{label} static body text contains blocked terms: {hits}")
PY
}

check_static_leaks "/" "$(static_visible_text "$ROOT_PAGE")"
check_static_leaks "/builder/" "$(static_visible_text "$BUILDER")"

grep -q "<title>MosaPack — Sticker-Ready Mosaic Proof Builder</title>" "$BUILDER" || fail "builder title is not the approved proof-builder title"
grep -q "See your photo as a sticker mosaic — free" "$BUILDER" || fail "builder H1 copy missing"
grep -q "data-preview-view=\"mosaic\" aria-selected=\"true\" aria-pressed=\"true\"" "$BUILDER" || fail "mosaic preview toggle is not statically active"
grep -q "name=\"preferred_size_in\" id=\"savePreferredSizeIn\" value=\"12\"" "$BUILDER" || fail "preferred_size_in hidden field missing"
grep -q "value=\"premium_display_review\"" "$BUILDER" || fail "premium_display_review format interest missing"
grep -q "preferred_size_in:" "$BUILDER" || fail "exact design payload missing preferred_size_in"
grep -q "product_interest\" id=\"saveProductInterest\" value=\"sticker_proof\"" "$BUILDER" || fail "product_interest default is not sticker_proof"
python3 - "$BUILDER" <<'PY' || fail "name/email fields are not marked required"
from pathlib import Path
import re
import sys

html = Path(sys.argv[1]).read_text(encoding="utf-8")
for field_id in ("nameInput", "emailInput"):
    match = re.search(r"<input\b(?=[^>]*\bid=[\"']%s[\"'])[^>]*>" % re.escape(field_id), html, flags=re.S)
    if not match or not re.search(r"\brequired\b", match.group(0)):
        raise SystemExit(1)
PY
grep -q "id=\"designStorageConsent\" required" "$BUILDER" || fail "consent checkbox is not required"

if grep -q '<span class="version-badge"' "$BUILDER"; then
  fail "version badge is still mounted in normal builder DOM"
fi
if grep -q "product_interest.*bricks" "$BUILDER"; then
  fail "product_interest must not default to bricks"
fi

PORT="$(python3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
)"

IMAGE="/tmp/mosapack-final-polish-test.svg"
cat > "$IMAGE" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="860" viewBox="0 0 1100 860">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#fff7ed"/>
      <stop offset="0.35" stop-color="#bae6fd"/>
      <stop offset="0.7" stop-color="#fbcfe8"/>
      <stop offset="1" stop-color="#bbf7d0"/>
    </linearGradient>
    <radialGradient id="face" cx="50%" cy="42%" r="55%">
      <stop offset="0" stop-color="#ffe4c7"/>
      <stop offset="0.65" stop-color="#f8b4bd"/>
      <stop offset="1" stop-color="#f97316"/>
    </radialGradient>
  </defs>
  <rect width="1100" height="860" fill="url(#bg)"/>
  <g opacity="0.35">
    <circle cx="140" cy="120" r="72" fill="#08b894"/>
    <circle cx="960" cy="160" r="96" fill="#f72573"/>
    <circle cx="900" cy="690" r="120" fill="#f59e0b"/>
    <circle cx="180" cy="700" r="90" fill="#0ea5e9"/>
  </g>
  <ellipse cx="550" cy="405" rx="250" ry="280" fill="url(#face)"/>
  <path d="M315 285 Q550 70 785 285" fill="none" stroke="#111318" stroke-width="82" stroke-linecap="round"/>
  <circle cx="455" cy="360" r="34" fill="#111318"/>
  <circle cx="645" cy="360" r="34" fill="#111318"/>
  <circle cx="445" cy="350" r="8" fill="#fff"/>
  <circle cx="635" cy="350" r="8" fill="#fff"/>
  <path d="M440 515 Q550 585 660 515" fill="none" stroke="#111318" stroke-width="24" stroke-linecap="round"/>
  <path d="M320 600 Q550 750 780 600" fill="none" stroke="#08b894" stroke-width="22" opacity="0.65"/>
  <g opacity="0.4">
    <rect x="0" y="0" width="1100" height="860" fill="none" stroke="#111318" stroke-width="16"/>
    <path d="M0 210 H1100 M0 430 H1100 M0 650 H1100 M275 0 V860 M550 0 V860 M825 0 V860" stroke="#ffffff" stroke-width="7"/>
  </g>
</svg>
SVG

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT/public" >/tmp/mosapack-final-conversion-polish-server.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true; rm -f "$TMP_JS"' EXIT
sleep 1

"$PWCLI" close-all >/dev/null 2>&1 || true
"$PWCLI" open "http://127.0.0.1:$PORT/" >/dev/null

TMP_JS="$(mktemp /tmp/mosapack-final-polish-XXXXXX.js)"
cat > "$TMP_JS" <<JS
async (page) => {
  const baseUrl = 'http://127.0.0.1:$PORT';
  const imagePath = 'sample:pet';
  const blocked = [
    'LEGO','LEGO-compatible','brick','bricks','Brick quote','Premium Brick','Total Bricks',
    'Build Time','Pack Efficiency','Advanced exports','BOM','PDF','canonical JSON',
    'Production JSON','Netlify','B2','OL2050','Gate A','generator','stock sheets','hybrid',
    'topoff','Mosaic Clean','Advanced Tools','Proof Export Tools','Save Your Design',
    'Saved design','Saved preview','\\\$0.00','DIY Templates','Download SVG','Cricut',
    'Silhouette','Instant download','\\\$5','shipping','shipped','delivered',
    'production begins','peel-to-reveal','peel-and-place','digital launch access',
    'feasibility review','your kit will match this preview'
  ];

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function rectFor(node) {
    if (!node) return null;
    const box = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      top: box.top,
      bottom: box.bottom,
      width: box.width,
      height: box.height,
      display: style.display,
      visibility: style.visibility,
      opacity: Number(style.opacity)
    };
  }

  function isVisibleInfo(info) {
    return Boolean(info && info.display !== 'none' && info.visibility !== 'hidden' && info.opacity > 0 && info.width > 0 && info.height > 0);
  }

  async function waitVisible(selector, timeout = 30000) {
    await page.waitForFunction((sel) => {
      const node = document.querySelector(sel);
      if (!node) return false;
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && box.width > 0 && box.height > 0;
    }, selector, { timeout });
  }

  async function auditPublicPath(path) {
    await page.goto(baseUrl + path, { waitUntil: 'networkidle' });
    return page.evaluate((blockedTerms) => {
      const text = document.body.innerText + '\\n' + document.body.textContent;
      const lower = text.toLowerCase();
      const visibleH1s = Array.from(document.querySelectorAll('h1')).filter((node) => {
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && box.width > 0 && box.height > 0;
      });
      return {
        path: location.pathname + location.search,
        leaks: blockedTerms.filter((term) => lower.includes(term.toLowerCase())),
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        title: document.title,
        visibleH1Count: visibleH1s.length,
        visibleH1Text: visibleH1s.map((node) => node.innerText.trim()),
        versionBadges: document.querySelectorAll('.version-badge').length,
        productInterest: document.getElementById('saveProductInterest')?.value || null,
        formatInterest: document.getElementById('saveFormatInterest')?.value || null,
        preferredSizeIn: document.getElementById('savePreferredSizeIn')?.value || null
      };
    }, blocked);
  }

  function countWord(text, word) {
    const matches = text.toLowerCase().match(new RegExp('\\\\b' + word.toLowerCase() + '\\\\b', 'g'));
    return matches ? matches.length : 0;
  }

  async function reachPreview(width, height) {
    await page.setViewportSize({ width, height });
    await page.goto(baseUrl + '/builder/', { waitUntil: 'networkidle' });
    if (String(imagePath).startsWith('sample:')) {
      await page.click('.sample-photo-button[data-sample="' + imagePath.split(':')[1] + '"]');
    } else {
      await page.setInputFiles('#fileInput', imagePath);
    }
    await page.waitForFunction(() => document.body.classList.contains('wizard-state-crop'), null, { timeout: 15000 });
    await page.waitForTimeout(300);
    if (width <= 600) {
      await page.click('#wizardStickyButton');
    } else {
      await page.click('#cropGenerateButton');
    }
    await page.waitForFunction(() => document.body.classList.contains('wizard-state-preview'), null, { timeout: 60000 });
    await page.waitForSelector('#postPreviewFlow:not([hidden])', { timeout: 60000 });
    await waitVisible('[data-testid="preview-step-card"]', 60000);
    await page.waitForTimeout(500);
  }

  async function measureStep3(width, height) {
    await reachPreview(width, height);
    return page.evaluate(() => {
      const rect = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          top: box.top,
          bottom: box.bottom,
          width: box.width,
          height: box.height,
          display: style.display,
          visibility: style.visibility,
          opacity: Number(style.opacity),
          text: node.innerText || ''
        };
      };
      const isVisible = (node) => {
        if (!node) return false;
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && box.width > 0 && box.height > 0;
      };
      const stepper = rect('[data-testid="wizard-stepper"]');
      const card = rect('[data-testid="preview-step-card"]');
      const beforeAfter = rect('[data-testid="preview-before-after"]');
      const cta = rect('[data-testid="preview-primary-cta"]');
      const sticky = rect('#wizardStickyCta');
      const mosaicToggle = document.querySelector('[data-preview-view="mosaic"]');
      const sourceToggle = document.querySelector('[data-preview-view="source"]');
      const stepText = document.querySelector('#postPreviewFlow')?.innerText || '';
      const primaryCtas = Array.from(document.querySelectorAll('button')).filter((node) => {
        return isVisible(node) && ['Request my free proof', 'Get my free proof'].includes(node.innerText.trim());
      }).map((node) => {
        const box = node.getBoundingClientRect();
        return { id: node.id, top: box.top, height: box.height, width: box.width };
      });
      const toggleRects = Array.from(document.querySelectorAll('.proof-preview-toggle-button')).filter(isVisible).map((node) => {
        const box = node.getBoundingClientRect();
        return { text: node.innerText.trim(), height: box.height, width: box.width };
      });
      const optionRects = Array.from(document.querySelectorAll('.format-interest-option, .preferred-size-option')).filter(isVisible).map((node) => {
        const box = node.getBoundingClientRect();
        return { text: node.innerText.trim(), height: box.height, width: box.width };
      });
      const ariaLiveVisibleText = Array.from(document.querySelectorAll('[aria-live]')).filter((node) => {
        return isVisible(node) && !node.classList.contains('sr-only');
      }).map((node) => node.innerText.trim()).join(' ');
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        stepper,
        card,
        beforeAfter,
        cta,
        sticky,
        stepperToCardGap: stepper && card ? card.top - stepper.bottom : null,
        mosaicPressed: mosaicToggle?.getAttribute('aria-pressed') || null,
        sourcePressed: sourceToggle?.getAttribute('aria-pressed') || null,
        comparisonView: document.getElementById('proofPreviewComparison')?.dataset.mobilePreviewView || null,
        proofCount: (stepText.toLowerCase().match(/\\bproof\\b/g) || []).length,
        reviewCount: (stepText.toLowerCase().match(/\\breview(?:ed)?\\b/g) || []).length,
        buildableCount: (stepText.toLowerCase().match(/\\bbuildable\\b/g) || []).length,
        visiblePrimaryCtas: primaryCtas,
        toggleRects,
        optionRects,
        ariaLiveVisibleTextLength: ariaLiveVisibleText.length,
        hasFormatSelector: Boolean(document.getElementById('formatInterestSelector')),
        hasPreferredSizeSelector: Boolean(document.getElementById('preferredSizeSelector')),
        railMounted: Boolean(document.getElementById('wizardSideStack')),
        productInterest: document.getElementById('saveProductInterest')?.value || null,
        formatInterest: document.getElementById('saveFormatInterest')?.value || null,
        preferredSizeIn: document.getElementById('savePreferredSizeIn')?.value || null
      };
    });
  }

  async function countImageColors(selector) {
    return page.evaluate(async (sel) => {
      const img = document.querySelector(sel);
      if (!img || !img.src) return 0;
      if (!img.complete) await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
      const canvas = document.createElement('canvas');
      const size = 180;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      const colors = new Set();
      for (let i = 0; i < data.length; i += 4) {
        colors.add(data[i] + ',' + data[i + 1] + ',' + data[i + 2]);
      }
      return colors.size;
    }, selector);
  }

  async function countCanvasColors(selector) {
    return page.evaluate((sel) => {
      const canvas = document.querySelector(sel);
      if (!canvas || !canvas.width || !canvas.height) return 0;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const colors = new Set();
      for (let i = 0; i < data.length; i += 4) {
        colors.add(data[i] + ',' + data[i + 1] + ',' + data[i + 2]);
      }
      return colors.size;
    }, selector);
  }

  const rootAudit = await auditPublicPath('/');
  const builderAudit = await auditPublicPath('/builder/');
  assert(rootAudit.leaks.length === 0, '/ leaked blocked terms: ' + rootAudit.leaks.join(', '));
  assert(builderAudit.leaks.length === 0, '/builder/ leaked blocked terms: ' + builderAudit.leaks.join(', '));
  assert(builderAudit.title.includes('Sticker-Ready Mosaic Proof Builder'), 'builder title is wrong: ' + builderAudit.title);
  assert(builderAudit.visibleH1Count === 1, 'expected exactly one visible H1, got ' + builderAudit.visibleH1Count);
  assert(builderAudit.visibleH1Text[0] === 'See your photo as a sticker mosaic — free', 'unexpected H1: ' + builderAudit.visibleH1Text.join(' | '));
  assert(builderAudit.versionBadges === 0, 'normal builder mounted version badges');
  assert(builderAudit.productInterest !== 'bricks', 'product_interest defaults to bricks');
  assert(builderAudit.formatInterest === 'sticker_ready', 'format_interest default wrong: ' + builderAudit.formatInterest);
  assert(builderAudit.preferredSizeIn === '12', 'preferred_size_in default wrong: ' + builderAudit.preferredSizeIn);

  await page.goto(baseUrl + '/builder/?ops=1', { waitUntil: 'networkidle' });
  const opsAudit = await page.evaluate(() => ({
    isOps: document.body.classList.contains('is-ops-mode'),
    hasProofExport: document.body.textContent.includes('Proof Export Tools')
  }));
  assert(opsAudit.isOps && opsAudit.hasProofExport, '/builder/?ops=1 did not mount operator tools');

  const desktop = await measureStep3(1440, 900);
  assert(desktop.overflowX <= 1, 'desktop overflow ' + desktop.overflowX);
  assert(desktop.card && desktop.card.top <= 360, 'desktop preview card top too low: ' + (desktop.card && desktop.card.top));
  assert(desktop.stepperToCardGap !== null && desktop.stepperToCardGap <= 40, 'desktop stepper-to-card gap too large: ' + desktop.stepperToCardGap);
  assert(desktop.beforeAfter && desktop.beforeAfter.top <= 500, 'desktop before/after top too low: ' + (desktop.beforeAfter && desktop.beforeAfter.top));
  assert(desktop.cta && desktop.cta.height >= 44, 'desktop primary CTA is too short or missing');
  assert(desktop.mosaicPressed === 'true', 'mosaic toggle is not active by default');
  assert(desktop.sourcePressed === 'false', 'source toggle should not be active by default');
  assert(desktop.comparisonView === 'mosaic', 'comparison view is not mosaic by default');
  assert(desktop.proofCount <= 3, 'Step 3 proof word count too high: ' + desktop.proofCount);
  assert(desktop.reviewCount <= 2, 'Step 3 review word count too high: ' + desktop.reviewCount);
  assert(desktop.buildableCount <= 1, 'Step 3 buildable word count too high: ' + desktop.buildableCount);
  assert(desktop.hasFormatSelector, 'format selector missing on Step 3');
  assert(desktop.hasPreferredSizeSelector, 'preferred size selector missing on Step 3');
  assert(desktop.ariaLiveVisibleTextLength === 0, 'visible aria-live text leaked: ' + desktop.ariaLiveVisibleTextLength);
  assert(!desktop.railMounted, 'right rail mounted on Step 3');
  assert(desktop.productInterest !== 'bricks', 'product_interest is bricks on Step 3');
  assert(desktop.formatInterest === 'sticker_ready', 'format_interest hidden field wrong on Step 3');
  assert(desktop.preferredSizeIn === '12', 'preferred_size_in hidden field wrong on Step 3');
  desktop.toggleRects.forEach((item) => assert(item.height >= 44, 'toggle target too short: ' + item.text + ' ' + item.height));
  desktop.optionRects.forEach((item) => assert(item.height >= 40, 'selector row too short: ' + item.text + ' ' + item.height));

  const sourceColors = await countImageColors('#proofSourceThumbnail');
  const mosaicColors = await countCanvasColors('#mosaicCanvas');
  assert(sourceColors > 2000, 'uploaded/original source color count too low: ' + sourceColors);
  assert(mosaicColors < 600, 'mosaic sampled distinct colors too high: ' + mosaicColors);

  await page.click('.format-interest-option:has(input[name="format_interest_choice"][value="premium_display_review"])');
  await page.click('.preferred-size-option:has(input[name="preferred_size_choice"][value="16"])');
  const changed = await page.evaluate(() => ({
    formatInterest: document.getElementById('saveFormatInterest')?.value || '',
    preferredSizeIn: document.getElementById('savePreferredSizeIn')?.value || ''
  }));
  assert(changed.formatInterest === 'premium_display_review', 'format interest did not update');
  assert(changed.preferredSizeIn === '16', 'preferred size did not update');

  await page.click('#requestProofButton');
  await page.waitForSelector('#emailGateOverlay:not([hidden])', { timeout: 15000 });
  const proofForm = await page.evaluate(() => ({
    nameRequired: document.getElementById('nameInput')?.required || false,
    emailRequired: document.getElementById('emailInput')?.required || false,
    consentRequired: document.getElementById('designStorageConsent')?.required || false,
    formatRadiosInForm: document.querySelectorAll('#emailGateForm input[name="format_interest_choice"]').length,
    summaryInterest: document.getElementById('proofSummaryInterest')?.innerText || '',
    summaryPreferred: document.getElementById('proofSummaryPreferredSize')?.innerText || ''
  }));
  assert(proofForm.nameRequired, 'proof form name is not required');
  assert(proofForm.emailRequired, 'proof form email is not required');
  assert(proofForm.consentRequired, 'proof form consent is not required');
  assert(proofForm.formatRadiosInForm === 0, 'proof form still contains format radios');
  assert(proofForm.summaryInterest === 'Premium display', 'proof summary did not echo format interest');
  assert(proofForm.summaryPreferred === '16″ Gallery', 'proof summary did not echo preferred size');

  const mobile = await measureStep3(390, 844);
  assert(mobile.overflowX <= 1, 'mobile overflow ' + mobile.overflowX);
  assert(mobile.card && mobile.card.top <= 300, 'mobile preview card starts too low: ' + (mobile.card && mobile.card.top));
  assert(mobile.sticky && mobile.sticky.height > 0, 'mobile sticky CTA missing');
  assert(mobile.visiblePrimaryCtas.length === 1, 'expected one visible Step 3 primary CTA on mobile, got ' + mobile.visiblePrimaryCtas.length);
  assert(mobile.visiblePrimaryCtas[0].height >= 44, 'mobile Step 3 primary CTA target too short');
  mobile.toggleRects.forEach((item) => assert(item.height >= 44, 'mobile toggle target too short: ' + item.text + ' ' + item.height));
  mobile.optionRects.forEach((item) => assert(item.height >= 40, 'mobile selector row too short: ' + item.text + ' ' + item.height));
  assert(mobile.ariaLiveVisibleTextLength === 0, 'mobile visible aria-live text leaked');

  return JSON.stringify({ rootAudit, builderAudit, opsAudit, desktop, sourceColors, mosaicColors, proofForm, mobile }, null, 2);
}
JS

VERIFY_OUTPUT="$("$PWCLI" run-code "$(cat "$TMP_JS")")"
if [[ "$VERIFY_OUTPUT" == *"### Error"* ]]; then
  echo "$VERIFY_OUTPUT"
  fail "Playwright verification reported an error"
fi
printf '%s\n' "$VERIFY_OUTPUT" > /tmp/mosapack-builder-final-conversion-polish-verifier.json

echo "Builder final conversion polish verification passed."
