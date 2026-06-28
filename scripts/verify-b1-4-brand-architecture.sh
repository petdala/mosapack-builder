#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILDER="$ROOT/public/builder/index.html"
LANDING="$ROOT/public/index.html"
PUBLIC_FILES=("$BUILDER" "$LANDING")

fail() {
  echo "B1.4 brand architecture verification failed: $1" >&2
  exit 1
}

[[ -f "$BUILDER" ]] || fail "missing public builder"
[[ -f "$LANDING" ]] || fail "missing public landing page"

grep -Fq "Turn Any Meaningful Photo Into" "$LANDING" || fail "landing hero is not photo-agnostic"
grep -Fq "custom mosaic reveal kit" "$LANDING" || fail "landing lacks custom mosaic reveal kit positioning"
grep -Fq "Popular first use case: pet portraits" "$LANDING" || fail "pet campaign example missing"
grep -Fq "Create a free photo mosaic preview" "$BUILDER" || fail "builder lacks photo-agnostic preview copy"
grep -Fq "Position your subject" "$BUILDER" || fail "crop copy still not subject-based"
grep -Fq "Request Your Custom Proof" "$BUILDER" || fail "custom proof CTA missing"
grep -Fq "What kind of photo is this?" "$BUILDER" || fail "photo category select label missing"
grep -Fq "name=\"photo_category\"" "$BUILDER" || fail "photo_category hidden form field missing"
grep -Fq "id=\"photoCategoryInput\"" "$BUILDER" || fail "visible photo category select missing"
grep -Fq "name=\"selected_vertical\"" "$BUILDER" || fail "selected_vertical hidden field missing"
grep -Fq "Digital Mystery Reveal Pack" "$BUILDER" || fail "photo-agnostic digital reveal product missing"
grep -Fq "Checkout disabled until D1" "$BUILDER" || fail "honest checkout-disabled copy missing"
grep -Fq "No checkout today" "$BUILDER" || fail "proof flow no-checkout copy missing"

if grep -Ei "<title>[^<]*(pet-only|pet mosaic|pet builder)|<h1[^>]*>[^<]*(pet-only|pet mosaic|pet builder)" "${PUBLIC_FILES[@]}" >/dev/null; then
  fail "global title or h1 is pet-only"
fi

if grep -Ei "your pet|pet proof|pet photo[^s]" "$BUILDER" >/dev/null; then
  fail "builder core UI still contains pet-only phrasing"
fi

if grep -Ei "founder|prototype|beta|pilot|validation|test batch|interest-only" "${PUBLIC_FILES[@]}" >/dev/null; then
  fail "forbidden public founder/prototype/beta/pilot/validation language found"
fi

if grep -Ei ">[^<]*(SSIM|ΔE|Delta ?E|quality score|quality badge|Gold Quality|Silver Quality|Bronze Quality|Gold tier|Silver tier|Bronze tier)" "${PUBLIC_FILES[@]}" >/dev/null; then
  fail "forbidden public quality metric or badge language found"
fi

if grep -Ei "Wobrick|Shopify|Stripe|order placed|payment successful|checkout success|buy now" "${PUBLIC_FILES[@]}" >/dev/null; then
  fail "forbidden public supplier/payment/success language found"
fi

if grep -n "<form[^>]*name=\"mosapack-save-design\"" -A120 "$BUILDER" | grep -Ei "type=\"file\"|type='file'" >/dev/null; then
  fail "raw file input found in Netlify proof/save form"
fi

echo "B1.4 brand architecture verification passed."
