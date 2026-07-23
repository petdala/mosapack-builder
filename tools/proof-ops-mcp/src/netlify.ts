import { getStore, type Store } from '@netlify/blobs';

import type { BlobStoreClient, ProofOpsStores } from './types.js';

export const DEFAULT_SITE_ID = '6ed95826-19fd-445c-8b01-f934d0f15b4d';

export type NetlifyProofOpsConfig = {
  siteID: string;
  token: string;
};

class NetlifyBlobStoreClient implements BlobStoreClient {
  constructor(
    private readonly store: Store,
    private readonly readOnly: boolean
  ) {}

  async listKeys(prefix: string): Promise<string[]> {
    const result = await this.store.list({ prefix });
    return result.blobs.map(({ key }) => key);
  }

  async getJson<T>(key: string): Promise<T | null> {
    return (await this.store.get(key, { type: 'json' })) as T | null;
  }

  async getBytes(key: string): Promise<ArrayBuffer | null> {
    return (await this.store.get(key, { type: 'arrayBuffer' })) as ArrayBuffer | null;
  }

  async setJson(key: string, value: unknown): Promise<void> {
    if (this.readOnly) {
      throw new Error('Attempted to write to a read-only proof request store.');
    }
    await this.store.setJSON(key, value);
  }
}

export function readNetlifyConfig(env: NodeJS.ProcessEnv = process.env): NetlifyProofOpsConfig {
  const missing: string[] = [];
  if (!env.NETLIFY_AUTH_TOKEN?.trim()) missing.push('NETLIFY_AUTH_TOKEN');
  if (!env.NETLIFY_SITE_ID?.trim()) missing.push('NETLIFY_SITE_ID');
  if (missing.length) {
    throw new Error(
      `Missing required environment variable${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}. ` +
      'Create NETLIFY_AUTH_TOKEN in Netlify User settings > Applications > Personal access tokens, ' +
      `and set NETLIFY_SITE_ID to ${DEFAULT_SITE_ID}.`
    );
  }
  return {
    siteID: env.NETLIFY_SITE_ID!.trim(),
    token: env.NETLIFY_AUTH_TOKEN!.trim()
  };
}

export function createNetlifyStores(config: NetlifyProofOpsConfig): ProofOpsStores {
  const options = { siteID: config.siteID, token: config.token, consistency: 'strong' as const };
  return {
    projects: new NetlifyBlobStoreClient(
      getStore({ name: 'mosapack-projects', ...options }),
      true
    ),
    assets: new NetlifyBlobStoreClient(
      getStore({ name: 'mosapack-project-assets', ...options }),
      true
    ),
    ops: new NetlifyBlobStoreClient(
      getStore({ name: 'mosapack-ops', ...options }),
      false
    )
  };
}

export function actionableError(error: unknown, env: NodeJS.ProcessEnv = process.env): string {
  let message = error instanceof Error ? error.message : String(error);
  const token = env.NETLIFY_AUTH_TOKEN;
  if (token) message = message.replaceAll(token, '[REDACTED]');
  if (/\b401\b|unauthori[sz]ed|invalid token/i.test(message)) {
    return (
      'Netlify authorization failed (401). Verify NETLIFY_AUTH_TOKEN is a current personal access token ' +
      'with access to the team that owns NETLIFY_SITE_ID; SSO teams require explicitly granting team access.'
    );
  }
  if (/\b404\b|not found/i.test(message)) {
    return `${message} Confirm NETLIFY_SITE_ID and call proofops_list_requests to inspect available requests.`;
  }
  return message;
}
