import { STYLES } from './mosaic'
import type { StylePreset } from './mosaic'

export interface CuratedVariant {
  id: 'true_color' | 'bright_pop' | 'soft_heirloom' | 'bold_graphic'
  label: string
  note: string
}

export const CURATED_VARIANTS: CuratedVariant[] = [
  { id: 'true_color', label: 'True Color', note: 'Natural and balanced' },
  { id: 'bright_pop', label: 'Vivid', note: 'Bright, joyful color' },
  { id: 'soft_heirloom', label: 'Soft', note: 'Warm and gentle' },
  { id: 'bold_graphic', label: 'Bold', note: 'Crisp, strong contrast' },
]

export function curatedVariantStyle(id: string): StylePreset {
  return STYLES.find((style) => style.id === id) ?? STYLES[0]
}
