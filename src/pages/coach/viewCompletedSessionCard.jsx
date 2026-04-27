import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { ChevronLeft, CheckCircle, Star, Clock, BookOpen, ArrowRight, Code, Wrench, Briefcase, BookMarked } from 'lucide-react';

const ViewSessionCard = () => {
  const { sessionId, id } = useParams();
  const cardId = sessionId || id; // Support both parameter names
  const navigate = useNavigate();
  const location = useLocation();
  const { userToken } = useStore();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedActivities, setExpandedActivities] = useState({});
  // Player data is fetched from session data but kept for backwards compatibility
  // eslint-disable-next-line no-unused-vars
  const [playerData, setPlayerData] = useState(null);

  useEffect(() => {
    const fetchSessionDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Session data should be passed through navigation state
        if (location.state?.session) {
          const sessionWithSortedActivities = {
            ...location.state.session,
            activities: (location.state.session.activities || []).sort((a, b) => {
              const seqA = a.activitySequence || 0;
              const seqB = b.activitySequence || 0;
              return seqA - seqB;
            })
          };
          
          setSessionData(sessionWithSortedActivities);
          if (location.state?.player) {
            setPlayerData(location.state.player);
          }
          setLoading(false);
          return;
        }

        // If no state data, show error - navigate back
        setError('Session data not found. Please select a session from your sessions list.');
        setLoading(false);

      } catch (err) {
        console.error('Error processing session details:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [cardId, userToken, location]);

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '40px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: '16px', color: '#64748B' }}>Loading session details...</p>
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
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px' }}>
        {/* Header with Back Button */}
        <div style={{ marginBottom: '24px' }}>
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
              color: '#111827',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#EFF6FF';
              e.currentTarget.style.borderColor = '#060030ff';
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
          background: 'linear-gradient(135deg, #ffffff, #dcfce79a)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
          border: '1.5px solid #000000',
          position: 'relative'
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
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#111827' }}>
              {sessionData.Topic || 'Session'}
            </h1>
            <BookMarked size={24} color="#000000" />
          </div>
          <p style={{ fontSize: '16px', color: '#64748B', margin: 0, marginBottom: '16px' }}>
            {sessionData.Objective || 'Session objective'}
          </p>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '16px' }}>
            {sessionData.session && (
              <div>
                <p style={{ fontSize: '11px', color: '#64748B', margin: 0, marginBottom: '4px' }}>Session Number</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000', margin: 0 }}>{sessionData.session}</p>
              </div>
            )}
            <div>
              <p style={{ fontSize: '11px', color: '#64748B', margin: 0, marginBottom: '4px' }}>Total Points</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000', margin: 0 }}>{sessionData.totalPoints || 0}</p>
            </div>
            {sessionData.SessionType && (
              <div>
                <p style={{ fontSize: '11px', color: '#64748B', margin: 0, marginBottom: '4px' }}>Session Type</p>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#000000', margin: 0, textTransform: 'capitalize' }}>
                  {sessionData.SessionType}
                </p>
              </div>
            )}
            <div>
              <p style={{ fontSize: '11px', color: '#64748B', margin: 0, marginBottom: '4px' }}>Activities</p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000', margin: 0 }}>
                {sessionData.activities?.length || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Activities with Feedback - READ ONLY */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 16px 0' }}>
            Activities & Feedback
          </h2>

          {sessionData.activities && sessionData.activities.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {sessionData.activities.map((activity, index) => (
                <div
                  key={index}
                  style={{
                    background: '#FFFFFF',
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
                      background: '#060030ff',
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
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }}>
                        {activity.activityTitle}
                      </h3>
                      <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                        {activity.description}
                      </p>
                    </div>
                    <span style={{
                      background: '#FDF2F8',
                      color: '#000000',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600'
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
                          background: '#ffffff',
                          borderRadius: '8px',
                          padding: '12px',
                          border: '1px solid #000000',
                          marginBottom: '12px'
                        }}>
                          <p style={{ fontSize: '11px', fontWeight: '700', color: '#000000', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Story/Narrative</p>
                          {activity.story.map((storyItem, idx) => {
                            const storyContent = typeof storyItem === 'string' ? storyItem : (storyItem.narrative || storyItem.content || '');
                            return storyContent ? (
                              <p key={idx} style={{ fontSize: '12px', color: '#000000', margin: idx < activity.story.length - 1 ? '0 0 8px 0' : 0, lineHeight: '1.5' }}>
                                {storyContent}
                              </p>
                            ) : null;
                          })}
                        </div>
                      )}

                      {/* Points & Evaluation Criteria */}
                      {activity.points && (
                        <div style={{
                          background: '#ffffff',
                          borderRadius: '8px',
                          padding: '12px',
                          border: '1px solid #000000',
                          marginBottom: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <p style={{ fontSize: '11px', fontWeight: '700', color: '#666666', margin: 0, textTransform: 'uppercase' }}>points earned</p>
                            <div style={{
                              background: 'linear-gradient(135deg, #000000 0%, #000000 100%)',
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
                              <p style={{ fontSize: '11px', fontWeight: '600', color: '#000000', margin: '0 0 6px 0', textTransform: 'uppercase' }}>Evaluation Criteria</p>
                              {activity.points.evaluationCriteria.map((criteria, idx) => (
                                <div key={idx} style={{ fontSize: '12px', color: '#000000', marginBottom: idx < activity.points.evaluationCriteria.length - 1 ? '4px' : 0, display: 'flex', gap: '6px' }}>
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
                              <p style={{ fontSize: '11px', fontWeight: '700', color: '#111827', margin: '0 0 6px 0', textTransform: 'uppercase' }}>Objectives</p>
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
                              <p style={{ fontSize: '11px', fontWeight: '700', color: '#111827', margin: '0 0 6px 0', textTransform: 'uppercase' }}>Resources</p>
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
                              <p style={{ fontSize: '11px', fontWeight: '700', color: '#111827', margin: '0 0 6px 0', textTransform: 'uppercase' }}>Expected Outcome</p>
                              <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>{activity.expectedOutcome}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Instructions to Coach */}
                      {activity.instructionsToCoach && activity.instructionsToCoach.length > 0 && (
                        <div style={{
                          background: '#ffffff',
                          borderRadius: '8px',
                          padding: '12px',
                          border: '1px solid #000000',
                          marginBottom: '12px'
                        }}>
                          <p style={{ fontSize: '11px', fontWeight: '700', color: '#000000', margin: '0 0 6px 0', textTransform: 'uppercase' }}>Instructions to Coach</p>
                          {activity.instructionsToCoach.map((instr, idx) => (
                            <div key={idx} style={{ fontSize: '12px', color: '#000000', marginBottom: '4px', display: 'flex', gap: '6px' }}>
                              <ArrowRight size={12} style={{ marginTop: '2px' }} />
                              <span>{instr}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Project Section */}
                      {activity.project && typeof activity.project === 'object' && (activity.project.title || activity.project.description || activity.project.workflow) && (
                        <div style={{
                          background: '#ffffff',
                          borderRadius: '8px',
                          padding: '12px',
                          border: '1px solid #000000',
                          marginBottom: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <Briefcase size={14} color="#000000" />
                            <p style={{ fontSize: '11px', fontWeight: '700', color: '#000000', margin: 0, textTransform: 'uppercase' }}>Project</p>
                          </div>
                          {activity.project.title && (
                            <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: '0 0 6px 0' }}>
                              {activity.project.title}
                            </p>
                          )}
                          {activity.project.description && (
                            <p style={{ fontSize: '12px', color: '#666666', margin: '0 0 8px 0', lineHeight: '1.4' }}>
                              {activity.project.description}
                            </p>
                          )}
                          {activity.project.workflow && activity.project.workflow.length > 0 && (
                            <div>
                              <p style={{ fontSize: '11px', fontWeight: '600', color: '#000000', margin: '0 0 6px 0' }}>Workflow Steps</p>
                              <ol style={{ margin: '0', paddingLeft: '16px', fontSize: '12px', color: '#666666' }}>
                                {activity.project.workflow.map((step, i) => (
                                  <li key={i} style={{ marginBottom: '4px', lineHeight: '1.4' }}>
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      )}

                      {/* AI Tools */}
                      {activity.aiTools && activity.aiTools.length > 0 && (
                        <div style={{
                          background: '#ffffff',
                          borderRadius: '8px',
                          padding: '12px',
                          border: '1px solid #000000',
                          marginBottom: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <Wrench size={14} color="#000000" />
                            <p style={{ fontSize: '11px', fontWeight: '700', color: '#000000', margin: 0, textTransform: 'uppercase' }}>AI Tools</p>
                          </div>
                          {activity.aiTools.map((tool, idx) => (
                            <div key={idx} style={{ fontSize: '12px', color: '#000000', marginBottom: '6px' }}>
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
                    background: '#ffffff',
                    borderRadius: '8px',
                    padding: '12px',
                    border: '1px solid #000000',
                    marginTop: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                      <Clock size={14} color="#000000" />
                      <p style={{ fontSize: '11px', fontWeight: '700', color: '#000000', margin: 0, textTransform: 'uppercase' }}>Feedback</p>
                    </div>

                    {activity.feedback || activity.rating ? (
                      <>
                        {activity.rating && (
                          <div style={{ marginBottom: '10px' }}>
                            <p style={{ fontSize: '11px', fontWeight: '600', color: '#000000', margin: '0 0 6px 0' }}>Rating</p>
                            <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                              {[...Array(5)].map((_, i) => (
                                <span key={i} style={{ fontSize: '16px', color: i < activity.rating ? '#FCD34D' : '#E5E7EB' }}>★</span>
                              ))}
                              <span style={{ fontSize: '11px', fontWeight: '600', color: '#000000', marginLeft: '6px' }}>
                                {activity.rating}/5
                              </span>
                            </div>
                          </div>
                        )}
                        {activity.feedback && (
                          <div>
                            <p style={{ fontSize: '11px', fontWeight: '600', color: '#000000', margin: '0 0 6px 0' }}>Comment</p>
                            <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
                              {activity.feedback}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p style={{ fontSize: '12px', color: '#A78BBA', margin: 0, fontStyle: 'italic' }}>No feedback added</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748B' }}>
              No activities found
            </div>
          )}
        </div>

        {/* Session Feedback - READ ONLY */}
        {(sessionData.feedback || sessionData.rating) && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 16px 0' }}>
              Overall Session Feedback
            </h2>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1.5px solid #E2E8F0',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}>
              {sessionData.rating && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#000000', margin: '0 0 8px 0' }}>
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
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginLeft: '8px' }}>
                      {sessionData.rating}/5
                    </span>
                  </div>
                </div>
              )}
              {sessionData.feedback && (
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#000000', margin: '0 0 8px 0' }}>
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
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 16px 0' }}>
              Key Takeaways
            </h2>
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1.5px solid #000000',
              padding: '16px'
            }}>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {sessionData.sessionTakeaways.map((takeaway, index) => (
                  <li key={index} style={{ fontSize: '13px', color: '#111827', marginBottom: '8px', lineHeight: '1.5' }}>
                    {takeaway}
                  </li>
                ))}
              </ul>
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
    </Layout>
  );
};

export default ViewSessionCard;
