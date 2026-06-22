import { useState, useEffect, createElement } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Users, Search, Trophy, Zap, Layers, ArrowRight, BookOpen, Star, ChevronDown, X } from 'lucide-react';
import { SessionCardsView } from './SessionCardsView';
import { useTheme } from '../../context/ThemeContext';

const CL_GET_BATCHES_URL = 'https://ts6wti3133.execute-api.ap-south-1.amazonaws.com/default/CL_Get_Batches';

const PALETTES = [
  ['#6366F1','#818CF8'], ['#10B981','#34D399'], ['#F59E0B','#FBBF24'],
  ['#EC4899','#F472B6'], ['#3B82F6','#60A5FA'], ['#8B5CF6','#A78BFA'],
  ['#EF4444','#F87171'], ['#06B6D4','#22D3EE'],
];
const _pal = (name = '') => PALETTES[(name.charCodeAt(0) || 0) % PALETTES.length];

const Sk = ({ w, h, r = 8 }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: '#EEF2F7', animation: 'skPulse 1.6s ease-in-out infinite', flexShrink: 0 }} />
);

const AVATAR_COLORS = [
  ['#6366F1', '#8B5CF6'],
  ['#EC4899', '#F43F5E'],
  ['#F59E0B', '#EF4444'],
  ['#10B981', '#059669'],
  ['#06B6D4', '#3B82F6'],
  ['#8B5CF6', '#EC4899'],
];
const avatarGradient = (name) => {
  const idx = (name?.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  const [a, b] = AVATAR_COLORS[idx];
  return `linear-gradient(135deg, ${a}, ${b})`;
};

const StartSession = () => {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { currentUser, fetchAssignedPlayersForCoach, userToken } = useStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const surface = dark ? 'var(--cl-surface)' : '#fff';
  const border = dark ? 'var(--cl-border)' : '#E2E8F0';
  const textPrimary = dark ? 'var(--cl-text)' : '#0F172A';
  const textSecondary = dark ? 'var(--cl-text-2)' : '#475569';
  const textMuted = dark ? 'var(--cl-text-3)' : '#94A3B8';
  const surface2 = dark ? 'var(--cl-surface-2)' : '#F8FAFC';

  const [players, setPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [filterStage, setFilterStage] = useState('all');
  const [viewMode, setViewMode] = useState('players');
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const convertProgressToPercentage = (progress) => {
    if (typeof progress === 'number') return progress;
    if (progress === 'Not Started') return 0;
    if (progress === 'In Progress') return 50;
    if (progress === 'Completed') return 100;
    return 0;
  };

  const fetchSessionCardById = async (sessionCardId, token) => {
    try {
      if (!token) return null;
      const response = await fetch(
        'https://kyfkhl8v4l.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_View_Sessioncard',
        {
          method: 'POST',
          headers: { 'Accept': 'application/json, text/plain, */*', 'Content-Type': 'application/json', 'userToken': token, 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ sessionCardId })
        }
      );
      if (!response.ok) return null;
      const result = await response.json();
      return result.sessionCard || result.data || result;
    } catch { return null; } /* ignore fetch errors */
  };

  const refreshSessionCards = async () => {
    try {
      setIsLoading(true);
      const coachResult = await fetchAssignedPlayersForCoach(currentUser.id);
      if (coachResult.success && coachResult.players) {
        const playerItem = coachResult.players.find(item => {
          const player = item.player || item;
          return (player._id || player.playerId) === selectedPlayer.playerId;
        });
        if (playerItem && playerItem.sessionCardIds && playerItem.sessionCardIds.length > 0) {
          let token = userToken;
          if (!token) {
            try { const s = localStorage.getItem('coachlife_auth'); if (s) token = JSON.parse(s).userToken; } catch { /* ignore */ }
          }
          if (!token) { setIsGenerating(false); return; }
          const cards = [];
          for (const id of playerItem.sessionCardIds) {
            const card = await fetchSessionCardById(id, token);
            if (card) cards.push(card);
          }
          setSessions(cards);
        }
      }
      setIsGenerating(false);
    } catch { setIsGenerating(false); } finally { setIsLoading(false); }
  };

  const generateSessionCard = async () => {
    try {
      setIsGenerating(true);
      setGenerateError(null);
      if (!selectedPlayer?.playerId) { setGenerateError('Please select a player first.'); setIsGenerating(false); return; }
      let token = userToken;
      if (!token) {
        try { const s = localStorage.getItem('coachlife_auth'); if (s) token = JSON.parse(s).userToken; } catch { /* ignore */ }
      }
      if (!token) { setGenerateError('No authentication token found. Please login again.'); setIsGenerating(false); return; }
      const response = await fetch(
        'https://7mbaul8uz9.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_Session_Card_Generating',
        { method: 'POST', headers: { 'Accept': 'application/json, text/plain, */*', 'Content-Type': 'application/json', 'userToken': token, 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ playerId: selectedPlayer.playerId }) }
      );
      if (!response.ok) {
        const errorText = await response.text();
        let msg = `Failed to generate session card: ${response.status}`;
        try { const j = JSON.parse(errorText); if (j.error) msg = j.error; else if (j.message) msg = j.message; } catch { /* ignore */ }
        throw new Error(msg);
      }
      await response.json();
      await refreshSessionCards();
    } catch (error) {
      if (error.message?.includes('Failed to fetch')) { setTimeout(() => refreshSessionCards(), 1000); }
      else { setGenerateError(error.message || 'Failed to generate session card'); }
    } finally { setIsGenerating(false); }
  };

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        setIsLoading(true);
        const result = await fetchAssignedPlayersForCoach(currentUser.id);
        if (result.success && result.players) {
          const transformed = result.players.map(item => {
            const player = item.player || item;
            return {
              playerId: player._id || player.id || player.playerId,
              name: player.playerName || player.name,
              email: player.phone || '',
              learningPathway: player.LearningPathway || 'Not Assigned',
              progress: convertProgressToPercentage(player.progress),
              totalPoints: player.TotalPoints || 0,
              status: player.status,
              sessionCardIds: item.sessionCardIds || []
            };
          });
          setPlayers(transformed);
          if (playerId) {
            const player = transformed.find(p => p.playerId === playerId);
            if (player) {
              setSelectedPlayer(player);
              if (player.sessionCardIds?.length > 0) {
                let token = userToken;
                if (!token) { try { const s = localStorage.getItem('coachlife_auth'); if (s) token = JSON.parse(s).userToken; } catch { /* ignore */ } }
                const cards = await Promise.all(player.sessionCardIds.map(id => fetchSessionCardById(id, token).catch(() => null)));
                setSessions(cards.filter(Boolean));
              } else { setSessions([]); }
              setGenerateError(null);
            }
          } else { setSelectedPlayer(null); setSessions([]); setGenerateError(null); }
        }
      } catch { setPlayers([]); } finally { setIsLoading(false); }
    };
    if (currentUser?.id) loadPlayers();
  }, [currentUser?.id, fetchAssignedPlayersForCoach, playerId, userToken]);

  useEffect(() => {
    if (!currentUser?.id || !userToken) return;
    const controller = new AbortController();
    (async () => {
      setBatchesLoading(true);
      try {
        const res = await fetch(CL_GET_BATCHES_URL, { signal: controller.signal, headers: { 'Content-Type': 'application/json', 'userToken': userToken } });
        const data = await res.json();
        const all = data.batches || [];
        setBatches(all.filter(b => b.coachIds && b.coachIds.includes(currentUser.id)));
      } catch (e) { if (e.name !== 'AbortError') setBatches([]); } finally { setBatchesLoading(false); }
    })();
    return () => controller.abort();
  }, [currentUser?.id, userToken]);

  const handleSelectPlayer = async (player) => {
    setSelectedPlayer(player);
    navigate(`/coach/start-session/${player.playerId}`);
    setIsLoading(true);
    try {
      setGenerateError(null);
      if (player.sessionCardIds?.length > 0) {
        let token = userToken;
        if (!token) { try { const s = localStorage.getItem('coachlife_auth'); if (s) token = JSON.parse(s).userToken; } catch { /* ignore */ } }
        const cards = await Promise.all(player.sessionCardIds.map(id => fetchSessionCardById(id, token).catch(() => null)));
        setSessions(cards.filter(Boolean));
      } else { setSessions([]); }
    } catch { setSessions([]); } finally { setIsLoading(false); }
  };

  let filteredPlayers = players.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPathway = filterStage === 'all' || p.learningPathway === filterStage;
    return matchesSearch && matchesPathway;
  });
  filteredPlayers = [...filteredPlayers].sort((a, b) => {
    switch (sortBy) {
      case 'points': return (b.totalPoints || 0) - (a.totalPoints || 0);
      case 'pathway': return (a.learningPathway || '').localeCompare(b.learningPathway || '');
      default: return a.name.localeCompare(b.name);
    }
  });

  const uniquePathways = [...new Set(players.map(p => p.learningPathway).filter(Boolean))].sort();
  const totalPlayers = players.length;
  const totalSessionCards = players.reduce((sum, p) => sum + (p.sessionCardIds?.length || 0), 0);
  const totalPoints = players.reduce((sum, p) => sum + (p.totalPoints || 0), 0);

  const headerStats = [
    { icon: Users, label: 'Players', value: totalPlayers },
    { icon: Zap, label: 'Session Cards', value: totalSessionCards },
    { icon: Trophy, label: 'Total Points', value: totalPoints.toLocaleString() },
    { icon: Layers, label: 'My Batches', value: batches.length },
  ];

  const viewTabs = [
    { key: 'players', label: 'All Players', icon: Users },
    { key: 'batches', label: 'By Batch', icon: Layers },
  ];

  if (selectedPlayer) {
    return (
      <Layout>
        <SessionCardsView
          selectedPlayer={selectedPlayer}
          sessions={sessions}
          isGenerating={isGenerating}
          isLoading={isLoading}
          generateError={generateError}
          onGenerateCard={generateSessionCard}
          currentUser={currentUser}
          fetchAssignedPlayersForCoach={fetchAssignedPlayersForCoach}
          onBack={() => { setSelectedPlayer(null); setSessions([]); navigate('/coach/start-session'); }}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <style>{`@keyframes skPulse { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px 40px' }}>

        {/* ── Header ── */}
        {isLoading ? (
          <div style={{
            background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
            borderRadius: '20px', padding: '28px 32px', marginBottom: '24px', minHeight: '200px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <Sk w={52} h={52} r={14} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Sk w={200} h={28} r={6} />
                <Sk w={280} h={14} r={6} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginTop: '28px' }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ height: '70px', background: 'rgba(255,255,255,0.09)', borderRadius: '12px', animation: `skPulse 1.6s ease-in-out infinite`, animationDelay: `${i*0.08}s` }} />
              ))}
            </div>
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
            borderRadius: '20px',
            padding: '28px 32px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxShadow: '0 12px 40px rgba(6,0,48,.3)',
            flexWrap: 'wrap',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-60px', right: '120px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,.12)', border: '1.5px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={24} color="#fff" />
                </div>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: '0 0 3px', letterSpacing: '-.5px' }}>Start Session</h1>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.6)', margin: 0, fontWeight: '500' }}>Select a player to begin a coaching session</p>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {headerStats.map(({ icon, label, value }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', borderRadius: '14px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {createElement(icon, { size: 18, color: '#fff' })}
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', margin: 0, fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</p>
                      <p style={{ fontSize: '20px', fontWeight: '800', color: '#fff', margin: '2px 0 0', lineHeight: 1 }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* View mode toggle */}
              <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '4px', gap: '2px' }}>
                {viewTabs.map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => setViewMode(key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '7px',
                      padding: '9px 18px', borderRadius: '9px', border: 'none',
                      background: viewMode === key ? 'white' : 'transparent',
                      color: viewMode === key ? '#6366F1' : 'rgba(255,255,255,0.8)',
                      fontWeight: viewMode === key ? '700' : '500',
                      fontSize: '13px', cursor: 'pointer',
                      transition: 'all 0.22s ease',
                      boxShadow: viewMode === key ? '0 2px 10px rgba(0,0,0,0.15)' : 'none'
                    }}
                  >
                    {createElement(icon, { size: 14 })} {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Players view ── */}
        {viewMode === 'players' && (
          <>
            {/* Search & filter bar */}
            {!isLoading && (
              <div style={{
                background: surface,
                borderRadius: '16px',
                border: `1.5px solid ${border}`,
                padding: '16px 20px',
                marginBottom: '28px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: searchFocused ? '#6366F1' : textMuted, pointerEvents: 'none', transition: 'color 0.2s' }} />
                  <input
                    type="text"
                    placeholder="Search players by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    style={{
                      width: '100%', padding: '10px 36px 10px 38px',
                      border: `1.5px solid ${searchFocused ? '#6366F1' : border}`,
                      borderRadius: '10px', fontSize: '14px', outline: 'none',
                      background: surface2, color: textPrimary,
                      boxShadow: searchFocused ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
                      transition: 'all 0.2s ease', boxSizing: 'border-box'
                    }}
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: textMuted, display: 'flex', padding: 0 }}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Sort */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{ appearance: 'none', padding: '10px 34px 10px 14px', borderRadius: '10px', border: `1.5px solid ${border}`, background: surface2, cursor: 'pointer', fontSize: '13px', color: textPrimary, fontWeight: '500', outline: 'none', transition: 'all 0.2s' }}
                    onFocus={(e) => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = border; e.target.style.boxShadow = 'none'; }}
                  >
                    <option value="name">Sort: Name</option>
                    <option value="points">Sort: Points</option>
                    <option value="pathway">Sort: Pathway</option>
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: textSecondary, pointerEvents: 'none' }} />
                </div>

                {/* Pathway filter */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <select
                    value={filterStage}
                    onChange={(e) => setFilterStage(e.target.value)}
                    style={{ appearance: 'none', padding: '10px 34px 10px 14px', borderRadius: '10px', border: `1.5px solid ${filterStage !== 'all' ? '#6366F1' : border}`, background: filterStage !== 'all' ? 'rgba(99,102,241,0.1)' : surface2, cursor: 'pointer', fontSize: '13px', color: filterStage !== 'all' ? '#6366F1' : textPrimary, fontWeight: filterStage !== 'all' ? '600' : '500', outline: 'none', transition: 'all 0.2s' }}
                    onFocus={(e) => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = filterStage !== 'all' ? '#6366F1' : border; e.target.style.boxShadow = 'none'; }}
                  >
                    <option value="all">All Pathways</option>
                    {uniquePathways.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: filterStage !== 'all' ? '#6366F1' : textSecondary, pointerEvents: 'none' }} />
                </div>

                <span style={{ fontSize: '13px', color: textMuted, fontWeight: '500', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
                  {filteredPlayers.length} of {players.length} players
                </span>
              </div>
            )}

            {/* Player cards grid */}
            {isLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} style={{ background: surface, borderRadius: '16px', border: `1.5px solid ${border}`, overflow: 'hidden', animation: `skPulse 1.6s ease-in-out infinite`, animationDelay: `${i * 0.07}s` }}>
                    <div style={{ height: '90px', background: surface2 }} />
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <Sk w="80%" h={14} r={6} />
                      <Sk w="55%" h={14} r={6} />
                      <Sk w="100%" h={38} r={8} />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPlayers.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                <>
                  {filteredPlayers.map((player) => (
                    <div
                      key={player.playerId}
                      style={{
                        background: surface,
                        borderRadius: '16px',
                        border: `1.5px solid ${border}`,
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        transition: 'box-shadow 0.3s ease, border-color 0.3s ease, transform 0.3s ease',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 10px 36px rgba(99,102,241,0.22)';
                        e.currentTarget.style.borderColor = '#6366F1';
                        e.currentTarget.style.transform = 'translateY(-5px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                        e.currentTarget.style.borderColor = border;
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                      onClick={() => handleSelectPlayer(player)}
                    >
                      {/* Card header with avatar */}
                      <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: '14px', borderBottom: `1.5px solid ${border}` }}>
                        <div style={{
                          width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
                          background: avatarGradient(player.name),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '20px', fontWeight: '800', color: 'white',
                          boxShadow: '0 4px 12px rgba(99,102,241,0.25)'
                        }}>
                          {(player.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontSize: '15px', fontWeight: '700', color: textPrimary, margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {player.name}
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%',
                              background: player.status === 'active' ? '#10B981' : textMuted
                            }} />
                            <span style={{ fontSize: '11px', color: textMuted, fontWeight: '500', textTransform: 'capitalize' }}>
                              {player.status || 'active'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Pathway badge */}
                      <div style={{ padding: '12px 20px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <BookOpen size={12} color="#6366F1" />
                        <span style={{
                          fontSize: '11px', fontWeight: '600', color: '#6366F1',
                          background: 'rgba(99,102,241,0.1)', padding: '3px 9px',
                          borderRadius: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%'
                        }}>
                          {player.learningPathway}
                        </span>
                      </div>

                      {/* Stats */}
                      <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ background: surface2, borderRadius: '10px', padding: '11px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                            <Star size={11} color="#6366F1" />
                            <span style={{ fontSize: '10px', color: textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Points</span>
                          </div>
                          <p style={{ fontSize: '18px', fontWeight: '800', color: '#6366F1', margin: 0, lineHeight: 1 }}>
                            {(player.totalPoints || 0).toLocaleString()}
                          </p>
                        </div>
                        <div style={{ background: surface2, borderRadius: '10px', padding: '11px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                            <Zap size={11} color="#10B981" />
                            <span style={{ fontSize: '10px', color: textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Cards</span>
                          </div>
                          <p style={{ fontSize: '18px', fontWeight: '800', color: '#10B981', margin: 0, lineHeight: 1 }}>
                            {player.sessionCardIds?.length || 0}
                          </p>
                        </div>
                      </div>

                      {/* CTA */}
                      <div style={{ padding: '0 20px 20px', marginTop: 'auto' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSelectPlayer(player); }}
                          style={{
                            width: '100%', padding: '11px 16px',
                            borderRadius: '10px', background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                            color: 'white', fontSize: '13px', fontWeight: '700',
                            border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            transition: 'all 0.2s ease',
                            letterSpacing: '0.2px'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.35)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          View Session Cards <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              </div>
            ) : (
              <div style={{
                background: surface, borderRadius: '16px', border: `1.5px solid ${border}`,
                padding: '64px 32px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Users size={32} color={textMuted} />
                </div>
                <p style={{ fontSize: '18px', fontWeight: '700', color: textPrimary, margin: '0 0 8px' }}>
                  {players.length === 0 ? 'No players assigned yet' : 'No players match your filters'}
                </p>
                <p style={{ fontSize: '14px', color: textSecondary, margin: '0 0 24px' }}>
                  {players.length === 0 ? 'Players will appear here once assigned to you' : 'Try adjusting your search or filters'}
                </p>
                {(filterStage !== 'all' || searchTerm) && (
                  <button
                    onClick={() => { setSearchTerm(''); setFilterStage('all'); }}
                    style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', color: 'white', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Batches view ── */}
        {viewMode === 'batches' && (
          batchesLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ background: surface, borderRadius: '16px', border: `1.5px solid ${border}`, overflow: 'hidden', animation: `skPulse 1.6s ease-in-out infinite`, animationDelay: `${i*0.08}s` }}>
                  <div style={{ height: '80px', background: surface2 }} />
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <Sk w="60%" h={14} r={6} />
                    <Sk w="40%" h={14} r={6} />
                    <Sk w="100%" h={38} r={8} />
                  </div>
                </div>
              ))}
            </div>
          ) : batches.length === 0 ? (
            <div style={{ background: surface, borderRadius: '16px', border: `1.5px solid ${border}`, padding: '64px 32px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Layers size={32} color={textMuted} />
              </div>
              <p style={{ fontSize: '18px', fontWeight: '700', color: textPrimary, margin: '0 0 8px' }}>No batches assigned</p>
              <p style={{ fontSize: '14px', color: textSecondary, margin: 0 }}>
                Ask an admin to assign you to a batch from the Manage Batches page
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {batches.map((batch) => (
                <div
                  key={batch.batchId}
                  style={{
                    background: surface, borderRadius: '16px', border: `1.5px solid ${border}`,
                    overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'box-shadow 0.3s ease, border-color 0.3s ease, transform 0.3s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 10px 36px rgba(99,102,241,0.22)'; e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = border; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ padding: '20px', background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)', color: 'white', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Layers size={18} />
                      </div>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>{batch.batchName}</h3>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <span style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.16)', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: '1px solid rgba(255,255,255,0.2)' }}>
                        {batch.players?.length || 0} Players
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '16px 20px' }}>
                    {batch.players && batch.players.length > 0 && (
                      <div style={{ marginBottom: '14px' }}>
                        <p style={{ fontSize: '11px', color: textMuted, fontWeight: '700', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Players</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {batch.players.slice(0, 4).map((p, idx) => (
                            <div key={p.playerId || idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: avatarGradient(p.playerName || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: 'white', flexShrink: 0 }}>
                                {(p.playerName || '?').charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontSize: '13px', color: textPrimary, fontWeight: '500' }}>{p.playerName}</span>
                            </div>
                          ))}
                          {batch.players.length > 4 && (
                            <span style={{ fontSize: '12px', color: textMuted, paddingLeft: '34px' }}>+{batch.players.length - 4} more</span>
                          )}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => navigate('/coach/batch-session', { state: { batch } })}
                      style={{
                        width: '100%', padding: '11px 16px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', color: 'white', fontSize: '13px', fontWeight: '700',
                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.35)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      Start Batch Session <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </Layout>
  );
};

export default StartSession;
