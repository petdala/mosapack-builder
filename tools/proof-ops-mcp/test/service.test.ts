import assert from 'node:assert/strict';
import test from 'node:test';

import { decodeCursor } from '../src/cursor.js';
import { handledKey, parseProjectKey, ProofOpsService } from '../src/service.js';
import type { BlobStoreClient, ProofOpsStores, StoredProject } from '../src/types.js';

class MemoryStore implements BlobStoreClient {
  readonly values = new Map<string, unknown>();

  constructor(entries: Record<string, unknown> = {}) {
    for (const [key, value] of Object.entries(entries)) this.values.set(key, value);
  }

  async listKeys(prefix: string): Promise<string[]> {
    return [...this.values.keys()].filter((key) => key.startsWith(prefix)).sort();
  }

  async getJson<T>(key: string): Promise<T | null> {
    return (this.values.get(key) as T | undefined) ?? null;
  }

  async getBytes(key: string): Promise<ArrayBuffer | null> {
    const value = this.values.get(key);
    return value instanceof ArrayBuffer ? value : null;
  }

  async setJson(key: string, value: unknown): Promise<void> {
    this.values.set(key, structuredClone(value));
  }
}

function project(id: string, createdAt: string, extra: Partial<StoredProject> = {}): StoredProject {
  return {
    project_id: id,
    proof_ref: `MP-${id.toUpperCase()}`,
    created_at: createdAt,
    name: `Customer ${id}`,
    email: `${id}@example.com`,
    photo_category: 'family',
    finished_size_in: 19.2,
    quoted_price_usd: 119,
    palette_tier: 'Gallery',
    grid_size: 48,
    tile_map: [0, 1, 2],
    assets: {
      preview: { key: `projects/${id}/preview.png`, mime: 'image/png' },
      cropped_source: { key: `projects/${id}/cropped-source.jpg`, mime: 'image/jpeg' }
    },
    ...extra
  };
}

function fixture(): { service: ProofOpsService; stores: ProofOpsStores; ops: MemoryStore } {
  const projects = new MemoryStore({
    'projects/alpha/project.json': project('alpha', '2026-07-20T12:00:00.000Z'),
    'projects/bravo/project.json': project('bravo', '2026-07-22T12:00:00.000Z'),
    'projects/charlie/project.json': project('charlie', '2026-07-21T12:00:00.000Z')
  });
  const assets = new MemoryStore({
    'projects/alpha/preview.png': new Uint8Array([1, 2, 3]).buffer
  });
  const ops = new MemoryStore({
    [handledKey('charlie')]: {
      project_id: 'charlie',
      handled: true,
      handled_at: '2026-07-22T09:00:00.000Z',
      note: 'Proof sent',
      updated_at: '2026-07-22T09:00:00.000Z'
    }
  });
  const stores = { projects, assets, ops };
  return {
    service: new ProofOpsService(stores, () => new Date('2026-07-23T12:00:00.000Z')),
    stores,
    ops
  };
}

test('project blob keys parse only canonical project JSON entries', () => {
  assert.equal(parseProjectKey('projects/alpha/project.json'), 'alpha');
  assert.equal(parseProjectKey('projects/alpha/preview.png'), null);
  assert.equal(parseProjectKey('projects/nested/alpha/project.json'), null);
  assert.equal(parseProjectKey('other/alpha/project.json'), null);
});

test('list joins handled status and sorts the three-request fixture newest first', async () => {
  const { service } = fixture();
  const all = await service.listRequests({ status: 'all' });
  assert.deepEqual(all.requests.map(({ project_id }) => project_id), ['bravo', 'charlie', 'alpha']);
  assert.equal(all.requests[1].handled, true);
  assert.equal(all.requests[1].handled_note, 'Proof sent');

  const pending = await service.listRequests();
  assert.deepEqual(pending.requests.map(({ project_id }) => project_id), ['bravo', 'alpha']);
});

test('opaque pagination cursor resumes the same status-filtered queue', async () => {
  const { service } = fixture();
  const first = await service.listRequests({ status: 'new', limit: 1 });
  assert.deepEqual(first.requests.map(({ project_id }) => project_id), ['bravo']);
  assert.ok(first.next_cursor);
  assert.equal(decodeCursor(first.next_cursor, 'new'), 1);

  const second = await service.listRequests({
    status: 'new',
    limit: 1,
    cursor: first.next_cursor ?? undefined
  });
  assert.deepEqual(second.requests.map(({ project_id }) => project_id), ['alpha']);
  assert.equal(second.next_cursor, null);
  await assert.rejects(
    service.listRequests({ status: 'handled', cursor: first.next_cursor ?? undefined }),
    /Invalid cursor/
  );
});

test('mark handled and unhandled round-trip only through the ops store', async () => {
  const { service, stores, ops } = fixture();
  const projectKeysBefore = await stores.projects.listKeys('projects/');
  const handled = await service.markHandled('alpha', 'Ready for Derek');
  assert.equal(handled.handled, true);
  assert.equal(handled.handled_at, '2026-07-23T12:00:00.000Z');
  assert.equal((await service.markHandled('alpha', 'Ready for Derek')).handled_at, handled.handled_at);

  const unhandled = await service.markUnhandled('alpha', 'Needs another pass');
  assert.equal(unhandled.handled, false);
  assert.equal(unhandled.handled_at, null);
  assert.equal(unhandled.note, 'Needs another pass');
  assert.deepEqual(await stores.projects.listKeys('projects/'), projectKeysBefore);
  assert.deepEqual(await ops.getJson(handledKey('alpha')), unhandled);
});

test('queue stats report the oldest unhandled age for SLA review', async () => {
  const { service } = fixture();
  assert.deepEqual(await service.queueStats(), {
    total: 3,
    new: 2,
    handled: 1,
    oldest_unhandled_created_at: '2026-07-20T12:00:00.000Z',
    oldest_unhandled_age_hours: 72
  });
});
