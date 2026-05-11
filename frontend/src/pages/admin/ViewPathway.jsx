import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { AlertCircle, Loader, ArrowLeft, ExternalLink, Award, BookOpen, Zap, Target, Clock, User, ChevronDown } from 'lucide-react';
import axios from 'axios';

const GET_PATHWAY_API_URL = 'https://nvouj7m5fb.execute-api.ap-south-1.amazonaws.com/default/CL_Get_LearningPathway';

const ViewPathway = () => {
  const { id } = useParams();
  const { userToken } = useStore();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pathway, setPathway] = useState(null);
  const [expandedActivities, setExpandedActivities] = useState({});

  useEffect(() => {
    fetchPathwayData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggleActivityExpand = (index) => {
    setExpandedActivities(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const fetchPathwayData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(userToken && { 'userToken': userToken })
      };

      const response = await axios.get(GET_PATHWAY_API_URL, { headers });
      
      let data = response.data || {};
      if (data.body && typeof data.body === 'string') {
        try {
          data = JSON.parse(data.body);
        } catch {
          console.error('Failed to parse response body');
        }
      }

      let pathways = [];
      if (Array.isArray(data)) {
        pathways = data;
      } else if (data.sessions && Array.isArray(data.sessions)) {
        pathways = data.sessions;
      } else if (data.data && Array.isArray(data.data)) {
        pathways = data.data;
      } else if (data.pathways && Array.isArray(data.pathways)) {
        pathways = data.pathways;
      }

      // Find the pathway to view - try multiple matching strategies
      let foundPathway = pathways.find(p => p.mongoId === id || p._id === id);
      
      if (!foundPathway) {
        foundPathway = pathways.find(p => `${p.session}-${p.Topic}` === decodeURIComponent(id));
      }

      if (!foundPathway && !isNaN(id)) {
        foundPathway = pathways.find(p => p.session === parseInt(id));
      }
      
      if (!foundPathway) {
        console.error('Pathway not found. ID:', id, 'Available pathways:', pathways);
        setError('Pathway not found');
        return;
      }

      setPathway(foundPathway);
    } catch (err) {
      console.error('Error fetching pathway:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch pathway');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '80px 32px', textAlign: 'center' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(6, 0, 48, 0.4) 0%, rgba(0, 0, 0, 0.4) 100%)',
            padding: '60px 40px',
            borderRadius: '12px',
            border: '1px solid rgba(226, 232, 240, 0.3)'
          }}>
            <Loader size={48} style={{ animation: 'spin 2s linear infinite', margin: '0 auto 16px', color: '#3B82F6' }} />
            <p style={{ marginTop: '12px', fontSize: '16px', fontWeight: '700', color: '#111827' }}>Loading pathway...</p>
            <p style={{ fontSize: '13px', color: '#666', margin: '6px 0 0 0' }}>Please wait while we fetch the details</p>
          </div>
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 32px' }}>
          <button
            onClick={() => navigate('/admin/learning-pathway')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              color: '#3B82F6',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '24px'
            }}
          >
            <ArrowLeft size={18} /> Back to Pathways
          </button>
          
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            background: '#FEF2F2',
            border: '2px solid #FECACA',
            color: '#991B1B',
            padding: '16px 20px',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>Error Loading Pathway</p>
              <p style={{ margin: 0 }}>{error}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!pathway) {
    return (
      <Layout>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 32px', textAlign: 'center' }}>
          <button
            onClick={() => navigate('/admin/learning-pathway')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              color: '#3B82F6',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '24px'
            }}
          >
            <ArrowLeft size={18} /> Back to Pathways
          </button>
          <p style={{ color: '#666', fontSize: '16px' }}>Pathway not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 32px' }}>
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
          <button
            onClick={() => navigate('/admin/learning-pathway')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              borderRadius: '6px',
              transition: 'all 0.2s',
              marginBottom: '16px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 8px 0' }}>
            {pathway.Topic}
          </h1>
          <p style={{ fontSize: '14px', opacity: 0.9, margin: '0 0 20px 0' }}>
            Session {pathway.session} • {pathway.LearningPathway}
          </p>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '20px' }}>
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
              <p style={{ fontSize: '11px', opacity: '0.8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Activities</p>
              <p style={{ fontSize: '22px', fontWeight: '700', margin: '6px 0 0 0' }}>{pathway.activities?.length || 0}</p>
            </div>
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
              <p style={{ fontSize: '11px', opacity: '0.8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Points</p>
              <p style={{ fontSize: '22px', fontWeight: '700', margin: '6px 0 0 0' }}>{pathway.totalPoints || 0}</p>
            </div>
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
              <p style={{ fontSize: '11px', opacity: '0.8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Session Type</p>
              <p style={{ fontSize: '22px', fontWeight: '700', margin: '6px 0 0 0' }}>{pathway.SessionType || 'Primary'}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ display: 'grid' }}>
          {/* Basic Info */}
          <Card style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: '12px' }}>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 20px 0', color: '#111827', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={20} style={{ color: '#3B82F6' }} /> Pathway Details
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F0F9FF' }}>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#1E40AF', textTransform: 'uppercase', margin: 0, marginBottom: '8px' }}>
                    Learning Pathway
                  </p>
                  <p style={{ fontSize: '14px', color: '#111827', fontWeight: '500', margin: 0 }}>
                    {pathway.LearningPathway}
                  </p>
                </div>

                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F0FDF4' }}>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#166534', textTransform: 'uppercase', margin: 0, marginBottom: '8px' }}>
                    Session Type
                  </p>
                  <p style={{ fontSize: '14px', color: '#111827', fontWeight: '500', margin: 0 }}>
                    {pathway.SessionType || 'Primary'}
                  </p>
                </div>

                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#FEF3C7' }}>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#92400E', textTransform: 'uppercase', margin: 0, marginBottom: '8px' }}>
                    Session Number
                  </p>
                  <p style={{ fontSize: '14px', color: '#111827', fontWeight: '500', margin: 0 }}>
                    {pathway.session}
                  </p>
                </div>

                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#FCE7F3' }}>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#831843', textTransform: 'uppercase', margin: 0, marginBottom: '8px' }}>
                    Total Points
                  </p>
                  <p style={{ fontSize: '14px', color: '#111827', fontWeight: '500', margin: 0 }}>
                    {pathway.totalPoints || 0}
                  </p>
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F3F4F6' }}>
                <p style={{ fontSize: '11px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: 0, marginBottom: '8px' }}>
                  Objective
                </p>
                <p style={{ fontSize: '13px', color: '#111827', lineHeight: '1.6', margin: 0 }}>
                  {pathway.Objective}
                </p>
              </div>
            </div>
          </Card>

          {/* Activities */}
          <Card style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: '12px' }}>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 20px 0', color: '#111827', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={20} style={{ color: '#F59E0B' }} /> Activities ({pathway.activities?.length || 0})
              </h2>

              {pathway.activities && pathway.activities.length > 0 ? (
                <div style={{ display: 'grid', gap: '20px' }}>
                  {pathway.activities.map((activity, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '20px',
                        backgroundColor: '#F9FAFB',
                        borderRadius: '10px',
                        border: '1px solid #E5E7EB',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {/* Activity Header */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center', marginBottom: '0px', paddingBottom: '16px', borderBottom: '1px solid #E5E7EB' }}>
                        <button
                          onClick={() => toggleActivityExpand(idx)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '8px',
                            marginLeft: '-8px',
                            borderRadius: '6px',
                            transition: 'all 0.2s ease',
                            flex: 1,
                            justifyContent: 'flex-start'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <ChevronDown
                            size={20}
                            style={{
                              color: '#3B82F6',
                              transition: 'transform 0.3s ease',
                              transform: expandedActivities[idx] ? 'rotate(0deg)' : 'rotate(-90deg)',
                              flexShrink: 0
                            }}
                          />
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            backgroundColor: '#3B82F6',
                            color: 'white',
                            borderRadius: '50%',
                            fontSize: '12px',
                            fontWeight: '700',
                            flexShrink: 0
                          }}>
                            {activity.activitySequence || idx + 1}
                          </span>
                          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', margin: 0, textAlign: 'left' }}>
                            {activity.activityTitle}
                          </h3>
                        </button>
                        <span style={{
                          padding: '6px 14px',
                          background: '#DBEAFE',
                          color: '#1E40AF',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '700',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          flexShrink: 0
                        }}>
                          <Award size={14} /> {activity.points?.total || 0} pts
                        </span>
                      </div>

                      {/* Activity Details - Collapsible */}
                      {expandedActivities[idx] && (
                        <>
                          {/* Description */}
                          {activity.description && (
                            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                              <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: '0 0 8px 0' }}>
                                Description
                              </p>
                              <div style={{ fontSize: '13px', color: '#111827', margin: 0, lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: activity.description }} />
                            </div>
                          )}

                          {/* Duration */}
                          {activity.duration > 0 && (
                            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#F0F9FF', borderRadius: '6px', borderLeft: '4px solid #3B82F6' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={16} color="#1E40AF" />
                                <p style={{ fontSize: '13px', fontWeight: '600', color: '#1E40AF', margin: 0 }}>
                                  Duration: {activity.duration} minute{activity.duration !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Story */}
                          {activity.story && (Array.isArray(activity.story) ? activity.story.length > 0 : activity.story) && (
                            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#FEF3C7', borderRadius: '6px', borderLeft: '4px solid #F59E0B' }}>
                              <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: '0 0 8px 0' }}>
                                Story
                              </p>
                              {Array.isArray(activity.story) ? (
                                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                  {activity.story.map((line, i) => (
                                    <li key={i} style={{ fontSize: '13px', color: '#111827', marginBottom: '6px', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: line }}></li>
                                  ))}
                                </ul>
                              ) : (
                                <p style={{ fontSize: '13px', color: '#111827', margin: 0, lineHeight: '1.5' }}>
                                  {activity.story}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Instructions to Coach */}
                          {activity.instructionsToCoach && activity.instructionsToCoach.length > 0 && (
                            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#E0E7FF', borderRadius: '6px', borderLeft: '4px solid #4F46E5' }}>
                              <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: '0 0 8px 0' }}>
                                Instructions to Coach
                              </p>
                              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                {activity.instructionsToCoach.map((instruction, i) => (
                                  <li key={i} style={{ fontSize: '13px', color: '#111827', marginBottom: '6px', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: instruction }}></li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Project */}
                          {activity.project && (typeof activity.project === 'object') && (
                            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FEE2E2' }}>
                              <p style={{ fontSize: '12px', fontWeight: '600', color: '#991B1B', textTransform: 'uppercase', margin: '0 0 8px 0' }}>
                                Project
                              </p>
                              {activity.project.title && (
                                <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: '0 0 6px 0' }}>
                                  {activity.project.title}
                                </p>
                              )}
                              {activity.project.description && (
                                <div style={{ fontSize: '12px', color: '#666', margin: '0 0 8px 0', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: activity.project.description }} />
                              )}
                              {activity.project.workflow && activity.project.workflow.length > 0 && (
                                <div>
                                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#991B1B', textTransform: 'uppercase', margin: '6px 0 6px 0' }}>
                                    Workflow Steps
                                  </p>
                                  <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '12px', color: '#333' }}>
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
                            <div style={{ marginBottom: '16px' }}>
                              <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: '0 0 12px 0' }}>
                                AI Tools
                              </p>
                              <div style={{ display: 'grid', gap: '10px' }}>
                                {activity.aiTools.map((tool, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      padding: '12px',
                                      backgroundColor: 'white',
                                      borderRadius: '6px',
                                      border: '1px solid #D1D5DB'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                      <span style={{
                                        padding: '4px 10px',
                                        background: '#E0E7FF',
                                        color: '#4F46E5',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: '600'
                                      }}>
                                        {tool.toolName}
                                      </span>
                                    </div>
                                    {tool.usagePurpose && (
                                      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 6px 0' }}>
                                        <strong>Purpose:</strong> {tool.usagePurpose}
                                      </p>
                                    )}
                                    {tool.toolLink && (
                                      <a
                                        href={tool.toolLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          fontSize: '12px',
                                          color: '#3B82F6',
                                          textDecoration: 'none',
                                          fontWeight: '500'
                                        }}
                                      >
                                        Visit Link <ExternalLink size={12} />
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Evaluation Criteria */}
                          {activity.points?.evaluationCriteria && activity.points.evaluationCriteria.length > 0 && (
                            <div style={{ paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                              <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: '0 0 10px 0' }}>
                                Evaluation Criteria
                              </p>
                              <div style={{ display: 'grid', gap: '8px' }}>
                                {activity.points.evaluationCriteria.map((criteria, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '8px 12px',
                                      backgroundColor: 'white',
                                      borderRadius: '4px',
                                      border: '1px solid #E5E7EB'
                                    }}
                                  >
                                    <span style={{
                                      display: 'inline-block',
                                      width: '6px',
                                      height: '6px',
                                      backgroundColor: '#10B981',
                                      borderRadius: '50%'
                                    }} />
                                    <span style={{ fontSize: '12px', color: '#111827' }}>
                                      {criteria}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>No activities</p>
              )}
            </div>
          </Card>

          {/* Session Takeaways */}
          {pathway.sessionTakeaways && pathway.sessionTakeaways.length > 0 && (
            <Card style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: '12px', background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)' }}>
              <div style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 20px 0', color: '#15803D', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Target size={20} /> Session Takeaways
                </h2>

                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {pathway.sessionTakeaways.map((takeaway, idx) => (
                    <li
                      key={idx}
                      style={{
                        fontSize: '13px',
                        color: '#111827',
                        marginBottom: '10px',
                        lineHeight: '1.6',
                        fontWeight: '500'
                      }}
                    >
                      {takeaway}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}

          {/* Metadata */}
          <Card style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: '12px', background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)' }}>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 20px 0', color: '#111827', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={20} style={{ color: '#6366F1' }} /> Pathway Information
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'white', border: '1px solid #E2E8F0' }}>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: 0, marginBottom: '8px' }}>
                    Total Activities
                  </p>
                  <p style={{ fontSize: '22px', color: '#3B82F6', fontWeight: '700', margin: 0 }}>
                    {pathway.activities?.length || 0}
                  </p>
                </div>

                <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'white', border: '1px solid #E2E8F0' }}>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: 0, marginBottom: '8px' }}>
                    Total Points
                  </p>
                  <p style={{ fontSize: '22px', color: '#F59E0B', fontWeight: '700', margin: 0 }}>
                    {pathway.totalPoints || 0}
                  </p>
                </div>

                {pathway.updatedAt && (
                  <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'white', border: '1px solid #E2E8F0' }}>
                    <p style={{ fontSize: '11px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: 0, marginBottom: '8px' }}>
                      Last Updated
                    </p>
                    <p style={{ fontSize: '14px', color: '#111827', margin: 0, fontWeight: '500' }}>
                      {new Date(pathway.updatedAt).toLocaleDateString('en-IN', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}

                {pathway.updatedBy && (
                  <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'white', border: '1px solid #E2E8F0' }}>
                    <p style={{ fontSize: '11px', fontWeight: '600', color: '#666', textTransform: 'uppercase', margin: 0, marginBottom: '8px' }}>
                      Updated By
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <User size={14} style={{ color: '#10B981' }} />
                      <p style={{ fontSize: '13px', color: '#111827', margin: 0, fontWeight: '600' }}>
                        {pathway.updatedBy.name}
                      </p>
                    </div>
                    {pathway.updatedBy.role && (
                      <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>
                        {Array.isArray(pathway.updatedBy.role) ? pathway.updatedBy.role.join(', ') : pathway.updatedBy.role}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(`/admin/learning-pathway/${encodeURIComponent(pathway.mongoId || pathway._id || `${pathway.session}-${pathway.Topic}`)}/edit`)}
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
            }}
          >
            Edit Pathway
          </button>

          
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </Layout>
  );
};

export default ViewPathway;
