#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mosapack.netlify.app}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

paths=(
  "/"
  "/ceo-dashboard.html"
  "/dashboards-index.html"
  "/core/builder-pro-v6.html"
  "/core/builder-pro-v7.html"
  "/core/builder-optimized-v8.html"
  "/mosapack_financial_dashboard.html"
  "/mosapack_affiliate_dashboard.html"
  "/mosapack_email_automation_flows.html"
)

SUSPICIOUS='sk_live|sk_test|pk_live|rk_live|whsec_|api[_-]?key|apiKey|secret|token|bearer|STRIPE|stripe|CONVERTKIT|KIT_API|convertkit|PRINTFUL|PRINTIFY|NETLIFY|FIREBASE|SUPABASE|GA_SECRET|MEASUREMENT_PROTOCOL|client_secret|private_key|access_token|refresh_token|YOUR_PIXEL_ID'

mask_output() {
  perl -pe 's/(sk_(?:live|test)_[A-Za-z0-9_:-]{4})[A-Za-z0-9_:-]+/$1...[MASKED]/g;
            s/(pk_live_[A-Za-z0-9_:-]{4})[A-Za-z0-9_:-]+/$1...[MASKED]/g;
            s/(rk_live_[A-Za-z0-9_:-]{4})[A-Za-z0-9_:-]+/$1...[MASKED]/g;
            s/(whsec_[A-Za-z0-9_:-]{4})[A-Za-z0-9_:-]+/$1...[MASKED]/g;
            s/((?:client_secret|access_token|refresh_token|api[_-]?key|apiKey)\s*[:=]\s*)\x27[^\x27]+\x27/$1[MASKED]/ig;
            s/((?:client_secret|access_token|refresh_token|api[_-]?key|apiKey)\s*[:=]\s*)"[^"]+"/$1[MASKED]/ig;
            s/((?:client_secret|access_token|refresh_token|api[_-]?key|apiKey)\s*[:=]\s*"?)[A-Za-z0-9._=-]{8,}/$1[MASKED]/ig;
            s/(bearer\s+)[A-Za-z0-9._=-]{8,}/$1[MASKED]/ig'
}

echo "Live exposure check: $BASE_URL"
echo "Known burned Kit/ConvertKit-style key last 4 only: 4cCw"
echo "A failure is expected until A2 clean deploy replaces the dirty live site."

FOUND_SUSPICIOUS=0
FETCHED=0
INDEX=0

for path in "${paths[@]}"; do
  INDEX=$((INDEX + 1))
  OUT="$TMP_DIR/page-$INDEX.html"
  URL="${BASE_URL%/}$path"

  STATUS="$(curl -L -sS --max-time 15 -o "$OUT" -w '%{http_code}' "$URL" || true)"
  if [ -z "$STATUS" ] || [ "$STATUS" = "000" ]; then
    echo "$path -> network-error"
    continue
  fi

  echo "$path -> $STATUS"
  FETCHED=$((FETCHED + 1))

  if [ -s "$OUT" ] && grep -Einq "$SUSPICIOUS" "$OUT"; then
    echo "Suspicious strings in $path:"
    grep -Ein "$SUSPICIOUS" "$OUT" | head -20 | mask_output
    FOUND_SUSPICIOUS=1
  fi
done

if [ "$FETCHED" -eq 0 ]; then
  echo "Live exposure check could not fetch any pages; network unavailable or DNS blocked."
  exit 2
fi

if [ "$FOUND_SUSPICIOUS" -ne 0 ]; then
  echo "Live exposure check found suspicious strings. This must be cleaned by A2 deploy; do not rollback to this dirty deploy."
  exit 1
fi

echo "Live exposure check completed with no suspicious strings in fetched HTML."
