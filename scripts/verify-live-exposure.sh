#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mosapack.netlify.app}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

required_paths=(
  "/"
  "/builder/"
  "/contact/"
  "/legal/privacy.html"
  "/legal/terms.html"
  "/legal/returns.html"
  "/404.html"
)

forbidden_paths=(
  "/ceo-dashboard.html"
  "/dashboards-index.html"
  "/core/builder-pro-v6.html"
  "/core/builder-pro-v7.html"
  "/core/builder-optimized-v8.html"
  "/mosapack_financial_dashboard.html"
  "/mosapack_affiliate_dashboard.html"
  "/mosapack_email_automation_flows.html"
)

form_checks=(
  "/|mosapack-waitlist"
  "/builder/|mosapack-save-design"
  "/contact/|mosapack-contact"
)

# Netlify Forms markup is expected and safe. Do not flag data-netlify/netlify forms as exposure.
# Keep Netlify checks scoped to secret-bearing variables, deploy hooks, and build hooks.
SUSPICIOUS='4cCw|sk_live|sk_test|pk_live|rk_live|whsec_|api[_-]?key|apiKey|secret[[:space:]]*[:=]|token[[:space:]]*[:=]|bearer[[:space:]]+[A-Za-z0-9._=-]{8,}|STRIPE|stripe|CONVERTKIT|ConvertKit|convertkit|KIT_API|PRINTFUL|PRINTIFY|FIREBASE|SUPABASE|GA_SECRET|MEASUREMENT_PROTOCOL|client_secret|private_key|access_token|refresh_token|YOUR_PIXEL_ID|dashboard|affiliate|financial|builder-pro-v7|builder-optimized-v8|order placed|NETLIFY_AUTH_TOKEN|NETLIFY_API_TOKEN|NETLIFY_SITE_ID|netlify_auth_token|netlify_api_token|deploy_hook|build_hook'

mask_output() {
  perl -pe 's/(sk_(?:live|test)_[A-Za-z0-9_:-]{4})[A-Za-z0-9_:-]+/$1...[MASKED]/g;
            s/(pk_live_[A-Za-z0-9_:-]{4})[A-Za-z0-9_:-]+/$1...[MASKED]/g;
            s/(rk_live_[A-Za-z0-9_:-]{4})[A-Za-z0-9_:-]+/$1...[MASKED]/g;
            s/(whsec_[A-Za-z0-9_:-]{4})[A-Za-z0-9_:-]+/$1...[MASKED]/g;
            s/((?:client_secret|access_token|refresh_token|api[_-]?key|apiKey|netlify_auth_token|netlify_api_token|NETLIFY_AUTH_TOKEN|NETLIFY_API_TOKEN|NETLIFY_SITE_ID|deploy_hook|build_hook)\s*[:=]\s*)\x27[^\x27]+\x27/$1[MASKED]/ig;
            s/((?:client_secret|access_token|refresh_token|api[_-]?key|apiKey|netlify_auth_token|netlify_api_token|NETLIFY_AUTH_TOKEN|NETLIFY_API_TOKEN|NETLIFY_SITE_ID|deploy_hook|build_hook)\s*[:=]\s*)"[^"]+"/$1[MASKED]/ig;
            s/((?:client_secret|access_token|refresh_token|api[_-]?key|apiKey|netlify_auth_token|netlify_api_token|NETLIFY_AUTH_TOKEN|NETLIFY_API_TOKEN|NETLIFY_SITE_ID|deploy_hook|build_hook)\s*[:=]\s*"?)[A-Za-z0-9._=:\/-]{8,}/$1[MASKED]/ig;
            s/(bearer\s+)[A-Za-z0-9._=-]{8,}/$1[MASKED]/ig'
}

fetch_path() {
  local path="$1"
  local out="$2"
  local url="${BASE_URL%/}$path"
  curl -L -sS --max-time 15 -o "$out" -w '%{http_code}' "$url" || true
}

scan_file() {
  local path="$1"
  local file="$2"

  if [ -s "$file" ] && grep -Einq "$SUSPICIOUS" "$file"; then
    echo "Suspicious strings in $path:"
    grep -Ein "$SUSPICIOUS" "$file" | head -20 | mask_output
    return 1
  fi

  return 0
}

check_live_form() {
  local path="$1"
  local form_name="$2"
  local out="$3"
  local fail=0

  if ! grep -Eiq "<form[^>]*name=\"$form_name\"" "$out"; then
    echo "MISSING live form $form_name on $path"
    fail=1
  fi

  if ! grep -Eiq "name=\"form-name\"[[:space:]]+value=\"$form_name\"" "$out"; then
    echo "MISSING hidden form-name for $form_name on $path"
    fail=1
  fi

  if ! grep -Eiq "<form[^>]*(data-netlify=\"true\"|netlify)([[:space:]>])" "$out"; then
    echo "MISSING Netlify form attribute for $form_name on $path"
    fail=1
  fi

  return "$fail"
}

echo "Live exposure check: $BASE_URL"
echo "Known burned Kit/ConvertKit-style key last 4 only: 4cCw"
echo "Netlify Forms markup is allowed; Netlify secrets and deploy hooks are not."

FOUND_SUSPICIOUS=0
ROUTE_FAILURE=0
FORM_FAILURE=0
FETCHED=0
INDEX=0

for path in "${required_paths[@]}"; do
  INDEX=$((INDEX + 1))
  OUT="$TMP_DIR/required-$INDEX.html"
  STATUS="$(fetch_path "$path" "$OUT")"

  if [ -z "$STATUS" ] || [ "$STATUS" = "000" ]; then
    echo "$path -> network-error"
    ROUTE_FAILURE=1
    continue
  fi

  echo "$path -> $STATUS"
  FETCHED=$((FETCHED + 1))

  if [ "$STATUS" != "200" ]; then
    ROUTE_FAILURE=1
  fi

  if ! scan_file "$path" "$OUT"; then
    FOUND_SUSPICIOUS=1
  fi
done

for path in "${forbidden_paths[@]}"; do
  INDEX=$((INDEX + 1))
  OUT="$TMP_DIR/forbidden-$INDEX.html"
  STATUS="$(fetch_path "$path" "$OUT")"

  if [ -z "$STATUS" ] || [ "$STATUS" = "000" ]; then
    echo "$path -> network-error"
    continue
  fi

  echo "$path -> $STATUS"
  FETCHED=$((FETCHED + 1))

  if [ "$STATUS" = "200" ]; then
    echo "Forbidden route served HTTP 200: $path"
    ROUTE_FAILURE=1
  fi

  if ! scan_file "$path" "$OUT"; then
    FOUND_SUSPICIOUS=1
  fi
done

for item in "${form_checks[@]}"; do
  path="${item%%|*}"
  form_name="${item#*|}"
  INDEX=$((INDEX + 1))
  OUT="$TMP_DIR/form-$INDEX.html"
  STATUS="$(fetch_path "$path" "$OUT")"

  if [ -z "$STATUS" ] || [ "$STATUS" = "000" ]; then
    echo "$path form check -> network-error"
    FORM_FAILURE=1
    continue
  fi

  echo "$path form check -> $STATUS ($form_name)"
  FETCHED=$((FETCHED + 1))

  if [ "$STATUS" != "200" ]; then
    FORM_FAILURE=1
    continue
  fi

  if ! check_live_form "$path" "$form_name" "$OUT"; then
    FORM_FAILURE=1
  fi
done

if [ "$FETCHED" -eq 0 ]; then
  echo "Live exposure check could not fetch any pages; network unavailable or DNS blocked."
  exit 2
fi

if [ "$ROUTE_FAILURE" -ne 0 ]; then
  echo "Live route verification failed."
  exit 1
fi

if [ "$FOUND_SUSPICIOUS" -ne 0 ]; then
  echo "Live exposure check found suspicious strings. Do not deploy, rollback, or continue to A4 until resolved."
  exit 1
fi

if [ "$FORM_FAILURE" -ne 0 ]; then
  echo "Live Netlify Forms detection failed."
  exit 1
fi

echo "Live Netlify Forms detection passed."
echo "Live exposure check completed with no suspicious strings in fetched HTML."
