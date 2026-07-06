import { useState, useEffect, useMemo, useRef } from 'react';
import React from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/store';
import { useTheme } from '../../context/ThemeContext';
import { Layout } from '../../components/Layout';
import { Toast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import {
  Layers, Plus, Users, UserCheck, UserPlus, Clock, Calendar, ChevronRight, AlertTriangle, Loader, UserPen,
} from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

const formatTime12h = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

const Sk = ({ w, h, r = 8 }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: '#EEF2F7', animation: 'skPulse 1.6s ease-in-out infinite', flexShrink: 0 }} />
);

const NameGroup = ({ label, dotColor, names }) => (
  names.length > 0 ? (
    <div>
      <div style={{ fontSize: '10px', fontWeight: '800', color: dotColor, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '5px' }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {names.map((n, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
            {n}
          </span>
        ))}
      </div>
    </div>
  ) : null
);

// Renders via a portal so it can float above the scrollable batch list without being clipped.
const BatchRosterTooltip = ({ anchorRect, playerNames, coachNames, dark }) => {
  if (!anchorRect) return null;
  const tooltipBg = dark ? '#181433' : '#111827';
  const width = 220;
  const gap = 12;
  const showOnRight = anchorRect.right + gap + width <= window.innerWidth;
  const left = showOnRight ? anchorRect.right + gap : Math.max(8, anchorRect.left - gap - width);
  const top = Math.min(anchorRect.top, window.innerHeight - 220);

  return createPortal(
    <div style={{
      position: 'fixed', top: `${Math.max(8, top)}px`, left: `${left}px`, width: `${width}px`,
      background: tooltipBg, color: '#fff', padding: '14px 16px', borderRadius: '12px',
      fontSize: '12px', fontWeight: '600', boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
      zIndex: 1000, border: '1px solid rgba(255,255,255,0.08)', pointerEvents: 'none',
      display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      <NameGroup label="Players" dotColor="#818CF8" names={playerNames} />
      <NameGroup label="Coaches" dotColor="#34D399" names={coachNames} />
      {playerNames.length === 0 && coachNames.length === 0 && (
        <span style={{ opacity: 0.7 }}>No one assigned yet</span>
      )}
    </div>,
    document.body
  );
};

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

/**
 * The batch list - a plain directory now. Everything about ONE batch (roster,
 * coach, sessions, attendance, settings) lives at /admin/batches/:batchId
 * (BatchDetail.jsx). See change.md Phase 2.
 */
export default function ManageBatches() {
  const navigate = useNavigate();
  const { players, fetchPlayers, coaches, fetchCoaches, learningPathway, fetchLearningPathway, userToken } = useStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [hoveredBatchId, setHoveredBatchId] = useState('');
  const [hoverAnchorRect, setHoverAnchorRect] = useState(null);

  // Create batch modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchForm, setBatchForm] = useState({ batchName: '', playerIds: [], days: [], startTime: '', endTime: '', LearningPathway: '' });
  const [batchSaving, setBatchSaving] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');
  const [mismatchConfirm, setMismatchConfirm] = useState(null); // [{name, pathway}] | null

  const fetchedRef = useRef(false);

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    userToken,
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
        await Promise.all([fetchPlayers(), fetchCoaches(), fetchLearningPathway(), loadBatches()]);
      } catch {
        showToast('Failed to load batches', 'error');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const batchPlayerNames = (batch) => {
    const list = batch.players?.length ? batch.players : (batch.playerIds || []).map(id => ({ playerId: id }));
    return list.map(p => {
      if (p.playerName || p.name) return p.playerName || p.name;
      const fromStore = players.find(pl => String(pl.playerId) === String(p.playerId));
      return fromStore?.playerName || fromStore?.name || 'Unknown';
    });
  };

  const batchCoachNames = (batch) => {
    if (batch.coaches?.length) return batch.coaches.map(c => c.name || 'Coach');
    return (batch.coachIds || []).map(id => {
      const fromStore = coaches.find(c => String(c.coachId || c._id) === String(id));
      return fromStore?.name || 'Coach';
    });
  };

  /* ── Create batch modal ── */
  const openCreateModal = () => {
    setBatchForm({ batchName: '', playerIds: [], days: [], startTime: '', endTime: '', LearningPathway: '' });
    setPlayerSearch('');
    setShowBatchModal(true);
  };

  const closeBatchModal = () => {
    setShowBatchModal(false);
    setBatchForm({ batchName: '', playerIds: [], days: [], startTime: '', endTime: '', LearningPathway: '' });
    setPlayerSearch('');
  };

  const toggleDay = (day) => {
    setBatchForm(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day],
    }));
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

  // Selected players whose OWN Learning Pathway differs from the batch's pathway.
  // (Only meaningful when the batch has a pathway set; an empty batch pathway means
  // "each player uses their own", so there's nothing to mismatch.)
  const selectedMismatches = useMemo(() => {
    if (!batchForm.LearningPathway) return [];
    return players
      .filter(p => batchForm.playerIds.includes(String(p.playerId)))
      .filter(p => p.LearningPathway && p.LearningPathway !== batchForm.LearningPathway)
      .map(p => ({ playerId: p.playerId, name: p.playerName || p.name, pathway: p.LearningPathway }));
  }, [players, batchForm.playerIds, batchForm.LearningPathway]);

  const handleBatchSubmit = (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!batchForm.batchName.trim() || batchForm.playerIds.length === 0) {
      showToast('Batch name and at least one player required', 'error'); return;
    }
    // Warn if any selected player's pathway doesn't match the batch's pathway.
    if (selectedMismatches.length > 0) {
      setMismatchConfirm(selectedMismatches);
      return;
    }
    doCreateBatch();
  };

  const doCreateBatch = async () => {
    setMismatchConfirm(null);
    setBatchSaving(true);
    try {
      await axios.post(CL_MANAGE_BATCH_URL, {
        action: 'create',
        batchName: batchForm.batchName.trim(),
        playerIds: batchForm.playerIds,
        days: batchForm.days,
        startTime: batchForm.startTime || null,
        endTime: batchForm.endTime || null,
        LearningPathway: batchForm.LearningPathway || null,
      }, { headers });
      await loadBatches();
      closeBatchModal();
      showToast('Batch created');
    } catch {
      showToast('Failed to create batch', 'error');
    } finally {
      setBatchSaving(false);
    }
  };

  const modalPlayers = useMemo(() => {
    const term = playerSearch.toLowerCase();
    return players.filter(p => (p.playerName || p.name || '').toLowerCase().includes(term));
  }, [players, playerSearch]);

  const uniquePathwayNames = useMemo(() => {
    const names = new Set();
    (learningPathway || []).forEach(s => { if (s.LearningPathway) names.add(s.LearningPathway); });
    return [...names].sort();
  }, [learningPathway]);

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
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: '0 0 3px', letterSpacing: '-.5px' }}>Batches</h1>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.6)', margin: 0, fontWeight: '500' }}>Click a batch for its full roster, sessions, attendance and settings</p>
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

        {/* Section label - separates the clickable batch cards from the stat tiles above */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0 14px' }}>
          <Layers size={16} color={BRAND} />
          <h2 style={{ fontSize: '15px', fontWeight: '800', color: dark ? 'var(--cl-text)' : '#0F172A', margin: 0 }}>Your Batches</h2>
          <span style={{ fontSize: '11px', color: dark ? 'var(--cl-text-3)' : '#94A3B8', fontWeight: '600' }}>· click any to manage</span>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '18px' }}>
            {[1, 2, 3].map(i => <Sk key={i} w="100%" h="150px" r={18} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '18px', marginBottom: '32px' }}>
            {batches.length > 0 ? batches.map(batch => {
              const [c1, c2] = pal(batch.batchName);
              return (
                <div
                  key={batch.batchId}
                  onClick={() => navigate(`/admin/batches/${batch.batchId}`)}
                  onMouseEnter={e => {
                    setHoveredBatchId(batch.batchId);
                    setHoverAnchorRect(e.currentTarget.getBoundingClientRect());
                    e.currentTarget.style.boxShadow = `0 14px 32px ${c1}40`;
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    const foot = e.currentTarget.querySelector('[data-foot]');
                    if (foot) foot.style.gap = '8px';
                  }}
                  onMouseLeave={e => {
                    setHoveredBatchId('');
                    setHoverAnchorRect(null);
                    e.currentTarget.style.boxShadow = `0 4px 14px ${c1}1f`;
                    e.currentTarget.style.transform = 'translateY(0)';
                    const foot = e.currentTarget.querySelector('[data-foot]');
                    if (foot) foot.style.gap = '5px';
                  }}
                  style={{
                    background: dark ? 'var(--cl-surface)' : '#fff',
                    border: `1px solid ${dark ? 'var(--cl-border)' : '#EEF2F7'}`,
                    borderRadius: '18px', cursor: 'pointer', overflow: 'hidden',
                    boxShadow: `0 4px 14px ${c1}1f`, transition: 'all .22s ease',
                  }}
                >
                  {/* Gradient header band - this is what makes a batch look unlike a stat tile */}
                  <div style={{
                    background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
                    padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', top: '-30px', right: '-20px', width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                      background: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', fontWeight: '800', color: 'white',
                    }}>
                      {batch.batchName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                      <p style={{ fontSize: '15.5px', fontWeight: '800', margin: 0, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-.2px' }}>
                        {batch.batchName}
                      </p>
                      <p style={{ fontSize: '11.5px', margin: '2px 0 0', color: 'rgba(255,255,255,0.8)', display: 'flex', gap: '10px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Users size={11} /> {batch.players?.length ?? batch.playerIds?.length ?? 0} players</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><UserCheck size={11} /> {batch.coachIds?.length ?? 0} coach{(batch.coachIds?.length ?? 0) === 1 ? '' : 'es'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '14px 18px 16px' }}>
                    {/* Player name bubbles (the hover roster still shows the full list) */}
                    {(() => {
                      const names = batchPlayerNames(batch);
                      if (names.length === 0) return null;
                      const shown = names.slice(0, 4);
                      const extra = names.length - shown.length;
                      return (
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '12px' }}>
                          {shown.map((n, i) => (
                            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '600', color: dark ? 'var(--cl-text-2)' : '#334155', background: dark ? 'rgba(255,255,255,0.06)' : '#F8FAFC', border: `1px solid ${c1}22`, padding: '3px 9px 3px 4px', borderRadius: '999px', maxWidth: '100%' }}>
                              <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: `linear-gradient(135deg, ${c1}, ${c2})`, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '800', flexShrink: 0 }}>
                                {(n || '?').charAt(0).toUpperCase()}
                              </span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</span>
                            </span>
                          ))}
                          {extra > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: '700', color: c1, background: `${c1}14`, padding: '3px 10px', borderRadius: '999px' }}>
                              +{extra}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', minHeight: '22px' }}>
                      {batch.LearningPathway && (
                        <span style={{ fontSize: '10.5px', color: c1, display: 'inline-flex', alignItems: 'center', gap: '3px', background: `${c1}14`, padding: '3px 9px', borderRadius: '20px', fontWeight: '700' }}>
                          <Layers size={10} /> {batch.LearningPathway}
                        </span>
                      )}
                      {batch.days?.length > 0 && (
                        <span style={{ fontSize: '10.5px', color: dark ? 'var(--cl-text-2)' : '#475569', display: 'inline-flex', alignItems: 'center', gap: '3px', background: dark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', padding: '3px 9px', borderRadius: '20px', fontWeight: '600' }}>
                          <Calendar size={10} /> {batch.days.join(' · ')}
                        </span>
                      )}
                      {batch.startTime && (
                        <span style={{ fontSize: '10.5px', color: dark ? 'var(--cl-text-2)' : '#475569', display: 'inline-flex', alignItems: 'center', gap: '3px', background: dark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', padding: '3px 9px', borderRadius: '20px', fontWeight: '600' }}>
                          <Clock size={10} /> {formatTime12h(batch.startTime)}{batch.endTime ? `–${formatTime12h(batch.endTime)}` : ''}
                        </span>
                      )}
                      {!batch.LearningPathway && !batch.days?.length && !batch.startTime && (
                        <span style={{ fontSize: '11px', color: dark ? 'var(--cl-text-3)' : '#94A3B8' }}>No schedule set</span>
                      )}
                    </div>
                    <div data-foot style={{ marginTop: '14px', paddingTop: '12px', borderTop: `1px solid ${dark ? 'var(--cl-border)' : '#F1F5F9'}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', color: c1, fontSize: '12.5px', fontWeight: '800', transition: 'gap .2s ease' }}>
                      Open batch <ChevronRight size={15} />
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center', background: dark ? 'var(--cl-surface)' : '#fff', border: `1.5px solid ${dark ? 'var(--cl-border)' : '#E2E8F0'}`, borderRadius: '16px' }}>
                <Layers size={32} style={{ color: '#7C3AED', opacity: 0.5, marginBottom: '8px' }} />
                <p style={{ fontSize: '14px', color: dark ? 'var(--cl-text-2)' : '#111827', fontWeight: '600', margin: '0 0 4px 0' }}>No batches yet</p>
                <p style={{ fontSize: '12px', color: dark ? 'var(--cl-text-3)' : '#6B7280', margin: 0 }}>Create one to get started</p>
              </div>
            )}
          </div>
        )}

        {hoveredBatchId && (() => {
          const hoveredBatch = batches.find(b => b.batchId === hoveredBatchId);
          if (!hoveredBatch) return null;
          return (
            <BatchRosterTooltip
              anchorRect={hoverAnchorRect}
              playerNames={batchPlayerNames(hoveredBatch)}
              coachNames={batchCoachNames(hoveredBatch)}
              dark={dark}
            />
          );
        })()}
      </div>

      {/* Create batch modal */}
      <Modal isOpen={showBatchModal} onClose={closeBatchModal} title="Create Batch">
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

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '8px', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} color={BRAND} /> Learning Pathway
            </label>
            <select
              value={batchForm.LearningPathway}
              onChange={(e) => setBatchForm(prev => ({ ...prev, LearningPathway: e.target.value }))}
              style={{ width: '100%', padding: '11px 14px', border: '2px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: 'white', cursor: 'pointer' }}
            >
              <option value="">No pathway set (players use their own profile pathway)</option>
              {uniquePathwayNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Schedule: days */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '10px', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color={BRAND} /> Session Days
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {DAYS.map(day => {
                const active = batchForm.days.includes(day);
                return (
                  <button key={day} type="button" onClick={() => toggleDay(day)} style={{
                    padding: '6px 14px', borderRadius: '20px', border: `1.5px solid ${active ? BRAND : '#E5E7EB'}`,
                    background: active ? BRAND : '#fff', color: active ? '#fff' : '#374151',
                    fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', transition: 'all .15s',
                  }}>
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule: time range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'flex', fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '8px', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} color={BRAND} /> Start Time
              </label>
              <input type="time" step={900} value={batchForm.startTime}
                onChange={e => setBatchForm(prev => ({ ...prev, startTime: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '2px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer' }}
                onFocus={e => e.target.style.borderColor = BRAND}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>
            <div>
              <label style={{ display: 'flex', fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '8px', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} color="#10B981" /> End Time
              </label>
              <input type="time" step={900} value={batchForm.endTime}
                onChange={e => setBatchForm(prev => ({ ...prev, endTime: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '2px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer' }}
                onFocus={e => e.target.style.borderColor = '#10B981'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>
          </div>

          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>
              Players <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>{batchForm.playerIds.length} selected</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', marginBottom: '10px' }}>
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
              const mismatch = batchForm.LearningPathway && p.LearningPathway && p.LearningPathway !== batchForm.LearningPathway;
              return (
                <label key={p.playerId} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                  borderBottom: '1px solid #F3F4F6', cursor: 'pointer',
                  background: checked ? '#EEF2FF' : 'white'
                }}>
                  <input type="checkbox" checked={checked} onChange={() => togglePlayer(p.playerId)} />
                  <span style={{ fontSize: '14px', color: '#111827', flex: 1 }}>{p.playerName || p.name}</span>
                  {mismatch && (
                    <span title={`This player's pathway is "${p.LearningPathway}", different from the batch pathway`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', fontWeight: '700', color: '#B45309', background: '#FEF3C7', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: '999px', flexShrink: 0 }}>
                      <AlertTriangle size={11} /> {p.LearningPathway}
                    </span>
                  )}
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
                background: `linear-gradient(135deg, ${BRAND} 0%, #000000ff 100%)`, color: 'white', border: 'none',
                cursor: batchSaving ? 'not-allowed' : 'pointer', fontSize: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: batchSaving ? 0.8 : 1
              }}>
              Create
            </button>
          </div>
        </form>
      </Modal>

      {/* Pathway mismatch warning: selected players whose own pathway differs from the batch's */}
      {mismatchConfirm && (
        <Modal isOpen={!!mismatchConfirm} onClose={() => setMismatchConfirm(null)} title="Pathway mismatch">
          <div style={{ width: 'min(92vw, 480px)', padding: '4px 4px 8px' }}>
            <div style={{ display: 'flex', gap: '12px', padding: '14px 16px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FECACA', marginBottom: '16px' }}>
              <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }} />
              <p style={{ fontSize: '13.5px', color: '#7F1D1D', margin: 0, lineHeight: 1.6 }}>
                {mismatchConfirm.length} selected player{mismatchConfirm.length === 1 ? '' : 's'} {mismatchConfirm.length === 1 ? 'has' : 'have'} a Learning Pathway that <strong>doesn't match</strong> this batch (<strong>{batchForm.LearningPathway}</strong>). Fix the player's pathway to match the batch before creating.
              </p>
            </div>
            <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #F3F4F6', borderRadius: '10px', marginBottom: '18px' }}>
              {mismatchConfirm.map((m, i) => (
                <div key={m.playerId || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '9px 12px', borderBottom: i === mismatchConfirm.length - 1 ? 'none' : '1px solid #F3F4F6' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '13.5px', fontWeight: '600', color: '#111827', margin: 0 }}>{m.name}</p>
                    <p style={{ fontSize: '11px', color: '#B45309', margin: '2px 0 0', fontWeight: '700' }}>{m.pathway}</p>
                  </div>
                  <button
                    onClick={() => navigate('/admin/players', { state: { editPlayerId: m.playerId } })}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', border: 'none', background: `linear-gradient(135deg, ${BRAND}, #000)`, color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <UserPen size={12} /> Fix pathway
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setMismatchConfirm(null)} style={{ width: '100%', padding: '11px 16px', borderRadius: '9px', fontWeight: '600', background: '#F3F4F6', color: '#111827', border: '1.5px solid #E5E7EB', cursor: 'pointer', fontSize: '14px' }}>Close</button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
