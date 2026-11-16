import axios from 'axios';

export const CL_SYNC_REGISTRATIONS_URL = 'https://5bfx0r5tcg.execute-api.ap-south-1.amazonaws.com/default/CL_Sync_Registrations';

export const AUTO_SYNC_MINUTES = 15;
const AUTO_SYNC_MS = AUTO_SYNC_MINUTES * 60 * 1000;

const authHeaders = (userToken) => ({ 'Content-Type': 'application/json', ...(userToken && { userToken }) });

const unwrap = (data) => {
  let d = data;
  if (d?.body && typeof d.body === 'string') d = JSON.parse(d.body);
  return d || {};
};

// Module-level on purpose: pages (and the sidebar) remount on every navigation, so
// the "last synced" time has to outlive them or we would sync on every page change.
let lastSyncAt = 0;

export const syncNewPlayers = async (userToken, signal) => {
  lastSyncAt = Date.now();
  const res = await axios.post(CL_SYNC_REGISTRATIONS_URL, { action: 'sync' }, { headers: authHeaders(userToken), signal });
  return unwrap(res.data);
};

/*
 * Keeps new registrations flowing in while CoachLife is open: one sync when the app
 * is first opened, then at most one every AUTO_SYNC_MINUTES. Checks once a minute,
 * skips while the tab is hidden, and catches up when the tab is shown again.
 * Returns a stop function. A failed sync is retried after ~2 minutes.
 */
export const startNewPlayersAutoSync = (userToken, onResult) => {
  const check = async () => {
    if (document.hidden || Date.now() - lastSyncAt < AUTO_SYNC_MS) return;
    try {
      onResult(await syncNewPlayers(userToken));
    } catch {
      lastSyncAt = Date.now() - AUTO_SYNC_MS + 2 * 60 * 1000;
    }
  };
  check();
  const timer = setInterval(check, 60 * 1000);
  document.addEventListener('visibilitychange', check);
  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', check);
  };
};

// Called by the Players page after it adds a CoachLife player from a registration,
// so that registration leaves the New list for good.
export const markNewPlayerPlaced = (userToken, newPlayerId, playerId) => axios.post(
  CL_SYNC_REGISTRATIONS_URL,
  { action: 'markPlaced', newPlayerId, ...(playerId ? { playerId } : {}) },
  { headers: authHeaders(userToken) },
);
