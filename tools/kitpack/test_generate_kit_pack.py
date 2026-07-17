#!/usr/bin/env python3
"""Focused regression tests for the local kit-pack generator."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "tools" / "kitpack" / "generate_kit_pack.py"
SPEC = importlib.util.spec_from_file_location("generate_kit_pack", MODULE_PATH)
assert SPEC and SPEC.loader
KITPACK = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(KITPACK)


class KitPackTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.constants = KITPACK.load_constants()

    def adaptive_design(self, palette: list[str] | None = None) -> dict:
        colors = palette or [
            "#1B1B1B",
            "#F4F4F4",
            "#7A838C",
            "#D9C49F",
            "#CC8E68",
            "#804820",
            "#1653A4",
            "#589E61",
        ]
        return {
            "schema_version": 1.1,
            "project_id": "adaptive-kitpack-fixture",
            "proof_ref": "MP-ADAPT1",
            "grid": 24,
            "size_in": 12,
            "palette_id": "adaptive",
            "palette_mode": "adaptive",
            "gamut_profile_id": "srgb-print-safe-v1",
            "palette": [
                {"id": f"adaptive_{index:02d}", "name": f"Adaptive {index:02d}", "hex": value, "index": index}
                for index, value in enumerate(colors)
            ],
            "cell_map": [index % len(colors) for index in range(24 * 24)],
            "black_base": False,
            "sheet_profile": "sl680_0375",
        }

    def test_sl680_geometry_extremes(self) -> None:
        profile = self.constants["sheet_profiles"]["sl680_0375"]
        page_w, page_h = KITPACK.page_size_for(profile)
        self.assertEqual(profile["cols"] * profile["rows"], 192)
        self.assertEqual(profile["stickers_per_sheet"], 192)
        self.assertAlmostEqual(KITPACK.profile_pitch_x(profile), 0.6332)
        self.assertAlmostEqual(KITPACK.profile_pitch_y(profile), 0.6417)
        self.assertAlmostEqual(KITPACK.calibration_y_in(profile), 0.35)
        first_x, first_y = KITPACK.die_origin(0, profile, page_h)
        last_x, last_y = KITPACK.die_origin(191, profile, page_h)
        self.assertAlmostEqual(first_x / KITPACK.IN, 0.58)
        self.assertAlmostEqual((page_h - first_y) / KITPACK.IN, 0.5)
        self.assertAlmostEqual(last_x / KITPACK.IN, 0.58 + 11 * 0.6332)
        self.assertAlmostEqual(last_y / KITPACK.IN, 11.0 - 0.5 - 15 * 0.6417)
        bbox = KITPACK.die_grid_bbox(profile, page_h)
        self.assertAlmostEqual(bbox["x_right"] / KITPACK.IN, 8.5 - 0.5798, places=4)
        self.assertAlmostEqual(bbox["y_bot"] / KITPACK.IN, 0.4995, places=4)
        self.assertLessEqual(bbox["x_right"], page_w)
        self.assertGreaterEqual(bbox["y_bot"], 0)

    def test_adaptive_palette_and_plan_are_accepted(self) -> None:
        design = self.adaptive_design()
        KITPACK.validate_design(design, self.constants)
        KITPACK.validate_palette_fulfillment(design, "printed_mixed_sheets")
        self.assertEqual(design["palette_mode"], "adaptive")
        self.assertEqual(KITPACK.palette_drift_warnings(design, self.constants), [])
        plan = KITPACK.compute_sheet_plan(design, self.constants)
        self.assertEqual(len(plan["sequence"]), 24 * 24)
        self.assertEqual(plan["printed_mixed_sheets"], 4)
        self.assertEqual(set(plan["placed_counts"]), set(range(len(design["palette"]))))

    def test_adaptive_palette_rejects_bad_hex(self) -> None:
        design = self.adaptive_design()
        design["palette"][0]["hex"] = "1B1B1B"
        with self.assertRaisesRegex(ValueError, "#RRGGBB"):
            KITPACK.validate_design(design, self.constants)

    def test_adaptive_palette_rejects_out_of_gamut(self) -> None:
        design = self.adaptive_design()
        design["palette"][0]["hex"] = "#000000"
        with self.assertRaisesRegex(ValueError, "outside gamut"):
            KITPACK.validate_design(design, self.constants)

    def test_adaptive_palette_rejects_colors_below_minimum_separation(self) -> None:
        design = self.adaptive_design()
        design["palette"][0]["hex"] = "#505050"
        design["palette"][1]["hex"] = "#515151"
        with self.assertRaisesRegex(ValueError, "minimum is 8.000"):
            KITPACK.validate_design(design, self.constants)

    def test_stock_mode_rejects_adaptive_palette(self) -> None:
        design = self.adaptive_design()
        KITPACK.validate_design(design, self.constants)
        with self.assertRaisesRegex(ValueError, "does not support adaptive palettes"):
            KITPACK.validate_palette_fulfillment(design, "stock_color_sheets")

    def test_adaptive_black_base_exclusion_uses_existing_sequence_logic(self) -> None:
        design = self.adaptive_design()
        design["palette"][0]["id"] = "ink_black"
        design["black_base"] = True
        KITPACK.validate_design(design, self.constants)
        plan = KITPACK.compute_sheet_plan(design, self.constants)
        base_cells = design["cell_map"].count(0)
        self.assertEqual(plan["base_index"], 0)
        self.assertEqual(len(plan["sequence"]), 24 * 24 - base_cells)
        self.assertNotIn(0, plan["placed_counts"])

    def test_fixed_fixture_manufacturing_plan_is_unchanged(self) -> None:
        design = KITPACK.load_design(ROOT / "fixtures" / "designs" / "sample-design-first-hello.v1_1.json")
        KITPACK.validate_design(design, self.constants)
        plan = KITPACK.compute_sheet_plan(design, self.constants)
        fulfillment = KITPACK.compute_fulfillment_plan(
            design, self.constants, plan, "printed_mixed_sheets"
        )
        payload = {
            "sheet_profile": design["sheet_profile"],
            "base_index": plan["base_index"],
            "sequence": plan["sequence"],
            "section_ranges": plan["section_ranges"],
            "section_size": plan["section_size"],
            "spares": plan["spares"],
            "placed_counts": sorted(plan["placed_counts"].items()),
            "total_placed": plan["total_placed"],
            "total_spares": plan["total_spares"],
            "total_stickers": plan["total_stickers"],
            "printed_mixed_sheets": plan["printed_mixed_sheets"],
            "fulfillment": fulfillment,
            "palette_warnings": KITPACK.palette_drift_warnings(design, self.constants),
        }
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
        self.assertEqual(
            hashlib.sha256(encoded).hexdigest(),
            "cf490e38d7214834862bad91b9a26f9d687b16f65a00293d57525facd74348d7",
        )

    def test_color_target_contains_master_and_full_gamut_patches(self) -> None:
        patches = KITPACK.color_target_patches(self.constants)
        self.assertEqual(len(patches), 65)
        self.assertEqual(sum(patch["group"] == "master_25" for patch in patches), 25)
        self.assertTrue(all(KITPACK.HEX_COLOR_RE.match(patch["hex"]) for patch in patches))


if __name__ == "__main__":
    unittest.main()
