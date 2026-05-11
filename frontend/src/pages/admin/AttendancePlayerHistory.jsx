import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import {
  ChevronLeft, CalendarCheck, CheckCircle, XCircle, X, RefreshCw,
} from 'lucide-react';

const BRAND = '#060030ff';
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDisplayDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function StatusBadge({ status }) {
  const map = {
    present:  { bg: '#dcfce7', color: '#16a34a', label: 'Present' },
    absent:   { bg: '#fee2e2', color: '#dc2626', label: 'Absent' },
    cancelled:{ bg: '#f3f4f6', color: '#6b7280', label: 'Cancelled' },
  };
  const s = map[status] || map.cancelled;
  return (
    <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function StatusIcon({ status }) {
  if (status === 'present') return <CheckCircle size={18} color="#16a34a" />;
  if (status === 'absent') return <XCircle size={18} color="#dc2626" />;
  if (status === 'cancelled') return <X size={18} color="#6b7280" />;
  return <RefreshCw size={18} color="#d97706" />;
}

export default function AttendancePlayerHistory() {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { userToken, players, fetchPlayers, playersLoading } = useStore();

  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  useEffect(() => {
    fetchPlayers();
  }, [userToken]);

  useEffect(() => {
    // Will call CL_Get_Player_Attendance API with playerId
    // Simulating load completion
    const timer = setTimeout(() => setRecordsLoading(false), 400);
    return () => clearTimeout(timer);
  }, [playerId]);

  const player = useMemo(
    () => players.find(p => p.playerId === playerId) || null,
    [players, playerId]
  );

  const stats = useMemo(() => ({
    total: records.length,
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
  }), [records]);

  const attendanceRate = stats.total > 0
    ? Math.round((stats.present / stats.total) * 100)
    : null;

  const isLoading = playersLoading || recordsLoading;

  return (
    <Layout>
      <div style={{ padding: 'clamp(16px, 3vw, 28px)', maxWidth: '820px', margin: '0 auto' }}>

        {/* Back button */}
        <button
          onClick={() => navigate('/admin/attendance')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '22px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#6b7280', fontSize: '14px', fontWeight: 500, padding: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = BRAND}
          onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
        >
          <ChevronLeft size={18} /> Back to Attendance
        </button>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
            <CalendarCheck size={36} style={{ margin: '0 auto 12px', color: '#d1d5db' }} />
            <p style={{ fontSize: '14px', margin: 0 }}>Loading…</p>
          </div>
        ) : !player ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#dc2626' }}>
            <p style={{ fontSize: '15px', fontWeight: 600 }}>Player not found.</p>
            <button
              onClick={() => navigate('/admin/attendance')}
              style={{ marginTop: '12px', padding: '8px 18px', borderRadius: '8px', border: 'none', background: BRAND, color: 'white', cursor: 'pointer', fontSize: '13px' }}
            >
              Go back
            </button>
          </div>
        ) : (
          <>
            {/* Player header */}
            <div style={{
              background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb',
              padding: '24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  background: `linear-gradient(135deg, ${BRAND}, #252c35)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', fontWeight: 700, color: 'white', flexShrink: 0,
                }}>
                  {(player.playerName || player.name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
                    {player.playerName || player.name}
                  </h1>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                    {player.LearningPathway || 'No pathway assigned'}
                  </p>
                </div>
              </div>

              {attendanceRate !== null && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{
                    fontSize: '34px', fontWeight: 700, margin: '0 0 2px',
                    color: attendanceRate >= 75 ? '#16a34a' : '#dc2626',
                  }}>
                    {attendanceRate}%
                  </p>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Attendance Rate</p>
                </div>
              )}
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
              {[
                { label: 'Total Sessions', value: stats.total, color: '#2563eb' },
                { label: 'Present', value: stats.present, color: '#16a34a' },
                { label: 'Absent', value: stats.absent, color: '#dc2626' },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb',
                  padding: '18px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                  <p style={{ fontSize: '26px', fontWeight: 700, color: s.color, margin: '0 0 4px' }}>{s.value}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Attendance timeline */}
            <div style={{
              background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb',
              overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid #f3f4f6' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  Attendance History
                </h2>
              </div>

              {records.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#9ca3af' }}>
                  <CalendarCheck size={40} style={{ margin: '0 auto 14px', color: '#d1d5db' }} />
                  <p style={{ fontSize: '15px', fontWeight: 500, margin: '0 0 6px' }}>No attendance records yet</p>
                  <p style={{ fontSize: '13px', margin: 0 }}>
                    Records will appear here once sessions are scheduled and marked
                  </p>
                </div>
              ) : (
                <div style={{ padding: '20px 22px' }}>
                  {records.map((record, idx) => (
                    <div
                      key={record.attendanceId}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '14px',
                        paddingBottom: idx < records.length - 1 ? '20px' : 0,
                        marginBottom: idx < records.length - 1 ? '20px' : 0,
                        borderBottom: idx < records.length - 1 ? '1px solid #f3f4f6' : 'none',
                      }}
                    >
                      <div style={{ marginTop: '2px', flexShrink: 0 }}>
                        <StatusIcon status={record.status} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <p style={{ margin: '0 0 3px', fontWeight: 600, fontSize: '14px', color: '#111827' }}>
                              {record.sessionNumber ? `Session ${record.sessionNumber}` : 'Session'}
                              {record.sessionTopic ? ` · ${record.sessionTopic}` : ''}
                            </p>
                            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                              {fmtDisplayDate(record.scheduledDate)}
                              {record.coachName ? ` · ${record.coachName}` : ''}
                            </p>
                          </div>
                          <StatusBadge status={record.status} />
                        </div>
                        {record.notes && (
                          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>
                            "{record.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
