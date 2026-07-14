// Physical system constants: 0.375" tile pitch on fixed 16 x 16 panels.
export const TILE_PITCH_IN = 0.375
export const PANEL_SIZE_TILES = 16

// Real supplier colors (MyGobricks / Webrick) — extracted from production builder.
// MASTER ORDER matters: palette tiers are NESTED PREFIXES of this list
// (Simple-8 ⊂ Balanced-12 ⊂ Rich-18 ⊂ Studio-25), so roll inventory is
// always a prefix of the Master-25 — max 25 SKUs ever (see Suppliers and Colors).
export interface PaletteColor { name: string; hex: string }

export const PALETTE: PaletteColor[] = [
  // ── Simple-8: portraits stay possible at the cheapest tier ──
  { name: 'Black', hex: '#1B1B1B' },
  { name: 'White', hex: '#F4F4F4' },
  { name: 'Light Gray', hex: '#BFC5CA' },
  { name: 'Dark Gray', hex: '#7A838C' },
  { name: 'Tan', hex: '#D9C49F' },
  { name: 'Light Nougat', hex: '#E7C6B1' },
  { name: 'Reddish Brown', hex: '#7B3F00' },
  { name: 'Blue', hex: '#1653A4' },
  // ── Balanced-12 adds ──
  { name: 'Medium Nougat', hex: '#CC8E68' },
  { name: 'Red', hex: '#C40000' },
  { name: 'Yellow', hex: '#F1D54E' },
  { name: 'Green', hex: '#589E61' },
  // ── Rich-18 adds ──
  { name: 'Very Light Gray', hex: '#DBE1E6' },
  { name: 'Medium Gray', hex: '#9CA3A8' },
  { name: 'Dark Brown', hex: '#4E2D1B' },
  { name: 'Orange', hex: '#E58E2A' },
  { name: 'Dark Green', hex: '#2B5B3D' },
  { name: 'Light Blue', hex: '#7EAED6' },
  // ── Studio-25 adds ──
  { name: 'Very Dark Gray', hex: '#4A4E52' },
  { name: 'Dark Tan', hex: '#C2B280' },
  { name: 'Dark Red', hex: '#8B0000' },
  { name: 'Bright Red', hex: '#FF0000' },
  { name: 'Bright Green', hex: '#75B844' },
  { name: 'Sand Green', hex: '#8DA59B' },
  { name: 'Magenta', hex: '#B3277E' },
]

export interface PaletteTier { id: string; label: string; colors: number; blurb: string }
export const TIERS: PaletteTier[] = [
  { id: 'simple', label: 'Simple', colors: 8, blurb: 'bold poster look' },
  { id: 'balanced', label: 'Balanced', colors: 12, blurb: 'recommended' },
  { id: 'rich', label: 'Rich', colors: 18, blurb: 'smooth skin tones' },
  { id: 'studio', label: 'Studio', colors: 25, blurb: 'maximum fidelity' },
]

// ── Price matrix (USD) — edit here; the LivePriceBar and proof payload read this ──
export const PRICES: Record<number, Partial<Record<string, number>>> = {
  6: { simple: 19, balanced: 24 },
  12: { simple: 29, balanced: 35, rich: 42, studio: 49 },
  18: { simple: 45, balanced: 52, rich: 59, studio: 69 },
  24: { simple: 69, balanced: 79, rich: 89, studio: 99 },
}
export function kitPrice(sizeIn: number, tierId: string): number {
  return PRICES[sizeIn]?.[tierId] ?? PRICES[sizeIn]?.balanced ?? PRICES[12].balanced ?? 35
}
