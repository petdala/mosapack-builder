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

export default async function handler(request) {
  if (request.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed.' });
  }

  const adminToken = getEnv('MOSA_ADMIN_TOKEN');
  if (!adminToken) {
    return json(500, { ok: false, error: 'Project deletion is disabled until MOSA_ADMIN_TOKEN is configured.' });
  }

  const suppliedToken = request.headers.get('x-mosa-admin-token') || '';
  if (!safeTokenMatch(suppliedToken, adminToken)) {
    return json(401, { ok: false, error: 'Unauthorized.' });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON payload.' });
  }

  const projectId = sanitizeProjectId(payload.project_id);
  if (!projectId) {
    return json(400, { ok: false, error: 'A valid project_id is required.' });
  }

  try {
    const projectStore = getStore({ name: PROJECT_STORE, consistency: 'strong' });
    const assetStore = getStore({ name: ASSET_STORE, consistency: 'strong' });
    const projectKey = `projects/${projectId}/project.json`;
    const project = await projectStore.get(projectKey, { type: 'json' });

    await projectStore.delete(projectKey);
    if (project?.assets?.cropped_source?.key) await assetStore.delete(project.assets.cropped_source.key);
    if (project?.assets?.preview?.key) await assetStore.delete(project.assets.preview.key);

    return json(200, { ok: true, deleted: true, project_id: projectId });
  } catch (error) {
    console.error('delete-project failed', { project_id: projectId, message: error.message });
    return json(500, { ok: false, error: 'Unable to delete project.' });
  }
}
