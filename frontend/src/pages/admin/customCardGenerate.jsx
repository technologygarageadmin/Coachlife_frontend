import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/store';
import { useTheme } from '../../context/ThemeContext';
import { Layout } from '../../components/Layout';
import { Toast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import { ArrowLeft, Loader, Sparkles, BookOpen, Zap, GripHorizontal, Trash2, Blocks, ArrowBigUp, ArrowBigDown, ArrowUpDown , CheckCircle2, X, Info, AlertTriangle, Clock, PencilLine } from 'lucide-react';
import axios from 'axios';

const PATHWAY_API_URL = 'https://nvouj7m5fb.execute-api.ap-south-1.amazonaws.com/default/CL_Get_LearningPathway';
const GET_PLAYERS_API = 'https://jrrnyyf9r9.execute-api.ap-south-1.amazonaws.com/default/CL_Get_All_Players';

const CustomCardGenerate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userToken } = useStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const fetchedOnce = useRef(false);

  const playerId = location.state?.playerId;
  const playerName = location.state?.playerName;
  const playerLearningPathway = location.state?.LearningPathway;
  const sessionDate = location.state?.sessionDate;
  const batchGroupId = location.state?.batchGroupId;

  // Batch mode: build one custom card definition, fire the API per player
  const batchMode = location.state?.batchMode || false;
  const batchName = location.state?.batchName || '';
  const batchPlayers = location.state?.batchPlayers || [];
  const [batchStatus, setBatchStatus] = useState({}); // { [playerId]: { state, message } }
  const [batchDone, setBatchDone] = useState(false);

  // Staging/preview mode: arrives pre-loaded with a standard pathway session's
  // content (Topic/Objective/activities) so the admin can review and edit it
  // before the card is actually created, instead of building one from scratch.
  const prefill = location.state?.prefill || null;

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

  // Fetch learning pathways once on mount
  useEffect(() => {
    if (fetchedOnce.current) return;
    fetchedOnce.current = true;
    fetchPathways();
  }, []);

  // Load the staged preview content once, if we arrived from a "preview before
  // generate" entry point rather than starting a card from scratch. Skipped when
  // returning from the activity editor (returnFormData below takes over instead) -
  // location.state still carries the original `prefill` on that round trip since
  // it's spread through unchanged, so without this guard it would stomp the edit.
  const prefillApplied = useRef(false);
  useEffect(() => {
    if (!prefill || prefillApplied.current || location.state?.returnFormData) return;
    prefillApplied.current = true;

    setFormData(prev => ({
      ...prev,
      topic: prefill.Topic || '',
      objective: prefill.Objective || '',
    }));
    setSessionTakeaways(prefill.sessionTakeaways || []);
    setDraggedActivities((prefill.activities || []).map(activity => ({
      id: Date.now() + Math.random(),
      name: activity.activityTitle || activity.name || 'Activity',
      description: activity.description || '',
      story: activity.story || [],
      code: activity.code || null,
      instructionsToCoach: activity.instructionsToCoach || [],
      project: activity.project || null,
      aiTools: activity.aiTools || null,
      points: activity.points || { total: 0, evaluationCriteria: [] },
      duration: activity.duration || 0,
      pathwayName: prefill.LearningPathway,
      sessionNumber: prefill.session,
    })));
  }, [prefill]);

  // Returning from the shared Learning Pathway activity editor: restore the
  // (possibly edited) activity list it hands back, instead of re-running prefill.
  const returnedFromEditorApplied = useRef(false);
  useEffect(() => {
    const rf = location.state?.returnFormData;
    if (!rf || returnedFromEditorApplied.current) return;
    returnedFromEditorApplied.current = true;

    setFormData(prev => ({ ...prev, topic: rf.Topic ?? prev.topic }));
    setDraggedActivities((rf.activities || []).map(activity => ({
      ...activity,
      id: activity.id || (Date.now() + Math.random()),
      name: activity.activityTitle || activity.name || 'Activity',
    })));
  }, [location.state?.returnFormData]);

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

  // Reuse the same activity editor the Learning Pathway builder uses (rich text,
  // structured story/instructions/AI-tools/criteria lists) instead of a simpler
  // one-off modal. It navigates away and back via route state; `...location.state`
  // is spread both ways so this page's player/batch/prefill context survives the
  // round trip untouched.
  const toPathwayActivityShape = (a) => ({
    ...a,
    activityTitle: a.activityTitle || a.name || '',
  });

  const openActivityEditor = (activity, index) => {
    navigate('/admin/learning-pathway/add/activity', {
      state: {
        ...location.state,
        returnFormData: {
          Topic: formData.topic,
          activities: draggedActivities.map(toPathwayActivityShape),
        },
        activityIndex: index,
        activity: toPathwayActivityShape(activity),
        returnPath: '/admin/custom-generate-card',
      },
    });
  };

  const openAddActivity = () => {
    navigate('/admin/learning-pathway/add/activity', {
      state: {
        ...location.state,
        returnFormData: {
          Topic: formData.topic,
          activities: draggedActivities.map(toPathwayActivityShape),
        },
        activityIndex: null,
        activity: {
          activitySequence: (draggedActivities.length || 0) + 1,
          activityTitle: '',
          description: '',
          duration: 0,
          story: null,
          instructionsToCoach: [],
          project: null,
          code: null,
          aiTools: [],
          points: { total: 0, evaluationCriteria: [] },
        },
        returnPath: '/admin/custom-generate-card',
      },
    });
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

    setLoading(true);
    try {
      if (batchMode) {
        await runBatchGenerate();
      } else {
        await sendSessionCardToAPI(buildPayload(playerId, playerLearningPathway));
      }
    } catch (err) {
      console.error('Error creating session card:', err);
      setToastMessage('Failed to create session card');
      setToastType('error');
      setLoading(false);
    }
  };

  // Build the custom-card payload for one player (same definition, swapped player)
  const buildPayload = (targetPlayerId, targetPathway) => {
    const totalPoints = draggedActivities.reduce((sum, activity) => {
      if (activity.points && typeof activity.points === 'object' && activity.points.total) {
        return sum + activity.points.total;
      }
      return sum;
    }, 0);

    return {
      playerId: targetPlayerId,
      LearningPathway: targetPathway,
      Topic: formData.topic,
      typeOfSessioncard: 'Custom',
      Objective: formData.objective.trim() || 'No objective',
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
      sessionTakeaways: sessionTakeaways.length > 0 ? sessionTakeaways : ['No session takeaway'],
      status: 'upcoming',
      rating: 0,
      feedback: null,
      sessionDate: sessionDate || undefined,
      batchGroupId: batchGroupId || undefined,
    };
  };

  // Fire the custom-card API for every player in the batch, one by one
  const runBatchGenerate = async () => {
    let success = 0;
    let failed = 0;

    for (const player of batchPlayers) {
      setBatchStatus(prev => ({ ...prev, [player.playerId]: { state: 'loading' } }));
      // A staged (pathway-sourced) batch edit uses one shared pathway for every
      // player, same as the standard batch-generate flow - not each player's own
      // individual profile pathway, which is only the fallback for a from-scratch
      // custom build.
      const targetPathway = prefill?.LearningPathway || player.LearningPathway || playerLearningPathway;
      const result = await postCustomCard(buildPayload(player.playerId, targetPathway));
      if (result.ok) {
        success += 1;
        setBatchStatus(prev => ({ ...prev, [player.playerId]: { state: 'success' } }));
      } else {
        failed += 1;
        setBatchStatus(prev => ({ ...prev, [player.playerId]: { state: 'error', message: result.message } }));
      }
    }

    setBatchDone(true);
    setLoading(false);
    setToastMessage(failed === 0
      ? `Created ${success} card${success === 1 ? '' : 's'} successfully!`
      : `Created ${success} of ${batchPlayers.length}, ${failed} failed`);
    setToastType(failed === 0 ? 'success' : 'error');
  };

  // Low-level POST to the custom-card API. Returns { ok, message }.
  const postCustomCard = async (payload) => {
    try {
      const API_URL = 'https://txxt9hve7k.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_Custome_Sessioncard';
      const headers = {
        'Content-Type': 'application/json',
        'Accept': '*/*'
      };
      if (userToken) {
        headers['userToken'] = userToken;
        headers['Authorization'] = `Bearer ${userToken}`;
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      let responseData;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      let parsedBody = responseData;
      if (typeof parsedBody === 'string') {
        try { parsedBody = JSON.parse(parsedBody); } catch { /* ignore */ }
      }

      if (!response.ok) {
        return { ok: false, message: parsedBody?.message || parsedBody?.error || `API returned ${response.status}: ${response.statusText}` };
      }
      if (!parsedBody?.session) {
        return { ok: false, message: parsedBody?.message || 'Failed to create session card' };
      }
      return { ok: true, message: 'Created' };
    } catch (err) {
      return { ok: false, message: err.message || 'Failed to create session card' };
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

      // Parse body if it came back as a string
      let parsedBody = responseData;
      if (typeof parsedBody === 'string') {
        try { parsedBody = JSON.parse(parsedBody); } catch { /* ignore */ }
      }

      if (!response.ok) {
        throw new Error(
          parsedBody?.message ||
          parsedBody?.error ||
          `API returned ${response.status}: ${response.statusText}`
        );
      }

      // Guard: backend returns 200 but may have blocked creation (no 'session' in body)
      if (!parsedBody?.session) {
        setToastMessage(parsedBody?.message || 'Failed to create session card');
        setToastType('error');
        setLoading(false);
        return;
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

  const surface = dark ? 'var(--cl-surface)' : '#fff';
  const border = dark ? 'var(--cl-border)' : '#E5E7EB';
  const textPrimary = dark ? 'var(--cl-text)' : '#111827';
  const textMuted = dark ? 'var(--cl-text-3)' : '#94A3B8';
  const surface2 = dark ? 'var(--cl-surface-2)' : '#F8FAFC';

  return (
    <Layout>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
        @keyframes slideIn { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
      `}</style>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px 40px' }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #060030 0%, #1a0060 50%, #3b0080 100%)',
          borderRadius: '20px', padding: '28px 32px', marginBottom: '24px',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(6,0,48,.4)'
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '20px', right: '80px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(139,92,246,0.2)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-30px', right: '200px', width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(99,102,241,0.12)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Back button */}
            <button
              onClick={() => navigate('/admin/session-card')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all .18s', marginBottom: '20px' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateX(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.transform = 'none'; }}
            >
              <ArrowLeft size={13} /> Session Cards
            </button>

            {/* Main content row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              {/* Icon */}
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
                <Sparkles size={26} color="#fff" />
              </div>

              {/* Title + subtitle */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#fff', margin: '0 0 6px', letterSpacing: '-.6px', lineHeight: 1.1 }}>
                  Custom Session Card
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', fontWeight: '500' }}>
                    {batchMode ? 'Batch generation for' : 'Personalized session for'}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: 'white', background: 'rgba(255,255,255,0.15)', padding: '4px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.25)', fontSize: '13px', backdropFilter: 'blur(8px)' }}>
                    {batchMode ? `${batchName} · ${batchPlayers.length} player${batchPlayers.length !== 1 ? 's' : ''}` : playerName}
                  </span>
                </div>
              </div>

              {/* Right: step indicator */}
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                {[
                  { label: 'Details', done: !!formData.topic.trim() },
                  { label: 'Activities', done: draggedActivities.length > 0 },
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', background: step.done ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)', border: `1px solid ${step.done ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.15)'}`, transition: 'all .3s' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: step.done ? '#10B981' : 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {step.done
                        ? <CheckCircle2 size={11} color="#fff" />
                        : <span style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.6)' }}>{i + 1}</span>
                      }
                    </div>
                    <span style={{ fontSize: '11.5px', fontWeight: '600', color: step.done ? 'rgba(52,211,153,0.9)' : 'rgba(255,255,255,0.5)' }}>{step.label}</span>
                  </div>
                ))}
              </div>
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

        {/* Batch generation progress */}
        {batchMode && (loading || batchDone) && (() => {
          const total = batchPlayers.length;
          const successCount = batchPlayers.filter(p => batchStatus[p.playerId]?.state === 'success').length;
          const failedCount = batchPlayers.filter(p => batchStatus[p.playerId]?.state === 'error').length;
          const processed = successCount + failedCount;
          const pct = total ? Math.round((processed / total) * 100) : 0;
          const allOk = batchDone && failedCount === 0;

          const STATUS_UI = {
            loading: { label: 'Generating', color: '#060030', bg: '#EEF2FF' },
            success: { label: 'Done', color: '#15803D', bg: '#DCFCE7' },
            error:   { label: 'Failed', color: '#B91C1C', bg: '#FEE2E2' },
            idle:    { label: 'Waiting', color: '#6B7280', bg: '#F3F4F6' },
          };

          return (
            <Modal
              isOpen={loading || batchDone}
              onClose={() => { if (batchDone) setBatchDone(false); }}
              title={batchDone ? 'Batch Generation Complete' : 'Generating Session Cards'}
            >
              <div style={{ padding: '20px', width: 'min(92vw, 520px)' }}>

                {/* Summary banner */}
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '18px',
                  background: batchDone
                    ? (allOk ? 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)' : 'linear-gradient(135deg, #FFF7ED 0%, #FEF2F2 100%)')
                    : 'linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)',
                  border: `1px solid ${batchDone ? (allOk ? '#BBF7D0' : '#FED7AA') : '#DDD6FE'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    {!batchDone && <Loader size={18} style={{ animation: 'spin 1s linear infinite', color: '#060030' }} />}
                    {allOk && <CheckCircle2 size={18} color="#16A34A" />}
                    {batchDone && !allOk && <AlertTriangle size={18} color="#EA580C" />}
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>
                      {batchDone
                        ? (allOk ? `All ${total} cards created` : `${successCount} created, ${failedCount} failed`)
                        : `Processing ${processed} of ${total}…`}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: '999px',
                      background: batchDone
                        ? (allOk ? '#16A34A' : 'linear-gradient(90deg, #16A34A, #EA580C)')
                        : 'linear-gradient(90deg, #060030, #6D28D9)',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>

                  {/* Count chips */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {[
                      { n: successCount, label: 'Done', color: '#15803D', bg: '#DCFCE7' },
                      { n: failedCount, label: 'Failed', color: '#B91C1C', bg: '#FEE2E2' },
                      { n: total - processed, label: 'Waiting', color: '#6B7280', bg: '#FFFFFF' },
                    ].map(chip => (
                      <span key={chip.label} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '4px 10px', borderRadius: '999px',
                        fontSize: '12px', fontWeight: '700',
                        color: chip.color, background: chip.bg, border: `1px solid ${chip.color}22`
                      }}>
                        <span style={{ fontSize: '13px' }}>{chip.n}</span>{chip.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Player rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                  {batchPlayers.map(player => {
                    const status = batchStatus[player.playerId]?.state || 'idle';
                    const ui = STATUS_UI[status];
                    const message = batchStatus[player.playerId]?.message;
                    return (
                      <div key={player.playerId} style={{
                        padding: '12px',
                        background: status === 'error' ? '#FFFBFB' : '#FFFFFF',
                        border: `1px solid ${status === 'error' ? '#FECACA' : '#E5E7EB'}`,
                        borderRadius: '10px',
                        transition: 'all 0.2s'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '34px', height: '34px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #060030 0%, #000000 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: '700', fontSize: '13px', flexShrink: 0
                          }}>
                            {(player.playerName || '?').charAt(0).toUpperCase()}
                          </div>
                          <span style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {player.playerName}
                          </span>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0,
                            padding: '4px 10px', borderRadius: '999px',
                            fontSize: '11px', fontWeight: '700', color: ui.color, background: ui.bg
                          }}>
                            {status === 'loading' && <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                            {status === 'success' && <CheckCircle2 size={12} />}
                            {status === 'error' && <AlertTriangle size={12} />}
                            {status === 'idle' && <Clock size={12} />}
                            {ui.label}
                          </span>
                        </div>

                        {/* Inline error reason */}
                        {status === 'error' && message && (
                          <div style={{
                            display: 'flex', alignItems: 'flex-start', gap: '8px',
                            marginTop: '10px', marginLeft: '46px',
                            padding: '8px 10px', background: '#FEF2F2', borderRadius: '8px',
                            border: '1px solid #FECACA'
                          }}>
                            <Info size={14} color="#B91C1C" style={{ flexShrink: 0, marginTop: '1px' }} />
                            <span style={{ fontSize: '12px', color: '#991B1B', lineHeight: '1.5' }}>{message}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {batchDone && (
                  <button
                    onClick={() => navigate('/admin/session-card')}
                    style={{
                      marginTop: '20px', width: '100%', padding: '12px 16px', borderRadius: '10px',
                      fontWeight: '600', background: 'linear-gradient(135deg, #060030 0%, #000000 100%)',
                      color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px'
                    }}
                  >
                    Back to Session Cards
                  </button>
                )}
              </div>
            </Modal>
          );
        })()}

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
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={openAddActivity}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                  borderRadius: '8px', border: '1.5px solid #C7D2FE', background: '#EEF2FF',
                  color: '#4F46E5', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                }}
              >
                <PencilLine size={14} /> Add Activity
              </button>
            </div>
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
                        <button
                          onClick={() => openActivityEditor(activity, index)}
                          title="Edit this activity"
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #C7D2FE',
                            background: '#EEF2FF',
                            color: '#4F46E5',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: '600',
                            gap: '4px',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#E0E7FF'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#EEF2FF'; }}
                        >
                          <PencilLine size={12} /> Edit
                        </button>
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
                  {loading ? 'Creating...' : batchMode ? 'Create for Batch' : 'Create Session Card'}
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
                    Objective
                  </label>
                  <textarea
                    name="objective"
                    value={formData.objective}
                    onChange={handleInputChange}
                    placeholder="e.g., Players should understand the basics of AI"
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
                    Session Takeaways
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
      {/* ── Quick Guide ── */}
        <div style={{ marginTop: '28px', padding: '28px', background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(6,0,48,0.03)', border: `1px solid ${border}`, borderRadius: '16px' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #060030, #3b0080)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={14} color="#fff" />
              </div>
              <h2 style={{ margin: 0, fontWeight: '800', color: textPrimary, fontSize: '16px', letterSpacing: '-.3px' }}>Quick Guide</h2>
            </div>
            <p style={{ margin: '0 0 0 38px', color: textMuted, fontSize: '13px' }}>Follow these steps to build your custom session card</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
            {[
              { step: 1, icon: BookOpen, title: 'Fill Session Details', description: 'Enter the topic, objective, and key takeaways to structure the learning experience.', accent: '#6366F1' },
              { step: 2, icon: Blocks, title: 'Select Learning Pathway', description: 'Choose a pathway to determine which sessions and activities are available.', accent: '#8B5CF6' },
              { step: 3, icon: Zap, title: 'Pick a Session', description: 'Select a specific session from your chosen pathway to access all its activities.', accent: '#A855F7' },
              { step: 4, icon: GripHorizontal, title: 'Drag Activities', description: 'Drag activities from the right panel into the left area to build your session.', accent: '#EC4899' },
              { step: 5, icon: ArrowUpDown, title: 'Organize Order', description: 'Use the up/down arrows to reorder. Sequence numbers update automatically.', accent: '#F59E0B' },
              { step: 6, icon: CheckCircle2, title: 'Review & Finalize', description: 'Click "View Details" on any activity to inspect story, code, and criteria first.', accent: '#10B981' }
            ].map(item => (
              <div key={item.step}
                style={{ padding: '16px', background: surface, border: `1px solid ${border}`, borderRadius: '12px', transition: 'all .18s', cursor: 'default', display: 'flex', gap: '12px', alignItems: 'flex-start' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = dark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(6,0,48,0.1)'; e.currentTarget.style.borderColor = item.accent; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = border; }}
              >
                <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: dark ? `${item.accent}22` : `${item.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                  <item.icon size={16} color={item.accent} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: item.accent, background: dark ? `${item.accent}22` : `${item.accent}15`, padding: '1px 7px', borderRadius: '20px' }}>{item.step}</span>
                    <h3 style={{ margin: 0, fontWeight: '700', color: textPrimary, fontSize: '13px' }}>{item.title}</h3>
                  </div>
                  <p style={{ margin: 0, color: textMuted, fontSize: '12px', lineHeight: '1.6' }}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CustomCardGenerate;
