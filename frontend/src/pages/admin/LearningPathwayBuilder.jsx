import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { SkeletonContainer } from '../../components/SkeletonLoader';
import { BookOpen, AlertCircle, Plus, Trash, SquarePen, Eye, Loader } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';

const PATHWAY_API_URL = 'https://nvouj7m5fb.execute-api.ap-south-1.amazonaws.com/default/CL_Get_LearningPathway';
const DELETE_PATHWAY_API_URL = 'https://w5qtdpsr58.execute-api.ap-south-1.amazonaws.com/default/CL_Delete_Learningpathway';

const getStageColor = (session) => {
  const n = parseInt(session) || 0;
  if (n <= 24) return { bg: 'rgba(99,102,241,0.15)', text: '#818CF8', label: 'Foundation' };
  if (n <= 72) return { bg: 'rgba(245,158,11,0.15)', text: '#FBBF24', label: 'Intermediate' };
  return { bg: 'rgba(52,211,153,0.15)', text: '#34D399', label: 'Advanced' };
};

const LearningPathwayBuilder = () => {
  const { userToken } = useStore();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [pathways, setPathways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPathwayName, setSelectedPathwayName] = useState(() => sessionStorage.getItem('lpb_selected') || null);

  const selectPathway = (name) => {
    setSelectedPathwayName(name);
    sessionStorage.setItem('lpb_selected', name);
  };
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pathwayToDelete, setPathwayToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [renameModal, setRenameModal] = useState({ isOpen: false, stageName: '', newName: '', isLoading: false });

  useEffect(() => {
    fetchPathways();
  }, [userToken]);

  const fetchPathways = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { 'Content-Type': 'application/json', ...(userToken && { userToken }) };
      const response = await axios.get(PATHWAY_API_URL, { headers });
      const data = response.data || {};
      let sessions = [];
      if (Array.isArray(data)) sessions = data;
      else if (data.sessions) sessions = data.sessions;
      else if (data.data) sessions = data.data;
      else if (data.pathways) sessions = data.pathways;
      else if (data.body && typeof data.body === 'string') {
        try { const p = JSON.parse(data.body); sessions = Array.isArray(p) ? p : p.sessions || p.data || []; } catch { sessions = []; }
      }
      setPathways(sessions);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch pathways');
      setPathways([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!pathwayToDelete) return;
    const pathwayId = pathwayToDelete.mongoId || pathwayToDelete._id || pathwayToDelete.id;
    if (!pathwayId) { setError('Unable to delete: Missing session ID.'); return; }
    setDeleting(true);
    setError('');
    try {
      const headers = { 'Content-Type': 'application/json', ...(userToken && { userToken }) };
      const payload = { id: pathwayId, session: pathwayToDelete.session, Topic: pathwayToDelete.Topic, LearningPathway: pathwayToDelete.LearningPathway };
      const response = await axios.post(DELETE_PATHWAY_API_URL, payload, { headers });
      if (response.data && (response.data.statusCode === 200 || response.data.statusCode === 204 || response.status === 200)) {
        setDeleteConfirmOpen(false);
        setPathwayToDelete(null);
        await fetchPathways();
      } else {
        setError(response.data?.message || 'Failed to delete pathway');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete pathway');
    } finally {
      setDeleting(false);
    }
  };

  const handleRenamePathway = async () => {
    const trimmed = renameModal.newName.trim();
    if (!trimmed || trimmed.toLowerCase() === renameModal.stageName.toLowerCase()) return;
    setRenameModal(prev => ({ ...prev, isLoading: true }));
    try {
      const headers = { 'Content-Type': 'application/json', ...(userToken && { userToken }) };
      const response = await axios.post(
        'https://uqiws6r1v3.execute-api.ap-south-1.amazonaws.com/default/CL_Rename_LearningPathway',
        { oldName: renameModal.stageName, newName: trimmed },
        { headers }
      );
      if (response.status === 200 || response.data?.statusCode === 200) {
        const updatedName = trimmed;
        setRenameModal({ isOpen: false, stageName: '', newName: '', isLoading: false });
        selectPathway(updatedName);
        await fetchPathways();
      } else {
        setError(response.data?.message || 'Failed to rename pathway');
        setRenameModal(prev => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to rename pathway');
      setRenameModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const groupedPathwaysArray = useMemo(() => {
    const filtered = pathways
      .filter(p => {
        if (!searchTerm) return true;
        const s = searchTerm.toLowerCase();
        return p.Topic?.toLowerCase().includes(s) || p.LearningPathway?.toLowerCase().includes(s) || p.Objective?.toLowerCase().includes(s) || p.activities?.some(a => a.activityTitle?.toLowerCase().includes(s));
      })
      .sort((a, b) => (parseInt(a.session) || 0) - (parseInt(b.session) || 0));

    const groups = {};
    filtered.forEach(p => {
      const key = p.LearningPathway || 'Uncategorized';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return Object.keys(groups).map(stage => ({ stage, pathways: groups[stage] }));
  }, [pathways, searchTerm]);

  useEffect(() => {
    if (groupedPathwaysArray.length > 0) {
      if (!selectedPathwayName || !groupedPathwaysArray.find(g => g.stage === selectedPathwayName)) {
        setSelectedPathwayName(groupedPathwaysArray[0].stage);
      }
    }
  }, [groupedPathwaysArray]);

  const selectedGroup = groupedPathwaysArray.find(g => g.stage === selectedPathwayName);
  const stats = useMemo(() => ({
    total: pathways.length,
    stages: new Set(pathways.map(p => p.LearningPathway || 'Uncategorized')).size,
    totalPoints: pathways.reduce((sum, p) => sum + (p.totalPoints || 0), 0)
  }), [pathways]);

  const surface = dark ? 'var(--cl-surface)' : '#fff';
  const border = dark ? 'var(--cl-border)' : '#E5E7EB';
  const textPrimary = dark ? 'var(--cl-text)' : '#111827';
  const textSecondary = dark ? 'var(--cl-text-2)' : '#64748B';
  const textMuted = dark ? 'var(--cl-text-3)' : '#94A3B8';
  const surface2 = dark ? 'var(--cl-surface-2)' : '#F8FAFC';

  return (
    <Layout>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
          borderRadius: '16px', padding: '22px 28px', marginBottom: '16px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
          boxShadow: '0 8px 32px rgba(6,0,48,.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,.12)', border: '1.5px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', margin: '0 0 2px', letterSpacing: '-.4px' }}>Learning Pathways</h1>
              <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,.6)', margin: 0, fontWeight: '500' }}>
                {loading ? '...' : `${stats.total} sessions · ${stats.stages} pathways · ${stats.totalPoints.toLocaleString()} pts`}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/learning-pathway/add')}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '10px 18px', borderRadius: '10px',
              background: 'rgba(255,255,255,.14)', backdropFilter: 'blur(8px)',
              border: '1.5px solid rgba(255,255,255,.28)',
              color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
              transition: 'all .2s ease', flexShrink: 0
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.24)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.14)'; e.currentTarget.style.transform = 'none'; }}
          >
            <Plus size={15} /> Add Session
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: dark ? '#F87171' : '#991B1B', padding: '12px 14px',
            borderRadius: '10px', fontSize: '13px', marginBottom: '12px', flexShrink: 0
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        )}

        {/* ── Main two-panel layout ── */}
        {loading ? (
          <SkeletonContainer>
            <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0 }}>
              <div style={{ width: '220px', flexShrink: 0, borderRadius: '14px', background: surface, border: `1px solid ${border}`, padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ height: '56px', borderRadius: '10px', background: surface2, animation: 'pulse 1.5s ease infinite', animationDelay: `${i*0.1}s` }} />
                ))}
              </div>
              <div style={{ flex: 1, borderRadius: '14px', background: surface, border: `1px solid ${border}`, padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ height: '72px', borderRadius: '10px', background: surface2, animation: 'pulse 1.5s ease infinite', animationDelay: `${i*0.1}s` }} />
                ))}
              </div>
            </div>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
          </SkeletonContainer>
        ) : (
          <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0 }}>

            {/* ── LEFT: Pathway list ── */}
            <div style={{
              width: '220px', flexShrink: 0,
              background: surface, border: `1px solid ${border}`,
              borderRadius: '14px', display: 'flex', flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {/* Search */}
              <div style={{ padding: '12px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ width: '100%', border: `1px solid ${border}`, outline: 'none', fontSize: '13px', background: surface2, color: textPrimary, borderRadius: '8px', padding: '7px 10px', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)'; }}
                  onBlur={e => { e.target.style.borderColor = border; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Pathway items */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                {groupedPathwaysArray.length === 0 ? (
                  <p style={{ fontSize: '12px', color: textMuted, textAlign: 'center', padding: '20px 8px' }}>No pathways found</p>
                ) : (
                  groupedPathwaysArray.map(group => {
                    const isActive = group.stage === selectedPathwayName;
                    return (
                      <button
                        key={group.stage}
                        onClick={() => selectPathway(group.stage)}
                        style={{
                          width: '100%', textAlign: 'left',
                          padding: '10px 12px', borderRadius: '10px', marginBottom: '4px',
                          background: isActive ? 'linear-gradient(135deg, #060030 0%, #3b0080 100%)' : 'transparent',
                          border: isActive ? '1px solid rgba(255,255,255,0.1)' : `1px solid transparent`,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: '8px', transition: 'all .18s ease'
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.05)' : '#F1F5F9'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <BookOpen size={14} color={isActive ? 'rgba(255,255,255,0.7)' : textMuted} style={{ flexShrink: 0 }} />
                          <span style={{
                            fontSize: '12.5px', fontWeight: isActive ? '700' : '500',
                            color: isActive ? '#fff' : textPrimary,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }}>
                            {group.stage}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <span style={{
                            fontSize: '11px', fontWeight: '700',
                            color: isActive ? 'rgba(255,255,255,0.9)' : (dark ? '#818CF8' : '#4F46E5'),
                            background: isActive ? 'rgba(255,255,255,0.15)' : (dark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)'),
                            padding: '2px 7px', borderRadius: '20px'
                          }}>
                            {group.pathways.length}
                          </span>
                          {isActive && (
                            <button
                              onClick={e => { e.stopPropagation(); setRenameModal({ isOpen: true, stageName: group.stage, newName: group.stage, isLoading: false }); }}
                              title="Rename"
                              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '5px', padding: '2px 4px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.8)' }}
                            >
                              <SquarePen size={11} />
                            </button>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Stats footer */}
              <div style={{ padding: '10px 14px', borderTop: `1px solid ${border}`, flexShrink: 0, display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '15px', fontWeight: '800', color: textPrimary, margin: 0 }}>{stats.stages}</p>
                  <p style={{ fontSize: '10px', color: textMuted, margin: 0, textTransform: 'uppercase', letterSpacing: '.5px' }}>Paths</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '15px', fontWeight: '800', color: textPrimary, margin: 0 }}>{stats.total}</p>
                  <p style={{ fontSize: '10px', color: textMuted, margin: 0, textTransform: 'uppercase', letterSpacing: '.5px' }}>Sessions</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '15px', fontWeight: '800', color: textPrimary, margin: 0 }}>{(stats.totalPoints / 1000).toFixed(1)}k</p>
                  <p style={{ fontSize: '10px', color: textMuted, margin: 0, textTransform: 'uppercase', letterSpacing: '.5px' }}>Points</p>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Sessions list ── */}
            <div style={{
              flex: 1, minWidth: 0,
              background: surface, border: `1px solid ${border}`,
              borderRadius: '14px', display: 'flex', flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {/* Panel header */}
              {selectedGroup ? (
                <>
                  <div style={{
                    padding: '14px 20px', borderBottom: `1px solid ${border}`, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #060030, #3b0080)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <BookOpen size={16} color="#fff" />
                      </div>
                      <div>
                        <h2 style={{ fontSize: '15px', fontWeight: '700', color: textPrimary, margin: 0 }}>{selectedGroup.stage}</h2>
                        <p style={{ fontSize: '11.5px', color: textMuted, margin: 0 }}>{selectedGroup.pathways.length} sessions</p>
                      </div>
                    </div>
                  </div>

                  {/* Session rows - scrollable */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedGroup.pathways.map((pathway, idx) => {
                      const stage = getStageColor(pathway.session);
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '14px',
                            padding: '12px 14px', borderRadius: '10px',
                            border: `1px solid ${border}`,
                            background: dark ? 'rgba(255,255,255,0.025)' : '#FAFBFC',
                            transition: 'all .18s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'; e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.12)' : '#D1D5DB'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.025)' : '#FAFBFC'; e.currentTarget.style.borderColor = border; }}
                        >
                          {/* Session number badge */}
                          <div style={{
                            width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0,
                            background: stage.bg, border: `1.5px solid ${stage.text}30`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <span style={{ fontSize: '16px', fontWeight: '800', color: stage.text, lineHeight: 1 }}>{pathway.session}</span>
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '13.5px', fontWeight: '700', color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {pathway.Topic}
                              </span>
                              <span style={{ fontSize: '10px', fontWeight: '600', color: stage.text, background: stage.bg, padding: '1px 7px', borderRadius: '20px', flexShrink: 0 }}>
                                {stage.label}
                              </span>
                            </div>
                            <p style={{ fontSize: '11.5px', color: textSecondary, margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {pathway.Objective || '-'}
                            </p>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '11px', color: textMuted, fontWeight: '500' }}>
                                <span style={{ fontWeight: '700', color: textSecondary }}>{pathway.activities?.length || 0}</span> activities
                              </span>
                              <span style={{ fontSize: '11px', color: textMuted, fontWeight: '500' }}>
                                <span style={{ fontWeight: '700', color: textSecondary }}>{pathway.totalPoints || 0}</span> pts
                              </span>
                              {pathway.SessionType && (
                                <span style={{ fontSize: '11px', color: textMuted }}>{pathway.SessionType}</span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            <button
                              onClick={() => navigate(`/admin/learning-pathway/${encodeURIComponent(pathway.mongoId || pathway._id || `${pathway.session}-${pathway.Topic}`)}/view`)}
                              title="View"
                              style={{ padding: '7px 12px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: dark ? '#C4B5FD' : '#7C3AED', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all .15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.22)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(139,92,246,0.12)'}
                            >
                              <Eye size={13} /> View
                            </button>
                            <button
                              onClick={() => navigate(`/admin/learning-pathway/${encodeURIComponent(pathway.mongoId || pathway._id || `${pathway.session}-${pathway.Topic}`)}/edit`)}
                              title="Edit"
                              style={{ padding: '7px 12px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: dark ? '#93C5FD' : '#2563EB', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all .15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.22)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.12)'}
                            >
                              <SquarePen size={13} /> Edit
                            </button>
                            <button
                              onClick={() => { setPathwayToDelete(pathway); setDeleteConfirmOpen(true); }}
                              title="Delete"
                              style={{ padding: '7px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: dark ? '#F87171' : '#DC2626', borderRadius: '7px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all .15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                            >
                              <Trash size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: textMuted }}>
                  <BookOpen size={40} />
                  <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>Select a pathway to view sessions</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Delete Modal ── */}
        {deleteConfirmOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: dark ? 'var(--cl-surface)' : '#fff', borderRadius: '16px', padding: '28px', maxWidth: '380px', width: '90%', boxShadow: '0 24px 48px rgba(0,0,0,0.25)', border: `1px solid ${border}` }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <Trash size={20} color={dark ? '#F87171' : '#DC2626'} />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: textPrimary, margin: '0 0 8px' }}>Delete Session?</h2>
              <p style={{ fontSize: '13px', color: textSecondary, margin: '0 0 22px', lineHeight: '1.5' }}>
                Are you sure you want to delete <strong>"{pathwayToDelete?.Topic}"</strong>? This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => { setDeleteConfirmOpen(false); setPathwayToDelete(null); }} disabled={deleting}
                  style={{ padding: '9px 20px', background: surface2, color: textPrimary, border: `1px solid ${border}`, borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1 }}>
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  style={{ padding: '9px 20px', background: deleting ? '#94A3B8' : '#EF4444', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: deleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {deleting && <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Rename Modal ── */}
        {renameModal.isOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: dark ? 'var(--cl-surface)' : '#fff', borderRadius: '16px', padding: '28px', maxWidth: '420px', width: '90%', boxShadow: '0 24px 48px rgba(0,0,0,0.25)', border: `1px solid ${border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #060030, #000)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <SquarePen size={16} color="white" />
                </div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', color: textPrimary, margin: 0 }}>Rename Pathway</h2>
                  <p style={{ fontSize: '11.5px', color: textMuted, margin: 0 }}>Updates name across all sessions</p>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: textSecondary, display: 'block', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '.4px' }}>New Name</label>
                <input
                  type="text"
                  value={renameModal.newName}
                  onChange={e => setRenameModal(prev => ({ ...prev, newName: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleRenamePathway(); }}
                  autoFocus
                  style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${border}`, borderRadius: '8px', fontSize: '14px', color: textPrimary, outline: 'none', boxSizing: 'border-box', background: surface2 }}
                  onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'; }}
                  onBlur={e => { e.target.style.borderColor = border; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setRenameModal({ isOpen: false, stageName: '', newName: '', isLoading: false })} disabled={renameModal.isLoading}
                  style={{ padding: '9px 20px', background: surface2, color: textPrimary, border: `1px solid ${border}`, borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: renameModal.isLoading ? 'not-allowed' : 'pointer', opacity: renameModal.isLoading ? 0.6 : 1 }}>
                  Cancel
                </button>
                <button
                  onClick={handleRenamePathway}
                  disabled={renameModal.isLoading || !renameModal.newName.trim() || renameModal.newName.trim().toLowerCase() === renameModal.stageName.toLowerCase()}
                  style={{ padding: '9px 20px', background: 'linear-gradient(135deg, #060030, #000)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: (!renameModal.newName.trim() || renameModal.newName.trim().toLowerCase() === renameModal.stageName.toLowerCase()) ? 0.5 : 1 }}>
                  {renameModal.isLoading && <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />}
                  {renameModal.isLoading ? 'Updating...' : 'Rename'}
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </Layout>
  );
};

export default LearningPathwayBuilder;
