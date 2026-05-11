import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { SkeletonContainer } from '../../components/SkeletonLoader';
import { Users, ChevronRight, Loader, Play, Search, ChevronLeft, Trophy, Zap, Filter, X } from 'lucide-react';
import { SessionCardsView } from './SessionCardsView';

const StartSession = () => {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { currentUser, fetchAssignedPlayersForCoach, userToken } = useStore();
  const [players, setPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [filterStage, setFilterStage] = useState('all');

  // Convert progress string to percentage
  const convertProgressToPercentage = (progress) => {
    if (typeof progress === 'number') return progress;
    if (progress === 'Not Started') return 0;
    if (progress === 'In Progress') return 50;
    if (progress === 'Completed') return 100;
    return 0;
  };

  // Fetch individual session card by ID
  const fetchSessionCardById = async (sessionCardId, token) => {
    try {
      
      if (!token) {
        console.warn('No token provided for session card fetch');
        return null;
      }

      const headers = {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'userToken': token,
        'Authorization': `Bearer ${token}`
      };
      
      const response = await fetch(
        'https://kyfkhl8v4l.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_View_Sessioncard',
        {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            sessionCardId: sessionCardId
          })
        }
      );
      

      if (!response.ok) {
        console.error(`Failed to fetch session card ${sessionCardId}: ${response.status}`);
        return null;
      }

      const result = await response.json();
      // Extract sessionCard from the response
      return result.sessionCard || result.data || result;
    } catch (error) {
      console.error('Error fetching session card:', error);
      return null;
    }
  };

  // Helper function to refresh session cards after generation
  const refreshSessionCards = async () => {
    console.log('=== refreshSessionCards called ===');
    try {
      setIsLoading(true);
      console.log('Calling fetchAssignedPlayersForCoach with coachId:', currentUser.id);
      const coachResult = await fetchAssignedPlayersForCoach(currentUser.id);
      console.log('coachResult:', coachResult);
      
      if (coachResult.success && coachResult.players) {
        console.log('Found players:', coachResult.players.length);
        const playerItem = coachResult.players.find(item => {
          const player = item.player || item;
          return (player._id || player.playerId) === selectedPlayer.playerId;
        });

        console.log('playerItem:', playerItem);

        if (playerItem && playerItem.sessionCardIds && playerItem.sessionCardIds.length > 0) {
          console.log('sessionCardIds:', playerItem.sessionCardIds);
          // Get fresh token from store or localStorage
          let token = userToken;
          if (!token) {
            try {
              const storedAuth = localStorage.getItem('coachlife_auth');
              if (storedAuth) {
                const authData = JSON.parse(storedAuth);
                token = authData.userToken;
              }
            } catch (e) {
              console.error('Error reading auth from localStorage:', e);
            }
          }

          if (!token) {
            console.error('No token available for refreshing session cards');
            setIsGenerating(false);
            return;
          }
          
          console.log('Fetching session card details...');
          // Fetch each session card one by one
          const sessionCardsData = [];
          for (const sessionCardId of playerItem.sessionCardIds) {
            console.log('Fetching sessionCardId:', sessionCardId);
            const cardData = await fetchSessionCardById(sessionCardId, token);
            console.log('Fetched card data:', cardData);
            if (cardData) {
              sessionCardsData.push(cardData);
            }
          }
          console.log('All session cards fetched:', sessionCardsData.length);
          setSessions(sessionCardsData);
          console.log('Sessions state updated');
        } else {
          console.log('No sessionCardIds found for player');
        }
      } else {
        console.log('coachResult not successful or no players');
      }
      setIsGenerating(false);
    } catch (error) {
      console.error('Error refreshing session cards:', error);
      setIsGenerating(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate session card API call
  const generateSessionCard = async () => {
    console.log('=== generateSessionCard called ===');
    try {
      setIsGenerating(true);
      setGenerateError(null);
      
      console.log('selectedPlayer:', selectedPlayer);
      
      // Validate that a player is selected
      if (!selectedPlayer || !selectedPlayer.playerId) {
        const errorMsg = 'Please select a player first.';
        console.error(errorMsg);
        setGenerateError(errorMsg);
        setIsGenerating(false);
        return;
      }
      
      console.log('Player ID:', selectedPlayer.playerId);
      
      // Get auth token from store or localStorage
      let token = userToken;
      console.log('userToken from store:', token);
      
      // If no token in store, try to get from localStorage
      if (!token) {
        try {
          const storedAuth = localStorage.getItem('coachlife_auth');
          console.log('storedAuth:', storedAuth);
          if (storedAuth) {
            const authData = JSON.parse(storedAuth);
            token = authData.userToken;
            console.log('token from localStorage:', token);
          }
        } catch (e) {
          console.error('Error reading auth from localStorage:', e);
        }
      }
      
      if (!token) {
        const errorMsg = 'No authentication token found. Please login again.';
        console.error(errorMsg);
        setGenerateError(errorMsg);
        setIsGenerating(false);
        return;
      }
      
      console.log('Final token:', token);
      
      const headers = {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'userToken': token,
        'Authorization': `Bearer ${token}`
      };
      
      console.log('Request headers:', headers);
      
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
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);


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
          // If not JSON, use the text response
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log('Response data:', responseData);
      
      console.log('Calling refreshSessionCards...');
      // Refresh the player data to get the new session card
      await refreshSessionCards();
      console.log('refreshSessionCards completed');
    } catch (error) {
      console.error('Error generating session card:', error);
      
      // Check if it's a CORS error - if so, still try to refresh data
      if (error.message && error.message.includes('Failed to fetch')) {
        console.log('CORS error detected, retrying refresh...');
        setTimeout(() => refreshSessionCards(), 1000);
      } else {
        setGenerateError(error.message || 'Failed to generate session card');
      }
    } finally {
      console.log('generateSessionCard finally block - setting isGenerating to false');
      setIsGenerating(false);
    }
  };

  // Fetch assigned players
  useEffect(() => {
    const loadPlayers = async () => {
      try {
        setIsLoading(true);
        const result = await fetchAssignedPlayersForCoach(currentUser.id);
        
        if (result.success && result.players) {
          const transformedPlayers = result.players.map(item => {
            const player = item.player || item;
            return {
              playerId: player._id || player.id || player.playerId,
              name: player.playerName || player.name,
              email: player.phone || '',
              learningPathway: player.LearningPathway || 'Not Assigned',
              progress: convertProgressToPercentage(player.progress),
              totalPoints: player.TotalPoints || 0,
              status: player.status,
              sessionCardIds: item.sessionCardIds || []
            };
          });
          
          setPlayers(transformedPlayers);
          
          // If playerId from URL, auto-select player
          if (playerId) {
            const player = transformedPlayers.find(p => p.playerId === playerId);
            if (player) {
              setSelectedPlayer(player);
              
              // Fetch session card details in parallel (not one by one)
              if (player.sessionCardIds && player.sessionCardIds.length > 0) {
                let token = userToken;
                if (!token) {
                  try {
                    const storedAuth = localStorage.getItem('coachlife_auth');
                    if (storedAuth) {
                      const authData = JSON.parse(storedAuth);
                      token = authData.userToken;
                    }
                  } catch (e) {
                    console.error('Error reading auth from localStorage:', e);
                  }
                }

                // Use Promise.all to fetch all session cards in parallel
                const sessionCardPromises = player.sessionCardIds.map(sessionCardId =>
                  fetchSessionCardById(sessionCardId, token).catch(err => {
                    console.error(`Failed to fetch session card ${sessionCardId}:`, err);
                    return null;
                  })
                );

                const sessionCardsData = await Promise.all(sessionCardPromises);
                setSessions(sessionCardsData.filter(card => card !== null));
              } else {
                setSessions([]);
              }
              setGenerateError(null); // Clear any previous errors when selecting new player
            }
          } else {
            // Clear selection if no playerId in URL (user clicked back button)
            setSelectedPlayer(null);
            setSessions([]);
            setGenerateError(null); // Clear errors when going back to list
          }
        }
      } catch (error) {
        console.error('Error fetching players:', error);
        setPlayers([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser?.id) {
      loadPlayers();
    }
     
  }, [currentUser?.id, fetchAssignedPlayersForCoach, playerId, userToken]);

  // Handle player selection and fetch session card details
  const handleSelectPlayer = async (player) => {
    setSelectedPlayer(player);
    // Update URL with playerId so page stays on selection after refresh
    navigate(`/coach/start-session/${player.playerId}`);

    // Fetch session card details in parallel if there are session card IDs
    setIsLoading(true);
    try {
      setGenerateError(null);
      if (player.sessionCardIds && player.sessionCardIds.length > 0) {
        let token = userToken;
        if (!token) {
          try {
            const storedAuth = localStorage.getItem('coachlife_auth');
            if (storedAuth) {
              const authData = JSON.parse(storedAuth);
              token = authData.userToken;
            }
          } catch (e) {
            console.error('Error reading auth from localStorage:', e);
          }
        }
        
        // Use Promise.all to fetch all session cards in parallel
        const sessionCardPromises = player.sessionCardIds.map(sessionCardId =>
          fetchSessionCardById(sessionCardId, token).catch(err => {
            console.error(`Failed to fetch session card ${sessionCardId}:`, err);
            return null;
          })
        );
        
        const sessionCardsData = await Promise.all(sessionCardPromises);
        setSessions(sessionCardsData.filter(card => card !== null));
      } else {
        setSessions([]);
      }
    } catch (error) {
      console.error('Error fetching session card details:', error);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter players with learning pathway filter
  let filteredPlayers = players.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPathway = filterStage === 'all' || p.learningPathway === filterStage;
    return matchesSearch && matchesPathway;
  });

  // Sort players
  filteredPlayers = [...filteredPlayers].sort((a, b) => {
    switch (sortBy) {
      case 'points':
        return (b.totalPoints || 0) - (a.totalPoints || 0);
      case 'pathway':
        return (a.learningPathway || '').localeCompare(b.learningPathway || '');
      case 'name':
      default:
        return a.name.localeCompare(b.name);
    }
  });

  // Get unique learning pathways for filters
  const uniquePathways = [...new Set(players.map(p => p.learningPathway).filter(Boolean))].sort();
  
  // Calculate stats
  const totalPlayers = players.length;
  const totalSessionCards = players.reduce((sum, p) => sum + (p.sessionCardIds?.length || 0), 0);
  const totalPoints = players.reduce((sum, p) => sum + (p.totalPoints || 0), 0);

  // If player selected, show sessions view
  if (selectedPlayer) {
    return (
      <Layout>
        <SessionCardsView
          selectedPlayer={selectedPlayer}
          sessions={sessions}
          isGenerating={isGenerating}
          isLoading={isLoading}
          generateError={generateError}
          onGenerateCard={generateSessionCard}
          currentUser={currentUser}
          fetchAssignedPlayersForCoach={fetchAssignedPlayersForCoach}
        />
      </Layout>
    );
  }

  // Main view - Show player list
  return (
    <Layout>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
        {/* Header - Skeleton or Real */}
        {isLoading ? (
          <SkeletonContainer>
            <div style={{
              background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
              borderRadius: '16px',
              padding: '32px',
              marginBottom: '32px',
              minHeight: '160px'
            }}>
              <div style={{
                height: '40px',
                background: 'rgba(255,255,255,0.12)',
                borderRadius: '8px',
                marginBottom: '12px',
                width: '250px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }} />
              <div style={{
                height: '16px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '4px',
                width: '400px',
                marginBottom: '24px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                animationDelay: '0.1s'
              }} />
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px'
              }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    height: '60px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    animationDelay: `${i * 0.1}s`
                  }} />
                ))}
              </div>
              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
              `}</style>
            </div>
          </SkeletonContainer>
        ) : (
          <>
            <div style={{
              background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
              borderRadius: '16px',
              padding: '32px',
              color: 'white',
              marginBottom: '32px',
              boxShadow: '0 4px 12px rgba(37, 44, 53, 0.2)'
            }}>
              <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, marginBottom: '8px' }}>
                  Start Session
                </h1>
                <p style={{ fontSize: '15px', opacity: 0.9, margin: 0 }}>
                  Select a player to view and start session cards
                </p>
              </div>
              
              {/* Stats Dashboard */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '16px'
              }}>
                {/* Total Players */}
                <div style={{
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <Users size={24} style={{ opacity: 0.7 }} />
                  <div>
                    <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>Total Players</p>
                    <p style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>{totalPlayers}</p>
                  </div>
                </div>

                {/* Session Cards */}
                <div style={{
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <Zap size={24} style={{ opacity: 0.7 }} />
                  <div>
                    <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>Session Cards</p>
                    <p style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>{totalSessionCards}</p>
                  </div>
                </div>

                {/* Total Points */}
                <div style={{
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <Trophy size={24} style={{ opacity: 0.7 }} />
                  <div>
                    <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>Total Points</p>
                    <p style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>{totalPoints.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Search & Filter */}
        {isLoading ? (
          <SkeletonContainer>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1.5px solid #E2E8F0',
              padding: '20px',
              marginBottom: '32px'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    height: '44px',
                    background: '#f5f5f5',
                    borderRadius: '10px',
                    animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                    animationDelay: `${i * 0.1}s`
                  }} />
                ))}
              </div>
              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
              `}</style>
            </div>
          </SkeletonContainer>
        ) : (
          <>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1.5px solid #E2E8F0',
              padding: '20px',
              marginBottom: '24px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px'
              }}>
                {/* Search */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  gridColumn: 'span 1'
                }}>
                  <Search size={18} color="#64748B" />
                  <input
                    type="text"
                    placeholder="Search by name..."
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

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #E2E8F0',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#111827',
                    fontWeight: '500',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#060030ff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E8F0';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="name">Sort by Name</option>
                  <option value="points">Sort by Points</option>
                  <option value="pathway">Sort by Pathway</option>
                </select>

                {/* Filter - Pathway */}
                <select
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #E2E8F0',
                    background: filterStage !== 'all' ? '#F0E8FF' : '#F8FAFC',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#111827',
                    fontWeight: '500',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#060030ff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E8F0';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="all">All Pathways</option>
                  {uniquePathways.map(pathway => (
                    <option key={pathway} value={pathway}>
                      {pathway}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}
        {/* Players Grid */}
        {isLoading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                border: '1.5px solid #E2E8F0',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                animation: `pulse 2s ease-in-out infinite ${i * 0.1}s`
              }}>
                <div style={{
                  width: '100%',
                  height: '160px',
                  background: 'rgba(200, 200, 200, 0.3)',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }} />
                <div style={{
                  width: '70%',
                  height: '18px',
                  background: 'rgba(200, 200, 200, 0.3)',
                  borderRadius: '4px',
                  marginBottom: '8px'
                }} />
                <div style={{
                  width: '50%',
                  height: '14px',
                  background: 'rgba(200, 200, 200, 0.3)',
                  borderRadius: '4px',
                  marginBottom: '16px'
                }} />
                <div style={{
                  width: '100%',
                  height: '36px',
                  background: 'rgba(200, 200, 200, 0.3)',
                  borderRadius: '6px'
                }} />
              </div>
            ))}
          </div>
        ) : filteredPlayers.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            <style>{`
              @keyframes pulse {
                0%, 100% { opacity: 0.4; }
                50% { opacity: 0.7; }
              }
            `}</style>
            {filteredPlayers.map((player) => {
              return (
                <div
                  key={player.playerId}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '14px',
                    border: '2px solid #E2E8F0',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(82, 102, 129, 0.15)';
                    e.currentTarget.style.borderColor = '#060030ff';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Header */}
                  <div style={{
                    padding: '16px',
                    background: 'linear-gradient(135deg, #F8FAFC, #EFF6FF)',
                    borderBottom: '1.5px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', margin: 0, marginBottom: '4px' }}>
                        {player.name}
                      </h3>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                        {player.email}
                      </p>
                    </div>
                    
                  </div>

                  {/* Badges */}
                  <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '4px 10px',
                      background: '#FFFBEB',
                      color: '#92400E',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700'
                    }}>
                      {player.learningPathway}
                    </span>
                  </div>

                  {/* Stats */}
                  <div style={{
                    padding: '12px 16px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    borderBottom: '1.5px solid #E2E8F0'
                  }}>
                    <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                      <p style={{ fontSize: '10px', color: '#64748B', margin: 0, marginBottom: '4px', fontWeight: '600' }}>Points</p>
                      <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#060030ff', margin: 0 }}>
                        {player.totalPoints}
                      </p>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                      <p style={{ fontSize: '10px', color: '#64748B', margin: 0, marginBottom: '4px', fontWeight: '600' }}>Cards</p>
                      <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#060030ff', margin: 0 }}>
                        {player.sessionCardIds?.length || 0}
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div style={{ padding: '12px 16px', marginTop: 'auto' }}>
                    <button 
                      onClick={() => handleSelectPlayer(player)}
                      style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #060030ff, #252c35)',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '700',
                      transition: 'all 0.2s ease',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(82, 102, 129, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                    }}>
                      Start Session
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1.5px solid #E2E8F0',
            padding: '48px 32px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
          }}>
            <Users size={56} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#D1D5DB' }} />
            <p style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0, marginBottom: '8px' }}>
              {players.length === 0 ? 'No players assigned yet' : 'No players match your filters'}
            </p>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0, marginBottom: '16px' }}>
              {players.length === 0 ? 'Players will appear here once assigned to you' : 'Try adjusting your search or filter criteria'}
            </p>
            {(filterStage !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStage('all');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#060030ff',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StartSession;


