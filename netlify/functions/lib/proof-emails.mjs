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

function imageExtension(mime) {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'png';
}

function safeFilenamePart(value) {
  return String(value || 'pending').replace(/[^A-Za-z0-9_-]+/g, '-');
}

function previewAttachment(proofRef, image) {
  if (!image || typeof image.base64 !== 'string' || !image.base64 || typeof image.mime !== 'string') return undefined;
  return {
    content: image.base64,
    filename: `mosaic-${safeFilenamePart(proofRef)}.${imageExtension(image.mime)}`,
    content_id: 'mosaic-preview',
    content_type: image.mime
  };
}

function withPreviewAttachment(email, proofRef, image) {
  const attachment = previewAttachment(proofRef, image);
  return attachment ? { ...email, attachments: [attachment] } : email;
}

function sectionText(title, rows) {
  return [title, ...rows.map(([label, value]) => `${label}: ${value}`)].join('\n');
}

function sectionHtml(title, rows) {
  const htmlRows = rows
    .map(([label, value]) => `<tr><th align="left">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join('');
  return `<h2>${escapeHtml(title)}</h2><table>${htmlRows}</table>`;
}

export function buildOperatorEmail(storedProject = {}, config = resolveProofEmailConfig(), image) {
  const proofRef = textValue(storedProject.proof_ref, 'Reference pending');
  const category = textValue(storedProject.photo_category, 'Category not provided');
  const size = formatInches(storedProject.finished_size_in);
  const price = formatPrice(storedProject.quoted_price_usd);
  const count = stickerCount(storedProject);
  const summary = `${size} · ${count} stickers · ${price}`;
  const sections = [
    ['Customer', [
      ['Name', textValue(storedProject.name)],
      ['Email', textValue(storedProject.email)]
    ]],
    ['Design', [
      ['Category', textValue(storedProject.photo_category)],
      ['Style', textValue(storedProject.style_preset_label || storedProject.style_preset_id)],
      ['Palette', `${textValue(storedProject.palette_tier)} · ${paletteColorCount(storedProject)} colors · ${textValue(storedProject.palette_mode)}`],
      ['Grid', textValue(storedProject.grid_size)],
      ['Background mode', textValue(storedProject.bg_mode)],
      ['Optimize fixes', textValue(storedProject.optimize_fixes, 'None')]
    ]],
    ['Order', [
      ['Price', price],
      ['Created at', textValue(storedProject.created_at)],
      ['Project ID', textValue(storedProject.project_id)],
      ['Preview blob key', textValue(storedProject.assets?.preview?.key)],
      ['Source blob key', textValue(storedProject.assets?.cropped_source?.key)]
    ]]
  ];
  const text = [
    summary,
    '',
    ...sections.flatMap(([title, rows], index) => [
      ...(index ? [''] : []),
      sectionText(title, rows)
    ])
  ].join('\n');
  const inlinePreview = previewAttachment(proofRef, image)
    ? '<p><img src="cid:mosaic-preview" alt="Customer mosaic preview" style="display:block;max-width:600px;width:100%;height:auto"></p>'
    : '';

  return withPreviewAttachment({
    to: config.operatorEmail,
    subject: `New proof request ${proofRef} — ${category} · ${size} · ${price}`,
    text,
    html: `<p><strong>${escapeHtml(summary)}</strong></p>${inlinePreview}${sections.map(([title, rows]) => sectionHtml(title, rows)).join('')}`
  }, proofRef, image);
}

export function buildCustomerEmail(storedProject = {}, config = resolveProofEmailConfig(), image) {
  const proofRef = textValue(storedProject.proof_ref, 'Reference pending');
  const name = textValue(storedProject.name, '');
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const text = [
    greeting,
    '',
    `Your design made it to us safely — reference ${proofRef}.`,
    '',
    'A real person is now checking your mosaic tile by tile: colors, detail, and how the face will read on the finished board. Within 1 business day you\'ll get your proof by email — the final design, exact price, and a simple way to approve it or ask for changes.',
    '',
    'Nothing is made and nothing is charged until you say so.',
    '',
    'Spotted something you want to change already — a different photo, size, or style? Just reply to this email and tell us.',
    '',
    '— MosaPack'
  ].join('\n');
  const inlinePreview = previewAttachment(proofRef, image)
    ? '<p><img src="cid:mosaic-preview" alt="Your mosaic preview" style="display:block;max-width:600px;width:100%;height:auto"></p>'
    : '';
  const html = [
    inlinePreview,
    `<p>${escapeHtml(greeting)}</p>`,
    `<p>Your design made it to us safely — reference <strong>${escapeHtml(proofRef)}</strong>.</p>`,
    '<p>A real person is now checking your mosaic tile by tile: colors, detail, and how the face will read on the finished board. Within 1 business day you\'ll get your proof by email — the final design, exact price, and a simple way to approve it or ask for changes.</p>',
    '<p>Nothing is made and nothing is charged until you say so.</p>',
    `<p>Spotted something you want to change already — a different photo, size, or style? Just <a href="mailto:${escapeHtml(config.replyTo)}">reply to this email</a> and tell us.</p>`,
    '<p>— MosaPack</p>'
  ].join('');

  return withPreviewAttachment({
    to: textValue(storedProject.email, ''),
    subject: `Your mosaic is being checked — ref ${proofRef}`,
    text,
    html
  }, proofRef, image);
}
