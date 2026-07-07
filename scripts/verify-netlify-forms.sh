#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAIL=0

check_form() {
  local form_name="$1"
  local file="$2"

  if ! rg -q "<form[^>]*name=\"$form_name\"" "$ROOT/$file"; then
    echo "MISSING form $form_name in $file"
    FAIL=1
  fi

  if ! rg -q "name=\"form-name\"[[:space:]]+value=\"$form_name\"" "$ROOT/$file"; then
    echo "MISSING hidden form-name for $form_name in $file"
    FAIL=1
  fi

  if ! rg -q "<form[^>]*(data-netlify=\"true\"|netlify)([[:space:]>])" "$ROOT/$file"; then
    echo "MISSING Netlify form attribute for $form_name in $file"
    FAIL=1
  fi
}

check_form "mosapack-save-design" "public/builder/index.html"
check_form "mosapack-contact" "public/contact/index.html"

if perl -0ne 'while (/<form\b[^>]*(?:data-netlify|netlify)[^>]*>.*?<\/form>/sig) { if ($& =~ /type=["'\'' ]file["'\'' ]/i) { exit 1 } }' "$ROOT/public/index.html" "$ROOT/public/builder/index.html" "$ROOT/public/contact/index.html"; then
  echo "Netlify form file-upload check: no raw image/file uploads in Netlify forms."
else
  echo "Netlify form file-upload check failed: a Netlify form includes a file input."
  FAIL=1
fi

if rg -n -i "ConvertKit|CONVERTKIT|convertkit|KIT_API|apiKey|api_key" "$ROOT/public"; then
  echo "Public Kit/ConvertKit or API key reference found."
  FAIL=1
fi

for file in public/index.html public/builder/index.html public/contact/index.html; do
  if rg -q "fetch\(\"/\"|fetch\('/'" "$ROOT/$file"; then
    if ! rg -q "response\.ok" "$ROOT/$file"; then
      echo "AJAX submit in $file does not check response.ok"
      FAIL=1
    fi
  fi
done

if [ "$FAIL" -ne 0 ]; then
  echo "Netlify Forms verification failed."
  exit 1
fi

echo "Netlify Forms verification passed."
