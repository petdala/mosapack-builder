import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const PROJECT_STORE = 'mosapack-projects';
const ASSET_STORE = 'mosapack-project-assets';

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function getEnv(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name] || '';
}

function safeTokenMatch(value, expected) {
  if (!value || !expected) return false;
  const valueBuffer = Buffer.from(value, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer);
}

function sanitizeProjectId(projectId) {
  return /^[a-f0-9-]{36}$/i.test(projectId || '') ? projectId : '';
}

function mimeToDataUrlPrefix(mime) {
  return `data:${mime || 'application/octet-stream'};base64,`;
}

async function readAsset(assetStore, asset) {
  if (!asset?.key) return null;
  const blob = await assetStore.getWithMetadata(asset.key, { type: 'arrayBuffer' });
  if (!blob) return null;
  const mime = blob.metadata?.content_type || asset.mime || 'application/octet-stream';
  return {
    key: asset.key,
    mime,
    bytes: blob.data?.byteLength || 0,
    data_url: mimeToDataUrlPrefix(mime) + Buffer.from(blob.data).toString('base64')
  };
}

export default async function handler(request) {
  if (request.method !== 'GET') {
    return json(405, { ok: false, error: 'Method not allowed.' });
  }

  const adminToken = getEnv('MOSA_ADMIN_TOKEN');
  if (!adminToken) {
    return json(500, { ok: false, error: 'Admin retrieval is disabled until MOSA_ADMIN_TOKEN is configured.' });
  }

  const suppliedToken = request.headers.get('x-mosa-admin-token') || '';
  if (!safeTokenMatch(suppliedToken, adminToken)) {
    return json(401, { ok: false, error: 'Unauthorized.' });
  }

  const url = new URL(request.url);
  const projectId = sanitizeProjectId(url.searchParams.get('project_id'));
  if (!projectId) {
    return json(400, { ok: false, error: 'A valid project_id is required.' });
  }

  try {
    const projectStore = getStore({ name: PROJECT_STORE, consistency: 'strong' });
    const assetStore = getStore({ name: ASSET_STORE, consistency: 'strong' });
    const project = await projectStore.get(`projects/${projectId}/project.json`, { type: 'json' });

    if (!project) {
      return json(404, { ok: false, error: 'Project not found.' });
    }

    const croppedSource = await readAsset(assetStore, project.assets?.cropped_source);
    const preview = await readAsset(assetStore, project.assets?.preview);

    return json(200, {
      ok: true,
      project,
      assets: {
        cropped_source: croppedSource,
        preview
      }
    });
  } catch (error) {
    console.error('get-project failed', { project_id: projectId, message: error.message });
    return json(500, { ok: false, error: 'Unable to retrieve project.' });
  }
}
