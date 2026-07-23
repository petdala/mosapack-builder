export type QueueStatusFilter = 'new' | 'handled' | 'all';
export type AssetKind = 'preview' | 'cropped_source';

export type StoredAsset = {
  key?: string;
  mime?: string;
  bytes?: number;
};

export type StoredProject = {
  project_id?: string;
  proof_ref?: string | null;
  created_at?: string;
  name?: string;
  email?: string;
  photo_category?: string;
  finished_size_in?: number | null;
  quoted_price_usd?: number | null;
  palette_tier?: string | null;
  grid_size?: number | null;
  tile_map?: unknown[] | null;
  assets?: {
    preview?: StoredAsset;
    cropped_source?: StoredAsset;
  };
  [key: string]: unknown;
};

export type HandledStatus = {
  project_id: string;
  handled: boolean;
  handled_at: string | null;
  note: string;
  updated_at: string | null;
};

export type RequestSummary = {
  project_id: string;
  proof_ref: string | null;
  created_at: string | null;
  name: string;
  email: string;
  photo_category: string;
  finished_size_in: number | null;
  quoted_price_usd: number | null;
  palette_tier: string | null;
  grid_size: number | null;
  handled: boolean;
  handled_at: string | null;
  handled_note: string;
};

export type ListRequestsResult = {
  status: QueueStatusFilter;
  requests: RequestSummary[];
  count: number;
  next_cursor: string | null;
};

export type QueueStats = {
  total: number;
  new: number;
  handled: number;
  oldest_unhandled_created_at: string | null;
  oldest_unhandled_age_hours: number | null;
};

export interface BlobStoreClient {
  listKeys(prefix: string): Promise<string[]>;
  getJson<T>(key: string): Promise<T | null>;
  getBytes(key: string): Promise<ArrayBuffer | null>;
  setJson(key: string, value: unknown): Promise<void>;
}

export type ProofOpsStores = {
  projects: BlobStoreClient;
  assets: BlobStoreClient;
  ops: BlobStoreClient;
};

export type PreviewAsset = {
  project_id: string;
  asset: AssetKind;
  key: string;
  mime: string;
  bytes: number;
  data: ArrayBuffer;
};
