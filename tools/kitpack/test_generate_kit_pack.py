#!/usr/bin/env python3
"""Focused regression tests for the local kit-pack generator."""

from __future__ import annotations

import csv
import hashlib
import importlib.util
import json
import tempfile
import unittest
from collections import Counter
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

    def separated_palette(self, count: int) -> list[str]:
        candidates = []
        for red in range(24, 233, 32):
            for green in range(24, 233, 32):
                for blue in range(24, 233, 32):
                    value = f"#{red:02X}{green:02X}{blue:02X}"
                    lab = KITPACK.rgb_to_lab(KITPACK.hex_to_rgb(value))
                    if all(KITPACK.delta_e00(lab, prior) >= 8 for _, prior in candidates):
                        candidates.append((value, lab))
        self.assertGreaterEqual(len(candidates), count)
        return [value for value, _ in candidates[:count]]

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

    def test_v12_size_model_validates_and_propagates_to_manifest_and_qc(self) -> None:
        from pypdf import PdfReader

        design_path = ROOT / "fixtures" / "designs" / "sample-design-pixel-portrait.v1_2.json"
        design = KITPACK.load_design(design_path)
        KITPACK.validate_design(design, self.constants)
        self.assertNotIn("size_in", design)
        self.assertEqual(design["cell_size_in"], 0.375)
        self.assertEqual(design["finished_size_in"], 9.6)
        plan = KITPACK.compute_customer_plan(design, self.constants)
        self.assertEqual(plan["finished_size_in"], 9.6)

        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            output_path = temp / "customer.pdf"
            board_path = temp / "board.pdf"
            result = KITPACK.generate(design_path, output_path, customer_pack=True, board_art_path=board_path)
            manifest = json.loads(output_path.with_suffix(".manifest.json").read_text())
            self.assertEqual(manifest["schema_version"], 1.2)
            self.assertEqual(manifest["finished_size_in"], 9.6)
            self.assertEqual(manifest["cell_size_in"], 0.375)
            self.assertNotIn("size_in", manifest)
            self.assertEqual(result["qc_checklist"]["finished_size_in"], 9.6)
            self.assertEqual(result["qc_checklist"]["cell_size_in"], 0.375)
            qc_text = PdfReader(result["qc_checklist"]["output"]).pages[0].extract_text() or ""
            self.assertIn("Finished size", qc_text)
            self.assertIn("9.6 in", qc_text)
            self.assertIn("Sticker size", qc_text)

    def test_v12_size_model_rejects_wrong_finished_or_cell_size(self) -> None:
        source = KITPACK.load_design(ROOT / "fixtures" / "designs" / "sample-design-pixel-portrait.v1_2.json")
        wrong_finished = json.loads(json.dumps(source))
        wrong_finished["finished_size_in"] = 12
        with self.assertRaisesRegex(ValueError, "grid x board_pitch_in"):
            KITPACK.validate_design(wrong_finished, self.constants)

        wrong_cell = json.loads(json.dumps(source))
        wrong_cell["cell_size_in"] = 0.5
        with self.assertRaisesRegex(ValueError, "must match sheet profile"):
            KITPACK.validate_design(wrong_cell, self.constants)

    def test_color_target_contains_master_and_full_gamut_patches(self) -> None:
        patches = KITPACK.color_target_patches(self.constants)
        self.assertEqual(len(patches), 65)
        self.assertEqual(sum(patch["group"] == "master_25" for patch in patches), 25)
        self.assertTrue(all(KITPACK.HEX_COLOR_RE.match(patch["hex"]) for patch in patches))

    def test_customer_plan_is_usage_ranked_and_color_grouped(self) -> None:
        design = self.adaptive_design()
        design["cell_map"] = [3] * 200 + [1] * 150 + [7] * 100 + [0] * 60 + [2] * 40 + [4] * 20 + [5] * 5 + [6]
        KITPACK.validate_design(design, self.constants)
        plan = KITPACK.compute_customer_plan(design, self.constants)
        self.assertEqual([color["palette_index"] for color in plan["colors"][:4]], [3, 1, 7, 0])
        self.assertEqual([color["placed"] for color in plan["colors"]], sorted((color["placed"] for color in plan["colors"]), reverse=True))
        slot_counts = {}
        for sheet in plan["sheets"]:
            for slot in sheet["slots"]:
                if slot:
                    key = (slot["palette_index"], slot["is_spare"])
                    slot_counts[key] = slot_counts.get(key, 0) + 1
                    self.assertEqual(slot["color_number"], plan["number_by_index"][slot["palette_index"]])
            sheet_colors = list(sheet["colors"])
            for left_index, left in enumerate(sheet_colors):
                for right in sheet_colors[left_index + 1:]:
                    distance = KITPACK.delta_e00(
                        KITPACK.rgb_to_lab(KITPACK.hex_to_rgb(design["palette"][left]["hex"])),
                        KITPACK.rgb_to_lab(KITPACK.hex_to_rgb(design["palette"][right]["hex"])),
                    )
                    self.assertGreaterEqual(distance, self.constants["customer_pack"]["lookalike_delta_e00"])
        for color in plan["colors"]:
            self.assertEqual(slot_counts.get((color["palette_index"], False), 0), color["placed"])
            self.assertEqual(slot_counts.get((color["palette_index"], True), 0), color["spares"])
        self.assertEqual(len(plan["colors"]), len(design["palette"]))

    def test_customer_surfaces_omit_zero_count_colors_and_number_used_colors_contiguously(self) -> None:
        from pypdf import PdfReader

        design = self.adaptive_design(self.separated_palette(20))
        design["cell_map"] = [index % 12 for index in range(24 * 24)]
        KITPACK.validate_design(design, self.constants)
        plan = KITPACK.compute_customer_plan(design, self.constants)
        self.assertEqual(len(plan["colors"]), 12)
        self.assertEqual([color["number"] for color in plan["colors"]], list(range(1, 13)))
        self.assertEqual(set(plan["number_by_index"]), set(range(12)))
        self.assertTrue(all(slot["palette_index"] < 12 for sheet in plan["sheets"] for slot in sheet["slots"] if slot))

        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            design_path = temp / "used-12-of-20.json"
            output_path = temp / "customer.pdf"
            design_path.write_text(json.dumps(design), encoding="utf-8")
            KITPACK.generate(design_path, output_path, customer_pack=True)
            reader = PdfReader(output_path)
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
            self.assertIn("Color 12", text)
            self.assertNotIn("Color 13", text)
            manifest = json.loads(output_path.with_suffix(".manifest.json").read_text())
            self.assertEqual(len(manifest["customer_color_numbering"]), 12)

    def test_customer_color_continuation_banner_repeats_on_every_sheet(self) -> None:
        from pypdf import PdfReader

        design = self.adaptive_design()
        design["cell_map"] = [0] * (24 * 24)
        KITPACK.validate_design(design, self.constants)
        plan = KITPACK.compute_customer_plan(design, self.constants)
        self.assertGreaterEqual(len(plan["sheets"]), 2)
        for sheet_index, sheet in enumerate(plan["sheets"]):
            self.assertEqual(len(sheet["segments"]), 1)
            self.assertEqual(sheet["segments"][0]["continued"], sheet_index > 0)

        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            design_path = temp / "continuation.json"
            output_path = temp / "customer.pdf"
            design_path.write_text(json.dumps(design), encoding="utf-8")
            result = KITPACK.generate(design_path, output_path, customer_pack=True)
            reader = PdfReader(output_path)
            first_sheet_page = 1 + len(plan["board_regions"])
            sheet_text = [reader.pages[first_sheet_page + index].extract_text() or "" for index in range(len(plan["sheets"]))]
            self.assertNotIn("continued", sheet_text[0].lower())
            self.assertTrue(all("continued" in text.lower() for text in sheet_text[1:]))
            self.assertEqual(result["sheets"], len(plan["sheets"]))

    def test_pixel_portrait_small_groups_fill_forward_to_reduce_sheet_count(self) -> None:
        design = KITPACK.load_design(ROOT / "fixtures" / "designs" / "sample-design-pixel-portrait.v1_2.json")
        KITPACK.validate_design(design, self.constants)
        plan = KITPACK.compute_customer_plan(design, self.constants)
        self.assertLessEqual(len(plan["sheets"]), 5)

        actual = Counter()
        for sheet in plan["sheets"]:
            for slot in sheet["slots"]:
                if slot:
                    actual[(slot["palette_index"], slot["is_spare"])] += 1
            for left_index, left in enumerate(sheet["colors"]):
                for right in sheet["colors"][left_index + 1:]:
                    distance = KITPACK.delta_e00(
                        KITPACK.rgb_to_lab(KITPACK.hex_to_rgb(design["palette"][left]["hex"])),
                        KITPACK.rgb_to_lab(KITPACK.hex_to_rgb(design["palette"][right]["hex"])),
                    )
                    self.assertGreaterEqual(distance, self.constants["customer_pack"]["lookalike_delta_e00"])
        for color in plan["colors"]:
            self.assertEqual(actual[(color["palette_index"], False)], color["placed"])
            self.assertEqual(actual[(color["palette_index"], True)], color["spares"])

    def test_customer_enhancements_render_and_qc_matches_plan(self) -> None:
        from pypdf import PdfReader

        design = self.adaptive_design()
        design["dedication"] = "Made for Grandma - December 2026"
        design["photo_category"] = "memorial portrait"
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            design_path = temp / "memorial.json"
            output_path = temp / "customer.pdf"
            board_path = temp / "board.pdf"
            design_path.write_text(json.dumps(design), encoding="utf-8")
            result = KITPACK.generate(design_path, output_path, customer_pack=True, board_art_path=board_path)
            reader = PdfReader(output_path)
            self.assertIn(design["dedication"], reader.pages[0].extract_text() or "")
            closing_text = reader.pages[-1].extract_text() or ""
            self.assertIn("Your piece is complete", closing_text)
            self.assertNotIn("You did it", closing_text)
            self.assertIn("If you wish, photograph the finished piece beside the original photo", closing_text)
            self.assertNotIn("#MosaPack", closing_text)

            manifest = json.loads(output_path.with_suffix(".manifest.json").read_text())
            self.assertEqual(manifest["customer_tone"], "memorial")
            self.assertTrue(manifest["customer_help_qr"])
            markers = manifest["customer_board"]["guide_pages"][0]["panel_markers"]
            self.assertEqual([marker["number"] for marker in markers], [1, 2, 3, 4])
            progress_total = sum(color["progress_percent"] for color in manifest["customer_color_numbering"])
            self.assertLessEqual(abs(progress_total - 100), len(manifest["customer_color_numbering"]) / 2)

            qc = result["qc_checklist"]
            self.assertTrue(Path(qc["output"]).exists())
            self.assertEqual(qc["total_placed"], manifest["total_placed_stickers"])
            self.assertEqual(qc["total_spares"], manifest["total_spares"])
            self.assertEqual(sum(color["placed"] for color in qc["colors"]), qc["total_placed"])
            self.assertEqual(sum(color["spares"] for color in qc["colors"]), qc["total_spares"])
            self.assertIn(design["proof_ref"], PdfReader(board_path).pages[0].extract_text() or "")

    def test_customer_optional_dedication_and_qr_omit_cleanly(self) -> None:
        from pypdf import PdfReader

        design = self.adaptive_design()
        constants = json.loads(json.dumps(self.constants))
        constants["customer_pack"]["help_url"] = ""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            constants_path = temp / "constants.json"
            design_path = temp / "plain.json"
            output_path = temp / "customer.pdf"
            constants_path.write_text(json.dumps(constants), encoding="utf-8")
            design_path.write_text(json.dumps(design), encoding="utf-8")
            KITPACK.generate(design_path, output_path, constants_path, customer_pack=True)
            first_text = PdfReader(output_path).pages[0].extract_text() or ""
            self.assertNotIn("Made for", first_text)
            self.assertNotIn("Build help", first_text)
            manifest = json.loads(output_path.with_suffix(".manifest.json").read_text())
            self.assertFalse(manifest["customer_help_qr"])

    def test_customer_contact_help_and_share_are_constants_driven(self) -> None:
        from pypdf import PdfReader

        design = self.adaptive_design()
        constants = json.loads(json.dumps(self.constants))
        constants["customer_pack"]["support_contact"] = "replacements@example.test"
        constants["customer_pack"]["help_url"] = "https://example.test/build-help"
        constants["customer_pack"]["share_line"] = "#CustomShareLine"
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            constants_path = temp / "constants.json"
            design_path = temp / "design.json"
            output_path = temp / "customer.pdf"
            constants_path.write_text(json.dumps(constants), encoding="utf-8")
            design_path.write_text(json.dumps(design), encoding="utf-8")
            KITPACK.generate(design_path, output_path, constants_path, customer_pack=True)
            reader = PdfReader(output_path)
            first_text = reader.pages[0].extract_text() or ""
            last_text = reader.pages[-1].extract_text() or ""
            self.assertIn("replacements@example.test", first_text)
            self.assertIn("#CustomShareLine", last_text)
            manifest = json.loads(output_path.with_suffix(".manifest.json").read_text())
            self.assertTrue(manifest["customer_help_qr"])

        source = MODULE_PATH.read_text(encoding="utf-8")
        self.assertNotIn("support@mosapack.com", source)
        self.assertNotIn("https://mosapack.com/help", source)
        self.assertNotIn("#MosaPack", source)

    def test_customer_pack_copy_board_art_and_cell_coverage(self) -> None:
        from pypdf import PdfReader

        design = self.adaptive_design()
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            design_path = temp / "adaptive.json"
            output_path = temp / "customer.pdf"
            board_path = temp / "board.pdf"
            design_path.write_text(json.dumps(design), encoding="utf-8")
            result = KITPACK.generate(design_path, output_path, customer_pack=True, board_art_path=board_path)
            reader = PdfReader(output_path)
            self.assertEqual(len(reader.pages), result["page_count"])
            first_text = reader.pages[0].extract_text() or ""
            for phrase in (
                "Lay the board flat",
                "Peel by color",
                "Cover the numbers",
                "Every square on the board shows a small number",
                "Wrong spot? These stickers peel off and re-stick.",
            ):
                self.assertIn(phrase, first_text)
            closing_text = reader.pages[-1].extract_text() or ""
            self.assertIn("You did it", closing_text)
            self.assertIn("Photograph your finished piece next to the original photo", closing_text)
            self.assertIn(self.constants["customer_pack"]["share_line"], closing_text)
            for forbidden in ("mosaic protocol", "section map", "row-major", "sl680_0375", "bleed"):
                self.assertNotIn(forbidden, "\n".join(page.extract_text() or "" for page in reader.pages).lower())

            manifest = json.loads(output_path.with_suffix(".manifest.json").read_text())
            guide_pages = manifest["customer_board"]["guide_pages"]
            covered = [index for page in guide_pages for index in page["covered"]]
            self.assertEqual(len(covered), 24 * 24)
            self.assertEqual(sorted(covered), list(range(24 * 24)))
            self.assertTrue(all(page["font_size"] >= 6 for page in guide_pages))
            self.assertEqual(len(manifest["customer_color_numbering"]), len(design["palette"]))

            board_reader = PdfReader(board_path)
            self.assertEqual(len(board_reader.pages), 1)
            expected_points = (24 * self.constants["board_pitch_in"] + 2 * self.constants["customer_pack"]["board_bleed_in"]) * KITPACK.IN
            self.assertAlmostEqual(float(board_reader.pages[0].mediabox.width), expected_points)
            self.assertAlmostEqual(float(board_reader.pages[0].mediabox.height), expected_points)

    def test_customer_board_light_cells_keep_outline_and_number(self) -> None:
        style = KITPACK.customer_board_cell_style("#FFFFFF", self.constants)
        geometry = KITPACK.customer_board_cell_geometry(0.4 * KITPACK.IN, self.constants)
        self.assertEqual(style["fill_hex"], "#FFFFFF")
        self.assertNotEqual(style["outline_hex"], style["fill_hex"])
        self.assertNotEqual(style["number_hex"], style["fill_hex"])
        self.assertAlmostEqual(geometry["grout"] / KITPACK.IN, 0.025)
        self.assertAlmostEqual(geometry["face"] / KITPACK.IN, 0.375)

    def test_customer_adaptive_52_color_numbers_remain_legible(self) -> None:
        from pypdf import PdfReader

        candidates = []
        for red in range(24, 233, 32):
            for green in range(24, 233, 32):
                for blue in range(24, 233, 32):
                    value = f"#{red:02X}{green:02X}{blue:02X}"
                    lab = KITPACK.rgb_to_lab(KITPACK.hex_to_rgb(value))
                    if all(KITPACK.delta_e00(lab, prior) >= 8 for _, prior in candidates):
                        candidates.append((value, lab))
        palette = [value for value, _ in candidates[:52]]
        design = self.adaptive_design(palette)
        KITPACK.validate_design(design, self.constants)
        plan = KITPACK.compute_customer_plan(design, self.constants)
        self.assertEqual(len(plan["colors"]), 52)
        self.assertEqual(max(plan["number_by_index"].values()), 52)
        region = plan["board_regions"][0]
        layout = KITPACK.customer_board_layout(8.5 * KITPACK.IN, 11 * KITPACK.IN, region, 6)
        self.assertGreaterEqual(layout["font_size"], 6)
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            design_path = temp / "adaptive-52.json"
            output_path = temp / "adaptive-52-customer.pdf"
            design_path.write_text(json.dumps(design), encoding="utf-8")
            KITPACK.generate(design_path, output_path, customer_pack=True)
            board_text = PdfReader(output_path).pages[1].extract_text() or ""
            self.assertIn("52", board_text)

    def test_customer_64_grid_splits_into_sixteen_complete_panels(self) -> None:
        from pypdf import PdfReader

        regions = KITPACK.customer_board_regions(64, self.constants)
        self.assertEqual(len(regions), 16)
        self.assertTrue(all(region["width"] == 16 and region["height"] == 16 for region in regions))
        covered = set()
        for region in regions:
            for row in range(region["row"], region["row"] + region["height"]):
                for col in range(region["col"], region["col"] + region["width"]):
                    covered.add(row * 64 + col)
        self.assertEqual(covered, set(range(64 * 64)))
        design = {
            "schema_version": 1.1,
            "project_id": "customer-64-grid-fixture",
            "proof_ref": "MP-CUST64",
            "grid": 64,
            "size_in": 32,
            "palette_id": "customer_test",
            "palette": [
                {"id": "dark", "name": "Dark", "hex": "#1B1B1B"},
                {"id": "light", "name": "Light", "hex": "#F4F4F4"},
            ],
            "cell_map": [index % 2 for index in range(64 * 64)],
            "black_base": False,
            "sheet_profile": "sl680_0375",
        }
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            design_path = temp / "grid-64.json"
            output_path = temp / "grid-64-customer.pdf"
            board_path = temp / "grid-64-board.pdf"
            design_path.write_text(json.dumps(design), encoding="utf-8")
            result = KITPACK.generate(design_path, output_path, customer_pack=True, board_art_path=board_path)
            reader = PdfReader(output_path)
            self.assertEqual(len(reader.pages), result["page_count"])
            self.assertIn("Board - Panel 1 of 16", reader.pages[1].extract_text() or "")
            self.assertIn("Board - Panel 16 of 16", reader.pages[16].extract_text() or "")
            self.assertEqual(len(PdfReader(board_path).pages), 1)

    def test_vendor_pack_has_three_pages_solid_targets_gradients_and_measurement_log(self) -> None:
        from pypdf import PdfReader

        design = self.adaptive_design()
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            design_path = temp / "adaptive.json"
            output_path = temp / "vendor-pack.pdf"
            design_path.write_text(json.dumps(design), encoding="utf-8")
            result = KITPACK.generate(
                design_path,
                output_path,
                vendor_pack=True,
                ship_to="MosaPack receiving placeholder",
                contact="qualification@example.test",
            )
            reader = PdfReader(output_path)
            self.assertEqual(len(reader.pages), 3)
            self.assertEqual(result["pack_mode"], "vendor")
            page_two = reader.pages[1].extract_text()
            page_three = reader.pages[2].extract_text()
            self.assertIn("Registration reference", page_two)
            self.assertIn("CENTER", page_two)
            self.assertNotIn("overlay the label sheet", page_two)
            self.assertIn("10-step neutral gray ramp", page_three)
            self.assertIn("Skin-tone gradient", page_three)
            self.assertIn("Saturated hue gradient", page_three)
            self.assertIn("Measure patches with spectro", page_three)

            layout = KITPACK.vendor_color_layout(8.5 * KITPACK.IN, 11 * KITPACK.IN)
            self.assertEqual(len(layout), 65)
            for boxes in layout:
                self.assertGreaterEqual(boxes["patch"][2] / KITPACK.IN, 0.6)
                self.assertGreaterEqual(boxes["patch"][3] / KITPACK.IN, 0.6)
                self.assertFalse(KITPACK.boxes_overlap(boxes["patch"], boxes["label"]))

            csv_path = Path(result["measurement_log_csv"])
            with csv_path.open(newline="", encoding="utf-8") as handle:
                rows = list(csv.DictReader(handle))
            self.assertEqual(len(rows), 65)
            self.assertEqual(rows[0]["patch_number"], "01")
            self.assertEqual(rows[0]["target_hex"], "#1B1B1B")
            expected_lab = KITPACK.rgb_to_lab(KITPACK.hex_to_rgb(rows[0]["target_hex"]))
            self.assertAlmostEqual(float(rows[0]["target_L"]), expected_lab[0], places=4)
            self.assertAlmostEqual(float(rows[0]["target_a"]), expected_lab[1], places=4)
            self.assertAlmostEqual(float(rows[0]["target_b"]), expected_lab[2], places=4)
            self.assertEqual(rows[0]["measured_L"], "")
            self.assertEqual(rows[0]["delta_E00"], "")

    def test_operator_build_guide_layout_boxes_are_disjoint(self) -> None:
        layout = KITPACK.operator_build_guide_layout(8.5 * KITPACK.IN, 11 * KITPACK.IN)
        names = list(layout)
        for left_index, left_name in enumerate(names):
            for right_name in names[left_index + 1:]:
                self.assertFalse(
                    KITPACK.boxes_overlap(layout[left_name], layout[right_name]),
                    f"{left_name} overlaps {right_name}",
                )

    def test_operator_gate_a_pack_emits_all_sheets_and_bleed_variants(self) -> None:
        from pypdf import PdfReader

        design = self.adaptive_design()
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            design_path = temp / "adaptive.json"
            output_path = temp / "operator-pack.pdf"
            design_path.write_text(json.dumps(design), encoding="utf-8")
            result = KITPACK.generate(design_path, output_path, gate_a=True, operator_pack=True)
            reader = PdfReader(output_path)
            self.assertEqual(result["sheets"], 4)
            self.assertEqual(result["page_count"], 10)
            self.assertEqual(len(reader.pages), 10)
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
            self.assertIn("Print both variants", text)
            self.assertIn("Sheet 1 of 4 - Bleed Variant A (0.03 in)", text)
            self.assertIn("Sheet 4 of 4 - Bleed Variant A (0.03 in)", text)
            self.assertIn("Sheet 1 of 4 - Bleed Variant B (0.05 in)", text)
            self.assertIn("Sheet 4 of 4 - Bleed Variant B (0.05 in)", text)
            self.assertIn("SPARES START", text)
            self.assertIn("Section map: 2 x 2; each 12 x 12 tiles", text)


if __name__ == "__main__":
    unittest.main()
