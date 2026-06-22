import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { AlertCircle, Plus, Trash, SquarePen, Loader, BookOpen, Zap, ArrowLeft, X, Download } from 'lucide-react';
import axios from 'axios';

const ADD_PATHWAY_API_URL = 'https://u49kegogke.execute-api.ap-south-1.amazonaws.com/default/CL_Add_Master_LearningPathway';
const GET_PATHWAY_API_URL = 'https://nvouj7m5fb.execute-api.ap-south-1.amazonaws.com/default/CL_Get_LearningPathway';

const AddPathway = () => {
  const { userToken } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [availablePathways, setAvailablePathways] = useState([]);
  const [isCustomPathway, setIsCustomPathway] = useState(() => location.state?.isCustomPathway || false);
  const [importPathways, setImportPathways] = useState([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPathway, setImportPathway] = useState(null);
  const [importSession, setImportSession] = useState(null);
  const [importedKeys, setImportedKeys] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchAvailablePathways = async () => {
      try {
        const headers = {
          'Content-Type': 'application/json',
          ...(userToken && { 'userToken': userToken })
        };
        const response = await axios.get(GET_PATHWAY_API_URL, { headers, signal: controller.signal });
        const data = response.data || {};
        let sessions = [];
        if (Array.isArray(data)) {
          sessions = data;
        } else if (data.sessions && Array.isArray(data.sessions)) {
          sessions = data.sessions;
        } else if (data.data && Array.isArray(data.data)) {
          sessions = data.data;
        } else if (data.pathways && Array.isArray(data.pathways)) {
          sessions = data.pathways;
        } else if (data.body && typeof data.body === 'string') {
          try {
            const parsed = JSON.parse(data.body);
            sessions = Array.isArray(parsed) ? parsed : parsed.sessions || parsed.data || [];
          } catch {
            sessions = [];
          }
        }
        const unique = [...new Set(sessions.map(s => s.LearningPathway).filter(Boolean))];
        setAvailablePathways(unique);

        const grouped = {};
        sessions.forEach(s => {
          const name = s.LearningPathway || 'Unknown Pathway';
          if (!grouped[name]) grouped[name] = { LearningPathway: name, sessions: [] };
          grouped[name].sessions.push({
            title: s.Topic,
            sessionNumber: s.session,
            activities: s.activities || []
          });
        });
        const pathwayList = Object.values(grouped).sort((a, b) => a.LearningPathway.localeCompare(b.LearningPathway));
        setImportPathways(pathwayList);

        if (!location.state?.returnFormData && formData.LearningPathway) {
          const match = pathwayList.find(p => p.LearningPathway === formData.LearningPathway);
          if (match) {
            const maxSession = match.sessions.reduce((max, s) => Math.max(max, s.sessionNumber || 0), 0);
            setFormData(prev => ({ ...prev, session: maxSession + 1 }));
          }
        }
      } catch (err) {
        if (err.name !== 'CanceledError') {
          setAvailablePathways([]);
          setImportPathways([]);
        }
      }
    };
    fetchAvailablePathways();
    return () => controller.abort();
  }, [userToken]);
  
  const [formData, setFormData] = useState(() => {
    if (location.state?.returnFormData) {
      return location.state.returnFormData;
    }
    return {
      LearningPathway: '',
      session: '',
      Topic: '',
      SessionType: 'Primary',
      Objective: '',
      activities: [],
      sessionTakeaways: [],
      totalPoints: 0
    };
  });

  const [takeawayInput, setTakeawayInput] = useState('');

  const getStageBySession = (session) => {
    const m = parseInt(session);
    if (m >= 1 && m <= 24) {
      return 'Foundation';
    } else if (m >= 25 && m <= 72) {
      return 'Intermediate';
    } else if (m >= 73) {
      return 'Advanced';
    }
    return 'Foundation';
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addActivity = () => {
    navigate('/admin/learning-pathway/add/activity', {
      state: {
        returnFormData: formData,
        isCustomPathway,
        activityIndex: null,
        activity: {
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
        }
      }
    });
  };

  const importActivity = (activity, key) => {
    setFormData(prev => ({
      ...prev,
      activities: [...(prev.activities || []), {
        ...activity,
        activitySequence: (prev.activities?.length || 0) + 1
      }]
    }));
    setImportedKeys(prev => [...prev, key]);
  };

  const removeActivity = (idx) => {
    setFormData(prev => ({
      ...prev,
      activities: prev.activities.filter((_, i) => i !== idx).map((activity, newIdx) => ({
        ...activity,
        activitySequence: newIdx + 1
      }))
    }));
  };

  const addTakeaway = () => {
    if (takeawayInput.trim()) {
      setFormData(prev => ({
        ...prev,
        sessionTakeaways: [...(prev.sessionTakeaways || []), takeawayInput.trim()]
      }));
      setTakeawayInput('');
    }
  };

  const removeTakeaway = (idx) => {
    setFormData(prev => ({
      ...prev,
      sessionTakeaways: prev.sessionTakeaways.filter((_, i) => i !== idx)
    }));
  };

  const stripHtml = (html) => (html || '').replace(/<[^>]+>/g, '').trim();

  const handleAddPathway = async () => {
    if (!formData.LearningPathway.trim() || !formData.Topic.trim() || !formData.Objective.trim() || (formData.activities?.length || 0) === 0) {
      setError('Please fill in all required fields and add at least one activity');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
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

      const headers = {
        'Content-Type': 'application/json',
        ...(userToken && { 'userToken': userToken })
      };

      const response = await axios.post(ADD_PATHWAY_API_URL, payload, { headers });

      if (response.data && (response.data.statusCode === 200 || response.data.statusCode === 201 || response.status === 201)) {
        navigate('/admin/learning-pathway');
      } else {
        setError('Failed to add pathway. Please try again.');
      }
    } catch (err) {
      console.error('Error adding pathway:', err);
      setError(err.response?.data?.message || err.message || 'Failed to add pathway');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
          backdropFilter: 'blur(20px)',
          color: 'white',
          padding: '40px 32px',
          marginBottom: '32px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 8px 32px rgba(37, 44, 53, 0.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 8px 0' }}>Add Learning Pathway</h1>
              <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>Create a new learning pathway with activities and sessions</p>
            </div>
            <button
              onClick={() => navigate('/admin/learning-pathway')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.15)',
                border: '2px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '8px',
                color: 'white',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
              }}
            >
              Back
            </button>
          </div>
        </div>

        <Card style={{ padding: '32px', marginBottom: '32px' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              background: '#FEF2F2',
              border: '2px solid #FECACA',
              color: '#991B1B',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '20px'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Pathway Info Section */}
          <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #e5e7eb' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Learning Pathway *</label>
                <select
                  value={isCustomPathway ? 'Others' : (formData.LearningPathway || '')}
                  onChange={(e) => {
                    if (e.target.value === 'Others') {
                      setIsCustomPathway(true);
                      handleFormChange('LearningPathway', '');
                      setFormData(prev => ({ ...prev, LearningPathway: '', session: 1 }));
                    } else {
                      setIsCustomPathway(false);
                      const pathway = e.target.value;
                      const match = importPathways.find(p => p.LearningPathway === pathway);
                      const nextSession = match
                        ? match.sessions.reduce((max, s) => Math.max(max, s.sessionNumber || 0), 0) + 1
                        : 1;
                      setFormData(prev => ({ ...prev, LearningPathway: pathway, session: nextSession }));
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#060030ff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="">Select a pathway...</option>
                  {availablePathways.map((pathway) => (
                    <option key={pathway} value={pathway}>{pathway}</option>
                  ))}
                  <option value="Others">Others (Create New)</option>
                </select>
                {isCustomPathway && (
                  <input
                    type="text"
                    value={formData.LearningPathway}
                    onChange={(e) => handleFormChange('LearningPathway', e.target.value)}
                    placeholder="e.g., AI Foundation for Kids"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s',
                      marginTop: '8px'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#060030ff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                )}
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Session *</label>
                <input
                  type="number"
                  value={formData.session}
                  onChange={(e) => handleFormChange('session', e.target.value)}
                  placeholder="1"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#060030ff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

            </div>
          </div>

          {/* Main Content Section */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Topic *</label>
            <input
              type="text"
              value={formData.Topic}
              onChange={(e) => handleFormChange('Topic', e.target.value)}
              placeholder="e.g., Foundations of AI"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#060030ff';
                e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Objective *</label>
            <textarea
              value={formData.Objective}
              onChange={(e) => handleFormChange('Objective', e.target.value)}
              placeholder="Describe the learning objectives..."
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                minHeight: '80px',
                fontFamily: 'inherit',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#060030ff';
                e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Activities Section */}
          <div style={{ marginBottom: '24px', paddingTop: '16px', borderTop: '2px solid #e5e7eb', borderBottom: '2px solid #e5e7eb', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', margin: 0 }}>Activities *</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setImportPathway(null);
                    setImportSession(null);
                    setImportModalOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 16px',
                    background: 'white',
                    color: '#060030ff',
                    border: '1px solid #060030ff',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F5F3FF';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Download size={14} /> Import from Pathway
                </button>
                <button
                  onClick={addActivity}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: '#060030ff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0a0040';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#060030ff';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  + Add Activity
                </button>
              </div>
            </div>

            {formData.activities && formData.activities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {formData.activities.map((activity, idx) => (
                  <div key={idx} style={{
                    padding: '12px',
                    background: '#F9FAFB',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F3F4F6';
                    e.currentTarget.style.borderColor = '#D1D5DB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#F9FAFB';
                    e.currentTarget.style.borderColor = '#E5E7EB';
                  }}>
                    <div onClick={() => {
                      navigate('/admin/learning-pathway/add/activity', {
                        state: { returnFormData: formData, isCustomPathway, activityIndex: idx, activity }
                      });
                    }} style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0 }}>Activity {idx + 1}: {activity.activityTitle || 'Untitled'}</p>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>{stripHtml(activity.description)?.substring(0, 50)}...</p>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {activity.duration && (
                          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '500' }}>{activity.duration} min</span>
                        )}
                        {activity.points?.total > 0 && (
                          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '500' }}>{activity.points.total} pts</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/admin/learning-pathway/add/activity', {
                            state: { returnFormData: formData, isCustomPathway, activityIndex: idx, activity }
                          });
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#3B82F6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#2563EB';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#3B82F6';
                        }}
                      >
                        <SquarePen size={14} /> Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeActivity(idx);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#EF4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#DC2626';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#EF4444';
                        }}
                      >
                        <Trash size={14} /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: '#94A3B8', textAlign: 'center', padding: '20px' }}>No activities added yet. Click "+ Add Activity" to get started.</p>
            )}
          </div>

          {/* Takeaways Section */}
          <div style={{ marginBottom: '24px', paddingTop: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', margin: '0 0 12px 0' }}>Session Takeaways</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                value={takeawayInput}
                onChange={(e) => setTakeawayInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTakeaway()}
                placeholder="Add a takeaway"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
              <button
                onClick={addTakeaway}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#060030ff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Add
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {formData.sessionTakeaways?.map((takeaway, idx) => (
                <div key={idx} style={{
                  padding: '8px 12px',
                  background: '#EFF6FF',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#060030ff',
                  border: '1px solid #DBEAFE',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  {takeaway}
                  <button
                    onClick={() => removeTakeaway(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#060030ff',
                      padding: 0,
                      fontSize: '18px',
                      fontWeight: 'bold',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#DC2626';
                      e.currentTarget.style.fontSize = '20px';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#060030ff';
                      e.currentTarget.style.fontSize = '18px';
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '2px solid #e5e7eb' }}>
            <button
              onClick={() => navigate('/admin/learning-pathway')}
              style={{
                padding: '10px 24px',
                background: '#f3f4f6',
                color: '#111827',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAddPathway}
              disabled={submitting}
              style={{
                padding: '10px 24px',
                background: submitting ? '#999' : 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {submitting && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {submitting ? 'Adding...' : 'Add Session'}
            </button>
          </div>
        </Card>

        {/* Import Activity Modal */}
        {importModalOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '28px',
              maxWidth: '640px',
              width: '90%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>Import Activity</h2>
                  <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                    {!importPathway
                      ? 'Select a learning pathway'
                      : !importSession
                      ? `Pick a session for ${importPathway.LearningPathway}`
                      : 'Add activities into your new session'}
                  </p>
                </div>
                <button
                  onClick={() => setImportModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {!importPathway ? (
                importPathways.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#999', textAlign: 'center', padding: '20px' }}>No pathways available</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {importPathways.map((pathway, index) => (
                      <button
                        key={index}
                        onClick={() => { setImportPathway(pathway); setImportSession(null); }}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: '1px solid #E5E7EB',
                          background: 'white',
                          color: '#111827',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#060030ff';
                          e.currentTarget.style.background = '#F5F3FF';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#E5E7EB';
                          e.currentTarget.style.background = 'white';
                        }}
                      >
                        <BookOpen size={16} style={{ color: '#060030ff' }} /> {pathway.LearningPathway}
                      </button>
                    ))}
                  </div>
                )
              ) : !importSession ? (
                <>
                  <button
                    onClick={() => setImportPathway(null)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '8px 12px', background: '#F3F4F6', color: '#6B7280',
                      border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px',
                      fontWeight: '600', cursor: 'pointer', marginBottom: '16px'
                    }}
                  >
                    <ArrowLeft size={14} /> Back to Pathways
                  </button>
                  {!importPathway.sessions || importPathway.sessions.length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#999', textAlign: 'center', padding: '20px' }}>No sessions in this pathway</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {importPathway.sessions.map((session, index) => (
                        <button
                          key={index}
                          onClick={() => setImportSession(session)}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '10px',
                            border: '1px solid #E5E7EB',
                            background: 'white',
                            color: '#111827',
                            fontSize: '13px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#060030ff';
                            e.currentTarget.style.background = '#F5F3FF';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#E5E7EB';
                            e.currentTarget.style.background = 'white';
                          }}
                        >
                          <Zap size={16} style={{ color: '#060030ff' }} />
                          {session.sessionNumber ? `Session ${session.sessionNumber}: ` : ''}{session.title || 'Session'}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => setImportSession(null)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '8px 12px', background: '#F3F4F6', color: '#6B7280',
                      border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px',
                      fontWeight: '600', cursor: 'pointer', marginBottom: '16px'
                    }}
                  >
                    <ArrowLeft size={14} /> Back to Sessions
                  </button>
                  {!importSession.activities || importSession.activities.length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#999', textAlign: 'center', padding: '20px' }}>No activities in this session</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {importSession.activities.map((activity, index) => {
                        const key = `${importPathway.LearningPathway}-${importSession.sessionNumber}-${index}`;
                        const added = importedKeys.includes(key);
                        return (
                          <div
                            key={index}
                            style={{
                              padding: '12px 14px',
                              borderRadius: '10px',
                              border: '1px solid #E5E7EB',
                              background: added ? '#F0FDF4' : '#FAFBFC',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px'
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0 }}>
                                {activity.activityTitle || activity.name || 'Activity'}
                              </p>
                              <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0 0' }}>
                                {stripHtml(activity.description)?.substring(0, 60)}
                              </p>
                            </div>
                            <button
                              onClick={() => importActivity(activity, key)}
                              disabled={added}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '6px 14px',
                                backgroundColor: added ? '#DCFCE7' : '#060030ff',
                                color: added ? '#15803D' : 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: added ? 'default' : 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {added ? 'Added' : <><Plus size={14} /> Add</>}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                <button
                  onClick={() => setImportModalOpen(false)}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: '#060030ff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
};

export default AddPathway;
