import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useStore } from '../../context/store';
import { useTheme } from '../../context/ThemeContext';
import { Layout } from '../../components/Layout';
import { Toast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import {
  Layers, ChevronLeft, Users, UserCheck, UserPlus, Trash2, X, Loader,
  Calendar, Clock, CheckCircle, Zap, Settings as SettingsIcon, CalendarCheck,
  Eye, Edit3, ChevronDown, AlertTriangle,
} from 'lucide-react';

const BRAND = '#060030ff';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CL_GET_BATCHES_URL     = 'https://ts6wti3133.execute-api.ap-south-1.amazonaws.com/default/CL_Get_Batches';
const CL_MANAGE_BATCH_URL    = 'https://rwl4dpqgu5.execute-api.ap-south-1.amazonaws.com/default/CL_Manage_Batch';
const VIEW_SESSIONCARD_URL   = 'https://kyfkhl8v4l.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_View_Sessioncard';
const DELETE_SESSIONCARD_URL = 'https://rmauptygg5.execute-api.ap-south-1.amazonaws.com/Coachlife-com/CL_Deleting_Sessioncard';
const CL_GET_ATTENDANCE_URL  = 'https://expqdxymlf.execute-api.ap-south-1.amazonaws.com/default/CL_Get_Attendance';
const CL_MARK_ATTENDANCE_URL = 'https://a5c8vbcbj4.execute-api.ap-south-1.amazonaws.com/default/CL_Mark_Attendance';

const normSt = (s) => (s || '').toLowerCase().replace(/[\s_]/g, '');
const statusColors = (status) => {
  const s = normSt(status);
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

function toDateStr(date) {
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const Sk = ({ w, h, r = 8 }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: '#EEF2F7', animation: 'skPulse 1.6s ease-in-out infinite', flexShrink: 0 }} />
);

const TABS = [
  { key: 'overview',   label: 'Overview',   Icon: Users },
  { key: 'sessions',   label: 'Sessions',   Icon: Zap },
  { key: 'attendance', label: 'Attendance', Icon: CalendarCheck },
  { key: 'settings',   label: 'Settings',   Icon: SettingsIcon },
];

/**
 * One page per batch - the answer to "how is Batch X doing?" in one place,
 * instead of stitched together across Manage Batches / Session Card
 * Management / Attendance. See change.md Phase 2.
 */
export default function BatchDetail() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { players, fetchPlayers, coaches, fetchCoaches, learningPathway, fetchLearningPathway, userToken } = useStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [toast, setToast] = useState(null);

  const headers = useMemo(() => ({ 'Content-Type': 'application/json', userToken }), [userToken]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadBatch = useCallback(async () => {
    const res = await axios.get(CL_GET_BATCHES_URL, { headers });
    let d = res.data;
    if (d?.body && typeof d.body === 'string') d = JSON.parse(d.body);
    const found = (d.batches || []).find(b => b.batchId === batchId);
    setBatch(found || null);
  }, [headers, batchId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadBatch(), fetchPlayers(), fetchCoaches(), fetchLearningPathway()])
      .catch(() => showToast('Failed to load batch', 'error'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  // Each player's real latest card (session #, date, status) - shared by the
  // Sessions and Attendance tabs so neither has to guess.
  const [cardInfo, setCardInfo] = useState({});
  const [cardInfoLoading, setCardInfoLoading] = useState(false);

  const fetchCardInfo = useCallback(async (playerIds) => {
    setCardInfoLoading(true);
    const map = {};
    await Promise.all(playerIds.map(async (pid) => {
      try {
        const res = await fetch(VIEW_SESSIONCARD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', userToken },
          body: JSON.stringify({ playerId: pid }),
        });
        if (!res.ok) { map[pid] = null; return; }
        const data = await res.json();
        const card = data.sessionCard || data.data || data;
        map[pid] = {
          session: card?.session ?? null,
          sessionDate: card?.sessionDate || null,
          status: card?.status || '',
          cardId: card?._id || null,
        };
      } catch {
        map[pid] = null;
      }
    }));
    setCardInfo(map);
    setCardInfoLoading(false);
  }, [userToken]);

  useEffect(() => {
    if (!batch?.players?.length) return;
    fetchCardInfo(batch.players.map(p => p.playerId));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch?.batchId]);

  if (loading) {
    return (
      <Layout>
        <style>{`@keyframes skPulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 32px' }}>
          <Sk w="100%" h="120px" r={20} />
          <div style={{ marginTop: '20px' }}><Sk w="100%" h="400px" r={16} /></div>
        </div>
      </Layout>
    );
  }

  if (!batch) {
    return (
      <Layout>
        <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center' }}>
          <Layers size={40} color="#CBD5E1" style={{ marginBottom: '12px' }} />
          <p style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>Batch not found</p>
          <button onClick={() => navigate('/admin/manage-batches')} style={{ marginTop: '12px', padding: '10px 20px', borderRadius: '8px', background: BRAND, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
            Back to Batches
          </button>
        </div>
      </Layout>
    );
  }

  const [c1, c2] = pal(batch.batchName);

  return (
    <Layout>
      <style>{`
        @keyframes skPulse{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
      {toast && <Toast type={toast.type} message={toast.message} duration={3000} onClose={() => setToast(null)} />}

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 32px 40px' }}>

        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
          borderRadius: '20px', padding: '24px 28px', marginBottom: '20px',
          boxShadow: `0 12px 36px ${c1}33`, color: '#fff',
        }}>
          <button
            onClick={() => navigate('/admin/manage-batches')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 13px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', marginBottom: '16px' }}
          >
            <ChevronLeft size={14} /> All Batches
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Layers size={24} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 4px' }}>{batch.batchName}</h1>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12.5px', opacity: 0.9 }}>
                <span>{batch.players?.length ?? 0} players</span>
                <span>·</span>
                <span>{batch.coaches?.length ?? 0} coaches</span>
                {batch.LearningPathway && <><span>·</span><span>{batch.LearningPathway}</span></>}
                {batch.days?.length > 0 && <><span>·</span><span><Calendar size={11} style={{ verticalAlign: 'middle' }} /> {batch.days.join(' ')}</span></>}
                {batch.startTime && <><span>·</span><span><Clock size={11} style={{ verticalAlign: 'middle' }} /> {batch.startTime}{batch.endTime ? `–${batch.endTime}` : ''}</span></>}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', padding: '4px', borderRadius: '12px', marginBottom: '20px', width: 'fit-content' }}>
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px',
                borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                background: active ? (dark ? BRAND : 'white') : 'transparent',
                color: active ? (dark ? '#fff' : BRAND) : (dark ? 'rgba(255,255,255,0.5)' : '#6b7280'),
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
              }}>
                <t.Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'overview' && (
          <OverviewTab
            batch={batch} coaches={coaches} headers={headers} players={players}
            cardInfo={cardInfo} cardInfoLoading={cardInfoLoading}
            reload={loadBatch} showToast={showToast} dark={dark}
          />
        )}
        {tab === 'sessions' && (
          <SessionsTab
            batch={batch} cardInfo={cardInfo} cardInfoLoading={cardInfoLoading}
            players={players} userToken={userToken} showToast={showToast}
            navigate={navigate} dark={dark}
          />
        )}
        {tab === 'attendance' && (
          <AttendanceTab
            batch={batch} cardInfo={cardInfo} headers={headers} userToken={userToken}
            showToast={showToast} dark={dark}
          />
        )}
        {tab === 'settings' && (
          <SettingsTab
            batch={batch} players={players} learningPathway={learningPathway} headers={headers}
            reload={loadBatch} showToast={showToast} navigate={navigate} dark={dark}
            onSaved={() => setTab('overview')}
          />
        )}
      </div>
    </Layout>
  );
}

/* ══════════════════════════ OVERVIEW TAB ══════════════════════════ */
function OverviewTab({ batch, coaches, headers, players, cardInfo, cardInfoLoading, reload, showToast, dark }) {
  const [coachToAssign, setCoachToAssign] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [removingCoachId, setRemovingCoachId] = useState('');
  const [removingPlayerId, setRemovingPlayerId] = useState('');

  const assignedCoachIds = (batch.coachIds || []).map(String);
  const availableCoaches = coaches.filter(c => !assignedCoachIds.includes(String(c.coachId || c._id)));

  const coachName = (coachId) => {
    const fromBatch = batch.coaches?.find(c => String(c.coachId) === String(coachId));
    if (fromBatch?.name) return fromBatch.name;
    const fromStore = coaches.find(c => String(c.coachId || c._id) === String(coachId));
    return fromStore?.name || 'Coach';
  };

  const handleAssignCoach = async () => {
    if (!coachToAssign) { showToast('Select a coach first', 'error'); return; }
    setAssigning(true);
    try {
      await axios.post(CL_MANAGE_BATCH_URL, { action: 'assign_coach', batchId: batch.batchId, coachId: coachToAssign }, { headers });
      setCoachToAssign('');
      await reload();
      showToast('Coach assigned');
    } catch { showToast('Failed to assign coach', 'error'); }
    finally { setAssigning(false); }
  };

  const handleRemoveCoach = async (coachId) => {
    setRemovingCoachId(coachId);
    try {
      await axios.post(CL_MANAGE_BATCH_URL, { action: 'remove_coach', batchId: batch.batchId, coachId }, { headers });
      await reload();
      showToast('Coach removed');
    } catch { showToast('Failed to remove coach', 'error'); }
    finally { setRemovingCoachId(''); }
  };

  const handleRemovePlayer = async (playerId) => {
    setRemovingPlayerId(playerId);
    try {
      await axios.post(CL_MANAGE_BATCH_URL, { action: 'remove_player', batchId: batch.batchId, playerId }, { headers });
      await reload();
      showToast('Player removed');
    } catch { showToast('Failed to remove player', 'error'); }
    finally { setRemovingPlayerId(''); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '20px', alignItems: 'start' }}>
      {/* Coaches */}
      <div style={{ background: dark ? 'var(--cl-surface)' : '#fff', border: `1.5px solid ${dark ? 'var(--cl-border)' : '#E2E8F0'}`, borderRadius: '16px', padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: dark ? 'var(--cl-text)' : '#111827', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCheck size={16} color={BRAND} /> Coaches
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
          {assignedCoachIds.length > 0 ? assignedCoachIds.map(cid => (
            <span key={cid} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 8px 6px 14px', borderRadius: '999px', background: '#EEF2FF', color: BRAND, fontSize: '13px', fontWeight: '600', border: '1px solid #C7D2FE' }}>
              {coachName(cid)}
              <button onClick={() => handleRemoveCoach(cid)} disabled={removingCoachId === cid} style={{ width: '20px', height: '20px', borderRadius: '50%', border: 'none', background: '#C7D2FE', color: BRAND, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {removingCoachId === cid ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={12} />}
              </button>
            </span>
          )) : <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>No coaches assigned yet</p>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select value={coachToAssign} onChange={e => setCoachToAssign(e.target.value)} style={{ flex: 1, padding: '9px 10px', borderRadius: '8px', border: '2px solid #E5E7EB', fontSize: '13px', background: 'white', cursor: 'pointer' }}>
            <option value="">Select a coach…</option>
            {availableCoaches.map(c => <option key={c.coachId || c._id} value={c.coachId || c._id}>{c.name}</option>)}
          </select>
          <button onClick={handleAssignCoach} disabled={!coachToAssign || assigning} style={{ padding: '9px 16px', background: (!coachToAssign || assigning) ? '#E5E7EB' : `linear-gradient(135deg, ${BRAND}, #000)`, color: (!coachToAssign || assigning) ? '#9CA3AF' : 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: (!coachToAssign || assigning) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {assigning ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={14} />} Assign
          </button>
        </div>
      </div>

      {/* Roster */}
      <div style={{ background: dark ? 'var(--cl-surface)' : '#fff', border: `1.5px solid ${dark ? 'var(--cl-border)' : '#E2E8F0'}`, borderRadius: '16px', padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: dark ? 'var(--cl-text)' : '#111827', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} color={BRAND} /> Players ({batch.players?.length ?? 0})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
          {(batch.players || []).map(p => {
            const info = cardInfo[p.playerId];
            const [avatar] = pal(p.playerName);
            const profile = (players || []).find(pl => String(pl.playerId) === String(p.playerId));
            const ownPathway = profile?.LearningPathway;
            const mismatch = batch.LearningPathway && ownPathway && ownPathway !== batch.LearningPathway;
            return (
              <div key={p.playerId} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: mismatch ? '#FFFBEB' : '#F9FAFB', border: `1px solid ${mismatch ? '#FDE68A' : '#E5E7EB'}`, borderRadius: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: avatar, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '13px', flexShrink: 0 }}>
                  {(p.playerName || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.playerName}</p>
                  {mismatch ? (
                    <p title={`Player pathway "${ownPathway}" ≠ batch pathway "${batch.LearningPathway}"`} style={{ fontSize: '11px', color: '#B45309', margin: '3px 0 0', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={11} /> Pathway mismatch: {ownPathway}
                    </p>
                  ) : cardInfoLoading && !info ? (
                    <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '2px 0 0' }}>Checking…</p>
                  ) : info ? (
                    <div style={{ marginTop: '3px' }}><StatusBadge status={info.status} size="sm" /> <span style={{ fontSize: '11px', color: '#6B7280', marginLeft: '4px' }}>Session {info.session}</span></div>
                  ) : (
                    <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '2px 0 0' }}>No card yet</p>
                  )}
                </div>
                <button onClick={() => handleRemovePlayer(p.playerId)} disabled={removingPlayerId === p.playerId} style={{ padding: '6px 12px', background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  {removingPlayerId === p.playerId ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <><X size={13} /> Remove</>}
                </button>
              </div>
            );
          })}
          {(batch.players?.length ?? 0) === 0 && <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>No players in this batch.</p>}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════ SESSIONS TAB ══════════════════════════ */
// Student-wise, expand/collapse. Click a player to reveal their full card history
// (grouped by pathway) with View / Edit / Delete - same as the Session Card "By
// Batch" workspace, kept in one place here.
function SessionsTab({ batch, cardInfo, cardInfoLoading, players, userToken, showToast, navigate, dark }) {
  const [allCards, setAllCards] = useState({});   // { [playerId]: [card, ...] }
  const [cardsLoading, setCardsLoading] = useState(true);
  const [expanded, setExpanded] = useState({});   // { [playerId]: bool }
  const [deleteCardId, setDeleteCardId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const border = dark ? 'var(--cl-border)' : '#E5E7EB';
  const textPrimary = dark ? 'var(--cl-text)' : '#111827';
  const textMuted = dark ? 'var(--cl-text-3)' : '#94A3B8';
  const surface2 = dark ? 'var(--cl-surface-2)' : '#F8FAFC';

  const fetchAll = useCallback(async () => {
    if (!batch?.players?.length) { setAllCards({}); setCardsLoading(false); return; }
    setCardsLoading(true);
    const map = {};
    await Promise.all(batch.players.map(async (bp) => {
      const profile = players.find(p => String(p.playerId) === String(bp.playerId));
      const ids = Array.isArray(profile?.sessionCardIds) ? profile.sessionCardIds : [];
      const cards = [];
      await Promise.all(ids.map(async (id) => {
        try {
          const res = await fetch(VIEW_SESSIONCARD_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', userToken },
            body: JSON.stringify({ sessionCardId: id }),
          });
          if (!res.ok) return;
          const data = await res.json();
          const card = data.sessionCard || data.data || data;
          if (card && (card.Topic || card.activities || card.status)) cards.push({ _id: id, ...card });
        } catch { /* skip */ }
      }));
      map[bp.playerId] = cards;
    }));
    setAllCards(map);
    setCardsLoading(false);
  }, [batch, players, userToken]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const confirmDeleteCard = async () => {
    if (!deleteCardId) return;
    setDeleting(true);
    try {
      const res = await fetch(DELETE_SESSIONCARD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', userToken },
        body: JSON.stringify({ sessionCardId: deleteCardId }),
      });
      if (!res.ok) throw new Error('delete failed');
      setAllCards(prev => {
        const next = {};
        Object.keys(prev).forEach(pid => { next[pid] = prev[pid].filter(c => c._id !== deleteCardId); });
        return next;
      });
      setDeleteCardId(null);
      showToast('Session card deleted');
    } catch {
      showToast('Failed to delete card', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ background: dark ? 'var(--cl-surface)' : '#fff', border: `1.5px solid ${border}`, borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ padding: '18px 24px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: textPrimary, margin: 0 }}>Sessions by player</h3>
          <p style={{ fontSize: '12px', color: '#6B7280', margin: '3px 0 0' }}>Tap a player to view their cards · open to view or edit</p>
        </div>
        <button
          onClick={() => navigate('/admin/session-card', { state: { batchId: batch.batchId } })}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '9px', background: `linear-gradient(135deg, ${BRAND}, #000)`, color: 'white', border: 'none', fontSize: '13px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}
        >
          <Zap size={14} /> Manage &amp; Generate Sessions
        </button>
      </div>

      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {(batch.players?.length ?? 0) === 0 ? (
          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>No players in this batch.</p>
        ) : (batch.players || []).map(p => {
          const info = cardInfo[p.playerId];
          const cards = allCards[p.playerId] || [];
          const [c1, c2] = pal(p.playerName || '');
          const isOpen = !!expanded[p.playerId];

          const byPathway = {};
          cards.forEach(card => {
            const key = card.LearningPathway || p.LearningPathway || 'Unassigned Pathway';
            (byPathway[key] = byPathway[key] || []).push(card);
          });
          const pathwayNames = Object.keys(byPathway).sort((a, b) => a.localeCompare(b));

          return (
            <div key={p.playerId} style={{ border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden', background: dark ? 'rgba(255,255,255,0.02)' : '#fff' }}>
              {/* Clickable player header */}
              <button
                onClick={() => setExpanded(prev => ({ ...prev, [p.playerId]: !prev[p.playerId] }))}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: isOpen ? (dark ? 'rgba(99,102,241,0.06)' : '#F5F7FF') : (dark ? 'rgba(255,255,255,0.02)' : '#FAFBFC'), border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: `linear-gradient(135deg, ${c1}, ${c2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '13px', flexShrink: 0 }}>
                  {(p.playerName || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13.5px', fontWeight: '700', margin: 0, color: textPrimary }}>{p.playerName}</p>
                  <p style={{ fontSize: '11px', color: textMuted, margin: '2px 0 0' }}>
                    {cardInfoLoading && !info ? 'Checking current session…'
                      : info ? `On Session ${info.session} · ${info.status || 'upcoming'}`
                      : cardsLoading ? 'Loading cards…'
                      : `${cards.length} card${cards.length === 1 ? '' : 's'}`}
                  </p>
                </div>
                {info && <StatusBadge status={info.status} size="sm" />}
                <span style={{ fontSize: '11px', fontWeight: '700', color: textMuted, background: surface2, padding: '3px 10px', borderRadius: '20px', flexShrink: 0 }}>
                  {cards.length} card{cards.length === 1 ? '' : 's'}
                </span>
                <ChevronDown size={16} color={textMuted} style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              </button>

              {/* Expanded: cards grouped by pathway */}
              {isOpen && (
                <div style={{ padding: '12px 14px', borderTop: `1px solid ${border}` }}>
                  {cardsLoading && cards.length === 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '10px' }}>
                      {[1, 2].map(i => <div key={i} style={{ height: '110px', borderRadius: '10px', background: surface2, animation: 'skPulse 1.5s ease infinite' }} />)}
                    </div>
                  ) : cards.length === 0 ? (
                    <p style={{ fontSize: '12px', color: textMuted, margin: 0 }}>No cards yet — use Manage &amp; Generate above.</p>
                  ) : (
                    pathwayNames.map(pathwayName => (
                      <div key={pathwayName} style={{ marginBottom: '10px' }}>
                        {pathwayNames.length > 1 && (
                          <p style={{ fontSize: '11px', fontWeight: '800', color: textMuted, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.3px' }}>{pathwayName}</p>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '10px' }}>
                          {byPathway[pathwayName]
                            .slice()
                            .sort((a, b) => (b.session || 0) - (a.session || 0))
                            .map(card => {
                              const sc = statusColors(card.status);
                              const isCompleted = normSt(card.status) === 'completed';
                              return (
                                <div key={card._id} style={{ borderRadius: '10px', border: `1px solid ${border}`, background: dark ? 'rgba(255,255,255,0.03)' : '#fff', overflow: 'hidden' }}>
                                  <div style={{ height: '3px', background: sc.text }} />
                                  <div style={{ padding: '11px 12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#4F46E5' }}>Session {card.session ?? '-'}</span>
                                      <span style={{ fontSize: '9.5px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: sc.bg, color: sc.text, whiteSpace: 'nowrap' }}>{card.status || 'Draft'}</span>
                                    </div>
                                    <p style={{ fontSize: '12.5px', fontWeight: '700', color: textPrimary, margin: '0 0 8px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{card.Topic || 'Untitled'}</p>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                      <button onClick={() => navigate(`/admin/view-session-card/${card._id}`, { state: { session: card, playerId: p.playerId } })}
                                        style={{ flex: 1, padding: '5px 8px', background: dark ? 'rgba(99,102,241,0.15)' : '#EEF2FF', color: '#4F46E5', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                        <Eye size={12} /> View
                                      </button>
                                      {!isCompleted && (
                                        <button onClick={() => navigate(`/admin/edit-session-card/${card._id}`, { state: { batchId: batch.batchId, playerId: p.playerId } })}
                                          style={{ flex: 1, padding: '5px 8px', background: dark ? 'rgba(245,158,11,0.15)' : '#FEF3C7', color: dark ? '#FBBF24' : '#92400E', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                          <Edit3 size={12} /> Edit
                                        </button>
                                      )}
                                      <button onClick={() => setDeleteCardId(card._id)} title="Delete card"
                                        style={{ padding: '5px 8px', background: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', color: dark ? '#F87171' : '#DC2626', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
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

      {deleteCardId && (
        <Modal isOpen={!!deleteCardId} onClose={() => { if (!deleting) setDeleteCardId(null); }} title="Delete session card?">
          <div style={{ padding: '20px', width: 'min(90vw, 380px)', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Trash2 size={26} color="#EF4444" />
            </div>
            <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 20px' }}>This permanently deletes the session card. This can't be undone.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={() => setDeleteCardId(null)} disabled={deleting} style={{ padding: '10px 16px', borderRadius: '8px', fontWeight: '600', background: '#F3F4F6', color: '#111827', border: '1px solid #E5E7EB', cursor: deleting ? 'not-allowed' : 'pointer' }}>Cancel</button>
              <button onClick={confirmDeleteCard} disabled={deleting} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px 16px', borderRadius: '8px', fontWeight: '700', background: '#EF4444', color: 'white', border: 'none', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                {deleting ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Deleting…</> : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════ ATTENDANCE TAB ══════════════════════════ */
function AttendanceTab({ batch, cardInfo, headers, userToken, showToast, dark }) {
  const today = toDateStr(new Date());
  const [date, setDate] = useState(today);
  const [statuses, setStatuses] = useState({});
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingRecs(true);
      try {
        const res = await axios.post(CL_GET_ATTENDANCE_URL, { batchId: batch.batchId, sessionDate: date }, { headers });
        let d = res.data;
        if (d?.body && typeof d.body === 'string') d = JSON.parse(d.body);
        if (cancelled) return;
        const next = {};
        (d.records || []).forEach(r => { if (r.playerId != null) next[String(r.playerId)] = r.attendanceStatus || 'Present'; });
        setStatuses(next);
      } catch { /* ignore, blank slate */ }
      finally { if (!cancelled) setLoadingRecs(false); }
    })();
    return () => { cancelled = true; };
  }, [batch.batchId, date, headers]);

  const setStatus = (playerId, value) => setStatuses(prev => ({ ...prev, [String(playerId)]: value }));
  const markAllPresent = () => {
    const next = {};
    (batch.players || []).forEach(p => { next[String(p.playerId)] = 'Present'; });
    setStatuses(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all((batch.players || []).map(p => {
        const info = cardInfo[p.playerId];
        return fetch(CL_MARK_ATTENDANCE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', userToken },
          body: JSON.stringify({
            playerId: p.playerId,
            playerName: p.playerName,
            batchId: batch.batchId,
            batchName: batch.batchName,
            sessionNumber: info?.session ?? null,
            sessionCardId: info?.cardId || '',
            sessionDate: date,
            attendanceStatus: statuses[String(p.playerId)] || 'Present',
            notes: '',
          }),
        });
      }));
      showToast(`Attendance saved for ${batch.players?.length || 0} player(s)`);
    } catch { showToast('Failed to save attendance', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ background: dark ? 'var(--cl-surface)' : '#fff', border: `1.5px solid ${dark ? 'var(--cl-border)' : '#E2E8F0'}`, borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ padding: '18px 24px', borderBottom: `1px solid ${dark ? 'var(--cl-border)' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: dark ? 'var(--cl-text)' : '#111827', margin: 0 }}>Mark Attendance</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input type="date" value={date} max={today} onChange={e => setDate(e.target.value > today ? today : e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #E2E8F0', fontSize: '13px', cursor: 'pointer' }} />
          <button onClick={markAllPresent} disabled={loadingRecs} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '8px', border: '1px solid #bbf7d0', background: '#dcfce7', color: '#16a34a', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
            <CheckCircle size={14} /> All Present
          </button>
        </div>
      </div>
      <div style={{ padding: '10px 0' }}>
        {loadingRecs ? (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>{[1, 2, 3].map(i => <Sk key={i} w="100%" h={44} r={10} />)}</div>
        ) : (batch.players || []).map((p, idx) => {
          const status = statuses[String(p.playerId)] || 'Present';
          const isPresent = status === 'Present';
          const [avatar] = pal(p.playerName);
          return (
            <div key={p.playerId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 24px', borderTop: idx === 0 ? 'none' : `1px solid ${dark ? 'var(--cl-border)' : '#E2E8F0'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: avatar, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12.5px', fontWeight: '800', flexShrink: 0 }}>
                  {p.playerName.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: dark ? 'var(--cl-text)' : '#0F172A' }}>{p.playerName}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setStatus(p.playerId, 'Present')} style={{ padding: '7px 14px', borderRadius: '999px', border: `1.5px solid ${isPresent ? '#16a34a' : '#E2E8F0'}`, background: isPresent ? '#dcfce7' : '#fff', color: isPresent ? '#16a34a' : '#94A3B8', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}>Present</button>
                <button onClick={() => setStatus(p.playerId, 'Absent')} style={{ padding: '7px 14px', borderRadius: '999px', border: `1.5px solid ${!isPresent ? '#dc2626' : '#E2E8F0'}`, background: !isPresent ? '#fee2e2' : '#fff', color: !isPresent ? '#dc2626' : '#94A3B8', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}>Absent</button>
              </div>
            </div>
          );
        })}
        {(batch.players?.length ?? 0) === 0 && <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 24px' }}>No players in this batch.</p>}
      </div>
      <div style={{ padding: '16px 24px', borderTop: `1px solid ${dark ? 'var(--cl-border)' : '#E2E8F0'}` }}>
        <button onClick={handleSave} disabled={saving || loadingRecs || (batch.players?.length ?? 0) === 0} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: `linear-gradient(135deg, ${BRAND}, #3b0080)`, color: 'white', fontWeight: '700', fontSize: '14px', cursor: (saving || loadingRecs) ? 'not-allowed' : 'pointer', opacity: (saving || loadingRecs) ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          {saving && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />} Save Attendance
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════ SETTINGS TAB ══════════════════════════ */
function SettingsTab({ batch, players, learningPathway, headers, reload, showToast, navigate, dark, onSaved }) {
  const [form, setForm] = useState({
    batchName: batch.batchName || '',
    days: batch.days || [],
    startTime: batch.startTime || '',
    endTime: batch.endTime || '',
    LearningPathway: batch.LearningPathway || '',
    playerIds: (batch.playerIds || []).map(String),
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');
  const [mismatchConfirm, setMismatchConfirm] = useState(null); // [{name, pathway}] | null

  const uniquePathwayNames = useMemo(() => {
    const names = new Set();
    (learningPathway || []).forEach(s => { if (s.LearningPathway) names.add(s.LearningPathway); });
    return [...names].sort();
  }, [learningPathway]);

  // Selected players whose OWN pathway differs from the batch's chosen pathway.
  const selectedMismatches = useMemo(() => {
    if (!form.LearningPathway) return [];
    return players
      .filter(p => form.playerIds.includes(String(p.playerId)))
      .filter(p => p.LearningPathway && p.LearningPathway !== form.LearningPathway)
      .map(p => ({ playerId: p.playerId, name: p.playerName || p.name, pathway: p.LearningPathway }));
  }, [players, form.playerIds, form.LearningPathway]);

  const toggleDay = (day) => setForm(prev => ({ ...prev, days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day] }));
  const togglePlayer = (pid) => {
    const id = String(pid);
    setForm(prev => ({ ...prev, playerIds: prev.playerIds.includes(id) ? prev.playerIds.filter(x => x !== id) : [...prev.playerIds, id] }));
  };

  const modalPlayers = useMemo(() => {
    const term = playerSearch.toLowerCase();
    return players.filter(p => (p.playerName || p.name || '').toLowerCase().includes(term));
  }, [players, playerSearch]);

  const handleSave = () => {
    if (!form.batchName.trim() || form.playerIds.length === 0) {
      showToast('Batch name and at least one player required', 'error');
      return;
    }
    if (selectedMismatches.length > 0) {
      setMismatchConfirm(selectedMismatches);
      return;
    }
    doSave();
  };

  const doSave = async () => {
    setMismatchConfirm(null);
    setSaving(true);
    try {
      await axios.post(CL_MANAGE_BATCH_URL, {
        action: 'update', batchId: batch.batchId,
        batchName: form.batchName.trim(), playerIds: form.playerIds,
        days: form.days, startTime: form.startTime || null, endTime: form.endTime || null,
        LearningPathway: form.LearningPathway || null,
      }, { headers });
      await reload();
      showToast('Batch updated');
      onSaved?.();
    } catch { showToast('Failed to update batch', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.post(CL_MANAGE_BATCH_URL, { action: 'delete', batchId: batch.batchId }, { headers });
      showToast('Batch deleted');
      navigate('/admin/manage-batches');
    } catch { showToast('Failed to delete batch', 'error'); setDeleting(false); }
  };

  return (
    <div style={{ background: dark ? 'var(--cl-surface)' : '#fff', border: `1.5px solid ${dark ? 'var(--cl-border)' : '#E2E8F0'}`, borderRadius: '16px', padding: '24px', maxWidth: '640px' }}>
      <div style={{ marginBottom: '18px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>Batch Name <span style={{ color: '#EF4444' }}>*</span></label>
        <input type="text" value={form.batchName} onChange={e => setForm(prev => ({ ...prev, batchName: e.target.value }))} style={{ width: '100%', padding: '11px 14px', border: '2px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: '18px' }}>
        <label style={{ display: 'flex', fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '10px', alignItems: 'center', gap: '6px' }}><Calendar size={14} color={BRAND} /> Session Days</label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {DAYS.map(day => {
            const active = form.days.includes(day);
            return <button key={day} type="button" onClick={() => toggleDay(day)} style={{ padding: '6px 14px', borderRadius: '20px', border: `1.5px solid ${active ? BRAND : '#E5E7EB'}`, background: active ? BRAND : '#fff', color: active ? '#fff' : '#374151', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}>{day}</button>;
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
        <div>
          <label style={{ display: 'flex', fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '8px', alignItems: 'center', gap: '6px' }}><Clock size={14} color={BRAND} /> Start Time</label>
          <input type="time" step={900} value={form.startTime} onChange={e => setForm(prev => ({ ...prev, startTime: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '2px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer' }} />
        </div>
        <div>
          <label style={{ display: 'flex', fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '8px', alignItems: 'center', gap: '6px' }}><Clock size={14} color="#10B981" /> End Time</label>
          <input type="time" step={900} value={form.endTime} onChange={e => setForm(prev => ({ ...prev, endTime: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '2px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer' }} />
        </div>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <label style={{ display: 'flex', fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '8px', alignItems: 'center', gap: '6px' }}><Layers size={14} color={BRAND} /> Learning Pathway</label>
        <select value={form.LearningPathway} onChange={e => setForm(prev => ({ ...prev, LearningPathway: e.target.value }))} style={{ width: '100%', padding: '11px 14px', border: '2px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: 'white', cursor: 'pointer' }}>
          <option value="">No pathway set (players use their own profile pathway)</option>
          {uniquePathwayNames.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>Players <span style={{ color: '#EF4444' }}>*</span></label>
        <span style={{ fontSize: '12px', color: '#6B7280' }}>{form.playerIds.length} selected</span>
      </div>
      <input type="text" placeholder="Search players…" value={playerSearch} onChange={e => setPlayerSearch(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', marginBottom: '10px', fontSize: '13px', boxSizing: 'border-box' }} />
      <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px', marginBottom: '20px' }}>
        {modalPlayers.map(p => {
          const checked = form.playerIds.includes(String(p.playerId));
          const mismatch = form.LearningPathway && p.LearningPathway && p.LearningPathway !== form.LearningPathway;
          return (
            <label key={p.playerId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', background: checked ? '#EEF2FF' : 'white' }}>
              <input type="checkbox" checked={checked} onChange={() => togglePlayer(p.playerId)} />
              <span style={{ fontSize: '14px', color: '#111827', flex: 1 }}>{p.playerName || p.name}</span>
              {mismatch && (
                <span title={`This player's pathway is "${p.LearningPathway}", different from the batch pathway`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', fontWeight: '700', color: '#B45309', background: '#FEF3C7', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: '999px', flexShrink: 0 }}>
                  <AlertTriangle size={11} /> {p.LearningPathway}
                </span>
              )}
            </label>
          );
        })}
      </div>

      <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', fontWeight: '600', background: `linear-gradient(135deg, ${BRAND}, #000)`, color: 'white', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
        {saving && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />} Save Changes
      </button>

      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '18px' }}>
        <p style={{ fontSize: '12px', fontWeight: '700', color: '#DC2626', textTransform: 'uppercase', margin: '0 0 8px' }}>Danger Zone</p>
        <button onClick={() => setDeleteConfirm(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
          <Trash2 size={14} /> Delete Batch
        </button>
      </div>

      {deleteConfirm && (
        <Modal isOpen={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Delete Batch">
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={28} color="#EF4444" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>Delete this batch?</h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>This action cannot be undone.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button onClick={() => setDeleteConfirm(false)} disabled={deleting} style={{ padding: '10px 16px', borderRadius: '8px', fontWeight: '500', background: '#f3f4f6', color: '#111827', border: '1px solid #e5e7eb', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={{ padding: '10px 16px', borderRadius: '8px', fontWeight: '500', background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                {deleting && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />} {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {mismatchConfirm && (
        <Modal isOpen={!!mismatchConfirm} onClose={() => setMismatchConfirm(null)} title="Pathway mismatch">
          <div style={{ width: 'min(92vw, 480px)', padding: '4px 4px 8px' }}>
            <div style={{ display: 'flex', gap: '12px', padding: '14px 16px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FECACA', marginBottom: '16px' }}>
              <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }} />
              <p style={{ fontSize: '13.5px', color: '#7F1D1D', margin: 0, lineHeight: 1.6 }}>
                {mismatchConfirm.length} player{mismatchConfirm.length === 1 ? '' : 's'} {mismatchConfirm.length === 1 ? 'has' : 'have'} a Learning Pathway that <strong>doesn't match</strong> this batch (<strong>{form.LearningPathway}</strong>). Fix the player's pathway to match the batch before saving.
              </p>
            </div>
            <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #F3F4F6', borderRadius: '10px', marginBottom: '18px' }}>
              {mismatchConfirm.map((m, i) => (
                <div key={m.playerId || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '9px 12px', borderBottom: i === mismatchConfirm.length - 1 ? 'none' : '1px solid #F3F4F6' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '13.5px', fontWeight: '600', color: '#111827', margin: 0 }}>{m.name}</p>
                    <p style={{ fontSize: '11px', color: '#B45309', margin: '2px 0 0', fontWeight: '700' }}>{m.pathway}</p>
                  </div>
                  <button
                    onClick={() => navigate('/admin/players', { state: { editPlayerId: m.playerId } })}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', border: 'none', background: `linear-gradient(135deg, ${BRAND}, #000)`, color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <Edit3 size={12} /> Fix pathway
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setMismatchConfirm(null)} style={{ width: '100%', padding: '11px 16px', borderRadius: '9px', fontWeight: '600', background: '#F3F4F6', color: '#111827', border: '1.5px solid #E5E7EB', cursor: 'pointer', fontSize: '14px' }}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
