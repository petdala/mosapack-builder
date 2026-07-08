#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAIL=0

required_files=(
  "public/index.html"
  "public/builder/index.html"
  "public/404.html"
  "public/legal/privacy.html"
  "public/legal/terms.html"
  "public/legal/returns.html"
  "public/contact/index.html"
  "docs/mosapack/EXECUTION_BOARD_V2.md"
  "docs/mosapack/A0_CREDENTIAL_ROTATION_CHECKLIST.md"
  "docs/mosapack/A4_ANALYTICS_EVENT_SPEC.md"
  "docs/mosapack/A2_DEPLOY_CLEANUP_CHECKLIST.md"
  "docs/mosapack/A2_DEPLOY_COMMANDS.md"
  "docs/mosapack/CANONICAL_BUILDER_PROTOCOL.md"
)

for file in "${required_files[@]}"; do
  if [ ! -f "$ROOT/$file" ]; then
    echo "MISSING required file: $file"
    FAIL=1
  fi
done

forbidden_paths=(
  "apps/colorpageprints"
  "apps/derek-solas-portfolio"
  "ceo-dashboard"
  "dashboards-index"
  "affiliate"
  "financial-dashboard"
  "data.zip"
  ".venv"
  "builder-pro-v3"
  "builder-pro-v4"
  "builder-pro-v5"
  "builder-pro-v7"
  "builder-optimized-v8"
  "prototype"
)

for pattern in "${forbidden_paths[@]}"; do
  if find "$ROOT" \( -path "$ROOT/.git" -o -path "$ROOT/node_modules" -o -path "$ROOT/.netlify" \) -prune -o -path "*$pattern*" -print -quit | grep -q .; then
    echo "FORBIDDEN path/name found: $pattern"
    FAIL=1
  fi
done

if git -C "$ROOT" ls-files | rg -q '(^|/)node_modules/'; then
  echo "FORBIDDEN tracked node_modules files found"
  FAIL=1
fi

if [ ! -f "$ROOT/netlify.toml" ]; then
  echo "MISSING netlify.toml"
  FAIL=1
else
  if ! grep -Eq 'publish[[:space:]]*=[[:space:]]*"public"' "$ROOT/netlify.toml"; then
    echo "INVALID netlify.toml: publish must be public"
    FAIL=1
  fi
  if ! grep -Eq 'command[[:space:]]*=[[:space:]]*""' "$ROOT/netlify.toml"; then
    echo "INVALID netlify.toml: static deploy command must be empty"
    FAIL=1
  fi
  if grep -Eq 'from[[:space:]]*=[[:space:]]*"/\*"' "$ROOT/netlify.toml"; then
    echo "INVALID netlify.toml: catch-all rewrite is not allowed for this static launch repo"
    FAIL=1
  fi
fi

if ! bash "$ROOT/scripts/verify-netlify-forms.sh"; then
  FAIL=1
fi

if rg -n -i "order placed|checkout successful|payment received|Shopify checkout payload|Package staged|Check your email|You're on the list|Already subscribed" "$ROOT/public" >/tmp/mosapack-clean-fake-success.txt; then
  echo "POSSIBLE fake success state found:"
  cat /tmp/mosapack-clean-fake-success.txt
  FAIL=1
fi
rm -f /tmp/mosapack-clean-fake-success.txt

if rg -n -i "100% satisfaction guarantee|no questions asked|unlimited revisions|free remakes|free remake|fixed proof turnaround|approved preview" "$ROOT/public" >/tmp/mosapack-public-overpromise.txt; then
  echo "FORBIDDEN public overpromise copy found:"
  cat /tmp/mosapack-public-overpromise.txt
  FAIL=1
fi
rm -f /tmp/mosapack-public-overpromise.txt


BUILDER="$ROOT/public/builder/index.html"
if [ ! -f "$BUILDER" ]; then
  echo "MISSING canonical production builder: public/builder/index.html"
  FAIL=1
fi

raw_builder_files=(
  "builder-pro-v5.html"
  "builder-pro-v6.html"
  "builder-pro-v7.html"
  "builder-optimized-v8.html"
)
for file in "${raw_builder_files[@]}"; do
  if find "$ROOT/public" -name "$file" -print -quit | grep -q .; then
    echo "FORBIDDEN raw public builder file found: $file"
    FAIL=1
  fi
done

if rg -n -i "founder|prototype|beta|pilot|validation|test batch|interest-only|help us validate" "$ROOT/public/index.html" "$ROOT/public/builder/index.html" "$ROOT/public/contact/index.html" "$ROOT/public/legal" >/tmp/mosapack-public-startup-copy.txt; then
  echo "FORBIDDEN startup-validation wording found in public files:"
  cat /tmp/mosapack-public-startup-copy.txt
  FAIL=1
fi
rm -f /tmp/mosapack-public-startup-copy.txt

if rg -n "💩|😊|🙂|✨|🎯|⬆️|✏️|🗂️|🗂|🎨|⚙️|📄|📊|💾|🖼" "$BUILDER" >/tmp/mosapack-builder-emoji-controls.txt; then
  echo "FORBIDDEN emoji/symbol control copy found in builder:"
  cat /tmp/mosapack-builder-emoji-controls.txt
  FAIL=1
fi
rm -f /tmp/mosapack-builder-emoji-controls.txt

if rg -n -i "quality score|museum quality score|94% match|gold quality|silver quality|bronze quality|\bSSIM\b|ΔE" "$BUILDER" >/tmp/mosapack-builder-public-quality.txt; then
  echo "FORBIDDEN public quality score/badge language found in builder:"
  cat /tmp/mosapack-builder-public-quality.txt
  FAIL=1
fi
rm -f /tmp/mosapack-builder-public-quality.txt

if ! rg -q "Request Your Custom Proof|Request your free custom proof|Request my free proof" "$BUILDER"; then
  echo "MISSING proof request CTA/copy in builder."
  FAIL=1
fi

if ! rg -q 'name="request_type"|name="proof_requested"' "$BUILDER"; then
  echo "MISSING proof request type metadata in builder form."
  FAIL=1
fi

if ! rg -q 'name="recommended_format"' "$BUILDER"; then
  echo "MISSING recommended_format metadata in builder form."
  FAIL=1
fi

if rg -n -i "wobrick|wobrick.com|downloadWobrick|supplier comparison" "$ROOT/public" >/tmp/mosapack-public-wobrick.txt; then
  echo "FORBIDDEN Wobrick public CTA/path found:"
  cat /tmp/mosapack-public-wobrick.txt
  FAIL=1
fi
rm -f /tmp/mosapack-public-wobrick.txt

if rg -n -i "shopify|stripe|order placed|checkout successful|payment received|fake checkout|buy now|buy physical kit now|order your kit now" "$ROOT/public/index.html" "$BUILDER" "$ROOT/public/contact/index.html" >/tmp/mosapack-public-checkout.txt; then
  echo "FORBIDDEN full checkout/order language found in public launch files:"
  cat /tmp/mosapack-public-checkout.txt
  FAIL=1
fi
rm -f /tmp/mosapack-public-checkout.txt

if rg -n -i "sk_live|sk_test|rk_live|whsec_|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|client_secret|private_key|access_token|bearer[[:space:]]+[A-Za-z0-9._=-]{10,}" "$ROOT/public" >/tmp/mosapack-public-payment-secrets.txt; then
  echo "FORBIDDEN payment secret pattern found in public files:"
  cat /tmp/mosapack-public-payment-secrets.txt
  FAIL=1
fi
rm -f /tmp/mosapack-public-payment-secrets.txt

if ! rg -q "Create your sticker-ready mosaic proof|Free preview" "$BUILDER"; then
  echo "MISSING first-preview-free builder copy."
  FAIL=1
fi

if rg -n -i "showEmailGate\(\)" "$BUILDER" >/tmp/mosapack-hard-email-gate.txt; then
  echo "POSSIBLE hard email gate before first preview found:"
  cat /tmp/mosapack-hard-email-gate.txt
  FAIL=1
fi
rm -f /tmp/mosapack-hard-email-gate.txt

if rg -n "#4c6fff|#b3277e|#ff6b35|--accent-purple|--accent-orange|purple|indigo" "$BUILDER" >/tmp/mosapack-builder-brand-drift.txt; then
  echo "POSSIBLE builder brand-token drift found:"
  cat /tmp/mosapack-builder-brand-drift.txt
  FAIL=1
fi
rm -f /tmp/mosapack-builder-brand-drift.txt

if [ "$FAIL" -ne 0 ]; then
  echo "Clean repo verification failed."
  exit 1
fi

echo "Clean repo verification passed."
