import { useState, useEffect, useRef, useMemo, createElement } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Modal } from '../../components/Modal';
import { Toast } from '../../components/Toast';
import {
  Users, Plus, Search, Trash2, Edit3, Eye, Award, Target,
  AlertCircle, Loader, ChevronDown, Phone,
  BookOpen, Star, X, TrendingUp,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

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
  <div style={{ display:'flex', alignItems:'center', gap:'8px', margin:'22px 0 12px' }}>
    <div style={{ flex:1, height:'1px', background:'#EEF2F7' }} />
    <span style={{ fontSize:'10px', fontWeight:'700', color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.8px', whiteSpace:'nowrap' }}>{children}</span>
    <div style={{ flex:1, height:'1px', background:'#EEF2F7' }} />
  </div>
);

/* ── palette ── */
const PALETTES = [
  ['#6366F1','#818CF8'], ['#10B981','#34D399'], ['#F59E0B','#FBBF24'],
  ['#EC4899','#F472B6'], ['#3B82F6','#60A5FA'], ['#8B5CF6','#A78BFA'],
  ['#EF4444','#F87171'], ['#06B6D4','#22D3EE'],
];
const pal = (name = '') => PALETTES[(name.charCodeAt(0) || 0) % PALETTES.length];

/* ── skeleton ── */
const Sk = ({ w, h, r = 8 }) => (
  <div style={{ width:w, height:h, borderRadius:r, background:'#EEF2F7', animation:'plsPulse 1.6s ease-in-out infinite' }} />
);

/* ── stat summary card ── */
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

/* ── player card ── */
const PlayerCard = ({ player, onEdit, onDelete, onView, maxPts, surface, border }) => {
  const [hov, setHov] = useState(false);
  const pts    = player.TotalPoints ?? player.totalPoints ?? 0;
  const bal    = player.PointBalance ?? player.pointBalance ?? 0;
  const active = player.status === 'active';
  const name   = player.playerName || player.name || '';
  const pct    = maxPts > 0 ? Math.round((pts / maxPts) * 100) : 0;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: surface, borderRadius:'20px',
        border:`1.5px solid ${hov ? 'rgba(99,102,241,0.3)' : border}`,
        boxShadow: hov ? '0 16px 48px rgba(6,0,48,0.12), 0 4px 16px rgba(0,0,0,.08)' : '0 2px 10px rgba(0,0,0,.06)',
        overflow:'hidden', transition:'all .25s cubic-bezier(.16,1,.3,1)',
        transform: hov ? 'translateY(-5px)' : 'none',
        display:'flex', flexDirection:'column',
        cursor:'pointer',
      }}
      onClick={() => onView(player)}
    >
      {/* Top band - consistent brand color */}
      <div style={{
        height:'72px', position:'relative', flexShrink:0,
        background:'linear-gradient(135deg, #060030 0%, #1a0060 100%)',
      }}>
        {/* Status pill */}
        <div style={{
          position:'absolute', top:'12px', right:'14px',
          display:'flex', alignItems:'center', gap:'5px',
          background: active ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.18)',
          backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,.2)',
          borderRadius:'999px', padding:'3px 9px',
        }}>
          <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: active ? '#4ADE80' : '#FCD34D' }} />
          <span style={{ fontSize:'10px', fontWeight:'700', color:'#fff', letterSpacing:'.3px' }}>
            {active ? 'Active' : 'Inactive'}
          </span>
        </div>
        {/* Avatar */}
        <div style={{
          position:'absolute', bottom:'-24px', left:'20px',
          width:'50px', height:'50px', borderRadius:'50%',
          background:'linear-gradient(135deg, #6366F1, #8B5CF6)',
          border:`3px solid ${surface}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'#fff', fontWeight:'800', fontSize:'20px',
          boxShadow:'0 4px 16px rgba(99,102,241,0.4)',
          flexShrink:0,
        }}>
          {name.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding:'36px 20px 20px', flex:1, display:'flex', flexDirection:'column', gap:'12px' }}>

        {/* Name + phone */}
        <div>
          <h3 style={{ margin:'0 0 4px', fontSize:'15px', fontWeight:'800', color:'#0F172A', lineHeight:1.3 }}>{name}</h3>
          <p style={{ margin:0, fontSize:'12px', color:'#94A3B8', fontWeight:'500', display:'flex', alignItems:'center', gap:'5px' }}>
            <Phone size={11} /> {player.phone || '-'}
          </p>
        </div>

        {/* Pathway */}
        {player.LearningPathway ? (
          <div style={{
            display:'inline-flex', alignItems:'center', gap:'6px',
            padding:'5px 11px', borderRadius:'8px', alignSelf:'flex-start',
            background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)',
          }}>
            <BookOpen size={11} color="#6366F1" />
            <span style={{ fontSize:'11.5px', fontWeight:'700', color:'#6366F1' }}>{player.LearningPathway}</span>
          </div>
        ) : (
          <span style={{ fontSize:'11.5px', color:'#CBD5E1', fontWeight:'600' }}>No pathway assigned</span>
        )}

        {/* Points stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
          <div style={{ padding:'10px 12px', borderRadius:'10px', background:'#F8FAFF', border:'1px solid #EEF2FF' }}>
            <p style={{ margin:'0 0 2px', fontSize:'10px', fontWeight:'700', color:'#6366F1', textTransform:'uppercase', letterSpacing:'.4px' }}>Earned</p>
            <p style={{ margin:0, fontSize:'18px', fontWeight:'800', color:'#4338CA', letterSpacing:'-.5px' }}>{pts.toLocaleString()}</p>
            <div style={{ marginTop:'5px', height:'3px', borderRadius:'2px', background:'#E0E7FF', overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:'2px', background:'linear-gradient(90deg, #6366F1, #8B5CF6)', width:`${pct}%`, transition:'width .6s ease' }} />
            </div>
          </div>
          <div style={{ padding:'10px 12px', borderRadius:'10px', background:'#F0FDF8', border:'1px solid #D1FAE5' }}>
            <p style={{ margin:'0 0 2px', fontSize:'10px', fontWeight:'700', color:'#10B981', textTransform:'uppercase', letterSpacing:'.4px' }}>Balance</p>
            <p style={{ margin:0, fontSize:'18px', fontWeight:'800', color:'#065F46', letterSpacing:'-.5px' }}>{bal.toLocaleString()}</p>
            <p style={{ margin:'3px 0 0', fontSize:'10px', color:'#6EE7B7', fontWeight:'600' }}>pts left</p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height:'1px', background: border }} />

        {/* Action buttons */}
        <div style={{ display:'flex', gap:'8px' }}>
          <button
            onClick={e => { e.stopPropagation(); onEdit(player); }}
            style={{
              flex:1, padding:'8px', borderRadius:'9px', border:`1.5px solid ${border}`,
              background:'#F8FAFC', color:'#6366F1', fontWeight:'700', fontSize:'12px',
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px',
              transition:'all .18s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='#EEF2FF'; e.currentTarget.style.borderColor='#6366F1'; }}
            onMouseLeave={e => { e.currentTarget.style.background='#F8FAFC'; e.currentTarget.style.borderColor=border; }}
          >
            <Edit3 size={12} /> Edit
          </button>
          <button
            onClick={e => { e.stopPropagation(); onView(player); }}
            style={{
              flex:1, padding:'8px', borderRadius:'9px', border:`1.5px solid ${border}`,
              background:'#F8FAFC', color:'#8B5CF6', fontWeight:'700', fontSize:'12px',
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px',
              transition:'all .18s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='#F5F3FF'; e.currentTarget.style.borderColor='#8B5CF6'; }}
            onMouseLeave={e => { e.currentTarget.style.background='#F8FAFC'; e.currentTarget.style.borderColor=border; }}
          >
            <Eye size={12} /> View
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(player.playerId); }}
            style={{
              width:'36px', flexShrink:0, padding:'8px', borderRadius:'9px',
              border:'1.5px solid #FECACA', background:'#FEF2F2',
              color:'#EF4444', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all .18s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='#EF4444'; e.currentTarget.style.borderColor='#EF4444'; e.currentTarget.style.color='#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background='#FEF2F2'; e.currentTarget.style.borderColor='#FECACA'; e.currentTarget.style.color='#EF4444'; }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════ */
const Players = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    players, fetchPlayers, addPlayerRemote, updatePlayerRemote,
    deletePlayerRemote, learningPathway, fetchLearningPathway,
  } = useStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const surface = dark ? 'var(--cl-surface)' : '#fff';
  const border = dark ? 'var(--cl-border)' : '#F1F5F9';
  const textPrimary = dark ? 'var(--cl-text)' : '#0F172A';
  const textSecondary = dark ? 'var(--cl-text-2)' : '#64748B';
  const textMuted = dark ? 'var(--cl-text-3)' : '#94A3B8';
  const surface2 = dark ? 'var(--cl-surface-2)' : '#F8FAFC';

  const [toast, setToast]               = useState({ msg:'', type:'success' });
  const [loading, setLoading]           = useState(false);
  const [isFetching, setIsFetching]     = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [pathwayFilter, setPathwayFilter] = useState('all');
  const [sortBy, setSortBy]             = useState('name');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [isEditMode, setIsEditMode]     = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const initialFetchRef = useRef(false);

  const emptyForm = {
    playerName:'', fatherName:'', motherName:'', dateOfBirth:'',
    address:'', phone:'', alternativeNumber:'', age:'', LearningPathway:'', status:'active',
  };
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  useEffect(() => {
    if (initialFetchRef.current) { setIsFetching(false); return; }
    initialFetchRef.current = true;
    let alive = true;
    (async () => {
      try { await fetchPlayers(); await fetchLearningPathway(); }
      catch (e) { if (alive) showToast(e.message || 'Failed to load', 'error'); }
      finally { if (alive) setIsFetching(false); }
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line

  const uniquePathways = useMemo(
    () => [...new Set(players.map(p => p.LearningPathway).filter(Boolean))],
    [players]
  );
  const pathwayOptions = useMemo(
    () => Array.isArray(learningPathway) && learningPathway.length > 0
      ? [...new Set(learningPathway.map(p => p.LearningPathway || p.name || p.pathwayName).filter(Boolean))]
      : ['Foundation', 'Intermediate', 'Advanced'],
    [learningPathway]
  );

  const maxPts = useMemo(
    () => Math.max(...players.map(p => p.totalPoints || 0), 1),
    [players]
  );

  const filteredPlayers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return players
      .filter(p => {
        const matchSearch = (p.name||'').toLowerCase().includes(term) || (p.phone||'').includes(term);
        const matchPathway = pathwayFilter === 'all' || p.LearningPathway === pathwayFilter;
        return matchSearch && matchPathway;
      })
      .sort((a, b) => {
        if (sortBy === 'points') return (b.totalPoints||0) - (a.totalPoints||0);
        if (sortBy === 'pathway') return (a.LearningPathway||'').localeCompare(b.LearningPathway||'');
        return (a.name||'').localeCompare(b.name||'');
      });
  }, [players, searchTerm, pathwayFilter, sortBy]);

  const stats = useMemo(() => ({
    total: players.length,
    active: players.filter(p => p.status === 'active').length,
    totalPoints: players.reduce((s,p) => s + (p.totalPoints||0), 0),
    balance: players.reduce((s,p) => s + (p.PointBalance||p.pointBalance||0), 0),
  }), [players]);

  /* ── form handlers ── */
  const handleDob = e => {
    const val = e.target.value;
    if (val > new Date().toISOString().split('T')[0]) { setFormError('Date of birth cannot be in the future'); return; }
    const birth = new Date(val), now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const md = now.getMonth() - birth.getMonth();
    if (md < 0 || (md === 0 && now.getDate() < birth.getDate())) age--;
    setFormData(f => ({ ...f, dateOfBirth: val, age: Math.max(0, age).toString() }));
    setFormError('');
  };

  const openAdd = () => { setFormData(emptyForm); setIsEditMode(false); setEditingPlayerId(null); setFormError(''); setIsModalOpen(true); };
  const openEdit = row => {
    setIsEditMode(true); setEditingPlayerId(row.playerId);
    setFormData({
      playerName: row.playerName || row.name || '',
      fatherName: row.fatherName || '', motherName: row.motherName || '',
      dateOfBirth: row.dateOfBirth ? row.dateOfBirth.split('T')[0] : '',
      address: row.address || '', phone: row.phone || '',
      alternativeNumber: row.alternativeNumber || '', age: row.age || '',
      LearningPathway: row.LearningPathway || '', status: row.status || 'active',
    });
    setFormError(''); setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setFormData(emptyForm); setIsEditMode(false); setEditingPlayerId(null); setFormError(''); };

  // Deep-link: another page (e.g. a batch's pathway-mismatch prompt) can send us
  // here with { editPlayerId } to open that player's edit form straight away.
  useEffect(() => {
    const pid = location.state?.editPlayerId;
    if (!pid || players.length === 0) return;
    const row = players.find(p => String(p.playerId) === String(pid));
    if (row) openEdit(row);
    // clear the state so it doesn't re-open on back/refresh
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.editPlayerId, players.length]);

  const handleSubmit = async () => {
    setFormError('');
    if (!isEditMode && (!formData.playerName || !formData.phone || !formData.age || !formData.LearningPathway)) {
      setFormError(!formData.LearningPathway ? 'Please select a Learning Pathway' : 'Name, phone, age and pathway are required');
      return;
    }
    if (isEditMode && (!formData.playerName || !formData.phone)) { setFormError('Name and phone are required'); return; }
    setLoading(true);
    try {
      const payload = {
        playerName: formData.playerName, fatherName: formData.fatherName||'',
        motherName: formData.motherName||'', dateOfBirth: formData.dateOfBirth||'',
        address: formData.address||'', phone: formData.phone,
        alternativeNumber: formData.alternativeNumber||'', age: formData.age||'',
        LearningPathway: formData.LearningPathway||null, status: formData.status||'active',
      };
      const res = isEditMode ? await updatePlayerRemote(editingPlayerId, payload) : await addPlayerRemote(payload);
      if (res.success) {
        if (!isEditMode) await fetchPlayers();
        showToast(isEditMode ? 'Player updated' : 'Player added');
        setTimeout(closeModal, 1000);
      } else { setFormError(res.error || (isEditMode ? 'Update failed' : 'Create failed')); }
    } catch (e) { setFormError(e.message || 'An error occurred'); }
    finally { setLoading(false); }
  };

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <Layout>
      {toast.msg && <Toast message={toast.msg} type={toast.type} duration={3000} onClose={() => setToast({ msg:'', type:'success' })} />}

      <style>{`
        @keyframes plsPulse { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cardIn { from{opacity:0;transform:translateY(16px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        .pl-card { animation: cardIn .3s ease both; }
        @media(max-width:640px){ .pl-stats{grid-template-columns:1fr 1fr!important} .pl-bar{flex-direction:column!important} .pl-bar-right{flex-wrap:wrap!important;gap:8px!important} }
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
              <Users size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize:'24px', fontWeight:'800', color:'#fff', margin:'0 0 3px', letterSpacing:'-.5px' }}>Players</h1>
              <p style={{ fontSize:'13px', color:'rgba(255,255,255,.6)', margin:0, fontWeight:'500' }}>
                {isFetching ? 'Loading…' : `${stats.total} enrolled · ${stats.active} active`}
              </p>
            </div>
          </div>
          <button
            onClick={openAdd}
            style={{
              display:'flex', alignItems:'center', gap:'8px',
              padding:'12px 22px', borderRadius:'12px',
              background:'rgba(255,255,255,.15)', backdropFilter:'blur(8px)',
              border:'1.5px solid rgba(255,255,255,.3)',
              color:'#fff', fontWeight:'700', fontSize:'13.5px', cursor:'pointer',
              transition:'all .2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.25)'; e.currentTarget.style.transform='translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.15)'; e.currentTarget.style.transform='none'; }}
          >
            <Plus size={16} /> Add Player
          </button>
        </div>

        {/* ── Summary stats ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:'14px', marginBottom:'24px' }} className="pl-stats">
          {isFetching ? [1,2,3,4].map(i => (
            <div key={i} style={{ background: surface, borderRadius:'16px', padding:'18px 20px', border:`1px solid ${border}`, display:'flex', gap:'14px', alignItems:'center' }}>
              <Sk w="48px" h="48px" r={13} />
              <div style={{ flex:1 }}><Sk w="60%" h="10px" /><div style={{marginTop:8}}><Sk w="42%" h="22px" /></div></div>
            </div>
          )) : <>
            <SummaryCard label="Total Players"  value={stats.total}  icon={Users}      accent="#6366F1" surface={surface} border={border} />
            <SummaryCard label="Active"         value={stats.active} icon={Target}     accent="#10B981" surface={surface} border={border} />
            <SummaryCard label="Points Earned"  value={stats.totalPoints.toLocaleString()} icon={Award} accent="#F59E0B" surface={surface} border={border} />
            <SummaryCard label="Point Balance"  value={stats.balance.toLocaleString()} icon={Star}  accent="#EC4899" surface={surface} border={border} />
          </>}
        </div>

        {/* ── Filter / sort bar ── */}
        <div style={{
          display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px',
          background: surface, padding:'12px 16px', borderRadius:'14px',
          border:`1px solid ${border}`, boxShadow:'0 2px 6px rgba(0,0,0,.04)',
          flexWrap:'wrap',
        }} className="pl-bar">
          {/* Search */}
          <div style={{
            display:'flex', alignItems:'center', gap:'8px', flex:'1', minWidth:'200px', maxWidth:'340px',
            border:`1.5px solid ${border}`, borderRadius:'10px', padding:'8px 12px', background: surface2,
            transition:'border-color .18s, box-shadow .18s',
          }}
          onFocusCapture={e => { e.currentTarget.style.borderColor='#6366F1'; e.currentTarget.style.boxShadow='0 0 0 3px rgba(99,102,241,.1)'; }}
          onBlurCapture={e => { e.currentTarget.style.borderColor=border; e.currentTarget.style.boxShadow='none'; }}>
            <Search size={15} color={textMuted} />
            <input
              type="text" placeholder="Search players…" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ border:'none', outline:'none', background:'transparent', fontSize:'13px', fontWeight:'500', color:'#1E293B', flex:1, fontFamily:'inherit' }}
            />
            {searchTerm && <button onClick={() => setSearchTerm('')} style={{ border:'none', background:'none', cursor:'pointer', color: textMuted, padding:0, display:'flex' }}><X size={14} /></button>}
          </div>

          {/* Pathway chips */}
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }} className="pl-bar-right">
            {['all', ...uniquePathways].map(pw => (
              <button key={pw} onClick={() => setPathwayFilter(pw)} style={{
                padding:'7px 14px', borderRadius:'999px', fontSize:'12px', fontWeight:'700',
                border: pathwayFilter === pw ? '1.5px solid #6366F1' : `1.5px solid ${border}`,
                background: pathwayFilter === pw ? '#6366F1' : surface2,
                color: pathwayFilter === pw ? '#fff' : textSecondary,
                cursor:'pointer', transition:'all .18s ease', whiteSpace:'nowrap',
              }}>
                {pw === 'all' ? 'All' : pw}
              </button>
            ))}
          </div>

          {/* Sort chips */}
          <div style={{ display:'flex', gap:'6px', marginLeft:'auto' }}>
            {[['name','A–Z'],['points','Points'],['pathway','Pathway']].map(([key,label]) => (
              <button key={key} onClick={() => setSortBy(key)} style={{
                padding:'7px 12px', borderRadius:'8px', fontSize:'11.5px', fontWeight:'700',
                border: sortBy === key ? '1.5px solid #6366F1' : '1.5px solid transparent',
                background: sortBy === key ? '#EEF2FF' : 'transparent',
                color: sortBy === key ? '#6366F1' : textMuted,
                cursor:'pointer', transition:'all .18s ease', display:'flex', alignItems:'center', gap:'4px',
              }}>
                {sortBy === key && <TrendingUp size={11} />} {label}
              </button>
            ))}
          </div>

          {/* Count */}
          <span style={{ fontSize:'12px', fontWeight:'700', color: textMuted, whiteSpace:'nowrap' }}>
            <span style={{ color:'#6366F1' }}>{filteredPlayers.length}</span> / {players.length}
          </span>
        </div>

        {/* ── Card grid ── */}
        {isFetching ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'18px' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ borderRadius:'20px', overflow:'hidden', border:`1.5px solid ${border}`, background: surface }}>
                <div style={{ height:'72px', background:'#EEF2F7', animation:'plsPulse 1.6s ease-in-out infinite' }} />
                <div style={{ padding:'36px 20px 20px', display:'flex', flexDirection:'column', gap:'12px' }}>
                  <div><Sk w="65%" h="16px" /><div style={{marginTop:7}}><Sk w="45%" h="12px" /></div></div>
                  <Sk w="120px" h="26px" r={8} />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                    <Sk w="100%" h="64px" r={10} />
                    <Sk w="100%" h="64px" r={10} />
                  </div>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <Sk w="100%" h="34px" r={9} />
                    <Sk w="100%" h="34px" r={9} />
                    <Sk w="36px" h="34px" r={9} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 24px' }}>
            <div style={{ width:'80px', height:'80px', borderRadius:'22px', background:'linear-gradient(135deg,#EEF2FF,#E0E7FF)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', boxShadow:'0 8px 24px #6366F120' }}>
              <Users size={36} color="#6366F1" />
            </div>
            <p style={{ fontSize:'17px', fontWeight:'800', color: textPrimary, margin:'0 0 8px' }}>
              {searchTerm || pathwayFilter !== 'all' ? 'No players found' : 'No players yet'}
            </p>
            <p style={{ fontSize:'13.5px', color: textMuted, margin:'0 0 24px' }}>
              {searchTerm ? 'Try a different search or clear the filter' : 'Add your first player to get started'}
            </p>
            {!searchTerm && pathwayFilter === 'all' && (
              <button onClick={openAdd} style={{
                display:'inline-flex', alignItems:'center', gap:'8px',
                padding:'11px 22px', borderRadius:'11px', border:'none',
                background:'linear-gradient(135deg,#6366F1,#8B5CF6)',
                color:'white', fontWeight:'700', fontSize:'13.5px', cursor:'pointer',
                boxShadow:'0 4px 14px rgba(99,102,241,.35)',
              }}>
                <Plus size={16} /> Add First Player
              </button>
            )}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'18px' }}>
            {filteredPlayers.map((p, i) => (
              <div key={p.playerId} className="pl-card" style={{ animationDelay:`${i * 40}ms` }}>
                <PlayerCard
                  player={p}
                  maxPts={maxPts}
                  onEdit={openEdit}
                  onDelete={setDeleteConfirm}
                  onView={setSelectedPlayer}
                  surface={surface}
                  border={border}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══ Delete modal ══ */}
      {deleteConfirm && (
        <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="">
          <div style={{ padding:'8px 24px 28px', textAlign:'center' }}>
            <div style={{ width:'68px', height:'68px', borderRadius:'18px', background:'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px', boxShadow:'0 4px 16px #EF444420' }}>
              <Trash2 size={30} color="#EF4444" />
            </div>
            <h3 style={{ fontSize:'18px', fontWeight:'800', color: textPrimary, margin:'0 0 8px' }}>Delete this player?</h3>
            <p style={{ fontSize:'13.5px', color: textSecondary, margin:'0 0 28px', lineHeight:1.6 }}>
              This cannot be undone. All associated data will be permanently removed.
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ padding:'11px', borderRadius:'10px', fontWeight:'600', background: surface2, color: textSecondary, border:`1.5px solid ${border}`, cursor:'pointer', fontSize:'13.5px' }}
                onMouseEnter={e => e.currentTarget.style.background='#E2E8F0'}
                onMouseLeave={e => e.currentTarget.style.background=surface2}>Cancel</button>
              <button disabled={loading} onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await deletePlayerRemote(deleteConfirm);
                    if (res.success) { showToast('Player deleted'); await fetchPlayers(); }
                    else showToast(res.error || 'Delete failed', 'error');
                    setDeleteConfirm(null);
                  } catch (e) { showToast(e.message || 'Delete failed', 'error'); }
                  finally { setLoading(false); }
                }}
                style={{ padding:'11px', borderRadius:'10px', fontWeight:'700', background:'linear-gradient(135deg,#EF4444,#DC2626)', color:'white', border:'none', cursor: loading?'not-allowed':'pointer', fontSize:'13.5px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', boxShadow:'0 4px 12px rgba(239,68,68,.3)', opacity: loading?.8:1 }}>
                {loading && <Loader size={14} style={{ animation:'spin 1s linear infinite' }} />}
                {loading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ Profile modal ══ */}
      {selectedPlayer && (
        <Modal isOpen={!!selectedPlayer} onClose={() => setSelectedPlayer(null)} title="Player Profile">
          <div style={{ padding:'0 24px 28px' }}>
            {(() => {
              const active = selectedPlayer.status === 'active';
              const name = selectedPlayer.playerName || selectedPlayer.name || '';
              const pts  = selectedPlayer.TotalPoints ?? selectedPlayer.totalPoints ?? 0;
              const bal  = selectedPlayer.PointBalance ?? selectedPlayer.pointBalance ?? 0;
              return (
                <>
                  {/* Hero */}
                  <div style={{
                    background:'linear-gradient(135deg, #060030 0%, #1a0060 100%)',
                    borderRadius:'16px', padding:'24px', marginBottom:'20px',
                    display:'flex', alignItems:'center', gap:'16px',
                  }}>
                    <div style={{ width:'64px', height:'64px', borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,#6366F1,#8B5CF6)', border:'3px solid rgba(255,255,255,.4)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:'800', fontSize:'26px', boxShadow:'0 6px 20px rgba(0,0,0,.2)' }}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 style={{ margin:'0 0 6px', fontSize:'20px', fontWeight:'800', color:'#fff' }}>{name}</h2>
                      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'3px 10px', borderRadius:'999px', background:'rgba(255,255,255,.22)', color:'#fff', fontSize:'11px', fontWeight:'700', border:'1px solid rgba(255,255,255,.3)' }}>
                          <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: active?'#4ADE80':'#FCD34D' }} />
                          {active ? 'Active' : 'Inactive'}
                        </span>
                        {selectedPlayer.LearningPathway && (
                          <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'3px 10px', borderRadius:'999px', background:'rgba(255,255,255,.22)', color:'#fff', fontSize:'11px', fontWeight:'700', border:'1px solid rgba(255,255,255,.3)' }}>
                            <BookOpen size={10} /> {selectedPlayer.LearningPathway}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Points */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'20px' }}>
                    {[
                      { label:'Total Points', value:pts, c:'#6366F1', bg:'#EEF2FF', bd:'#C7D2FE' },
                      { label:'Point Balance', value:bal, c:'#10B981', bg:'#ECFDF5', bd:'#A7F3D0' },
                    ].map(x => (
                      <div key={x.label} style={{ padding:'16px', borderRadius:'13px', background:x.bg, border:`1.5px solid ${x.bd}`, textAlign:'center' }}>
                        <p style={{ margin:'0 0 4px', fontSize:'10px', fontWeight:'700', color:x.c, textTransform:'uppercase', letterSpacing:'.5px' }}>{x.label}</p>
                        <p style={{ margin:0, fontSize:'26px', fontWeight:'800', color:x.c }}>{x.value.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>

                  {/* Info grid */}
                  {[
                    { section:'Personal', fields:[
                      { label:'Father', value: selectedPlayer.fatherName },
                      { label:'Mother', value: selectedPlayer.motherName },
                      { label:'Date of Birth', value: selectedPlayer.dateOfBirth ? new Date(selectedPlayer.dateOfBirth).toLocaleDateString('en-IN') : null },
                      { label:'Age', value: selectedPlayer.age ? `${selectedPlayer.age} yrs` : null },
                    ]},
                    { section:'Contact', fields:[
                      { label:'Phone', value: selectedPlayer.phone },
                      { label:'Alt. Phone', value: selectedPlayer.alternativeNumber },
                      { label:'Address', value: selectedPlayer.address, full:true },
                    ]},
                  ].map(({ section, fields }) => (
                    <div key={section} style={{ marginBottom:'16px' }}>
                      <p style={{ fontSize:'10px', fontWeight:'700', color: textMuted, textTransform:'uppercase', letterSpacing:'.7px', margin:'0 0 10px' }}>{section}</p>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                        {fields.map(({ label, value, full }) => (
                          <div key={label} style={{ gridColumn: full?'1/-1':undefined, padding:'10px 14px', borderRadius:'10px', background: surface2, border:`1px solid ${border}` }}>
                            <p style={{ margin:'0 0 3px', fontSize:'10px', fontWeight:'700', color: textMuted, textTransform:'uppercase' }}>{label}</p>
                            <p style={{ margin:0, fontSize:'13.5px', fontWeight:'600', color: value?'#1E293B':'#CBD5E1' }}>{value || '-'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => navigate(`/admin/player-detail/${selectedPlayer.playerId}`, { state: { player: selectedPlayer } })}
                    style={{ width:'100%', padding:'12px', borderRadius:'11px', background:'#EEF2FF', color:'#4F46E5', border:'1.5px solid #C7D2FE', fontWeight:'700', fontSize:'13.5px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginTop:'8px' }}>
                    <BookOpen size={15} /> View Full Profile &amp; Sessions
                  </button>
                  <button
                    onClick={() => { setSelectedPlayer(null); openEdit(selectedPlayer); }}
                    style={{ width:'100%', padding:'12px', borderRadius:'11px', background:'linear-gradient(135deg, #060030, #1a0060)', color:'white', border:'none', fontWeight:'700', fontSize:'13.5px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', boxShadow:'0 4px 14px rgba(6,0,48,0.35)', marginTop:'8px' }}>
                    <Edit3 size={15} /> Edit Player
                  </button>
                </>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* ══ Add / Edit modal ══ */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditMode ? 'Edit Player' : 'Add New Player'}>
        <div style={{ padding:'0 24px 28px' }}>
          {formError && (
            <div style={{ display:'flex', alignItems:'center', gap:'9px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:'10px', padding:'11px 14px', marginBottom:'16px', fontSize:'13px', color:'#B91C1C', fontWeight:'500' }}>
              <AlertCircle size={15} /> {formError}
            </div>
          )}

          <SectionHeading>Personal Info</SectionHeading>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'13px' }}>
            <FormField label="Player Name" required>
              <input type="text" placeholder="Full name" value={formData.playerName} onChange={e => setFormData(f=>({...f,playerName:e.target.value}))} style={inputBase} onFocus={iFocus} onBlur={iBlur} disabled={loading} />
            </FormField>
            <FormField label="Father Name">
              <input type="text" placeholder="Father's name" value={formData.fatherName} onChange={e => setFormData(f=>({...f,fatherName:e.target.value}))} style={inputBase} onFocus={iFocus} onBlur={iBlur} disabled={loading} />
            </FormField>
            <FormField label="Mother Name">
              <input type="text" placeholder="Mother's name" value={formData.motherName} onChange={e => setFormData(f=>({...f,motherName:e.target.value}))} style={inputBase} onFocus={iFocus} onBlur={iBlur} disabled={loading} />
            </FormField>
            <FormField label="Date of Birth">
              <input type="date" value={formData.dateOfBirth} onChange={handleDob} max={new Date().toISOString().split('T')[0]} style={inputBase} onFocus={iFocus} onBlur={iBlur} disabled={loading} />
            </FormField>
            <FormField label="Age" required={!isEditMode}>
              <input type="number" placeholder="Age" value={formData.age} onChange={e => setFormData(f=>({...f,age:e.target.value}))} style={inputBase} onFocus={iFocus} onBlur={iBlur} disabled={loading} />
            </FormField>
            <FormField label="Status">
              <div style={{ position:'relative' }}>
                <select value={formData.status} onChange={e => setFormData(f=>({...f,status:e.target.value}))} style={{ ...inputBase, paddingRight:'28px', appearance:'none', cursor:'pointer' }} onFocus={iFocus} onBlur={iBlur} disabled={loading}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <ChevronDown size={13} style={{ position:'absolute', right:'9px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color: textSecondary }} />
              </div>
            </FormField>
          </div>

          <SectionHeading>Contact</SectionHeading>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'13px' }}>
            <FormField label="Phone" required>
              <input type="tel" placeholder="10-digit number" value={formData.phone} onChange={e => setFormData(f=>({...f,phone:e.target.value.replace(/[^0-9+-]/g,'')}))} style={inputBase} onFocus={iFocus} onBlur={iBlur} disabled={loading} />
            </FormField>
            <FormField label="Alt. Phone">
              <input type="tel" placeholder="Optional" value={formData.alternativeNumber} onChange={e => setFormData(f=>({...f,alternativeNumber:e.target.value.replace(/[^0-9+-]/g,'')}))} style={inputBase} onFocus={iFocus} onBlur={iBlur} disabled={loading} />
            </FormField>
            <div style={{ gridColumn:'1/-1' }}>
              <FormField label="Address">
                <textarea placeholder="Full address" value={formData.address} onChange={e => setFormData(f=>({...f,address:e.target.value}))} style={{ ...inputBase, resize:'vertical', minHeight:'68px' }} onFocus={iFocus} onBlur={iBlur} disabled={loading} />
              </FormField>
            </div>
          </div>

          <SectionHeading>Pathway</SectionHeading>
          <FormField label="Learning Pathway" required>
            <div style={{ position:'relative' }}>
              <select value={formData.LearningPathway} onChange={e => setFormData(f=>({...f,LearningPathway:e.target.value}))} style={{ ...inputBase, paddingRight:'28px', appearance:'none', cursor:'pointer' }} onFocus={iFocus} onBlur={iBlur} disabled={loading}>
                <option value="" disabled>Select a pathway…</option>
                {pathwayOptions.map(pw => <option key={pw} value={pw}>{pw}</option>)}
              </select>
              <ChevronDown size={13} style={{ position:'absolute', right:'9px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color: textSecondary }} />
            </div>
          </FormField>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginTop:'24px' }}>
            <button onClick={closeModal} disabled={loading}
              style={{ padding:'11px', borderRadius:'10px', fontWeight:'600', background: surface2, color: textSecondary, border:`1.5px solid ${border}`, cursor: loading?'not-allowed':'pointer', fontSize:'13.5px', opacity: loading?.6:1 }}
              onMouseEnter={e => !loading && (e.currentTarget.style.background='#E2E8F0')}
              onMouseLeave={e => !loading && (e.currentTarget.style.background=surface2)}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ padding:'11px', borderRadius:'10px', fontWeight:'700', background:'linear-gradient(135deg,#6366F1,#8B5CF6)', color:'white', border:'none', cursor: loading?'not-allowed':'pointer', fontSize:'13.5px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', boxShadow:'0 4px 12px rgba(99,102,241,.35)', opacity: loading?.8:1 }}>
              {loading && <Loader size={14} style={{ animation:'spin 1s linear infinite' }} />}
              {loading ? (isEditMode ? 'Updating…' : 'Creating…') : (isEditMode ? 'Update Player' : 'Add Player')}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default Players;
