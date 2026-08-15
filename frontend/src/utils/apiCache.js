/**
 * Shared client-side API cache.
 *
 * Three things happen here:
 *  1. TTL caching - a response is reused until it is older than its TTL.
 *  2. In-flight de-duplication - two components asking for the same key at the
 *     same time share one network call instead of firing two.
 *  3. Optional sessionStorage persistence - survives a page reload (per tab)
 *     for data that barely changes, e.g. the Learning Pathway catalog.
 *
 * TTLs are chosen per data type: reference data that admins rarely touch gets a
 * long TTL, anything a coach mutates mid-session gets a short one plus explicit
 * invalidation from the code that mutates it. Never cache a record that is
 * actively being edited - pass force:true there.
 *
 * Note: requests are shared between callers, so an AbortController signal is
 * deliberately NOT threaded into cached loaders (aborting would cancel the call
 * other components are waiting on). Guard your setState with a `cancelled` flag
 * instead.
 */

export const TTL = {
  STATIC: 30 * 60 * 1000,
  LONG: 15 * 60 * 1000,
  MEDIUM: 5 * 60 * 1000,
  SHORT: 2 * 60 * 1000,
  BRIEF: 30 * 1000,
};

const STORAGE_PREFIX = 'cl_cache:';

const memory = new Map();
const inflight = new Map();

const readPersisted = (key) => {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    return entry && typeof entry.ts === 'number' ? entry : null;
  } catch {
    return null;
  }
};

const writePersisted = (key, entry) => {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    /* quota exceeded or private mode - memory cache still works */
  }
};

const removePersisted = (key) => {
  try {
    sessionStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* ignore */
  }
};

const readEntry = (key, persist) => {
  const hit = memory.get(key);
  if (hit) return hit;
  if (!persist) return null;
  const stored = readPersisted(key);
  if (stored) memory.set(key, stored);
  return stored;
};

export const setCached = (key, data, { persist = false } = {}) => {
  const entry = { data, ts: Date.now() };
  memory.set(key, entry);
  if (persist) writePersisted(key, entry);
  return data;
};

export const getCached = (key, { ttl = TTL.MEDIUM, persist = false } = {}) => {
  const entry = readEntry(key, persist);
  if (!entry) return undefined;
  if (Date.now() - entry.ts >= ttl) return undefined;
  return entry.data;
};

export const cachedRequest = (key, loader, { ttl = TTL.MEDIUM, force = false, persist = false } = {}) => {
  if (!force) {
    const entry = readEntry(key, persist);
    if (entry && Date.now() - entry.ts < ttl) return Promise.resolve(entry.data);
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const request = Promise.resolve()
    .then(loader)
    .then((data) => setCached(key, data, { persist }))
    .finally(() => inflight.delete(key));

  inflight.set(key, request);
  return request;
};

export const invalidate = (key) => {
  memory.delete(key);
  removePersisted(key);
};

export const invalidatePrefix = (prefix) => {
  [...memory.keys()].forEach((key) => {
    if (key.startsWith(prefix)) memory.delete(key);
  });
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(STORAGE_PREFIX + prefix))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
};

/** Called on login/logout - cached data belongs to the user who fetched it. */
export const clearApiCache = () => {
  memory.clear();
  inflight.clear();
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(STORAGE_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
};
