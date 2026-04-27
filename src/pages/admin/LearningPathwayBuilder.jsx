import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { SkeletonContainer } from '../../components/SkeletonLoader';
import { BookOpen, Search, Loader, AlertCircle, Plus, Trash, SquarePen, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';

const PATHWAY_API_URL = 'https://nvouj7m5fb.execute-api.ap-south-1.amazonaws.com/default/CL_Get_LearningPathway';
const DELETE_PATHWAY_API_URL = 'https://w5qtdpsr58.execute-api.ap-south-1.amazonaws.com/default/CL_Delete_Learningpathway';

const LearningPathwayBuilder = () => {
  const { userToken } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [pathways, setPathways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pathwayToDelete, setPathwayToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedStages, setExpandedStages] = useState({}); // Track which stages are expanded

  // Fetch pathways on every visit (location key) and when token changes
  useEffect(() => {
    fetchPathways();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, userToken]);

  const fetchPathways = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(userToken && { 'userToken': userToken })
      };


      const response = await axios.get(PATHWAY_API_URL, { headers });
      
      const data = response.data || {};
      
      // Extract sessions from the API response
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

      setPathways(sessions);
    } catch (err) {
      console.error('Error fetching pathways:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch pathways');
      setPathways([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!pathwayToDelete) {
      return;
    }

    // Check if we have required ID field
    const pathwayId = pathwayToDelete.mongoId || pathwayToDelete._id || pathwayToDelete.id;
    if (!pathwayId) {
      setError('Unable to delete: Missing session ID. Please refresh and try again.');
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(userToken && { 'usertoken': userToken })
      };

      const payload = {
        id: pathwayId,
        session: pathwayToDelete.session,
        Topic: pathwayToDelete.Topic,
        LearningPathway: pathwayToDelete.LearningPathway
      };

      

      const response = await axios.post(DELETE_PATHWAY_API_URL, payload, { headers });

      

      if (response.data && (response.data.statusCode === 200 || response.data.statusCode === 204 || response.status === 200 || response.status === 204)) {
        
        setDeleteConfirmOpen(false);
        setPathwayToDelete(null);
        await fetchPathways();
      } else {
        setError(response.data?.message || 'Failed to delete pathway');
      }
    } catch (err) {
      console.error('❌ Error deleting pathway:', {
        error: err.message,
        response: err.response?.data,
        status: err.response?.status,
        pathwayData: pathwayToDelete
      });
      setError(err.response?.data?.message || err.message || 'Failed to delete pathway');
    } finally {
      setDeleting(false);
    }
  };

  // Toggle stage expand/collapse
  const toggleStage = (stageName) => {
    setExpandedStages(prev => ({
      ...prev,
      [stageName]: !prev[stageName]
    }));
  };

  // Calculate statistics
  const stats = {
    total: pathways.length,
    stages: new Set(pathways.map(p => p.LearningPathway || 'Uncategorized')).size,
    totalPoints: pathways.reduce((sum, p) => sum + (p.totalPoints || 0), 0)
  };

  // Filter and sort pathways
  const filteredPathways = pathways.filter(pathway => {
    const search = searchTerm.toLowerCase();
    
    if (search === '') {
      return true;
    }

    const matches = 
      pathway.Topic?.toLowerCase().includes(search) ||
      pathway.LearningPathway?.toLowerCase().includes(search) ||
      pathway.Objective?.toLowerCase().includes(search) ||
      (pathway.activities?.some(a => a.activityTitle?.toLowerCase().includes(search)));
    
    return matches;
  }).sort((a, b) => (parseInt(a.session) || 0) - (parseInt(b.session) || 0));

  

  // Group pathways by LearningPathway name
  const groupedPathways = filteredPathways.reduce((acc, pathway) => {
    const stage = pathway.LearningPathway || 'Uncategorized';
    
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(pathway);
    return acc;
  }, {});

  // Get unique stages in order they appear
  const groupedPathwaysArray = Object.keys(groupedPathways).map(stage => ({
    stage,
    pathways: groupedPathways[stage]
  }));

  // Auto-expand stages when searching
  useEffect(() => {
    if (searchTerm) {
      const newExpandedStages = {};
      groupedPathwaysArray.forEach(group => {
        if (group.pathways.length > 0) {
          newExpandedStages[group.stage] = true;
        }
      });
      setExpandedStages(newExpandedStages);
    } else {
      // Collapse all when search is cleared
      setExpandedStages({});
    }
  }, [searchTerm]);

  return (
    <Layout>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
        {/* Header with Stats */}
        {loading ? (
          <SkeletonContainer>
            <div style={{
              background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
              backdropFilter: 'blur(20px)',
              color: 'white',
              padding: '40px 32px',
              marginBottom: '32px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 8px 32px rgba(37, 44, 53, 0.15)',
              minHeight: '240px'
            }}>
              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
              `}</style>
              <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      height: '32px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                      width: '280px'
                    }} />
                    <div style={{
                      height: '14px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.1s',
                      width: '320px'
                    }} />
                  </div>
                  <div style={{
                    height: '36px',
                    width: '140px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.15s',
                    flexShrink: 0
                  }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} style={{
                      height: '80px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite ${i * 0.1}s`,
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }} />
                  ))}
                </div>
              </div>
            </div>
          </SkeletonContainer>
        ) : (
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
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 4px 0' }}>Learning Pathways</h1>
                <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>Manage {stats.total} learning session{stats.total !== 1 ? 's' : ''} and stages</p>
              </div>
              <button
                onClick={() => navigate('/admin/learning-pathway/add')}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    border: '2px solid rgba(255, 255, 255, 1)',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  }}
                >
                <Plus size={18} /> Add Pathway/Session Card
              </button>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Pathways</p>
                <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{stats.total}</p>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Learning Pathway</p>
                <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{stats.stages}</p>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Points</p>
                <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{stats.totalPoints}</p>
              </div>
            </div>
          </div>
        </div>
        )}

        <div style={{ padding: '0 32px' }}>
          {/* Search */}
          <div style={{
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'white',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            gap: '10px',
            marginBottom: '24px',
            transition: 'all 0.3s'
          }}>
            <Search size={18} color="#060030ff" />
            <input
              type="text"
              placeholder="Search by activity, stage, or project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                  width: '100%',
                  padding: '10px 10px 10px 40px',
                  border: '2px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'white'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#060030ff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(82, 102, 129, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E2E8F0';
                  e.target.style.boxShadow = 'none';
                }}
            />
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              background: '#FEF2F2',
              border: '2px solid #FECACA',
              color: '#991B1B',
              padding: '14px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '24px'
            }}>
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <SkeletonContainer>
              <Card style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '20px' }}>
                  {/* Stage Skeleton - 3 stages */}
                  {[1, 2, 3].map((stageIdx) => (
                    <div key={stageIdx} style={{ marginBottom: '24px' }}>
                      {/* Stage Header Skeleton */}
                      <div style={{
                        padding: '16px 20px',
                        background: '#f0f0f0',
                        borderRadius: stageIdx === 1 ? '12px 12px 0 0' : '0',
                        marginBottom: '0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          flex: 1
                        }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            background: '#e0e0e0',
                            borderRadius: '4px',
                            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                          }} />
                          <div style={{
                            height: '20px',
                            background: '#e0e0e0',
                            borderRadius: '4px',
                            width: '150px',
                            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                            animationDelay: '0.1s'
                          }} />
                          <div style={{
                            height: '20px',
                            background: '#e0e0e0',
                            borderRadius: '4px',
                            width: '40px',
                            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                            animationDelay: '0.2s'
                          }} />
                        </div>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          background: '#e0e0e0',
                          borderRadius: '8px',
                          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                          animationDelay: '0.3s'
                        }} />
                      </div>

                      {/* Pathway Cards Skeleton - 2 cards per stage */}
                      <div style={{
                        background: 'white',
                        borderRadius: stageIdx === 1 ? '0 0 12px 12px' : '12px',
                        border: '1px solid #e5e7eb',
                        borderTop: 'none',
                        padding: '16px'
                      }}>
                        {[1, 2].map((cardIdx) => (
                          <div key={cardIdx} style={{
                            padding: '16px',
                            border: '1px solid #f0f0f0',
                            borderRadius: '8px',
                            marginBottom: cardIdx === 2 ? '0' : '12px',
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            gap: '16px'
                          }}>
                            {/* Left Content Skeleton */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div style={{
                                height: '18px',
                                background: '#f5f5f5',
                                borderRadius: '4px',
                                width: '200px',
                                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                                animationDelay: `${(stageIdx + cardIdx) * 0.1}s`
                              }} />
                              <div style={{
                                height: '14px',
                                background: '#f5f5f5',
                                borderRadius: '4px',
                                width: '100%',
                                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                                animationDelay: `${(stageIdx + cardIdx) * 0.1 + 0.05}s`
                              }} />
                              {/* Meta info skeletons */}
                              <div style={{
                                display: 'flex',
                                gap: '16px',
                                marginTop: '8px'
                              }}>
                                {[1, 2, 3, 4].map((metaIdx) => (
                                  <div key={metaIdx} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                  }}>
                                    <div style={{
                                      height: '10px',
                                      background: '#f0f0f0',
                                      borderRadius: '3px',
                                      width: '50px',
                                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                                      animationDelay: `${(stageIdx + cardIdx + metaIdx) * 0.08}s`
                                    }} />
                                    <div style={{
                                      height: '12px',
                                      background: '#f5f5f5',
                                      borderRadius: '3px',
                                      width: '60px',
                                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                                      animationDelay: `${(stageIdx + cardIdx + metaIdx) * 0.08 + 0.05}s`
                                    }} />
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Right Action Buttons Skeleton */}
                            <div style={{
                              display: 'flex',
                              gap: '8px',
                              flexDirection: 'column'
                            }}>
                              {[1, 2, 3].map((btnIdx) => (
                                <div key={btnIdx} style={{
                                  width: '80px',
                                  height: '32px',
                                  background: '#f0f0f0',
                                  borderRadius: '6px',
                                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                                  animationDelay: `${(stageIdx + cardIdx + btnIdx) * 0.12}s`
                                }} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
              `}</style>
            </SkeletonContainer>
          ) : (
            <Card style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
              {groupedPathwaysArray.length > 0 ? (
                <div style={{ overflowX: 'auto', overflowY: 'auto' }}>
                  {groupedPathwaysArray.map((group, groupIndex) => (
                    <div key={groupIndex} style={{ marginBottom: '24px' }}>
                      <div
                        onClick={() => toggleStage(group.stage)}
                        style={{
                          padding: '16px 20px',
                          background: expandedStages[group.stage] 
                            ? 'linear-gradient(135deg, #060030ff 0%, #000000FF 100%)' 
                            : 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
                          borderBottom: expandedStages[group.stage] ? '2px solid #4F46E5' : '1px solid #E5E7EB',
                          position: 'sticky',
                          top: 0,
                          zIndex: 10,
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          userSelect: 'none',
                          borderRadius: expandedStages[group.stage] ? '12px 12px 0 0' : '12px',
                          boxShadow: expandedStages[group.stage] 
                            ? '0 4px 12px rgba(99, 102, 241, 0.2)' 
                            : '0 1px 3px rgba(0, 0, 0, 0.1)',
                          border: expandedStages[group.stage] ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid #E5E7EB'
                        }}
                        onMouseEnter={(e) => {
                          if (expandedStages[group.stage]) {
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.3)';
                          } else {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #ECECF1 0%, #E0E7FF 100%)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (expandedStages[group.stage]) {
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.2)';
                            e.currentTarget.style.background = 'linear-gradient(135deg, #060030ff 0%, #000000FF 100%)';
                          } else {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                          }
                        }}
                      >
                        <h3 style={{
                          fontSize: '15px',
                          fontWeight: '700',
                          color: expandedStages[group.stage] ? 'white' : '#111827',
                          margin: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'all 0.3s ease'
                        }}>
                          <BookOpen 
                            size={20} 
                            style={{
                              transition: 'all 0.3s ease',
                              filter: expandedStages[group.stage] ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none'
                            }}
                          /> 
                          {group.stage}
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '28px',
                            height: '28px',
                            backgroundColor: expandedStages[group.stage] 
                              ? 'rgba(255, 255, 255, 0.3)' 
                              : 'rgba(99, 102, 241, 0.1)',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: expandedStages[group.stage] ? 'rgba(255, 255, 255, 0.95)' : '#090083',
                            marginLeft: '8px',
                            transition: 'all 0.3s ease'
                          }}>
                            {group.pathways.length}
                          </span>
                        </h3>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: expandedStages[group.stage] ? 'rgba(255, 255, 255, 0.9)' : '#666',
                          transition: 'all 0.3s ease'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            backgroundColor: expandedStages[group.stage] 
                              ? 'rgba(255, 255, 255, 0.2)' 
                              : 'rgba(99, 102, 241, 0.05)',
                            borderRadius: '8px',
                            transition: 'all 0.3s ease',
                            transform: expandedStages[group.stage] ? 'rotate(180deg)' : 'rotate(0deg)'
                          }}>
                            <ChevronDown size={20} style={{ transition: 'all 0.3s ease' }} />
                          </div>
                        </div>
                      </div>

                      {expandedStages[group.stage] && (
                        <div style={{ 
                          display: 'grid', 
                          gap: '12px', 
                          padding: '16px',
                          background: 'white',
                          borderRadius: '0 0 12px 12px',
                          border: '1px solid #E5E7EB',
                          borderTop: 'none',
                          animation: 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.08)'
                        }}
                        >
                          <style>{`
                            @keyframes slideDown {
                              from {
                                opacity: 0;
                                transform: translateY(-8px);
                                max-height: 0;
                              }
                              to {
                                opacity: 1;
                                transform: translateY(0);
                                max-height: 5000px;
                              }
                            }
                          `}</style>
                          {group.pathways.map((pathway, idx) => (
                            <div key={idx} style={{
                              padding: '16px',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px',
                              background: 'white',
                              transition: 'all 0.3s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                              e.currentTarget.style.borderColor = '#D1D5DB';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = 'none';
                              e.currentTarget.style.borderColor = '#E5E7EB';
                            }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'start' }}>
                                <div>
                                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '700', color: '#111827' }}>
                                    Session {pathway.session}: {pathway.Topic}
                                  </h4>
                                  <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
                                    {pathway.Objective}
                                  </p>
                                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                    <div>
                                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>Pathway: </span>
                                      <span style={{ fontSize: '12px', color: '#111827', fontWeight: '500' }}>{pathway.LearningPathway}</span>
                                    </div>
                                    <div>
                                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>Type: </span>
                                      <span style={{ fontSize: '12px', color: '#111827', fontWeight: '500' }}>{pathway.SessionType}</span>
                                    </div>
                                    <div>
                                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>Activities: </span>
                                      <span style={{ fontSize: '12px', color: '#111827', fontWeight: '500' }}>{pathway.activities?.length || 0}</span>
                                    </div>
                                    <div>
                                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>Points: </span>
                                      <span style={{ fontSize: '12px', color: '#111827', fontWeight: '500' }}>{pathway.totalPoints || 0}</span>
                                    </div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                                  <button
                                    onClick={() => {
                                      const pathwayId = pathway.mongoId || pathway._id || `${pathway.session}-${pathway.Topic}`;
                                      navigate(`/admin/learning-pathway/${encodeURIComponent(pathwayId)}/view`);
                                    }}
                                    style={{
                                      padding: '8px 12px',
                                      backgroundColor: '#8B5CF6',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      transition: 'all 0.3s',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      justifyContent: 'center'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#7C3AED';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = '#8B5CF6';
                                    }}
                                  >
                                    <Eye size={14} /> View
                                  </button>
                                  <button
                                    onClick={() => {
                                      const pathwayId = pathway.mongoId || pathway._id || `${pathway.session}-${pathway.Topic}`;
                                      navigate(`/admin/learning-pathway/${encodeURIComponent(pathwayId)}/edit`);
                                    }}
                                    style={{
                                      padding: '8px 12px',
                                      backgroundColor: '#3B82F6',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      transition: 'all 0.3s',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      justifyContent: 'center'
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
                                    onClick={() => {
                                      setPathwayToDelete(pathway);
                                      setDeleteConfirmOpen(true);
                                    }}
                                    style={{
                                      padding: '8px 12px',
                                      backgroundColor: '#EF4444',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      transition: 'all 0.3s',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      justifyContent: 'center'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#DC2626';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = '#EF4444';
                                    }}
                                  >
                                    <Trash size={14} /> Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '60px 32px', textAlign: 'center' }}>
                  <BookOpen size={48} style={{ color: '#ccc', margin: '0 auto 16px' }} />
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#666', margin: 0 }}>No pathways found</p>
                  <p style={{ fontSize: '13px', color: '#999', margin: '8px 0 0 0' }}>Try adjusting your search or create a new pathway</p>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirmOpen && (
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
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 12px 0' }}>
                Delete Pathway?
              </h2>
              <p style={{ fontSize: '13px', color: '#666', margin: '0 0 24px 0', lineHeight: '1.5' }}>
                Are you sure you want to delete "{pathwayToDelete?.Topic}"? This action cannot be undone.
              </p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setPathwayToDelete(null);
                  }}
                  disabled={deleting}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: '#f3f4f6',
                    color: '#111827',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.6 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: deleting ? '#999' : '#EF4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: deleting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

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

export default LearningPathwayBuilder;
