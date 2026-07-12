import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Toast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import { ChevronLeft, Layers, Loader, Users, CalendarCheck, Play, CheckCircle, ArrowRight, RotateCcw, Eye, ChevronDown, Clock, Zap, Code, BookOpen, ListChecks, Sparkles, Target, Trash2, AlertTriangle, Edit3 } from 'lucide-react';

const stripHtml = (s) => {
  if (typeof s !== 'string') return '';
  return s
    .replace(/<[^>]+>/g, ' ')          // tags
    .replace(/&nbsp;/gi, ' ')          // common entities
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&[a-z]+;/gi, ' ')        // any other named entity → space
    .replace(/\s+/g, ' ')
    .trim();
};
const toLines = (v) => {
  if (Array.isArray(v)) return v.map(stripHtml).filter(Boolean);
  const one = stripHtml(v);
  return one ? [one] : [];
};

const VIEW_SESSIONCARD_URL    = 'https://kyfkhl8v4l.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_View_Sessioncard';
const CL_GET_ATTENDANCE_URL   = 'https://expqdxymlf.execute-api.ap-south-1.amazonaws.com/default/CL_Get_Attendance';
const CL_MARK_ATTENDANCE_URL  = 'https://a5c8vbcbj4.execute-api.ap-south-1.amazonaws.com/default/CL_Mark_Attendance';
const CL_START_SESSION_URL    = 'https://rslqy219i9.execute-api.ap-south-1.amazonaws.com/default/CL_Start_Session';
const DELETE_SESSIONCARD_URL  = 'https://rmauptygg5.execute-api.ap-south-1.amazonaws.com/Coachlife-com/CL_Deleting_Sessioncard';
const GENERATE_CARD_URL       = 'https://qz2us3dk55.execute-api.ap-south-1.amazonaws.com/default/CL_Session_Card_Generating';

const normStatus = (s) => (s || '').toLowerCase().replace(/[\s_]/g, '');

// The batch's "current" card = the HIGHEST session number present (that's where the
// batch actually is), preferring a non-completed card at that level. Keying off the
// max session avoids surfacing a stale LOWER pending session (e.g. showing Session 3
// as current when the batch has already completed Session 4). 'empty' (soft-deleted)
// slots are ignored.
const pickRepCard = (cards) => {
  const real = (cards || []).filter(c => normStatus(c.status) !== 'empty');
  if (real.length === 0) return null;
  const maxSession = Math.max(...real.map(c => c.session || 0));
  const atMax = real.filter(c => (c.session || 0) === maxSession);
  return atMax.find(c => normStatus(c.status) !== 'completed') || atMax[0] || null;
};
const statusColors = (status) => {
  const s = normStatus(status);
  if (s === 'completed') return { bg: '#DCFCE7', text: '#16A34A' };
  if (s === 'inprogress') return { bg: '#E0E7FF', text: '#4F46E5' };
  if (['pending', 'notcompleted', 'absent', 'excused'].includes(s)) return { bg: '#FEF3C7', text: '#D97706' };
  return { bg: '#EFF6FF', text: '#2563EB' }; // upcoming / draft
};

const PALETTES = [
  ['#6366F1','#818CF8'], ['#10B981','#34D399'], ['#F59E0B','#FBBF24'],
  ['#EC4899','#F472B6'], ['#3B82F6','#60A5FA'], ['#8B5CF6','#A78BFA'],
  ['#EF4444','#F87171'], ['#06B6D4','#22D3EE'],
];
const pal = (name = '') => PALETTES[(name.charCodeAt(0) || 0) % PALETTES.length];

const Sk = ({ w, h, r = 8 }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: '#EEF2F7', animation: 'skPulse 1.6s ease-in-out infinite', flexShrink: 0 }} />
);

function toDateStr(date) {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * The coach's "Class Room" - one screen for a whole class:
 * 1. Roster: tick who's here → Start Session.
 * 2. Start Session saves attendance and moves present players' Upcoming cards to
 *    In Progress. The coach does NOT generate cards - admin does that ahead of
 *    time. Absent Players' cards become Pending automatically.
 * 3. coach: tap a present player's name to open their card.
 * See flow.md.
 */
const BatchSessionView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, fetchAssignedPlayersForCoach, fetchPlayers, userToken } = useStore();

  // On normal navigation the batch arrives via router state; persist it so a page
  // refresh (which drops router state) recovers it instead of bouncing back to
  // Start Session with no cards loaded.
  const batch = useMemo(() => {
    if (location.state?.batch) {
      try { localStorage.setItem('cl_coach_active_batch', JSON.stringify(location.state.batch)); } catch { /* ignore */ }
      return location.state.batch;
    }
    try {
      const saved = localStorage.getItem('cl_coach_active_batch');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  }, [location.state]);

  const [batchPlayers, setBatchPlayers] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  // { [playerId]: { activeCardId, loading, checked, isPending, sessionNumber, sessionCardId, rawStatus } }
  const [cardStatus, setCardStatus] = useState({});
  // Full card history across all players (for Batch Details + Preview) - each
  // entry is a full session card object with { playerId, playerName } attached.
  const [allCards, setAllCards] = useState([]);
  const [allCardsLoading, setAllCardsLoading] = useState(true);
  // Read-only preview of a session card (the header "Preview" button)
  const [previewCard, setPreviewCard] = useState(null);
  const [previewOpenIdx, setPreviewOpenIdx] = useState(0); // accordion: open activity

  // ── top-level view: 'class' (attendance + coach) | 'details' (batch overview) ──
  const [view, setView] = useState('class');
  // ── class step: 'attendance' (roster + Start Session) | 'active' (coach) ──
  // Returning from a just-completed player's session (SessionDetail sets
  // resumeActive) lands straight back on the coaching view, not the roster - the
  // class is already running, so we don't ask the coach to Start Session again.
  const [classStep, setClassStep] = useState(location.state?.resumeActive ? 'active' : 'attendance');
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');

  const today = toDateStr(new Date());
  const [attendanceDate, setAttendanceDate]   = useState(today);
  const [statuses, setStatuses]               = useState({}); // { [playerId]: 'Present' | 'Absent' }
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [alreadyMarked, setAlreadyMarked]         = useState(false);
  const [fetchKey, setFetchKey]                   = useState(0);
  const [cardRefreshKey, setCardRefreshKey] = useState(0);
  const [showResetConfirm, setShowResetConfirm]   = useState(false);
  const [resetting, setResetting]                 = useState(false);
  const [expandedPlayer, setExpandedPlayer]       = useState({}); // { [playerId]: bool } (Batch Details)
  const [deleteCardId, setDeleteCardId]           = useState(null);
  const [deletingCard, setDeletingCard]           = useState(false);
  const [rosterKey, setRosterKey]                 = useState(0);    // bump to re-fetch roster + cards
  const [showBatchGen, setShowBatchGen]           = useState(false); // batch-generate confirm/progress modal
  const [batchGenerating, setBatchGenerating]     = useState(false);
  const [batchGenDone, setBatchGenDone]           = useState(false);
  const [batchGenStatus, setBatchGenStatus]       = useState({});    // { [playerId]: { state, message, session } }
  const sessionDateApplied = useRef(false);
  // Auto-resume the coaching view at most once per mount. Lets a page refresh land
  // back on 'active' (the class is already running) without forcing 'active' again
  // when the coach later edits attendance and browses other dates.
  const autoResumedRef = useRef(!!location.state?.resumeActive);
  const [toastMsg, setToastMsg]   = useState('');
  const [toastType, setToastType] = useState('success');

  const toast = useCallback((msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  }, []);

  useEffect(() => {
    if (!batch) navigate('/coach/start-session');
  }, [batch, navigate]);

  // Load existing attendance for the selected date so statuses pre-fill, and
  // skip straight to the coaching step if this class was already started today.
  useEffect(() => {
    if (!batch?.batchId || !userToken) return;
    const controller = new AbortController();
    setAlreadyMarked(false);
    (async () => {
      setAttendanceLoading(true);
      try {
        const res = await fetch(CL_GET_ATTENDANCE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', userToken },
          body: JSON.stringify({ batchId: batch.batchId, sessionDate: attendanceDate }),
          signal: controller.signal,
        });
        let data = await res.json();
        if (data?.body && typeof data.body === 'string') data = JSON.parse(data.body);
        const records = data.records || [];
        const next = {};
        records.forEach(r => {
          if (r.playerId != null) next[String(r.playerId)] = r.attendanceStatus || 'Present';
        });
        setStatuses(next);
        if (records.length > 0) {
          if (attendanceDate === today) setAlreadyMarked(true);
          // Class already started for this date → resume the coaching view. Keyed off
          // the records (not "=== today"), so a refresh resumes even when the session's
          // own date isn't literally today. Only once, so Edit Attendance still works.
          if (!autoResumedRef.current) {
            autoResumedRef.current = true;
            setClassStep('active');
          }
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Failed to load attendance', e);
      } finally {
        setAttendanceLoading(false);
      }
    })();
    return () => controller.abort();
  }, [batch?.batchId, attendanceDate, userToken, fetchKey]);

  function setStatus(playerId, value) {
    setStatuses(prev => ({ ...prev, [String(playerId)]: value }));
  }

  function markAllPresent() {
    const next = {};
    batchPlayers.forEach(p => { next[String(p.playerId)] = 'Present'; });
    setStatuses(next);
  }

  // Effect 1: load batch players once on mount
  useEffect(() => {
    if (!currentUser?.id || !batch) return;
    const controller = new AbortController();
    (async () => {
      setInitialLoading(true);
      try {
        // Two sources: the coach's assigned players AND the full players list.
        // A batch can include a player NOT assigned to this coach - relying only on
        // the assigned list left those players with empty sessionCardIds ("0 cards"),
        // even though they have generated cards. Merge so every batch member gets
        // their real sessionCardIds regardless of who they're assigned to.
        const [result, allPlayersRes] = await Promise.all([
          fetchAssignedPlayersForCoach(currentUser.id),
          Promise.resolve(fetchPlayers ? fetchPlayers(true) : null).catch(() => null),
        ]);
        // fetchPlayers returns an array on the cache path but { success, players }
        // on a fresh fetch - normalize both so the merge below always runs.
        const allPlayers = Array.isArray(allPlayersRes) ? allPlayersRes : (allPlayersRes?.players || []);

        const byId = {};
        allPlayers.forEach(p => {
          const id = String(p.playerId || p._id || p.id);
          byId[id] = { name: p.playerName || p.name, LearningPathway: p.LearningPathway || '', sessionCardIds: p.sessionCardIds || [] };
        });
        if (result?.success && Array.isArray(result.players)) {
          result.players.forEach(item => {
            const p = item.player || item;
            const id = String(p._id || p.id || p.playerId);
            const ids = item.sessionCardIds || p.sessionCardIds || [];
            const prev = byId[id] || {};
            byId[id] = {
              name: p.playerName || p.name || prev.name,
              LearningPathway: p.LearningPathway || prev.LearningPathway || '',
              // UNION both sources - the assigned-players API can return a shorter,
              // fresher list (e.g. only the newly generated card) while the full
              // players list holds the rest of the history. Preferring one dropped
              // cards, so merge and de-dupe to keep every card.
              sessionCardIds: [...new Set([...(prev.sessionCardIds || []), ...ids])],
            };
          });
        }

        const enriched = batch.players.map(bp => {
          const found = byId[String(bp.playerId)];
          return found
            ? { playerId: bp.playerId, name: found.name || bp.playerName, LearningPathway: found.LearningPathway || '', sessionCardIds: found.sessionCardIds || [] }
            : { playerId: bp.playerId, name: bp.playerName, LearningPathway: '', sessionCardIds: [] };
        });
        setBatchPlayers(enriched);
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Failed to fetch players', e);
      } finally {
        setInitialLoading(false);
      }
    })();
    return () => controller.abort();
  }, [currentUser?.id, batch, fetchAssignedPlayersForCoach, fetchPlayers, userToken, rosterKey]);

  // Effect 2: fetch EVERY card for every player (full history). Builds:
  //   - allCards   : the whole batch's card history (Batch Details + Preview)
  //   - cardStatus : each player's LATEST card (coaching chips)
  // Re-runs after Start Session / attendance submit (cardRefreshKey).
  useEffect(() => {
    if (batchPlayers.length === 0) return;
    const controller = new AbortController();

    const fetchCard = async (id) => {
      try {
        const res = await fetch(VIEW_SESSIONCARD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'userToken': userToken },
          body: JSON.stringify({ sessionCardId: id }),
          signal: controller.signal,
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.sessionCard || data.data || data;
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Card fetch failed', id, e);
        return null;
      }
    };

    // The player's authoritative CURRENT card, straight from the backend by
    // playerId (same call the admin Batch Detail uses). This reflects a freshly
    // generated card even when the cached sessionCardIds array hasn't caught up,
    // which is why the coach view used to miss a player's new session.
    const fetchCurrentByPlayer = async (playerId) => {
      try {
        const res = await fetch(VIEW_SESSIONCARD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'userToken': userToken },
          body: JSON.stringify({ playerId }),
          signal: controller.signal,
        });
        if (!res.ok) return null;
        const data = await res.json();
        const card = data.sessionCard || data.data || data;
        if (!card || (card.session == null && !card.status && !card.Topic)) return null;
        return card;
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Current card fetch failed', playerId, e);
        return null;
      }
    };

    (async () => {
      setAllCardsLoading(true);
      // mark every player's chip as loading up front - we now always look up each
      // player's current card by playerId, so even a player with an empty cached
      // sessionCardIds array must wait for that lookup rather than flash "no card".
      setCardStatus(prev => {
        const next = { ...prev };
        batchPlayers.forEach(p => {
          next[p.playerId] = { ...(next[p.playerId] || {}), loading: true, checked: false };
        });
        return next;
      });

      const collected = [];
      await Promise.all(batchPlayers.map(async (player) => {
        const { playerId, name, sessionCardIds } = player;

        // Full history from the player's sessionCardIds (may be stale/incomplete).
        const cards = (await Promise.all((sessionCardIds || []).map(fetchCard))).filter(Boolean);

        // Authoritative current card by playerId - merge it into the history if the
        // cached id list didn't include it (the whole reason cards went "missing").
        const current = await fetchCurrentByPlayer(playerId);
        const idOf = (c) => c && (c._id || c.sessionCardId);
        if (current && !cards.some(c => idOf(c) === idOf(current))) {
          cards.push(current);
        }

        cards.forEach(card => {
          collected.push({
            ...card,
            _cardId: card._id || card.sessionCardId,
            playerId,
            playerName: name,
          });
        });

        // The card the coach needs today = the backend's current card for this
        // player. Only if that lookup returns nothing do we derive from history:
        // prefer an OPEN (non-completed) card - in-progress first, then the highest
        // open session - and fall back to the latest completed as "done for today".
        let chosen = current;
        if (!chosen) {
          const openCards = cards.filter(c => normStatus(c.status) !== 'completed');
          chosen = openCards.length > 0
            ? openCards.slice().sort((a, b) => {
                const ai = normStatus(a.status) === 'inprogress' ? 1 : 0;
                const bi = normStatus(b.status) === 'inprogress' ? 1 : 0;
                if (ai !== bi) return bi - ai;
                return (b.session || 0) - (a.session || 0);
              })[0]
            : (cards.length ? cards.reduce((max, c) => ((c.session || 0) >= (max?.session || 0) ? c : max), cards[0]) : null);
        }

        const cardId = idOf(chosen) || (sessionCardIds && sessionCardIds[sessionCardIds.length - 1]) || null;
        const rawStatus = normStatus(chosen?.status);
        const isCompleted = rawStatus === 'completed';
        setCardStatus(prev => ({
          ...prev,
          [playerId]: {
            activeCardId: (isCompleted || !cardId) ? null : cardId,
            loading: false,
            checked: true,
            isPending: rawStatus === 'pending',
            rawStatus: chosen?.status || '',
            sessionNumber: chosen?.session ?? null,
            sessionCardId: cardId,
          }
        }));
      }));

      if (!controller.signal.aborted) {
        setAllCards(collected);
        setAllCardsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [batchPlayers, userToken, cardRefreshKey]);

  // The coach does NOT generate session cards - that is the admin's job, done
  // ahead of time. Starting a class:
  //   1. saves attendance  (Absent → card auto-Pending, server-side)
  //   2. moves every PRESENT player's Upcoming card to In Progress - the class
  //      has begun, so "coach started coaching" is true for all of them
  //   3. opens the coaching view
  async function startClass() {
    if (!batch?.batchId) { toast('Batch not found', 'error'); return; }
    if (batchPlayers.length === 0) { toast('No players to mark', 'error'); return; }
    // Card statuses load in a separate pass; starting before they're ready would mark
    // attendance with no sessionCardId and skip moving cards to In Progress (the
    // "click Start twice" bug). Wait until each player's current card is known.
    if (allCardsLoading || attendanceLoading) { toast('Still loading players — one moment…'); return; }
    setStarting(true);
    setStartError('');
    try {
      // 1. attendance for everyone
      await Promise.all(batchPlayers.map(p => {
        const info = cardStatus[p.playerId];
        return fetch(CL_MARK_ATTENDANCE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', userToken },
          body: JSON.stringify({
            playerId: p.playerId,
            playerName: p.name,
            batchId: batch.batchId,
            batchName: batch.batchName,
            sessionNumber: info?.sessionNumber ?? null,
            sessionCardId: info?.sessionCardId || '',
            sessionDate: attendanceDate,
            attendanceStatus: statuses[String(p.playerId)] || 'Present',
            notes: '',
          }),
        });
      }));

      const presentPlayers = batchPlayers.filter(p => (statuses[String(p.playerId)] || 'Present') === 'Present');

      // 2. move present players' Upcoming cards to In Progress. Only touch cards
      // that are actually Upcoming - CL_Start_Session toggles (upcoming→in
      // progress, but in_progress→completed), so we must not call it on a card
      // that's already In Progress. Failures are non-fatal (the coach can still
      // open the card and start it from the session screen).
      await Promise.all(presentPlayers.map(async (p) => {
        const info = cardStatus[p.playerId];
        if (!info?.activeCardId || normStatus(info.rawStatus) !== 'upcoming') return;
        try {
          await fetch(CL_START_SESSION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', userToken },
            body: JSON.stringify({ sessionCardId: info.activeCardId }),
          });
        } catch { /* non-fatal */ }
      }));

      // "Missing" = has NO card at all. A completed player has activeCardId=null
      // (nothing startable) but still owns a card, so key off sessionCardId - otherwise
      // finishing a player would wrongly flag them as needing "Generate".
      const missingCards = presentPlayers.filter(p => !cardStatus[p.playerId]?.sessionCardId).map(p => p.name);

      setFetchKey(prev => prev + 1);
      setCardRefreshKey(prev => prev + 1);
      setClassStep('active');

      if (missingCards.length > 0) {
        setStartError(`No session card yet for: ${missingCards.join(', ')}. Use "Generate" on their card below to create it.`);
      }
      toast('Session started');
    } catch (e) {
      console.error('Failed to Start Session', e);
      toast('Failed to Start Session', 'error');
    } finally {
      setStarting(false);
    }
  }

  // Default the attendance date to the SESSION's own date (the one set at card
  // creation), not just "today" - the class happens on the session's scheduled
  // day. Applied once, after cards load; the coach can still change it in the
  // roster afterward.
  useEffect(() => {
    if (sessionDateApplied.current || allCards.length === 0) return;
    const rep = pickRepCard(allCards);
    const sd = rep?.sessionDate;
    if (sd && /^\d{4}-\d{2}-\d{2}$/.test(sd)) {
      sessionDateApplied.current = true;
      setAttendanceDate(sd);
    }
  }, [allCards]);

  // Delete all attendance for this batch on the selected date, then return to a
  // clean roster. Fixes records orphaned after their session cards were deleted.
  async function resetAttendance() {
    if (!batch?.batchId) { toast('Batch not found', 'error'); return; }
    setResetting(true);
    try {
      const res = await fetch(CL_MARK_ATTENDANCE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', userToken },
        body: JSON.stringify({ action: 'delete', batchId: batch.batchId, sessionDate: attendanceDate }),
      });
      if (!res.ok) throw new Error('delete failed');
      setStatuses({});
      setAlreadyMarked(false);
      setClassStep('attendance');
      setShowResetConfirm(false);
      setFetchKey(prev => prev + 1);
      toast('Attendance cleared for ' + attendanceDate);
    } catch (e) {
      console.error('Failed to reset attendance', e);
      toast('Failed to clear attendance', 'error');
    } finally {
      setResetting(false);
    }
  }

  if (!batch) return null;

  const presentPlayers = batchPlayers.filter(p => (statuses[String(p.playerId)] || 'Present') === 'Present');
  const absentCount = batchPlayers.length - presentPlayers.length;

  // "Manage & Generate Sessions" shows once the current session is SETTLED for every
  // player - i.e. nobody is still upcoming/in-progress. Completed (done) and pending
  // (missed/absent → make-up later) both count as settled, so an absent player doesn't
  // block advancing the batch. Requires each card to be checked so we don't flash it
  // while statuses load.
  const readyForNext = batchPlayers.length > 0 && batchPlayers.every(p => {
    const cs = cardStatus[p.playerId];
    if (!cs || !cs.checked) return false;
    const s = normStatus(cs.rawStatus);
    return s !== 'upcoming' && s !== 'draft' && s !== 'inprogress';
  });

  // The class is already running once any player's current card is in-progress or
  // completed. In that state, the roster (reached via "Edit Attendance") is an
  // UPDATE, not a fresh start - so the primary button says "Update Attendance".
  const classInProgress = batchPlayers.some(p => {
    const s = normStatus(cardStatus[p.playerId]?.rawStatus);
    return s === 'inprogress' || s === 'completed';
  });

  // Batch Details view: one expandable section per player, each holding that
  // player's full card history grouped by pathway (same UI as the admin Sessions
  // workspace). Player order follows the batch roster.
  const cardsByPlayer = batchPlayers.map(p => {
    const cards = allCards.filter(c => String(c.playerId) === String(p.playerId));
    const byPathway = {};
    cards.forEach(c => {
      const key = c.LearningPathway || p.LearningPathway || 'No pathway';
      (byPathway[key] = byPathway[key] || []).push(c);
    });
    const pathwayNames = Object.keys(byPathway).sort((a, b) => {
      if (a === batch.LearningPathway) return -1;
      if (b === batch.LearningPathway) return 1;
      return a.localeCompare(b);
    });
    return { player: p, cards, byPathway, pathwayNames };
  });

  // A batch moves together: generate the NEXT session for every player at once so
  // no one falls behind. Each player advances by their own +1 (the backend figures
  // out each one's next session), using the batch's pathway + the class date.
  async function generateBatch() {
    setBatchGenerating(true);
    setBatchGenDone(false);
    setBatchGenStatus({});
    let success = 0, failed = 0;

    for (const p of batchPlayers) {
      setBatchGenStatus(prev => ({ ...prev, [p.playerId]: { state: 'loading' } }));
      try {
        const res = await fetch(GENERATE_CARD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', userToken },
          body: JSON.stringify({
            playerId: p.playerId,
            LearningPathway: batch.LearningPathway || undefined,
            sessionDate: attendanceDate || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.message === 'Session created') {
          success += 1;
          setBatchGenStatus(prev => ({ ...prev, [p.playerId]: { state: 'success', session: data.session } }));
        } else {
          failed += 1;
          setBatchGenStatus(prev => ({ ...prev, [p.playerId]: { state: 'error', message: data.message || `Failed (${res.status})` } }));
        }
      } catch (e) {
        failed += 1;
        setBatchGenStatus(prev => ({ ...prev, [p.playerId]: { state: 'error', message: e.message || 'Failed' } }));
      }
    }

    setBatchGenDone(true);
    setBatchGenerating(false);
    setRosterKey(prev => prev + 1);
    setCardRefreshKey(prev => prev + 1);
    toast(failed === 0 ? `Generated the next session for ${success} player${success === 1 ? '' : 's'}` : `Generated ${success}, ${failed} failed`, failed === 0 ? 'success' : 'error');
  }

  async function deleteCard() {
    if (!deleteCardId) return;
    setDeletingCard(true);
    try {
      const res = await fetch(DELETE_SESSIONCARD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', userToken },
        body: JSON.stringify({ sessionCardId: deleteCardId }),
      });
      if (!res.ok) throw new Error('delete failed');
      setDeleteCardId(null);
      setCardRefreshKey(prev => prev + 1);
      toast('Session card deleted');
    } catch (e) {
      console.error('Failed to delete card', e);
      toast('Failed to delete card', 'error');
    } finally {
      setDeletingCard(false);
    }
  }

  // "Preview" = today's session content. Best representative: an active
  // (non-completed) card everyone's roughly on; else the newest card overall.
  const representativeCard = pickRepCard(allCards);

  return (
    <Layout>
      <style>{`
        @keyframes skPulse { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
      {toastMsg && (
        <Toast message={toastMsg} type={toastType} duration={3000} onClose={() => setToastMsg('')} />
      )}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
          borderRadius: '20px', padding: '28px 32px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
          boxShadow: '0 12px 40px rgba(6,0,48,.3)', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => navigate('/coach')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                borderRadius: '8px', background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)', color: 'white',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer', flexShrink: 0
              }}
            >
              <ChevronLeft size={14} /> Back
            </button>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,.12)', border: '1.5px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Layers size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: '0 0 3px', letterSpacing: '-.5px' }}>
                {batch.batchName}
              </h1>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.6)', margin: 0, fontWeight: '500' }}>
                {view === 'details'
                  ? `${batchPlayers.length} player${batchPlayers.length === 1 ? '' : 's'} · where everyone is right now`
                  : classStep === 'attendance'
                  ? `${batchPlayers.length} player${batchPlayers.length === 1 ? '' : 's'} · tick who's here, then Start Session`
                  : `${presentPlayers.length} present · tap a name to coach`}
              </p>
              {representativeCard && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 11px', borderRadius: '999px', background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.22)', fontSize: '12px', fontWeight: '700', color: '#fff' }}>
                    <CalendarCheck size={12} /> Session {representativeCard.session ?? '-'}
                    {representativeCard.sessionDate && <span style={{ fontWeight: '600', color: 'rgba(255,255,255,.85)' }}>· {representativeCard.sessionDate}</span>}
                  </span>
                  {representativeCard.Topic && (
                    <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,.85)', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '360px' }}>
                      {representativeCard.Topic}
                    </span>
                  )}
                  {representativeCard.LearningPathway && (
                    <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,.55)' }}>· {representativeCard.LearningPathway}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setPreviewOpenIdx(0); setPreviewCard(representativeCard); }}
              disabled={!representativeCard}
              title={representativeCard ? 'Preview today’s session content' : 'No session card to preview yet'}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px',
                borderRadius: '9px', background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)', color: 'white',
                fontSize: '12.5px', fontWeight: '700',
                cursor: representativeCard ? 'pointer' : 'not-allowed', opacity: representativeCard ? 1 : 0.5,
              }}
            >
              <Eye size={14} /> Preview Session
            </button>
            {view === 'class' && classStep === 'active' && (
              <button
                onClick={() => setClassStep('attendance')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px',
                  borderRadius: '9px', background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)',
                  fontSize: '12.5px', fontWeight: '600', cursor: 'pointer',
                }}
              >
                <RotateCcw size={13} /> Edit Attendance
              </button>
            )}
          </div>
        </div>

        {/* Tabs: Today's Session ↔ Batch Details */}
        <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', padding: '4px', borderRadius: '12px', marginBottom: '20px', width: 'fit-content' }}>
          {[{ key: 'class', label: 'Today’s Session', Icon: CalendarCheck }, { key: 'details', label: 'Batch Details', Icon: Layers }].map(t => {
            const active = view === t.key;
            return (
              <button key={t.key} onClick={() => setView(t.key)} style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px',
                borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                background: active ? 'white' : 'transparent',
                color: active ? '#060030' : '#6b7280',
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
              }}>
                <t.Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* ═══ STEP 1: ROSTER + Start Session═══ */}
        {view === 'class' && classStep === 'attendance' && (
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1.5px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '12px', padding: '18px 24px', borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CalendarCheck size={18} color="#6366F1" />
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>Who's here today?</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '.4px' }}>Session date</span>
                  <input
                    type="date"
                    value={attendanceDate}
                    max={today}
                    onChange={(e) => setAttendanceDate(e.target.value > today ? today : e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #E2E8F0', fontSize: '13px', color: '#0F172A', outline: 'none', background: '#FFFFFF', cursor: 'pointer' }}
                  />
                </label>
                <button
                  onClick={markAllPresent}
                  disabled={batchPlayers.length === 0 || attendanceLoading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', marginTop: '17px',
                    padding: '9px 14px', borderRadius: '8px', border: '1px solid #bbf7d0',
                    background: '#dcfce7', color: '#16a34a', fontWeight: '600', fontSize: '13px',
                    cursor: (batchPlayers.length === 0 || attendanceLoading) ? 'not-allowed' : 'pointer',
                    opacity: (batchPlayers.length === 0 || attendanceLoading) ? 0.6 : 1
                  }}
                >
                  <CheckCircle size={15} /> All Present
                </button>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  disabled={batchPlayers.length === 0 || attendanceLoading || resetting}
                  title="Delete all attendance for this batch on the selected date"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', marginTop: '17px',
                    padding: '9px 14px', borderRadius: '8px', border: '1px solid #FECACA',
                    background: '#FEF2F2', color: '#DC2626', fontWeight: '600', fontSize: '13px',
                    cursor: (batchPlayers.length === 0 || attendanceLoading || resetting) ? 'not-allowed' : 'pointer',
                    opacity: (batchPlayers.length === 0 || attendanceLoading || resetting) ? 0.6 : 1
                  }}
                >
                  <Trash2 size={15} /> Reset
                </button>
              </div>
            </div>

            {alreadyMarked && attendanceDate === today && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
                <CheckCircle size={15} color="#16a34a" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#15803d' }}>Attendance already marked for today - starting again will update it</span>
              </div>
            )}

            {initialLoading || attendanceLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '20px 24px' }}>
                {[1, 2, 3].map(i => <Sk key={i} w="100%" h={48} r={10} />)}
              </div>
            ) : batchPlayers.length === 0 ? (
              <div style={{ padding: '56px 32px', textAlign: 'center' }}>
                <Users size={48} style={{ margin: '0 auto 14px', opacity: 0.15, color: '#94A3B8', display: 'block' }} />
                <p style={{ fontSize: '15px', fontWeight: '600', color: '#374151', margin: 0 }}>No players in this batch</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {batchPlayers.map((player, idx) => {
                  const status = statuses[String(player.playerId)] || 'Present';
                  const isPresent = status === 'Present';
                  const [avatarColor] = pal(player.name || '');
                  return (
                    <div key={player.playerId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 24px', flexWrap: 'wrap', borderTop: idx === 0 ? 'none' : '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, background: avatarColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800' }}>
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A' }}>{player.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setStatus(player.playerId, 'Present')}
                          style={{
                            padding: '8px 16px', borderRadius: '999px', border: `1.5px solid ${isPresent ? '#16a34a' : '#E2E8F0'}`,
                            background: isPresent ? '#dcfce7' : '#fff', color: isPresent ? '#16a34a' : '#94A3B8',
                            fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                          }}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => setStatus(player.playerId, 'Absent')}
                          style={{
                            padding: '8px 16px', borderRadius: '999px', border: `1.5px solid ${!isPresent ? '#dc2626' : '#E2E8F0'}`,
                            background: !isPresent ? '#fee2e2' : '#fff', color: !isPresent ? '#dc2626' : '#94A3B8',
                            fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                          }}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ padding: '18px 24px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <button
                onClick={startClass}
                disabled={starting || initialLoading || allCardsLoading || attendanceLoading || batchPlayers.length === 0}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  padding: '14px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #060030 0%, #3b0080 100%)', color: 'white',
                  fontWeight: '800', fontSize: '15px',
                  cursor: (starting || initialLoading || allCardsLoading || attendanceLoading || batchPlayers.length === 0) ? 'not-allowed' : 'pointer',
                  opacity: (starting || initialLoading || allCardsLoading || attendanceLoading || batchPlayers.length === 0) ? 0.7 : 1,
                  boxShadow: '0 8px 24px rgba(6,0,48,.3)',
                }}
              >
                {starting
                  ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> {classInProgress ? 'Updating attendance…' : 'Starting Session…'}</>
                  : (allCardsLoading || attendanceLoading)
                  ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading players…</>
                  : classInProgress
                  ? <><RotateCcw size={18} /> Update Attendance{absentCount > 0 ? ` (${presentPlayers.length} present)` : ''}</>
                  : <><Play size={18} /> Start Session{absentCount > 0 ? ` (${presentPlayers.length} present)` : ''}</>}
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: coach ═══ */}
        {view === 'class' && classStep === 'active' && (
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1.5px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>Tap a player to coach</span>
                {startError && (
                  <p style={{ fontSize: '12.5px', color: '#DC2626', margin: '8px 0 0', lineHeight: 1.5 }}>
                    {startError}
                  </p>
                )}
              </div>
              {readyForNext && (
                <button
                  onClick={() => navigate('/admin/session-card', { state: { batchId: batch.batchId } })}
                  title="Open Session Card Management for this batch to manage and generate sessions"
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '9px', background: 'linear-gradient(135deg, #060030, #3b0080)', color: '#fff', border: 'none', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}
                >
                  <Sparkles size={14} /> Manage &amp; Generate Sessions
                </button>
              )}
            </div>

            <div style={{ padding: '20px 24px' }}>
              {initialLoading ? (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {[1, 2, 3].map(i => <Sk key={i} w={150} h={64} r={14} />)}
                </div>
              ) : presentPlayers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <Users size={40} style={{ opacity: 0.15, color: '#94A3B8', margin: '0 auto 10px', display: 'block' }} />
                  <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Nobody marked present for this class.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {presentPlayers.map(player => {
                    const cs = cardStatus[player.playerId];
                    const isLoadingCard = cs?.loading ?? true;
                    const hasOpenCard = Boolean(cs?.activeCardId);         // in-progress / upcoming / pending
                    const latestCompleted = !hasOpenCard && cs?.checked && cs?.sessionNumber != null && normStatus(cs?.rawStatus) === 'completed';
                    const noCard = !hasOpenCard && cs?.checked && cs?.sessionNumber == null;
                    const [avatarColor] = pal(player.name || '');

                    const openCard = () => {
                      if (!cs?.activeCardId) return;
                      navigate(`/coach/session/${cs.activeCardId}`, {
                        state: {
                          batch,
                          batchPlayerCards: presentPlayers.map(p => ({
                            playerId: p.playerId, name: p.name,
                            activeCardId: cardStatus[p.playerId]?.activeCardId || null,
                          })),
                          activePlayerId: player.playerId,
                        },
                      });
                    };

                    return (
                      <div
                        key={player.playerId}
                        onClick={hasOpenCard ? openCard : undefined}
                        style={{
                          display: 'flex', flexDirection: 'column', gap: '10px',
                          padding: '14px 16px', borderRadius: '14px',
                          border: `1.5px solid ${hasOpenCard ? avatarColor + '55' : '#E2E8F0'}`,
                          background: hasOpenCard ? avatarColor + '0D' : '#F9FAFB',
                          cursor: hasOpenCard ? 'pointer' : 'default',
                          minWidth: '210px', transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', color: '#fff' }}>
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', flex: 1 }}>{player.name}</span>
                          {isLoadingCard
                            ? <Loader size={14} style={{ animation: 'spin 1s linear infinite', color: '#94A3B8' }} />
                            : hasOpenCard && <ArrowRight size={16} color={avatarColor} />}
                        </div>

                        {!isLoadingCard && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {cs?.sessionNumber != null && (
                              <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Session {cs.sessionNumber}</span>
                            )}
                            {(hasOpenCard || latestCompleted) && <StatusBadge status={cs.rawStatus || 'upcoming'} size="sm" />}
                            {noCard && <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#94A3B8' }}>No session yet</span>}
                            {latestCompleted && <span style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8' }}>· done for today</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ BATCH DETAILS: every session card, grouped by pathway ═══ */}
        {view === 'details' && (
          <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1.5px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>Sessions by player</span>
              <p style={{ fontSize: '12.5px', color: '#64748B', margin: '3px 0 0' }}>Tap a player to view their cards · open to view or edit</p>
            </div>

            {allCardsLoading && allCards.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '20px 24px' }}>
                {[1, 2, 3].map(i => <Sk key={i} w="100%" h={48} r={10} />)}
              </div>
            ) : batchPlayers.length === 0 ? (
              <div style={{ padding: '48px 32px', textAlign: 'center' }}>
                <Layers size={40} style={{ opacity: 0.15, color: '#94A3B8', margin: '0 auto 10px', display: 'block' }} />
                <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>No players in this batch yet.</p>
              </div>
            ) : (
              <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {cardsByPlayer.map(({ player, cards, byPathway, pathwayNames }) => {
                  const [c1] = pal(player.name || '');
                  const isOpen = !!expandedPlayer[player.playerId];
                  const cs = cardStatus[player.playerId];
                  return (
                    <div key={player.playerId} style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
                      {/* Clickable player header */}
                      <button
                        onClick={() => setExpandedPlayer(prev => ({ ...prev, [player.playerId]: !prev[player.playerId] }))}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: isOpen ? '#F5F7FF' : '#FAFBFC', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                      >
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: c1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '13px', flexShrink: 0 }}>
                          {(player.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13.5px', fontWeight: '700', margin: 0, color: '#0F172A' }}>{player.name}</p>
                          <p style={{ fontSize: '11px', color: '#94A3B8', margin: '2px 0 0' }}>
                            {cs?.loading ? 'Loading cards…'
                              : cs?.sessionNumber != null ? `On Session ${cs.sessionNumber} · ${cs.rawStatus || 'upcoming'}`
                              : `${cards.length} card${cards.length === 1 ? '' : 's'}`}
                          </p>
                        </div>
                        {cs?.rawStatus && <StatusBadge status={cs.rawStatus} size="sm" />}
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', background: '#F1F5F9', padding: '3px 10px', borderRadius: '20px', flexShrink: 0 }}>
                          {cards.length} card{cards.length === 1 ? '' : 's'}
                        </span>
                        <ChevronDown size={16} color="#94A3B8" style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                      </button>

                      {/* Expanded: cards grouped by pathway */}
                      {isOpen && (
                        <div style={{ padding: '12px 14px', borderTop: '1px solid #E5E7EB' }}>
                          {cards.length === 0 ? (
                            <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>No cards yet — ask an admin to generate sessions.</p>
                          ) : (
                            pathwayNames.map(pathwayName => (
                              <div key={pathwayName} style={{ marginBottom: '10px' }}>
                                {pathwayNames.length > 1 && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.3px' }}>{pathwayName}</span>
                                    {pathwayName === batch.LearningPathway && (
                                      <span style={{ fontSize: '9.5px', fontWeight: '700', color: '#4F46E5', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: '20px' }}>Batch pathway</span>
                                    )}
                                  </div>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '10px' }}>
                                  {byPathway[pathwayName]
                                    .slice()
                                    .sort((a, b) => (b.session || 0) - (a.session || 0))
                                    .map(card => {
                                      const sc = statusColors(card.status);
                                      const isCompleted = normStatus(card.status) === 'completed';
                                      return (
                                        <div key={card._cardId} style={{ borderRadius: '10px', border: '1px solid #E5E7EB', background: '#fff', overflow: 'hidden' }}>
                                          <div style={{ height: '3px', background: sc.text }} />
                                          <div style={{ padding: '11px 12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                              <span style={{ fontSize: '11px', fontWeight: '800', color: '#4F46E5' }}>Session {card.session ?? '-'}</span>
                                              <span style={{ fontSize: '9.5px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: sc.bg, color: sc.text, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{card.status || 'Draft'}</span>
                                            </div>
                                            <p style={{ fontSize: '12.5px', fontWeight: '700', color: '#0F172A', margin: '0 0 8px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{card.Topic || 'Untitled'}</p>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                              <button onClick={() => navigate(isCompleted ? `/coach/view-completed-session/${card._cardId}` : `/coach/session/${card._cardId}`, { state: { batch } })}
                                                style={{ flex: 1, padding: '5px 8px', background: '#EEF2FF', color: '#4F46E5', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                <Eye size={12} /> View
                                              </button>
                                              {!isCompleted && (
                                                <button onClick={() => navigate(`/admin/edit-session-card/${card._cardId}`, { state: { batchId: batch.batchId, playerId: player.playerId } })}
                                                  style={{ flex: 1, padding: '5px 8px', background: '#FEF3C7', color: '#92400E', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                  <Edit3 size={12} /> Edit
                                                </button>
                                              )}
                                              {!isCompleted && (
                                                <button onClick={() => navigate(`/coach/start-session/${player.playerId}`)} title="Start this player's session"
                                                  style={{ flex: 1, padding: '5px 8px', background: '#DCFCE7', color: '#15803D', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                  <Play size={12} /> Start
                                                </button>
                                              )}
                                              <button onClick={() => setDeleteCardId(card._cardId)} title="Delete card"
                                                style={{ padding: '5px 8px', background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                <Trash2 size={12} />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Generate next session for the whole batch (confirm → progress) */}
      {showBatchGen && (() => {
        const inProgress = batchPlayers.filter(p => normStatus(cardStatus[p.playerId]?.rawStatus) === 'inprogress');
        const running = batchGenerating || batchGenDone;
        return (
          <Modal isOpen={showBatchGen} onClose={() => { if (!batchGenerating) setShowBatchGen(false); }} title={batchGenDone ? 'Batch generation complete' : 'Generate next session for the batch'}>
            <div style={{ width: 'min(92vw, 480px)', padding: '4px 4px 8px' }}>
              {!running ? (
                <>
                  <p style={{ fontSize: '13.5px', color: '#334155', margin: '0 0 14px', lineHeight: 1.6 }}>
                    This creates the <strong>next session card</strong> for all <strong>{batchPlayers.length}</strong> player{batchPlayers.length === 1 ? '' : 's'} in <strong>{batch.batchName}</strong> — so the whole batch moves forward together.
                  </p>
                  {inProgress.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px', padding: '12px 14px', borderRadius: '10px', background: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: '16px' }}>
                      <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '1px' }} />
                      <p style={{ fontSize: '12.5px', color: '#92400E', margin: 0, lineHeight: 1.55 }}>
                        Still <strong>In Progress</strong>: {inProgress.map(p => p.name).join(', ')}. Their current session will be moved to <strong>Pending</strong> (a make-up you can finish later). Finish teaching them first if you're not done.
                      </p>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button onClick={() => setShowBatchGen(false)} style={{ padding: '11px 16px', borderRadius: '9px', fontWeight: '600', background: '#F3F4F6', color: '#111827', border: '1.5px solid #E5E7EB', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                    <button onClick={generateBatch} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '11px 16px', borderRadius: '9px', fontWeight: '700', background: 'linear-gradient(135deg, #060030, #3b0080)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                      <Sparkles size={15} /> Generate for all
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
                    {batchPlayers.map(p => {
                      const st = batchGenStatus[p.playerId]?.state || 'idle';
                      const msg = batchGenStatus[p.playerId]?.message;
                      const sess = batchGenStatus[p.playerId]?.session;
                      const [c1] = pal(p.name || '');
                      return (
                        <div key={p.playerId} style={{ padding: '10px 12px', borderRadius: '10px', border: `1px solid ${st === 'error' ? '#FECACA' : '#E5E7EB'}`, background: st === 'error' ? '#FFFBFB' : '#fff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: c1, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '12px', flexShrink: 0 }}>{(p.name || '?').charAt(0).toUpperCase()}</div>
                            <span style={{ flex: 1, fontSize: '13.5px', fontWeight: '600', color: '#0F172A' }}>{p.name}</span>
                            {st === 'loading' && <Loader size={15} style={{ animation: 'spin 1s linear infinite', color: '#6366F1' }} />}
                            {st === 'success' && <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#16A34A', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={14} /> Session {sess}</span>}
                            {st === 'error' && <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={14} /> Failed</span>}
                            {st === 'idle' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#CBD5E1' }} />}
                          </div>
                          {st === 'error' && msg && <p style={{ fontSize: '11.5px', color: '#991B1B', margin: '6px 0 0 40px' }}>{msg}</p>}
                        </div>
                      );
                    })}
                  </div>
                  {batchGenDone && (
                    <button onClick={() => setShowBatchGen(false)} style={{ marginTop: '16px', width: '100%', padding: '11px 16px', borderRadius: '9px', fontWeight: '700', background: 'linear-gradient(135deg, #060030, #000)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px' }}>Done</button>
                  )}
                </>
              )}
            </div>
          </Modal>
        );
      })()}

      {/* Confirm delete session card */}
      {deleteCardId && (
        <Modal isOpen={!!deleteCardId} onClose={() => { if (!deletingCard) setDeleteCardId(null); }} title="Delete session card?">
          <div style={{ width: 'min(90vw, 380px)', padding: '20px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Trash2 size={26} color="#EF4444" />
            </div>
            <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 20px' }}>This permanently deletes the session card. This can't be undone.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={() => setDeleteCardId(null)} disabled={deletingCard} style={{ padding: '10px 16px', borderRadius: '8px', fontWeight: '600', background: '#F3F4F6', color: '#111827', border: '1px solid #E5E7EB', cursor: deletingCard ? 'not-allowed' : 'pointer' }}>Cancel</button>
              <button onClick={deleteCard} disabled={deletingCard} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px 16px', borderRadius: '8px', fontWeight: '700', background: '#EF4444', color: 'white', border: 'none', cursor: deletingCard ? 'not-allowed' : 'pointer' }}>
                {deletingCard ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Deleting…</> : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm attendance reset */}
      {showResetConfirm && (
        <Modal isOpen={showResetConfirm} onClose={() => { if (!resetting) setShowResetConfirm(false); }} title="Reset attendance?">
          <div style={{ width: 'min(90vw, 440px)', padding: '4px 4px 8px' }}>
            <div style={{ display: 'flex', gap: '12px', padding: '14px 16px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FECACA', marginBottom: '18px' }}>
              <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <p style={{ fontSize: '13.5px', color: '#7F1D1D', margin: 0, lineHeight: 1.6 }}>
                  This deletes <strong>all attendance</strong> for <strong>{batch.batchName}</strong> on <strong>{attendanceDate}</strong>. The roster resets so you can mark it again. This can't be undone.
                </p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={resetting}
                style={{ padding: '11px 16px', borderRadius: '9px', fontWeight: '600', background: '#F3F4F6', color: '#111827', border: '1.5px solid #E5E7EB', cursor: resetting ? 'not-allowed' : 'pointer', fontSize: '14px' }}
              >
                Cancel
              </button>
              <button
                onClick={resetAttendance}
                disabled={resetting}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '11px 16px', borderRadius: '9px', fontWeight: '700', background: 'linear-gradient(135deg, #DC2626, #991B1B)', color: '#fff', border: 'none', cursor: resetting ? 'not-allowed' : 'pointer', fontSize: '14px', opacity: resetting ? 0.8 : 1 }}
              >
                {resetting ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Clearing…</> : <><Trash2 size={15} /> Reset Attendance</>}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Read-only preview of today's session content */}
      {previewCard && (() => {
        const acts = previewCard.activities || [];
        const totalPts = previewCard.totalPoints ?? acts.reduce((s, a) => s + (a?.points?.total || 0), 0);
        const totalDur = previewCard.totalDuration ?? acts.reduce((s, a) => s + (a?.duration || 0), 0);
        const takeaways = toLines(previewCard.sessionTakeaways);
        const meta = [
          { Icon: ListChecks, label: `${acts.length} ${acts.length === 1 ? 'activity' : 'activities'}` },
          totalPts ? { Icon: Zap, label: `${totalPts} pts` } : null,
          totalDur ? { Icon: Clock, label: `${totalDur} min` } : null,
          previewCard.SessionType ? { Icon: Target, label: previewCard.SessionType } : null,
        ].filter(Boolean);

        return (
        <Modal isOpen={!!previewCard} onClose={() => setPreviewCard(null)} title="Session Preview">
          <div style={{ width: 'min(88vw, 600px)' }}>
            {/* Hero */}
            <div style={{ background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)', color: '#fff', padding: '22px 24px', borderRadius: '16px', marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '.6px', color: 'rgba(255,255,255,.6)', textTransform: 'uppercase' }}>
                Session {previewCard.session ?? '-'}{previewCard.sessionDate ? ` · ${previewCard.sessionDate}` : ''}
              </span>
              <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '6px 0 4px', letterSpacing: '-.3px' }}>{previewCard.Topic || 'Session'}</h2>
              {previewCard.LearningPathway && (
                <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,.75)', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <BookOpen size={12} /> {previewCard.LearningPathway}
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
                {meta.map((m, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 11px', borderRadius: '999px', background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.2)', fontSize: '11.5px', fontWeight: '700' }}>
                    <m.Icon size={12} /> {m.label}
                  </span>
                ))}
              </div>
            </div>

            <div>
              {/* Objective */}
              {previewCard.Objective && stripHtml(previewCard.Objective) && stripHtml(previewCard.Objective) !== 'No objective' && (
                <div style={{ display: 'flex', gap: '12px', padding: '14px 16px', borderRadius: '12px', background: '#EEF2FF', border: '1px solid #C7D2FE', marginBottom: '18px' }}>
                  <Target size={18} color="#4F46E5" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: '800', color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '.4px', margin: '0 0 4px' }}>Objective</p>
                    <p style={{ fontSize: '13.5px', color: '#334155', margin: 0, lineHeight: 1.6 }}>{stripHtml(previewCard.Objective)}</p>
                  </div>
                </div>
              )}

              {/* Takeaways */}
              {takeaways.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.4px', margin: '0 0 8px' }}>Session Takeaways</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {takeaways.map((t, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                        <CheckCircle size={14} color="#16A34A" style={{ flexShrink: 0, marginTop: '2px' }} /> {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activities accordion */}
              <p style={{ fontSize: '11px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.4px', margin: '0 0 10px' }}>
                Activities ({acts.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {acts.map((a, i) => {
                  const open = previewOpenIdx === i;
                  const story = toLines(a.story);
                  const instructions = toLines(a.instructionsToCoach);
                  const criteria = toLines(a.points?.evaluationCriteria);
                  const codeContent = a.code?.content || (typeof a.code === 'string' ? a.code : '');
                  const aiTools = Array.isArray(a.aiTools) ? a.aiTools : [];
                  const desc = stripHtml(a.description);
                  return (
                    <div key={i} style={{ borderRadius: '12px', border: `1.5px solid ${open ? '#C7D2FE' : '#E5E7EB'}`, overflow: 'hidden', background: '#fff' }}>
                      <button
                        onClick={() => setPreviewOpenIdx(open ? null : i)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: open ? '#F5F3FF' : '#F9FAFB', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                      >
                        <span style={{ width: '24px', height: '24px', borderRadius: '7px', background: '#4F46E5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#0F172A', flex: 1 }}>{a.activityTitle || a.name || 'Activity'}</span>
                        {a.duration ? <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Clock size={11} /> {a.duration}m</span> : null}
                        {a.points?.total != null && <span style={{ fontSize: '11px', fontWeight: '700', color: '#16A34A' }}>{a.points.total} pts</span>}
                        <ChevronDown size={16} color="#94A3B8" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                      </button>

                      {open && (
                        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid #EEF2FF' }}>
                          {desc && (
                            <p style={{ fontSize: '13px', color: '#334155', margin: 0, lineHeight: 1.65 }}>{desc}</p>
                          )}
                          {story.length > 0 && (
                            <div>
                              <p style={{ fontSize: '10.5px', fontWeight: '800', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '.4px', margin: '0 0 6px' }}>Story</p>
                              {story.map((s, k) => <p key={k} style={{ fontSize: '13px', color: '#334155', margin: k ? '6px 0 0' : 0, lineHeight: 1.6 }}>{s}</p>)}
                            </div>
                          )}
                          {instructions.length > 0 && (
                            <div>
                              <p style={{ fontSize: '10.5px', fontWeight: '800', color: '#16A34A', textTransform: 'uppercase', letterSpacing: '.4px', margin: '0 0 6px' }}>Instructions to Coach</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                {instructions.map((s, k) => (
                                  <div key={k} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px', color: '#334155', lineHeight: 1.55 }}>
                                    <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800', flexShrink: 0, marginTop: '1px' }}>{k + 1}</span>
                                    {s}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {codeContent && (
                            <div>
                              <p style={{ fontSize: '10.5px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '.4px', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Code size={12} /> Code{a.code?.language ? ` · ${a.code.language}` : ''}
                              </p>
                              <pre style={{ margin: 0, padding: '12px', borderRadius: '8px', background: '#0F172A', color: '#E2E8F0', fontSize: '12px', lineHeight: 1.5, overflowX: 'auto', fontFamily: 'monospace' }}>{codeContent}</pre>
                            </div>
                          )}
                          {aiTools.length > 0 && (
                            <div>
                              <p style={{ fontSize: '10.5px', fontWeight: '800', color: '#D97706', textTransform: 'uppercase', letterSpacing: '.4px', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Sparkles size={12} /> AI Tools
                              </p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {aiTools.map((t, k) => (
                                  <div key={k} style={{ padding: '8px 12px', borderRadius: '8px', background: '#FEF3C7', border: '1px solid #FCD34D' }}>
                                    <p style={{ fontSize: '12.5px', fontWeight: '700', color: '#92400E', margin: 0 }}>{t.toolName || 'Tool'}</p>
                                    {t.usagePurpose && <p style={{ fontSize: '12px', color: '#78716C', margin: '2px 0 0' }}>{t.usagePurpose}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {criteria.length > 0 && (
                            <div>
                              <p style={{ fontSize: '10.5px', fontWeight: '800', color: '#DC2626', textTransform: 'uppercase', letterSpacing: '.4px', margin: '0 0 6px' }}>Evaluation Criteria</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {criteria.map((s, k) => (
                                  <div key={k} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12.5px', color: '#334155', lineHeight: 1.5 }}>
                                    <span style={{ color: '#DC2626', fontWeight: '800' }}>•</span> {s}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {!desc && !story.length && !instructions.length && !codeContent && !aiTools.length && !criteria.length && (
                            <p style={{ fontSize: '12.5px', color: '#94A3B8', margin: 0 }}>No extra details for this activity.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {acts.length === 0 && (
                  <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>No activities in this session.</p>
                )}
              </div>
            </div>
          </div>
        </Modal>
        );
      })()}
    </Layout>
  );
};

export default BatchSessionView;
