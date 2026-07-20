#!/usr/bin/env python3
"""Convert a locally retrieved MosaPack proof/project payload into design v1.2."""

from __future__ import annotations

import argparse
import json
import re
import shlex
import sys
from pathlib import Path
from typing import Any

import generate_kit_pack as kitpack


def unwrap_project(payload: dict[str, Any]) -> dict[str, Any]:
    project = payload.get("project")
    if isinstance(project, dict):
        return project
    return payload


def parse_grid_size(value: Any) -> int:
    if isinstance(value, bool):
        raise ValueError("grid_size must be an integer or a value like 24x24")
    if isinstance(value, int):
        return value
    match = re.fullmatch(r"\s*(\d+)\s*(?:x\s*(\d+)\s*)?", str(value or ""), re.I)
    if not match:
        raise ValueError("grid_size must be an integer or a square value like 24x24")
    rows = int(match.group(1))
    cols = int(match.group(2) or rows)
    if rows != cols:
        raise ValueError(f"grid_size must be square; received {rows}x{cols}")
    return rows


def slug(value: str, fallback: str) -> str:
    normalized = re.sub(r"[^a-z0-9_]+", "_", value.lower().replace(" ", "_")).strip("_")
    return normalized or fallback


def read_saved_palette(value: Any, field_name: str) -> list[dict[str, str]]:
    if isinstance(value, dict) and isinstance(value.get("colors"), list):
        value = value["colors"]
    if not isinstance(value, list) or not value:
        raise ValueError(f"{field_name} must be a non-empty palette array")
    colors: list[dict[str, str]] = []
    seen_ids: set[str] = set()
    for index, entry in enumerate(value):
        if isinstance(entry, dict):
            name = str(entry.get("name") or f"Color {index + 1}")
            hex_value = str(entry.get("hex") or "")
            color_id = slug(str(entry.get("id") or name), f"color_{index + 1:02d}")
        elif isinstance(entry, list) and len(entry) >= 2:
            name = str(entry[0])
            hex_value = str(entry[1])
            color_id = slug(name, f"color_{index + 1:02d}")
        else:
            raise ValueError(f"{field_name}[{index}] must contain a name and #RRGGBB hex")
        if not kitpack.HEX_COLOR_RE.fullmatch(hex_value):
            raise ValueError(f"{field_name}[{index}].hex must be #RRGGBB; received {hex_value!r}")
        if color_id in seen_ids:
            color_id = f"{color_id}_{index + 1:02d}"
        seen_ids.add(color_id)
        colors.append({"id": color_id, "name": name, "hex": hex_value})
    return colors


def configured_palette_match(colors: list[dict[str, str]], constants: dict[str, Any]) -> tuple[str, list[dict[str, str]]]:
    saved_hexes = [color["hex"].lower() for color in colors]
    requested_matches = []
    for palette_id, candidate in constants.get("palettes", {}).items():
        if not isinstance(candidate, list) or len(candidate) < len(colors):
            continue
        candidate_hexes = [str(color.get("hex", "")).lower() for color in candidate[:len(colors)]]
        if candidate_hexes == saved_hexes:
            requested_matches.append((str(palette_id), candidate))
    if not requested_matches:
        raise ValueError(
            "saved fixed palette does not match any configured production palette or ordered prefix; add an explicit constants mapping before fulfillment"
        )
    palette_id, candidate = requested_matches[0]
    mapped = [
        {
            "id": str(candidate[index]["id"]),
            "name": colors[index]["name"],
            "hex": colors[index]["hex"],
        }
        for index in range(len(colors))
    ]
    return palette_id, mapped


def validate_cell_map(value: Any, grid: int, palette_count: int) -> list[int]:
    if not isinstance(value, list):
        raise ValueError("tile_map must be an array of palette indices")
    expected = grid * grid
    if len(value) != expected:
        raise ValueError(f"tile_map length must equal grid_size squared ({expected}); received {len(value)}")
    cell_map: list[int] = []
    for index, palette_index in enumerate(value):
        if not isinstance(palette_index, int) or isinstance(palette_index, bool):
            raise ValueError(f"tile_map[{index}] must be an integer palette index")
        if palette_index < 0 or palette_index >= palette_count:
            raise ValueError(
                f"tile_map[{index}] index {palette_index} is outside palette range 0..{palette_count - 1}"
            )
        cell_map.append(palette_index)
    return cell_map


def convert_payload(
    raw_payload: dict[str, Any],
    constants: dict[str, Any],
    *,
    sheet_profile: str | None = None,
    dedication: str | None = None,
) -> dict[str, Any]:
    payload = unwrap_project(raw_payload)
    project_id = payload.get("project_id")
    if not isinstance(project_id, str) or len(project_id) < 8:
        raise ValueError("project_id is required and must be at least 8 characters")
    grid = parse_grid_size(payload.get("grid_size"))
    profile_id = sheet_profile or str(constants.get("default_profile") or "")
    profile = constants.get("sheet_profiles", {}).get(profile_id)
    if not isinstance(profile, dict):
        raise ValueError(f"sheet profile {profile_id!r} is not configured")

    palette_mode = "adaptive" if payload.get("palette_mode") == "adaptive" else "fixed"
    if palette_mode == "adaptive":
        palette = read_saved_palette(payload.get("adaptive_palette"), "adaptive_palette")
        palette_id = "adaptive"
    else:
        saved_palette = read_saved_palette(payload.get("palette"), "palette")
        palette_id, palette = configured_palette_match(saved_palette, constants)
    cell_map = validate_cell_map(payload.get("tile_map"), grid, len(palette))

    design: dict[str, Any] = {
        "schema_version": 1.2,
        "project_id": project_id,
        "proof_ref": payload.get("proof_ref") or kitpack.proof_ref_for({"project_id": project_id}),
        "grid": grid,
        "cell_size_in": kitpack.profile_die_w(profile),
        "finished_size_in": round(grid * float(constants["board_pitch_in"]), 4),
        "sheet_profile": profile_id,
        "palette_id": palette_id,
        "palette_mode": palette_mode,
        "palette": palette,
        "cell_map": cell_map,
        "black_base": bool(payload.get("black_base", False)),
        "photo_category": str(payload.get("photo_category") or payload.get("selected_vertical") or ""),
        "kit_format": "sticker",
        "proof_status": "requested",
        "source": {
            "bridge": "proof_to_design.v1",
            "saved_proof_schema": payload.get("schema_version"),
        },
    }
    if palette_mode == "adaptive":
        design["gamut_profile_id"] = str(constants["adaptive_palette"]["gamut_profile_id"])
    if payload.get("preferred_size_in") is not None:
        design["preferred_size_in"] = payload["preferred_size_in"]
    if payload.get("preferred_size_label") is not None:
        design["preferred_size_label"] = payload["preferred_size_label"]
    if dedication:
        design["dedication"] = dedication

    validation_copy = json.loads(json.dumps(design))
    kitpack.validate_design(validation_copy, constants)
    return design


def command_hints(design_path: Path) -> list[str]:
    stem = design_path.with_suffix("")
    customer = stem.with_name(stem.name + ".customer-pack.pdf")
    board = stem.with_name(stem.name + ".board-art.pdf")
    vendor = stem.with_name(stem.name + ".vendor-pack.pdf")
    generator = Path("tools/kitpack/generate_kit_pack.py")
    source = shlex.quote(str(design_path))
    return [
        f"python3 {generator} {source} {shlex.quote(str(customer))} --customer-pack --board-art {shlex.quote(str(board))}",
        f"python3 {generator} {source} {shlex.quote(str(vendor))} --vendor-pack",
    ]


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert a local saved proof/project JSON into canonical design v1.2.")
    parser.add_argument("proof_json", help="Local saved proof/project JSON")
    parser.add_argument("output_json", help="Canonical design v1.2 output path")
    parser.add_argument("--constants", default=None, help="Production constants JSON path")
    parser.add_argument("--sheet-profile", default=None, help="Target sheet profile; defaults to production default_profile")
    parser.add_argument("--dedication", default=None, help="Optional operator-entered customer dedication")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    try:
        constants = kitpack.load_constants(args.constants)
        payload = kitpack.load_json(args.proof_json)
        design = convert_payload(
            payload,
            constants,
            sheet_profile=args.sheet_profile,
            dedication=args.dedication,
        )
        output = Path(args.output_json)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(design, indent=2) + "\n", encoding="utf-8")
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    print(f"Wrote canonical design v1.2: {output}")
    print("Next commands:")
    for command in command_hints(output):
        print(f"  {command}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
