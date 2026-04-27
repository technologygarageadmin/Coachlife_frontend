import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { Toast } from '../../components/Toast';
import { ArrowLeft, Loader, Save, Plus, SquarePen, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

const API_ENDPOINTS = {
  VIEW_SESSION_CARD: 'https://kyfkhl8v4l.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_View_Sessioncard',
};

const getStatusColor = (status) => {
  switch(status?.toLowerCase()) {
    case 'completed': return { bg: '#DCFCE7', color: '#166534', text: 'Completed' };
    case 'upcoming': return { bg: '#FEF3C7', color: '#92400E', text: 'Upcoming' };
    case 'in progress': return { bg: '#DBEAFE', color: '#075985', text: 'In Progress' };
    default: return { bg: '#F3F4F6', color: '#6B7280', text: 'Draft' };
  }
};

const EditSessionCard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { userToken } = useStore();

  const [formData, setFormData] = useState({
    Topic: '',
    Objective: '',
    Activities: [],
    status: 'draft'
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [originalFormData, setOriginalFormData] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editingActivityIndex, setEditingActivityIndex] = useState(null);
  const [editedActivity, setEditedActivity] = useState(null);
  
  // Activity form input states
  const [instructionInput, setInstructionInput] = useState('');
  const [aiToolNameInput, setAiToolNameInput] = useState('');
  const [aiToolLinkInput, setAiToolLinkInput] = useState('');
  const [aiToolPurposeInput, setAiToolPurposeInput] = useState('');
  const [projectWorkflowInput, setProjectWorkflowInput] = useState('');
  const [storyLineInput, setStoryLineInput] = useState('');
  const [criteriaInput, setCriteriaInput] = useState('');

  // Fetch session card details
  useEffect(() => {
    const fetchSessionCard = async () => {
      try {
        setFetching(true);
        const response = await fetch(API_ENDPOINTS.VIEW_SESSION_CARD, {
          method: 'POST',
          headers: {
            'userToken': userToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sessionCardId: id })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch session card');
        }

        const data = await response.json();
        const sessionCard = data.sessionCard || data.data || data;

        console.log('Fetched session card:', sessionCard);

        // Get activities from API (preserve full structure)
        let activities = sessionCard.Activities || sessionCard.activities || [];
        
        // Preserve all fields from API response
        activities = activities.map((activity, idx) => ({
          activitySequence: activity.activitySequence || idx + 1,
          activityTitle: activity.activityTitle || activity.activityName || activity.name || '',
          description: activity.description || '',
          duration: activity.duration || 15,
          story: activity.story || [],
          code: activity.code || null,
          instructionsToCoach: activity.instructionsToCoach || [],
          project: activity.project || null,
          aiTools: activity.aiTools || [],
          points: {
            total: typeof activity.points === 'object' ? (activity.points?.total || 10) : (activity.points || 10),
            evaluationCriteria: activity.points?.evaluationCriteria || []
          },
          rating: activity.rating || 5,
          feedback: activity.feedback || ''
        }));

        setFormData({
          Topic: sessionCard.Topic || '',
          Objective: sessionCard.Objective || '',
          Activities: activities,
          status: sessionCard.status || 'draft'
        });
        // Store original data to detect changes
        setOriginalFormData({
          Topic: sessionCard.Topic || '',
          Objective: sessionCard.Objective || '',
          Activities: activities,
          status: sessionCard.status || 'draft'
        });
      } catch (err) {
        console.error('Error fetching session card:', err);
        setToastMessage('Failed to load session card details');
        setToastType('error');
      } finally {
        setFetching(false);
      }
    };

    if (id && userToken) {
      fetchSessionCard();
    }
  }, [id, userToken]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setHasUnsavedChanges(true);
  };

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit(e);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [formData, loading]);

  const totalActivityDuration = formData.Activities?.reduce((sum, activity) => sum + (activity.duration || 0), 0) || 0;
  const totalActivityPoints = formData.Activities?.reduce((sum, activity) => sum + (activity.points?.total || 0), 0) || 0;

  // Activity management functions
  const addActivity = () => {
    const newActivity = {
      activitySequence: (formData.Activities?.length || 0) + 1,
      activityTitle: '',
      description: '',
      duration: 15,
      story: [],
      code: null,
      instructionsToCoach: [],
      project: null,
      aiTools: [],
      points: {
        total: 10,
        evaluationCriteria: []
      },
      rating: 5,
      feedback: ''
    };
    const updatedActivities = [...(formData.Activities || []), newActivity];
    setFormData(prev => ({
      ...prev,
      Activities: updatedActivities
    }));
    setEditedActivity(newActivity);
    setEditingActivityIndex(updatedActivities.length - 1);
    setActivityModalOpen(true);
  };

  const removeActivity = (index) => {
    setFormData(prev => ({
      ...prev,
      Activities: prev.Activities.filter((_, i) => i !== index)
    }));
  };

  const saveActivity = () => {
    if (!editedActivity.activityTitle?.trim()) {
      setToastMessage('Please enter activity title');
      setToastType('error');
      return;
    }

    // Update activity sequence numbers
    const updatedActivities = [...formData.Activities];
    editedActivity.activitySequence = editingActivityIndex + 1;
    updatedActivities[editingActivityIndex] = editedActivity;
    
    setFormData(prev => ({
      ...prev,
      Activities: updatedActivities
    }));
    
    setActivityModalOpen(false);
    setEditedActivity(null);
    setEditingActivityIndex(null);
    setInstructionInput('');
    setAiToolNameInput('');
    setAiToolLinkInput('');
    setAiToolPurposeInput('');
    setProjectWorkflowInput('');
    setStoryLineInput('');
    setCriteriaInput('');
  };

  // Helper functions for activity modal
  const addInstruction = () => {
    if (instructionInput.trim()) {
      setEditedActivity(prev => ({
        ...prev,
        instructionsToCoach: [...(prev.instructionsToCoach || []), instructionInput.trim()]
      }));
      setInstructionInput('');
      setHasUnsavedChanges(true);
    }
  };

  const removeInstruction = (idx) => {
    setEditedActivity(prev => ({
      ...prev,
      instructionsToCoach: (prev.instructionsToCoach || []).filter((_, i) => i !== idx)
    }));
  };

  const addAiTool = () => {
    if (aiToolNameInput.trim()) {
      setEditedActivity(prev => ({
        ...prev,
        aiTools: [...(prev.aiTools || []), { toolName: aiToolNameInput.trim(), toolLink: aiToolLinkInput.trim(), usagePurpose: '' }]
      }));
      setAiToolNameInput('');
      setAiToolLinkInput('');
    }
  };

  const removeAiTool = (idx) => {
    setEditedActivity(prev => ({
      ...prev,
      aiTools: (prev.aiTools || []).filter((_, i) => i !== idx)
    }));
  };

  const addProjectWorkflow = () => {
    if (projectWorkflowInput.trim()) {
      setEditedActivity(prev => ({
        ...prev,
        project: {
          ...( prev.project || { title: '', description: '', workflow: [] }),
          workflow: [...((prev.project?.workflow) || []), projectWorkflowInput.trim()]
        }
      }));
      setProjectWorkflowInput('');
      setHasUnsavedChanges(true);
    }
  };

  const removeProjectWorkflow = (idx) => {
    setEditedActivity(prev => ({
      ...prev,
      project: {
        ...prev.project,
        workflow: (prev.project?.workflow || []).filter((_, i) => i !== idx)
      }
    }));
  };

  const addStoryLine = () => {
    if (storyLineInput.trim()) {
      setEditedActivity(prev => ({
        ...prev,
        story: [...(prev.story || []), storyLineInput.trim()]
      }));
      setStoryLineInput('');
      setHasUnsavedChanges(true);
    }
  };

  const removeStoryLine = (idx) => {
    setEditedActivity(prev => ({
      ...prev,
      story: (prev.story || []).filter((_, i) => i !== idx)
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
      setHasUnsavedChanges(true);
    }
  };

  const removeCriteria = (idx) => {
    setEditedActivity(prev => ({
      ...prev,
      points: {
        ...prev.points,
        evaluationCriteria: (prev.points?.evaluationCriteria || []).filter((_, i) => i !== idx)
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.Topic.trim() || !formData.Objective.trim()) {
      setToastMessage('Please fill in all required fields');
      setToastType('error');
      return;
    }

    setLoading(true);
    try {
      // Prepare payload in API structure
      const payload = {
        Topic: formData.Topic,
        Objective: formData.Objective,
        status: formData.status,
        activities: formData.Activities.map((activity, idx) => ({
          activitySequence: idx + 1,
          activityTitle: activity.activityTitle,
          description: activity.description,
          duration: activity.duration,
          story: activity.story || [],
          code: activity.code || null,
          instructionsToCoach: activity.instructionsToCoach || [],
          project: activity.project || null,
          aiTools: activity.aiTools || [],
          points: {
            total: activity.points?.total || 10,
            evaluationCriteria: activity.points?.evaluationCriteria || []
          },
          rating: activity.rating || 5,
          feedback: activity.feedback || ''
        }))
      };

      console.log('Updating session card with payload:', {
        cardId: id,
        ...payload
      });

      // TODO: Call actual API endpoint
      // const response = await fetch(UPDATE_API_ENDPOINT, {
      //   method: 'POST',
      //   headers: { 'userToken': userToken },
      //   body: JSON.stringify({ sessionCardId: id, ...payload })
      // });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setToastMessage('Session card updated successfully!');
      setToastType('success');
      setHasUnsavedChanges(false);

      // Navigate back after success
      setTimeout(() => {
        navigate('/admin/session-card');
      }, 1500);
    } catch (err) {
      console.error('Error updating session card:', err);
      setToastMessage('Failed to update session card');
      setToastType('error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Layout>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <div style={{ width: '40px', height: '40px', background: '#F3F4F6', borderRadius: '6px' }} />
            <div>
              <div style={{ height: '24px', background: '#F3F4F6', borderRadius: '4px', width: '200px', marginBottom: '8px' }} />
              <div style={{ height: '16px', background: '#F3F4F6', borderRadius: '4px', width: '300px' }} />
            </div>
          </div>

          <Card>
            <div style={{
              padding: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              minHeight: '300px',
              color: '#6B7280',
              flexDirection: 'column'
            }}>
              <Loader size={32} style={{ animation: 'spin 2s linear infinite' }} />
              <span style={{ fontSize: '16px', fontWeight: '500' }}>Loading session card...</span>
            </div>
          </Card>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </Layout>
    );
  }

  return (
    <Layout>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 32px' }}>
        {/* Enhanced Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '32px',
          padding: '20px',
          background: 'linear-gradient(135deg, #060030ff 0%, #000000 100%)',
          borderRadius: '12px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => navigate('/admin/session-card')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              }}
            >
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
                Edit Session Card
              </h1>
              <p style={{ fontSize: '13px', opacity: 0.9, margin: '4px 0 0 0' }}>
                Modify card content and structure
              </p>
            </div>
          </div>
          
          {/* Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)'
          }}>
            <span style={{ fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', fontWeight: '600' }}>Status</span>
            <span style={{
              fontSize: '13px',
              fontWeight: '600',
              padding: '4px 12px',
              borderRadius: '4px',
              background: getStatusColor(formData.status).bg,
              color: getStatusColor(formData.status).color,
              textTransform: 'capitalize'
            }}>
              {getStatusColor(formData.status).text}
            </span>
            {hasUnsavedChanges && (
              <span style={{ fontSize: '11px', color: '#FCA5A5', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', background: '#EF4444', borderRadius: '50%', display: 'inline-block' }} />
                Unsaved changes
              </span>
            )}
          </div>
        </div>

        {toastMessage && (
          <Toast 
            message={toastMessage} 
            type={toastType}
            duration={3000}
            onClose={() => setToastMessage('')}
          />
        )}

        {/* Form Card with enhanced styling */}
        <Card style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{
              padding: '24px',
              background: '#F9FAFB',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Session Information
                </h2>
              </div>
            </div>

            {/* Form Completion Progress */}
            <div style={{
              padding: '0 32px 12px 32px',
              marginTop: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>Form Completion</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#060030ff' }}>
                  {Math.round(((formData.Topic.length > 0 ? 1 : 0) + (formData.Objective.length > 0 ? 1 : 0) + (formData.Activities?.length > 0 ? 1 : 0)) / 3 * 100)}%
                </span>
              </div>
              <div style={{
                height: '6px',
                background: '#E5E7EB',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #060030ff 0%, #10B981 100%)',
                  width: `${Math.round(((formData.Topic.length > 0 ? 1 : 0) + (formData.Objective.length > 0 ? 1 : 0) + (formData.Activities?.length > 0 ? 1 : 0)) / 3 * 100)}%`,
                  transition: 'width 0.3s ease-in-out'
                }} />
              </div>
            </div>

            <div style={{ padding: '32px' }}>
              {/* Topic */}
              <div style={{ marginBottom: '28px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}>
                  Topic <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="Topic"
                  placeholder="e.g., Introduction to Cloud Computing"
                  value={formData.Topic}
                  onChange={handleInputChange}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: formData.Topic ? '2px solid #10B981' : '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    boxSizing: 'border-box',
                    transition: 'all 0.3s',
                    background: loading ? '#F9FAFB' : 'white',
                    cursor: loading ? 'not-allowed' : 'text'
                  }}
                  onFocus={(e) => !loading && (e.target.style.borderColor = '#060030ff')}
                  onBlur={(e) => (e.target.style.borderColor = formData.Topic ? '#10B981' : '#E5E7EB')}
                />
                {formData.Topic && <p style={{ fontSize: '11px', color: '#10B981', margin: '6px 0 0 0' }}>✓ Field completed</p>}
              </div>

              {/* Objective */}
              <div style={{ marginBottom: '28px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}>
                  Objective <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  name="Objective"
                  placeholder="Describe what participants will learn..."
                  value={formData.Objective}
                  onChange={handleInputChange}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: formData.Objective ? '2px solid #10B981' : '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    boxSizing: 'border-box',
                    minHeight: '100px',
                    fontFamily: 'inherit',
                    transition: 'all 0.3s',
                    background: loading ? '#F9FAFB' : 'white',
                    cursor: loading ? 'not-allowed' : 'text',
                    resize: 'vertical'
                  }}
                  onFocus={(e) => !loading && (e.target.style.borderColor = '#060030ff')}
                  onBlur={(e) => (e.target.style.borderColor = formData.Objective ? '#10B981' : '#E5E7EB')}
                />
                {formData.Objective && <p style={{ fontSize: '11px', color: '#10B981', margin: '6px 0 0 0' }}>✓ Field completed</p>}
              </div>

              {/* Activities Total Duration */}
              {totalActivityDuration > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#111827',
                    marginBottom: '8px',
                    textTransform: 'uppercase'
                  }}>
                    Total Session Duration
                  </label>
                  <div style={{
                    padding: '12px 14px',
                    background: '#F3F4F6',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1F2937',
                    border: '2px solid #E5E7EB'
                  }}>
                    {totalActivityDuration} minutes
                  </div>
                </div>
              )}

              {/* Activities Section */}
              <div style={{ marginBottom: '28px', paddingTop: '20px', borderTop: '2px solid #E5E7EB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <label style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#111827',
                      textTransform: 'uppercase',
                      margin: 0
                    }}>
                      Activities <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0 0' }}>
                      {formData.Activities?.length || 0} activity{formData.Activities?.length !== 1 ? 'ies' : ''} • {totalActivityPoints} points
                    </p>
                  </div>
                  <button
                    onClick={addActivity}
                    type="button"
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#060030ff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#0a0040';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#060030ff';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <Plus size={16} /> Add Activity
                  </button>
                </div>

                {formData.Activities && formData.Activities.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {formData.Activities.map((activity, idx) => (
                      <div key={idx} style={{
                        padding: '16px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '10px',
                        border: '2px solid #E5E7EB',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                        e.currentTarget.style.borderColor = '#D1D5DB';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}>
                        {/* Activity Number Badge */}
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '4px',
                          background: 'linear-gradient(135deg, #060030ff 0%, #000000 100%)'
                        }} />
                        
                        <div onClick={() => {
                          setEditedActivity(activity);
                          setActivityModalOpen(true);
                          setEditingActivityIndex(idx);
                        }} style={{ flex: 1, paddingLeft: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              background: '#F3F4F6',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '700',
                              color: '#060030ff',
                              fontSize: '14px',
                              flexShrink: 0
                            }}>
                              {idx + 1}
                            </div>
                            <div>
                              <p style={{ fontSize: '14px', fontWeight: '700', color: '#111827', margin: 0 }}>
                                {activity.activityTitle || 'Untitled Activity'}
                              </p>
                              <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0 0' }}>
                                {activity.description?.substring(0, 60) || 'No description provided'}
                                {activity.description?.length > 60 ? '...' : ''}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingLeft: '44px' }}>
                            <span style={{
                              fontSize: '11px',
                              color: '#6B7280',
                              fontWeight: '600',
                              padding: '4px 8px',
                              background: '#F3F4F6',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {activity.duration} min
                            </span>
                            <span style={{
                              fontSize: '11px',
                              color: '#6B7280',
                              fontWeight: '600',
                              padding: '4px 8px',
                              background: '#F3F4F6',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {activity.points?.total || 0} pts
                            </span>
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
                            type="button"
                            style={{
                              padding: '8px 14px',
                              backgroundColor: '#3B82F6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#2563EB';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#3B82F6';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            <SquarePen size={14} /> Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeActivity(idx);
                              setToastMessage('Activity deleted');
                              setToastType('success');
                            }}
                            type="button"
                            style={{
                              padding: '8px 14px',
                              backgroundColor: '#EF4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#DC2626';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#EF4444';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    padding: '32px',
                    textAlign: 'center',
                    backgroundColor: '#F9FAFB',
                    border: '2px dashed #D1D5DB',
                    borderRadius: '10px',
                    color: '#6B7280'
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
                    <p style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 6px 0', color: '#111827' }}>No activities yet</p>
                    <p style={{ fontSize: '13px', margin: 0 }}>Add activities to structure your session</p>
                  </div>
                )}
              </div>

              {/* Status */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}>
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    boxSizing: 'border-box',
                    transition: 'all 0.3s',
                    background: loading ? '#F9FAFB' : 'white',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                  onFocus={(e) => !loading && (e.target.style.borderColor = '#060030ff')}
                  onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                >
                  <option value="draft">Draft</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="in progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <button
                  type="button"
                  onClick={() => navigate('/admin/session-card')}
                  disabled={loading}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    backgroundColor: '#F3F4F6',
                    color: '#111827',
                    border: '2px solid #E5E7EB',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    opacity: loading ? 0.6 : 1,
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#E5E7EB')}
                  onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#F3F4F6')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
                    color: 'white',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    opacity: loading ? 0.8 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  {loading && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
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
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease-in-out'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              maxWidth: '750px',
              width: '95%',
              maxHeight: '95vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.2)'
            }}>
              {/* Modal Header */}
              <div style={{
                padding: '24px 32px',
                background: 'linear-gradient(135deg, #060030ff 0%, #000000 100%)',
                color: 'white',
                borderBottom: '2px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                      {editingActivityIndex !== null ? `Activity ${editingActivityIndex + 1}` : 'New Activity'}
                    </h2>
                    <p style={{ fontSize: '12px', opacity: 0.8, margin: '6px 0 0 0' }}>
                      {editedActivity.activityTitle || 'Enter activity details below'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActivityModalOpen(false);
                      setEditedActivity(null);
                      setEditingActivityIndex(null);
                      setInstructionInput('');
                      setAiToolNameInput('');
                      setAiToolLinkInput('');
                      setAiToolPurposeInput('');
                      setProjectWorkflowInput('');
                      setStoryLineInput('');
                      setCriteriaInput('');
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'white',
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      fontSize: '18px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div style={{ padding: '32px' }}>
                {/* Activity Title */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                    Activity Title <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={editedActivity.activityTitle || ''}
                    onChange={(e) => {
                      setEditedActivity(prev => ({ ...prev, activityTitle: e.target.value }));
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="e.g., How AI Hears and Talks"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: editedActivity.activityTitle ? '2px solid #10B981' : '2px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      boxSizing: 'border-box',
                      transition: 'all 0.3s'
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#060030ff')}
                    onBlur={(e) => (e.target.style.borderColor = editedActivity.activityTitle ? '#10B981' : '#E5E7EB')}
                  />
                </div>

                {/* Description */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Description</label>
                  <textarea
                    value={editedActivity.description || ''}
                    onChange={(e) => {
                      setEditedActivity(prev => ({ ...prev, description: e.target.value }));
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Describe what participants will do in this activity..."
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '2px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      boxSizing: 'border-box',
                      minHeight: '100px',
                      fontFamily: 'inherit',
                      transition: 'all 0.3s',
                      resize: 'vertical'
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#060030ff')}
                    onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                  />
                </div>

                {/* Duration and Points */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Duration (min)</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={editedActivity.duration || 15}
                      onChange={(e) => {
                        let value = parseInt(e.target.value) || 1;
                        if (value > 60) value = 60;
                        if (value < 1) value = 1;
                        setEditedActivity(prev => ({ ...prev, duration: value }));
                        setHasUnsavedChanges(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '2px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        boxSizing: 'border-box',
                        transition: 'all 0.3s'
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#060030ff')}
                      onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Points</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editedActivity.points?.total || 10}
                      onChange={(e) => {
                        let value = parseInt(e.target.value) || 0;
                        if (value > 100) value = 100;
                        if (value < 0) value = 0;
                        setEditedActivity(prev => ({ ...prev, points: { ...prev.points, total: value } }));
                        setHasUnsavedChanges(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '2px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        boxSizing: 'border-box',
                        transition: 'all 0.3s'
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#060030ff')}
                      onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                    />
                  </div>
                </div>

                {/* Code Section */}
                <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #E5E7EB' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Code Example (Optional)</label>
                  <textarea
                    value={editedActivity.code || ''}
                    onChange={(e) => {
                      setEditedActivity(prev => ({ ...prev, code: e.target.value || null }));
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Paste any code snippets or examples here..."
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '2px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '500',
                      boxSizing: 'border-box',
                      minHeight: '100px',
                      fontFamily: 'monospace',
                      backgroundColor: '#F9FAFB',
                      transition: 'all 0.3s'
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#060030ff')}
                    onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                  />
                </div>

                {/* Project Details */}
                <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #E5E7EB' }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: '0 0 12px 0' }}>Project Details (Optional)</p>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#888', display: 'block', marginBottom: '6px' }}>Project Title</label>
                    <input
                      type="text"
                      value={editedActivity.project?.title || ''}
                      onChange={(e) => setEditedActivity(prev => ({
                        ...prev,
                        project: { ...(prev.project || { description: '', workflow: [] }), title: e.target.value }
                      }))}
                      placeholder="e.g., Build a Fitness App"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#888', display: 'block', marginBottom: '6px' }}>Project Description</label>
                    <textarea
                      value={editedActivity.project?.description || ''}
                      onChange={(e) => setEditedActivity(prev => ({
                        ...prev,
                        project: { ...(prev.project || { title: '', workflow: [] }), description: e.target.value }
                      }))}
                      placeholder="Describe the project goals and deliverables..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        minHeight: '70px',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  {/* Project Workflow */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: '#888', display: 'block', marginBottom: '6px' }}>Project Timeline / Workflow Steps</label>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <input
                        type="text"
                        value={projectWorkflowInput}
                        onChange={(e) => setProjectWorkflowInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addProjectWorkflow()}
                        placeholder="e.g., Week 1: Design Phase"
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          border: '1px solid #E5E7EB',
                          borderRadius: '6px',
                          fontSize: '13px',
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        onClick={addProjectWorkflow}
                        style={{
                          padding: '10px 16px',
                          backgroundColor: '#060030ff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0a0040')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#060030ff')}
                      >
                        Add
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {editedActivity.project?.workflow?.map((step, idx) => (
                        <div key={idx} style={{
                          padding: '10px 12px',
                          backgroundColor: '#F0F9FF',
                          fontSize: '12px',
                          borderRadius: '6px',
                          border: '1px solid #BAE6FD',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '600', color: '#0369A1' }}>Step {idx + 1}:</span>
                            <span style={{ color: '#333' }}>{step}</span>
                          </div>
                          <button
                            onClick={() => removeProjectWorkflow(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '18px',
                              color: '#EF4444',
                              padding: 0
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Story Lines */}
                <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: '0 0 12px 0' }}>Story Lines</p>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                      type="text"
                      value={storyLineInput}
                      onChange={(e) => setStoryLineInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addStoryLine()}
                      placeholder="Add story line"
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
                        alignItems: 'center'
                      }}>
                        {line}
                        <button
                          onClick={() => removeStoryLine(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#3B82F6',
                            padding: 0
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
                      value={aiToolNameInput}
                      onChange={(e) => setAiToolNameInput(e.target.value)}
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
                              <span style={{color:'#000'}}>Link -</span> {tool.toolLink}
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

                {/* Instructions to Coach */}
                <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: '0 0 12px 0' }}>Instructions to Coach</p>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                      type="text"
                      value={instructionInput}
                      onChange={(e) => setInstructionInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addInstruction()}
                      placeholder="Add instruction"
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
                        alignItems: 'center'
                      }}>
                        {inst}
                        <button
                          onClick={() => removeInstruction(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: '#10B981',
                            padding: 0
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

                {/* Modal Action Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                  <button
                    onClick={() => {
                      setActivityModalOpen(false);
                      setEditedActivity(null);
                      setEditingActivityIndex(null);
                      setInstructionInput('');
                      setAiToolNameInput('');
                      setAiToolLinkInput('');
                      setAiToolPurposeInput('');
                      setProjectWorkflowInput('');
                      setStoryLineInput('');
                      setCriteriaInput('');
                    }}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      backgroundColor: '#F3F4F6',
                      color: '#111827',
                      border: '2px solid #E5E7EB',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#E5E7EB';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#F3F4F6';
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveActivity}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      background: 'linear-gradient(135deg, #060030ff 0%, #000000 100%)',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <CheckCircle2 size={16} /> Save Activity
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </Layout>
  );
};

export default EditSessionCard;
