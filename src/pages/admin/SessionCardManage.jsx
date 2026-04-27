import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { Toast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { Users, Search, Edit3, Trash2, Plus, Eye, ChevronLeft, Loader, Sparkles, Mail, Cake, Phone, Star } from 'lucide-react';

// API Endpoints
const API_ENDPOINTS = {
  GET_PLAYERS: 'https://jrrnyyf9r9.execute-api.ap-south-1.amazonaws.com/default/CL_Get_All_Players',
  VIEW_SESSION_CARD: 'https://kyfkhl8v4l.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_View_Sessioncard',
  DELETE_SESSION_CARD: 'https://rmauptygg5.execute-api.ap-south-1.amazonaws.com/Coachlife-com/CL_Deleting_Sessioncard',
};

const SessionCardManage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userToken, selectedPlayer, setSelectedPlayer } = useStore();
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

  // Fetch players on mount (only once)
  useEffect(() => {
    fetchPlayers();
  }, [userToken]);

  // Refetch whenever this page is visited via navigation (location key changes)
  useEffect(() => {
    setIsFetching(true);
    setSessionCards([]);
    setSelectedPlayer(null);
    fetchPlayers();
  }, [location.key]);

  // Fetch session cards when player is selected (with caching)
  useEffect(() => {
    if (selectedPlayer && selectedPlayer.sessionCardIds && selectedPlayer.sessionCardIds.length > 0) {
      const playerId = selectedPlayer.playerId;
      
      // Always refetch when sessionCardIds length changes (ensures fresh data after create/delete)
      // This prevents stale data after operations from other pages
      fetchPlayerSessionCards(selectedPlayer.sessionCardIds, playerId);
    } else {
      setSessionCards([]);
    }
  }, [selectedPlayer?.playerId, selectedPlayer?.sessionCardIds?.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Escape to close modals
      if (e.key === 'Escape') {
        setShowGenerateModal(false);
      }
      // Ctrl+N to generate new card
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

      // Handle different response structures
      if (Array.isArray(data)) {
        playersList = data;
      } else if (data.data && Array.isArray(data.data)) {
        playersList = data.data;
      } else if (data.players && Array.isArray(data.players)) {
        playersList = data.players;
      }

      // Transform players data
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

  // Fetch session cards for selected player
  const fetchPlayerSessionCards = async (sessionCardIds, playerId) => {
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

  // Filter players based on search
  const filteredPlayers = players.filter(p =>
    p.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectPlayer = (player) => {
    setSelectedPlayer(player);
  };

  const handleGenerateCard = async () => {
    setLoading(true);
    try {
      // Call the session card generation API
      const headers = {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'userToken': userToken,
        'Authorization': `Bearer ${userToken}`
      };

      const response = await fetch(
        'https://7mbaul8uz9.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_Session_Card_Generating',
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
      
      // Close modal
      setShowGenerateModal(false);
      
      // Refetch players to get updated sessionCardIds and refresh session cards for the selected player
      const updatedPlayers = await fetchPlayers();
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

      if (!response.ok) throw new Error('Failed to delete session card');

      const data = await response.json();
      
      setToastMessage('Session card deleted successfully!');
      setToastType('success');
      setDeleteConfirm(null);
      
      // Just remove the deleted card from local state
      setSessionCards(prev => prev.filter(card => card._id !== deleteConfirm));
      
    } catch (err) {
      console.error('Error deleting card:', err);
      setToastMessage('Failed to delete card');
      setToastType('error');
    } finally {
      setLoading(false);
    }
  };

  // Mock function for delete session card (temporary)
  const handleDeleteSessionCard = handleDeleteCard;

  const handleOpenSessionCard = (card) => {
    // Navigate to ViewSessionCard page to view the session card
    navigate(`/admin/view-session-card/${card._id}`, { state: { session: card, playerId: selectedPlayer.playerId } });
  };

  const handleEditSessionCard = (cardId) => {
    // Navigate to EditSessionCard page
    navigate(`/admin/edit-session-card/${cardId}`, { state: { playerId: selectedPlayer.playerId } });
  };



  return (
    <Layout>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      {toastMessage && (
        <Toast 
          message={toastMessage} 
          type={toastType}
          duration={3000}
          onClose={() => setToastMessage('')}
        />
      )}

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #060030ff 0%, #000000 100%)',
          borderRadius: '12px',
          padding: '32px',
          marginBottom: '32px',
          color: 'white',
          boxShadow: '0 4px 20px rgba(6, 0, 48, 0.1)'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: '800', margin: '0 0 8px 0' }}>
              Session Card Management
            </h1>
            <p style={{ fontSize: '15px', opacity: 0.9, margin: 0 }}>
              Create, manage, and monitor session cards for all players
            </p>
          </div>

          {/* Stats Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '16px'
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '12px 16px',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)'
            }}>
              <p style={{ fontSize: '11px', opacity: 0.8, margin: '0 0 4px 0', textTransform: 'uppercase' }}>Total Players</p>
              <p style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>{players.length}</p>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '12px 16px',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)'
            }}>
              <p style={{ fontSize: '11px', opacity: 0.8, margin: '0 0 4px 0', textTransform: 'uppercase' }}>Total Cards</p>
              <p style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>{sessionCards.length}</p>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '12px 16px',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)'
            }}>
              <p style={{ fontSize: '11px', opacity: 0.8, margin: '0 0 4px 0', textTransform: 'uppercase' }}>Selected Player</p>
              <p style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>{selectedPlayer ? '✓' : '-'}</p>
            </div>
          </div>
        </div>

        {isFetching ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '600px',
            gap: '24px'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: '16px' }}>
                <SkeletonLoader width="100%" height="20px" borderRadius="8px" style={{ marginBottom: '8px' }} />
              </div>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ marginBottom: '12px' }}>
                  <SkeletonLoader width="100%" height="60px" borderRadius="8px" />
                </div>
              ))}
            </div>
            <div style={{ flex: 1.5 }}>
              <SkeletonLoader width="100%" height="300px" borderRadius="12px" style={{ marginBottom: '16px' }} />
              <SkeletonLoader width="100%" height="200px" borderRadius="12px" />
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
            {/* Players List Section */}
          <div>
            <Card style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '20px', borderBottom: '2px solid #E5E7EB', background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#111827' }}>
                    Players
                  </h2>
                </div>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                  {filteredPlayers.length} available
                </p>
              </div>

              {/* Search */}
              <div style={{ padding: '16px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '8px',
                  background: '#FFFFFF'
                }}>
                  <Search size={18} color="#9CA3AF" />
                  <input
                    type="text"
                    placeholder="Search players..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      fontSize: '14px',
                      background: 'transparent'
                    }}
                  />
                </div>
              </div>

              {/* Players List */}
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {isFetching ? (
                  <div style={{ padding: '16px' }}>
                    {[...Array(5)].map((_, i) => (
                      <div key={i} style={{ marginBottom: '12px' }}>
                        <SkeletonLoader width="100%" height="60px" borderRadius="8px" />
                      </div>
                    ))}
                  </div>
                ) : filteredPlayers.length > 0 ? (
                  filteredPlayers.map((player) => (
                    <div
                      key={player.playerId}
                      onClick={() => handleSelectPlayer(player)}
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid #E5E7EB',
                        cursor: 'pointer',
                        background: selectedPlayer?.playerId === player.playerId ? 'linear-gradient(135deg, #E0E7FF 0%, #EDE9FE 100%)' : '#FFFFFF',
                        transition: 'all 0.3s',
                        borderLeft: selectedPlayer?.playerId === player.playerId ? '4px solid #060030' : '4px solid transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedPlayer?.playerId !== player.playerId) {
                          e.currentTarget.style.background = '#F9FAFB';
                          e.currentTarget.style.boxShadow = 'inset 0 0 0 1px rgba(124, 58, 237, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedPlayer?.playerId !== player.playerId) {
                          e.currentTarget.style.background = '#FFFFFF';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #060030 0%, #000000 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: 'white',
                        flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(6, 0, 48, 0.2)'
                      }}>
                        {player.playerName.charAt(0).toUpperCase()}
                      </div>

                      {/* Player Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                          <p style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: '#111827' }}>
                            {player.playerName}
                          </p>
                          {player.LearningPathway && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '700',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              background: 'rgba(6, 0, 48, 0.1)',
                              color: '#060030',
                              whiteSpace: 'nowrap',
                              marginLeft: '8px'
                            }}>
                              {player.LearningPathway}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '12px', color: '#6B7280', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {player.email}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'rgba(124, 58, 237, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px'
                    }}>
                      <Users size={32} style={{ color: '#7C3AED', opacity: 0.7 }} />
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }}>
                      No players found
                    </p>
                    <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                      Try adjusting your search
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Player Details Section */}
          {selectedPlayer ? (
            <Card style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(6, 0, 48, 0.1)' }}>
              {/* Enhanced Header */}
              <div style={{
                padding: '32px 20px',
                background: 'linear-gradient(135deg, #060030ff 0%, #000000 100%)',
                color: 'white',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '12px'
              }}>
                {/* Background decoration */}
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  right: '-5%',
                  width: '300px',
                  height: '300px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  pointerEvents: 'none'
                }} />
                
                <div style={{ position: 'relative', zIndex: 1 }}>
                  {/* Avatar */}
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #7c3aed86 0%, #ec489a88 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    fontWeight: '700',
                    margin: '0 auto 16px',
                    border: '4px solid rgba(255, 255, 255, 0.68)',
                    boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)'
                  }}>
                    {selectedPlayer.playerName.charAt(0).toUpperCase()}
                  </div>

                  {/* Player Info */}
                  <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 8px 0' }}>
                    {selectedPlayer.playerName}
                  </h2>
                  <div style={{
                    display: 'inline-block',
                    background: 'rgba(255,255,255,0.15)',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    marginBottom: '16px',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    {selectedPlayer.LearningPathway || 'Learning Pathway'}
                  </div>
                </div>
              </div>

             {/* Action Buttons After Session Cards */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid #E5E7EB', background: '#FFFFFF', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    onClick={handleGenerateCard}
                    disabled={loading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 16px',
                      background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s',
                      opacity: loading ? 0.8 : 1
                    }}
                    onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    {loading ? (
                      <>
                        <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating...
                      </>
                    ) : (
                      <>
                        <Plus size={16} /> Generate Card
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => navigate('/admin/custom-generate-card', { state: { playerId: selectedPlayer.playerId, playerName: selectedPlayer.playerName } })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 16px',
                      background: 'linear-gradient(135deg, #060030ff 0%, #6D28D9 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <Sparkles size={16} /> Custom Generate
                  </button>
                </div>

              {/* Existing Session Cards */}
              {isLoadingSessionCards ? (
                <div style={{ marginBottom: '24px', paddingTop: '20px', paddingLeft: '20px', paddingRight: '20px', paddingBottom: '20px', borderTop: '1px solid #E5E7EB' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 16px 0' }}>
                    Loading Session Cards...
                  </h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {[...Array(3)].map((_, i) => (
                      <SkeletonLoader key={i} width="100%" height="80px" borderRadius="8px" />
                    ))}
                  </div>
                </div>
              ) : sessionCards.length > 0 && (
                <div style={{ marginBottom: '24px', paddingTop: '20px', paddingLeft: '20px', paddingRight: '20px', paddingBottom: '20px', borderTop: '1px solid #E5E7EB' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 16px 0' }}>
                    Session Cards ({sessionCards.length})
                  </h3>

                  {/* Search Cards */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    marginBottom: '12px'
                  }}>
                    <Search size={16} color="#9CA3AF" />
                    <input
                      type="text"
                      placeholder="Search cards by topic or objective..."
                      value={cardSearchTerm}
                      onChange={(e) => setCardSearchTerm(e.target.value)}
                      style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        fontSize: '13px',
                        background: 'transparent'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                    {sessionCards
                      .filter(card => 
                        card.Topic?.toLowerCase().includes(cardSearchTerm.toLowerCase()) ||
                        card.Objective?.toLowerCase().includes(cardSearchTerm.toLowerCase())
                      )
                      .sort((a, b) => {
                        // Prefer explicit session number ascending if present, else fallback to topic A→Z
                        const getSessionOrder = (card) => {
                          const val = card.session ?? card.sessionNumber ?? card.sessionNo ?? card.sessionId;
                          const num = Number(val);
                          return Number.isFinite(num) ? num : null;
                        };

                        const orderA = getSessionOrder(a);
                        const orderB = getSessionOrder(b);

                        if (orderA !== null && orderB !== null) return orderA - orderB;
                        if (orderA !== null) return -1;
                        if (orderB !== null) return 1;

                        if (cardSortBy === 'duration') {
                          return (a.Duration || 0) - (b.Duration || 0);
                        }
                        return (a.Topic || '').localeCompare(b.Topic || '');
                      })
                      .map((card, index) => (
                      <div 
                        key={card._id || index}
                        onClick={() => handleOpenSessionCard(card)}
                        style={{
                          padding: '14px',
                          background: '#F9FAFB',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#E0E7FF';
                          e.currentTarget.style.borderColor = '#060030ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#F9FAFB';
                          e.currentTarget.style.borderColor = '#E5E7EB';
                        }}
                        >
                          <div style={{ flex: 1 }}>
                            {(() => {
                              const sessionLabel = card.session;
                              const displayLabel = sessionLabel ? `Session ${sessionLabel}` : `Session ${index + 1}`;
                              return (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0 }}>
                                    {displayLabel}
                                  </p>
                                  <span style={{
                                    display: 'inline-block',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    padding: '6px 12px',
                                    borderRadius: '4px',
                                    textTransform: 'capitalize',
                                    background: card.status?.toLowerCase() === 'completed' ? '#DCFCE7' : 
                                               card.status?.toLowerCase() === 'upcoming' ? '#FEF3C7' :
                                               card.status?.toLowerCase() === 'in progress' ? '#DBEAFE' : '#F3F4F6',
                                    color: card.status?.toLowerCase() === 'completed' ? '#166534' : 
                                           card.status?.toLowerCase() === 'upcoming' ? '#92400E' :
                                           card.status?.toLowerCase() === 'in progress' ? '#075985' : '#6B7280'
                                  }}>
                                    {card.typeOfSessioncard || 'Draft'}
                                  </span>
                                </div>
                              );
                            })()}
                            <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }}>
                              {card.Topic || 'Untitled'}
                            </p>
                            <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 6px 0', lineHeight: '1.4' }}>
                              {card.Objective?.substring(0, 50)}...
                            </p>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#9CA3AF' }}>
                              <span>⏱ {card.totalDuration || 30} min</span>
                            </div>
                          </div>
                          <div style={{
                            display: 'flex',
                            gap: '8px',
                            marginLeft: '12px'
                          }}>

                            <span style={{
                                display: 'inline-block',
                                fontSize: '11px',
                                fontWeight: '600',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                textTransform: 'capitalize',
                                background: card.typeOfSessioncard?.toLowerCase() === 'completed' ? '#DCFCE7' : 
                                           card.typeOfSessioncard?.toLowerCase() === 'upcoming' ? '#FEF3C7' :
                                           card.typeOfSessioncard?.toLowerCase() === 'in progress' ? '#DBEAFE' : '#F3F4F6',
                                color: card.typeOfSessioncard?.toLowerCase() === 'completed' ? '#166534' : 
                                       card.typeOfSessioncard?.toLowerCase() === 'upcoming' ? '#92400E' :
                                       card.typeOfSessioncard?.toLowerCase() === 'in progress' ? '#075985' : '#6B7280'
                              }}>
                                {card.status || 'Draft'}
                              </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSessionCard(card);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 12px',
                                background: '#E0E7FF',
                                color: '#060030ff',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#C7D2FE'}
                              onMouseLeave={(e) => e.currentTarget.style.background = '#E0E7FF'}
                            >
                              <Eye size={14} /> View
                            </button>

                            
                            {card.status?.toLowerCase() !== 'completed' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditSessionCard(card._id);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '6px 12px',
                                  background: '#FEF08A',
                                  color: '#92400E',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  whiteSpace: 'nowrap',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#FDE047'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#FEF08A'}
                              >
                                <Edit3 size={14} /> Edit
                              </button>
                            )}

                            

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(card._id);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 12px',
                                background: '#FECACA',
                                color: '#991B1B',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#FCA5A5'}
                              onMouseLeave={(e) => e.currentTarget.style.background = '#FECACA'}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Session Cards State */}
                {!isLoadingSessionCards && selectedPlayer && sessionCards.length === 0 && (
                  <div style={{
                    marginBottom: '24px',
                    paddingTop: '20px',
                    borderTop: '1px solid #E5E7EB',
                    textAlign: 'center',
                    padding: '32px 20px'
                  }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: '#FEF2F2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                      opacity: 0.6
                    }}>
                      <Plus size={32} color="#6B7280" />
                    </div>
                    <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 8px 0' }}>
                      No Session Cards Yet
                    </h4>
                    <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                      Create the first session card for this player to get started
                    </p>
                  </div>
                )}
              </Card>
            ) : (
            <Card style={{
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)'
            }}>
              <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'rgba(96, 165, 250, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px'
                }}>
                  <Eye size={36} color='#60A5FA' opacity={0.6} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 8px 0' }}>
                  No Player Selected
                </h3>
                <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                  Select a player from the list to view and manage their session cards
                </p>
              </div>
            </Card>
          )}
          </div>
        )}
      </div>

      {/* Generate Card Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate Session Card"
      >
        <div style={{ padding: '24px', maxWidth: '500px' }}>
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

          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
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
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </Modal>
      )}

      {/* Delete Session Card Modal */}
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
              Delete session card?
            </h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
              This action cannot be undone. The session card will be permanently deleted.
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
                onClick={handleDeleteSessionCard}
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
