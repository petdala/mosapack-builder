#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAIL=0
BUILDER="$ROOT/public/builder/index.html"
RETURNS="$ROOT/public/legal/returns.html"
PRIVACY="$ROOT/public/legal/privacy.html"
PUBLIC_FILES=("$ROOT/public/index.html" "$ROOT/public/builder/index.html" "$ROOT/public/contact/index.html" "$ROOT/public/legal/privacy.html" "$ROOT/public/legal/returns.html" "$ROOT/public/proof-credit-success.html")

require_file() {
  local file="$1"
  if [ ! -f "$ROOT/$file" ]; then
    echo "MISSING required file: $file"
    FAIL=1
  fi
}

require_file "docs/mosapack/D1_PAYMENT_PAUSED_DECISION.md"
require_file "docs/mosapack/PROOF_REQUEST_OPERATIONS_RUNBOOK.md"
require_file "docs/mosapack/SUPPLIER_RFQ_EXECUTION_TRACKER.md"

if ! rg -q 'Request Your Custom Proof|Proof Request Saved' "$BUILDER"; then
  echo "MISSING free proof request path/copy in builder"
  FAIL=1
fi

if ! rg -q '/\.netlify/functions/save-project' "$BUILDER" || ! rg -q 'project_id' "$BUILDER"; then
  echo "MISSING B2 save-project/project_id path in builder"
  FAIL=1
fi

if rg -n -i 'Pay \$10|\$10 Proof Credit|Custom Proof Credit|Proof Credit Received|proof credit handoff|PUBLIC_STRIPE|Payment Link|buy\.stripe\.com|Stripe' "${PUBLIC_FILES[@]}" 2>/dev/null >/tmp/mosapack-paused-public-payment.txt; then
  echo "FORBIDDEN active/dead public payment proof-credit copy found:"
  cat /tmp/mosapack-paused-public-payment.txt
  FAIL=1
fi
rm -f /tmp/mosapack-paused-public-payment.txt

if rg -n -i 'payment received|order placed|checkout successful|paid successfully|payment successful|full physical checkout|buy physical kit now|order your kit now' "$ROOT/public" >/tmp/mosapack-paused-fake-payment.txt; then
  echo "FORBIDDEN fake payment/checkout/order language found:"
  cat /tmp/mosapack-paused-fake-payment.txt
  FAIL=1
fi
rm -f /tmp/mosapack-paused-fake-payment.txt

if rg -n -i 'proof credit is refundable|proof credit is applied|\$10 proof credit' "$RETURNS" "$PRIVACY" >/tmp/mosapack-paused-legal-proof-credit.txt; then
  echo "FORBIDDEN active proof-credit legal copy found:"
  cat /tmp/mosapack-paused-legal-proof-credit.txt
  FAIL=1
fi
rm -f /tmp/mosapack-paused-legal-proof-credit.txt

if rg -n -i 'sk_live|sk_test|rk_live|whsec_|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|client_secret|private_key|access_token|bearer[[:space:]]+[A-Za-z0-9._=-]{10,}|MOSA_ADMIN_TOKEN[[:space:]]*=' "$ROOT/public" "$ROOT/docs/mosapack/D1_PAYMENT_PAUSED_DECISION.md" "$ROOT/docs/mosapack/PROOF_REQUEST_OPERATIONS_RUNBOOK.md" "$ROOT/docs/mosapack/SUPPLIER_RFQ_EXECUTION_TRACKER.md" 2>/dev/null >/tmp/mosapack-paused-secret-hits.txt; then
  echo "FORBIDDEN secret pattern found:"
  cat /tmp/mosapack-paused-secret-hits.txt
  FAIL=1
fi
rm -f /tmp/mosapack-paused-secret-hits.txt

if ! rg -q 'Custom proof requests are reviewed before production|Physical product terms are shown before any paid order|We do not store payment card details' "$RETURNS" "$PRIVACY"; then
  echo "MISSING safe public legal proof/payment copy"
  FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then
  echo "Proof ops paused-payment verification failed."
  exit 1
fi

echo "Proof ops paused-payment verification passed."
