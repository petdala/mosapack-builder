import { expect, test } from '@playwright/test'

import { FIXED_MASTER_HEX } from '@/lib/adaptivePalette'
import { PALETTE } from '@/lib/palette'

test('adaptive fixed fallback stays synchronized with Master-25', () => {
  expect(FIXED_MASTER_HEX).toEqual(PALETTE.map((color) => color.hex))
})
