import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useBlocker, useLocation } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { AlertCircle, Loader, SquarePen, Trash, Plus } from 'lucide-react';
import axios from 'axios';

const GET_PATHWAY_API_URL = 'https://nvouj7m5fb.execute-api.ap-south-1.amazonaws.com/default/CL_Get_LearningPathway';
const EDIT_PATHWAY_API_URL = 'https://cup8xy9gvd.execute-api.ap-south-1.amazonaws.com/default/CL_Update_LearningPathway';

const EditPathway = () => {
  const { id } = useParams();
  const { userToken } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const returningFromEditor = !!location.state?.returnFormData;

  const [loading, setLoading] = useState(!returningFromEditor);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editedPathway, setEditedPathway] = useState(
    returningFromEditor ? (location.state.editedPathway || null) : null
  );
  const [isDirty, setIsDirty] = useState(returningFromEditor);
  const isDirtyRef = useRef(returningFromEditor);

  const markDirty = () => { isDirtyRef.current = true; setIsDirty(true); };
  const markClean = () => { isDirtyRef.current = false; setIsDirty(false); };

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirtyRef.current && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const [formData, setFormData] = useState(
    returningFromEditor
      ? location.state.returnFormData
      : { LearningPathway: '', session: '', Topic: '', SessionType: 'Primary', Objective: '', activities: [], sessionTakeaways: [], totalPoints: 0 }
  );

  const [takeawayInput, setTakeawayInput] = useState('');

  useEffect(() => {
    if (returningFromEditor) return;
    const controller = new AbortController();
    fetchPathwayData(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPathwayData = async (signal) => {
    setLoading(true);
    setError('');
    try {
      const headers = { 'Content-Type': 'application/json', ...(userToken && { userToken }) };
      const response = await axios.get(GET_PATHWAY_API_URL, { headers, signal });
      let data = response.data || {};
      if (data.body && typeof data.body === 'string') {
        try { data = JSON.parse(data.body); } catch { /* ignore */ }
      }
      let pathways = [];
      if (Array.isArray(data)) pathways = data;
      else if (data.sessions) pathways = data.sessions;
      else if (data.data) pathways = data.data;
      else if (data.pathways) pathways = data.pathways;

      let pathway = pathways.find(p => p.mongoId === id || p._id === id);
      if (!pathway) pathway = pathways.find(p => `${p.session}-${p.Topic}` === decodeURIComponent(id));
      if (!pathway && !isNaN(id)) pathway = pathways.find(p => p.session === parseInt(id));
      if (!pathway) { setError('Pathway not found'); return; }

      setEditedPathway(pathway);
      setFormData({
        LearningPathway: pathway.LearningPathway || '',
        session: pathway.session?.toString() || '',
        Topic: pathway.Topic || '',
        SessionType: pathway.SessionType || 'Primary',
        Objective: pathway.Objective || '',
        activities: pathway.activities || [],
        sessionTakeaways: pathway.sessionTakeaways || [],
        totalPoints: pathway.totalPoints || 0
      });
    } catch (err) {
      if (err.name !== 'CanceledError') setError(err.response?.data?.message || err.message || 'Failed to fetch pathway');
    } finally {
      setLoading(false);
    }
  };

  const getStageBySession = (session) => {
    const m = parseInt(session);
    if (m >= 1 && m <= 24) return 'Foundation';
    if (m >= 25 && m <= 72) return 'Intermediate';
    return 'Advanced';
  };

  const handleFormChange = (field, value) => {
    markDirty();
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const openActivityEditor = (activity, activityIndex) => {
    markClean(); // prevent blocker when navigating to editor
    navigate('/admin/learning-pathway/add/activity', {
      state: {
        returnFormData: formData,
        returnPath: `/admin/learning-pathway/${id}/edit`,
        editedPathway,
        activityIndex,
        activity
      }
    });
  };

  const addActivity = () => {
    const newActivity = {
      activitySequence: (formData.activities?.length || 0) + 1,
      activityTitle: '',
      description: '',
      duration: 0,
      story: null,
      instructionsToCoach: [],
      project: null,
      code: null,
      aiTools: [],
      points: { total: 0, evaluationCriteria: [] }
    };
    openActivityEditor(newActivity, null);
  };

  const removeActivity = (idx) => {
    markDirty();
    setFormData(prev => ({
      ...prev,
      activities: prev.activities.filter((_, i) => i !== idx).map((a, i) => ({ ...a, activitySequence: i + 1 }))
    }));
  };

  const addTakeaway = () => {
    if (takeawayInput.trim()) {
      markDirty();
      setFormData(prev => ({ ...prev, sessionTakeaways: [...(prev.sessionTakeaways || []), takeawayInput.trim()] }));
      setTakeawayInput('');
    }
  };

  const removeTakeaway = (idx) => {
    markDirty();
    setFormData(prev => ({ ...prev, sessionTakeaways: prev.sessionTakeaways.filter((_, i) => i !== idx) }));
  };

  const handleEditPathway = async () => {
    if (!formData.LearningPathway.trim() || !formData.Topic.trim() || !formData.Objective.trim() || (formData.activities?.length || 0) === 0) {
      setError('Please fill in all required fields and add at least one activity');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        id: editedPathway?.mongoId || editedPathway?._id || editedPathway?.id || `${editedPathway?.session}-${editedPathway?.Topic}`,
        LearningPathway: formData.LearningPathway,
        session: parseInt(formData.session) || 1,
        Topic: formData.Topic,
        SessionType: formData.SessionType,
        Objective: formData.Objective,
        Stage: getStageBySession(formData.session),
        activities: formData.activities,
        sessionTakeaways: formData.sessionTakeaways,
        totalPoints: formData.activities.reduce((sum, a) => sum + (a.points?.total || 0), 0)
      };
      const headers = { 'Content-Type': 'application/json', ...(userToken && { userToken }) };
      const response = await axios.post(EDIT_PATHWAY_API_URL, payload, { headers });
      if (response.data && (response.data.statusCode === 200 || response.data.statusCode === 201 || response.status === 200 || response.status === 201)) {
        markClean();
        navigate('/admin/learning-pathway');
      } else {
        setError('Failed to update pathway. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to update pathway');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb',
    borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', transition: 'all 0.2s'
  };
  const focusStyle = (e) => { e.target.style.borderColor = '#060030ff'; e.target.style.boxShadow = '0 0 0 3px rgba(6,0,48,0.1)'; };
  const blurStyle = (e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; };

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#666' }}>
          <Loader size={48} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ marginTop: 12, fontSize: 16, fontWeight: 700 }}>Loading pathway...</p>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
          color: 'white', padding: '40px 32px', marginBottom: '32px',
          borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 8px 32px rgba(37,44,53,0.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 8px 0' }}>Edit Learning Pathway</h1>
              <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>Manage and update pathway details, activities, and sessions</p>
            </div>
            <button
              onClick={() => navigate('/admin/learning-pathway')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.4)', borderRadius: '8px', color: 'white', fontWeight: '600', fontSize: '13px', cursor: 'pointer', transition: 'all 0.3s ease' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            >
              Back
            </button>
          </div>
        </div>

        <Card style={{ padding: '32px', marginBottom: '32px' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#FEF2F2', border: '2px solid #FECACA', color: '#991B1B', padding: '12px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Pathway Info */}
          <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #e5e7eb' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Learning Pathway *</label>
                <input type="text" value={formData.LearningPathway} onChange={e => handleFormChange('LearningPathway', e.target.value)} placeholder="e.g., AI Foundation for Kids" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Session *</label>
                <input type="number" value={formData.session} onChange={e => handleFormChange('session', e.target.value)} placeholder="1" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Session Type *</label>
                <select value={formData.SessionType} onChange={e => handleFormChange('SessionType', e.target.value)} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}>
                  <option value="Primary">Primary</option>
                  <option value="Secondary">Secondary</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Topic *</label>
            <input type="text" value={formData.Topic} onChange={e => handleFormChange('Topic', e.target.value)} placeholder="e.g., Foundations of AI" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Objective *</label>
            <textarea value={formData.Objective} onChange={e => handleFormChange('Objective', e.target.value)} placeholder="Describe the learning objectives..." style={{ ...inputStyle, minHeight: '80px', fontFamily: 'inherit' }} onFocus={focusStyle} onBlur={blurStyle} />
          </div>

          {/* Activities */}
          <div style={{ marginBottom: '24px', paddingTop: '16px', borderTop: '2px solid #e5e7eb', borderBottom: '2px solid #e5e7eb', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: 0 }}>Activities *</p>
              <button
                onClick={addActivity}
                style={{ padding: '8px 16px', backgroundColor: '#060030ff', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#0a0040'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#060030ff'; e.currentTarget.style.transform = 'none'; }}
              >
                <Plus size={16} /> Add Activity
              </button>
            </div>

            {formData.activities?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {formData.activities.map((activity, idx) => (
                  <div key={idx} style={{ padding: '12px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F3F4F6'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F9FAFB'; e.currentTarget.style.borderColor = '#E5E7EB'; }}>
                    <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => openActivityEditor(activity, idx)}>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0 }}>Activity {idx + 1}: {activity.activityTitle || 'Untitled'}</p>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {activity.duration > 0 && <span style={{ fontSize: '11px', color: '#888', fontWeight: '500' }}>{activity.duration} min</span>}
                        {activity.points?.total > 0 && <span style={{ fontSize: '11px', color: '#888', fontWeight: '500' }}>{activity.points.total} pts</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={e => { e.stopPropagation(); openActivityEditor(activity, idx); }}
                        style={{ padding: '6px 12px', backgroundColor: '#3B82F6', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2563EB'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#3B82F6'}
                      >
                        <SquarePen size={14} /> Edit
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); removeActivity(idx); }}
                        style={{ padding: '6px 12px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#DC2626'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#EF4444'}
                      >
                        <Trash size={14} /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: '#999', textAlign: 'center', padding: '20px' }}>No activities found. Click "Add Activity" to add one.</p>
            )}
          </div>

          {/* Takeaways */}
          <div style={{ marginBottom: '24px', paddingTop: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: '0 0 12px 0' }}>Session Takeaways</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input type="text" value={takeawayInput} onChange={e => setTakeawayInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTakeaway()} placeholder="Add a takeaway"
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
              <button onClick={addTakeaway} style={{ padding: '8px 16px', backgroundColor: '#060030ff', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>Add</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {formData.sessionTakeaways?.map((takeaway, idx) => (
                <div key={idx} style={{ padding: '8px 12px', backgroundColor: '#EFF6FF', borderRadius: '6px', fontSize: '13px', color: '#060030ff', border: '1px solid #DBEAFE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {takeaway}
                  <button onClick={() => removeTakeaway(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#060030ff', padding: 0, fontSize: '18px', fontWeight: 'bold' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#DC2626'}
                    onMouseLeave={e => e.currentTarget.style.color = '#060030ff'}>×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '2px solid #e5e7eb' }}>
            <button onClick={() => navigate('/admin/learning-pathway')}
              style={{ padding: '10px 24px', backgroundColor: '#f3f4f6', color: '#111827', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e5e7eb'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}>
              Cancel
            </button>
            <button onClick={handleEditPathway} disabled={submitting}
              style={{ padding: '10px 24px', backgroundColor: submitting ? '#999' : '#060030ff', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#050027ff'; }}
              onMouseLeave={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#060030ff'; }}>
              {submitting && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {submitting ? 'Updating...' : 'Update Pathway'}
            </button>
          </div>
        </Card>

        {/* Unsaved Changes Modal */}
        {blocker.state === 'blocked' && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '36px 32px', maxWidth: '460px', width: '90%', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <AlertCircle size={28} color="#D97706" />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 10px' }}>Unsaved Changes</h2>
              <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 28px', lineHeight: '1.6' }}>You have unsaved changes. If you leave now, your edits will be lost.</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={() => blocker.reset()}
                  style={{ padding: '10px 24px', backgroundColor: '#060030ff', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  Stay & Keep Editing
                </button>
                <button onClick={() => { markClean(); blocker.proceed(); }}
                  style={{ padding: '10px 24px', backgroundColor: 'white', color: '#DC2626', border: '1.5px solid #FECACA', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  Leave Without Saving
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </Layout>
  );
};

export default EditPathway;
