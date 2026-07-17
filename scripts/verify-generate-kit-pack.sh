#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GENERATOR="$ROOT/tools/kitpack/generate_kit_pack.py"
REQS="$ROOT/tools/kitpack/requirements.txt"
README="$ROOT/tools/kitpack/README.md"
CONSTANTS="$ROOT/config/production-constants.json"
SCHEMA="$ROOT/config/design-schema.v1.json"
SAMPLE="$ROOT/fixtures/designs/sample-design-first-hello.v1_1.json"
PIXEL_SAMPLE="$ROOT/fixtures/designs/sample-design-pixel-portrait-12.v1_1.json"
OUT_DIR="/tmp/mosapack-generate-kit-pack-verify"
OUT_PDF="$OUT_DIR/first-hello-kit.pdf"
OUT_MANIFEST="$OUT_DIR/first-hello-kit.manifest.json"
GATE_A_PDF="$OUT_DIR/first-hello-gate-a.pdf"
GATE_A_MANIFEST="$OUT_DIR/first-hello-gate-a.manifest.json"
MIXED_PDF="$OUT_DIR/first-hello-mixed.pdf"
MIXED_MANIFEST="$OUT_DIR/first-hello-mixed.manifest.json"
STOCK_PDF="$OUT_DIR/first-hello-stock.pdf"
STOCK_MANIFEST="$OUT_DIR/first-hello-stock.manifest.json"
HYBRID_PDF="$OUT_DIR/first-hello-hybrid.pdf"
HYBRID_MANIFEST="$OUT_DIR/first-hello-hybrid.manifest.json"
PIXEL_MIXED_PDF="$OUT_DIR/pixel-portrait-mixed.pdf"
PIXEL_MIXED_MANIFEST="$OUT_DIR/pixel-portrait-mixed.manifest.json"
PIXEL_STOCK_PDF="$OUT_DIR/pixel-portrait-stock.pdf"
PIXEL_STOCK_MANIFEST="$OUT_DIR/pixel-portrait-stock.manifest.json"
PIXEL_HYBRID_PDF="$OUT_DIR/pixel-portrait-hybrid.pdf"
PIXEL_HYBRID_MANIFEST="$OUT_DIR/pixel-portrait-hybrid.manifest.json"
FAIL=0

require_file() {
  local file="$1"
  local label="$2"
  if [ ! -f "$file" ]; then
    echo "MISSING: $label"
    FAIL=1
  fi
}

require_file "$GENERATOR" "tools/kitpack/generate_kit_pack.py"
require_file "$REQS" "tools/kitpack/requirements.txt"
require_file "$README" "tools/kitpack/README.md"
require_file "$CONSTANTS" "config/production-constants.json"
require_file "$SCHEMA" "config/design-schema.v1.json"
require_file "$SAMPLE" "fixtures/designs/sample-design-first-hello.v1_1.json"
require_file "$PIXEL_SAMPLE" "fixtures/designs/sample-design-pixel-portrait-12.v1_1.json"

if [ "$FAIL" -ne 0 ]; then
  echo "Kit pack generator verification failed."
  exit 1
fi

PYTHONPYCACHEPREFIX=/tmp/mosapack-pycache python3 -m py_compile "$GENERATOR"
PYTHONPYCACHEPREFIX=/tmp/mosapack-pycache python3 -m unittest tools.kitpack.test_generate_kit_pack -v

if ! python3 - <<'PY'
import reportlab
PY
then
  echo "MISSING optional dependency: reportlab"
  echo "Kit pack generator verification failed."
  exit 1
fi

mkdir -p "$OUT_DIR"
rm -f "$OUT_PDF" "$OUT_MANIFEST" "$GATE_A_PDF" "$GATE_A_MANIFEST" "$MIXED_PDF" "$MIXED_MANIFEST" "$STOCK_PDF" "$STOCK_MANIFEST" "$HYBRID_PDF" "$HYBRID_MANIFEST" "$PIXEL_MIXED_PDF" "$PIXEL_MIXED_MANIFEST" "$PIXEL_STOCK_PDF" "$PIXEL_STOCK_MANIFEST" "$PIXEL_HYBRID_PDF" "$PIXEL_HYBRID_MANIFEST"
python3 "$GENERATOR" "$SAMPLE" "$OUT_PDF" --constants "$CONSTANTS"
python3 "$GENERATOR" "$SAMPLE" "$MIXED_PDF" --constants "$CONSTANTS" --fulfillment printed_mixed
python3 "$GENERATOR" "$SAMPLE" "$STOCK_PDF" --constants "$CONSTANTS" --fulfillment stock
python3 "$GENERATOR" "$SAMPLE" "$HYBRID_PDF" --constants "$CONSTANTS" --fulfillment hybrid
python3 "$GENERATOR" "$SAMPLE" "$GATE_A_PDF" --constants "$CONSTANTS" --gate-a
python3 "$GENERATOR" "$PIXEL_SAMPLE" "$PIXEL_MIXED_PDF" --constants "$CONSTANTS" --fulfillment printed_mixed
python3 "$GENERATOR" "$PIXEL_SAMPLE" "$PIXEL_STOCK_PDF" --constants "$CONSTANTS" --fulfillment stock
python3 "$GENERATOR" "$PIXEL_SAMPLE" "$PIXEL_HYBRID_PDF" --constants "$CONSTANTS" --fulfillment hybrid

for generated in "$OUT_PDF" "$MIXED_PDF" "$STOCK_PDF" "$HYBRID_PDF" "$GATE_A_PDF" "$OUT_MANIFEST" "$MIXED_MANIFEST" "$STOCK_MANIFEST" "$HYBRID_MANIFEST" "$GATE_A_MANIFEST" "$PIXEL_MIXED_PDF" "$PIXEL_MIXED_MANIFEST" "$PIXEL_STOCK_PDF" "$PIXEL_STOCK_MANIFEST" "$PIXEL_HYBRID_PDF" "$PIXEL_HYBRID_MANIFEST"; do
  if [ ! -s "$generated" ]; then
    echo "MISSING: generated file is empty or absent: $generated"
    exit 1
  fi
done

python3 - "$OUT_MANIFEST" "$GATE_A_MANIFEST" "$MIXED_MANIFEST" "$STOCK_MANIFEST" "$HYBRID_MANIFEST" "$PIXEL_MIXED_MANIFEST" "$PIXEL_STOCK_MANIFEST" "$PIXEL_HYBRID_MANIFEST" <<'PY'
import json
import sys
from pathlib import Path

normal_path = Path(sys.argv[1])
gate_path = Path(sys.argv[2])
mixed_path = Path(sys.argv[3])
stock_path = Path(sys.argv[4])
hybrid_path = Path(sys.argv[5])
pixel_mixed_path = Path(sys.argv[6])
pixel_stock_path = Path(sys.argv[7])
pixel_hybrid_path = Path(sys.argv[8])
normal = json.loads(normal_path.read_text())
gate = json.loads(gate_path.read_text())
mixed = json.loads(mixed_path.read_text())
stock = json.loads(stock_path.read_text())
hybrid = json.loads(hybrid_path.read_text())
pixel_mixed = json.loads(pixel_mixed_path.read_text())
pixel_stock = json.loads(pixel_stock_path.read_text())
pixel_hybrid = json.loads(pixel_hybrid_path.read_text())

for label, manifest in (("normal", normal), ("gate_a", gate), ("mixed", mixed), ("stock", stock), ("hybrid", hybrid), ("pixel_mixed", pixel_mixed), ("pixel_stock", pixel_stock), ("pixel_hybrid", pixel_hybrid)):
    for key in ("proof_ref", "project_id", "sheet_profile", "total_placed_stickers", "total_spares", "total_stickers"):
        if key not in manifest:
            raise SystemExit(f"{label} manifest missing {key}")
    expected_ref = "MP-PP12A" if label.startswith("pixel_") else "MP-FH24A"
    if manifest["proof_ref"] != expected_ref:
        raise SystemExit(f"{label} manifest proof_ref mismatch")
    if manifest["sheet_profile"] != "OL2050":
        raise SystemExit(f"{label} manifest sheet_profile mismatch")
    if manifest.get("palette_mode") != "fixed":
        raise SystemExit(f"{label} manifest palette_mode should remain fixed")
    if manifest.get("pdf_layout_mode") != "printed_mixed_sheets":
        raise SystemExit(f"{label} manifest must disclose printed_mixed_sheets PDF layout")
    if "PDF layout remains printed_mixed_sheets" not in manifest.get("pdf_layout_note", ""):
        raise SystemExit(f"{label} manifest missing math-only PDF layout note")

if normal.get("gate_a_mode") is not False:
    raise SystemExit("normal manifest gate_a_mode should be false")
if gate.get("gate_a_mode") is not True:
    raise SystemExit("Gate A manifest gate_a_mode should be true")
if [round(float(value), 2) for value in gate.get("bleed_values_used", [])] != [0.03, 0.05]:
    raise SystemExit("Gate A manifest must include bleed values 0.03 and 0.05")
if "palette_drift_warnings" not in gate:
    raise SystemExit("Gate A manifest missing palette_drift_warnings")
if "mismatch_warnings" not in gate:
    raise SystemExit("Gate A manifest missing mismatch_warnings")
calibration = gate.get("calibration", {})
if calibration.get("horizontal_bar_y_in", 0) < 0.35:
    raise SystemExit("Gate A horizontal calibration bar is too close to trim")
if not calibration.get("vertical_bar"):
    raise SystemExit("Gate A manifest missing vertical calibration bar")
if calibration.get("vertical_bar_length_in") != 1.0:
    raise SystemExit("Gate A vertical calibration bar must be 1.0in")
fiducials = gate.get("feed_fiducials", {})
if fiducials.get("y_from_top_in", 0) < 0.22:
    raise SystemExit("Gate A feed/skew fiducials are too close to top trim")

if normal.get("fulfillment", {}).get("mode") != "printed_mixed_sheets":
    raise SystemExit("default manifest fulfillment mode should be printed_mixed_sheets")
if mixed.get("fulfillment", {}).get("mode") != "printed_mixed_sheets":
    raise SystemExit("printed_mixed manifest fulfillment mode mismatch")
if stock.get("fulfillment", {}).get("mode") != "stock_color_sheets":
    raise SystemExit("stock manifest fulfillment mode mismatch")
if hybrid.get("fulfillment", {}).get("mode") != "hybrid_stock_plus_topoff":
    raise SystemExit("hybrid manifest fulfillment mode mismatch")
if not stock.get("fulfillment", {}).get("stock_sheet_plan"):
    raise SystemExit("stock manifest missing stock_sheet_plan")
if stock.get("fulfillment", {}).get("stock_total_sheets", 0) <= 0:
    raise SystemExit("stock manifest missing stock_total_sheets")
if stock.get("fulfillment", {}).get("stock_extras", -1) < 0:
    raise SystemExit("stock manifest missing stock_extras")
if "customer_extra_note" not in stock.get("fulfillment", {}):
    raise SystemExit("stock manifest missing customer_extra_note")
if "warnings" not in stock.get("fulfillment", {}):
    raise SystemExit("stock manifest missing warnings")
if stock.get("active_fulfillment_mode") != "stock_color_sheets":
    raise SystemExit("stock manifest missing active_fulfillment_mode")
if stock.get("active_fulfillment_sheet_count") != stock.get("fulfillment", {}).get("stock_total_sheets"):
    raise SystemExit("stock active sheet count must match stock_total_sheets")
if stock.get("active_fulfillment_total_included_stickers") != stock.get("fulfillment", {}).get("stock_included_stickers"):
    raise SystemExit("stock active included stickers must match stock_included_stickers")
if stock.get("active_fulfillment_total_extras") != stock.get("fulfillment", {}).get("stock_extras"):
    raise SystemExit("stock active extras must match stock_extras")
if stock.get("sheet_count") != stock.get("printed_mixed_baseline", {}).get("sheet_count"):
    raise SystemExit("stock top-level sheet_count should remain printed mixed baseline")
if "hybrid_stock_sheet_plan" not in hybrid.get("fulfillment", {}):
    raise SystemExit("hybrid manifest missing hybrid_stock_sheet_plan")
if "hybrid_topoff_sheets" not in hybrid.get("fulfillment", {}):
    raise SystemExit("hybrid manifest missing hybrid_topoff_sheets")
if "hybrid_total_sheets" not in hybrid.get("fulfillment", {}):
    raise SystemExit("hybrid manifest missing hybrid_total_sheets")
if hybrid.get("active_fulfillment_mode") != "hybrid_stock_plus_topoff":
    raise SystemExit("hybrid manifest missing active_fulfillment_mode")
if hybrid.get("active_fulfillment_sheet_count") != hybrid.get("fulfillment", {}).get("hybrid_total_sheets"):
    raise SystemExit("hybrid active sheet count must match hybrid_total_sheets")
if "Hybrid fulfillment may combine stock sheets with a mixed top-off sheet" not in hybrid.get("fulfillment", {}).get("customer_extra_note", ""):
    raise SystemExit("hybrid manifest missing hybrid customer_extra_note")

if pixel_mixed.get("proof_ref") != "MP-PP12A":
    raise SystemExit("Pixel Portrait proof_ref mismatch")
if pixel_mixed.get("grid") != 24 or pixel_mixed.get("size_in") != 12:
    raise SystemExit("Pixel Portrait grid/size mismatch")
if pixel_mixed.get("fulfillment", {}).get("mode") != "printed_mixed_sheets":
    raise SystemExit("Pixel Portrait mixed mode mismatch")
if pixel_stock.get("active_fulfillment_mode") != "stock_color_sheets":
    raise SystemExit("Pixel Portrait stock active mode mismatch")
if pixel_hybrid.get("active_fulfillment_mode") != "hybrid_stock_plus_topoff":
    raise SystemExit("Pixel Portrait hybrid active mode mismatch")

print("Manifest checks passed.")
PY

python3 - "$OUT_PDF" "$GATE_A_PDF" "$MIXED_PDF" "$STOCK_PDF" "$HYBRID_PDF" "$PIXEL_MIXED_PDF" <<'PY'
import sys
from pathlib import Path

pdf_paths = [Path(value) for value in sys.argv[1:]]
try:
    from pypdf import PdfReader
except Exception as exc:
    print(f"MISSING optional dependency: pypdf ({exc.__class__.__name__})")
    sys.exit(0)

for pdf_path in pdf_paths:
    reader = PdfReader(str(pdf_path))
    if len(reader.pages) < 1:
        raise SystemExit(f"{pdf_path} has no pages")
    if pdf_path.name == "first-hello-gate-a.pdf" and len(reader.pages) != 5:
        raise SystemExit("Gate A PDF must have exactly 5 pages")
    if pdf_path.name in ("first-hello-mixed.pdf", "first-hello-stock.pdf", "first-hello-hybrid.pdf") and len(reader.pages) != 5:
        raise SystemExit(f"{pdf_path} should remain the normal 5-page PDF; fulfillment mode must not add pages")
    text = "\n".join((page.extract_text() or "") for page in reader.pages[:5])
    proof_ref = "MP-PP12A" if pdf_path.name.startswith("pixel-portrait") else "MP-FH24A"
    common_needles = (
        "MosaPack",
        proof_ref,
        "Actual Size",
        "Measure me: 1.000 in",
        "Vertical check: 1.000 in",
        "feed/skew fiducials",
    )
    for needle in common_needles:
        if needle not in text:
            raise SystemExit(f"{pdf_path} text missing {needle}")
    if not pdf_path.name.startswith("pixel-portrait") and "Some sections may continue across sticker sheets" not in text:
        raise SystemExit(f"{pdf_path} text missing section continuation note")
    page = reader.pages[0]
    width = float(page.mediabox.width)
    height = float(page.mediabox.height)
    if width <= 0 or height <= 0:
        raise SystemExit(f"{pdf_path} page size invalid")
    print(f"PDF check passed: {pdf_path.name}: {len(reader.pages)} pages, first page {width:.1f}x{height:.1f} pt")
PY

echo "Kit pack generator verification passed."
