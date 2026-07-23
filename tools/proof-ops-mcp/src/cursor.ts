import type { QueueStatusFilter } from './types.js';

type CursorPayload = {
  version: 1;
  offset: number;
  status: QueueStatusFilter;
};

export function encodeCursor(offset: number, status: QueueStatusFilter): string {
  const payload: CursorPayload = { version: 1, offset, status };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string | undefined, status: QueueStatusFilter): number {
  if (!cursor) return 0;
  try {
    const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<CursorPayload>;
    if (
      payload.version !== 1 ||
      payload.status !== status ||
      !Number.isInteger(payload.offset) ||
      Number(payload.offset) < 0
    ) {
      throw new Error('invalid cursor payload');
    }
    return Number(payload.offset);
  } catch {
    throw new Error('Invalid cursor. Start again without cursor, keeping the same status filter.');
  }
}
