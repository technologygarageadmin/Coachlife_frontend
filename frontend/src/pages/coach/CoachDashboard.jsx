import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Users, BookOpen, Target, TrendingUp, Plus, Star, Clock, Award, Search, Filter, ChevronRight, Zap, CheckCircle2, AlertCircle, Loader } from 'lucide-react';

const CoachDashboard = () => {
  const { currentUser, players, sessionHistory, sessionDrafts, fetchPlayers } = useStore();
  const [searchplayer, setSearchplayer] = useState('');
  const [filterLevel, setFilterLevel] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch players data on mount
    fetchPlayers();
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [fetchPlayers]);
  
  const myplayers = players.filter((p) => p.primaryCoach === currentUser.id);
  const mySessions = sessionHistory.filter((s) => s.coachId === currentUser.id);
  const myDrafts = sessionDrafts.filter((s) => s.coachId === currentUser.id);
  const completedSessions = mySessions.filter((s) => s.status === 'completed').length;
  
  const avgRating = (
    mySessions.reduce((sum, s) => sum + (s.rating || 0), 0) / mySessions.length || 0
  ).toFixed(1);

  // Filter and search players
  const filteredplayers = myplayers.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchplayer.toLowerCase());
    const matchesPathway = filterLevel === 'All' || player.learningPathway === filterLevel;
    return matchesSearch && matchesPathway;
  });

  const levels = ['All', ...new Set(myplayers.map(s => s.learningPathway).filter(Boolean))];
  const topplayers = myplayers.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)).slice(0, 3);

  if (isLoading) {
    return (
      <Layout>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
          {/* Header Skeleton */}
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
                <div style={{
                  width: '420px',
                  height: '16px',
                  background: 'rgba(200, 200, 200, 0.3)',
                  borderRadius: '6px',
                  animation: 'pulse 2s ease-in-out infinite 0.1s'
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

          {/* Content Skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
            {/* Main Section Skeleton */}
            <div>
              <div style={{
                width: '200px',
                height: '24px',
                background: 'rgba(200, 200, 200, 0.3)',
                borderRadius: '6px',
                marginBottom: '16px',
                animation: 'pulse 2s ease-in-out infinite'
              }} />
              <div style={{
                background: 'white',
                borderRadius: '8px',
                padding: '24px',
                border: '1px solid #E2E8F0'
              }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    paddingBottom: '16px',
                    marginBottom: '16px',
                    borderBottom: i < 5 ? '1px solid #F1F5F9' : 'none'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'rgba(200, 200, 200, 0.3)',
                      borderRadius: '50%',
                      animation: `pulse 2s ease-in-out infinite ${i * 0.1}s`
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        width: '60%',
                        height: '16px',
                        background: 'rgba(200, 200, 200, 0.3)',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        animation: `pulse 2s ease-in-out infinite ${i * 0.1}s`
                      }} />
                      <div style={{
                        width: '40%',
                        height: '14px',
                        background: 'rgba(200, 200, 200, 0.3)',
                        borderRadius: '6px',
                        animation: `pulse 2s ease-in-out infinite ${(i * 0.1) + 0.1}s`
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar Skeleton */}
            <div>
              <div style={{
                width: '200px',
                height: '24px',
                background: 'rgba(200, 200, 200, 0.3)',
                borderRadius: '6px',
                marginBottom: '16px',
                animation: 'pulse 2s ease-in-out infinite'
              }} />
              <div style={{
                background: 'white',
                borderRadius: '8px',
                padding: '24px',
                border: '1px solid #E2E8F0',
                marginBottom: '24px'
              }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{
                    paddingBottom: '16px',
                    marginBottom: '16px',
                    borderBottom: i < 3 ? '1px solid #F1F5F9' : 'none'
                  }}>
                    <div style={{
                      width: '70%',
                      height: '16px',
                      background: 'rgba(200, 200, 200, 0.3)',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      animation: `pulse 2s ease-in-out infinite ${i * 0.1}s`
                    }} />
                    <div style={{
                      width: '50%',
                      height: '14px',
                      background: 'rgba(200, 200, 200, 0.3)',
                      borderRadius: '6px',
                      animation: `pulse 2s ease-in-out infinite ${(i * 0.1) + 0.1}s`
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
                  Coach Dashboard
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
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
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
                <Plus size={16} />
                Start Session
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
                <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sessions Completed</p>
                <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{completedSessions}</p>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Draft Sessions</p>
                <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{myDrafts.length}</p>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Average Rating</p>
                <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{avgRating}/5</p>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {/* Quick Actions */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1.5px solid #E2E8F0',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '1.5px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                background: '#E8F2F8',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Target size={24} color="#060030ff" />
              </div>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                Quick Actions
              </h2>
            </div>
            <div style={{ padding: '16px' }}>
              {[
                { icon: Users, label: 'View My players', to: '/coach/players' },
                { icon: Plus, label: 'Start New Session', to: '/coach/start-session' },
                { icon: Award, label: 'My Profile', to: '/coach/profile' },
                { icon: BookOpen, label: 'Past Sessions', to: '/coach/past-sessions' }
              ].map((action, idx) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={idx}
                    to={action.to}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      background: '#F8FAFC',
                      borderRadius: '10px',
                      marginBottom: idx < 3 ? '10px' : 0,
                      cursor: 'pointer',
                      textDecoration: 'none',
                      color: '#111827',
                      transition: 'all 0.2s ease',
                      border: '1px solid transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#E8F2F8';
                      e.currentTarget.style.borderColor = '#060030ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#F8FAFC';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <Icon size={20} color="#060030ff" />
                      <span style={{ fontWeight: '600', fontSize: '14px' }}>{action.label}</span>
                    </div>
                    <ChevronRight size={18} color="#060030ff" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent Sessions */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1.5px solid #E2E8F0',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '1.5px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                background: '#F0FDF4',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={24} color="#10B981" />
              </div>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                Recent Sessions
              </h2>
            </div>
            <div style={{ padding: '16px', maxHeight: '280px', overflowY: 'auto' }}>
              {mySessions.length === 0 ? (
                <div style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: '#64748B'
                }}>
                  <p>No sessions yet</p>
                </div>
              ) : (
                mySessions.slice(-4).reverse().map((session, idx) => (
                  <div
                    key={session.sessionId}
                    style={{
                      padding: '14px 16px',
                      borderBottom: idx < 3 ? '1px solid #F3F4F6' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <p style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#111827'
                      }}>
                        {session.player}
                      </p>
                      <p style={{
                        margin: '4px 0 0 0',
                        fontSize: '12px',
                        color: '#64748B'
                      }}>
                        {session.date}
                      </p>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        background: session.status === 'completed' ? '#F0FDF4' : '#FFFBEB',
                        color: session.status === 'completed' ? '#10B981' : '#060030ff'
                      }}>
                        {session.status === 'completed' ? '✓' : '⏱'} {session.status}
                      </div>
                      {session.rating && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#EF4444'
                        }}>
                          <Star size={14} fill="#EF4444" color="#EF4444" />
                          {session.rating}/5
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Top Performers Section */}
        {topplayers.length > 0 && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1.5px solid #E2E8F0',
            overflow: 'hidden',
            marginBottom: '32px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '1.5px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                background: 'linear-gradient(135deg, #FFFBEB, #FEF2F2)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Award size={24} color="#EF4444" />
              </div>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                Top Performers This Month
              </h2>
            </div>
            <div style={{ padding: '20px' }}>
              {topplayers.map((player, idx) => {
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div
                    key={player.playerId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px',
                      background: '#F8FAFC',
                      borderRadius: '10px',
                      marginBottom: idx < topplayers.length - 1 ? '12px' : 0
                    }}
                  >
                    <span style={{
                      fontSize: '24px',
                      fontWeight: 'bold'
                    }}>
                      {medals[idx]}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#111827'
                      }}>
                        {player.name}
                      </p>
                      <p style={{
                        margin: '4px 0 0 0',
                        fontSize: '12px',
                        color: '#64748B'
                      }}>
                        {player.learningPathway}
                      </p>
                    </div>
                    <div style={{
                      textAlign: 'right'
                    }}>
                      <p style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#252c35'
                      }}>
                        {player.totalPoints}
                      </p>
                      <p style={{
                        margin: '4px 0 0 0',
                        fontSize: '11px',
                        color: '#64748B'
                      }}>
                        points
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* players List with Search and Filter */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          border: '1.5px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{
            padding: '24px',
            borderBottom: '1.5px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              background: '#E8F2F8',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={24} color="#060030ff" />
            </div>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#111827',
              margin: 0
            }}>
              My players
            </h2>
            <span style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              background: '#E8F2F8',
              color: '#252c35',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '700'
            }}>
              {filteredplayers.length}
            </span>
          </div>

          {/* Search and Filter Bar */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              flex: 1,
              minWidth: '200px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              background: '#F8FAFC',
              borderRadius: '10px',
              border: '1.5px solid #E2E8F0',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#060030ff';
              e.currentTarget.style.boxShadow = '0 0 0 4px rgba(82, 102, 129, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <Search size={18} color="#64748B" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchplayer}
                onChange={(e) => setSearchplayer(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '13px',
                  color: '#111827',
                  flex: 1,
                  fontWeight: '500'
                }}
              />
            </div>

            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              style={{
                padding: '10px 14px',
                background: '#F8FAFC',
                border: '1.5px solid #E2E8F0',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#111827',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#060030ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            >
              {levels.map((level) => (
                <option key={level} value={level}>
                  {level === 'All' ? 'All Levels' : `Level ${level}`}
                </option>
              ))}
            </select>
          </div>

          {/* players Grid */}
          <div style={{
            padding: '20px'
          }}>
            {filteredplayers.length === 0 ? (
              <div style={{
                padding: '48px 32px',
                textAlign: 'center',
                color: '#64748B'
              }}>
                <AlertCircle size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <p style={{ fontSize: '15px', margin: 0 }}>No players found matching your filters</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px'
              }}>
                {filteredplayers.map((player) => (
                  <Link
                    key={player.playerId}
                    to={`/coach/player/${player.playerId}`}
                    style={{
                      background: '#F8FAFC',
                      border: '2px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '16px',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      color: '#111827'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#060030ff';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(82, 102, 129, 0.1)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px'
                    }}>
                      <h3 style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        margin: 0,
                        color: '#111827'
                      }}>
                        {player.name}
                      </h3>
                      <span style={{
                        padding: '4px 10px',
                        background: '#E8F2F8',
                        color: '#252c35',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700'
                      }}>
                        {player.learningPathway?.substring(0, 10)}
                      </span>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <p style={{
                          fontSize: '11px',
                          color: '#64748B',
                          margin: 0,
                          marginBottom: '4px'
                        }}>
                          Pathway
                        </p>
                        <p style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#111827',
                          margin: 0
                        }}>
                          {player.learningPathway}
                        </p>
                      </div>
                      <div>
                        <p style={{
                          fontSize: '11px',
                          color: '#64748B',
                          margin: 0,
                          marginBottom: '4px'
                        }}>
                          Points
                        </p>
                        <p style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#060030ff',
                          margin: 0
                        }}>
                          {player.totalPoints}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px'
                      }}>
                        <span style={{
                          fontSize: '11px',
                          color: '#64748B',
                          fontWeight: '600'
                        }}>
                          Progress
                        </span>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#252c35'
                        }}>
                          {player.progress}%
                        </span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '6px',
                        background: '#E2E8F0',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${player.progress}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #060030ff, #252c35)',
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
};

export default CoachDashboard;


