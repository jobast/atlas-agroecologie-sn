import { drain, count, reactivateAuthFailures } from '../db/offlineQueue';
import { replayClient } from './replayClient';

// Build a FormData payload from a queued record, matching the multipart shape
// the server's POST /api/data expects (mirrors FormInput.jsx handleSubmit).
function buildFormData(record) {
  const fd = new FormData();
  const payload = record.payload || {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      // activities / videos / etc. — server expects repeated fields.
      value.forEach(v => fd.append(key, v));
    } else {
      fd.append(key, value);
    }
  }
  // Photos rebuilt from stored Blobs.
  (record.photos || []).forEach(p => {
    if (p && p.blob) {
      const file = new File([p.blob], p.name || 'photo.jpg', { type: p.type || 'image/jpeg' });
      fd.append('photos', file);
    }
  });
  return fd;
}

async function replayOne(record) {
  const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('token') : null;
  if (!token) {
    return { ok: false, authError: true, error: 'Aucun token disponible' };
  }
  try {
    const fd = buildFormData(record);
    await replayClient.post('/data', fd, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { ok: true };
  } catch (err) {
    const status = err?.response?.status;
    if (status === 401) {
      return { ok: false, authError: true, error: err?.response?.data?.error || 'Session expirée' };
    }
    return { ok: false, error: err?.response?.data?.error || err?.message || 'Erreur réseau' };
  }
}

let intervalHandle = null;
let draining = false;

async function maybeDrain() {
  if (draining) return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  if ((await count()) === 0) {
    stopInterval();
    return null;
  }
  draining = true;
  try {
    const result = await drain(replayOne);
    if ((await count()) === 0) stopInterval();
    return result;
  } finally {
    draining = false;
  }
}

function ensureInterval() {
  if (intervalHandle != null) return;
  intervalHandle = setInterval(() => { maybeDrain(); }, 60_000);
}

function stopInterval() {
  if (intervalHandle != null) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

let started = false;

// Wire up the replay loop. Idempotent: safe to call from main.jsx.
export function startReplay() {
  if (started) return;
  started = true;
  // Drain once on mount, then on every reconnect, plus a polling interval
  // while items remain. The interval auto-stops when the queue empties.
  window.addEventListener('online', () => { maybeDrain(); });
  window.addEventListener('auth-change', async () => {
    // After a fresh login, push the previously stuck items back into rotation.
    await reactivateAuthFailures();
    maybeDrain();
  });
  // Trigger a quick first drain (gives main.jsx time to set up the SW first).
  setTimeout(() => { maybeDrain(); }, 1500);
  // Keep a slow background tick so we never wedge if all the events miss.
  ensureInterval();
}

// Force-drain a single record (used by the "Renvoyer" button in the pending
// submissions page). Returns the outcome.
export async function replayNow(record) {
  return replayOne(record);
}
