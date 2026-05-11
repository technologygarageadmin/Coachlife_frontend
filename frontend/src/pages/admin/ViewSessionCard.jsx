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

        // Session data is always passed through navigation state from SessionCardManage
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

        // If no state data, show error - navigate back to SessionCardManage
        setError('Session data not found. Please select a session from the list.');
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
              onClick={() => navigate('/admin/session-card')}
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
              Back to Session Cards
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 32px' }}>
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: '#060030ff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            padding: '0 0 20px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <ChevronLeft size={18} />
          Back to Session Cards
        </button>

        {/* Session Header Card */}
        <div style={{
          background: 'linear-gradient(135deg, #060030ff 0%, #1a003a 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '32px',
          marginBottom: '32px'
        }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 12px 0' }}>
            {sessionData.Topic || 'Session Card'}
          </h1>
          <p style={{ fontSize: '15px', opacity: 0.9, margin: '0 0 24px 0', lineHeight: '1.6' }}>
            {sessionData.Objective || 'Session objective'}
          </p>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
            {sessionData.activities && (
              <div>
                <p style={{ fontSize: '12px', opacity: 0.8, margin: '0 0 6px 0' }}>ACTIVITIES</p>
                <p style={{ fontSize: '26px', fontWeight: '700', margin: 0 }}>
                  {sessionData.activities.length}
                </p>
              </div>
            )}
            <div>
              <p style={{ fontSize: '12px', opacity: 0.8, margin: '0 0 6px 0' }}>TOTAL POINTS</p>
              <p style={{ fontSize: '26px', fontWeight: '700', margin: 0 }}>
                {sessionData.totalPoints || 0}
              </p>
            </div>
            {sessionData.SessionType && (
              <div>
                <p style={{ fontSize: '12px', opacity: 0.8, margin: '0 0 6px 0' }}>TYPE</p>
                <p style={{ fontSize: '15px', fontWeight: '600', margin: 0, textTransform: 'capitalize' }}>
                  {sessionData.SessionType}
                </p>
              </div>
            )}
            {sessionData.status && (
              <div>
                <p style={{ fontSize: '12px', opacity: 0.8, margin: '0 0 6px 0' }}>STATUS</p>
                <p style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  margin: 0, 
                  textTransform: 'capitalize',
                  background: 'rgba(255,255,255,0.2)',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  display: 'inline-block'
                }}>
                  {sessionData.status}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Activities Section */}
        {sessionData.activities && sessionData.activities.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 16px 0' }}>
              Activities
            </h2>

            {/* Indication message when no activities expanded */}
            {!Object.values(expandedActivities).some(v => v) && (
              <div style={{
                background: 'linear-gradient(135deg, #060030ff 0%, #1a003a 100%)',
                border: '2px solid #060030ff',
                borderRadius: '8px',
                padding: '14px 16px',
                marginBottom: '12px',
                fontSize: '13px',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 0 15px rgba(6, 0, 48, 0.2)',
              }}>
                <span style={{ fontWeight: '600' }}>Click on any activity to view more details</span>
              </div>
            )}

            {/* Activities Container with Overlay */}
            <div style={{ position: 'relative' }}>
              {/* Overlay when no activities expanded */}
              {!Object.values(expandedActivities).some(v => v) && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(6, 0, 48, 0.15)',
                  borderRadius: '10px',
                  pointerEvents: 'none',
                  zIndex: 5,
                }} />
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sessionData.activities.map((activity, index) => (
                  <div
                    key={index}
                    onClick={() => setExpandedActivities(prev => ({
                      ...prev,
                      [index]: !prev[index]
                    }))}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '10px',
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F9FAFB';
                      e.currentTarget.style.borderColor = '#060030ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#E5E7EB';
                    }}
                  >
                    {/* Activity Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      background: '#060030ff',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '700',
                      fontSize: '14px',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      {index + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }}>
                        {activity.activityTitle}
                      </h3>
                      <p style={{ fontSize: '13px', color: '#6B7280', margin: '0' }}>
                        {(activity.description || '').replace(/<[^>]+>/g, '').substring(0, 80)}...
                      </p>
                    </div>
                    <div style={{
                      background: '#F0F9FF',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#0369A1',
                      whiteSpace: 'nowrap'
                    }}>
                      {activity.points?.total || 0} pts
                    </div>
                  </div>

                  {/* Activity Details (Expandable) */}
                  {expandedActivities[index] && (
                    <div style={{
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: '1px solid #E5E7EB'
                    }}>
                      {/* Description */}
                      {activity.description && (
                        <div style={{ marginBottom: '12px' }}>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', margin: '0 0 6px 0' }}>Description</p>
                          <div style={{ fontSize: '13px', color: '#475569', margin: '0', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: activity.description }} />
                        </div>
                      )}

                      {/* Duration */}
                      {activity.duration && Number(activity.duration) > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', margin: '0 0 4px 0' }}>Duration</p>
                          <p style={{ fontSize: '13px', color: '#475569', margin: '0' }}>{activity.duration} minutes</p>
                        </div>
                      )}

                      {/* Evaluation Criteria */}
                      {activity.points?.evaluationCriteria && activity.points.evaluationCriteria.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', margin: '0 0 6px 0' }}>Evaluation Criteria</p>
                          <ul style={{ margin: '0', paddingLeft: '20px' }}>
                            {activity.points.evaluationCriteria.map((criteria, idx) => (
                              <li key={idx} style={{ fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
                                {criteria}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Story Lines */}
                      {activity.story && activity.story.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', margin: '0 0 6px 0' }}>Story</p>
                          {activity.story.map((line, idx) => (
                            <div key={idx} style={{ fontSize: '13px', color: '#475569', margin: '0 0 4px 0', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: line }} />
                          ))}
                        </div>
                      )}

                      {/* Project */}
                      {activity.project && (typeof activity.project === 'object' && (activity.project.title || activity.project.description)) && (
                        <div style={{ marginBottom: '12px' }}>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', margin: '0 0 6px 0' }}>Project</p>
                          {activity.project.title && (
                            <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }}>
                              {activity.project.title}
                            </p>
                          )}
                          {activity.project.description && (
                            <div style={{ fontSize: '13px', color: '#475569', margin: '0 0 6px 0', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: activity.project.description }} />
                          )}
                          {activity.project.workflow && activity.project.workflow.length > 0 && (
                            <div>
                              <p style={{ fontSize: '11px', fontWeight: '600', color: '#666', margin: '0 0 4px 0' }}>Workflow Steps</p>
                              <ol style={{ margin: '0', paddingLeft: '16px', fontSize: '12px', color: '#475569' }}>
                                {activity.project.workflow.map((step, i) => (
                                  <li key={i} style={{ marginBottom: '2px' }} dangerouslySetInnerHTML={{ __html: step }}></li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      )}

                      {/* AI Tools */}
                      {activity.aiTools && activity.aiTools.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', margin: '0 0 6px 0' }}>🤖 AI Tools</p>
                          {activity.aiTools.map((tool, idx) => (
                            <div key={idx} style={{ fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
                              <strong>{tool.toolName}</strong>
                              {tool.usagePurpose && <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0 0' }}>→ {tool.usagePurpose}</p>}
                            </div>
                          ))}
                        </div>
                      )}


                      {/* Instructions */}
                      {activity.instructionsToCoach && activity.instructionsToCoach.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', margin: '0 0 6px 0' }}>Instructions for Coach</p>
                          <ul style={{ margin: '0', paddingLeft: '20px' }}>
                            {activity.instructionsToCoach.map((instr, idx) => (
                              <li key={idx} style={{ fontSize: '13px', color: '#475569', marginBottom: '4px' }} dangerouslySetInnerHTML={{ __html: instr }}></li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Code */}
                      {activity.code && (
                        <div style={{ marginBottom: '12px' }}>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', margin: '0 0 6px 0' }}>💻 Code</p>
                          <pre style={{
                            background: '#1F2937',
                            color: '#10B981',
                            padding: '12px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            overflow: 'auto',
                            margin: '0',
                            fontFamily: 'monospace'
                          }}>
                            {activity.code}
                          </pre>
                        </div>
                      )}

                      {/* Activity Feedback and Rating (Only for completed sessions) */}
                      {sessionData.status?.toLowerCase() === 'completed' && (activity.feedback || (activity.rating && activity.rating > 0)) && (
                        <div style={{ 
                          marginBottom: '12px',
                          background: 'linear-gradient(135deg, #fdfdfd 0%, #ffffff 100%)',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '1px solid #000000'
                        }}>
                          <p style={{ fontSize: '12px', fontWeight: '700', color: '#666', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                            Activity Feedback
                          </p>
                          {activity.rating && activity.rating > 0 && (
                            <div style={{ marginBottom: '8px' }}>
                              <p style={{ fontSize: '11px', fontWeight: '600', color: '#475569', margin: '0 0 4px 0' }}>Rating</p>
                              <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                                {[...Array(5)].map((_, i) => (
                                  <span key={i} style={{ fontSize: '16px', color: i < activity.rating ? '#FCD34D' : '#E5E7EB' }}>
                                    ★
                                  </span>
                                ))}
                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginLeft: '6px' }}>
                                  {activity.rating}/5
                                </span>
                              </div>
                            </div>
                          )}
                          {activity.feedback && (
                            <p style={{ fontSize: '12px', color: '#475569', margin: '0', lineHeight: '1.5' }}>
                              {activity.feedback}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            </div>
          </div>
        )}

        {/* Session Feedback */}
        {sessionData.feedback && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 12px 0' }}>
              Feedback
            </h2>
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '10px',
              padding: '16px'
            }}>
              {sessionData.rating && sessionData.rating > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', margin: '0 0 6px 0' }}>Rating</p>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {[...Array(5)].map((_, i) => (
                      <span key={i} style={{ fontSize: '18px', color: i < sessionData.rating ? '#FCD34D' : '#E5E7EB' }}>
                        ★
                      </span>
                    ))}
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827', marginLeft: '8px' }}>
                      {sessionData.rating}/5
                    </span>
                  </div>
                </div>
              )}
              {sessionData.feedback && (
                <p style={{ fontSize: '13px', color: '#475569', margin: '0', lineHeight: '1.6' }}>
                  {sessionData.feedback}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Takeaways */}
        {sessionData.sessionTakeaways && sessionData.sessionTakeaways.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 12px 0' }}>
              Key Takeaways
            </h2>
            <ul style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '10px',
              padding: '16px',
              margin: '0',
              paddingLeft: '24px'
            }}>
              {sessionData.sessionTakeaways.map((takeaway, idx) => (
                <li key={idx} style={{ fontSize: '13px', color: '#475569', marginBottom: '8px', lineHeight: '1.5' }}>
                  {takeaway}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Close Button */}
        <div style={{ paddingBottom: '32px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '12px 24px',
              background: '#060030ff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#0a0040';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#060030ff';
              e.currentTarget.style.transform = 'translateY(0)';
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
