import { useState, useEffect, useRef, useMemo, createElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Toast } from '../../components/Toast';
import {
  Users, X, Search, ChevronDown, Layers,
  ArrowLeftRight, Loader, Link2, UserCheck,
} from 'lucide-react';

/* ── input helpers ── */
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

const SectionHeading = ({ children }) => (
  <div style={{ display:'flex', alignItems:'center', gap:'8px', margin:'18px 0 12px' }}>
    <div style={{ flex:1, height:'1px', background:'#EEF2F7' }} />
    <span style={{ fontSize:'10px', fontWeight:'700', color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.8px', whiteSpace:'nowrap' }}>{children}</span>
    <div style={{ flex:1, height:'1px', background:'#EEF2F7' }} />
  </div>
);

const SelectWrap = ({ label, required, value, onChange, disabled, children }) => (
  <FormField label={label} required={required}>
    <div style={{ position:'relative' }}>
      <select
        value={value} onChange={onChange} disabled={disabled}
        style={{ ...inputBase, paddingRight:'28px', appearance:'none', cursor: disabled?'not-allowed':'pointer', opacity: disabled?0.6:1 }}
        onFocus={iFocus} onBlur={iBlur}
      >
        {children}
      </select>
      <ChevronDown size={13} style={{ position:'absolute', right:'9px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:'#64748B' }} />
    </div>
  </FormField>
);

/* ── palette ── */
const PALETTES = [
  ['#6366F1','#818CF8'], ['#10B981','#34D399'], ['#F59E0B','#FBBF24'],
  ['#EC4899','#F472B6'], ['#3B82F6','#60A5FA'], ['#8B5CF6','#A78BFA'],
  ['#EF4444','#F87171'], ['#06B6D4','#22D3EE'],
];
const pal = (name = '') => PALETTES[name.charCodeAt(0) % PALETTES.length];

/* ── skeleton ── */
const Sk = ({ w, h, r = 8 }) => (
  <div style={{ width:w, height:h, borderRadius:r, background:'#EEF2F7', animation:'plsPulse 1.6s ease-in-out infinite' }} />
);

/* ── stat summary card ── */
const SummaryCard = ({ label, value, icon: SummaryIcon, accent }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background:'#fff', borderRadius:'16px', padding:'18px 20px',
        border:`1.5px solid ${hov ? accent+'50' : '#F1F5F9'}`,
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
const AssignPlayers = () => {
  const navigate = useNavigate();
  const { players, coaches, assignPlayerToCoach, fetchPlayers, fetchCoaches, removePlayerFromCoach, swapPlayerBetweenCoaches, fetchAssignedPlayersForCoach } = useStore();

  const [removingPlayerId, setRemovingPlayerId]       = useState(null);
  const [coachAssignments, setCoachAssignments]       = useState({});
  const [assignedPlayersData, setAssignedPlayersData] = useState({});
  const [selectedPlayer, setSelectedPlayer]           = useState('');
  const [selectedCoach, setSelectedCoach]             = useState('');
  const [selectedSwapPlayer, setSelectedSwapPlayer]   = useState('');
  const [selectedSwapFromCoach, setSelectedSwapFromCoach] = useState('');
  const [selectedSwapToCoach, setSelectedSwapToCoach] = useState('');
  const [searchTerm, setSearchTerm]                   = useState('');
  const [filterCoach, setFilterCoach]                 = useState('all');
  const [_assignmentSuccess, setAssignmentSuccess]    = useState(null);
  const [_assignmentError, setAssignmentError]        = useState(null);
  const [isAssigning, setIsAssigning]                 = useState(false);
  const [isSwapping, setIsSwapping]                   = useState(false);
  const [isLoading, setIsLoading]                     = useState(true);
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false);
  const [toast, setToast]                             = useState(null);
  const [hasLoadedInitial, setHasLoadedInitial]       = useState(false);
  const initialFetchRef = useRef(false);
  const isPageLoading = isLoading || isAssignmentsLoading;

  const fetchAllAssignments = async () => {
    if (!coaches || coaches.length === 0) return;
    const assignments = {};
    const playersData = {};
    for (const coach of coaches) {
      try {
        const result = await fetchAssignedPlayersForCoach(coach.coachId);
        if (result.success && result.players) {
          assignments[coach.coachId] = result.players.map(item => ({
            player: item.player || item,
            sessionCards: item.sessionCards || [],
            coachId: coach.coachId
          }));
          result.players.forEach(item => {
            const playerId = item.player?._id || item._id || item.playerId;
            if (playerId) {
              playersData[playerId] = { player: item.player || item, sessionCards: item.sessionCards || [], coachId: coach.coachId };
            }
          });
        } else {
          assignments[coach.coachId] = [];
        }
      } catch {
        assignments[coach.coachId] = [];
      }
    }
    setCoachAssignments(assignments);
    setAssignedPlayersData(playersData);
  };

  useEffect(() => {
    if (initialFetchRef.current) return;
    initialFetchRef.current = true;
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchPlayers(), fetchCoaches()]);
        setIsAssignmentsLoading(true);
        setHasLoadedInitial(true);
      } catch {
        setIsAssignmentsLoading(false);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [fetchPlayers, fetchCoaches]);

  useEffect(() => {
    const loadAssignments = async () => {
      if (!hasLoadedInitial) return;
      if (!coaches || coaches.length === 0) { setIsAssignmentsLoading(false); return; }
      setIsAssignmentsLoading(true);
      try { await fetchAllAssignments(); }
      catch { /* silent */ }
      finally { setIsAssignmentsLoading(false); }
    };
    loadAssignments();
  }, [hasLoadedInitial, coaches]); // eslint-disable-line

  useEffect(() => {
    if (selectedSwapPlayer && coachAssignments && Object.keys(coachAssignments).length > 0) {
      for (const [coachId, assignedDataArray] of Object.entries(coachAssignments)) {
        const playerExists = assignedDataArray.some(item => {
          const pId = item.player?._id || item.player?.playerId || item._id || item.playerId;
          return pId === selectedSwapPlayer;
        });
        if (playerExists) { setSelectedSwapFromCoach(coachId); setSelectedSwapToCoach(''); return; }
      }
    } else if (!selectedSwapPlayer) {
      setSelectedSwapFromCoach(''); setSelectedSwapToCoach('');
    }
  }, [selectedSwapPlayer, coachAssignments]);

  const handleAssign = async () => {
    if (!selectedPlayer || !selectedCoach) return;
    setIsAssigning(true); setAssignmentError(null);
    const result = await assignPlayerToCoach(selectedPlayer, selectedCoach);
    if (result.success) {
      const coachName = coaches.find(c => c.coachId === selectedCoach)?.name;
      setAssignmentSuccess({ player: players.find(p => p.playerId === selectedPlayer)?.name, coach: coachName });
      setToast({ type:'success', message:`Player assigned to ${coachName}` });
      setSelectedPlayer(''); setSelectedCoach('');
      await fetchAllAssignments();
    } else {
      setAssignmentError(result.error || 'Failed to assign player');
      setToast({ type:'error', message: result.error || 'Failed to assign player' });
    }
    setTimeout(() => { setAssignmentSuccess(null); setToast(null); }, 3000);
    setIsAssigning(false);
  };

  const handleRemovePlayer = async (playerId, fromCoachId) => {
    setRemovingPlayerId(playerId); setAssignmentError(null);
    const result = await removePlayerFromCoach({ playerId, fromCoachId });
    if (result.success) {
      const coachName = coaches.find(c => c.coachId === fromCoachId)?.name;
      setAssignmentSuccess({ player: players.find(p => p.playerId === playerId)?.name, coach: coachName, action:'removed' });
      setToast({ type:'success', message:`Player removed from ${coachName}` });
      await fetchAllAssignments();
    } else {
      setAssignmentError(result.error || 'Failed to remove player');
      setToast({ type:'error', message: result.error || 'Failed to remove player' });
    }
    setTimeout(() => { setAssignmentSuccess(null); setToast(null); }, 3000);
    setRemovingPlayerId(null);
  };

  const handleSwapPlayer = async () => {
    if (!selectedSwapPlayer || !selectedSwapFromCoach || !selectedSwapToCoach) return;
    setIsSwapping(true); setAssignmentError(null);
    const result = await swapPlayerBetweenCoaches(selectedSwapPlayer, selectedSwapFromCoach, selectedSwapToCoach);
    if (result.success) {
      const fromName = coaches.find(c => c.coachId === selectedSwapFromCoach)?.name;
      const toName   = coaches.find(c => c.coachId === selectedSwapToCoach)?.name;
      setToast({ type:'success', message:`Player swapped from ${fromName} to ${toName}` });
      setSelectedSwapPlayer(''); setSelectedSwapFromCoach(''); setSelectedSwapToCoach('');
      await fetchAllAssignments();
    } else {
      setAssignmentError(result.error || 'Failed to swap player');
      setToast({ type:'error', message: result.error || 'Failed to swap player' });
    }
    setTimeout(() => setToast(null), 3000);
    setIsSwapping(false);
  };

  const assignments = coaches.map(coach => ({ coach, assignedData: coachAssignments[coach.coachId] || [] }));

  const filteredAssignments = assignments.filter(a => {
    const matchesCoachFilter = filterCoach === 'all' || a.coach.coachId === filterCoach;
    const matchesSearch = a.assignedData.some(item => {
      const name = (item.player?.playerName || item.player?.name || '').toLowerCase();
      return name.includes(searchTerm.toLowerCase());
    });
    return matchesCoachFilter && (searchTerm === '' || matchesSearch);
  });

  const stats = useMemo(() => ({
    total: players.length,
    assigned: Object.keys(assignedPlayersData).length,
    unassigned: players.length - Object.keys(assignedPlayersData).length,
    totalAssignments: Object.values(coachAssignments).reduce((s,a) => s + a.length, 0),
  }), [players, assignedPlayersData, coachAssignments]);

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <Layout>
      {toast && <Toast type={toast.type} message={toast.message} />}

      <style>{`
        @keyframes plsPulse { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @media(max-width:900px){ .ap-cols{grid-template-columns:1fr!important} }
        @media(max-width:640px){ .ap-stats{grid-template-columns:1fr 1fr!important} }
      `}</style>

      <div style={{ maxWidth:'1400px', margin:'0 auto', padding:'24px 28px', animation:'fadeUp .3s ease' }}>

        {/* ── Header banner ── */}
        <div style={{
          background:'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
          borderRadius:'20px', padding:'28px 32px', marginBottom:'24px',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px',
          boxShadow:'0 12px 40px rgba(6,0,48,.3)', flexWrap:'wrap',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:'rgba(255,255,255,.12)', border:'1.5px solid rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(0,0,0,.2)' }}>
              <Link2 size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize:'24px', fontWeight:'800', color:'#fff', margin:'0 0 3px', letterSpacing:'-.5px' }}>Player Assignments</h1>
              <p style={{ fontSize:'13px', color:'rgba(255,255,255,.6)', margin:0, fontWeight:'500' }}>
                {isPageLoading ? 'Loading…' : `${stats.assigned} assigned · ${stats.unassigned} unassigned`}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/manage-batches')}
            style={{
              display:'flex', alignItems:'center', gap:'8px', padding:'12px 22px', borderRadius:'12px',
              background:'rgba(255,255,255,.15)', backdropFilter:'blur(8px)',
              border:'1.5px solid rgba(255,255,255,.3)',
              color:'#fff', fontWeight:'700', fontSize:'13.5px', cursor:'pointer', transition:'all .2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.25)'; e.currentTarget.style.transform='translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.15)'; e.currentTarget.style.transform='none'; }}
          >
            <Layers size={16} /> Manage Batches
          </button>
        </div>

        {/* ── Summary stats ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:'14px', marginBottom:'24px' }} className="ap-stats">
          {isPageLoading ? [1,2,3,4].map(i => (
            <div key={i} style={{ background:'#fff', borderRadius:'16px', padding:'18px 20px', border:'1px solid #F1F5F9', display:'flex', gap:'14px', alignItems:'center' }}>
              <Sk w="48px" h="48px" r={13} />
              <div style={{ flex:1 }}><Sk w="60%" h="10px" /><div style={{marginTop:8}}><Sk w="42%" h="22px" /></div></div>
            </div>
          )) : <>
            <SummaryCard label="Total Players"   value={stats.total}            icon={Users}      accent="#6366F1" />
            <SummaryCard label="Assigned"        value={stats.assigned}         icon={UserCheck}  accent="#10B981" />
            <SummaryCard label="Unassigned"      value={stats.unassigned}       icon={Users}      accent="#F59E0B" />
            <SummaryCard label="Assignments"     value={stats.totalAssignments} icon={Link2}      accent="#EC4899" />
          </>}
        </div>

        {/* ── Two-column layout ── */}
        <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:'24px', alignItems:'start' }} className="ap-cols">

          {/* ── Sidebar forms ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

            {/* Assign form */}
            <div style={{ background:'#fff', borderRadius:'16px', padding:'20px', border:'1px solid #F1F5F9', boxShadow:'0 2px 8px rgba(0,0,0,.05)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px' }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#EEF2FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Link2 size={16} color="#6366F1" />
                </div>
                <div>
                  <h3 style={{ margin:0, fontSize:'14px', fontWeight:'800', color:'#0F172A' }}>Assign Player</h3>
                  <p style={{ margin:0, fontSize:'11px', color:'#94A3B8', fontWeight:'500' }}>Link a player to a coach</p>
                </div>
              </div>
              <SectionHeading>Selection</SectionHeading>
              <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                <SelectWrap label="Player" required value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)} disabled={isLoading}>
                  <option value="">{isLoading ? 'Loading…' : 'Choose player…'}</option>
                  {players.map(p => <option key={p.playerId} value={p.playerId}>{p.name || p.playerName}</option>)}
                </SelectWrap>
                <SelectWrap label="Coach" required value={selectedCoach} onChange={e => setSelectedCoach(e.target.value)} disabled={isLoading}>
                  <option value="">{isLoading ? 'Loading…' : 'Choose coach…'}</option>
                  {coaches.map(c => <option key={c.coachId||c._id} value={c.coachId||c._id}>{c.name}{c.specialization ? ` (${c.specialization})` : ''}</option>)}
                </SelectWrap>
                <button
                  onClick={handleAssign}
                  disabled={!selectedPlayer || !selectedCoach || isAssigning || isLoading}
                  style={{
                    padding:'11px', borderRadius:'10px', fontWeight:'700', fontSize:'13.5px',
                    background: selectedPlayer && selectedCoach && !isAssigning && !isLoading
                      ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : '#F1F5F9',
                    color: selectedPlayer && selectedCoach && !isAssigning && !isLoading ? '#fff' : '#94A3B8',
                    border:'none', cursor: selectedPlayer && selectedCoach && !isAssigning && !isLoading ? 'pointer' : 'not-allowed',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                    boxShadow: selectedPlayer && selectedCoach ? '0 4px 12px rgba(99,102,241,.3)' : 'none',
                    transition:'all .18s ease',
                  }}
                >
                  {isAssigning && <Loader size={14} style={{ animation:'spin 1s linear infinite' }} />}
                  {isAssigning ? 'Assigning…' : 'Assign Player'}
                </button>
              </div>
            </div>

            {/* Swap form */}
            <div style={{ background:'#fff', borderRadius:'16px', padding:'20px', border:'1px solid #F1F5F9', boxShadow:'0 2px 8px rgba(0,0,0,.05)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px' }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#FEF3C7', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <ArrowLeftRight size={16} color="#D97706" />
                </div>
                <div>
                  <h3 style={{ margin:0, fontSize:'14px', fontWeight:'800', color:'#0F172A' }}>Swap Player</h3>
                  <p style={{ margin:0, fontSize:'11px', color:'#94A3B8', fontWeight:'500' }}>Move between coaches</p>
                </div>
              </div>
              <SectionHeading>Selection</SectionHeading>
              <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                <SelectWrap label="Player (assigned)" required value={selectedSwapPlayer} onChange={e => setSelectedSwapPlayer(e.target.value)} disabled={isLoading}>
                  <option value="">{isLoading ? 'Loading…' : 'Choose player…'}</option>
                  {Object.values(assignedPlayersData).map(item => {
                    const id   = item.player?._id || item.player?.playerId;
                    const name = item.player?.playerName || item.player?.name || 'Unknown';
                    return <option key={id} value={id}>{name}</option>;
                  })}
                </SelectWrap>
                <SelectWrap label="From Coach" value={selectedSwapFromCoach} onChange={e => setSelectedSwapFromCoach(e.target.value)} disabled={isLoading}>
                  <option value="">Auto-detected</option>
                  {coaches.map(c => <option key={c.coachId||c._id} value={c.coachId||c._id}>{c.name}</option>)}
                </SelectWrap>
                <SelectWrap label="To Coach" required value={selectedSwapToCoach} onChange={e => setSelectedSwapToCoach(e.target.value)} disabled={isLoading}>
                  <option value="">{isLoading ? 'Loading…' : 'Choose coach…'}</option>
                  {coaches.filter(c => (c.coachId||c._id) !== selectedSwapFromCoach).map(c => (
                    <option key={c.coachId||c._id} value={c.coachId||c._id}>{c.name}</option>
                  ))}
                </SelectWrap>
                <button
                  onClick={handleSwapPlayer}
                  disabled={!selectedSwapPlayer || !selectedSwapFromCoach || !selectedSwapToCoach || isSwapping || isLoading}
                  style={{
                    padding:'11px', borderRadius:'10px', fontWeight:'700', fontSize:'13.5px',
                    background: selectedSwapPlayer && selectedSwapFromCoach && selectedSwapToCoach && !isSwapping && !isLoading
                      ? 'linear-gradient(135deg,#F59E0B,#D97706)' : '#F1F5F9',
                    color: selectedSwapPlayer && selectedSwapFromCoach && selectedSwapToCoach && !isSwapping && !isLoading ? '#fff' : '#94A3B8',
                    border:'none', cursor: selectedSwapPlayer && selectedSwapFromCoach && selectedSwapToCoach && !isSwapping && !isLoading ? 'pointer' : 'not-allowed',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                    transition:'all .18s ease',
                  }}
                >
                  {isSwapping && <Loader size={14} style={{ animation:'spin 1s linear infinite' }} />}
                  {isSwapping ? 'Swapping…' : 'Swap Player'}
                </button>
              </div>
            </div>
          </div>

          {/* ── Main: assignments list ── */}
          <div>
            {/* Filter bar */}
            <div style={{
              display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px',
              background:'#fff', padding:'12px 16px', borderRadius:'14px',
              border:'1px solid #F1F5F9', boxShadow:'0 2px 6px rgba(0,0,0,.04)', flexWrap:'wrap',
            }}>
              <div style={{
                display:'flex', alignItems:'center', gap:'8px', flex:'1', minWidth:'180px',
                border:'1.5px solid #E2E8F0', borderRadius:'10px', padding:'8px 12px', background:'#FAFBFC',
              }}
              onFocusCapture={e => { e.currentTarget.style.borderColor='#6366F1'; e.currentTarget.style.boxShadow='0 0 0 3px rgba(99,102,241,.1)'; }}
              onBlurCapture={e => { e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.boxShadow='none'; }}>
                <Search size={15} color="#94A3B8" />
                <input
                  type="text" placeholder="Search players…" value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ border:'none', outline:'none', background:'transparent', fontSize:'13px', fontWeight:'500', color:'#1E293B', flex:1, fontFamily:'inherit' }}
                />
                {searchTerm && <button onClick={() => setSearchTerm('')} style={{ border:'none', background:'none', cursor:'pointer', color:'#94A3B8', padding:0, display:'flex' }}><X size={14} /></button>}
              </div>

              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                <button onClick={() => setFilterCoach('all')} style={{
                  padding:'7px 14px', borderRadius:'999px', fontSize:'12px', fontWeight:'700',
                  border: filterCoach === 'all' ? '1.5px solid #6366F1' : '1.5px solid #E2E8F0',
                  background: filterCoach === 'all' ? '#6366F1' : '#F8FAFC',
                  color: filterCoach === 'all' ? '#fff' : '#64748B', cursor:'pointer', transition:'all .18s ease',
                }}>All</button>
                {coaches.map(c => (
                  <button key={c.coachId} onClick={() => setFilterCoach(c.coachId)} style={{
                    padding:'7px 14px', borderRadius:'999px', fontSize:'12px', fontWeight:'700',
                    border: filterCoach === c.coachId ? '1.5px solid #6366F1' : '1.5px solid #E2E8F0',
                    background: filterCoach === c.coachId ? '#6366F1' : '#F8FAFC',
                    color: filterCoach === c.coachId ? '#fff' : '#64748B', cursor:'pointer', transition:'all .18s ease', whiteSpace:'nowrap',
                  }}>{c.name}</button>
                ))}
              </div>

              <span style={{ fontSize:'12px', fontWeight:'700', color:'#94A3B8', whiteSpace:'nowrap', marginLeft:'auto' }}>
                <span style={{ color:'#6366F1' }}>{filteredAssignments.length}</span> / {coaches.length} coaches
              </span>
            </div>

            {/* Assignments */}
            {isPageLoading ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ borderRadius:'16px', overflow:'hidden', border:'1px solid #F1F5F9' }}>
                    <div style={{ height:'68px', background:'#EEF2F7', animation:'plsPulse 1.6s ease-in-out infinite' }} />
                    <div style={{ background:'#fff', padding:'16px', display:'flex', flexDirection:'column', gap:'10px' }}>
                      {[1,2].map(j => <Sk key={j} w="100%" h="44px" r={10} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div style={{ textAlign:'center', padding:'80px 24px', background:'#fff', borderRadius:'16px', border:'1px solid #F1F5F9' }}>
                <div style={{ width:'80px', height:'80px', borderRadius:'22px', background:'linear-gradient(135deg,#EEF2FF,#E0E7FF)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
                  <Users size={36} color="#6366F1" />
                </div>
                <p style={{ fontSize:'17px', fontWeight:'800', color:'#0F172A', margin:'0 0 8px' }}>No assignments</p>
                <p style={{ fontSize:'13.5px', color:'#94A3B8', margin:0 }}>
                  {searchTerm || filterCoach !== 'all' ? 'No results for current filters' : 'No player assignments yet'}
                </p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                {filteredAssignments.map(({ coach, assignedData }) => {
                  const [accent, light] = pal(coach.name || '');
                  const filtered = searchTerm
                    ? assignedData.filter(item => (item.player?.playerName || item.player?.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
                    : assignedData;
                  return (
                    <div key={coach.coachId} style={{ borderRadius:'16px', overflow:'hidden', border:`1.5px solid ${accent}20`, boxShadow:'0 2px 10px rgba(0,0,0,.05)' }}>
                      {/* Coach header */}
                      <div style={{
                        background:`linear-gradient(135deg, ${accent} 0%, ${light} 100%)`,
                        padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between',
                      }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                          <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:'rgba(255,255,255,.25)', border:'2px solid rgba(255,255,255,.4)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:'800', fontSize:'18px', flexShrink:0 }}>
                            {coach.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <h3 style={{ margin:0, fontSize:'15px', fontWeight:'800', color:'#fff' }}>{coach.name}</h3>
                            <p style={{ margin:0, fontSize:'12px', color:'rgba(255,255,255,.75)', fontWeight:'500' }}>{coach.specialization || 'Coach'}</p>
                          </div>
                        </div>
                        <div style={{ background:'rgba(255,255,255,.22)', border:'1px solid rgba(255,255,255,.3)', borderRadius:'999px', padding:'4px 12px', fontSize:'13px', fontWeight:'700', color:'#fff' }}>
                          {assignedData.length} player{assignedData.length !== 1 ? 's' : ''}
                        </div>
                      </div>

                      {/* Players */}
                      <div style={{ background:'#fff', padding:'12px 16px', display:'flex', flexDirection:'column', gap:'8px' }}>
                        {filtered.length > 0 ? filtered.map(item => {
                          const player   = item.player;
                          const playerId = player?._id || player?.playerId;
                          const name     = player?.playerName || player?.name || 'Unknown';
                          const [pAccent] = pal(name);
                          return (
                            <div key={`${coach.coachId}-${playerId}`} style={{
                              display:'flex', alignItems:'center', justifyContent:'space-between',
                              padding:'10px 12px', borderRadius:'10px',
                              background:`${pAccent}08`, border:`1px solid ${pAccent}20`,
                            }}>
                              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                                <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:`linear-gradient(135deg,${pAccent},${pal(name)[1]})`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:'800', fontSize:'13px', flexShrink:0 }}>
                                  {name.charAt(0).toUpperCase()}
                                </div>
                                <span style={{ fontSize:'13.5px', fontWeight:'700', color:'#0F172A' }}>{name}</span>
                              </div>
                              <button
                                onClick={() => handleRemovePlayer(playerId, coach.coachId)}
                                disabled={removingPlayerId === playerId}
                                style={{
                                  width:'30px', height:'30px', borderRadius:'8px', border:'1.5px solid #FECACA',
                                  background:'#FEF2F2', color:'#EF4444', cursor: removingPlayerId === playerId ? 'not-allowed' : 'pointer',
                                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                                  transition:'all .18s ease',
                                }}
                                onMouseEnter={e => { if (removingPlayerId !== playerId) { e.currentTarget.style.background='#EF4444'; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='#EF4444'; }}}
                                onMouseLeave={e => { e.currentTarget.style.background='#FEF2F2'; e.currentTarget.style.color='#EF4444'; e.currentTarget.style.borderColor='#FECACA'; }}
                              >
                                {removingPlayerId === playerId
                                  ? <Loader size={12} style={{ animation:'spin 1s linear infinite' }} />
                                  : <X size={13} />}
                              </button>
                            </div>
                          );
                        }) : (
                          <p style={{ textAlign:'center', fontSize:'13px', color:'#CBD5E1', fontWeight:'600', padding:'12px 0', margin:0 }}>
                            No players assigned to this coach
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AssignPlayers;
