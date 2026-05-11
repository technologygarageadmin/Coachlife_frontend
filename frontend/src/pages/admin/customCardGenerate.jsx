import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Toast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import { ArrowLeft, Loader, Sparkles, BookOpen, Zap, GripHorizontal, Trash2, Blocks, ArrowBigUp, ArrowBigDown, ArrowUpDown , CheckCircle2, X } from 'lucide-react';
import axios from 'axios';

const PATHWAY_API_URL = 'https://nvouj7m5fb.execute-api.ap-south-1.amazonaws.com/default/CL_Get_LearningPathway';
const GET_PLAYERS_API = 'https://jrrnyyf9r9.execute-api.ap-south-1.amazonaws.com/default/CL_Get_All_Players';

const CustomCardGenerate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userToken } = useStore();

  const playerId = location.state?.playerId;
  const playerName = location.state?.playerName;
  const playerLearningPathway = location.state?.LearningPathway;

  // Pathway states
  const [pathways, setPathways] = useState([]);
  const [pathwaysLoading, setPathwaysLoading] = useState(true);
  const [pathwaysError, setPathwaysError] = useState('');
  const [selectedPathway, setSelectedPathway] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [draggedActivities, setDraggedActivities] = useState([]);
  const [draggedOver, setDraggedOver] = useState(false);
  const [hoveredActivityIndex, setHoveredActivityIndex] = useState(null);
  const [selectedActivityDetail, setSelectedActivityDetail] = useState(null);

  const [formData, setFormData] = useState({
    topic: '',
    objective: '',
    duration: 30,
    focusAreas: ''
  });

  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [sessionTakeaways, setSessionTakeaways] = useState([]);
  const [newTakeaway, setNewTakeaway] = useState('');

  // Fetch learning pathways on mount
  useEffect(() => {
    fetchPathways();
  }, [userToken]);

  // Hide footer on scroll
  useEffect(() => {
    // Removed scroll hide functionality
  }, []);

  const fetchPathways = async () => {
    setPathwaysLoading(true);
    setPathwaysError('');
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

      // Group sessions by learning pathway
      const groupedPathways = {};
      sessions.forEach(session => {
        const pathwayName = session.LearningPathway || 'Unknown Pathway';
        if (!groupedPathways[pathwayName]) {
          groupedPathways[pathwayName] = {
            LearningPathway: pathwayName,
            sessions: []
          };
        }
        
        groupedPathways[pathwayName].sessions.push({
          name: session.Topic || `Session ${session.session || ''}`,
          title: session.Topic,
          sessionNumber: session.session,
          activities: (session.activities || []).map(activity => ({
            name: activity.activityTitle || activity.name || 'Activity',
            description: activity.description,
            activitySequence: activity.activitySequence,
            story: activity.story,
            instructionsToCoach: activity.instructionsToCoach,
            points: activity.points
          }))
        });
      });

      // Convert to array and sort
      const pathwaysArray = Object.values(groupedPathways).sort((a, b) =>
        a.LearningPathway.localeCompare(b.LearningPathway)
      );

      setPathways(pathwaysArray);
    } catch (err) {
      console.error('Error fetching pathways:', err);
      setPathwaysError('Failed to fetch learning pathways');
      setPathways([]);
    } finally {
      setPathwaysLoading(false);
    }
  };


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' ? parseInt(value) : value
    }));
  };

  const addTakeaway = () => {
    if (newTakeaway.trim()) {
      setSessionTakeaways([...sessionTakeaways, newTakeaway.trim()]);
      setNewTakeaway('');
    }
  };

  const removeTakeaway = (index) => {
    setSessionTakeaways(sessionTakeaways.filter((_, i) => i !== index));
  };

  const handlePathwaySelect = (pathway) => {
    setSelectedPathway(pathway);
    setSelectedSession(null);
  };

  const handleSessionSelect = (session) => {
    setSelectedSession(session);
  };

  const handleActivityDragStart = (e, activity) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('activity', JSON.stringify({
      ...activity,
      pathwayName: selectedPathway?.LearningPathway,
      sessionNumber: selectedSession?.sessionNumber
    }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDraggedOver(true);
  };

  const handleDragLeave = () => {
    setDraggedOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDraggedOver(false);
    
    const activityData = e.dataTransfer.getData('activity');
    if (activityData) {
      try {
        const activity = JSON.parse(activityData);
        // Check if activity already exists
        if (!draggedActivities.find(a => a.name === activity.name)) {
          setDraggedActivities([...draggedActivities, { 
            ...activity, 
            id: Date.now() + Math.random(),
            pathwayName: activity.pathwayName,
            sessionNumber: activity.sessionNumber
          }]);
        }
      } catch (err) {
        console.error('Error parsing dropped activity:', err);
      }
    }
  };

  const removeActivity = (id) => {
    setDraggedActivities(draggedActivities.filter(a => a.id !== id));
  };

  const moveActivityUp = (id) => {
    const index = draggedActivities.findIndex(a => a.id === id);
    if (index > 0) {
      const newActivities = [...draggedActivities];
      [newActivities[index], newActivities[index - 1]] = [newActivities[index - 1], newActivities[index]];
      setDraggedActivities(newActivities);
    }
  };

  const moveActivityDown = (id) => {
    const index = draggedActivities.findIndex(a => a.id === id);
    if (index < draggedActivities.length - 1) {
      const newActivities = [...draggedActivities];
      [newActivities[index], newActivities[index + 1]] = [newActivities[index + 1], newActivities[index]];
      setDraggedActivities(newActivities);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (draggedActivities.length === 0) {
      setToastMessage('Please add at least one activity');
      setToastType('error');
      return;
    }

    if (!formData.topic.trim()) {
      setToastMessage('Please enter a topic');
      setToastType('error');
      return;
    }

    if (!formData.objective.trim()) {
      setToastMessage('Please enter an objective');
      setToastType('error');
      return;
    }

    if (sessionTakeaways.length === 0) {
      setToastMessage('Please add at least one session takeaway');
      setToastType('error');
      return;
    }

    setLoading(true);
    try {
      // Calculate total points
      const totalPoints = draggedActivities.reduce((sum, activity) => {
        if (activity.points && typeof activity.points === 'object' && activity.points.total) {
          return sum + activity.points.total;
        }
        return sum;
      }, 0);

      // Create payload
      const payload = {
        playerId: playerId,
        LearningPathway: playerLearningPathway,
        Topic: formData.topic,
        typeOfSessioncard: 'Custom',
        Objective: formData.objective,
        activities: draggedActivities.map((activity, index) => ({
          activitySequence: index + 1,
          activityTitle: activity.name || activity.activityTitle,
          description: activity.description,
          story: activity.story,
          code: activity.code || null,
          instructionsToCoach: activity.instructionsToCoach || [],
          project: activity.project || null,
          aiTools: activity.aiTools || null,
          points: activity.points || { total: 0, evaluationCriteria: [] },
          duration: activity.duration || activity.Duration || 0,
          rating: 0,
          feedback: null
        })),
        totalPoints: totalPoints,
        totalDuration: draggedActivities.reduce((sum, activity) => {
          const dur = activity.duration || activity.Duration || 0;
          return typeof dur === 'number' ? sum + dur : sum;
        }, 0),
        sessionTakeaways: sessionTakeaways.length > 0 ? sessionTakeaways : [],
        status: 'upcoming',
        rating: 0,
        feedback: null
      };

      
      // Directly call API instead of showing popup
      await sendSessionCardToAPI(payload);
    } catch (err) {
      console.error('Error creating session card:', err);
      setToastMessage('Failed to create session card');
      setToastType('error');
      setLoading(false);
    }
  };

  const refetchPlayersAndRedirect = async () => {
    try {
      // Refetch players to get updated sessionCardIds
      const response = await fetch(GET_PLAYERS_API, {
        headers: {
          'userToken': userToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        let playersList = [];

        // Handle different response structures
        if (Array.isArray(data)) {
          playersList = data;
        } else if (data.data && Array.isArray(data.data)) {
          playersList = data.data;
        } else if (data.players && Array.isArray(data.players)) {
          playersList = data.players;
        }

        // Find and update current player
        const { setSelectedPlayer } = useStore.getState();
        const updatedPlayer = playersList.find(p => 
          p._id === playerId || p.playerId === playerId || p.id === playerId
        );

        if (updatedPlayer) {
          const transformedPlayer = {
            playerId: updatedPlayer._id || updatedPlayer.playerId || updatedPlayer.id,
            playerName: updatedPlayer.playerName || updatedPlayer.name,
            email: updatedPlayer.email || '',
            age: updatedPlayer.age || 0,
            LearningPathway: updatedPlayer.LearningPathway || '',
            totalPoints: updatedPlayer.TotalPoints || updatedPlayer.totalPoints || 0,
            phone: updatedPlayer.phone || updatedPlayer.mobile || '',
            address: updatedPlayer.address || '',
            sessionCardIds: updatedPlayer.sessionCardIds || []
          };
          
          // Update selected player in store
          setSelectedPlayer(transformedPlayer);
        }
      }
    } catch (err) {
      console.error('Error refetching players:', err);
    } finally {
      // Navigate back after a short delay
      setTimeout(() => {
        navigate(-1);
      }, 1500);
    }
  };

  const sendSessionCardToAPI = async (payload) => {
    if (!payload) return;

    try {
      const API_URL = 'https://txxt9hve7k.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_Custome_Sessioncard';
      
      // Prepare headers following Postman pattern
      const headers = {
        'Content-Type': 'application/json',
        'Accept': '*/*'
      };

      // Add userToken header
      if (userToken) {
        headers['userToken'] = userToken;
        // Also try Bearer token format (Postman pattern)
        headers['Authorization'] = `Bearer ${userToken}`;
      }

      // Use fetch instead of axios to have more control over headers
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });


      let responseData;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        console.error('Request failed with status:', response.status);
        console.error('Response data:', responseData);
        throw new Error(
          responseData?.message || 
          responseData?.error || 
          `API returned ${response.status}: ${response.statusText}`
        );
      }

      setToastMessage('Session card created successfully!');
      setToastType('success');
      
      // Refetch players data to update session card list
      await refetchPlayersAndRedirect();
    } catch (err) {
      console.error('=== REQUEST ERROR ===');
      console.error('Error type:', err.name);
      console.error('Error message:', err.message);
      
      const errorMessage = 
        err.message ||
        'Failed to create session card. Please try again.';
      
      setToastMessage(errorMessage);
      setToastType('error');
    }
  };

  return (
    <Layout>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes badgePulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(255, 255, 255, 0);
          }
        }
        * {
          box-sizing: border-box;
        }
      `}</style>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px 32px 40px' }}>
        {/* Header Section */}
        <div style={{
          background: 'linear-gradient(135deg, #060030 0%, #000000 100%)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '40px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(124, 58, 237, 0.15)',
          animation: 'fadeInUp 0.6s ease-out'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <button
              onClick={() => navigate('/admin/session-card')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                background: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                border: '1.5px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                marginBottom: '16px',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                animation: 'slideIn 0.5s ease-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                e.currentTarget.style.transform = 'translateX(-4px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }}
            >
             Back to Session Cards
            </button>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: '800', 
              margin: '12px 0 16px 0', 
              letterSpacing: '-0.5px',
              animation: 'fadeInUp 0.7s ease-out'
            }}>
              Custom Session Card
            </h1>
            <p style={{ 
              fontSize: '15px', 
              margin: '0', 
              opacity: 0.95, 
              fontWeight: '500',
              lineHeight: '1.6',
              animation: 'fadeInUp 0.8s ease-out',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              Create a personalized learning experience for{' '}
              <span style={{ 
                fontWeight: '700', 
                color: 'white', 
                backgroundColor: 'rgba(255, 255, 255, 0.34)', 
                padding: '8px 16px', 
                borderRadius: '8px', 
                display: 'inline-block', 
                backdropFilter: 'blur(10px)', 
                border: '2px solid rgba(255, 255, 255, 0.5)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                animation: 'badgePulse 3s ease-in-out infinite',
                whiteSpace: 'nowrap'
              }} 
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.45)';
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.34)';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.15)';
              }}
              title={playerName}
              >
                {playerName}
              </span>
            </p>
          </div>
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

        {/* Activity Details Modal */}
        {selectedActivityDetail && (
          <Modal
            isOpen={!!selectedActivityDetail}
            onClose={() => setSelectedActivityDetail(null)}
            title={selectedActivityDetail.name || selectedActivityDetail.activityTitle || 'Activity Details'}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '600px', overflowY: 'auto', paddingRight: '8px' }}>
              {/* Activity Sequence */}
              {selectedActivityDetail.activitySequence !== null && selectedActivityDetail.activitySequence !== undefined && (
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontWeight: '700', color: '#111827', fontSize: '14px' }}>Activity Sequence</h3>
                  <p style={{ margin: '0', color: '#6B7280', fontSize: '13px', lineHeight: '1.6', fontWeight: '600' }}>
                    {selectedActivityDetail.activitySequence}
                  </p>
                </div>
              )}

              {/* Description */}
              {selectedActivityDetail.description && (
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontWeight: '700', color: '#111827', fontSize: '14px' }}>Description</h3>
                  <p style={{ margin: '0', color: '#6B7280', fontSize: '13px', lineHeight: '1.6' }}>
                    {typeof selectedActivityDetail.description === 'string' ? selectedActivityDetail.description : JSON.stringify(selectedActivityDetail.description)}
                  </p>
                </div>
              )}

              {/* Story */}
              {selectedActivityDetail.story && (
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontWeight: '700', color: '#111827', fontSize: '14px' }}>Story</h3>
                  {Array.isArray(selectedActivityDetail.story) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {selectedActivityDetail.story.map((storyItem, idx) => (
                        <p key={idx} style={{ margin: '0', color: '#6B7280', fontSize: '13px', lineHeight: '1.6', paddingLeft: '12px', borderLeft: '3px solid #060030' }}>
                          {storyItem}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: '0', color: '#6B7280', fontSize: '13px', lineHeight: '1.6' }}>
                      {typeof selectedActivityDetail.story === 'string' ? selectedActivityDetail.story : JSON.stringify(selectedActivityDetail.story)}
                    </p>
                  )}
                </div>
              )}

              {/* Code */}
              {selectedActivityDetail.code && (
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontWeight: '700', color: '#111827', fontSize: '14px' }}>Code</h3>
                  {typeof selectedActivityDetail.code === 'object' && selectedActivityDetail.code.language && (
                    <>
                      <p style={{ margin: '0 0 8px 0', color: '#6B7280', fontSize: '12px', fontWeight: '600' }}>Language: {selectedActivityDetail.code.language}</p>
                      <pre style={{
                        margin: '0',
                        padding: '12px',
                        background: '#1F2937',
                        color: '#E5E7EB',
                        borderRadius: '8px',
                        fontSize: '11px',
                        lineHeight: '1.5',
                        overflowX: 'auto',
                        fontFamily: 'monospace'
                      }}>
                        {selectedActivityDetail.code.content}
                      </pre>
                    </>
                  )}
                </div>
              )}

              {/* Instructions to Coach */}
              {selectedActivityDetail.instructionsToCoach && Array.isArray(selectedActivityDetail.instructionsToCoach) && selectedActivityDetail.instructionsToCoach.length > 0 && (
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontWeight: '700', color: '#111827', fontSize: '14px' }}>Instructions to Coach</h3>
                  <ol style={{ margin: '0', paddingLeft: '20px', color: '#6B7280', fontSize: '13px', lineHeight: '1.8' }}>
                    {selectedActivityDetail.instructionsToCoach.map((instruction, idx) => (
                      <li key={idx} style={{ marginBottom: '8px' }}>
                        {instruction}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Points */}
              {selectedActivityDetail.points && (
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontWeight: '700', color: '#111827', fontSize: '14px' }}>Points</h3>
                  {typeof selectedActivityDetail.points === 'object' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedActivityDetail.points.total !== null && selectedActivityDetail.points.total !== undefined && (
                        <p style={{ margin: '0', color: '#6B7280', fontSize: '13px', lineHeight: '1.6' }}>
                          <span style={{ fontWeight: '600', color: '#111827' }}>Total Points:</span> {selectedActivityDetail.points.total}
                        </p>
                      )}
                      {selectedActivityDetail.points.evaluationCriteria && Array.isArray(selectedActivityDetail.points.evaluationCriteria) && selectedActivityDetail.points.evaluationCriteria.length > 0 && (
                        <div>
                          <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#111827', fontSize: '13px' }}>Evaluation Criteria:</p>
                          <ul style={{ margin: '0', paddingLeft: '20px', color: '#6B7280', fontSize: '13px', lineHeight: '1.6' }}>
                            {selectedActivityDetail.points.evaluationCriteria.map((criteria, idx) => (
                              <li key={idx}>{criteria}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Project */}
              {selectedActivityDetail.project && (
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontWeight: '700', color: '#111827', fontSize: '14px' }}>Project</h3>
                  <p style={{ margin: '0', color: '#6B7280', fontSize: '13px', lineHeight: '1.6' }}>
                    {typeof selectedActivityDetail.project === 'string' ? selectedActivityDetail.project : JSON.stringify(selectedActivityDetail.project)}
                  </p>
                </div>
              )}

              {/* AI Tools */}
              {selectedActivityDetail.aiTools && Array.isArray(selectedActivityDetail.aiTools) && selectedActivityDetail.aiTools.length > 0 && (
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontWeight: '700', color: '#111827', fontSize: '14px' }}>AI Tools</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {selectedActivityDetail.aiTools.map((tool, idx) => (
                      <div key={idx} style={{ padding: '10px 12px', background: '#F5F3FF', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                        <p style={{ margin: '0 0 6px 0', fontWeight: '600', color: '#111827', fontSize: '13px' }}>
                          {tool.toolName || 'Tool'}
                        </p>
                        {tool.usagePurpose && (
                          <p style={{ margin: '0 0 6px 0', color: '#6B7280', fontSize: '12px' }}>
                            <span style={{ fontWeight: '600' }}>Purpose:</span> {tool.usagePurpose}
                          </p>
                        )}
                        {tool.toolLink && (
                          <p style={{ margin: '0', color: '#6B7280', fontSize: '12px' }}>
                            <span style={{ fontWeight: '600' }}>Link:</span>{' '}
                            <a href={tool.toolLink} target="_blank" rel="noopener noreferrer" style={{ color: '#060030', textDecoration: 'none' }}>
                              {tool.toolLink}
                            </a>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Two Column Layout: Arrangement on Left, Selection on Right */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', marginBottom: '40px', minHeight: 'calc(100vh - 400px)', maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* LEFT: Your Session Arrangement */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                padding: '32px',
                borderRadius: '16px',
                border: draggedOver ? '3px dashed #060030' : '2px dashed #E5E7EB',
                background: draggedOver ? '#ffffff' : '#ffffff',
                flex: 1,
                overflowY: 'auto',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: draggedOver ? '0 12px 32px rgba(124, 58, 237, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
                position: 'relative'
              }}
            >
              {draggedActivities.length === 0 ? (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  minHeight: '400px'
                }}>
                  <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <Sparkles 
                      size={56} 
                      style={{ 
                        color: '#E5E7EB',
                        opacity: 0.4
                      }} 
                    />
                  </div>
                  <p style={{ fontSize: '18px', fontWeight: '700', color: '#6B7280', margin: '0 0 8px 0' }}>
                    Ready to drag activities?
                  </p>
                  <p style={{ fontSize: '14px', color: '#9CA3AF', margin: '0', maxWidth: '300px', lineHeight: '1.5' }}>
                    Select a learning pathway, choose a session, and drag activities here to build your custom session
                  </p>
                </div>
              ) : (
                <>
                  {draggedActivities.map((activity, index) => (
                    <div
                      key={activity.id}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid #E5E7EB',
                        background: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                        transition: 'all 0.2s',
                        animation: 'slideIn 0.3s ease-out'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.1)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#060030',
                        minWidth: '28px',
                        textAlign: 'center'
                      }}>
                        {index + 1}
                      </div>
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#111827'
                        }}>
                          {activity.name || 'Activity'}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: '#6B7280',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}>
                          {activity.pathwayName && <span>{activity.pathwayName}</span>}
                          {activity.sessionNumber && <span>Session {activity.sessionNumber}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {index > 0 && (
                          <button
                            onClick={() => moveActivityUp(activity.id)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'white',
                              color: '#6B7280',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              fontWeight: '600'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#060030';
                              e.currentTarget.style.background = '#EDE9FE';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#6B7280';
                              e.currentTarget.style.background = 'white';
                            }}
                          >
                            <ArrowBigUp size={14} />
                          </button>
                        )}
                        {index < draggedActivities.length - 1 && (
                          <button
                            onClick={() => moveActivityDown(activity.id)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'white',
                              color: '#6B7280',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              fontWeight: '600'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#060030';
                              e.currentTarget.style.background = '#EDE9FE';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#6B7280';
                              e.currentTarget.style.background = 'white';
                            }}
                          >
                            <ArrowBigDown size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => removeActivity(activity.id)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #FCA5A5',
                            background: '#FEE2E2',
                            color: '#DC2626',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#FECACA';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#FEE2E2';
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Action Buttons */}
            {draggedActivities.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={() => setDraggedActivities([])}
                  disabled={loading}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontWeight: '600',
                    backgroundColor: '#F3F4F6',
                    color: '#6B7280',
                    border: '2px solid #E5E7EB',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    opacity: loading ? 0.6 : 1,
                    fontSize: '13px'
                  }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#E5E7EB')}
                  onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#F3F4F6')}
                >
                  Clear All
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || draggedActivities.length === 0}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontWeight: '600',
                    background: loading || draggedActivities.length === 0 ? '#D1D5DB' : 'linear-gradient(135deg, #060030 0%, #6D28D9 100%)',
                    color: 'white',
                    border: 'none',
                    cursor: loading || draggedActivities.length === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    opacity: loading || draggedActivities.length === 0 ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
                  }}
                  onMouseEnter={(e) => !loading && draggedActivities.length > 0 && (e.currentTarget.style.transform = 'translateY(-3px)')}
                  onMouseLeave={(e) => !loading && draggedActivities.length > 0 && (e.currentTarget.style.transform = 'translateY(0)')}                  
                >
                  {loading && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                  {loading ? 'Creating...' : 'Create Session Card'}
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: Step-by-Step Selection */}
          <div style={{
            padding: '28px',
            border: '2px solid #E5E7EB',
            borderRadius: '16px',
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            height: 'auto',
            maxHeight: '800px',
            overflowY: 'auto'
          }}>
            {/* Session Info Inputs */}
            {!selectedPathway ? (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#111827', marginBottom: '8px', display: 'block' }}>
                    Session Topic <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="topic"
                    value={formData.topic}
                    onChange={handleInputChange}
                    placeholder="e.g., Introduction to AI"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#060030';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#E5E7EB';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#111827', marginBottom: '8px', display: 'block' }}>
                    Objective <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <textarea
                    name="objective"
                    value={formData.objective}
                    onChange={handleInputChange}
                    placeholder="e.g., Students should understand the basics of AI"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      minHeight: '70px',
                      resize: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#060030';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#E5E7EB';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#111827', marginBottom: '8px', display: 'block' }}>
                    Session Takeaways <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                      type="text"
                      value={newTakeaway}
                      onChange={(e) => setNewTakeaway(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTakeaway()}
                      placeholder="e.g., Understanding AI fundamentals"
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#060030';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#E5E7EB';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      onClick={addTakeaway}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '5px',
                        fontWeight: '600',
                        background: '#060030',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '13px',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#060030';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#060030';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      Add
                    </button>
                  </div>
                  {sessionTakeaways.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {sessionTakeaways.map((takeaway, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid #E5E7EB',
                            background: '#F5F3FF',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px',
                            fontSize: '13px',
                            color: '#111827'
                          }}
                        >
                          <span>{takeaway}</span>
                          <button
                            onClick={() => removeTakeaway(index)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '5px',
                              border: '1px solid #FCA5A5',
                              background: '#FEE2E2',
                              color: '#DC2626',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#FECACA';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#FEE2E2';
                            }}
                          >
                            <Trash2 size={13} /> Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #E5E7EB' }} />

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BookOpen size={18} style={{ color: '#060030' }} /> Learning Pathways
                    </h2>
                  </div>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0' }}>Select where you want to start from</p>
                </div>

                {pathwaysLoading ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <Loader size={32} style={{ animation: 'spin 2s linear infinite', margin: '0 auto 12px', color: '#060030' }} />
                      <p style={{ fontSize: '12px', color: '#6B7280' }}>Loading...</p>
                    </div>
                  </div>
                ) : pathwaysError ? (
                  <div style={{
                    padding: '16px',
                    background: '#FEE2E2',
                    border: '1px solid #FCA5A5',
                    borderRadius: '8px',
                    color: '#991B1B',
                    fontSize: '12px',
                    marginBottom: '16px'
                  }}>
                    {pathwaysError}
                  </div>
                ) : pathways.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: '#6B7280', fontSize: '12px', textAlign: 'center' }}>No pathways available</p>
                  </div>
                ) : (
                  <div style={{ maxHeight: '450px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', paddingRight: '8px' }}>
                    {pathways.map((pathway, index) => (
                      <button
                        key={index}
                        onClick={() => handlePathwaySelect(pathway)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: '1px solid #E5E7EB',
                          background: 'white',
                          color: '#111827',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          textAlign: 'left',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                          width: '100%',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          minHeight: '44px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#060030';
                          e.currentTarget.style.background = '#F5F3FF';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.1)';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#E5E7EB';
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                        title={pathway.LearningPathway || 'Pathway'}
                      >
                        {pathway.LearningPathway || pathway.name || 'Untitled'}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : !selectedSession ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <button
                    onClick={() => {
                      setSelectedPathway(null);
                      setSelectedSession(null);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      background: '#F3F4F6',
                      color: '#6B7280',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#E5E7EB';
                      e.currentTarget.style.color = '#111827';
                      e.currentTarget.style.transform = 'translateX(-4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#F3F4F6';
                      e.currentTarget.style.color = '#6B7280';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <ArrowLeft size={14} /> Back to Pathways
                  </button>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Zap size={18} style={{ color: '#060030' }} /> Sessions
                    </h2>
                  </div>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0' }}>Pick a session for {selectedPathway?.LearningPathway}</p>
                </div>

                {!selectedPathway.sessions || selectedPathway.sessions.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: '#6B7280', fontSize: '12px', textAlign: 'center' }}>No sessions in this pathway</p>
                  </div>
                ) : (
                  <div style={{ maxHeight: '400px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', paddingRight: '8px' }}>
                    {selectedPathway.sessions.map((session, index) => (
                      <button
                        key={index}
                        onClick={() => handleSessionSelect(session)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: '1px solid #E5E7EB',
                          background: 'white',
                          color: '#111827',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          textAlign: 'left',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                          width: '100%',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          minHeight: '44px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#060030';
                          e.currentTarget.style.background = '#F5F3FF';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.1)';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#E5E7EB';
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                        title={`Session ${session.sessionNumber || ''}: ${session.name || session.title || 'Session'}`}
                      >
                        {session.sessionNumber ? `Session ${session.sessionNumber}: ` : ''}{session.name || session.title || 'Session'}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <button
                    onClick={() => {
                      setSelectedSession(null);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      background: '#F3F4F6',
                      color: '#6B7280',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#E5E7EB';
                      e.currentTarget.style.color = '#111827';
                      e.currentTarget.style.transform = 'translateX(-4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#F3F4F6';
                      e.currentTarget.style.color = '#6B7280';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <ArrowLeft size={14} /> Back to Sessions
                  </button>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={18} style={{ color: '#060030' }} /> Activities
                    </h2>
                  </div>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0' }}>Drag to add activities to your arrangement</p>
                </div>

                {!selectedSession.activities || selectedSession.activities.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: '#6B7280', fontSize: '12px', textAlign: 'center' }}>No activities in this session</p>
                  </div>
                ) : (
                  <div style={{ maxHeight: '400px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '8px' }}>
                    {selectedSession.activities.map((activity, index) => (
                      <div
                        key={index}
                        draggable
                        onDragStart={(e) => handleActivityDragStart(e, activity)}
                        onMouseEnter={() => setHoveredActivityIndex(index)}
                        onMouseLeave={() => setHoveredActivityIndex(null)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: '2px dashed #E5E7EB',
                          background: '#FAFBFC',
                          color: '#111827',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: 'grab',
                          transition: 'all 0.2s',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          minHeight: '44px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          position: 'relative',
                          backgroundColor: hoveredActivityIndex === index ? '#F5F3FF' : '#FAFBFC',
                          borderColor: hoveredActivityIndex === index ? '#060030' : '#E5E7EB',
                          boxShadow: hoveredActivityIndex === index ? '0 4px 12px rgba(124, 58, 237, 0.1)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
                          justifyContent: 'space-between'
                        }}
                        title={activity.name || 'Activity'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                          <GripHorizontal size={14} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: '#D1D5DB' }} />
                          {activity.name || 'Activity'}
                        </div>
                        {hoveredActivityIndex === index && (
                          <button
                            onClick={() => setSelectedActivityDetail(activity)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              background: '#060030',
                              color: 'white',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#6D28D9';
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#060030';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            View Details
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
      </div>
      {/* Helpful Tips */}
        <div style={{
          padding: '32px 0',
          marginBottom: '40px'
        }}>
          <div style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '32px',
            background: 'linear-gradient(135deg, #ffffff 0%, #FAFBFC 100%)',
            border: '2px solid #E5E7EB',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.08)'
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <h2 style={{ margin: '0', fontWeight: '800', color: '#111827', fontSize: '18px', letterSpacing: '-0.5px' }}>
              Quick Guide
            </h2>
          </div>
          <p style={{ margin: '0 0 24px 0', color: '#6B7280', fontSize: '14px', lineHeight: '1.6' }}>
            Follow these steps to create a personalized custom session card for your students:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {[
              {
                step: 1,
                icon: BookOpen,
                title: 'Fill Session Details',
                description: 'Enter the session topic, objective, and any key takeaways. These will help structure your session and guide the learning experience.'
              },
              {
                step: 2,
                icon: Blocks,
                title: 'Select Learning Pathway',
                description: 'Choose a learning pathway from the available options. This determines which activities and sessions you can select from.'
              },
              {
                step: 3,
                icon: Zap,
                title: 'Pick a Session',
                description: 'Select a specific session from your chosen pathway to access all its available activities.'
              },
              {
                step: 4,
                icon: GripHorizontal,
                title: 'Arrange Activities',
                description: 'Drag your desired activities from the right panel to the left arrangement area to build your session.'
              },
              {
                step: 5,
                icon: ArrowUpDown,
                title: 'Organize Order',
                description: 'Use the up/down arrows to reorder activities. The sequence number automatically updates based on the arrangement.'
              },
              {
                step: 6,
                icon: CheckCircle2,
                title: 'Pro Tip: Review & Finalize',
                description: 'Click "View Details" on any activity to see complete information including story, code samples, instructions, and evaluation criteria before adding it to your session.'
              }
            ].map((item) => (
              <div
                key={item.step}
                style={{
                  padding: '20px',
                  background: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  transition: 'all 0.3s',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(6, 0, 48, 0.12)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = '#060030';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                  <item.icon size={20} style={{ color: '#060030', marginTop: '6px', minWidth: '20px' }} />
                </div>
                <h3 style={{ margin: '0 0 8px 0', fontWeight: '700', color: '#111827', fontSize: '14px' }}>
                  {item.title}
                </h3>
                <p style={{ margin: '0', color: '#6B7280', fontSize: '13px', lineHeight: '1.6' }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
          </div>
        </div>
    </Layout>
  );
};

export default CustomCardGenerate;
