#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILDER="$ROOT/public/builder/index.html"
ROOT_PAGE="$ROOT/public/index.html"
PWCLI="${PWCLI:-$HOME/.codex/skills/playwright/scripts/playwright_cli.sh}"

fail() {
  echo "Builder Step 3 top-gap verification failed: $*" >&2
  exit 1
}

test -f "$BUILDER" || fail "public/builder/index.html missing"
test -f "$ROOT_PAGE" || fail "public/index.html missing"
test -x "$PWCLI" || fail "Playwright CLI wrapper missing at $PWCLI"

grep -q 'data-testid="wizard-stepper"' "$BUILDER" || fail "wizard stepper test id missing"
grep -q 'data-testid="preview-step-card"' "$BUILDER" || fail "preview step card test id missing"
grep -q 'data-testid="preview-before-after"' "$BUILDER" || fail "preview before/after test id missing"
grep -q 'data-testid="preview-primary-cta"' "$BUILDER" || fail "preview primary CTA test id missing"
grep -q 'syncFocusedStepCanvasReservation' "$BUILDER" || fail "focused canvas reservation cleanup missing"

PORT="$(python3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
)"

IMAGE="/tmp/mosapack-builder-step3-gap-test.svg"
cat > "$IMAGE" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700" viewBox="0 0 900 700">
  <rect width="900" height="700" fill="#f8fafc"/>
  <circle cx="450" cy="300" r="180" fill="#f7c6d8"/>
  <circle cx="385" cy="265" r="18" fill="#111318"/>
  <circle cx="515" cy="265" r="18" fill="#111318"/>
  <path d="M365 375 Q450 435 535 375" fill="none" stroke="#111318" stroke-width="18" stroke-linecap="round"/>
  <rect x="215" y="85" width="470" height="520" rx="80" fill="none" stroke="#08b894" stroke-width="34" opacity="0.35"/>
</svg>
SVG

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT/public" >/tmp/mosapack-builder-step3-gap-server.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true; rm -f "$TMP_JS"' EXIT
sleep 1

"$PWCLI" close-all >/dev/null 2>&1 || true
"$PWCLI" open "http://127.0.0.1:$PORT/builder/" >/dev/null

TMP_JS="$(mktemp /tmp/mosapack-step3-gap-XXXXXX.js)"
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
    'production begins','peel-to-reveal'
  ];

  function assert(condition, message) {
    if (!condition) throw new Error(message);
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
    const result = await page.evaluate((blockedTerms) => {
      const text = document.body.innerText + '\\n' + document.body.textContent;
      const lower = text.toLowerCase();
      return {
        path: location.pathname + location.search,
        leaks: blockedTerms.filter((term) => lower.includes(term.toLowerCase())),
        overflowX: document.documentElement.scrollWidth - window.innerWidth
      };
    }, blocked);
    assert(result.leaks.length === 0, result.path + ' leaked blocked terms: ' + result.leaks.join(', '));
    assert(result.overflowX <= 1, result.path + ' has horizontal overflow ' + result.overflowX);
    return result;
  }

  function rect(selector) {
    return page.evaluate((sel) => {
      const node = document.querySelector(sel);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        top: box.top,
        bottom: box.bottom,
        height: box.height,
        width: box.width,
        display: style.display,
        visibility: style.visibility,
        opacity: Number(style.opacity)
      };
    }, selector);
  }

  function isRendered(info) {
    return Boolean(info && info.display !== 'none' && info.visibility !== 'hidden' && info.opacity > 0 && info.width > 0 && info.height > 0);
  }

  async function reachCrop(width, height) {
    await page.setViewportSize({ width, height });
    await page.goto(baseUrl + '/builder/', { waitUntil: 'networkidle' });
    if (String(imagePath).startsWith('sample:')) {
      await page.click('.sample-photo-button[data-sample="' + imagePath.split(':')[1] + '"]');
    } else {
      await page.setInputFiles('#fileInput', imagePath);
    }
    await page.waitForFunction(() => document.body.classList.contains('wizard-state-crop'), null, { timeout: 15000 });
    await page.waitForTimeout(400);
  }

  async function measurePreview(width, height) {
    await reachCrop(width, height);
    const cropCard = await rect('.crop-card');
    const cropStepper = await rect('[data-testid="wizard-stepper"]');
    const cropGap = cropStepper && cropCard ? cropCard.top - cropStepper.bottom : null;
    if (width <= 600) {
      await page.click('#wizardStickyButton');
    } else {
      await page.click('#cropGenerateButton');
    }
    await page.waitForFunction(() => document.body.classList.contains('wizard-state-preview'), null, { timeout: 60000 });
    await page.waitForSelector('#postPreviewFlow:not([hidden])', { timeout: 60000 });
    await waitVisible('[data-testid="preview-step-card"]', 60000);
    await page.waitForTimeout(350);
    const stepper = await rect('[data-testid="wizard-stepper"]');
    const card = await rect('[data-testid="preview-step-card"]');
    const beforeAfter = await rect('[data-testid="preview-before-after"]');
    const cta = await rect('[data-testid="preview-primary-cta"]');
    const sticky = await rect('#wizardStickyCta');
    const data = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      activePreview: document.body.classList.contains('wizard-state-preview'),
      railConnected: Boolean(document.querySelector('#wizardSideStack')),
      bodyHasBlocked: /Advanced Tools|Proof Export Tools|Mosaic Clean|Production JSON|canonical JSON|LEGO|brick|shipping|peel-to-reveal/i.test(document.body.innerText + document.body.textContent)
    }));
    const gap = stepper && card ? card.top - stepper.bottom : null;
    return { width, height, cropCard, cropGap, stepper, card, beforeAfter, cta, sticky, gap, ...data };
  }

  const rootAudit = await auditPublicPath('/');
  const builderAudit = await auditPublicPath('/builder/');

  await page.goto(baseUrl + '/builder/?ops=1', { waitUntil: 'networkidle' });
  const opsAudit = await page.evaluate(() => ({
    isOps: document.body.classList.contains('is-ops-mode'),
    hasProofExport: document.body.textContent.includes('Proof Export Tools')
  }));
  assert(opsAudit.isOps && opsAudit.hasProofExport, '/builder/?ops=1 did not mount operator tools');

  const desktop = await measurePreview(1440, 900);
  assert(desktop.overflowX <= 1, 'desktop Step 3 overflow ' + desktop.overflowX);
  assert(desktop.activePreview, 'desktop Step 3 is not active');
  assert(isRendered(desktop.card), 'desktop preview card is not rendered');
  assert(desktop.card.top <= 360, 'desktop preview card top too low: ' + desktop.card.top);
  assert(desktop.gap !== null && desktop.gap <= 40, 'desktop stepper-to-preview gap too large: ' + desktop.gap);
  assert(isRendered(desktop.beforeAfter), 'desktop before/after preview is not rendered');
  assert(desktop.beforeAfter.top <= 500, 'desktop before/after top too low: ' + desktop.beforeAfter.top);
  assert(isRendered(desktop.cta), 'desktop preview primary CTA is not rendered');
  assert(!desktop.railConnected, 'desktop right rail is mounted on Step 3');
  assert(!desktop.bodyHasBlocked, 'desktop Step 3 has blocked public text');
  assert(desktop.cropCard.top <= 360, 'desktop Step 2 crop card top too low: ' + desktop.cropCard.top);

  await page.click('#requestProofButton');
  await page.waitForFunction(() => document.body.classList.contains('wizard-state-proof'), null, { timeout: 15000 });
  await page.waitForSelector('#emailGateOverlay:not([hidden])', { timeout: 15000 });
  const proofCard = await rect('.email-gate-card');
  assert(isRendered(proofCard), 'desktop Step 4 proof card is not rendered');
  assert(proofCard.top <= 360, 'desktop Step 4 proof card top too low: ' + proofCard.top);
  const proofRail = await page.evaluate(() => Boolean(document.querySelector('#wizardSideStack')));
  assert(!proofRail, 'right rail is mounted on Step 4');

  const mobile = await measurePreview(390, 844);
  assert(mobile.overflowX <= 1, 'mobile Step 3 overflow ' + mobile.overflowX);
  assert(mobile.activePreview, 'mobile Step 3 is not active');
  assert(isRendered(mobile.card), 'mobile preview card is not rendered');
  assert(mobile.card.top <= 300, 'mobile preview card top too low: ' + mobile.card.top);
  assert(isRendered(mobile.beforeAfter), 'mobile before/after preview is not rendered');
  assert(isRendered(mobile.sticky), 'mobile sticky CTA is not rendered');
  assert(!mobile.railConnected, 'mobile right rail is mounted on Step 3');

  return JSON.stringify({ rootAudit, builderAudit, opsAudit, desktop, proofCard, mobile }, null, 2);
}
JS

VERIFY_OUTPUT="$("$PWCLI" run-code "$(cat "$TMP_JS")")"
if [[ "$VERIFY_OUTPUT" == *"### Error"* ]]; then
  echo "$VERIFY_OUTPUT"
  fail "Playwright verification reported an error"
fi
printf '%s\n' "$VERIFY_OUTPUT" > /tmp/mosapack-builder-step3-top-gap-verifier.json

echo "Builder Step 3 top-gap verification passed."
