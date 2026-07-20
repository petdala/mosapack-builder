#!/usr/bin/env python3
"""Generate local MosaPack operator kit-pack PDFs.

Inputs:
  1. Canonical design JSON (`config/design-schema.v1.json` shape)
  2. Production constants JSON (`config/production-constants.json`)

This renderer is downstream-only. It does not define design truth or production
physics truth; it renders those inputs for local QA and physical sample gates.
"""

from __future__ import annotations

import argparse
import colorsys
import csv
import json
import math
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

IN = 72.0
TEAL = HexColor("#089E79")
INK = HexColor("#1A1C1F")
BLACK = HexColor("#000000")
GRAY = HexColor("#9B9FA6")
LIGHT = HexColor("#F3F6F6")
WARN = HexColor("#B45309")

SUPPORTED_GRIDS = {24, 32, 48, 64}
COMMERCE_RE = re.compile(r"stripe|shopify|checkout|payment|order placed|payment received", re.I)
CALIBRATION_Y_IN = 0.40
SL680_CALIBRATION_Y_IN = 0.35
FEED_FIDUCIAL_TOP_OFFSET_IN = 0.22
FULFILLMENT_ALIASES = {
    "printed_mixed": "printed_mixed_sheets",
    "printed_mixed_sheets": "printed_mixed_sheets",
    "stock": "stock_color_sheets",
    "stock_color_sheets": "stock_color_sheets",
    "hybrid": "hybrid_stock_plus_topoff",
    "hybrid_stock_plus_topoff": "hybrid_stock_plus_topoff",
}
HEX_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def load_json(path: str | Path) -> dict[str, Any]:
    with Path(path).open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_constants(path: str | Path | None = None) -> dict[str, Any]:
    constants_path = Path(path) if path else repo_root() / "config" / "production-constants.json"
    constants = load_json(constants_path)
    if "sheet_profiles" not in constants:
        raise ValueError("constants missing sheet_profiles")
    return constants


def default_constants_path() -> Path:
    return repo_root() / "config" / "production-constants.json"


def normalize_palette(palette: list[Any]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    seen: set[str] = set()
    for index, entry in enumerate(palette):
        if isinstance(entry, dict):
            name = str(entry.get("name") or f"Color {index + 1:02d}")
            color_id = str(entry.get("id") or name.lower().replace(" ", "_"))
            hex_value = str(entry.get("hex") or "#000000")
            declared_index = entry.get("index")
        elif isinstance(entry, list) and len(entry) >= 2:
            name = str(entry[0])
            color_id = name.lower().replace(" ", "_")
            hex_value = str(entry[1])
            declared_index = None
        else:
            raise ValueError(f"palette[{index}] must be object or legacy [name, hex]")
        color_id = re.sub(r"[^a-z0-9_]+", "_", color_id.lower()).strip("_") or f"color_{index + 1:02d}"
        if color_id in seen:
            raise ValueError(f"duplicate palette id: {color_id}")
        seen.add(color_id)
        if not HEX_COLOR_RE.match(hex_value):
            raise ValueError(f"palette[{index}].hex must be #RRGGBB")
        if declared_index is not None and declared_index != index:
            raise ValueError(f"palette[{index}].index must equal array position")
        normalized.append({"id": color_id, "name": name, "hex": hex_value.lower(), "index": index})
    return normalized


def palette_mode_for(design: dict[str, Any]) -> str:
    if design.get("palette_id") == "adaptive" or design.get("palette_mode") == "adaptive":
        return "adaptive"
    return "fixed"


def hex_to_rgb(hex_value: str) -> tuple[float, float, float]:
    return tuple(float(int(hex_value[index:index + 2], 16)) for index in (1, 3, 5))


def rgb_to_lab(rgb: tuple[float, float, float]) -> tuple[float, float, float]:
    def pivot(value: float) -> float:
        value /= 255.0
        return ((value + 0.055) / 1.055) ** 2.4 if value > 0.04045 else value / 12.92

    red, green, blue = (pivot(value) for value in rgb)
    x = (red * 0.4124564 + green * 0.3575761 + blue * 0.1804375) / 0.95047
    y = red * 0.2126729 + green * 0.7151522 + blue * 0.072175
    z = (red * 0.0193339 + green * 0.119192 + blue * 0.9503041) / 1.08883

    def convert(value: float) -> float:
        return value ** (1.0 / 3.0) if value > 0.008856 else 7.787 * value + 16.0 / 116.0

    x, y, z = convert(x), convert(y), convert(z)
    return 116.0 * y - 16.0, 500.0 * (x - y), 200.0 * (y - z)


def lab_to_rgb_unclamped(lab: tuple[float, float, float]) -> tuple[float, float, float]:
    lightness, axis_a, axis_b = lab
    fy = (lightness + 16.0) / 116.0
    fx = fy + axis_a / 500.0
    fz = fy - axis_b / 200.0

    def inverse(value: float) -> float:
        cube = value * value * value
        return cube if cube > 0.008856 else (value - 16.0 / 116.0) / 7.787

    x = 0.95047 * inverse(fx)
    y = inverse(fy)
    z = 1.08883 * inverse(fz)
    linear = (
        x * 3.2404542 + y * -1.5371385 + z * -0.4985314,
        x * -0.969266 + y * 1.8760108 + z * 0.041556,
        x * 0.0556434 + y * -0.2040259 + z * 1.0572252,
    )

    def encode(value: float) -> float:
        return 255.0 * (12.92 * value if value <= 0.0031308 else 1.055 * value ** (1.0 / 2.4) - 0.055)

    return tuple(encode(value) for value in linear)


def delta_e00(left: tuple[float, float, float], right: tuple[float, float, float]) -> float:
    light_1, axis_a_1, axis_b_1 = left
    light_2, axis_a_2, axis_b_2 = right
    chroma_1 = math.hypot(axis_a_1, axis_b_1)
    chroma_2 = math.hypot(axis_a_2, axis_b_2)
    chroma_bar = (chroma_1 + chroma_2) / 2.0
    factor_g = 0.5 * (1.0 - math.sqrt(chroma_bar ** 7 / (chroma_bar ** 7 + 25.0 ** 7)))
    adjusted_a_1 = axis_a_1 * (1.0 + factor_g)
    adjusted_a_2 = axis_a_2 * (1.0 + factor_g)
    adjusted_chroma_1 = math.hypot(adjusted_a_1, axis_b_1)
    adjusted_chroma_2 = math.hypot(adjusted_a_2, axis_b_2)

    def hue(axis_a: float, axis_b: float, chroma: float) -> float:
        return 0.0 if chroma == 0 else (math.degrees(math.atan2(axis_b, axis_a)) + 360.0) % 360.0

    hue_1 = hue(adjusted_a_1, axis_b_1, adjusted_chroma_1)
    hue_2 = hue(adjusted_a_2, axis_b_2, adjusted_chroma_2)
    delta_light = light_2 - light_1
    delta_chroma = adjusted_chroma_2 - adjusted_chroma_1
    delta_hue = 0.0
    if adjusted_chroma_1 * adjusted_chroma_2 != 0:
        delta_hue = hue_2 - hue_1
        if delta_hue > 180.0:
            delta_hue -= 360.0
        elif delta_hue < -180.0:
            delta_hue += 360.0
    delta_big_hue = 2.0 * math.sqrt(adjusted_chroma_1 * adjusted_chroma_2) * math.sin(math.radians(delta_hue / 2.0))
    light_bar = (light_1 + light_2) / 2.0
    adjusted_chroma_bar = (adjusted_chroma_1 + adjusted_chroma_2) / 2.0
    hue_bar = hue_1 + hue_2
    if adjusted_chroma_1 * adjusted_chroma_2 != 0:
        if abs(hue_1 - hue_2) > 180.0:
            hue_bar += 360.0 if hue_1 + hue_2 < 360.0 else -360.0
        hue_bar /= 2.0
    factor_t = (
        1.0
        - 0.17 * math.cos(math.radians(hue_bar - 30.0))
        + 0.24 * math.cos(math.radians(2.0 * hue_bar))
        + 0.32 * math.cos(math.radians(3.0 * hue_bar + 6.0))
        - 0.20 * math.cos(math.radians(4.0 * hue_bar - 63.0))
    )
    delta_theta = 30.0 * math.exp(-((hue_bar - 275.0) / 25.0) ** 2)
    rotation_c = 2.0 * math.sqrt(adjusted_chroma_bar ** 7 / (adjusted_chroma_bar ** 7 + 25.0 ** 7))
    scale_light = 1.0 + (0.015 * (light_bar - 50.0) ** 2) / math.sqrt(20.0 + (light_bar - 50.0) ** 2)
    scale_chroma = 1.0 + 0.045 * adjusted_chroma_bar
    scale_hue = 1.0 + 0.015 * adjusted_chroma_bar * factor_t
    rotation_t = -math.sin(math.radians(2.0 * delta_theta)) * rotation_c
    return math.sqrt(
        (delta_light / scale_light) ** 2
        + (delta_chroma / scale_chroma) ** 2
        + (delta_big_hue / scale_hue) ** 2
        + rotation_t * (delta_chroma / scale_chroma) * (delta_big_hue / scale_hue)
    )


def printable_lab(lab: tuple[float, float, float], profile: dict[str, Any]) -> tuple[float, float, float]:
    lightness = max(float(profile["l_star_min"]), min(float(profile["l_star_max"]), lab[0]))
    chroma_scale = 1.0
    for _ in range(int(profile.get("max_iterations", 32))):
        candidate = lightness, lab[1] * chroma_scale, lab[2] * chroma_scale
        rgb = lab_to_rgb_unclamped(candidate)
        if all(0.0 <= channel <= 255.0 for channel in rgb):
            return rgb_to_lab(tuple(float(round(channel)) for channel in rgb))
        chroma_scale *= float(profile.get("chroma_scale_step", 0.9))
    gray = float(round(lightness * 2.55))
    return rgb_to_lab((gray, gray, gray))


def lab_to_hex(lab: tuple[float, float, float]) -> str:
    rgb = lab_to_rgb_unclamped(lab)
    return "#" + "".join(f"{max(0, min(255, round(channel))):02X}" for channel in rgb)


def validate_adaptive_palette(design: dict[str, Any], constants: dict[str, Any]) -> None:
    adaptive = constants.get("adaptive_palette", {})
    profile_id = str(design.get("gamut_profile_id") or adaptive.get("gamut_profile_id") or "")
    profile = constants.get("gamut_profiles", {}).get(profile_id)
    if not profile:
        raise ValueError(f"adaptive gamut_profile_id is not configured: {profile_id}")
    tolerance = float(profile.get("validation_delta_e00_tolerance", 0.5))
    min_separation = float(adaptive.get("min_delta_e00", 8.0))
    labs: list[tuple[float, float, float]] = []
    for index, color in enumerate(design["palette"]):
        lab = rgb_to_lab(hex_to_rgb(color["hex"]))
        clamped = printable_lab(lab, profile)
        if delta_e00(lab, clamped) > tolerance:
            raise ValueError(f"adaptive palette[{index}] {color['hex']} is outside gamut profile {profile_id}")
        labs.append(lab)
    for left in range(len(labs)):
        for right in range(left + 1, len(labs)):
            distance = delta_e00(labs[left], labs[right])
            if distance < min_separation - 1e-9:
                raise ValueError(
                    f"adaptive palette colors {left} and {right} have deltaE00 {distance:.3f}; minimum is {min_separation:.3f}"
                )
    design["gamut_profile_id"] = profile_id


def scan_for_forbidden_payload(value: Any, path: str = "design") -> None:
    if isinstance(value, str):
        if value.lower().startswith("data:"):
            raise ValueError(f"{path} contains data URL")
        if COMMERCE_RE.search(value):
            raise ValueError(f"{path} contains commerce/order wording")
    elif isinstance(value, list):
        for index, item in enumerate(value):
            scan_for_forbidden_payload(item, f"{path}[{index}]")
    elif isinstance(value, dict):
        for key, item in value.items():
            if COMMERCE_RE.search(key):
                raise ValueError(f"{path}.{key} is a commerce/order field")
            scan_for_forbidden_payload(item, f"{path}.{key}")


def normalize_legacy_design(design: dict[str, Any]) -> dict[str, Any]:
    out = dict(design)
    for legacy, canonical in (
        ("sizeIn", "size_in"),
        ("projectId", "project_id"),
        ("cellMap", "cell_map"),
        ("blackBase", "black_base"),
    ):
        if legacy in out and canonical not in out:
            out[canonical] = out.pop(legacy)
    return out


def load_design(path: str | Path) -> dict[str, Any]:
    return normalize_legacy_design(load_json(path))


def design_schema_version(design: dict[str, Any]) -> float:
    version = design.get("schema_version")
    if version not in (1.1, 1.2):
        raise ValueError("schema_version must be 1.1 or 1.2")
    return float(version)


def design_finished_size_in(design: dict[str, Any], constants: dict[str, Any]) -> float:
    if design.get("schema_version") == 1.2:
        return float(design["finished_size_in"])
    return int(design["grid"]) * float(constants["board_pitch_in"])


def validate_design(design: dict[str, Any], constants: dict[str, Any]) -> list[str]:
    warnings: list[str] = []
    scan_for_forbidden_payload(design)
    if not isinstance(design.get("project_id"), str) or len(design["project_id"]) < 8:
        raise ValueError("project_id must be an internal storage string")
    proof_ref = design.get("proof_ref")
    if proof_ref is not None and not re.match(r"^MP-[A-Z0-9]{4,8}$", str(proof_ref)):
        raise ValueError("proof_ref must match MP-XXXX")
    grid = design.get("grid")
    if grid not in SUPPORTED_GRIDS:
        raise ValueError("grid must be 24, 32, 48, or 64")
    schema_version = design_schema_version(design)
    profile_id = design.get("sheet_profile") or constants.get("default_profile")
    if profile_id not in constants.get("sheet_profiles", {}):
        raise ValueError(f"sheet_profile not found in constants: {profile_id}")
    profile = constants["sheet_profiles"][profile_id]
    if schema_version == 1.1:
        if design.get("size_in") != grid // 2:
            raise ValueError("v1.1 size_in must equal grid / 2")
    else:
        cell_size = design.get("cell_size_in")
        finished_size = design.get("finished_size_in")
        if isinstance(cell_size, bool) or not isinstance(cell_size, (int, float)) or cell_size <= 0:
            raise ValueError("v1.2 cell_size_in must be a positive number")
        if isinstance(finished_size, bool) or not isinstance(finished_size, (int, float)) or finished_size <= 0:
            raise ValueError("v1.2 finished_size_in must be a positive number")
        die_w = profile_die_w(profile)
        die_h = profile_die_h(profile)
        if not math.isclose(float(cell_size), die_w, abs_tol=1e-9) or not math.isclose(float(cell_size), die_h, abs_tol=1e-9):
            raise ValueError(
                f"v1.2 cell_size_in {float(cell_size):.4f} must match sheet profile {profile_id} die {die_w:.4f} x {die_h:.4f}"
            )
        expected_finished = grid * float(constants["board_pitch_in"])
        if abs(float(finished_size) - expected_finished) > 0.05 + 1e-9:
            raise ValueError(
                f"v1.2 finished_size_in {float(finished_size):.4f} must equal grid x board_pitch_in ({expected_finished:.4f}) within 0.05in"
            )
    if profile.get("verified") is False:
        warnings.append(f"{profile_id} is not production verified: {profile.get('verification_status', 'unverified')}")
    palette = normalize_palette(design.get("palette") or [])
    if not palette:
        raise ValueError("palette must not be empty")
    design["palette"] = palette
    design["palette_mode"] = palette_mode_for(design)
    if design["palette_mode"] == "adaptive":
        validate_adaptive_palette(design, constants)
    cell_map = design.get("cell_map")
    if not isinstance(cell_map, list) or len(cell_map) != grid * grid:
        raise ValueError("cell_map length must equal grid * grid")
    for index, value in enumerate(cell_map):
        if not isinstance(value, int) or value < 0 or value >= len(palette):
            raise ValueError(f"cell_map[{index}] is outside palette range")
    if design.get("black_base"):
        excluded = constants["black_base"]["excluded_color_id"]
        if not any(color["id"] == excluded for color in palette):
            raise ValueError("black_base requires excluded_color_id in palette")
    design["sheet_profile"] = profile_id
    design.setdefault("proof_ref", proof_ref_for(design))
    return warnings


def palette_drift_warnings(design: dict[str, Any], constants: dict[str, Any]) -> list[str]:
    warnings: list[str] = []
    if palette_mode_for(design) == "adaptive":
        return warnings
    palette_id = design.get("palette_id")
    if not palette_id:
        return ["palette_id missing; embedded palette could not be checked against production constants"]
    constants_palette = constants.get("palettes", {}).get(str(palette_id))
    if not constants_palette:
        return [f"palette_id {palette_id} is not defined in production constants"]

    constants_by_id = {str(color.get("id")): str(color.get("hex", "")).lower() for color in constants_palette}
    design_by_id = {str(color["id"]): str(color["hex"]).lower() for color in design["palette"]}
    for color_id, hex_value in design_by_id.items():
        if re.match(r"^color_[0-9]{2}$", color_id):
            warnings.append(f"design palette uses generated id {color_id} while palette_id={palette_id}")
        if color_id not in constants_by_id:
            warnings.append(f"design palette color {color_id} missing from constants palette {palette_id}")
        elif constants_by_id[color_id] != hex_value:
            warnings.append(f"palette drift for {color_id}: design {hex_value} != constants {constants_by_id[color_id]}")
    for color_id in constants_by_id:
        if color_id not in design_by_id:
            warnings.append(f"constants palette color {color_id} not present in design palette {palette_id}")
    return warnings


def proof_ref_for(design: dict[str, Any]) -> str:
    proof_ref = design.get("proof_ref")
    if isinstance(proof_ref, str) and re.match(r"^MP-[A-Z0-9]{4,8}$", proof_ref):
        return proof_ref
    token = re.sub(r"[^A-Z0-9]", "", str(design.get("project_id", "PREVIEW")).upper())[:6]
    return f"MP-{(token or 'PREVIEW')[:6]}"


def page_size_for(profile: dict[str, Any]) -> tuple[float, float]:
    if profile.get("page") != "letter":
        return float(profile["page_w_in"]) * IN, float(profile["page_h_in"]) * IN
    return letter


def profile_pitch_x(profile: dict[str, Any]) -> float:
    return float(profile["pitch_x_in"] if "pitch_x_in" in profile else profile["pitch_in"])


def profile_pitch_y(profile: dict[str, Any]) -> float:
    return float(profile["pitch_y_in"] if "pitch_y_in" in profile else profile["pitch_in"])


def profile_die_w(profile: dict[str, Any]) -> float:
    return float(profile["die_w_in"] if "die_w_in" in profile else profile["die_in"])


def profile_die_h(profile: dict[str, Any]) -> float:
    return float(profile["die_h_in"] if "die_h_in" in profile else profile["die_in"])


def calibration_y_in(profile: dict[str, Any]) -> float:
    return SL680_CALIBRATION_Y_IN if profile.get("profile_id") == "sl680_0375" else CALIBRATION_Y_IN


def die_origin(index: int, profile: dict[str, Any], page_h: float) -> tuple[float, float]:
    row, col = divmod(index, int(profile["cols"]))
    x = float(profile["margin_left_in"]) * IN + col * profile_pitch_x(profile) * IN
    y_top = page_h - float(profile["margin_top_in"]) * IN - row * profile_pitch_y(profile) * IN
    return x, y_top


def die_grid_bbox(profile: dict[str, Any], page_h: float) -> dict[str, float]:
    x_left = float(profile["margin_left_in"]) * IN
    x_right = x_left + (int(profile["cols"]) - 1) * profile_pitch_x(profile) * IN + profile_die_w(profile) * IN
    y_top = page_h - float(profile["margin_top_in"]) * IN
    y_bot = y_top - (int(profile["rows"]) - 1) * profile_pitch_y(profile) * IN - profile_die_h(profile) * IN
    return {"x_left": x_left, "x_right": x_right, "y_top": y_top, "y_bot": y_bot}


def bleed_value(constants: dict[str, Any], override: float | None = None) -> float:
    return float(override if override is not None else constants["print"]["bleed_in"])


def compute_sections(grid: int, constants: dict[str, Any]) -> tuple[int, list[tuple[int, int, int, int]]]:
    candidates = constants.get("sections", {}).get("candidate_sizes", [16, 12, 8, 6])
    section_size = next((size for size in candidates if grid % int(size) == 0), grid)
    per_row = grid // int(section_size)
    sections = []
    for section_index in range(per_row * per_row):
        sr, sc = divmod(section_index, per_row)
        sections.append((sr * section_size, sc * section_size, int(section_size), int(section_size)))
    return int(section_size), sections


def compute_black_base_exclusion(design: dict[str, Any], constants: dict[str, Any]) -> int | None:
    if not design.get("black_base"):
        return None
    excluded_id = constants["black_base"]["excluded_color_id"]
    for index, color in enumerate(design["palette"]):
        if color["id"] == excluded_id:
            return index
    raise ValueError("black_base requested but excluded color not found")


def build_sequence(design: dict[str, Any], constants: dict[str, Any], base_index: int | None) -> tuple[list[tuple[int, int, int]], list[tuple[int, int]], int]:
    grid = int(design["grid"])
    cell_map = design["cell_map"]
    section_size, sections = compute_sections(grid, constants)
    sequence: list[tuple[int, int, int]] = []
    section_ranges: list[tuple[int, int]] = []
    for sr, sc, sh, sw in sections:
        start = len(sequence)
        for row in range(sr, sr + sh):
            for col in range(sc, sc + sw):
                color_index = int(cell_map[row * grid + col])
                if color_index != base_index:
                    sequence.append((row, col, color_index))
        section_ranges.append((start, len(sequence)))
    return sequence, section_ranges, section_size


def compute_spares(counts: Counter[int], constants: dict[str, Any]) -> list[tuple[int, int, int]]:
    rate = float(constants.get("spares", {}).get("rate", 0.05))
    spares: list[tuple[int, int, int]] = []
    for color_index, count in sorted(counts.items(), key=lambda item: (-item[1], item[0])):
        spares.extend([(-1, -1, color_index)] * math.ceil(count * rate))
    return spares


def normalize_fulfillment_mode(mode: str | None) -> str:
    key = (mode or "printed_mixed").strip().lower().replace("-", "_")
    if key not in FULFILLMENT_ALIASES:
        raise ValueError(f"unsupported fulfillment mode: {mode}")
    return FULFILLMENT_ALIASES[key]


def validate_palette_fulfillment(design: dict[str, Any], mode: str) -> None:
    if palette_mode_for(design) == "adaptive" and mode == "stock_color_sheets":
        raise ValueError("stock_color_sheets does not support adaptive palettes; use printed_mixed_sheets")


def compute_sheet_plan(design: dict[str, Any], constants: dict[str, Any]) -> dict[str, Any]:
    base_index = compute_black_base_exclusion(design, constants)
    sequence, section_ranges, section_size = build_sequence(design, constants, base_index)
    placed_counts = Counter(color_index for _, _, color_index in sequence)
    spares = compute_spares(placed_counts, constants)
    profile = constants["sheet_profiles"][design["sheet_profile"]]
    per_sheet = int(profile["stickers_per_sheet"])
    sheet_count = math.ceil((len(sequence) + len(spares)) / per_sheet)
    plan = {
        "base_index": base_index,
        "sequence": sequence,
        "section_ranges": section_ranges,
        "section_size": section_size,
        "spares": spares,
        "items": sequence + spares,
        "placed_counts": placed_counts,
        "total_placed": len(sequence),
        "total_spares": len(spares),
        "printed_mixed_sheets": sheet_count,
        "stickers_per_sheet": per_sheet,
        "total_stickers": len(sequence) + len(spares),
    }
    return plan


def column_label(index: int) -> str:
    label = ""
    value = index + 1
    while value:
        value, remainder = divmod(value - 1, 26)
        label = chr(65 + remainder) + label
    return label


def ghost_hex(hex_value: str, fraction: float) -> str:
    channels = hex_to_rgb(hex_value)
    mixed = [round(255.0 - (255.0 - channel) * fraction) for channel in channels]
    return "#" + "".join(f"{max(0, min(255, value)):02X}" for value in mixed)


def customer_board_cell_style(hex_value: str, constants: dict[str, Any]) -> dict[str, Any]:
    tint = float(constants.get("customer_pack", {}).get("ghost_tint_fraction", 0.22))
    return {
        "fill_hex": ghost_hex(hex_value, tint),
        "outline_hex": "#C8CDD0",
        "number_hex": "#73777B",
        "grout_hex": "#E7EAEC",
    }


def customer_board_cell_geometry(pitch: float, constants: dict[str, Any]) -> dict[str, float]:
    grout_fraction = float(constants["grout_in"]) / float(constants["board_pitch_in"])
    grout = pitch * grout_fraction
    return {"grout": grout, "inset": grout / 2.0, "face": pitch - grout}


def readable_text_color(hex_value: str) -> HexColor:
    red, green, blue = hex_to_rgb(hex_value)
    luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
    return INK if luminance >= 145 else HexColor("#FFFFFF")


def customer_board_regions(grid: int, constants: dict[str, Any]) -> list[dict[str, int]]:
    if grid <= 24:
        return [{"panel": 1, "panel_count": 1, "row": 0, "col": 0, "height": grid, "width": grid}]
    candidates = constants.get("sections", {}).get("candidate_sizes", [16, 12, 8, 6])
    panel_size = next((int(size) for size in candidates if grid % int(size) == 0), grid)
    panels_per_row = grid // panel_size
    return [
        {
            "panel": panel_row * panels_per_row + panel_col + 1,
            "panel_count": panels_per_row * panels_per_row,
            "row": panel_row * panel_size,
            "col": panel_col * panel_size,
            "height": panel_size,
            "width": panel_size,
        }
        for panel_row in range(panels_per_row)
        for panel_col in range(panels_per_row)
    ]


def customer_sheet_groups(sheets: list[dict[str, Any]]) -> list[list[dict[str, int]]]:
    grouped_sheets: list[list[dict[str, int]]] = []
    for sheet in sheets:
        order: list[int] = []
        counts: dict[int, dict[str, int]] = {}
        for slot in sheet["slots"]:
            if not slot:
                continue
            palette_index = int(slot["palette_index"])
            if palette_index not in counts:
                order.append(palette_index)
                counts[palette_index] = {"palette_index": palette_index, "placed": 0, "spares": 0}
            key = "spares" if slot["is_spare"] else "placed"
            counts[palette_index][key] += 1
        grouped_sheets.append([counts[palette_index] for palette_index in order])
    return grouped_sheets


def customer_group_footprint(group: dict[str, int], cols: int) -> int:
    return sum(math.ceil(int(group[key]) / cols) * cols for key in ("placed", "spares") if group[key] > 0)


def optimize_customer_sheet_groups(
    grouped_sheets: list[list[dict[str, int]]],
    labs: dict[int, tuple[float, float, float]],
    lookalike_threshold: float,
    cols: int,
    per_sheet: int,
) -> list[list[dict[str, int]]]:
    appearances = Counter(group["palette_index"] for groups in grouped_sheets for group in groups)
    for source_index in range(len(grouped_sheets) - 1, 0, -1):
        source = grouped_sheets[source_index]
        for group in list(reversed(source)):
            palette_index = group["palette_index"]
            if appearances[palette_index] != 1:
                continue
            footprint = customer_group_footprint(group, cols)
            candidates: list[tuple[int, int]] = []
            for target_index in range(source_index):
                target = grouped_sheets[target_index]
                if any(
                    delta_e00(labs[palette_index], labs[existing["palette_index"]]) < lookalike_threshold
                    for existing in target
                    if existing["palette_index"] != palette_index
                ):
                    continue
                used = sum(customer_group_footprint(existing, cols) for existing in target)
                if used + footprint <= per_sheet:
                    candidates.append((per_sheet - used - footprint, target_index))
            if not candidates:
                continue
            _, target_index = min(candidates)
            source.remove(group)
            grouped_sheets[target_index].append(group)
    return [groups for groups in grouped_sheets if groups]


def rebuild_customer_sheets(
    grouped_sheets: list[list[dict[str, int]]],
    colors: list[dict[str, Any]],
    rows: int,
    cols: int,
) -> list[dict[str, Any]]:
    per_sheet = rows * cols
    colors_by_index = {color["palette_index"]: color for color in colors}
    remaining = {color["palette_index"]: color["total"] for color in colors}
    seen: set[int] = set()
    sheets: list[dict[str, Any]] = []
    for groups in grouped_sheets:
        sheet = {"slots": [None] * per_sheet, "colors": [], "row_labels": {}, "segments": []}
        cursor = 0
        for group in groups:
            palette_index = group["palette_index"]
            color = colors_by_index[palette_index]
            sheet["colors"].append(palette_index)
            continued = palette_index in seen
            sheet["segments"].append(
                {
                    "slot": cursor,
                    "color_number": color["number"],
                    "palette_index": palette_index,
                    "is_spare": group["placed"] == 0,
                    "continued": continued,
                    "remaining_count": remaining[palette_index],
                }
            )
            seen.add(palette_index)
            for is_spare, key in ((False, "placed"), (True, "spares")):
                quantity = int(group[key])
                if quantity <= 0:
                    continue
                if cursor % cols:
                    cursor += cols - cursor % cols
                while quantity:
                    if cursor >= per_sheet:
                        raise ValueError("customer sheet optimization overflowed the die grid")
                    row = cursor // cols
                    take = min(quantity, cols - cursor % cols)
                    sheet["row_labels"][row] = {
                        "color_number": color["number"],
                        "is_spare": is_spare,
                    }
                    for offset in range(take):
                        sheet["slots"][cursor + offset] = {
                            "palette_index": palette_index,
                            "color_number": color["number"],
                            "is_spare": is_spare,
                        }
                    cursor += take
                    quantity -= take
                if cursor % cols:
                    cursor += cols - cursor % cols
            remaining[palette_index] -= int(group["placed"]) + int(group["spares"])
        sheets.append(sheet)
    return sheets


def compute_customer_plan(design: dict[str, Any], constants: dict[str, Any]) -> dict[str, Any]:
    counts = Counter(int(value) for value in design["cell_map"])
    spare_rate = float(constants.get("spares", {}).get("rate", 0.05))
    ranked = sorted(
        (color for color in design["palette"] if counts.get(color["index"], 0) > 0),
        key=lambda color: (-counts[color["index"]], color["index"]),
    )
    total_placed = sum(counts[color["index"]] for color in ranked)
    colors = []
    number_by_index: dict[int, int] = {}
    for number, color in enumerate(ranked, start=1):
        placed = int(counts.get(color["index"], 0))
        spares = math.ceil(placed * spare_rate) if placed else 0
        number_by_index[color["index"]] = number
        colors.append(
            {
                "number": number,
                "palette_index": color["index"],
                "id": color["id"],
                "name": color["name"],
                "hex": color["hex"],
                "placed": placed,
                "spares": spares,
                "total": placed + spares,
                "progress_percent": round(placed * 100.0 / total_placed) if total_placed else 0,
            }
        )

    profile = constants["sheet_profiles"][design["sheet_profile"]]
    rows = int(profile["rows"])
    cols = int(profile["cols"])
    per_sheet = int(profile["stickers_per_sheet"])
    lookalike_threshold = float(constants.get("customer_pack", {}).get("lookalike_delta_e00", 14.0))
    labs = {color["palette_index"]: rgb_to_lab(hex_to_rgb(color["hex"])) for color in colors}
    sheets: list[dict[str, Any]] = []

    def new_sheet() -> dict[str, Any]:
        sheet = {"slots": [None] * per_sheet, "colors": [], "row_labels": {}, "segments": []}
        sheets.append(sheet)
        return sheet

    sheet = new_sheet()
    cursor = 0
    for color in colors:
        if color["total"] <= 0:
            continue
        palette_index = color["palette_index"]
        if sheet["colors"] and any(
            delta_e00(labs[palette_index], labs[existing]) < lookalike_threshold
            for existing in sheet["colors"]
            if existing != palette_index
        ):
            sheet = new_sheet()
            cursor = 0
        if cursor % cols:
            cursor += cols - cursor % cols
        for is_spare, quantity in ((False, color["placed"]), (True, color["spares"])):
            if quantity <= 0:
                continue
            if cursor % cols:
                cursor += cols - cursor % cols
            remaining = quantity
            while remaining:
                if cursor >= per_sheet:
                    sheet = new_sheet()
                    cursor = 0
                if palette_index not in sheet["colors"]:
                    sheet["colors"].append(palette_index)
                if not any(segment["palette_index"] == palette_index for segment in sheet["segments"]):
                    continued = any(
                        palette_index in prior_sheet["colors"]
                        for prior_sheet in sheets[:-1]
                    )
                    sheet["segments"].append(
                        {
                            "slot": cursor,
                            "color_number": color["number"],
                            "palette_index": palette_index,
                            "is_spare": is_spare,
                            "continued": continued,
                            "remaining_count": remaining,
                        }
                    )
                row = cursor // cols
                available = cols - cursor % cols
                take = min(remaining, available)
                sheet["row_labels"][row] = {
                    "color_number": color["number"],
                    "is_spare": is_spare,
                }
                for offset in range(take):
                    sheet["slots"][cursor + offset] = {
                        "palette_index": palette_index,
                        "color_number": color["number"],
                        "is_spare": is_spare,
                    }
                cursor += take
                remaining -= take
        if cursor % cols:
            cursor += cols - cursor % cols

    if sheets and not any(slot for slot in sheets[-1]["slots"]):
        sheets.pop()
    grouped_sheets = customer_sheet_groups(sheets)
    grouped_sheets = optimize_customer_sheet_groups(
        grouped_sheets,
        labs,
        lookalike_threshold,
        cols,
        per_sheet,
    )
    sheets = rebuild_customer_sheets(grouped_sheets, colors, rows, cols)
    seconds_per_sticker = int(constants.get("customer_pack", {}).get("seconds_per_sticker", 6))
    raw_minutes = sum(color["placed"] for color in colors) * seconds_per_sticker / 60.0
    estimated_minutes = max(5, int(math.ceil(raw_minutes / 5.0) * 5))
    return {
        "colors": colors,
        "number_by_index": number_by_index,
        "sheets": sheets,
        "board_regions": customer_board_regions(int(design["grid"]), constants),
        "total_placed": sum(color["placed"] for color in colors),
        "total_spares": sum(color["spares"] for color in colors),
        "total_stickers": sum(color["total"] for color in colors),
        "estimated_minutes": estimated_minutes,
        "board_pitch_in": float(constants["board_pitch_in"]),
        "grout_in": float(constants["grout_in"]),
        "finished_size_in": design_finished_size_in(design, constants),
        "rows_per_sheet": rows,
        "cols_per_sheet": cols,
    }


def fulfillment_mode_constants(constants: dict[str, Any], mode: str) -> dict[str, Any]:
    return constants.get("fulfillment_modes", {}).get(mode, {})


def stock_sheet_row(color: dict[str, Any], placed: int, spare_rate: float, per_sheet: int) -> dict[str, Any]:
    spares = math.ceil(placed * spare_rate)
    needed = placed + spares
    sheets = math.ceil(needed / per_sheet) if needed > 0 else 0
    included = sheets * per_sheet
    extras = included - needed
    return {
        "color_id": color["id"],
        "color_name": color["name"],
        "placed": placed,
        "spares": spares,
        "needed": needed,
        "sheets": sheets,
        "included": included,
        "extras": extras,
        "supplier_sku": None,
        "pick_pack_label": f"{color['id']} - {color['name']}",
    }


def compute_fulfillment_plan(design: dict[str, Any], constants: dict[str, Any], plan: dict[str, Any], mode: str) -> dict[str, Any]:
    canonical_mode = normalize_fulfillment_mode(mode)
    per_sheet = int(plan["stickers_per_sheet"])
    spare_rate = float(constants.get("spares", {}).get("rate", 0.05))
    active_colors = [
        color for color in design["palette"]
        if int(plan["placed_counts"].get(color["index"], 0)) > 0
    ]
    stock_config = fulfillment_mode_constants(constants, "stock_color_sheets")
    hybrid_config = fulfillment_mode_constants(constants, "hybrid_stock_plus_topoff")
    stock_min = int(hybrid_config.get("stock_min_per_color_default", 150))
    launch_cap = int(stock_config.get("max_palette_colors_launch_hint", 4))
    customer_note = str(stock_config.get(
        "customer_extra_note",
        "Includes spare stickers in every color for mistakes, repairs, and finishing touches.",
    ))
    hybrid_customer_note = str(hybrid_config.get(
        "customer_extra_note",
        "Includes spare stickers for repairs, swaps, and finishing touches where applicable. Hybrid fulfillment may combine stock sheets with a mixed top-off sheet.",
    ))
    stock_plan = [
        stock_sheet_row(color, int(plan["placed_counts"].get(color["index"], 0)), spare_rate, per_sheet)
        for color in active_colors
    ]
    stock_total_sheets = sum(row["sheets"] for row in stock_plan)
    stock_included = stock_total_sheets * per_sheet
    needed_total = sum(row["needed"] for row in stock_plan)
    stock_extras = stock_included - needed_total
    warnings: list[str] = []
    palette_color_count = len(active_colors)
    if palette_color_count > launch_cap:
        warnings.append(f"stock_color_sheets launch hint is {launch_cap} colors; active design uses {palette_color_count}")
    average_placed = (plan["total_placed"] / palette_color_count) if palette_color_count else 0
    if palette_color_count and average_placed < stock_min:
        warnings.append(f"average placed per color is {average_placed:.1f}, below stock efficiency threshold {stock_min}")

    hybrid_stock_plan = [row for row in stock_plan if row["needed"] >= stock_min]
    hybrid_topoff_needed = sum(row["needed"] for row in stock_plan if row["needed"] < stock_min)
    hybrid_topoff_sheets = math.ceil(hybrid_topoff_needed / per_sheet) if hybrid_topoff_needed > 0 else 0
    hybrid_stock_sheets = sum(row["sheets"] for row in hybrid_stock_plan)
    hybrid_total_sheets = hybrid_stock_sheets + hybrid_topoff_sheets
    hybrid_stock_included = sum(row["included"] for row in hybrid_stock_plan)
    hybrid_included = hybrid_stock_included + hybrid_topoff_sheets * per_sheet
    hybrid_needed = sum(row["needed"] for row in hybrid_stock_plan) + hybrid_topoff_needed
    hybrid_extras = hybrid_included - hybrid_needed

    return {
        "mode": canonical_mode,
        "stickers_per_sheet": per_sheet,
        "spare_rate": spare_rate,
        "stock_min_per_color": stock_min,
        "palette_color_count": palette_color_count,
        "placed_total": plan["total_placed"],
        "spares_total": plan["total_spares"],
        "needed_total": plan["total_stickers"],
        "printed_mixed_sheets": plan["printed_mixed_sheets"],
        "stock_sheet_plan": stock_plan if canonical_mode == "stock_color_sheets" else [],
        "stock_total_sheets": stock_total_sheets if canonical_mode == "stock_color_sheets" else 0,
        "stock_included_stickers": stock_included if canonical_mode == "stock_color_sheets" else 0,
        "stock_extras": stock_extras if canonical_mode == "stock_color_sheets" else 0,
        "hybrid_stock_sheet_plan": hybrid_stock_plan if canonical_mode == "hybrid_stock_plus_topoff" else [],
        "hybrid_topoff_needed": hybrid_topoff_needed if canonical_mode == "hybrid_stock_plus_topoff" else 0,
        "hybrid_topoff_sheets": hybrid_topoff_sheets if canonical_mode == "hybrid_stock_plus_topoff" else 0,
        "hybrid_total_sheets": hybrid_total_sheets if canonical_mode == "hybrid_stock_plus_topoff" else 0,
        "hybrid_included_stickers": hybrid_included if canonical_mode == "hybrid_stock_plus_topoff" else 0,
        "hybrid_extras": hybrid_extras if canonical_mode == "hybrid_stock_plus_topoff" else 0,
        "customer_extra_note": customer_note if canonical_mode == "stock_color_sheets" else hybrid_customer_note if canonical_mode == "hybrid_stock_plus_topoff" else "",
        "warnings": warnings if canonical_mode in ("stock_color_sheets", "hybrid_stock_plus_topoff") else [],
    }


def active_fulfillment_summary(plan: dict[str, Any], fulfillment: dict[str, Any]) -> dict[str, Any]:
    mode = fulfillment["mode"]
    if mode == "stock_color_sheets":
        sheet_count = int(fulfillment.get("stock_total_sheets", 0))
        included = int(fulfillment.get("stock_included_stickers", 0))
        extras = int(fulfillment.get("stock_extras", 0))
    elif mode == "hybrid_stock_plus_topoff":
        sheet_count = int(fulfillment.get("hybrid_total_sheets", 0))
        included = int(fulfillment.get("hybrid_included_stickers", 0))
        extras = int(fulfillment.get("hybrid_extras", 0))
    else:
        sheet_count = int(plan["printed_mixed_sheets"])
        included = int(plan["total_stickers"])
        extras = 0
    return {
        "active_fulfillment_mode": mode,
        "active_fulfillment_sheet_count": sheet_count,
        "active_fulfillment_total_included_stickers": included,
        "active_fulfillment_total_extras": extras,
    }


def warn_on_production_mismatch(design: dict[str, Any], plan: dict[str, Any]) -> list[str]:
    warnings: list[str] = []
    stored = design.get("production") or {}
    for key in ("total_stickers", "stickers_per_sheet", "printed_mixed_sheets"):
        if key in stored and stored[key] != plan[key]:
            warnings.append(f"stored production.{key}={stored[key]} != recomputed {plan[key]}")
    return warnings


def manifest_path_for(output_path: str | Path) -> Path:
    out = Path(output_path)
    return out.with_suffix(".manifest.json")


def build_manifest(
    design: dict[str, Any],
    constants: dict[str, Any],
    plan: dict[str, Any],
    output_path: str | Path,
    source_design_path: str | Path,
    constants_path: str | Path,
    page_w: float,
    page_h: float,
    gate_a: bool,
    color_target_strip: bool,
    bleed_values_used: list[float],
    fulfillment: dict[str, Any],
    warnings: list[str],
    palette_warnings: list[str],
    mismatch_warnings: list[str],
) -> dict[str, Any]:
    base_index = plan["base_index"]
    total_base_cells = sum(1 for value in design["cell_map"] if value == base_index) if base_index is not None else 0
    per_color_counts = {}
    spares_per_color = Counter(color_index for _, _, color_index in plan["spares"])
    spares_counts = {}
    for color in design["palette"]:
        index = color["index"]
        key = color["id"]
        per_color_counts[key] = int(plan["placed_counts"].get(index, 0))
        spares_counts[key] = int(spares_per_color.get(index, 0))
    section_size = int(plan["section_size"])
    sections = []
    for index, (start, end) in enumerate(plan["section_ranges"], start=1):
        sections.append({"section": index, "start_sequence_index": start, "end_sequence_index": end, "placed_count": end - start})
    active_summary = active_fulfillment_summary(plan, fulfillment)
    size_fields = (
        {"size_in": design["size_in"]}
        if design["schema_version"] == 1.1
        else {
            "schema_version": 1.2,
            "cell_size_in": float(design["cell_size_in"]),
            "finished_size_in": float(design["finished_size_in"]),
        }
    )
    return {
        "manifest_version": "gate-a-pdf-mode-v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "proof_ref": proof_ref_for(design),
        "project_id": design["project_id"],
        "source_design_path": str(Path(source_design_path)),
        "output_pdf_path": str(Path(output_path)),
        "constants_path": str(Path(constants_path)),
        "sheet_profile": design["sheet_profile"],
        "page_size": {"width_in": round(page_w / IN, 4), "height_in": round(page_h / IN, 4)},
        "grid": design["grid"],
        **size_fields,
        "palette_id": design.get("palette_id"),
        "palette_mode": design["palette_mode"],
        "gamut_profile_id": design.get("gamut_profile_id"),
        **({"adaptive_palette": design["palette"]} if design["palette_mode"] == "adaptive" else {}),
        "black_base": bool(design.get("black_base")),
        "base_index": base_index,
        "total_base_cells": total_base_cells,
        "per_color_placed_counts": per_color_counts,
        "spares_per_color": spares_counts,
        "total_placed_stickers": plan["total_placed"],
        "total_spares": plan["total_spares"],
        "total_stickers": plan["total_stickers"],
        "sheet_count": plan["printed_mixed_sheets"],
        "printed_mixed_baseline": {
            "sheet_count": plan["printed_mixed_sheets"],
            "total_stickers": plan["total_stickers"],
            "placed": plan["total_placed"],
            "spares": plan["total_spares"],
        },
        "active_fulfillment_mode": active_summary["active_fulfillment_mode"],
        "active_fulfillment_sheet_count": active_summary["active_fulfillment_sheet_count"],
        "active_fulfillment_total_included_stickers": active_summary["active_fulfillment_total_included_stickers"],
        "active_fulfillment_total_extras": active_summary["active_fulfillment_total_extras"],
        "pdf_layout_mode": "printed_mixed_sheets",
        "pdf_layout_note": "PDF layout remains printed_mixed_sheets unless a future stock/hybrid print mode is implemented.",
        "gate_a_mode": gate_a,
        "color_target_strip": color_target_strip,
        "color_target_patch_count": len(color_target_patches(constants)) if color_target_strip else 0,
        "bleed_values_used": bleed_values_used,
        "fulfillment": fulfillment,
        "calibration": {
            "horizontal_bar": True,
            "horizontal_bar_length_in": 1.0,
            "horizontal_bar_y_in": calibration_y_in(constants["sheet_profiles"][design["sheet_profile"]]),
            "vertical_bar": True,
            "vertical_bar_length_in": 1.0,
            "instruction": "Print at 100% / Actual Size. Do not use Fit to Page.",
        },
        "feed_fiducials": {
            "edge": "top",
            "y_from_top_in": FEED_FIDUCIAL_TOP_OFFSET_IN,
            "note": "top-edge feed/skew fiducials; die-grid crosshair spans remain the primary registration measurement",
        },
        "sections": sections,
        "section_rule_used": f"{section_size}x{section_size} section-major, row-major within section",
        "warnings": warnings,
        "palette_drift_warnings": palette_warnings,
        "mismatch_warnings": mismatch_warnings,
    }


def write_manifest(manifest: dict[str, Any], output_path: str | Path) -> Path:
    path = manifest_path_for(output_path)
    path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return path


def footer(cv: canvas.Canvas, page_w: float, text: str) -> None:
    cv.setFillColor(GRAY)
    cv.setFont("Helvetica", 6.5)
    cv.drawCentredString(page_w / 2, 0.12 * IN, text)


def header(cv: canvas.Canvas, page_w: float, page_h: float, title: str, sub: str, margin: float) -> None:
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 11)
    cv.drawString(margin, page_h - 0.22 * IN, "MosaPack")
    cv.setFillColor(TEAL)
    cv.drawString(margin + 1.12 * IN, page_h - 0.22 * IN, title)
    cv.setFillColor(GRAY)
    cv.setFont("Helvetica", 7)
    cv.drawRightString(page_w - margin, page_h - 0.22 * IN, sub)


def draw_crosshair(cv: canvas.Canvas, x: float, y: float) -> None:
    arm = 0.15 * IN
    gap = 0.04 * IN
    cv.setStrokeColor(BLACK)
    cv.setLineWidth(0.5)
    cv.line(x - arm, y, x - gap, y)
    cv.line(x + gap, y, x + arm, y)
    cv.line(x, y - arm, x, y - gap)
    cv.line(x, y + gap, x, y + arm)


def draw_crosshair_label(cv: canvas.Canvas, x: float, y: float, dx: float, dy: float) -> None:
    cv.setFillColor(BLACK)
    cv.setFont("Helvetica", 5)
    cv.drawString(x + dx, y + dy, f"{x / IN:.2f}, {y / IN:.2f} in")


def draw_calibration_bar(cv: canvas.Canvas, x: float, y: float) -> None:
    cv.setStrokeColor(BLACK)
    cv.setFillColor(BLACK)
    cv.setLineWidth(0.75)
    cv.line(x, y, x + IN, y)
    cv.line(x, y - 0.045 * IN, x, y + 0.045 * IN)
    cv.line(x + IN, y - 0.045 * IN, x + IN, y + 0.045 * IN)
    cv.setFont("Helvetica", 6)
    cv.drawString(x, y + 0.08 * IN, "Measure me: 1.000 in / 25.4 mm")


def draw_vertical_calibration_bar(cv: canvas.Canvas, x: float, y: float) -> None:
    cv.setStrokeColor(BLACK)
    cv.setFillColor(BLACK)
    cv.setLineWidth(0.75)
    cv.line(x, y, x, y + IN)
    cv.line(x - 0.045 * IN, y, x + 0.045 * IN, y)
    cv.line(x - 0.045 * IN, y + IN, x + 0.045 * IN, y + IN)
    cv.setFont("Helvetica", 6)
    cv.drawString(x + 0.08 * IN, y + 0.42 * IN, "Vertical check: 1.000 in / 25.4 mm")


def draw_vertical_calibration_bar_in_margin(cv: canvas.Canvas, x: float, y: float) -> None:
    cv.setStrokeColor(BLACK)
    cv.setFillColor(BLACK)
    cv.setLineWidth(0.75)
    cv.line(x, y, x, y + IN)
    cv.line(x - 0.045 * IN, y, x + 0.045 * IN, y)
    cv.line(x - 0.045 * IN, y + IN, x + 0.045 * IN, y + IN)
    cv.saveState()
    cv.translate(x - 0.07 * IN, y + 0.08 * IN)
    cv.rotate(90)
    cv.setFont("Helvetica", 6)
    cv.drawString(0, 0, "Vertical check: 1.000 in / 25.4 mm")
    cv.restoreState()


def draw_feed_fiducials(cv: canvas.Canvas, page_w: float, page_h: float) -> None:
    y = page_h - FEED_FIDUCIAL_TOP_OFFSET_IN * IN
    cv.setStrokeColor(BLACK)
    cv.setFillColor(BLACK)
    cv.setLineWidth(0.5)
    for x in (0.75 * IN, page_w / 2, page_w - 0.75 * IN):
        cv.line(x, y, x, y - 0.12 * IN)
    cv.setFont("Helvetica", 5)
    cv.drawString(page_w / 2 + 0.04 * IN, y - 0.08 * IN, "feed/skew fiducials")


def color_target_patches(constants: dict[str, Any]) -> list[dict[str, Any]]:
    targets = constants.get("color_targets", {})
    patches = [
        {
            "group": "master_25",
            "name": str(color["name"]),
            "hex": str(color["hex"]).upper(),
        }
        for color in targets.get("master_25", [])
    ]
    sampler = targets.get("full_gamut_sampler", {})
    profile_id = str(constants.get("adaptive_palette", {}).get("gamut_profile_id", ""))
    profile = constants.get("gamut_profiles", {}).get(profile_id)
    if not profile:
        raise ValueError(f"color target gamut profile is not configured: {profile_id}")
    for lightness in sampler.get("l_star_ramp", []):
        lab = printable_lab((float(lightness), 0.0, 0.0), profile)
        patches.append({"group": "l_star_ramp", "name": f"Neutral L* {lightness:g}", "hex": lab_to_hex(lab)})
    hue_steps = int(sampler.get("hue_steps", 0))
    ring_lightness = float(sampler.get("hue_ring_l_star", 55))
    for chroma in sampler.get("chroma_levels", []):
        for step in range(hue_steps):
            radians = math.radians(step * 360.0 / hue_steps)
            lab = printable_lab(
                (ring_lightness, math.cos(radians) * float(chroma), math.sin(radians) * float(chroma)),
                profile,
            )
            patches.append({"group": f"hue_ring_c{chroma}", "hex": lab_to_hex(lab)})
            patches[-1]["name"] = f"Hue {step + 1:02d} C* {float(chroma):g}"
    for index, patch in enumerate(patches, start=1):
        patch["number"] = index
        patch["lab"] = rgb_to_lab(hex_to_rgb(patch["hex"]))
    return patches


def draw_color_target_strip(
    cv: canvas.Canvas,
    constants: dict[str, Any],
    profile: dict[str, Any],
    page_h: float,
) -> None:
    patches = color_target_patches(constants)
    if len(patches) > int(profile["stickers_per_sheet"]):
        raise ValueError("color target patch count exceeds sheet capacity")
    die_w = profile_die_w(profile) * IN
    die_h = profile_die_h(profile) * IN
    for index, patch in enumerate(patches):
        x, y_top = die_origin(index, profile, page_h)
        cv.setFillColor(HexColor(patch["hex"]))
        cv.roundRect(x, y_top - die_h, die_w, die_h, 2.5, stroke=0, fill=1)
        cv.setStrokeColor(BLACK)
        cv.setLineWidth(0.25)
        cv.roundRect(x, y_top - die_h, die_w, die_h, 2.5, stroke=1, fill=0)
        red, green, blue = hex_to_rgb(patch["hex"])
        luminance = 0.299 * red + 0.587 * green + 0.114 * blue
        cv.setFillColor(BLACK if luminance >= 150 else HexColor("#FFFFFF"))
        cv.setFont("Helvetica-Bold", 3.0)
        cv.drawCentredString(x + die_w / 2.0, y_top - die_h / 2.0 - 1.0, patch["hex"])


def measurement_log_path_for(output_path: str | Path) -> Path:
    return Path(output_path).with_suffix(".measurement-log.csv")


def write_measurement_log(constants: dict[str, Any], output_path: str | Path) -> Path:
    path = measurement_log_path_for(output_path)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "patch_number",
                "name",
                "target_hex",
                "target_L",
                "target_a",
                "target_b",
                "measured_L",
                "measured_a",
                "measured_b",
                "delta_E00",
            ]
        )
        for patch in color_target_patches(constants):
            lightness, axis_a, axis_b = patch["lab"]
            writer.writerow(
                [
                    f"{patch['number']:02d}",
                    patch["name"],
                    patch["hex"],
                    f"{lightness:.4f}",
                    f"{axis_a:.4f}",
                    f"{axis_b:.4f}",
                    "",
                    "",
                    "",
                    "",
                ]
            )
    return path


def vendor_color_layout(page_w: float, page_h: float, patch_count: int = 65) -> list[dict[str, tuple[float, float, float, float]]]:
    del page_h
    patch_size = 0.62 * IN
    pitch_x = 0.85 * IN
    pitch_y = 0.87 * IN
    columns = 9
    left = (page_w - ((columns - 1) * pitch_x + patch_size)) / 2.0
    top = 9.92 * IN
    layout = []
    for index in range(patch_count):
        row, col = divmod(index, columns)
        x = left + col * pitch_x
        y = top - row * pitch_y - patch_size
        layout.append(
            {
                "patch": (x, y, patch_size, patch_size),
                "label": (x, y - 0.14 * IN, patch_size, 0.10 * IN),
            }
        )
    return layout


def boxes_overlap(left: tuple[float, float, float, float], right: tuple[float, float, float, float]) -> bool:
    left_x, left_y, left_w, left_h = left
    right_x, right_y, right_w, right_h = right
    return not (
        left_x + left_w <= right_x
        or right_x + right_w <= left_x
        or left_y + left_h <= right_y
        or right_y + right_h <= left_y
    )


def draw_wrapped_text(
    cv: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    max_width: float,
    *,
    font: str = "Helvetica",
    size: float = 9.0,
    leading: float = 12.0,
) -> float:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and cv.stringWidth(candidate, font, size) > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    cv.setFont(font, size)
    for line in lines:
        cv.drawString(x, y, line)
        y -= leading
    return y


def qualification_date_for(design: dict[str, Any]) -> str:
    explicit = design.get("qualification_date") or (design.get("source") or {}).get("qualification_date")
    if explicit:
        return str(explicit)
    return datetime.now(ZoneInfo("America/New_York")).date().isoformat()


def page_vendor_cover(
    cv: canvas.Canvas,
    design: dict[str, Any],
    profile: dict[str, Any],
    warnings: list[str],
    page_w: float,
    page_h: float,
    ship_to: str,
    contact: str,
) -> None:
    proof_ref = proof_ref_for(design)
    margin = 0.62 * IN
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 22)
    cv.drawString(margin, page_h - 0.72 * IN, "MosaPack - Vendor Qualification Test Pack")
    cv.setFillColor(TEAL)
    cv.setFont("Helvetica-Bold", 13)
    cv.drawString(margin, page_h - 1.08 * IN, f"Reference {proof_ref}")
    cv.setFillColor(GRAY)
    cv.setFont("Helvetica", 8.5)
    cv.drawRightString(page_w - margin, page_h - 1.06 * IN, f"Date {qualification_date_for(design)}")

    y = page_h - 1.58 * IN
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 12)
    cv.drawString(margin, y, "Production instructions")
    y -= 0.28 * IN
    instructions = [
        "Print at 100% / Actual Size with no scaling.",
        "Material: removable white MATTE vinyl, or your closest equivalent. Note any substitution on the physical sample.",
        "Use your standard production color management. NO auto-enhance and NO color correction.",
        "Kiss-cut squares at 0.375 in (9.5 mm). Rounded corners are acceptable.",
        "If your die layout differs from ours, print our art at 100% and apply your standard cut. Do NOT rescale the art to fit your die.",
    ]
    for index, instruction in enumerate(instructions, start=1):
        cv.setFillColor(TEAL)
        cv.setFont("Helvetica-Bold", 9)
        cv.drawString(margin, y, f"{index}.")
        cv.setFillColor(INK)
        y = draw_wrapped_text(cv, instruction, margin + 0.25 * IN, y, page_w - 2 * margin - 0.25 * IN, size=9, leading=12)
        y -= 0.10 * IN

    cv.setFillColor(LIGHT)
    cv.roundRect(margin, y - 1.36 * IN, page_w - 2 * margin, 1.22 * IN, 4, stroke=0, fill=1)
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 10)
    cv.drawString(margin + 0.18 * IN, y - 0.30 * IN, "Ship printed sample sheets to")
    cv.setFont("Helvetica", 9)
    draw_wrapped_text(cv, ship_to, margin + 0.18 * IN, y - 0.52 * IN, page_w - 2 * margin - 0.36 * IN, size=9, leading=11)
    cv.setFont("Helvetica-Bold", 10)
    cv.drawString(margin + 0.18 * IN, y - 0.88 * IN, "Contact")
    cv.setFont("Helvetica", 9)
    cv.drawString(margin + 0.88 * IN, y - 0.88 * IN, contact)
    y -= 1.58 * IN

    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 10)
    cv.drawString(margin, y, "Test profile")
    cv.setFont("Helvetica", 9)
    cv.drawString(margin + 1.12 * IN, y, f"{profile['profile_id']} - 0.375 in die - {profile['cols']} x {profile['rows']} layout")
    y -= 0.33 * IN
    cv.setFillColor(WARN)
    cv.setFont("Helvetica-Bold", 8)
    warning_text = warnings[0] if warnings else "Physical registration qualification is required before production approval."
    draw_wrapped_text(cv, f"Constants warning: {warning_text}", margin, y, page_w - 2 * margin, font="Helvetica-Bold", size=8, leading=10)
    footer(cv, page_w, f"{proof_ref} - vendor qualification instructions - page 1 of 3")
    cv.showPage()


def page_vendor_alignment(
    cv: canvas.Canvas,
    design: dict[str, Any],
    profile: dict[str, Any],
    page_w: float,
    page_h: float,
) -> None:
    proof_ref = proof_ref_for(design)
    margin = float(profile["margin_left_in"]) * IN
    header(cv, page_w, page_h, "registration target", f"{proof_ref} - 100% / Actual Size", margin)
    die_w = profile_die_w(profile) * IN
    die_h = profile_die_h(profile) * IN
    cv.setStrokeColor(GRAY)
    cv.setLineWidth(0.35)
    for index in range(int(profile["stickers_per_sheet"])):
        x, y_top = die_origin(index, profile, page_h)
        cv.roundRect(x, y_top - die_h, die_w, die_h, 2.5, stroke=1, fill=0)

    bbox = die_grid_bbox(profile, page_h)
    corner_marks = (
        (bbox["x_left"], bbox["y_bot"], 0.05 * IN, -0.13 * IN),
        (bbox["x_right"], bbox["y_bot"], -0.72 * IN, -0.13 * IN),
        (bbox["x_left"], bbox["y_top"], 0.05 * IN, 0.07 * IN),
        (bbox["x_right"], bbox["y_top"], -0.72 * IN, 0.07 * IN),
    )
    for x, y, dx, dy in corner_marks:
        draw_crosshair(cv, x, y)
        draw_crosshair_label(cv, x, y, dx, dy)
    center_x = (bbox["x_left"] + bbox["x_right"]) / 2.0
    center_y = (bbox["y_top"] + bbox["y_bot"]) / 2.0
    draw_crosshair(cv, center_x, center_y)
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 5.5)
    cv.drawString(center_x + 0.06 * IN, center_y + 0.06 * IN, "CENTER")

    calibration_y = calibration_y_in(profile) * IN
    draw_calibration_bar(cv, 2.0 * IN, calibration_y)
    draw_vertical_calibration_bar_in_margin(cv, (bbox["x_right"] + page_w) / 2.0, page_h / 2.0 - 0.5 * IN)
    cv.setFillColor(INK)
    cv.setFont("Helvetica", 6.5)
    cv.drawString(3.45 * IN, calibration_y + 0.02 * IN, "Registration reference - we measure print-to-cut offset from this page.")
    footer(cv, page_w, f"{proof_ref} - registration target - page 2 of 3")
    cv.showPage()


def draw_gradient_bar(cv: canvas.Canvas, x: float, y: float, width: float, height: float, colors: list[tuple[int, int, int]]) -> None:
    steps = 240
    segment = width / steps
    for index in range(steps):
        position = index / (steps - 1)
        scaled = position * (len(colors) - 1)
        left_index = min(int(scaled), len(colors) - 2)
        mix = scaled - left_index
        left = colors[left_index]
        right = colors[left_index + 1]
        red = round(left[0] + (right[0] - left[0]) * mix)
        green = round(left[1] + (right[1] - left[1]) * mix)
        blue = round(left[2] + (right[2] - left[2]) * mix)
        cv.setFillColor(HexColor(f"#{red:02X}{green:02X}{blue:02X}"))
        cv.rect(x + index * segment, y, segment + 0.4, height, stroke=0, fill=1)
    cv.setStrokeColor(GRAY)
    cv.setLineWidth(0.4)
    cv.rect(x, y, width, height, stroke=1, fill=0)


def page_vendor_color_targets(cv: canvas.Canvas, design: dict[str, Any], constants: dict[str, Any], page_w: float, page_h: float) -> None:
    proof_ref = proof_ref_for(design)
    margin = 0.42 * IN
    header(cv, page_w, page_h, "color + gradient target", f"{proof_ref} - standard production color management", margin)
    patches = color_target_patches(constants)
    layout = vendor_color_layout(page_w, page_h, len(patches))
    for patch, boxes in zip(patches, layout):
        x, y, width, height = boxes["patch"]
        cv.setFillColor(HexColor(patch["hex"]))
        cv.rect(x, y, width, height, stroke=0, fill=1)
        cv.setStrokeColor(GRAY)
        cv.setLineWidth(0.25)
        cv.rect(x, y, width, height, stroke=1, fill=0)
        cv.setFillColor(INK)
        cv.setFont("Helvetica", 4.4)
        cv.drawCentredString(x + width / 2.0, boxes["label"][1] + 1.5, f"{patch['number']:02d} {patch['hex']}")

    ramp_y = 2.34 * IN
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 7)
    cv.drawString(margin, ramp_y + 0.48 * IN, "10-step neutral gray ramp")
    ramp_width = 0.56 * IN
    ramp_gap = 0.15 * IN
    for index in range(10):
        value = round(index * 255 / 9)
        x = margin + index * (ramp_width + ramp_gap)
        cv.setFillColor(HexColor(f"#{value:02X}{value:02X}{value:02X}"))
        cv.setStrokeColor(GRAY)
        cv.setLineWidth(0.3)
        cv.rect(x, ramp_y, ramp_width, 0.34 * IN, stroke=1, fill=1)
        cv.setFillColor(INK)
        cv.setFont("Helvetica", 4.5)
        cv.drawCentredString(x + ramp_width / 2.0, ramp_y - 0.09 * IN, f"N{index + 1:02d}")

    gradient_x = margin
    gradient_width = page_w - 2 * margin
    gradient_height = 0.28 * IN
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 7)
    cv.drawString(gradient_x, 1.89 * IN, "Skin-tone gradient - light to deep")
    skin_colors = [(250, 225, 205), (221, 169, 128), (160, 100, 67), (82, 45, 31)]
    draw_gradient_bar(cv, gradient_x, 1.53 * IN, gradient_width, gradient_height, skin_colors)
    cv.setFillColor(INK)
    cv.drawString(gradient_x, 1.14 * IN, "Saturated hue gradient")
    hue_colors = [tuple(round(channel * 255) for channel in colorsys.hsv_to_rgb(index / 12.0, 0.92, 0.95)) for index in range(13)]
    draw_gradient_bar(cv, gradient_x, 0.78 * IN, gradient_width, gradient_height, hue_colors)
    cv.setFillColor(INK)
    cv.setFont("Helvetica", 6.5)
    cv.drawCentredString(page_w / 2.0, 0.48 * IN, "Measure patches with spectro; log against the target table.")
    footer(cv, page_w, f"{proof_ref} - color + gradient target - page 3 of 3")
    cv.showPage()


def page_cover(cv: canvas.Canvas, design: dict[str, Any], constants: dict[str, Any], plan: dict[str, Any], warnings: list[str], page_w: float, page_h: float) -> None:
    proof_ref = proof_ref_for(design)
    margin = 0.55 * IN
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 26)
    cv.drawString(margin, page_h - 0.85 * IN, "MosaPack Operator Proof Pack")
    cv.setFillColor(TEAL)
    cv.setFont("Helvetica-Bold", 15)
    cv.drawString(margin, page_h - 1.22 * IN, proof_ref)
    cv.setFillColor(GRAY)
    cv.setFont("Helvetica", 10)
    cv.drawString(margin, page_h - 1.48 * IN, "Operator proof pack - not a customer order")

    rows = [
        ("Project ID", str(design["project_id"])),
        ("Grid", f"{design['grid']} x {design['grid']}"),
        ("Finished size", f"{design.get('finished_size_in', design.get('size_in'))} in"),
        ("Sheet profile", str(design["sheet_profile"])),
        ("Palette colors", str(len(design["palette"]))),
        ("Placed stickers", str(plan["total_placed"])),
        ("Spares", str(plan["total_spares"])),
        ("Sticker sheets", str(plan["printed_mixed_sheets"])),
        ("Black base", "yes" if design.get("black_base") else "no"),
    ]
    y = page_h - 2.1 * IN
    for label, value in rows:
        cv.setFillColor(GRAY)
        cv.setFont("Helvetica-Bold", 8.5)
        cv.drawString(margin, y, label)
        cv.setFillColor(INK)
        cv.setFont("Helvetica", 9)
        cv.drawString(margin + 1.45 * IN, y, value)
        y -= 0.23 * IN

    y -= 0.12 * IN
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 10)
    cv.drawString(margin, y, "Palette summary")
    y -= 0.22 * IN
    cv.setFont("Helvetica", 7.5)
    for color in design["palette"][:18]:
        cv.setFillColor(HexColor(color["hex"]))
        cv.roundRect(margin, y - 0.06 * IN, 0.17 * IN, 0.17 * IN, 2, stroke=0, fill=1)
        cv.setStrokeColor(GRAY)
        cv.roundRect(margin, y - 0.06 * IN, 0.17 * IN, 0.17 * IN, 2, stroke=1, fill=0)
        cv.setFillColor(INK)
        count = plan["placed_counts"].get(color["index"], 0)
        cv.drawString(margin + 0.25 * IN, y, f"{color['id']} - {color['name']} ({count})")
        y -= 0.18 * IN

    if warnings:
        y = max(y - 0.1 * IN, 0.95 * IN)
        cv.setFillColor(WARN)
        cv.setFont("Helvetica-Bold", 9)
        cv.drawString(margin, y, "Warnings")
        y -= 0.2 * IN
        cv.setFont("Helvetica", 7.3)
        for warning in warnings[:6]:
            cv.drawString(margin, y, f"- {warning}")
            y -= 0.16 * IN

    footer(cv, page_w, f"{proof_ref} - cover")
    cv.showPage()


def page_alignment(
    cv: canvas.Canvas,
    design: dict[str, Any],
    constants: dict[str, Any],
    profile: dict[str, Any],
    page_w: float,
    page_h: float,
    include_color_target_strip: bool = False,
) -> None:
    proof_ref = proof_ref_for(design)
    margin = float(profile["margin_left_in"]) * IN
    header(cv, page_w, page_h, "alignment / registration", f"{proof_ref} - Print at 100% / Actual Size", margin)
    cv.setStrokeColor(GRAY)
    cv.setLineWidth(0.35)
    die_w = profile_die_w(profile) * IN
    die_h = profile_die_h(profile) * IN
    for i in range(int(profile["stickers_per_sheet"])):
        x, y_top = die_origin(i, profile, page_h)
        cv.roundRect(x, y_top - die_h, die_w, die_h, 2.5, stroke=1, fill=0)

    if include_color_target_strip:
        draw_color_target_strip(cv, constants, profile, page_h)

    bbox = die_grid_bbox(profile, page_h)
    is_sl680 = profile.get("profile_id") == "sl680_0375"
    corners = (
        (
            bbox["x_left"],
            bbox["y_bot"],
            0.05 * IN,
            (-0.13 if is_sl680 else 0.06) * IN,
        ),
        (
            bbox["x_right"],
            bbox["y_bot"],
            -0.72 * IN,
            (-0.13 if is_sl680 else 0.06) * IN,
        ),
        (
            bbox["x_left"],
            bbox["y_top"],
            0.05 * IN,
            (0.07 if is_sl680 else -0.13) * IN,
        ),
        (
            bbox["x_right"],
            bbox["y_top"],
            -0.72 * IN,
            (0.07 if is_sl680 else -0.13) * IN,
        ),
    )
    for x, y, dx, dy in corners:
        draw_crosshair(cv, x, y)
        draw_crosshair_label(cv, x, y, dx, dy)

    draw_feed_fiducials(cv, page_w, page_h)
    calibration_y = calibration_y_in(profile) * IN
    cv.setFillColor(INK)
    cv.setFont("Helvetica", 5.5)
    if is_sl680:
        draw_calibration_bar(cv, 2.0 * IN, calibration_y)
        vertical_x = (bbox["x_right"] + page_w) / 2.0
        draw_vertical_calibration_bar_in_margin(cv, vertical_x, page_h / 2.0 - 0.5 * IN)
        cv.drawString(3.35 * IN, calibration_y + 0.10 * IN, "Print on plain paper first; overlay the label sheet and hold to light.")
        cv.drawString(3.35 * IN, calibration_y, "Print at 100% / Actual Size. Do not use Fit to Page.")
    else:
        draw_calibration_bar(cv, margin, calibration_y)
        draw_vertical_calibration_bar(cv, margin + 1.38 * IN, calibration_y)
        cv.drawString(margin + 2.42 * IN, calibration_y + 0.10 * IN, "Print on plain paper first; overlay the label sheet and hold to light.")
        cv.drawString(margin + 2.42 * IN, calibration_y, "Print at 100% / Actual Size. Do not use Fit to Page.")
    footer(cv, page_w, f"{proof_ref} - alignment")
    cv.showPage()


def page_sticker_sheets(
    cv: canvas.Canvas,
    design: dict[str, Any],
    plan: dict[str, Any],
    profile: dict[str, Any],
    page_w: float,
    page_h: float,
    bleed_in: float,
    sheet_limit: int | None = None,
    title_prefix: str = "",
) -> None:
    proof_ref = proof_ref_for(design)
    margin = float(profile["margin_left_in"]) * IN
    die_w = profile_die_w(profile) * IN
    die_h = profile_die_h(profile) * IN
    bleed = float(bleed_in) * IN
    per_sheet = int(profile["stickers_per_sheet"])
    items = plan["items"]
    section_starts = {start: index + 1 for index, (start, _) in enumerate(plan["section_ranges"]) if start > 0}
    spare_start = plan["total_placed"]
    sheet_count = max(1, math.ceil(len(items) / per_sheet))
    render_count = min(sheet_count, sheet_limit) if sheet_limit else sheet_count
    for sheet in range(render_count):
        header(
            cv,
            page_w,
            page_h,
            f"{title_prefix}sticker sheet {sheet + 1} of {sheet_count}",
            f"{proof_ref} - {design['sheet_profile']} - bleed {bleed_in:.2f} in - print at 100%",
            margin,
        )
        for pos in range(per_sheet):
            global_index = sheet * per_sheet + pos
            if global_index >= len(items):
                break
            _, _, color_index = items[global_index]
            x, y_top = die_origin(pos, profile, page_h)
            color = design["palette"][color_index]
            cv.setFillColor(HexColor(color["hex"]))
            cv.roundRect(x - bleed, y_top - die_h - bleed, die_w + 2 * bleed, die_h + 2 * bleed, 4, stroke=0, fill=1)
            if global_index in section_starts or global_index == spare_start:
                label_y = y_top + 0.06 * IN
                if label_y <= page_h - 0.30 * IN:
                    cv.setFillColor(TEAL)
                    cv.setFont("Helvetica-Bold", 5.8)
                    label = f"SECTION {section_starts.get(global_index)}" if global_index in section_starts else "SPARES"
                    cv.drawString(x, label_y, label)
        footer(cv, page_w, f"{proof_ref} - sheet {sheet + 1}/{sheet_count}")
        cv.showPage()


def page_operator_cover(
    cv: canvas.Canvas,
    design: dict[str, Any],
    plan: dict[str, Any],
    warnings: list[str],
    page_w: float,
    page_h: float,
    bleed_variants: list[tuple[str, float]],
) -> None:
    proof_ref = proof_ref_for(design)
    margin = 0.58 * IN
    sheet_count = int(plan["printed_mixed_sheets"])
    sheet_pages = sheet_count * len(bleed_variants)
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 24)
    cv.drawString(margin, page_h - 0.80 * IN, "MosaPack Operator Pack")
    cv.setFillColor(TEAL)
    cv.setFont("Helvetica-Bold", 14)
    cv.drawString(margin, page_h - 1.16 * IN, proof_ref)
    cv.setFillColor(GRAY)
    cv.setFont("Helvetica", 9)
    cv.drawString(margin, page_h - 1.42 * IN, "Internal fulfillment document - do not send to print vendors")

    rows = [
        ("Project ID", str(design["project_id"])),
        ("Grid", f"{design['grid']} x {design['grid']}"),
        ("Finished size", f"{design.get('finished_size_in', design.get('size_in'))} in"),
        ("Sheet profile", str(design["sheet_profile"])),
        ("Placed stickers", str(plan["total_placed"])),
        ("Spares", str(plan["total_spares"])),
        ("Sheets per variant", str(sheet_count)),
        ("Sticker-sheet pages in pack", str(sheet_pages)),
    ]
    y = page_h - 2.02 * IN
    for label, value in rows:
        cv.setFillColor(GRAY)
        cv.setFont("Helvetica-Bold", 8.5)
        cv.drawString(margin, y, label)
        cv.setFillColor(INK)
        cv.setFont("Helvetica", 9)
        cv.drawString(margin + 1.75 * IN, y, value)
        y -= 0.25 * IN

    y -= 0.08 * IN
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 11)
    cv.drawString(margin, y, "Pack contents")
    y -= 0.26 * IN
    cv.setFont("Helvetica", 9)
    cv.drawString(margin, y, f"{sheet_count} complete sheet(s), including the spare section, for each bleed variant.")
    y -= 0.22 * IN
    if len(bleed_variants) > 1:
        cv.setFillColor(WARN)
        cv.setFont("Helvetica-Bold", 10)
        cv.drawString(margin, y, "Print both variants.")
        y -= 0.24 * IN
    cv.setFillColor(INK)
    cv.setFont("Helvetica", 8.5)
    for name, bleed in bleed_variants:
        cv.drawString(margin + 0.18 * IN, y, f"Bleed Variant {name}: {bleed:.2f} in - {sheet_count} sheet page(s)")
        y -= 0.20 * IN

    if warnings:
        y -= 0.12 * IN
        cv.setFillColor(WARN)
        cv.setFont("Helvetica-Bold", 8)
        for warning in warnings[:5]:
            y = draw_wrapped_text(cv, f"Warning: {warning}", margin, y, page_w - 2 * margin, font="Helvetica-Bold", size=8, leading=10)
            y -= 0.07 * IN
    footer(cv, page_w, f"{proof_ref} - operator cover")
    cv.showPage()


def page_operator_sticker_sheets(
    cv: canvas.Canvas,
    design: dict[str, Any],
    plan: dict[str, Any],
    profile: dict[str, Any],
    page_w: float,
    page_h: float,
    bleed_in: float,
    variant_name: str,
) -> None:
    proof_ref = proof_ref_for(design)
    margin = float(profile["margin_left_in"]) * IN
    die_w = profile_die_w(profile) * IN
    die_h = profile_die_h(profile) * IN
    bleed = bleed_in * IN
    per_sheet = int(profile["stickers_per_sheet"])
    items = plan["items"]
    section_starts = {start: index + 1 for index, (start, _) in enumerate(plan["section_ranges"])}
    spare_start = int(plan["total_placed"])
    sheet_count = max(1, math.ceil(len(items) / per_sheet))
    for sheet in range(sheet_count):
        cv.setFillColor(INK)
        cv.setFont("Helvetica-Bold", 9.2)
        cv.drawString(
            margin,
            page_h - 0.21 * IN,
            f"Sheet {sheet + 1} of {sheet_count} - Bleed Variant {variant_name} ({bleed_in:.2f} in)",
        )
        cv.setFillColor(GRAY)
        cv.setFont("Helvetica", 6)
        cv.drawRightString(page_w - margin, page_h - 0.21 * IN, proof_ref)

        first_y_top = die_origin(0, profile, page_h)[1]
        cv.setFillColor(INK)
        cv.setFont("Helvetica", 5.3)
        for col in range(int(profile["cols"])):
            x, _ = die_origin(col, profile, page_h)
            cv.drawCentredString(x + die_w / 2.0, first_y_top + 0.17 * IN, f"C{col + 1}")
        for row in range(int(profile["rows"])):
            _, y_top = die_origin(row * int(profile["cols"]), profile, page_h)
            cv.drawRightString(margin - 0.06 * IN, y_top - die_h / 2.0 - 2, f"R{row + 1}")

        for pos in range(per_sheet):
            global_index = sheet * per_sheet + pos
            if global_index >= len(items):
                break
            _, _, color_index = items[global_index]
            x, y_top = die_origin(pos, profile, page_h)
            color = design["palette"][color_index]
            cv.setFillColor(HexColor(color["hex"]))
            cv.roundRect(x - bleed, y_top - die_h - bleed, die_w + 2 * bleed, die_h + 2 * bleed, 4, stroke=0, fill=1)
            if global_index in section_starts or global_index == spare_start:
                label = f"SECTION {section_starts[global_index]}" if global_index in section_starts else "SPARES START"
                cv.setFillColor(HexColor("#FFFFFF"))
                cv.roundRect(x - 1, y_top + 0.02 * IN, cv.stringWidth(label, "Helvetica-Bold", 7) + 4, 9, 1, stroke=0, fill=1)
                cv.setFillColor(INK)
                cv.setFont("Helvetica-Bold", 7)
                cv.drawString(x + 1, y_top + 0.045 * IN, label)
        footer(cv, page_w, f"{proof_ref} - variant {variant_name} - sheet {sheet + 1}/{sheet_count}")
        cv.showPage()


def draw_grid_preview(cv: canvas.Canvas, design: dict[str, Any], base_index: int | None, x0: float, y0: float, size: float) -> None:
    grid = int(design["grid"])
    cell = size / grid
    cv.setFillColor(HexColor("#141518") if base_index is not None else LIGHT)
    cv.rect(x0, y0, size, size, stroke=0, fill=1)
    for index, color_index in enumerate(design["cell_map"]):
        if color_index == base_index:
            continue
        row, col = divmod(index, grid)
        cv.setFillColor(HexColor(design["palette"][color_index]["hex"]))
        cv.rect(x0 + col * cell, y0 + size - (row + 1) * cell, cell, cell, stroke=0, fill=1)
    cv.setStrokeColor(GRAY)
    cv.setLineWidth(0.5)
    cv.rect(x0, y0, size, size, stroke=1, fill=0)


def operator_build_guide_layout(page_w: float, page_h: float) -> dict[str, tuple[float, float, float, float]]:
    margin = 0.55 * IN
    return {
        "thumbnail": (margin, page_h - 4.02 * IN, 3.05 * IN, 3.05 * IN),
        "section_map": (4.30 * IN, page_h - 3.85 * IN, 2.55 * IN, 2.55 * IN),
        "legend": (margin, 1.05 * IN, page_w - 2 * margin, 5.35 * IN),
    }


def page_operator_build_guide(
    cv: canvas.Canvas,
    design: dict[str, Any],
    plan: dict[str, Any],
    page_w: float,
    page_h: float,
) -> None:
    proof_ref = proof_ref_for(design)
    layout = operator_build_guide_layout(page_w, page_h)
    margin = 0.55 * IN
    header(cv, page_w, page_h, "operator build guide", f"{proof_ref} - row-major, top-left origin", margin)

    thumb_x, thumb_y, thumb_w, _ = layout["thumbnail"]
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 9)
    cv.drawString(thumb_x, thumb_y + thumb_w + 0.10 * IN, "Mosaic reference")
    draw_grid_preview(cv, design, plan["base_index"], thumb_x, thumb_y, thumb_w)

    section_x, section_y, section_w, section_h = layout["section_map"]
    section_size = int(plan["section_size"])
    per_row = int(design["grid"]) // section_size
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 8.5)
    cv.drawString(section_x, section_y + section_h + 0.10 * IN, f"Section map: {per_row} x {per_row}; each {section_size} x {section_size} tiles")
    cell_w = section_w / per_row
    cell_h = section_h / per_row
    cv.setStrokeColor(GRAY)
    cv.setLineWidth(0.8)
    for index in range(per_row * per_row):
        row, col = divmod(index, per_row)
        x = section_x + col * cell_w
        y = section_y + section_h - (row + 1) * cell_h
        cv.rect(x, y, cell_w, cell_h, stroke=1, fill=0)
        cv.setFillColor(INK)
        cv.setFont("Helvetica-Bold", 14)
        cv.drawCentredString(x + cell_w / 2.0, y + cell_h / 2.0 - 5, str(index + 1))

    legend_x, legend_y, legend_w, legend_h = layout["legend"]
    cv.setFillColor(LIGHT)
    cv.roundRect(legend_x, legend_y, legend_w, legend_h, 4, stroke=0, fill=1)
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 10)
    cv.drawString(legend_x + 0.18 * IN, legend_y + legend_h - 0.28 * IN, "Color legend")
    columns = 3
    rows = 11
    column_width = (legend_w - 0.36 * IN) / columns
    row_height = 0.40 * IN
    for index, color in enumerate(design["palette"][: columns * rows]):
        col, row = divmod(index, rows)
        x = legend_x + 0.18 * IN + col * column_width
        y = legend_y + legend_h - 0.62 * IN - row * row_height
        cv.setFillColor(HexColor(color["hex"]))
        cv.roundRect(x, y, 0.25 * IN, 0.25 * IN, 2, stroke=0, fill=1)
        cv.setStrokeColor(GRAY)
        cv.roundRect(x, y, 0.25 * IN, 0.25 * IN, 2, stroke=1, fill=0)
        cv.setFillColor(INK)
        cv.setFont("Helvetica", 6.8)
        count = int(plan["placed_counts"].get(color["index"], 0))
        label = f"{color['index']}: {color['name']} ({count})"
        cv.drawString(x + 0.33 * IN, y + 0.08 * IN, label[:34])

    cv.setFillColor(GRAY)
    cv.setFont("Helvetica", 7.5)
    cv.drawString(margin, 0.72 * IN, "Build each numbered section row by row, left to right. Follow sequence and section markers on the sticker sheets.")
    if design.get("black_base"):
        cv.drawString(margin, 0.55 * IN, "Black-base cells remain on the map but are excluded from the sticker sequence.")
    footer(cv, page_w, f"{proof_ref} - operator build guide")
    cv.showPage()


def page_build_guide(cv: canvas.Canvas, design: dict[str, Any], constants: dict[str, Any], plan: dict[str, Any], page_w: float, page_h: float) -> None:
    proof_ref = proof_ref_for(design)
    margin = 0.55 * IN
    header(cv, page_w, page_h, "build guide / section map", f"{proof_ref} - row-major top-left origin", margin)
    preview_size = 3.15 * IN
    draw_grid_preview(cv, design, plan["base_index"], margin, page_h - 0.75 * IN - preview_size, preview_size)

    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 9)
    cv.drawString(margin + preview_size + 0.38 * IN, page_h - 0.85 * IN, "Color legend")
    y = page_h - 1.12 * IN
    cv.setFont("Helvetica", 7.2)
    legend_colors = design["palette"] if design["palette_mode"] == "adaptive" else design["palette"][:24]
    legend_spacing = 0.15 if design["palette_mode"] == "adaptive" else 0.17
    for color in legend_colors:
        cv.setFillColor(HexColor(color["hex"]))
        cv.roundRect(margin + preview_size + 0.38 * IN, y - 5, 10, 10, 2, stroke=0, fill=1)
        cv.setStrokeColor(GRAY)
        cv.roundRect(margin + preview_size + 0.38 * IN, y - 5, 10, 10, 2, stroke=1, fill=0)
        cv.setFillColor(INK)
        count = plan["placed_counts"].get(color["index"], 0)
        cv.drawString(margin + preview_size + 0.6 * IN, y, f"{color['index']}: {color['name']} ({count})")
        y -= legend_spacing * IN

    section_size = plan["section_size"]
    per_row = int(design["grid"]) // section_size
    map_size = 2.1 * IN
    x0 = margin
    y0 = page_h - 4.85 * IN
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 9)
    cv.drawString(x0, y0 + map_size + 0.15 * IN, f"Section map - {per_row} x {per_row} sections of {section_size} x {section_size}")
    cell = map_size / per_row
    cv.setStrokeColor(GRAY)
    cv.setLineWidth(0.6)
    for index in range(per_row * per_row):
        row, col = divmod(index, per_row)
        x = x0 + col * cell
        y = y0 + map_size - (row + 1) * cell
        cv.rect(x, y, cell, cell, stroke=1, fill=0)
        cv.setFillColor(INK)
        cv.setFont("Helvetica-Bold", 11)
        cv.drawCentredString(x + cell / 2, y + cell / 2 - 4, str(index + 1))

    cv.setFillColor(GRAY)
    cv.setFont("Helvetica", 8)
    cv.drawString(margin, 0.58 * IN, "Fill each section row by row, left to right. Sticker sheets are already ordered for this sequence.")
    cv.drawString(margin, 0.42 * IN, "Some sections may continue across sticker sheets. Follow the section number and sequence range, not sheet number alone.")
    if design.get("black_base"):
        cv.drawString(margin, 0.26 * IN, "Black-base cells remain in the design map but are omitted from the sticker sequence.")
    footer(cv, page_w, f"{proof_ref} - build guide")
    cv.showPage()


def customer_header(cv: canvas.Canvas, page_w: float, page_h: float, title: str, subtitle: str = "") -> None:
    margin = 0.52 * IN
    cv.setFillColor(HexColor("#0BBF92"))
    cv.rect(0, page_h - 0.07 * IN, page_w, 0.07 * IN, stroke=0, fill=1)
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 15)
    cv.drawString(margin, page_h - 0.48 * IN, "MosaPack")
    cv.setFillColor(HexColor("#0BBF92"))
    cv.drawString(margin + 1.12 * IN, page_h - 0.48 * IN, title)
    if subtitle:
        cv.setFillColor(GRAY)
        cv.setFont("Helvetica", 7.2)
        cv.drawString(margin, page_h - 0.68 * IN, subtitle)


def wrapped_lines(cv: canvas.Canvas, text: str, font: str, size: float, max_width: float) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and cv.stringWidth(candidate, font, size) > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def draw_customer_step(cv: canvas.Canvas, number: int, title: str, body: str, x: float, y: float, width: float) -> float:
    radius = 0.17 * IN
    cv.setFillColor(HexColor("#0BBF92"))
    cv.circle(x + radius, y - radius, radius, stroke=0, fill=1)
    cv.setFillColor(HexColor("#FFFFFF"))
    cv.setFont("Helvetica-Bold", 13)
    cv.drawCentredString(x + radius, y - radius - 4.5, str(number))
    text_x = x + 0.48 * IN
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 10.5)
    cv.drawString(text_x, y - 0.08 * IN, title)
    cv.setFillColor(GRAY)
    cv.setFont("Helvetica", 7.4)
    line_y = y - 0.27 * IN
    for line in wrapped_lines(cv, body, "Helvetica", 7.4, width - 0.48 * IN):
        cv.drawString(text_x, line_y, line)
        line_y -= 0.13 * IN
    return min(line_y - 0.12 * IN, y - 0.70 * IN)


def is_memorial_design(design: dict[str, Any]) -> bool:
    descriptor = " ".join(
        str(design.get(field, "")).strip().lower()
        for field in ("photo_category", "vertical")
    )
    return any(term in descriptor for term in ("memorial", "remembrance", "in memory"))


def customer_pack_value(constants: dict[str, Any], key: str) -> str:
    return str(constants.get("customer_pack", {}).get(key, "")).strip()


def customer_rescue_line(constants: dict[str, Any]) -> str:
    contact = customer_pack_value(constants, "support_contact")
    if not contact:
        return ""
    return f"Missing or ran out of a color? Email us at {contact} - we'll send replacements."


def quantity_label(count: int, singular: str) -> str:
    return f"{count} {singular if count == 1 else singular + 's'}"


def draw_help_qr(cv: canvas.Canvas, url: str, x: float, y: float, size: float) -> bool:
    if not url:
        return False
    widget = QrCodeWidget(url)
    left, bottom, right, top = widget.getBounds()
    scale = size / max(right - left, top - bottom)
    drawing = Drawing(size, size, transform=[scale, 0, 0, scale, -left * scale, -bottom * scale])
    drawing.add(widget)
    renderPDF.draw(drawing, cv, x, y)
    return True


def page_customer_start(
    cv: canvas.Canvas,
    design: dict[str, Any],
    constants: dict[str, Any],
    customer_plan: dict[str, Any],
    page_w: float,
    page_h: float,
) -> None:
    memorial = is_memorial_design(design)
    subtitle = f"About {customer_plan['estimated_minutes']} minutes."
    if not memorial:
        subtitle = f"Three steps. No experience needed. {subtitle}"
    customer_header(
        cv,
        page_w,
        page_h,
        "Start Here",
        subtitle,
    )
    margin = 0.52 * IN
    dedication = str(design.get("dedication", "")).strip()
    y = page_h - 1.02 * IN
    if dedication:
        cv.setFillColor(GRAY if memorial else HexColor("#08795F"))
        cv.setFont("Helvetica" if memorial else "Helvetica-Bold", 8.2)
        cv.drawString(margin, y, dedication)
        y -= 0.28 * IN
    y = draw_customer_step(
        cv,
        1,
        "Lay the board flat",
        "Every square on the board shows a small number. That number = the color you place there.",
        margin,
        y,
        page_w - 2 * margin,
    )
    y = draw_customer_step(
        cv,
        2,
        "Peel by color",
        "Sticker sheets are grouped by color and numbered to match. Do one color at a time. Finish one color completely before opening the next.",
        margin,
        y,
        page_w - 2 * margin,
    )
    y = draw_customer_step(
        cv,
        3,
        "Cover the numbers",
        "Place each sticker on its numbered square. When every number is covered - you're done.",
        margin,
        y,
        page_w - 2 * margin,
    )

    preview_size = 2.55 * IN
    preview_x = margin
    content_top = y + 0.05 * IN
    preview_y = content_top - preview_size
    draw_grid_preview(cv, design, None, preview_x, preview_y, preview_size)
    cv.setFillColor(GRAY)
    cv.setFont("Helvetica-Bold", 6.8)
    cv.drawString(preview_x, preview_y - 0.16 * IN, "Your finished picture")

    list_x = preview_x + preview_size + 0.35 * IN
    list_y = content_top
    list_w = page_w - margin - list_x
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 10)
    cv.drawString(list_x, list_y, "In your kit")
    colors = customer_plan["colors"]
    columns = 2 if len(colors) > 13 else 1
    rows_per_column = max(1, math.ceil(len(colors) / columns))
    column_w = list_w / columns
    line_height = min(0.25 * IN, 4.65 * IN / rows_per_column)
    font_size = 6.4 if len(colors) <= 25 else 4.8
    for index, color in enumerate(colors):
        col, row = divmod(index, rows_per_column)
        x = list_x + col * column_w
        item_y = list_y - 0.28 * IN - row * line_height
        cv.setFillColor(HexColor(color["hex"]))
        cv.roundRect(x, item_y - 0.07 * IN, 0.17 * IN, 0.17 * IN, 2, stroke=0, fill=1)
        cv.setStrokeColor(GRAY)
        cv.roundRect(x, item_y - 0.07 * IN, 0.17 * IN, 0.17 * IN, 2, stroke=1, fill=0)
        cv.setFillColor(INK)
        cv.setFont("Helvetica", font_size)
        cv.drawString(
            x + 0.23 * IN,
            item_y,
            f"Color {color['number']} - {quantity_label(color['placed'], 'sticker')}"
            f" (+ {quantity_label(color['spares'], 'spare')})",
        )

    footer_y = 0.72 * IN
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 7.3)
    cv.drawString(margin, footer_y, "Wrong spot? These stickers peel off and re-stick.")
    rescue = customer_rescue_line(constants)
    if rescue:
        cv.setFillColor(GRAY)
        cv.setFont("Helvetica", 6.2)
        cv.drawString(margin, footer_y - 0.18 * IN, rescue)
    cv.setFillColor(GRAY)
    cv.setFont("Helvetica", 6.5)
    cv.drawRightString(page_w - margin, footer_y, f"Finished board: {customer_plan['finished_size_in']:.1f} in square")
    help_url = customer_pack_value(constants, "help_url")
    if draw_help_qr(cv, help_url, page_w - margin - 0.58 * IN, 0.98 * IN, 0.58 * IN):
        cv.setFillColor(GRAY)
        cv.setFont("Helvetica", 5.5)
        cv.drawCentredString(page_w - margin - 0.29 * IN, 0.89 * IN, "Build help")
    cv.showPage()


def customer_board_layout(page_w: float, page_h: float, region: dict[str, int], min_font: float) -> dict[str, float]:
    left_bound = 0.68 * IN
    right_bound = page_w - 0.38 * IN
    bottom_bound = 0.76 * IN
    top_bound = page_h - 0.92 * IN
    available_w = right_bound - left_bound
    available_h = top_bound - bottom_bound
    cell = min(available_w / region["width"], available_h / region["height"])
    font_size = max(min_font, min(10.0, cell * 0.34))
    grid_w = region["width"] * cell
    grid_h = region["height"] * cell
    return {
        "x": left_bound + (available_w - grid_w) / 2.0,
        "y": bottom_bound + (available_h - grid_h) / 2.0,
        "cell": cell,
        "font_size": font_size,
    }


def board_panel_markers(grid: int, region: dict[str, int], panel_cells: int) -> list[dict[str, int]]:
    panels_across = math.ceil(grid / panel_cells)
    row_start = region["row"]
    row_end = row_start + region["height"]
    col_start = region["col"]
    col_end = col_start + region["width"]
    first_panel_row = row_start // panel_cells
    last_panel_row = (row_end - 1) // panel_cells
    first_panel_col = col_start // panel_cells
    last_panel_col = (col_end - 1) // panel_cells
    return [
        {
            "number": panel_row * panels_across + panel_col + 1,
            "row": max(row_start, panel_row * panel_cells),
            "col": max(col_start, panel_col * panel_cells),
        }
        for panel_row in range(first_panel_row, last_panel_row + 1)
        for panel_col in range(first_panel_col, last_panel_col + 1)
    ]


def draw_locator(cv: canvas.Canvas, grid: int, region: dict[str, int], x: float, y: float, size: float) -> None:
    panel_size = region["width"]
    per_row = max(1, grid // panel_size)
    cell = size / per_row
    cv.setStrokeColor(GRAY)
    cv.setLineWidth(0.5)
    for panel in range(per_row * per_row):
        row, col = divmod(panel, per_row)
        cv.setFillColor(HexColor("#0BBF92") if panel + 1 == region["panel"] else LIGHT)
        cv.rect(x + col * cell, y + size - (row + 1) * cell, cell, cell, stroke=1, fill=1)


def draw_customer_board_region(
    cv: canvas.Canvas,
    design: dict[str, Any],
    constants: dict[str, Any],
    customer_plan: dict[str, Any],
    region: dict[str, int],
    page_w: float,
    page_h: float,
) -> dict[str, Any]:
    title = "Your Board" if region["panel_count"] == 1 else f"Board - Panel {region['panel']} of {region['panel_count']}"
    customer_header(cv, page_w, page_h, title, "Each square shows its color number. Cover every number.")
    min_font = float(constants.get("customer_pack", {}).get("min_board_number_font_pt", 6.0))
    layout = customer_board_layout(page_w, page_h, region, min_font)
    x0, y0, cell = layout["x"], layout["y"], layout["cell"]
    grid = int(design["grid"])
    covered: list[int] = []
    for local_row in range(region["height"]):
        global_row = region["row"] + local_row
        for local_col in range(region["width"]):
            global_col = region["col"] + local_col
            index = global_row * grid + global_col
            palette_index = int(design["cell_map"][index])
            color_number = customer_plan["number_by_index"][palette_index]
            x = x0 + local_col * cell
            y = y0 + (region["height"] - local_row - 1) * cell
            style = customer_board_cell_style(design["palette"][palette_index]["hex"], constants)
            geometry = customer_board_cell_geometry(cell, constants)
            cv.setFillColor(HexColor(style["grout_hex"]))
            cv.rect(x, y, cell, cell, stroke=0, fill=1)
            cv.setFillColor(HexColor(style["fill_hex"]))
            cv.rect(
                x + geometry["inset"],
                y + geometry["inset"],
                geometry["face"],
                geometry["face"],
                stroke=0,
                fill=1,
            )
            cv.setStrokeColor(HexColor(style["outline_hex"]))
            cv.setLineWidth(0.35)
            cv.rect(x, y, cell, cell, stroke=1, fill=0)
            cv.setFillColor(HexColor(style["number_hex"]))
            cv.setFont("Helvetica-Bold", layout["font_size"])
            cv.drawCentredString(x + cell / 2.0, y + cell / 2.0 - layout["font_size"] * 0.34, str(color_number))
            covered.append(index)

    for divider in range(12, grid, 12):
        if region["col"] < divider < region["col"] + region["width"]:
            x = x0 + (divider - region["col"]) * cell
            cv.setStrokeColor(INK)
            cv.setLineWidth(1.3)
            cv.line(x, y0, x, y0 + region["height"] * cell)
        if region["row"] < divider < region["row"] + region["height"]:
            y = y0 + (region["row"] + region["height"] - divider) * cell
            cv.setStrokeColor(INK)
            cv.setLineWidth(1.3)
            cv.line(x0, y, x0 + region["width"] * cell, y)
    cv.setStrokeColor(INK)
    cv.setLineWidth(0.9)
    cv.rect(x0, y0, region["width"] * cell, region["height"] * cell, stroke=1, fill=0)

    panel_cells = int(constants.get("customer_pack", {}).get("panel_cells", 12))
    markers = board_panel_markers(grid, region, panel_cells)
    for marker in markers:
        local_row = marker["row"] - region["row"]
        local_col = marker["col"] - region["col"]
        marker_x = x0 + local_col * cell + 0.06 * cell
        marker_y = y0 + (region["height"] - local_row) * cell - 0.33 * cell
        marker_size = max(7.0, min(13.0, cell * 0.32))
        cv.setFillColor(INK)
        cv.circle(marker_x + marker_size / 2.0, marker_y + marker_size / 2.0, marker_size / 2.0, stroke=0, fill=1)
        cv.setFillColor(HexColor("#FFFFFF"))
        cv.setFont("Helvetica-Bold", max(5.0, marker_size * 0.48))
        cv.drawCentredString(marker_x + marker_size / 2.0, marker_y + marker_size * 0.34, str(marker["number"]))

    cv.setFillColor(GRAY)
    cv.setFont("Helvetica", max(5.5, layout["font_size"] - 1.0))
    for local_col in range(region["width"]):
        cv.drawCentredString(x0 + (local_col + 0.5) * cell, y0 + region["height"] * cell + 0.07 * IN, column_label(region["col"] + local_col))
    for local_row in range(region["height"]):
        cv.drawRightString(x0 - 0.08 * IN, y0 + (region["height"] - local_row - 0.5) * cell - 2, str(region["row"] + local_row + 1))
    if region["panel_count"] > 1:
        draw_locator(cv, grid, region, page_w - 0.86 * IN, page_h - 1.02 * IN, 0.48 * IN)
    cv.setFillColor(GRAY)
    cv.setFont("Helvetica", 6.5)
    cv.drawString(0.68 * IN, 0.48 * IN, "Bold lines split the board into panels - finish one panel before starting the next.")
    cv.showPage()
    return {"covered": covered, "font_size": layout["font_size"], "region": region, "panel_markers": markers}


def page_customer_sticker_sheets(
    cv: canvas.Canvas,
    design: dict[str, Any],
    constants: dict[str, Any],
    customer_plan: dict[str, Any],
    profile: dict[str, Any],
    page_w: float,
    page_h: float,
    bleed_in: float,
) -> None:
    die_w = profile_die_w(profile) * IN
    die_h = profile_die_h(profile) * IN
    bleed = bleed_in * IN
    margin = float(profile["margin_left_in"]) * IN
    colors_by_index = {color["palette_index"]: color for color in customer_plan["colors"]}
    sheets = customer_plan["sheets"]
    for sheet_index, sheet in enumerate(sheets, start=1):
        cv.setFillColor(HexColor("#0BBF92"))
        cv.rect(0, page_h - 0.05 * IN, page_w, 0.05 * IN, stroke=0, fill=1)
        cv.setFillColor(INK)
        cv.setFont("Helvetica-Bold", 9)
        cv.drawString(margin, page_h - 0.20 * IN, f"MosaPack Sticker Sheet {sheet_index} of {len(sheets)}")
        cv.setFillColor(GRAY)
        cv.setFont("Helvetica", 5.5)
        cv.drawRightString(page_w - margin, page_h - 0.20 * IN, "Finish one color before opening the next")
        for position, slot in enumerate(sheet["slots"]):
            if not slot:
                continue
            x, y_top = die_origin(position, profile, page_h)
            color = colors_by_index[slot["palette_index"]]
            cv.setFillColor(HexColor(color["hex"]))
            cv.roundRect(x - bleed, y_top - die_h - bleed, die_w + 2 * bleed, die_h + 2 * bleed, 4, stroke=0, fill=1)
        for row, label in sheet["row_labels"].items():
            _, y_top = die_origin(row * int(profile["cols"]), profile, page_h)
            color = customer_plan["colors"][label["color_number"] - 1]
            chip_x = 0.14 * IN
            chip_y = y_top - die_h / 2.0 - 0.11 * IN
            cv.setFillColor(HexColor(color["hex"]))
            cv.roundRect(chip_x, chip_y, 0.28 * IN, 0.22 * IN, 3, stroke=0, fill=1)
            cv.setFillColor(readable_text_color(color["hex"]))
            cv.setFont("Helvetica-Bold", 7.5)
            cv.drawCentredString(chip_x + 0.14 * IN, chip_y + 0.07 * IN, str(color["number"]))
            if label["is_spare"]:
                cv.setFillColor(INK)
                cv.setFont("Helvetica-Bold", 4.8)
                cv.drawString(chip_x, chip_y - 0.07 * IN, "SPARES")
        for segment in sheet["segments"]:
            position = segment["slot"]
            x, y_top = die_origin(position, profile, page_h)
            color = colors_by_index[segment["palette_index"]]
            banner_y = y_top + 0.055 * IN
            cv.setFillColor(HexColor(color["hex"]))
            cv.roundRect(x, banner_y, 0.28 * IN, 0.18 * IN, 3, stroke=0, fill=1)
            cv.setFillColor(readable_text_color(color["hex"]))
            cv.setFont("Helvetica-Bold", 8)
            cv.drawCentredString(x + 0.14 * IN, banner_y + 0.045 * IN, str(color["number"]))
            cv.setFillColor(INK)
            cv.setFont("Helvetica-Bold", 6.2)
            if segment.get("continued"):
                label = (
                    f"Color {color['number']} - continued - {segment['remaining_count']} remaining"
                    f" - {color['progress_percent']}% of your picture"
                )
            else:
                label = (
                    f"Color {color['number']} - {quantity_label(color['placed'], 'sticker')}"
                    f" - {color['progress_percent']}% of your picture"
                )
                if color["spares"]:
                    label += f" (+ {quantity_label(color['spares'], 'spare')})"
            cv.drawString(x + 0.34 * IN, banner_y + 0.05 * IN, label)

        cv.setFillColor(INK)
        cv.setFont("Helvetica-Bold", 5.3)
        cv.drawString(margin, 0.35 * IN, "Finished a color? Check it off:")
        colors = customer_plan["colors"]
        checks_per_row = math.ceil(len(colors) / 2) if len(colors) > 24 else len(colors)
        available = page_w - 2 * margin - 1.20 * IN
        spacing = min(0.36 * IN, available / max(1, checks_per_row))
        for index, color in enumerate(colors):
            row, col = divmod(index, checks_per_row)
            check_x = margin + 1.20 * IN + col * spacing
            check_y = (0.34 - row * 0.14) * IN
            cv.setStrokeColor(INK)
            cv.rect(check_x, check_y - 0.03 * IN, 0.09 * IN, 0.09 * IN, stroke=1, fill=0)
            cv.setFillColor(INK)
            cv.setFont("Helvetica", 4.5)
            cv.drawString(check_x + 0.11 * IN, check_y - 0.01 * IN, str(color["number"]))
        if sheet_index == len(sheets):
            rescue = customer_rescue_line(constants)
            if rescue:
                cv.setFillColor(GRAY)
                cv.setFont("Helvetica", 5.2)
                cv.drawCentredString(page_w / 2.0, 0.08 * IN, rescue)
        cv.showPage()


def page_customer_closing(
    cv: canvas.Canvas,
    design: dict[str, Any],
    constants: dict[str, Any],
    page_w: float,
    page_h: float,
) -> None:
    memorial = is_memorial_design(design)
    title = "Your piece is complete" if memorial else "You did it"
    subtitle = "A finished picture, built one color at a time."
    if memorial:
        subtitle = "A finished piece made with care."
    customer_header(cv, page_w, page_h, title, subtitle)
    margin = 0.70 * IN
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 15 if not memorial else 13)
    cv.drawString(margin, page_h - 1.62 * IN, "Your MosaPack is ready to display.")
    cv.setFillColor(GRAY)
    cv.setFont("Helvetica", 9)
    draw_wrapped_text(
        cv,
        "Hang it where the light is even and the whole picture can be seen at a comfortable distance.",
        margin,
        page_h - 1.98 * IN,
        page_w - 2 * margin,
        size=9,
        leading=13,
    )
    cv.setStrokeColor(HexColor("#DDE3E2"))
    cv.setLineWidth(0.8)
    cv.line(margin, page_h - 2.62 * IN, page_w - margin, page_h - 2.62 * IN)
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 11)
    cv.drawString(margin, page_h - 3.12 * IN, "A record of the finished piece" if memorial else "Keep the before & after")
    cv.setFillColor(GRAY)
    cv.setFont("Helvetica", 9)
    photo_copy = "Photograph your finished piece next to the original photo - share your before & after."
    if memorial:
        photo_copy = "If you wish, photograph the finished piece beside the original photo."
    draw_wrapped_text(
        cv,
        photo_copy,
        margin,
        page_h - 3.47 * IN,
        page_w - 2 * margin,
        size=9,
        leading=13,
    )
    share_line = customer_pack_value(constants, "share_line")
    if share_line and not memorial:
        cv.setFillColor(HexColor("#08795F") if not memorial else GRAY)
        cv.setFont("Helvetica-Bold" if not memorial else "Helvetica", 10)
        cv.drawString(margin, page_h - 4.15 * IN, share_line)
    cv.showPage()


def render_customer_qc_checklist(
    design: dict[str, Any],
    constants: dict[str, Any],
    customer_plan: dict[str, Any],
    output_path: str | Path,
    *,
    board_included: bool,
) -> dict[str, Any]:
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    cv = canvas.Canvas(str(out), pagesize=letter)
    page_w, page_h = letter
    margin = 0.55 * IN
    pack_version = customer_pack_value(constants, "pack_version") or "customer-pack.v2"
    cv.setTitle(f"MosaPack {proof_ref_for(design)} packer QC checklist")
    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 20)
    cv.drawString(margin, page_h - 0.72 * IN, "MosaPack Packer QC Checklist")
    cv.setFillColor(TEAL)
    cv.setFont("Helvetica-Bold", 11)
    cv.drawString(margin, page_h - 1.02 * IN, proof_ref_for(design))
    cv.setFillColor(GRAY)
    cv.setFont("Helvetica", 8)
    cv.drawRightString(page_w - margin, page_h - 1.02 * IN, pack_version)

    summary_rows = [
        ("Order reference", proof_ref_for(design)),
        ("Sticker sheets", str(len(customer_plan["sheets"]))),
        ("Board included", "YES" if board_included else "NO"),
        ("Placed stickers", str(customer_plan["total_placed"])),
        ("Spare stickers", str(customer_plan["total_spares"])),
    ]
    if design["schema_version"] == 1.2:
        summary_rows[3:3] = [
            ("Finished size", f"{float(design['finished_size_in']):g} in"),
            ("Sticker size", f"{float(design['cell_size_in']):g} in"),
        ]
    y = page_h - 1.48 * IN
    for label, value in summary_rows:
        cv.setStrokeColor(INK)
        cv.rect(margin, y - 0.03 * IN, 0.12 * IN, 0.12 * IN, stroke=1, fill=0)
        cv.setFillColor(GRAY)
        cv.setFont("Helvetica-Bold", 7.5)
        cv.drawString(margin + 0.22 * IN, y, label)
        cv.setFillColor(INK)
        cv.setFont("Helvetica", 8)
        cv.drawString(margin + 1.38 * IN, y, value)
        y -= 0.26 * IN

    cv.setFillColor(INK)
    cv.setFont("Helvetica-Bold", 10)
    cv.drawString(margin, y - 0.06 * IN, "Per-color count check")
    y -= 0.38 * IN
    colors = customer_plan["colors"]
    columns = 2 if len(colors) > 20 else 1
    rows_per_column = max(1, math.ceil(len(colors) / columns))
    column_width = (page_w - 2 * margin) / columns
    row_height = min(0.28 * IN, (y - 0.65 * IN) / rows_per_column)
    for index, color in enumerate(colors):
        col, row = divmod(index, rows_per_column)
        item_x = margin + col * column_width
        item_y = y - row * row_height
        cv.setStrokeColor(INK)
        cv.rect(item_x, item_y - 0.03 * IN, 0.11 * IN, 0.11 * IN, stroke=1, fill=0)
        cv.setFillColor(HexColor(color["hex"]))
        cv.roundRect(item_x + 0.20 * IN, item_y - 0.05 * IN, 0.16 * IN, 0.16 * IN, 2, stroke=0, fill=1)
        cv.setFillColor(INK)
        cv.setFont("Helvetica", 7.2)
        cv.drawString(
            item_x + 0.44 * IN,
            item_y,
            f"Color {color['number']}: {color['placed']} placed + {quantity_label(color['spares'], 'spare')}",
        )
    cv.setFillColor(GRAY)
    cv.setFont("Helvetica", 6.5)
    cv.drawString(margin, 0.42 * IN, "Internal fulfillment document - do not include in the customer pack.")
    cv.showPage()
    cv.save()
    result = {
        "output": str(out),
        "page_count": 1,
        "pack_version": pack_version,
        "sheet_count": len(customer_plan["sheets"]),
        "board_included": board_included,
        "total_placed": customer_plan["total_placed"],
        "total_spares": customer_plan["total_spares"],
        "colors": [
            {
                "number": color["number"],
                "placed": color["placed"],
                "spares": color["spares"],
            }
            for color in colors
        ],
    }
    if design["schema_version"] == 1.2:
        result["finished_size_in"] = float(design["finished_size_in"])
        result["cell_size_in"] = float(design["cell_size_in"])
    return result


def render_board_art(
    design: dict[str, Any],
    constants: dict[str, Any],
    customer_plan: dict[str, Any],
    output_path: str | Path,
) -> dict[str, Any]:
    pitch = float(constants["board_pitch_in"]) * IN
    bleed = float(constants.get("customer_pack", {}).get("board_bleed_in", 0.125)) * IN
    grid = int(design["grid"])
    board_size = grid * pitch
    page_size = board_size + 2 * bleed
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    cv = canvas.Canvas(str(out), pagesize=(page_size, page_size))
    cv.setTitle("MosaPack customer board artwork")
    cv.setFillColor(HexColor("#FFFFFF"))
    cv.rect(0, 0, page_size, page_size, stroke=0, fill=1)
    font_size = max(float(constants.get("customer_pack", {}).get("min_board_number_font_pt", 6.0)), min(9.0, pitch * 0.28))
    for index, palette_index in enumerate(design["cell_map"]):
        row, col = divmod(index, grid)
        x = bleed + col * pitch
        y = bleed + (grid - row - 1) * pitch
        style = customer_board_cell_style(design["palette"][palette_index]["hex"], constants)
        geometry = customer_board_cell_geometry(pitch, constants)
        cv.setFillColor(HexColor(style["grout_hex"]))
        cv.rect(x, y, pitch, pitch, stroke=0, fill=1)
        cv.setFillColor(HexColor(style["fill_hex"]))
        cv.rect(
            x + geometry["inset"],
            y + geometry["inset"],
            geometry["face"],
            geometry["face"],
            stroke=0,
            fill=1,
        )
        cv.setStrokeColor(HexColor(style["outline_hex"]))
        cv.setLineWidth(0.35)
        cv.rect(x, y, pitch, pitch, stroke=1, fill=0)
        cv.setFillColor(HexColor(style["number_hex"]))
        cv.setFont("Helvetica-Bold", font_size)
        cv.drawCentredString(x + pitch / 2.0, y + pitch / 2.0 - font_size * 0.34, str(customer_plan["number_by_index"][palette_index]))
    for divider in range(12, grid, 12):
        cv.setStrokeColor(INK)
        cv.setLineWidth(1.4)
        offset = bleed + divider * pitch
        cv.line(offset, bleed, offset, bleed + board_size)
        cv.line(bleed, offset, bleed + board_size, offset)
    cv.setStrokeColor(INK)
    cv.setLineWidth(0.9)
    cv.rect(bleed, bleed, board_size, board_size, stroke=1, fill=0)
    proof_ref = proof_ref_for(design)
    cv.setFillColor(INK)
    cv.setFont("Helvetica", 4.5)
    cv.drawString(bleed, 0.035 * IN, proof_ref)
    cv.showPage()
    cv.save()
    return {
        "output": str(out),
        "page_size_in": round(page_size / IN, 4),
        "finished_size_in": round(board_size / IN, 4),
        "bleed_in": round(bleed / IN, 4),
        "page_count": 1,
        "number_font_pt": font_size,
        "proof_ref": proof_ref,
    }


def render_pdf(
    design: dict[str, Any],
    constants: dict[str, Any],
    output_path: str | Path,
    warnings: list[str],
    *,
    source_design_path: str | Path,
    constants_path: str | Path,
    bleed_override: float | None = None,
    gate_a: bool = False,
    color_target_strip: bool = False,
    vendor_pack: bool = False,
    operator_pack: bool = False,
    ship_to: str = "{ship_to}",
    contact: str = "{contact}",
    customer_pack: bool = False,
    board_art_path: str | Path | None = None,
    fulfillment_mode: str = "printed_mixed",
    write_manifest_file: bool = True,
) -> dict[str, Any]:
    profile = constants["sheet_profiles"][design["sheet_profile"]]
    page_w, page_h = page_size_for(profile)
    plan = compute_sheet_plan(design, constants)
    customer_plan = compute_customer_plan(design, constants) if customer_pack else None
    canonical_fulfillment_mode = normalize_fulfillment_mode(fulfillment_mode)
    validate_palette_fulfillment(design, canonical_fulfillment_mode)
    fulfillment = compute_fulfillment_plan(design, constants, plan, canonical_fulfillment_mode)
    mismatch_warnings = warn_on_production_mismatch(design, plan)
    palette_warnings = palette_drift_warnings(design, constants)
    warnings = list(warnings) + mismatch_warnings + palette_warnings
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    main_bleed = bleed_value(constants, bleed_override)
    if gate_a and not vendor_pack:
        bleed_values_used = [0.03, 0.05]
    elif vendor_pack:
        bleed_values_used = []
    else:
        bleed_values_used = [main_bleed]
    cv = canvas.Canvas(str(out), pagesize=(page_w, page_h))
    measurement_log_path: Path | None = None
    board_page_stats: list[dict[str, Any]] = []
    board_art_result: dict[str, Any] | None = None
    qc_checklist_result: dict[str, Any] | None = None
    page_count = 0
    if vendor_pack:
        cv.setTitle(f"MosaPack {proof_ref_for(design)} vendor qualification pack")
        page_vendor_cover(cv, design, profile, warnings, page_w, page_h, ship_to, contact)
        page_vendor_alignment(cv, design, profile, page_w, page_h)
        page_vendor_color_targets(cv, design, constants, page_w, page_h)
        page_count = 3
    elif operator_pack:
        cv.setTitle(f"MosaPack {proof_ref_for(design)} operator pack")
        variants = [("A", 0.03), ("B", 0.05)] if gate_a else [("A", main_bleed)]
        page_operator_cover(cv, design, plan, warnings, page_w, page_h, variants)
        for variant_name, variant_bleed in variants:
            page_operator_sticker_sheets(
                cv,
                design,
                plan,
                profile,
                page_w,
                page_h,
                variant_bleed,
                variant_name,
            )
        page_operator_build_guide(cv, design, plan, page_w, page_h)
        page_count = 2 + int(plan["printed_mixed_sheets"]) * len(variants)
    elif customer_pack:
        if gate_a or color_target_strip:
            raise ValueError("--customer-pack cannot be combined with Gate A or color-target output")
        customer_face_in = float(constants["board_pitch_in"]) - float(constants["grout_in"])
        if not math.isclose(profile_die_w(profile), customer_face_in, abs_tol=1e-9):
            raise ValueError(
                f"--customer-pack requires a {customer_face_in:.3f}in sticker profile for the configured board pitch"
            )
        cv.setTitle("MosaPack customer build guide")
        assert customer_plan is not None
        page_customer_start(cv, design, constants, customer_plan, page_w, page_h)
        for region in customer_plan["board_regions"]:
            board_page_stats.append(
                draw_customer_board_region(cv, design, constants, customer_plan, region, page_w, page_h)
            )
        page_customer_sticker_sheets(cv, design, constants, customer_plan, profile, page_w, page_h, main_bleed)
        page_customer_closing(cv, design, constants, page_w, page_h)
        page_count = 2 + len(customer_plan["board_regions"]) + len(customer_plan["sheets"])
    else:
        cv.setTitle(f"MosaPack {proof_ref_for(design)} ({design['project_id']}) kit pack")
        page_cover(cv, design, constants, plan, warnings, page_w, page_h)
        page_alignment(cv, design, constants, profile, page_w, page_h, color_target_strip)
        if gate_a:
            page_sticker_sheets(cv, design, plan, profile, page_w, page_h, 0.03, sheet_limit=1, title_prefix="Gate A ")
            page_sticker_sheets(cv, design, plan, profile, page_w, page_h, 0.05, sheet_limit=1, title_prefix="Gate A ")
        else:
            page_sticker_sheets(cv, design, plan, profile, page_w, page_h, main_bleed)
        page_build_guide(cv, design, constants, plan, page_w, page_h)
        legacy_sheet_pages = 2 if gate_a else int(plan["printed_mixed_sheets"])
        page_count = 3 + legacy_sheet_pages
    cv.save()
    if vendor_pack:
        measurement_log_path = write_measurement_log(constants, out)
    if customer_pack and board_art_path:
        assert customer_plan is not None
        board_art_result = render_board_art(design, constants, customer_plan, board_art_path)
    if customer_pack:
        assert customer_plan is not None
        qc_checklist_result = render_customer_qc_checklist(
            design,
            constants,
            customer_plan,
            out.with_suffix(".qc-checklist.pdf"),
            board_included=bool(board_art_path),
        )
    manifest = build_manifest(
        design,
        constants,
        plan,
        out,
        source_design_path,
        constants_path,
        page_w,
        page_h,
        gate_a,
        color_target_strip,
        bleed_values_used,
        fulfillment,
        warnings,
        palette_warnings,
        mismatch_warnings,
    )
    if customer_pack:
        assert customer_plan is not None
        manifest["pack_mode"] = "customer"
        manifest["pdf_layout_mode"] = "customer_color_grouped"
        manifest["pdf_layout_note"] = "Customer sticker sheets are usage-ranked and grouped by color."
        manifest["sheet_count"] = len(customer_plan["sheets"])
        manifest["customer_color_numbering"] = customer_plan["colors"]
        manifest["customer_board"] = {
            "board_pitch_in": customer_plan["board_pitch_in"],
            "grout_in": customer_plan["grout_in"],
            "finished_size_in": customer_plan["finished_size_in"],
            "guide_page_count": len(customer_plan["board_regions"]),
            "guide_pages": board_page_stats,
            "board_art": board_art_result,
        }
        manifest["customer_sheet_count"] = len(customer_plan["sheets"])
        manifest["customer_page_count"] = page_count
        manifest["customer_estimated_minutes"] = customer_plan["estimated_minutes"]
        manifest["customer_tone"] = "memorial" if is_memorial_design(design) else "standard"
        manifest["customer_help_qr"] = bool(customer_pack_value(constants, "help_url"))
        manifest["customer_qc_checklist"] = qc_checklist_result
    pack_mode = "vendor" if vendor_pack else "operator" if operator_pack else "customer" if customer_pack else "legacy"
    if pack_mode != "legacy":
        manifest["pack_mode"] = pack_mode
        manifest["page_count"] = page_count
        if measurement_log_path:
            manifest["measurement_log_csv"] = str(measurement_log_path)
    manifest_path = write_manifest(manifest, out) if write_manifest_file else None
    return {
        "output": str(out),
        "manifest": str(manifest_path) if manifest_path else None,
        "proof_ref": proof_ref_for(design),
        "project_id": design["project_id"],
        "grid": design["grid"],
        "size_in": design.get("size_in"),
        "finished_size_in": design.get("finished_size_in"),
        "cell_size_in": design.get("cell_size_in"),
        "sheet_profile": design["sheet_profile"],
        "palette_mode": design["palette_mode"],
        "gamut_profile_id": design.get("gamut_profile_id"),
        "placed": plan["total_placed"],
        "spares": plan["total_spares"],
        "sheets": len(customer_plan["sheets"]) if customer_plan else plan["printed_mixed_sheets"],
        "board_art": board_art_result,
        "qc_checklist": qc_checklist_result,
        "gate_a_mode": gate_a,
        "pack_mode": pack_mode,
        "page_count": page_count,
        "measurement_log_csv": str(measurement_log_path) if measurement_log_path else None,
        "color_target_strip": color_target_strip,
        "fulfillment_mode": canonical_fulfillment_mode,
        "bleed_values_used": bleed_values_used,
        "warnings": warnings,
    }


def generate(
    design_path: str | Path,
    output_path: str | Path,
    constants_path: str | Path | None = None,
    *,
    bleed_override: float | None = None,
    gate_a: bool = False,
    color_target_strip: bool = False,
    vendor_pack: bool = False,
    operator_pack: bool = False,
    ship_to: str = "{ship_to}",
    contact: str = "{contact}",
    customer_pack: bool = False,
    board_art_path: str | Path | None = None,
    fulfillment_mode: str = "printed_mixed",
    write_manifest_file: bool = True,
) -> dict[str, Any]:
    resolved_constants_path = Path(constants_path) if constants_path else default_constants_path()
    constants = load_constants(resolved_constants_path)
    design = load_design(design_path)
    warnings = validate_design(design, constants)
    return render_pdf(
        design,
        constants,
        output_path,
        warnings,
        source_design_path=design_path,
        constants_path=resolved_constants_path,
        bleed_override=bleed_override,
        gate_a=gate_a,
        color_target_strip=color_target_strip,
        vendor_pack=vendor_pack,
        operator_pack=operator_pack,
        ship_to=ship_to,
        contact=contact,
        customer_pack=customer_pack,
        board_art_path=board_art_path,
        fulfillment_mode=fulfillment_mode,
        write_manifest_file=write_manifest_file,
    )


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate local MosaPack fulfillment PDFs.")
    parser.add_argument("design_json", help="Canonical MosaPack design JSON")
    parser.add_argument("output_pdf", help="Output PDF path")
    parser.add_argument("--constants", default=None, help="Production constants JSON path")
    parser.add_argument("--bleed", type=float, default=None, help="Override bleed in inches for normal output")
    parser.add_argument("--gate-a", action="store_true", help="Generate Gate A validation PDF with sheet 1 at 0.03in and 0.05in bleed")
    parser.add_argument("--color-target-strip", action="store_true", help="Add Master-25 and full-gamut color targets to the alignment page")
    pack_group = parser.add_mutually_exclusive_group()
    pack_group.add_argument("--vendor-pack", action="store_true", help="Generate the 3-page vendor qualification pack and measurement CSV")
    pack_group.add_argument("--operator-pack", action="store_true", help="Generate the internal operator pack with all planned sticker sheets")
    pack_group.add_argument("--customer-pack", action="store_true", help="Generate the customer Start Here, numbered board, and color-grouped sticker sheets")
    parser.add_argument("--ship-to", default="{ship_to}", help="Vendor-pack shipping destination")
    parser.add_argument("--contact", default="{contact}", help="Vendor-pack contact")
    parser.add_argument("--board-art", default=None, help="With --customer-pack, write standalone true-size board artwork PDF")
    parser.add_argument("--fulfillment", default="printed_mixed", choices=sorted(FULFILLMENT_ALIASES), help="Manifest-only fulfillment math mode")
    parser.add_argument("--no-manifest", action="store_true", help="Do not emit sidecar manifest JSON")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    try:
        if args.board_art and not args.customer_pack:
            raise ValueError("--board-art requires --customer-pack")
        summary = generate(
            args.design_json,
            args.output_pdf,
            args.constants,
            bleed_override=args.bleed,
            gate_a=args.gate_a,
            color_target_strip=args.color_target_strip,
            vendor_pack=args.vendor_pack,
            operator_pack=args.operator_pack,
            ship_to=args.ship_to,
            contact=args.contact,
            customer_pack=args.customer_pack,
            board_art_path=args.board_art,
            fulfillment_mode=args.fulfillment,
            write_manifest_file=not args.no_manifest,
        )
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    for warning in summary.get("warnings", []):
        print(f"WARNING: {warning}", file=sys.stderr)
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
