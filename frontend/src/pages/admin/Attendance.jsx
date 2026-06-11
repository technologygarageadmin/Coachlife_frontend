import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Toast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import SkeletonLoaderStyles, { SkeletonLoader } from '../../components/SkeletonLoader';
import {
  CalendarCheck, CheckCircle, Save, ChevronDown, Users,
  ChevronLeft, ChevronRight, UserCheck, BarChart2, User,
  Calendar, CircleHelp, Layers,
} from 'lucide-react';

const BRAND  = '#060030ff';
const DAYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

const CL_GET_BATCHES_URL     = 'https://ts6wti3133.execute-api.ap-south-1.amazonaws.com/default/CL_Get_Batches';
const CL_MANAGE_BATCH_URL    = 'https://rwl4dpqgu5.execute-api.ap-south-1.amazonaws.com/default/CL_Manage_Batch';
const CL_GET_ATTENDANCE_URL  = 'https://expqdxymlf.execute-api.ap-south-1.amazonaws.com/default/CL_Get_Attendance';
const CL_MARK_ATTENDANCE_URL    = 'https://a5c8vbcbj4.execute-api.ap-south-1.amazonaws.com/default/CL_Mark_Attendance';

const STATUS_CONFIG = {
  Present: { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0', dot: '#16a34a' },
  Absent:  { bg: '#fee2e2', color: '#dc2626', border: '#fecaca', dot: '#dc2626' },
  Late:    { bg: '#fef3c7', color: '#d97706', border: '#fde68a', dot: '#d97706' },
  Excused: { bg: '#ede9fe', color: '#7c3aed', border: '#ddd6fe', dot: '#7c3aed' },
  '':      { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', dot: '#2563eb' },
};

function toDateStr(date) {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function makeRecordKey(playerId, batchId, sessionDate) {
  return `${playerId || ''}_${batchId || ''}_${sessionDate || ''}`;
}

function StatusBadge({ status }) {
  const s = STATUS_CONFIG[status] ?? STATUS_CONFIG[''];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '999px',
      fontSize: '12px', fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: s.dot, flexShrink: 0,
      }} />
      {status || 'In Progress'}
    </span>
  );
}

/* ── Skeleton for initial page load ─────────────────────────────────── */
function AttendanceSkeleton() {
  return (
    <div>
      {/* Header skeleton */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <SkeletonLoader width="200px" height="28px" borderRadius="8px" style={{ marginBottom: '8px' }} />
          <SkeletonLoader width="280px" height="16px" borderRadius="4px" />
        </div>
        <SkeletonLoader width="120px" height="38px" borderRadius="8px" />
      </div>

      {/* Tab bar skeleton */}
      <SkeletonLoader width="360px" height="44px" borderRadius="10px" style={{ marginBottom: '24px' }} />

      {/* Content skeleton - 2-col layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,380px) 1fr', gap: '20px' }}>
        {/* Calendar skeleton */}
        <div style={{
          background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb',
          padding: '20px', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <SkeletonLoader width="32px" height="32px" borderRadius="8px" />
            <SkeletonLoader width="100px" height="20px" borderRadius="4px" />
            <SkeletonLoader width="32px" height="32px" borderRadius="8px" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '12px' }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonLoader key={i} width="100%" height="12px" borderRadius="3px" />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {Array.from({ length: 35 }).map((_, i) => (
              <SkeletonLoader key={i} width="100%" height="38px" borderRadius="8px" />
            ))}
          </div>
        </div>

        {/* Detail panel skeleton */}
        <div style={{
          background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '20px',
        }}>
          <SkeletonLoader width="160px" height="14px" borderRadius="4px" style={{ marginBottom: '8px' }} />
          <SkeletonLoader width="220px" height="28px" borderRadius="6px" style={{ marginBottom: '24px' }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px', background: '#f9fafb', borderRadius: '8px', marginBottom: '8px',
            }}>
              <SkeletonLoader width="120px" height="14px" borderRadius="4px" />
              <SkeletonLoader width="70px" height="22px" borderRadius="999px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton for table rows ─────────────────────────────────────────── */
function SkeletonTableRows({ cols = 7, rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} style={{ padding: '14px 16px' }}>
              <SkeletonLoader
                width={j === 0 ? '140px' : j === cols - 1 ? '80px' : '100%'}
                height="14px"
                borderRadius="4px"
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ── Skeleton for stat cards ─────────────────────────────────────────── */
function SkeletonStats({ count = 6 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '12px', marginBottom: '20px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '14px 16px',
        }}>
          <SkeletonLoader width="50px" height="28px" borderRadius="4px" style={{ marginBottom: '6px', marginLeft: 'auto', marginRight: 'auto' }} />
          <SkeletonLoader width="70%" height="12px" borderRadius="3px" style={{ margin: '0 auto' }} />
        </div>
      ))}
    </div>
  );
}

export default function Attendance() {
  const navigate = useNavigate();
  const { userToken, players, fetchPlayers } = useStore();

  // ── shared
  const [batches, setBatches]               = useState([]);
  const [allRecords, setAllRecords]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [toastMsg, setToastMsg]             = useState('');
  const [toastType, setToastType]           = useState('success');
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const fetchedRef                          = useRef(false);

  // ── tabs
  const [activeTab, setActiveTab] = useState('calendar');

  // ── calendar state
  const [navMonth, setNavMonth] = useState(() => {
    const n = new Date();
    return { month: n.getMonth(), year: n.getFullYear() };
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [calendarPlayerId, setCalendarPlayerId] = useState('');

  // ── batch view state
  const [selectedBatchId, setSelectedBatchId]           = useState('');
  const [batchDate, setBatchDate]                       = useState(() => toDateStr(new Date()));
  const [batchRecords, setBatchRecords]                 = useState([]);
  const [batchLoading, setBatchLoading]                 = useState(false);
  const [edits, setEdits]                               = useState({});
  const [bulkOverrideStatus, setBulkOverrideStatus]     = useState('');
  const [saving, setSaving]                             = useState(false);
  const [completing, setCompleting]                     = useState(false);
  // per-player session card info (fetched from session card API)
  const [playerCardInfo, setPlayerCardInfo]             = useState(new Map());
  const [cardInfoLoading, setCardInfoLoading]           = useState(false);
  // per-player manual session number overrides
  const [playerSessionOverrides, setPlayerSessionOverrides] = useState({});
  const [editingSessionPlayer, setEditingSessionPlayer] = useState(null);
  const [editingSessionValue, setEditingSessionValue]   = useState('');

  // ── player view state
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [playerRecords, setPlayerRecords]       = useState([]);
  const [playerLoading, setPlayerLoading]       = useState(false);
  const [playerEdits, setPlayerEdits]           = useState({});
  const [playerSaving, setPlayerSaving]         = useState(false);

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    userToken,
    usertoken: userToken,
  }), [userToken]);

  const toast = useCallback((msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  }, []);

  const loadBatches = useCallback(async () => {
    if (!CL_GET_BATCHES_URL) { setBatches([]); return; }
    const res = await axios.get(CL_GET_BATCHES_URL, { headers });
    let d = res.data;
    if (d?.body && typeof d.body === 'string') d = JSON.parse(d.body);
    setBatches(d.batches || []);
  }, [headers]);

  const loadAllRecords = useCallback(async () => {
    if (!CL_GET_ATTENDANCE_URL) { setAllRecords([]); return; }
    const res = await axios.post(CL_GET_ATTENDANCE_URL, {}, { headers });
    let d = res.data;
    if (d?.body && typeof d.body === 'string') d = JSON.parse(d.body);
    setAllRecords(d.records || []);
  }, [headers]);

  const loadBatchRecords = useCallback(async (batchId, sessionDate, signal) => {
    if (!batchId || !CL_GET_ATTENDANCE_URL) {
      setBatchRecords([]);
      return [];
    }

    const res = await axios.post(
      CL_GET_ATTENDANCE_URL,
      { batchId, sessionDate },
      { headers, signal },
    );

    let d = res.data;
    if (d?.body && typeof d.body === 'string') d = JSON.parse(d.body);

    const recs = (d.records || []).map(r => {
      const normalizedBatchId    = r.batchId || batchId;
      const normalizedSessionDate = r.sessionDate || sessionDate;
      return {
        ...r,
        batchId:          normalizedBatchId,
        sessionDate:      normalizedSessionDate,
        attendanceStatus: r.attendanceStatus || '',
        notes:            r.notes || '',
        key:              r.attendanceId || makeRecordKey(r.playerId, normalizedBatchId, normalizedSessionDate),
      };
    });

    setBatchRecords(recs);
    return recs;
  }, [headers]);

  const loadPlayerRecords = useCallback(async (playerId, signal, showLoader = false) => {
    if (!playerId || !CL_GET_ATTENDANCE_URL) {
      setPlayerRecords([]);
      return [];
    }

    if (showLoader) setPlayerLoading(true);
    try {
      const res = await axios.post(
        CL_GET_ATTENDANCE_URL,
        { playerId },
        { headers, signal },
      );
      let d = res.data;
      if (d?.body && typeof d.body === 'string') d = JSON.parse(d.body);
      const records = d.records || [];
      setPlayerRecords(records);
      return records;
    } finally {
      if (showLoader) setPlayerLoading(false);
    }
  }, [headers]);

  const displayBatches = useMemo(() => {
    const batchedIds = new Set(batches.flatMap(b => b.playerIds || []));
    const unbatched  = players.filter(p => !batchedIds.has(p.playerId));
    if (unbatched.length === 0) return batches;
    return [...batches, {
      batchId:   'general',
      batchName: `General (${unbatched.length} unassigned)`,
      playerIds: unbatched.map(p => p.playerId),
      players:   unbatched.map(p => ({
        playerId:   p.playerId,
        playerName: p.playerName || p.name || '',
      })),
    }];
  }, [batches, players]);

  // Build per-player session info from available app data (no browser CORS call to session-card API)
  const fetchPlayerCardInfo = useCallback(async (playerIds) => {
    setCardInfoLoading(true);
    const map = new Map();
    const contextMap = new Map();

    allRecords.forEach((record) => {
      const playerId = String(record.playerId || '').trim();
      const sessionNumber = Number(record.sessionNumber);
      if (!playerId || !Number.isFinite(sessionNumber) || sessionNumber <= 0) return;

      const status = String(record.attendanceStatus || '').trim();
      const current = contextMap.get(playerId) || { inProgress: null, lastCompleted: null };
      if (status === '') {
        if (current.inProgress == null || sessionNumber > current.inProgress) current.inProgress = sessionNumber;
      } else if (current.lastCompleted == null || sessionNumber > current.lastCompleted) {
        current.lastCompleted = sessionNumber;
      }
      contextMap.set(playerId, current);
    });

    playerIds.forEach((pid) => {
      const player = players.find(p => String(p.playerId) === String(pid));
      const cardCount = Array.isArray(player?.sessionCardIds) ? player.sessionCardIds.length : 0;
      const context = contextMap.get(String(pid));

      let sessionNumber = null;
      let status = '';

      // Prefer last completed session for auto number.
      if (context?.lastCompleted != null && Number.isFinite(context.lastCompleted) && context.lastCompleted > 0) {
        sessionNumber = Number(context.lastCompleted);
        status = 'completed';
      } else if (context?.inProgress != null && Number.isFinite(context.inProgress) && context.inProgress > 0) {
        sessionNumber = Number(context.inProgress);
        status = 'in_progress';
      } else if (cardCount > 0) {
        // Fallback when attendance history is not available yet.
        sessionNumber = cardCount;
      }

      if (sessionNumber != null) {
        map.set(String(pid), { sessionNumber, status });
      }
    });

    setPlayerCardInfo(map);
    setCardInfoLoading(false);
  }, [players, allRecords]);

  // Fetch card info whenever the selected batch changes
  useEffect(() => {
    if (!selectedBatchId || activeTab !== 'batch') {
      setPlayerCardInfo(new Map());
      setPlayerSessionOverrides({});
      setEditingSessionPlayer(null);
      setBulkOverrideStatus('');
      return;
    }
    const batch = displayBatches.find(b => b.batchId === selectedBatchId);
    if (!batch?.playerIds?.length) { setPlayerCardInfo(new Map()); return; }
    fetchPlayerCardInfo(batch.playerIds);
  }, [selectedBatchId, activeTab, displayBatches, fetchPlayerCardInfo]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadBatches(), loadAllRecords(), fetchPlayers()]);
      } catch {
        toast('Failed to load data', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchPlayers, loadAllRecords, loadBatches, toast]);

  useEffect(() => {
    if (!selectedBatchId || activeTab !== 'batch') { setBatchRecords([]); setEdits({}); return; }
    const ctrl = new AbortController();
    setBatchLoading(true);
    (async () => {
      try {
        setEdits({});
        await loadBatchRecords(selectedBatchId, batchDate, ctrl.signal);
      } catch (err) {
        if (err.name !== 'CanceledError') toast('Failed to load attendance', 'error');
      } finally {
        setBatchLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [selectedBatchId, activeTab, batchDate, loadBatchRecords, toast]);

  useEffect(() => {
    if (!selectedPlayerId || activeTab !== 'player') { setPlayerRecords([]); setPlayerEdits({}); return; }
    const ctrl = new AbortController();
    (async () => {
      try {
        await loadPlayerRecords(selectedPlayerId, ctrl.signal, true);
        setPlayerEdits({});
      } catch (err) {
        if (err.name !== 'CanceledError') toast('Failed to load player attendance', 'error');
      }
    })();
    return () => ctrl.abort();
  }, [selectedPlayerId, activeTab, loadPlayerRecords, toast]);

  const calendarFilteredRecords = useMemo(() => {
    if (!calendarPlayerId) return allRecords;
    return allRecords.filter(r => String(r.playerId || '') === String(calendarPlayerId));
  }, [allRecords, calendarPlayerId]);

  const recordsByDate = useMemo(() => {
    const map = {};
    calendarFilteredRecords.forEach(r => {
      const key = r.sessionDate || (r.markedAt ? String(r.markedAt).split('T')[0].split(' ')[0] : null);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [calendarFilteredRecords]);

  function dotColor(dateStr) {
    const recs = recordsByDate[dateStr];
    if (!recs?.length) return null;
    const s = recs.map(r => r.attendanceStatus);
    if (s.every(v => v === 'Present'))  return '#16a34a';
    if (s.some(v => v === 'Absent'))    return '#dc2626';
    if (s.every(v => v === ''))         return '#2563eb';
    return '#d97706';
  }

  const calendarDays = useMemo(() => {
    const { month, year } = navMonth;
    const first  = new Date(year, month, 1);
    const offset = first.getDay() === 0 ? 6 : first.getDay() - 1;
    const start  = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [navMonth]);

  const selectedDateBatches = useMemo(() => {
    const dateStr = toDateStr(selectedDate);
    const recs    = recordsByDate[dateStr] || [];
    const byBatch = {};
    recs.forEach(r => {
      if (!byBatch[r.batchId]) {
        byBatch[r.batchId] = { batchId: r.batchId, batchName: r.batchName, players: [] };
      }
      byBatch[r.batchId].players.push(r);
    });
    return Object.values(byBatch);
  }, [recordsByDate, selectedDate]);

  const playerSessionContextMap = useMemo(() => {
    const map = new Map();
    allRecords.forEach(record => {
      const playerId     = String(record.playerId || '').trim();
      const sessionNumber = Number(record.sessionNumber);
      if (!playerId || !Number.isFinite(sessionNumber) || sessionNumber <= 0) return;
      const status  = String(record.attendanceStatus || '').trim();
      const current = map.get(playerId) || { inProgress: null, lastCompleted: null };
      if (status === '') {
        if (current.inProgress == null || sessionNumber > current.inProgress) current.inProgress = sessionNumber;
      } else if (current.lastCompleted == null || sessionNumber > current.lastCompleted) {
        current.lastCompleted = sessionNumber;
      }
      map.set(playerId, current);
    });
    return map;
  }, [allRecords]);

  const batchDisplayRows = useMemo(() => {
    const batch = displayBatches.find(b => b.batchId === selectedBatchId);

    const resolveSessionNumber = (playerId, existingNumber = null) => {
      // 1. already-stored attendance record number
      if (existingNumber != null && Number(existingNumber) > 0) return Number(existingNumber);
      // 2. admin manual override via Change button
      const override = playerSessionOverrides[String(playerId)];
      if (override != null && Number.isFinite(override) && override > 0) return override;
      // 3. last session card fetched from API
      const cardInfo = playerCardInfo.get(String(playerId));
      if (cardInfo?.sessionNumber != null && Number.isFinite(cardInfo.sessionNumber) && cardInfo.sessionNumber > 0) {
        return cardInfo.sessionNumber;
      }
      // 4. fallback: attendance history context
      const context = playerSessionContextMap.get(String(playerId));
      if (context?.inProgress != null && Number.isFinite(context.inProgress) && context.inProgress > 0) return context.inProgress;
      if (context?.lastCompleted != null && Number.isFinite(context.lastCompleted) && context.lastCompleted > 0) return context.lastCompleted;
      return null;
    };

    const recordsByPlayer = new Map(
      batchRecords.map(r => [
        makeRecordKey(r.playerId, selectedBatchId, batchDate),
        {
          ...r,
          key:              makeRecordKey(r.playerId, selectedBatchId, batchDate),
          batchId:          selectedBatchId,
          sessionDate:      batchDate,
          sessionNumber:    resolveSessionNumber(r.playerId, r.sessionNumber),
          attendanceStatus: r.attendanceStatus || '',
          notes:            r.notes || '',
        },
      ])
    );

    const consumed  = new Set();
    const playerRows = (batch?.players || []).map(p => {
      const key      = makeRecordKey(p.playerId, selectedBatchId, batchDate);
      const existing = recordsByPlayer.get(key);
      consumed.add(key);
      if (existing) return existing;
      return {
        key,
        playerId:         p.playerId,
        playerName:       p.playerName,
        batchId:          selectedBatchId,
        batchName:        batch?.batchName || '',
        sessionNumber:    resolveSessionNumber(p.playerId),
        sessionDate:      batchDate,
        attendanceStatus: '',
        notes:            '',
      };
    });

    const historicalRows = Array.from(recordsByPlayer.entries())
      .filter(([key]) => !consumed.has(key))
      .map(([, row]) => row);

    const base = [...playerRows, ...historicalRows];
    return base.map(r => ({
      ...r,
      ...(edits[r.key] || {}),
      sessionNumber: edits[r.key]?.sessionNumber ?? r.sessionNumber,
    }));
  }, [batchRecords, edits, displayBatches, selectedBatchId, batchDate, playerCardInfo, playerSessionOverrides, playerSessionContextMap]);

  const batchStats = useMemo(() => ({
    total:      batchDisplayRows.length,
    present:    batchDisplayRows.filter(r => r.attendanceStatus === 'Present').length,
    absent:     batchDisplayRows.filter(r => r.attendanceStatus === 'Absent').length,
    late:       batchDisplayRows.filter(r => r.attendanceStatus === 'Late').length,
    excused:    batchDisplayRows.filter(r => r.attendanceStatus === 'Excused').length,
    inProgress: batchDisplayRows.filter(r => r.attendanceStatus === '').length,
  }), [batchDisplayRows]);

  function handleEdit(key, field, value) {
    setEdits(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
  }

  function handleBulkOverrideChange(value) {
    setBulkOverrideStatus(value);
    if (!batchDisplayRows.length) return;

    setEdits(prev => {
      const next = { ...prev };
      batchDisplayRows.forEach((row) => {
        next[row.key] = {
          ...(next[row.key] || {}),
          attendanceStatus: value,
        };
      });
      return next;
    });
  }

  async function handleSave() {
    if (!CL_MARK_ATTENDANCE_URL) { toast('API URL not configured', 'error'); return; }
    if (!selectedBatchId) { toast('Select a batch first', 'error'); return; }
    const changedKeys = Object.keys(edits);
    if (changedKeys.length === 0) { toast('No changes to save'); return; }
    setSaving(true);
    try {
      await Promise.all(changedKeys.map(key => {
        const row = batchDisplayRows.find(r => r.key === key);
        if (!row) return Promise.resolve();
        const sessionNumber = row.sessionNumber ?? null;
        return axios.post(CL_MARK_ATTENDANCE_URL, {
          playerId: row.playerId, playerName: row.playerName,
          batchId: row.batchId, batchName: row.batchName,
          sessionNumber, sessionDate: row.sessionDate || batchDate,
          attendanceStatus: row.attendanceStatus, notes: row.notes,
        }, { headers });
      }));
      setEdits({});
      await Promise.all([loadBatchRecords(selectedBatchId, batchDate), loadAllRecords()]);
      toast(`Saved ${changedKeys.length} record(s)`);
    } catch {
      toast('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleCompleteSession() {
    if (!selectedBatchId) return;
    if (!CL_MARK_ATTENDANCE_URL) { toast('API URL not configured', 'error'); return; }
    const activeBatch = displayBatches.find(b => b.batchId === selectedBatchId);
    if (!activeBatch) { toast('Selected batch not found', 'error'); return; }
    setCompleting(true);
    try {
      const payload = {
        batchId: selectedBatchId, batchName: activeBatch.batchName,
        sessionDate: batchDate,
        sessionNumber: batchDisplayRows[0]?.sessionNumber ?? null,
        bulkStatus: 'Present',
      };
      if (selectedBatchId === 'general') payload.playerIds = activeBatch.playerIds || [];
      await axios.post(CL_MARK_ATTENDANCE_URL, payload, { headers });
      setEdits({});
      await Promise.all([loadBatchRecords(selectedBatchId, batchDate), loadAllRecords()]);
      toast('All players marked Present');
    } catch {
      toast('Failed to complete session', 'error');
    } finally {
      setCompleting(false);
    }
  }

  function playerRecordKey(record) {
    return record.attendanceId || makeRecordKey(record.playerId, record.batchId, record.sessionDate);
  }

  function handlePlayerEdit(key, field, value) {
    setPlayerEdits(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
  }

  async function handleSavePlayerOverrides() {
    const changedKeys = Object.keys(playerEdits);
    if (!selectedPlayerId) { toast('Select a player first', 'error'); return; }
    if (changedKeys.length === 0) { toast('No player record changes to save'); return; }
    if (!CL_MARK_ATTENDANCE_URL) { toast('API URL not configured', 'error'); return; }
    setPlayerSaving(true);
    try {
      const rowsByKey = new Map(playerDisplayRecords.map(r => [r.rowKey, r]));
      await Promise.all(changedKeys.map(key => {
        const row = rowsByKey.get(key);
        if (!row) return Promise.resolve();
        return axios.post(CL_MARK_ATTENDANCE_URL, {
          playerId: row.playerId, playerName: row.playerName,
          batchId: row.batchId || '', batchName: row.batchName || '',
          sessionNumber: row.sessionNumber ?? null, sessionDate: row.sessionDate,
          attendanceStatus: row.attendanceStatus, notes: row.notes || '',
          source: 'manual_override',
        }, { headers });
      }));
      setPlayerEdits({});
      await Promise.all([loadPlayerRecords(selectedPlayerId), loadAllRecords()]);
      toast(`Updated ${changedKeys.length} player attendance record(s)`);
    } catch {
      toast('Failed to update player attendance', 'error');
    } finally {
      setPlayerSaving(false);
    }
  }

  function confirmSessionOverride(playerId) {
    const val = parseInt(editingSessionValue, 10);
    if (!Number.isFinite(val) || val <= 0) { toast('Enter a valid session number', 'error'); return; }
    setPlayerSessionOverrides(prev => ({ ...prev, [String(playerId)]: val }));
    setEditingSessionPlayer(null);
  }

  const today                   = toDateStr(new Date());
  const selectedDateStr         = toDateStr(selectedDate);
  const selectedBatch           = displayBatches.find(b => b.batchId === selectedBatchId);
  const calendarSelectedPlayer  = players.find(p => String(p.playerId) === String(calendarPlayerId));
  const selectedPlayer          = players.find(p => p.playerId === selectedPlayerId);

  const playerDisplayRecords = useMemo(() => {
    return playerRecords.map(record => {
      const rowKey = playerRecordKey(record);
      return { ...record, ...(playerEdits[rowKey] || {}), rowKey };
    });
  }, [playerRecords, playerEdits]);

  const hasPlayerEdits = Object.keys(playerEdits).length > 0;
  const hasEdits       = Object.keys(edits).length > 0;
  const fmtSelected    = `${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

  /* shared input / select styles */
  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    border: '1.5px solid #e5e7eb', fontSize: '14px', color: '#111827',
    outline: 'none', background: 'white', cursor: 'pointer',
  };
  const selectWrapperStyle = {
    position: 'relative',
  };
  const chevronStyle = {
    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
    color: '#9ca3af', pointerEvents: 'none',
  };

  const TABS = [
    { key: 'calendar', label: 'Calendar View', Icon: Calendar },
    { key: 'batch',    label: 'Batch View',    Icon: BarChart2 },
    { key: 'player',   label: 'Player View',   Icon: User },
  ];

  const STATS_CONFIG = [
    { label: 'Total',       key: 'total',      color: '#374151', borderColor: '#e5e7eb' },
    { label: 'Present',     key: 'present',    color: '#16a34a', borderColor: '#16a34a' },
    { label: 'Absent',      key: 'absent',     color: '#dc2626', borderColor: '#dc2626' },
    { label: 'Late',        key: 'late',       color: '#d97706', borderColor: '#d97706' },
    { label: 'Excused',     key: 'excused',    color: '#7c3aed', borderColor: '#7c3aed' },
    { label: 'In Progress', key: 'inProgress', color: '#2563eb', borderColor: '#2563eb' },
  ];

  return (
    <Layout>
      <SkeletonLoaderStyles />
      {toastMsg && (
        <Toast message={toastMsg} type={toastType} duration={3000} onClose={() => setToastMsg('')} />
      )}

      <div style={{ padding: 'clamp(16px, 3vw, 28px)', maxWidth: '1200px', margin: '0 auto' }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '16px', marginBottom: '28px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: `linear-gradient(135deg, ${BRAND}, #000)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <CalendarCheck size={22} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: 'clamp(18px,3vw,24px)', fontWeight: 700, color: '#111827', margin: 0 }}>
                Attendance
              </h1>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: '3px 0 0' }}>
                Track and manage session attendance by batch
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowInstructionModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 16px', borderRadius: '10px', border: '1.5px solid #d1d5db',
                background: 'white', color: '#374151', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = BRAND; e.currentTarget.style.color = BRAND; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#374151'; }}
            >
              <CircleHelp size={16} /> Instructions
            </button>

            <button
              onClick={() => navigate('/admin/manage-batches')}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 20px', borderRadius: '10px', border: 'none',
                background: `linear-gradient(135deg, ${BRAND}, #000)`,
                color: 'white', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(6,0,48,0.25)',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <Layers size={16} /> Manage Batches
            </button>
          </div>
        </div>

        {/* ── Tab bar ────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: '4px', background: '#f3f4f6',
          padding: '4px', borderRadius: '12px', marginBottom: '24px', width: 'fit-content',
        }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 20px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 600, transition: 'all 0.2s',
                  background: active ? 'white' : 'transparent',
                  color: active ? BRAND : '#6b7280',
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <tab.Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Initial skeleton or content ────────────────────────────── */}
        {loading ? (
          <AttendanceSkeleton />
        ) : (
          <>

            {/* ══════════════ CALENDAR TAB ══════════════ */}
            {activeTab === 'calendar' && (
              <>
                {/* Filter bar */}
                <div style={{
                  background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb',
                  padding: '14px 18px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'flex-end', gap: '14px', flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '220px', maxWidth: '320px', flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Filter by Player</label>
                    <div style={selectWrapperStyle}>
                      <select
                        value={calendarPlayerId}
                        onChange={e => setCalendarPlayerId(e.target.value)}
                        style={{ ...inputStyle, paddingRight: '36px', appearance: 'none' }}
                        onFocus={e => { e.target.style.borderColor = BRAND; e.target.style.boxShadow = '0 0 0 3px rgba(6,0,48,0.1)'; }}
                        onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                      >
                        <option value="">All Players</option>
                        {players.map(p => (
                          <option key={p.playerId} value={p.playerId}>{p.playerName || p.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} style={chevronStyle} />
                    </div>
                  </div>

                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 14px', borderRadius: '8px', background: '#f9fafb', border: '1px solid #e5e7eb',
                  }}>
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Viewing:</span>
                    <span style={{ fontSize: '13px', color: '#111827', fontWeight: 700 }}>
                      {calendarSelectedPlayer
                        ? (calendarSelectedPlayer.playerName || calendarSelectedPlayer.name)
                        : 'All Players'}
                    </span>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(280px, 390px) minmax(0, 1fr)',
                  gap: '20px', alignItems: 'start',
                }}>

                  {/* Calendar card */}
                  <div style={{
                    background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb',
                    overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}>
                    {/* Month nav */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px 20px',
                      background: `linear-gradient(135deg, ${BRAND}08, ${BRAND}04)`,
                      borderBottom: '1px solid #f3f4f6',
                    }}>
                      <button
                        onClick={() => setNavMonth(m => {
                          const d = new Date(m.year, m.month - 1, 1);
                          return { month: d.getMonth(), year: d.getFullYear() };
                        })}
                        style={{
                          width: '34px', height: '34px', borderRadius: '9px',
                          border: '1px solid #e5e7eb', background: 'white',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      >
                        <ChevronLeft size={15} />
                      </button>

                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontWeight: 800, fontSize: '17px', color: '#111827', margin: 0 }}>
                          {MONTHS[navMonth.month]}
                        </p>
                        <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0, fontWeight: 500 }}>
                          {navMonth.year}
                        </p>
                      </div>

                      <button
                        onClick={() => setNavMonth(m => {
                          const d = new Date(m.year, m.month + 1, 1);
                          return { month: d.getMonth(), year: d.getFullYear() };
                        })}
                        style={{
                          width: '34px', height: '34px', borderRadius: '9px',
                          border: '1px solid #e5e7eb', background: 'white',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>

                    {/* Day headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '10px 12px 4px' }}>
                      {DAYS.map(d => (
                        <div key={d} style={{
                          textAlign: 'center', fontSize: '10px', fontWeight: 700,
                          color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>{d}</div>
                      ))}
                    </div>

                    {/* Date cells */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '4px 12px 16px', gap: '3px' }}>
                      {calendarDays.map((date, idx) => {
                        const dStr      = toDateStr(date);
                        const inMonth   = date.getMonth() === navMonth.month;
                        const isToday   = dStr === today;
                        const isSel     = dStr === selectedDateStr;
                        const color     = dotColor(dStr);
                        const hasRecs   = !!color;

                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedDate(new Date(date))}
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center',
                              justifyContent: 'center', gap: '3px',
                              padding: '8px 2px', borderRadius: '10px', border: 'none',
                              cursor: 'pointer', transition: 'background 0.15s',
                              background: isSel
                                ? BRAND
                                : isToday
                                ? '#eff6ff'
                                : 'transparent',
                            }}
                            onMouseEnter={e => !isSel && (e.currentTarget.style.background = '#f3f4f6')}
                            onMouseLeave={e => !isSel && (e.currentTarget.style.background = isToday ? '#eff6ff' : 'transparent')}
                          >
                            <span style={{
                              fontSize: '13px', lineHeight: 1,
                              fontWeight: isSel || isToday ? 700 : 400,
                              color: isSel ? 'white' : !inMonth ? '#d1d5db' : isToday ? '#2563eb' : '#374151',
                            }}>
                              {date.getDate()}
                            </span>
                            <span style={{
                              width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0,
                              background: hasRecs ? (isSel ? 'rgba(255,255,255,0.85)' : color) : 'transparent',
                            }} />
                          </button>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div style={{
                      padding: '10px 16px 14px', borderTop: '1px solid #f3f4f6',
                      display: 'flex', flexWrap: 'wrap', gap: '10px',
                    }}>
                      {[
                        { color: '#16a34a', label: 'All Present' },
                        { color: '#dc2626', label: 'Has Absent' },
                        { color: '#d97706', label: 'Mixed' },
                        { color: '#2563eb', label: 'In Progress' },
                      ].map(l => (
                        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>{l.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Date detail panel */}
                  <div style={{
                    background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb',
                    overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}>
                    <div style={{
                      padding: '16px 20px', borderBottom: '1px solid #f3f4f6',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      flexWrap: 'wrap', gap: '8px',
                      background: `linear-gradient(135deg, ${BRAND}08, ${BRAND}04)`,
                    }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>
                          Selected Date
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: '22px', fontWeight: 800, color: '#111827' }}>
                          {fmtSelected}
                        </p>
                      </div>
                      {selectedDateBatches.length > 0 && (
                        <span style={{
                          padding: '5px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 700,
                          background: `${BRAND}12`, color: BRAND, border: `1px solid ${BRAND}30`,
                        }}>
                          {selectedDateBatches.reduce((n, b) => n + b.players.length, 0)} records
                        </span>
                      )}
                    </div>

                    {selectedDateBatches.length === 0 ? (
                      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                        <div style={{
                          width: '64px', height: '64px', borderRadius: '16px',
                          background: '#f3f4f6', margin: '0 auto 16px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <CalendarCheck size={28} color="#d1d5db" />
                        </div>
                        <p style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px', color: '#374151' }}>
                          No sessions on {fmtSelected}
                        </p>
                        <p style={{ fontSize: '13px', margin: 0, color: '#9ca3af' }}>
                          {calendarSelectedPlayer
                            ? `No records for ${calendarSelectedPlayer.playerName || calendarSelectedPlayer.name}`
                            : 'Marked attendance will appear here'}
                        </p>
                      </div>
                    ) : (
                      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '500px', overflowY: 'auto' }}>
                        {selectedDateBatches.map(batch => (
                          <div key={batch.batchId}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                              <span style={{
                                fontSize: '11px', fontWeight: 700, color: BRAND,
                                textTransform: 'uppercase', letterSpacing: '0.6px',
                              }}>
                                {batch.batchName}
                              </span>
                              <span style={{
                                fontSize: '11px', padding: '2px 8px', borderRadius: '999px',
                                background: '#f3f4f6', color: '#6b7280', fontWeight: 600,
                              }}>
                                {batch.players.length} players
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {batch.players.map(p => (
                                <div
                                  key={p.attendanceId || p.playerId}
                                  style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 14px', borderRadius: '10px',
                                    background: '#f9fafb', border: '1px solid #f3f4f6',
                                    transition: 'border-color 0.15s',
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                                  onMouseLeave={e => e.currentTarget.style.borderColor = '#f3f4f6'}
                                >
                                  <div>
                                    <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: '#111827' }}>
                                      {p.playerName}
                                    </p>
                                    {p.notes && (
                                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
                                        {p.notes}
                                      </p>
                                    )}
                                  </div>
                                  <StatusBadge status={p.attendanceStatus} />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ══════════════ BATCH VIEW TAB ══════════════ */}
            {activeTab === 'batch' && (
              <>
                {/* Controls */}
                <div style={{
                  background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb',
                  padding: '18px 20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '180px', maxWidth: '280px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Batch</label>
                    <div style={selectWrapperStyle}>
                      <select
                        value={selectedBatchId}
                        onChange={e => { setSelectedBatchId(e.target.value); setEdits({}); setPlayerSessionOverrides({}); setEditingSessionPlayer(null); setBulkOverrideStatus(''); }}
                        style={{ ...inputStyle, paddingRight: '36px', appearance: 'none' }}
                        onFocus={e => { e.target.style.borderColor = BRAND; e.target.style.boxShadow = '0 0 0 3px rgba(6,0,48,0.1)'; }}
                        onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                      >
                        <option value="">- Choose a batch -</option>
                        {displayBatches.map(b => (
                          <option key={b.batchId} value={b.batchId}>
                            {b.batchName} ({b.players?.length || 0})
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} style={chevronStyle} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '150px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Session Date</label>
                    <input
                      type="date"
                      value={batchDate}
                      max={today}
                      onChange={e => {
                        const nextDate = e.target.value;
                        const safeDate = nextDate > today ? today : nextDate;
                        setBatchDate(safeDate);
                        setEdits({});
                      }}
                      style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = BRAND; e.target.style.boxShadow = '0 0 0 3px rgba(6,0,48,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>

                </div>

                {/* Stats */}
                {selectedBatchId && (
                  batchLoading ? (
                    <SkeletonStats count={6} />
                  ) : (
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                      gap: '12px', marginBottom: '20px',
                    }}>
                      {STATS_CONFIG.map(s => (
                        <div key={s.label} style={{
                          background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb',
                          borderLeft: `3px solid ${s.borderColor}`, padding: '14px 16px', textAlign: 'center',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        }}>
                          <p style={{ fontSize: '26px', fontWeight: 800, color: s.color, margin: '0 0 2px', lineHeight: 1 }}>
                            {batchStats[s.key]}
                          </p>
                          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, fontWeight: 500 }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Attendance table */}
                <div style={{
                  background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb',
                  overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                  {selectedBatchId && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 20px', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap', gap: '10px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart2 size={16} color={BRAND} />
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                          {selectedBatch?.batchName} - Attendance Sheet
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }}>Override All</span>
                          <select
                            value={bulkOverrideStatus}
                            onChange={(e) => handleBulkOverrideChange(e.target.value)}
                            disabled={batchDisplayRows.length === 0 || batchLoading}
                            style={{
                              ...inputStyle,
                              height: '36px',
                              minWidth: '128px',
                              fontSize: '13px',
                              background: 'white',
                              opacity: (batchDisplayRows.length === 0 || batchLoading) ? 0.6 : 1,
                              cursor: (batchDisplayRows.length === 0 || batchLoading) ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <option value="">In Progress</option>
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                            <option value="Late">Late</option>
                            <option value="Excused">Excused</option>
                          </select>
                        </div>
                        <button
                          onClick={handleCompleteSession}
                          disabled={completing || batchDisplayRows.length === 0 || batchLoading}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 16px', borderRadius: '8px', border: '1px solid #bbf7d0',
                            background: '#dcfce7', color: '#16a34a', fontWeight: 600, fontSize: '13px',
                            cursor: (completing || batchDisplayRows.length === 0 || batchLoading) ? 'not-allowed' : 'pointer',
                            opacity: completing ? 0.7 : 1,
                          }}
                          onMouseEnter={e => !completing && (e.currentTarget.style.background = '#bbf7d0')}
                          onMouseLeave={e => e.currentTarget.style.background = '#dcfce7'}
                        >
                          <CheckCircle size={15} />
                          {completing ? 'Completing…' : 'Complete Session'}
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving || !hasEdits}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 16px', borderRadius: '8px', border: 'none',
                            background: hasEdits ? `linear-gradient(135deg, ${BRAND}, #000)` : '#e5e7eb',
                            color: hasEdits ? 'white' : '#9ca3af',
                            fontWeight: 600, fontSize: '13px',
                            cursor: saving || !hasEdits ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.7 : 1,
                          }}
                        >
                          <Save size={15} />
                          {saving ? 'Saving…' : `Save${hasEdits ? ` (${Object.keys(edits).length})` : ''}`}
                        </button>
                      </div>
                    </div>
                  )}

                  {!selectedBatchId ? (
                    <div style={{ textAlign: 'center', padding: '80px 0' }}>
                      <div style={{
                        width: '72px', height: '72px', borderRadius: '18px',
                        background: '#f3f4f6', margin: '0 auto 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Users size={32} color="#d1d5db" />
                      </div>
                      <p style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px', color: '#374151' }}>
                        Select a batch to view attendance
                      </p>
                      <p style={{ fontSize: '13px', margin: 0, color: '#9ca3af' }}>
                        {displayBatches.length === 0
                          ? 'No batches yet - create one on the Manage Batches page.'
                          : 'Choose a batch from the dropdown above.'}
                      </p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                        <thead>
                          <tr style={{ background: '#f9fafb' }}>
                            {['Player Name', 'Session #', 'Attendance Status', 'Batch', 'Override', 'Notes'].map(h => (
                              <th key={h} style={{
                                padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700,
                                color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.6px',
                                borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap',
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {batchLoading ? (
                            <SkeletonTableRows cols={6} rows={5} />
                          ) : batchDisplayRows.length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ padding: '52px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                                No players in this batch
                              </td>
                            </tr>
                          ) : batchDisplayRows.map((row, idx) => {
                            const inProg = row.attendanceStatus === '';
                            const rowBg  = inProg ? '#f0f9ff' : idx % 2 === 0 ? 'white' : '#fafafa';
                            return (
                              <tr
                                key={row.key}
                                style={{ background: rowBg, borderBottom: '1px solid #f3f4f6' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                                onMouseLeave={e => e.currentTarget.style.background = rowBg}
                              >
                                <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: '14px', color: '#111827', whiteSpace: 'nowrap' }}>
                                  {row.playerName}
                                </td>
                                <td style={{ padding: '10px 16px', minWidth: '160px' }}>
                                  {editingSessionPlayer === row.playerId ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      <input
                                        type="number" min="1"
                                        value={editingSessionValue}
                                        onChange={e => setEditingSessionValue(e.target.value)}
                                        autoFocus
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') confirmSessionOverride(row.playerId);
                                          if (e.key === 'Escape') setEditingSessionPlayer(null);
                                        }}
                                        style={{
                                          width: '64px', padding: '4px 8px', borderRadius: '6px',
                                          border: `1.5px solid ${BRAND}`, fontSize: '13px', outline: 'none',
                                        }}
                                      />
                                      <button
                                        onClick={() => confirmSessionOverride(row.playerId)}
                                        title="Confirm"
                                        style={{
                                          width: '26px', height: '26px', borderRadius: '6px', border: 'none',
                                          background: '#dcfce7', color: '#16a34a', cursor: 'pointer',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700,
                                        }}
                                      >✓</button>
                                      <button
                                        onClick={() => setEditingSessionPlayer(null)}
                                        title="Cancel"
                                        style={{
                                          width: '26px', height: '26px', borderRadius: '6px', border: 'none',
                                          background: '#fee2e2', color: '#dc2626', cursor: 'pointer',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700,
                                        }}
                                      >✕</button>
                                    </div>
                                  ) : (() => {
                                    const cardInfo = playerCardInfo.get(String(row.playerId));
                                    const norm = String(cardInfo?.status || '').toLowerCase().replace(/[\s_-]/g, '');
                                    const isCompleted  = norm === 'completed';
                                    const isInProgress = ['inprogress', 'upcoming', 'draft'].includes(norm);
                                    return (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>
                                            {cardInfoLoading
                                              ? <span style={{ display: 'inline-block', width: '40px', height: '14px', borderRadius: '3px', background: 'rgba(200,200,200,0.4)', animation: 'pulse 2s ease-in-out infinite' }} />
                                              : row.sessionNumber != null ? `# ${row.sessionNumber}` : '-'
                                            }
                                          </span>
                                          {!cardInfoLoading && cardInfo && (
                                            isCompleted ? (
                                              <span style={{
                                                fontSize: '10px', padding: '1px 7px', borderRadius: '999px',
                                                background: '#dcfce7', color: '#16a34a', fontWeight: 700,
                                                border: '1px solid #bbf7d0', whiteSpace: 'nowrap',
                                              }}>Completed</span>
                                            ) : isInProgress ? (
                                              <span style={{
                                                fontSize: '10px', padding: '1px 7px', borderRadius: '999px',
                                                background: '#eff6ff', color: '#2563eb', fontWeight: 700,
                                                border: '1px solid #bfdbfe', whiteSpace: 'nowrap',
                                              }}>In Progress</span>
                                            ) : null
                                          )}
                                        </div>
                                        <button
                                          onClick={() => { setEditingSessionPlayer(row.playerId); setEditingSessionValue(String(row.sessionNumber || '')); }}
                                          title="Session number incorrect? Click to update"
                                          style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '3px',
                                            padding: '2px 7px', borderRadius: '4px',
                                            border: '1px solid #e5e7eb', background: '#f9fafb',
                                            color: '#6b7280', fontSize: '10px', fontWeight: 500,
                                            cursor: 'pointer', width: 'fit-content',
                                          }}
                                          onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#374151'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                                          onMouseLeave={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                                        >
                                          ✎ Change
                                        </button>
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  <StatusBadge status={row.attendanceStatus} />
                                </td>
                                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                                  {row.batchName}
                                </td>
                                <td style={{ padding: '8px 16px' }}>
                                  <select
                                    value={edits[row.key]?.attendanceStatus ?? row.attendanceStatus}
                                    onChange={e => handleEdit(row.key, 'attendanceStatus', e.target.value)}
                                    style={{
                                      padding: '6px 10px', borderRadius: '7px', border: '1.5px solid #e5e7eb',
                                      fontSize: '13px', color: '#111827', outline: 'none',
                                      background: 'white', cursor: 'pointer', minWidth: '130px',
                                    }}
                                    onFocus={e => { e.target.style.borderColor = BRAND; }}
                                    onBlur={e => { e.target.style.borderColor = '#e5e7eb'; }}
                                  >
                                    <option value="">In Progress</option>
                                    <option value="Present">Present</option>
                                    <option value="Absent">Absent</option>
                                    <option value="Late">Late</option>
                                    <option value="Excused">Excused</option>
                                  </select>
                                </td>
                                <td style={{ padding: '8px 16px' }}>
                                  <input
                                    type="text"
                                    value={edits[row.key]?.notes ?? row.notes}
                                    onChange={e => handleEdit(row.key, 'notes', e.target.value)}
                                    placeholder="Add note…"
                                    style={{
                                      padding: '6px 10px', borderRadius: '7px', border: '1.5px solid #e5e7eb',
                                      fontSize: '13px', color: '#111827', outline: 'none',
                                      width: '160px', background: 'white',
                                    }}
                                    onFocus={e => { e.target.style.borderColor = BRAND; }}
                                    onBlur={e => { e.target.style.borderColor = '#e5e7eb'; }}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ══════════════ PLAYER VIEW TAB ══════════════ */}
            {activeTab === 'player' && (
              <>
                {/* Player selector */}
                <div style={{
                  background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb',
                  padding: '16px 20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
                }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>
                    Select Player
                  </label>
                  <div style={{ ...selectWrapperStyle, flex: 1, minWidth: '200px', maxWidth: '340px' }}>
                    <select
                      value={selectedPlayerId}
                      onChange={e => setSelectedPlayerId(e.target.value)}
                      style={{ ...inputStyle, paddingRight: '36px', appearance: 'none' }}
                      onFocus={e => { e.target.style.borderColor = BRAND; e.target.style.boxShadow = '0 0 0 3px rgba(6,0,48,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                    >
                      <option value="">- Choose a player -</option>
                      {players.map(p => (
                        <option key={p.playerId} value={p.playerId}>{p.playerName || p.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} style={chevronStyle} />
                  </div>
                  {selectedPlayerId && !playerLoading && (
                    <span style={{
                      padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                      background: `${BRAND}12`, color: BRAND,
                    }}>
                      {playerDisplayRecords.length} record{playerDisplayRecords.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Player info card */}
                {selectedPlayerId && selectedPlayer && (
                  <div style={{
                    background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb',
                    marginBottom: '20px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}>
                    <div style={{
                      padding: '12px 16px',
                      background: `linear-gradient(135deg, ${BRAND}08, ${BRAND}04)`,
                      borderBottom: '1px solid #e5e7eb',
                      display: 'flex', alignItems: 'center', gap: '10px',
                    }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: `linear-gradient(135deg, ${BRAND}, #000)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <User size={16} color="white" />
                      </div>
                      <span style={{ fontWeight: 700, color: '#111827', fontSize: '15px' }}>
                        {selectedPlayer.playerName || selectedPlayer.name}
                      </span>
                    </div>
                    <div style={{
                      padding: '14px 16px',
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px',
                    }}>
                      {[
                        { label: 'Learning Pathway', value: selectedPlayer.LearningPathway || '-' },
                        { label: 'Status',           value: selectedPlayer.status || '-' },
                        { label: 'Total Points',     value: selectedPlayer.totalPoints ?? 0 },
                        { label: 'Point Balance',    value: selectedPlayer.PointBalance ?? 0 },
                      ].map(f => (
                        <div key={f.label}>
                          <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{f.label}</p>
                          <p style={{ margin: '3px 0 0', fontSize: '14px', color: '#111827', fontWeight: 600 }}>{f.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Player stats */}
                {selectedPlayerId && !playerLoading && playerDisplayRecords.length > 0 && (() => {
                  const counts = { Present: 0, Absent: 0, Late: 0, Excused: 0, '': 0 };
                  playerDisplayRecords.forEach(r => { counts[r.attendanceStatus] = (counts[r.attendanceStatus] || 0) + 1; });
                  return (
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                      gap: '12px', marginBottom: '20px',
                    }}>
                      {STATS_CONFIG.map(s => {
                        const val = s.key === 'total' ? playerDisplayRecords.length
                          : s.key === 'inProgress' ? (counts[''] || 0)
                          : counts[s.label] || 0;
                        return (
                          <div key={s.label} style={{
                            background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb',
                            borderLeft: `3px solid ${s.borderColor}`, padding: '14px 16px', textAlign: 'center',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          }}>
                            <p style={{ fontSize: '26px', fontWeight: 800, color: s.color, margin: '0 0 2px', lineHeight: 1 }}>{val}</p>
                            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, fontWeight: 500 }}>{s.label}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Attendance history table */}
                <div style={{
                  background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb',
                  overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                  {!selectedPlayerId ? (
                    <div style={{ textAlign: 'center', padding: '80px 0' }}>
                      <div style={{
                        width: '72px', height: '72px', borderRadius: '18px',
                        background: '#f3f4f6', margin: '0 auto 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <UserCheck size={32} color="#d1d5db" />
                      </div>
                      <p style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px', color: '#374151' }}>
                        Select a player to view attendance history
                      </p>
                      <p style={{ fontSize: '13px', margin: 0, color: '#9ca3af' }}>
                        Choose a player from the dropdown above
                      </p>
                    </div>
                  ) : (
                    <>
                      <div style={{
                        padding: '14px 20px', borderBottom: '1px solid #f3f4f6',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                        background: '#fafafa',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <UserCheck size={16} color={BRAND} />
                          <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                            {selectedPlayer?.playerName || selectedPlayer?.name || 'Player'} - Attendance History
                          </span>
                        </div>
                        <button
                          onClick={handleSavePlayerOverrides}
                          disabled={playerSaving || !hasPlayerEdits}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '7px 14px', borderRadius: '8px', border: 'none',
                            background: hasPlayerEdits ? `linear-gradient(135deg, ${BRAND}, #000)` : '#e5e7eb',
                            color: hasPlayerEdits ? 'white' : '#9ca3af',
                            fontWeight: 600, fontSize: '12px',
                            cursor: playerSaving || !hasPlayerEdits ? 'not-allowed' : 'pointer',
                            opacity: playerSaving ? 0.8 : 1,
                          }}
                        >
                          <Save size={14} />
                          {playerSaving ? 'Saving…' : `Save Overrides${hasPlayerEdits ? ` (${Object.keys(playerEdits).length})` : ''}`}
                        </button>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
                          <thead>
                            <tr style={{ background: '#f9fafb' }}>
                              {['Date', 'Session #', 'Batch', 'Status', 'Override', 'Source', 'Notes', 'Override Notes', 'Marked At'].map(h => (
                                <th key={h} style={{
                                  padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700,
                                  color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.6px',
                                  borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap',
                                }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {playerLoading ? (
                              <SkeletonTableRows cols={9} rows={5} />
                            ) : playerDisplayRecords.length === 0 ? (
                              <tr>
                                <td colSpan={9} style={{ padding: '52px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                                  No attendance records found for this player
                                </td>
                              </tr>
                            ) : playerDisplayRecords.map((r, idx) => (
                              <tr
                                key={r.rowKey}
                                style={{ background: idx % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f3f4f6' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#fafafa'}
                              >
                                <td style={{ padding: '11px 16px', fontSize: '14px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                                  {r.sessionDate || '-'}
                                </td>
                                <td style={{ padding: '11px 16px', fontSize: '14px', color: '#6b7280' }}>
                                  {r.sessionNumber != null
                                    ? <span style={{ fontWeight: 600, color: '#374151' }}># {r.sessionNumber}</span>
                                    : '-'}
                                </td>
                                <td style={{ padding: '11px 16px', fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                                  {r.batchName || <span style={{ color: '#d1d5db' }}>-</span>}
                                </td>
                                <td style={{ padding: '11px 16px' }}>
                                  <StatusBadge status={r.attendanceStatus} />
                                </td>
                                <td style={{ padding: '8px 16px' }}>
                                  <select
                                    value={r.attendanceStatus ?? ''}
                                    onChange={e => handlePlayerEdit(r.rowKey, 'attendanceStatus', e.target.value)}
                                    style={{
                                      padding: '6px 10px', borderRadius: '7px', border: '1.5px solid #e5e7eb',
                                      fontSize: '13px', color: '#111827', outline: 'none',
                                      background: 'white', cursor: 'pointer', minWidth: '130px',
                                    }}
                                    onFocus={e => { e.target.style.borderColor = BRAND; }}
                                    onBlur={e => { e.target.style.borderColor = '#e5e7eb'; }}
                                  >
                                    <option value="">In Progress</option>
                                    <option value="Present">Present</option>
                                    <option value="Absent">Absent</option>
                                    <option value="Late">Late</option>
                                    <option value="Excused">Excused</option>
                                  </select>
                                </td>
                                <td style={{ padding: '11px 16px' }}>
                                  {(() => {
                                    const src = String(r.source || '').toLowerCase();
                                    const isSession  = src.startsWith('session_');
                                    const isOverride = src === 'manual_override';
                                    return (
                                      <span style={{
                                        fontSize: '11px', padding: '3px 8px', borderRadius: '999px', fontWeight: 600,
                                        background: isSession ? '#ede9fe' : isOverride ? '#dbeafe' : '#f3f4f6',
                                        color: isSession ? '#7c3aed' : isOverride ? '#1d4ed8' : '#6b7280',
                                      }}>
                                        {isSession ? 'Session Card' : isOverride ? 'Override' : 'Manual'}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td style={{ padding: '11px 16px', fontSize: '13px', color: '#6b7280' }}>
                                  {r.notes || <span style={{ color: '#d1d5db' }}>-</span>}
                                </td>
                                <td style={{ padding: '8px 16px' }}>
                                  <input
                                    type="text"
                                    value={r.notes || ''}
                                    onChange={e => handlePlayerEdit(r.rowKey, 'notes', e.target.value)}
                                    placeholder="Add note…"
                                    style={{
                                      padding: '6px 10px', borderRadius: '7px', border: '1.5px solid #e5e7eb',
                                      fontSize: '13px', color: '#111827', outline: 'none',
                                      width: '160px', background: 'white',
                                    }}
                                    onFocus={e => { e.target.style.borderColor = BRAND; }}
                                    onBlur={e => { e.target.style.borderColor = '#e5e7eb'; }}
                                  />
                                </td>
                                <td style={{ padding: '11px 16px', fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                                  {r.markedAt ? String(r.markedAt).replace('T', ' ').slice(0, 16) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

          </>
        )}
      </div>

      <Modal
        isOpen={showInstructionModal}
        onClose={() => setShowInstructionModal(false)}
        title="How To Use Attendance Module"
      >
        <div style={{ padding: '22px 24px', minWidth: '320px', maxWidth: '640px' }}>
          <div style={{
            background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '10px',
            padding: '14px 16px', marginBottom: '14px'
          }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>
              Use this page to track attendance by date, batch, and player. Choose the tab based on your task.
            </p>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 700, color: '#111827' }}>1. Calendar View</p>
            <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#4b5563' }}>Use this to quickly check attendance records on any date.</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#4b5563' }}>Optional: filter by one player to see only that player timeline.</p>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 700, color: '#111827' }}>2. Batch View</p>
            <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#4b5563' }}>Select a batch and date, then set status and notes per player.</p>
            <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#4b5563' }}>Use Save Changes for selected edits, or Complete Session to mark whole batch present.</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#4b5563' }}>You can also remove players from the selected batch using Remove button.</p>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 700, color: '#111827' }}>3. Player View</p>
            <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#4b5563' }}>Select one player to review full attendance history.</p>
            <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#4b5563' }}>Override status/notes for historical records and click Save Overrides.</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#4b5563' }}>Source badge helps identify Manual, Override, and Session Card entries.</p>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 700, color: '#111827' }}>4. Manage Batches</p>
            <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#4b5563' }}>Open the Manage Batches page (top-right or sidebar) to create or edit batches.</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#4b5563' }}>In Existing Batch mode, choose a batch and current players will be auto-selected for easy update.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setShowInstructionModal(false)}
              style={{
                padding: '10px 16px', borderRadius: '8px', border: 'none',
                background: `linear-gradient(135deg, ${BRAND}, #000)`,
                color: 'white', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
              }}
            >
              Got It
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
