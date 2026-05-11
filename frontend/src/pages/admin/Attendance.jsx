import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Toast } from '../../components/Toast';
import {
  CalendarCheck, CheckCircle, XCircle, RefreshCw, ChevronLeft, ChevronRight,
  Search, Plus, Clock, Calendar, AlertTriangle, Loader,
} from 'lucide-react';

const BRAND = '#060030ff';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const TIME_SLOTS = ['08:00 AM','09:00 AM','10:00 AM','11:00 AM','12:00 PM','02:00 PM','03:00 PM','04:00 PM','05:00 PM','06:00 PM'];
const RECURRING_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function getWeekDates(weekOffset = 0) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

function fmtDate(date) {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)}`;
}

function StatusBadge({ status }) {
  const map = {
    present:    { bg: '#dcfce7', color: '#16a34a', label: 'Present' },
    absent:     { bg: '#fee2e2', color: '#dc2626', label: 'Absent' },
    scheduled:  { bg: '#eff6ff', color: '#2563eb', label: 'Scheduled' },
    cancelled:  { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelled' },
    rescheduled:{ bg: '#fef3c7', color: '#d97706', label: 'Rescheduled' },
  };
  const s = map[status] || map.scheduled;
  return (
    <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export default function Attendance() {
  const navigate = useNavigate();
  const { userToken, players, fetchPlayers, playersLoading } = useStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  });
  const [scheduledSessions, setScheduledSessions] = useState([]);
  const [carryForwards, setCarryForwards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');

  const [scheduleForm, setScheduleForm] = useState({
    playerId: '',
    date: '',
    timeSlot: '10:00 AM',
    isRecurring: false,
    recurringDay: 'Saturday',
  });
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [rescheduleMap, setRescheduleMap] = useState({});

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const selectedDate = weekDates[selectedDayIdx];
  const weekLabel = `${fmtDate(weekDates[0])} – ${fmtDate(weekDates[6])}, ${weekDates[0].getFullYear()}`;

  useEffect(() => {
    fetchPlayers();
  }, [userToken]);

  const stats = useMemo(() => ({
    total: scheduledSessions.length,
    present: scheduledSessions.filter(s => s.status === 'present').length,
    absent: scheduledSessions.filter(s => s.status === 'absent').length,
    cfPending: carryForwards.filter(c => c.status === 'pending').length,
  }), [scheduledSessions, carryForwards]);

  const filteredDaySessions = useMemo(() => {
    const dateStr = toDateStr(selectedDate);
    const day = scheduledSessions.filter(s => s.scheduledDate === dateStr);
    if (!searchTerm) return day;
    const q = searchTerm.toLowerCase();
    return day.filter(s =>
      s.playerName?.toLowerCase().includes(q) ||
      s.coachName?.toLowerCase().includes(q)
    );
  }, [scheduledSessions, selectedDate, searchTerm]);

  const pendingCFs = useMemo(() => carryForwards.filter(c => c.status === 'pending'), [carryForwards]);
  const resolvedCFs = useMemo(() => carryForwards.filter(c => c.status !== 'pending'), [carryForwards]);

  function handleMarkAttendance(session, status) {
    setScheduledSessions(prev =>
      prev.map(s => s.scheduleId === session.scheduleId ? { ...s, status } : s)
    );
    if (status === 'absent') {
      setCarryForwards(prev => [...prev, {
        carryForwardId: `cf_${Date.now()}`,
        playerId: session.playerId,
        playerName: session.playerName,
        coachName: session.coachName,
        sessionTopic: session.sessionTopic,
        sessionNumber: session.sessionNumber,
        originalDate: session.scheduledDate,
        rescheduledDate: '',
        status: 'pending',
      }]);
    }
    setToastMsg(`Marked ${status} for ${session.playerName}`);
    setToastType(status === 'present' ? 'success' : 'error');
  }

  function handleScheduleSubmit(e) {
    e.preventDefault();
    if (!scheduleForm.playerId) return;
    if (!scheduleForm.isRecurring && !scheduleForm.date) return;
    setScheduleLoading(true);
    const player = players.find(p => p.playerId === scheduleForm.playerId);
    const newSession = {
      scheduleId: `sch_${Date.now()}`,
      playerId: scheduleForm.playerId,
      playerName: player?.playerName || player?.name || '',
      coachName: '',
      scheduledDate: scheduleForm.isRecurring ? '' : scheduleForm.date,
      timeSlot: scheduleForm.timeSlot,
      isRecurring: scheduleForm.isRecurring,
      recurringDay: scheduleForm.recurringDay,
      status: 'scheduled',
      sessionTopic: '',
      sessionNumber: null,
    };
    setTimeout(() => {
      setScheduledSessions(prev => [...prev, newSession]);
      setScheduleForm({ playerId: '', date: '', timeSlot: '10:00 AM', isRecurring: false, recurringDay: 'Saturday' });
      setScheduleLoading(false);
      setToastMsg('Session scheduled successfully');
      setToastType('success');
      setActiveTab('overview');
    }, 600);
  }

  function handleReschedule(cfId) {
    const newDate = rescheduleMap[cfId];
    if (!newDate) {
      setToastMsg('Please select a reschedule date');
      setToastType('error');
      return;
    }
    const cf = carryForwards.find(c => c.carryForwardId === cfId);
    setCarryForwards(prev =>
      prev.map(c => c.carryForwardId === cfId ? { ...c, rescheduledDate: newDate, status: 'completed' } : c)
    );
    if (cf) {
      setScheduledSessions(prev => [...prev, {
        scheduleId: `sch_reschd_${Date.now()}`,
        playerId: cf.playerId,
        playerName: cf.playerName,
        coachName: cf.coachName,
        scheduledDate: newDate,
        timeSlot: '10:00 AM',
        isRecurring: false,
        status: 'scheduled',
        sessionTopic: cf.sessionTopic,
        sessionNumber: cf.sessionNumber,
      }]);
    }
    setToastMsg('Carry-forward rescheduled successfully');
    setToastType('success');
  }

  function handleCancelCarryForward(cfId) {
    setCarryForwards(prev =>
      prev.map(c => c.carryForwardId === cfId ? { ...c, status: 'cancelled' } : c)
    );
    setToastMsg('Carry-forward cancelled');
    setToastType('success');
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'schedule', label: 'Schedule Session' },
    { key: 'carryforward', label: `Carry-Forward${pendingCFs.length > 0 ? ` (${pendingCFs.length})` : ''}` },
  ];

  return (
    <Layout>
      {toastMsg && (
        <Toast message={toastMsg} type={toastType} duration={3000} onClose={() => setToastMsg('')} />
      )}

      <div style={{ padding: 'clamp(16px, 3vw, 28px)', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Page Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <CalendarCheck size={28} color={BRAND} />
            <h1 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, color: '#111827', margin: 0 }}>
              Attendance Management
            </h1>
          </div>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            Track session attendance, schedule sessions, and manage carry-forwards
          </p>
        </div>

        {/* Tab Bar */}
        <div style={{
          display: 'flex', gap: '4px', background: '#f3f4f6',
          padding: '4px', borderRadius: '10px', marginBottom: '24px', width: 'fit-content',
          flexWrap: 'wrap',
        }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: 600,
                background: activeTab === tab.key ? BRAND : 'transparent',
                color: activeTab === tab.key ? 'white' : '#6b7280',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px', marginBottom: '24px',
            }}>
              {[
                { label: 'Scheduled', value: stats.total, color: '#2563eb', bg: '#eff6ff', Icon: Calendar },
                { label: 'Present', value: stats.present, color: '#16a34a', bg: '#dcfce7', Icon: CheckCircle },
                { label: 'Absent', value: stats.absent, color: '#dc2626', bg: '#fee2e2', Icon: XCircle },
                { label: 'Carry-Forward', value: stats.cfPending, color: '#d97706', bg: '#fef3c7', Icon: RefreshCw },
              ].map(stat => (
                <div key={stat.label} style={{
                  background: 'white', borderRadius: '12px', padding: '20px',
                  border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px', background: stat.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px',
                  }}>
                    <stat.Icon size={20} color={stat.color} />
                  </div>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
                    {stat.value}
                  </p>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Weekly Sessions Panel */}
            <div style={{
              background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb',
              overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              {/* Week nav + search */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap', gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => setWeekOffset(w => w - 1)}
                    style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontWeight: 600, fontSize: '15px', color: '#111827', minWidth: '200px', textAlign: 'center' }}>
                    {weekLabel}
                  </span>
                  <button
                    onClick={() => setWeekOffset(w => w + 1)}
                    style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                  {weekOffset !== 0 && (
                    <button
                      onClick={() => setWeekOffset(0)}
                      style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#6b7280' }}
                    >
                      Today
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search player..."
                    style={{
                      paddingLeft: '32px', paddingRight: '12px', paddingTop: '7px', paddingBottom: '7px',
                      border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px',
                      outline: 'none', width: '180px',
                    }}
                  />
                </div>
              </div>

              {/* Day tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', overflowX: 'auto', padding: '0 8px' }}>
                {weekDates.map((date, idx) => {
                  const isToday = toDateStr(date) === toDateStr(new Date());
                  const isSelected = idx === selectedDayIdx;
                  const dotVisible = scheduledSessions.some(s => s.scheduledDate === toDateStr(date));
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDayIdx(idx)}
                      style={{
                        padding: '12px 10px', border: 'none',
                        borderBottom: isSelected ? `2.5px solid ${BRAND}` : '2.5px solid transparent',
                        background: 'transparent', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        minWidth: '64px', transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {DAYS[idx]}
                      </span>
                      <span style={{
                        fontSize: '18px', fontWeight: 700,
                        color: isSelected ? BRAND : isToday ? '#2563eb' : '#374151',
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: isToday && !isSelected ? '#eff6ff' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {date.getDate()}
                      </span>
                      <span style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: dotVisible ? (isSelected ? BRAND : '#d1d5db') : 'transparent',
                      }} />
                    </button>
                  );
                })}
              </div>

              {/* Sessions for selected day */}
              <div style={{ padding: '16px 20px' }}>
                {filteredDaySessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '52px 0', color: '#9ca3af' }}>
                    <Calendar size={40} style={{ margin: '0 auto 12px', color: '#d1d5db' }} />
                    <p style={{ fontSize: '15px', fontWeight: 500, margin: '0 0 6px' }}>No sessions scheduled</p>
                    <p style={{ fontSize: '13px', margin: '0 0 18px' }}>
                      {searchTerm ? 'No results match your search' : `Nothing scheduled for ${fmtDate(selectedDate)}`}
                    </p>
                    <button
                      onClick={() => setActiveTab('schedule')}
                      style={{
                        padding: '9px 20px', borderRadius: '8px', border: 'none',
                        background: BRAND, color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                      }}
                    >
                      <Plus size={15} /> Schedule a Session
                    </button>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {['Player', 'Coach', 'Time', 'Session', 'Status', 'Action'].map(h => (
                            <th key={h} style={{
                              padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700,
                              color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px',
                              borderBottom: '1px solid #f3f4f6',
                            }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDaySessions.map(session => (
                          <tr key={session.scheduleId} style={{ borderBottom: '1px solid #f9fafb' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '13px 12px' }}>
                              <button
                                onClick={() => navigate(`/admin/attendance/player/${session.playerId}`)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: BRAND, fontWeight: 700, fontSize: '14px', padding: 0 }}
                              >
                                {session.playerName}
                              </button>
                            </td>
                            <td style={{ padding: '13px 12px', fontSize: '14px', color: '#374151' }}>
                              {session.coachName || '—'}
                            </td>
                            <td style={{ padding: '13px 12px', fontSize: '14px', color: '#374151' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={13} color="#9ca3af" /> {session.timeSlot}
                              </span>
                            </td>
                            <td style={{ padding: '13px 12px', fontSize: '13px', color: '#6b7280' }}>
                              {session.sessionNumber ? `Session ${session.sessionNumber}` : '—'}
                              {session.sessionTopic ? ` · ${session.sessionTopic}` : ''}
                            </td>
                            <td style={{ padding: '13px 12px' }}>
                              <StatusBadge status={session.status} />
                            </td>
                            <td style={{ padding: '13px 12px' }}>
                              {session.status === 'scheduled' ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={() => handleMarkAttendance(session, 'present')}
                                    style={{
                                      padding: '5px 12px', borderRadius: '6px', border: 'none',
                                      background: '#dcfce7', color: '#16a34a', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#bbf7d0'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#dcfce7'}
                                  >
                                    Present
                                  </button>
                                  <button
                                    onClick={() => handleMarkAttendance(session, 'absent')}
                                    style={{
                                      padding: '5px 12px', borderRadius: '6px', border: 'none',
                                      background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}
                                  >
                                    Absent
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: '13px', color: '#d1d5db' }}>—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ SCHEDULE TAB ═══════════════ */}
        {activeTab === 'schedule' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr)', gap: '20px', alignItems: 'start' }}>

            {/* Form card */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>
                Schedule a Session
              </h2>

              <form onSubmit={handleScheduleSubmit}>
                {/* Player */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Player *
                  </label>
                  {playersLoading ? (
                    <p style={{ fontSize: '13px', color: '#9ca3af' }}>Loading players…</p>
                  ) : (
                    <select
                      value={scheduleForm.playerId}
                      onChange={e => setScheduleForm(f => ({ ...f, playerId: e.target.value }))}
                      required
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: '8px',
                        border: '1.5px solid #e5e7eb', fontSize: '14px', color: '#111827',
                        outline: 'none', background: 'white', cursor: 'pointer', boxSizing: 'border-box',
                      }}
                      onFocus={e => { e.target.style.borderColor = BRAND; e.target.style.boxShadow = '0 0 0 3px rgba(6,0,48,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                    >
                      <option value="">Select a player</option>
                      {players.map(p => (
                        <option key={p.playerId} value={p.playerId}>
                          {p.playerName || p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Recurring toggle */}
                <div style={{ marginBottom: '16px' }}>
                  <div
                    onClick={() => setScheduleForm(f => ({ ...f, isRecurring: !f.isRecurring }))}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', width: 'fit-content' }}
                  >
                    <div style={{
                      width: '42px', height: '24px', borderRadius: '12px',
                      background: scheduleForm.isRecurring ? BRAND : '#e5e7eb',
                      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                    }}>
                      <div style={{
                        position: 'absolute', width: '18px', height: '18px', borderRadius: '50%',
                        background: 'white', top: '3px',
                        left: scheduleForm.isRecurring ? '21px' : '3px',
                        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151', userSelect: 'none' }}>
                      {scheduleForm.isRecurring ? 'Recurring session' : 'One-time session'}
                    </span>
                  </div>
                </div>

                {/* Date or Recurring day */}
                {scheduleForm.isRecurring ? (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Repeats Every *
                    </label>
                    <select
                      value={scheduleForm.recurringDay}
                      onChange={e => setScheduleForm(f => ({ ...f, recurringDay: e.target.value }))}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: '8px',
                        border: '1.5px solid #e5e7eb', fontSize: '14px', color: '#111827',
                        outline: 'none', background: 'white', boxSizing: 'border-box',
                      }}
                      onFocus={e => { e.target.style.borderColor = BRAND; }}
                      onBlur={e => { e.target.style.borderColor = '#e5e7eb'; }}
                    >
                      {RECURRING_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                ) : (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Date *
                    </label>
                    <input
                      type="date"
                      value={scheduleForm.date}
                      onChange={e => setScheduleForm(f => ({ ...f, date: e.target.value }))}
                      required={!scheduleForm.isRecurring}
                      min={new Date().toISOString().split('T')[0]}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: '8px',
                        border: '1.5px solid #e5e7eb', fontSize: '14px', color: '#111827',
                        outline: 'none', boxSizing: 'border-box',
                      }}
                      onFocus={e => { e.target.style.borderColor = BRAND; }}
                      onBlur={e => { e.target.style.borderColor = '#e5e7eb'; }}
                    />
                  </div>
                )}

                {/* Time slot */}
                <div style={{ marginBottom: '22px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Time Slot *
                  </label>
                  <select
                    value={scheduleForm.timeSlot}
                    onChange={e => setScheduleForm(f => ({ ...f, timeSlot: e.target.value }))}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: '8px',
                      border: '1.5px solid #e5e7eb', fontSize: '14px', color: '#111827',
                      outline: 'none', background: 'white', boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.target.style.borderColor = BRAND; }}
                    onBlur={e => { e.target.style.borderColor = '#e5e7eb'; }}
                  >
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={scheduleLoading}
                  style={{
                    width: '100%', padding: '11px', borderRadius: '8px', border: 'none',
                    background: `linear-gradient(135deg, ${BRAND}, #000000ff)`,
                    color: 'white', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    opacity: scheduleLoading ? 0.7 : 1, transition: 'opacity 0.2s',
                  }}
                >
                  {scheduleLoading
                    ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Scheduling…</>
                    : <><Plus size={16} /> Schedule Session</>
                  }
                </button>
              </form>
            </div>

            {/* Existing schedules */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>
                All Scheduled Sessions ({scheduledSessions.length})
              </h2>
              {scheduledSessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
                  <Calendar size={36} style={{ margin: '0 auto 10px', color: '#d1d5db' }} />
                  <p style={{ fontSize: '14px', margin: 0 }}>No sessions scheduled yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '480px', overflowY: 'auto' }}>
                  {scheduledSessions.map(session => (
                    <div
                      key={session.scheduleId}
                      style={{
                        padding: '14px 16px', borderRadius: '10px',
                        border: '1px solid #f3f4f6', background: '#fafafa',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                      }}
                    >
                      <div>
                        <p style={{ margin: '0 0 3px', fontWeight: 600, fontSize: '14px', color: '#111827' }}>
                          {session.playerName}
                        </p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                          {session.isRecurring
                            ? `Every ${session.recurringDay} · ${session.timeSlot}`
                            : `${session.scheduledDate} · ${session.timeSlot}`}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {session.isRecurring && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: '#ede9fe', color: '#7c3aed', fontWeight: 600 }}>
                            Recurring
                          </span>
                        )}
                        <StatusBadge status={session.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ CARRY-FORWARD TAB ═══════════════ */}
        {activeTab === 'carryforward' && (
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #f3f4f6',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
            }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
                  Carry-Forward Queue
                </h2>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                  Sessions missed by players — reschedule to a new date
                </p>
              </div>
              <span style={{
                padding: '4px 14px', borderRadius: '999px', fontSize: '14px', fontWeight: 700,
                background: pendingCFs.length > 0 ? '#fef3c7' : '#f3f4f6',
                color: pendingCFs.length > 0 ? '#d97706' : '#6b7280',
              }}>
                {pendingCFs.length} pending
              </span>
            </div>

            <div style={{ padding: '24px' }}>
              {pendingCFs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#9ca3af' }}>
                  <RefreshCw size={40} style={{ margin: '0 auto 12px', color: '#d1d5db' }} />
                  <p style={{ fontSize: '15px', fontWeight: 500, margin: '0 0 6px' }}>No pending carry-forwards</p>
                  <p style={{ fontSize: '13px', margin: 0 }}>
                    When a player is marked absent, their session appears here for rescheduling
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {pendingCFs.map(cf => (
                    <div
                      key={cf.carryForwardId}
                      style={{ padding: '20px', borderRadius: '12px', border: '1.5px solid #fde68a', background: '#fffbeb' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <AlertTriangle size={16} color="#d97706" />
                            <span style={{ fontWeight: 700, fontSize: '16px', color: '#111827' }}>{cf.playerName}</span>
                          </div>
                          {cf.sessionNumber && (
                            <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#374151' }}>
                              <strong>Session {cf.sessionNumber}</strong>
                              {cf.sessionTopic ? ` · ${cf.sessionTopic}` : ''}
                            </p>
                          )}
                          <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
                            Missed on {cf.originalDate}
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                              Reschedule to
                            </label>
                            <input
                              type="date"
                              value={rescheduleMap[cf.carryForwardId] || ''}
                              min={new Date().toISOString().split('T')[0]}
                              onChange={e => setRescheduleMap(m => ({ ...m, [cf.carryForwardId]: e.target.value }))}
                              style={{
                                padding: '7px 10px', borderRadius: '8px', border: '1.5px solid #e5e7eb',
                                fontSize: '13px', color: '#111827', outline: 'none',
                              }}
                              onFocus={e => { e.target.style.borderColor = BRAND; }}
                              onBlur={e => { e.target.style.borderColor = '#e5e7eb'; }}
                            />
                          </div>
                          <button
                            onClick={() => handleReschedule(cf.carryForwardId)}
                            style={{
                              padding: '8px 18px', borderRadius: '8px', border: 'none',
                              background: BRAND, color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={() => handleCancelCarryForward(cf.carryForwardId)}
                            style={{
                              padding: '8px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
                              background: 'white', color: '#6b7280', cursor: 'pointer', fontSize: '13px',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Resolved */}
              {resolvedCFs.length > 0 && (
                <div style={{ marginTop: '28px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 12px' }}>
                    Resolved
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {resolvedCFs.map(cf => (
                      <div
                        key={cf.carryForwardId}
                        style={{
                          padding: '14px 16px', borderRadius: '10px',
                          border: '1px solid #f3f4f6', background: '#f9fafb',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}
                      >
                        <div>
                          <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: '14px', color: '#374151' }}>
                            {cf.playerName}
                          </p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                            Missed: {cf.originalDate}
                            {cf.rescheduledDate ? `  →  Rescheduled: ${cf.rescheduledDate}` : ''}
                          </p>
                        </div>
                        <StatusBadge status={cf.status === 'completed' ? 'rescheduled' : 'cancelled'} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .att-schedule-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </Layout>
  );
}
