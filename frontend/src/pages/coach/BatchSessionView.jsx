import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Toast } from '../../components/Toast';
import { ChevronLeft, Layers, Loader, Info, Users, CalendarCheck, Save, CheckCircle } from 'lucide-react';

const VIEW_SESSIONCARD_URL = 'https://kyfkhl8v4l.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_View_Sessioncard';
const CL_GET_ATTENDANCE_URL  = 'https://expqdxymlf.execute-api.ap-south-1.amazonaws.com/default/CL_Get_Attendance';
const CL_MARK_ATTENDANCE_URL = 'https://a5c8vbcbj4.execute-api.ap-south-1.amazonaws.com/default/CL_Mark_Attendance';

const STATUS_OPTIONS = ['Present', 'Absent', 'Late', 'Excused'];
const STATUS_CONFIG = {
  Present: { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  Absent:  { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  Late:    { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
  Excused: { bg: '#ede9fe', color: '#7c3aed', border: '#ddd6fe' },
  '':      { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
};

function toDateStr(date) {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const BatchSessionView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, fetchAssignedPlayersForCoach, userToken } = useStore();

  const batch = location.state?.batch;

  const [batchPlayers, setBatchPlayers] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  // { [playerId]: { activeCardId: string|null, loading: bool, checked: bool } }
  const [cardStatus, setCardStatus] = useState({});

  // ── attendance state
  const today = toDateStr(new Date());
  const [attendanceDate, setAttendanceDate]   = useState(today);
  const [statuses, setStatuses]               = useState({}); // { [playerId]: 'Present' | ... | '' }
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSaving, setAttendanceSaving]   = useState(false);
  const [toastMsg, setToastMsg]   = useState('');
  const [toastType, setToastType] = useState('success');

  const toast = useCallback((msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  }, []);

  useEffect(() => {
    if (!batch) navigate('/coach/start-session');
  }, [batch, navigate]);

  // Load existing attendance for the selected date so statuses pre-fill
  useEffect(() => {
    if (!batch?.batchId || !userToken) return;
    const controller = new AbortController();
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
          if (r.playerId != null) next[String(r.playerId)] = r.attendanceStatus || '';
        });
        setStatuses(next);
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Failed to load attendance', e);
      } finally {
        setAttendanceLoading(false);
      }
    })();
    return () => controller.abort();
  }, [batch?.batchId, attendanceDate, userToken]);

  function setStatus(playerId, value) {
    setStatuses(prev => ({ ...prev, [String(playerId)]: value }));
  }

  function markAllPresent() {
    const next = {};
    batchPlayers.forEach(p => { next[String(p.playerId)] = 'Present'; });
    setStatuses(next);
  }

  async function handleSubmitAttendance() {
    if (!batch?.batchId) { toast('Batch not found', 'error'); return; }
    if (batchPlayers.length === 0) { toast('No players to mark', 'error'); return; }
    setAttendanceSaving(true);
    try {
      await Promise.all(batchPlayers.map(p => {
        const sessionNumber = Array.isArray(p.sessionCardIds) && p.sessionCardIds.length > 0
          ? p.sessionCardIds.length
          : null;
        return fetch(CL_MARK_ATTENDANCE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', userToken },
          body: JSON.stringify({
            playerId: p.playerId,
            playerName: p.name,
            batchId: batch.batchId,
            batchName: batch.batchName,
            sessionNumber,
            sessionDate: attendanceDate,
            attendanceStatus: statuses[String(p.playerId)] || '',
            notes: '',
          }),
        });
      }));
      toast(`Attendance saved for ${batchPlayers.length} player${batchPlayers.length === 1 ? '' : 's'}`);
    } catch (e) {
      console.error('Failed to save attendance', e);
      toast('Failed to save attendance', 'error');
    } finally {
      setAttendanceSaving(false);
    }
  }

  useEffect(() => {
    if (!currentUser?.id || !batch) return;
    const controller = new AbortController();
    (async () => {
      setInitialLoading(true);
      try {
        const result = await fetchAssignedPlayersForCoach(currentUser.id);
        if (result.success && result.players) {
          const transformed = result.players.map(item => {
            const p = item.player || item;
            return {
              playerId: p._id || p.id || p.playerId,
              name: p.playerName || p.name,
              sessionCardIds: item.sessionCardIds || []
            };
          });
          const enriched = batch.players.map(bp => {
            const full = transformed.find(p => p.playerId === bp.playerId);
            return full || { playerId: bp.playerId, name: bp.playerName, sessionCardIds: [] };
          });
          setBatchPlayers(enriched);
          setInitialLoading(false);

          // For each player fetch their last card to check if it's active or completed
          await Promise.all(enriched.map(async (player) => {
            const { playerId, sessionCardIds } = player;
            if (!sessionCardIds || sessionCardIds.length === 0) {
              setCardStatus(prev => ({ ...prev, [playerId]: { activeCardId: null, loading: false, checked: true } }));
              return;
            }
            setCardStatus(prev => ({ ...prev, [playerId]: { activeCardId: null, loading: true, checked: false } }));
            const lastId = sessionCardIds[sessionCardIds.length - 1];
            try {
              const res = await fetch(VIEW_SESSIONCARD_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'userToken': userToken },
                body: JSON.stringify({ sessionCardId: lastId })
              });
              if (res.ok) {
                const data = await res.json();
                const card = data.sessionCard || data.data || data;
                const cardId = card?._id || card?.sessionCardId || lastId;
                const isCompleted = (card?.status || '').toLowerCase() === 'completed';
                setCardStatus(prev => ({
                  ...prev,
                  [playerId]: { activeCardId: isCompleted ? null : cardId, loading: false, checked: true }
                }));
              } else {
                setCardStatus(prev => ({ ...prev, [playerId]: { activeCardId: null, loading: false, checked: true } }));
              }
            } catch (e) {
              console.error('Card status fetch failed', playerId, e);
              setCardStatus(prev => ({ ...prev, [playerId]: { activeCardId: null, loading: false, checked: true } }));
            }
          }));
        } else {
          setInitialLoading(false);
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Failed to fetch players', e);
        setInitialLoading(false);
      }
    })();
    return () => controller.abort();
  }, [currentUser?.id, batch, fetchAssignedPlayersForCoach, userToken]);

  if (!batch) return null;

  return (
    <Layout>
      {toastMsg && (
        <Toast message={toastMsg} type={toastType} duration={3000} onClose={() => setToastMsg('')} />
      )}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>

        {/* Gradient header */}
        <div style={{
          background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
          borderRadius: '16px', padding: '28px 32px', color: 'white',
          marginBottom: '28px', boxShadow: '0 4px 16px rgba(6,0,48,0.25)'
        }}>
          {/* Back + batch name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/coach/start-session')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                borderRadius: '8px', background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)', color: 'white',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            >
              <ChevronLeft size={14} /> Back
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={22} style={{ opacity: 0.75 }} />
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>{batch.batchName}</h1>
                <p style={{ fontSize: '13px', opacity: 0.75, margin: 0 }}>
                  {batchPlayers.length} player{batchPlayers.length === 1 ? '' : 's'} · click a name to start their session
                </p>
              </div>
            </div>
          </div>

          {/* Player chips */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {initialLoading
              ? [1, 2, 3].map(i => (
                  <div key={i} style={{
                    height: '42px', width: '130px', background: 'rgba(255,255,255,0.1)',
                    borderRadius: '24px', animation: 'pulse 2s infinite'
                  }} />
                ))
              : batchPlayers.map(player => {
                  const status = cardStatus[player.playerId];
                  const isLoadingCard = status?.loading ?? true;
                  const hasNew = Boolean(status?.activeCardId);
                  const checked = status?.checked;

                  return (
                    <button
                      key={player.playerId}
                      onClick={() => {
                        if (!status?.activeCardId) return;
                        navigate(`/coach/session/${status.activeCardId}`, {
                          state: {
                            batch,
                            batchPlayerCards: batchPlayers.map(p => ({
                              playerId: p.playerId,
                              name: p.name,
                              activeCardId: cardStatus[p.playerId]?.activeCardId || null
                            })),
                            activePlayerId: player.playerId
                          }
                        });
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '9px 18px 9px 10px', borderRadius: '24px', border: 'none',
                        background: hasNew ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.07)',
                        color: hasNew ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
                        fontWeight: '600', fontSize: '14px',
                        cursor: hasNew ? 'pointer' : 'default',
                        transition: 'all 0.2s ease',
                        boxShadow: hasNew ? '0 2px 10px rgba(0,0,0,0.2)' : 'none'
                      }}
                      onMouseEnter={(e) => { if (hasNew) e.currentTarget.style.background = 'rgba(255,255,255,0.26)'; }}
                      onMouseLeave={(e) => { if (hasNew) e.currentTarget.style.background = 'rgba(255,255,255,0.16)'; }}
                    >
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                        background: hasNew ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: '800'
                      }}>
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      {player.name}
                      {isLoadingCard && (
                        <Loader size={13} style={{ animation: 'spin 1s linear infinite', opacity: 0.6, flexShrink: 0 }} />
                      )}
                      {checked && !hasNew && (
                        <span title="No new session available" style={{ display: 'flex', alignItems: 'center' }}>
                          <Info size={13} style={{ opacity: 0.65, flexShrink: 0 }} />
                        </span>
                      )}
                    </button>
                  );
                })
            }
          </div>
        </div>

        {/* Attendance card */}
        <div style={{
          background: '#FFFFFF', borderRadius: '16px', border: '1.5px solid #E2E8F0',
          overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          {/* Card header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '12px', padding: '18px 24px', borderBottom: '1px solid #F1F5F9',
            background: 'linear-gradient(135deg, rgba(6,0,48,0.04), rgba(6,0,48,0.02))'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CalendarCheck size={18} color="#060030ff" />
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>Mark Attendance</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#6B7280' }}>Session Date</label>
                <input
                  type="date"
                  value={attendanceDate}
                  max={today}
                  onChange={(e) => setAttendanceDate(e.target.value > today ? today : e.target.value)}
                  style={{
                    padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #E2E8F0',
                    fontSize: '13px', color: '#111827', outline: 'none', background: 'white', cursor: 'pointer'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#060030ff'; e.target.style.boxShadow = '0 0 0 3px rgba(6,0,48,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <button
                onClick={markAllPresent}
                disabled={batchPlayers.length === 0 || attendanceLoading}
                style={{
                  alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '9px 14px', borderRadius: '8px', border: '1px solid #bbf7d0',
                  background: '#dcfce7', color: '#16a34a', fontWeight: '600', fontSize: '13px',
                  cursor: (batchPlayers.length === 0 || attendanceLoading) ? 'not-allowed' : 'pointer',
                  opacity: (batchPlayers.length === 0 || attendanceLoading) ? 0.6 : 1
                }}
              >
                <CheckCircle size={15} /> All Present
              </button>
              <button
                onClick={handleSubmitAttendance}
                disabled={attendanceSaving || attendanceLoading || batchPlayers.length === 0}
                style={{
                  alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '9px 18px', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #060030ff, #000000ff)', color: 'white',
                  fontWeight: '600', fontSize: '13px',
                  cursor: (attendanceSaving || attendanceLoading || batchPlayers.length === 0) ? 'not-allowed' : 'pointer',
                  opacity: (attendanceSaving || attendanceLoading || batchPlayers.length === 0) ? 0.7 : 1
                }}
              >
                {attendanceSaving
                  ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Save size={15} />}
                {attendanceSaving ? 'Saving…' : 'Submit Attendance'}
              </button>
            </div>
          </div>

          {/* Player rows */}
          {initialLoading || attendanceLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '20px 24px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: '48px', background: '#F1F5F9', borderRadius: '10px', animation: 'pulse 2s infinite' }} />
              ))}
            </div>
          ) : batchPlayers.length === 0 ? (
            <div style={{ padding: '56px 32px', textAlign: 'center' }}>
              <Users size={48} style={{ margin: '0 auto 14px', opacity: 0.15, color: '#94A3B8', display: 'block' }} />
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#374151', margin: 0 }}>No players in this batch</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {batchPlayers.map((player, idx) => {
                const status = statuses[String(player.playerId)] || '';
                return (
                  <div
                    key={player.playerId}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: '12px', padding: '14px 24px', flexWrap: 'wrap',
                      borderTop: idx === 0 ? 'none' : '1px solid #F1F5F9'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #060030ff, #252c35)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: '800'
                      }}>
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{player.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600',
                        background: (STATUS_CONFIG[status] || STATUS_CONFIG['']).bg,
                        color: (STATUS_CONFIG[status] || STATUS_CONFIG['']).color,
                        border: `1px solid ${(STATUS_CONFIG[status] || STATUS_CONFIG['']).border}`
                      }}>
                        {status || 'In Progress'}
                      </span>
                      <select
                        value={status}
                        onChange={(e) => setStatus(player.playerId, e.target.value)}
                        style={{
                          padding: '7px 10px', borderRadius: '8px', border: '1.5px solid #E2E8F0',
                          fontSize: '13px', color: '#111827', outline: 'none', background: 'white',
                          cursor: 'pointer', minWidth: '130px'
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#060030ff'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; }}
                      >
                        <option value="">In Progress</option>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Hint */}
        <p style={{ fontSize: '13px', color: '#64748B', textAlign: 'center', margin: '16px 0 0' }}>
          Click a player name above to start their session · Dimmed players with <Info size={12} style={{ verticalAlign: 'middle', marginBottom: '2px', color: '#94A3B8' }} /> have no pending session card
        </p>

      </div>
    </Layout>
  );
};

export default BatchSessionView;
