import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Users, Star, Search, Filter, GridIcon, ListIcon, ChevronRight, CheckCircle2, Trophy } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const PALETTES = [
  ['#6366F1','#818CF8'], ['#10B981','#34D399'], ['#F59E0B','#FBBF24'],
  ['#EC4899','#F472B6'], ['#3B82F6','#60A5FA'], ['#8B5CF6','#A78BFA'],
  ['#EF4444','#F87171'], ['#06B6D4','#22D3EE'],
];
const pal = (name = '') => PALETTES[(name.charCodeAt(0) || 0) % PALETTES.length];

const Sk = ({ w, h, r = 8 }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: '#EEF2F7', animation: 'skPulse 1.6s ease-in-out infinite', flexShrink: 0 }} />
);

const SummaryCard = ({ label, value, icon: SIcon, accent, surface, border }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: surface, border: `1.5px solid ${hov ? accent + '44' : border}`,
      borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px',
      boxShadow: hov ? `0 8px 24px ${accent}22` : '0 2px 8px rgba(0,0,0,0.04)',
      transition: 'all .2s', flex: 1, minWidth: '140px',
    }}>
      <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {React.createElement(SIcon, { size: 22, color: accent })}
      </div>
      <div>
        <p style={{ fontSize: '10.5px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', margin: '0 0 4px', letterSpacing: '.5px' }}>{label}</p>
        <p style={{ fontSize: '23px', fontWeight: '800', color: '#0F172A', margin: 0 }}>{value}</p>
      </div>
    </div>
  );
};

const MyPlayers = () => {
  const { currentUser, fetchAssignedPlayersForCoach } = useStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const surface = dark ? 'var(--cl-surface)' : '#fff';
  const border = dark ? 'var(--cl-border)' : '#E2E8F0';
  const textPrimary = dark ? 'var(--cl-text)' : '#0F172A';
  const textSecondary = dark ? 'var(--cl-text-2)' : '#475569';
  const textMuted = dark ? 'var(--cl-text-3)' : '#94A3B8';
  const surface2 = dark ? 'var(--cl-surface-2)' : '#F8FAFC';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPathway, setFilterPathway] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [myplayers, setMyplayers] = useState([]);
  const [assignedPlayersData, setAssignedPlayersData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const sortBy = 'name';

  const convertProgressToPercentage = (progress) => {
    if (typeof progress === 'number') return progress;
    if (progress === 'Not Started') return 0;
    if (progress === 'In Progress') return 50;
    if (progress === 'Completed') return 100;
    return 0;
  };

  useEffect(() => {
    const loadAssignedPlayers = async () => {
      try {
        setIsLoading(true);

        const result = await fetchAssignedPlayersForCoach(currentUser.id);

        if (result.success && result.players) {
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

  const uniquePathways = [...new Set(myplayers.map(p => p.learningPathway).filter(Boolean))].sort();

  let filteredplayers = myplayers.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPathway = filterPathway === 'all' || player.learningPathway === filterPathway;
    return matchesSearch && matchesPathway;
  });

  filteredplayers = [...filteredplayers].sort((a, b) => {
    switch (sortBy) {
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

  const totalPoints = myplayers.reduce((sum, s) => sum + s.totalPoints, 0);
  const avgPoints = myplayers.length ? Math.round(totalPoints / myplayers.length) : 0;

  return (
    <Layout>
      <style>{`
        @keyframes skPulse { 0%,100%{opacity:.5}50%{opacity:1} }
      `}</style>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>

        {/* Standard Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
          borderRadius: '20px', padding: '28px 32px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
          boxShadow: '0 12px 40px rgba(6,0,48,.3)', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,.12)', border: '1.5px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: '0 0 3px', letterSpacing: '-.5px' }}>My Players</h1>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.6)', margin: 0, fontWeight: '500' }}>Your assigned players and their progress</p>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div style={{
            display: 'flex', gap: '8px',
            background: 'rgba(255,255,255,0.1)', padding: '6px',
            borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '8px 14px', borderRadius: '8px', border: 'none',
                background: viewMode === 'grid' ? '#fff' : 'transparent',
                color: viewMode === 'grid' ? '#6366F1' : 'white',
                cursor: 'pointer', transition: 'all 0.2s ease',
                fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'
              }}
              onMouseEnter={(e) => { if (viewMode !== 'grid') e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={(e) => { if (viewMode !== 'grid') e.currentTarget.style.background = 'transparent'; }}
            >
              <GridIcon size={16} /> Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '8px 14px', borderRadius: '8px', border: 'none',
                background: viewMode === 'list' ? '#fff' : 'transparent',
                color: viewMode === 'list' ? '#6366F1' : 'white',
                cursor: 'pointer', transition: 'all 0.2s ease',
                fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'
              }}
              onMouseEnter={(e) => { if (viewMode !== 'list') e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={(e) => { if (viewMode !== 'list') e.currentTarget.style.background = 'transparent'; }}
            >
              <ListIcon size={16} /> List
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {isLoading ? (
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ flex: 1, minWidth: '140px', background: surface, border: `1.5px solid ${border}`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Sk w="46px" h="46px" r={12} />
                <div style={{ flex: 1 }}>
                  <Sk w="70%" h="11px" r={4} />
                  <div style={{ marginTop: '8px' }}><Sk w="50%" h="23px" r={4} /></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <SummaryCard label="Total Players" value={myplayers.length} icon={Users} accent="#6366F1" surface={surface} border={border} />
            <SummaryCard label="Active Players" value={myplayers.filter(p => p.status === 'active').length} icon={CheckCircle2} accent="#10B981" surface={surface} border={border} />
            <SummaryCard label="Total Points" value={totalPoints.toLocaleString()} icon={Trophy} accent="#F59E0B" surface={surface} border={border} />
            <SummaryCard label="Avg Points" value={avgPoints.toLocaleString()} icon={Star} accent="#8B5CF6" surface={surface} border={border} />
          </div>
        )}

        {/* Search and Filter Bar */}
        <div style={{
          background: surface, borderRadius: '14px',
          border: `1.5px solid ${border}`, padding: '20px',
          marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px', display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '10px', transition: 'all 0.2s ease' }}>
              <Search size={18} color="#6366F1" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search players by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: '14px', color: textPrimary, fontWeight: '500'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0px 14px', borderRadius: '10px', transition: 'all 0.2s ease' }}>
              <Filter size={18} color="#6366F1" strokeWidth={2} />
              <select
                value={filterPathway}
                onChange={(e) => setFilterPathway(e.target.value)}
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  cursor: 'pointer', fontSize: '14px', color: textPrimary,
                  fontWeight: '500', minWidth: '180px'
                }}
              >
                <option value="all">All Pathways</option>
                {uniquePathways.map(pathway => (
                  <option key={pathway} value={pathway}>{pathway}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Players Display */}
        {isLoading ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ background: surface, border: `1.5px solid ${border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ height: '4px', background: surface2 }} />
                  <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '14px', borderBottom: `1px solid ${border}` }}>
                    <Sk w="48px" h="48px" r={24} />
                    <div style={{ flex: 1 }}>
                      <Sk w="60%" h="16px" r={4} />
                      <div style={{ marginTop: '8px' }}><Sk w="40%" h="13px" r={4} /></div>
                    </div>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <Sk w="50%" h="26px" r={8} />
                  </div>
                  <div style={{ padding: '12px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderBottom: `1px solid ${border}` }}>
                    <Sk w="100%" h="60px" r={10} />
                    <Sk w="100%" h="60px" r={10} />
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <Sk w="100%" h="40px" r={10} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredplayers.length > 0 ? (
          viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
              {filteredplayers.map((player) => {
                const [accent] = pal(player.name);
                return (
                  <div
                    key={player.playerId}
                    style={{
                      background: surface, border: `1.5px solid ${border}`,
                      borderRadius: '16px', overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      transition: 'all .2s', cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 8px 24px ${accent}22`;
                      e.currentTarget.style.borderColor = accent + '44';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                      e.currentTarget.style.borderColor = border;
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Colored top band */}
                    <div style={{ height: '4px', background: accent }} />

                    {/* Player header */}
                    <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '14px', borderBottom: `1px solid ${border}` }}>
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
                        background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: '800', fontSize: '18px'
                      }}>
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '15px', fontWeight: '700', color: textPrimary, margin: '0 0 3px' }}>{player.name}</h3>
                        <p style={{ fontSize: '12px', color: textMuted, margin: 0 }}>{player.email}</p>
                      </div>
                    </div>

                    {/* Pathway badge */}
                    <div style={{ padding: '14px 20px' }}>
                      <span style={{
                        padding: '5px 12px', background: '#FFFBEB', color: '#92400E',
                        borderRadius: '8px', fontSize: '12px', fontWeight: '700'
                      }}>
                        {player.learningPathway}
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div style={{
                      padding: '0 20px 16px',
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
                      borderBottom: `1.5px solid ${border}`
                    }}>
                      <div style={{ background: surface2, padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
                        <p style={{ fontSize: '12px', color: textSecondary, margin: '0 0 6px', fontWeight: '600' }}>Points</p>
                        <p style={{ fontSize: '20px', fontWeight: '800', color: '#6366F1', margin: 0 }}>{player.totalPoints}</p>
                      </div>
                      <div style={{ background: surface2, padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
                        <p style={{ fontSize: '12px', color: textSecondary, margin: '0 0 6px', fontWeight: '600' }}>Sessions</p>
                        <p style={{ fontSize: '20px', fontWeight: '800', color: '#6366F1', margin: 0 }}>{getplayersessionCount(player.playerId)}</p>
                      </div>
                    </div>

                    {/* Action */}
                    <div style={{ padding: '16px 20px' }}>
                      <Link
                        to={`/coach/player/${player.playerId}`}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          width: '100%', padding: '11px 14px', borderRadius: '10px',
                          background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                          color: 'white', textDecoration: 'none',
                          fontSize: '13px', fontWeight: '700', transition: 'all 0.2s ease',
                          boxSizing: 'border-box'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 16px rgba(99,102,241,0.35)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // List View
            <div style={{ background: surface, borderRadius: '14px', border: `1.5px solid ${border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 0.8fr',
                gap: '16px', padding: '16px 20px',
                background: surface2, borderBottom: `2px solid ${border}`,
                fontWeight: '700', fontSize: '12px', color: textSecondary,
                textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>
                <div>Name</div>
                <div>Learning Pathway</div>
                <div>Points</div>
                <div>Sessions</div>
                <div>Progress</div>
                <div>Actions</div>
                <div />
              </div>

              {filteredplayers.map((player, idx) => {
                const [accent] = pal(player.name);
                return (
                  <div
                    key={player.playerId}
                    style={{
                      display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 0.8fr',
                      gap: '16px', padding: '16px 20px',
                      borderBottom: idx < filteredplayers.length - 1 ? `1px solid ${border}` : 'none',
                      alignItems: 'center', transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = surface2}
                    onMouseLeave={(e) => e.currentTarget.style.background = surface}
                  >
                    {/* Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                        background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: '800', fontSize: '14px'
                      }}>
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontWeight: '700', color: textPrimary, fontSize: '13px', margin: 0 }}>{player.name}</p>
                        <p style={{ fontSize: '11px', color: textSecondary, margin: '3px 0 0 0' }}>{player.email}</p>
                      </div>
                    </div>

                    {/* Learning Pathway */}
                    <div>
                      <span style={{ padding: '4px 10px', background: '#FFFBEB', color: '#92400E', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                        {player.learningPathway}
                      </span>
                    </div>

                    {/* Points */}
                    <div style={{ fontWeight: '700', color: '#6366F1', fontSize: '13px' }}>{player.totalPoints}</div>

                    {/* Sessions */}
                    <div style={{ fontWeight: '700', color: '#6366F1', fontSize: '13px' }}>{getplayersessionCount(player.playerId)}</div>

                    {/* Progress */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: border, borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', width: `${player.progress}%` }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: textPrimary, minWidth: '35px', textAlign: 'right' }}>{player.progress}%</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Link
                        to={`/coach/player/${player.playerId}`}
                        style={{
                          padding: '6px 12px', borderRadius: '6px',
                          background: '#6366F1', color: 'white',
                          textDecoration: 'none', fontSize: '11px', fontWeight: '700',
                          transition: 'all 0.2s ease', border: 'none', cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(99,102,241,0.35)'}
                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                      >
                        View
                      </Link>
                    </div>

                    {/* Indicator */}
                    <div style={{ textAlign: 'center' }}>
                      <ChevronRight size={18} color={border} />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div style={{
            background: surface, borderRadius: '14px',
            border: `1.5px solid ${border}`, padding: '48px 32px',
            textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            {myplayers.length === 0 ? (
              <>
                <Users size={56} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#CBD5E1', display: 'block' }} />
                <p style={{ fontSize: '18px', fontWeight: '700', color: textPrimary, margin: '0 0 8px' }}>
                  No players assigned yet
                </p>
                <p style={{ fontSize: '14px', color: textSecondary, margin: 0 }}>
                  Players will appear here once they are assigned to you
                </p>
              </>
            ) : (
              <>
                <Search size={56} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#CBD5E1', display: 'block' }} />
                <p style={{ fontSize: '18px', fontWeight: '700', color: textPrimary, margin: '0 0 8px' }}>
                  No players match your search
                </p>
                <p style={{ fontSize: '14px', color: textSecondary, margin: 0 }}>
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
