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
import json
import math
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

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

SUPPORTED_GRIDS = {24, 32, 48}
COMMERCE_RE = re.compile(r"stripe|shopify|checkout|payment|order placed|payment received", re.I)


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
        if not re.match(r"^#[0-9a-fA-F]{6}$", hex_value):
            raise ValueError(f"palette[{index}].hex must be #RRGGBB")
        if declared_index is not None and declared_index != index:
            raise ValueError(f"palette[{index}].index must equal array position")
        normalized.append({"id": color_id, "name": name, "hex": hex_value.lower(), "index": index})
    return normalized


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
        raise ValueError("grid must be 24, 32, or 48")
    if design.get("size_in") != grid // 2:
        raise ValueError("size_in must equal grid / 2")
    profile_id = design.get("sheet_profile") or constants.get("default_profile")
    if profile_id not in constants.get("sheet_profiles", {}):
        raise ValueError(f"sheet_profile not found in constants: {profile_id}")
    profile = constants["sheet_profiles"][profile_id]
    if profile.get("verified") is False:
        warnings.append(f"{profile_id} is not production verified: {profile.get('verification_status', 'unverified')}")
    palette = normalize_palette(design.get("palette") or [])
    if not palette:
        raise ValueError("palette must not be empty")
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
    design["palette"] = palette
    design["sheet_profile"] = profile_id
    design.setdefault("proof_ref", proof_ref_for(design))
    return warnings


def palette_drift_warnings(design: dict[str, Any], constants: dict[str, Any]) -> list[str]:
    warnings: list[str] = []
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


def die_origin(index: int, profile: dict[str, Any], page_h: float) -> tuple[float, float]:
    row, col = divmod(index, int(profile["cols"]))
    x = float(profile["margin_left_in"]) * IN + col * float(profile["pitch_in"]) * IN
    y_top = page_h - float(profile["margin_top_in"]) * IN - row * float(profile["pitch_in"]) * IN
    return x, y_top


def die_grid_bbox(profile: dict[str, Any], page_h: float) -> dict[str, float]:
    x_left = float(profile["margin_left_in"]) * IN
    x_right = x_left + (int(profile["cols"]) - 1) * float(profile["pitch_in"]) * IN + float(profile["die_in"]) * IN
    y_top = page_h - float(profile["margin_top_in"]) * IN
    y_bot = y_top - (int(profile["rows"]) - 1) * float(profile["pitch_in"]) * IN - float(profile["die_in"]) * IN
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
    bleed_values_used: list[float],
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
        "size_in": design["size_in"],
        "palette_id": design.get("palette_id"),
        "black_base": bool(design.get("black_base")),
        "base_index": base_index,
        "total_base_cells": total_base_cells,
        "per_color_placed_counts": per_color_counts,
        "spares_per_color": spares_counts,
        "total_placed_stickers": plan["total_placed"],
        "total_spares": plan["total_spares"],
        "total_stickers": plan["total_stickers"],
        "sheet_count": plan["printed_mixed_sheets"],
        "gate_a_mode": gate_a,
        "bleed_values_used": bleed_values_used,
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


def draw_feed_fiducials(cv: canvas.Canvas, page_w: float, page_h: float) -> None:
    y = page_h - 0.125 * IN
    cv.setStrokeColor(BLACK)
    cv.setFillColor(BLACK)
    cv.setLineWidth(0.5)
    for x in (0.75 * IN, page_w / 2, page_w - 0.75 * IN):
        cv.line(x, y, x, y - 0.12 * IN)
    cv.setFont("Helvetica", 5)
    cv.drawString(page_w / 2 + 0.04 * IN, y - 0.08 * IN, "feed/skew ticks")


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
        ("Finished size", f"{design['size_in']} in"),
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


def page_alignment(cv: canvas.Canvas, design: dict[str, Any], profile: dict[str, Any], page_w: float, page_h: float) -> None:
    proof_ref = proof_ref_for(design)
    margin = float(profile["margin_left_in"]) * IN
    header(cv, page_w, page_h, "alignment / registration", f"{proof_ref} - Print at 100% / Actual Size", margin)
    cv.setStrokeColor(GRAY)
    cv.setLineWidth(0.35)
    die = float(profile["die_in"]) * IN
    for i in range(int(profile["stickers_per_sheet"])):
        x, y_top = die_origin(i, profile, page_h)
        cv.roundRect(x, y_top - die, die, die, 2.5, stroke=1, fill=0)

    bbox = die_grid_bbox(profile, page_h)
    corners = (
        (bbox["x_left"], bbox["y_bot"], 0.05 * IN, 0.06 * IN),
        (bbox["x_right"], bbox["y_bot"], -0.72 * IN, 0.06 * IN),
        (bbox["x_left"], bbox["y_top"], 0.05 * IN, -0.13 * IN),
        (bbox["x_right"], bbox["y_top"], -0.72 * IN, -0.13 * IN),
    )
    for x, y, dx, dy in corners:
        draw_crosshair(cv, x, y)
        draw_crosshair_label(cv, x, y, dx, dy)

    draw_feed_fiducials(cv, page_w, page_h)
    draw_calibration_bar(cv, margin, 0.1 * IN)

    cv.setFillColor(INK)
    cv.setFont("Helvetica", 5.5)
    cv.drawString(margin + 1.24 * IN, 0.16 * IN, "Print on plain paper first; overlay the label sheet and hold to light.")
    cv.drawString(margin + 1.24 * IN, 0.08 * IN, "Print at 100% / Actual Size. Do not use Fit to Page.")
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
    die = float(profile["die_in"]) * IN
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
            cv.roundRect(x - bleed, y_top - die - bleed, die + 2 * bleed, die + 2 * bleed, 4, stroke=0, fill=1)
            if global_index in section_starts or global_index == spare_start:
                cv.setFillColor(TEAL)
                cv.setFont("Helvetica-Bold", 5.8)
                label = f"SECTION {section_starts.get(global_index)}" if global_index in section_starts else "SPARES"
                cv.drawString(x, y_top + 0.06 * IN, label)
        draw_calibration_bar(cv, margin, 0.1 * IN)
        footer(cv, page_w, f"{proof_ref} - sheet {sheet + 1}/{sheet_count}")
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
    for color in design["palette"][:24]:
        cv.setFillColor(HexColor(color["hex"]))
        cv.roundRect(margin + preview_size + 0.38 * IN, y - 5, 10, 10, 2, stroke=0, fill=1)
        cv.setStrokeColor(GRAY)
        cv.roundRect(margin + preview_size + 0.38 * IN, y - 5, 10, 10, 2, stroke=1, fill=0)
        cv.setFillColor(INK)
        count = plan["placed_counts"].get(color["index"], 0)
        cv.drawString(margin + preview_size + 0.6 * IN, y, f"{color['index']}: {color['name']} ({count})")
        y -= 0.17 * IN

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
    if design.get("black_base"):
        cv.drawString(margin, 0.42 * IN, "Black-base cells remain in the design map but are omitted from the sticker sequence.")
    footer(cv, page_w, f"{proof_ref} - build guide")
    cv.showPage()


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
    write_manifest_file: bool = True,
) -> dict[str, Any]:
    profile = constants["sheet_profiles"][design["sheet_profile"]]
    page_w, page_h = page_size_for(profile)
    plan = compute_sheet_plan(design, constants)
    mismatch_warnings = warn_on_production_mismatch(design, plan)
    palette_warnings = palette_drift_warnings(design, constants)
    warnings = list(warnings) + mismatch_warnings + palette_warnings
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    main_bleed = bleed_value(constants, bleed_override)
    if gate_a:
        bleed_values_used = [0.03, 0.05]
    else:
        bleed_values_used = [main_bleed]
    cv = canvas.Canvas(str(out), pagesize=(page_w, page_h))
    cv.setTitle(f"MosaPack {proof_ref_for(design)} ({design['project_id']}) kit pack")
    page_cover(cv, design, constants, plan, warnings, page_w, page_h)
    page_alignment(cv, design, profile, page_w, page_h)
    if gate_a:
        page_sticker_sheets(cv, design, plan, profile, page_w, page_h, 0.03, sheet_limit=1, title_prefix="Gate A ")
        page_sticker_sheets(cv, design, plan, profile, page_w, page_h, 0.05, sheet_limit=1, title_prefix="Gate A ")
    else:
        page_sticker_sheets(cv, design, plan, profile, page_w, page_h, main_bleed)
    page_build_guide(cv, design, constants, plan, page_w, page_h)
    cv.save()
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
        bleed_values_used,
        warnings,
        palette_warnings,
        mismatch_warnings,
    )
    manifest_path = write_manifest(manifest, out) if write_manifest_file else None
    return {
        "output": str(out),
        "manifest": str(manifest_path) if manifest_path else None,
        "proof_ref": proof_ref_for(design),
        "project_id": design["project_id"],
        "grid": design["grid"],
        "size_in": design["size_in"],
        "sheet_profile": design["sheet_profile"],
        "placed": plan["total_placed"],
        "spares": plan["total_spares"],
        "sheets": plan["printed_mixed_sheets"],
        "gate_a_mode": gate_a,
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
        write_manifest_file=write_manifest_file,
    )


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate local MosaPack operator kit-pack PDF.")
    parser.add_argument("design_json", help="Canonical MosaPack design JSON")
    parser.add_argument("output_pdf", help="Output PDF path")
    parser.add_argument("--constants", default=None, help="Production constants JSON path")
    parser.add_argument("--bleed", type=float, default=None, help="Override bleed in inches for normal output")
    parser.add_argument("--gate-a", action="store_true", help="Generate Gate A validation PDF with sheet 1 at 0.03in and 0.05in bleed")
    parser.add_argument("--no-manifest", action="store_true", help="Do not emit sidecar manifest JSON")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    try:
        summary = generate(
            args.design_json,
            args.output_pdf,
            args.constants,
            bleed_override=args.bleed,
            gate_a=args.gate_a,
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
