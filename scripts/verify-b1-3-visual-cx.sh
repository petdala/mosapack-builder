#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILDER="$ROOT/public/builder/index.html"
LANDING="$ROOT/public/index.html"
PUBLIC_FILES=("$BUILDER" "$LANDING")

fail() {
  echo "B1.3 visual CX verification failed: $1" >&2
  exit 1
}

[[ -f "$BUILDER" ]] || fail "missing public builder"
[[ -f "$LANDING" ]] || fail "missing public landing page"

for label in "Upload" "Position" "Preview" "Request Proof"; do
  grep -Fq ">$label<" "$BUILDER" || fail "missing guided flow label: $label"
done

grep -Fq "Request My Custom Proof" "$BUILDER" || fail "proof CTA text missing"
grep -Fq "No checkout today" "$BUILDER" || fail "honest no-checkout copy missing"
grep -Fq "Checkout disabled until D1" "$BUILDER" || fail "disabled checkout disclosure missing"
grep -Fq "first preview" "$BUILDER" || grep -Fq "free preview" "$BUILDER" || fail "free preview copy missing"
grep -Fq "Create a free photo mosaic preview" "$BUILDER" || fail "photo-agnostic builder copy missing"
grep -Fq "custom proof" "$BUILDER" || fail "custom proof language missing"
grep -Fq ":focus-visible" "$BUILDER" || fail "focus-visible styling missing"
grep -Fq "aria-pressed" "$BUILDER" || fail "aria-pressed controls missing"
grep -Fq "aria-label" "$BUILDER" || fail "aria-labels missing"
grep -Fq "@media (max-width: 768px)" "$BUILDER" || fail "mobile breakpoint missing"
grep -Fq "builder-has-preview" "$BUILDER" || fail "preview-state CSS/JS missing"

if grep -Ei "founder|prototype|beta|pilot|validation|test batch|interest-only" "${PUBLIC_FILES[@]}" >/dev/null; then
  fail "forbidden public founder/prototype/beta/pilot/validation language found"
fi

if grep -Ei ">[^<]*(SSIM|ΔE|Delta ?E|quality score|quality badge|Gold Quality|Silver Quality|Bronze Quality|Gold tier|Silver tier|Bronze tier)" "${PUBLIC_FILES[@]}" >/dev/null; then
  fail "forbidden public quality metric or badge language found"
fi

if grep -Ei "Wobrick|Shopify|Stripe|order placed|payment successful|checkout success" "${PUBLIC_FILES[@]}" >/dev/null; then
  fail "forbidden public supplier/payment/success language found"
fi

if grep -n "<form[^>]*name=\"mosapack-save-design\"" -A80 "$BUILDER" | grep -Ei "type=\"file\"|type='file'" >/dev/null; then
  fail "raw file input found in Netlify proof/save form"
fi

echo "B1.3 visual CX verification passed."
