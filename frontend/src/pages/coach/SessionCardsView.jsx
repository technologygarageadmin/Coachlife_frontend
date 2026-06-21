import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, Plus, Inbox, ChevronLeft, Search, Filter, TrendingUp, CheckCircle, Calendar, BookOpen, Star, Zap, Activity, Tag, Award } from 'lucide-react';

const PALETTES = [
  ['#6366F1','#818CF8'], ['#10B981','#34D399'], ['#F59E0B','#FBBF24'],
  ['#EC4899','#F472B6'], ['#3B82F6','#60A5FA'], ['#8B5CF6','#A78BFA'],
  ['#EF4444','#F87171'], ['#06B6D4','#22D3EE'],
];
const pal = (name = '') => PALETTES[(name.charCodeAt(0) || 0) % PALETTES.length];

const Sk = ({ w, h, r = 8 }) => (
  <div style={{ width:w, height:h, borderRadius:r, background:'#EEF2F7', animation:'skPulse 1.6s ease-in-out infinite', flexShrink:0 }} />
);

const normalizeStatus = (status) => {
  if (!status) return '';
  return status.toLowerCase().replace(/[\s_]/g, '');
};

const isInProgress = (status) => normalizeStatus(status) === 'inprogress';
const isCompleted = (status) => normalizeStatus(status) === 'completed';
const isPending = (status) => normalizeStatus(status) === 'pending';

const SessionCard = memo(({ session, isCompletedSession, navigate, selectedPlayer, shouldShowStartButton }) => {
  const statusColor = isCompleted(session.status) ? '#10B981'
    : isInProgress(session.status) ? '#6366F1'
    : isPending(session.status) ? '#D97706'
    : '#94A3B8';
  const statusBg = isCompleted(session.status) ? 'rgba(16,185,129,0.1)'
    : isInProgress(session.status) ? 'rgba(99,102,241,0.1)'
    : isPending(session.status) ? '#FEF3C7'
    : '#F8FAFC';

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '16px',
      border: '2px solid #E2E8F0',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      transition: 'all 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      cursor: 'pointer',
      position: 'relative'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.12)';
      e.currentTarget.style.borderColor = statusColor;
      e.currentTarget.style.transform = 'translateY(-4px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
      e.currentTarget.style.borderColor = '#E2E8F0';
      e.currentTarget.style.transform = 'translateY(0)';
    }}>
      {/* Top accent bar */}
      <div style={{ height: '4px', background: statusColor }} />

      {/* Header with Session Number and Status Badge */}
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #E2E8F0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: statusBg,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            color: statusColor,
            fontSize: '14px'
          }}>
            {session.session || session.sessionNumber || 1}
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', margin: 0, textTransform: 'uppercase' }}>Session</p>
          </div>
        </div>
        <span style={{
          padding: '6px 12px',
          background: statusBg,
          color: statusColor,
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {isCompleted(session.status) ? 'Completed' : isInProgress(session.status) ? 'In Progress' : isPending(session.status) ? 'Pending' : session.status || 'Draft'}
        </span>
      </div>

      {/* Main Content */}
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: '0 0 8px 0', lineHeight: '1.4' }}>
          {session.Topic || session.title || 'Session'}
        </h3>
        <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 16px 0', lineHeight: '1.6', minHeight: '32px' }}>
          {(session.Objective || session.description || 'No description').replace(/<[^>]+>/g, '')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {session.LearningPathway && (
            <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px', minHeight: '44px' }}>
              <BookOpen size={14} style={{ color: '#94A3B8', marginTop: '3px', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '10px', color: '#94A3B8', margin: 0, marginBottom: '2px', textTransform: 'uppercase', fontWeight: '600' }}>Pathway</p>
                <p style={{ fontSize: '12px', color: '#0F172A', margin: 0, fontWeight: '600' }}>{session.LearningPathway}</p>
              </div>
            </div>
          )}
          {session.SessionType && (
            <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px', minHeight: '44px' }}>
              <Tag size={14} style={{ color: '#94A3B8', marginTop: '3px', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '10px', color: '#94A3B8', margin: 0, marginBottom: '2px', textTransform: 'uppercase', fontWeight: '600' }}>Type</p>
                <p style={{ fontSize: '12px', color: '#0F172A', margin: 0, fontWeight: '600' }}>{session.SessionType}</p>
              </div>
            </div>
          )}
          <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px', minHeight: '44px' }}>
            <Calendar size={14} style={{ color: '#94A3B8', marginTop: '3px', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '10px', color: '#94A3B8', margin: 0, marginBottom: '2px', textTransform: 'uppercase', fontWeight: '600' }}>Date</p>
              <p style={{ fontSize: '12px', color: '#0F172A', margin: 0, fontWeight: '600' }}>
                {session.createdAt
                  ? new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '-'}
              </p>
            </div>
          </div>
          {session.totalPoints != null && (
            <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '8px', minHeight: '44px' }}>
              <Star size={14} style={{ color: '#94A3B8', marginTop: '3px', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '10px', color: '#94A3B8', margin: 0, marginBottom: '2px', textTransform: 'uppercase', fontWeight: '600' }}>Points</p>
                <p style={{ fontSize: '12px', color: '#0F172A', margin: 0, fontWeight: '600' }}>{session.totalPoints}</p>
              </div>
            </div>
          )}
        </div>

        {isPending(session.status) && (
          <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={14} style={{ color: '#D97706', flexShrink: 0 }} />
            <p style={{ fontSize: '12px', color: '#92400E', fontWeight: '600', margin: 0 }}>
              {session.attendanceDate ? `Missed on ${session.attendanceDate}` : 'Session missed - complete as make-up'}
            </p>
          </div>
        )}

        {session.activities && session.activities.length > 0 && (
          <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
            <p style={{ fontSize: '12px', color: '#475569', fontWeight: '600', margin: 0 }}>
              {session.activities.length} {session.activities.length === 1 ? 'Activity' : 'Activities'}
            </p>
          </div>
        )}

        {isCompletedSession && session.rating && (
          <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
            <p style={{ fontSize: '12px', color: '#475569', fontWeight: '600', margin: 0 }}>
              Rated {session.rating}/5
            </p>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
        <button
          onClick={() => {
            if (isCompletedSession) {
              navigate(`/coach/view-completed-session/${session._id || session.sessionId}`, {
                state: { session, player: selectedPlayer }
              });
            } else {
              navigate(`/coach/session/${session._id || session.sessionId}`, {
                state: { session, player: selectedPlayer }
              });
            }
          }}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 16px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '700',
            transition: 'all 0.2s ease',
            letterSpacing: '0.5px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.background = '#374151';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)';
          }}
        >
          {isCompletedSession ? 'View Details' : isInProgress(session.status) ? 'Continue Session' : (shouldShowStartButton(session) ? 'Start' : 'View Details')}
        </button>
      </div>
    </div>
  );
});

export const SessionCardsView = ({
  selectedPlayer,
  sessions,
  isGenerating,
  isLoading = false,
  generateError,
  onGenerateCard,
  onBack,
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('all');
  const [emptyStateLoading, setEmptyStateLoading] = useState(true);

  const filteredSessions = useMemo(() => {
    let filtered = sessions.filter(s => {
      const matchesSearch = !searchTerm ||
        (s.Topic || s.title || '')?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.Objective || s.description || '')?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || s.status === filterStatus;
      return matchesSearch && matchesFilter;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      } else if (sortBy === 'points') {
        return (b.totalPoints || 0) - (a.totalPoints || 0);
      }
      return 0;
    });

    return filtered;
  }, [sessions, searchTerm, filterStatus, sortBy]);

  const stats = useMemo(() => ({
    total: sessions.length,
    upcoming: sessions.filter(s => s.status !== 'completed').length,
    completed: sessions.filter(s => s.status === 'completed').length,
    totalPoints: sessions.reduce((sum, s) => sum + (s.totalPoints || 0), 0)
  }), [sessions]);

  const handleBackClick = () => onBack ? onBack() : navigate('/coach/start-session');

  // Set 5 second delay for empty state loading
  useEffect(() => {
    if (sessions.length === 0 && isLoading === false) {
      const timer = setTimeout(() => {
        setEmptyStateLoading(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [sessions.length, isLoading]);

  const shouldShowStartButton = useCallback((session) => {
    if (isInProgress(session.status) || isCompleted(session.status)) {
      return false;
    }

    const hasInProgressSession = sessions.some(s => isInProgress(s.status));
    if (hasInProgressSession) {
      return false;
    }

    // Pending (missed) sessions can always be started as a make-up
    if (isPending(session.status)) {
      return true;
    }

    // Upcoming sessions: only show Start for the next sequential card
    const completedSessions = sessions
      .filter(s => isCompleted(s.status))
      .sort((a, b) => {
        const sessionNumA = a.session || a.sessionNumber || 0;
        const sessionNumB = b.session || b.sessionNumber || 0;
        return sessionNumB - sessionNumA;
      });

    const latestCompletedSessionNum = completedSessions.length > 0
      ? (completedSessions[0].session || completedSessions[0].sessionNumber || 0)
      : 0;

    const currentSessionNum = session.session || session.sessionNumber || 0;
    return currentSessionNum === (latestCompletedSessionNum + 1);
  }, [sessions]);


  return (
    <div>
      <style>{`
        @keyframes skPulse { 0%,100%{opacity:.5}50%{opacity:1} }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
        {/* Back Button */}
        <div style={{ marginBottom: '32px' }}>
          <button
            onClick={handleBackClick}
            style={{
              background: '#F8FAFC',
              border: '1.5px solid #E2E8F0',
              borderRadius: '10px',
              padding: '10px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#0F172A',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(99,102,241,0.1)';
              e.currentTarget.style.borderColor = '#6366F1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#F8FAFC';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}
          >
            <ChevronLeft size={18} />
            Back
          </button>
        </div>

        {/* Show Skeleton Loading */}
        {isLoading ? (
          <>
            {/* Skeleton Player Header */}
            <div style={{
              background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
              color: 'white',
              padding: '40px 32px',
              marginBottom: '32px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  height: '32px',
                  width: '300px',
                  background: 'rgba(200, 200, 200, 0.3)',
                  borderRadius: '6px',
                  marginBottom: '12px'
                }} />
                <div style={{
                  height: '16px',
                  width: '200px',
                  background: 'rgba(200, 200, 200, 0.3)',
                  borderRadius: '6px'
                }} />
              </div>

              {/* Skeleton Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    animation: `pulse 2s ease-in-out infinite ${i * 0.1}s`
                  }}>
                    <div style={{
                      height: '12px',
                      width: '80px',
                      background: 'rgba(200, 200, 200, 0.3)',
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }} />
                    <div style={{
                      height: '24px',
                      width: '60px',
                      background: 'rgba(200, 200, 200, 0.3)',
                      borderRadius: '4px'
                    }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Skeleton Search Bar */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'center',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              <div style={{
                flex: 1,
                minWidth: '250px',
                height: '40px',
                background: '#EEF2F7',
                borderRadius: '8px',
                border: '1px solid #E2E8F0'
              }} />
              <div style={{
                width: '120px',
                height: '40px',
                background: '#EEF2F7',
                borderRadius: '8px',
                border: '1px solid #E2E8F0'
              }} />
              <div style={{
                width: '120px',
                height: '40px',
                background: '#EEF2F7',
                borderRadius: '8px',
                border: '1px solid #E2E8F0'
              }} />
              <div style={{
                width: '100px',
                height: '40px',
                background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
                borderRadius: '8px'
              }} />
            </div>

            {/* Skeleton Session Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px'
            }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    border: '2px solid #E2E8F0',
                    padding: '20px',
                    animation: `pulse 2s ease-in-out infinite ${i * 0.1}s`
                  }}
                >
                  {/* Skeleton Header */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      height: '20px',
                      width: '80px',
                      background: '#EEF2F7',
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }} />
                    <div style={{
                      height: '24px',
                      width: '90%',
                      background: '#EEF2F7',
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }} />
                    <div style={{
                      height: '16px',
                      width: '70%',
                      background: '#EEF2F7',
                      borderRadius: '4px'
                    }} />
                  </div>

                  {/* Skeleton Description */}
                  <div style={{ marginBottom: '16px' }}>
                    {[1, 2, 3].map((j) => (
                      <div
                        key={j}
                        style={{
                          height: '12px',
                          width: '100%',
                          background: '#EEF2F7',
                          borderRadius: '4px',
                          marginBottom: j < 3 ? '8px' : '0'
                        }}
                      />
                    ))}
                  </div>

                  {/* Skeleton Stats */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} style={{
                        height: '60px',
                        background: '#EEF2F7',
                        borderRadius: '8px'
                      }} />
                    ))}
                  </div>

                  {/* Skeleton Button */}
                  <div style={{
                    height: '40px',
                    background: '#EEF2F7',
                    borderRadius: '8px'
                  }} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Player Header */}
            <div style={{
              background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
              color: 'white',
              padding: '40px 32px',
              marginBottom: '32px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 8px 0' }}>
                  {selectedPlayer.name}
                </h1>
                <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
                  {selectedPlayer.email}
                </p>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase' }}>Total Sessions</p>
                  <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{stats.total}</p>
                </div>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase' }}>Upcoming</p>
                  <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{stats.upcoming}</p>
                </div>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase' }}>Completed</p>
                  <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{stats.completed}</p>
                </div>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase' }}>Total Points</p>
                  <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{stats.totalPoints}</p>
                </div>
              </div>
            </div>

        {/* Main Content */}
        <>
          {/* Search & Filters - Always show if sessions exist or to allow generating new ones */}
          {sessions.length > 0 && (
              <div style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '16px',
                marginBottom: '24px',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'center'
              }}>
                <div style={{
                  flex: 1,
                  minWidth: '250px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                }}>
                  <Search size={16} color="#94A3B8" />
                  <input
                    type="text"
                    placeholder="Search sessions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      flex: 1,
                      border: '1px solid #E2E8F0',
                      background: 'transparent',
                      fontSize: '14px',
                      color: '#0F172A'
                    }}
                  />
                </div>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '13px',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                    color: '#0F172A'
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="pending">Pending</option>
                  <option value="draft">Draft</option>
                  <option value="completed">Completed</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '13px',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                    color: '#0F172A'
                  }}
                >
                  <option value="date">Sort by Date</option>
                  <option value="points">Sort by Points</option>
                </select>

                <button
                  onClick={() => {
                    console.log('Generate button clicked in search bar');
                    console.log('onGenerateCard:', onGenerateCard);
                    console.log('isGenerating:', isGenerating);
                    if (onGenerateCard) {
                      onGenerateCard();
                    } else {
                      console.error('onGenerateCard is not defined');
                    }
                  }}
                  disabled={isGenerating}
                  style={{
                    background: isGenerating ? '#E5E7EB' : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isGenerating ? <Loader size={14} /> : <Plus size={14} />}
                  {isGenerating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            )}

            {generateError && (
              <div style={{
                background: '#FEE2E2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '20px',
                color: '#DC2626',
                fontSize: '13px'
              }}>
                {generateError}
              </div>
            )}

            {/* Sessions Grid */}
            {filteredSessions.length > 0 ? (
              <>
                {/* In Progress */}
                {filteredSessions.filter(s => isInProgress(s.status)).length > 0 && (
                  <div style={{ marginBottom: '48px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '24px'
                    }}>
                      <div style={{
                        width: '4px',
                        height: '28px',
                        background: '#6366F1',
                        borderRadius: '2px'
                      }} />
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                        In Progress
                      </h3>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        background: '#F8FAFC',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#475569'
                      }}>
                        {filteredSessions.filter(s => isInProgress(s.status)).length}
                      </span>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                      gap: '20px'
                    }}>
                      {filteredSessions.filter(s => isInProgress(s.status)).map((session, i) => (
                        <SessionCard key={i} session={session} isCompletedSession={false} navigate={navigate} selectedPlayer={selectedPlayer} shouldShowStartButton={shouldShowStartButton} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending (missed sessions available as make-up) */}
                {filteredSessions.filter(s => isPending(s.status)).length > 0 && (
                  <div style={{ marginBottom: '48px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '24px'
                    }}>
                      <div style={{
                        width: '4px',
                        height: '28px',
                        background: '#D97706',
                        borderRadius: '2px'
                      }} />
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                        Pending Sessions
                      </h3>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        background: '#FEF3C7',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#92400E'
                      }}>
                        {filteredSessions.filter(s => isPending(s.status)).length}
                      </span>
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>Missed - complete as make-up</span>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                      gap: '20px'
                    }}>
                      {filteredSessions.filter(s => isPending(s.status)).map((session, i) => (
                        <SessionCard key={i} session={session} isCompletedSession={false} navigate={navigate} selectedPlayer={selectedPlayer} shouldShowStartButton={shouldShowStartButton} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming */}
                {filteredSessions.filter(s => !isCompleted(s.status) && !isInProgress(s.status) && !isPending(s.status)).length > 0 && (
                  <div style={{ marginBottom: '48px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '24px'
                    }}>
                      <div style={{
                        width: '4px',
                        height: '28px',
                        background: '#6366F1',
                        borderRadius: '2px'
                      }} />
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                        Upcoming
                      </h3>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        background: '#F8FAFC',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#475569'
                      }}>
                        {filteredSessions.filter(s => !isCompleted(s.status) && !isInProgress(s.status) && !isPending(s.status)).length}
                      </span>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                      gap: '20px'
                    }}>
                      {filteredSessions.filter(s => !isCompleted(s.status) && !isInProgress(s.status) && !isPending(s.status)).map((session, i) => (
                        <SessionCard key={i} session={session} isCompletedSession={false} navigate={navigate} selectedPlayer={selectedPlayer} shouldShowStartButton={shouldShowStartButton} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed */}
                {filteredSessions.filter(s => isCompleted(s.status)).length > 0 && (
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '24px'
                    }}>
                      <div style={{
                        width: '4px',
                        height: '28px',
                        background: '#6366F1',
                        borderRadius: '2px'
                      }} />
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                        Completed
                      </h3>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        background: '#F8FAFC',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#475569'
                      }}>
                        {filteredSessions.filter(s => isCompleted(s.status)).length}
                      </span>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                      gap: '20px'
                    }}>
                      {filteredSessions.filter(s => isCompleted(s.status)).map((session, i) => (
                        <SessionCard key={i} session={session} isCompletedSession={true} navigate={navigate} selectedPlayer={selectedPlayer} shouldShowStartButton={shouldShowStartButton} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div>
                {/* No sessions at all */}
                {sessions.length === 0 ? (
                  emptyStateLoading ? (
                    // Skeleton Loading for 5 seconds
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      padding: '60px 32px',
                      textAlign: 'center',
                      animation: 'pulse 2s ease-in-out infinite'
                    }}>
                      <div style={{
                        width: '100px',
                        height: '100px',
                        background: '#EEF2F7',
                        borderRadius: '50%',
                        margin: '0 auto 16px',
                        animation: 'pulse 2s ease-in-out infinite'
                      }} />
                      <div style={{
                        width: '200px',
                        height: '24px',
                        background: '#EEF2F7',
                        borderRadius: '6px',
                        margin: '0 auto 12px',
                        animation: 'pulse 2s ease-in-out infinite'
                      }} />
                      <div style={{
                        width: '300px',
                        height: '16px',
                        background: '#EEF2F7',
                        borderRadius: '6px',
                        margin: '0 auto 24px',
                        animation: 'pulse 2s ease-in-out infinite'
                      }} />
                      <div style={{
                        width: '140px',
                        height: '40px',
                        background: '#EEF2F7',
                        borderRadius: '8px',
                        margin: '0 auto',
                        animation: 'pulse 2s ease-in-out infinite'
                      }} />
                    </div>
                  ) : (
                    // Actual Empty State
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      padding: '60px 32px',
                      textAlign: 'center'
                    }}>
                      <Inbox size={48} style={{ opacity: 0.3, color: '#D1D5DB', marginBottom: '16px' }} />
                      <p style={{ fontSize: '16px', fontWeight: '600', color: '#0F172A', margin: '0 0 8px 0' }}>
                        No sessions yet
                      </p>
                      <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 24px 0' }}>
                        Create your first session to get started
                      </p>
                      <button
                        onClick={() => {
                          console.log('Generate First Session button clicked');
                          console.log('onGenerateCard:', onGenerateCard);
                          console.log('isGenerating:', isGenerating);
                          if (onGenerateCard) {
                            onGenerateCard();
                          } else {
                            console.error('onGenerateCard is not defined');
                          }
                        }}
                        disabled={isGenerating}
                        style={{
                          background: isGenerating ? '#E5E7EB' : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '12px 24px',
                          cursor: isGenerating ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isGenerating) {
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        {isGenerating ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
                        {isGenerating ? 'Generating...' : 'Generate First Session'}
                      </button>
                    </div>
                  )
                ) : (
                  <div style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    padding: '60px 32px',
                    textAlign: 'center'
                  }}>
                    <Inbox size={48} style={{ opacity: 0.3, color: '#D1D5DB', marginBottom: '16px' }} />
                    <p style={{ fontSize: '16px', fontWeight: '600', color: '#0F172A', margin: '0 0 8px 0' }}>
                      No matching sessions
                    </p>
                    <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
                      Try adjusting your search or filters
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        </>
        )}
      </div>
    </div>
  );
};
