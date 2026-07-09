import { Buffer } from 'node:buffer';
import { getStore } from '@netlify/blobs';

const SAVE_VERSION = 'b2-v1';
const PROJECT_STORE = 'mosapack-projects';
const ASSET_STORE = 'mosapack-project-assets';
const MAX_DATA_URL_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_JSON_BYTES = 6 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function isAllowedOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'https:' && hostname !== 'localhost' && hostname !== '127.0.0.1') return false;
    return hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === 'mosapack.netlify.app' ||
      hostname.endsWith('--mosapack.netlify.app');
  } catch {
    return false;
  }
}

function approximateJsonBytes(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function requireString(payload, field) {
  return typeof payload[field] === 'string' && payload[field].trim().length > 0;
}

function validatePayload(payload) {
  const missing = [];
  for (const field of ['save_version', 'email', 'photo_category', 'recommended_format', 'crop_state', 'render_settings', 'grid_size', 'preview_image_data_url', 'project_snapshot']) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') missing.push(field);
  }
  if (!payload.selected_format && !payload.product_interest) missing.push('selected_format_or_product_interest');
  if (!payload.cropped_source_data_url && !payload.approved_source_data_url) missing.push('cropped_source_or_approved_source_data_url');
  if (missing.length) return `Missing required fields: ${missing.join(', ')}`;
  if (payload.save_version !== SAVE_VERSION) return `Unsupported save_version: ${payload.save_version}`;
  if (payload.consent_to_store_design !== true) return 'Consent to store design is required.';
  if (!requireString(payload, 'email') || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email)) return 'A valid email is required.';
  if (typeof payload.crop_state !== 'object' || Array.isArray(payload.crop_state)) return 'crop_state must be an object.';
  if (typeof payload.render_settings !== 'object' || Array.isArray(payload.render_settings)) return 'render_settings must be an object.';
  if (typeof payload.project_snapshot !== 'object' || Array.isArray(payload.project_snapshot)) return 'project_snapshot must be an object.';
  return '';
}

function parseDataUrl(dataUrl, label) {
  if (typeof dataUrl !== 'string') {
    throw new Error(`${label} must be a data URL.`);
  }
  const match = dataUrl.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new Error(`${label} must be a base64 data URL.`);
  }
  const mime = match[1].toLowerCase();
  if (!ALLOWED_IMAGE_MIME.has(mime)) {
    throw new Error(`${label} must be JPEG, PNG, or WebP.`);
  }
  const base64 = match[2];
  const byteLength = Math.floor((base64.length * 3) / 4);
  if (byteLength > MAX_DATA_URL_BYTES) {
    throw new Error(`${label} exceeds the 3MB image limit.`);
  }
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.byteLength || buffer.byteLength > MAX_DATA_URL_BYTES) {
    throw new Error(`${label} is empty or too large.`);
  }
  const extension = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
  return { mime, extension, buffer };
}

function arrayBufferFromBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed.' });
  }

  if (!isAllowedOrigin(request)) {
    return json(403, { ok: false, error: 'Origin not allowed.' });
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return json(415, { ok: false, error: 'Content-Type must be application/json.' });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_TOTAL_JSON_BYTES) {
    return json(413, { ok: false, error: 'Project payload is too large.' });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON payload.' });
  }

  if (approximateJsonBytes(payload) > MAX_TOTAL_JSON_BYTES) {
    return json(413, { ok: false, error: 'Project payload is too large.' });
  }

  const validationError = validatePayload(payload);
  if (validationError) {
    return json(400, { ok: false, error: validationError });
  }

  let croppedSource;
  let previewImage;
  try {
    croppedSource = parseDataUrl(payload.cropped_source_data_url || payload.approved_source_data_url, 'approved source image');
    previewImage = parseDataUrl(payload.preview_image_data_url, 'preview image');
  } catch (error) {
    return json(400, { ok: false, error: error.message });
  }

  const projectId = crypto.randomUUID();
  const savedAt = new Date().toISOString();
  const selectedFormat = payload.selected_format || payload.product_interest || '';
  const appVersion = payload.app_version || 'canonical-builder';
  const projectKey = `projects/${projectId}/project.json`;
  const sourceKey = `projects/${projectId}/cropped-source.${croppedSource.extension}`;
  const previewKey = `projects/${projectId}/preview.${previewImage.extension}`;
  const metadata = {
    project_id: projectId,
    created_at: savedAt,
    photo_category: String(payload.photo_category || ''),
    recommended_format: String(payload.recommended_format || ''),
    selected_format: String(selectedFormat),
    app_version: String(appVersion),
    save_version: SAVE_VERSION
  };

  const storedProject = {
    project_id: projectId,
    created_at: savedAt,
    save_version: SAVE_VERSION,
    design_storage: 'netlify_blobs',
    retention_days: 30,
    email: payload.email,
    name: payload.name || '',
    photo_category: payload.photo_category,
    selected_vertical: payload.selected_vertical || payload.photo_category,
    recommended_format: payload.recommended_format,
    selected_format: selectedFormat,
    product_interest: payload.product_interest || selectedFormat,
    crop_state: payload.crop_state,
    render_settings: payload.render_settings,
    grid_size: payload.grid_size,
    preview_shape: payload.preview_shape || '',
    palette: payload.palette || null,
    color_counts: payload.color_counts || null,
    bom_summary: payload.bom_summary || null,
    tile_map: payload.tile_map || null,
    project_snapshot: payload.project_snapshot,
    source_file_metadata: payload.source_file_metadata || null,
    notes: payload.notes || '',
    utm: payload.utm || {},
    page: payload.page || '',
    source: payload.source || '',
    consent_to_store_design: true,
    assets: {
      cropped_source: { key: sourceKey, mime: croppedSource.mime, bytes: croppedSource.buffer.byteLength },
      preview: { key: previewKey, mime: previewImage.mime, bytes: previewImage.buffer.byteLength }
    }
  };

  try {
    const projectStore = getStore({ name: PROJECT_STORE, consistency: 'strong' });
    const assetStore = getStore({ name: ASSET_STORE, consistency: 'strong' });

    await assetStore.set(sourceKey, arrayBufferFromBuffer(croppedSource.buffer), {
      metadata: { ...metadata, asset_type: 'cropped_source', content_type: croppedSource.mime }
    });
    await assetStore.set(previewKey, arrayBufferFromBuffer(previewImage.buffer), {
      metadata: { ...metadata, asset_type: 'preview', content_type: previewImage.mime }
    });
    await projectStore.setJSON(projectKey, storedProject, { metadata });
  } catch (error) {
    console.error('save-project failed', { project_id: projectId, message: error.message });
    return json(500, { ok: false, error: 'Unable to save project.' });
  }

  return json(200, {
    ok: true,
    project_id: projectId,
    saved_at: savedAt,
    save_version: SAVE_VERSION
  });
}
