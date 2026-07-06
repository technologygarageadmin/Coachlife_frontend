import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import RichTextEditor from '../../components/RichTextEditor';
import { AlertCircle } from 'lucide-react';

const defaultActivity = (sequence = 1) => ({
  activitySequence: sequence,
  activityTitle: '',
  description: '',
  duration: 0,
  story: null,
  instructionsToCoach: [],
  project: null,
  code: null,
  aiTools: [],
  points: { total: 0, evaluationCriteria: [] }
});

const ActivityEditor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { returnFormData, isCustomPathway, activityIndex, activity, returnPath, editedPathway } = location.state || {};
  const backPath = returnPath || '/admin/learning-pathway/add';

  const [editedActivity, setEditedActivity] = useState(activity || defaultActivity());
  const [aiToolInput, setAiToolInput] = useState('');
  const [aiToolLinkInput, setAiToolLinkInput] = useState('');
  const [criteriaInput, setCriteriaInput] = useState('');
  const [error, setError] = useState('');

  const descriptionEditorRef = useRef(null);
  const projectDescEditorRef = useRef(null);
  const instructionEditorRef = useRef(null);
  const storyEditorRef = useRef(null);
  const workflowEditorRef = useRef(null);

  useEffect(() => {
    if (!location.state) {
      navigate(backPath);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (descriptionEditorRef.current) {
        descriptionEditorRef.current.innerHTML = activity?.description || '';
      }
      if (projectDescEditorRef.current) {
        projectDescEditorRef.current.innerHTML = activity?.project?.description || '';
      }
      if (instructionEditorRef.current) instructionEditorRef.current.innerHTML = '';
      if (storyEditorRef.current) storyEditorRef.current.innerHTML = '';
      if (workflowEditorRef.current) workflowEditorRef.current.innerHTML = '';
    }, 0);
    return () => clearTimeout(timer);
  }, []);

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

  const handleSave = () => {
    if (!editedActivity.activityTitle.trim()) {
      setError('Activity title is required');
      return;
    }

    const description = descriptionEditorRef.current?.innerHTML || editedActivity.description;
    const projectDesc = projectDescEditorRef.current?.innerHTML || editedActivity.project?.description;
    const activityToSave = {
      ...editedActivity,
      description,
      project: editedActivity.project
        ? { ...editedActivity.project, description: projectDesc }
        : editedActivity.project
    };

    const currentActivities = [...(returnFormData?.activities || [])];
    if (activityIndex !== null && activityIndex !== undefined) {
      currentActivities[activityIndex] = activityToSave;
    } else {
      currentActivities.push(activityToSave);
    }

    navigate(backPath, {
      state: {
        // Preserve any caller-specific context (e.g. customCardGenerate's player/batch
        // info) round-trip - only returnFormData actually changes here.
        ...location.state,
        returnFormData: { ...returnFormData, activities: currentActivities },
        isCustomPathway,
        editedPathway
      }
    });
  };

  const handleCancel = () => {
    navigate(backPath, {
      state: { ...location.state, returnFormData, isCustomPathway, editedPathway }
    });
  };

  const isEditing = activityIndex !== null && activityIndex !== undefined;
  const displayIndex = isEditing ? activityIndex + 1 : (returnFormData?.activities?.length || 0) + 1;

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
    transition: 'all 0.2s'
  };

  const focusStyle = (e) => {
    e.target.style.borderColor = '#060030ff';
    e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
  };

  const blurStyle = (e) => {
    e.target.style.borderColor = '#e5e7eb';
    e.target.style.boxShadow = 'none';
  };

  return (
    <Layout>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 32px' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
          color: 'white',
          padding: '40px 32px',
          marginBottom: '32px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 8px 32px rgba(37, 44, 53, 0.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>
                {isEditing ? `Edit Activity ${displayIndex}` : `Add Activity ${displayIndex}`}
              </h1>
              <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
                {returnFormData?.Topic ? `Session: ${returnFormData.Topic}` : 'Fill in the activity details below'}
              </p>
            </div>
            <button
              onClick={handleCancel}
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
                cursor: 'pointer'
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
              Back to Session
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

          {/* Basic Info */}
          <div style={{ marginBottom: '28px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Activity Title *</label>
            <input
              type="text"
              value={editedActivity.activityTitle}
              onChange={(e) => {
                setError('');
                setEditedActivity(prev => ({ ...prev, activityTitle: e.target.value }));
              }}
              placeholder="e.g., Warm-Up: Discovering Smart Technology"
              style={inputStyle}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Description *</label>
            <RichTextEditor ref={descriptionEditorRef} placeholder="Describe the activity..." minHeight="100px" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Duration (Minutes) *</label>
              <input
                type="number"
                value={editedActivity.duration || ''}
                onChange={(e) => setEditedActivity(prev => ({
                  ...prev,
                  duration: e.target.value ? parseInt(e.target.value) : ''
                }))}
                placeholder="e.g., 15"
                step="1"
                min="0"
                style={inputStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Total Points</label>
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
                style={inputStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Code (Optional)</label>
            <textarea
              value={editedActivity.code || ''}
              onChange={(e) => setEditedActivity(prev => ({ ...prev, code: e.target.value || null }))}
              placeholder="Enter code snippet or example for this activity..."
              style={{
                ...inputStyle,
                minHeight: '120px',
                fontFamily: 'monospace',
                background: '#F9FAFB'
              }}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

          {/* Instructions to Coach */}
          <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', margin: '0 0 12px 0' }}>Instructions to Coach</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <RichTextEditor
                  ref={instructionEditorRef}
                  placeholder="Add instruction"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addInstruction(); } }}
                  minHeight="36px"
                />
              </div>
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
                  padding: '10px 12px', background: '#F0FDF4', borderRadius: '8px',
                  border: '1px solid #DCFCE7', display: 'flex', gap: '10px', alignItems: 'flex-start'
                }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10B981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', flexShrink: 0, marginTop: '1px' }}>
                    {idx + 1}
                  </div>
                  <span dangerouslySetInnerHTML={{ __html: inst }} style={{ flex: 1, fontSize: '13px', color: '#111827', lineHeight: '1.6' }} />
                  <button onClick={() => removeInstruction(idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', color: '#10B981', padding: 0, flexShrink: 0, lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Story Lines */}
          <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', margin: '0 0 12px 0' }}>Story Lines</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <RichTextEditor
                  ref={storyEditorRef}
                  placeholder="Add story line"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addStoryLine(); } }}
                  minHeight="36px"
                />
              </div>
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
                  padding: '10px 12px', background: '#EFF6FF', borderRadius: '8px',
                  border: '1px solid #DBEAFE', display: 'flex', gap: '10px', alignItems: 'flex-start'
                }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#3B82F6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', flexShrink: 0, marginTop: '1px' }}>
                    {idx + 1}
                  </div>
                  <span dangerouslySetInnerHTML={{ __html: line }} style={{ flex: 1, fontSize: '13px', color: '#111827', lineHeight: '1.6' }} />
                  <button onClick={() => removeStoryLine(idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', color: '#3B82F6', padding: 0, flexShrink: 0, lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Project Details */}
          <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', margin: '0 0 16px 0' }}>Project Details (Optional)</p>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Project Title</label>
              <input
                type="text"
                value={editedActivity.project?.title || ''}
                onChange={(e) => setEditedActivity(prev => ({
                  ...prev,
                  project: { ...(prev.project || { description: '', workflow: [] }), title: e.target.value }
                }))}
                placeholder="e.g., Build a Smart Home System"
                style={{ ...inputStyle, fontSize: '13px' }}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Project Description</label>
              <RichTextEditor ref={projectDescEditorRef} placeholder="Describe the project objectives and outcomes..." minHeight="70px" />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Project Workflow Steps</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <RichTextEditor
                    ref={workflowEditorRef}
                    placeholder="Add workflow step"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addProjectWorkflow(); } }}
                    minHeight="36px"
                  />
                </div>
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
                    padding: '10px 12px', background: '#E0E7FF', borderRadius: '8px',
                    border: '1px solid #C7D2FE', display: 'flex', gap: '10px', alignItems: 'flex-start'
                  }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#4F46E5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', flexShrink: 0, marginTop: '1px' }}>
                      {idx + 1}
                    </div>
                    <span style={{ color: '#111827', fontSize: '12px', flex: 1, lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: step }} />
                    <button onClick={() => removeProjectWorkflow(idx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', color: '#6366F1', padding: 0, flexShrink: 0, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Tools */}
          <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', margin: '0 0 12px 0' }}>AI Tools Used</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                value={aiToolInput}
                onChange={(e) => setAiToolInput(e.target.value)}
                placeholder="Tool name (e.g., ChatGPT)"
                style={{ ...inputStyle, fontSize: '13px' }}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
              <input
                type="text"
                value={aiToolLinkInput}
                onChange={(e) => setAiToolLinkInput(e.target.value)}
                placeholder="Tool link (e.g., https://...)"
                style={{ ...inputStyle, fontSize: '13px' }}
                onFocus={focusStyle}
                onBlur={blurStyle}
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
                  fontSize: '13px',
                  borderRadius: '4px',
                  border: '1px solid #FCD34D',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#111827' }}>{tool.toolName}</p>
                    {tool.toolLink && (
                      <a
                        href={tool.toolLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '11px', color: '#3B82F6', textDecoration: 'none', display: 'block', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {tool.toolLink}
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => removeAiTool(idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', color: '#F59E0B', padding: 0, flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Evaluation Criteria */}
          <div style={{ marginBottom: '28px' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase', margin: '0 0 12px 0' }}>Evaluation Criteria</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                value={criteriaInput}
                onChange={(e) => setCriteriaInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCriteria()}
                placeholder="Add evaluation criteria"
                style={{ ...inputStyle, fontSize: '13px' }}
                onFocus={focusStyle}
                onBlur={blurStyle}
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
                  padding: '10px 12px', background: '#FEF2F2', borderRadius: '8px',
                  border: '1px solid #FECACA', display: 'flex', gap: '10px', alignItems: 'flex-start'
                }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#EF4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', flexShrink: 0, marginTop: '1px' }}>
                    {idx + 1}
                  </div>
                  <span style={{ flex: 1, fontSize: '13px', color: '#111827', lineHeight: '1.6' }}>{criteria}</span>
                  <button
                    onClick={() => removeCriteria(idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', color: '#DC2626', padding: 0, flexShrink: 0, lineHeight: 1 }}
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
              onClick={handleCancel}
              style={{
                padding: '10px 28px',
                background: '#f3f4f6',
                color: '#111827',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e5e7eb'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '10px 28px',
                background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              {isEditing ? 'Save Changes' : 'Save Activity'}
            </button>
          </div>
        </Card>

        <style>{`
          [contenteditable][data-placeholder]:empty:before {
            content: attr(data-placeholder);
            color: #9CA3AF;
            pointer-events: none;
          }
        `}</style>
      </div>
    </Layout>
  );
};

export default ActivityEditor;
