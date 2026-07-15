// Funnel analytics (audit §8) + proof-request submission (production contract preserved).

declare global {
  interface Window { gtag?: (...args: unknown[]) => void }
}

export function track(event: string, params: Record<string, unknown> = {}) {
  try { window.gtag?.('event', event, params) } catch { /* analytics must never break the flow */ }
}

export interface ProofRequest {
  name: string
  email: string
  photoCategory: string
  formatInterest: string
  formatLabel: string
  preferredSizeIn: number
  preferredSizeLabel: string
  styleId: string
  styleLabel: string
  paletteTier: string
  paletteColors: number
  quotedPriceUsd: number
  gridSize: number
  panelGrid: number
  panelSizeTiles: number
  fineTune: { brightness: number; contrast: number; background: number }
  croppedSourceDataUrl: string
  previewImageDataUrl: string
  colorCounts: Record<string, number>
  /** Per-cell palette indices, row-major — the manufacturing map the backend expects. */
  tileMap: number[]
  palette: { name: string; hex: string }[]
}

function ref(): string {
  const t = Date.now().toString(36).toUpperCase()
  const r = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `MP-${t.slice(-5)}${r}`
}

function q(name: string): string | null {
  try { return new URLSearchParams(window.location.search).get(name) } catch { return null }
}

export async function submitProofRequest(p: ProofRequest): Promise<{ ok: boolean; proofRef: string; simulated: boolean }> {
  const proofRef = ref()
  const timestamp = new Date().toISOString()
  const payload = {
    schema_version: 'proof_request.v1',
    save_version: 'v7',
    project_id: `mp7_${proofRef}`,
    proof_ref: proofRef,
    consent_to_store_design: true,
    email: p.email,
    name: p.name,
    photo_category: p.photoCategory,
    selected_vertical: p.photoCategory,
    recommended_format: p.formatInterest,
    selected_format: p.formatInterest,
    format_interest: p.formatInterest,
    format_interest_label: p.formatLabel,
    preferred_size_in: p.preferredSizeIn,
    preferred_size_label: p.preferredSizeLabel,
    preview_tweaks: p.fineTune,
    style_preset_id: p.styleId,
    style_preset_label: p.styleLabel,
    palette_tier: p.paletteTier,
    palette_colors: p.paletteColors,
    quoted_price_usd: p.quotedPriceUsd,
    request_type: 'custom_proof',
    rights_notice_shown: true,
    grid_size: `${p.gridSize}x${p.gridSize}`,
    panel_grid: p.panelGrid,
    panel_size_tiles: p.panelSizeTiles,
    preview_shape: 'mosaic',
    cropped_source_data_url: p.croppedSourceDataUrl,
    preview_image_data_url: p.previewImageDataUrl,
    color_counts: p.colorCounts,
    tile_map: p.tileMap,
    palette: p.palette,
    bom_summary: {
      total_tiles: p.gridSize * p.gridSize,
      unique_colors: Object.keys(p.colorCounts).length,
      grid_size: `${p.gridSize}x${p.gridSize}`,
      panel_grid: p.panelGrid,
      panel_size_tiles: p.panelSizeTiles,
    },
    source_file_metadata: { stored_source: 'cropped_approved_source_only', full_original_saved: false },
    utm: { source: q('utm_source'), medium: q('utm_medium'), campaign: q('utm_campaign') },
    page: window.location.pathname || '/builder/',
    source: 'builder-proof-request',
    app_version: 'builder-v7',
    timestamp,
  }
  try {
    const res = await fetch('/.netlify/functions/save-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) return { ok: true, proofRef, simulated: false }
    throw new Error(`HTTP ${res.status}`)
  } catch (e) {
    // Preview environments (artifact sandbox, local file) have no backend — simulate
    // so the flow can be reviewed end-to-end. On the real domain, surface the failure.
    const host = window.location.hostname
    const isProd = host.includes('mosapack') || host.includes('netlify')
    if (!isProd) return { ok: true, proofRef, simulated: true }
    return { ok: false, proofRef, simulated: false }
  }
}
