import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { AlertCircle, Plus, ChevronDown, Trash, SquarePen, Loader } from 'lucide-react';
import axios from 'axios';
import CryptoJS from 'crypto-js';

const ADD_PATHWAY_API_URL = 'https://u49kegogke.execute-api.ap-south-1.amazonaws.com/default/CL_Add_Master_LearningPathway';
const GET_PATHWAY_API_URL = 'https://nvouj7m5fb.execute-api.ap-south-1.amazonaws.com/default/CL_Get_LearningPathway';

const AddPathway = () => {
  const { userToken } = useStore();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [availablePathways, setAvailablePathways] = useState([]);
  const [isCustomPathway, setIsCustomPathway] = useState(false);

  useEffect(() => {
    const fetchAvailablePathways = async () => {
      try {
        const headers = {
          'Content-Type': 'application/json',
          ...(userToken && { 'userToken': userToken })
        };
        const response = await axios.get(GET_PATHWAY_API_URL, { headers });
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
      } catch {
        setAvailablePathways([]);
      }
    };
    fetchAvailablePathways();
  }, [userToken]);
  
  const [formData, setFormData] = useState({
    LearningPathway: '',
    session: '',
    Topic: '',
    SessionType: 'Primary',
    Objective: '',
    activities: [],
    sessionTakeaways: [],
    totalPoints: 0
  });

  const [aiToolInput, setAiToolInput] = useState('');
  const [aiToolLinkInput, setAiToolLinkInput] = useState('');
  const [takeawayInput, setTakeawayInput] = useState('');
  const [editingActivityIndex, setEditingActivityIndex] = useState(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [criteriaInput, setCriteriaInput] = useState('');
  const [editedActivity, setEditedActivity] = useState(null);

  const descriptionEditorRef = useRef(null);
  const projectDescEditorRef = useRef(null);
  const instructionEditorRef = useRef(null);
  const storyEditorRef = useRef(null);
  const workflowEditorRef = useRef(null);

  useEffect(() => {
    if (activityModalOpen && editedActivity !== null) {
      setTimeout(() => {
        if (descriptionEditorRef.current) {
          descriptionEditorRef.current.innerHTML = editedActivity.description || '';
        }
        if (projectDescEditorRef.current) {
          projectDescEditorRef.current.innerHTML = editedActivity.project?.description || '';
        }
        if (instructionEditorRef.current) instructionEditorRef.current.innerHTML = '';
        if (storyEditorRef.current) storyEditorRef.current.innerHTML = '';
        if (workflowEditorRef.current) workflowEditorRef.current.innerHTML = '';
      }, 0);
    }
  }, [activityModalOpen, editingActivityIndex]);

  const getDefaultActivity = () => ({
    activitySequence: (formData.activities?.length || 0) + 1,
    activityTitle: '',
    description: '',
    duration: 0,
    story: null,
    instructionsToCoach: [],
    project: null,
    code: null,
    aiTools: [],
    points: {
      total: 0,
      evaluationCriteria: []
    }
  });

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
    const newActivity = getDefaultActivity();
    setFormData(prev => ({
      ...prev,
      activities: [...(prev.activities || []), newActivity]
    }));
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

  const updateActivity = (idx, updatedActivity) => {
    setFormData(prev => {
      const updated = [...prev.activities];
      updated[idx] = updatedActivity;
      return { ...prev, activities: updated };
    });
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

  const addInstruction = () => {
    const content = instructionEditorRef.current?.innerHTML || '';
    if (stripHtml(content)) {
      setEditedActivity(prev => ({
        ...prev,
        instructionsToCoach: [...(prev.instructionsToCoach || []), content]
      }));
      if (instructionEditorRef.current) instructionEditorRef.current.innerHTML = '';
    }
  };

  const removeInstruction = (idx) => {
    setEditedActivity(prev => ({
      ...prev,
      instructionsToCoach: prev.instructionsToCoach?.filter((_, i) => i !== idx) || []
    }));
  };

  const addCriteria = () => {
    if (criteriaInput.trim()) {
      setEditedActivity(prev => ({
        ...prev,
        points: {
          ...prev.points,
          evaluationCriteria: [...(prev.points?.evaluationCriteria || []), criteriaInput.trim()]
        }
      }));
      setCriteriaInput('');
    }
  };

  const removeCriteria = (idx) => {
    setEditedActivity(prev => ({
      ...prev,
      points: {
        ...prev.points,
        evaluationCriteria: prev.points?.evaluationCriteria?.filter((_, i) => i !== idx) || []
      }
    }));
  };

  const addStoryLine = () => {
    const content = storyEditorRef.current?.innerHTML || '';
    if (stripHtml(content)) {
      setEditedActivity(prev => ({
        ...prev,
        story: [...(prev.story || []), content]
      }));
      if (storyEditorRef.current) storyEditorRef.current.innerHTML = '';
    }
  };

  const removeStoryLine = (idx) => {
    setEditedActivity(prev => ({
      ...prev,
      story: prev.story?.filter((_, i) => i !== idx) || null
    }));
  };

  const addAiTool = () => {
    if (aiToolInput.trim()) {
      setEditedActivity(prev => ({
        ...prev,
        aiTools: [...(prev.aiTools || []), { toolName: aiToolInput.trim(), toolLink: aiToolLinkInput.trim() || '', usagePurpose: '' }]
      }));
      setAiToolInput('');
      setAiToolLinkInput('');
    }
  };

  const removeAiTool = (idx) => {
    setEditedActivity(prev => ({
      ...prev,
      aiTools: prev.aiTools?.filter((_, i) => i !== idx) || []
    }));
  };

  const addProjectWorkflow = () => {
    const content = workflowEditorRef.current?.innerHTML || '';
    if (stripHtml(content)) {
      setEditedActivity(prev => ({
        ...prev,
        project: {
          ...(prev.project || { title: '', description: '', workflow: [] }),
          workflow: [...((prev.project?.workflow) || []), content]
        }
      }));
      if (workflowEditorRef.current) workflowEditorRef.current.innerHTML = '';
    }
  };

  const removeProjectWorkflow = (idx) => {
    setEditedActivity(prev => ({
      ...prev,
      project: {
        ...(prev.project || { title: '', description: '' }),
        workflow: prev.project?.workflow?.filter((_, i) => i !== idx) || []
      }
    }));
  };

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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Learning Pathway *</label>
                <select
                  value={isCustomPathway ? 'Others' : (formData.LearningPathway || '')}
                  onChange={(e) => {
                    if (e.target.value === 'Others') {
                      setIsCustomPathway(true);
                      handleFormChange('LearningPathway', '');
                    } else {
                      setIsCustomPathway(false);
                      handleFormChange('LearningPathway', e.target.value);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s',
                    backgroundColor: 'white'
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
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Session *</label>
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

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Session Type *</label>
                <select
                  value={formData.SessionType}
                  onChange={(e) => handleFormChange('SessionType', e.target.value)}
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
                  <option value="Primary">Primary</option>
                  <option value="Secondary">Secondary</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main Content Section */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Topic *</label>
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
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Objective *</label>
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
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: 0 }}>Activities *</p>
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

            {formData.activities && formData.activities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {formData.activities.map((activity, idx) => (
                  <div key={idx} style={{
                    padding: '12px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                    e.currentTarget.style.borderColor = '#D1D5DB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                    e.currentTarget.style.borderColor = '#E5E7EB';
                  }}>
                    <div onClick={() => {
                      setEditedActivity(activity);
                      setActivityModalOpen(true);
                      setEditingActivityIndex(idx);
                    }} style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0 }}>Activity {idx + 1}: {activity.activityTitle || 'Untitled'}</p>
                      <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>{stripHtml(activity.description)?.substring(0, 50)}...</p>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {activity.duration && (
                          <span style={{ fontSize: '11px', color: '#888', fontWeight: '500' }}>{activity.duration} min</span>
                        )}
                        {activity.points?.total && (
                          <span style={{ fontSize: '11px', color: '#888', fontWeight: '500' }}>{activity.points.total} pts</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditedActivity(activity);
                          setActivityModalOpen(true);
                          setEditingActivityIndex(idx);
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
              <p style={{ fontSize: '13px', color: '#999', textAlign: 'center', padding: '20px' }}>No activities added yet. Click "Add Activity" to get started.</p>
            )}
          </div>

          {/* Takeaways Section */}
          <div style={{ marginBottom: '24px', paddingTop: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: '0 0 12px 0' }}>Session Takeaways</p>
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
                  backgroundColor: '#EFF6FF',
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
                backgroundColor: '#f3f4f6',
                color: '#111827',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
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

        {/* Activity Modal */}
        {activityModalOpen && editedActivity && (
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
              padding: '32px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 24px 0' }}>
                Activity {editingActivityIndex + 1}: {editedActivity.activityTitle || 'Edit Activity'}
              </h2>

              {/* Basic Info */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Activity Title *</label>
                <input
                  type="text"
                  value={editedActivity.activityTitle}
                  onChange={(e) => setEditedActivity(prev => ({ ...prev, activityTitle: e.target.value }))}
                  placeholder="e.g., Warm-Up: Discovering Smart Technology"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Description *</label>
                <div
                  ref={descriptionEditorRef}
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="Describe the activity..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    minHeight: '80px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    lineHeight: '1.6',
                    color: '#111827'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#060030ff';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Activity Duration (Minutes) *</label>
                <input
                  type="number"
                  min="1"
                  max="45"
                  value={editedActivity.duration}
                  onChange={(e) => {
                    let value = parseInt(e.target.value);
                    if (value > 45) value = 45;
                    if (value < 1) value = 1;
                    setEditedActivity(prev => ({ ...prev, duration: value }));
                  }}
                  placeholder="Enter time in minutes (0-45)"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                <p style={{ fontSize: '11px', color: '#888', margin: '6px 0 0 0' }}>Maximum duration allowed: 45 minutes</p>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Code (Optional)</label>
                <textarea
                  value={editedActivity.code || ''}
                  onChange={(e) => setEditedActivity(prev => ({ ...prev, code: e.target.value || null }))}
                  placeholder="Enter code snippet or example for this activity..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    minHeight: '100px',
                    fontFamily: 'monospace',
                    backgroundColor: '#F9FAFB'
                  }}
                />
              </div>

              {/* Project */}
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: '0 0 12px 0' }}>Project Details (Optional)</p>
                
                {/* Project Title */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#888', display: 'block', marginBottom: '6px' }}>Project Title</label>
                  <input
                    type="text"
                    value={editedActivity.project?.title || ''}
                    onChange={(e) => setEditedActivity(prev => ({
                      ...prev,
                      project: { ...(prev.project || { description: '', workflow: [] }), title: e.target.value }
                    }))}
                    placeholder="e.g., Build a Smart Home System"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Project Description */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#888', display: 'block', marginBottom: '6px' }}>Project Description</label>
                  <div
                    ref={projectDescEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder="Describe the project objectives and outcomes..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      minHeight: '70px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      lineHeight: '1.6',
                      color: '#111827'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#060030ff';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Project Workflow */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#888', display: 'block', marginBottom: '6px' }}>Project Workflow Steps</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <div
                      ref={workflowEditorRef}
                      contentEditable
                      suppressContentEditableWarning
                      data-placeholder="Add workflow step"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addProjectWorkflow(); } }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        minHeight: '36px',
                        outline: 'none',
                        lineHeight: '1.5',
                        color: '#111827'
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#060030ff'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                    />
                    <button
                      onClick={addProjectWorkflow}
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
                    {editedActivity.project?.workflow?.map((step, idx) => (
                      <div key={idx} style={{
                        padding: '8px 12px',
                        backgroundColor: '#E0E7FF',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: '1px solid #C7D2FE',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '600', color: '#4338CA' }}>Step {idx + 1}</span>
                          <span style={{ color: '#333' }} dangerouslySetInnerHTML={{ __html: step }} />
                        </div>
                        <button
                          onClick={() => removeProjectWorkflow(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#6366F1',
                            padding: 0
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Points */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Total Points</label>
                <input
                  type="number"
                  value={editedActivity.points?.total || ''}
                  onChange={(e) => setEditedActivity(prev => ({
                    ...prev,
                    points: { ...prev.points, total: e.target.value ? parseInt(e.target.value) : '' }
                  }))}
                  placeholder="e.g., 5"
                  step="1"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Instructions */}
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: '0 0 12px 0' }}>Instructions to Coach</p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <div
                    ref={instructionEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder="Add instruction"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addInstruction(); } }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      minHeight: '36px',
                      outline: 'none',
                      lineHeight: '1.5',
                      color: '#111827'
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#060030ff'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                  />
                  <button
                    onClick={addInstruction}
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
                  {editedActivity.instructionsToCoach?.map((inst, idx) => (
                    <div key={idx} style={{
                      padding: '8px 12px',
                      backgroundColor: '#F0FDF4',
                      fontSize: '12px',
                      borderRadius: '4px',
                      border: '1px solid #DCFCE7',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span dangerouslySetInnerHTML={{ __html: inst }} style={{ flex: 1 }} />
                      <button
                        onClick={() => removeInstruction(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: '#10B981',
                          padding: 0,
                          flexShrink: 0
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Story Lines */}
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: '0 0 12px 0' }}>Story Lines</p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <div
                    ref={storyEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder="Add story line"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addStoryLine(); } }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      minHeight: '36px',
                      outline: 'none',
                      lineHeight: '1.5',
                      color: '#111827'
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#060030ff'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                  />
                  <button
                    onClick={addStoryLine}
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
                  {editedActivity.story?.map((line, idx) => (
                    <div key={idx} style={{
                      padding: '8px 12px',
                      backgroundColor: '#EFF6FF',
                      fontSize: '12px',
                      borderRadius: '4px',
                      border: '1px solid #DBEAFE',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span dangerouslySetInnerHTML={{ __html: line }} style={{ flex: 1 }} />
                      <button
                        onClick={() => removeStoryLine(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: '#3B82F6',
                          padding: 0,
                          flexShrink: 0
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Tools */}
              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: '0 0 12px 0' }}>AI Tools Used</p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    value={aiToolInput}
                    onChange={(e) => setAiToolInput(e.target.value)}
                    placeholder="Tool name (e.g., ChatGPT)"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <input
                    type="text"
                    value={aiToolLinkInput}
                    onChange={(e) => setAiToolLinkInput(e.target.value)}
                    placeholder="Tool link (e.g., https://...)"
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
                    onClick={addAiTool}
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
                  {editedActivity.aiTools?.map((tool, idx) => (
                    <div key={idx} style={{
                      padding: '10px 12px',
                      backgroundColor: '#FEF3C7',
                      fontSize: '12px',
                      borderRadius: '4px',
                      border: '1px solid #FCD34D',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#111827' }}>{tool.toolName}</p>
                        {tool.toolLink && (
                          <a href={tool.toolLink} target="_blank" rel="noopener noreferrer" style={{
                            fontSize: '11px',
                            color: '#3B82F6',
                            textDecoration: 'none',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                            maxWidth: '250px'
                          }}>
                            🔗 {tool.toolLink}
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => removeAiTool(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: '#F59E0B',
                          padding: 0,
                          flexShrink: 0
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evaluation Criteria */}
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: '0 0 12px 0' }}>Evaluation Criteria</p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    value={criteriaInput}
                    onChange={(e) => setCriteriaInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCriteria()}
                    placeholder="Add evaluation criteria"
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
                    onClick={addCriteria}
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
                  {editedActivity.points?.evaluationCriteria?.map((criteria, idx) => (
                    <div key={idx} style={{
                      padding: '8px 12px',
                      backgroundColor: '#FEE2E2',
                      fontSize: '12px',
                      borderRadius: '4px',
                      border: '1px solid #FECACA',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      {criteria}
                      <button
                        onClick={() => removeCriteria(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: '#DC2626',
                          padding: 0
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setActivityModalOpen(false);
                    setEditedActivity(null);
                    setEditingActivityIndex(null);
                  }}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: '#f3f4f6',
                    color: '#111827',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const description = descriptionEditorRef.current?.innerHTML || editedActivity.description;
                    const projectDesc = projectDescEditorRef.current?.innerHTML || editedActivity.project?.description;
                    const activityToSave = {
                      ...editedActivity,
                      description,
                      project: editedActivity.project
                        ? { ...editedActivity.project, description: projectDesc }
                        : editedActivity.project
                    };
                    updateActivity(editingActivityIndex, activityToSave);
                    setActivityModalOpen(false);
                    setEditedActivity(null);
                    setEditingActivityIndex(null);
                  }}
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
                  Save Activity
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
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          pointer-events: none;
        }
      `}</style>
    </Layout>
  );
};

export default AddPathway;
