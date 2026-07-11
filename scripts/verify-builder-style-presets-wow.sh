#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILDER="$ROOT/public/builder/index.html"
ROOT_PAGE="$ROOT/public/index.html"
PWCLI="${PWCLI:-$HOME/.codex/skills/playwright/scripts/playwright_cli.sh}"

fail() {
  echo "Builder style presets verification failed: $*" >&2
  exit 1
}

test -f "$ROOT_PAGE" || fail "public/index.html missing"
test -f "$BUILDER" || fail "public/builder/index.html missing"
test -x "$PWCLI" || fail "Playwright CLI wrapper missing at $PWCLI"

grep -q "Choose a mosaic style" "$BUILDER" || fail "style preset section missing"
grep -q "style_preset_id" "$BUILDER" || fail "style_preset_id metadata missing"
grep -q "style_preset_params" "$BUILDER" || fail "style_preset_params metadata missing"
grep -q "alternate_style_ids" "$BUILDER" || fail "alternate_style_ids metadata missing"
grep -q "style_variant_count" "$BUILDER" || fail "style_variant_count metadata missing"
grep -q "applyStylePresetToImageData" "$BUILDER" || fail "style renderer transform missing"

PORT="$(python3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
)"

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT/public" >/tmp/mosapack-style-presets-server.log 2>&1 &
SERVER_PID=$!
TMP_JS=""
trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true; [[ -n "$TMP_JS" ]] && rm -f "$TMP_JS"' EXIT
sleep 1

"$PWCLI" close-all >/dev/null 2>&1 || true
"$PWCLI" open "http://127.0.0.1:$PORT/" >/dev/null

TMP_JS="$(mktemp /tmp/mosapack-style-presets-XXXXXX.js)"
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
    'advanced settings'
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
        }).length
      };
    }, blocked);
  }

  async function reachPreview(sample = 'pet', width = 1440, height = 900) {
    await page.setViewportSize({ width, height });
    await page.goto(baseUrl + '/builder/', { waitUntil: 'networkidle' });
    await page.click('.sample-photo-button[data-sample="' + sample + '"]');
    await page.waitForFunction(() => document.body.classList.contains('wizard-state-crop'), null, { timeout: 15000 });
    await page.evaluate(() => {
      const cropButton = document.getElementById('cropGenerateButton');
      const sticky = document.getElementById('wizardStickyButton');
      const visible = (node) => {
        if (!node) return false;
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
      };
      (visible(cropButton) ? cropButton : sticky)?.click();
    });
    await page.waitForFunction(() => document.body.classList.contains('wizard-state-preview') && !document.getElementById('generationStateCard')?.hidden, null, { timeout: 10000 }).catch(() => {});
    await page.waitForFunction(() => {
      const src = document.getElementById('proofMosaicThumbnail')?.getAttribute('src') || '';
      return document.body.classList.contains('wizard-state-preview')
        && document.body.classList.contains('builder-has-preview')
        && !document.body.classList.contains('is-generating-preview')
        && !document.getElementById('postPreviewFlow')?.hidden
        && src.startsWith('data:image/');
    }, null, { timeout: 30000 });
    await page.waitForTimeout(750);
  }

  function canvasSignature() {
    return page.evaluate(() => {
      const canvas = document.getElementById('mosaicCanvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
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

  async function waitForCanvasSignatureChange(previous, label) {
    await page.waitForFunction((prev) => {
      const canvas = document.getElementById('mosaicCanvas');
      if (!canvas || !canvas.width || !canvas.height) return false;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
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
      throw new Error(label + ' did not change the main mosaic preview');
    });
    return canvasSignature();
  }

  async function step3State() {
    return page.evaluate(() => {
      const isVisible = (node) => {
        if (!node) return false;
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && box.width > 0 && box.height > 0;
      };
      const allStyleButtons = Array.from(document.querySelectorAll('.style-preset-option'));
      const styleButtons = allStyleButtons.filter(isVisible);
      const activeButton = (styleButtons.find((node) => node.getAttribute('aria-checked') === 'true')
        || allStyleButtons.find((node) => node.getAttribute('aria-checked') === 'true'));
      const filledButtons = Array.from(document.querySelectorAll('#postPreviewFlow button, #postPreviewFlow a')).filter((node) => {
        if (!isVisible(node) || !node.innerText.trim()) return false;
        const style = getComputedStyle(node);
        const bg = style.backgroundColor + ' ' + style.backgroundImage;
        return !bg.includes('rgba(0, 0, 0, 0)') && !bg.includes('transparent');
      }).map((node) => ({ text: node.innerText.trim(), bg: getComputedStyle(node).backgroundColor, image: getComputedStyle(node).backgroundImage, classes: node.className, height: node.getBoundingClientRect().height }));
      const proofCta = document.getElementById('requestProofButton');
      const thumbnails = styleButtons.map((node) => {
        const img = node.querySelector('.style-preset-thumb img');
        const style = img ? getComputedStyle(img) : null;
        return {
          id: node.dataset.stylePreset,
          checked: node.getAttribute('aria-checked') === 'true',
          text: node.innerText,
          hasImage: Boolean(img?.src),
          cssFilter: style?.filter || 'none',
          height: node.getBoundingClientRect().height,
          width: node.getBoundingClientRect().width
        };
      });
      const text = document.getElementById('postPreviewFlow')?.innerText || '';
      const card = document.querySelector('[data-testid="preview-step-card"]')?.getBoundingClientRect();
      const stepper = document.querySelector('[data-testid="wizard-stepper"]')?.getBoundingClientRect();
      return {
        text,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        styleSection: Boolean(document.getElementById('stylePresetSection')),
        rawButtonCount: allStyleButtons.length,
        postPreviewHidden: document.getElementById('postPreviewFlow')?.hidden,
        bodyClass: document.body.className,
        sectionRect: (() => {
          const node = document.getElementById('stylePresetSection');
          const box = node?.getBoundingClientRect();
          return box ? { top: box.top, width: box.width, height: box.height, display: getComputedStyle(node).display, visibility: getComputedStyle(node).visibility } : null;
        })(),
        buttonCount: styleButtons.length,
        activeStyle: activeButton?.dataset.stylePreset || '',
        thumbnails,
        hiddenStyleId: document.getElementById('saveStylePresetId')?.value || '',
        hiddenStyleLabel: document.getElementById('saveStylePresetLabel')?.value || '',
        hiddenStyleParams: document.getElementById('saveStylePresetParams')?.value || '',
        productInterest: document.getElementById('saveProductInterest')?.value || '',
        formatInterest: document.getElementById('saveFormatInterest')?.value || '',
        preferredSizeIn: document.getElementById('savePreferredSizeIn')?.value || '',
        tweaks: document.getElementById('savePreviewTweaks')?.value || '',
        filledButtons,
        ctaCount: isVisible(proofCta) && proofCta?.innerText.trim() === 'Request my free proof' ? 1 : 0,
        primaryCta: proofCta ? { text: proofCta.innerText.trim(), bg: getComputedStyle(proofCta).backgroundColor, image: getComputedStyle(proofCta).backgroundImage, height: proofCta.getBoundingClientRect().height } : null,
        topGap: card && stepper ? card.top - stepper.bottom : null,
        cardTop: card?.top || null,
        mobileHeight: document.getElementById('postPreviewFlow')?.getBoundingClientRect().height || 0,
        stickyVisible: isVisible(document.getElementById('wizardStickyCta')),
        hasPublicForbiddenWords: /\\b(filter|AI|enhance|advanced|settings|palette|dither|production|shipping|checkout|vinyl|guaranteed|Mosaic Clean)\\b/i.test(text)
      };
    });
  }

  const rootAudit = await auditPublicPath('/');
  const builderAudit = await auditPublicPath('/builder/');
  assert(rootAudit.leaks.length === 0, '/ leaked blocked terms: ' + rootAudit.leaks.join(', '));
  assert(builderAudit.leaks.length === 0, '/builder/ leaked blocked terms: ' + builderAudit.leaks.join(', '));
  assert(builderAudit.h1Count === 1, '/builder/ visible H1 count should be 1, got ' + builderAudit.h1Count);

  await page.goto(baseUrl + '/builder/?ops=1', { waitUntil: 'networkidle' });
  const opsAudit = await page.evaluate(() => ({
    isOps: document.body.classList.contains('is-ops-mode'),
    hasProofExport: document.body.textContent.includes('Proof Export Tools')
  }));
  assert(opsAudit.isOps && opsAudit.hasProofExport, '/builder/?ops=1 did not mount operator tools');

  await reachPreview('pet', 1440, 900);
  const initial = await step3State();
  assert(initial.styleSection, 'style preset section missing on Step 3');
  assert(initial.buttonCount >= 5 && initial.buttonCount <= 6, 'expected 5-6 default visible style presets, got ' + initial.buttonCount + ' raw=' + initial.rawButtonCount + ' hidden=' + initial.postPreviewHidden + ' body=' + initial.bodyClass + ' rect=' + JSON.stringify(initial.sectionRect));
  assert(initial.activeStyle === 'true_color', 'True Color not selected by default: ' + initial.activeStyle);
  assert(initial.hiddenStyleId === 'true_color', 'style_preset_id hidden default wrong: ' + initial.hiddenStyleId);
  assert(initial.productInterest === 'sticker_proof', 'product_interest not sticker_proof');
  assert(initial.formatInterest === 'sticker_ready', 'format_interest default wrong');
  assert(initial.preferredSizeIn === '12', 'preferred_size_in default wrong');
  assert(initial.thumbnails.every((thumb) => thumb.hasImage), 'not every visible style thumbnail has an image');
  assert(initial.thumbnails.every((thumb) => thumb.cssFilter === 'none'), 'style thumbnails use CSS visual effects');
  assert(initial.thumbnails.every((thumb) => thumb.height >= 44 && thumb.width >= 44), 'style targets below tap target size');
  assert(!initial.hasPublicForbiddenWords, 'Step 3 style text includes banned public wording');
  assert(initial.ctaCount === 1, 'expected one Step 3 proof CTA, got ' + initial.ctaCount);
  assert(initial.overflowX <= 1, 'desktop overflow: ' + initial.overflowX);
  assert(initial.cardTop <= 360, 'Step 3 top gap regressed: ' + initial.cardTop);
  assert(initial.topGap <= 40, 'stepper-to-card gap regressed: ' + initial.topGap);

  const trueSignature = await canvasSignature();
  await page.click('.style-preset-option[data-style-preset="bright_pop"]');
  await page.waitForFunction(() => document.getElementById('saveStylePresetId')?.value === 'bright_pop', null, { timeout: 30000 });
  const brightSignature = await waitForCanvasSignatureChange(trueSignature, 'Bright Pop');

  await page.click('.style-preset-option[data-style-preset="calm_background"]');
  await page.waitForFunction(() => document.getElementById('saveStylePresetId')?.value === 'calm_background', null, { timeout: 30000 });
  const calmSignature = await waitForCanvasSignatureChange(brightSignature, 'Calm Background');

  await page.click('.style-preset-option[data-style-preset="mono_keepsake"]');
  await page.waitForFunction(() => document.getElementById('saveStylePresetId')?.value === 'mono_keepsake', null, { timeout: 30000 });
  await waitForCanvasSignatureChange(calmSignature, 'Mono Keepsake');

  await page.click('#previewFineTuneToggle');
  await page.click('[data-tweak="contrast"][data-value="1"]');
  await page.waitForFunction(() => {
    const data = JSON.parse(document.getElementById('savePreviewTweaks')?.value || '{}');
    return data.contrast === 1 && data.regen_count > 0;
  }, null, { timeout: 30000 });
  const afterTweak = await step3State();
  assert(afterTweak.hiddenStyleId === 'mono_keepsake', 'style did not persist after fine-tune');
  assert(JSON.parse(afterTweak.tweaks).contrast === 1, 'preview_tweaks did not persist after style selection');

  await page.click('#requestProofButton');
  await page.waitForFunction(() => !document.getElementById('emailGateOverlay')?.hidden, null, { timeout: 10000 });
  const modalSummary = await page.evaluate(() => ({
    style: document.getElementById('proofSummaryStyle')?.innerText || '',
    formStyleId: document.getElementById('saveStylePresetId')?.value || '',
    params: document.getElementById('saveStylePresetParams')?.value || '',
    alternates: document.getElementById('saveAlternateStyleIds')?.value || '',
    variantCount: document.getElementById('saveStyleVariantCount')?.value || ''
  }));
  assert(modalSummary.style === 'Mono Keepsake', 'proof summary did not show selected style: ' + modalSummary.style);
  assert(modalSummary.formStyleId === 'mono_keepsake', 'form style id not ready for submit');
  assert(JSON.parse(modalSummary.params).grayscale === true, 'style params missing in form');
  assert(JSON.parse(modalSummary.alternates).length === 0, 'alternates should be empty when deferred');
  assert(modalSummary.variantCount === '1', 'style variant count should be 1');

  await reachPreview('first_hello', 1440, 900);
  const firstHello = await step3State();
  assert(firstHello.thumbnails.some((thumb) => thumb.id === 'first_hello'), 'First Hello style did not appear for Baby / First Hello sample');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl + '/builder/', { waitUntil: 'networkidle' });
  await page.click('.sample-photo-button[data-sample="family"]');
  await page.waitForFunction(() => document.body.classList.contains('wizard-state-crop'), null, { timeout: 15000 });
  await page.evaluate(() => {
    const cropButton = document.getElementById('cropGenerateButton');
    const sticky = document.getElementById('wizardStickyButton');
    const visible = (node) => {
      if (!node) return false;
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
    };
    (visible(cropButton) ? cropButton : sticky)?.click();
  });
  await page.waitForFunction(() => {
    const src = document.getElementById('proofMosaicThumbnail')?.getAttribute('src') || '';
    return document.body.classList.contains('wizard-state-preview')
      && document.body.classList.contains('builder-has-preview')
      && !document.body.classList.contains('is-generating-preview')
      && !document.getElementById('postPreviewFlow')?.hidden
      && src.startsWith('data:image/');
  }, null, { timeout: 30000 });
  await page.waitForTimeout(750);
  const mobile = await step3State();
  assert(mobile.overflowX <= 1, 'mobile overflow: ' + mobile.overflowX);
  assert(mobile.mobileHeight <= 1300, 'mobile Step 3 too tall: ' + mobile.mobileHeight);
  assert(mobile.stickyVisible, 'mobile sticky CTA not visible');
  assert(mobile.buttonCount >= 5, 'mobile style strip missing presets');

  return JSON.stringify({ rootAudit, builderAudit, opsAudit, initial, afterTweak, modalSummary, firstHello, mobile }, null, 2);
}
JS

VERIFY_OUTPUT="$("$PWCLI" run-code "$(cat "$TMP_JS")")"
if [[ "$VERIFY_OUTPUT" == *"### Error"* ]]; then
  echo "$VERIFY_OUTPUT"
  fail "Playwright verification reported an error"
fi
printf '%s\n' "$VERIFY_OUTPUT" > /tmp/mosapack-builder-style-presets-wow-verifier.json

echo "Builder style presets verification passed."
