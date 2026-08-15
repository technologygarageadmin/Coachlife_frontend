/**
 * Cached loaders for the read-heavy endpoints.
 *
 * Every page used to fetch these itself on mount, so navigating around
 * re-downloaded the whole Learning Pathway catalog and re-read every session
 * card one request at a time. These loaders share one cache entry per resource
 * across all pages (see apiCache.js), and the mutating pages call the matching
 * invalidate* helper so nothing goes stale after a write.
 */

import axios from 'axios';
import { cachedRequest, getCached, setCached, invalidate, invalidatePrefix, TTL } from './apiCache';

const GET_LEARNING_PATHWAY_URL = 'https://nvouj7m5fb.execute-api.ap-south-1.amazonaws.com/default/CL_Get_LearningPathway';
const VIEW_SESSION_CARD_URL = 'https://kyfkhl8v4l.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_View_Sessioncard';
const GET_BATCHES_URL = 'https://ts6wti3133.execute-api.ap-south-1.amazonaws.com/default/CL_Get_Batches';
const VIEW_REWARDS_URL = 'https://vzcyj52ypb.execute-api.ap-south-1.amazonaws.com/default/CL_View_Reward';

const KEYS = {
  pathway: 'learningPathway',
  batches: 'batches',
  rewards: 'rewards',
  card: (id) => `sessionCard:${id}`,
};

const authHeaders = (userToken) => ({
  'Content-Type': 'application/json',
  ...(userToken && { userToken }),
});

const unwrapBody = (data) => {
  if (data && typeof data.body === 'string') {
    try { return JSON.parse(data.body); } catch { return data; }
  }
  return data;
};

const toArray = (data, ...keys) => {
  const payload = unwrapBody(data) || {};
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
};

/* ---------------------------------------------------------------- pathway */

/**
 * The full pathway catalog. Big payload, changes only when an admin edits a
 * session - so it gets a long TTL and rides out a page reload via
 * sessionStorage. Any page that writes a pathway calls invalidateLearningPathway().
 */
export const getLearningPathway = ({ userToken, force = false } = {}) =>
  cachedRequest(
    KEYS.pathway,
    async () => {
      const response = await axios.get(GET_LEARNING_PATHWAY_URL, { headers: authHeaders(userToken) });
      return toArray(response.data, 'sessions', 'data', 'pathways');
    },
    { ttl: TTL.LONG, force, persist: true }
  );

export const invalidateLearningPathway = () => invalidate(KEYS.pathway);

/* ------------------------------------------------- player → card id lists */

/**
 * A player's session card ids, from whichever shape the players API used.
 *
 * CL_Get_All_Players returns card references two ways: `sessionCardIds` (id
 * strings) for most players and `sessionCards` (full card objects) for others.
 * Readers that only understood the first shape silently saw zero cards for the
 * second - which is why some players' cards went missing in the By Batch view
 * while the same player's profile page showed them. Always normalize here.
 */
export const normalizeSessionCardIds = (player) => {
  if (!player) return [];
  if (Array.isArray(player.sessionCardIds)) return player.sessionCardIds.filter(Boolean);
  if (Array.isArray(player.sessionCards)) {
    return player.sessionCards
      .map((card) => (typeof card === 'string' ? card : card?.sessionCardId || card?._id))
      .filter(Boolean);
  }
  return [];
};

/* ----------------------------------------------------------- session cards */

const extractCard = (data) => {
  const payload = unwrapBody(data);
  if (!payload || typeof payload !== 'object') return null;
  // `session` is only a wrapper when it holds an object - on a root-level card
  // it is the session *number*.
  const card = payload.sessionCard
    || payload.data
    || (payload.session && typeof payload.session === 'object' ? payload.session : null)
    || payload;
  if (!card || card.message || typeof card !== 'object') return null;
  return card;
};

const fetchCardById = async (id, userToken) => {
  try {
    const response = await axios.post(VIEW_SESSION_CARD_URL, { sessionCardId: id }, { headers: authHeaders(userToken) });
    return extractCard(response.data);
  } catch {
    return null;
  }
};

/**
 * Reads many session cards at once. Cards already in cache cost nothing, and
 * whatever is left is asked for in a single bulk call (the endpoint accepts a
 * `sessionCardIds` array) instead of one request per card. Falls back to
 * per-card requests for anything the bulk response leaves out.
 *
 * Returns an object keyed by card id; a missing card maps to null.
 */
export const getSessionCards = async (ids, { userToken, force = false } = {}) => {
  const unique = [...new Set((ids || []).filter(Boolean).map(String))];
  if (unique.length === 0) return {};

  const result = {};
  const missing = [];

  unique.forEach((id) => {
    const hit = force ? undefined : getCached(KEYS.card(id), { ttl: TTL.SHORT });
    if (hit !== undefined) result[id] = hit;
    else missing.push(id);
  });

  if (missing.length === 0) return result;

  let bulk = {};
  try {
    const response = await axios.post(
      VIEW_SESSION_CARD_URL,
      { sessionCardIds: missing },
      { headers: authHeaders(userToken) }
    );
    bulk = unwrapBody(response.data)?.cards || {};
  } catch {
    bulk = {};
  }

  const stillMissing = [];
  missing.forEach((id) => {
    const card = bulk[id];
    if (card && (card.Topic || card.activities || card.status)) {
      result[id] = { _id: id, ...card };
      setCached(KEYS.card(id), result[id]);
    } else {
      stillMissing.push(id);
    }
  });

  if (stillMissing.length > 0) {
    const fetched = await Promise.all(stillMissing.map((id) => fetchCardById(id, userToken)));
    stillMissing.forEach((id, i) => {
      const card = fetched[i];
      // A miss is never cached - it may be a transient failure, and caching it
      // would hide a real card from every view for the length of the TTL.
      result[id] = card ? { _id: id, ...card } : null;
      if (card) setCached(KEYS.card(id), result[id]);
    });
  }

  return result;
};

/** Same as getSessionCards but for one id; returns the card or null. */
export const getSessionCard = async (id, { userToken, force = false } = {}) => {
  if (!id) return null;
  const cards = await getSessionCards([id], { userToken, force });
  return cards[String(id)] || null;
};

/** Cards keyed by playerId - each player's current card, in one call. */
export const getCurrentCardsByPlayer = async (playerIds, { userToken, full = false } = {}) => {
  const ids = [...new Set((playerIds || []).filter(Boolean).map(String))];
  if (ids.length === 0) return {};
  try {
    const response = await axios.post(
      VIEW_SESSION_CARD_URL,
      { playerIds: ids, ...(full && { full: true }) },
      { headers: authHeaders(userToken) }
    );
    return unwrapBody(response.data)?.cards || {};
  } catch {
    return {};
  }
};

/**
 * Aggregates built from many cards (currently the Calendar's snapshot) live under
 * `sessionCard:` too, so that invalidating all cards drops them. Invalidating a
 * SINGLE card must drop them as well - otherwise completing one session would
 * leave the calendar showing the old status until its TTL expired.
 */
const DERIVED_PREFIX = 'sessionCard:calendar:';

export const invalidateSessionCard = (id) => {
  if (id) invalidate(KEYS.card(String(id)));
  invalidatePrefix(DERIVED_PREFIX);
};

export const invalidateSessionCards = () => invalidatePrefix('sessionCard:');

/* ---------------------------------------------------------------- batches */

export const getBatches = ({ userToken, force = false } = {}) =>
  cachedRequest(
    KEYS.batches,
    async () => {
      const response = await axios.get(GET_BATCHES_URL, { headers: authHeaders(userToken) });
      return toArray(response.data, 'batches', 'data');
    },
    { ttl: TTL.MEDIUM, force }
  );

export const invalidateBatches = () => invalidate(KEYS.batches);

/* ---------------------------------------------------------------- rewards */

export const getRewards = ({ userToken, force = false } = {}) =>
  cachedRequest(
    KEYS.rewards,
    async () => {
      const response = await axios.get(VIEW_REWARDS_URL, { headers: authHeaders(userToken) });
      return toArray(response.data, 'rewards', 'data', 'Items');
    },
    { ttl: TTL.MEDIUM, force }
  );

export const invalidateRewards = () => invalidate(KEYS.rewards);
