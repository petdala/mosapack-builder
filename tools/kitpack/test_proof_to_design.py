#!/usr/bin/env python3
"""Regression tests for the local proof-to-design fulfillment bridge."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MODULE_DIR = ROOT / "tools" / "kitpack"
sys.path.insert(0, str(MODULE_DIR))

import generate_kit_pack as KITPACK  # noqa: E402
import proof_to_design as BRIDGE  # noqa: E402


class ProofToDesignTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.constants = KITPACK.load_constants()

    def fixture(self, name: str) -> dict:
        return KITPACK.load_json(ROOT / "fixtures" / "proofs" / name)

    def test_fixed_payload_preserves_palette_order_and_renders_customer_pack(self) -> None:
        payload = self.fixture("sample-fixed-proof-payload.json")
        design = BRIDGE.convert_payload(payload, self.constants, dedication="Made for Grandma")
        self.assertEqual(design["schema_version"], 1.2)
        self.assertEqual(design["palette_id"], "master_25")
        self.assertEqual(design["palette_mode"], "fixed")
        self.assertEqual(len(design["palette"]), len(payload["palette"]))
        self.assertEqual(
            [(color["name"], color["hex"]) for color in design["palette"]],
            [(color["name"], color["hex"]) for color in payload["palette"]],
        )
        self.assertEqual(design["cell_map"], payload["tile_map"])
        self.assertEqual(design["dedication"], "Made for Grandma")
        self.assertEqual(design["cell_size_in"], 0.375)
        self.assertEqual(design["finished_size_in"], 9.6)

        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            design_path = temp / "fixed-design.json"
            customer_path = temp / "fixed-customer.pdf"
            board_path = temp / "fixed-board.pdf"
            design_path.write_text(json.dumps(design), encoding="utf-8")
            result = KITPACK.generate(design_path, customer_path, customer_pack=True, board_art_path=board_path)
            self.assertTrue(customer_path.exists())
            self.assertTrue(board_path.exists())
            self.assertTrue(Path(result["qc_checklist"]["output"]).exists())

    def test_adaptive_payload_uses_adaptive_palette_and_renders(self) -> None:
        payload = self.fixture("sample-adaptive-proof-payload.json")
        design = BRIDGE.convert_payload(payload, self.constants)
        self.assertEqual(design["palette_id"], "adaptive")
        self.assertEqual(design["palette_mode"], "adaptive")
        self.assertEqual(len(design["palette"]), len(payload["adaptive_palette"]))
        self.assertEqual(design["gamut_profile_id"], self.constants["adaptive_palette"]["gamut_profile_id"])

        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            design_path = temp / "adaptive-design.json"
            customer_path = temp / "adaptive-customer.pdf"
            design_path.write_text(json.dumps(design), encoding="utf-8")
            result = KITPACK.generate(design_path, customer_path, customer_pack=True)
            self.assertTrue(customer_path.exists())
            self.assertEqual(result["palette_mode"], "adaptive")

    def test_auto_resolution_geometry_flows_into_design_v12(self) -> None:
        payload = self.fixture("sample-fixed-proof-payload.json")
        payload["grid_size"] = "48x48"
        payload["cell_size_in"] = 0.375
        payload["finished_size_in"] = 19.2
        payload["tile_map"] = [index % len(payload["palette"]) for index in range(48 * 48)]
        design = BRIDGE.convert_payload(payload, self.constants)
        self.assertEqual(design["grid"], 48)
        self.assertEqual(design["cell_size_in"], 0.375)
        self.assertEqual(design["finished_size_in"], 19.2)
        self.assertNotIn("size_in", design)

    def test_corrupt_payloads_fail_with_actionable_errors(self) -> None:
        base = self.fixture("sample-fixed-proof-payload.json")

        short_map = json.loads(json.dumps(base))
        short_map["tile_map"] = short_map["tile_map"][:-1]
        with self.assertRaisesRegex(ValueError, "tile_map length must equal grid_size squared"):
            BRIDGE.convert_payload(short_map, self.constants)

        bad_hex = json.loads(json.dumps(base))
        bad_hex["palette"][0]["hex"] = "1B1B1B"
        with self.assertRaisesRegex(ValueError, r"palette\[0\]\.hex must be #RRGGBB"):
            BRIDGE.convert_payload(bad_hex, self.constants)

        out_of_range = json.loads(json.dumps(base))
        out_of_range["tile_map"][10] = len(out_of_range["palette"])
        with self.assertRaisesRegex(ValueError, "outside palette range"):
            BRIDGE.convert_payload(out_of_range, self.constants)

    def test_retrieval_wrapper_and_command_hints_are_supported(self) -> None:
        payload = self.fixture("sample-fixed-proof-payload.json")
        design = BRIDGE.convert_payload({"ok": True, "project": payload}, self.constants)
        self.assertEqual(design["project_id"], payload["project_id"])
        hints = BRIDGE.command_hints(Path("/tmp/MP-FIXED1.design.json"))
        self.assertTrue(any("--customer-pack --board-art" in command for command in hints))
        self.assertTrue(any("--vendor-pack" in command for command in hints))


if __name__ == "__main__":
    unittest.main()
