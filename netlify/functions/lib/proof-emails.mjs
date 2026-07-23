const DEFAULT_OPERATOR_EMAIL = 'hello@mosapack.com';
const DEFAULT_REPLY_TO = 'hello@mosapack.com';

function configuredEmail(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function resolveProofEmailConfig(env = {}) {
  return {
    operatorEmail: configuredEmail(env.PROOF_OPERATOR_EMAIL, DEFAULT_OPERATOR_EMAIL),
    replyTo: configuredEmail(env.PROOF_REPLY_TO, DEFAULT_REPLY_TO)
  };
}

function textValue(value, fallback = 'Not provided') {
  if (value === null || value === undefined || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatInches(value) {
  return value === null || value === undefined || value === '' ? 'Size not provided' : `${value}″`;
}

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return 'Price not provided';
  const amount = Number(value);
  return Number.isFinite(amount) ? `$${amount.toFixed(Number.isInteger(amount) ? 0 : 2)}` : textValue(value);
}

function paletteColorCount(project) {
  if (project.palette_colors !== null && project.palette_colors !== undefined && project.palette_colors !== '') {
    return textValue(project.palette_colors);
  }
  if (Array.isArray(project.adaptive_palette)) return String(project.adaptive_palette.length);
  if (Array.isArray(project.palette)) return String(project.palette.length);
  return 'Not provided';
}

function stickerCount(project) {
  return Array.isArray(project.tile_map) ? String(project.tile_map.length) : 'Not provided';
}

function operatorRows(project) {
  return [
    ['Name', textValue(project.name)],
    ['Email', textValue(project.email)],
    ['Category', textValue(project.photo_category)],
    ['Style', textValue(project.style_preset_label || project.style_preset_id)],
    ['Palette tier', textValue(project.palette_tier)],
    ['Palette colors', paletteColorCount(project)],
    ['Palette mode', textValue(project.palette_mode)],
    ['Grid', textValue(project.grid_size)],
    ['Finished size', formatInches(project.finished_size_in)],
    ['Sticker count', stickerCount(project)],
    ['Price', formatPrice(project.quoted_price_usd)],
    ['Background mode', textValue(project.bg_mode)],
    ['Optimize fixes', textValue(project.optimize_fixes)],
    ['Created at', textValue(project.created_at)],
    ['Project ID', textValue(project.project_id)],
    ['Preview blob key', textValue(project.assets?.preview?.key)],
    ['Source blob key', textValue(project.assets?.cropped_source?.key)]
  ];
}

export function buildOperatorEmail(storedProject = {}, config = resolveProofEmailConfig()) {
  const proofRef = textValue(storedProject.proof_ref, 'Reference pending');
  const category = textValue(storedProject.photo_category, 'Category not provided');
  const size = formatInches(storedProject.finished_size_in);
  const price = formatPrice(storedProject.quoted_price_usd);
  const rows = operatorRows(storedProject);
  const text = [
    `New MosaPack proof request ${proofRef}`,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`)
  ].join('\n');
  const htmlRows = rows
    .map(([label, value]) => `<tr><th align="left">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join('');

  return {
    to: config.operatorEmail,
    subject: `New proof request ${proofRef} — ${category} · ${size} · ${price}`,
    text,
    html: `<h1>New MosaPack proof request ${escapeHtml(proofRef)}</h1><table>${htmlRows}</table>`
  };
}

export function buildCustomerEmail(storedProject = {}, config = resolveProofEmailConfig()) {
  const proofRef = textValue(storedProject.proof_ref, 'Reference pending');
  const name = textValue(storedProject.name, '');
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const text = [
    greeting,
    '',
    `We received your MosaPack design. Your reference is ${proofRef}.`,
    '',
    'A person is checking your design, and your proof will arrive by email within 1 business day.',
    'Nothing is made or charged today.',
    '',
    `Questions? Reply to this email or contact ${config.replyTo}.`,
    '',
    'MosaPack'
  ].join('\n');
  const html = [
    `<p>${escapeHtml(greeting)}</p>`,
    `<p>We received your MosaPack design. Your reference is <strong>${escapeHtml(proofRef)}</strong>.</p>`,
    '<p>A person is checking your design, and your proof will arrive by email within 1 business day.</p>',
    '<p>Nothing is made or charged today.</p>',
    `<p>Questions? Reply to this email or contact <a href="mailto:${escapeHtml(config.replyTo)}">${escapeHtml(config.replyTo)}</a>.</p>`,
    '<p>MosaPack</p>'
  ].join('');

  return {
    to: textValue(storedProject.email, ''),
    subject: `We received your MosaPack design — ${proofRef}`,
    text,
    html
  };
}
