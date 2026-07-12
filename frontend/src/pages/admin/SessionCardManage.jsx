import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/store';
import { useTheme } from '../../context/ThemeContext';
import { Layout } from '../../components/Layout';
import { Toast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import { Users, Search, Edit3, Trash2, Plus, Eye, ChevronLeft, Loader, Sparkles, Mail, Cake, Phone, Star, Layers, User, CheckCircle, Info, AlertTriangle, Calendar, PencilLine, Play } from 'lucide-react';

// API Endpoints
const API_ENDPOINTS = {
  GET_PLAYERS: 'https://jrrnyyf9r9.execute-api.ap-south-1.amazonaws.com/default/CL_Get_All_Players',
  VIEW_SESSION_CARD: 'https://kyfkhl8v4l.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_View_Sessioncard',
  DELETE_SESSION_CARD: 'https://rmauptygg5.execute-api.ap-south-1.amazonaws.com/Coachlife-com/CL_Deleting_Sessioncard',
  GET_BATCHES: 'https://ts6wti3133.execute-api.ap-south-1.amazonaws.com/default/CL_Get_Batches',
  GENERATE_SESSION_CARD: 'https://qz2us3dk55.execute-api.ap-south-1.amazonaws.com/default/CL_Session_Card_Generating',
  UPDATE_SESSION_CARD: 'https://78nwtutkw0.execute-api.ap-south-1.amazonaws.com/default/CL_Update_Session_Card',
};

const PALETTES = [
  ['#6366F1','#818CF8'], ['#10B981','#34D399'], ['#F59E0B','#FBBF24'],
  ['#EC4899','#F472B6'], ['#3B82F6','#60A5FA'], ['#8B5CF6','#A78BFA'],
  ['#EF4444','#F87171'], ['#06B6D4','#22D3EE'],
];
const pal = (name = '') => PALETTES[(name.charCodeAt(0) || 0) % PALETTES.length];

const Sk = ({ w, h, r = 8 }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: '#EEF2F7', animation: 'skPulse 1.6s ease-in-out infinite', flexShrink: 0 }} />
);

const SummaryCard = ({ label, value, icon: SIcon, accent, dark }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: dark ? 'var(--cl-surface)' : '#fff',
      border: `1.5px solid ${hov ? accent + '44' : (dark ? 'var(--cl-border)' : '#F1F5F9')}`,
      borderRadius: '16px', padding: '18px 20px',
      boxShadow: hov ? `0 8px 24px ${accent}20` : '0 2px 6px rgba(0,0,0,.04)',
      display: 'flex', alignItems: 'center', gap: '14px',
      transition: 'all .22s ease', transform: hov ? 'translateY(-2px)' : 'none',
      flex: 1, minWidth: '140px',
    }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '13px', flexShrink: 0, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <SIcon size={22} color={accent} />
      </div>
      <div>
        <p style={{ fontSize: '10.5px', fontWeight: '700', color: dark ? 'var(--cl-text-3)' : '#94A3B8', margin: 0, textTransform: 'uppercase', letterSpacing: '.6px' }}>{label}</p>
        <p style={{ fontSize: '22px', fontWeight: '800', color: dark ? 'var(--cl-text)' : '#0F172A', margin: '3px 0 0', letterSpacing: '-1px' }}>{value}</p>
      </div>
    </div>
  );
};

const SessionCardManage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userToken, selectedPlayer, setSelectedPlayer, learningPathway, fetchLearningPathway } = useStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [players, setPlayers] = useState([]);
  const [sessionCards, setSessionCards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cardSearchTerm, setCardSearchTerm] = useState('');
  const [cardSortBy] = useState('name');
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isLoadingSessionCards, setIsLoadingSessionCards] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateFormData, setGenerateFormData] = useState({
    topic: '',
    objective: '',
    duration: 30
  });
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  // Batch view state
  const [viewMode, setViewMode] = useState('batch'); // 'Player' | 'batch'
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(() => {
    try { return localStorage.getItem('cl_admin_sessioncard_batch') || ''; } catch { return ''; }
  });
  const [batchGenStatus, setBatchGenStatus] = useState({}); // { [playerId]: { state, message } }
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [errorDetail, setErrorDetail] = useState(null); // { playerName, message }

  // Per-player "what session are they actually on" info, read from their real
  // latest card - not guessed. Powers the session pill + the preview-before-generate.
  const [playerCardInfo, setPlayerCardInfo] = useState({}); // { [playerId]: { session, sessionDate, status, cardId } | null }
  const [cardInfoLoading, setCardInfoLoading] = useState(false);
  const [batchAllCards, setBatchAllCards] = useState({}); // { [playerId]: [full card, ...] }
  const [batchCardsLoading, setBatchCardsLoading] = useState(false);
  const [showBatchPreview, setShowBatchPreview] = useState(false);
  const [batchPreviewRows, setBatchPreviewRows] = useState([]);
  const [batchPreviewLoading, setBatchPreviewLoading] = useState(false);
  const [previewSessionDate, setPreviewSessionDate] = useState('');
  const [previewBatchGroupId, setPreviewBatchGroupId] = useState('');

  // "Custom" batch generation asks for a session date first, then navigates to
  // the custom-card builder with that date (and a shared batchGroupId) carried along.
  const [showCustomDatePrompt, setShowCustomDatePrompt] = useState(false);
  const [customSessionDate, setCustomSessionDate] = useState('');


  const isMobile = windowWidth < 640;
  const isNarrow = windowWidth < 1024;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-select batch when navigated from BatchSessionView
  useEffect(() => {
    const batchId = location.state?.batchId;
    if (batchId) {
      setViewMode('batch');
      setSelectedBatchId(batchId);
    }
  }, []);

  // Remember the last selected batch so a page refresh returns to it.
  useEffect(() => {
    try {
      if (selectedBatchId) localStorage.setItem('cl_admin_sessioncard_batch', selectedBatchId);
      else localStorage.removeItem('cl_admin_sessioncard_batch');
    } catch { /* ignore */ }
  }, [selectedBatchId]);

  // Whenever a batch is shown, pull a FRESH players list (bypassing the 5-min
  // cache) so each member's sessionCardIds are current - this is what makes the
  // card grid load reliably instead of from a stale cache after a
  // generate/start/delete or a navigation back into the page.
  useEffect(() => {
    if (viewMode === 'batch' && selectedBatchId) {
      fetchPlayers(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatchId, viewMode]);

  const isFirstMount = useRef(true);

  // Fetch data once on mount + on each navigation visit
  useEffect(() => {
    setIsFetching(true);
    setSessionCards([]);
    if (!isFirstMount.current) {
      setSelectedPlayer(null);
    }
    isFirstMount.current = false;
    fetchPlayers();
    fetchBatches();
    fetchLearningPathway();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // Fetch session cards when player is selected (with caching)
  useEffect(() => {
    if (selectedPlayer && selectedPlayer.sessionCardIds && selectedPlayer.sessionCardIds.length > 0) {
      const playerId = selectedPlayer.playerId;
      fetchPlayerSessionCards(selectedPlayer.sessionCardIds, playerId);
    } else {
      setSessionCards([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayer?.playerId, JSON.stringify(selectedPlayer?.sessionCardIds)]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        setShowGenerateModal(false);
      }
      if (e.ctrlKey && e.key === 'n' && selectedPlayer) {
        e.preventDefault();
        setShowGenerateModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedPlayer]);

  // Fetch all players
  const fetchPlayers = async () => {
    try {
      setIsFetching(true);
      const response = await fetch(API_ENDPOINTS.GET_PLAYERS, {
        headers: {
          'userToken': userToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch players');

      const data = await response.json();
      let playersList = [];

      if (Array.isArray(data)) {
        playersList = data;
      } else if (data.data && Array.isArray(data.data)) {
        playersList = data.data;
      } else if (data.players && Array.isArray(data.players)) {
        playersList = data.players;
      }

      const transformedPlayers = playersList.map(p => ({
        playerId: p._id || p.playerId || p.id,
        playerName: p.playerName || p.name,
        email: p.email || '',
        age: p.age || 0,
        LearningPathway: p.LearningPathway || '',
        totalPoints: p.TotalPoints || p.totalPoints || 0,
        phone: p.phone || p.mobile || '',
        address: p.address || '',
        sessionCardIds: p.sessionCardIds || []
      }));

      setPlayers(transformedPlayers);
      return transformedPlayers;
    } catch (err) {
      console.error('Error fetching players:', err);
      setToastMessage('Failed to load players');
      setToastType('error');
      return [];
    } finally {
      setIsFetching(false);
    }
  };

  // Fetch all batches
  const fetchBatches = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.GET_BATCHES, {
        headers: {
          'userToken': userToken,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch batches');
      let data = await response.json();
      if (data?.body && typeof data.body === 'string') data = JSON.parse(data.body);
      setBatches(Array.isArray(data) ? data : (data.batches || []));
    } catch (err) {
      console.error('Error fetching batches:', err);
      setBatches([]);
    }
  };

  // Fetch session cards for selected player
  const fetchPlayerSessionCards = async (sessionCardIds) => {
    try {
      setIsLoadingSessionCards(true);
      const cards = [];
      for (const cardId of sessionCardIds) {
        const response = await fetch(API_ENDPOINTS.VIEW_SESSION_CARD, {
          method: 'POST',
          headers: {
            'userToken': userToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sessionCardId: cardId })
        });

        if (response.ok) {
          const data = await response.json();
          const sessionCard = data.sessionCard || data.data || data;
          cards.push({
            _id: cardId,
            ...sessionCard
          });
        }
      }
      setSessionCards(cards);
    } catch (err) {
      console.error('Error fetching session cards:', err);
      setSessionCards([]);
    } finally {
      setIsLoadingSessionCards(false);
    }
  };

  const filteredPlayers = players.filter(p =>
    p.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Real batches + a synthetic "General (unassigned)" group; each player enriched
  // with their profile LearningPathway (batch API only returns id + name).
  const displayBatches = useMemo(() => {
    const enrich = (bp) => {
      const profile = players.find(p => String(p.playerId) === String(bp.playerId));
      return {
        playerId: bp.playerId,
        playerName: bp.playerName || profile?.playerName || '',
        LearningPathway: profile?.LearningPathway || bp.LearningPathway || ''
      };
    };

    const real = batches.map(b => ({
      batchId: b.batchId,
      batchName: b.batchName,
      LearningPathway: b.LearningPathway || '',
      players: (b.players || (b.playerIds || []).map(id => ({ playerId: id }))).map(enrich)
    }));

    const batchedIds = new Set(batches.flatMap(b => b.playerIds || (b.players || []).map(p => p.playerId)));
    const unbatched = players.filter(p => !batchedIds.has(p.playerId));
    if (unbatched.length === 0) return real;

    return [...real, {
      batchId: 'general',
      batchName: `General (${unbatched.length} unassigned)`,
      players: unbatched.map(p => ({
        playerId: p.playerId,
        playerName: p.playerName,
        LearningPathway: p.LearningPathway || ''
      }))
    }];
  }, [batches, players]);

  const selectedBatch = displayBatches.find(b => b.batchId === selectedBatchId) || null;

  // Signature of how many cards each player in the selected batch has. When a
  // generate adds a card, fetchPlayers() updates `players` and this string grows,
  // which re-runs the card-list effect below - so new cards appear without a
  // manual page refresh (keying on players.length alone missed it: same players,
  // more cards).
  const selectedBatchCardSig = (selectedBatch?.players || [])
    .map(p => `${p.playerId}:${(players.find(pl => String(pl.playerId) === String(p.playerId))?.sessionCardIds || []).length}`)
    .join('|');

  const handleSelectPlayer = (player) => {
    setSelectedPlayer(player);
  };

  const handleSelectBatch = (batchId) => {
    setSelectedBatchId(batchId);
    setBatchGenStatus({});
  };

  // Read each player's real latest card (session number, date, status) - not guessed.
  // Returns the map directly (not just via setState) so callers can use it immediately
  // without racing React's async state update.
  // One bulk call instead of one request per player - avoids the N+1 fan-out
  // (and its tail-latency risk) that used to hit CL_View_Sessioncard once per
  // player in the list/batch.
  const fetchBatchPlayerCardInfo = async (playerIds) => {
    setCardInfoLoading(true);
    let map = {};
    try {
      const res = await fetch(API_ENDPOINTS.VIEW_SESSION_CARD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', userToken },
        body: JSON.stringify({ playerIds }),
      });
      if (res.ok) {
        const data = await res.json();
        const cards = data.cards || {};
        playerIds.forEach(pid => {
          const card = cards[pid];
          map[pid] = card
            ? { session: card.session ?? null, sessionDate: card.sessionDate || null, status: card.status || '', cardId: card.cardId || null }
            : null;
        });
      } else {
        playerIds.forEach(pid => { map[pid] = null; });
      }
    } catch {
      playerIds.forEach(pid => { map[pid] = null; });
    }
    setPlayerCardInfo(map);
    setCardInfoLoading(false);
    return map;
  };

  // Fetch EVERY card for every player in the batch (complete history) so the
  // By Batch view can show all cards, grouped by pathway, with edit/delete.
  // Two bulk calls total (one for known card ids, one for each player's latest
  // card) instead of the old one-request-per-card-per-player fan-out.
  const fetchBatchAllCards = async (batchPlayers) => {
    setBatchCardsLoading(true);
    const map = {};
    try {
      const idsByPlayer = {};
      const allCardIds = [];
      batchPlayers.forEach(bp => {
        const profile = players.find(p => String(p.playerId) === String(bp.playerId));
        const ids = Array.isArray(profile?.sessionCardIds) ? profile.sessionCardIds : [];
        idsByPlayer[bp.playerId] = ids;
        allCardIds.push(...ids);
      });
      const uniqueCardIds = [...new Set(allCardIds)];
      const playerIds = batchPlayers.map(bp => bp.playerId);

      const postJson = (payload) => fetch(API_ENDPOINTS.VIEW_SESSION_CARD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', userToken },
        body: JSON.stringify(payload),
      }).then(r => (r.ok ? r.json() : { cards: {} })).catch(() => ({ cards: {} }));

      const [byIdRes, byPlayerRes] = await Promise.all([
        uniqueCardIds.length ? postJson({ sessionCardIds: uniqueCardIds }) : Promise.resolve({ cards: {} }),
        playerIds.length ? postJson({ playerIds, full: true }) : Promise.resolve({ cards: {} }),
      ]);
      const cardsById = byIdRes.cards || {};
      const latestByPlayer = byPlayerRes.cards || {};

      batchPlayers.forEach(bp => {
        const cards = [];
        (idsByPlayer[bp.playerId] || []).forEach(id => {
          const card = cardsById[id];
          if (card && (card.Topic || card.activities || card.status)) cards.push({ _id: id, ...card });
        });

        // Also merge in the authoritative current card by playerId if the
        // cached sessionCardIds list hadn't caught up yet - keeps the newest
        // card visible even when the players cache is stale.
        const latest = latestByPlayer[bp.playerId];
        const cid = latest?._id;
        if (latest && cid && (latest.Topic || latest.activities || latest.status) && !cards.some(c => c._id === cid)) {
          cards.push({ _id: cid, ...latest });
        }

        map[bp.playerId] = cards;
      });
    } catch { /* leave map with whatever was resolved so far */ }
    setBatchAllCards(map);
    setBatchCardsLoading(false);
  };

  useEffect(() => {
    if (!selectedBatch?.players?.length) { setPlayerCardInfo({}); setBatchAllCards({}); return; }
    fetchBatchPlayerCardInfo(selectedBatch.players.map(p => p.playerId));
    fetchBatchAllCards(selectedBatch.players);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatchId, selectedBatchCardSig]);

  const BLOCKED_STATUSES = ['upcoming', 'in_progress', 'in progress'];

  // What generating "next" will actually do for this player, computed from their
  // real card info + the pathway's session content - shown in the preview modal.
  const getNextSessionPreview = (player, cardInfoMap) => {
    const info = cardInfoMap[player.playerId];
    const pathwayName = selectedBatch?.LearningPathway || player.LearningPathway;
    const rawStatus = (info?.status || '').toLowerCase();
    const nextSession = info?.session ? info.session + 1 : 1;
    const isHanging = info && BLOCKED_STATUSES.includes(rawStatus);

    if (!pathwayName) {
      return { playerId: player.playerId, playerName: player.playerName || player.name, blocked: true, reason: 'No Learning Pathway set for this batch or player' };
    }

    const pathwaySession = (learningPathway || []).find(
      s => s.LearningPathway === pathwayName && Number(s.session) === nextSession
    );

    // Missing pathway content is always a hard block, regardless of whether the
    // current card is hanging - there is nowhere to actually advance to, so it
    // must never be shown as "recoverable" (which would enable Confirm & Generate
    // only to fail later with a confusing error).
    if (!pathwaySession) {
      return {
        playerId: player.playerId,
        playerName: player.playerName || player.name,
        blocked: true,
        reason: isHanging
          ? `Session ${info.session} is still ${rawStatus}, and Session ${nextSession} has no pathway content yet - add it to "${pathwayName}" first`
          : `No pathway content found for session ${nextSession} in "${pathwayName}"`,
      };
    }

    const activityCount = pathwaySession.activities?.length || 0;
    const points = (pathwaySession.activities || []).reduce((sum, a) => sum + (a.points?.total || 0), 0);

    // A card left hanging at upcoming/in_progress is recoverable: clicking Generate
    // will first mark it "pending" (an already-allowed recoverable-miss status,
    // same as absent/excused), which unblocks the live generator immediately -
    // no backend redeploy needed for this specific case.
    if (isHanging) {
      return {
        playerId: player.playerId,
        playerName: player.playerName || player.name,
        blocked: true,
        recoverable: true,
        cardId: info.cardId,
        reason: `Session ${info.session} is still ${rawStatus} - will be marked pending, then Session ${nextSession} will be generated`,
        nextSession,
        topic: pathwaySession.Topic || '',
        activityCount,
        points,
        pathwayName,
        pathwaySession,
      };
    }

    return {
      playerId: player.playerId,
      playerName: player.playerName || player.name,
      blocked: false,
      nextSession,
      topic: pathwaySession.Topic || '',
      activityCount,
      points,
      pathwayName,
      pathwaySession,
    };
  };

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const openBatchPreview = async () => {
    if (!selectedBatch || !selectedBatch.players.length) {
      setToastMessage('Select a batch with players first');
      setToastType('error');
      return;
    }
    setPreviewSessionDate(todayStr());
    // Generated once per preview session so cards created either via "Confirm &
    // Generate" or via the staging editor's "Edit" (per player) still land in the
    // same propagation group.
    setPreviewBatchGroupId(`${selectedBatch.batchId}_${Date.now()}`);
    setShowBatchPreview(true);
    setBatchPreviewLoading(true);
    const freshInfo = await fetchBatchPlayerCardInfo(selectedBatch.players.map(p => p.playerId));
    const rows = selectedBatch.players.map(p => getNextSessionPreview(p, freshInfo));
    setBatchPreviewRows(rows);
    setBatchPreviewLoading(false);
  };

  const confirmBatchGenerate = async () => {
    // Keep the preview modal OPEN and show live progress inside it. (Closing it up
    // front used to hide every bit of feedback - the spinner and per-player status
    // live in this modal - so the whole generate ran with a blank screen until the
    // final toast fired.) Flip batchGenerating immediately so the button reacts on
    // the very first click, then close only once everything is done.
    setBatchGenerating(true);
    setBatchGenStatus({});

    // Auto-recover any card left hanging at upcoming/in_progress: mark it pending
    // first (the live generator already allows advancing past a pending card),
    // so one stuck Player never blocks their own Generate click.
    const recoverable = batchPreviewRows.filter(r => r.blocked && r.recoverable && r.cardId);
    if (recoverable.length > 0) {
      await Promise.all(recoverable.map(r =>
        fetch(API_ENDPOINTS.UPDATE_SESSION_CARD, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', userToken },
          body: JSON.stringify({ sessionCardId: r.cardId, status: 'pending' }),
        }).catch(() => {})
      ));
    }

    await handleBatchGenerate(previewSessionDate, previewBatchGroupId);
    setShowBatchPreview(false);
    if (selectedBatch?.players?.length) {
      fetchBatchPlayerCardInfo(selectedBatch.players.map(p => p.playerId));
    }
  };

  // Open the staging editor in batch mode: one shared Topic/Objective/activities
  // template (sourced from the first generatable player's next pathway session),
  // edited once, then applied to every player in the batch on create - reusing
  // the existing batchMode + runBatchGenerate loop in customCardGenerate.jsx.
  const openBatchStagingEditor = async () => {
    const representative = batchPreviewRows.find(r => !r.blocked && r.pathwaySession)
      || batchPreviewRows.find(r => r.recoverable && r.pathwaySession);
    if (!representative) {
      setToastMessage('No generatable session found to stage for this batch');
      setToastType('error');
      return;
    }

    // Clear every recoverable (hanging) card out of the way now - batch creation
    // hits each player's own last-session block independently.
    const recoverable = batchPreviewRows.filter(r => r.recoverable && r.cardId);
    if (recoverable.length > 0) {
      await Promise.all(recoverable.map(r =>
        fetch(API_ENDPOINTS.UPDATE_SESSION_CARD, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', userToken },
          body: JSON.stringify({ sessionCardId: r.cardId, status: 'pending' }),
        }).catch(() => {})
      ));
    }

    setShowBatchPreview(false);
    navigate('/admin/custom-generate-card', {
      state: {
        batchMode: true,
        batchId: selectedBatch.batchId,
        batchName: selectedBatch.batchName,
        batchPlayers: selectedBatch.players,
        sessionDate: previewSessionDate,
        batchGroupId: previewBatchGroupId,
        prefill: {
          Topic: representative.pathwaySession.Topic,
          Objective: representative.pathwaySession.Objective,
          LearningPathway: representative.pathwayName,
          session: representative.nextSession,
          activities: representative.pathwaySession.activities,
          sessionTakeaways: representative.pathwaySession.sessionTakeaways,
        },
      },
    });
  };

  // Open the staging editor (same drag-and-drop builder as "Custom") pre-loaded
  // with this one player's next pathway session, so it can be reviewed/edited
  // before the card is actually created.
  const openStagingEditor = async (row) => {
    // If this player's last card is only recoverable (hanging at upcoming/in_progress),
    // clear it out of the way now - the Custom-card creation endpoint has the same
    // "still upcoming" block, so without this the staging page would work fine but
    // fail when the admin actually tries to create the card from it.
    if (row.recoverable && row.cardId) {
      await fetch(API_ENDPOINTS.UPDATE_SESSION_CARD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', userToken },
        body: JSON.stringify({ sessionCardId: row.cardId, status: 'pending' }),
      }).catch(() => {});
    }

    navigate('/admin/custom-generate-card', {
      state: {
        playerId: row.playerId,
        playerName: row.playerName,
        LearningPathway: row.pathwayName,
        sessionDate: previewSessionDate,
        batchGroupId: previewBatchGroupId,
        prefill: {
          Topic: row.pathwaySession.Topic,
          Objective: row.pathwaySession.Objective,
          LearningPathway: row.pathwayName,
          session: row.nextSession,
          activities: row.pathwaySession.activities,
          sessionTakeaways: row.pathwaySession.sessionTakeaways,
        },
      },
    });
  };

  // Sequentially generate a standard session card for every player in the batch.
  const handleBatchGenerate = async (sessionDate, batchGroupId) => {
    if (!selectedBatch || !selectedBatch.players.length) {
      setToastMessage('Select a batch with players first');
      setToastType('error');
      return;
    }

    setBatchGenerating(true);
    let success = 0;
    let failed = 0;

    // One id shared by every card generated in this run, so an edit made to any one
    // Player's card can be propagated to the rest of the batch afterwards.
    batchGroupId = batchGroupId || `${selectedBatch.batchId}_${Date.now()}`;

    for (const player of selectedBatch.players) {
      setBatchGenStatus(prev => ({ ...prev, [player.playerId]: { state: 'loading' } }));
      try {
        const headers = {
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          'userToken': userToken,
          'Authorization': `Bearer ${userToken}`
        };
        const response = await fetch(API_ENDPOINTS.GENERATE_SESSION_CARD, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            playerId: player.playerId,
            // Batch-sourced generation inherits the batch's pathway instead of each
            // player's own profile pathway (fixes dual-pathway / summer-camp kids).
            LearningPathway: selectedBatch.LearningPathway || undefined,
            batchGroupId,
            sessionDate: sessionDate || undefined,
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Failed to generate session card: ${response.status}`;
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error) errorMessage = errorJson.error;
            else if (errorJson.message) errorMessage = errorJson.message;
          } catch {
            if (errorText) errorMessage = errorText;
          }
          throw new Error(errorMessage);
        }

        await response.json();
        success += 1;
        setBatchGenStatus(prev => ({ ...prev, [player.playerId]: { state: 'success' } }));
      } catch (err) {
        failed += 1;
        setBatchGenStatus(prev => ({ ...prev, [player.playerId]: { state: 'error', message: err.message || 'Failed to generate card' } }));
      }
    }

    await fetchPlayers(true);
    setBatchGenerating(false);
    setToastMessage(failed === 0
      ? `Generated ${success} card${success === 1 ? '' : 's'} successfully!`
      : `Generated ${success} of ${selectedBatch.players.length}, ${failed} failed`);
    setToastType(failed === 0 ? 'success' : 'error');
  };

  // Player-level staging: preview and edit this player's next pathway session
  // before creating the card, using cards already fetched for this player (no
  // extra API call needed).
  const openPlayerStagingEditor = () => {
    if (!selectedPlayer) return;
    const pathwayName = selectedPlayer.LearningPathway;
    if (!pathwayName) {
      setToastMessage('This player has no Learning Pathway set');
      setToastType('error');
      return;
    }

    const relevant = sessionCards.filter(c => c.LearningPathway === pathwayName);
    const last = relevant.reduce((max, c) => ((c.session || 0) > (max?.session || 0) ? c : max), null);
    const rawStatus = (last?.status || '').toLowerCase();
    if (last && ['upcoming', 'in_progress', 'in progress'].includes(rawStatus)) {
      setToastMessage(`Session ${last.session} is still ${rawStatus} - finish or close it before previewing the next one`);
      setToastType('error');
      return;
    }

    const nextSession = last ? (last.session || 0) + 1 : 1;
    const pathwaySession = (learningPathway || []).find(
      s => s.LearningPathway === pathwayName && Number(s.session) === nextSession
    );
    if (!pathwaySession) {
      setToastMessage(`No pathway content found for session ${nextSession}`);
      setToastType('error');
      return;
    }

    navigate('/admin/custom-generate-card', {
      state: {
        playerId: selectedPlayer.playerId,
        playerName: selectedPlayer.playerName,
        LearningPathway: pathwayName,
        sessionDate: todayStr(),
        prefill: {
          Topic: pathwaySession.Topic,
          Objective: pathwaySession.Objective,
          LearningPathway: pathwayName,
          session: nextSession,
          activities: pathwaySession.activities,
          sessionTakeaways: pathwaySession.sessionTakeaways,
        },
      },
    });
  };

  const handleBatchCustom = () => {
    if (!selectedBatch || !selectedBatch.players.length) {
      setToastMessage('Select a batch with players first');
      setToastType('error');
      return;
    }
    setCustomSessionDate(todayStr());
    setShowCustomDatePrompt(true);
  };

  const confirmBatchCustom = () => {
    setShowCustomDatePrompt(false);
    navigate('/admin/custom-generate-card', {
      state: {
        batchMode: true,
        batchId: selectedBatch.batchId,
        batchName: selectedBatch.batchName,
        batchPlayers: selectedBatch.players,
        sessionDate: customSessionDate,
        // Shared across every card this batch-custom run creates, so an edit to
        // one can later be propagated to the rest (same mechanism as standard batch generate).
        batchGroupId: `${selectedBatch.batchId}_${Date.now()}`,
      }
    });
  };

  const handleGenerateCard = async () => {
    setLoading(true);
    try {
      const headers = {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'userToken': userToken,
        'Authorization': `Bearer ${userToken}`
      };

      const response = await fetch(
        'https://qz2us3dk55.execute-api.ap-south-1.amazonaws.com/default/CL_Session_Card_Generating',
        {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            playerId: selectedPlayer.playerId
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Failed to generate session card: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            errorMessage = errorJson.error;
          } else if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch {
          if (errorText) {
            errorMessage = errorText;
          }
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log('Session card generated:', responseData);

      setToastMessage(responseData.message || responseData.msg || 'Session card generated successfully!');
      setToastType('success');

      setShowGenerateModal(false);

      const updatedPlayers = await fetchPlayers(true);
      if (selectedPlayer) {
        const refreshedPlayer = updatedPlayers.find(p => p.playerId === selectedPlayer.playerId);
        if (refreshedPlayer) {
          setSelectedPlayer(refreshedPlayer);
          if (Array.isArray(refreshedPlayer.sessionCardIds) && refreshedPlayer.sessionCardIds.length > 0) {
            setSessionCards([]);
            await fetchPlayerSessionCards(refreshedPlayer.sessionCardIds, refreshedPlayer.playerId);
          } else {
            setSessionCards([]);
          }
        }
      }
    } catch (err) {
      console.error('Error generating card:', err);
      setToastMessage(err.message || 'Failed to generate card');
      setToastType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!deleteConfirm) return;

    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.DELETE_SESSION_CARD, {
        method: 'POST',
        headers: {
          'userToken': userToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionCardId: deleteConfirm })
      });

      if (response.status === 409) {
        const data = await response.json().catch(() => ({}));
        setToastMessage(data.message || 'Cannot delete a completed session card');
        setToastType('error');
        setDeleteConfirm(null);
        return;
      }

      if (!response.ok) throw new Error('Failed to delete session card');

      await response.json();

      setToastMessage('Session card removed');
      setToastType('success');

      // SOFT DELETE - the card stays as an "empty" tombstone (keeps its session
      // number) so the sequence doesn't drift. Mark it empty locally instead of
      // dropping it, and show the refill (Generate) action.
      const markEmpty = c => (c._id === deleteConfirm
        ? { ...c, status: 'empty', activities: [], totalPoints: 0 }
        : c);
      setSessionCards(prev => prev.map(markEmpty));
      setBatchAllCards(prev => {
        const next = {};
        Object.keys(prev).forEach(pid => { next[pid] = prev[pid].map(markEmpty); });
        return next;
      });
      setDeleteConfirm(null);

    } catch (err) {
      console.error('Error deleting card:', err);
      setToastMessage('Failed to delete card');
      setToastType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSessionCard = (card) => {
    navigate(`/admin/view-session-card/${card._id}`, { state: { session: card, playerId: selectedPlayer.playerId } });
  };

  const handleEditSessionCard = (cardId) => {
    navigate(`/admin/edit-session-card/${cardId}`, { state: { playerId: selectedPlayer.playerId } });
  };

  const surface = dark ? 'var(--cl-surface)' : '#fff';
  const border = dark ? 'var(--cl-border)' : '#E5E7EB';
  const textPrimary = dark ? 'var(--cl-text)' : '#111827';
  const textMuted = dark ? 'var(--cl-text-3)' : '#94A3B8';
  const textSecondary = dark ? 'var(--cl-text-2)' : '#64748B';
  const surface2 = dark ? 'var(--cl-surface-2)' : '#F8FAFC';

  const statusColors = (s) => {
    const v = s?.toLowerCase();
    if (v === 'completed') return { bg: '#DCFCE7', text: '#166534' };
    if (v === 'in progress') return { bg: '#DBEAFE', text: '#075985' };
    if (v === 'upcoming') return { bg: '#FEF3C7', text: '#92400E' };
    return { bg: dark ? 'rgba(255,255,255,0.08)' : '#F3F4F6', text: dark ? '#94A3B8' : '#6B7280' };
  };

  const cardStatusLabel = (s) => (String(s || '').toLowerCase() === 'empty' ? 'Removed' : (s || 'Draft'));

  // Refill a soft-deleted ("empty") slot. Opens the custom-generate page prefilled
  // with that session's pathway content, passing the card's own id so the backend
  // updates the existing document in place (keeps its session number) rather than
  // inserting a new one.
  const regenerateEmptyCard = (card, player) => {
    const pathwayName = card.LearningPathway || player.LearningPathway;
    const pathwaySession = (learningPathway || []).find(
      s => s.LearningPathway === pathwayName && Number(s.session) === Number(card.session)
    );
    navigate('/admin/custom-generate-card', {
      state: {
        playerId: player.playerId,
        playerName: player.playerName || player.name,
        LearningPathway: pathwayName,
        sessionDate: todayStr(),
        regenerateCardId: card._id,
        prefill: {
          Topic: pathwaySession?.Topic || card.Topic || '',
          Objective: pathwaySession?.Objective || card.Objective || '',
          LearningPathway: pathwayName,
          session: card.session,
          activities: pathwaySession?.activities || [],
          sessionTakeaways: pathwaySession?.sessionTakeaways || [],
        },
      },
    });
  };

  return (
    <Layout>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
        @keyframes skPulse { 0%,100%{opacity:.5}50%{opacity:1} }
      `}</style>

      {toastMessage && (
        <Toast message={toastMessage} type={toastType} duration={3000} onClose={() => setToastMessage('')} />
      )}

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: isMobile ? '0 12px' : '0 24px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
          borderRadius: '16px', padding: '20px 28px', marginBottom: '16px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap',
          boxShadow: '0 8px 32px rgba(6,0,48,.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,.12)', border: '1.5px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', margin: '0 0 2px', letterSpacing: '-.4px' }}>Session Card Management</h1>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.55)', margin: 0 }}>
                {players.length} players · {sessionCards.length} cards loaded{selectedPlayer ? ` · ${selectedPlayer.playerName}` : ''}
              </p>
            </div>
          </div>

          {/* View toggle inside header */}
          <div style={{ display: 'inline-flex', gap: '3px', background: 'rgba(255,255,255,0.1)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)' }}>
            {[{ key: 'Player', label: 'By Player', Icon: User }, { key: 'batch', label: 'By Batch', Icon: Layers }].map(tab => {
              const active = viewMode === tab.key;
              return (
                <button key={tab.key} onClick={() => setViewMode(tab.key)} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '12.5px', fontWeight: '600', transition: 'all 0.18s',
                  background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                  boxShadow: active ? '0 1px 6px rgba(0,0,0,0.2)' : 'none'
                }}>
                  <tab.Icon size={13} /> {!isMobile && tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {isFetching ? (
          <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0 }}>
            <div style={{ width: '260px', flexShrink: 0, borderRadius: '14px', background: surface, border: `1px solid ${border}`, padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[1,2,3,4,5,6].map(i => <div key={i} style={{ height: '60px', borderRadius: '10px', background: surface2, animation: 'skPulse 1.5s ease infinite', animationDelay: `${i*0.1}s` }} />)}
            </div>
            <div style={{ flex: 1, borderRadius: '14px', background: surface, border: `1px solid ${border}`, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader size={28} color="#6366F1" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          </div>
        ) : viewMode === 'Player' ? (
          <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0 }}>

            {/* ── LEFT: Player list ── */}
            {(!isNarrow || !selectedPlayer) && (
              <div style={{ width: isNarrow ? '100%' : '260px', flexShrink: 0, background: surface, border: `1px solid ${border}`, borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Search */}
                <div style={{ padding: '12px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
                  <input
                    type="text"
                    placeholder="Search players..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ width: '100%', border: `1px solid ${border}`, outline: 'none', fontSize: '13px', background: surface2, color: textPrimary, borderRadius: '8px', padding: '8px 12px', boxSizing: 'border-box' }}
                    onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)'; }}
                    onBlur={e => { e.target.style.borderColor = border; e.target.style.boxShadow = 'none'; }}
                  />
                  <p style={{ fontSize: '11px', color: textMuted, margin: '8px 0 0', fontWeight: '500' }}>{filteredPlayers.length} players</p>
                </div>

                {/* Player items */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                  {filteredPlayers.length > 0 ? filteredPlayers.map(player => {
                    const isActive = selectedPlayer?.playerId === player.playerId;
                    const [c1, c2] = pal(player.playerName);
                    return (
                      <button key={player.playerId} onClick={() => handleSelectPlayer(player)} style={{
                        width: '100%', textAlign: 'left', padding: '10px 10px', borderRadius: '10px', marginBottom: '3px',
                        background: isActive ? 'linear-gradient(135deg, #060030 0%, #3b0080 100%)' : 'transparent',
                        border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all .15s'
                      }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.05)' : '#F1F5F9'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `linear-gradient(135deg, ${c1}, ${c2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: 'white', flexShrink: 0 }}>
                          {player.playerName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: '600', color: isActive ? '#fff' : textPrimary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.playerName}</p>
                          {player.LearningPathway && (
                            <p style={{ fontSize: '11px', color: isActive ? 'rgba(255,255,255,0.65)' : textMuted, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.LearningPathway}</p>
                          )}
                        </div>
                        {player.sessionCardIds?.length > 0 && (
                          <span style={{ fontSize: '10px', fontWeight: '700', color: isActive ? 'rgba(255,255,255,0.9)' : (dark ? '#818CF8' : '#4F46E5'), background: isActive ? 'rgba(255,255,255,0.15)' : (dark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)'), padding: '2px 7px', borderRadius: '20px', flexShrink: 0 }}>
                            {player.sessionCardIds.length}
                          </span>
                        )}
                      </button>
                    );
                  }) : (
                    <div style={{ padding: '32px 12px', textAlign: 'center' }}>
                      <Users size={32} color={textMuted} style={{ marginBottom: '8px', opacity: 0.5 }} />
                      <p style={{ fontSize: '13px', color: textMuted, margin: 0 }}>No players found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── RIGHT: Player detail + cards ── */}
            {selectedPlayer ? (
              <div style={{ flex: 1, minWidth: 0, background: surface, border: `1px solid ${border}`, borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {isNarrow && (
                  <button onClick={() => setSelectedPlayer(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: `1px solid ${border}`, cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: textPrimary, width: '100%', textAlign: 'left' }}>
                    <ChevronLeft size={16} /> Back
                  </button>
                )}

                {/* Player profile strip */}
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', background: dark ? 'rgba(255,255,255,0.02)' : '#FAFBFC', flexShrink: 0 }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: `linear-gradient(135deg, ${pal(selectedPlayer.playerName)[0]}, ${pal(selectedPlayer.playerName)[1]})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '800', color: 'white', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    {selectedPlayer.playerName.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ fontSize: '17px', fontWeight: '800', color: textPrimary, margin: '0 0 4px' }}>{selectedPlayer.playerName}</h2>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {selectedPlayer.LearningPathway && (
                        <span style={{ fontSize: '11px', fontWeight: '600', color: dark ? '#818CF8' : '#4F46E5', background: dark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)', padding: '2px 10px', borderRadius: '20px' }}>{selectedPlayer.LearningPathway}</span>
                      )}
                      <span style={{ fontSize: '11px', color: textMuted, fontWeight: '500' }}>{sessionCards.length} card{sessionCards.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button onClick={handleGenerateCard} disabled={loading}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'linear-gradient(135deg, #060030, #000)', color: 'white', border: 'none', borderRadius: '9px', fontSize: '12.5px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1, transition: 'all .18s' }}
                      onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                      {loading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                      {loading ? 'Generating...' : 'Generate'}
                    </button>
                    <button onClick={openPlayerStagingEditor} disabled={loading}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE', borderRadius: '9px', fontSize: '12.5px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all .18s' }}
                      onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                      <PencilLine size={14} /> Preview &amp; Edit
                    </button>
                    <button onClick={() => navigate('/admin/custom-generate-card', { state: { playerId: selectedPlayer.playerId, playerName: selectedPlayer.playerName, LearningPathway: selectedPlayer.LearningPathway } })}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'linear-gradient(135deg, #4F46E5, #6D28D9)', color: 'white', border: 'none', borderRadius: '9px', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', transition: 'all .18s' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                      <Sparkles size={14} /> Custom
                    </button>
                  </div>
                </div>

                {/* Session cards area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                  {isLoadingSessionCards ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                      {[1,2,3].map(i => <div key={i} style={{ height: '140px', borderRadius: '12px', background: surface2, animation: 'skPulse 1.5s ease infinite', animationDelay: `${i*0.1}s` }} />)}
                    </div>
                  ) : sessionCards.length > 0 ? (
                    <>
                      {/* Card search */}
                      <div style={{ marginBottom: '14px' }}>
                        <input type="text" placeholder="Search cards..." value={cardSearchTerm} onChange={e => setCardSearchTerm(e.target.value)}
                          style={{ width: '100%', border: `1px solid ${border}`, outline: 'none', fontSize: '13px', background: surface2, color: textPrimary, borderRadius: '8px', padding: '8px 12px', boxSizing: 'border-box' }}
                          onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.15)'; }}
                          onBlur={e => { e.target.style.borderColor = border; e.target.style.boxShadow = 'none'; }}
                        />
                      </div>

                      {(() => {
                        const sortFn = (a, b) => {
                          const n = c => { const v = c.session ?? c.sessionNumber ?? c.sessionNo; const num = Number(v); return Number.isFinite(num) ? num : null; };
                          const na = n(a), nb = n(b);
                          if (na !== null && nb !== null) return na - nb;
                          if (na !== null) return -1; if (nb !== null) return 1;
                          return (a.Topic || '').localeCompare(b.Topic || '');
                        };
                        const filtered = sessionCards.filter(card => card.Topic?.toLowerCase().includes(cardSearchTerm.toLowerCase()) || card.Objective?.toLowerCase().includes(cardSearchTerm.toLowerCase()));
                        const groups = {};
                        filtered.forEach(card => {
                          const key = card.LearningPathway || 'Unassigned Pathway';
                          (groups[key] = groups[key] || []).push(card);
                        });
                        const groupNames = Object.keys(groups).sort((a, b) => {
                          if (a === selectedPlayer.LearningPathway) return -1;
                          if (b === selectedPlayer.LearningPathway) return 1;
                          return a.localeCompare(b);
                        });
                        return groupNames.map(pathwayName => (
                          <div key={pathwayName} style={{ marginBottom: '22px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                              <span style={{ fontSize: '12.5px', fontWeight: '800', color: textPrimary }}>{pathwayName}</span>
                              <span style={{ fontSize: '10.5px', fontWeight: '700', color: textMuted, background: surface2, padding: '2px 8px', borderRadius: '20px' }}>
                                {groups[pathwayName].length} card{groups[pathwayName].length !== 1 ? 's' : ''}
                              </span>
                              {pathwayName === selectedPlayer.LearningPathway && (
                                <span style={{ fontSize: '10px', fontWeight: '700', color: dark ? '#818CF8' : '#4F46E5', background: dark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: '20px' }}>Current</span>
                              )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                        {groups[pathwayName]
                          .sort(sortFn)
                          .map((card, index) => {
                            const sc = statusColors(card.status);
                            const sessionNum = card.session ?? (index + 1);
                            return (
                              <div key={card._id || index} onClick={() => handleOpenSessionCard(card)}
                                style={{ borderRadius: '12px', border: `1px solid ${border}`, background: dark ? 'rgba(255,255,255,0.03)' : '#fff', cursor: 'pointer', transition: 'all .18s', overflow: 'hidden' }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = '#6366F1'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = border; }}
                              >
                                {/* Card top accent */}
                                <div style={{ height: '4px', background: card.status?.toLowerCase() === 'completed' ? '#10B981' : card.status?.toLowerCase() === 'in progress' ? '#3B82F6' : card.status?.toLowerCase() === 'upcoming' ? '#F59E0B' : '#6366F1' }} />
                                <div style={{ padding: '14px 14px 12px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: dark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <span style={{ fontSize: '12px', fontWeight: '800', color: dark ? '#818CF8' : '#4F46E5' }}>{sessionNum}</span>
                                    </div>
                                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 9px', borderRadius: '20px', background: sc.bg, color: sc.text, whiteSpace: 'nowrap' }}>
                                      {cardStatusLabel(card.status)}
                                    </span>
                                  </div>
                                  <p style={{ fontSize: '13.5px', fontWeight: '700', color: textPrimary, margin: '0 0 4px', lineHeight: '1.3' }}>{card.Topic || 'Untitled'}</p>
                                  <p style={{ fontSize: '11.5px', color: textSecondary, margin: '0 0 10px', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {card.Objective || '-'}
                                  </p>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                    <span style={{ fontSize: '11px', color: textMuted, fontWeight: '500' }}>⏱ {card.totalDuration || 30} min</span>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                      {card.status?.toLowerCase() === 'empty' ? (
                                        <button onClick={e => { e.stopPropagation(); regenerateEmptyCard(card, selectedPlayer); }}
                                          style={{ padding: '5px 10px', background: 'linear-gradient(135deg, #4F46E5, #6D28D9)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        ><Sparkles size={12} /> Generate</button>
                                      ) : (
                                        <>
                                          <button onClick={e => { e.stopPropagation(); handleOpenSessionCard(card); }}
                                            style={{ padding: '5px 10px', background: dark ? 'rgba(99,102,241,0.15)' : '#EEF2FF', color: dark ? '#818CF8' : '#4F46E5', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(99,102,241,0.25)' : '#E0E7FF'}
                                            onMouseLeave={e => e.currentTarget.style.background = dark ? 'rgba(99,102,241,0.15)' : '#EEF2FF'}
                                          ><Eye size={12} /> View</button>
                                          {card.status?.toLowerCase() !== 'completed' && (
                                            <button onClick={e => { e.stopPropagation(); handleEditSessionCard(card._id); }}
                                              style={{ padding: '5px 10px', background: dark ? 'rgba(245,158,11,0.15)' : '#FEF3C7', color: dark ? '#FBBF24' : '#92400E', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                              onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(245,158,11,0.25)' : '#FDE68A'}
                                              onMouseLeave={e => e.currentTarget.style.background = dark ? 'rgba(245,158,11,0.15)' : '#FEF3C7'}
                                            ><Edit3 size={12} /> Edit</button>
                                          )}
                                          {card.status?.toLowerCase() !== 'completed' && (
                                            <button onClick={e => { e.stopPropagation(); setDeleteConfirm(card._id); }}
                                              style={{ padding: '5px 8px', background: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', color: dark ? '#F87171' : '#DC2626', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                              onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(239,68,68,0.2)' : '#FECACA'}
                                              onMouseLeave={e => e.currentTarget.style.background = dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2'}
                                            ><Trash2 size={12} /></button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                            </div>
                          </div>
                        ));
                      })()}
                    </>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', gap: '12px' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: dark ? 'rgba(99,102,241,0.1)' : '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Star size={28} color="#6366F1" style={{ opacity: 0.6 }} />
                      </div>
                      <p style={{ fontSize: '15px', fontWeight: '700', color: textPrimary, margin: 0 }}>No Session Cards Yet</p>
                      <p style={{ fontSize: '13px', color: textMuted, margin: 0 }}>Click Generate or Custom to create the first card</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              !isNarrow && (
                <div style={{ flex: 1, background: surface, border: `1px solid ${border}`, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center', color: textMuted }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: dark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <Users size={32} color="#6366F1" style={{ opacity: 0.5 }} />
                    </div>
                    <p style={{ fontSize: '16px', fontWeight: '700', color: textPrimary, margin: '0 0 6px' }}>No Player Selected</p>
                    <p style={{ fontSize: '13px', color: textMuted, margin: 0 }}>Pick a player from the list to manage their session cards</p>
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          /* ── By Batch view ── */
          <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0 }}>

            {/* Batch list */}
            {(!isNarrow || !selectedBatch) && (
              <div style={{ width: isNarrow ? '100%' : '260px', flexShrink: 0, background: surface, border: `1px solid ${border}`, borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '12px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: textPrimary, margin: '0 0 2px' }}>Batches</p>
                  <p style={{ fontSize: '11px', color: textMuted, margin: 0 }}>{displayBatches.length} available</p>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                  {displayBatches.length > 0 ? displayBatches.map(batch => {
                    const isActive = selectedBatchId === batch.batchId;
                    return (
                      <button key={batch.batchId} onClick={() => handleSelectBatch(batch.batchId)} style={{
                        width: '100%', textAlign: 'left', padding: '10px 10px', borderRadius: '10px', marginBottom: '3px',
                        background: isActive ? 'linear-gradient(135deg, #060030, #3b0080)' : 'transparent',
                        border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all .15s'
                      }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.05)' : '#F1F5F9'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: isActive ? 'rgba(255,255,255,0.15)' : (dark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Layers size={16} color={isActive ? '#fff' : (dark ? '#818CF8' : '#4F46E5')} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: '600', color: isActive ? '#fff' : textPrimary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{batch.batchName}</p>
                          <p style={{ fontSize: '11px', color: isActive ? 'rgba(255,255,255,0.65)' : textMuted, margin: '2px 0 0' }}>{batch.players.length} player{batch.players.length !== 1 ? 's' : ''}</p>
                        </div>
                      </button>
                    );
                  }) : (
                    <div style={{ padding: '32px 12px', textAlign: 'center' }}>
                      <Layers size={28} color={textMuted} style={{ marginBottom: '8px', opacity: 0.5 }} />
                      <p style={{ fontSize: '13px', color: textMuted, margin: 0 }}>No batches found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Batch detail */}
            {selectedBatch ? (
              <div style={{ flex: 1, minWidth: 0, background: surface, border: `1px solid ${border}`, borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {isNarrow && (
                  <button onClick={() => setSelectedBatchId('')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: 'transparent', border: 'none', borderBottom: `1px solid ${border}`, cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: textPrimary, width: '100%', textAlign: 'left' }}>
                    <ChevronLeft size={16} /> Back
                  </button>
                )}

                {/* Batch header strip */}
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', background: dark ? 'rgba(255,255,255,0.02)' : '#FAFBFC', flexShrink: 0 }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #060030, #3b0080)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Layers size={20} color="#fff" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ fontSize: '17px', fontWeight: '800', color: textPrimary, margin: '0 0 3px' }}>{selectedBatch.batchName}</h2>
                    <p style={{ fontSize: '12px', color: textMuted, margin: 0 }}>{selectedBatch.players.length} player{selectedBatch.players.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button onClick={openBatchPreview} disabled={batchGenerating}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'linear-gradient(135deg, #060030, #000)', color: 'white', border: 'none', borderRadius: '9px', fontSize: '12.5px', fontWeight: '700', cursor: batchGenerating ? 'not-allowed' : 'pointer', opacity: batchGenerating ? 0.8 : 1 }}>
                      {batchGenerating ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</> : <><Plus size={14} /> Generate</>}
                    </button>
                    <button onClick={handleBatchCustom} disabled={batchGenerating}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'linear-gradient(135deg, #4F46E5, #6D28D9)', color: 'white', border: 'none', borderRadius: '9px', fontSize: '12.5px', fontWeight: '700', cursor: batchGenerating ? 'not-allowed' : 'pointer', opacity: batchGenerating ? 0.8 : 1 }}>
                      <Sparkles size={14} /> Custom
                    </button>
                  </div>
                </div>

                {/* Players in batch - each with their COMPLETE card history */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                  {selectedBatch.players.map(player => {
                    const status = batchGenStatus[player.playerId]?.state || 'idle';
                    const name = player.playerName || player.name || '';
                    const [c1, c2] = pal(name);
                    const info = playerCardInfo[player.playerId];
                    const cards = batchAllCards[player.playerId] || [];
                    // group this player's cards by pathway, newest session first
                    const byPathway = {};
                    cards.forEach(card => {
                      const key = card.LearningPathway || player.LearningPathway || 'Unassigned Pathway';
                      (byPathway[key] = byPathway[key] || []).push(card);
                    });
                    const pathwayNames = Object.keys(byPathway).sort((a, b) => a.localeCompare(b));

                    return (
                      <div key={player.playerId} style={{ marginBottom: '14px', border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden', background: dark ? 'rgba(255,255,255,0.02)' : '#fff' }}>
                        {/* Player header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: dark ? 'rgba(255,255,255,0.02)' : '#FAFBFC', borderBottom: `1px solid ${border}` }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `linear-gradient(135deg, ${c1}, ${c2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '14px', flexShrink: 0 }}>
                            {(name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '13.5px', fontWeight: '700', margin: 0, color: textPrimary }}>{name}</p>
                            <p style={{ fontSize: '11px', color: textMuted, margin: '2px 0 0' }}>
                              {cardInfoLoading && !info ? 'Checking current session…'
                                : info ? `On Session ${info.session} · ${info.status || 'upcoming'}`
                                : `${cards.length} card${cards.length === 1 ? '' : 's'}`}
                            </p>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: textMuted, background: surface2, padding: '3px 10px', borderRadius: '20px', flexShrink: 0 }}>
                            {cards.length} card{cards.length === 1 ? '' : 's'}
                          </span>
                          <div style={{ flexShrink: 0, width: '20px', textAlign: 'center' }}>
                            {status === 'loading' && <Loader size={16} style={{ animation: 'spin 1s linear infinite', color: '#6366F1' }} />}
                            {status === 'success' && <CheckCircle size={18} color="#10B981" />}
                            {status === 'error' && (
                              <button onClick={() => setErrorDetail({ playerName: name, message: batchGenStatus[player.playerId]?.message })}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', color: dark ? '#F87171' : '#DC2626', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                                <Info size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Player's cards, grouped by pathway */}
                        <div style={{ padding: '12px 14px' }}>
                          {batchCardsLoading && cards.length === 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '10px' }}>
                              {[1, 2].map(i => <div key={i} style={{ height: '110px', borderRadius: '10px', background: surface2, animation: 'skPulse 1.5s ease infinite' }} />)}
                            </div>
                          ) : cards.length === 0 ? (
                            <p style={{ fontSize: '12px', color: textMuted, margin: 0 }}>No cards yet - use Generate above.</p>
                          ) : (
                            pathwayNames.map(pathwayName => (
                              <div key={pathwayName} style={{ marginBottom: '10px' }}>
                                {pathwayNames.length > 1 && (
                                  <p style={{ fontSize: '11px', fontWeight: '800', color: textMuted, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.3px' }}>{pathwayName}</p>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '10px' }}>
                                  {byPathway[pathwayName]
                                    .slice()
                                    .sort((a, b) => (b.session || 0) - (a.session || 0))
                                    .map(card => {
                                      const sc = statusColors(card.status);
                                      return (
                                        <div key={card._id} style={{ borderRadius: '10px', border: `1px solid ${border}`, background: dark ? 'rgba(255,255,255,0.03)' : '#fff', overflow: 'hidden' }}>
                                          <div style={{ height: '3px', background: sc.text }} />
                                          <div style={{ padding: '11px 12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                              <span style={{ fontSize: '11px', fontWeight: '800', color: '#4F46E5' }}>Session {card.session ?? '-'}</span>
                                              <span style={{ fontSize: '9.5px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: sc.bg, color: sc.text, whiteSpace: 'nowrap' }}>{cardStatusLabel(card.status)}</span>
                                            </div>
                                            <p style={{ fontSize: '12.5px', fontWeight: '700', color: textPrimary, margin: '0 0 8px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{card.Topic || 'Untitled'}</p>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                              {card.status?.toLowerCase() === 'empty' ? (
                                                <button onClick={() => regenerateEmptyCard(card, player)}
                                                  title="Refill this removed session"
                                                  style={{ flex: 1, padding: '5px 8px', background: 'linear-gradient(135deg, #4F46E5, #6D28D9)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                  <Sparkles size={12} /> Generate
                                                </button>
                                              ) : (
                                                <>
                                                  <button onClick={() => navigate(`/admin/view-session-card/${card._id}`, { state: { session: card, playerId: player.playerId } })}
                                                    style={{ flex: 1, padding: '5px 8px', background: dark ? 'rgba(99,102,241,0.15)' : '#EEF2FF', color: '#4F46E5', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                    <Eye size={12} /> View
                                                  </button>
                                                  {card.status?.toLowerCase() !== 'completed' && (
                                                    <button onClick={() => navigate(`/admin/edit-session-card/${card._id}`, { state: { batchId: selectedBatchId, playerId: player.playerId } })}
                                                      style={{ flex: 1, padding: '5px 8px', background: dark ? 'rgba(245,158,11,0.15)' : '#FEF3C7', color: dark ? '#FBBF24' : '#92400E', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                      <Edit3 size={12} /> Edit
                                                    </button>
                                                  )}
                                                  {card.status?.toLowerCase() !== 'completed' && (
                                                    <button onClick={() => navigate(`/coach/start-session/${player.playerId}`)}
                                                      title="Start this player's session"
                                                      style={{ flex: 1, padding: '5px 8px', background: dark ? 'rgba(16,185,129,0.15)' : '#DCFCE7', color: dark ? '#34D399' : '#15803D', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                      <Play size={12} /> Start
                                                    </button>
                                                  )}
                                                  {card.status?.toLowerCase() !== 'completed' && (
                                                    <button onClick={() => setDeleteConfirm(card._id)}
                                                      title="Delete card"
                                                      style={{ padding: '5px 8px', background: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', color: dark ? '#F87171' : '#DC2626', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                      <Trash2 size={12} />
                                                    </button>
                                                  )}
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              !isNarrow && (
                <div style={{ flex: 1, background: surface, border: `1px solid ${border}`, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center', color: textMuted }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: dark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <Layers size={32} color="#6366F1" style={{ opacity: 0.5 }} />
                    </div>
                    <p style={{ fontSize: '16px', fontWeight: '700', color: textPrimary, margin: '0 0 6px' }}>No Batch Selected</p>
                    <p style={{ fontSize: '13px', color: textMuted, margin: 0 }}>Select a batch to generate cards for all its players</p>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Preview before generate - shows what session/topic each player will actually get */}
      {showBatchPreview && (
        <Modal
          isOpen={showBatchPreview}
          onClose={() => { if (!batchGenerating) setShowBatchPreview(false); }}
          title={`Preview: Generate for ${selectedBatch?.batchName || 'batch'}`}
        >
          <div style={{ padding: '20px', width: 'min(90vw, 620px)' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#111827', marginBottom: '6px', textTransform: 'uppercase' }}>
                Session Date
              </label>
              <input
                type="date"
                value={previewSessionDate}
                onChange={(e) => setPreviewSessionDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '2px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: 'white', cursor: 'pointer' }}
              />
            </div>

            {!batchPreviewLoading && batchPreviewRows.some(r => !r.blocked || r.recoverable) && (
              <button
                type="button"
                onClick={openBatchStagingEditor}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '10px 14px', marginBottom: '16px', borderRadius: '8px',
                  background: '#F5F3FF', color: '#6D28D9', border: '1.5px solid #DDD6FE',
                  fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                }}
              >
                <PencilLine size={14} /> Edit This Session for the Whole Batch
              </button>
            )}

            {batchPreviewLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[1, 2, 3].map(i => <Sk key={i} w="100%" h={54} r={10} />)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
                {batchPreviewRows.map(row => {
                  const hardBlocked = row.blocked && !row.recoverable;
                  return (
                  <div key={row.playerId} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                    borderRadius: '10px',
                    border: `1px solid ${hardBlocked ? '#FECACA' : row.recoverable ? '#FDE68A' : '#E5E7EB'}`,
                    background: hardBlocked ? '#FEF2F2' : row.recoverable ? '#FFFBEB' : '#F9FAFB',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: '700', color: '#111827', margin: 0 }}>{row.playerName}</p>
                      {hardBlocked ? (
                        <p style={{ fontSize: '12px', color: '#DC2626', margin: '2px 0 0' }}>{row.reason}</p>
                      ) : row.recoverable ? (
                        <>
                          <p style={{ fontSize: '11px', color: '#92400E', margin: '2px 0 0' }}>{row.reason}</p>
                          {row.pathwaySession && (
                            <p style={{ fontSize: '12px', color: '#4B5563', margin: '2px 0 0' }}>
                              Session {row.nextSession}: <strong>{row.topic}</strong> · {row.activityCount} activities · {row.points} pts
                            </p>
                          )}
                        </>
                      ) : (
                        <p style={{ fontSize: '12px', color: '#4B5563', margin: '2px 0 0' }}>
                          Session {row.nextSession}: <strong>{row.topic}</strong> · {row.activityCount} activities · {row.points} pts
                        </p>
                      )}
                    </div>
                    {batchGenerating ? (() => {
                      const st = batchGenStatus[row.playerId]?.state;
                      if (st === 'success') return <CheckCircle size={16} color="#16A34A" style={{ flexShrink: 0 }} />;
                      if (st === 'error') return <AlertTriangle size={16} color="#DC2626" style={{ flexShrink: 0 }} />;
                      if (st === 'loading') return <Loader size={16} color="#4F46E5" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />;
                      return <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#CBD5E1', flexShrink: 0 }} />;
                    })() : hardBlocked ? (
                      <AlertTriangle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
                    ) : (
                      <>
                        {row.pathwaySession && (
                          <button
                            type="button"
                            onClick={() => openStagingEditor(row)}
                            title="Review and edit this session's activities before creating it"
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px',
                              background: '#EEF2FF', color: '#4F46E5', border: 'none', borderRadius: '7px',
                              fontSize: '11px', fontWeight: '700', cursor: 'pointer', flexShrink: 0,
                            }}
                          >
                            <PencilLine size={12} /> Edit
                          </button>
                        )}
                        <CheckCircle size={16} color={row.recoverable ? '#D97706' : '#10B981'} style={{ flexShrink: 0 }} />
                      </>
                    )}
                  </div>
                  );
                })}
                {batchPreviewRows.length === 0 && (
                  <p style={{ fontSize: '13px', color: '#6B7280', textAlign: 'center', padding: '20px' }}>No players to preview</p>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
              <button type="button" onClick={() => setShowBatchPreview(false)} disabled={batchGenerating}
                style={{ padding: '12px 16px', borderRadius: '8px', fontWeight: '600', background: '#F3F4F6', color: '#111827', border: '2px solid #E5E7EB', cursor: 'pointer', fontSize: '14px' }}>
                Cancel
              </button>
              <button type="button" onClick={confirmBatchGenerate} disabled={batchGenerating || batchPreviewLoading || batchPreviewRows.every(r => r.blocked && !r.recoverable)}
                style={{
                  padding: '12px 16px', borderRadius: '8px', fontWeight: '600',
                  background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)', color: 'white', border: 'none',
                  cursor: (batchGenerating || batchPreviewLoading) ? 'not-allowed' : 'pointer', fontSize: '14px',
                  opacity: (batchGenerating || batchPreviewLoading) ? 0.8 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                {batchGenerating && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                {batchGenerating
                  ? `Generating ${Object.values(batchGenStatus).filter(s => s.state === 'success' || s.state === 'error').length}/${selectedBatch?.players?.length || 0}…`
                  : `Confirm & Generate ${batchPreviewRows.filter(r => !r.blocked || r.recoverable).length || ''}`}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Ask for a session date before jumping into the Custom card builder */}
      {showCustomDatePrompt && (
        <Modal
          isOpen={showCustomDatePrompt}
          onClose={() => setShowCustomDatePrompt(false)}
          title={`Custom Cards for ${selectedBatch?.batchName || 'batch'}`}
        >
          <div style={{ padding: '20px', width: 'min(90vw, 420px)' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#111827', marginBottom: '6px', textTransform: 'uppercase' }}>
              Session Date
            </label>
            <input
              type="date"
              value={customSessionDate}
              onChange={(e) => setCustomSessionDate(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '2px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: 'white', cursor: 'pointer' }}
            />
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '8px 0 0' }}>
              This date is stamped on every custom card you build next for {selectedBatch?.players?.length || 0} player{selectedBatch?.players?.length === 1 ? '' : 's'}.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
              <button type="button" onClick={() => setShowCustomDatePrompt(false)}
                style={{ padding: '12px 16px', borderRadius: '8px', fontWeight: '600', background: '#F3F4F6', color: '#111827', border: '2px solid #E5E7EB', cursor: 'pointer', fontSize: '14px' }}>
                Cancel
              </button>
              <button type="button" onClick={confirmBatchCustom} disabled={!customSessionDate}
                style={{
                  padding: '12px 16px', borderRadius: '8px', fontWeight: '600',
                  background: 'linear-gradient(135deg, #4F46E5, #6D28D9)', color: 'white', border: 'none',
                  cursor: customSessionDate ? 'pointer' : 'not-allowed', fontSize: '14px', opacity: customSessionDate ? 1 : 0.7,
                }}>
                Continue
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Batch generate error detail modal */}
      {errorDetail && (
        <Modal
          isOpen={!!errorDetail}
          onClose={() => setErrorDetail(null)}
          title="Generation Failed"
        >
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FEF2F2',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <AlertTriangle size={24} color="#EF4444" />
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: '700', color: '#111827', margin: 0 }}>{errorDetail.playerName}</p>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Card could not be generated</p>
              </div>
            </div>
            <div style={{
              padding: '12px 14px', background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: '8px', fontSize: '13px', color: '#991B1B', lineHeight: '1.5', wordBreak: 'break-word'
            }}>
              {errorDetail.message || 'Unknown error'}
            </div>
            <button
              onClick={() => setErrorDetail(null)}
              style={{
                marginTop: '20px', width: '100%', padding: '12px 16px', borderRadius: '8px',
                fontWeight: '600', background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
                color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px'
              }}
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Generate Card Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate Session Card"
      >
        <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: '500px' }}>
          <div style={{ marginBottom: '20px' }}>
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
              placeholder="Enter topic"
              value={generateFormData.topic}
              onChange={(e) => setGenerateFormData({ ...generateFormData, topic: e.target.value })}
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
              onFocus={(e) => e.target.style.borderColor = '#060030ff'}
              onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
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
              placeholder="Enter learning objective"
              value={generateFormData.objective}
              onChange={(e) => setGenerateFormData({ ...generateFormData, objective: e.target.value })}
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
                transition: 'all 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#060030ff'}
              onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '8px',
              textTransform: 'uppercase'
            }}>
              Duration (minutes)
            </label>
            <input
              type="number"
              value={generateFormData.duration}
              onChange={(e) => setGenerateFormData({ ...generateFormData, duration: parseInt(e.target.value) })}
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
              onFocus={(e) => e.target.style.borderColor = '#060030ff'}
              onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={() => setShowGenerateModal(false)}
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
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateCard}
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
            >
              {loading && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              Generate
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="Delete Session Card"
        >
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Trash2 size={28} color="#EF4444" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
              Delete this session card?
            </h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
              This action cannot be undone.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={loading}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  backgroundColor: '#f3f4f6',
                  color: '#111827',
                  border: '1px solid #e5e7eb',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCard}
                disabled={loading}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  backgroundColor: loading ? '#DC2626' : '#EF4444',
                  color: 'white',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  opacity: loading ? 0.8 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: 'center'
                }}
              >
                {loading && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
};

export default SessionCardManage;
