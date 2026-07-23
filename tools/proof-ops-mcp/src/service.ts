import { decodeCursor, encodeCursor } from './cursor.js';
import type {
  AssetKind,
  HandledStatus,
  ListRequestsResult,
  PreviewAsset,
  ProofOpsStores,
  QueueStats,
  QueueStatusFilter,
  RequestSummary,
  StoredProject
} from './types.js';

const PROJECT_PREFIX = 'projects/';
const PROJECT_SUFFIX = '/project.json';
const HANDLED_PREFIX = 'handled/';

export function parseProjectKey(key: string): string | null {
  if (!key.startsWith(PROJECT_PREFIX) || !key.endsWith(PROJECT_SUFFIX)) return null;
  const projectId = key.slice(PROJECT_PREFIX.length, -PROJECT_SUFFIX.length);
  return projectId && !projectId.includes('/') ? projectId : null;
}

export function handledKey(projectId: string): string {
  return `${HANDLED_PREFIX}${projectId}.json`;
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeHandled(projectId: string, value: Partial<HandledStatus> | null): HandledStatus {
  return {
    project_id: projectId,
    handled: value?.handled === true,
    handled_at: value?.handled === true ? nullableString(value.handled_at) : null,
    note: cleanString(value?.note),
    updated_at: nullableString(value?.updated_at)
  };
}

function summarize(projectId: string, project: StoredProject, status: HandledStatus): RequestSummary {
  return {
    project_id: projectId,
    proof_ref: nullableString(project.proof_ref),
    created_at: nullableString(project.created_at),
    name: cleanString(project.name),
    email: cleanString(project.email),
    photo_category: cleanString(project.photo_category),
    finished_size_in: nullableNumber(project.finished_size_in),
    quoted_price_usd: nullableNumber(project.quoted_price_usd),
    palette_tier: nullableString(project.palette_tier),
    grid_size: nullableNumber(project.grid_size),
    handled: status.handled,
    handled_at: status.handled_at,
    handled_note: status.note
  };
}

function createdAtMillis(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mimeFromKey(key: string): string {
  const extension = key.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  return 'image/png';
}

function levenshtein(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i++) {
    const current = [i];
    for (let j = 1; j <= right.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1)
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

export class ProofOpsService {
  constructor(
    private readonly stores: ProofOpsStores,
    private readonly now: () => Date = () => new Date()
  ) {}

  private async projectIds(): Promise<string[]> {
    const keys = await this.stores.projects.listKeys(PROJECT_PREFIX);
    return [...new Set(keys.map(parseProjectKey).filter((value): value is string => value !== null))];
  }

  private async statusFor(projectId: string): Promise<HandledStatus> {
    const value = await this.stores.ops.getJson<Partial<HandledStatus>>(handledKey(projectId));
    return normalizeHandled(projectId, value);
  }

  private async projectFor(projectId: string): Promise<StoredProject | null> {
    return this.stores.projects.getJson<StoredProject>(`${PROJECT_PREFIX}${projectId}${PROJECT_SUFFIX}`);
  }

  private async requireProject(projectId: string): Promise<StoredProject> {
    const project = await this.projectFor(projectId);
    if (project) return project;
    const ids = await this.projectIds();
    const nearest = ids
      .map((id) => ({ id, distance: levenshtein(projectId, id) }))
      .sort((left, right) => left.distance - right.distance || left.id.localeCompare(right.id))
      .slice(0, 3)
      .map(({ id }) => id);
    const suggestion = nearest.length ? ` Nearest project IDs: ${nearest.join(', ')}.` : '';
    throw new Error(
      `Project "${projectId}" was not found. Call proofops_list_requests to inspect the queue.${suggestion}`
    );
  }

  private async allSummaries(): Promise<RequestSummary[]> {
    const ids = await this.projectIds();
    const rows = await Promise.all(ids.map(async (projectId) => {
      const [project, status] = await Promise.all([this.projectFor(projectId), this.statusFor(projectId)]);
      return project ? summarize(projectId, project, status) : null;
    }));
    return rows
      .filter((value): value is RequestSummary => value !== null)
      .sort((left, right) => {
        const dateOrder = createdAtMillis(right.created_at) - createdAtMillis(left.created_at);
        return dateOrder || right.project_id.localeCompare(left.project_id);
      });
  }

  async listRequests(options: {
    status?: QueueStatusFilter;
    limit?: number;
    cursor?: string;
  } = {}): Promise<ListRequestsResult> {
    const status = options.status ?? 'new';
    const limit = Math.min(100, Math.max(1, Math.trunc(options.limit ?? 20)));
    const offset = decodeCursor(options.cursor, status);
    const all = await this.allSummaries();
    const filtered = status === 'all' ? all : all.filter((request) => request.handled === (status === 'handled'));
    const requests = filtered.slice(offset, offset + limit);
    const nextOffset = offset + requests.length;
    return {
      status,
      requests,
      count: requests.length,
      next_cursor: nextOffset < filtered.length ? encodeCursor(nextOffset, status) : null
    };
  }

  async getRequest(projectId: string, includeTileMap = false): Promise<{
    request: StoredProject;
    status: HandledStatus;
  }> {
    const project = await this.requireProject(projectId);
    const request = includeTileMap ? { ...project } : { ...project, tile_map: undefined };
    if (!includeTileMap) delete request.tile_map;
    return { request, status: await this.statusFor(projectId) };
  }

  async getPreview(projectId: string, asset: AssetKind = 'preview'): Promise<PreviewAsset> {
    const project = await this.requireProject(projectId);
    const storedAsset = project.assets?.[asset];
    const key = storedAsset?.key;
    if (!key) {
      throw new Error(
        `Project "${projectId}" has no ${asset} asset key. Call proofops_get_request to inspect its stored assets.`
      );
    }
    const data = await this.stores.assets.getBytes(key);
    if (!data) {
      throw new Error(
        `The ${asset} blob for project "${projectId}" was not found at "${key}". ` +
        'Call proofops_get_request to confirm the stored key.'
      );
    }
    return {
      project_id: projectId,
      asset,
      key,
      mime: storedAsset.mime || mimeFromKey(key),
      bytes: data.byteLength,
      data
    };
  }

  async markHandled(projectId: string, note = ''): Promise<HandledStatus> {
    await this.requireProject(projectId);
    const existing = await this.statusFor(projectId);
    if (existing.handled && (!note || note === existing.note)) return existing;
    const timestamp = existing.handled_at ?? this.now().toISOString();
    const status: HandledStatus = {
      project_id: projectId,
      handled: true,
      handled_at: timestamp,
      note: note || existing.note,
      updated_at: this.now().toISOString()
    };
    await this.stores.ops.setJson(handledKey(projectId), status);
    return status;
  }

  async markUnhandled(projectId: string, note = ''): Promise<HandledStatus> {
    await this.requireProject(projectId);
    const existing = await this.statusFor(projectId);
    if (!existing.handled && (!note || note === existing.note) && existing.updated_at) return existing;
    const status: HandledStatus = {
      project_id: projectId,
      handled: false,
      handled_at: null,
      note: note || existing.note,
      updated_at: this.now().toISOString()
    };
    await this.stores.ops.setJson(handledKey(projectId), status);
    return status;
  }

  async queueStats(): Promise<QueueStats> {
    const summaries = await this.allSummaries();
    const unhandled = summaries.filter((request) => !request.handled);
    const oldest = unhandled
      .filter((request) => createdAtMillis(request.created_at) > 0)
      .sort((left, right) => createdAtMillis(left.created_at) - createdAtMillis(right.created_at))[0];
    const oldestMillis = oldest ? createdAtMillis(oldest.created_at) : 0;
    return {
      total: summaries.length,
      new: unhandled.length,
      handled: summaries.length - unhandled.length,
      oldest_unhandled_created_at: oldest?.created_at ?? null,
      oldest_unhandled_age_hours: oldestMillis
        ? Math.max(0, Math.round((this.now().getTime() - oldestMillis) / 36_000) / 100)
        : null
    };
  }
}
