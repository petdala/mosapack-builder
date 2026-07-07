#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GENERATOR="$ROOT/tools/kitpack/generate_kit_pack.py"
REQS="$ROOT/tools/kitpack/requirements.txt"
README="$ROOT/tools/kitpack/README.md"
CONSTANTS="$ROOT/config/production-constants.json"
SCHEMA="$ROOT/config/design-schema.v1.json"
SAMPLE="$ROOT/fixtures/designs/sample-design-first-hello.v1_1.json"
OUT_DIR="/tmp/mosapack-generate-kit-pack-verify"
OUT_PDF="$OUT_DIR/first-hello-kit.pdf"
OUT_MANIFEST="$OUT_DIR/first-hello-kit.manifest.json"
GATE_A_PDF="$OUT_DIR/first-hello-gate-a.pdf"
GATE_A_MANIFEST="$OUT_DIR/first-hello-gate-a.manifest.json"
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

if [ "$FAIL" -ne 0 ]; then
  echo "Kit pack generator verification failed."
  exit 1
fi

PYTHONPYCACHEPREFIX=/tmp/mosapack-pycache python3 -m py_compile "$GENERATOR"

if ! python3 - <<'PY'
import reportlab
PY
then
  echo "MISSING optional dependency: reportlab"
  echo "Kit pack generator verification failed."
  exit 1
fi

mkdir -p "$OUT_DIR"
rm -f "$OUT_PDF" "$OUT_MANIFEST" "$GATE_A_PDF" "$GATE_A_MANIFEST"
python3 "$GENERATOR" "$SAMPLE" "$OUT_PDF" --constants "$CONSTANTS"
python3 "$GENERATOR" "$SAMPLE" "$GATE_A_PDF" --constants "$CONSTANTS" --gate-a

if [ ! -s "$OUT_PDF" ]; then
  echo "MISSING: generated PDF is empty or absent"
  exit 1
fi
if [ ! -s "$GATE_A_PDF" ]; then
  echo "MISSING: generated Gate A PDF is empty or absent"
  exit 1
fi
if [ ! -s "$OUT_MANIFEST" ]; then
  echo "MISSING: normal manifest is empty or absent"
  exit 1
fi
if [ ! -s "$GATE_A_MANIFEST" ]; then
  echo "MISSING: Gate A manifest is empty or absent"
  exit 1
fi

python3 - "$OUT_MANIFEST" "$GATE_A_MANIFEST" <<'PY'
import json
import sys
from pathlib import Path

normal_path = Path(sys.argv[1])
gate_path = Path(sys.argv[2])
normal = json.loads(normal_path.read_text())
gate = json.loads(gate_path.read_text())

for label, manifest in (("normal", normal), ("gate_a", gate)):
    for key in ("proof_ref", "project_id", "sheet_profile", "total_placed_stickers", "total_spares", "total_stickers"):
        if key not in manifest:
            raise SystemExit(f"{label} manifest missing {key}")
    if manifest["proof_ref"] != "MP-FH24A":
        raise SystemExit(f"{label} manifest proof_ref mismatch")
    if manifest["sheet_profile"] != "OL2050":
        raise SystemExit(f"{label} manifest sheet_profile mismatch")

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

print("Manifest checks passed.")
PY

python3 - "$OUT_PDF" "$GATE_A_PDF" <<'PY'
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
    text = "\n".join((page.extract_text() or "") for page in reader.pages[:5])
    for needle in ("MosaPack", "MP-FH24A", "Actual Size", "Measure me: 1.000 in"):
        if needle not in text:
            raise SystemExit(f"{pdf_path} text missing {needle}")
    page = reader.pages[0]
    width = float(page.mediabox.width)
    height = float(page.mediabox.height)
    if width <= 0 or height <= 0:
        raise SystemExit(f"{pdf_path} page size invalid")
    print(f"PDF check passed: {pdf_path.name}: {len(reader.pages)} pages, first page {width:.1f}x{height:.1f} pt")
PY

echo "Kit pack generator verification passed."
