import { openDB } from 'idb';

// Single source of truth for offline-pending submissions.
//
// Status transitions:
//   pending      -> sending      (drain picked it up)
//   sending      -> (deleted)    (POST 2xx; record removed)
//   sending      -> failed-auth  (POST 401; drain stops to avoid burning the queue)
//   sending      -> failed-other (POST 5xx / network blip; drain moves on, retried later)
//   failed-auth  -> pending      (next successful login flips them back)
//   failed-other -> pending      (next online/interval drain re-tries)

const DB_NAME = 'atlas-offline';
const DB_VERSION = 1;
const STORE = 'pendingSubmissions';
const EVENT_NAME = 'atlas:queue-changed';

let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          const store = database.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('byStatus', 'status');
          store.createIndex('byCreatedAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

function notifyChanged() {
  try {
    // window may be missing in the service worker context.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(EVENT_NAME));
    }
  } catch { /* ignore */ }
}

export async function enqueue(submission) {
  const record = {
    createdAt: Date.now(),
    status: 'pending',
    attempts: 0,
    lastError: null,
    ...submission,
  };
  const database = await db();
  const id = await database.add(STORE, record);
  notifyChanged();
  return id;
}

export async function list() {
  const database = await db();
  return database.getAll(STORE);
}

export async function get(id) {
  const database = await db();
  return database.get(STORE, id);
}

export async function update(id, patch) {
  const database = await db();
  const tx = database.transaction(STORE, 'readwrite');
  const existing = await tx.store.get(id);
  if (!existing) {
    await tx.done;
    return null;
  }
  const updated = { ...existing, ...patch };
  await tx.store.put(updated);
  await tx.done;
  notifyChanged();
  return updated;
}

export async function remove(id) {
  const database = await db();
  await database.delete(STORE, id);
  notifyChanged();
}

export async function count() {
  const database = await db();
  return database.count(STORE);
}

// Generic drain. The caller passes a replay function that takes a record
// and returns one of:
//   { ok: true }                       -> record is deleted
//   { ok: false, authError: true }     -> mark failed-auth and STOP the loop
//   { ok: false, error: '...' }        -> mark failed-other and continue
// Drain runs sequentially: keeps things simple, avoids multipart upload contention,
// and lets us reliably stop the moment we see auth trouble.
export async function drain(replayFn) {
  const records = await list();
  const pendings = records
    .filter(r => r.status === 'pending' || r.status === 'failed-other')
    .sort((a, b) => a.createdAt - b.createdAt);

  const result = { drained: 0, failedAuth: 0, failedOther: 0, total: pendings.length };

  for (const record of pendings) {
    await update(record.id, { status: 'sending', attempts: (record.attempts || 0) + 1, lastError: null });
    let outcome;
    try {
      outcome = await replayFn(record);
    } catch (err) {
      outcome = { ok: false, error: err?.message || String(err) };
    }
    if (outcome?.ok) {
      await remove(record.id);
      result.drained += 1;
      continue;
    }
    if (outcome?.authError) {
      await update(record.id, { status: 'failed-auth', lastError: outcome.error || 'Session expirée' });
      result.failedAuth += 1;
      // Stop drain: every subsequent record would hit the same 401.
      break;
    }
    await update(record.id, { status: 'failed-other', lastError: outcome?.error || 'Erreur inconnue' });
    result.failedOther += 1;
  }
  return result;
}

// Flip every failed-auth back to pending. Called after a fresh login so the
// next drain picks them up.
export async function reactivateAuthFailures() {
  const records = await list();
  const stuck = records.filter(r => r.status === 'failed-auth');
  for (const r of stuck) {
    await update(r.id, { status: 'pending', lastError: null });
  }
  return stuck.length;
}

export const QUEUE_CHANGED_EVENT = EVENT_NAME;
