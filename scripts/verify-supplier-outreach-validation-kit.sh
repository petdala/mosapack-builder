#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

require_file() {
  [[ -f "$1" ]] || fail "missing required file: $1"
}

require_grep() {
  local pattern="$1"
  local file="$2"
  rg -q "$pattern" "$file" || fail "missing pattern '$pattern' in $file"
}

require_header() {
  local file="$1"
  local expected="$2"
  local actual
  actual="$(head -n 1 "$file")"
  [[ "$actual" == "$expected" ]] || {
    echo "Expected: $expected" >&2
    echo "Actual:   $actual" >&2
    fail "header mismatch: $file"
  }
}

required_files=(
  docs/mosapack/suppliers/supplier-outreach-master-v1.md
  docs/mosapack/suppliers/supplier-outreach-tracker-v1.csv
  docs/mosapack/suppliers/supplier-claim-validation-ledger-v1.md
  docs/mosapack/suppliers/outreach/onlinelabels-email-v1.md
  docs/mosapack/suppliers/outreach/local-print-shop-email-v1.md
  docs/mosapack/suppliers/outreach/stickeryou-email-v1.md
  docs/mosapack/suppliers/outreach/backup-suppliers-v1.md
  docs/mosapack/validation/cricut-first-hello-mini-shopping-list-v1.md
  docs/mosapack/validation/cricut-first-hello-mini-test-log-v1.csv
  docs/mosapack/validation/cricut-first-hello-mini-sop-v1.md
  docs/mosapack/validation/gate-a-gate-b-physical-validation-plan-v1.md
  docs/mosapack/suppliers/quote-intake-workflow-v1.md
  docs/mosapack/suppliers/quote-intake-template-v1.csv
  docs/mosapack/archive/missing-legacy-files-v1.md
  docs/mosapack/NEXT_ACTIONS_DEREK_SUPPLIER_VALIDATION.md
  config/unit-costs.example.json
)

for file in "${required_files[@]}"; do
  require_file "$file"
done

require_header docs/mosapack/suppliers/supplier-outreach-tracker-v1.csv "supplier_id,supplier_name,supplier_type,website,contact_url,contact_email,contact_phone,priority,outreach_status,date_contacted,date_followed_up,reply_status,sample_possible,sample_cost,moq,lead_time,registration_tolerance_claim,material_options,can_do_0_5_in_cells,can_do_rounded_square,can_do_dense_grid,can_accept_press_ready_pdf,can_do_full_color_mixed_sheet,can_do_black_base_or_board,can_do_magnets,can_do_kitting,quoted_sheet_cost_12,quoted_sheet_cost_16,quoted_sheet_cost_24,quoted_board_cost_12,quoted_board_cost_16,quoted_board_cost_24,notes,confidence,next_action,owner"
require_header docs/mosapack/suppliers/quote-intake-template-v1.csv "quote_id,supplier_id,date_received,contact_name,contact_email,sample_possible,sample_cost,setup_fee,die_fee,art_fee,sheet_material,sheet_size,sheet_cost_1,sheet_cost_10,sheet_cost_50,sheet_cost_100,moq,lead_time_sample,lead_time_reorder,registration_tolerance,shipping_cost,kitting_available,kitting_cost,board_available,board_cost,notes,confidence,decision"
require_header docs/mosapack/validation/cricut-first-hello-mini-test-log-v1.csv "test_id,date,operator,machine,mat_type,blade,mat_condition,material,color,sheet_size,cell_size,cut_setting,pressure,passes,cells_cut,cells_good,cells_bad,peel_score_1_5,weed_score_1_5,registration_x_mm,registration_y_mm,time_cut_minutes,time_weed_minutes,time_place_minutes,sec_per_sticker,gray_separation_score_1_5,notes,pass_fail"

for status in verified_by_current_quote verified_by_current_vendor_page verified_by_physical_sample repo_assumption archived_research_only contradicted needs_rfq needs_physical_test; do
  require_grep "$status" docs/mosapack/suppliers/supplier-claim-validation-ledger-v1.md
done

python3 - <<'PY'
import json
from pathlib import Path

data = json.loads(Path("config/unit-costs.example.json").read_text())
entries = data.get("entries", {})
required = {
    "printed_sheet_matte_ol_or_vendor",
    "printed_sheet_poly_or_vendor",
    "board_12_black",
    "board_16",
    "board_24",
    "rigid_mailer_13x13",
    "insert_card",
    "sticker_sleeve",
    "shipping_12_estimate",
    "shipping_16_estimate",
    "shipping_24_estimate",
    "sample_cost",
    "die_setup_fee",
}
missing = sorted(required - set(entries))
if missing:
    raise SystemExit(f"missing unit-cost placeholders: {missing}")
for key, entry in entries.items():
    for field in ("source", "as_of", "confidence", "notes"):
        if field not in entry:
            raise SystemExit(f"{key} missing {field}")
    if entry.get("unit_cost") is not None:
        raise SystemExit(f"{key} has non-null unit_cost")
PY

require_grep "must not be used to justify public builder changes" docs/mosapack/archive/legacy-supplier-research/README.md
require_grep "checkout" docs/mosapack/archive/legacy-supplier-research/README.md
require_grep "LEGO/brick positioning" docs/mosapack/archive/legacy-supplier-research/README.md
require_grep "missing locally" docs/mosapack/archive/missing-legacy-files-v1.md

git diff --quiet -- public/builder/index.html public/index.html || fail "public builder/homepage changed"

echo "supplier outreach validation kit checks passed"
echo "production deploy check: no deploy command is run by this verifier"
