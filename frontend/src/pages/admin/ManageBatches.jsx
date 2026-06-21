import { useState, useEffect, useMemo, useRef } from 'react';
import React from 'react';
import axios from 'axios';
import { useStore } from '../../context/store';
import { useTheme } from '../../context/ThemeContext';
import { Layout } from '../../components/Layout';
import { Toast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import {
  Layers, Plus, Trash2, X, Users, UserCheck, ChevronLeft, Loader, Search, UserPlus
} from 'lucide-react';

const BRAND = '#060030ff';
const CL_GET_BATCHES_URL  = 'https://ts6wti3133.execute-api.ap-south-1.amazonaws.com/default/CL_Get_Batches';
const CL_MANAGE_BATCH_URL = 'https://rwl4dpqgu5.execute-api.ap-south-1.amazonaws.com/default/CL_Manage_Batch';

/* ── Design system helpers ── */
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
      transition: 'all .2s', cursor: 'default', flex: 1, minWidth: '140px',
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

export default function ManageBatches() {
  const { players, fetchPlayers, coaches, fetchCoaches, userToken } = useStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [toast, setToast] = useState(null);

  const [removingPlayerId, setRemovingPlayerId] = useState('');
  const [coachToAssign, setCoachToAssign] = useState('');
  const [assigningCoach, setAssigningCoach] = useState(false);
  const [removingCoachId, setRemovingCoachId] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Batch create/update modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchModalMode, setBatchModalMode] = useState('create');
  const [selectedManageBatchId, setSelectedManageBatchId] = useState('');
  const [batchForm, setBatchForm] = useState({ batchName: '', playerIds: [] });
  const [batchSaving, setBatchSaving] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');

  const fetchedRef = useRef(false);

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    userToken,
    usertoken: userToken,
  }), [userToken]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadBatches = async () => {
    const res = await axios.get(CL_GET_BATCHES_URL, { headers });
    let d = res.data;
    if (d?.body && typeof d.body === 'string') d = JSON.parse(d.body);
    setBatches(d.batches || []);
  };

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      setLoading(true);
      try {
        await Promise.all([fetchPlayers(), fetchCoaches(), loadBatches()]);
      } catch {
        showToast('Failed to load batches', 'error');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedBatch = batches.find(b => b.batchId === selectedBatchId) || null;

  const coachName = (coachId) => {
    const fromBatch = selectedBatch?.coaches?.find(c => String(c.coachId) === String(coachId));
    if (fromBatch?.name) return fromBatch.name;
    const fromStore = coaches.find(c => String(c.coachId || c._id) === String(coachId));
    return fromStore?.name || 'Coach';
  };

  const assignedCoachIds = (selectedBatch?.coachIds || []).map(String);
  const availableCoaches = coaches.filter(c => !assignedCoachIds.includes(String(c.coachId || c._id)));

  const refreshAfterChange = async () => {
    await Promise.all([loadBatches(), fetchPlayers(), fetchCoaches()]);
  };

  const handleRemovePlayer = async (playerId) => {
    if (!selectedBatchId) return;
    setRemovingPlayerId(playerId);
    try {
      const res = await axios.post(CL_MANAGE_BATCH_URL, {
        action: 'remove_player', batchId: selectedBatchId, playerId,
      }, { headers });
      let data = res?.data;
      if (data?.body && typeof data.body === 'string') {
        try { data = JSON.parse(data.body); } catch { /* ignore */ }
      }
      const batchDeleted = Boolean(data?.batchDeleted);
      if (batchDeleted) setSelectedBatchId('');
      await refreshAfterChange();
      showToast(batchDeleted ? 'Player removed. Empty batch auto-deleted.' : 'Player removed from batch');
    } catch {
      showToast('Failed to remove player', 'error');
    } finally {
      setRemovingPlayerId('');
    }
  };

  const handleAssignCoach = async () => {
    if (!selectedBatchId || !coachToAssign) { showToast('Select a coach first', 'error'); return; }
    setAssigningCoach(true);
    try {
      await axios.post(CL_MANAGE_BATCH_URL, {
        action: 'assign_coach', batchId: selectedBatchId, coachId: coachToAssign,
      }, { headers });
      setCoachToAssign('');
      await refreshAfterChange();
      showToast('Coach assigned to batch');
    } catch {
      showToast('Failed to assign coach', 'error');
    } finally {
      setAssigningCoach(false);
    }
  };

  const handleRemoveCoach = async (coachId) => {
    if (!selectedBatchId) return;
    setRemovingCoachId(coachId);
    try {
      await axios.post(CL_MANAGE_BATCH_URL, {
        action: 'remove_coach', batchId: selectedBatchId, coachId,
      }, { headers });
      await refreshAfterChange();
      showToast('Coach removed from batch');
    } catch {
      showToast('Failed to remove coach', 'error');
    } finally {
      setRemovingCoachId('');
    }
  };

  const handleDeleteBatch = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await axios.post(CL_MANAGE_BATCH_URL, { action: 'delete', batchId: deleteConfirm }, { headers });
      if (selectedBatchId === deleteConfirm) setSelectedBatchId('');
      setDeleteConfirm(null);
      await loadBatches();
      showToast('Batch deleted');
    } catch {
      showToast('Failed to delete batch', 'error');
    } finally {
      setDeleting(false);
    }
  };

  /* ── Batch create/update modal ── */
  const openCreateModal = () => {
    setBatchModalMode('create');
    setSelectedManageBatchId('');
    setBatchForm({ batchName: '', playerIds: [] });
    setPlayerSearch('');
    setShowBatchModal(true);
  };

  const openEditModal = (batch) => {
    setBatchModalMode('update');
    setSelectedManageBatchId(batch.batchId);
    setBatchForm({
      batchName: batch.batchName || '',
      playerIds: (batch.playerIds || []).map(String),
    });
    setPlayerSearch('');
    setShowBatchModal(true);
  };

  const closeBatchModal = () => {
    setShowBatchModal(false);
    setBatchForm({ batchName: '', playerIds: [] });
    setSelectedManageBatchId('');
    setPlayerSearch('');
  };

  const togglePlayer = (pid) => {
    const id = String(pid);
    setBatchForm(prev => ({
      ...prev,
      playerIds: prev.playerIds.includes(id)
        ? prev.playerIds.filter(x => x !== id)
        : [...prev.playerIds, id],
    }));
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    if (!batchForm.batchName.trim() || batchForm.playerIds.length === 0) {
      showToast('Batch name and at least one player required', 'error'); return;
    }
    setBatchSaving(true);
    try {
      if (batchModalMode === 'update') {
        await axios.post(CL_MANAGE_BATCH_URL, {
          action: 'update', batchId: selectedManageBatchId,
          batchName: batchForm.batchName.trim(), playerIds: batchForm.playerIds,
        }, { headers });
      } else {
        await axios.post(CL_MANAGE_BATCH_URL, {
          action: 'create', batchName: batchForm.batchName.trim(), playerIds: batchForm.playerIds,
        }, { headers });
      }
      await loadBatches();
      closeBatchModal();
      showToast(batchModalMode === 'update' ? 'Batch updated' : 'Batch created');
    } catch {
      showToast(batchModalMode === 'update' ? 'Failed to update batch' : 'Failed to create batch', 'error');
    } finally {
      setBatchSaving(false);
    }
  };

  const modalPlayers = useMemo(() => {
    const term = playerSearch.toLowerCase();
    return players.filter(p => (p.playerName || p.name || '').toLowerCase().includes(term));
  }, [players, playerSearch]);

  /* ── Summary stats ── */
  const totalPlayerCount = batches.reduce((s, b) => s + (b.players?.length ?? b.playerIds?.length ?? 0), 0);
  const withCoaches = batches.filter(b => (b.coachIds?.length ?? 0) >= 1).length;
  const noCoach = batches.filter(b => (b.coachIds?.length ?? 0) === 0).length;

  return (
    <Layout>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
        @keyframes skPulse { 0%,100%{opacity:.5}50%{opacity:1} }
      `}</style>
      {toast && <Toast type={toast.type} message={toast.message} duration={3000} onClose={() => setToast(null)} />}

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
          borderRadius: '20px', padding: '28px 32px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
          boxShadow: '0 12px 40px rgba(6,0,48,.3)', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,.12)',
              border: '1.5px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Layers size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: '0 0 3px', letterSpacing: '-.5px' }}>Manage Batches</h1>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.6)', margin: 0, fontWeight: '500' }}>Create batches, manage players, and assign coaches</p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px',
              background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            <Plus size={16} /> New Batch
          </button>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <SummaryCard label="Total Batches" value={batches.length} icon={Layers} accent="#6366F1" />
          <SummaryCard label="Total Players" value={totalPlayerCount} icon={Users} accent="#10B981" />
          <SummaryCard label="With Coaches" value={withCoaches} icon={UserCheck} accent="#F59E0B" />
          <SummaryCard label="No Coach Yet" value={noCoach} icon={UserPlus} accent="#EF4444" />
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px' }}>
            <Sk w="100%" h="400px" r={16} />
            <Sk w="100%" h="400px" r={16} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px', marginBottom: '32px' }}>
            {/* Batch list */}
            <div style={{ background: dark ? 'var(--cl-surface)' : '#fff', border: `1.5px solid ${dark ? 'var(--cl-border)' : '#E2E8F0'}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ padding: '18px 20px', borderBottom: `2px solid ${dark ? 'var(--cl-border)' : '#E5E7EB'}`, background: dark ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)' }}>
                <h2 style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 4px 0', color: dark ? 'var(--cl-text)' : '#111827' }}>Batches</h2>
                <p style={{ fontSize: '13px', color: dark ? 'var(--cl-text-3)' : '#6B7280', margin: 0 }}>{batches.length} batch{batches.length === 1 ? '' : 'es'}</p>
              </div>
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {batches.length > 0 ? batches.map(batch => (
                  <div
                    key={batch.batchId}
                    onClick={() => setSelectedBatchId(batch.batchId)}
                    style={{
                      padding: '14px 16px', borderBottom: `1px solid ${dark ? 'var(--cl-border)' : '#E5E7EB'}`, cursor: 'pointer',
                      background: selectedBatchId === batch.batchId
                        ? (dark ? 'rgba(99,102,241,0.15)' : 'linear-gradient(135deg, #E0E7FF 0%, #EDE9FE 100%)')
                        : (dark ? 'transparent' : '#FFFFFF'),
                      borderLeft: selectedBatchId === batch.batchId ? `4px solid ${pal(batch.batchName)[0]}` : '4px solid transparent',
                    }}
                  >
                    <p style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0', color: dark ? 'var(--cl-text)' : '#111827' }}>{batch.batchName}</p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: dark ? 'var(--cl-text-3)' : '#6B7280', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={13} /> {batch.players?.length ?? batch.playerIds?.length ?? 0}
                      </span>
                      <span style={{ fontSize: '12px', color: dark ? 'var(--cl-text-3)' : '#6B7280', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <UserCheck size={13} /> {batch.coachIds?.length ?? 0} coach{(batch.coachIds?.length ?? 0) === 1 ? '' : 'es'}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <Layers size={32} style={{ color: '#7C3AED', opacity: 0.5, marginBottom: '8px' }} />
                    <p style={{ fontSize: '14px', color: dark ? 'var(--cl-text-2)' : '#111827', fontWeight: '600', margin: '0 0 4px 0' }}>No batches yet</p>
                    <p style={{ fontSize: '12px', color: dark ? 'var(--cl-text-3)' : '#6B7280', margin: 0 }}>Create one to get started</p>
                  </div>
                )}
              </div>
            </div>

            {/* Batch detail */}
            {selectedBatch ? (
              <div style={{ background: dark ? 'var(--cl-surface)' : '#fff', border: `1.5px solid ${dark ? 'var(--cl-border)' : '#E2E8F0'}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{
                  padding: '20px 24px', background: `linear-gradient(135deg, ${BRAND} 0%, #000000 100%)`, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap'
                }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 4px 0' }}>{selectedBatch.batchName}</h2>
                    <p style={{ fontSize: '13px', opacity: 0.9, margin: 0 }}>
                      {selectedBatch.players?.length ?? 0} players · {selectedBatch.coachIds?.length ?? 0} coaches
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => openEditModal(selectedBatch)}
                      style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(selectedBatch.batchId)}
                      style={{ padding: '8px 14px', background: 'rgba(239,68,68,0.9)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>

                {/* Coaches section */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#111827', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserCheck size={16} color={BRAND} /> Assigned Coaches
                  </h3>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    {assignedCoachIds.length > 0 ? assignedCoachIds.map(cid => (
                      <span key={cid} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '6px 8px 6px 14px', borderRadius: '999px',
                        background: '#EEF2FF', color: BRAND, fontSize: '13px', fontWeight: '600', border: '1px solid #C7D2FE'
                      }}>
                        {coachName(cid)}
                        <button
                          onClick={() => handleRemoveCoach(cid)}
                          disabled={removingCoachId === cid}
                          title="Remove coach"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '20px', height: '20px', borderRadius: '50%', border: 'none',
                            background: '#C7D2FE', color: BRAND, cursor: 'pointer'
                          }}
                        >
                          {removingCoachId === cid ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={12} />}
                        </button>
                      </span>
                    )) : (
                      <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>No coaches assigned yet</p>
                    )}
                  </div>

                  {/* Assign coach row */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                      <select
                        value={coachToAssign}
                        onChange={(e) => setCoachToAssign(e.target.value)}
                        style={{
                          width: '100%', padding: '10px 12px', borderRadius: '8px',
                          border: '2px solid #E5E7EB', fontSize: '14px', background: 'white', cursor: 'pointer'
                        }}
                      >
                        <option value="">Select a coach to assign…</option>
                        {availableCoaches.map(c => (
                          <option key={c.coachId || c._id} value={c.coachId || c._id}>
                            {c.name}{c.specialization ? ` (${c.specialization})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleAssignCoach}
                      disabled={!coachToAssign || assigningCoach}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
                        background: (!coachToAssign || assigningCoach) ? '#E5E7EB' : `linear-gradient(135deg, ${BRAND} 0%, #000000 100%)`,
                        color: (!coachToAssign || assigningCoach) ? '#9CA3AF' : 'white',
                        border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600',
                        cursor: (!coachToAssign || assigningCoach) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {assigningCoach ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={16} />}
                      Assign
                    </button>
                  </div>
                </div>

                {/* Players section */}
                <div style={{ padding: '20px 24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#111827', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} color={BRAND} /> Players ({selectedBatch.players?.length ?? 0})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
                    {(selectedBatch.players || []).map(p => (
                      <div key={p.playerId} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 12px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '10px'
                      }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '50%',
                          background: pal(p.playerName)[0],
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '13px', flexShrink: 0
                        }}>
                          {(p.playerName || '?').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.playerName}
                        </span>
                        <button
                          onClick={() => handleRemovePlayer(p.playerId)}
                          disabled={removingPlayerId === p.playerId}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px',
                            background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA',
                            borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', flexShrink: 0
                          }}
                        >
                          {removingPlayerId === p.playerId
                            ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
                            : <><X size={13} /> Remove</>}
                        </button>
                      </div>
                    ))}
                    {(selectedBatch.players?.length ?? 0) === 0 && (
                      <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>No players in this batch.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: dark ? 'var(--cl-surface)' : '#fff', border: `1.5px solid ${dark ? 'var(--cl-border)' : '#E2E8F0'}`, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
                <div style={{ textAlign: 'center', color: dark ? 'var(--cl-text-3)' : '#9CA3AF' }}>
                  <Layers size={36} color='#60A5FA' opacity={0.6} style={{ marginBottom: '16px' }} />
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: dark ? 'var(--cl-text-2)' : '#111827', margin: '0 0 8px 0' }}>No Batch Selected</h3>
                  <p style={{ fontSize: '14px', color: dark ? 'var(--cl-text-3)' : '#6B7280', margin: 0 }}>Select a batch to manage its players and coaches</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create / Update batch modal */}
      <Modal isOpen={showBatchModal} onClose={closeBatchModal} title={batchModalMode === 'update' ? 'Update Batch' : 'Create Batch'}>
        <form onSubmit={handleBatchSubmit} style={{ padding: '20px', width: 'min(92vw, 520px)' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
              Batch Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={batchForm.batchName}
              onChange={(e) => setBatchForm(prev => ({ ...prev, batchName: e.target.value }))}
              placeholder="e.g., Junior AI champs (Tue & Sat 9-10am)"
              style={{ width: '100%', padding: '11px 14px', border: '2px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              onFocus={(e) => e.target.style.borderColor = BRAND}
              onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>

          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>
              Players <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>{batchForm.playerIds.length} selected</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', marginBottom: '10px' }}>
            <Search size={16} color="#9CA3AF" />
            <input
              type="text"
              placeholder="Search players…"
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: '13px' }}
            />
          </div>
          <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
            {modalPlayers.map(p => {
              const checked = batchForm.playerIds.includes(String(p.playerId));
              return (
                <label key={p.playerId} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                  borderBottom: '1px solid #F3F4F6', cursor: 'pointer',
                  background: checked ? '#EEF2FF' : 'white'
                }}>
                  <input type="checkbox" checked={checked} onChange={() => togglePlayer(p.playerId)} />
                  <span style={{ fontSize: '14px', color: '#111827' }}>{p.playerName || p.name}</span>
                </label>
              );
            })}
            {modalPlayers.length === 0 && (
              <p style={{ fontSize: '13px', color: '#9CA3AF', padding: '16px', textAlign: 'center', margin: 0 }}>No players found</p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
            <button type="button" onClick={closeBatchModal} disabled={batchSaving}
              style={{ padding: '12px 16px', borderRadius: '8px', fontWeight: '600', background: '#F3F4F6', color: '#111827', border: '2px solid #E5E7EB', cursor: 'pointer', fontSize: '14px' }}>
              Cancel
            </button>
            <button type="submit" disabled={batchSaving}
              style={{
                padding: '12px 16px', borderRadius: '8px', fontWeight: '600',
                background: `linear-gradient(135deg, ${BRAND} 0%, #000000 100%)`, color: 'white', border: 'none',
                cursor: batchSaving ? 'not-allowed' : 'pointer', fontSize: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: batchSaving ? 0.8 : 1
              }}>
              {batchSaving && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {batchModalMode === 'update' ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Batch">
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={28} color="#EF4444" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>Delete this batch?</h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>This action cannot be undone.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                style={{ padding: '10px 16px', borderRadius: '8px', fontWeight: '500', backgroundColor: '#f3f4f6', color: '#111827', border: '1px solid #e5e7eb', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleDeleteBatch} disabled={deleting}
                style={{ padding: '10px 16px', borderRadius: '8px', fontWeight: '500', backgroundColor: '#EF4444', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                {deleting && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
