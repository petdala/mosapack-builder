// =====================================================
// WOBRICK INTEGRATION MODULE FOR MOSAPACK BUILDER
// =====================================================
// This module adds Wobrick CSV export capability with proper
// Gobricks → LDraw → BrickLink color ID mapping

// =====================================================
// COMPREHENSIVE COLOR MAPPING
// =====================================================
const COLOR_MAPPING = {
  // Grayscale (8 shades)
  "Black": {gobricks: "080", ldraw: "0", bricklink: "11", hex: "#1B1B1B"},
  "Very Dark Gray": {gobricks: "074", ldraw: "72", bricklink: "85", hex: "#4A4E52"},
  "Dark Gray": {gobricks: "072", ldraw: "8", bricklink: "85", hex: "#7A838C"},
  "Medium Gray": {gobricks: "073", ldraw: "71", bricklink: "86", hex: "#9CA3A8"},
  "Light Gray": {gobricks: "071", ldraw: "7", bricklink: "9", hex: "#BFC5CA"},
  "Very Light Gray": {gobricks: "069", ldraw: "71", bricklink: "99", hex: "#DBE1E6"},
  "Off White": {gobricks: "091", ldraw: "71", bricklink: "103", hex: "#EAEDEF"},
  "White": {gobricks: "090", ldraw: "15", bricklink: "1", hex: "#F4F4F4"},
  
  // Browns & Tans (8 shades)
  "Very Dark Brown": {gobricks: "185", ldraw: "308", bricklink: "120", hex: "#3C2A1E"},
  "Dark Brown": {gobricks: "061", ldraw: "6", bricklink: "120", hex: "#4E2D1B"},
  "Reddish Brown": {gobricks: "062", ldraw: "70", bricklink: "88", hex: "#7B3F00"},
  "Medium Brown": {gobricks: "063", ldraw: "70", bricklink: "8", hex: "#996633"},
  "Dark Tan": {gobricks: "140", ldraw: "69", bricklink: "28", hex: "#C2B280"},
  "Tan": {gobricks: "064", ldraw: "2", bricklink: "2", hex: "#D9C49F"},
  "Light Nougat": {gobricks: "141", ldraw: "78", bricklink: "90", hex: "#E7C6B1"},
  "Medium Nougat": {gobricks: "189", ldraw: "84", bricklink: "150", hex: "#CC8E68"},
  
  // Reds & Pinks (5 shades)
  "Dark Red": {gobricks: "013", ldraw: "320", bricklink: "59", hex: "#8B0000"},
  "Red": {gobricks: "010", ldraw: "4", bricklink: "5", hex: "#C40000"},
  "Bright Red": {gobricks: "011", ldraw: "4", bricklink: "5", hex: "#FF0000"},
  "Coral": {gobricks: "153", ldraw: "353", bricklink: "220", hex: "#FF6B6B"},
  "Magenta": {gobricks: "023", ldraw: "26", bricklink: "71", hex: "#B3277E"},
  
  // Oranges & Yellows (4 shades)
  "Dark Orange": {gobricks: "020", ldraw: "484", bricklink: "68", hex: "#D97706"},
  "Orange": {gobricks: "021", ldraw: "25", bricklink: "4", hex: "#E58E2A"},
  "Bright Yellow": {gobricks: "031", ldraw: "14", bricklink: "103", hex: "#FFED4E"},
  "Yellow": {gobricks: "030", ldraw: "14", bricklink: "3", hex: "#F1D54E"},
  
  // Greens (6 shades)
  "Very Dark Green": {gobricks: "041", ldraw: "288", bricklink: "141", hex: "#1B3A2F"},
  "Dark Green": {gobricks: "040", ldraw: "2", bricklink: "80", hex: "#2B5B3D"},
  "Green": {gobricks: "042", ldraw: "2", bricklink: "6", hex: "#589E61"},
  "Bright Green": {gobricks: "043", ldraw: "10", bricklink: "36", hex: "#75B844"},
  "Lime": {gobricks: "155", ldraw: "27", bricklink: "34", hex: "#A8D76F"},
  "Sand Green": {gobricks: "145", ldraw: "378", bricklink: "48", hex: "#8DA59B"},
  
  // Blues (6 shades)
  "Very Dark Blue": {gobricks: "051", ldraw: "272", bricklink: "63", hex: "#0B2B5A"},
  "Dark Blue": {gobricks: "050", ldraw: "1", bricklink: "63", hex: "#1D4D8F"},
  "Blue": {gobricks: "052", ldraw: "1", bricklink: "7", hex: "#1653A4"},
  "Medium Blue": {gobricks: "157", ldraw: "1", bricklink: "102", hex: "#4C7EBC"},
  "Light Blue": {gobricks: "055", ldraw: "9", bricklink: "62", hex: "#7EAED6"},
  "Sky Blue": {gobricks: "158", ldraw: "212", bricklink: "87", hex: "#B4D8E7"},
  
  // Purples (3 shades)
  "Dark Purple": {gobricks: "195", ldraw: "85", bricklink: "89", hex: "#5B2C91"},
  "Purple": {gobricks: "196", ldraw: "85", bricklink: "89", hex: "#7C3AED"},
  "Lavender": {gobricks: "157", ldraw: "324", bricklink: "154", hex: "#B298DC"},
  
  // Flesh tones for portrait mode
  "Very Light Flesh": {gobricks: "142", ldraw: "78", bricklink: "90", hex: "#F6D7BB"},
  "Light Flesh": {gobricks: "143", ldraw: "78", bricklink: "78", hex: "#F2C5B8"},
  "Nougat": {gobricks: "188", ldraw: "78", bricklink: "28", hex: "#D09168"},
  "Flesh": {gobricks: "144", ldraw: "25", bricklink: "18", hex: "#C47074"},
  "Medium Dark Flesh": {gobricks: "189", ldraw: "84", bricklink: "150", hex: "#CC7025"},
  "Dark Flesh": {gobricks: "062", ldraw: "70", bricklink: "88", hex: "#7B3F00"}
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Get color mapping by name
function getColorMapping(colorName) {
  return COLOR_MAPPING[colorName] || {
    gobricks: "000",
    ldraw: "0",
    bricklink: "0",
    hex: "#000000"
  };
}

// Validate if color is available from Wobrick/Gobricks
function isColorAvailableFromSupplier(colorName) {
  return COLOR_MAPPING.hasOwnProperty(colorName);
}

// =====================================================
// WOBRICK CSV EXPORT (Studio Format)
// =====================================================

function downloadWobrickCSV() {
  if (!processedData) {
    showToast('Generate a mosaic first', 'error');
    return;
  }
  
  // Studio CSV Format Headers
  const headers = [
    'BLItemNo',
    'ElementId', 
    'LdrawId',
    'PartName',
    'BLColorId',
    'LDrawColorId',
    'ColorName',
    'ColorCategory',
    'Qty',
    'Weight'
  ];
  
  const rows = [headers.join(',')];
  
  // Add brick rows for each color
  let totalBricks = 0;
  processedData.palette.forEach((color, i) => {
    const count = processedData.counts[i];
    if (count === 0) return;
    
    const mapping = getColorMapping(color.name);
    
    // Check if color is available
    if (!isColorAvailableFromSupplier(color.name)) {
      console.warn(`Warning: ${color.name} may not be available from Wobrick`);
    }
    
    // Element ID format: Part number + Color ID (padded)
    const elementId = `30050${mapping.bricklink.padStart(3, '0')}`;
    
    rows.push([
      '3005',                    // BLItemNo (1x1 brick)
      elementId,                 // ElementId
      '3005',                    // LdrawId
      'Brick 1x1',              // PartName
      mapping.bricklink,         // BLColorId
      mapping.ldraw,             // LDrawColorId
      color.name,                // ColorName
      'Standard',                // ColorCategory
      count,                     // Qty
      ''                         // Weight (optional)
    ].join(','));
    
    totalBricks += count;
  });
  
  // Add baseplates if brick product
  if (currentProductType === 'bricks') {
    const baseplates = currentSize <= 48 ? 1 : 
                      currentSize === 64 ? 4 :
                      currentSize === 96 ? 9 : 16;
    
    // Add baseplate row (white 32x32 or 48x48)
    const baseplateSize = currentSize <= 48 ? 32 : 48;
    const baseplatePart = baseplateSize === 32 ? '3811' : '4186';
    
    rows.push([
      baseplatePart,             // BLItemNo
      `${baseplatePart}001`,     // ElementId
      baseplatePart,             // LdrawId
      `Baseplate ${baseplateSize}x${baseplateSize}`, // PartName
      '1',                       // BLColorId (White)
      '15',                      // LDrawColorId (White)
      'White',                   // ColorName
      'Baseplate',               // ColorCategory
      baseplates,                // Qty
      ''                         // Weight
    ].join(','));
  }
  
  // Add metadata comments
  rows.push('');
  rows.push(`# MosaPack Export - ${new Date().toISOString()}`);
  rows.push(`# Product: ${currentProductType === 'bricks' ? 'Brick Kit' : 'Sticker Pack'}`);
  rows.push(`# Size: ${currentSize}x${currentSize} studs`);
  rows.push(`# Total Bricks: ${totalBricks}`);
  rows.push(`# Unique Colors: ${processedData.counts.filter(c => c > 0).length}`);
  rows.push(`# Palette: ${currentPalette}`);
  rows.push(`# Style Preset: ${currentPreset}`);
  
  // Create and download file
  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mosapack-wobrick-${currentSize}x${currentSize}-${Date.now()}.csv`;
  link.click();
  
  setTimeout(() => URL.revokeObjectURL(url), 100);
  showToast('Wobrick CSV exported! Upload to wobrick.com/toolkit');
}

// =====================================================
// ALTERNATIVE: REBRICKABLE CSV EXPORT
// =====================================================

function downloadRebrickableCSV() {
  if (!processedData) {
    showToast('Generate a mosaic first', 'error');
    return;
  }
  
  // Simpler Rebrickable format
  const headers = ['Part', 'Color', 'Quantity', 'Condition'];
  const rows = [headers.join(',')];
  
  processedData.palette.forEach((color, i) => {
    const count = processedData.counts[i];
    if (count === 0) return;
    
    const mapping = getColorMapping(color.name);
    
    rows.push([
      '3005',                    // Part (1x1 brick)
      mapping.bricklink,         // Color (BrickLink ID)
      count,                     // Quantity
      'N'                        // Condition (New)
    ].join(','));
  });
  
  // Add baseplates
  if (currentProductType === 'bricks') {
    const baseplates = currentSize <= 48 ? 1 : 
                      currentSize === 64 ? 4 :
                      currentSize === 96 ? 9 : 16;
    
    const baseplateSize = currentSize <= 48 ? 32 : 48;
    const baseplatePart = baseplateSize === 32 ? '3811' : '4186';
    
    rows.push([baseplatePart, '1', baseplates, 'N'].join(','));
  }
  
  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mosapack-rebrickable-${currentSize}x${currentSize}.csv`;
  link.click();
  
  setTimeout(() => URL.revokeObjectURL(url), 100);
  showToast('Rebrickable CSV exported!');
}

// =====================================================
// COLOR AVAILABILITY FILTER
// =====================================================

// Filter palette to only show colors available from Wobrick
function filterPaletteByAvailability(palette) {
  return palette.filter(color => isColorAvailableFromSupplier(color.name));
}

// Get list of unavailable colors in current design
function getUnavailableColors() {
  if (!processedData) return [];
  
  const unavailable = [];
  processedData.palette.forEach((color, i) => {
    if (processedData.counts[i] > 0 && !isColorAvailableFromSupplier(color.name)) {
      unavailable.push({
        name: color.name,
        count: processedData.counts[i],
        hex: color.hex
      });
    }
  });
  
  return unavailable;
}

// =====================================================
// VALIDATION & DIAGNOSTICS
// =====================================================

function validateWobrickExport() {
  if (!processedData) {
    return {
      valid: false,
      errors: ['No mosaic generated yet']
    };
  }
  
  const errors = [];
  const warnings = [];
  
  // Check total quantity
  const totalBricks = processedData.counts.reduce((sum, count) => sum + count, 0);
  const expectedBricks = currentSize * currentSize;
  
  if (totalBricks !== expectedBricks) {
    errors.push(`Brick count mismatch: ${totalBricks} vs expected ${expectedBricks}`);
  }
  
  // Check color availability
  const unavailable = getUnavailableColors();
  if (unavailable.length > 0) {
    warnings.push(`${unavailable.length} colors may not be available from Wobrick:`);
    unavailable.forEach(c => {
      warnings.push(`  - ${c.name} (${c.count} pieces)`);
    });
  }
  
  // Check for zero-count colors
  const activeColors = processedData.counts.filter(c => c > 0).length;
  if (activeColors === 0) {
    errors.push('No colors used in design');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalBricks,
    activeColors,
    unavailableColors: unavailable
  };
}

// Export validation report
function downloadValidationReport() {
  const validation = validateWobrickExport();
  
  const report = [
    '# MosaPack Wobrick Export Validation Report',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Configuration',
    `- Size: ${currentSize}x${currentSize}`,
    `- Product: ${currentProductType}`,
    `- Palette: ${currentPalette}`,
    `- Preset: ${currentPreset}`,
    '',
    '## Validation Results',
    `- Status: ${validation.valid ? '✓ PASS' : '✗ FAIL'}`,
    `- Total Bricks: ${validation.totalBricks}`,
    `- Active Colors: ${validation.activeColors}`,
    '',
    '## Errors',
    ...validation.errors.map(e => `- ${e}`),
    '',
    '## Warnings',
    ...validation.warnings.map(w => `- ${w}`),
    '',
    '## Next Steps',
    validation.valid ? 
      '1. Export Wobrick CSV using the export button' :
      '1. Fix the errors listed above before exporting',
    '2. Visit wobrick.com/toolkit',
    '3. Upload the CSV file',
    '4. Review pricing and stock availability',
    '5. Complete checkout',
    ''
  ].join('\n');
  
  const blob = new Blob([report], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mosapack-validation-${Date.now()}.md`;
  link.click();
  
  setTimeout(() => URL.revokeObjectURL(url), 100);
  showToast('Validation report downloaded');
}

// =====================================================
// SUPPLIER COST COMPARISON
// =====================================================

function generateSupplierComparison() {
  if (!processedData) {
    showToast('Generate a mosaic first', 'error');
    return;
  }
  
  const totalBricks = processedData.counts.reduce((sum, count) => sum + count, 0);
  const uniqueColors = processedData.counts.filter(c => c > 0).length;
  
  // Supplier pricing (per brick)
  const suppliers = {
    'Wobrick': 0.03,
    'MyGobricks': 0.03,
    'BrickPatible': 0.065,
    'JoyGobricks': 0.04,
    'LEGO Official': 0.08
  };
  
  // Calculate costs
  const comparison = Object.entries(suppliers).map(([name, price]) => {
    const brickCost = totalBricks * price;
    const baseplates = currentProductType === 'bricks' ?
      (currentSize <= 48 ? 1 : currentSize === 64 ? 4 : currentSize === 96 ? 9 : 16) : 0;
    const baseplateCost = baseplates * 6;
    const total = brickCost + baseplateCost;
    
    return {
      supplier: name,
      pricePerBrick: price,
      brickCost: brickCost.toFixed(2),
      baseplateCost: baseplateCost.toFixed(2),
      total: total.toFixed(2),
      savings: suppliers['LEGO Official'] ? 
        ((suppliers['LEGO Official'] - price) / suppliers['LEGO Official'] * 100).toFixed(0) : 0
    };
  });
  
  // Sort by total cost
  comparison.sort((a, b) => parseFloat(a.total) - parseFloat(b.total));
  
  // Generate report
  const report = [
    `Supplier,Price/Brick,Brick Cost,Baseplate Cost,Total,Savings vs LEGO`,
    ...comparison.map(c => 
      `${c.supplier},$${c.pricePerBrick},$${c.brickCost},$${c.baseplateCost},$${c.total},${c.savings}%`
    )
  ].join('\n');
  
  const blob = new Blob([report], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mosapack-supplier-comparison-${currentSize}x${currentSize}.csv`;
  link.click();
  
  setTimeout(() => URL.revokeObjectURL(url), 100);
  showToast('Supplier comparison downloaded');
}

// =====================================================
// REAL-TIME VALIDATION STATUS
// =====================================================

function updateWobrickStatus() {
  if (!processedData) return;

  const validation = validateWobrickExport();

  // Log validation results for diagnostics
  if (validation.warnings.length > 0) {
    console.warn('Wobrick Export Warnings:', validation.warnings);
  }

  if (!validation.valid) {
    console.error('Wobrick Export Errors:', validation.errors);
  }

  // Optional: Show toast notification for unavailable colors
  if (validation.unavailableColors.length > 0) {
    const colorList = validation.unavailableColors.map(c => c.name).join(', ');
    console.info(`Note: ${validation.unavailableColors.length} colors may need substitution: ${colorList}`);
  }

  return validation;
}

// =====================================================
// EXPORT MODULE
// =====================================================

// Make functions available globally
if (typeof window !== 'undefined') {
  window.WobrickIntegration = {
    downloadWobrickCSV,
    downloadRebrickableCSV,
    downloadValidationReport,
    generateSupplierComparison,
    validateWobrickExport,
    updateWobrickStatus,
    getColorMapping,
    isColorAvailableFromSupplier,
    filterPaletteByAvailability,
    getUnavailableColors,
    COLOR_MAPPING
  };

  // Make key functions available at global scope for easy access
  window.downloadWobrickCSV = downloadWobrickCSV;
  window.updateWobrickStatus = updateWobrickStatus;
}
