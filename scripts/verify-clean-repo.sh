#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAIL=0

required_files=(
  "public/index.html"
  "public/builder/index.html"
  "public/legal/privacy.html"
  "public/legal/terms.html"
  "public/legal/returns.html"
  "public/contact/index.html"
  "docs/mosapack/EXECUTION_BOARD_V2.md"
  "docs/mosapack/A0_CREDENTIAL_ROTATION_CHECKLIST.md"
  "docs/mosapack/A4_ANALYTICS_EVENT_SPEC.md"
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
  "node_modules"
  ".venv"
  "builder-pro-v3"
  "builder-pro-v4"
  "builder-pro-v5"
  "builder-pro-v7"
  "builder-optimized-v8"
  "prototype"
)

for pattern in "${forbidden_paths[@]}"; do
  if find "$ROOT" \( -path "$ROOT/.git" \) -prune -o -path "*$pattern*" -print -quit | grep -q .; then
    echo "FORBIDDEN path/name found: $pattern"
    FAIL=1
  fi
done

if [ ! -f "$ROOT/netlify.toml" ]; then
  echo "MISSING netlify.toml"
  FAIL=1
else
  if ! grep -Eq 'publish[[:space:]]*=[[:space:]]*"public"' "$ROOT/netlify.toml"; then
    echo "INVALID netlify.toml: publish must be public"
    FAIL=1
  fi
  if grep -Eq 'from[[:space:]]*=[[:space:]]*"/\*"' "$ROOT/netlify.toml"; then
    echo "INVALID netlify.toml: catch-all rewrite is not allowed for this static launch repo"
    FAIL=1
  fi
fi

if [ "$FAIL" -ne 0 ]; then
  echo "Clean repo verification failed."
  exit 1
fi

echo "Clean repo verification passed."
