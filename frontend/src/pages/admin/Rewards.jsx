import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Gift, Edit2, Trash2, Package, Search, Plus, X, Loader, CheckCircle, TrendingUp, Star } from 'lucide-react';
import { useState, useEffect, useRef, useMemo, createElement } from 'react';
import { Toast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';

const API_ENDPOINTS = {
  VIEW:   'https://vzcyj52ypb.execute-api.ap-south-1.amazonaws.com/default/CL_View_Reward',
  ADD:    'https://rk37pftip6.execute-api.ap-south-1.amazonaws.com/default/CL_Add_Reward',
  UPDATE: 'https://5rb7nhg1rg.execute-api.ap-south-1.amazonaws.com/default/CL_Update_Reward',
  DELETE: 'https://dxliwg58k2.execute-api.ap-south-1.amazonaws.com/default/CL_Delete_Reward',
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
  <div style={{ width:w, height:h, borderRadius:r, background:'#EEF2F7', animation:'rwdPulse 1.6s ease-in-out infinite', flexShrink:0 }} />
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

/* ── reward card (module-level, memo-friendly) ── */
const RewardCard = ({ reward, onEdit, onDelete, surface, border }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: surface, borderRadius:'16px', overflow:'hidden',
        border:`1.5px solid ${hov ? 'rgba(99,102,241,0.35)' : border}`,
        boxShadow: hov ? '0 12px 32px rgba(6,0,48,0.12)' : '0 2px 8px rgba(0,0,0,.05)',
        display:'flex', flexDirection:'column',
        transition:'all .22s cubic-bezier(.34,1.56,.64,1)',
        transform: hov ? 'translateY(-5px)' : 'none',
        animation:'rwdFadeUp .3s ease',
      }}
    >
      {/* brand top band */}
      <div style={{ height:'5px', background:'linear-gradient(90deg, #060030, #6366F1)' }} />

      <div style={{ padding:'20px', flex:1, display:'flex', flexDirection:'column' }}>
        {/* top row */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px', gap:'10px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:'rgba(99,102,241,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Gift size={17} color="#6366F1" />
            </div>
            <h3 style={{ fontSize:'15px', fontWeight:'800', color:'#0F172A', margin:0, lineHeight:'1.3' }}>{reward.rewardName}</h3>
          </div>
          <span style={{
            padding:'4px 10px', borderRadius:'999px', fontSize:'10.5px', fontWeight:'700',
            background: reward.isActive ? '#DCFCE7' : '#FEE2E2',
            color: reward.isActive ? '#15803D' : '#B91C1C',
            whiteSpace:'nowrap', flexShrink:0,
          }}>
            {reward.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* description */}
        <p style={{
          fontSize:'13px', color:'#64748B', margin:'0 0 14px', lineHeight:'1.55', flex:1,
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
        }}>
          {reward.rewardDescription}
        </p>

        {/* points badge */}
        <div style={{
          display:'flex', alignItems:'center', gap:'8px',
          padding:'10px 13px', background:'rgba(99,102,241,0.06)',
          border:'1.5px solid rgba(99,102,241,0.18)', borderRadius:'10px', marginBottom:'14px',
        }}>
          <div style={{ width:'28px', height:'28px', borderRadius:'7px', background:'rgba(99,102,241,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Star size={13} color="#6366F1" />
          </div>
          <div>
            <p style={{ fontSize:'10px', fontWeight:'700', color:'#94A3B8', margin:0, textTransform:'uppercase', letterSpacing:'.5px' }}>Points Required</p>
            <p style={{ fontSize:'16px', fontWeight:'800', color:'#6366F1', margin:0 }}>{reward.points}</p>
          </div>
        </div>

        {/* actions */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
          <button
            onClick={() => onEdit(reward)}
            style={{
              padding:'9px', borderRadius:'9px', fontWeight:'700', fontSize:'13px',
              background:'linear-gradient(135deg,#6366F1,#8B5CF6)', color:'#fff',
              border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
              transition:'all .18s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(99,102,241,.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}
          >
            <Edit2 size={13} /> Edit
          </button>
          <button
            onClick={() => onDelete(reward)}
            style={{
              padding:'9px', borderRadius:'9px', fontWeight:'700', fontSize:'13px',
              background:'linear-gradient(135deg,#EF4444,#DC2626)', color:'#fff',
              border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
              transition:'all .18s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(239,68,68,.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════ */
const Rewards = () => {
  const { userToken } = useStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const surface = dark ? 'var(--cl-surface)' : '#fff';
  const border = dark ? 'var(--cl-border)' : '#F1F5F9';
  const textPrimary = dark ? 'var(--cl-text)' : '#0F172A';
  const textSecondary = dark ? 'var(--cl-text-2)' : '#64748B';
  const textMuted = dark ? 'var(--cl-text-3)' : '#94A3B8';
  const surface2 = dark ? 'var(--cl-surface-2)' : '#F8FAFC';

  const [rewards, setRewards]               = useState([]);
  const [searchTerm, setSearchTerm]         = useState('');
  const [statusFilter, setStatusFilter]     = useState('all');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const [addModalOpen, setAddModalOpen]     = useState(false);
  const [editingReward, setEditingReward]   = useState(null);
  const [loading, setLoading]               = useState(true);
  const [toast, setToast]                   = useState(null);
  const hasFetchedRef = useRef(false);
  const [formData, setFormData] = useState({ rewardName:'', rewardDescription:'', points:'', isActive:true });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchRewards();
  }, []); // eslint-disable-line

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.VIEW, { headers:{ 'userToken':userToken } });
      const data = await response.json();
      if (data.data) setRewards(data.data);
    } catch {
      showToast('Failed to load rewards', 'error');
      setRewards([]);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteReward = async () => {
    try {
      setSubmitting(true);
      const rewardId = selectedReward.id || selectedReward._id || selectedReward.rewardId;
      const response = await fetch(API_ENDPOINTS.DELETE, {
        method:'DELETE', headers:{ 'userToken':userToken }, body:JSON.stringify({ rewardId }),
      });
      if (response.ok) {
        showToast('Reward deleted successfully');
        setDeleteModalOpen(false);
        fetchRewards();
      } else {
        showToast('Failed to delete reward', 'error');
      }
    } catch {
      showToast('Error deleting reward', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveReward = async e => {
    e.preventDefault();
    if (!formData.rewardName || !formData.rewardDescription || !formData.points) {
      showToast('Please fill all fields', 'error'); return;
    }
    try {
      setSubmitting(true);
      const payload = { rewardName:formData.rewardName, rewardDescription:formData.rewardDescription, points:parseInt(formData.points), isActive:formData.isActive };
      const body = editingReward ? { ...payload, rewardId: editingReward._id || editingReward.rewardId } : payload;
      const response = await fetch(editingReward ? API_ENDPOINTS.UPDATE : API_ENDPOINTS.ADD, {
        method: editingReward ? 'PUT' : 'POST',
        headers:{ 'Content-Type':'application/json', 'userToken':userToken },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        showToast(editingReward ? 'Reward updated successfully' : 'Reward added successfully');
        handleCloseModal(); fetchRewards();
      } else {
        showToast(editingReward ? 'Failed to update reward' : 'Failed to add reward', 'error');
      }
    } catch {
      showToast('Error saving reward', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = reward => {
    setEditingReward(reward);
    setFormData({ rewardName:reward.rewardName, rewardDescription:reward.rewardDescription, points:reward.points.toString(), isActive:reward.isActive });
    setAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setAddModalOpen(false); setEditingReward(null);
    setFormData({ rewardName:'', rewardDescription:'', points:'', isActive:true });
  };

  const stats = useMemo(() => ({
    total:   rewards.length,
    active:  rewards.filter(r => r.isActive).length,
    inactive: rewards.filter(r => !r.isActive).length,
    avg:     rewards.length > 0 ? Math.round(rewards.reduce((s,r) => s+(r.points||0), 0) / rewards.length) : 0,
  }), [rewards]);

  const filteredRewards = useMemo(() => rewards.filter(r => {
    const matchSearch = r.rewardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.rewardDescription.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? r.isActive : !r.isActive);
    return matchSearch && matchStatus;
  }), [rewards, searchTerm, statusFilter]);

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <style>{`
        @keyframes rwdPulse  { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes rwdFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeOverlay { from{opacity:0} to{opacity:1} }
        @keyframes slideModal { from{opacity:0;transform:translateY(18px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>

      <div style={{ maxWidth:'1400px', margin:'0 auto', padding:'24px 28px', animation:'rwdFadeUp .3s ease' }}>

        {/* ── Header banner ── */}
        <div style={{
          background:'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
          borderRadius:'20px', padding:'28px 32px', marginBottom:'24px',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px',
          boxShadow:'0 12px 40px rgba(6,0,48,.3)', flexWrap:'wrap',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:'rgba(255,255,255,.12)', border:'1.5px solid rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Gift size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize:'24px', fontWeight:'800', color:'#fff', margin:'0 0 3px', letterSpacing:'-.5px' }}>Reward Management</h1>
              <p style={{ fontSize:'13px', color:'rgba(255,255,255,.6)', margin:0, fontWeight:'500' }}>
                {loading ? 'Loading…' : `${stats.total} reward${stats.total !== 1 ? 's' : ''} · ${stats.active} active`}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setEditingReward(null); setFormData({ rewardName:'', rewardDescription:'', points:'', isActive:true }); setAddModalOpen(true); }}
            style={{
              display:'flex', alignItems:'center', gap:'8px', padding:'12px 22px', borderRadius:'12px',
              background:'rgba(255,255,255,.15)', backdropFilter:'blur(8px)',
              border:'1.5px solid rgba(255,255,255,.3)',
              color:'#fff', fontWeight:'700', fontSize:'13.5px', cursor:'pointer', transition:'all .2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.25)'; e.currentTarget.style.transform='translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.15)'; e.currentTarget.style.transform='none'; }}
          >
            <Plus size={17} /> Add Reward
          </button>
        </div>

        {/* ── Summary cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:'14px', marginBottom:'24px' }}>
          {loading ? [1,2,3,4].map(i => (
            <div key={i} style={{ background: surface, borderRadius:'16px', padding:'18px 20px', border:`1px solid ${border}`, display:'flex', gap:'14px', alignItems:'center' }}>
              <Sk w="48px" h="48px" r={13} />
              <div style={{ flex:1 }}><Sk w="60%" h="10px" /><div style={{marginTop:8}}><Sk w="42%" h="22px" /></div></div>
            </div>
          )) : <>
            <SummaryCard label="Total Rewards" value={stats.total}    icon={Gift}        accent="#6366F1" surface={surface} border={border} />
            <SummaryCard label="Active"         value={stats.active}  icon={CheckCircle} accent="#10B981" surface={surface} border={border} />
            <SummaryCard label="Inactive"       value={stats.inactive} icon={Package}    accent="#F59E0B" surface={surface} border={border} />
            <SummaryCard label="Avg Points"     value={stats.avg}     icon={TrendingUp}  accent="#EC4899" surface={surface} border={border} />
          </>}
        </div>

        {/* ── Filter bar ── */}
        <div style={{
          display:'flex', alignItems:'center', gap:'10px', marginBottom:'24px',
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
              type="text" placeholder="Search rewards…" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ border:'none', outline:'none', background:'transparent', fontSize:'13px', fontWeight:'500', color:'#1E293B', flex:1, fontFamily:'inherit' }}
            />
            {searchTerm && <button onClick={() => setSearchTerm('')} style={{ border:'none', background:'none', cursor:'pointer', color: textMuted, padding:0, display:'flex' }}><X size={14} /></button>}
          </div>

          <div style={{ display:'flex', gap:'6px' }}>
            {[['all','All'], ['active','Active'], ['inactive','Inactive']].map(([v,l]) => (
              <button key={v} onClick={() => setStatusFilter(v)} style={{
                padding:'7px 14px', borderRadius:'999px', fontSize:'12px', fontWeight:'700',
                border: statusFilter === v ? '1.5px solid #6366F1' : `1.5px solid ${border}`,
                background: statusFilter === v ? '#6366F1' : surface2,
                color: statusFilter === v ? '#fff' : textSecondary, cursor:'pointer', transition:'all .18s ease',
              }}>{l}</button>
            ))}
          </div>

          <span style={{ fontSize:'12px', fontWeight:'700', color: textMuted, marginLeft:'auto', whiteSpace:'nowrap' }}>
            <span style={{ color:'#6366F1' }}>{filteredRewards.length}</span> / {rewards.length}
          </span>
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:'18px' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background: surface, borderRadius:'16px', overflow:'hidden', border:`1px solid ${border}` }}>
                <div style={{ height:'5px', background:'#EEF2F7', animation:'rwdPulse 1.6s ease-in-out infinite' }} />
                <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:'12px' }}>
                  <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                    <Sk w="38px" h="38px" r={10} /><Sk w="55%" h="16px" />
                  </div>
                  <Sk w="100%" h="13px" /><Sk w="80%" h="13px" />
                  <Sk w="100%" h="44px" r={10} />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                    <Sk w="100%" h="36px" r={9} /><Sk w="100%" h="36px" r={9} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredRewards.length > 0 ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:'18px' }}>
            {filteredRewards.map((reward, i) => (
              <RewardCard
                key={reward._id || reward.rewardId || i}
                reward={reward}
                onEdit={handleEditClick}
                onDelete={r => { setSelectedReward(r); setDeleteModalOpen(true); }}
                surface={surface}
                border={border}
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign:'center', padding:'80px 24px', background: surface, borderRadius:'16px', border:`2px dashed ${border}` }}>
            <div style={{ width:'80px', height:'80px', borderRadius:'22px', background:'#EEF2FF', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <Package size={36} color="#6366F1" />
            </div>
            <p style={{ fontSize:'18px', fontWeight:'800', color: textPrimary, margin:'0 0 8px' }}>No rewards found</p>
            <p style={{ fontSize:'13.5px', color: textMuted, margin:0 }}>
              {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Add your first reward to get started'}
            </p>
          </div>
        )}

        {/* ── Add / Edit modal ── */}
        {addModalOpen && (
          <div style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex',
            alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter:'blur(4px)',
            animation:'fadeOverlay .2s ease',
          }} onClick={e => { if (e.target === e.currentTarget) handleCloseModal(); }}>
            <div style={{
              background: surface, borderRadius:'20px', padding:'28px 28px 24px', maxWidth:'500px', width:'92%',
              boxShadow:'0 30px 60px rgba(0,0,0,.22)', animation:'slideModal .3s cubic-bezier(.34,1.56,.64,1)',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'22px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'11px', background:'linear-gradient(135deg,#6366F1,#8B5CF6)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Gift size={18} color="#fff" />
                  </div>
                  <h3 style={{ fontSize:'18px', fontWeight:'800', color: textPrimary, margin:0 }}>
                    {editingReward ? 'Edit Reward' : 'Add New Reward'}
                  </h3>
                </div>
                <button onClick={handleCloseModal} style={{ width:'32px', height:'32px', borderRadius:'8px', border:'none', background: surface2, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .18s ease' }}
                  onMouseEnter={e => e.currentTarget.style.background='#EEF2F7'} onMouseLeave={e => e.currentTarget.style.background=surface2}>
                  <X size={16} color={textSecondary} />
                </button>
              </div>

              <form onSubmit={handleSaveReward}>
                <div style={{ display:'flex', flexDirection:'column', gap:'16px', marginBottom:'22px' }}>
                  <FormField label="Reward Name" required>
                    <input type="text" value={formData.rewardName} onChange={e => setFormData({...formData, rewardName:e.target.value})}
                      placeholder="e.g., OpenAI Subscription" style={inputBase} onFocus={iFocus} onBlur={iBlur} />
                  </FormField>
                  <FormField label="Description" required>
                    <textarea value={formData.rewardDescription} onChange={e => setFormData({...formData, rewardDescription:e.target.value})}
                      placeholder="Describe the reward…"
                      style={{ ...inputBase, minHeight:'90px', resize:'vertical' }} onFocus={iFocus} onBlur={iBlur} />
                  </FormField>
                  <FormField label="Points Required" required>
                    <input type="number" value={formData.points} onChange={e => setFormData({...formData, points:e.target.value})}
                      placeholder="e.g., 1000" style={inputBase} onFocus={iFocus} onBlur={iBlur} />
                  </FormField>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', background: surface2, borderRadius:'10px', border:`1.5px solid ${border}`, cursor:'pointer' }}
                    onClick={() => setFormData({...formData, isActive:!formData.isActive})}>
                    <div style={{ width:'20px', height:'20px', borderRadius:'5px', border:`2px solid ${formData.isActive ? '#6366F1' : '#CBD5E1'}`, background: formData.isActive ? '#6366F1' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .18s ease', flexShrink:0 }}>
                      {formData.isActive && <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4L4.5 7.5L10 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ fontSize:'13.5px', fontWeight:'700', color:'#1E293B' }}>Mark as active</span>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                  <button type="button" onClick={handleCloseModal} style={{
                    padding:'11px', border:`1.5px solid ${border}`, background: surface2, borderRadius:'10px',
                    fontSize:'14px', fontWeight:'700', color: textSecondary, cursor:'pointer', transition:'all .18s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='#EEF2F7'; e.currentTarget.style.borderColor='#CBD5E1'; }}
                  onMouseLeave={e => { e.currentTarget.style.background=surface2; e.currentTarget.style.borderColor=border; }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} style={{
                    padding:'11px', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:'700',
                    background: submitting ? '#C7D2FE' : 'linear-gradient(135deg,#6366F1,#8B5CF6)', color:'#fff',
                    cursor: submitting ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                    transition:'all .18s ease',
                  }}>
                    {submitting && <Loader size={14} style={{ animation:'spin 1s linear infinite' }} />}
                    {editingReward ? 'Update' : 'Add'} Reward
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Delete modal ── */}
        {deleteModalOpen && selectedReward && (
          <div style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex',
            alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter:'blur(4px)',
            animation:'fadeOverlay .2s ease',
          }} onClick={e => { if (e.target === e.currentTarget && !submitting) setDeleteModalOpen(false); }}>
            <div style={{
              background: surface, borderRadius:'20px', padding:'32px 28px', maxWidth:'400px', width:'92%',
              boxShadow:'0 30px 60px rgba(0,0,0,.22)', textAlign:'center', animation:'slideModal .3s cubic-bezier(.34,1.56,.64,1)',
            }}>
              <div style={{ width:'64px', height:'64px', borderRadius:'16px', background:'#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}>
                <Trash2 size={28} color="#DC2626" />
              </div>
              <h3 style={{ fontSize:'20px', fontWeight:'800', color: textPrimary, margin:'0 0 10px' }}>Delete Reward?</h3>
              <p style={{ fontSize:'14px', color: textSecondary, margin:'0 0 26px', lineHeight:'1.6' }}>
                Are you sure you want to delete <strong style={{ color: textPrimary }}>"{selectedReward.rewardName}"</strong>? This cannot be undone.
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <button onClick={() => setDeleteModalOpen(false)} disabled={submitting} style={{
                  padding:'12px', border:`1.5px solid ${border}`, background: surface2, borderRadius:'10px',
                  fontSize:'14px', fontWeight:'700', color: textSecondary, cursor:'pointer', transition:'all .18s ease',
                }}>
                  Cancel
                </button>
                <button onClick={handleDeleteReward} disabled={submitting} style={{
                  padding:'12px', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:'700',
                  background: submitting ? '#FCA5A5' : 'linear-gradient(135deg,#EF4444,#DC2626)', color:'#fff',
                  cursor: submitting ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                  transition:'all .18s ease',
                }}>
                  {submitting && <Loader size={14} style={{ animation:'spin 1s linear infinite' }} />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Rewards;
