#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# D1 payment/proof credit is intentionally paused. Keep this compatibility
# wrapper so old QA commands verify the current proof-ops state instead of
# expecting public payment UI.
exec bash "$ROOT/scripts/verify-proof-ops-paused-payment.sh"
