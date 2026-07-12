#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILDER="$ROOT/public/builder/index.html"
ROOT_PAGE="$ROOT/public/index.html"
PWCLI="${PWCLI:-$HOME/.codex/skills/playwright/scripts/playwright_cli.sh}"

fail() {
  echo "Builder commercial/wow completion verification failed: $*" >&2
  exit 1
}

test -f "$ROOT_PAGE" || fail "public/index.html missing"
test -f "$BUILDER" || fail "public/builder/index.html missing"
test -x "$PWCLI" || fail "Playwright CLI wrapper missing at $PWCLI"

grep -q "See your photo as a sticker mosaic — free" "$BUILDER" || fail "Step 1 commercial headline missing"
grep -q "demo-transform-strip" "$BUILDER" || fail "above-fold before/after demos missing"
grep -q "Choose a mosaic style" "$BUILDER" || fail "style preset section missing"
grep -q "Get my free proof" "$BUILDER" || fail "commercial proof CTA missing"
grep -q "style_preset_id" "$BUILDER" || fail "style_preset_id metadata missing"
grep -q "preview_tweaks" "$BUILDER" || fail "preview_tweaks metadata missing"
grep -q "novalidate" "$BUILDER" || fail "proof request form must use custom validation"
grep -q "og:title" "$ROOT_PAGE" || fail "root Open Graph metadata missing"
grep -q "og:title" "$BUILDER" || fail "builder Open Graph metadata missing"
test -f "$ROOT/public/assets/mosapack-social-card.svg" || fail "synthetic social card missing"
test -f "$ROOT/public/privacy.html" || fail "/privacy.html placeholder missing"
test -f "$ROOT/public/terms.html" || fail "/terms.html placeholder missing"
test -f "$ROOT/public/contact.html" || fail "/contact.html placeholder missing"
test -f "$ROOT/docs/mosapack/backlog/builder-ai-first-opportunities-v1.md" || fail "AI backlog doc missing"
test -f "$ROOT/PROJECT-STATUS.md" || fail "PROJECT-STATUS.md missing"

PORT="$(python3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
)"

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT/public" >/tmp/mosapack-commercial-wow-server.log 2>&1 &
SERVER_PID=$!
TMP_JS=""
trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true; [[ -n "$TMP_JS" ]] && rm -f "$TMP_JS"' EXIT
sleep 1

"$PWCLI" close-all >/dev/null 2>&1 || true
"$PWCLI" open "http://127.0.0.1:$PORT/" >/dev/null

TMP_JS="$(mktemp /tmp/mosapack-commercial-wow-XXXXXX.js)"
cat > "$TMP_JS" <<JS
async (page) => {
  const baseUrl = 'http://127.0.0.1:$PORT';
  const blocked = [
    'LEGO','LEGO-compatible','brick','bricks','Brick quote','Premium Brick','Total Bricks',
    'Build Time','Pack Efficiency','Advanced exports','BOM','PDF','canonical JSON',
    'Production JSON','Netlify','B2','OL2050','Gate A','generator','stock sheets','hybrid',
    'topoff','Mosaic Clean','Advanced Tools','Proof Export Tools','Save Your Design',
    'Saved design','Saved preview','\\\$0.00','DIY Templates','Download SVG','Cricut',
    'Silhouette','Instant download','\\\$5','shipping','shipped','delivered',
    'production begins','peel-to-reveal','peel-and-place','digital launch access',
    'feasibility review','your kit will match this preview','Advanced Options',
    'advanced settings','Shopify','Amazon affiliate','checkout','cart','order confirmed',
    'ships in','delivered by','guaranteed'
  ];
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const visible = (node) => {
    if (!node) return false;
    const box = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && box.width > 0 && box.height > 0;
  };

  async function auditPublicPath(path) {
    await page.goto(baseUrl + path, { waitUntil: 'networkidle' });
    return page.evaluate((blockedTerms) => {
      const text = document.body.innerText + '\\n' + document.body.textContent;
      const lower = text.toLowerCase();
      return {
        path: location.pathname + location.search,
        leaks: blockedTerms.filter((term) => lower.includes(term.toLowerCase())),
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        h1Count: Array.from(document.querySelectorAll('h1')).filter((node) => {
          const box = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
        }).length,
        bodyText: document.body.innerText
      };
    }, blocked);
  }

  async function reachPreview(sample = 'pet', width = 1440, height = 900) {
    await page.setViewportSize({ width, height });
    await page.goto(baseUrl + '/builder/', { waitUntil: 'networkidle' });
    await page.click('.sample-photo-button[data-sample="' + sample + '"]');
    await page.waitForFunction(() => document.body.classList.contains('wizard-state-crop'), null, { timeout: 15000 });
    await page.click('#cropRotateButton');
    await page.click('#cropFitButton');
    await page.click('#cropFillButton');
    await page.evaluate(() => {
      const visible = (node) => {
        if (!node) return false;
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
      };
      const cropButton = document.getElementById('cropGenerateButton');
      const stickyButton = document.getElementById('wizardStickyButton');
      (visible(cropButton) ? cropButton : stickyButton)?.click();
    });
    await page.waitForFunction(() => !document.getElementById('generationStateCard')?.hidden, null, { timeout: 10000 });
    await page.waitForFunction(() => {
      const src = document.getElementById('proofMosaicThumbnail')?.getAttribute('src') || '';
      return document.body.classList.contains('wizard-state-preview')
        && document.body.classList.contains('builder-has-preview')
        && !document.body.classList.contains('is-generating-preview')
        && src.startsWith('data:image/');
    }, null, { timeout: 30000 });
    await page.waitForTimeout(700);
  }

  async function canvasSignature() {
    return page.evaluate(() => {
      const canvas = document.getElementById('mosaicCanvas');
      const sample = document.createElement('canvas');
      sample.width = 64;
      sample.height = 64;
      const sctx = sample.getContext('2d', { willReadFrequently: true });
      sctx.drawImage(canvas, 0, 0, 64, 64);
      const data = sctx.getImageData(0, 0, 64, 64).data;
      let hash = 2166136261;
      for (let i = 0; i < data.length; i += 4) {
        hash ^= data[i] + data[i + 1] * 3 + data[i + 2] * 7;
        hash = Math.imul(hash, 16777619);
      }
      return String(hash >>> 0);
    });
  }

  async function waitForCanvasChange(previous, label) {
    await page.waitForFunction((prev) => {
      const canvas = document.getElementById('mosaicCanvas');
      if (!canvas || !canvas.width) return false;
      const sample = document.createElement('canvas');
      sample.width = 64;
      sample.height = 64;
      const sctx = sample.getContext('2d', { willReadFrequently: true });
      sctx.drawImage(canvas, 0, 0, 64, 64);
      const data = sctx.getImageData(0, 0, 64, 64).data;
      let hash = 2166136261;
      for (let i = 0; i < data.length; i += 4) {
        hash ^= data[i] + data[i + 1] * 3 + data[i + 2] * 7;
        hash = Math.imul(hash, 16777619);
      }
      return String(hash >>> 0) !== prev;
    }, previous, { timeout: 30000 }).catch(() => {
      throw new Error(label + ' did not change mosaic preview');
    });
    return canvasSignature();
  }

  function getStepState() {
    return page.evaluate(() => {
      const visible = (node) => {
        if (!node) return false;
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && box.width > 0 && box.height > 0;
      };
      const text = document.body.innerText;
      const post = document.getElementById('postPreviewFlow');
      const styleButtons = Array.from(document.querySelectorAll('.style-preset-option')).filter(visible);
      const cta = document.getElementById('requestProofButton');
      const primaryButtons = Array.from((post || document).querySelectorAll('.btn-primary')).filter((node) => visible(node) && node.innerText.trim());
      const stepperText = document.querySelector('[data-testid="wizard-stepper"]')?.innerText || '';
      const mobileProgress = document.getElementById('wizardMobileProgress')?.innerText || '';
      const firstInvalidCapable = document.getElementById('emailGateForm')?.hasAttribute('novalidate') || false;
      const liveText = Array.from(document.querySelectorAll('[aria-live]')).filter(visible).map((node) => node.innerText.trim()).join('');
      return {
        text,
        stepperText,
        mobileProgress,
        uploadExamples: document.querySelectorAll('.demo-transform-card').length,
        hasCategoryBeforeUpload: document.body.classList.contains('wizard-state-upload') && Boolean(document.getElementById('photoCategorySelect')),
        h1Count: Array.from(document.querySelectorAll('h1')).filter(visible).length,
        styleCount: styleButtons.length,
        selectedStyle: Array.from(document.querySelectorAll('.style-preset-option')).find((node) => node.getAttribute('aria-checked') === 'true')?.dataset.stylePreset || '',
        thumbnailsOk: styleButtons.every((node) => {
          const img = node.querySelector('img');
          return img && img.src.startsWith('data:image/') && getComputedStyle(img).filter === 'none';
        }),
        firstHelloVisible: Boolean(document.querySelector('.style-preset-option[data-style-preset="first_hello"]')),
        filledButtonTexts: primaryButtons.map((node) => node.innerText.trim()).filter(Boolean),
        cta: cta ? { text: cta.innerText.trim(), bg: getComputedStyle(cta).backgroundColor, image: getComputedStyle(cta).backgroundImage, height: cta.getBoundingClientRect().height } : null,
        adjustCropClass: document.getElementById('adjustCropButton')?.className || '',
        formatBeforeCta: Boolean(document.getElementById('previewChoices') && cta) ? document.getElementById('previewChoices').getBoundingClientRect().top < cta.getBoundingClientRect().top : false,
        sizeContext: document.getElementById('previewSizeContext')?.innerText || '',
        fineTuneOpen: !document.getElementById('previewFineTunePanel')?.hidden,
        stickyVisible: visible(document.getElementById('wizardStickyCta')),
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        postHeight: post?.getBoundingClientRect().height || 0,
        liveText,
        firstInvalidCapable,
        title: document.title,
        analyticsEvents: window.__mosapackAnalyticsEvents || [],
        hiddenStyleId: document.getElementById('saveStylePresetId')?.value || '',
        productInterest: document.getElementById('saveProductInterest')?.value || '',
        formatInterest: document.getElementById('saveFormatInterest')?.value || '',
        preferredSizeIn: document.getElementById('savePreferredSizeIn')?.value || '',
        tweaks: document.getElementById('savePreviewTweaks')?.value || '',
        modalOpen: !document.getElementById('emailGateOverlay')?.hidden,
        modalTitleBox: document.getElementById('emailGateTitle')?.getBoundingClientRect().toJSON?.() || null,
        summaryStyle: document.getElementById('proofSummaryStyle')?.innerText || '',
        proofRefText: document.getElementById('proofNextStepProjectRef')?.innerText || ''
      };
    });
  }

  const rootAudit = await auditPublicPath('/');
  assert(rootAudit.leaks.length === 0, 'root leaks: ' + rootAudit.leaks.join(', '));
  assert(rootAudit.overflowX <= 1, 'root overflow: ' + rootAudit.overflowX);

  const builderAudit = await auditPublicPath('/builder/');
  assert(builderAudit.leaks.length === 0, 'builder leaks: ' + builderAudit.leaks.join(', '));
  assert(builderAudit.h1Count === 1, 'builder visible H1 count should be 1');
  assert(builderAudit.bodyText.includes('See your photo as a sticker mosaic — free'), 'commercial upload headline missing');
  assert(!builderAudit.bodyText.includes('Step 1 of 5'), 'old 5-step copy leaked');

  await page.goto(baseUrl + '/builder/?ops=1', { waitUntil: 'networkidle' });
  const opsAudit = await page.evaluate(() => ({
    hasOps: document.body.classList.contains('is-ops-mode'),
    text: document.body.innerText,
    hasAdvancedToolsNode: Boolean(document.getElementById('advancedTools')),
    hasProofExportToolsNode: Boolean(document.getElementById('proofExportTools')),
    overflowX: document.documentElement.scrollWidth - window.innerWidth
  }));
  assert(opsAudit.hasOps, 'ops mode class missing');
  assert(opsAudit.hasAdvancedToolsNode && opsAudit.hasProofExportToolsNode, 'ops tools did not mount');

  await reachPreview('pet');
  const previewInitial = await getStepState();
  assert(previewInitial.stepperText.includes('Upload') && previewInitial.stepperText.includes('Preview') && previewInitial.stepperText.includes('Get proof'), '3-step progress labels missing');
  assert(!previewInitial.stepperText.includes('Crop') && !previewInitial.mobileProgress.includes('of 5'), 'public progress still exposes old steps');
  assert(previewInitial.uploadExamples === 3, 'product examples missing');
  assert(previewInitial.styleCount >= 5, 'style presets missing');
  assert(previewInitial.selectedStyle === 'true_color', 'True Color not default selected');
  assert(previewInitial.thumbnailsOk, 'style thumbnails must be real data images without CSS filters');
  assert(!previewInitial.firstHelloVisible, 'First Hello should not show for Pet');
  assert(previewInitial.cta.text === 'Get my free proof', 'Step 3 CTA text mismatch');
  assert(previewInitial.cta.height >= 44, 'CTA target too small');
  assert(previewInitial.filledButtonTexts.filter((text) => text === 'Get my free proof').length === 1, 'expected one filled proof CTA');
  assert(previewInitial.adjustCropClass.includes('preview-quiet-action'), 'Adjust crop is not quiet');
  assert(previewInitial.formatBeforeCta, 'format/size choices should be above CTA');
  assert(previewInitial.sizeContext.includes('laptop'), '12 inch size context missing');
  assert(!previewInitial.fineTuneOpen, 'fine-tune should be collapsed by default');
  assert(previewInitial.overflowX <= 1, 'desktop overflow: ' + previewInitial.overflowX);
  assert(previewInitial.productInterest === 'sticker_proof', 'product_interest not sticker_proof');

  let signature = await canvasSignature();
  await page.click('.style-preset-option[data-style-preset="bright_pop"]');
  await page.waitForFunction(() => document.getElementById('saveStylePresetId')?.value === 'bright_pop', null, { timeout: 30000 });
  signature = await waitForCanvasChange(signature, 'Bright Pop');
  await page.click('.style-preset-option[data-style-preset="calm_background"]');
  await page.waitForFunction(() => document.getElementById('saveStylePresetId')?.value === 'calm_background', null, { timeout: 30000 });
  signature = await waitForCanvasChange(signature, 'Calm Background');
  await page.click('.style-preset-option[data-style-preset="mono_keepsake"]');
  await page.waitForFunction(() => document.getElementById('saveStylePresetId')?.value === 'mono_keepsake', null, { timeout: 30000 });
  await waitForCanvasChange(signature, 'Mono Keepsake');
  await page.click('.style-preset-option[data-style-preset="bright_pop"]');
  await page.waitForFunction(() => document.getElementById('saveStylePresetId')?.value === 'bright_pop', null, { timeout: 30000 });

  await page.click('#previewFineTuneToggle');
  await page.click('[data-tweak="contrast"][data-value="1"]');
  await page.waitForFunction(() => {
    const data = JSON.parse(document.getElementById('savePreviewTweaks')?.value || '{}');
    return data.contrast === 1 && data.regen_count > 0;
  }, null, { timeout: 30000 });

  await page.click('.preferred-size-option:has(input[name="preferred_size_choice"][value="16"])');
  await page.waitForFunction(() => document.getElementById('previewSizeContext')?.innerText.includes('shelf'), null, { timeout: 10000 });
  const afterChoices = await getStepState();
  assert(afterChoices.hiddenStyleId === 'bright_pop', 'style hidden field did not persist');
  assert(afterChoices.preferredSizeIn === '16', 'preferred size hidden field did not update');
  assert(JSON.parse(afterChoices.tweaks).contrast === 1, 'preview tweaks not preserved');

  await page.click('#requestProofButton');
  await page.waitForFunction(() => !document.getElementById('emailGateOverlay')?.hidden, null, { timeout: 10000 });
  const modalOpen = await getStepState();
  assert(modalOpen.modalOpen, 'proof modal did not open');
  assert(modalOpen.summaryStyle === 'Bright Pop', 'proof summary style missing');
  assert(modalOpen.firstInvalidCapable, 'form does not use novalidate');
  assert(!modalOpen.text.includes('Save Your Design'), 'old save wording leaked');

  await page.click('#emailGateSubmit');
  await page.waitForFunction(() => document.getElementById('nameInput') === document.activeElement, null, { timeout: 10000 });
  const validation = await page.evaluate(() => ({
    nameInvalid: document.getElementById('nameInput')?.getAttribute('aria-invalid'),
    nameError: document.getElementById('nameError')?.innerText || ''
  }));
  assert(validation.nameInvalid === 'true', 'first invalid field did not get aria-invalid');
  assert(validation.nameError.includes('Please add your name'), 'custom name validation missing');

  await page.evaluate(() => {
    const originalFetch = window.fetch.bind(window);
    window.__mosapackCapturedRequests = [];
    window.fetch = async (url, options = {}) => {
      const href = String(url);
      window.__mosapackCapturedRequests.push({ url: href, body: String(options.body || '') });
      if (href.includes('/.netlify/functions/save-project')) {
        return new Response(JSON.stringify({ ok: true, project_id: 'local-commercial-wow', save_version: 'test' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (href === '/' || href.endsWith('/')) {
        return new Response('ok', { status: 200 });
      }
      return originalFetch(url, options);
    };
  });
  await page.fill('#nameInput', 'Derek Test');
  await page.fill('#emailInput', 'derek+mosapack-commercial-wow-smoke@example.com');
  await page.check('#designStorageConsent');
  await page.click('#emailGateSubmit');
  await page.waitForFunction(() => document.body.classList.contains('wizard-state-saved'), null, { timeout: 30000 });
  const saved = await getStepState();
  assert(saved.text.includes('Your mosaic is with our team'), 'saved state title missing');
  assert(saved.text.includes('Reference:'), 'saved reference missing');
  assert(saved.text.includes('Request received') && saved.text.includes('A person checks your design') && saved.text.includes('We email your proof'), 'saved timeline missing');
  assert(saved.proofRefText.includes('MP-'), 'proof reference code missing');

  const captured = await page.evaluate(() => window.__mosapackCapturedRequests || []);
  const saveRequest = captured.find((item) => item.url.includes('/.netlify/functions/save-project'));
  assert(saveRequest, 'save-project request not captured');
  const payload = JSON.parse(saveRequest.body);
  assert(payload.product_interest === 'sticker_proof', 'saved payload product_interest mismatch');
  assert(payload.format_interest === 'sticker_ready', 'saved payload format_interest mismatch');
  assert(payload.preferred_size_in === 16, 'saved payload preferred_size_in mismatch');
  assert(payload.style_preset_id === 'bright_pop', 'saved payload style_preset_id mismatch');
  assert(payload.preview_tweaks?.contrast === 1, 'saved payload preview_tweaks missing');
  assert(payload.photo_category === 'Pet', 'saved payload photo_category mismatch');
  assert(payload.proof_ref?.startsWith('MP-'), 'saved payload proof_ref missing');

  const analytics = await page.evaluate(() => window.__mosapackAnalyticsEvents || []);
  const eventNames = analytics.map((event) => event.event);
  for (const expected of ['sample_started','crop_confirmed','preview_generation_started','preview_rendered','style_preset_selected','finetune_opened','finetune_changed','size_changed','proof_modal_opened','proof_validation_error','proof_requested','proof_confirmed','proof_saved']) {
    assert(eventNames.includes(expected), 'analytics event missing: ' + expected);
  }
  assert(!JSON.stringify(analytics).includes('derek+mosapack-commercial-wow-smoke@example.com'), 'analytics payload leaked email');
  assert(!JSON.stringify(analytics).includes('Derek Test'), 'analytics payload leaked name');

  await page.setViewportSize({ width: 390, height: 844 });
  await reachPreview('family', 390, 844);
  const mobile = await getStepState();
  assert(mobile.overflowX <= 1, 'mobile overflow: ' + mobile.overflowX);
  assert(mobile.postHeight <= 1300, 'mobile preview too tall: ' + mobile.postHeight);
  assert(mobile.stickyVisible, 'mobile sticky CTA missing');

  await reachPreview('first_hello');
  const firstHello = await getStepState();
  assert(firstHello.firstHelloVisible, 'First Hello style missing for Baby / First Hello sample');

  return JSON.stringify({ rootAudit, builderAudit, opsAudit, previewInitial, afterChoices, modalOpen, validation, saved, payload, mobile, firstHello, analyticsEvents: eventNames }, null, 2);
}
JS

VERIFY_OUTPUT="$("$PWCLI" run-code "$(cat "$TMP_JS")")"
if [[ "$VERIFY_OUTPUT" == *"### Error"* ]]; then
  echo "$VERIFY_OUTPUT"
  fail "Playwright verification reported an error"
fi
printf '%s\n' "$VERIFY_OUTPUT" > /tmp/mosapack-builder-commercial-wow-completion-verifier.json

BYTES="$(wc -c < "$BUILDER" | tr -d ' ')"
echo "Builder commercial/wow completion verification passed. public/builder/index.html bytes: $BYTES"
