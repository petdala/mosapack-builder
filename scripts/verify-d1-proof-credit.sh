#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAIL=0
BUILDER="$ROOT/public/builder/index.html"
RETURNS="$ROOT/public/legal/returns.html"
SUCCESS="$ROOT/public/proof-credit-success.html"

require_file() {
  local file="$1"
  if [ ! -f "$ROOT/$file" ]; then
    echo "MISSING D1 file: $file"
    FAIL=1
  fi
}

require_file "docs/mosapack/D1_PROOF_CREDIT_IMPLEMENTATION_PLAN.md"
require_file "docs/mosapack/STRIPE_PROOF_CREDIT_SETUP.md"
require_file "docs/mosapack/D1_PROOF_CREDIT_IMPLEMENTATION_REPORT.md"
require_file "public/proof-credit-success.html"

if ! rg -q '\$10 Proof Credit|Pay \$10 Proof Credit|Custom Proof Credit' "$BUILDER"; then
  echo "MISSING D1 proof credit UI copy in builder"
  FAIL=1
fi

if ! rg -q 'proofCreditCard|placeProofCredit|PUBLIC_STRIPE_PROOF_CREDIT_LINK|proof credit payment is being finalized|Proof credit payment is being finalized' "$BUILDER"; then
  echo "MISSING configuration-driven proof credit handoff/disabled state in builder"
  FAIL=1
fi

if ! rg -q '/\.netlify/functions/save-project' "$BUILDER" || ! rg -q 'project_id' "$BUILDER"; then
  echo "B2 save/project_id path is not referenced before proof credit handoff"
  FAIL=1
fi

if rg -q 'showProofCreditCard\(\{ projectId: saveResult\.project_id, email \}\)' "$BUILDER" \
  && rg -q 'requestType === "custom_proof"' "$BUILDER" \
  && rg -q 'Proof request saved' "$BUILDER"; then
  echo "Proof credit handoff appears after proof request success."
else
  echo "MISSING proof credit handoff after proof request success"
  FAIL=1
fi

if rg -n -i 'payment received|proof credit received.*session|order placed|checkout successful|paid successfully|payment successful' "$BUILDER" >/tmp/mosapack-d1-fake-payment.txt; then
  echo "FORBIDDEN fake payment success language found in builder:"
  cat /tmp/mosapack-d1-fake-payment.txt
  FAIL=1
fi
rm -f /tmp/mosapack-d1-fake-payment.txt

if rg -n -i 'sk_live|sk_test|rk_live|whsec_|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|client_secret|private_key|access_token|bearer[[:space:]]+[A-Za-z0-9._=-]{10,}' "$ROOT/public" 2>/dev/null >/tmp/mosapack-d1-secret-hits.txt; then
  echo "FORBIDDEN payment secret pattern found in public files:"
  cat /tmp/mosapack-d1-secret-hits.txt
  FAIL=1
fi
if rg -n -i 'STRIPE_SECRET_KEY[[:space:]]*=|STRIPE_WEBHOOK_SECRET[[:space:]]*=|sk_live|sk_test|rk_live|whsec_|x-mosa-admin-token:[[:space:]]+[A-Za-z0-9+/=_-]{10,}|bearer[[:space:]]+[A-Za-z0-9._=-]{10,}' "$ROOT/docs/mosapack/D1_PROOF_CREDIT_IMPLEMENTATION_PLAN.md" "$ROOT/docs/mosapack/STRIPE_PROOF_CREDIT_SETUP.md" "$ROOT/docs/mosapack/D1_PROOF_CREDIT_IMPLEMENTATION_REPORT.md" 2>/dev/null >/tmp/mosapack-d1-secret-hits.txt; then
  echo "FORBIDDEN payment secret value pattern found in docs:"
  cat /tmp/mosapack-d1-secret-hits.txt
  FAIL=1
fi
rm -f /tmp/mosapack-d1-secret-hits.txt

if rg -n -i 'shopify|printful|printify|supplier api|automatic supplier|full physical checkout|buy physical kit now|order your kit now' "$ROOT/public" >/tmp/mosapack-d1-full-checkout.txt; then
  echo "FORBIDDEN full checkout/supplier public copy found:"
  cat /tmp/mosapack-d1-full-checkout.txt
  FAIL=1
fi
rm -f /tmp/mosapack-d1-full-checkout.txt

if [ -f "$SUCCESS" ]; then
  if ! rg -q 'Proof Credit Received|Return to MosaPack|different email' "$SUCCESS"; then
    echo "Proof credit success page missing required copy"
    FAIL=1
  fi
  if rg -n -i 'order number|payment confirmed.*\$10|shipping|physical kit is on the way' "$SUCCESS" >/tmp/mosapack-d1-success-overclaim.txt; then
    echo "FORBIDDEN success-page overclaim found:"
    cat /tmp/mosapack-d1-success-overclaim.txt
    FAIL=1
  fi
  rm -f /tmp/mosapack-d1-success-overclaim.txt
fi

if ! rg -q '\$10 proof credit is refundable if your photo is not suitable|proof credit is applied toward' "$RETURNS"; then
  echo "MISSING safe proof credit refund/apply language in returns policy"
  FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then
  echo "D1 proof credit verification failed."
  exit 1
fi

echo "D1 proof credit verification passed."
