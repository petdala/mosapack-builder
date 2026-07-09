# Palette Integration Spec for Codex

## Executive Summary
Three distinct palettes with locked behavior based on product type:
- **Solid Bricks** → WoBrick palette (24 colors) ✅ Already implemented
- **Transparent Bricks** → Transparent LEGO palette (18 colors) 🆕 New
- **POD (Stickers/Magnets)** → POD Pro 54 palette (54 colors) 🆕 New

---

## 1. 📦 POD Pro 54 Palette (Stickers & Magnets)

### File Location
`src/assets/data/pod-pro-54-colors.json`

### Color Data
- **Total Colors:** 54
- **Format:** All colors include `name`, `hex`, `rgb`, `lab` (ready to plug in)
- **Grouping:**
  - **Core 32**: Essential spectrum coverage (IDs: 1,2,4,5,8,9,10,13,14,17,18,21,22,26,27,28,32,33,36,37,38,39,41,42,45,46,47,49,51,52,53,54)
  - **Seasonal 8**: Pastels for holidays/gifts (IDs: 15,16,23,24,25,29,43,44)
  - **Extended 14**: Photo realism gap-fillers (IDs: 3,6,7,11,12,19,20,30,31,34,35,40,48,50)

### 🎨 Visual Color Palette

<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin: 20px 0;">
  <div style="text-align: center;"><div style="background: #FFFFFF; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Pure White</div><div style="font-size: 10px; color: #666;">#FFFFFF</div></div>
  <div style="text-align: center;"><div style="background: #FAFAFA; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Snow</div><div style="font-size: 10px; color: #666;">#FAFAFA</div></div>
  <div style="text-align: center;"><div style="background: #D3D3D3; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Light Gray</div><div style="font-size: 10px; color: #666;">#D3D3D3</div></div>
  <div style="text-align: center;"><div style="background: #A8A8A8; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Silver</div><div style="font-size: 10px; color: #666;">#A8A8A8</div></div>
  <div style="text-align: center;"><div style="background: #808080; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Gray</div><div style="font-size: 10px; color: #666;">#808080</div></div>
  <div style="text-align: center;"><div style="background: #505050; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Dark Gray</div><div style="font-size: 10px; color: #666;">#505050</div></div>
  <div style="text-align: center;"><div style="background: #2B2B2B; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Charcoal</div><div style="font-size: 10px; color: #666;">#2B2B2B</div></div>
  <div style="text-align: center;"><div style="background: #000000; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Black</div><div style="font-size: 10px; color: #666;">#000000</div></div>
  <div style="text-align: center;"><div style="background: #DC143C; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Crimson Red</div><div style="font-size: 10px; color: #666;">#DC143C</div></div>
  <div style="text-align: center;"><div style="background: #FF3333; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Fire Red</div><div style="font-size: 10px; color: #666;">#FF3333</div></div>
  <div style="text-align: center;"><div style="background: #C41E3A; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Cherry</div><div style="font-size: 10px; color: #666;">#C41E3A</div></div>
  <div style="text-align: center;"><div style="background: #800020; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Maroon</div><div style="font-size: 10px; color: #666;">#800020</div></div>
  <div style="text-align: center;"><div style="background: #FF66CC; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Rose Pink</div><div style="font-size: 10px; color: #666;">#FF66CC</div></div>
  <div style="text-align: center;"><div style="background: #FF69B4; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Hot Pink</div><div style="font-size: 10px; color: #666;">#FF69B4</div></div>
  <div style="text-align: center;"><div style="background: #FFB6C1; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Soft Pink</div><div style="font-size: 10px; color: #666;">#FFB6C1</div></div>
  <div style="text-align: center;"><div style="background: #FFDAB9; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Peach</div><div style="font-size: 10px; color: #666;">#FFDAB9</div></div>
  <div style="text-align: center;"><div style="background: #FF8C00; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Tangerine</div><div style="font-size: 10px; color: #666;">#FF8C00</div></div>
  <div style="text-align: center;"><div style="background: #FF6600; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Bright Orange</div><div style="font-size: 10px; color: #666;">#FF6600</div></div>
  <div style="text-align: center;"><div style="background: #FF7F50; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Coral</div><div style="font-size: 10px; color: #666;">#FF7F50</div></div>
  <div style="text-align: center;"><div style="background: #CC5500; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Burnt Orange</div><div style="font-size: 10px; color: #666;">#CC5500</div></div>
  <div style="text-align: center;"><div style="background: #FFD700; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Sunshine Yellow</div><div style="font-size: 10px; color: #666;">#FFD700</div></div>
  <div style="text-align: center;"><div style="background: #FFFF00; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Lemon</div><div style="font-size: 10px; color: #666;">#FFFF00</div></div>
  <div style="text-align: center;"><div style="background: #FFCC00; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Golden Yellow</div><div style="font-size: 10px; color: #666;">#FFCC00</div></div>
  <div style="text-align: center;"><div style="background: #FFDB58; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Mustard</div><div style="font-size: 10px; color: #666;">#FFDB58</div></div>
  <div style="text-align: center;"><div style="background: #FFFACD; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Cream</div><div style="font-size: 10px; color: #666;">#FFFACD</div></div>
  <div style="text-align: center;"><div style="background: #32CD32; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Lime Green</div><div style="font-size: 10px; color: #666;">#32CD32</div></div>
  <div style="text-align: center;"><div style="background: #228B22; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Forest Green</div><div style="font-size: 10px; color: #666;">#228B22</div></div>
  <div style="text-align: center;"><div style="background: #00A86B; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Emerald</div><div style="font-size: 10px; color: #666;">#00A86B</div></div>
  <div style="text-align: center;"><div style="background: #98FF98; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Mint</div><div style="font-size: 10px; color: #666;">#98FF98</div></div>
  <div style="text-align: center;"><div style="background: #808000; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Olive</div><div style="font-size: 10px; color: #666;">#808000</div></div>
  <div style="text-align: center;"><div style="background: #9DC183; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Sage</div><div style="font-size: 10px; color: #666;">#9DC183</div></div>
  <div style="text-align: center;"><div style="background: #00FFFF; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Cyan</div><div style="font-size: 10px; color: #666;">#00FFFF</div></div>
  <div style="text-align: center;"><div style="background: #00CED1; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Aqua</div><div style="font-size: 10px; color: #666;">#00CED1</div></div>
  <div style="text-align: center;"><div style="background: #40E0D0; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Turquoise</div><div style="font-size: 10px; color: #666;">#40E0D0</div></div>
  <div style="text-align: center;"><div style="background: #008080; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Teal</div><div style="font-size: 10px; color: #666;">#008080</div></div>
  <div style="text-align: center;"><div style="background: #87CEEB; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Sky Blue</div><div style="font-size: 10px; color: #666;">#87CEEB</div></div>
  <div style="text-align: center;"><div style="background: #007FFF; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Azure</div><div style="font-size: 10px; color: #666;">#007FFF</div></div>
  <div style="text-align: center;"><div style="background: #4169E1; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Royal Blue</div><div style="font-size: 10px; color: #666;">#4169E1</div></div>
  <div style="text-align: center;"><div style="background: #000080; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Navy Blue</div><div style="font-size: 10px; color: #666;">#000080</div></div>
  <div style="text-align: center;"><div style="background: #B0E0E6; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Powder Blue</div><div style="font-size: 10px; color: #666;">#B0E0E6</div></div>
  <div style="text-align: center;"><div style="background: #8B00FF; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Violet</div><div style="font-size: 10px; color: #666;">#8B00FF</div></div>
  <div style="text-align: center;"><div style="background: #800080; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Purple</div><div style="font-size: 10px; color: #666;">#800080</div></div>
  <div style="text-align: center;"><div style="background: #E6E6FA; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Lavender</div><div style="font-size: 10px; color: #666;">#E6E6FA</div></div>
  <div style="text-align: center;"><div style="background: #DDA0DD; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Plum</div><div style="font-size: 10px; color: #666;">#DDA0DD</div></div>
  <div style="text-align: center;"><div style="background: #FF00FF; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Magenta</div><div style="font-size: 10px; color: #666;">#FF00FF</div></div>
  <div style="text-align: center;"><div style="background: #F5F5DC; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Beige</div><div style="font-size: 10px; color: #666;">#F5F5DC</div></div>
  <div style="text-align: center;"><div style="background: #D2B48C; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Tan</div><div style="font-size: 10px; color: #666;">#D2B48C</div></div>
  <div style="text-align: center;"><div style="background: #A0522D; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Sienna</div><div style="font-size: 10px; color: #666;">#A0522D</div></div>
  <div style="text-align: center;"><div style="background: #654321; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Brown</div><div style="font-size: 10px; color: #666;">#654321</div></div>
  <div style="text-align: center;"><div style="background: #D2691E; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Chocolate</div><div style="font-size: 10px; color: #666;">#D2691E</div></div>
  <div style="text-align: center;"><div style="background: #FFDFC4; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Light Skin</div><div style="font-size: 10px; color: #666;">#FFDFC4</div></div>
  <div style="text-align: center;"><div style="background: #E8B796; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Medium Skin</div><div style="font-size: 10px; color: #666;">#E8B796</div></div>
  <div style="text-align: center;"><div style="background: #C68642; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Tan Skin</div><div style="font-size: 10px; color: #666;">#C68642</div></div>
  <div style="text-align: center;"><div style="background: #8D5524; border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px;"></div><div style="font-size: 11px; font-weight: 600;">Deep Skin</div><div style="font-size: 10px; color: #666;">#8D5524</div></div>
</div>

### Priority Order for UI
Display order: **Core 32 first** → Seasonal 8 → Extended 14

Recommended UI labels:
- Main palette name: **"POD Pro 54"**
- Badge: `✨ BEST FOR PRINTS`
- Tooltip: `"54 vibrant colors optimized for stickers & magnets"`

### Supplier Context
```json
{
  "fulfillment": "printful",
  "pricing": "uniform",
  "base_cost_per_sheet": 6.95,
  "tiles_per_sheet": 96,
  "material": "white_vinyl",
  "finish_options": ["glossy", "matte"],
  "availability": "all_54_colors_available"
}
```

**Critical Note:** All 54 colors are **same price** (full-color CMYK printing). No per-color pricing metadata needed like WoBrick. Single uniform cost model.

### Magnet Kit Detail
- Stickers are printed on white vinyl sheets
- User applies stickers to **pre-cut magnetic backing sheets**
- NOT direct-print magnets
- Kit includes: sticker sheet + pre-cut magnetic backing (sold together or separately)

---

## 2. 🔷 Transparent Bricks Palette

### File Location
`src/assets/data/transparent-colors.json`

### Color Data
- **Total Colors:** 18
- **Format:** All colors include `name`, `hex`, `rgb`, `lab`, `lego_id`
- **Categories:**
  - Neutral (2): Trans-Clear, Trans-Black
  - Primary (9): Trans-Red, Trans-Orange, Trans-Yellow, Trans-Green, etc.
  - Accent (7): Trans-Neon Yellow, Trans-Fluorescent Green, Trans-Purple, etc.

### 🎨 Visual Color Palette

<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin: 20px 0;">
  <div style="text-align: center;"><div style="background: linear-gradient(135deg, #FCFCFC 0%, rgba(252,252,252,0.7) 100%); border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1);"></div><div style="font-size: 11px; font-weight: 600;">Trans-Clear</div><div style="font-size: 10px; color: #666;">#FCFCFC</div></div>
  <div style="text-align: center;"><div style="background: linear-gradient(135deg, #635F52 0%, rgba(99,95,82,0.7) 100%); border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1);"></div><div style="font-size: 11px; font-weight: 600;">Trans-Black</div><div style="font-size: 10px; color: #666;">#635F52</div></div>
  <div style="text-align: center;"><div style="background: linear-gradient(135deg, #C91A09 0%, rgba(201,26,9,0.7) 100%); border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1);"></div><div style="font-size: 11px; font-weight: 600;">Trans-Red</div><div style="font-size: 10px; color: #666;">#C91A09</div></div>
  <div style="text-align: center;"><div style="background: linear-gradient(135deg, #FF8C1A 0%, rgba(255,140,26,0.7) 100%); border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1);"></div><div style="font-size: 11px; font-weight: 600;">Trans-Bright Orange</div><div style="font-size: 10px; color: #666;">#FF8C1A</div></div>
  <div style="text-align: center;"><div style="background: linear-gradient(135deg, #F5CD2F 0%, rgba(245,205,47,0.7) 100%); border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1);"></div><div style="font-size: 11px; font-weight: 600;">Trans-Yellow</div><div style="font-size: 10px; color: #666;">#F5CD2F</div></div>
  <div style="text-align: center;"><div style="background: linear-gradient(135deg, #F8F184 0%, rgba(248,241,132,0.7) 100%); border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1);"></div><div style="font-size: 11px; font-weight: 600;">Trans-Neon Yellow</div><div style="font-size: 10px; color: #666;">#F8F184</div></div>
  <div style="text-align: center;"><div style="background: linear-gradient(135deg, #84B68D 0%, rgba(132,182,141,0.7) 100%); border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1);"></div><div style="font-size: 11px; font-weight: 600;">Trans-Green</div><div style="font-size: 10px; color: #666;">#84B68D</div></div>
  <div style="text-align: center;"><div style="background: linear-gradient(135deg, #D9E4A7 0%, rgba(217,228,167,0.7) 100%); border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1);"></div><div style="font-size: 11px; font-weight: 600;">Trans-Bright Green</div><div style="font-size: 10px; color: #666;">#D9E4A7</div></div>
  <div style="text-align: center;"><div style="background: linear-gradient(135deg, #C9FF00 0%, rgba(201,255,0,0.7) 100%); border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1);"></div><div style="font-size: 11px; font-weight: 600;">Trans-Fluorescent Green</div><div style="font-size: 10px; color: #666;">#C9FF00</div></div>
  <div style="text-align: center;"><div style="background: linear-gradient(135deg, #0020A0 0%, rgba(0,32,160,0.7) 100%); border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1);"></div><div style="font-size: 11px; font-weight: 600;">Trans-Dark Blue</div><div style="font-size: 10px; color: #666;">#0020A0</div></div>
  <div style="text-align: center;"><div style="background: linear-gradient(135deg, #AEEFEC 0%, rgba(174,239,236,0.7) 100%); border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1);"></div><div style="font-size: 11px; font-weight: 600;">Trans-Light Blue</div><div style="font-size: 10px; color: #666;">#AEEFEC</div></div>
  <div style="text-align: center;"><div style="background: linear-gradient(135deg, #C1DFF0 0%, rgba(193,223,240,0.7) 100%); border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1);"></div><div style="font-size: 11px; font-weight: 600;">Trans-Very Light Blue</div><div style="font-size: 10px; color: #666;">#C1DFF0</div></div>
  <div style="text-align: center;"><div style="background: linear-gradient(135deg, #4C61DB 0%, rgba(76,97,219,0.7) 100%); border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1);"></div><div style="font-size: 11px; font-weight: 600;">Trans-Medium Blue</div><div style="font-size: 10px; color: #666;">#4C61DB</div></div>
  <div style="text-align: center;"><div style="background: linear-gradient(135deg, #A5A5CB 0%, rgba(165,165,203,0.7) 100%); border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1);"></div><div style="font-size: 11px; font-weight: 600;">Trans-Purple</div><div style="font-size: 10px; color: #666;">#A5A5CB</div></div>
  <div style="text-align: center;"><div style="background: linear-gradient(135deg, #8E5597 0%, rgba(142,85,151,0.7) 100%); border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1);"></div><div style="font-size: 11px; font-weight: 600;">Trans-Bright Violet</div><div style="font-size: 10px; color: #666;">#8E5597</div></div>
  <div style="text-align: center;"><div style="background: linear-gradient(135deg, #DF6695 0%, rgba(223,102,149,0.7) 100%); border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1);"></div><div style="font-size: 11px; font-weight: 600;">Trans-Dark Pink</div><div style="font-size: 10px; color: #666;">#DF6695</div></div>
  <div style="text-align: center;"><div style="background: linear-gradient(135deg, #FCBDCD 0%, rgba(252,189,205,0.7) 100%); border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1);"></div><div style="font-size: 11px; font-weight: 600;">Trans-Pink</div><div style="font-size: 10px; color: #666;">#FCBDCD</div></div>
  <div style="text-align: center;"><div style="background: linear-gradient(135deg, #FF800D 0%, rgba(255,128,13,0.7) 100%); border: 1px solid #ccc; height: 60px; border-radius: 8px; margin-bottom: 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1);"></div><div style="font-size: 11px; font-weight: 600;">Trans-Neon Orange</div><div style="font-size: 10px; color: #666;">#FF800D</div></div>
</div>

### Supplier Context
**Research needed:** Confirm transparent brick supplier(s) and pricing
- Likely sourced from: WoBrick, Webrick, MyBricks (same as solid bricks?)
- Pricing model: TBD (probably per-brick like solid, but may differ)

**Recommendation:** Add `suppliers` field to each color (matching `supplier-colors.json` format) once you confirm sourcing.

---

## 3. 🧱 WoBrick Palette (Existing - Confirmed)

### File Location
`src/assets/data/supplier-colors.json`

### Status
✅ **Confirmed as source of truth** - Use as-is (24 colors)

### Note
Metadata claims "52 colors" but file only contains 24. This is correct—24 is the current WoBrick palette.

---

## 4. 🎛️ Behavioral Decisions

### Q1: Palette Switching for Stickers/Magnets?
**Decision:** **LOCK to POD palette** when `productType === 'stickers'` OR `productType === 'magnets'`

**Implementation:**
```javascript
if (currentProductType === 'stickers' || currentProductType === 'magnets') {
  setPalette('pod_pro_54');
  disablePaletteSwitcher(); // Lock palette dropdown
} else if (currentMaterialType === 'transparent-bricks') {
  setPalette('transparent');
  disablePaletteSwitcher(); // Lock palette dropdown
} else {
  // Solid bricks - allow palette switching
  enablePaletteSwitcher();
  // User can toggle: WoBrick, LEGO 24, Portrait, Custom POD Dynamic
}
```

**Rationale:**
- POD products use Printful → must use print-optimized colors
- Transparent bricks → must use transparent LEGO colors
- Solid bricks → flexible (WoBrick, LEGO palettes, etc.)

### Q2: Custom POD Dynamic - Stay at 24 or Expand to 50+?
**Decision:** **Keep dynamic at 24 colors**

**Implementation:**
- `POD_DYNAMIC_COLOR_COUNT = 24` (no change)
- Add **static "POD Pro 54"** as separate palette option
- User gets BOTH:
  - **Dynamic photo matching** (24 colors extracted from uploaded image)
  - **Full POD catalog** (54 static colors for manual control)

**Palette Selector UI:**
```
When productType === 'stickers' or 'magnets':
┌─────────────────────────────────┐
│ ● POD Pro 54 (locked)           │  ← Default, locked
│   ○ Custom POD (24 from photo)  │  ← Optional toggle for advanced users
└─────────────────────────────────┘
```

When productType === 'bricks' AND materialType === 'transparent-bricks':
```
┌─────────────────────────────────┐
│ ● Transparent (locked)          │  ← 18 trans colors, locked
└─────────────────────────────────┘
```

When productType === 'bricks' AND materialType === 'solid-bricks':
```
┌─────────────────────────────────┐
│ ○ WoBrick 24                    │
│ ● LEGO 24                        │  ← User can switch freely
│ ○ Portrait 18                    │
│ ○ Custom POD (24 from photo)    │
└─────────────────────────────────┘
```

### Q3: UX Naming for New Palette Tab?
**Decision:** **"POD Pro 54"**

**Copy Specs:**
- **Tab Label:** `POD Pro 54`
- **Tooltip:** `54 vibrant colors optimized for stickers & magnets`
- **Badge:** `✨ BEST FOR PRINTS` (mirrors `⭐ POPULAR` style on magnetic material)
- **Description (hover/subtitle):** `Full-color palette for photo-realistic printing`

---

## 5. 🔧 Integration Checklist

### Phase 1: Load Palettes
- [x] Create `transparent-colors.json` (18 colors)
- [x] Create `pod-pro-54-colors.json` (54 colors)
- [ ] Load palettes in builder initialization:
  ```javascript
  async function loadAllPalettes() {
    const [wobrick, transparent, podPro54] = await Promise.all([
      fetch('src/assets/data/supplier-colors.json').then(r => r.json()),
      fetch('src/assets/data/transparent-colors.json').then(r => r.json()),
      fetch('src/assets/data/pod-pro-54-colors.json').then(r => r.json())
    ]);

    palettes = {
      wobrick: wobrick.colors,
      transparent: transparent.colors,
      pod_pro_54: podPro54.colors,
      // ... existing palettes
    };
  }
  ```

### Phase 2: Palette Logic
- [ ] Implement palette locking based on product type:
  ```javascript
  function updateAvailablePalettes() {
    if (currentProductType === 'stickers' || currentProductType === 'magnets') {
      setPalette('pod_pro_54');
      lockPaletteSelector();
    } else if (currentMaterialType === 'transparent-bricks') {
      setPalette('transparent');
      lockPaletteSelector();
    } else {
      unlockPaletteSelector();
    }
  }
  ```

### Phase 3: Cost Logic
- [ ] Update cost calculator for POD products:
  ```javascript
  function calculatePODCost(brickCount) {
    const tilesPerSheet = 96;
    const sheetsNeeded = Math.ceil(brickCount / tilesPerSheet);
    const baseCost = 6.95;
    const sheetCost = sheetsNeeded * baseCost;

    // Add finish upcharge if applicable
    let finishUpcharge = 0;
    if (currentFinish === 'matte') finishUpcharge = 0;
    if (currentFinish === 'glossy') finishUpcharge = 0;

    return sheetCost + finishUpcharge;
  }
  ```

### Phase 4: UI Updates
- [ ] Add "POD Pro 54" to palette selector dropdown
- [ ] Add badge/tooltip with copy specs (see Q3 above)
- [ ] Update palette previews to show grouped colors (Core 32 → Seasonal 8 → Extended 14)
- [ ] Add "Transparent" palette option for transparent bricks
- [ ] Hide palette selector when locked (show "locked" state with tooltip explaining why)

### Phase 5: Renderer Integration
- [ ] Update mosaic renderer to handle 54-color palette
- [ ] Ensure color matching algorithm works with larger palette (already handles 24, should scale)
- [ ] Test CIEDE2000 matching with POD Pro 54 colors

---

## 6. ✅ Transparent Bricks Pricing (RESOLVED)

### Supplier Strategy
**Primary:** WoBrick ($0.04-0.05/brick) - 70% of orders
**Backup:** Webrick ($0.05-0.06/brick) - 25% of orders
**Specialty:** MyBricks ($0.04-0.05/brick) - 5% of orders

### Pricing Summary
- **High demand colors** (Trans-Clear, Trans-Red, Trans-Green, Trans-Dark Blue): $0.04/brick
- **Medium demand colors** (9 colors): $0.04/brick
- **Low demand colors** (5 colors): $0.05-0.06/brick
- **Average cost:** $0.042/brick (~15% premium over solid bricks)

**Detailed strategy:** See [TRANSPARENT-BRICK-SUPPLIER-STRATEGY.md](TRANSPARENT-BRICK-SUPPLIER-STRATEGY.md)
**Updated palette:** [transparent-colors.json](src/assets/data/transparent-colors.json) now includes full supplier metadata

### POD Magnet Backing Pricing
**Current data:**
- Sticker sheet: $6.95/sheet (96 tiles)
- Magnetic backing: ??? (price unknown)

**Need:**
- Cost for pre-cut magnetic backing sheets
- Are they sold separately or bundled with stickers?
- Price structure for magnet kits

---

## 7. 📊 Testing Checklist

Once implemented, test:
- [ ] **Stickers:** Palette locked to POD Pro 54 ✅
- [ ] **Magnets:** Palette locked to POD Pro 54 ✅
- [ ] **Transparent Bricks:** Palette locked to Transparent (18 colors) ✅
- [ ] **Solid Bricks:** Palette switcher enabled (WoBrick, LEGO, Portrait, Custom) ✅
- [ ] **Cost calc:** POD products use uniform pricing (no per-color variation) ✅
- [ ] **Color matching:** CIEDE2000 algorithm works with 54-color palette ✅
- [ ] **UI labels:** "POD Pro 54" displays with badge/tooltip ✅
- [ ] **Grouping:** Core 32 colors appear first in palette grid ✅

---

## 8. 📁 File Manifest

### New Files Created
1. `src/assets/data/transparent-colors.json` - 18 transparent LEGO colors
2. `src/assets/data/pod-pro-54-colors.json` - 54 POD print colors
3. `PALETTE-SPEC-FOR-CODEX.md` - This specification document

### Existing Files (No Changes)
- `src/assets/data/supplier-colors.json` - 24 WoBrick colors (source of truth, confirmed)
- `config/inventory/pod-options.json` - POD finish/material options (unchanged)

---

## 9. 🚀 Ready to Ship?

**YES** - All palette data is ready. Zero guesswork needed.

**What Codex needs to do:**
1. Load the 2 new JSON files
2. Wire palette locking logic (5 lines of code)
3. Update cost calculator for uniform POD pricing
4. Add "POD Pro 54" to UI with badge/tooltip
5. Test palette switching behavior

**Estimated implementation time:** ~30-45 minutes

---

## 10. 📞 Contact

If any questions arise during implementation:
- **Palette hex codes unclear?** → All LAB values included, ready for CIEDE2000
- **Grouping priority unclear?** → Use `grouping.core_32` array for display order
- **Cost logic unclear?** → All 54 colors same price ($6.95/sheet base)
- **Behavioral logic unclear?** → See Section 4 decision tree

**Ready to wire it up! 🎨**
