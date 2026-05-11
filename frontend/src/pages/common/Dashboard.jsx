import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Users, TrendingUp, Award, Zap, BarChart3, Settings, Target, CheckCircle2, AlertCircle, BookOpen, Trophy, Link2, Plus } from 'lucide-react';

const Dashboard = () => {
  const { currentUser, players, coaches, sessionHistory, sessionDrafts, fetchCoaches, fetchPlayers } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedInitial] = useState(false);

  const isAdmin = currentUser?.roles?.includes('admin') || currentUser?.role === 'admin';

  useEffect(() => {
    // Only fetch if data is empty (first load)
    if (!hasLoadedInitial) {
      let loadingTimer;
      const startTime = Date.now();
      
      const fetchData = async () => {
        if (players.length === 0) {
          await fetchPlayers();
        }
        if (isAdmin && coaches.length === 0) {
          await fetchCoaches();
        }
        
        // Calculate elapsed time and wait at least 300ms for better UX
        // (but don't wait if data loads quickly)
        const elapsedTime = Date.now() - startTime;
        const minLoadTime = 300;
        const remainingTime = Math.max(0, minLoadTime - elapsedTime);
        
        loadingTimer = setTimeout(() => setIsLoading(false), remainingTime);
      };
      
      fetchData();
      
      return () => clearTimeout(loadingTimer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoadedInitial]);

  // Admin Stats
  const totalPlayers = players.length;
  const totalCoaches = coaches.length;
  const totalSessions = sessionHistory.length;
  const completedSessions = sessionHistory.filter(s => s.status === 'completed').length;
  const adminCompletionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
  const topPerformers = players
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 5);

  // Coach Stats
  const myplayers = players.filter((p) => p.primaryCoach === currentUser.id);
  const mySessions = sessionHistory.filter((s) => s.coachId === currentUser.id);
  const myDrafts = sessionDrafts.filter((s) => s.coachId === currentUser.id);
  const coachAvgRating = mySessions.length > 0 
    ? (mySessions.reduce((sum, s) => sum + (s.rating || 0), 0) / mySessions.length).toFixed(1)
    : 0;
  const topCoachPlayers = myplayers.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)).slice(0, 3);

  if (isLoading) {
    return (
      <Layout>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(6, 0, 48, 0.4) 0%, rgba(0, 0, 0, 0.4) 100%)',
            padding: '40px 32px',
            marginBottom: '32px',
            borderRadius: '12px',
            border: '1px solid rgba(226, 232, 240, 0.3)'
          }}>
            <div style={{ maxWidth: '1400px' }}>
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  width: '280px',
                  height: '32px',
                  background: 'rgba(200, 200, 200, 0.3)',
                  borderRadius: '6px',
                  marginBottom: '12px',
                  animation: 'pulse 2s ease-in-out infinite'
                }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} style={{
                    background: 'rgba(248, 250, 252, 0.5)',
                    borderRadius: '8px',
                    padding: '16px',
                    animation: `pulse 2s ease-in-out infinite ${i * 0.1}s`
                  }}>
                    <div style={{
                      width: '60%',
                      height: '20px',
                      background: 'rgba(200, 200, 200, 0.3)',
                      borderRadius: '6px',
                      marginBottom: '12px'
                    }} />
                    <div style={{
                      width: '40%',
                      height: '28px',
                      background: 'rgba(200, 200, 200, 0.3)',
                      borderRadius: '6px'
                    }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 0.7; }
            }
          `}</style>
        </div>
      </Layout>
    );
  }

  // Admin View
  if (isAdmin) {
    return (
      <Layout>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
          {/* Header Section with Stats */}
          <div style={{
            background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
            backdropFilter: 'blur(20px)',
            color: 'white',
            padding: '40px 32px',
            marginBottom: '32px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px rgba(37, 44, 53, 0.15)'
          }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '24px'
              }}>
                <div>
                  <h1 style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    margin: '0 0 4px 0'
                  }}>
                    Dashboard
                  </h1>
                  <p style={{
                    fontSize: '14px',
                    opacity: 0.9,
                    margin: 0
                  }}>
                    Welcome back! Here's your system overview with {totalPlayers} players and {totalCoaches} coaches
                  </p>
                </div>
                <Link to="/admin/analytics" style={{ textDecoration: 'none' }}>
                  <button style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                  }}>
                    <BarChart3 size={16} />
                    View Analytics
                  </button>
                </Link>
              </div>

              {/* Stats Inside Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '16px'
              }}>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Players</p>
                  <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{totalPlayers}</p>
                </div>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Coaches</p>
                  <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{totalCoaches}</p>
                </div>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Sessions</p>
                  <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{totalSessions}</p>
                </div>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completion Rate</p>
                  <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{adminCompletionRate}%</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: '0 32px' }}>
            {/* Quick Actions - Enhanced */}
            <div style={{ marginBottom: '40px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                marginBottom: '20px'
              }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1f2937', margin: 0 }}>Management Center</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                {[
                  { to: '/admin/players', icon: Users, label: 'Players', color: '#0EA5E9' },
                  { to: '/admin/coaches', icon: Award, label: 'Coaches', color: '#10B981' },
                  { to: '/admin/assign-players', icon: Link2, label: 'Assignments', color: '#F59E0B' },
                  { to: '/admin/rewards', icon: Trophy, label: 'Rewards', color: '#EC4899' },
                  { to: '/admin/learning-pathway', icon: TrendingUp, label: 'Learning', color: '#8B5CF6' },
                  { to: '/admin/redeem-history', icon: Zap, label: 'Redemptions', color: '#EF4444' },
                ].map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <Link key={idx} to={action.to} style={{ textDecoration: 'none' }}>
                      <div style={{
                        padding: '20px 16px',
                        border: `2px solid ${action.color}20`,
                        borderRadius: '12px',
                        backgroundColor: `${action.color}08`,
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        color: action.color,
                        fontWeight: '600',
                        fontSize: '13px',
                        height: '100%'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = action.color;
                        e.currentTarget.style.backgroundColor = `${action.color}15`;
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = `0 8px 16px ${action.color}25`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = `${action.color}20`;
                        e.currentTarget.style.backgroundColor = `${action.color}08`;
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          background: `${action.color}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Icon size={20} color={action.color} />
                        </div>
                        {action.label}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            
            <div style={{ marginBottom: '40px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '20px'
              }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1f2937', margin: 0 }}>Top Performers</h2>
                <span style={{ fontSize: '12px', color: '#999', fontWeight: '500' }}>{topPerformers.length} leading players</span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                {topPerformers.map((player, idx) => (
                  <div key={player.playerId} style={{
                    backgroundColor: 'white',
                    borderRadius: '14px',
                    padding: '20px',
                    boxShadow: idx === 0 ? '0 8px 24px rgba(255, 215, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
                    border: idx === 0 ? '2px solid #FFD700' : '1px solid #e5e7eb',
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.12)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = idx === 0 ? '#FFD700' : '#060030ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = idx === 0 ? '0 8px 24px rgba(255, 215, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = idx === 0 ? '#FFD700' : '#e5e7eb';
                  }}>
                    {/* Rank Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      background: idx === 0 ? 'linear-gradient(135deg, #FFD700, #FFA500)' : idx === 1 ? 'linear-gradient(135deg, #C0C0C0, #A9A9A9)' : idx === 2 ? 'linear-gradient(135deg, #CD7F32, #8B4513)' : idx === 3 ? 'linear-gradient(135deg, #8B7355, #5C4033)' : 'linear-gradient(135deg, #6B5B4E, #3E332D)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      fontWeight: 'bold',
                      boxShadow: `0 4px 12px ${idx === 0 ? '#FFD70060' : idx === 1 ? '#C0C0C060' : idx === 2 ? '#CD7F3260' : idx === 3 ? '#8B735560' : '#6B5B4E60'}`
                    }}>
                      {idx + 1}
                    </div>

                    {/* Content */}
                    <div style={{ paddingTop: '12px' }}>
                      <p style={{ fontSize: '15px', fontWeight: '700', color: '#111827', margin: 0, marginBottom: '8px' }}>
                        {player.name}
                      </p>
                      <p style={{ fontSize: '13px', color: '#666', margin: '0 0 16px 0' }}>
                        {player.LearningPathway || 'Unassigned'}
                      </p>

                      {/* Points Display */}
                      <div style={{
                        backgroundColor: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: '1px solid rgba(217, 119, 6, 0.2)'
                      }}>
                        <Trophy size={16} color="#D97706" />
                        <span style={{ fontSize: '14px', fontWeight: '800', color: '#B45309' }}>
                          {player.totalPoints} pts
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Coach View
  return (
    <Layout>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
        {/* Header Section with Stats */}
        <div style={{
          background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
          backdropFilter: 'blur(20px)',
          color: 'white',
          padding: '40px 32px',
          marginBottom: '32px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 8px 32px rgba(37, 44, 53, 0.15)'
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '24px'
            }}>
              <div>
                <h1 style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  margin: '0 0 4px 0'
                }}>
                  Dashboard
                </h1>
                <p style={{
                  fontSize: '14px',
                  opacity: 0.9,
                  margin: 0
                }}>
                  Welcome back, {currentUser.username}! Manage your {myplayers.length} player{myplayers.length !== 1 ? 's' : ''} and sessions
                </p>
              </div>
              <Link to="/coach/start-session" style={{
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.15)',
                border: '2px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '8px',
                color: 'white',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
              }}>
                <Plus size={16} />
                New Session
              </Link>
            </div>

            {/* Stats Inside Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '16px'
            }}>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>My Players</p>
                <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{myplayers.length}</p>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sessions</p>
                <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{mySessions.length}</p>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Draft Sessions</p>
                <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{myDrafts.length}</p>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Rating</p>
                <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{coachAvgRating}⭐</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 32px' }}>
          {/* Quick Actions for Coach */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              marginBottom: '20px'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1f2937', margin: 0 }}>Quick Actions</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
              {[
                { to: '/coach/players', icon: Users, label: 'My Players', color: '#0EA5E9' },
                { to: '/coach/start-session', icon: Plus, label: 'New Session', color: '#10B981' },
                { to: '/coach/past-sessions', icon: CheckCircle2, label: 'Past Sessions', color: '#F59E0B' },
              ].map((action, idx) => {
                const Icon = action.icon;
                return (
                  <Link key={idx} to={action.to} style={{ textDecoration: 'none' }}>
                    <div style={{
                      padding: '20px 16px',
                      border: `2px solid ${action.color}20`,
                      borderRadius: '12px',
                      backgroundColor: `${action.color}08`,
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      color: action.color,
                      fontWeight: '600',
                      fontSize: '13px',
                      height: '100%'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = action.color;
                      e.currentTarget.style.backgroundColor = `${action.color}15`;
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = `0 8px 16px ${action.color}25`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${action.color}20`;
                      e.currentTarget.style.backgroundColor = `${action.color}08`;
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: `${action.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon size={20} color={action.color} />
                      </div>
                      {action.label}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Top Players - Coach View */}
          {topCoachPlayers.length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '20px'
              }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1f2937', margin: 0 }}>Top Players</h2>
                <span style={{ fontSize: '12px', color: '#999', fontWeight: '500' }}>{topCoachPlayers.length} active players</span>
              </div>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {topCoachPlayers.map((player, idx) => (
                    <Link 
                      key={player.playerId} 
                      to={`/coach/player/${player.playerId}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px',
                        backgroundColor: idx === 0 ? 'linear-gradient(135deg, #FFF9E6 0%, #FFFBF0 100%)' : '#f9fafb',
                        borderRadius: '10px',
                        border: idx === 0 ? '2px solid #FDB022' : '1px solid #e5e7eb',
                        transition: 'all 0.3s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        if (idx !== 0) {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                          e.currentTarget.style.borderColor = '#d1d5db';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (idx !== 0) {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: idx === 0 ? 'linear-gradient(135deg, #FFD700, #FFA500)' : idx === 1 ? 'linear-gradient(135deg, #C0C0C0, #A9A9A9)' : 'linear-gradient(135deg, #CD7F32, #8B4513)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '16px',
                          boxShadow: `0 4px 12px ${idx === 0 ? '#FFD70040' : idx === 1 ? '#C0C0C040' : '#CD7F3240'}`
                        }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '14px', fontWeight: '700', color: '#111827', margin: 0 }}>{player.name}</p>
                          <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>{player.learningPathway} • {player.progress}% Progress</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '18px', fontWeight: '800', background: 'linear-gradient(135deg, #FFD700, #FFA500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>{player.totalPoints}</p>
                          <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0 0', fontWeight: '600' }}>points</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
