import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Toast } from '../../components/Toast';
import { ChevronLeft, Clock, Users, MapPin, Clock4 , BookOpen, ArrowRight, BookMarked, Wrench, Briefcase, Code, ChevronDown, MoveUpRight, MessageSquare } from 'lucide-react';

const SessionDetail = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { userToken, currentUser } = useStore();
  const [sessionData, setSessionData] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [expandedActivities, setExpandedActivities] = useState({});
  const [activityFeedbackMap, setActivityFeedbackMap] = useState({});
  const [editingSessionFeedback, setEditingSessionFeedback] = useState(false);
  const [sessionFeedback, setSessionFeedback] = useState({
    rating: 0,
    coachComment: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regenerateModal, setRegenerateModal] = useState({
    isOpen: false,
    activityIndex: null,
    sectionType: null, // 'instructions', 'story', 'code'
    reason: ''
  });
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [toast, setToast] = useState({
    isVisible: false,
    message: '',
    type: 'success' // 'success', 'error', 'info'
  });
  const [whatsappModal, setWhatsappModal] = useState({
    isOpen: false,
    isLoading: false,
    message: '',
    averageRating: 0
  });

  useEffect(() => {
    const fetchSessionDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if session data is passed through navigation state
        if (location.state?.session) {
          
          // Sort activities by activitySequence
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

        // Fallback: Fetch from API if no state data
        const token = userToken || localStorage.getItem('userToken');
        if (!token) {
          throw new Error('No authentication token found');
        }


        if (!sessionId) {
          throw new Error('Session ID not found');
        }

        // Use the same API pattern as other endpoints in your app
        // Replace with your actual API endpoint
        const sessionResponse = await fetch(
          `https://daq1gxkqd4.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_Get_Session_Details`,
          {
            method: 'POST',
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Content-Type': 'application/json',
              'userToken': token
            },
            body: JSON.stringify({ sessionId })
          }
        );

        if (!sessionResponse.ok) {
          throw new Error(`Failed to fetch session details: ${sessionResponse.status}`);
        }

        const sessionResult = await sessionResponse.json();

    
        // Sort activities by activitySequence
        const sortedActivities = (sessionResult.activities || []).sort((a, b) => {
          const seqA = a.activitySequence || 0;
          const seqB = b.activitySequence || 0;
          return seqA - seqB;
        });

        // Map API response to component state
        setSessionData({
          _id: sessionResult._id || sessionId,
          sessionId: sessionResult._id || sessionResult.sessionId || sessionId,
          Topic: sessionResult.Topic || sessionResult.sessionTitle || sessionResult.title,
          Objective: sessionResult.Objective || sessionResult.description,
          SessionType: sessionResult.SessionType,
          LearningPathway: sessionResult.LearningPathway,
          session: sessionResult.session,
          status: sessionResult.status || 'draft',
          createdAt: sessionResult.createdAt,
          completedAt: sessionResult.completedAt,
          activities: sortedActivities,
          totalPoints: sessionResult.totalPoints,
          sessionTakeaways: sessionResult.sessionTakeaways || [],
          feedback: sessionResult.feedback,
          createdByCoach: sessionResult.createdByCoach,
          lastRegeneratedAt: sessionResult.lastRegeneratedAt,
          regeneratedCount: sessionResult.regeneratedCount
        });

        // Set player data if available in response
        if (sessionResult.playerDetails) {
          setPlayerData(sessionResult.playerDetails);
        } else if (sessionResult.player) {
          setPlayerData(sessionResult.player);
        }

      } catch (err) {
        console.error('Error fetching session details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId, userToken, location]);

  // Helper function to calculate progress based on completed activities
  const calculateProgress = () => {
    if (!sessionData?.activities || sessionData.activities.length === 0) {
      return 0;
    }
    const completedActivities = sessionData.activities.filter(a => a.feedback && (a.feedback.rating > 0 || a.feedback.coachComment)).length;
    return Math.round((completedActivities / sessionData.activities.length) * 100);
  };

  // Handle start session - mark status as in_progress
  const handleStartSession = async () => {
    try {
      setIsSubmitting(true);
      
      const sessionCardId = sessionData._id || sessionData.cardId || sessionId;
      
      
      
      const requestBody = {
        sessionCardId: sessionCardId
      };

      const response = await fetch(`https://rslqy219i9.execute-api.ap-south-1.amazonaws.com/default/CL_Start_Session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'userToken': userToken
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', errorData);
        throw new Error(errorData.message || `Failed to start session: ${response.status}`);
      }

      const result = await response.json();
      
      // Update session status based on API response
      setSessionData(prev => ({
        ...prev,
        status: result.status || 'in_progress',
        _id: result._id || prev._id
      }));
      
      setToast({
        isVisible: true,
        message: 'Session started! Status changed to In Progress.',
        type: 'success'
      });
    } catch (error) {
      console.error('Error starting session:', error);
      setToast({
        isVisible: true,
        message: `Error: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle feedback button click - check if session needs to be started first
  const handleAddFeedback = async (callback) => {
    // Check if session is still in draft status
    if (sessionData.status === 'draft' || sessionData.status === 'upcoming') {
      // Show confirmation dialog
      const userConfirmed = window.confirm(
        'This session has not been started yet.\n\nStarting the session will enable you to add feedback. Do you want to continue?'
      );

      if (userConfirmed) {
        try {
          setIsSubmitting(true);
          
          const sessionCardId = sessionData._id || sessionData.cardId || sessionId;
          const requestBody = {
            sessionCardId: sessionCardId
          };

          const response = await fetch(`https://rslqy219i9.execute-api.ap-south-1.amazonaws.com/default/CL_Start_Session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'userToken': userToken
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to start session: ${response.status}`);
          }

          const result = await response.json();
          
          // Update session status
          setSessionData(prev => ({
            ...prev,
            status: result.status === 'in_progress' ? 'in_progress' : 'in_progress',
            _id: result._id || prev._id
          }));
          
          setToast({
            isVisible: true,
            message: 'Session started successfully! You can now add feedback.',
            type: 'success'
          });

          // Execute callback after session is started
          setTimeout(() => {
            callback();
          }, 500);

        } catch (error) {
          console.error('Error starting session:', error);
          setToast({
            isVisible: true,
            message: `Error: ${error.message}`,
            type: 'error'
          });
        } finally {
          setIsSubmitting(false);
        }
      }
    } else {
      // Session already started, execute callback directly
      callback();
    }
  };

  // Helper function to get current activity feedback
  const getCurrentActivityFeedback = () => {
    if (!editingActivityId && editingActivityId !== 0) {
      return { rating: 0, coachComment: '' };
    }
    const feedback = activityFeedbackMap[editingActivityId] || { rating: 0, coachComment: '' };
    return feedback;
  };

  // Helper function to set current activity feedback
  const setCurrentActivityFeedback = (feedback) => {
    if (editingActivityId !== null && editingActivityId !== undefined) {
      setActivityFeedbackMap(prev => {
        const updated = {
          ...prev,
          [editingActivityId]: feedback
        };
        return updated;
      });
    } 
  };

  // Save activity feedback
  const saveActivityFeedback = (activityIndex, feedbackData) => {
    try {
      setSessionData(prev => {
        const updated = { ...prev };
        if (updated.activities && updated.activities[activityIndex]) {
          updated.activities[activityIndex] = {
            ...updated.activities[activityIndex],
            feedback: feedbackData
          };
        }
        return updated;
      });
      
      // Save complete draft to localStorage
      const draftData = {
        sessionId: sessionData._id,
        playerId: playerData?._id,
        activities: sessionData.activities.map((activity, idx) => ({
          _id: activity._id || idx,
          feedback: idx === activityIndex ? feedbackData : activity.feedback
        })),
        sessionFeedback: sessionData.feedback,
        savedAt: new Date().toISOString(),
        sessionStatus: sessionData.status
      };
      localStorage.setItem(`session_draft_${sessionData._id}`, JSON.stringify(draftData));
      
      // Show success toast
      setToast({
        isVisible: true,
        message: 'Activity feedback saved automatically!',
        type: 'success'
      });
    } catch (error) {
      console.error('Error saving activity feedback:', error);
      setToast({
        isVisible: true,
        message: 'Error saving feedback. Please try again.',
        type: 'error'
      });
    }
  };

  // Save session feedback
  const saveSessionFeedback = (feedbackData) => {
    try {
      setSessionData(prev => ({
        ...prev,
        feedback: feedbackData
      }));
      
      // Save complete draft to localStorage
      const draftData = {
        sessionId: sessionData._id,
        playerId: playerData?._id,
        activities: sessionData.activities,
        sessionFeedback: feedbackData,
        activityFeedbackMap: activityFeedbackMap,
        savedAt: new Date().toISOString(),
        sessionStatus: sessionData.status
      };
      localStorage.setItem(`session_draft_${sessionData._id}`, JSON.stringify(draftData));
      
      // Show success toast
      setToast({
        isVisible: true,
        message: 'Session feedback saved automatically!',
        type: 'success'
      });
    } catch (error) {
      console.error('Error saving session feedback:', error);
      setToast({
        isVisible: true,
        message: 'Error saving feedback. Please try again.',
        type: 'error'
      });
    }
  };

  // Save session as draft to localStorage
  const handleSaveDraft = () => {
    try {
      // Check if overall rating is provided
      if (!sessionFeedback.rating || sessionFeedback.rating === 0) {
        alert('Please provide an overall rating before saving draft.');
        return;
      }

      const draftData = {
        sessionId: sessionData._id,
        playerId: playerData._id,
        activities: sessionData.activities,
        sessionFeedback: sessionFeedback,
        activityFeedbackMap: activityFeedbackMap,
        savedAt: new Date().toISOString(),
        sessionStatus: sessionData.status
      };

      localStorage.setItem(`session_draft_${sessionData._id}`, JSON.stringify(draftData));
      alert('Session draft saved! You can resume editing later.');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert(`Error saving draft: ${error.message}`);
    }
  };

  // Complete session and submit feedback
  const handleCompleteSession = async () => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      const token = userToken || localStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      if (!sessionData) {
        throw new Error('Session data not loaded');
      }

      // Validate all activities have feedback with rating
      const activitiesWithoutFeedback = [];
      (sessionData.activities || []).forEach((activity, index) => {
        const hasRating = activity.feedback?.rating && activity.feedback.rating > 0;
        const hasComment = activity.feedback?.coachComment && activity.feedback.coachComment.trim().length > 0;
        
        if (!hasRating || !hasComment) {
          const activityName = activity.activityTitle || activity.title || `Activity ${index + 1}`;
          activitiesWithoutFeedback.push({
            index: index + 1,
            name: activityName,
            missingRating: !hasRating,
            missingComment: !hasComment
          });
        }
      });

      // If any activities are missing feedback, show error
      if (activitiesWithoutFeedback.length > 0) {
        let errorMessage = 'The following activities are missing feedback:\n\n';
        activitiesWithoutFeedback.forEach(activity => {
          const missing = [];
          if (activity.missingRating) missing.push('rating');
          if (activity.missingComment) missing.push('comment');
          errorMessage += `• ${activity.name} (missing: ${missing.join(' and ')})\n`;
        });
        
        setToast({
          isVisible: true,
          message: errorMessage,
          type: 'error'
        });
        
        setIsSubmitting(false);
        return;
      }

      // Build activities feedback array
      const activitiesFeedback = (sessionData.activities || []).map((activity, index) => ({
        activitySequence: activity.activitySequence || (index + 1),
        rating: activity.feedback?.rating || 0,
        feedback: activity.feedback?.coachComment || ''
      }));

      // Calculate average rating from activities
      const avgActivityRating = activitiesFeedback.length > 0
        ? (activitiesFeedback.reduce((sum, fb) => sum + fb.rating, 0) / activitiesFeedback.length)
        : sessionFeedback.rating;

      // Prepare request body with exact format
      const cardId = sessionData._id || sessionData.cardId || sessionId;
      const requestBody = {
        card_id: cardId,
        activities_feedback: activitiesFeedback,
        rating: sessionFeedback.rating || avgActivityRating || 0,
        feedback: sessionFeedback.coachComment || ''
      };

      // Call API to complete session
      const apiUrl = 'https://65km9yygae.execute-api.ap-south-1.amazonaws.com/default/CL_Complete_Session';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'userToken': token
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to complete session: ${response.status}`);
      }

      await response.json();

      // Clear localStorage draft
      if (sessionData._id) {
        localStorage.removeItem(`session_draft_${sessionData._id}`);
      }

      // Show success toast notification
      setToast({
        isVisible: true,
        message: 'Session completed successfully!',
        type: 'success'
      });

      // Navigate to start-session page with player ID after brief delay
      setTimeout(() => {
        const playerId = playerData?._id || playerData?.playerId || playerData?.id;
        if (playerId) {
          navigate(`/coach/start-session/${playerId}`, { replace: true });
        } else {
          navigate('/coach/start-session', { replace: true });
        }
      }, 1500);

    } catch (error) {
      setToast({
        isVisible: true,
        message: `Error: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateWhatsAppFeedback = async () => {
    const activitiesFeedback = (sessionData?.activities || []).map((activity, index) => ({
      activitySequence: activity.activitySequence || (index + 1),
      activityName: activity.activityTitle || activity.activityName || `Activity ${index + 1}`,
      rating: activity.feedback?.rating || 0,
      feedback: activity.feedback?.coachComment || ''
    }));

    setWhatsappModal({ isOpen: true, isLoading: true, message: '', averageRating: 0 });

    try {
      const token = userToken || localStorage.getItem('userToken');
      const requestBody = {
        sessionCardId: sessionData._id || sessionId,
        playerName: playerData?.name || playerData?.playerName || 'Player',
        sessionTopic: sessionData.Topic || '',
        sessionNumber: sessionData.session || 0,
        coachName: currentUser?.name || 'Coach',
        activities: activitiesFeedback,
        overallRating: sessionData.feedback?.rating || sessionFeedback.rating || 0,
        overallComment: sessionData.feedback?.coachComment || sessionFeedback.coachComment || ''
      };

      const response = await fetch(
        'https://zf94z67dy2.execute-api.ap-south-1.amazonaws.com/default/CL_Generate_WhatsApp_Feedback',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'userToken': token
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to generate feedback: ${response.status}`);
      }

      const result = await response.json();
      setWhatsappModal({
        isOpen: true,
        isLoading: false,
        message: result.whatsappMessage || result.message || '',
        averageRating: result.averageRating || 0
      });
    } catch (error) {
      setWhatsappModal({ isOpen: false, isLoading: false, message: '', averageRating: 0 });
      setToast({ isVisible: true, message: `Error: ${error.message}`, type: 'error' });
    }
  };

  // Load draft on mount
  useEffect(() => {
    if (sessionData?._id) {
      const draft = localStorage.getItem(`session_draft_${sessionData._id}`);
      if (draft) {
        try {
          const draftData = JSON.parse(draft);
          
          // Restore session feedback
          if (draftData.sessionFeedback) {
            setSessionFeedback(draftData.sessionFeedback);
            // Also update sessionData.feedback so it displays on the page
            setSessionData(prev => ({
              ...prev,
              feedback: draftData.sessionFeedback
            }));
          }
          
          // Restore activity feedback map
          if (draftData.activityFeedbackMap) {
            setActivityFeedbackMap(draftData.activityFeedbackMap);
          }
          
          // Restore activities with feedback
          if (draftData.activities) {
            setSessionData(prev => ({
              ...prev,
              activities: prev.activities.map((activity, index) => {
                const draftActivity = draftData.activities[index];
                return draftActivity ? { ...activity, feedback: draftActivity.feedback } : activity;
              }),
              // Also restore the feedback if not already done
              feedback: draftData.sessionFeedback || prev.feedback
            }));
          }
        } catch (error) {
          console.error('Error loading draft:', error);
        }
      }
    }
  }, [sessionData?._id]);

  if (loading) {
    return (
      <Layout>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
          {/* Header Skeleton */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(6, 0, 48, 0.4) 0%, rgba(0, 0, 0, 0.4) 100%)',
            padding: '40px 32px',
            borderRadius: '12px',
            border: '1px solid rgba(226, 232, 240, 0.3)',
            marginBottom: '32px',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            <div style={{
              width: '300px',
              height: '32px',
              background: 'rgba(200, 200, 200, 0.3)',
              borderRadius: '6px',
              marginBottom: '12px'
            }} />
            <div style={{
              width: '250px',
              height: '16px',
              background: 'rgba(200, 200, 200, 0.3)',
              borderRadius: '6px'
            }} />
          </div>

          {/* Content Grid Skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px' }}>
            {/* Main Content */}
            <div>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{
                  background: 'white',
                  borderRadius: '8px',
                  padding: '20px',
                  border: '1px solid #E2E8F0',
                  marginBottom: '20px',
                  animation: `pulse 2s ease-in-out infinite ${i * 0.1}s`
                }}>
                  <div style={{
                    width: '40%',
                    height: '18px',
                    background: 'rgba(200, 200, 200, 0.3)',
                    borderRadius: '4px',
                    marginBottom: '16px'
                  }} />
                  {[1, 2, 3].map((j) => (
                    <div key={j} style={{
                      width: '100%',
                      height: '14px',
                      background: 'rgba(200, 200, 200, 0.3)',
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }} />
                  ))}
                </div>
              ))}
            </div>

            {/* Sidebar */}
            <div>
              <div style={{
                background: 'white',
                borderRadius: '8px',
                padding: '20px',
                border: '1px solid #E2E8F0',
                animation: 'pulse 2s ease-in-out infinite 0.2s'
              }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} style={{
                    paddingBottom: '12px',
                    marginBottom: '12px',
                    borderBottom: i < 4 ? '1px solid #F1F5F9' : 'none'
                  }}>
                    <div style={{
                      width: '70%',
                      height: '14px',
                      background: 'rgba(200, 200, 200, 0.3)',
                      borderRadius: '4px',
                      marginBottom: '6px'
                    }} />
                    <div style={{
                      width: '50%',
                      height: '14px',
                      background: 'rgba(200, 200, 200, 0.3)',
                      borderRadius: '4px'
                    }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 0.7; }
            }
          `}</style>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '500px',
          gap: '16px'
        }}>
          <p style={{ fontSize: '18px', color: '#DC2626', fontWeight: '600' }}>Error loading session</p>
          <p style={{ fontSize: '14px', color: '#64748B' }}>{error}</p>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '10px 20px',
              background: '#060030ff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Go Back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
      <Layout>
        {toast.isVisible && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ ...toast, isVisible: false })}
          />
        )}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
        {/* Header with Back Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '32px'
        }}>
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

        {sessionData && playerData && (
          <>
            {/* Main Content Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 350px',
              gap: '24px',
              marginBottom: '32px'
            }}>
              {/* Session Details */}
              <div>
                {/* Session Header */}
                <div style={{
                  background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
                  borderRadius: '16px',
                  padding: '32px',
                  color: 'white',
                  marginBottom: '32px',
                  boxShadow: '0 4px 12px rgba(37, 44, 53, 0.2)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 8px 0' }}>
                        {sessionData.Topic || sessionData.sessionTitle || 'Session'}
                      </h1>
                      {sessionData.session && (
                        <p style={{ fontSize: '14px', opacity: 0.8, margin: '4px 0 12px 0' }}>
                          Session {sessionData.session} • {sessionData.SessionType || 'Primary'}
                        </p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          background: sessionData.status === 'completed' ? '#DCFCE7' : sessionData.status === 'in_progress' ? '#DBEAFE' : sessionData.status === 'draft' ? '#FEF3C7' : '#DBEAFE',
                          color: sessionData.status === 'completed' ? '#166534' : sessionData.status === 'in_progress' ? '#0C4A6E' : sessionData.status === 'draft' ? '#92400E' : '#0C4A6E',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          textTransform: 'capitalize'
                        }}>
                          {sessionData.status || 'Draft'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p style={{
                    fontSize: '15px',
                    opacity: 0.9,
                    margin: 0,
                    lineHeight: '1.6'
                  }}>
                    {sessionData.Objective || sessionData.description || 'No description available'}
                  </p>
                </div>

                {/* Session Info Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  marginBottom: '32px'
                }}>
                  {sessionData.LearningPathway && (
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                    }}>
                      <BookOpen size={24} color="#060030ff" style={{ marginTop: '4px' }} />
                      <div>
                        <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0', fontWeight: '600' }}>
                          Learning Pathway
                        </p>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>
                          {sessionData.LearningPathway}
                        </p>
                      </div>
                    </div>
                  )}
                  {sessionData.totalPoints && (
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                    }}>
                      <Clock size={24} color="#060030ff" style={{ marginTop: '4px' }} />
                      <div>
                        <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0', fontWeight: '600' }}>
                          Total Points
                        </p>
                        <p style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                          {sessionData.totalPoints}
                        </p>
                      </div>
                    </div>
                  )}
                  <div style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                  }}>
                    <BookOpen size={24} color="#060030ff" style={{ marginTop: '4px' }} />
                    <div>
                      <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 4px 0', fontWeight: '600' }}>
                        Activities
                      </p>
                      <p style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                        {sessionData.activities.length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Activities Section */}
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  overflow: 'hidden',
                  marginBottom: '32px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                }}>
                  <div style={{
                    background: '#F9FAFB',
                    borderBottom: '1px solid #E5E7EB',
                    padding: '16px 20px'
                  }}>
                    <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                      Activities
                    </h2>
                  </div>
                  <div style={{ padding: '0' }}>
                    {sessionData.activities && sessionData.activities.length > 0 ? (
                      sessionData.activities.map((activity, index) => {
                        return (
                        <div
                          key={index}
                          style={{
                            borderBottom: index < sessionData.activities.length - 1 ? '1px solid #E5E7EB' : 'none',
                            padding: '16px 20px'
                          }}
                        >
                          {/* Activity Header */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: expandedActivities[index] ? '16px' : '0',
                            cursor: 'pointer',
                            padding: '12px',
                            borderRadius: '8px',
                            background: expandedActivities[index] ? '#F0F9FF' : 'transparent',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => setExpandedActivities(prev => ({
                            ...prev,
                            [index]: !prev[index]
                          }))}
                          onMouseEnter={(e) => {
                            if (!expandedActivities[index]) {
                              e.currentTarget.style.background = '#F8FAFC';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!expandedActivities[index]) {
                              e.currentTarget.style.background = 'transparent';
                            }
                          }}
                          >
                            <button
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedActivities(prev => ({
                                  ...prev,
                                  [index]: !prev[index]
                                }));
                              }}
                            >
                              <ChevronDown 
                                size={20} 
                                color="#BE185D"
                                style={{
                                  transform: expandedActivities[index] ? 'rotate(0deg)' : 'rotate(-90deg)',
                                  transition: 'transform 0.2s ease'
                                }}
                              />
                            </button>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              background: '#060030ff',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '16px',
                              flexShrink: 0
                            }}>
                              {index + 1}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0 }}>
                                  {activity.activityTitle || activity.title}
                                </h3>
                                {activity.feedback && (activity.feedback.rating || activity.feedback.coachComment) && (
                                  <div style={{
                                    background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
                                    color: 'white',
                                    borderRadius: '6px',
                                    padding: '4px 10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)',
                                    title: 'Feedback marked',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                  }}>
                                    Feedback Marked
                                  </div>
                                )}
                              </div>
                              {expandedActivities[index] && (
                                <div style={{
                                  display: 'flex',
                                  gap: '12px',
                                  flexWrap: 'wrap',
                                  marginTop: '8px',
                                  alignItems: 'center'
                                }}>
                                  <span style={{
                                    fontSize: '12px',
                                    background: '#EFF6FF',
                                    color: '#0C4A6E',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}>
                                    <Clock size={15} /> {activity.duration || 'N/A'} Minutes
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Activity Details - Only show when expanded */}
                          {expandedActivities[index] && (
                          <div>

                          {/* Activity Description */}
                          {activity.description && (
                            <div style={{ marginBottom: '16px', marginLeft: '56px' }}>
                              <div style={{
                                fontSize: '14px',
                                color: '#475569',
                                margin: 0,
                                lineHeight: '1.6'
                              }} dangerouslySetInnerHTML={{ __html: activity.description }} />
                            </div>
                          )}

                          {/* Activity Details Grid */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                            gap: '16px',
                            marginLeft: '56px'
                          }}>
                            {/* Objectives */}
                            {activity.objectives && activity.objectives.length > 0 && (
                              <div style={{
                                background: '#FFFFFF',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid #E5E7EB',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                              }}>
                                <p style={{
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  color: '#111827',
                                  margin: '0 0 8px 0',
                                  textTransform: 'uppercase'
                                }}>
                                  Objectives
                                </p>
                                {activity.objectives.map((obj, idx) => (
                                  <div key={idx} style={{
                                    fontSize: '12px',
                                    color: '#475569',
                                    marginBottom: idx < activity.objectives.length - 1 ? '6px' : 0,
                                    display: 'flex',
                                    gap: '8px',
                                    alignItems: 'flex-start'
                                  }}>
                                    <span style={{ color: '#060030ff' }}>•</span>
                                    <span>{obj}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Resources */}
                            {activity.resources && activity.resources.length > 0 && (
                              <div style={{
                                background: '#FFFFFF',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid #E5E7EB',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                              }}>
                                <p style={{
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  color: '#111827',
                                  margin: '0 0 8px 0',
                                  textTransform: 'uppercase'
                                }}>
                                  Resources
                                </p>
                                {activity.resources.map((res, idx) => (
                                  <div key={idx} style={{
                                    fontSize: '12px',
                                    color: '#475569',
                                    marginBottom: idx < activity.resources.length - 1 ? '6px' : 0,
                                    display: 'flex',
                                    gap: '8px',
                                    alignItems: 'flex-start'
                                  }}>
                                    <span style={{ color: '#060030ff' }}>📦</span>
                                    <span>{res}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Expected Outcome */}
                            {activity.expectedOutcome && (
                              <div style={{
                                background: '#FFFFFF',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid #E5E7EB',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                              }}>
                                <p style={{
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  color: '#111827',
                                  margin: '0 0 8px 0',
                                  textTransform: 'uppercase'
                                }}>
                                  Expected Outcome
                                </p>
                                <p style={{
                                  fontSize: '12px',
                                  color: '#475569',
                                  margin: 0,
                                  lineHeight: '1.5'
                                }}>
                                  {activity.expectedOutcome}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Instructions To Coach */}
                          {activity.instructionsToCoach && activity.instructionsToCoach.length > 0 && (
                            <div style={{
                              marginLeft: '56px',
                              marginTop: '16px',
                              background: '#FFFFFF',
                              borderRadius: '12px',
                              padding: '16px',
                              border: '1px solid #E5E7EB',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <p style={{
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: '#111827',
                                  margin: 0
                                }}>
                                  Instructions to Coach
                                </p>
                                <button
                                  onClick={() => setRegenerateModal({
                                    isOpen: true,
                                    activityIndex: index,
                                    sectionType: 'instructions',
                                    reason: ''
                                  })}
                                  style={{
                                    background: '#F59E0B',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '4px 10px',
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#D97706'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = '#F59E0B'}
                                >
                                  Regenerate
                                </button>
                              </div>
                              {activity.instructionsToCoach.map((instruction, idx) => (
                                <div key={idx} style={{
                                  fontSize: '12px',
                                  color: '#000000',
                                  marginBottom: idx < activity.instructionsToCoach.length - 1 ? '6px' : 0,
                                  display: 'flex',
                                  gap: '8px',
                                  alignItems: 'flex-start'
                                }}>
                                  <ArrowRight size={14} style={{ marginTop: '2px', flexShrink: 0, color: '#000000' }} />
                                  <div dangerouslySetInnerHTML={{ __html: instruction }} />
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Story Section */}
                          {activity.story && activity.story.length > 0 && (
                            <div style={{
                              marginLeft: '56px',
                              marginTop: '16px',
                              background: '#FFFFFF',
                              borderRadius: '12px',
                              padding: '16px',
                              border: '1px solid #E5E7EB',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  
                                  <p style={{
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#111827',
                                    margin: 0
                                  }}>
                                    Story/Narrative
                                  </p>
                                </div>
                                <button
                                  onClick={() => setRegenerateModal({
                                    isOpen: true,
                                    activityIndex: index,
                                    sectionType: 'story',
                                    reason: ''
                                  })}
                                  style={{
                                    background: '#F59E0B',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '4px 10px',
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#D97706'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = '#F59E0B'}
                                >
                                  Regenerate
                                </button>
                              </div>
                              {activity.story.map((storyItem, idx) => {
                                // Handle both string and object story items
                                const storyContent = typeof storyItem === 'string' 
                                  ? storyItem 
                                  : (storyItem.narrative || storyItem.content || '');
                                const storyTitle = typeof storyItem === 'object' && storyItem.title ? storyItem.title : '';
                                
                                return (
                                  <div key={idx} style={{ marginBottom: idx < activity.story.length - 1 ? '16px' : '0' }}>
                                    {storyTitle && (
                                      <h4 style={{
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        color: '#000000',
                                        margin: '0 0 6px 0'
                                      }}>
                                        {storyTitle}
                                      </h4>
                                    )}
                                    {storyContent && (
                                      <div style={{
                                        fontSize: '12px',
                                        color: '#000000',
                                        margin: 0,
                                        lineHeight: '1.6',
                                        textAlign: 'justify',
                                        whiteSpace: 'pre-wrap'
                                      }} dangerouslySetInnerHTML={{ __html: storyContent }} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Points & Evaluation */}
                          {activity.points && (
                            <div style={{
                              marginLeft: '56px',
                              marginTop: '16px',
                              background: '#FFFFFF',
                              borderRadius: '12px',
                              padding: '16px',
                              border: '1px solid #E5E7EB',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                            }}>
                              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                                <div>
                                  <p style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: '#000000',
                                    margin: '0 0 4px 0',
                                    textTransform: 'uppercase'
                                  }}>
                                    Points
                                  </p>
                                  <p style={{
                                    fontSize: '20px',
                                    fontWeight: '700',
                                    color: '#000000',
                                    margin: 0
                                  }}>
                                    {activity.points.total}
                                  </p>
                                </div>
                              </div>
                              {activity.points.evaluationCriteria && activity.points.evaluationCriteria.length > 0 && (
                                <div>
                                  <p style={{
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    color: '#000000',
                                    margin: '0 0 6px 0',
                                    textTransform: 'uppercase'
                                  }}>
                                    Evaluation Criteria
                                  </p>
                                  {activity.points.evaluationCriteria.map((criteria, idx) => (
                                    <div key={idx} style={{
                                      fontSize: '13px',
                                      color: '#000000',
                                      marginBottom: idx < activity.points.evaluationCriteria.length - 1 ? '4px' : 0,
                                      display: 'flex',
                                      gap: '6px',
                                      alignItems: 'flex-start'
                                    }}>
                                      <span style={{ color: '#166534' }}>•</span>
                                      <span>{criteria}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* AI Tools */}
                          {activity.aiTools && activity.aiTools.length > 0 && (
                            <div style={{
                              marginLeft: '56px',
                              marginTop: '16px',
                              background: '#FFFFFF',
                              borderRadius: '12px',
                              padding: '16px',
                              border: '1px solid #E5E7EB',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                
                                <p style={{
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: '#111827',
                                  margin: 0
                                }}>
                                  AI Tools & Resources
                                </p>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {activity.aiTools.map((tool, idx) => (
                                  <div key={idx} style={{
                                    background: 'rgb(255, 255, 255)',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    borderLeft: '2px solid #000000'
                                  }}>
                                    <div style={{
                                      fontSize: '12px',
                                      fontWeight: '700',
                                      color: '#000000',
                                      marginBottom: '4px'
                                    }}>
                                      {tool.toolName || tool.name}
                                    </div>
                                    {tool.usagePurpose && (
                                      <p style={{
                                        fontSize: '11px',
                                        color: '#000000',
                                        margin: '0 0 4px 0'
                                      }}>
                                        {tool.usagePurpose}
                                      </p>
                                    )}
                                    {tool.toolLink && (
                                      <a
                                        href={tool.toolLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          fontSize: '13px',
                                          color: '#00aeff',
                                          textDecoration: 'none',
                                          fontWeight: '600',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                      >
                                        Link <MoveUpRight size={10} style={{ marginTop: '1px' }} />
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Project */}
                          {activity.project && (typeof activity.project === 'object') && (activity.project.title || activity.project.description || (activity.project.workflow && activity.project.workflow.length > 0)) && (
                            <div style={{
                              marginLeft: '56px',
                              marginTop: '16px',
                              background: '#ffffff',
                              borderRadius: '10px',
                              padding: '14px',
                              border: '1.5px solid #000000'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <p style={{
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  color: '#000000',
                                  margin: 0,
                                  textTransform: 'uppercase'
                                }}>
                                  Project
                                </p>
                              </div>
                              {activity.project.title && (
                                <p style={{
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  color: '#111827',
                                  margin: '0 0 8px 0'
                                }}>
                                  {activity.project.title}
                                </p>
                              )}
                              {activity.project.description && (
                                <div style={{
                                  fontSize: '12px',
                                  color: '#666666',
                                  margin: '0 0 8px 0',
                                  lineHeight: '1.5'
                                }} dangerouslySetInnerHTML={{ __html: activity.project.description }} />
                              )}
                              {activity.project.workflow && activity.project.workflow.length > 0 && (
                                <div>
                                  <p style={{
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: '#000000',
                                    margin: '8px 0 6px 0',
                                    textTransform: 'uppercase'
                                  }}>
                                    Workflow Steps
                                  </p>
                                  <ol style={{
                                    margin: '0',
                                    paddingLeft: '20px',
                                    fontSize: '12px',
                                    color: '#666666'
                                  }}>
                                    {activity.project.workflow.map((step, i) => (
                                      <li key={i} style={{ marginBottom: '4px', lineHeight: '1.4' }} dangerouslySetInnerHTML={{ __html: step }}></li>
                                    ))}
                                  </ol>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Code */}
                          {activity.code && (() => {
                            const codeContent = typeof activity.code === 'string' ? activity.code : activity.code?.content;
                            const codeLanguage = typeof activity.code === 'object' ? activity.code?.language : null;
                            
                            if (!codeContent) return null;
                            
                            return (
                              <div style={{
                                marginLeft: '56px',
                                marginTop: '16px',
                                background: '#000000',
                                borderRadius: '10px',
                                padding: '14px',
                                border: '1.5px solid #374151',
                                overflow: 'auto',
                                maxHeight: '400px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Code size={16} color="#E5E7EB" />
                                    <p style={{
                                      fontSize: '12px',
                                      fontWeight: '700',
                                      color: '#E5E7EB',
                                      margin: 0,
                                      textTransform: 'uppercase'
                                    }}>
                                      Code {codeLanguage && `(${codeLanguage})`}
                                    </p>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                      onClick={() => setRegenerateModal({
                                        isOpen: true,
                                        activityIndex: index,
                                        sectionType: 'code',
                                        reason: ''
                                      })}
                                      style={{
                                        background: '#F59E0B',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '4px 10px',
                                        fontSize: '10px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = '#D97706'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = '#F59E0B'}
                                    >
                                      Regenerate
                                    </button>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(codeContent);
                                        alert('Code copied to clipboard!');
                                      }}
                                      style={{
                                        background: '#ffffff4f',
                                        color: '#E5E7EB',
                                        border: '1px solid #4B5563',
                                        borderRadius: '6px',
                                        padding: '6px 12px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#4B5563';
                                        e.currentTarget.style.borderColor = '#6B7280';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#374151';
                                        e.currentTarget.style.borderColor = '#4B5563';
                                      }}
                                      title="Copy code to clipboard"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                </div>
                                <pre style={{
                                  fontSize: '11px',
                                  color: '#6fff6a',
                                  margin: 0,
                                  fontFamily: 'monospace',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word'
                                }}>
                                  {codeContent}
                                </pre>
                              </div>
                            );
                          })()}

                          {/* Activity Feedback */}
                          <div style={{
                            marginLeft: '56px',
                            marginTop: '16px',
                            background: '#FFFFFF',
                            borderRadius: '12px',
                            padding: '16px',
                            border: '1px solid #E5E7EB',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                
                                <p style={{
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: '#111827',
                                  margin: 0
                                }}>
                                  Activity Feedback
                                </p>
                              </div>
                              {editingActivityId !== index && (
                                <button
                                  onClick={() => {
                                    handleAddFeedback(() => {
                                      setEditingActivityId(index);
                                      setActivityFeedbackMap(prev => {
                                        const updated = {
                                          ...prev,
                                          [index]: {
                                            rating: activity.feedback?.rating || 0,
                                            coachComment: activity.feedback?.coachComment || ''
                                          }
                                        };
                                        return updated;
                                      });
                                    });
                                  }}
                                  style={{
                                    background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #000000ff 0%, #060030ff 100%)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)'}
                                >
                                  {activity.feedback ? 'Edit' : 'Add Feedback'}
                                </button>
                              )}
                            </div>

                            {editingActivityId === index ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#000000', margin: '0 0 6px 0' }}>
                                    Rating (1-5 stars)
                                  </p>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    {[1, 2, 3, 4, 5].map((star) => {
                                      const currentFeedback = getCurrentActivityFeedback();
                                      return (
                                        <button
                                          key={star}
                                          onClick={() => setCurrentActivityFeedback({ ...currentFeedback, rating: star })}
                                          style={{
                                            width: '28px',
                                            height: '28px',
                                            border: 'none',
                                            background: '#FFF',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '18px',
                                            fontWeight: 'bold',
                                            color: currentFeedback.rating >= star ? '#FCD34D' : '#808080',
                                            transition: 'all 0.2s ease'
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.color = '#FCD34D';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.color = currentFeedback.rating >= star ? '#FCD34D' : '#7c7c7c';
                                          }}
                                        >
                                          ★
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div>
                                  <p style={{ fontSize: '11px', fontWeight: '600', color: '', margin: '0 0 6px 0' }}>
                                    Coach Comment
                                  </p>
                                  <textarea
                                    value={getCurrentActivityFeedback().coachComment}
                                    onChange={(e) => {
                                      const currentFeedback = getCurrentActivityFeedback();
                                      setCurrentActivityFeedback({ ...currentFeedback, coachComment: e.target.value });
                                    }}
                                    placeholder="Add your feedback for this activity..."
                                    style={{
                                      width: '100%',
                                      padding: '8px',
                                      borderRadius: '6px',
                                      border: '1px solid #E5E7EB',
                                      fontFamily: 'inherit',
                                      fontSize: '12px',
                                      color: '#475569',
                                      minHeight: '80px',
                                      resize: 'vertical',
                                      boxSizing: 'border-box'
                                    }}
                                  />
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={() => {
                                      saveActivityFeedback(index, getCurrentActivityFeedback());
                                      setEditingActivityId(null);
                                    }}
                                    style={{
                                      flex: 1,
                                      background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '8px 12px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #000000ff 0%, #060030ff 100%)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)'}
                                  >
                                    Save Feedback
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActivityFeedbackMap(prev => {
                                        const updated = { ...prev };
                                        updated[index] = { rating: 0, coachComment: '' };
                                        return updated;
                                      });
                                    }}
                                    style={{
                                      flex: 1,
                                      background: '#FEE2E2',
                                      color: '#DC2626',
                                      border: '1px solid #FECACA',
                                      borderRadius: '6px',
                                      padding: '8px 12px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#FCA5A5';
                                      e.currentTarget.style.borderColor = '#F87171';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = '#FEE2E2';
                                      e.currentTarget.style.borderColor = '#FECACA';
                                    }}
                                    title="Clear form and reset to empty"
                                  >
                                    Clear
                                  </button>
                                  <button
                                    onClick={() => setEditingActivityId(null)}
                                    style={{
                                      flex: 1,
                                      background: '#E5E7EB',
                                      color: '#475569',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '8px 12px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#D1D5DB'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#E5E7EB'}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : activity.feedback && (activity.feedback.rating > 0 || activity.feedback.coachComment) ? (
                              <>
                                {activity.feedback.rating > 0 && (
                                  <div style={{ marginBottom: '10px' }}>
                                    <p style={{ fontSize: '11px', fontWeight: '600', color: '#000000', margin: '0 0 6px 0' }}>
                                      Rating
                                    </p>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                      {[...Array(5)].map((_, i) => (
                                        <div
                                          key={i}
                                          style={{
                                            fontSize: '18px',
                                            color: i < activity.feedback.rating ? '#FCD34D' : '#E5E7EB'
                                          }}
                                        >
                                          ★
                                        </div>
                                      ))}
                                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#000000', marginLeft: '6px' }}>
                                        {activity.feedback.rating}/5
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {activity.feedback.coachComment && (
                                  <div>
                                    <p style={{ fontSize: '11px', fontWeight: '600', color: '#000000', margin: '0 0 6px 0' }}>
                                      Comment
                                    </p>
                                    <p style={{ fontSize: '12px', color: '#000000', margin: 0, lineHeight: '1.5', backgroundColor:'#f1f1f1', padding:'10px', borderRadius:'6px' }}>
                                      {activity.feedback.coachComment}
                                    </p>
                                  </div>
                                )}
                              </>
                            ) : (
                              <p style={{ fontSize: '12px', color: '#A78BBA', margin: 0, fontStyle: 'italic' }}>
                                No feedback added yet
                              </p>
                            )}
                          </div>
                          </div>
                          )}
                        </div>
                      );
                      })
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#64748B' }}>
                        No activities found
                      </div>
                    )}
                  </div>
                </div>

                {/* Session Metadata Section */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  marginBottom: '32px'
                }}>
                  {sessionData.completedAt && (
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB',
                      padding: '16px 20px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                    }}>
                      <p style={{ fontSize: '11px', color: '#6B7280', margin: '0 0 4px 0', fontWeight: '600' }}>
                        Completed At
                      </p>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0 }}>
                        {new Date(sessionData.completedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}

                  {sessionData.regeneratedCount !== undefined && (
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB',
                      padding: '16px 20px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                    }}>
                      <p style={{ fontSize: '11px', color: '#6B7280', margin: '0 0 4px 0', fontWeight: '600' }}>
                        Regenerated
                      </p>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0 }}>
                        {sessionData.regeneratedCount} time{sessionData.regeneratedCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}

                  {sessionData.lastRegeneratedAt && (
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB',
                      padding: '16px 20px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                    }}>
                      <p style={{ fontSize: '11px', color: '#6B7280', margin: '0 0 4px 0', fontWeight: '600' }}>
                        Last Regenerated
                      </p>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0 }}>
                        {new Date(sessionData.lastRegeneratedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}

                  {sessionData.createdByCoach && (
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E5E7EB',
                      padding: '16px 20px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)'
                    }}>
                      <p style={{ fontSize: '11px', color: '#6B7280', margin: '0 0 4px 0', fontWeight: '600' }}>
                        Created By
                      </p>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0 }}>
                        {sessionData.createdByCoach.coachName || sessionData.createdByCoach.name || 'Coach'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Session Takeaways Section */}
                {sessionData.sessionTakeaways && sessionData.sessionTakeaways.length > 0 && (
                  <div style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                    marginBottom: '24px'
                  }}>
                    <div style={{
                      background: '#F9FAFB',
                      borderBottom: '1px solid #E5E7EB',
                      padding: '16px 20px'
                    }}>
                      <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                        Key Takeaways
                      </h2>
                    </div>
                    <div style={{ padding: '20px' }}>
                      {sessionData.sessionTakeaways.map((takeaway, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            marginBottom: index < sessionData.sessionTakeaways.length - 1 ? '12px' : '0'
                          }}
                        >
                          <div style={{
                            width: '6px',
                            height: '6px',
                            background: '#060030ff',
                            borderRadius: '50%',
                            marginTop: '8px',
                            flexShrink: 0
                          }} />
                          <p style={{ fontSize: '14px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
                            {takeaway}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Overall Feedback Section */}
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                  marginTop: '24px'
                }}>
                  <div style={{
                    background: '#F9FAFB',
                    borderBottom: '1px solid #E5E7EB',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                        Overall Session Feedback
                      </h2>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', background: '#FFFFFF', borderRadius: '8px', padding: '6px 12px', border: '1px solid #E5E7EB' }}>
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            style={{
                              fontSize: '20px',
                              color: (sessionData.feedback?.rating && i < sessionData.feedback.rating) ? '#FCD34D' : '#E5E7EB'
                            }}
                          >
                            ★
                          </div>
                        ))}
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#000000', marginLeft: '8px' }}>
                          {sessionData.feedback?.rating || 0}/5
                        </span>
                      </div>
                    </div>
                    {!editingSessionFeedback && (
                      <button
                        onClick={() => {
                          handleAddFeedback(() => {
                            setEditingSessionFeedback(true);
                            setSessionFeedback({
                              rating: sessionData.feedback?.rating || 0,
                              coachComment: sessionData.feedback?.coachComment || ''
                            });
                          });
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #000000ff 0%, #060030ff 100%)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)'}
                      >
                        {sessionData.feedback ? 'Edit' : 'Add Feedback'}
                      </button>
                    )}
                  </div>
                  <div style={{ padding: '20px' }}>
                    {editingSessionFeedback ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: '#000000', margin: '0 0 8px 0' }}>
                            Session Rating (1-5 stars)
                          </p>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setSessionFeedback({ ...sessionFeedback, rating: star })}
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  border: 'none',
                                  background: '#F9FAFB',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '24px',
                                  fontWeight: 'bold',
                                  color: sessionFeedback.rating >= star ? '#FCD34D' : '#E5E7EB',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = '#FCD34D';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = sessionFeedback.rating >= star ? '#FCD34D' : '#E5E7EB';
                                }}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: '#000000', margin: '0 0 8px 0' }}>
                            Session Comment
                          </p>
                          <textarea
                            value={sessionFeedback.coachComment}
                            onChange={(e) => setSessionFeedback({ ...sessionFeedback, coachComment: e.target.value })}
                            placeholder="Add your overall feedback for this session..."
                            style={{
                              width: '100%',
                              padding: '10px',
                              borderRadius: '6px',
                              border: '1.5px solid #E5E7EB',
                              fontFamily: 'inherit',
                              fontSize: '13px',
                              color: '#475569',
                              minHeight: '100px',
                              resize: 'vertical',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              // Save to both sessionData.feedback and sessionFeedback state
                              setSessionData(prev => ({
                                ...prev,
                                feedback: sessionFeedback
                              }));
                              saveSessionFeedback(sessionFeedback);
                              setEditingSessionFeedback(false);
                            }}
                            style={{
                              flex: 1,
                              background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '10px 14px',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #000000ff 0%, #060030ff 100%)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)'}
                          >
                            Save Session Feedback
                          </button>
                          <button
                            onClick={() => {
                              setSessionFeedback({ rating: 0, coachComment: '' });
                            }}
                            style={{
                              flex: 1,
                              background: '#FEE2E2',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              borderRadius: '6px',
                              padding: '10px 14px',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#FCA5A5';
                              e.currentTarget.style.borderColor = '#F87171';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#FEE2E2';
                              e.currentTarget.style.borderColor = '#FECACA';
                            }}
                            title="Clear form and reset to empty"
                          >
                            Clear
                          </button>
                          <button
                            onClick={() => setEditingSessionFeedback(false)}
                            style={{
                              flex: 1,
                              background: '#F3F4F6',
                              color: '#6B7280',
                              border: '1px solid #E5E7EB',
                              borderRadius: '6px',
                              padding: '10px 14px',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#E5E7EB'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#F3F4F6'}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : sessionData.feedback ? (
                      <>
                        {sessionData.feedback.coachComment && (
                          <div>
                            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', margin: '0 0 8px 0' }}>
                              Comment
                            </p>
                            <p style={{ fontSize: '14px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
                              {sessionData.feedback.coachComment}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p style={{ fontSize: '13px', color: '#A78BBA', margin: 0, fontStyle: 'italic' }}>
                        No overall feedback added yet
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Player Details Sidebar */}
              <div>
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  padding: '20px',
                  color: '#111827',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
                  position: 'sticky',
                  top: '20px'
                }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 16px 0', color: '#111827' }}>
                    SESSION DETAILS
                  </h3>

                  {/* Player Avatar/Name */}
                  <div style={{
                    background: '#F9FAFB',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    padding: '16px',
                    marginBottom: '16px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: '#FFFFFF'
                    }}>
                      {(playerData?.name || playerData?.playerName || 'P')?.charAt(0)}
                    </div>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0', color: '#111827' }}>
                      {playerData?.name || playerData?.playerName || 'Unknown Player'}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                      {playerData?.email || 'N/A'}
                    </p>
                  </div>


                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '11px', color: '#6B7280', margin: '0 0 8px 0', fontWeight: '600' }}>
                      Coach
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: '#111827' }}>
                      {currentUser?.name || 'N/A'}
                    </p>
                  </div>

                  {/* Birthday Section */}
                  {(() => {
                    
                    return playerData?.dateOfBirth && (
                      <div style={{ marginBottom: '16px' }}>
                        <p style={{ fontSize: '11px', color: '#6B7280', margin: '0 0 8px 0', fontWeight: '600' }}>
                          Birthday
                        </p>
                        <p style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: '#111827' }}>
                          {new Date(playerData.dateOfBirth).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        {(() => {
                          const today = new Date();
                          const birthdayDate = new Date(playerData.dateOfBirth);
                          const isBirthdayToday = 
                            today.getMonth() === birthdayDate.getMonth() &&
                            today.getDate() === birthdayDate.getDate();
                          
                          return isBirthdayToday ? (
                            <div style={{
                              background: '#FEF3C7',
                              borderRadius: '8px',
                              padding: '10px',
                              marginTop: '8px',
                              textAlign: 'center',
                              border: '1px solid #FCD34D'
                            }}>
                              <p style={{ 
                                fontSize: '12px', 
                                fontWeight: '600',
                                color: '#92400E',
                                margin: 0,
                                animation: 'pulse 1.5s infinite'
                              }}>
                                It's {(playerData?.name || playerData?.playerName || 'Friend').split(' ')[0]}'s Birthday Today! 🎉
                              </p>
                              <p style={{
                                fontSize: '11px',
                                color: '#B45309',
                                margin: '4px 0 0 0',
                                fontStyle: 'italic'
                              }}>
                                Don't forget to send a birthday wish!
                              </p>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    );
                  })()}

                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '11px', color: '#6B7280', margin: '0 0 8px 0', fontWeight: '600' }}>
                      Total Points
                    </p>
                    <p style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#111827' }}>
                      {playerData?.totalPoints || 0}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div style={{
                    background: '#F9FAFB',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    padding: '12px',
                    marginBottom: '16px'
                  }}>
                    <p style={{ fontSize: '11px', color: '#6B7280', margin: '0 0 8px 0', fontWeight: '600' }}>
                      Progress (Activities with Feedback)
                    </p>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      background: '#E5E7EB',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      marginBottom: '4px'
                    }}>
                      <div style={{
                        width: `${calculateProgress()}%`,
                        height: '100%',
                        background: 'linear-gradient(135deg, rgb(94, 94, 94) 0%, #000000ff 100%)'
                      }} />
                    </div>
                    <p style={{ fontSize: '11px', color: '#6B7280', margin: 0, textAlign: 'right' }}>
                      {calculateProgress()}%
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div style={{
                    background: '#DCFCE7',
                    color: '#166534',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontWeight: '600',
                    fontSize: '12px',
                    textTransform: 'capitalize',
                    marginBottom: '16px'
                  }}>
                    {playerData?.status || 'Active'}
                  </div>

                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    {(sessionData.status === 'draft' || sessionData.status === 'upcoming') && (
                      <button 
                        onClick={handleStartSession}
                        disabled={isSubmitting}
                        style={{
                          padding: '12px 24px',
                          background: isSubmitting ? '#94A3B8' : '#6366F1',
                          color: 'white',
                          border: 'none',
                          width: '100%',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: isSubmitting ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          opacity: isSubmitting ? 0.7 : 1,
                          pointerEvents: isSubmitting ? 'none' : 'auto'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSubmitting) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}>
                        {isSubmitting ? 'Starting...' : 'Start Session'}
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        handleSaveDraft();
                      }}
                      disabled={isSubmitting}
                      style={{
                        padding: '12px 24px',
                        background: isSubmitting ? '#94A3B8' : '#F59E0B',
                        color: 'white',
                        border: 'none',
                        width: '100%',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: isSubmitting ? 0.7 : 1,
                        pointerEvents: isSubmitting ? 'none' : 'auto'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSubmitting) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}>
                      Save Draft
                    </button>
                    <button 
                      onClick={() => {
                        handleCompleteSession();
                      }}
                      disabled={isSubmitting}
                      style={{
                        padding: '12px 24px',
                        background: isSubmitting ? '#94A3B8' : 'linear-gradient(135deg, #060030ff, #000000)',
                        color: 'white',
                        border: 'none',
                        width: '100%',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: isSubmitting ? 0.7 : 1,
                        pointerEvents: isSubmitting ? 'none' : 'auto'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSubmitting) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 0, 48, 0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}>
                      {isSubmitting ? 'Completing...' : 'Complete Session'}
                    </button>
                    <button
                      onClick={handleGenerateWhatsAppFeedback}
                      disabled={isSubmitting}
                      style={{
                        padding: '12px 24px',
                        background: isSubmitting ? '#94A3B8' : '#25D366',
                        color: 'white',
                        border: 'none',
                        width: '100%',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: isSubmitting ? 0.7 : 1,
                        pointerEvents: isSubmitting ? 'none' : 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSubmitting) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 211, 102, 0.35)';
                          e.currentTarget.style.background = '#1ebe5d';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.background = '#25D366';
                      }}
                    >
                      <MessageSquare size={15} />
                      WhatsApp Feedback
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Regenerate Modal */}
            {regenerateModal.isOpen && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '32px',
                  maxWidth: '500px',
                  width: '90%',
                  boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
                  animation: 'slideIn 0.3s ease'
                }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 24px 0' }}>
                    Regenerate Content
                  </h3>

                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', margin: '0 0 8px 0' }}>
                      Activity Sequence
                    </p>
                    <p style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0 }}>
                      {sessionData?.activities[regenerateModal.activityIndex]?.activitySequence || 'N/A'}
                    </p>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', margin: '0 0 8px 0' }}>
                      Activity Name
                    </p>
                    <p style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0 }}>
                      {sessionData?.activities[regenerateModal.activityIndex]?.activityTitle || 'N/A'}
                    </p>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', margin: '0 0 8px 0' }}>
                      Section Type
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0, textTransform: 'capitalize' }}>
                      {regenerateModal.sectionType === 'instructions' ? 'Instructions to Coach' : regenerateModal.sectionType === 'story' ? 'Story/Narrative' : 'Code'}
                    </p>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#666', display: 'block', margin: '0 0 8px 0' }}>
                      Reason for Regenerate *
                    </label>
                    <textarea
                      value={regenerateModal.reason}
                      onChange={(e) => setRegenerateModal(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Enter your reason for regenerating this content..."
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1.5px solid #E2E8F0',
                        fontFamily: 'inherit',
                        fontSize: '13px',
                        color: '#475569',
                        minHeight: '100px',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#3B82F6';
                        e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#E2E8F0';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setRegenerateModal({ isOpen: false, activityIndex: null, sectionType: null, reason: '' })}
                      style={{
                        padding: '10px 24px',
                        background: '#E5E7EB',
                        color: '#475569',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#D1D5DB'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#E5E7EB'}
                    >
                      Cancel
                    </button>
                    <button
                      disabled={isRegenerating}
                      onClick={async () => {
                        if (!regenerateModal.reason.trim()) {
                          alert('Please enter a reason for regenerating this content.');
                          return;
                        }

                        setIsRegenerating(true);
                        try {
                          const activity = sessionData?.activities[regenerateModal.activityIndex];
                          if (!activity) {
                            alert('Activity not found');
                            return;
                          }

                          // Map sectionType to fieldsToRegenerate array
                          const fieldMap = {
                            'story': ['story'],
                            'instructions': ['instructionsToCoach'],
                            'code': ['code']
                          };

                          const payload = {
                            cardId: sessionData?._id?.$oid || sessionData?._id,
                            activitySequence: activity.activitySequence,
                            fieldsToRegenerate: fieldMap[regenerateModal.sectionType] || [regenerateModal.sectionType],
                            reason: regenerateModal.reason
                          };

                          const token = userToken || localStorage.getItem('userToken');
                          if (!token) {
                            throw new Error('Authentication token not found. Please login again.');
                          }

                          console.log('Token:', token?.substring(0, 20) + '...');
                          console.log('Token length:', token?.length);
                          console.log('Regenerate Request:', {
                            url: 'https://zls9gecyz6.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_Regenrating_Session_Card',
                            payload,
                            tokenPresent: !!token
                          });

                          const headers = {
                            'Content-Type': 'application/json',
                            'userToken': token,
                            'Authorization': `Bearer ${token}`
                          };

                          console.log('Request Headers:', headers);
                          console.log('Headers Keys:', Object.keys(headers));
                          console.log('Headers Values:', {
                            'Content-Type': headers['Content-Type'],
                            'userToken': headers['userToken']?.substring(0, 20) + '...',
                            'Authorization': headers['Authorization']?.substring(0, 30) + '...'
                          });

                          const response = await fetch(
                            'https://zls9gecyz6.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_Regenrating_Session_Card',
                            {
                              method: 'POST',
                              headers: headers,
                              body: JSON.stringify(payload)
                            }
                          );

                          console.log('Regenerate Response Status:', response.status);
                          
                          const responseText = await response.text();
                          console.log('Response Text:', responseText);
                          
                          let result;
                          try {
                            result = JSON.parse(responseText);
                          } catch {
                            result = { message: responseText };
                          }

                          if (!response.ok) {
                            console.error('Error Response:', result);
                            throw new Error(result.message || `Failed to regenerate: ${response.status} ${response.statusText}`);
                          }

                          console.log('Regenerate Success:', result);
                          console.log('Full Response Object:', JSON.stringify(result, null, 2));
                          
                          // Show success toast
                          const sectionLabel = regenerateModal.sectionType === 'instructions' ? 'Instructions' : regenerateModal.sectionType === 'story' ? 'Story' : 'Code';
                          
                          setToast({
                            isVisible: true,
                            message: `${sectionLabel} regenerated successfully! Refreshing content...`,
                            type: 'success'
                          });

                          // Refetch the session data to get the updated content
                          try {
                            const token = userToken || localStorage.getItem('userToken');
                            const currentSessionId = sessionData._id || sessionData.cardId || sessionData.sessionId || sessionId;
                            
                            console.log('Refetching session data for ID:', currentSessionId);
                            
                            const refreshResponse = await fetch(
                              `https://daq1gxkqd4.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_Get_Session_Details`,
                              {
                                method: 'POST',
                                headers: {
                                  'Accept': 'application/json, text/plain, */*',
                                  'Content-Type': 'application/json',
                                  'userToken': token
                                },
                                body: JSON.stringify({ sessionId: currentSessionId })
                              }
                            );

                            console.log('Refresh response status:', refreshResponse.status);

                            if (refreshResponse.ok) {
                              const refreshResult = await refreshResponse.json();
                              const refreshedSession = refreshResult.data || refreshResult;
                              
                              console.log('Fresh session data received:', refreshedSession);
                              
                              // Sort activities by activitySequence
                              if (refreshedSession.activities) {
                                refreshedSession.activities.sort((a, b) => {
                                  const seqA = a.activitySequence || 0;
                                  const seqB = b.activitySequence || 0;
                                  return seqA - seqB;
                                });
                              }

                              // Update session data with the fresh data
                              setSessionData(refreshedSession);
                              console.log('Session data updated in state');

                              // Ensure the activity is expanded so the new content is visible
                              setExpandedActivities(prev => ({
                                ...prev,
                                [regenerateModal.activityIndex]: true
                              }));

                              setToast({
                                isVisible: true,
                                message: `${sectionLabel} updated successfully!`,
                                type: 'success'
                              });
                            } else {
                              console.error('Failed to refresh session data, status:', refreshResponse.status);
                              const errorText = await refreshResponse.text();
                              console.error('Error response:', errorText);
                              
                              // If it's a 5xx error, try again after a delay
                              if (refreshResponse.status >= 500) {
                                setTimeout(() => {
                                  window.location.reload();
                                }, 2000);
                              }
                            }
                          } catch (refreshErr) {
                            console.error('Error refreshing session data:', refreshErr);
                            console.error('Error type:', refreshErr.name);
                            console.error('Error message:', refreshErr.message);
                            
                            // Reload page if fetch fails
                            setTimeout(() => {
                              window.location.reload();
                            }, 2000);
                          }

                          setRegenerateModal({ isOpen: false, activityIndex: null, sectionType: null, reason: '' });
                        } catch (err) {
                          console.error('Regenerate error:', err);
                          setToast({
                            isVisible: true,
                            message: `Error: ${err.message}`,
                            type: 'error'
                          });
                        } finally {
                          setIsRegenerating(false);
                        }
                      }}
                      style={{
                        padding: '10px 24px',
                        background: isRegenerating ? '#D97706' : '#F59E0B',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: isRegenerating ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: isRegenerating ? 0.85 : 1
                      }}
                      onMouseEnter={(e) => { if (!isRegenerating) e.currentTarget.style.background = '#D97706'; }}
                      onMouseLeave={(e) => { if (!isRegenerating) e.currentTarget.style.background = '#F59E0B'; }}
                    >
                      {isRegenerating && (
                        <span style={{
                          width: '14px',
                          height: '14px',
                          border: '2px solid rgba(255,255,255,0.4)',
                          borderTopColor: 'white',
                          borderRadius: '50%',
                          display: 'inline-block',
                          animation: 'spin 0.7s linear infinite',
                          flexShrink: 0
                        }} />
                      )}
                      {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                    </button>
                  </div>
                </div>

                <style>{`
                  @keyframes slideIn {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            )}

            {/* WhatsApp Feedback Modal */}
            {whatsappModal.isOpen && (
              <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '32px',
                  maxWidth: '540px',
                  width: '90%',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
                  animation: 'slideIn 0.3s ease'
                }}>
                  {/* Modal Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <div style={{
                      width: '40px', height: '40px',
                      background: '#25D366',
                      borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <MessageSquare size={20} color="white" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>
                        WhatsApp Feedback
                      </h3>
                      <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0 0' }}>
                        AI-generated parent message
                      </p>
                    </div>
                  </div>

                  {whatsappModal.isLoading ? (
                    <div style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      padding: '40px 0', gap: '16px'
                    }}>
                      <div style={{
                        width: '40px', height: '40px',
                        border: '3px solid #E5E7EB',
                        borderTopColor: '#25D366',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }} />
                      <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                        Generating AI feedback...
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Average Rating */}
                      {whatsappModal.averageRating > 0 && (
                        <div style={{
                          background: '#F0FDF4',
                          border: '1px solid #BBF7D0',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          marginBottom: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <div style={{ display: 'flex', gap: '3px' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={star} style={{
                                fontSize: '18px',
                                color: star <= Math.round(whatsappModal.averageRating) ? '#FCD34D' : '#D1D5DB'
                              }}>★</span>
                            ))}
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: '#166534' }}>
                            {whatsappModal.averageRating.toFixed(1)} / 5
                          </span>
                          <span style={{ fontSize: '12px', color: '#166534', marginLeft: 'auto' }}>
                            Average Rating
                          </span>
                        </div>
                      )}

                      {/* Message Box */}
                      <div style={{ marginBottom: '20px' }}>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: '#374151', margin: '0 0 8px 0' }}>
                          Message for Parents
                        </p>
                        <textarea
                          readOnly
                          value={whatsappModal.message}
                          style={{
                            width: '100%',
                            minHeight: '200px',
                            padding: '14px',
                            borderRadius: '10px',
                            border: '1.5px solid #E5E7EB',
                            fontFamily: 'inherit',
                            fontSize: '13px',
                            color: '#374151',
                            lineHeight: '1.6',
                            resize: 'vertical',
                            boxSizing: 'border-box',
                            background: '#FAFAFA',
                            cursor: 'text'
                          }}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(whatsappModal.message);
                            setToast({ isVisible: true, message: 'Message copied to clipboard!', type: 'success' });
                          }}
                          style={{
                            flex: 1,
                            padding: '11px 0',
                            background: '#25D366',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#1ebe5d'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#25D366'}
                        >
                          <MessageSquare size={14} />
                          Copy Message
                        </button>
                        <button
                          onClick={() => setWhatsappModal({ isOpen: false, isLoading: false, message: '', averageRating: 0 })}
                          style={{
                            flex: 1,
                            padding: '11px 0',
                            background: '#F3F4F6',
                            color: '#374151',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#E5E7EB'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#F3F4F6'}
                        >
                          Close
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
    </>
  );
}

export default SessionDetail;
