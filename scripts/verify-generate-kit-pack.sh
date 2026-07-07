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
rm -f "$OUT_PDF"
python3 "$GENERATOR" "$SAMPLE" "$OUT_PDF" --constants "$CONSTANTS"

if [ ! -s "$OUT_PDF" ]; then
  echo "MISSING: generated PDF is empty or absent"
  exit 1
fi

python3 - "$OUT_PDF" <<'PY'
import sys
from pathlib import Path

pdf_path = Path(sys.argv[1])
try:
    from pypdf import PdfReader
except Exception as exc:
    print(f"MISSING optional dependency: pypdf ({exc.__class__.__name__})")
    sys.exit(0)

reader = PdfReader(str(pdf_path))
if len(reader.pages) < 1:
    raise SystemExit("PDF has no pages")
text = "\n".join((page.extract_text() or "") for page in reader.pages[:3])
if "MosaPack" not in text:
    raise SystemExit("PDF text missing MosaPack")
if "MP-FH24A" not in text:
    raise SystemExit("PDF text missing proof_ref MP-FH24A")
page = reader.pages[0]
width = float(page.mediabox.width)
height = float(page.mediabox.height)
if width <= 0 or height <= 0:
    raise SystemExit("PDF page size invalid")
print(f"PDF check passed: {len(reader.pages)} pages, first page {width:.1f}x{height:.1f} pt")
PY

echo "Kit pack generator verification passed."
