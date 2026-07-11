#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_PAGE="$ROOT/public/index.html"
BUILDER="$ROOT/public/builder/index.html"
PWCLI="${PWCLI:-$HOME/.codex/skills/playwright/scripts/playwright_cli.sh}"

fail() {
  echo "Builder target-state completion verification failed: $*" >&2
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
    "your kit will match this preview", "Advanced Options"
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
grep -q "product_interest\" id=\"saveProductInterest\" value=\"sticker_proof\"" "$BUILDER" || fail "product_interest default is not sticker_proof"
grep -q "name=\"preview_tweaks\"" "$BUILDER" || fail "preview_tweaks hidden field missing"
grep -q "preview_tweaks:" "$BUILDER" || fail "exact design payload missing preview_tweaks"
grep -q "JPG or PNG · up to 20MB" "$BUILDER" || fail "upload file spec missing"
grep -q "HEIC photos are not supported yet" "$BUILDER" || fail "HEIC rejection copy missing"
grep -q "Please upload a JPG or PNG" "$BUILDER" || fail "unsupported file copy missing"
grep -q "This photo is over 20MB" "$BUILDER" || fail "oversized file copy missing"
grep -q "sample-photo-button.*Pet" "$BUILDER" || fail "Pet sample button missing"
grep -q "sample-photo-button.*Family" "$BUILDER" || fail "Family sample button missing"
grep -q "Baby / First Hello" "$BUILDER" || fail "Baby / First Hello sample button missing"
grep -q "cropRotateButton" "$BUILDER" || fail "crop rotate control missing"
grep -q "cropFillButton" "$BUILDER" || fail "crop fill control missing"
grep -q "crop-thirds-grid" "$BUILDER" || fail "rule-of-thirds grid missing"
grep -q "cropMiniMosaicCanvas" "$BUILDER" || fail "crop mini mosaic preview missing"
grep -q "Protecting your subject’s details" "$BUILDER" || fail "generation stage copy missing"
grep -q "Still working — big photos take a moment" "$BUILDER" || fail "slow generation copy missing"
grep -q "previewSizeContext" "$BUILDER" || fail "scale context strip missing"
grep -q "proof_ref" "$BUILDER" || fail "proof_ref field missing"
grep -q "Copy reference" "$BUILDER" || fail "safe saved-state secondary action missing"

PORT="$(python3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
)"

IMAGE="/tmp/mosapack-step3-compaction-test.svg"
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
  <circle cx="140" cy="120" r="72" fill="#08b894" opacity="0.35"/>
  <circle cx="960" cy="160" r="96" fill="#f72573" opacity="0.35"/>
  <circle cx="900" cy="690" r="120" fill="#f59e0b" opacity="0.35"/>
  <circle cx="180" cy="700" r="90" fill="#0ea5e9" opacity="0.35"/>
  <ellipse cx="550" cy="405" rx="250" ry="280" fill="url(#face)"/>
  <path d="M315 285 Q550 70 785 285" fill="none" stroke="#111318" stroke-width="82" stroke-linecap="round"/>
  <circle cx="455" cy="360" r="34" fill="#111318"/>
  <circle cx="645" cy="360" r="34" fill="#111318"/>
  <circle cx="445" cy="350" r="8" fill="#fff"/>
  <circle cx="635" cy="350" r="8" fill="#fff"/>
  <path d="M440 515 Q550 585 660 515" fill="none" stroke="#111318" stroke-width="24" stroke-linecap="round"/>
</svg>
SVG

DARK_IMAGE="/tmp/mosapack-step3-darkfield-test.svg"
cat > "$DARK_IMAGE" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
  <rect width="900" height="900" fill="#08090b"/>
  <circle cx="450" cy="390" r="210" fill="#181818"/>
  <path d="M270 280 Q450 120 630 280" fill="none" stroke="#0d0d0f" stroke-width="72" stroke-linecap="round"/>
  <ellipse cx="450" cy="430" rx="170" ry="205" fill="#2b211d"/>
  <circle cx="382" cy="392" r="22" fill="#f4d8bd"/>
  <circle cx="518" cy="392" r="22" fill="#f4d8bd"/>
  <path d="M370 520 Q450 575 530 520" fill="none" stroke="#f4d8bd" stroke-width="18" stroke-linecap="round"/>
  <circle cx="130" cy="770" r="48" fill="#101012"/>
  <circle cx="770" cy="180" r="52" fill="#111114"/>
</svg>
SVG

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT/public" >/tmp/mosapack-step3-compaction-server.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true; rm -f "$TMP_JS"' EXIT
sleep 1

"$PWCLI" close-all >/dev/null 2>&1 || true
"$PWCLI" open "http://127.0.0.1:$PORT/" >/dev/null

TMP_JS="$(mktemp /tmp/mosapack-step3-compaction-XXXXXX.js)"
cat > "$TMP_JS" <<JS
async (page) => {
  const baseUrl = 'http://127.0.0.1:$PORT';
  const imagePath = 'sample:pet';
  const darkImagePath = 'sample:dark';
  const blocked = [
    'LEGO','LEGO-compatible','brick','bricks','Brick quote','Premium Brick','Total Bricks',
    'Build Time','Pack Efficiency','Advanced exports','BOM','PDF','canonical JSON',
    'Production JSON','Netlify','B2','OL2050','Gate A','generator','stock sheets','hybrid',
    'topoff','Mosaic Clean','Advanced Tools','Proof Export Tools','Save Your Design',
    'Saved design','Saved preview','\\\$0.00','DIY Templates','Download SVG','Cricut',
    'Silhouette','Instant download','\\\$5','shipping','shipped','delivered',
    'production begins','peel-to-reveal','peel-and-place','digital launch access',
    'feasibility review','your kit will match this preview','Advanced Options'
  ];

  const assert = (condition, message) => { if (!condition) throw new Error(message); };

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
      return {
        path: location.pathname + location.search,
        leaks: blockedTerms.filter((term) => lower.includes(term.toLowerCase())),
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        isOps: document.body.classList.contains('is-ops-mode'),
        hasProofExport: text.includes('Proof Export Tools')
      };
    }, blocked);
  }

  async function loadSyntheticSource(source) {
    if (source === 'sample:dark') {
      await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 900;
        canvas.height = 900;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#08090b';
        ctx.fillRect(0, 0, 900, 900);
        ctx.fillStyle = '#181818';
        ctx.beginPath();
        ctx.arc(450, 390, 210, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2b211d';
        ctx.beginPath();
        ctx.ellipse(450, 430, 170, 205, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f4d8bd';
        ctx.beginPath();
        ctx.arc(382, 392, 22, 0, Math.PI * 2);
        ctx.arc(518, 392, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f4d8bd';
        ctx.lineWidth = 18;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(370, 520);
        ctx.quadraticCurveTo(450, 575, 530, 520);
        ctx.stroke();
        window.loadImageFromData(canvas.toDataURL('image/png'));
      });
      return;
    }
    if (String(source).startsWith('sample:')) {
      await page.click('.sample-photo-button[data-sample="' + source.split(':')[1] + '"]');
      return;
    }
    await page.setInputFiles('#fileInput', source);
  }

  async function reachPreview(width, height, source = imagePath) {
    await page.setViewportSize({ width, height });
    await page.goto(baseUrl + '/builder/', { waitUntil: 'networkidle' });
    await loadSyntheticSource(source);
    await page.waitForFunction(() => document.body.classList.contains('wizard-state-crop'), null, { timeout: 15000 });
    await page.waitForTimeout(250);
    await page.click(width <= 600 ? '#wizardStickyButton' : '#cropGenerateButton');
    await page.waitForFunction(() => !document.getElementById('generationStateCard')?.hidden, null, { timeout: 5000 });
    await page.waitForFunction(() => document.body.classList.contains('wizard-state-preview'), null, { timeout: 60000 });
    await page.waitForSelector('#postPreviewFlow:not([hidden])', { timeout: 60000 });
    await waitVisible('[data-testid="preview-step-card"]', 60000);
    await page.waitForTimeout(500);
  }

  function countWords(text, pattern) {
    return (text.toLowerCase().match(pattern) || []).length;
  }

  async function step3Metrics(width, height) {
    await reachPreview(width, height);
    return page.evaluate(() => {
      const isVisible = (node) => {
        if (!node) return false;
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && box.width > 0 && box.height > 0;
      };
      const rect = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return { top: box.top, bottom: box.bottom, width: box.width, height: box.height, display: style.display, visibility: style.visibility, opacity: Number(style.opacity), text: node.innerText || '' };
      };
      const step = document.querySelector('#postPreviewFlow');
      const stepText = step?.innerText || '';
      const stepRect = step?.getBoundingClientRect();
      const ctaButtons = Array.from(document.querySelectorAll('#postPreviewFlow button')).filter((node) => isVisible(node) && node.innerText.trim() === 'Request my free proof');
      const filledButtons = Array.from(document.querySelectorAll('#postPreviewFlow button, #postPreviewFlow a')).filter((node) => {
        if (!isVisible(node)) return false;
        const style = getComputedStyle(node);
        const bg = style.backgroundColor;
        return bg && !['rgba(0, 0, 0, 0)', 'transparent'].includes(bg) && node.innerText.trim();
      }).map((node) => ({ text: node.innerText.trim(), bg: getComputedStyle(node).backgroundColor, tag: node.tagName, classes: node.className, height: node.getBoundingClientRect().height }));
      const adjust = document.getElementById('adjustCropButton') || document.getElementById('adjustCropLink');
      const adjustStyle = adjust ? getComputedStyle(adjust) : null;
      const formatRows = Array.from(document.querySelectorAll('[name="format_interest_choice"]')).map((input) => {
        const host = input.closest('label');
        return { value: input.value, checked: input.checked, height: host?.getBoundingClientRect().height || 0, text: host?.innerText || '', role: host?.closest('[role="radiogroup"]')?.getAttribute('aria-label') || host?.closest('[role="radiogroup"]')?.id || '' };
      });
      const sizeRows = Array.from(document.querySelectorAll('[name="preferred_size_choice"]')).map((input) => {
        const host = input.closest('label');
        return { value: input.value, checked: input.checked, height: host?.getBoundingClientRect().height || 0, text: host?.innerText || '', selected: host?.classList.contains('is-selected') };
      });
      const titleCount = Array.from(document.querySelectorAll('#postPreviewFlow h3, #postPreviewFlow h2')).filter((node) => isVisible(node) && node.innerText.trim() === 'Here’s your mosaic').length;
      const liveVisible = Array.from(document.querySelectorAll('[aria-live]')).filter((node) => isVisible(node) && !node.classList.contains('sr-only')).map((node) => node.innerText.trim()).join(' ');
      const fineTune = document.getElementById('previewFineTunePanel');
      const fineTuneButton = document.getElementById('previewFineTuneToggle');
      const fineTuneTargets = Array.from(document.querySelectorAll('.preview-tweak-option')).filter(isVisible).map((node) => ({ text: node.innerText.trim(), height: node.getBoundingClientRect().height, width: node.getBoundingClientRect().width }));
      return {
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        stepText,
        noPaymentCount: (stepText.toLowerCase().match(/no payment/g) || []).length,
        followCount: (stepText.toLowerCase().match(/follow[- ]?up|follow up/g) || []).length,
        reviewCount: (stepText.toLowerCase().match(/\\breview(?:ed)?\\b/g) || []).length,
        buildableCount: (stepText.toLowerCase().match(/\\bbuildable\\b/g) || []).length,
        proofCount: (stepText.toLowerCase().match(/\\bproof\\b/g) || []).length,
        titleCount,
        card: rect('[data-testid="preview-step-card"]'),
        stepper: rect('[data-testid="wizard-stepper"]'),
        beforeAfter: rect('[data-testid="preview-before-after"]'),
        primaryCta: rect('[data-testid="preview-primary-cta"]'),
        ctaButtons: ctaButtons.map((node) => ({ text: node.innerText.trim(), bg: getComputedStyle(node).backgroundColor, image: getComputedStyle(node).backgroundImage, color: getComputedStyle(node).color, height: node.getBoundingClientRect().height })),
        filledButtons,
        adjust: adjust ? { text: adjust.innerText.trim(), bg: adjustStyle.backgroundColor, tag: adjust.tagName, classes: adjust.className, height: adjust.getBoundingClientRect().height } : null,
        confidencePanel: Boolean(document.getElementById('previewConfidencePanel')),
        readyCard: Boolean(document.querySelector('.proof-request-card')),
        trustChipsVisible: Array.from(document.querySelectorAll('.wizard-trust-chips')).some(isVisible),
        choicesSection: Boolean(document.getElementById('previewChoices')),
        formatRows,
        sizeRows,
        recommendedCount: (document.getElementById('previewChoices')?.innerText.match(/Recommended/g) || []).length,
        fineTuneExists: Boolean(fineTune),
        fineTuneExpanded: fineTuneButton?.getAttribute('aria-expanded') || null,
        fineTuneTargets,
        liveVisibleLength: liveVisible.length,
        liveCount: document.querySelectorAll('[aria-live]').length,
        srOnlyLiveCount: Array.from(document.querySelectorAll('[aria-live]')).filter((node) => node.classList.contains('sr-only')).length,
        visibleHeight: stepRect ? stepRect.height : 0,
        stickyVisible: isVisible(document.getElementById('wizardStickyCta')),
        productInterest: document.getElementById('saveProductInterest')?.value || '',
        formatInterest: document.getElementById('saveFormatInterest')?.value || '',
        preferredSizeIn: document.getElementById('savePreferredSizeIn')?.value || '',
        tweaks: document.getElementById('savePreviewTweaks')?.value || ''
      };
    });
  }

  async function colorMetrics() {
    return page.evaluate(() => {
      const source = document.querySelector('#proofSourceThumbnail');
      const mosaic = document.querySelector('#mosaicCanvas');
      const sampleSourceColors = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 180; canvas.height = 180;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(source, 0, 0, 180, 180);
        const data = ctx.getImageData(0, 0, 180, 180).data;
        const colors = new Set();
        for (let i = 0; i < data.length; i += 4) colors.add(data[i] + ',' + data[i + 1] + ',' + data[i + 2]);
        return colors.size;
      };
      const ctx = mosaic.getContext('2d', { willReadFrequently: true });
      const data = ctx.getImageData(0, 0, mosaic.width, mosaic.height).data;
      const colors = new Set();
      let dark = 0;
      let chroma = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        colors.add(r + ',' + g + ',' + b);
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (luma < 40) {
          dark++;
          if ((Math.max(r, g, b) - Math.min(r, g, b)) > 24) chroma++;
        }
      }
      return { sourceColors: sampleSourceColors(), mosaicColors: colors.size, darkChromaRatio: dark ? chroma / dark : 0 };
    });
  }

  const rootAudit = await auditPublicPath('/');
  const builderAudit = await auditPublicPath('/builder/');
  assert(rootAudit.leaks.length === 0, '/ leaked blocked terms: ' + rootAudit.leaks.join(', '));
  assert(builderAudit.leaks.length === 0, '/builder/ leaked blocked terms: ' + builderAudit.leaks.join(', '));
  assert(builderAudit.overflowX <= 1, '/builder/ overflow ' + builderAudit.overflowX);

  await page.goto(baseUrl + '/builder/', { waitUntil: 'networkidle' });
  const uploadState = await page.evaluate(() => ({
    h1Count: Array.from(document.querySelectorAll('h1')).filter((node) => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    }).length,
    title: document.title,
    fileSpec: document.body.innerText.includes('JPG or PNG · up to 20MB'),
    sampleLabels: Array.from(document.querySelectorAll('.sample-photo-button')).map((node) => node.innerText.trim()),
    categoryLabels: Array.from(document.querySelectorAll('#photoCategorySelect option')).map((node) => node.textContent.trim()),
    opsTextMounted: document.body.innerText.includes('Proof Export Tools') || document.body.innerText.includes('Advanced Tools')
  }));
  assert(uploadState.h1Count === 1, 'builder must have exactly one visible H1');
  assert(/Sticker-Ready Mosaic Proof Builder/.test(uploadState.title), 'builder title missing proof-builder phrase');
  assert(uploadState.fileSpec, 'upload file spec not visible');
  assert(['Pet', 'Family', 'Baby / First Hello'].every((label) => uploadState.sampleLabels.includes(label)), 'sample buttons missing: ' + uploadState.sampleLabels.join(', '));
  assert(uploadState.categoryLabels.includes('Not sure — we’ll choose'), 'friendly default category label missing');
  assert(!uploadState.categoryLabels.includes('Auto / Not sure'), 'internal category label leaked');
  assert(!uploadState.opsTextMounted, 'operator tools mounted in normal builder');

  await page.evaluate(() => {
    const input = document.getElementById('fileInput');
    const transfer = new DataTransfer();
    transfer.items.add(new File(['heic-test'], 'iphone.heic', { type: 'image/heic' }));
    input.files = transfer.files;
    window.handleFileUpload(input);
  });
  await page.waitForFunction(() => document.getElementById('uploadError')?.innerText.includes('HEIC photos are not supported yet'), null, { timeout: 5000 });
  const heicCopy = await page.textContent('#uploadError');
  assert(/take a screenshot/.test(heicCopy || ''), 'HEIC workaround copy missing');

  await page.click('.sample-photo-button[data-sample="family"]');
  await page.waitForFunction(() => document.body.classList.contains('wizard-state-crop'), null, { timeout: 15000 });
  const cropState = await page.evaluate(() => {
    const visible = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return false;
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    return {
      rotate: visible('#cropRotateButton'),
      zoom: visible('#cropZoomSlider'),
      fit: visible('#cropFitButton'),
      fill: visible('#cropFillButton'),
      thirds: visible('.crop-thirds-grid'),
      mini: visible('#cropMiniMosaicCanvas'),
      advisory: document.querySelector('.crop-advisory-row')?.innerText || '',
      railMounted: Boolean(document.getElementById('wizardSideStack')?.isConnected)
    };
  });
  assert(cropState.rotate && cropState.zoom && cropState.fit && cropState.fill, 'crop controls incomplete');
  assert(cropState.thirds, 'rule-of-thirds grid not visible');
  assert(cropState.mini, 'crop mini mosaic preview not visible');
  assert(cropState.advisory.includes('Subject is centered') && cropState.advisory.includes('Good contrast'), 'crop advisory checks missing');
  assert(!cropState.railMounted, 'right rail mounted on crop step');

  await page.goto(baseUrl + '/builder/?ops=1', { waitUntil: 'networkidle' });
  const opsAudit = await page.evaluate(() => ({ isOps: document.body.classList.contains('is-ops-mode'), hasProofExport: document.body.textContent.includes('Proof Export Tools') }));
  assert(opsAudit.isOps && opsAudit.hasProofExport, '/builder/?ops=1 did not mount operator tools');

  const desktop = await step3Metrics(1440, 900);
  assert(desktop.overflowX <= 1, 'desktop overflow ' + desktop.overflowX);
  assert(desktop.card && desktop.card.top <= 360, 'preview card top too low: ' + (desktop.card && desktop.card.top));
  assert(desktop.stepper && desktop.card && desktop.card.top - desktop.stepper.bottom <= 40, 'stepper-to-card gap too large');
  assert(desktop.titleCount === 1, 'Here’s your mosaic must appear once, got ' + desktop.titleCount);
  assert(desktop.ctaButtons.length === 1, 'expected exactly one Step 3 primary CTA, got ' + desktop.ctaButtons.length);
  assert(/rgb\\((0, 127, 114|8, 184, 148|11, 191, 146|14, 203, 160|9, 169, 129)/.test(desktop.ctaButtons[0].bg + ' ' + desktop.ctaButtons[0].image), 'primary CTA is not teal: ' + desktop.ctaButtons[0].bg + ' ' + desktop.ctaButtons[0].image);
  assert(!desktop.adjust || !/btn-primary|btn-secondary/.test(desktop.adjust.classes), 'Adjust crop is still a filled button');
  assert(desktop.noPaymentCount === 1, 'no payment count must equal 1, got ' + desktop.noPaymentCount);
  assert(desktop.followCount <= 1, 'follow-up count too high: ' + desktop.followCount);
  assert(desktop.reviewCount <= 1, 'review count too high: ' + desktop.reviewCount);
  assert(desktop.buildableCount <= 1, 'buildable count too high: ' + desktop.buildableCount);
  assert(desktop.proofCount <= 4, 'proof count too high: ' + desktop.proofCount);
  assert(!desktop.confidencePanel, 'trust checklist/confidence panel still mounted');
  assert(!desktop.readyCard, 'Ready card still mounted');
  assert(!desktop.trustChipsVisible, 'top trust chips visible on Step 3');
  assert(desktop.choicesSection, 'compact choices section missing');
  assert(desktop.formatRows.length === 3, 'format row count wrong');
  assert(desktop.sizeRows.length === 3, 'size row count wrong');
  assert(desktop.formatRows.every((row) => row.height >= 44), 'format targets too short');
  assert(desktop.sizeRows.every((row) => row.height >= 44), 'size targets too short');
  assert(desktop.formatRows.find((row) => row.value === 'sticker_ready')?.checked, 'Sticker-ready not selected by default');
  assert(desktop.sizeRows.find((row) => row.value === '12')?.checked, '12 Starter not selected by default');
  assert(desktop.recommendedCount === 1, 'recommended pill count should be exactly 1 by default');
  assert(desktop.fineTuneExists, 'fine-tune disclosure missing');
  assert(desktop.fineTuneExpanded === 'false', 'fine-tune should be collapsed by default');
  assert(desktop.liveVisibleLength === 0, 'visible aria-live text leaked');
  assert(desktop.liveCount > 0 && desktop.srOnlyLiveCount > 0, 'aria-live sr-only status missing');

  await page.click('.preferred-size-option:has(input[name="preferred_size_choice"][value="16"])');
  await page.waitForFunction(() => document.querySelector('.preferred-size-options')?.classList.contains('has-non-default'), null, { timeout: 5000 });
  const selectedState = await page.evaluate(() => ({
    selectedText: document.querySelector('.preferred-size-option.is-selected')?.innerText || '',
    recommendedVisible: Array.from(document.querySelectorAll('.preferred-size-option .choice-pill')).filter((node) => getComputedStyle(node).display !== 'none').map((node) => ({ text: node.innerText, opacity: Number(getComputedStyle(node).opacity) }))
  }));
  assert(/16/.test(selectedState.selectedText), 'selected size state did not move to 16');
  assert(selectedState.recommendedVisible.length <= 1, 'recommended pill duplicated after size change');
  assert(selectedState.recommendedVisible.every((pill) => pill.opacity <= 0.75), 'recommended pill fights selected state after size change');

  await page.click('#previewFineTuneToggle');
  await page.waitForTimeout(150);
  const expanded = await page.evaluate(() => ({
    expanded: document.getElementById('previewFineTuneToggle')?.getAttribute('aria-expanded'),
    targetHeights: Array.from(document.querySelectorAll('.preview-tweak-option')).filter((node) => {
      const box = node.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    }).map((node) => node.getBoundingClientRect().height),
    resetVisible: getComputedStyle(document.getElementById('previewTweaksReset')).display !== 'none'
  }));
  assert(expanded.expanded === 'true', 'fine-tune did not expand');
  assert(expanded.targetHeights.length === 15 && expanded.targetHeights.every((height) => height >= 44), 'fine-tune targets are missing or too short');
  assert(!expanded.resetVisible, 'reset should be hidden while all values are Auto');

  const beforeTweaks = desktop.tweaks;
  await page.click('[data-tweak="brightness"][data-value="1"]');
  await page.click('[data-tweak="contrast"][data-value="1"]');
  await page.click('[data-tweak="background_simplify"][data-value="1"]');
  await page.waitForFunction(() => {
    const data = JSON.parse(document.getElementById('savePreviewTweaks')?.value || '{}');
    return data.brightness === 1 && data.contrast === 1 && data.background_simplify === 1 && data.regen_count > 0;
  }, null, { timeout: 30000 });
  const afterTweaks = await page.evaluate(() => JSON.parse(document.getElementById('savePreviewTweaks')?.value || '{}'));
  assert(JSON.stringify(afterTweaks) !== beforeTweaks, 'preview_tweaks did not change after tweak input');

  const normalColors = await colorMetrics();
  assert(normalColors.sourceColors > 2000, 'source distinct color guard failed: ' + normalColors.sourceColors);
  assert(normalColors.mosaicColors < 800, 'mosaic distinct color guard failed: ' + normalColors.mosaicColors);

  const mobile = await step3Metrics(390, 844);
  assert(mobile.overflowX <= 1, 'mobile overflow ' + mobile.overflowX);
  assert(mobile.visibleHeight <= 1150, 'mobile Step 3 collapsed visible height too tall: ' + mobile.visibleHeight);
  assert(mobile.stickyVisible, 'mobile sticky CTA not visible');

  await reachPreview(1440, 900, darkImagePath);
  const darkColors = await colorMetrics();
  assert(darkColors.darkChromaRatio < 0.02, 'dark-field chroma speckle ratio too high: ' + darkColors.darkChromaRatio);

  await reachPreview(1440, 900);
  await page.click('#requestProofButton');
  await page.waitForFunction(() => !document.getElementById('emailGateOverlay')?.hidden, null, { timeout: 5000 });
  const modal = await page.evaluate(() => {
    const overlay = document.getElementById('emailGateOverlay');
    const radios = Array.from(overlay.querySelectorAll('input[type="radio"]')).map((node) => node.name);
    return {
      active: !overlay.hidden,
      summary: document.getElementById('proofRequestSummary')?.innerText || '',
      nameRequired: document.getElementById('nameInput')?.required || false,
      emailRequired: document.getElementById('emailInput')?.required || false,
      consentRequired: document.getElementById('designStorageConsent')?.required || false,
      radioNames: radios,
      privacy: document.querySelector('.email-gate-privacy')?.innerText || '',
      firstFocus: document.activeElement?.id || ''
    };
  });
  assert(modal.active, 'proof modal did not open');
  assert(modal.summary.includes('Sticker-ready proof') && modal.summary.includes('12″ Starter'), 'proof summary missing selected choices');
  assert(modal.nameRequired && modal.emailRequired && modal.consentRequired, 'proof form required fields missing');
  assert(modal.radioNames.length === 0, 'proof modal contains format radios: ' + modal.radioNames.join(', '));
  assert(modal.privacy.includes('cropped preview') && modal.privacy.includes('original photo is not stored'), 'privacy copy does not match cropped-source storage behavior');
  assert(modal.firstFocus === 'nameInput', 'modal first focus should be nameInput, got ' + modal.firstFocus);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.getElementById('emailGateOverlay')?.hidden, null, { timeout: 5000 });

  await page.evaluate(() => window.showProofNextStepCard?.({ projectId: 'test-project', proofRef: 'MP-TEST1' }));
  const saved = await page.evaluate(() => ({
    state: document.body.className,
    text: document.getElementById('proofNextStepCard')?.innerText || '',
    imageVisible: (() => {
      const img = document.getElementById('proofSavedMosaicImage');
      if (!img) return false;
      const box = img.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && Boolean(img.getAttribute('src'));
    })(),
    copyButton: document.getElementById('proofCopyReferenceButton')?.innerText || ''
  }));
  assert(saved.state.includes('wizard-state-saved'), 'saved state class missing');
  assert(saved.text.includes('Proof request received') && saved.text.includes('Reference: MP-TEST1'), 'saved state reference missing');
  assert(saved.text.includes('Nothing is made or charged today'), 'saved state next-step copy missing');
  assert(saved.imageVisible, 'saved state mosaic hero missing');
  assert(saved.copyButton === 'Copy reference', 'safe saved secondary action missing');

  return JSON.stringify({ rootAudit, builderAudit, uploadState, cropState, opsAudit, desktop, selectedState, expanded, afterTweaks, normalColors, mobile, darkColors, modal, saved }, null, 2);
}
JS

VERIFY_OUTPUT="$("$PWCLI" run-code "$(cat "$TMP_JS")")"
if [[ "$VERIFY_OUTPUT" == *"### Error"* ]]; then
  echo "$VERIFY_OUTPUT"
  fail "Playwright verification reported an error"
fi
printf '%s\n' "$VERIFY_OUTPUT" > /tmp/mosapack-builder-target-state-completion-verifier.json

echo "Builder target-state completion verification passed."
echo "Detailed verifier output: /tmp/mosapack-builder-target-state-completion-verifier.json"
