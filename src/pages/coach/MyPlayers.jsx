import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { SkeletonContainer } from '../../components/SkeletonLoader';
import { Users, Award, TrendingUp, Target, ArrowRight, Zap, Clock, Star, Search, BookOpen, Filter, GridIcon, ListIcon, ChevronRight, AlertCircle, CheckCircle2, Loader, Trophy, ChevronDown, ChevronUp } from 'lucide-react';

const MyPlayers = () => {
  const { currentUser, fetchAssignedPlayersForCoach } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPathway, setFilterPathway] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [myplayers, setMyplayers] = useState([]);
  const [assignedPlayersData, setAssignedPlayersData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const sortBy = 'name'; // Fixed sort order

  // Convert progress string to percentage
  const convertProgressToPercentage = (progress) => {
    if (typeof progress === 'number') return progress;
    if (progress === 'Not Started') return 0;
    if (progress === 'In Progress') return 50;
    if (progress === 'Completed') return 100;
    return 0;
  };

  // Fetch assigned players on mount
  useEffect(() => {
    const loadAssignedPlayers = async () => {
      try {
        setIsLoading(true);
        
        const result = await fetchAssignedPlayersForCoach(currentUser.id);
        
        
        if (result.success && result.players) {
          // Transform API response to match component expectations
          const transformedPlayers = result.players.map(item => {
            const player = item.player || item;
            return {
              playerId: player._id || player.id || player.playerId,
              name: player.playerName || player.name,
              email: player.phone || '',
              learningPathway: player.LearningPathway || 'Not Assigned',
              progress: convertProgressToPercentage(player.progress),
              totalPoints: player.TotalPoints || 0,
              status: player.status,
              dateOfBirth: player.dateOfBirth,
              age: player.age,
              totalPointsRedeemed: player.TotalPointsRedeemed || 0,
              pointBalance: player.currentPoints,
              sessionCardIds: item.sessionCardIds || []
            };
          });
          
          // Store full data for session card IDs lookup
          const playersData = {};
          result.players.forEach((item, idx) => {
            const player = item.player || item;
            const playerId = player._id || player.playerId;
            playersData[playerId] = {
              player: transformedPlayers[idx],
              sessionCardIds: item.sessionCardIds || []
            };
          });
          
          setMyplayers(transformedPlayers);
          setAssignedPlayersData(playersData);
        } else {
          setMyplayers([]);
          setAssignedPlayersData({});
        }
      } catch (error) {
        console.error('Error fetching assigned players:', error);
        setMyplayers([]);
        setAssignedPlayersData({});
      } finally {
        setIsLoading(false);
      }
    };
    
    if (currentUser?.id && fetchAssignedPlayersForCoach) {
      loadAssignedPlayers();
    } else {
      setIsLoading(false);
    }
  }, [currentUser?.id, fetchAssignedPlayersForCoach]);
  
  // Get session count for each player from API response data
  const getplayersessionCount = (playerId) => {
    const playerData = assignedPlayersData[playerId];
    if (playerData && playerData.sessionCardIds) {
      if (Array.isArray(playerData.sessionCardIds)) {
        return playerData.sessionCardIds.length;
      }
      return 0;
    }
    return 0;
  };
  
  // Get unique pathways for filter options
  const uniquePathways = [...new Set(myplayers.map(p => p.learningPathway).filter(Boolean))].sort();

  // Filter players based on search and learning pathway
  let filteredplayers = myplayers.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPathway = filterPathway === 'all' || player.learningPathway === filterPathway;
    return matchesSearch && matchesPathway;
  });

  // Sort players
  filteredplayers = [...filteredplayers].sort((a, b) => {
    switch(sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'points':
        return b.totalPoints - a.totalPoints;
      case 'pathway':
        return (a.learningPathway || '').localeCompare(b.learningPathway || '');
      default:
        return 0;
    }
  });
  
  // Calculate statistics
  const totalplayers = myplayers.length;
  const totalPoints = myplayers.reduce((sum, s) => sum + s.totalPoints, 0);
  const totalSessions = myplayers.reduce((sum, s) => sum + getplayersessionCount(s.playerId), 0);

  return (
    <Layout>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
        {/* Header Section - Skeleton or Real */}
        {isLoading ? (
          <SkeletonContainer>
            <div style={{
              background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
              borderRadius: '16px',
              padding: '32px',
              marginBottom: '32px',
              minHeight: '200px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  height: '40px',
                  background: 'rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  width: '200px',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
                <div style={{
                  height: '16px',
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: '4px',
                  width: '350px',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  animationDelay: '0.1s'
                }} />
              </div>

              {/* View Mode Buttons Skeleton */}
              <div style={{
                display: 'flex',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '6px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                {[1, 2].map(i => (
                  <div key={i} style={{
                    width: '60px',
                    height: '36px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                    animationDelay: `${i * 0.08}s`
                  }} />
                ))}
              </div>

              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
              `}</style>
            </div>
          </SkeletonContainer>
        ) : (
          <div style={{
            background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
            backdropFilter: 'blur(20px)',
            color: 'white',
            padding: '40px 32px',
            marginBottom: '32px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px rgba(37, 44, 53, 0.15)'
          }}
          data-aos="fade-up"
          data-aos-duration="800">
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 4px 0' }}>My Players</h1>
                  <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>Manage and track your player's progress and performance</p>
                </div>

                {/* View Mode Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  padding: '6px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}>
                  <button
                    onClick={() => setViewMode('grid')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                      color: viewMode === 'grid' ? '#060030ff' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => {
                      if (viewMode !== 'grid') {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (viewMode !== 'grid') {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <GridIcon size={18} />
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: viewMode === 'list' ? '#FFFFFF' : 'transparent',
                      color: viewMode === 'list' ? '#060030ff' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => {
                      if (viewMode !== 'list') {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (viewMode !== 'list') {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <ListIcon size={18} />
                    List
                  </button>
                </div>
              </div>

              {/* Stats Row inside Header */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Players</p>
                  <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{totalplayers}</p>
                </div>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Points</p>
                  <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{totalPoints.toLocaleString()}</p>
                </div>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Sessions</p>
                  <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{totalSessions}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search, Filter and Sort Controls */}
        <div style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
          borderRadius: '14px',
          border: '1.5px solid #E2E8F0',
          padding: '20px',
          marginBottom: '32px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)'
        }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            {/* Search Box */}
            <div style={{
              flex: 1,
              minWidth: '250px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderRadius: '10px',
              transition: 'all 0.2s ease',
            }}
            >
              <Search size={18} color="#060030ff" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search players by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  fontSize: '14px',
                  color: '#111827',
                  fontWeight: '500'
                }}
              />
            </div>

            {/* Learning Pathway Filter Dropdown */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '0px 14px',
              borderRadius: '10px',
              transition: 'all 0.2s ease',
            }}>
              <Filter size={18} color="#060030ff" strokeWidth={2} />
              <select
                value={filterPathway}
                onChange={(e) => setFilterPathway(e.target.value)}
                style={{
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#111827',
                  fontWeight: '500',
                  minWidth: '180px'
                }}
              >
                <option value="all">All Pathways</option>
                {uniquePathways.map(pathway => (
                  <option key={pathway} value={pathway}>
                    {pathway}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* players Display */}
        {isLoading ? (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '32px'
            }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #E2E8F0',
                  animation: `pulse 2s ease-in-out infinite ${i * 0.1}s`
                }}>
                  <div style={{
                    width: '100%',
                    height: '16px',
                    background: 'rgba(200, 200, 200, 0.3)',
                    borderRadius: '4px',
                    marginBottom: '12px'
                  }} />
                  <div style={{
                    width: '60%',
                    height: '14px',
                    background: 'rgba(200, 200, 200, 0.3)',
                    borderRadius: '4px',
                    marginBottom: '16px'
                  }} />
                  <div style={{
                    width: '100%',
                    height: '36px',
                    background: 'rgba(200, 200, 200, 0.3)',
                    borderRadius: '4px'
                  }} />
                </div>
              ))}
            </div>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1.5px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  paddingBottom: '16px',
                  marginBottom: '16px',
                  borderBottom: i < 5 ? '1px solid #F1F5F9' : 'none',
                  animation: `pulse 2s ease-in-out infinite ${i * 0.1}s`
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'rgba(200, 200, 200, 0.3)',
                    borderRadius: '50%'
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      width: '60%',
                      height: '16px',
                      background: 'rgba(200, 200, 200, 0.3)',
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }} />
                    <div style={{
                      width: '40%',
                      height: '14px',
                      background: 'rgba(200, 200, 200, 0.3)',
                      borderRadius: '4px'
                    }} />
                  </div>
                </div>
              ))}
            </div>
            <style>{`
              @keyframes pulse {
                0%, 100% { opacity: 0.4; }
                50% { opacity: 0.7; }
              }
            `}</style>
          </div>
        ) : filteredplayers.length > 0 ? (
          viewMode === 'grid' ? (
            // Grid View
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              {filteredplayers.map((player) => (
                <div key={player.playerId} style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '2px solid #E2E8F0',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(6, 0, 48, 0.12)';
                  e.currentTarget.style.borderColor = '#060030ff';
                  e.currentTarget.style.transform = 'translateY(-6px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.06)';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                >
                  {/* Header */}
                  <div style={{
                    padding: '20px',
                    background: 'linear-gradient(135deg, #060030ff 0%, #1a1a2e 100%)',
                    borderBottom: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    color: 'white'
                  }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF', margin: 0, marginBottom: '6px' }}>{player.name}</h3>
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>{player.email}</p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div style={{ padding: '16px 20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '6px 12px',
                      background: '#FFFBEB',
                      color: '#92400E',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}>
                      {player.learningPathway}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div style={{
                    padding: '16px 20px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    borderBottom: '1.5px solid #E2E8F0'
                  }}>
                    <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: 0, marginBottom: '6px', fontWeight: '600' }}>Points</p>
                      <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#060030ff', margin: 0 }}>{player.totalPoints}</p>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: 0, marginBottom: '6px', fontWeight: '600' }}>Sessions</p>
                      <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#060030ff', margin: 0 }}>{getplayersessionCount(player.playerId)}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ padding: '16px 20px', display: 'flex', gap: '12px', borderTop: '1.5px solid #E2E8F0' }}>
                    <Link 
                      to={`/coach/player/${player.playerId}`}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #060030ff, #1a1a2e)',
                        color: 'white',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: '700',
                        transition: 'all 0.2s ease',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.boxShadow = '0 6px 16px rgba(6, 0, 48, 0.2)';
                        e.target.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.boxShadow = 'none';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // List View
            <div style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1.5px solid #E2E8F0',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}>
              {/* Header Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 0.8fr',
                gap: '16px',
                padding: '16px 20px',
                background: '#F8FAFC',
                borderBottom: '2px solid #E2E8F0',
                fontWeight: '700',
                fontSize: '12px',
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <div>Name</div>
                <div>Learning Pathway</div>
                <div>Points</div>
                <div>Sessions</div>
                <div>Progress</div>
                <div>Actions</div>
                <div />
              </div>

              {/* Data Rows */}
              {filteredplayers.map((player, idx) => (
                <div
                  key={player.playerId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 0.8fr',
                    gap: '16px',
                    padding: '16px 20px',
                    borderBottom: idx < filteredplayers.length - 1 ? '1px solid #E2E8F0' : 'none',
                    alignItems: 'center',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  {/* Name */}
                  <div>
                    <p style={{ fontWeight: '700', color: '#111827', fontSize: '13px', margin: 0 }}>{player.name}</p>
                    <p style={{ fontSize: '11px', color: '#64748B', margin: '4px 0 0 0' }}>{player.email}</p>
                  </div>

                  {/* Learning Pathway */}
                  <div>
                    <span style={{
                      padding: '4px 10px',
                      background: '#FFFBEB',
                      color: '#92400E',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700'
                    }}>
                      {player.learningPathway}
                    </span>
                  </div>

                  {/* Points */}
                  <div style={{ fontWeight: '700', color: '#060030ff', fontSize: '13px' }}>{player.totalPoints}</div>

                  {/* Sessions */}
                  <div style={{ fontWeight: '700', color: '#060030ff', fontSize: '13px' }}>{getplayersessionCount(player.playerId)}</div>

                  {/* Progress */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        flex: 1,
                        height: '6px',
                        background: '#E2E8F0',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          background: 'linear-gradient(90deg, #060030ff, #252c35)',
                          width: `${player.progress}%`
                        }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#111827', minWidth: '35px', textAlign: 'right' }}>{player.progress}%</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link 
                      to={`/coach/player/${player.playerId}`}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: '#060030ff',
                        color: 'white',
                        textDecoration: 'none',
                        fontSize: '11px',
                        fontWeight: '700',
                        transition: 'all 0.2s ease',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.target.style.boxShadow = '0 2px 6px rgba(82, 102, 129, 0.3)'}
                      onMouseLeave={(e) => e.target.style.boxShadow = 'none'}
                    >
                      View
                    </Link>
                  </div>

                  {/* Indicator */}
                  <div style={{ textAlign: 'center' }}>
                    <ChevronRight size={18} color="#E2E8F0" />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1.5px solid #E2E8F0',
            padding: '48px 32px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
          }}>
            {myplayers.length === 0 ? (
              <>
                <Users size={56} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#D1D5DB' }} />
                <p style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0, marginBottom: '8px' }}>
                  No players assigned yet
                </p>
                <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
                  Players will appear here once they are assigned to you
                </p>
              </>
            ) : (
              <>
                <Search size={56} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#D1D5DB' }} />
                <p style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0, marginBottom: '8px' }}>
                  No players match your search
                </p>
                <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
                  Try adjusting your search or filter criteria
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyPlayers;


