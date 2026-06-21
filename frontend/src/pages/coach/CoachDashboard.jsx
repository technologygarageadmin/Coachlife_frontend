import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import {
  Users, BookOpen, Target, Plus, Award,
  Search, ChevronRight, AlertCircle, Loader, Layers,
  X, ExternalLink, Calendar, Trophy,
} from 'lucide-react';

const PALETTES = [
  ['#6366F1','#818CF8'], ['#10B981','#34D399'], ['#F59E0B','#FBBF24'],
  ['#EC4899','#F472B6'], ['#3B82F6','#60A5FA'], ['#8B5CF6','#A78BFA'],
  ['#EF4444','#F87171'], ['#06B6D4','#22D3EE'],
];
const pal = (name = '') => PALETTES[(name.charCodeAt(0) || 0) % PALETTES.length];

const Sk = ({ w, h, r = 8 }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: '#EEF2F7', animation: 'skPulse 1.6s ease-in-out infinite', flexShrink: 0 }} />
);

const SummaryCard = ({ label, value, icon: SIcon, accent }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: '#fff', border: `1.5px solid ${hov ? accent + '44' : '#E2E8F0'}`,
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

const BATCHES_URL   = 'https://ts6wti3133.execute-api.ap-south-1.amazonaws.com/default/CL_Get_Batches';
const VIEW_CARD_URL = 'https://kyfkhl8v4l.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_View_Sessioncard';

const CoachDashboard = () => {
  const { currentUser, fetchAssignedPlayersForCoach, userToken } = useStore();
  const navigate = useNavigate();

  const [myPlayers, setMyPlayers]           = useState([]);
  const [batchCount, setBatchCount]         = useState(0);
  const [isLoading, setIsLoading]           = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerCards, setPlayerCards]       = useState([]);
  const [loadingCards, setLoadingCards]     = useState(false);
  const [searchPlayer, setSearchPlayer]     = useState('');

  // Fetch assigned players + batch count
  useEffect(() => {
    if (!currentUser?.id || !userToken) return;
    (async () => {
      setIsLoading(true);
      try {
        const result = await fetchAssignedPlayersForCoach(currentUser.id);
        if (result.success && result.players) {
          const normalized = result.players.map(item => {
            const p = item.player || item;
            return {
              playerId: p._id || p.id || p.playerId,
              name: p.playerName || p.name || '',
              LearningPathway: p.LearningPathway || '',
              totalPoints: p.TotalPoints || p.totalPoints || 0,
              PointBalance: p.PointBalance || 0,
              sessionCardIds: item.sessionCardIds || p.sessionCardIds || [],
              status: p.status || 'active',
            };
          });
          setMyPlayers(normalized);

          try {
            const bRes = await fetch(BATCHES_URL, {
              headers: { 'Content-Type': 'application/json', userToken }
            });
            if (bRes.ok) {
              let bd = await bRes.json();
              if (bd?.body && typeof bd.body === 'string') bd = JSON.parse(bd.body);
              const batches = Array.isArray(bd) ? bd : (bd.batches || []);
              const pids = new Set(normalized.map(p => String(p.playerId)));
              const mine = batches.filter(b =>
                (b.playerIds || (b.players || []).map(pl => pl.playerId || pl))
                  .some(id => pids.has(String(id)))
              );
              setBatchCount(mine.length);
            }
          } catch { /* non-critical */ }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [currentUser?.id, userToken]);

  // Fetch session cards when a player is selected
  useEffect(() => {
    if (!selectedPlayer) { setPlayerCards([]); return; }
    const ids = selectedPlayer.sessionCardIds || [];
    if (!ids.length) { setPlayerCards([]); return; }
    const controller = new AbortController();
    (async () => {
      setLoadingCards(true);
      try {
        const cards = await Promise.all(ids.map(async id => {
          try {
            const res = await fetch(VIEW_CARD_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', userToken },
              body: JSON.stringify({ sessionCardId: id }),
              signal: controller.signal,
            });
            if (!res.ok) return null;
            const d = await res.json();
            return d.sessionCard || d.data || d;
          } catch { return null; }
        }));
        setPlayerCards(cards.filter(Boolean));
      } catch (e) {
        if (e.name !== 'AbortError') setPlayerCards([]);
      } finally {
        setLoadingCards(false);
      }
    })();
    return () => controller.abort();
  }, [selectedPlayer?.playerId]);

  const totalSessions = useMemo(
    () => myPlayers.reduce((s, p) => s + (p.sessionCardIds?.length || 0), 0),
    [myPlayers]
  );

  const totalPoints = useMemo(
    () => myPlayers.reduce((s, p) => s + (p.totalPoints || 0), 0),
    [myPlayers]
  );

  const playerStats = useMemo(() => {
    if (!selectedPlayer) return null;
    const norm = s => (s || '').toLowerCase().replace(' ', '_');
    return {
      total:     selectedPlayer.sessionCardIds?.length || 0,
      completed: playerCards.filter(c => norm(c.status) === 'completed').length,
      pending:   playerCards.filter(c => norm(c.status) === 'pending').length,
      upcoming:  playerCards.filter(c => ['upcoming', 'in_progress'].includes(norm(c.status))).length,
    };
  }, [selectedPlayer, playerCards]);

  const filteredPlayers = useMemo(
    () => myPlayers.filter(p => p.name.toLowerCase().includes(searchPlayer.toLowerCase())),
    [myPlayers, searchPlayer]
  );

  const handleSelectPlayer = (player) => {
    setSelectedPlayer(prev => prev?.playerId === player.playerId ? null : player);
  };

  const handleClearSelection = () => {
    setSelectedPlayer(null);
    setPlayerCards([]);
  };

  const statsRow = selectedPlayer
    ? [
        { label: 'Total Sessions',    value: loadingCards ? '…' : playerStats?.total,     color: 'rgba(255,255,255,0.15)' },
        { label: 'Completed',         value: loadingCards ? '…' : playerStats?.completed,  color: 'rgba(74,222,128,0.2)' },
        { label: 'Pending (Absent)',  value: loadingCards ? '…' : playerStats?.pending,    color: 'rgba(251,191,36,0.2)' },
        { label: 'Upcoming / Active', value: loadingCards ? '…' : playerStats?.upcoming,   color: 'rgba(96,165,250,0.2)' },
      ]
    : [
        { label: 'My Players',        value: myPlayers.length,  color: 'rgba(255,255,255,0.15)' },
        { label: 'Batches Assigned',  value: batchCount,        color: 'rgba(255,255,255,0.15)' },
        { label: 'Total Sessions',    value: totalSessions,     color: 'rgba(255,255,255,0.15)' },
        { label: 'Completed',         value: '-',               color: 'rgba(255,255,255,0.08)' },
        { label: 'Pending',           value: '-',               color: 'rgba(255,255,255,0.08)' },
      ];

  if (isLoading) {
    return (
      <Layout>
        <style>{`@keyframes skPulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
          {/* Header skeleton */}
          <div style={{
            background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
            borderRadius: '20px', padding: '28px 32px', marginBottom: '24px',
            boxShadow: '0 12px 40px rgba(6,0,48,.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,.12)', flexShrink: 0 }} />
              <div>
                <div style={{ width: '200px', height: '28px', background: 'rgba(255,255,255,.15)', borderRadius: '6px', marginBottom: '8px' }} />
                <div style={{ width: '280px', height: '14px', background: 'rgba(255,255,255,.1)', borderRadius: '4px' }} />
              </div>
            </div>
          </div>
          {/* Summary cards skeleton */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ flex: 1, minWidth: '140px', background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Sk w="46px" h="46px" r={12} />
                <div style={{ flex: 1 }}>
                  <Sk w="70%" h="11px" r={4} />
                  <div style={{ marginTop: '8px' }}><Sk w="50%" h="23px" r={4} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <style>{`
        @keyframes skPulse { 0%,100%{opacity:.5}50%{opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
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
              <BookOpen size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: '0 0 3px', letterSpacing: '-.5px' }}>
                {selectedPlayer ? selectedPlayer.name : 'Coach Dashboard'}
              </h1>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.6)', margin: 0, fontWeight: '500' }}>
                {selectedPlayer
                  ? `${selectedPlayer.LearningPathway || 'No pathway'} · ${selectedPlayer.sessionCardIds?.length || 0} session cards`
                  : `Welcome back, ${currentUser?.username}! Your coaching overview`}
              </p>
            </div>
          </div>

          {/* Right-side actions */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {selectedPlayer && (
              <>
                <button
                  onClick={() => navigate(`/coach/player/${selectedPlayer.playerId}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '9px 16px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)',
                    color: 'white', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                >
                  <ExternalLink size={14} /> View Profile
                </button>
                <button
                  onClick={handleClearSelection}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '9px 16px', borderRadius: '8px',
                    background: 'rgba(239,68,68,0.25)', border: '1.5px solid rgba(239,68,68,0.45)',
                    color: 'white', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.4)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
                >
                  <X size={14} /> All Clear
                </button>
              </>
            )}
            {!selectedPlayer && (
              <Link to="/coach/start-session" style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '9px 16px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)',
                color: 'white', fontSize: '13px', fontWeight: '700', textDecoration: 'none'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <Plus size={14} /> Start Session
              </Link>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <SummaryCard label="My Players" value={myPlayers.length} icon={Users} accent="#6366F1" />
          <SummaryCard label="My Batches" value={batchCount} icon={Layers} accent="#10B981" />
          <SummaryCard label="Active Cards" value={totalSessions} icon={BookOpen} accent="#F59E0B" />
          <SummaryCard label="Points Earned" value={totalPoints.toLocaleString()} icon={Trophy} accent="#8B5CF6" />
        </div>

        {/* Stats row inside a secondary card when a player is selected */}
        {selectedPlayer && (
          <div style={{
            background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
            borderRadius: '14px', padding: '20px 24px', marginBottom: '24px',
            boxShadow: '0 8px 24px rgba(6,0,48,.2)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${statsRow.length}, 1fr)`, gap: '12px' }}>
              {statsRow.map(stat => (
                <div key={stat.label} style={{
                  background: stat.color, borderRadius: '10px', padding: '14px 16px',
                  border: '1px solid rgba(255,255,255,0.15)', transition: 'background 0.3s'
                }}>
                  <p style={{ fontSize: '10px', opacity: 0.8, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', color: 'white' }}>
                    {stat.label}
                  </p>
                  <p style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: 'white' }}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Selected player's recent cards preview */}
            {!loadingCards && playerCards.length > 0 && (
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {playerCards.slice(-4).reverse().map((card, i) => {
                  const norm = (s => (s || '').toLowerCase().replace(' ', '_'));
                  const st = norm(card.status);
                  const cfg = st === 'completed' ? { bg: 'rgba(74,222,128,0.2)', color: '#bbf7d0' }
                            : st === 'pending'   ? { bg: 'rgba(251,191,36,0.2)',  color: '#fde68a' }
                            :                      { bg: 'rgba(96,165,250,0.2)',  color: '#bfdbfe' };
                  return (
                    <div key={i} style={{
                      background: cfg.bg, border: `1px solid ${cfg.color}`,
                      borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600',
                      color: 'rgba(255,255,255,0.9)'
                    }}>
                      S{card.session || (i + 1)} · {card.Topic?.substring(0, 18) || 'Session'} · {card.status || '-'}
                    </div>
                  );
                })}
                {playerCards.length > 4 && (
                  <div style={{
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600',
                    color: 'rgba(255,255,255,0.7)'
                  }}>
                    +{playerCards.length - 4} more
                  </div>
                )}
              </div>
            )}
            {loadingCards && (
              <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.75, fontSize: '13px', color: 'white' }}>
                <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading session cards…
              </div>
            )}
          </div>
        )}

        {/* Two columns: Quick Actions + My Players */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 360px) 1fr',
          gap: '24px', marginBottom: '28px', alignItems: 'start'
        }}>
          {/* Quick Actions */}
          <div style={{
            background: '#FFFFFF', borderRadius: '14px',
            border: '1.5px solid #E2E8F0', overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{
              padding: '20px 24px', borderBottom: '1.5px solid #E2E8F0',
              display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <div style={{
                width: '40px', height: '40px', background: 'rgba(99,102,241,0.1)',
                borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Target size={20} color="#6366F1" />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Quick Actions</h2>
            </div>
            <div style={{ padding: '12px' }}>
              {[
                { icon: Users,    label: 'My Players',    to: '/coach/players' },
                { icon: Plus,     label: 'Start Session',  to: '/coach/start-session' },
                { icon: Award,    label: 'Past Sessions',  to: '/coach/past-sessions' },
                { icon: Award,    label: 'My Profile',     to: '/coach/profile' },
              ].map((action, idx) => {
                const Icon = action.icon;
                return (
                  <Link key={idx} to={action.to} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', background: '#F8FAFC', borderRadius: '10px',
                    marginBottom: idx < 3 ? '8px' : 0, textDecoration: 'none',
                    color: '#0F172A', transition: 'all 0.2s ease', border: '1px solid transparent'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.borderColor = '#6366F1'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Icon size={18} color="#6366F1" />
                      <span style={{ fontWeight: '600', fontSize: '13px' }}>{action.label}</span>
                    </div>
                    <ChevronRight size={16} color="#6366F1" />
                  </Link>
                );
              })}
            </div>

            {/* Batch count pill */}
            {batchCount > 0 && (
              <div style={{
                margin: '0 12px 12px', padding: '12px 14px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.08))',
                borderRadius: '10px', border: '1px solid #6366F1',
                display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <Layers size={18} color="#6366F1" />
                <div>
                  <p style={{ fontSize: '11px', color: '#475569', margin: 0, textTransform: 'uppercase', fontWeight: '600' }}>Batches Assigned</p>
                  <p style={{ fontSize: '18px', fontWeight: '800', color: '#6366F1', margin: 0 }}>{batchCount}</p>
                </div>
              </div>
            )}
          </div>

          {/* My Players - selectable list */}
          <div style={{
            background: '#FFFFFF', borderRadius: '14px',
            border: '1.5px solid #E2E8F0', overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{
              padding: '20px 24px', borderBottom: '1.5px solid #E2E8F0',
              display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <div style={{
                width: '40px', height: '40px', background: 'rgba(99,102,241,0.1)',
                borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Users size={20} color="#6366F1" />
              </div>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>My Players</h2>
                <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
                  {selectedPlayer ? `${selectedPlayer.name} selected` : 'Click a player to view their stats'}
                </p>
              </div>
              {selectedPlayer && (
                <button
                  onClick={handleClearSelection}
                  style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '6px 12px', borderRadius: '7px',
                    background: '#FEE2E2', border: '1px solid #FECACA',
                    color: '#DC2626', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FECACA'}
                  onMouseLeave={e => e.currentTarget.style.background = '#FEE2E2'}
                >
                  <X size={12} /> All Clear
                </button>
              )}
              {!selectedPlayer && (
                <span style={{
                  marginLeft: 'auto', padding: '5px 12px',
                  background: 'rgba(99,102,241,0.1)', color: '#6366F1',
                  borderRadius: '6px', fontSize: '13px', fontWeight: '700'
                }}>{myPlayers.length}</span>
              )}
            </div>

            {/* Search */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 12px', background: '#F8FAFC',
                borderRadius: '8px', border: '1.5px solid #E2E8F0'
              }}>
                <Search size={16} color="#475569" />
                <input
                  type="text"
                  placeholder="Search players…"
                  value={searchPlayer}
                  onChange={e => setSearchPlayer(e.target.value)}
                  style={{
                    border: 'none', background: 'transparent', outline: 'none',
                    fontSize: '13px', color: '#0F172A', flex: 1
                  }}
                />
              </div>
            </div>

            {/* Player rows */}
            <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
              {filteredPlayers.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#475569' }}>
                  <AlertCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.4, display: 'block' }} />
                  <p style={{ margin: 0, fontSize: '14px' }}>No players found</p>
                </div>
              ) : filteredPlayers.map((player, idx) => {
                const isSelected = selectedPlayer?.playerId === player.playerId;
                const sessions = player.sessionCardIds?.length || 0;
                const [accent] = pal(player.name);
                return (
                  <div
                    key={player.playerId}
                    onClick={() => handleSelectPlayer(player)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '14px 18px', cursor: 'pointer', transition: 'all 0.2s ease',
                      borderBottom: idx < filteredPlayers.length - 1 ? '1px solid #E2E8F0' : 'none',
                      borderLeft: isSelected ? '4px solid #6366F1' : '4px solid transparent',
                      background: isSelected
                        ? 'linear-gradient(90deg, rgba(99,102,241,0.1) 0%, transparent 100%)'
                        : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                      background: isSelected ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' : accent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: '800', fontSize: '16px',
                      boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none'
                    }}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <p style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {player.name}
                        </p>
                        {isSelected && (
                          <span style={{
                            fontSize: '10px', fontWeight: '700', padding: '2px 7px',
                            borderRadius: '999px', background: '#6366F1',
                            color: 'white', flexShrink: 0
                          }}>SELECTED</span>
                        )}
                      </div>
                      <p style={{ fontSize: '12px', color: '#475569', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {player.LearningPathway || '-'}
                      </p>
                    </div>

                    {/* Meta */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <span style={{
                        fontSize: '11px', fontWeight: '700', padding: '3px 8px',
                        borderRadius: '6px', background: 'rgba(99,102,241,0.1)',
                        color: '#6366F1'
                      }}>
                        {sessions} session{sessions !== 1 ? 's' : ''}
                      </span>
                      <span style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>
                        {player.totalPoints} pts
                      </span>
                    </div>

                    {/* Chevron or spinner */}
                    <div style={{ flexShrink: 0, marginLeft: '4px' }}>
                      {isSelected && loadingCards
                        ? <Loader size={16} color="#6366F1" style={{ animation: 'spin 1s linear infinite' }} />
                        : <ChevronRight size={16} color={isSelected ? '#6366F1' : '#94A3B8'} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected player session card breakdown */}
        {selectedPlayer && !loadingCards && playerCards.length > 0 && (
          <div style={{
            background: '#FFFFFF', borderRadius: '14px',
            border: '1.5px solid #E2E8F0', overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '28px'
          }}>
            <div style={{
              padding: '18px 24px', borderBottom: '1.5px solid #E2E8F0',
              display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <div style={{
                width: '40px', height: '40px', background: '#F0FDF4',
                borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Calendar size={20} color="#10B981" />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                {selectedPlayer.name}'s Session Cards
              </h2>
              <Link
                to={`/coach/player/${selectedPlayer.playerId}/sessions`}
                style={{
                  marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px',
                  fontSize: '12px', fontWeight: '600', color: '#6366F1', textDecoration: 'none'
                }}
              >
                View All <ChevronRight size={14} />
              </Link>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {playerCards.slice().reverse().slice(0, 8).map((card, i) => {
                const norm = s => (s || '').toLowerCase().replace(' ', '_');
                const st = norm(card.status);
                const statusCfg = {
                  completed:   { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', label: 'Completed' },
                  pending:     { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', label: 'Pending' },
                  in_progress: { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', label: 'In Progress' },
                  upcoming:    { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB', label: 'Upcoming' },
                }[st] || { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB', label: card.status || '-' };

                return (
                  <div key={i} style={{
                    padding: '10px 14px', borderRadius: '10px',
                    background: statusCfg.bg, border: `1.5px solid ${statusCfg.border}`,
                    minWidth: '160px', flex: '0 0 auto'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: statusCfg.color }}>S{card.session || (i + 1)}</span>
                      <span style={{
                        fontSize: '10px', fontWeight: '700', padding: '2px 7px',
                        borderRadius: '999px', background: statusCfg.border, color: statusCfg.color
                      }}>{statusCfg.label}</span>
                    </div>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#0F172A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                      {card.Topic || 'Session'}
                    </p>
                  </div>
                );
              })}
              {playerCards.length > 8 && (
                <div style={{
                  padding: '10px 14px', borderRadius: '10px',
                  background: '#F8FAFC', border: '1.5px solid #E2E8F0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: '80px', color: '#475569', fontSize: '13px', fontWeight: '700'
                }}>
                  +{playerCards.length - 8}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default CoachDashboard;
