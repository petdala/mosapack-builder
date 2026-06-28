#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

TARGETS=("$ROOT/public" "$ROOT/docs" "$ROOT/scripts" "$ROOT/netlify.toml" "$ROOT/netlify/functions" "$ROOT/package.json" "$ROOT/package-lock.json")
HIGH_CONFIDENCE='sk_live_[A-Za-z0-9_:-]{10,}|sk_test_[A-Za-z0-9_:-]{10,}|pk_live_[A-Za-z0-9_:-]{10,}|rk_live_[A-Za-z0-9_:-]{10,}|whsec_[A-Za-z0-9_:-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|bearer[[:space:]]+[A-Za-z0-9._=-]{20,}|client_secret[[:space:]]*[:=][[:space:]]*"?[A-Za-z0-9._=-]{12,}|access_token[[:space:]]*[:=][[:space:]]*"?[A-Za-z0-9._=-]{20,}|refresh_token[[:space:]]*[:=][[:space:]]*"?[A-Za-z0-9._=-]{20,}|apiKey[[:space:]]*[:=][[:space:]]*"?[A-Za-z0-9._=-]{24,}|api[_-]?key[[:space:]]*[:=][[:space:]]*"?[A-Za-z0-9._=-]{24,}'
LOW_CONFIDENCE='api[_-]?key|apiKey|secret|token|bearer|STRIPE|stripe|CONVERTKIT|KIT_API|convertkit|PRINTFUL|PRINTIFY|NETLIFY|FIREBASE|SUPABASE|GA_SECRET|MEASUREMENT_PROTOCOL|client_secret|private_key|access_token|refresh_token|YOUR_PIXEL_ID'
PUBLIC_PROVIDER_REFS='ConvertKit|CONVERTKIT|convertkit|KIT_API|apiKey|api_key'

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

echo "Security scan root: $ROOT"

ARCHIVE_LIST="$TMP_DIR/archives.txt"
find "$ROOT" \
  \( -path "$ROOT/.git" -o -path "$ROOT/node_modules" -o -path "$ROOT/dist" \) -prune \
  -o -type f \( -name '*.zip' -o -name '*.tar' -o -name '*.tar.gz' -o -name '*.tgz' -o -name '*.7z' -o -name '*.rar' \) -print > "$ARCHIVE_LIST"

if [ -s "$ARCHIVE_LIST" ]; then
  echo "WARNING: archive files found:"
  sed "s#^$ROOT/##" "$ARCHIVE_LIST"
else
  echo "Archive check: no zip/archive files found."
fi

PUBLIC_PROVIDER_LIST="$TMP_DIR/public-provider-refs.txt"
if rg -n --hidden --glob '!node_modules' --glob '!.git' --glob '!dist' "$PUBLIC_PROVIDER_REFS" "$ROOT/public" > "$PUBLIC_PROVIDER_LIST"; then
  echo "PUBLIC KIT/CONVERTKIT OR API KEY REFERENCES FOUND:"
  mask_output < "$PUBLIC_PROVIDER_LIST"
  exit 1
fi

echo "Public Kit/ConvertKit reference scan: no matches."

HIGH_LIST="$TMP_DIR/high-confidence.txt"
if rg -n --hidden --glob '!node_modules' --glob '!.git' --glob '!dist' "$HIGH_CONFIDENCE" "${TARGETS[@]}" > "$HIGH_LIST"; then
  echo "HIGH-CONFIDENCE SECRET PATTERN MATCHES FOUND:"
  mask_output < "$HIGH_LIST"
  exit 1
fi

echo "High-confidence credential scan: no matches."

LOW_LIST="$TMP_DIR/low-confidence.txt"
if rg -n --hidden --glob '!node_modules' --glob '!.git' --glob '!dist' -o "$LOW_CONFIDENCE" "${TARGETS[@]}" > "$LOW_LIST"; then
  COUNT="$(wc -l < "$LOW_LIST" | tr -d ' ')"
  echo "Low-confidence sensitive identifier hits: $COUNT"
  echo "Docs/scripts may mention discontinued providers or scanner patterns; inspect new hits before release."
else
  echo "Low-confidence sensitive identifier hits: 0"
fi

echo "Security scan complete."
