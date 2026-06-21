import { useState, useEffect, useRef, useMemo, createElement } from 'react';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Modal } from '../../components/Modal';
import { Toast } from '../../components/Toast';
import {
  Users, Plus, Search, Trash2, Edit3,
  AlertCircle, Loader, Mail, BookOpen,
  X, TrendingUp, Shield,
} from 'lucide-react';
import axios from 'axios';
import CryptoJS from 'crypto-js';

const COACH_API_URL = 'https://4w5wn37653.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_Adding_Coaches';

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

/* ── coach card ── */
const CoachCard = ({ coach, onEdit, onDelete, onView }) => {
  const [hov, setHov] = useState(false);
  const [accent, light] = pal(coach.name || '');
  const playerCount = coach.assignedPlayers?.length || 0;
  const roles = Array.isArray(coach.role) ? coach.role : (coach.role ? [coach.role] : []);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:'#fff', borderRadius:'20px',
        border:`1.5px solid ${hov ? accent+'40' : '#F1F5F9'}`,
        boxShadow: hov ? `0 16px 48px ${accent}22, 0 4px 16px rgba(0,0,0,.08)` : '0 2px 10px rgba(0,0,0,.06)',
        overflow:'hidden', transition:'all .25s cubic-bezier(.16,1,.3,1)',
        transform: hov ? 'translateY(-5px)' : 'none',
        display:'flex', flexDirection:'column', cursor:'pointer',
      }}
      onClick={() => onView(coach)}
    >
      {/* colour band */}
      <div style={{
        height:'72px', position:'relative', flexShrink:0,
        background:`linear-gradient(135deg, ${accent} 0%, ${light} 100%)`,
      }}>
        <div style={{ position:'absolute', top:'12px', right:'14px', display:'flex', gap:'4px', flexWrap:'wrap' }}>
          {roles.map(r => (
            <div key={r} style={{
              display:'flex', alignItems:'center', gap:'4px',
              background: r === 'admin' ? 'rgba(239,68,68,.25)' : 'rgba(255,255,255,.22)',
              backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,.3)',
              borderRadius:'999px', padding:'3px 9px',
            }}>
              <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: r === 'admin' ? '#FCA5A5' : '#4ADE80' }} />
              <span style={{ fontSize:'10px', fontWeight:'700', color:'#fff', letterSpacing:'.3px', textTransform:'capitalize' }}>{r}</span>
            </div>
          ))}
        </div>
        <div style={{
          position:'absolute', bottom:'-24px', left:'20px',
          width:'50px', height:'50px', borderRadius:'50%',
          background:`linear-gradient(135deg, ${accent}, ${light})`,
          border:'3px solid #fff',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'#fff', fontWeight:'800', fontSize:'20px',
          boxShadow:`0 4px 16px ${accent}55`, flexShrink:0,
        }}>
          {coach.name?.charAt(0).toUpperCase() || '?'}
        </div>
      </div>

      {/* body */}
      <div style={{ padding:'36px 20px 20px', flex:1, display:'flex', flexDirection:'column', gap:'12px' }}>
        <div>
          <h3 style={{ margin:'0 0 4px', fontSize:'15px', fontWeight:'800', color:'#0F172A', lineHeight:1.3 }}>{coach.name}</h3>
          <p style={{ margin:0, fontSize:'12px', color:'#94A3B8', fontWeight:'500', display:'flex', alignItems:'center', gap:'5px' }}>
            <Mail size={11} /> {coach.email || '-'}
          </p>
        </div>

        {coach.specialization ? (
          <div style={{
            display:'inline-flex', alignItems:'center', gap:'6px',
            padding:'5px 11px', borderRadius:'8px', alignSelf:'flex-start',
            background:`${accent}14`, border:`1px solid ${accent}30`,
          }}>
            <BookOpen size={11} color={accent} />
            <span style={{ fontSize:'11.5px', fontWeight:'700', color: accent }}>{coach.specialization}</span>
          </div>
        ) : (
          <span style={{ fontSize:'11.5px', color:'#CBD5E1', fontWeight:'600' }}>No specialization</span>
        )}

        <div style={{ padding:'10px 12px', borderRadius:'10px', background:'#F8FAFF', border:'1px solid #EEF2FF', display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'32px', height:'32px', borderRadius:'9px', background:`${accent}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Users size={15} color={accent} />
          </div>
          <div>
            <p style={{ margin:'0 0 1px', fontSize:'10px', fontWeight:'700', color:'#6366F1', textTransform:'uppercase', letterSpacing:'.4px' }}>Players Assigned</p>
            <p style={{ margin:0, fontSize:'18px', fontWeight:'800', color:'#4338CA', letterSpacing:'-.5px' }}>{playerCount}</p>
          </div>
        </div>

        <div style={{ height:'1px', background:'#F1F5F9' }} />

        <div style={{ display:'flex', gap:'8px' }}>
          <button
            onClick={e => { e.stopPropagation(); onEdit(coach); }}
            style={{
              flex:1, padding:'8px', borderRadius:'9px', border:'1.5px solid #E2E8F0',
              background:'#F8FAFC', color:'#6366F1', fontWeight:'700', fontSize:'12px',
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px',
              transition:'all .18s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='#EEF2FF'; e.currentTarget.style.borderColor='#6366F1'; }}
            onMouseLeave={e => { e.currentTarget.style.background='#F8FAFC'; e.currentTarget.style.borderColor='#E2E8F0'; }}
          >
            <Edit3 size={12} /> Edit
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(coach.coachId); }}
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
const Coaches = () => {
  const { coaches, fetchCoaches, deleteCoachRemote, userToken, clearCoachesCache, updateCoachRemote } = useStore();

  const [toast, setToast]               = useState({ msg:'', type:'success' });
  const [loading, setLoading]           = useState(false);
  const [isFetching, setIsFetching]     = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [roleFilter, setRoleFilter]     = useState('all');
  const [sortBy, setSortBy]             = useState('name');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [isEditMode, setIsEditMode]     = useState(false);
  const [editingCoachId, setEditingCoachId] = useState(null);
  const [formError, setFormError]       = useState('');
  const initialFetchRef = useRef(false);

  const emptyForm = { name:'', username:'', email:'', password:'', specialization:'', role:[] };
  const [formData, setFormData] = useState(emptyForm);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  useEffect(() => {
    if (initialFetchRef.current) { setIsFetching(false); return; }
    initialFetchRef.current = true;
    let alive = true;
    (async () => {
      try { await fetchCoaches(); }
      catch (e) { if (alive) showToast(e.message || 'Failed to load coaches', 'error'); }
      finally { if (alive) setIsFetching(false); }
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line

  const stats = useMemo(() => ({
    total: coaches.length,
    totalPlayers: coaches.reduce((s,c) => s + (c.PlayersList?.length || 0), 0),
    avgPlayers: coaches.length > 0
      ? Math.round(coaches.reduce((s,c) => s + (c.PlayersList?.length || 0), 0) / coaches.length)
      : 0,
    admins: coaches.filter(c => (Array.isArray(c.role) ? c.role : [c.role]).includes('admin')).length,
  }), [coaches]);

  const filteredCoaches = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return coaches
      .filter(c => {
        const roles = Array.isArray(c.role) ? c.role : (c.role ? [c.role] : []);
        const matchSearch =
          (c.name||'').toLowerCase().includes(term) ||
          (c.email||'').toLowerCase().includes(term) ||
          (c.specialization||'').toLowerCase().includes(term);
        const matchRole = roleFilter === 'all' || roles.includes(roleFilter);
        return matchSearch && matchRole;
      })
      .map(c => ({
        coachId: c._id,
        name: c.name,
        email: c.email,
        username: c.username,
        specialization: c.specialization,
        role: Array.isArray(c.role) ? c.role : (c.role ? [c.role] : []),
        assignedPlayers: c.PlayersList || [],
      }))
      .sort((a, b) =>
        sortBy === 'players'
          ? (b.assignedPlayers.length) - (a.assignedPlayers.length)
          : (a.name||'').localeCompare(b.name||'')
      );
  }, [coaches, searchTerm, roleFilter, sortBy]);

  const validateEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const hashPassword  = pw => CryptoJS.SHA256(pw).toString();

  const openAdd = () => {
    setFormData(emptyForm); setIsEditMode(false); setEditingCoachId(null);
    setFormError(''); setIsModalOpen(true);
  };
  const openEdit = coach => {
    setIsEditMode(true); setEditingCoachId(coach.coachId);
    setFormData({
      name: coach.name || '', username: coach.username || '',
      email: coach.email || '', password: '',
      specialization: coach.specialization || '',
      role: Array.isArray(coach.role) ? coach.role : (coach.role ? [coach.role] : []),
    });
    setFormError(''); setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false); setFormData(emptyForm);
    setIsEditMode(false); setEditingCoachId(null); setFormError('');
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!formData.name?.trim()) { setFormError('Coach name is required'); return; }
    if (formData.email && !validateEmail(formData.email)) { setFormError('Enter a valid email address'); return; }
    if (!formData.role?.length) { setFormError('Select at least one role'); return; }
    if (!isEditMode) {
      if (!formData.username?.trim()) { setFormError('Username is required'); return; }
      if (!formData.email?.trim()) { setFormError('Email is required'); return; }
      if (!formData.password) { setFormError('Password is required'); return; }
      if (formData.password.length < 6) { setFormError('Password must be at least 6 characters'); return; }
      if (!formData.specialization?.trim()) { setFormError('Specialization is required'); return; }
    } else {
      if (formData.password && formData.password.length < 6) { setFormError('Password must be at least 6 characters'); return; }
    }

    setLoading(true);
    try {
      if (isEditMode) {
        const payload = {
          coachId: editingCoachId,
          name: formData.name,
          specialization: formData.specialization || '',
          username: formData.username || '',
          email: formData.email || '',
          role: formData.role,
        };
        if (formData.password) payload.password = hashPassword(formData.password);
        const res = await updateCoachRemote(editingCoachId, payload);
        if (res.success) {
          clearCoachesCache();
          await fetchCoaches();
          showToast('Coach updated');
          setTimeout(closeModal, 800);
        } else { setFormError(res.error || 'Update failed'); }
      } else {
        const response = await axios.post(COACH_API_URL, {
          name: formData.name,
          username: formData.username,
          password: hashPassword(formData.password),
          email: formData.email,
          specialization: formData.specialization,
          role: formData.role,
        }, {
          headers: { 'Content-Type': 'application/json', ...(userToken && { 'usertoken': userToken }) },
        });
        const ok = response.data?.statusCode === 200 || response.data?.statusCode === 201
          || response.status === 200 || response.status === 201;
        if (ok) {
          clearCoachesCache();
          await fetchCoaches();
          showToast('Coach added');
          setTimeout(closeModal, 800);
        } else { setFormError(response.data?.message || 'Failed to add coach'); }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'An error occurred');
    } finally { setLoading(false); }
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
        .co-card { animation: cardIn .3s ease both; }
        @media(max-width:640px){ .co-stats{grid-template-columns:1fr 1fr!important} .co-bar{flex-direction:column!important} }
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
              <h1 style={{ fontSize:'24px', fontWeight:'800', color:'#fff', margin:'0 0 3px', letterSpacing:'-.5px' }}>Coaches</h1>
              <p style={{ fontSize:'13px', color:'rgba(255,255,255,.6)', margin:0, fontWeight:'500' }}>
                {isFetching ? 'Loading…' : `${stats.total} coaches · ${stats.totalPlayers} players assigned`}
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
            <Plus size={16} /> Add Coach
          </button>
        </div>

        {/* ── Summary stats ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:'14px', marginBottom:'24px' }} className="co-stats">
          {isFetching ? [1,2,3,4].map(i => (
            <div key={i} style={{ background:'#fff', borderRadius:'16px', padding:'18px 20px', border:'1px solid #F1F5F9', display:'flex', gap:'14px', alignItems:'center' }}>
              <Sk w="48px" h="48px" r={13} />
              <div style={{ flex:1 }}><Sk w="60%" h="10px" /><div style={{marginTop:8}}><Sk w="42%" h="22px" /></div></div>
            </div>
          )) : <>
            <SummaryCard label="Total Coaches"  value={stats.total}        icon={Users}      accent="#6366F1" />
            <SummaryCard label="Total Players"  value={stats.totalPlayers} icon={BookOpen}   accent="#10B981" />
            <SummaryCard label="Avg Players"    value={stats.avgPlayers}   icon={TrendingUp} accent="#F59E0B" />
            <SummaryCard label="Admin Coaches"  value={stats.admins}       icon={Shield}     accent="#EC4899" />
          </>}
        </div>

        {/* ── Filter / sort bar ── */}
        <div style={{
          display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px',
          background:'#fff', padding:'12px 16px', borderRadius:'14px',
          border:'1px solid #F1F5F9', boxShadow:'0 2px 6px rgba(0,0,0,.04)',
          flexWrap:'wrap',
        }} className="co-bar">
          {/* Search */}
          <div style={{
            display:'flex', alignItems:'center', gap:'8px', flex:'1', minWidth:'200px', maxWidth:'340px',
            border:'1.5px solid #E2E8F0', borderRadius:'10px', padding:'8px 12px', background:'#FAFBFC',
            transition:'border-color .18s, box-shadow .18s',
          }}
          onFocusCapture={e => { e.currentTarget.style.borderColor='#6366F1'; e.currentTarget.style.boxShadow='0 0 0 3px rgba(99,102,241,.1)'; }}
          onBlurCapture={e => { e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.boxShadow='none'; }}>
            <Search size={15} color="#94A3B8" />
            <input
              type="text" placeholder="Search coaches…" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ border:'none', outline:'none', background:'transparent', fontSize:'13px', fontWeight:'500', color:'#1E293B', flex:1, fontFamily:'inherit' }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={{ border:'none', background:'none', cursor:'pointer', color:'#94A3B8', padding:0, display:'flex' }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Role chips */}
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            {['all','coach','admin'].map(role => (
              <button key={role} onClick={() => setRoleFilter(role)} style={{
                padding:'7px 14px', borderRadius:'999px', fontSize:'12px', fontWeight:'700',
                border: roleFilter === role ? '1.5px solid #6366F1' : '1.5px solid #E2E8F0',
                background: roleFilter === role ? '#6366F1' : '#F8FAFC',
                color: roleFilter === role ? '#fff' : '#64748B',
                cursor:'pointer', transition:'all .18s ease', textTransform:'capitalize',
              }}>
                {role === 'all' ? 'All' : role}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div style={{ display:'flex', gap:'6px', marginLeft:'auto' }}>
            {[['name','A–Z'],['players','Players']].map(([key,label]) => (
              <button key={key} onClick={() => setSortBy(key)} style={{
                padding:'7px 12px', borderRadius:'8px', fontSize:'11.5px', fontWeight:'700',
                border: sortBy === key ? '1.5px solid #6366F1' : '1.5px solid transparent',
                background: sortBy === key ? '#EEF2FF' : 'transparent',
                color: sortBy === key ? '#6366F1' : '#94A3B8',
                cursor:'pointer', transition:'all .18s ease', display:'flex', alignItems:'center', gap:'4px',
              }}>
                {sortBy === key && <TrendingUp size={11} />} {label}
              </button>
            ))}
          </div>

          {/* Count */}
          <span style={{ fontSize:'12px', fontWeight:'700', color:'#94A3B8', whiteSpace:'nowrap' }}>
            <span style={{ color:'#6366F1' }}>{filteredCoaches.length}</span> / {coaches.length}
          </span>
        </div>

        {/* ── Card grid ── */}
        {isFetching ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'18px' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ borderRadius:'20px', overflow:'hidden', border:'1.5px solid #F1F5F9', background:'#fff' }}>
                <div style={{ height:'72px', background:'#EEF2F7', animation:'plsPulse 1.6s ease-in-out infinite' }} />
                <div style={{ padding:'36px 20px 20px', display:'flex', flexDirection:'column', gap:'12px' }}>
                  <div><Sk w="65%" h="16px" /><div style={{marginTop:7}}><Sk w="45%" h="12px" /></div></div>
                  <Sk w="130px" h="26px" r={8} />
                  <Sk w="100%" h="58px" r={10} />
                  <div style={{ display:'flex', gap:'8px' }}>
                    <Sk w="100%" h="34px" r={9} />
                    <Sk w="36px" h="34px" r={9} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredCoaches.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 24px' }}>
            <div style={{ width:'80px', height:'80px', borderRadius:'22px', background:'linear-gradient(135deg,#EEF2FF,#E0E7FF)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', boxShadow:'0 8px 24px #6366F120' }}>
              <Users size={36} color="#6366F1" />
            </div>
            <p style={{ fontSize:'17px', fontWeight:'800', color:'#0F172A', margin:'0 0 8px' }}>
              {searchTerm || roleFilter !== 'all' ? 'No coaches found' : 'No coaches yet'}
            </p>
            <p style={{ fontSize:'13.5px', color:'#94A3B8', margin:'0 0 24px' }}>
              {searchTerm ? 'Try a different search or clear the filter' : 'Add your first coach to get started'}
            </p>
            {!searchTerm && roleFilter === 'all' && (
              <button onClick={openAdd} style={{
                display:'inline-flex', alignItems:'center', gap:'8px',
                padding:'11px 22px', borderRadius:'11px', border:'none',
                background:'linear-gradient(135deg,#6366F1,#8B5CF6)',
                color:'white', fontWeight:'700', fontSize:'13.5px', cursor:'pointer',
                boxShadow:'0 4px 14px rgba(99,102,241,.35)',
              }}>
                <Plus size={16} /> Add First Coach
              </button>
            )}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'18px' }}>
            {filteredCoaches.map((c, i) => (
              <div key={c.coachId} className="co-card" style={{ animationDelay:`${i * 40}ms` }}>
                <CoachCard coach={c} onEdit={openEdit} onDelete={setDeleteConfirm} onView={setSelectedCoach} />
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
            <h3 style={{ fontSize:'18px', fontWeight:'800', color:'#0F172A', margin:'0 0 8px' }}>Delete this coach?</h3>
            <p style={{ fontSize:'13.5px', color:'#64748B', margin:'0 0 28px', lineHeight:1.6 }}>
              This cannot be undone. All associated data will be permanently removed.
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ padding:'11px', borderRadius:'10px', fontWeight:'600', background:'#F1F5F9', color:'#475569', border:'1.5px solid #E2E8F0', cursor:'pointer', fontSize:'13.5px' }}
                onMouseEnter={e => e.currentTarget.style.background='#E2E8F0'}
                onMouseLeave={e => e.currentTarget.style.background='#F1F5F9'}>
                Cancel
              </button>
              <button
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await deleteCoachRemote(deleteConfirm);
                    if (res.success) { showToast('Coach deleted'); await fetchCoaches(); }
                    else showToast(res.error || 'Delete failed', 'error');
                  } catch (e) { showToast(e.message || 'Delete failed', 'error'); }
                  finally { setLoading(false); setDeleteConfirm(null); }
                }}
                style={{ padding:'11px', borderRadius:'10px', fontWeight:'700', background:'linear-gradient(135deg,#EF4444,#DC2626)', color:'white', border:'none', cursor: loading?'not-allowed':'pointer', fontSize:'13.5px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', boxShadow:'0 4px 12px rgba(239,68,68,.3)', opacity: loading?0.8:1 }}>
                {loading && <Loader size={14} style={{ animation:'spin 1s linear infinite' }} />}
                {loading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ Coach profile modal ══ */}
      {selectedCoach && (
        <Modal isOpen={!!selectedCoach} onClose={() => setSelectedCoach(null)} title="Coach Profile">
          <div style={{ padding:'0 24px 28px' }}>
            {(() => {
              const [accent, light] = pal(selectedCoach.name || '');
              const roles = Array.isArray(selectedCoach.role) ? selectedCoach.role : (selectedCoach.role ? [selectedCoach.role] : []);
              return (
                <>
                  <div style={{
                    background:`linear-gradient(135deg, ${accent} 0%, ${light} 100%)`,
                    borderRadius:'16px', padding:'24px', marginBottom:'20px',
                    display:'flex', alignItems:'center', gap:'16px',
                  }}>
                    <div style={{ width:'64px', height:'64px', borderRadius:'50%', flexShrink:0, background:'rgba(255,255,255,.25)', border:'3px solid rgba(255,255,255,.5)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:'800', fontSize:'26px', boxShadow:'0 6px 20px rgba(0,0,0,.2)' }}>
                      {selectedCoach.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <h2 style={{ margin:'0 0 6px', fontSize:'20px', fontWeight:'800', color:'#fff' }}>{selectedCoach.name}</h2>
                      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                        {roles.map(r => (
                          <span key={r} style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'3px 10px', borderRadius:'999px', background:'rgba(255,255,255,.22)', color:'#fff', fontSize:'11px', fontWeight:'700', border:'1px solid rgba(255,255,255,.3)', textTransform:'capitalize' }}>
                            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: r === 'admin' ? '#FCA5A5' : '#4ADE80' }} />
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'20px' }}>
                    <div style={{ padding:'16px', borderRadius:'13px', background:'#EEF2FF', border:'1.5px solid #C7D2FE', textAlign:'center' }}>
                      <p style={{ margin:'0 0 4px', fontSize:'10px', fontWeight:'700', color:'#6366F1', textTransform:'uppercase', letterSpacing:'.5px' }}>Players Assigned</p>
                      <p style={{ margin:0, fontSize:'26px', fontWeight:'800', color:'#4338CA' }}>{selectedCoach.assignedPlayers?.length || 0}</p>
                    </div>
                    <div style={{ padding:'16px', borderRadius:'13px', background:'#ECFDF5', border:'1.5px solid #A7F3D0', textAlign:'center' }}>
                      <p style={{ margin:'0 0 4px', fontSize:'10px', fontWeight:'700', color:'#10B981', textTransform:'uppercase', letterSpacing:'.5px' }}>Roles</p>
                      <p style={{ margin:0, fontSize:'15px', fontWeight:'800', color:'#065F46', textTransform:'capitalize' }}>{roles.join(', ') || '-'}</p>
                    </div>
                  </div>

                  {[
                    { label:'Username',       value: selectedCoach.username },
                    { label:'Email',          value: selectedCoach.email },
                    { label:'Specialization', value: selectedCoach.specialization },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ padding:'10px 14px', borderRadius:'10px', background:'#F8FAFC', border:'1px solid #F1F5F9', marginBottom:'8px' }}>
                      <p style={{ margin:'0 0 3px', fontSize:'10px', fontWeight:'700', color:'#94A3B8', textTransform:'uppercase' }}>{label}</p>
                      <p style={{ margin:0, fontSize:'13.5px', fontWeight:'600', color: value?'#1E293B':'#CBD5E1' }}>{value || '-'}</p>
                    </div>
                  ))}

                  <button
                    onClick={() => { setSelectedCoach(null); openEdit(selectedCoach); }}
                    style={{ width:'100%', padding:'12px', borderRadius:'11px', background:`linear-gradient(135deg, ${accent}, ${light})`, color:'white', border:'none', fontWeight:'700', fontSize:'13.5px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', boxShadow:`0 4px 14px ${accent}40`, marginTop:'12px' }}>
                    <Edit3 size={15} /> Edit Coach
                  </button>
                </>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* ══ Add / Edit modal ══ */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditMode ? 'Edit Coach' : 'Add New Coach'}>
        <div style={{ padding:'0 24px 28px' }}>
          {formError && (
            <div style={{ display:'flex', alignItems:'center', gap:'9px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:'10px', padding:'11px 14px', marginBottom:'16px', fontSize:'13px', color:'#B91C1C', fontWeight:'500' }}>
              <AlertCircle size={15} /> {formError}
            </div>
          )}

          <SectionHeading>Basic Info</SectionHeading>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'13px' }}>
            <FormField label="Full Name" required>
              <input type="text" placeholder="Full name" value={formData.name}
                onChange={e => setFormData(f=>({...f,name:e.target.value}))}
                style={inputBase} onFocus={iFocus} onBlur={iBlur} disabled={loading} />
            </FormField>
            <FormField label="Username" required={!isEditMode}>
              <input type="text" placeholder="Name-TG" value={formData.username}
                onChange={e => setFormData(f=>({...f,username:e.target.value}))}
                style={inputBase} onFocus={iFocus} onBlur={iBlur} disabled={loading} />
            </FormField>
            <FormField label="Email Address" required={!isEditMode}>
              <input type="email" placeholder="name@technology-garage.com" value={formData.email}
                onChange={e => setFormData(f=>({...f,email:e.target.value}))}
                style={inputBase} onFocus={iFocus} onBlur={iBlur} disabled={loading} />
            </FormField>
            <FormField label={isEditMode ? 'Password (blank to keep)' : 'Password'} required={!isEditMode}>
              <input type="password" placeholder="••••••••" value={formData.password}
                onChange={e => setFormData(f=>({...f,password:e.target.value}))}
                style={inputBase} onFocus={iFocus} onBlur={iBlur} disabled={loading} />
            </FormField>
            <div style={{ gridColumn:'1/-1' }}>
              <FormField label="Specialization" required={!isEditMode}>
                <input type="text" placeholder="e.g., Python & Web Development" value={formData.specialization}
                  onChange={e => setFormData(f=>({...f,specialization:e.target.value}))}
                  style={inputBase} onFocus={iFocus} onBlur={iBlur} disabled={loading} />
              </FormField>
            </div>
          </div>

          <SectionHeading>Role</SectionHeading>
          <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
            {['coach','admin'].map(roleOption => {
              const isSelected = (formData.role || []).includes(roleOption);
              return (
                <button
                  key={roleOption} type="button" disabled={loading}
                  onClick={() => {
                    const roles = formData.role || [];
                    setFormData(f => ({
                      ...f,
                      role: isSelected ? roles.filter(r => r !== roleOption) : [...roles, roleOption],
                    }));
                  }}
                  style={{
                    padding:'10px 28px', borderRadius:'9px', fontSize:'13.5px', fontWeight:'700',
                    textTransform:'capitalize', border:'1.5px solid',
                    borderColor: isSelected ? '#6366F1' : '#E2E8F0',
                    background: isSelected ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : '#F8FAFC',
                    color: isSelected ? '#fff' : '#64748B',
                    boxShadow: isSelected ? '0 4px 12px rgba(99,102,241,.3)' : 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition:'all .18s ease', opacity: loading ? 0.6 : 1,
                  }}
                >
                  {roleOption}
                </button>
              );
            })}
          </div>
          {(!formData.role?.length) && (
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'10px', color:'#EF4444', fontSize:'12px', fontWeight:'600' }}>
              <AlertCircle size={14} /> Select at least one role
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginTop:'24px' }}>
            <button onClick={closeModal} disabled={loading}
              style={{ padding:'11px', borderRadius:'10px', fontWeight:'600', background:'#F1F5F9', color:'#475569', border:'1.5px solid #E2E8F0', cursor: loading?'not-allowed':'pointer', fontSize:'13.5px', opacity: loading?0.6:1 }}
              onMouseEnter={e => !loading && (e.currentTarget.style.background='#E2E8F0')}
              onMouseLeave={e => !loading && (e.currentTarget.style.background='#F1F5F9')}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ padding:'11px', borderRadius:'10px', fontWeight:'700', background:'linear-gradient(135deg,#6366F1,#8B5CF6)', color:'white', border:'none', cursor: loading?'not-allowed':'pointer', fontSize:'13.5px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', boxShadow:'0 4px 12px rgba(99,102,241,.35)', opacity: loading?0.8:1 }}>
              {loading && <Loader size={14} style={{ animation:'spin 1s linear infinite' }} />}
              {loading ? (isEditMode ? 'Updating…' : 'Creating…') : (isEditMode ? 'Update Coach' : 'Add Coach')}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default Coaches;
