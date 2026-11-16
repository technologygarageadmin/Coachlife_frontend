import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/store';
import { useTheme } from '../../context/ThemeContext';
import { Layout } from '../../components/Layout';
import { Toast } from '../../components/Toast';
import {
  CalendarClock, Loader, Plus, Minus, X, Table2, CalendarDays, ChevronLeft, ChevronRight, ChevronDown,
  Search, Star, Zap, Coffee, Download, Users, ExternalLink, UserRound, Globe,
} from 'lucide-react';
import { IST, projectDay, systemZone, tzLabel, nowIn, isIst } from '../../utils/timezone';

const CL_MANAGE_SLOTS_URL = 'https://zpmd0d7dwc.execute-api.ap-south-1.amazonaws.com/default/CL_Manage_Slots';
const URL_CONFIGURED = !CL_MANAGE_SLOTS_URL.includes('REPLACE_WITH');

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_START = 0;
const DAY_END = 24 * 60;
const SLOT_MINUTES = 60;
const HOUR_PX = 64;
const GRID_H = 24 * HOUR_PX;
const GUTTER = 58;
const BRAND = '#060030';
const BTN_BG = 'linear-gradient(135deg, rgb(6,0,48) 0%, rgb(26,0,96) 55%, rgb(59,0,128) 100%)';
const BTN_SHADOW = '0 2px 8px rgba(99,102,241,0.35)';
const DEFAULT_MAX = 5;
const MAX_LIMIT = 20;
const EMPTY_FORM = { kind: 'open', label: 'Break', priority: '', days: [], startTime: '', endTime: '' };
const PRIORITY_LABEL = { preferred: 'Preferred', alternative: 'Alternative' };
const STANDARD_SLOTS = [
  { days: ['Sat', 'Sun'], startTime: '11:00', endTime: '12:00', priority: '' },
  { days: ['Sat', 'Sun'], startTime: '19:00', endTime: '20:00', priority: '' },
  { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '20:00', endTime: '21:00', priority: 'preferred' },
  { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '19:00', endTime: '20:00', priority: 'alternative' },
];
const PRIORITIES = [['', 'None'], ['preferred', 'Preferred'], ['alternative', 'Alternative']];
const RANGES = [['day', 'Day'], ['workweek', 'Work week'], ['week', 'Week']];

// [light bg, accent, light text, dark bg, dark text]
const BATCH_COLORS = [
  ['#DCE9FF', '#4F7BF7', '#1E3A8A', 'rgba(79,123,247,0.26)', '#C7D7FF'],
  ['#E6DDFB', '#7C5CE0', '#4C1D95', 'rgba(124,92,224,0.26)', '#DDD2FF'],
  ['#D5F0E8', '#1FA37A', '#065F46', 'rgba(31,163,122,0.24)', '#B7F0DC'],
  ['#FFE8D1', '#F08C2E', '#7C2D12', 'rgba(240,140,46,0.26)', '#FFD9B3'],
  ['#FADCEB', '#D6478F', '#831843', 'rgba(214,71,143,0.26)', '#F9C9E0'],
  ['#E2F0C9', '#6AA32A', '#365314', 'rgba(106,163,42,0.26)', '#D5EBB0'],
  ['#FDDADA', '#E5484D', '#7F1D1D', 'rgba(229,72,77,0.26)', '#FBC4C6'],
  ['#D6EEF7', '#1E9CC6', '#0C4A6E', 'rgba(30,156,198,0.26)', '#BDE6F5'],
];
const colorFor = (key = '') => {
  let h = 0;
  String(key).split('').forEach(ch => { h = (h * 31 + ch.charCodeAt(0)) % 997; });
  return BATCH_COLORS[h % BATCH_COLORS.length];
};

const toMin = (t) => {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m;
};

const fmt = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h >= 12 ? 'PM' : 'AM'}`;
};
const range = (a, b) => `${fmt(a)} – ${fmt(b)}`;
const rangeShort = (a, b) => ((a >= 720) === (b >= 720) ? `${fmt(a).replace(/ [AP]M$/, '')} – ${fmt(b)}` : range(a, b));
const hourLabel = (h) => (h === 0 ? '' : `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`);

// Overlapping events sit side by side in lanes.
const assignLanes = (items) => {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
  const laneEnds = [];
  const placed = sorted.map(it => {
    let lane = laneEnds.findIndex(end => end <= it.start);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(it.end); } else laneEnds[lane] = it.end;
    return { ...it, lane };
  });
  return placed.map(it => {
    const lanes = placed.filter(o => o.start < it.end && o.end > it.start).reduce((mx, o) => Math.max(mx, o.lane + 1), 1);
    return { ...it, lanes };
  });
};

// What is left of each open window once batches and blocked time are taken out of it.
const availablePieces = (windows, occupied, minLen) => {
  const merged = [];
  [...occupied].sort((a, b) => a.start - b.start).forEach(it => {
    const last = merged[merged.length - 1];
    if (last && it.start <= last.end) last.end = Math.max(last.end, it.end);
    else merged.push({ start: it.start, end: it.end });
  });
  const pieces = [];
  windows.forEach(w => {
    let cursor = w.start;
    const push = (start, end) => {
      if (end - start >= 15) pieces.push({ start, end, short: end - start < minLen, priority: w.priority, window: w });
    };
    merged.forEach(b => {
      if (b.end <= cursor || b.start >= w.end) return;
      if (b.start > cursor) push(cursor, b.start);
      cursor = Math.max(cursor, b.end);
    });
    if (cursor < w.end) push(cursor, w.end);
  });
  return pieces.sort((a, b) => a.start - b.start);
};

const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayKeyOf = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const unwrap = (data) => {
  let d = data;
  if (d?.body && typeof d.body === 'string') d = JSON.parse(d.body);
  return d || {};
};

const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;
const norm = (v) => String(v || '').toLowerCase().trim();

const SessionSlots = () => {
  const { userToken } = useStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);
  const [maxStudents, setMaxStudents] = useState(DEFAULT_MAX);
  const [unscheduled, setUnscheduled] = useState([]);
  const [hiddenBatches, setHiddenBatches] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('calendar');
  const [rangeMode, setRangeMode] = useState('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [focusBatchId, setFocusBatchId] = useState(null);
  const [pulseIds, setPulseIds] = useState(null);
  const [popover, setPopover] = useState(null);
  const [tzPref, setTzPref] = useState(() => {
    try { return localStorage.getItem('coachlife_schedule_tz') || 'auto'; } catch { return 'auto'; }
  });
  const [tick, setTick] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const scrollRef = useRef(null);
  const searchRef = useRef(null);
  const didScroll = useRef(false);

  const closeToast = useCallback(() => setToast(null), []);
  const headers = useMemo(() => ({ 'Content-Type': 'application/json', ...(userToken && { userToken }) }), [userToken]);

  // Times are stored in IST. Show them in the viewer's own zone by default (IST, or Chicago with the
  // right CST/CDT for each date), or in a zone picked by hand.
  const sysZone = useMemo(() => systemZone(), []);
  const tz = tzPref === 'IST' ? IST : tzPref === 'CT' ? 'America/Chicago' : sysZone;
  const chooseTz = (value) => {
    setTzPref(value);
    try { localStorage.setItem('coachlife_schedule_tz', value); } catch { /* storage unavailable */ }
  };

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 60 * 1000);
    return () => clearInterval(t);
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => nowIn(tz), [tz, tick]);

  useEffect(() => {
    if (!URL_CONFIGURED) {
      setError('The Slots API address is not set yet. Deploy CL_Manage_Slots and put its URL in SessionSlots.jsx.');
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    (async () => {
      try {
        const d = unwrap((await axios.get(CL_MANAGE_SLOTS_URL, { headers, signal: controller.signal })).data);
        setSlots(d.slots || []);
        setMaxStudents(d.settings?.maxStudentsPerBatch || DEFAULT_MAX);
        setUnscheduled(d.unscheduled || []);
        setHiddenBatches(d.hiddenBatches || 0);
        setError('');
      } catch (err) {
        if (err.name !== 'CanceledError') setError(err.response?.data?.message || 'Failed to load slots');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [headers, reloadKey]);

  const post = async (payload, successMsg) => {
    setSaving(true);
    try {
      await axios.post(CL_MANAGE_SLOTS_URL, payload, { headers });
      setToast({ message: successMsg, type: 'success' });
      setReloadKey(k => k + 1);
      return true;
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Request failed', type: 'error' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setShowModal(false); setPopover(null); setSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onDown = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const openModal = () => { setEditId(null); setForm(EMPTY_FORM); setFormError(''); setShowModal(true); };
  const openEdit = (slot) => {
    setPopover(null);
    setEditId(slot.id);
    setForm({
      kind: slot.kind === 'window' ? 'open' : 'block',
      label: slot.label || 'Slot',
      priority: slot.priority || '',
      days: [slot.day],
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
    setFormError('');
    setShowModal(true);
  };
  const toggleFormDay = (d) => setForm(f => ({ ...f, days: editId ? [d] : (f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d]) }));

  const addSlot = async () => {
    const start = toMin(form.startTime);
    const end = toMin(form.endTime);
    if (!form.days.length) return setFormError('Pick at least one day.');
    if (start === null || end === null) return setFormError('Set a start and end time.');
    if (end <= start) return setFormError('End time must be after start time.');
    const label = form.label.trim() || 'Slot';
    const open = form.kind === 'open';
    const times = { startTime: form.startTime, endTime: form.endTime };
    const ok = editId
      ? await post({ action: 'update', slotId: editId, day: form.days[0], ...times, ...(open ? { priority: form.priority } : { label }) }, 'Slot updated')
      : await post({ action: 'add', kind: form.kind, days: form.days, ...times, ...(open ? { priority: form.priority } : { label }) }, 'Slot added');
    if (ok) setShowModal(false);
  };

  const removeBlock = (ev) => removeSlot({ id: ev.srcId, label: `"${ev.label}"`, day: ev.day, start: toMin(ev.startTime), end: toMin(ev.endTime) });
  const removeSlot = (slot) => {
    if (window.confirm(`Remove ${slot.label} on ${slot.day} (${range(slot.start, slot.end)} IST)?`)) {
      post({ action: 'delete', slotId: slot.id }, 'Slot removed');
    }
  };

  const addStandardSlots = async () => {
    setSaving(true);
    try {
      await Promise.all(STANDARD_SLOTS.map(sl => axios.post(CL_MANAGE_SLOTS_URL, { action: 'add', kind: 'open', ...sl }, { headers })));
      setToast({ message: 'Standard open slots added', type: 'success' });
      setReloadKey(k => k + 1);
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Could not add the standard slots', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const changeCapacity = (next) => {
    if (next < 1 || next > MAX_LIMIT || next === maxStudents || saving) return;
    post({ action: 'settings', maxStudentsPerBatch: next }, `Batch size set to ${next} players`);
  };

  const { byDay, windowsByDay } = useMemo(() => {
    const map = Object.fromEntries(DAYS.map(d => [d, []]));
    const windows = Object.fromEntries(DAYS.map(d => [d, []]));
    slots.forEach(s => {
      const start = toMin(s.startTime);
      const end = toMin(s.endTime);
      if (!map[s.day] || start === null || end === null || end <= start) return;
      const base = { id: s.slotId, start: Math.max(start, DAY_START), end: Math.min(end, DAY_END) };
      if (base.end <= base.start) return;
      if (s.type === 'window') {
        windows[s.day].push({ ...base, kind: 'window', day: s.day, priority: s.priority || '', startTime: s.startTime, endTime: s.endTime });
      } else if (s.type === 'batch') {
        const count = s.playerCount || 0;
        map[s.day].push({
          ...base, kind: 'batch', day: s.day, batchId: s.batchId, name: s.batchName || '', players: s.players || [], coaches: s.coaches || [],
          restricted: Boolean(s.restricted), count, full: count >= maxStudents, seatsLeft: Math.max(maxStudents - count, 0),
        });
      } else {
        map[s.day].push({ ...base, kind: 'custom', label: s.label || 'Slot', day: s.day, startTime: s.startTime, endTime: s.endTime });
      }
    });
    return { byDay: map, windowsByDay: windows };
  }, [slots, maxStudents]);

  const gapsByDay = useMemo(
    () => Object.fromEntries(DAYS.map(d => [d, availablePieces(windowsByDay[d], byDay[d], SLOT_MINUTES).filter(g => !g.short)])),
    [byDay, windowsByDay]
  );
  const hasWindows = useMemo(() => DAYS.some(d => windowsByDay[d].length > 0), [windowsByDay]);

  // One entry per batch (a batch usually runs on several days) for search and the details card.
  const batches = useMemo(() => {
    const map = new Map();
    DAYS.forEach(d => byDay[d].filter(e => e.kind === 'batch').forEach(e => {
      const b = map.get(e.batchId) || {
        batchId: e.batchId, name: e.name, players: e.players, coaches: e.coaches, restricted: e.restricted,
        count: e.count, full: e.full, seatsLeft: e.seatsLeft, times: [], days: [],
      };
      b.days.push(d);
      const t = range(e.start, e.end);
      if (!b.times.includes(t)) b.times.push(t);
      map.set(e.batchId, b);
    }));
    unscheduled.forEach(u => {
      if (map.has(u.batchId)) return;
      const count = u.playerCount ?? (u.players || []).length;
      map.set(u.batchId, {
        batchId: u.batchId, name: u.batchName || '', players: u.players || [], coaches: u.coaches || [], restricted: false,
        count, full: count >= maxStudents, seatsLeft: Math.max(maxStudents - count, 0), times: [], days: [], unscheduled: true,
      });
    });
    return [...map.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [byDay, unscheduled, maxStudents]);
  const batchById = useMemo(() => new Map(batches.map(b => [b.batchId, b])), [batches]);

  const q = norm(query);
  const results = useMemo(() => {
    if (!q) return [];
    return batches
      .map(b => ({ batch: b, nameHit: norm(b.name).includes(q), playerHits: b.players.filter(p => norm(p.playerName).includes(q)) }))
      .filter(r => r.nameHit || r.playerHits.length);
  }, [q, batches]);

  const activeIds = useMemo(() => {
    if (focusBatchId) return new Set([focusBatchId]);
    if (q) return new Set(results.map(r => r.batch.batchId));
    return null;
  }, [focusBatchId, q, results]);

  // Marks the part of a name that matches what was typed.
  const markText = (value) => {
    const text = String(value || '');
    const i = q ? text.toLowerCase().indexOf(q) : -1;
    if (i < 0) return text;
    return (
      <>
        {text.slice(0, i)}
        <mark style={{ background: dark ? 'rgba(250,204,21,0.38)' : '#FEF08A', color: 'inherit', padding: '0 2px', borderRadius: 3 }}>{text.slice(i, i + q.length)}</mark>
        {text.slice(i + q.length)}
      </>
    );
  };

  const batchCount = batches.length;
  const openHours = useMemo(
    () => Math.round(DAYS.reduce((sum, d) => sum + gapsByDay[d].reduce((s, g) => s + (g.end - g.start), 0), 0) / 60),
    [gapsByDay]
  );

  // The days on screen for the chosen range, anchored on a real date (Teams style).
  const monday = useMemo(() => addDays(anchor, -((anchor.getDay() + 6) % 7)), [anchor]);
  const weekDays = useMemo(() => DAYS.map((key, idx) => ({ key, idx, date: addDays(monday, idx) })), [monday]);
  const shownDays = useMemo(() => {
    if (rangeMode === 'day') return [weekDays[(anchor.getDay() + 6) % 7]];
    return rangeMode === 'workweek' ? weekDays.slice(0, 5) : weekDays;
  }, [weekDays, rangeMode, anchor]);

  // The IST weekly schedule laid onto the real calendar days of the viewer's time zone.
  const projected = useMemo(() => {
    const out = {};
    weekDays.forEach(({ date }) => {
      const y = date.getFullYear(); const m = date.getMonth(); const d = date.getDate();
      const key = dayKeyOf(date);
      const events = projectDay(y, m, d, tz, (idx) => byDay[DAYS[idx]]).map(({ item, start, end }) => ({ ...item, id: `${item.id}@${key}`, srcId: item.id, start, end }));
      const free = projectDay(y, m, d, tz, (idx) => gapsByDay[DAYS[idx]]).map(({ item, start, end }) => ({ ...item, start, end }));
      out[key] = { events: assignLanes(events), free };
    });
    return out;
  }, [weekDays, tz, byDay, gapsByDay]);

  const tzText = useMemo(() => {
    const labels = [...new Set(weekDays.map(({ date }) => tzLabel(tz, date.getTime())))];
    if (labels.length === 1) return labels[0];
    return tz === 'America/Chicago' ? 'CT' : labels.join('/');
  }, [weekDays, tz]);

  const rangeLabel = useMemo(() => {
    const first = shownDays[0].date;
    const last = shownDays[shownDays.length - 1].date;
    const mon = (d) => d.toLocaleDateString('en-US', { month: 'long' });
    if (rangeMode === 'day') return first.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if (first.getMonth() === last.getMonth()) return `${mon(first)} ${first.getDate()} – ${last.getDate()}, ${last.getFullYear()}`;
    return `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${last.getFullYear()}`;
  }, [shownDays, rangeMode]);

  const step = (dir) => setAnchor(a => addDays(a, dir * (rangeMode === 'day' ? 1 : 7)));

  // Open the calendar around the first thing in the day, like Teams opening at the start of the work day.
  useEffect(() => {
    if (loading || didScroll.current || !scrollRef.current || view !== 'calendar') return;
    const starts = shownDays.flatMap(({ date }) => { const c = projected[dayKeyOf(date)]; return [...c.events, ...c.free].map(e => e.start); });
    const first = starts.length ? Math.min(...starts) : 8 * 60;
    scrollRef.current.scrollTop = Math.max(0, (Math.min(first, 9 * 60) / 60 - 1) * HOUR_PX);
    didScroll.current = true;
  }, [loading, view, shownDays, projected]);

  // Glide the calendar to a batch and pulse its blocks so the eye finds them. Works on the week shown, so a
  // day view that does not hold the batch is widened to the week first.
  const scrollToBatch = (batchIds) => {
    const ids = new Set(batchIds);
    const eventsOf = (days) => days.flatMap(({ date }) => projected[dayKeyOf(date)].events.filter(e => e.kind === 'batch' && ids.has(e.batchId)));
    let visible = eventsOf(shownDays);
    if (!visible.length) {
      const inWeek = eventsOf(weekDays);
      if (!inWeek.length) return false;
      setRangeMode('week');
      visible = inWeek;
    }
    setView('calendar');
    const first = Math.min(...visible.map(e => e.start));
    setPulseIds(ids);
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTo({ top: Math.max(0, (first / 60 - 1) * HOUR_PX), behavior: 'smooth' });
    }, view === 'calendar' ? 30 : 160);
    return true;
  };

  useEffect(() => {
    if (!pulseIds) return undefined;
    const t = setTimeout(() => setPulseIds(null), 3600);
    return () => clearTimeout(t);
  }, [pulseIds]);

  const jumpToBatch = (b) => {
    if (b.unscheduled) {
      const r = searchRef.current?.getBoundingClientRect();
      setFocusBatchId(null);
      setSearchOpen(false);
      setQuery('');
      setPopover({ batchId: b.batchId, left: Math.min(Math.max(12, r ? r.left : 12), window.innerWidth - 332), top: r ? r.bottom + 8 : 120 });
      return;
    }
    setFocusBatchId(b.batchId);
    setSearchOpen(false);
    setQuery('');
    scrollToBatch([b.batchId]);
  };

  // While typing, glide to the first batch that matches (a player's name finds the batch they are in).
  const firstHitKey = useMemo(() => results.filter(r => !r.batch.unscheduled).map(r => r.batch.batchId).join('|'), [results]);
  useEffect(() => {
    if (!q || !firstHitKey) return undefined;
    const t = setTimeout(() => scrollToBatch(firstHitKey.split('|')), 320);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, firstHitKey]);

  const exportCsv = () => {
    const rows = [['Day', 'Batch', `Time (${tzText})`, 'Players', 'Seats', `Open for new players (${tzText})`]];
    weekDays.forEach(({ date }) => {
      const col = projected[dayKeyOf(date)];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      const avail = col.free.map(g => `${rangeShort(g.start, g.end)}${g.priority ? ` ${PRIORITY_LABEL[g.priority]}` : ''}`).join('; ');
      const list = col.events.filter(e => e.kind === 'batch').sort((x, y) => x.start - y.start);
      if (!list.length) rows.push([dayName, '', '', '', '', avail]);
      list.forEach((e, k) => rows.push([dayName, e.name || 'Batch', rangeShort(e.start, e.end), e.players.map(pl => pl.playerName).join('; '), `${e.count}/${maxStudents}`, k === 0 ? avail : '']));
    });
    const blob = new Blob([rows.map(r => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'session-scheduled.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const text = dark ? '#F1F5F9' : '#0F172A';
  const sub = dark ? '#94A3B8' : '#64748B';
  const line = dark ? 'rgba(255,255,255,0.09)' : '#E5E7EB';
  const lineSoft = dark ? 'rgba(255,255,255,0.05)' : '#F1F3F5';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const page = dark ? 'transparent' : '#FFFFFF';
  const accent = dark ? '#A5B4FC' : '#4F46E5';
  const freeBg = dark ? 'rgba(16,185,129,0.10)' : 'rgba(16,185,129,0.08)';
  const freeBorder = dark ? 'rgba(52,211,153,0.55)' : '#34D399';
  const freeText = dark ? '#6EE7B7' : '#047857';
  const INPUT_STYLE = { width: '100%', padding: '10px 12px', border: `1.5px solid ${line}`, borderRadius: '9px', fontSize: '13.5px', boxSizing: 'border-box', background: dark ? 'rgba(255,255,255,0.06)' : '#fff', color: text, fontFamily: 'inherit' };

  const ghostBtn = (extra = {}) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: 34, padding: '0 12px', borderRadius: '8px',
    border: `1px solid ${line}`, background: card, color: text, fontSize: '13px', fontWeight: '600', cursor: 'pointer', ...extra,
  });

  const stepBtn = (disabled) => ({
    width: 22, height: 22, borderRadius: '6px', border: `1px solid ${line}`, background: card, color: text,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
  });

  const openPopover = (e, ev, date) => {
    const r = e.currentTarget.getBoundingClientRect();
    const w = 320;
    const left = r.right + 10 + w > window.innerWidth ? Math.max(12, r.left - w - 10) : r.right + 10;
    setPopover({ batchId: ev.batchId, date, start: ev.start, end: ev.end, left, top: Math.min(Math.max(72, r.top), window.innerHeight - 380) });
  };

  const colHeight = GRID_H;
  const nowY = (now.mins / 60) * HOUR_PX;
  const popBatch = popover ? batchById.get(popover.batchId) : null;
  const popTone = popBatch ? colorFor(popBatch.batchId) : null;

  const renderEvent = (ev, date) => {
    const top = (ev.start / 60) * HOUR_PX + 1;
    const h = ((ev.end - ev.start) / 60) * HOUR_PX - 2;
    const w = 100 / ev.lanes;
    const pos = { position: 'absolute', top, height: h, left: `calc(${ev.lane * w}% + 2px)`, width: `calc(${w}% - 4px)`, boxSizing: 'border-box', overflow: 'hidden' };

    if (ev.kind === 'custom') {
      return (
        <div key={ev.id} onClick={() => openEdit({ ...ev, id: ev.srcId })} title={`${ev.label} · ${range(ev.start, ev.end)} ${tzText} · Click to edit`} style={{
          ...pos, zIndex: 2, borderRadius: 6, padding: '3px 7px', cursor: 'pointer', color: dark ? '#CBD5E1' : '#475569',
          background: dark ? 'repeating-linear-gradient(135deg, rgba(148,163,184,0.16) 0 6px, rgba(148,163,184,0.07) 6px 12px)' : 'repeating-linear-gradient(135deg, #EEF1F5 0 6px, #F7F8FA 6px 12px)',
          border: `1px solid ${dark ? 'rgba(148,163,184,0.4)' : '#CBD5E1'}`, borderLeft: '4px solid #94A3B8',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700 }}><Coffee size={12} /> {ev.label}</div>
          {h >= 36 && <div style={{ fontSize: 11, opacity: 0.85 }}>{rangeShort(ev.start, ev.end)}</div>}
        </div>
      );
    }

    const [bg, bar, ink, dbg, dink] = colorFor(ev.batchId);
    const dim = activeIds && !activeIds.has(ev.batchId);
    const title = ev.restricted ? 'Batch' : (ev.name || 'Batch');
    const allNames = ev.players.map(p => p.playerName).filter(Boolean).join(', ');
    // Lines of player names that fit under the title + time rows (a 1-hour block fits one line, a longer block more).
    const nameLines = Math.max(1, Math.min(5, Math.floor((h - 44) / 13)));
    return (
      <div
        key={ev.id}
        onClick={(e) => openPopover(e, ev, date)}
        title={`${title} · ${range(ev.start, ev.end)} ${tzText} · ${ev.count}/${maxStudents} players · ${ev.full ? 'Full' : `${ev.seatsLeft} seat${ev.seatsLeft === 1 ? '' : 's'} open`}`}
        style={{
          ...pos, zIndex: 3, borderRadius: 6, padding: '3px 7px 3px 8px', cursor: 'pointer',
          background: dark ? dbg : bg, borderLeft: `4px solid ${bar}`, color: dark ? dink : ink,
          boxShadow: dark ? 'none' : '0 1px 2px rgba(15,23,42,0.12)', opacity: dim ? 0.28 : 1, transition: 'opacity .15s, box-shadow .15s',
          outline: focusBatchId === ev.batchId ? `2px solid ${bar}` : 'none',
          animation: pulseIds && pulseIds.has(ev.batchId) ? 'ss-pulse 1.1s ease-out 3' : 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,42,0.22)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = dark ? 'none' : '0 1px 2px rgba(15,23,42,0.12)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.restricted ? title : markText(title)}</span>
          <span style={{
            flexShrink: 0, fontSize: 10.5, fontWeight: 800, padding: '0 6px', borderRadius: 999, lineHeight: '16px',
            background: ev.full ? '#E5484D' : (dark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.7)'), color: ev.full ? '#fff' : 'inherit',
          }}>{ev.count}/{maxStudents}</span>
        </div>
        {h >= 38 && <div style={{ fontSize: 11, opacity: 0.9, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rangeShort(ev.start, ev.end)}{ev.full ? ' · Full' : ''}</div>}
        {h >= 44 && allNames && (
          <div title={allNames} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginTop: 2, fontSize: 11, fontWeight: 600, lineHeight: '13px' }}>
            <UserRound size={11} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: nameLines, overflow: 'hidden', wordBreak: 'break-word' }}>
              {ev.players.filter(p => p.playerName).map((p, i) => (
                <span key={p.playerId}>{i ? ', ' : ''}{q && norm(p.playerName).includes(q) ? <mark style={{ background: dark ? 'rgba(250,204,21,0.45)' : '#FEF08A', color: dark ? '#FEF3C7' : '#713F12', padding: '0 2px', borderRadius: 3, fontWeight: 800 }}>{p.playerName}</mark> : p.playerName}</span>
              ))}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderFree = (g) => {
    const top = (g.start / 60) * HOUR_PX + 1;
    const h = ((g.end - g.start) / 60) * HOUR_PX - 2;
    const w = g.window;
    return (
      <div
        key={`f${w.id}-${g.start}`}
        onClick={() => openEdit(w)}
        title={`Open for a new player · ${range(g.start, g.end)} ${tzText}${g.priority ? ` · ${PRIORITY_LABEL[g.priority]}` : ''} · Click to edit`}
        style={{
          position: 'absolute', top, height: h, left: 2, right: 2, zIndex: 1, boxSizing: 'border-box', overflow: 'hidden', cursor: 'pointer',
          borderRadius: 6, padding: '3px 7px', background: freeBg, border: `1.5px dashed ${freeBorder}`, color: freeText,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, paddingRight: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {g.priority === 'preferred' ? <Star size={11} fill="currentColor" /> : g.priority === 'alternative' ? <Zap size={11} fill="currentColor" /> : <Plus size={11} />}
          Open
          {g.priority && h >= 30 ? <span style={{ fontWeight: 600, opacity: 0.85 }}>· {PRIORITY_LABEL[g.priority]}</span> : null}
        </div>
        {h >= 40 && <div style={{ fontSize: 11, opacity: 0.9 }}>{rangeShort(g.start, g.end)}</div>}
        <button
          onClick={(e) => { e.stopPropagation(); removeSlot({ id: w.id, label: 'open slot', day: w.day, start: w.start, end: w.end }); }}
          disabled={saving} title="Remove open slot" aria-label={`Remove open slot ${range(w.start, w.end)} IST on ${w.day}`}
          style={{ position: 'absolute', top: 3, right: 3, width: 16, height: 16, padding: 0, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.1)', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        ><X size={10} /></button>
      </div>
    );
  };

  const chip = (key, label, tone, onRemove, title) => {
    const [bg, bar, ink, dbg, dink] = tone;
    return (
      <span key={key} title={title} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 6, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
        background: dark ? dbg : bg, color: dark ? dink : ink, borderLeft: `3px solid ${bar}`,
      }}>
        {label}
        {onRemove && (
          <button onClick={onRemove} disabled={saving} aria-label={`Remove ${label}`} style={{ width: 15, height: 15, padding: 0, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.12)', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={9} /></button>
        )}
      </span>
    );
  };
  const FREE_TONE = ['#DCFCE7', '#10B981', '#166534', 'rgba(16,185,129,0.22)', '#86EFAC'];
  const BLOCK_TONE = ['#EEF1F5', '#94A3B8', '#334155', 'rgba(148,163,184,0.22)', '#E2E8F0'];

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} duration={3000} onClose={closeToast} />}
      {/* theme.css forces a background, radius and focus ring on every input with !important, so the search box
          (which draws its own border on the wrapper) needs a rule that out-ranks it. */}
      <style>{`
        @keyframes ss-pulse {
          0% { box-shadow: 0 0 0 0 rgba(79,70,229,0.6); }
          100% { box-shadow: 0 0 0 14px rgba(79,70,229,0); }
        }
        input.ss-search-input.ss-search-input.ss-search-input.ss-search-input {
          background: transparent !important; border: none !important; border-radius: 0 !important;
          box-shadow: none !important; outline: none !important; padding: 0 !important;
        }
      `}</style>
      <div style={{ padding: 'clamp(8px, 1.6vw, 16px)', maxWidth: '1700px', margin: '0 auto' }}>
        {/* ---- title ---- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <CalendarClock size={24} color={accent} strokeWidth={1.8} />
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: text }}>Session Scheduled</h1>
          <span style={{ fontSize: 12.5, color: sub }}>Weekly batch schedule and open times for new players · times shown in <b style={{ color: text }}>{tzText}</b></span>
          <div style={{ flex: 1 }} />
          <button onClick={exportCsv} title="Download the schedule as a CSV file" style={ghostBtn()}><Download size={14} /> Export</button>
          <button onClick={openModal} disabled={!URL_CONFIGURED} style={{
            ...ghostBtn({ border: `1px solid ${BRAND}`, background: BTN_BG, boxShadow: BTN_SHADOW, color: '#fff', fontWeight: 700 }),
            opacity: URL_CONFIGURED ? 1 : 0.5, cursor: URL_CONFIGURED ? 'pointer' : 'not-allowed',
          }}><Plus size={15} /> Add slot</button>

        </div>

        {/* ---- toolbar (Teams style) ---- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingBottom: 10 }}>
          <button onClick={() => setAnchor(new Date())} style={ghostBtn()}><CalendarDays size={14} /> Today</button>
          <button onClick={() => step(-1)} aria-label="Previous" style={ghostBtn({ width: 34, padding: 0 })}><ChevronLeft size={16} /></button>
          <button onClick={() => step(1)} aria-label="Next" style={ghostBtn({ width: 34, padding: 0 })}><ChevronRight size={16} /></button>
          <span style={{ fontSize: 16, fontWeight: 700, color: text, margin: '0 6px', whiteSpace: 'nowrap' }}>{rangeLabel}</span>

          <div style={{ flex: 1 }} />

          {/* search */}
          <div ref={searchRef} style={{ position: 'relative', width: 'min(280px, 100%)', flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 10px', borderRadius: 8, boxSizing: 'border-box',
              border: `1px solid ${searchOpen ? accent : line}`, background: dark ? 'rgba(255,255,255,0.06)' : '#fff',
              boxShadow: searchOpen ? '0 0 0 3px rgba(99,102,241,0.14)' : 'none', transition: 'border-color .15s, box-shadow .15s',
            }}>
              <Search size={14} color={sub} style={{ flexShrink: 0 }} />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setFocusBatchId(null); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search batch or player"
                aria-label="Search batch or player"
                autoComplete="off"
                className="ss-search-input"
                style={{
                  flex: 1, minWidth: 0, width: '100%', height: '100%', padding: 0, margin: 0, border: 'none', borderRadius: 0, outline: 'none',
                  boxShadow: 'none', background: 'transparent', color: text, fontSize: 13, fontFamily: 'inherit',
                }}
              />
              {(query || focusBatchId) && (
                <button onClick={() => { setQuery(''); setFocusBatchId(null); }} aria-label="Clear search" style={{ border: 'none', background: 'none', cursor: 'pointer', color: sub, padding: 0, display: 'flex' }}><X size={14} /></button>
              )}
            </div>
            {searchOpen && q && (
              <div style={{
                position: 'absolute', top: 40, left: 0, right: 0, zIndex: 60, maxHeight: 360, overflowY: 'auto', borderRadius: 10,
                background: dark ? '#14112b' : '#fff', border: `1px solid ${line}`, boxShadow: '0 12px 32px rgba(15,23,42,0.18)',
              }}>
                {results.length === 0 ? (
                  <div style={{ padding: '14px 14px', fontSize: 13, color: sub, lineHeight: 1.5 }}>
                    No batch or player matches “{query}”.
                    {hiddenBatches > 0 && <div style={{ marginTop: 6, fontSize: 12, color: dark ? '#FCD34D' : '#B45309' }}>{hiddenBatches} batch{hiddenBatches === 1 ? ' is' : 'es are'} hidden for your login, because none of your assigned players are in {hiddenBatches === 1 ? 'it' : 'them'}. Ask a superAdmin if you need to see all batches.</div>}
                  </div>
                ) : results.slice(0, 8).map(r => {
                  const b = r.batch;
                  const [, bar] = colorFor(b.batchId);
                  return (
                    <button key={b.batchId} onClick={() => jumpToBatch(b)} style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', borderLeft: `4px solid ${bar}`,
                      background: 'transparent', cursor: 'pointer', color: text, fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : '#F5F7FF'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800 }}>{b.restricted ? 'Batch' : markText(b.name || 'Batch')}</span>
                        <span style={{ fontSize: 11.5, color: sub }}>{b.count}/{maxStudents} players</span>
                      </div>
                      <div style={{ fontSize: 12, color: b.unscheduled ? (dark ? '#FCD34D' : '#B45309') : sub, marginTop: 1 }}>{b.unscheduled ? 'No days or time set yet' : `${b.days.join(', ')} · ${b.times.join(', ')} IST`}</div>
                      {r.playerHits.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                          {r.playerHits.slice(0, 4).map(p => (
                            <span key={p.playerId} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, padding: '1px 8px', borderRadius: 999, background: dark ? 'rgba(250,204,21,0.22)' : '#FEF08A', color: dark ? '#FDE68A' : '#713F12' }}>
                              <UserRound size={10} /><span>{markText(p.playerName)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }} title="Slot times are stored in IST. Pick the zone to show them in, or leave on Auto to follow this computer.">
            <Globe size={14} color={sub} style={{ position: 'absolute', left: 10, pointerEvents: 'none' }} />
            <select value={tzPref} onChange={(e) => chooseTz(e.target.value)} aria-label="Time zone" style={{
              ...ghostBtn({ padding: '0 28px 0 30px', appearance: 'none', WebkitAppearance: 'none' }),
            }}>
              <option value="auto">Auto · {tzLabel(sysZone, weekDays[3].date.getTime())}</option>
              <option value="IST">IST (India)</option>
              <option value="CT">CT (Chicago)</option>
            </select>
            <ChevronDown size={14} color={sub} style={{ position: 'absolute', right: 9, pointerEvents: 'none' }} />
          </span>

          <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <select value={rangeMode} onChange={(e) => setRangeMode(e.target.value)} aria-label="Calendar range" style={{
              ...ghostBtn({ padding: '0 28px 0 12px', appearance: 'none', WebkitAppearance: 'none' }),
            }}>
              {RANGES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <ChevronDown size={14} color={sub} style={{ position: 'absolute', right: 9, pointerEvents: 'none' }} />
          </span>

          <div style={{ display: 'flex', borderRadius: 8, border: `1px solid ${line}`, overflow: 'hidden', background: card }}>
            {[['calendar', 'Calendar', CalendarDays], ['table', 'Table', Table2]].map((v) => {
              const k = v[0]; const label = v[1]; const Icon = v[2]; const on = view === k;
              return (
                <button key={k} onClick={() => setView(k)} aria-pressed={on} style={{
                  display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 11px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: on ? BTN_BG : 'transparent', color: on ? '#fff' : text,
                }}><Icon size={14} /> {label}</button>
              );
            })}
          </div>
        </div>

        {/* ---- summary strip ---- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', paddingBottom: 10, fontSize: 12.5, color: sub }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Users size={13} /> <b style={{ color: text }}>{batchCount}</b> batch{batchCount === 1 ? '' : 'es'}</span>
          <span><b style={{ color: text }}>{openHours}h</b> open for new players</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Max per batch
            <button aria-label="Decrease batch size" onClick={() => changeCapacity(maxStudents - 1)} disabled={saving || maxStudents <= 1 || !URL_CONFIGURED} style={stepBtn(saving || maxStudents <= 1 || !URL_CONFIGURED)}><Minus size={12} /></button>
            <b style={{ color: text, minWidth: 14, textAlign: 'center' }}>{maxStudents}</b>
            <button aria-label="Increase batch size" onClick={() => changeCapacity(maxStudents + 1)} disabled={saving || maxStudents >= MAX_LIMIT || !URL_CONFIGURED} style={stepBtn(saving || maxStudents >= MAX_LIMIT || !URL_CONFIGURED)}><Plus size={12} /></button>
          </span>
          {hiddenBatches > 0 && (
            <span title="Your login only shows batches that hold players assigned to you, the same as the Batches page. A superAdmin sees every batch." style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 10px', borderRadius: 999, fontWeight: 700, cursor: 'help',
              background: dark ? 'rgba(245,158,11,0.16)' : '#FFFBEB', border: `1px solid ${dark ? 'rgba(251,191,36,0.5)' : '#FCD34D'}`, color: dark ? '#FCD34D' : '#92400E',
            }}>{hiddenBatches} batch{hiddenBatches === 1 ? '' : 'es'} hidden for your login</span>
          )}
          {focusBatchId && batchById.get(focusBatchId) && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 4px 2px 10px', borderRadius: 999, background: dark ? 'rgba(99,102,241,0.25)' : '#EEF2FF', color: dark ? '#C7D2FE' : '#3730A3', fontWeight: 700 }}>
              Showing {batchById.get(focusBatchId).name || 'batch'}
              <button onClick={() => setFocusBatchId(null)} aria-label="Show all batches" style={{ border: 'none', background: 'rgba(0,0,0,0.1)', borderRadius: '50%', width: 18, height: 18, padding: 0, cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={11} /></button>
            </span>
          )}
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, border: `1.5px dashed ${freeBorder}`, background: freeBg }} /> Open</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#4F7BF7' }} /> Batch</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#CBD5E1' }} /> Break</span>
          </span>
        </div>

        {!loading && !error && !hasWindows && (
          <div style={{ marginBottom: 10, padding: '9px 12px', borderRadius: 8, fontSize: 12.5, color: sub, border: `1px dashed ${line}`, background: card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span>No open slots are saved yet, so no open time is shown. Weekdays 8–9 PM (preferred) and 7–8 PM (alternative), Sat/Sun 11 AM–12 PM and 7–8 PM are the usual ones.</span>
            <button onClick={addStandardSlots} disabled={saving} style={{ ...ghostBtn({ height: 30, border: `1px solid ${BRAND}`, background: BTN_BG, color: '#fff', fontWeight: 700 }), opacity: saving ? 0.7 : 1 }}>{saving ? 'Adding…' : 'Add standard slots'}</button>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: sub }}><Loader size={22} style={{ animation: 'spin 1s linear infinite' }} /></div>
        ) : error ? (
          <div style={{ padding: 14, borderRadius: 10, color: '#DC2626', background: 'rgba(239,68,68,0.08)', fontSize: 13, fontWeight: 600 }}>{error}</div>
        ) : view === 'table' ? (
          <div style={{ overflowX: 'auto', border: `1px solid ${line}`, borderRadius: 10, background: card }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr>
                  {['Day', `Batches (${tzText})`, `Open for new players (${tzText})`].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11.5, fontWeight: 800, letterSpacing: '.4px', textTransform: 'uppercase', color: sub, borderBottom: `1px solid ${line}`, width: h === 'Day' ? 150 : 'auto' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekDays.map(({ key: d, date }, i) => {
                  const col = projected[dayKeyOf(date)];
                  const filled = [...col.events].sort((a, b) => a.start - b.start);
                  const free = col.free;
                  return (
                    <tr key={d} style={{ borderBottom: i === DAYS.length - 1 ? 'none' : `1px solid ${line}` }}>
                      <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: text }}>{date.toLocaleDateString('en-US', { weekday: 'long' })}</div>
                        <div style={{ fontSize: 12, color: sub }}>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      </td>
                      <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {filled.length ? filled.map(f => (f.kind === 'custom'
                            ? chip(f.id, `${f.label} · ${rangeShort(f.start, f.end)}`, BLOCK_TONE, () => removeBlock(f))
                            : chip(f.id, `${f.restricted ? 'Batch' : (f.name || 'Batch')} · ${rangeShort(f.start, f.end)} · ${f.count}/${maxStudents}${f.full ? ' Full' : ''}`, colorFor(f.batchId), null,
                              f.players.length ? `Players: ${f.players.map(p => p.playerName).join(', ')}` : undefined)
                          )) : <span style={{ color: sub, fontSize: 13 }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {free.map(g => chip(`f${g.window.id}-${g.start}`, `${rangeShort(g.start, g.end)}${g.priority ? ` · ${PRIORITY_LABEL[g.priority]}` : ''}`, FREE_TONE,
                            () => removeSlot({ id: g.window.id, label: 'open slot', day: g.window.day, start: g.window.start, end: g.window.end })))}
                          {!free.length && <span style={{ color: sub, fontSize: 13 }}>No open slot</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ border: `1px solid ${line}`, borderRadius: 10, background: page, overflow: 'hidden' }}>
            {/* day header */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${line}`, paddingRight: 0 }}>
              <div style={{ width: GUTTER, flexShrink: 0 }} />
              {shownDays.map(({ key, date }) => {
                const isToday = dayKeyOf(date) === now.key;
                return (
                  <div key={key + date.getDate()} style={{ flex: 1, minWidth: 0, padding: '8px 4px 6px', textAlign: 'center', borderLeft: `1px solid ${line}` }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.3px', color: isToday ? accent : sub, textTransform: 'uppercase' }}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div style={{
                      margin: '2px auto 0', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 700, color: isToday ? '#fff' : text, background: isToday ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : 'transparent',
                    }}>{date.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* scrolling time grid */}
            <div ref={scrollRef} style={{ height: 'min(calc(100dvh - 290px), 760px)', minHeight: 380, overflowY: 'auto', position: 'relative' }}>
              <div style={{ display: 'flex', height: colHeight, position: 'relative' }}>
                <div style={{ width: GUTTER, flexShrink: 0, position: 'relative' }}>
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} style={{ position: 'absolute', top: h * HOUR_PX - 7, right: 8, fontSize: 11, color: sub, whiteSpace: 'nowrap' }}>{hourLabel(h)}</div>
                  ))}
                </div>
                {shownDays.map(({ key, date }) => {
                  const isToday = dayKeyOf(date) === now.key;
                  const col = projected[dayKeyOf(date)];
                  return (
                    <div key={key + date.getDate()} style={{ flex: 1, minWidth: 0, position: 'relative', borderLeft: `1px solid ${line}`, background: isToday ? (dark ? 'rgba(99,102,241,0.05)' : 'rgba(79,70,229,0.025)') : 'transparent' }}>
                      {Array.from({ length: 24 }, (_, h) => (
                        <div key={h}>
                          <div style={{ position: 'absolute', top: h * HOUR_PX, left: 0, right: 0, borderTop: `1px solid ${h === 0 ? 'transparent' : line}` }} />
                          <div style={{ position: 'absolute', top: h * HOUR_PX + HOUR_PX / 2, left: 0, right: 0, borderTop: `1px dotted ${lineSoft}` }} />
                        </div>
                      ))}
                      {col.free.map(g => renderFree(g))}
                      {col.events.map(ev => renderEvent(ev, date))}
                      {isToday && (
                        <div style={{ position: 'absolute', top: nowY, left: 0, right: 0, zIndex: 5, pointerEvents: 'none' }}>
                          <div style={{ position: 'absolute', left: -5, top: -5, width: 10, height: 10, borderRadius: '50%', background: '#E5484D' }} />
                          <div style={{ height: 2, background: '#E5484D' }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---- batch details card (Teams style event card) ---- */}
      {popover && popBatch && (
        <>
          <div onClick={() => setPopover(null)} style={{ position: 'fixed', inset: 0, zIndex: 900 }} />
          <div role="dialog" aria-label={`${popBatch.name || 'Batch'} details`} style={{
            position: 'fixed', left: popover.left, top: popover.top, width: 320, zIndex: 901, borderRadius: 12, overflow: 'hidden',
            background: dark ? '#14112b' : '#fff', border: `1px solid ${line}`, boxShadow: '0 16px 40px rgba(15,23,42,0.28)',
          }}>
            <div style={{ height: 6, background: popTone[1] }} />
            <div style={{ padding: '12px 14px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: text, lineHeight: 1.25 }}>{popBatch.restricted ? 'Batch' : (popBatch.name || 'Batch')}</div>
                  <div style={{ fontSize: 12.5, color: popBatch.unscheduled ? (dark ? '#FCD34D' : '#B45309') : sub, marginTop: 2 }}>
                    {popBatch.unscheduled ? 'No days or start time set yet, so it is not on the calendar. Set them on the Batches page.' : `${popBatch.days.join(', ')} · ${popBatch.times.join(', ')} IST`}
                  </div>
                  {!isIst(tz) && popover.date && (
                    <div style={{ fontSize: 12.5, color: accent, fontWeight: 700, marginTop: 2 }}>
                      This session: {popover.date.toLocaleDateString('en-US', { weekday: 'short' })} {range(popover.start, popover.end)} {tzText}
                    </div>
                  )}
                </div>
                <button onClick={() => setPopover(null)} aria-label="Close" style={{ border: 'none', background: 'none', cursor: 'pointer', color: sub, padding: 2, display: 'flex' }}><X size={16} /></button>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: text }}>
                  <span>Seats</span>
                  <span>{popBatch.count} / {maxStudents} · {popBatch.full ? 'Full' : `${popBatch.seatsLeft} open`}</span>
                </div>
                <div style={{ height: 6, borderRadius: 6, marginTop: 5, background: dark ? 'rgba(255,255,255,0.12)' : '#E5E7EB', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.round((popBatch.count / maxStudents) * 100))}%`, height: '100%', background: popBatch.full ? '#E5484D' : popTone[1] }} />
                </div>
              </div>

              {popBatch.coaches.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 12.5, color: sub }}>Coach: <b style={{ color: text }}>{popBatch.coaches.join(', ')}</b></div>
              )}

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 5 }}>Players ({popBatch.players.length})</div>
                {popBatch.players.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 150, overflowY: 'auto' }}>
                    {popBatch.players.map(p => (
                      <div key={p.playerId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: text }}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', background: popTone[1] }}>
                          {(p.playerName || '?').split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')}
                        </span>
                        {p.playerName || 'Unnamed player'}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: sub }}>{popBatch.restricted ? 'Player names are only shown for your own batches.' : 'No players yet.'}</div>
                )}
              </div>

              {!popBatch.restricted && (
                <button onClick={() => navigate(`/admin/batches/${popBatch.batchId}`)} style={{ ...ghostBtn({ width: '100%', marginTop: 12 }), color: accent, borderColor: dark ? 'rgba(165,180,252,0.4)' : 'rgba(79,70,229,0.35)' }}>
                  <ExternalLink size={14} /> Open batch
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ---- add / edit slot slide-out ---- */}
      <div
        onClick={() => setShowModal(false)}
        style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.45)', opacity: showModal ? 1 : 0, pointerEvents: showModal ? 'auto' : 'none', transition: 'opacity .25s ease' }}
      />
      <aside
        role="dialog"
        aria-label={editId ? 'Edit Slot' : 'Add Slot'}
        aria-hidden={!showModal}
        style={{
          position: 'fixed', top: 0, right: 0, height: '100dvh', width: 'min(420px, 100vw)', zIndex: 1001,
          background: dark ? '#14112b' : '#FFFFFF', borderLeft: `1px solid ${line}`, boxShadow: showModal ? '-12px 0 32px rgba(0,0,0,0.18)' : 'none',
          transform: showModal ? 'translateX(0)' : 'translateX(105%)', transition: `transform .3s cubic-bezier(0.4,0,0.2,1), visibility 0s linear ${showModal ? '0s' : '.3s'}`,
          display: 'flex', flexDirection: 'column', visibility: showModal ? 'visible' : 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${line}` }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: text }}>{editId ? 'Edit Slot' : 'Add Slot'}</h2>
          <button onClick={() => setShowModal(false)} aria-label="Close" style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${line}`, background: 'transparent', color: text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><X size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ margin: 0, fontSize: 12.5, color: sub, lineHeight: 1.5 }}>
            {form.kind === 'open'
              ? 'Open slots are the only times offered to new players. Time already taken by a batch is removed from them automatically.'
              : "Blocked time (like a break) can't be booked and is removed from the open slots. Batch times come from the batch schedule and can't be changed here."}
          </p>
          {!editId && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: text }}>Type</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['open', 'Open for booking'], ['block', 'Block time']].map(([k, label]) => {
                  const on = form.kind === k;
                  return (
                    <button key={k} type="button" onClick={() => setForm(f => ({ ...f, kind: k }))} style={{
                      flex: 1, padding: '8px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                      border: `1.5px solid ${on ? BRAND : line}`, background: on ? BTN_BG : card, boxShadow: on ? BTN_SHADOW : 'none', color: on ? '#fff' : text,
                    }}>{label}</button>
                  );
                })}
              </div>
            </div>
          )}
          {form.kind === 'block' ? (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: text }}>Label</label>
              <input value={form.label} maxLength={40} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} style={INPUT_STYLE} />
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: text }}>Priority</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PRIORITIES.map(([k, label]) => {
                  const on = form.priority === k;
                  return (
                    <button key={k || 'none'} type="button" onClick={() => setForm(f => ({ ...f, priority: k }))} style={{
                      padding: '7px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                      border: `1.5px solid ${on ? BRAND : line}`, background: on ? BTN_BG : card, boxShadow: on ? BTN_SHADOW : 'none', color: on ? '#fff' : text,
                    }}>{label}</button>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: text }}>{editId ? 'Day' : 'Days'}</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DAYS.map(d => {
                const on = form.days.includes(d);
                return (
                  <button key={d} type="button" onClick={() => toggleFormDay(d)} style={{
                    padding: '7px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                    border: `1.5px solid ${on ? BRAND : line}`, background: on ? BTN_BG : card, boxShadow: on ? BTN_SHADOW : 'none', color: on ? '#fff' : text,
                  }}>{d}</button>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[['startTime', 'Start time (IST)'], ['endTime', 'End time (IST)']].map(([key, label]) => (
              <div key={key} style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: text }}>{label}</label>
                <input type="time" step={900} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={INPUT_STYLE} />
              </div>
            ))}
          </div>
          {!isIst(tz) && (
            <div style={{ fontSize: 12, color: sub, lineHeight: 1.5 }}>Enter times in IST. On the calendar they appear converted to {tzText}.</div>
          )}
          {formError && <div style={{ fontSize: 12.5, fontWeight: 600, color: '#DC2626' }}>{formError}</div>}
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '14px 22px', borderTop: `1px solid ${line}` }}>
          <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${line}`, background: card, color: text, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={addSlot} disabled={saving} style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${BRAND}`, color: '#fff', fontWeight: 700, fontSize: 13, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, background: BTN_BG, boxShadow: BTN_SHADOW }}>
            {saving ? 'Saving…' : (editId ? 'Save Changes' : 'Add Slot')}
          </button>
        </div>
      </aside>
    </Layout>
  );
};

export default SessionSlots;
