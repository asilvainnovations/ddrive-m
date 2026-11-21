// Draft field observations kept on the device until they can be sent (spec §11).
// Only observations are queued. Approvals, reviews, publication and closing are never queued: they need a connection.
// Each item carries a client_key generated here, so a retry after a dropped connection is a duplicate the server
// ignores, never a second report. Items stay until the server accepts them or the person discards them.
import type { NewObservation } from './api';

export type QueueState = 'pending' | 'failed';
export interface QueuedObservation {
  item: NewObservation;
  state: QueueState;
  queuedAt: string;
  lastError: string | null;
  attempts: number;
}

export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

const KEY = (tenant: string) => `ddrive-m:rm-observation-queue:v1:${tenant}`;

function storage(): KV | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;   // private mode or blocked storage
  }
}

export function readQueue(tenant: string, kv: KV | null = storage()): QueuedObservation[] {
  if (!kv) return [];
  try {
    const v = JSON.parse(kv.getItem(KEY(tenant)) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function writeQueue(tenant: string, q: QueuedObservation[], kv: KV | null = storage()) {
  if (!kv) throw new Error('This browser does not allow saving drafts on the device.');
  if (q.length) kv.setItem(KEY(tenant), JSON.stringify(q));
  else kv.removeItem(KEY(tenant));
}

export function enqueue(tenant: string, item: NewObservation, kv: KV | null = storage()) {
  const q = readQueue(tenant, kv).filter((x) => x.item.client_key !== item.client_key);
  q.push({ item, state: 'pending', queuedAt: new Date().toISOString(), lastError: null, attempts: 0 });
  writeQueue(tenant, q, kv);
}

export function discard(tenant: string, clientKey: string, kv: KV | null = storage()) {
  writeQueue(tenant, readQueue(tenant, kv).filter((x) => x.item.client_key !== clientKey), kv);
}

/** True for errors that mean "try again later" rather than "the server refused this". */
export const isConnectionError = (msg: string) => /no connection|failed to fetch|networkerror|network|timeout|load failed/i.test(msg);

/**
 * Sends every queued item, oldest first. Accepted items leave the queue. Connection errors stop the run and keep
 * the rest pending; a refusal marks that item failed (with the server's reason) and carries on with the others.
 */
export async function flush(
  tenant: string,
  send: (o: NewObservation) => Promise<{ error: string | null }>,
  kv: KV | null = storage(),
): Promise<{ sent: number; failed: number; pending: number }> {
  const q = readQueue(tenant, kv);
  const keep: QueuedObservation[] = [];
  let sent = 0;
  let offline = false;
  for (const x of q) {
    if (offline || x.state === 'failed') { keep.push(x); continue; }
    const { error } = await send(x.item);
    if (!error) { sent += 1; continue; }
    if (isConnectionError(error)) {
      offline = true;
      keep.push({ ...x, attempts: x.attempts + 1, lastError: error });
    } else {
      keep.push({ ...x, state: 'failed', attempts: x.attempts + 1, lastError: error });
    }
  }
  writeQueue(tenant, keep, kv);
  return { sent, failed: keep.filter((x) => x.state === 'failed').length, pending: keep.filter((x) => x.state === 'pending').length };
}

/** Puts a failed item back in line (after the person has read why it failed). */
export function retry(tenant: string, clientKey: string, kv: KV | null = storage()) {
  writeQueue(tenant, readQueue(tenant, kv).map((x) => (x.item.client_key === clientKey ? { ...x, state: 'pending' as const } : x)), kv);
}

export const newClientKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
