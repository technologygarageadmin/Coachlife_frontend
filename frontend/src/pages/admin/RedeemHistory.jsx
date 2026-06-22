import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Gift, BarChart3, Search, ChevronDown, Zap, Users, Loader, X } from 'lucide-react';
import { useState, useEffect, useRef, useMemo, createElement } from 'react';
import { Toast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';

const API_ENDPOINTS = {
  VIEW_PLAYERS:        'https://jrrnyyf9r9.execute-api.ap-south-1.amazonaws.com/default/CL_Get_All_Players',
  VIEW_REWARDS:        'https://vzcyj52ypb.execute-api.ap-south-1.amazonaws.com/default/CL_View_Reward',
  REDEEM_POINTS:       'https://s86lf3ex9c.execute-api.ap-south-1.amazonaws.com/default/CL_Redem_Points',
  VIEW_REDEEM_HISTORY: 'https://az8e86z41f.execute-api.ap-south-1.amazonaws.com/default/CL_View_Allplayer_Redeemhistory',
};

/* ── shared helpers ── */
const inputBase = {
  width:'100%', padding:'10px 13px', border:'1.5px solid #E2E8F0',
  borderRadius:'9px', fontSize:'13.5px', fontWeight:'500',
  background:'#FAFBFC', color:'#1E293B', boxSizing:'border-box',
  outline:'none', fontFamily:'inherit',
  transition:'border-color .18s, box-shadow .18s, background .18s',
};
const iFocus = e => { e.target.style.borderColor='#6366F1'; e.target.style.background='#fff'; e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,.12)'; };
const iBlur  = e => { e.target.style.borderColor='#E2E8F0'; e.target.style.background='#FAFBFC'; e.target.style.boxShadow='none'; };

const FormField = ({ label, required, children }) => (
  <div>
    <label style={{ display:'block', fontSize:'11px', fontWeight:'700', color:'#64748B', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'.5px' }}>
      {label}{required && <span style={{ color:'#EF4444', marginLeft:'3px' }}>*</span>}
    </label>
    {children}
  </div>
);

const PALETTES = [
  ['#6366F1','#818CF8'], ['#10B981','#34D399'], ['#F59E0B','#FBBF24'],
  ['#EC4899','#F472B6'], ['#3B82F6','#60A5FA'], ['#8B5CF6','#A78BFA'],
  ['#EF4444','#F87171'], ['#06B6D4','#22D3EE'],
];
const pal = (name = '') => PALETTES[(name.charCodeAt(0) || 0) % PALETTES.length];

const Sk = ({ w, h, r = 8 }) => (
  <div style={{ width:w, height:h, borderRadius:r, background:'#EEF2F7', animation:'rdmPulse 1.6s ease-in-out infinite', flexShrink:0 }} />
);

const SummaryCard = ({ label, value, icon: SummaryIcon, accent, surface, border }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: surface, borderRadius:'16px', padding:'18px 20px',
        border:`1.5px solid ${hov ? accent+'50' : border}`,
        boxShadow: hov ? `0 8px 24px ${accent}20` : '0 2px 6px rgba(0,0,0,.04)',
        display:'flex', alignItems:'center', gap:'14px',
        transition:'all .22s ease', transform: hov ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{ width:'48px', height:'48px', borderRadius:'13px', flexShrink:0, background:`${accent}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {createElement(SummaryIcon, { size: 22, color: accent })}
      </div>
      <div>
        <p style={{ fontSize:'10.5px', fontWeight:'700', color:'#94A3B8', margin:0, textTransform:'uppercase', letterSpacing:'.6px' }}>{label}</p>
        <p style={{ fontSize:'23px', fontWeight:'800', color:'#0F172A', margin:'3px 0 0', letterSpacing:'-1px' }}>{value}</p>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════ */
const RedeemHistory = () => {
  const { userToken } = useStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const surface = dark ? 'var(--cl-surface)' : '#fff';
  const border = dark ? 'var(--cl-border)' : '#F1F5F9';
  const textPrimary = dark ? 'var(--cl-text)' : '#0F172A';
  const textSecondary = dark ? 'var(--cl-text-2)' : '#475569';
  const textMuted = dark ? 'var(--cl-text-3)' : '#94A3B8';
  const surface2 = dark ? 'var(--cl-surface-2)' : '#F8FAFC';

  const [players, setPlayers]                           = useState([]);
  const [rewards, setRewards]                           = useState([]);
  const [redeemHistory, setRedeemHistory]               = useState([]);
  const [searchTerm, setSearchTerm]                     = useState('');
  const [sortBy, setSortBy]                             = useState('recent');
  const [loading, setLoading]                           = useState(true);
  const [toast, setToast]                               = useState(null);
  const [selectedPlayerId, setSelectedPlayerId]         = useState('');
  const [selectedRewardId, setSelectedRewardId]         = useState('');
  const [submitting, setSubmitting]                     = useState(false);
  const [selectedPlayerPoints, setSelectedPlayerPoints] = useState(0);
  const [selectedRewardCost, setSelectedRewardCost]     = useState(0);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchAll();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!selectedPlayerId) { setSelectedPlayerPoints(0); return; }
    const p = players.find(p =>
      p.id === selectedPlayerId || p.playerId === selectedPlayerId || p._id === selectedPlayerId ||
      String(p.id) === String(selectedPlayerId) || String(p.playerId) === String(selectedPlayerId) || String(p._id) === String(selectedPlayerId)
    );
    setSelectedPlayerPoints(p ? Number(p.PointBalance || p.pointBalance || 0) : 0);
  }, [selectedPlayerId, players]);

  useEffect(() => {
    if (!selectedRewardId) { setSelectedRewardCost(0); return; }
    const r = rewards.find(r =>
      r.rewardId === selectedRewardId || r._id === selectedRewardId || r.id === selectedRewardId ||
      String(r.rewardId) === String(selectedRewardId) || String(r._id) === String(selectedRewardId)
    );
    setSelectedRewardCost(r ? Number(r.points || r.rewardPoints || r.pointsRequired || 0) : 0);
  }, [selectedRewardId, rewards]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [pRes, rRes, hRes] = await Promise.all([
        fetch(API_ENDPOINTS.VIEW_PLAYERS,        { headers:{ 'userToken':userToken } }),
        fetch(API_ENDPOINTS.VIEW_REWARDS,         { headers:{ 'userToken':userToken } }),
        fetch(API_ENDPOINTS.VIEW_REDEEM_HISTORY,  { headers:{ 'userToken':userToken } }),
      ]);
      const [pData, rData, hData] = await Promise.all([pRes.json(), rRes.json(), hRes.json()]);

      const pick = (d, ...keys) => {
        if (Array.isArray(d)) return d;
        for (const k of keys) if (d[k] && Array.isArray(d[k])) return d[k];
        return [];
      };
      setPlayers(pick(pData, 'data','players'));
      setRewards(pick(rData, 'data','rewards'));
      setRedeemHistory(pick(hData, 'redeemHistory','data'));
    } catch {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRedeem = async e => {
    e.preventDefault();
    if (!selectedPlayerId || !selectedRewardId) { showToast('Please select both player and reward', 'error'); return; }
    try {
      setSubmitting(true);
      const response = await fetch(API_ENDPOINTS.REDEEM_POINTS, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'userToken':userToken },
        body: JSON.stringify({ playerId:selectedPlayerId, rewardId:selectedRewardId }),
      });
      const result = await response.json();
      if (response.ok) {
        showToast('Reward redeemed successfully!');
        setSelectedPlayerId(''); setSelectedRewardId('');
        fetchAll();
      } else {
        showToast(result.message || 'Failed to redeem reward', 'error');
      }
    } catch {
      showToast('Error redeeming reward', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getPlayerName = playerId => {
    if (!playerId || !players.length) return 'Unknown';
    const p = players.find(p =>
      p.id === playerId || p.playerId === playerId || p._id === playerId ||
      String(p.id) === String(playerId) || String(p.playerId) === String(playerId) || String(p._id) === String(playerId)
    );
    return p ? (p.playerName || p.name || p.fullName || 'Unknown') : 'Unknown';
  };

  const stats = useMemo(() => ({
    total:  redeemHistory.length,
    points: redeemHistory.reduce((s,r) => s+(r.pointsUsed||0), 0),
    unique: new Set(redeemHistory.map(r => r.playerId)).size,
  }), [redeemHistory]);

  const sortedHistory = useMemo(() => {
    const filtered = redeemHistory.filter(r =>
      getPlayerName(r.playerId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.rewardName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    return [...filtered].sort((a,b) => {
      if (sortBy === 'recent')      return new Date(b.redeemedAt) - new Date(a.redeemedAt);
      if (sortBy === 'oldest')      return new Date(a.redeemedAt) - new Date(b.redeemedAt);
      if (sortBy === 'points-high') return b.pointsUsed - a.pointsUsed;
      if (sortBy === 'points-low')  return a.pointsUsed - b.pointsUsed;
      return 0;
    });
  }, [redeemHistory, searchTerm, sortBy]); // eslint-disable-line

  const canRedeem = selectedPlayerId && selectedRewardId && players.length > 0 && rewards.length > 0
    && selectedPlayerPoints >= selectedRewardCost && !submitting;

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <style>{`
        @keyframes rdmPulse  { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes rdmFadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      <div style={{ maxWidth:'1400px', margin:'0 auto', padding:'24px 28px', animation:'rdmFadeUp .3s ease' }}>

        {/* ── Header banner ── */}
        <div style={{
          background:'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
          borderRadius:'20px', padding:'28px 32px', marginBottom:'24px',
          display:'flex', alignItems:'center', gap:'16px',
          boxShadow:'0 12px 40px rgba(6,0,48,.3)', flexWrap:'wrap',
        }}>
          <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:'rgba(255,255,255,.12)', border:'1.5px solid rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Gift size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize:'24px', fontWeight:'800', color:'#fff', margin:'0 0 3px', letterSpacing:'-.5px' }}>Redeem History</h1>
            <p style={{ fontSize:'13px', color:'rgba(255,255,255,.6)', margin:0, fontWeight:'500' }}>
              {loading ? 'Loading…' : `${stats.total} redemption${stats.total !== 1 ? 's' : ''} · ${stats.unique} player${stats.unique !== 1 ? 's' : ''} engaged`}
            </p>
          </div>
        </div>

        {/* ── Summary cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:'14px', marginBottom:'24px' }}>
          {loading ? [1,2,3].map(i => (
            <div key={i} style={{ background: surface, borderRadius:'16px', padding:'18px 20px', border:`1px solid ${border}`, display:'flex', gap:'14px', alignItems:'center' }}>
              <Sk w="48px" h="48px" r={13} />
              <div style={{ flex:1 }}><Sk w="60%" h="10px" /><div style={{marginTop:8}}><Sk w="42%" h="22px" /></div></div>
            </div>
          )) : <>
            <SummaryCard label="Total Redeems"   value={stats.total}  icon={Gift}     accent="#6366F1" surface={surface} border={border} />
            <SummaryCard label="Total Pts Used"  value={stats.points} icon={BarChart3} accent="#F59E0B" surface={surface} border={border} />
            <SummaryCard label="Players Engaged" value={stats.unique} icon={Users}    accent="#10B981" surface={surface} border={border} />
          </>}
        </div>

        {/* ── Redeem form card ── */}
        {!loading && (
          <div style={{
            background: surface, borderRadius:'20px', padding:'24px 28px', marginBottom:'24px',
            border:`1.5px solid ${border}`, boxShadow:'0 4px 16px rgba(0,0,0,.06)',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px' }}>
              <div style={{ width:'40px', height:'40px', borderRadius:'11px', background:'linear-gradient(135deg,#F59E0B,#D97706)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Zap size={18} color="#fff" />
              </div>
              <div>
                <h2 style={{ fontSize:'17px', fontWeight:'800', color: textPrimary, margin:0 }}>New Redemption</h2>
                <p style={{ fontSize:'12px', color: textMuted, fontWeight:'500', margin:0 }}>Reward players for their achievements</p>
              </div>
            </div>

            {/* info tiles */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:'10px', marginBottom:'18px' }}>
              <div style={{ padding:'10px 14px', borderRadius:'10px', background: surface2, border:`1px solid ${border}` }}>
                <p style={{ fontSize:'10px', color: textMuted, fontWeight:'700', textTransform:'uppercase', letterSpacing:'.5px', margin:0 }}>Players</p>
                <p style={{ fontSize:'18px', fontWeight:'800', color: textPrimary, margin:'4px 0 0' }}>{players.length}</p>
              </div>
              <div style={{ padding:'10px 14px', borderRadius:'10px', background: surface2, border:`1px solid ${border}` }}>
                <p style={{ fontSize:'10px', color: textMuted, fontWeight:'700', textTransform:'uppercase', letterSpacing:'.5px', margin:0 }}>Rewards</p>
                <p style={{ fontSize:'18px', fontWeight:'800', color: textPrimary, margin:'4px 0 0' }}>{rewards.length}</p>
              </div>
              {selectedPlayerId && (
                <div style={{ padding:'10px 14px', borderRadius:'10px', background:'#FFFBEB', border:'1.5px solid #FDE68A' }}>
                  <p style={{ fontSize:'10px', color:'#92400E', fontWeight:'700', textTransform:'uppercase', letterSpacing:'.5px', margin:0 }}>Point Balance</p>
                  <p style={{ fontSize:'18px', fontWeight:'800', color:'#D97706', margin:'4px 0 0' }}>{selectedPlayerPoints}</p>
                </div>
              )}
              {selectedPlayerId && selectedRewardId && (
                <div style={{ padding:'10px 14px', borderRadius:'10px', background: selectedPlayerPoints >= selectedRewardCost ? '#F0FDF4' : '#FEF2F2', border:`1.5px solid ${selectedPlayerPoints >= selectedRewardCost ? '#BBF7D0' : '#FECACA'}` }}>
                  <p style={{ fontSize:'10px', color: selectedPlayerPoints >= selectedRewardCost ? '#15803D' : '#B91C1C', fontWeight:'700', textTransform:'uppercase', letterSpacing:'.5px', margin:0 }}>Reward Cost</p>
                  <p style={{ fontSize:'18px', fontWeight:'800', color: selectedPlayerPoints >= selectedRewardCost ? '#15803D' : '#EF4444', margin:'4px 0 0' }}>
                    {selectedRewardCost}{selectedPlayerPoints < selectedRewardCost && <span style={{ fontSize:'11px', marginLeft:'6px', fontWeight:'600' }}>Insufficient</span>}
                  </p>
                </div>
              )}
            </div>

            <form onSubmit={handleRedeem} style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'14px', alignItems:'flex-end' }}>
              <FormField label="Player" required>
                <select value={selectedPlayerId} onChange={e => setSelectedPlayerId(e.target.value)} style={inputBase} onFocus={iFocus} onBlur={iBlur}>
                  <option value="">Choose a player…</option>
                  {players.map(p => (
                    <option key={p.id||p._id||p.playerId} value={p.id||p._id||p.playerId}>
                      {p.playerName || p.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Reward" required>
                <select value={selectedRewardId} onChange={e => setSelectedRewardId(e.target.value)} style={inputBase} onFocus={iFocus} onBlur={iBlur}>
                  <option value="">Choose a reward…</option>
                  {rewards.filter(r => r.isActive === true || r.active === true).map(r => (
                    <option key={r.id||r._id||r.rewardId} value={r.id||r._id||r.rewardId}>
                      {r.rewardName || r.name} ({r.points} pts)
                    </option>
                  ))}
                </select>
              </FormField>
              <button
                type="submit" disabled={!canRedeem}
                style={{
                  padding:'11px 22px', borderRadius:'10px', border:'none', fontWeight:'700', fontSize:'14px',
                  background: canRedeem ? 'linear-gradient(135deg,#F59E0B,#D97706)' : surface2,
                  color: canRedeem ? '#fff' : textMuted,
                  cursor: canRedeem ? 'pointer' : 'not-allowed',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                  boxShadow: canRedeem ? '0 4px 14px rgba(245,158,11,.35)' : 'none',
                  transition:'all .18s ease', whiteSpace:'nowrap',
                }}
                onMouseEnter={e => { if(canRedeem) { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(245,158,11,.45)'; }}}
                onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow = canRedeem ? '0 4px 14px rgba(245,158,11,.35)' : 'none'; }}
              >
                {submitting ? <Loader size={15} style={{ animation:'spin 1s linear infinite' }} /> : <Zap size={15} />}
                {submitting ? 'Processing…' : 'Redeem Reward'}
              </button>
            </form>
          </div>
        )}

        {/* ── Filter bar ── */}
        <div style={{
          display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px',
          background: surface, padding:'12px 16px', borderRadius:'14px',
          border:`1px solid ${border}`, boxShadow:'0 2px 6px rgba(0,0,0,.04)', flexWrap:'wrap',
        }}>
          <div style={{
            display:'flex', alignItems:'center', gap:'8px', flex:'1', minWidth:'200px',
            border:`1.5px solid ${border}`, borderRadius:'10px', padding:'8px 12px', background: surface2,
          }}
          onFocusCapture={e => { e.currentTarget.style.borderColor='#6366F1'; e.currentTarget.style.boxShadow='0 0 0 3px rgba(99,102,241,.1)'; }}
          onBlurCapture={e => { e.currentTarget.style.borderColor=border; e.currentTarget.style.boxShadow='none'; }}>
            <Search size={15} color={textMuted} />
            <input
              type="text" placeholder="Search player or reward…" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ border:'none', outline:'none', background:'transparent', fontSize:'13px', fontWeight:'500', color:'#1E293B', flex:1, fontFamily:'inherit' }}
            />
            {searchTerm && <button onClick={() => setSearchTerm('')} style={{ border:'none', background:'none', cursor:'pointer', color: textMuted, padding:0, display:'flex' }}><X size={14} /></button>}
          </div>

          <div style={{ position:'relative' }}>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ ...inputBase, width:'165px', paddingRight:'28px', appearance:'none', cursor:'pointer' }}
              onFocus={iFocus} onBlur={iBlur}>
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest First</option>
              <option value="points-high">Highest Points</option>
              <option value="points-low">Lowest Points</option>
            </select>
            <ChevronDown size={13} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color: textSecondary }} />
          </div>

          <span style={{ fontSize:'12px', fontWeight:'700', color: textMuted, marginLeft:'auto', whiteSpace:'nowrap' }}>
            <span style={{ color:'#6366F1' }}>{sortedHistory.length}</span> record{sortedHistory.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── History list ── */}
        <div style={{ background: surface, borderRadius:'16px', border:`1px solid ${border}`, boxShadow:'0 2px 8px rgba(0,0,0,.05)', overflow:'hidden' }}>
          <div style={{ padding:'16px 22px', borderBottom:`1px solid ${border}`, background: surface2, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <h3 style={{ fontSize:'15px', fontWeight:'800', color: textPrimary, margin:0 }}>Redemption Records</h3>
            <span style={{ fontSize:'12px', color: textMuted, fontWeight:'600' }}>{sortedHistory.length} entries</span>
          </div>

          {loading ? (
            <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:'12px' }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'12px', borderRadius:'10px', background: surface2 }}>
                  <Sk w="40px" h="40px" r={10} />
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'7px' }}>
                    <Sk w="35%" h="14px" /><Sk w="20%" h="11px" />
                  </div>
                  <Sk w="70px" h="26px" r={999} />
                  <Sk w="90px" h="14px" />
                </div>
              ))}
            </div>
          ) : sortedHistory.length === 0 ? (
            <div style={{ padding:'80px 24px', textAlign:'center' }}>
              <div style={{ width:'80px', height:'80px', borderRadius:'22px', background:'#FFFBEB', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
                <Gift size={36} color="#D97706" />
              </div>
              <p style={{ fontSize:'18px', fontWeight:'800', color: textPrimary, margin:'0 0 8px' }}>No redemptions yet</p>
              <p style={{ fontSize:'13.5px', color: textMuted, margin:0 }}>
                {searchTerm ? 'No results for that search' : 'Use the form above to redeem a reward for a player'}
              </p>
            </div>
          ) : (
            <div>
              {sortedHistory.map((record, i) => {
                const playerName = getPlayerName(record.playerId);
                const [accent] = pal(record.rewardName || '');
                return (
                  <div
                    key={record._id || i}
                    style={{
                      display:'flex', alignItems:'center', gap:'14px', padding:'14px 22px',
                      borderBottom: i < sortedHistory.length-1 ? `1px solid ${border}` : 'none',
                      transition:'background .15s ease', flexWrap:'wrap',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background=surface2}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
                  >
                    {/* reward icon */}
                    <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:`${accent}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Gift size={18} color={accent} />
                    </div>

                    {/* reward name + desc */}
                    <div style={{ flex:'1 1 160px', minWidth:0 }}>
                      <p style={{ margin:0, fontSize:'14px', fontWeight:'700', color: textPrimary, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{record.rewardName}</p>
                      {record.rewardDescription && (
                        <p style={{ margin:'2px 0 0', fontSize:'12px', color: textMuted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{record.rewardDescription}</p>
                      )}
                    </div>

                    {/* player badge */}
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 10px', borderRadius:'999px', background: border, whiteSpace:'nowrap', flexShrink:0 }}>
                      <div style={{ width:'20px', height:'20px', borderRadius:'50%', background:'linear-gradient(135deg,#6366F1,#8B5CF6)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:'800', fontSize:'9px', flexShrink:0 }}>
                        {playerName.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize:'12px', fontWeight:'700', color: textSecondary }}>{playerName}</span>
                    </div>

                    {/* points badge */}
                    <div style={{ display:'flex', alignItems:'center', gap:'5px', padding:'5px 11px', borderRadius:'999px', background:'#FFFBEB', border:'1px solid #FDE68A', whiteSpace:'nowrap', flexShrink:0 }}>
                      <Zap size={12} color="#D97706" />
                      <span style={{ fontSize:'12px', fontWeight:'800', color:'#92400E' }}>{record.pointsUsed} pts</span>
                    </div>

                    {/* date */}
                    <span style={{ fontSize:'12px', color: textMuted, fontWeight:'600', whiteSpace:'nowrap', flexShrink:0, minWidth:'110px', textAlign:'right' }}>
                      {new Date(record.redeemedAt).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' })}
                    </span>

                    {/* redeemed by */}
                    {record.redeemedByName && (
                      <span style={{ fontSize:'12px', color: textSecondary, fontWeight:'600', whiteSpace:'nowrap', flexShrink:0, textAlign:'right' }}>
                        by {record.redeemedByName}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default RedeemHistory;
