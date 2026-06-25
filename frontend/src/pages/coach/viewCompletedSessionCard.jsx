import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/store';
import { useTheme } from '../../context/ThemeContext';
import { Layout } from '../../components/Layout';
import { ChevronLeft, CheckCircle, Star, Clock, BookOpen, ArrowRight, Code, Wrench, Briefcase, BookMarked } from 'lucide-react';

const ViewSessionCard = () => {
  const { sessionId, id } = useParams();
  const cardId = sessionId || id; // Support both parameter names
  const navigate = useNavigate();
  const location = useLocation();
  const { userToken } = useStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const surface   = dark ? 'var(--cl-surface)'   : '#FFFFFF';
  const surface2  = dark ? 'var(--cl-surface-2)' : '#F8FAFC';
  const border    = dark ? 'var(--cl-border)'    : '#E2E8F0';
  const textPri   = dark ? 'var(--cl-text)'      : '#0F172A';
  const textSec   = dark ? 'var(--cl-text-2)'    : '#475569';
  const textMuted = dark ? 'var(--cl-text-3)'    : '#64748B';

  const getToken = () => {
    const fresh = useStore.getState().userToken;
    if (fresh) return fresh;
    try {
      return JSON.parse(localStorage.getItem('coachlife_auth') || '{}').userToken || null;
    } catch { return null; }
  };
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedActivities, setExpandedActivities] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [playerData, setPlayerData] = useState(null);
  const [whatsFeedbackMessage, setWhatsFeedbackMessage] = useState('');
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);
  const [editingFeedbackText, setEditingFeedbackText] = useState('');
  const [isUpdatingFeedback, setIsUpdatingFeedback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const sortActivities = (acts) =>
      (acts || []).slice().sort((a, b) => (a.activitySequence || 0) - (b.activitySequence || 0));

    const fetchSessionDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fast path: session data passed through navigation state
        if (location.state?.session) {
          const sessionWithSortedActivities = {
            ...location.state.session,
            activities: sortActivities(location.state.session.activities),
          };
          setSessionData(sessionWithSortedActivities);
          if (sessionWithSortedActivities.Whatsapp_message) {
            setWhatsFeedbackMessage(sessionWithSortedActivities.Whatsapp_message);
          }
          if (location.state?.player) {
            setPlayerData(location.state.player);
          }
          setLoading(false);
          return;
        }

        if (!cardId) {
          setError('Session data not found. Please select a session from your sessions list.');
          setLoading(false);
          return;
        }

        // No navigation state (Past Sessions, deep link, or page reload): fetch by id.
        const token = getToken();
        const res = await fetch(
          'https://kyfkhl8v4l.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_View_Sessioncard',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token && { userToken: token }) },
            body: JSON.stringify({ sessionCardId: cardId }),
          }
        );
        if (!res.ok) throw new Error(`Failed to load session: ${res.status}`);

        let data = await res.json();
        if (data?.body && typeof data.body === 'string') { try { data = JSON.parse(data.body); } catch { data = null; } }
        const card = data && (data.sessionCard || data.data || data);
        const isCard = card && typeof card === 'object' &&
          (card.activities || card.Topic || card.status || card.session !== undefined || card.sessionCardId || card._id);

        if (cancelled) return;
        if (isCard) {
          setSessionData({ ...card, activities: sortActivities(card.activities) });
          if (card.Whatsapp_message) setWhatsFeedbackMessage(card.Whatsapp_message);
        } else {
          setError('Session data not found. Please select a session from your sessions list.');
        }
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Error processing session details:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchSessionDetails();
    return () => { cancelled = true; };
  }, [cardId, userToken, location]);

  const handleUpdateWhatsappMessage = async (updatedMessage) => {
    setIsUpdatingFeedback(true);
    const sessionCardId = sessionData._id || cardId;
    try {
      const token = getToken();
      const response = await fetch(
        'https://6idqgn4hg1.execute-api.ap-south-1.amazonaws.com/default/CL_Update_Whatsapp_Feedback',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'userToken': token, 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ whatsappMessage: updatedMessage, sessionCardId })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed: ${response.status}`);
      }

      setWhatsFeedbackMessage(updatedMessage);
      setEditingFeedbackId(null);
      setEditingFeedbackText('');
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsUpdatingFeedback(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '40px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: '16px', color: '#475569' }}>Loading session details...</p>
        </div>
      </Layout>
    );
  }

  if (error || !sessionData) {
    return (
      <Layout>
        <div style={{ padding: '40px 32px', maxWidth: '600px', margin: '40px auto' }}>
          <div style={{
            background: '#FEE2E2',
            border: '1.5px solid #FECACA',
            borderRadius: '10px',
            padding: '24px',
            color: '#DC2626'
          }}>
            <p style={{ margin: '0 0 16px 0', fontWeight: '600', fontSize: '15px' }}>Error</p>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px' }}>
              {error || 'Failed to load session details'}
            </p>
            <button
              onClick={() => navigate(-1)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#DC2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Go Back
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <style>{`
        @keyframes skPulse { 0%,100%{opacity:.5}50%{opacity:1} }
      `}</style>
      <div>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px' }}>
          {/* Header with Back Button + WhatsApp Button */}
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: '#F8FAFC',
                border: '1.5px solid #E2E8F0',
                borderRadius: '10px',
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#0F172A',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(99,102,241,0.1)';
                e.currentTarget.style.borderColor = '#6366F1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F8FAFC';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            >
              <ChevronLeft size={18} />
              Back
            </button>

          </div>

          {/* Session Header */}
          <div style={{
            background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
            borderRadius: '20px',
            padding: '32px',
            marginBottom: '32px',
            border: '1.5px solid rgba(255,255,255,0.15)',
            position: 'relative',
            color: 'white'
          }}>
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: '#10B981',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckCircle size={14} />
              Completed
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#FFFFFF' }}>
                {sessionData.Topic || 'Session'}
              </h1>
              <BookMarked size={24} color="rgba(255,255,255,0.8)" />
            </div>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)', margin: 0, marginBottom: '16px' }}>
              {sessionData.Objective || 'Session objective'}
            </p>

            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '16px' }}>
              {sessionData.session && (
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px 16px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', margin: 0, marginBottom: '4px', textTransform: 'uppercase' }}>Session Number</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFFFFF', margin: 0 }}>{sessionData.session}</p>
                </div>
              )}
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px 16px' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', margin: 0, marginBottom: '4px', textTransform: 'uppercase' }}>Total Points</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFFFFF', margin: 0 }}>{sessionData.totalPoints || 0}</p>
              </div>
              {sessionData.SessionType && (
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px 16px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', margin: 0, marginBottom: '4px', textTransform: 'uppercase' }}>Session Type</p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#FFFFFF', margin: 0, textTransform: 'capitalize' }}>
                    {sessionData.SessionType}
                  </p>
                </div>
              )}
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px 16px' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', margin: 0, marginBottom: '4px', textTransform: 'uppercase' }}>Activities</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFFFFF', margin: 0 }}>
                  {sessionData.activities?.length || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Activities with Feedback - READ ONLY */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0F172A', margin: '0 0 16px 0' }}>
              Activities & Feedback
            </h2>

            {sessionData.activities && sessionData.activities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {sessionData.activities.map((activity, index) => (
                  <div
                    key={index}
                    style={{
                      background: surface,
                      borderRadius: '12px',
                      border: '1.5px solid #E2E8F0',
                      padding: '20px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    {/* Activity Header */}
                    <div
                      onClick={() => setExpandedActivities(prev => ({
                        ...prev,
                        [index]: !prev[index]
                      }))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '8px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F8FAFC';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        background: '#6366F1',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        flexShrink: 0
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', color: textPri, margin: '0 0 4px 0' }}>
                          {activity.activityTitle}
                        </h3>
                        <p style={{
                          fontSize: '13px', color: textSec, margin: 0, lineHeight: '1.5',
                          display: expandedActivities[index] ? 'block' : '-webkit-box',
                          WebkitLineClamp: expandedActivities[index] ? 'unset' : 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {(activity.description || '').replace(/<[^>]+>/g, '')}
                        </p>
                      </div>
                      <span style={{
                        background: dark ? 'rgba(99,102,241,0.18)' : '#EEF2FF',
                        color: dark ? '#A5B4FC' : '#4338CA',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        flexShrink: 0
                      }}>
                        {activity.points?.total || 0} pts
                      </span>
                    </div>

                    {/* Activity Expanded Details */}
                    {expandedActivities[index] && (
                      <div style={{
                        marginTop: '16px',
                        paddingTop: '16px',
                        borderTop: '1px solid #E2E8F0'
                      }}>
                        {/* Story/Narrative Section */}
                        {activity.story && activity.story.length > 0 && (
                          <div style={{
                            background: surface2,
                            borderRadius: '8px',
                            padding: '12px',
                            border: `1px solid ${border}`,
                            marginBottom: '12px'
                          }}>
                            <p style={{ fontSize: '11px', fontWeight: '700', color: textPri, margin: '0 0 8px 0', textTransform: 'uppercase' }}>Story/Narrative</p>
                            {activity.story.map((storyItem, idx) => {
                              const storyContent = typeof storyItem === 'string' ? storyItem : (storyItem.narrative || storyItem.content || '');
                              return storyContent ? (
                                <div key={idx} style={{ fontSize: '12px', color: textPri, margin: idx < activity.story.length - 1 ? '0 0 8px 0' : 0, lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: storyContent }} />
                              ) : null;
                            })}
                          </div>
                        )}

                        {/* Points & Evaluation Criteria */}
                        {activity.points && (
                          <div style={{
                            background: surface2,
                            borderRadius: '8px',
                            padding: '12px',
                            border: `1px solid ${border}`,
                            marginBottom: '12px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                              <p style={{ fontSize: '11px', fontWeight: '700', color: textSec, margin: 0, textTransform: 'uppercase' }}>points earned</p>
                              <div style={{
                                background: 'linear-gradient(135deg, #060030, #1a0080)',
                                borderRadius: '5px',
                                padding: '5px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <Star size={11} color="#FFFFFF" />
                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#FFFFFF' }}>{activity.points.total}</span>
                              </div>
                            </div>
                            {activity.points.evaluationCriteria && activity.points.evaluationCriteria.length > 0 && (
                              <div>
                                <p style={{ fontSize: '11px', fontWeight: '600', color: textPri, margin: '0 0 6px 0', textTransform: 'uppercase' }}>Evaluation Criteria</p>
                                {activity.points.evaluationCriteria.map((criteria, idx) => (
                                  <div key={idx} style={{ fontSize: '12px', color: textPri, marginBottom: idx < activity.points.evaluationCriteria.length - 1 ? '4px' : 0, display: 'flex', gap: '6px' }}>
                                    <span>✓</span>
                                    <span>{criteria}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Learning Details Grid */}
                        {(activity.objectives || activity.resources || activity.expectedOutcome) && (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                            gap: '12px',
                            marginBottom: '12px'
                          }}>
                            {activity.objectives && activity.objectives.length > 0 && (
                              <div style={{
                                background: '#F8FAFC',
                                borderRadius: '8px',
                                padding: '12px',
                                border: '1px solid #E2E8F0'
                              }}>
                                <p style={{ fontSize: '11px', fontWeight: '700', color: '#0F172A', margin: '0 0 6px 0', textTransform: 'uppercase' }}>Objectives</p>
                                {activity.objectives.map((obj, idx) => (
                                  <div key={idx} style={{ fontSize: '12px', color: '#475569', marginBottom: '4px', display: 'flex', gap: '6px' }}>
                                    <span>•</span>
                                    <span>{obj}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {activity.resources && activity.resources.length > 0 && (
                              <div style={{
                                background: '#F8FAFC',
                                borderRadius: '8px',
                                padding: '12px',
                                border: '1px solid #E2E8F0'
                              }}>
                                <p style={{ fontSize: '11px', fontWeight: '700', color: '#0F172A', margin: '0 0 6px 0', textTransform: 'uppercase' }}>Resources</p>
                                {activity.resources.map((res, idx) => (
                                  <div key={idx} style={{ fontSize: '12px', color: '#475569', marginBottom: '4px', display: 'flex', gap: '6px' }}>
                                    <span></span>
                                    <span>{res}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {activity.expectedOutcome && (
                              <div style={{
                                background: '#F8FAFC',
                                borderRadius: '8px',
                                padding: '12px',
                                border: '1px solid #E2E8F0'
                              }}>
                                <p style={{ fontSize: '11px', fontWeight: '700', color: '#0F172A', margin: '0 0 6px 0', textTransform: 'uppercase' }}>Expected Outcome</p>
                                <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>{activity.expectedOutcome}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Instructions to Coach */}
                        {activity.instructionsToCoach && activity.instructionsToCoach.length > 0 && (
                          <div style={{
                            background: surface2,
                            borderRadius: '8px',
                            padding: '12px',
                            border: `1px solid ${border}`,
                            marginBottom: '12px'
                          }}>
                            <p style={{ fontSize: '11px', fontWeight: '700', color: textPri, margin: '0 0 6px 0', textTransform: 'uppercase' }}>Instructions to Coach</p>
                            {activity.instructionsToCoach.map((instr, idx) => (
                              <div key={idx} style={{ fontSize: '12px', color: textPri, marginBottom: '4px', display: 'flex', gap: '6px' }}>
                                <ArrowRight size={12} style={{ marginTop: '2px' }} />
                                <div dangerouslySetInnerHTML={{ __html: instr }} />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Project Section */}
                        {activity.project && typeof activity.project === 'object' && (activity.project.title || activity.project.description || activity.project.workflow) && (
                          <div style={{
                            background: surface2,
                            borderRadius: '8px',
                            padding: '12px',
                            border: `1px solid ${border}`,
                            marginBottom: '12px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                              <Briefcase size={14} color={textPri} />
                              <p style={{ fontSize: '11px', fontWeight: '700', color: textPri, margin: 0, textTransform: 'uppercase' }}>Project</p>
                            </div>
                            {activity.project.title && (
                              <p style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', margin: '0 0 6px 0' }}>
                                {activity.project.title}
                              </p>
                            )}
                            {activity.project.description && (
                              <div style={{ fontSize: '12px', color: textSec, margin: '0 0 8px 0', lineHeight: '1.4' }} dangerouslySetInnerHTML={{ __html: activity.project.description }} />
                            )}
                            {activity.project.workflow && activity.project.workflow.length > 0 && (
                              <div>
                                <p style={{ fontSize: '11px', fontWeight: '600', color: textPri, margin: '0 0 6px 0' }}>Workflow Steps</p>
                                <ol style={{ margin: '0', paddingLeft: '16px', fontSize: '12px', color: textSec }}>
                                  {activity.project.workflow.map((step, i) => (
                                    <li key={i} style={{ marginBottom: '4px', lineHeight: '1.4' }} dangerouslySetInnerHTML={{ __html: step }}></li>
                                  ))}
                                </ol>
                              </div>
                            )}
                          </div>
                        )}

                        {/* AI Tools */}
                        {activity.aiTools && activity.aiTools.length > 0 && (
                          <div style={{
                            background: surface2,
                            borderRadius: '8px',
                            padding: '12px',
                            border: `1px solid ${border}`,
                            marginBottom: '12px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                              <Wrench size={14} color={textPri} />
                              <p style={{ fontSize: '11px', fontWeight: '700', color: textPri, margin: 0, textTransform: 'uppercase' }}>AI Tools</p>
                            </div>
                            {activity.aiTools.map((tool, idx) => (
                              <div key={idx} style={{ fontSize: '12px', color: textPri, marginBottom: '6px' }}>
                                <strong>{tool.toolName}</strong> - {tool.usagePurpose}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Code Section */}
                        {activity.code && (activity.code.content || typeof activity.code === 'string') && (
                          <div style={{
                            background: '#000000',
                            borderRadius: '8px',
                            padding: '12px',
                            border: '1px solid #374151',
                            marginBottom: '12px',
                            overflow: 'auto',
                            maxHeight: '400px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                              <Code size={14} color="#E5E7EB" />
                              <p style={{ fontSize: '11px', fontWeight: '700', color: '#E5E7EB', margin: 0 }}>
                                CODE {activity.code.language ? `(${activity.code.language})` : ''}
                              </p>
                            </div>
                            <pre style={{
                              fontSize: '11px',
                              color: '#119200',
                              margin: 0,
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}>
                              {activity.code.content || activity.code}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Activity Feedback - DISPLAY ONLY (no edit button) */}
                    <div style={{
                      background: surface2,
                      borderRadius: '8px',
                      padding: '12px',
                      border: `1px solid ${border}`,
                      marginTop: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                        <Clock size={14} color={textPri} />
                        <p style={{ fontSize: '11px', fontWeight: '700', color: textPri, margin: 0, textTransform: 'uppercase' }}>Feedback</p>
                      </div>

                      {activity.feedback || activity.rating ? (
                        <>
                          {activity.rating && (
                            <div style={{ marginBottom: '10px' }}>
                              <p style={{ fontSize: '11px', fontWeight: '600', color: textPri, margin: '0 0 6px 0' }}>Rating</p>
                              <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                                {[...Array(5)].map((_, i) => (
                                  <span key={i} style={{ fontSize: '16px', color: i < activity.rating ? '#FCD34D' : '#E5E7EB' }}>★</span>
                                ))}
                                <span style={{ fontSize: '11px', fontWeight: '600', color: textPri, marginLeft: '6px' }}>
                                  {activity.rating}/5
                                </span>
                              </div>
                            </div>
                          )}
                          {activity.feedback && (
                            <div>
                              <p style={{ fontSize: '11px', fontWeight: '600', color: textPri, margin: '0 0 6px 0' }}>Comment</p>
                              <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
                                {activity.feedback}
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <p style={{ fontSize: '12px', color: textMuted, margin: 0, fontStyle: 'italic' }}>No feedback added</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#475569' }}>
                No activities found
              </div>
            )}
          </div>

          {/* Session Feedback - READ ONLY */}
          {(sessionData.feedback || sessionData.rating) && (
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0F172A', margin: '0 0 16px 0' }}>
                Overall Session Feedback
              </h2>
              <div style={{
                background: surface,
                borderRadius: '12px',
                border: '1.5px solid #E2E8F0',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}>
                {sessionData.rating && (
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: textPri, margin: '0 0 8px 0' }}>
                      Rating
                    </p>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={20}
                          style={{
                            fill: i < sessionData.rating ? '#FCD34D' : '#E5E7EB',
                            color: i < sessionData.rating ? '#FCD34D' : '#E5E7EB'
                          }}
                        />
                      ))}
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A', marginLeft: '8px' }}>
                        {sessionData.rating}/5
                      </span>
                    </div>
                  </div>
                )}
                {sessionData.feedback && (
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: textPri, margin: '0 0 8px 0' }}>
                      Feedback
                    </p>
                    <p style={{ fontSize: '14px', color: '#475569', margin: 0, lineHeight: '1.6' }}>
                      {sessionData.feedback}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Takeaways */}
          {sessionData.sessionTakeaways && sessionData.sessionTakeaways.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0F172A', margin: '0 0 16px 0' }}>
                Key Takeaways
              </h2>
              <div style={{
                background: surface2,
                borderRadius: '12px',
                border: `1.5px solid ${border}`,
                padding: '16px'
              }}>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {sessionData.sessionTakeaways.map((takeaway, index) => (
                    <li key={index} style={{ fontSize: '13px', color: '#0F172A', marginBottom: '8px', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: takeaway }}></li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* What's Feedback Section */}
          {whatsFeedbackMessage && (
            <div id="whats-feedback-section-view" style={{
              background: surface,
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              marginBottom: '32px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #1D4ED8, #1E40AF)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <BookMarked size={18} color="white" />
                <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'white', margin: 0 }}>
                  WhatsApp Message
                </h2>
              </div>

              <div style={{ padding: '20px' }}>
                {editingFeedbackId === 'whatsapp' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <textarea
                      value={editingFeedbackText}
                      onChange={(e) => setEditingFeedbackText(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '160px',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1.5px solid #1D4ED8',
                        fontFamily: 'inherit',
                        fontSize: '13px',
                        color: '#374151',
                        lineHeight: '1.7',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        boxShadow: '0 0 0 3px rgba(29,78,216,0.1)'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(editingFeedbackText);
                          alert('Message copied!');
                        }}
                        style={{
                          padding: '8px 16px',
                          background: '#F3F4F6',
                          color: '#374151',
                          border: '1px solid #E5E7EB',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#E5E7EB'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#F3F4F6'}
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => { setEditingFeedbackId(null); setEditingFeedbackText(''); }}
                        style={{
                          padding: '8px 16px',
                          background: '#F3F4F6',
                          color: '#6B7280',
                          border: '1px solid #E5E7EB',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#E5E7EB'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#F3F4F6'}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateWhatsappMessage(editingFeedbackText)}
                        disabled={isUpdatingFeedback}
                        style={{
                          padding: '8px 16px',
                          background: isUpdatingFeedback ? '#94A3B8' : 'linear-gradient(135deg, #1D4ED8, #1E40AF)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: isUpdatingFeedback ? 'not-allowed' : 'pointer'
                        }}
                        onMouseEnter={(e) => { if (!isUpdatingFeedback) e.currentTarget.style.background = 'linear-gradient(135deg, #1E40AF, #1D4ED8)'; }}
                        onMouseLeave={(e) => { if (!isUpdatingFeedback) e.currentTarget.style.background = 'linear-gradient(135deg, #1D4ED8, #1E40AF)'; }}
                      >
                        {isUpdatingFeedback ? 'Updating...' : 'Update'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{
                      fontSize: '13px',
                      color: '#374151',
                      margin: '0 0 16px 0',
                      lineHeight: '1.7',
                      whiteSpace: 'pre-wrap',
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: '8px',
                      padding: '16px'
                    }}>
                      {whatsFeedbackMessage}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          setEditingFeedbackId('whatsapp');
                          setEditingFeedbackText(whatsFeedbackMessage);
                        }}
                        style={{
                          padding: '8px 16px',
                          background: 'linear-gradient(135deg, #1D4ED8, #1E40AF)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #1E40AF, #1D4ED8)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #1D4ED8, #1E40AF)'}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Close Button - ONLY BUTTON */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            marginBottom: '32px'
          }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                padding: '12px 24px',
                background: '#E5E7EB',
                color: '#475569',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#D1D5DB';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(107, 114, 128, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#E5E7EB';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ViewSessionCard;
