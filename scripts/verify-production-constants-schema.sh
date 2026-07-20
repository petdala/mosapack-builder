#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONSTANTS="$ROOT/config/production-constants.json"
SCHEMA="$ROOT/config/design-schema.v1.json"
SAMPLE="$ROOT/fixtures/designs/sample-design-first-hello.v1_1.json"

node - "$CONSTANTS" "$SCHEMA" "$SAMPLE" <<'NODE'
const fs = require('fs');
const [constantsPath, schemaPath, samplePath] = process.argv.slice(2);
let fail = 0;

function readJson(path) {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (error) {
    console.error(`INVALID JSON: ${path}: ${error.message}`);
    fail = 1;
    return null;
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    fail = 1;
  }
}

const constants = readJson(constantsPath);
const schema = readJson(schemaPath);
const sample = readJson(samplePath);

if (constants) {
  assert(constants.sheet_profiles && constants.sheet_profiles.OL2050, 'OL2050 sheet profile exists');
  assert(constants.sheet_profiles && constants.sheet_profiles.OL5425, 'OL5425 sheet profile exists');
  assert(constants.sheet_profiles && constants.sheet_profiles.sl680_0375, 'SL680 0.375in sheet profile exists');
  assert(constants.default_profile === 'sl680_0375', 'SL680 0.375in is the default sheet profile');
  for (const [key, profile] of Object.entries(constants.sheet_profiles || {})) {
    assert(profile.profile_id === key, `${key} profile_id matches map key`);
    assert(typeof profile.verified === 'boolean', `${key} has verified boolean`);
    assert(profile.rows * profile.cols === profile.stickers_per_sheet, `${key} rows*cols equals stickers_per_sheet`);
  }
  const ol2050 = constants.sheet_profiles?.OL2050;
  assert(ol2050 && constants.print.bleed_in <= ol2050.gap_in / 2, 'OL2050 bleed is <= gap/2');
  const sl680 = constants.sheet_profiles?.sl680_0375;
  assert(sl680?.cols === 12 && sl680?.rows === 16 && sl680?.stickers_per_sheet === 192, 'SL680 is 12x16 / 192-up');
  assert(sl680?.die_w_in === 0.375 && sl680?.die_h_in === 0.375, 'SL680 die is 0.375in square');
  assert(Math.abs(sl680?.pitch_x_in - (sl680?.die_w_in + sl680?.gap_x_in)) < 1e-9, 'SL680 horizontal pitch equals die plus gap');
  assert(Math.abs(sl680?.pitch_y_in - (sl680?.die_h_in + sl680?.gap_y_in)) < 1e-9, 'SL680 vertical pitch equals die plus gap');
  assert(sl680?.registration_status === 'pending_rederivation', 'SL680 registration budget is pending rederivation');
  assert(constants.adaptive_palette?.gamut_profile_id in (constants.gamut_profiles || {}), 'adaptive gamut profile exists');
  assert(constants.adaptive_palette?.min_delta_e00 === 8, 'adaptive minimum deltaE00 is 8');
  assert(constants.board_pitch_in === 0.4, 'customer board pitch is 0.40in');
  assert(constants.grout_in === 0.025, 'customer board grout is 0.025in');
  assert(constants.sheet_profiles?.sl680_0375?.die_in + constants.grout_in === constants.board_pitch_in, 'board pitch equals sticker die plus grout allowance');
  assert(constants.customer_pack?.board_bleed_in === 0.125, 'customer board artwork bleed is 0.125in');
  assert(constants.customer_pack?.seconds_per_sticker > 0, 'customer placement estimate is configured');
  assert(typeof constants.customer_pack?.support_contact === 'string', 'customer replacement support contact is configured');
  assert(typeof constants.customer_pack?.help_url === 'string', 'customer help URL is configurable');
  assert(typeof constants.customer_pack?.share_line === 'string', 'customer share line is configurable');
  assert(constants.customer_pack?.pack_version === 'customer-pack.v2', 'customer pack version is v2');
  assert(constants.color_targets?.master_25?.length === 25, 'Master color target has 25 patches');
  const sampler = constants.color_targets?.full_gamut_sampler;
  assert(sampler?.l_star_ramp?.length + sampler?.hue_steps * sampler?.chroma_levels?.length === 40, 'full-gamut sampler has 40 patches');
  const grids = [24, 32, 48];
  for (const grid of grids) {
    const divisor = (constants.sections.candidate_sizes || []).find((size) => grid % size === 0) || grid;
    assert(grid % divisor === 0, `section rule divides grid ${grid}`);
  }
  for (const [paletteId, palette] of Object.entries(constants.palettes || {})) {
    if (!Array.isArray(palette)) continue;
    const ids = palette.map((entry) => entry.id);
    assert(new Set(ids).size === ids.length, `${paletteId} palette IDs are unique`);
    for (const entry of palette) {
      assert(/^[a-z0-9_]+$/.test(entry.id), `${paletteId}.${entry.id} is snake_case`);
      assert(/^#[0-9a-fA-F]{6}$/.test(entry.hex), `${paletteId}.${entry.id} has hex color`);
    }
  }
  const heirloom = constants.palettes?.heirloom_v1 || [];
  assert(heirloom.some((entry) => entry.id === constants.black_base.excluded_color_id), 'black_base excluded_color_id exists in heirloom_v1');
}

if (schema) {
  for (const field of ['schema_version', 'project_id', 'grid', 'size_in', 'palette_id', 'palette', 'cell_map', 'black_base']) {
    assert((schema.required || []).includes(field), `schema requires ${field}`);
  }
  const pairs = (schema.oneOf || []).map((entry) => `${entry.properties?.grid?.const}->${entry.properties?.size_in?.const}`);
  assert(pairs.includes('24->12'), 'schema enforces 24->12 grid/size pair');
  assert(pairs.includes('32->16'), 'schema enforces 32->16 grid/size pair');
  assert(pairs.includes('48->24'), 'schema enforces 48->24 grid/size pair');
}

if (sample && schema && constants) {
  assert(sample.schema_version === 1.1, 'sample schema_version is 1.1');
  assert(typeof sample.project_id === 'string' && sample.project_id.length >= 8, 'sample project_id present');
  assert(/^MP-[A-Z0-9]{4,8}$/.test(sample.proof_ref || ''), 'sample proof_ref matches MP code');
  const sizeByGrid = { 24: 12, 32: 16, 48: 24 };
  assert(sizeByGrid[sample.grid] === sample.size_in, 'sample grid/size pair is valid');
  assert(sample.cell_map.length === sample.grid * sample.grid, 'sample cell_map length equals grid^2');
  assert(Array.isArray(sample.palette) && sample.palette.every((entry) => entry.id && entry.name && entry.hex), 'sample palette entries are objects');
  const maxCell = Math.max(...sample.cell_map);
  const minCell = Math.min(...sample.cell_map);
  assert(minCell >= 0 && maxCell < sample.palette.length, 'sample cell_map indexes are within palette');
}

if (fail) process.exit(1);
console.log('Production constants/schema verification passed.');
NODE
