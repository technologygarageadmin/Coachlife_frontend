import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/store';
import { useTheme } from '../../context/ThemeContext';
import { Layout } from '../../components/Layout';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Users, Layers,
  X, CircleDashed, CheckCircle, Play, AlertTriangle, BookOpen, RefreshCw,
} from 'lucide-react';
import { getBatches, getSessionCards, getCurrentCardsByPlayer, normalizeSessionCardIds } from '../../utils/dataService';
import { getCached, setCached, invalidate, TTL } from '../../utils/apiCache';

const BRAND = '#060030ff';

// Events drawn in a month cell before collapsing into "+N more"
const MONTH_CELL_EVENTS = 3;

// Mon-first everywhere, matching how batch.days is stored across the app
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const toDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const parseDateStr = (s) => {
  const [y, m, d] = (s || '').split('-').map(Number);
  return (y && m && d) ? new Date(y, m - 1, d) : null;
};

/**
 * A card's sessionDate as a LOCAL calendar day.
 *
 * A bare "YYYY-MM-DD" is already a calendar date with no timezone - it must be
 * used verbatim. Running it through `new Date()` would parse it as UTC midnight
 * and shift it a day backwards for anyone west of UTC. A full timestamp, on the
 * other hand, does need converting: 2026-08-15T18:30:00Z is 16 Aug in IST.
 */
const toLocalDateStr = (value) => {
  if (!value) return '';
  if (typeof value === 'string') {
    const bare = value.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (bare) return bare[1];
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : toDateStr(d);
};
const addDays = (d, n) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };
// Monday of the week containing d
const startOfWeek = (d) => addDays(d, -((d.getDay() + 6) % 7));
const weekdayAbbr = (d) => DAYS[(d.getDay() + 6) % 7];
const sameDay = (a, b) => toDateStr(a) === toDateStr(b);

const normStatus = (s) => (s || '').toLowerCase().replace(/[\s_]/g, '');

const STATUS_STYLE = {
  completed:  { label: 'Completed',   color: '#16A34A', bg: 'rgba(22,163,74,0.12)',  Icon: CheckCircle },
  inprogress: { label: 'In Progress', color: '#4F46E5', bg: 'rgba(79,70,229,0.12)',  Icon: Play },
  upcoming:   { label: 'Upcoming',    color: '#2563EB', bg: 'rgba(37,99,235,0.12)',  Icon: CalendarIcon },
  pending:    { label: 'Pending',     color: '#D97706', bg: 'rgba(217,119,6,0.12)',  Icon: AlertTriangle },
  empty:      { label: 'Empty',       color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', Icon: CircleDashed },
};
const statusOf = (raw) => {
  const s = normStatus(raw);
  if (s === 'completed' || s === 'submitted') return 'completed';
  if (s === 'inprogress') return 'inprogress';
  if (s === 'upcoming' || s === 'draft') return 'upcoming';
  if (s === 'empty') return 'empty';
  if (s) return 'pending';
  return 'upcoming';
};

// "17:30" -> minutes since midnight; null when unparseable
const toMinutes = (t) => {
  if (!t || typeof t !== 'string') return null;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};
const fmtTime = (t) => {
  const mins = toMinutes(t);
  if (mins == null) return '';
  const h = Math.floor(mins / 60), mm = String(mins % 60).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${ampm}`;
};

/**
 * Side-by-side layout for events that overlap in time (the Outlook/Google rule).
 * Without this, two classes at the same hour would be drawn on top of each other
 * and only the last one painted would be visible.
 *
 * Events are grouped into clusters of mutually overlapping items; within a
 * cluster each event takes the first column whose previous event has already
 * ended, and every event in that cluster is drawn at 1/columns width.
 * Returns copies carrying `_col` and `_cols`.
 */
const layoutTimedEvents = (events) => {
  const span = (ev) => {
    const s = toMinutes(ev.startTime);
    return { s, e: Math.max(toMinutes(ev.endTime) ?? s + 60, s + 30) };
  };

  const sorted = [...events].sort((a, b) => {
    const sa = span(a), sb = span(b);
    return sa.s !== sb.s ? sa.s - sb.s : sa.e - sb.e;
  });

  const out = [];
  let cluster = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const colEnds = [];
    const placed = cluster.map(ev => {
      const { s, e } = span(ev);
      let col = colEnds.findIndex(end => end <= s);
      if (col === -1) { col = colEnds.length; colEnds.push(e); }
      else colEnds[col] = e;
      return { ...ev, _col: col };
    });
    placed.forEach(ev => out.push({ ...ev, _cols: colEnds.length }));
    cluster = [];
    clusterEnd = -1;
  };

  sorted.forEach(ev => {
    const { s, e } = span(ev);
    if (cluster.length > 0 && s >= clusterEnd) flush();
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, e);
  });
  flush();

  return out;
};

/* An event is one class: a batch on a date, or a single unbatched player's card. */
const eventAccent = (ev) => {
  if (ev.kind === 'projected') return '#94A3B8';
  return STATUS_STYLE[ev.dominantStatus]?.color || BRAND;
};

const EventChip = memo(({ ev, onClick, compact, dark }) => {
  const accent = eventAccent(ev);
  const projected = ev.kind === 'projected';
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(ev); }}
      title={`${ev.title}${ev.startTime ? ` · ${fmtTime(ev.startTime)}` : ''}${projected ? ' · not generated yet' : ''}`}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        padding: compact ? '3px 6px' : '6px 8px',
        borderRadius: '6px',
        border: projected ? `1.5px dashed ${accent}` : `1px solid ${accent}33`,
        borderLeft: projected ? `1.5px dashed ${accent}` : `3px solid ${accent}`,
        background: projected ? 'transparent' : (dark ? `${accent}22` : `${accent}14`),
        color: dark ? 'var(--cl-text)' : '#0F172A',
        display: 'block', overflow: 'hidden',
        fontFamily: 'inherit',
      }}
    >
      <span style={{
        display: 'block', fontSize: compact ? '10.5px' : '12px', fontWeight: 700,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        opacity: projected ? 0.75 : 1,
      }}>
        {ev.startTime ? `${fmtTime(ev.startTime)} ` : ''}{ev.title}
      </span>
      {!compact && (
        <span style={{
          display: 'block', fontSize: '10.5px', fontWeight: 500, marginTop: '2px',
          color: dark ? 'var(--cl-text-3)' : '#64748B',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {ev.subtitle}
        </span>
      )}
    </button>
  );
});
EventChip.displayName = 'EventChip';

const CalendarPage = () => {
  const navigate = useNavigate();
  const { currentUser, userToken, fetchPlayers, fetchAssignedPlayersForCoach } = useStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const surface = dark ? 'var(--cl-surface)' : '#FFFFFF';
  const surface2 = dark ? 'var(--cl-surface-2)' : '#F8FAFC';
  const border = dark ? 'var(--cl-border)' : '#E2E8F0';
  const textPri = dark ? 'var(--cl-text)' : '#0F172A';
  const textSec = dark ? 'var(--cl-text-2)' : '#475569';
  const textMuted = dark ? 'var(--cl-text-3)' : '#94A3B8';

  const roles = currentUser?.roles || [currentUser?.role].filter(Boolean);
  const isCoachView = roles.includes('coach') && !roles.includes('admin')
    ? true
    : (localStorage.getItem('coachlife_active_mode') || currentUser?.role) === 'coach';

  const [view, setView] = useState(() => localStorage.getItem('cl_calendar_view') || 'month');
  const setViewMode = (v) => { setView(v); try { localStorage.setItem('cl_calendar_view', v); } catch { /* ignore */ } };

  const [cursor, setCursor] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [cards, setCards] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [error, setError] = useState('');
  // Bumped by the Refresh button; `force` bypasses both the snapshot and the
  // underlying request caches.
  const [reload, setReload] = useState({ n: 0, force: false });

  const today = useMemo(() => new Date(), []);
  const todayStr = toDateStr(today);

  /**
   * The assembled calendar dataset, cached so revisiting the page repaints
   * instantly instead of blanking and refetching. Two of the underlying calls
   * (assigned players, current-card-by-player) are deliberately uncached, so
   * without this snapshot every visit hit the network.
   *
   * The key sits under the `sessionCard:` prefix on purpose: invalidateSessionCards()
   * clears that whole prefix, so generating / editing / completing a card anywhere
   * in the app drops this snapshot too and the next visit reloads.
   */
  const snapshotKey = `sessionCard:calendar:${isCoachView ? 'coach' : 'admin'}:${currentUser?.id || ''}`;

  /* ── load: batches + players (role-scoped) + every card with a date ── */
  useEffect(() => {
    if (!userToken || !currentUser?.id) return;
    let cancelled = false;

    const force = reload.force;
    if (!force) {
      const snap = getCached(snapshotKey, { ttl: TTL.SHORT });
      if (snap) {
        setBatches(snap.batches);
        setCards(snap.cards);
        setLoading(false);
        setError('');
        return;
      }
    }

    (async () => {
      setLoading(true);
      setError('');
      try {
        const coachId = currentUser.id || currentUser.userId;

        const [allBatches, playerList] = await Promise.all([
          getBatches({ userToken, force }).catch(() => []),
          isCoachView
            ? fetchAssignedPlayersForCoach(coachId).then(r => (r.success ? r.players || [] : []))
            : Promise.resolve(fetchPlayers(force)).then(r => (Array.isArray(r) ? r : r?.players || [])),
        ]);
        if (cancelled) return;

        // A coach only sees the batches they run
        const scopedBatches = isCoachView
          ? allBatches.filter(b => Array.isArray(b.coachIds) && b.coachIds.includes(coachId))
          : allBatches;

        const normalizedPlayers = playerList.map(item => {
          const p = item.player || item;
          return {
            playerId: String(p.playerId || p._id || p.id || ''),
            playerName: p.playerName || p.name || 'Unknown',
            LearningPathway: p.LearningPathway || '',
            sessionCardIds: normalizeSessionCardIds(item).length
              ? normalizeSessionCardIds(item)
              : normalizeSessionCardIds(p),
          };
        });

        setBatches(scopedBatches);

        const allIds = normalizedPlayers.flatMap(p => p.sessionCardIds);
        const playerIds = normalizedPlayers.map(p => p.playerId).filter(Boolean);

        // Two reads: the full history from each player's sessionCardIds, plus
        // each player's authoritative CURRENT card by playerId. The second is
        // not redundant - sessionCardIds lags behind a freshly generated card,
        // so without it the newest (i.e. Upcoming) session never appears.
        const [byId, currentByPlayer] = await Promise.all([
          allIds.length ? getSessionCards(allIds, { userToken, force }) : Promise.resolve({}),
          playerIds.length ? getCurrentCardsByPlayer(playerIds, { userToken, full: true }) : Promise.resolve({}),
        ]);
        if (cancelled) return;

        const owner = {};
        normalizedPlayers.forEach(p => p.sessionCardIds.forEach(id => { owner[String(id)] = p; }));
        const playerById = {};
        normalizedPlayers.forEach(p => { playerById[p.playerId] = p; });

        const toRecord = (id, card, p) => {
          if (!card || !card.sessionDate) return null;
          const sessionDate = toLocalDateStr(card.sessionDate);
          if (!sessionDate) return null;
          return {
            cardId: String(id),
            playerId: String(card.playerId || p?.playerId || ''),
            // The id this card was reached by. The card's own playerId and the
            // players list can disagree in shape, and the batch lookup (which
            // is what gives an event its time) must not miss because of that.
            ownerPlayerId: String(p?.playerId || ''),
            playerName: p?.playerName || 'Unknown',
            sessionDate,
            session: card.session ?? null,
            Topic: card.Topic || '',
            LearningPathway: card.LearningPathway || p?.LearningPathway || '',
            status: card.status || '',
            batchGroupId: card.batchGroupId || null,
          };
        };

        const records = [];
        const seen = new Set();
        Object.entries(byId).forEach(([id, card]) => {
          const r = toRecord(id, card, owner[String(id)]);
          if (r) { records.push(r); seen.add(r.cardId); }
        });
        Object.entries(currentByPlayer).forEach(([pid, card]) => {
          const id = String(card?._id || card?.sessionCardId || card?.cardId || '');
          if (!id || seen.has(id)) return;
          const r = toRecord(id, card, playerById[String(pid)] || { playerId: String(pid) });
          if (r) { records.push(r); seen.add(id); }
        });

        setCards(records);
        setCached(snapshotKey, { batches: scopedBatches, cards: records });
      } catch {
        if (!cancelled) setError('Failed to load the calendar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userToken, currentUser?.id, currentUser?.userId, isCoachView, reload]);

  /* ── which batch each player belongs to ── */
  const batchOfPlayer = useMemo(() => {
    const map = {};
    batches.forEach(b => {
      // Index every id form a batch might carry - this map is what gives an
      // event its start/end time, so a missed key silently drops the time.
      const ids = [
        ...(b.playerIds || []),
        ...(b.players || []).flatMap(p => [p.playerId, p._id, p.id]),
      ];
      ids.filter(Boolean).forEach(id => { map[String(id)] = b; });
    });
    return map;
  }, [batches]);

  /* ── the visible date range, per view ── */
  const range = useMemo(() => {
    if (view === 'week') {
      const from = startOfWeek(cursor);
      return { from, to: addDays(from, 6) };
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    return { from: startOfWeek(first), to: addDays(startOfWeek(last), 6) };
  }, [cursor, view]);

  /* ── events: real cards grouped into classes, then projected batch slots ── */
  const eventsByDate = useMemo(() => {
    const fromStr = toDateStr(range.from);
    const toStr = toDateStr(range.to);
    const byDate = {};
    const push = (ev) => { (byDate[ev.date] = byDate[ev.date] || []).push(ev); };

    // 1. Real cards → one event per (batch | unbatched player) per date
    const groups = {};
    cards.forEach(card => {
      if (card.sessionDate < fromStr || card.sessionDate > toStr) return;
      // Either id may be the one the batch stores - try both before giving up,
      // since losing the batch also loses the event's start/end time.
      const batch = batchOfPlayer[card.playerId] || batchOfPlayer[card.ownerPlayerId];
      const key = batch
        ? `b:${batch.batchId}:${card.sessionDate}`
        : `p:${card.playerId}:${card.sessionDate}`;
      if (!groups[key]) {
        groups[key] = {
          id: key, date: card.sessionDate, kind: 'session',
          batch: batch || null,
          batchId: batch?.batchId || null,
          startTime: batch?.startTime || null,
          endTime: batch?.endTime || null,
          cards: [],
        };
      }
      groups[key].cards.push(card);
    });

    Object.values(groups).forEach(g => {
      const counts = {};
      g.cards.forEach(c => { const s = statusOf(c.status); counts[s] = (counts[s] || 0) + 1; });
      // What the class as a whole still needs: anything open outranks "completed"
      const dominantStatus =
        counts.inprogress ? 'inprogress'
        : counts.upcoming ? 'upcoming'
        : counts.pending ? 'pending'
        : counts.completed ? 'completed'
        : 'empty';

      const sessions = [...new Set(g.cards.map(c => c.session).filter(n => n != null))];
      const topic = g.cards.find(c => c.Topic)?.Topic || '';
      const isBatch = !!g.batch;

      push({
        ...g,
        statusCounts: counts,
        dominantStatus,
        sessionLabel: sessions.length === 1 ? `Session ${sessions[0]}` : sessions.length > 1 ? `Sessions ${Math.min(...sessions)}–${Math.max(...sessions)}` : '',
        title: isBatch ? g.batch.batchName : g.cards[0].playerName,
        subtitle: isBatch
          ? `${sessions.length === 1 ? `Session ${sessions[0]} · ` : ''}${g.cards.length} player${g.cards.length === 1 ? '' : 's'}`
          : [sessions.length === 1 ? `Session ${sessions[0]}` : '', topic].filter(Boolean).join(' · ') || 'Session',
        topic,
      });
    });

    // 2. Projected slots from each batch's recurring days, for dates with no card.
    //    Only from today forward - back-projecting would invent classes that never
    //    happened for every batch, including before the batch existed.
    const hasBatchEvent = new Set(
      Object.values(groups).filter(g => g.batchId).map(g => `${g.batchId}:${g.date}`)
    );
    const projectFrom = todayStr > fromStr ? todayStr : fromStr;

    batches.forEach(b => {
      if (!Array.isArray(b.days) || b.days.length === 0) return;
      for (let d = new Date(range.from); toDateStr(d) <= toStr; d = addDays(d, 1)) {
        const ds = toDateStr(d);
        if (ds < projectFrom) continue;
        if (!b.days.includes(weekdayAbbr(d))) continue;
        if (hasBatchEvent.has(`${b.batchId}:${ds}`)) continue;

        const playerCount = (b.playerIds?.length ?? (b.players || []).length) || 0;
        push({
          id: `proj:${b.batchId}:${ds}`,
          date: ds, kind: 'projected',
          batch: b, batchId: b.batchId,
          startTime: b.startTime || null,
          endTime: b.endTime || null,
          cards: [],
          statusCounts: {},
          dominantStatus: 'empty',
          sessionLabel: '',
          title: b.batchName,
          subtitle: `Scheduled · ${playerCount} player${playerCount === 1 ? '' : 's'} · no card yet`,
          topic: '',
        });
      }
    });

    Object.values(byDate).forEach(list => list.sort((a, b) => {
      const am = toMinutes(a.startTime), bm = toMinutes(b.startTime);
      if (am == null && bm == null) return a.title.localeCompare(b.title);
      if (am == null) return 1;
      if (bm == null) return -1;
      return am - bm;
    }));

    return byDate;
  }, [cards, batches, batchOfPlayer, range, todayStr]);

  /* ── click-through: same destinations the rest of the app uses ── */
  // Every destination carries `from` so it can offer a way back here. Pages that
  // use navigate(-1) already return correctly; the ones with a hardcoded back
  // target read this instead.
  const calendarPath = isCoachView ? '/coach/calendar' : '/admin/calendar';

  const openEvent = useCallback((ev) => {
    const from = { from: calendarPath, fromLabel: 'Calendar' };

    if (ev.kind === 'projected') {
      if (isCoachView && ev.batch) navigate('/coach/batch-session', { state: { batch: ev.batch, ...from } });
      else navigate('/admin/session-card', { state: { ...(ev.batchId && { batchId: ev.batchId }), ...from } });
      return;
    }
    if (isCoachView) {
      if (ev.batch) { navigate('/coach/batch-session', { state: { batch: ev.batch, ...from } }); return; }
      const c = ev.cards[0];
      if (c) {
        navigate(statusOf(c.status) === 'completed'
          ? `/coach/view-completed-session/${c.cardId}`
          : `/coach/session/${c.cardId}`, { state: from });
      }
      return;
    }
    // Branch on whether this is a batch, NOT on how many cards it has - a batch
    // with one player is still a batch and must behave like every other batch.
    if (ev.batch) { navigate('/admin/session-card', { state: { batchId: ev.batchId, ...from } }); return; }
    if (ev.cards.length === 1) { navigate(`/admin/view-session-card/${ev.cards[0].cardId}`, { state: from }); return; }
    navigate('/admin/session-card', { state: from });
  }, [isCoachView, navigate, calendarPath]);

  /* ── header nav ── */
  const step = (dir) => {
    setCursor(prev => view === 'week'
      ? addDays(prev, dir * 7)
      : new Date(prev.getFullYear(), prev.getMonth() + dir, 1));
  };
  const goToday = () => { setCursor(new Date()); setSelectedDay(toDateStr(new Date())); };

  const headerLabel = view === 'week'
    ? (() => {
        const a = range.from, b = range.to;
        const sameMonth = a.getMonth() === b.getMonth();
        return sameMonth
          ? `${a.getDate()}–${b.getDate()} ${MONTHS[a.getMonth()]} ${a.getFullYear()}`
          : `${a.getDate()} ${MONTHS[a.getMonth()].slice(0, 3)} – ${b.getDate()} ${MONTHS[b.getMonth()].slice(0, 3)} ${b.getFullYear()}`;
      })()
    : `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;

  const visibleEvents = useMemo(
    () => Object.values(eventsByDate).flat(),
    [eventsByDate]
  );
  const realCount = visibleEvents.filter(e => e.kind === 'session').length;
  const projectedCount = visibleEvents.length - realCount;

  /* ── week grid geometry ── */
  const HOUR_PX = 52;
  const { dayStartMin, dayEndMin } = useMemo(() => {
    const starts = [], ends = [];
    visibleEvents.forEach(e => {
      const s = toMinutes(e.startTime), en = toMinutes(e.endTime);
      if (s != null) starts.push(s);
      if (en != null) ends.push(en);
    });
    const min = starts.length ? Math.min(...starts) : 9 * 60;
    const max = ends.length ? Math.max(...ends) : 19 * 60;
    return {
      dayStartMin: Math.max(0, Math.floor((min - 60) / 60) * 60),
      dayEndMin: Math.min(24 * 60, Math.ceil((max + 60) / 60) * 60),
    };
  }, [visibleEvents]);
  const hours = useMemo(() => {
    const out = [];
    for (let m = dayStartMin; m < dayEndMin; m += 60) out.push(m);
    return out;
  }, [dayStartMin, dayEndMin]);

  const monthCells = useMemo(() => {
    const out = [];
    for (let d = new Date(range.from); toDateStr(d) <= toDateStr(range.to); d = addDays(d, 1)) out.push(new Date(d));
    return out;
  }, [range]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(range.from, i)),
    [range]
  );

  const selectedEvents = selectedDay ? (eventsByDate[selectedDay] || []) : [];

  // The day panel renders below the grid, so on a tall month view a click (or
  // "+N more") would otherwise appear to do nothing.
  const dayPanelRef = useRef(null);
  useEffect(() => {
    if (!selectedDay || !dayPanelRef.current) return;
    dayPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedDay]);

  const btn = (active) => ({
    padding: '7px 14px', borderRadius: '8px', cursor: 'pointer',
    border: `1.5px solid ${active ? BRAND : border}`,
    background: active ? `linear-gradient(135deg, ${BRAND}, #252c35)` : surface,
    color: active ? '#fff' : textSec,
    fontSize: '13px', fontWeight: 700, fontFamily: 'inherit',
  });
  const navBtn = {
    width: '34px', height: '34px', borderRadius: '9px', border: `1.5px solid ${border}`,
    background: surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: textSec,
  };

  return (
    <Layout>
      <style>{`
        @keyframes skPulse{0%,100%{opacity:1}50%{opacity:.45}}
        @keyframes clSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
          borderRadius: '20px', padding: '26px 30px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
          boxShadow: '0 12px 40px rgba(6,0,48,.3)',
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,.12)',
            border: '1.5px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CalendarIcon size={24} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: '0 0 3px', letterSpacing: '-.5px' }}>
              Calendar
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.7)', margin: 0 }}>
              {loading ? 'Loading sessions…'
                : `${realCount} session${realCount === 1 ? '' : 's'}${projectedCount ? ` · ${projectedCount} scheduled, not generated` : ''}`}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
          marginBottom: '16px',
        }}>
          <button onClick={() => step(-1)} style={navBtn} aria-label="Previous"><ChevronLeft size={17} /></button>
          <button onClick={() => step(1)} style={navBtn} aria-label="Next"><ChevronRight size={17} /></button>
          <button onClick={goToday} style={{ ...btn(false), padding: '8px 16px' }}>Today</button>
          <h2 style={{ fontSize: '17px', fontWeight: 800, color: textPri, margin: '0 6px', minWidth: '210px' }}>
            {headerLabel}
          </h2>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { invalidate(snapshotKey); setReload(r => ({ n: r.n + 1, force: true })); }}
              disabled={loading}
              title="Reload sessions from the server"
              style={{ ...btn(false), display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: loading ? 0.6 : 1 }}
            >
              <RefreshCw size={14} style={loading ? { animation: 'clSpin 0.9s linear infinite' } : undefined} />
              Refresh
            </button>
            <button onClick={() => setViewMode('month')} style={btn(view === 'month')}>Month</button>
            <button onClick={() => setViewMode('week')} style={btn(view === 'week')}>Week</button>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
            background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
            color: '#DC2626', fontSize: '13px', fontWeight: 600,
          }}>{error}</div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
          {['upcoming', 'inprogress', 'completed', 'pending'].map(k => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 600, color: textSec }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: STATUS_STYLE[k].color }} />
              {STATUS_STYLE[k].label}
            </span>
          ))}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 600, color: textSec }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', border: '1.5px dashed #94A3B8' }} />
            Scheduled (no card yet)
          </span>
        </div>

        {loading ? (
          <div style={{
            background: surface, border: `1.5px solid ${border}`, borderRadius: '16px',
            padding: '80px 20px', textAlign: 'center', color: textMuted,
            animation: 'skPulse 1.6s ease-in-out infinite', fontSize: '14px', fontWeight: 600,
          }}>
            Loading calendar…
          </div>
        ) : view === 'month' ? (
          /* ─────────────── MONTH ─────────────── */
          <div style={{ background: surface, border: `1.5px solid ${border}`, borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: surface2, borderBottom: `1px solid ${border}` }}>
              {DAYS.map(d => (
                <div key={d} style={{ padding: '10px 8px', textAlign: 'center', fontSize: '11.5px', fontWeight: 800, color: textSec, letterSpacing: '.4px' }}>
                  {d.toUpperCase()}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {monthCells.map((d) => {
                const ds = toDateStr(d);
                const evs = eventsByDate[ds] || [];
                const inMonth = d.getMonth() === cursor.getMonth();
                const isToday = ds === todayStr;
                const isSel = ds === selectedDay;
                return (
                  <div
                    key={ds}
                    onClick={() => setSelectedDay(ds)}
                    style={{
                      minHeight: '132px', padding: '7px', cursor: 'pointer',
                      borderRight: `1px solid ${border}`, borderBottom: `1px solid ${border}`,
                      background: isSel ? (dark ? 'rgba(99,102,241,.10)' : '#EEF2FF')
                        : inMonth ? surface : surface2,
                      opacity: inMonth ? 1 : 0.55,
                      display: 'flex', flexDirection: 'column', gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        fontSize: '12px', fontWeight: isToday ? 800 : 600,
                        width: '22px', height: '22px', borderRadius: '50%',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: isToday ? BRAND : 'transparent',
                        color: isToday ? '#fff' : textPri,
                      }}>{d.getDate()}</span>
                      {evs.length > 2 && (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: textMuted }}>{evs.length}</span>
                      )}
                    </div>
                    {evs.slice(0, MONTH_CELL_EVENTS).map(ev => (
                      <EventChip key={ev.id} ev={ev} onClick={openEvent} compact dark={dark} />
                    ))}
                    {evs.length > MONTH_CELL_EVENTS && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedDay(ds); }}
                        style={{
                          background: 'none', border: 'none', padding: '1px 2px', cursor: 'pointer',
                          fontSize: '10.5px', fontWeight: 700, color: BRAND, textAlign: 'left',
                          fontFamily: 'inherit', textDecoration: 'underline',
                        }}
                      >
                        +{evs.length - MONTH_CELL_EVENTS} more
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ─────────────── WEEK ─────────────── */
          <div style={{ background: surface, border: `1.5px solid ${border}`, borderRadius: '16px', overflow: 'hidden' }}>
            {/* day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '62px repeat(7, 1fr)', background: surface2, borderBottom: `1px solid ${border}` }}>
              <div />
              {weekDays.map(d => {
                const isToday = sameDay(d, today);
                return (
                  <div key={toDateStr(d)} onClick={() => setSelectedDay(toDateStr(d))}
                    style={{ padding: '9px 6px', textAlign: 'center', cursor: 'pointer', borderLeft: `1px solid ${border}` }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: textMuted, letterSpacing: '.4px' }}>
                      {weekdayAbbr(d).toUpperCase()}
                    </div>
                    <div style={{
                      marginTop: '3px', fontSize: '14px', fontWeight: 800,
                      width: '26px', height: '26px', lineHeight: '26px', borderRadius: '50%',
                      margin: '3px auto 0',
                      background: isToday ? BRAND : 'transparent',
                      color: isToday ? '#fff' : textPri,
                    }}>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* all-day / untimed strip */}
            {weekDays.some(d => (eventsByDate[toDateStr(d)] || []).some(e => toMinutes(e.startTime) == null)) && (
              <div style={{ display: 'grid', gridTemplateColumns: '62px repeat(7, 1fr)', borderBottom: `1px solid ${border}`, background: surface }}>
                <div style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 700, color: textMuted, textAlign: 'right' }}>
                  no time
                </div>
                {weekDays.map(d => {
                  const evs = (eventsByDate[toDateStr(d)] || []).filter(e => toMinutes(e.startTime) == null);
                  return (
                    <div key={toDateStr(d)} style={{ borderLeft: `1px solid ${border}`, padding: '5px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {evs.map(ev => <EventChip key={ev.id} ev={ev} onClick={openEvent} compact dark={dark} />)}
                    </div>
                  );
                })}
              </div>
            )}

            {/* timed grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '62px repeat(7, 1fr)', position: 'relative' }}>
              {/* hour gutter */}
              <div>
                {hours.map(m => (
                  <div key={m} style={{
                    height: `${HOUR_PX}px`, paddingRight: '8px', textAlign: 'right',
                    fontSize: '10.5px', fontWeight: 600, color: textMuted,
                    transform: 'translateY(-6px)',
                  }}>
                    {fmtTime(`${String(Math.floor(m / 60)).padStart(2, '0')}:00`)}
                  </div>
                ))}
              </div>

              {weekDays.map(d => {
                const ds = toDateStr(d);
                const evs = layoutTimedEvents(
                  (eventsByDate[ds] || []).filter(e => toMinutes(e.startTime) != null)
                );
                return (
                  <div key={ds} onClick={() => setSelectedDay(ds)}
                    style={{ position: 'relative', borderLeft: `1px solid ${border}`, cursor: 'pointer' }}>
                    {hours.map(m => (
                      <div key={m} style={{ height: `${HOUR_PX}px`, borderBottom: `1px solid ${border}` }} />
                    ))}
                    {evs.map(ev => {
                      const s = toMinutes(ev.startTime);
                      const e = toMinutes(ev.endTime) ?? (s + 60);
                      const top = ((s - dayStartMin) / 60) * HOUR_PX;
                      const height = Math.max(26, ((Math.max(e, s + 30) - s) / 60) * HOUR_PX - 3);
                      const accent = eventAccent(ev);
                      const projected = ev.kind === 'projected';
                      // Overlapping events share the column width instead of
                      // stacking invisibly on top of one another
                      const colWidth = 100 / (ev._cols || 1);
                      const narrow = (ev._cols || 1) > 2;
                      return (
                        <button
                          key={ev.id}
                          onClick={(evt) => { evt.stopPropagation(); openEvent(ev); }}
                          title={`${ev.title} · ${fmtTime(ev.startTime)}${ev.endTime ? `–${fmtTime(ev.endTime)}` : ''}${ev._cols > 1 ? ` · overlaps ${ev._cols - 1} other` : ''}`}
                          style={{
                            position: 'absolute', top: `${top}px`, height: `${height}px`,
                            left: `calc(${(ev._col || 0) * colWidth}% + 3px)`,
                            width: `calc(${colWidth}% - 6px)`,
                            overflow: 'hidden',
                            padding: narrow ? '4px 5px' : '5px 7px', borderRadius: '7px', cursor: 'pointer',
                            textAlign: 'left', fontFamily: 'inherit',
                            border: projected ? `1.5px dashed ${accent}` : `1px solid ${accent}44`,
                            borderLeft: `3px solid ${accent}`,
                            background: projected
                              ? (dark ? 'rgba(30,41,59,.92)' : '#F8FAFC')
                              : (dark ? `${accent}26` : `${accent}16`),
                            color: textPri,
                          }}
                          onMouseEnter={(e) => {
                            // lift the hovered one above its neighbours so a
                            // clipped title is readable in a crowded slot
                            e.currentTarget.style.zIndex = '5';
                            e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,.18)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.zIndex = 'auto';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <span style={{ display: 'block', fontSize: narrow ? '10.5px' : '11.5px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: projected ? .8 : 1 }}>
                            {ev.title}
                          </span>
                          {!narrow && (
                            <span style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: textSec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {fmtTime(ev.startTime)}{ev.endTime ? `–${fmtTime(ev.endTime)}` : ''}
                            </span>
                          )}
                          {height > 52 && (ev._cols || 1) === 1 && (
                            <span style={{ display: 'block', fontSize: '10px', fontWeight: 500, color: textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {ev.subtitle}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Day detail ── */}
        {selectedDay && (
          <div ref={dayPanelRef} style={{
            marginTop: '18px', background: surface, border: `1.5px solid ${border}`,
            borderRadius: '16px', overflow: 'hidden',
            scrollMarginTop: '16px',
          }}>
            <div style={{
              padding: '14px 20px', borderBottom: `1px solid ${border}`, background: surface2,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
            }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: textPri, margin: 0 }}>
                  {(() => {
                    const d = parseDateStr(selectedDay);
                    return d ? `${DAYS_LONG[(d.getDay() + 6) % 7]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : selectedDay;
                  })()}
                </h3>
                <p style={{ fontSize: '12px', color: textMuted, margin: '3px 0 0' }}>
                  {selectedEvents.length === 0 ? 'Nothing scheduled'
                    : `${selectedEvents.length} entr${selectedEvents.length === 1 ? 'y' : 'ies'}`}
                </p>
              </div>
              <button onClick={() => setSelectedDay(null)}
                style={{ ...navBtn, width: '30px', height: '30px' }} aria-label="Close">
                <X size={15} />
              </button>
            </div>

            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedEvents.length === 0 && (
                <p style={{ fontSize: '13px', color: textMuted, margin: '8px 0' }}>
                  No sessions or scheduled classes on this day.
                </p>
              )}
              {selectedEvents.map(ev => {
                const accent = eventAccent(ev);
                const projected = ev.kind === 'projected';
                return (
                  <div key={ev.id} style={{
                    border: `1.5px solid ${border}`, borderLeft: `4px solid ${accent}`,
                    borderRadius: '11px', padding: '12px 14px', background: dark ? 'var(--cl-surface-2)' : '#fff',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '180px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {ev.batch ? <Layers size={14} color={accent} /> : <BookOpen size={14} color={accent} />}
                          <span style={{ fontSize: '14px', fontWeight: 800, color: textPri }}>{ev.title}</span>
                          {projected && (
                            <span style={{
                              fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '5px',
                              border: '1px dashed #94A3B8', color: textMuted,
                            }}>NOT GENERATED</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {ev.startTime && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: textSec, fontWeight: 600 }}>
                              <Clock size={12} /> {fmtTime(ev.startTime)}{ev.endTime ? `–${fmtTime(ev.endTime)}` : ''}
                            </span>
                          )}
                          {ev.sessionLabel && (
                            <span style={{ fontSize: '12px', color: textSec, fontWeight: 600 }}>{ev.sessionLabel}</span>
                          )}
                          {ev.cards.length > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: textSec, fontWeight: 600 }}>
                              <Users size={12} /> {ev.cards.length}
                            </span>
                          )}
                        </div>
                        {ev.topic && (
                          <p style={{ fontSize: '12.5px', color: textSec, margin: '7px 0 0' }}>{ev.topic}</p>
                        )}
                      </div>
                      <button onClick={() => openEvent(ev)} style={{
                        padding: '8px 15px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                        background: `linear-gradient(135deg, ${BRAND}, #252c35)`, color: '#fff',
                        fontSize: '12.5px', fontWeight: 700, fontFamily: 'inherit', flexShrink: 0,
                      }}>
                        {projected || ev.batch ? 'Open class' : 'Open session'}
                      </button>
                    </div>

                    {/* per-player status chips */}
                    {ev.cards.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '11px' }}>
                        {ev.cards.map(c => {
                          const st = STATUS_STYLE[statusOf(c.status)];
                          return (
                            <span key={c.cardId} style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              padding: '4px 9px', borderRadius: '6px',
                              background: st.bg, color: st.color,
                              fontSize: '11px', fontWeight: 700,
                            }}>
                              <st.Icon size={11} /> {c.playerName}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CalendarPage;
