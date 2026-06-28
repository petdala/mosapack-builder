#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PWCLI="${PWCLI:-$HOME/.codex/skills/playwright/scripts/playwright_cli.sh}"
PRIVATE_IMAGE_DIR="/Users/dereksolas/Developer/mosapack-qa-private/b1-5-mixed-photo-set"
TEST_IMAGE="$PRIVATE_IMAGE_DIR/pet-01.jpg"
SERVER_PORT="${MOSAPACK_QA_PORT:-4173}"
BASE_URL="http://127.0.0.1:$SERVER_PORT/builder/"
SERVER_PID=""

fail() {
  echo "B1.5 proof path verification failed: $*" >&2
  exit 1
}

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
  "$PWCLI" close >/dev/null 2>&1 || true
}
trap cleanup EXIT

[[ -x "$PWCLI" ]] || fail "Playwright CLI wrapper not found at $PWCLI"
command -v npx >/dev/null 2>&1 || fail "npx is required for Playwright CLI"
[[ -f "$TEST_IMAGE" ]] || fail "private QA image missing: $TEST_IMAGE"

if ! curl -fsS "$BASE_URL" >/dev/null 2>&1; then
  (cd "$ROOT" && python3 -m http.server "$SERVER_PORT" -d public >/tmp/mosapack-b15-proof-path-server.log 2>&1) &
  SERVER_PID="$!"
  for _ in $(seq 1 20); do
    if curl -fsS "$BASE_URL" >/dev/null 2>&1; then
      break
    fi
    sleep 0.25
  done
fi

curl -fsS "$BASE_URL" >/dev/null 2>&1 || fail "local builder route is not reachable at $BASE_URL"

"$PWCLI" open "$BASE_URL" >/dev/null

RESULT="$("$PWCLI" --raw run-code "async () => {
  const imagePath = '$TEST_IMAGE';
  const result = {};
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('$BASE_URL', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.setInputFiles('#fileInput', imagePath);
  await page.waitForFunction(() => {
    const editor = document.querySelector('#cropEditor');
    return editor && getComputedStyle(editor).display !== 'none' && editor.getBoundingClientRect().width > 0;
  }, null, { timeout: 15000 });
  await page.click('#cropGenerateButton');
  await page.waitForFunction(() => {
    const flow = document.querySelector('#postPreviewFlow');
    const cta = [...document.querySelectorAll('button')].find((button) => /Request My Custom Proof/i.test(button.textContent || ''));
    return flow && flow.hidden === false && cta && cta.offsetParent !== null && cta.getBoundingClientRect().width > 0;
  }, null, { timeout: 45000 });

  Object.assign(result, await page.evaluate(() => {
    const flow = document.querySelector('#postPreviewFlow');
    const cta = [...document.querySelectorAll('button')].find((button) => /Request My Custom Proof/i.test(button.textContent || ''));
    const modal = document.querySelector('#emailGateOverlay');
    const html = document.body.innerText;
    let parentHidden = false;
    for (let node = flow; node; node = node.parentElement) {
      const styles = getComputedStyle(node);
      if (node.hidden || styles.display === 'none' || styles.visibility === 'hidden') parentHidden = true;
    }
    return {
      flowVisible: !!flow && flow.hidden === false && flow.getBoundingClientRect().width > 0,
      parentHidden,
      ctaVisible: !!cta && cta.offsetParent !== null && cta.getBoundingClientRect().width > 0,
      ctaFocusable: !!cta && typeof cta.focus === 'function',
      checkoutHonest: /Checkout disabled until D1|No checkout today|payment is not collected here/i.test(html),
      noQualityScore: !/(SSIM|Gold|Silver|Bronze|quality score|public quality|ΔE)/i.test(html),
      modalInitiallyHidden: !!modal && modal.hidden === true
    };
  }));

  await page.locator('button', { hasText: 'Request My Custom Proof' }).click();
  await page.waitForFunction(() => {
    const modal = document.querySelector('#emailGateOverlay');
    return modal && modal.hidden === false && modal.getAttribute('aria-hidden') === 'false';
  }, null, { timeout: 10000 });

  await page.fill('#emailInput', 'derek+mosapack-b15-proof-path@example.com');
  await page.fill('#nameInput', 'B1.5 proof path verification');
  await page.selectOption('#photoCategoryInput', 'Pet');
  await page.fill('#noteInput', 'Automated B1.5 proof path verification. Safe to delete.');

  let capturedPost = '';
  await page.route('http://127.0.0.1:$SERVER_PORT/', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      capturedPost = request.postData() || '';
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>OK</title>OK' });
    } else {
      await route.continue();
    }
  });
  result.modalOpened = await page.evaluate(() => document.querySelector('#emailGateOverlay')?.hidden === false);

  await page.click('#emailGateSubmit');
  await page.waitForTimeout(250);

  Object.assign(result, await page.evaluate(() => {
    const form = document.querySelector('#emailGateForm');
    const fileInputs = form ? [...form.querySelectorAll('input')].filter((input) => /file|image/i.test(input.type + ' ' + input.name + ' ' + input.id)).length : 99;
    return {
      emailField: !!document.querySelector('#emailInput'),
      categoryField: !!document.querySelector('#photoCategoryInput'),
      closeButton: !!document.querySelector('.email-gate-close'),
      noFileInputs: fileInputs === 0
    };
  }));

  result.payloadSafe = capturedPost.length > 0 &&
    /request_type=custom_proof/.test(capturedPost) &&
    /proof_requested=true/.test(capturedPost) &&
    /recommended_format=/.test(capturedPost) &&
    /photo_category=/.test(capturedPost) &&
    !/filename=|image=|file=|data%3Aimage|data:image|base64/i.test(capturedPost);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  result.mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  result.pass = result.flowVisible && !result.parentHidden && result.ctaVisible && result.ctaFocusable &&
    result.modalInitiallyHidden && result.modalOpened && result.emailField && result.categoryField &&
    result.closeButton && result.noFileInputs && result.payloadSafe && result.mobileOverflow <= 2 &&
    result.noQualityScore && result.checkoutHonest;
  return result;
}")"

echo "$RESULT"

node -e "const result = JSON.parse(process.argv[1]); if (!result.pass) { console.error(JSON.stringify(result, null, 2)); process.exit(1); }" "$RESULT" \
  || fail "browser proof-path assertions failed"

echo "B1.5 proof path verification passed."
