import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Select } from '../../components/Select';
import { Toast } from '../../components/Toast';
import { Users, UserCheck, X, Search, Filter, CheckCircle2, AlertCircle, Link2, ChevronDown, ChevronUp, BookOpen, Star, Trophy } from 'lucide-react';

const AssignPlayers = () => {
  const { players, coaches, assignPlayerToCoach, fetchPlayers, fetchCoaches, removePlayerFromCoach, swapPlayerBetweenCoaches, fetchAssignedPlayersForCoach } = useStore();
  const [removingPlayerId, setRemovingPlayerId] = useState(null);
  const [coachAssignments, setCoachAssignments] = useState({});
  const [assignedPlayersData, setAssignedPlayersData] = useState({});
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [selectedCoach, setSelectedCoach] = useState('');
  const [selectedSwapPlayer, setSelectedSwapPlayer] = useState('');
  const [selectedSwapFromCoach, setSelectedSwapFromCoach] = useState('');
  const [selectedSwapToCoach, setSelectedSwapToCoach] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCoach, setFilterCoach] = useState('all');
  const [_assignmentSuccess, setAssignmentSuccess] = useState(null);
  const [_assignmentError, setAssignmentError] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const initialFetchRef = useRef(false);
  const isPageLoading = isLoading || isAssignmentsLoading;

  // Fetch assignments for all coaches (moved out for reuse)
  const fetchAllAssignments = async () => {
    if (!coaches || coaches.length === 0) return;
    const assignments = {};
    const playersData = {};
    for (const coach of coaches) {
      try {
        const result = await fetchAssignedPlayersForCoach(coach.coachId);
        if (!result.success) {
          console.warn(`No players found for coachId ${coach.coachId}:`, result.error);
        }
        if (result.success && result.players) {
          // Store the full data structure with player + sessionCards
          assignments[coach.coachId] = result.players.map(item => ({
            player: item.player || item,
            sessionCards: item.sessionCards || [],
            coachId: coach.coachId
          }));
          // Also store by player for quick lookup
          result.players.forEach(item => {
            const playerId = item.player?._id || item._id || item.playerId;
            if (playerId) {
              playersData[playerId] = {
                player: item.player || item,
                sessionCards: item.sessionCards || [],
                coachId: coach.coachId
              };
            }
          });
        } else {
          assignments[coach.coachId] = [];
        }
      } catch (err) {
        console.error(`Error fetching assigned players for coachId ${coach.coachId}:`, err);
        assignments[coach.coachId] = [];
      }
    }
    setCoachAssignments(assignments);
    setAssignedPlayersData(playersData);
  };

  // Fetch coaches and players on mount, then fetch assignments
  useEffect(() => {
    if (initialFetchRef.current) return;
    initialFetchRef.current = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchPlayers(), fetchCoaches()]);
        setIsAssignmentsLoading(true); // keep skeleton visible until assignments load
        setHasLoadedInitial(true);
      } catch (error) {
        console.error('Error loading data:', error);
        setIsAssignmentsLoading(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchPlayers, fetchCoaches]);

  // Fetch assignments for all coaches only on initial load
  useEffect(() => {
    const loadAssignments = async () => {
      if (!hasLoadedInitial) return;
      if (!coaches || coaches.length === 0) {
        setIsAssignmentsLoading(false);
        return;
      }

      setIsAssignmentsLoading(true);
      try {
        await fetchAllAssignments();
      } catch (error) {
        console.error('Error loading assignments:', error);
      } finally {
        setIsAssignmentsLoading(false);
      }
    };

    loadAssignments();
  }, [hasLoadedInitial, coaches]);

  // Auto-populate "From" coach when swap player is selected
  useEffect(() => {
    if (selectedSwapPlayer && coachAssignments && Object.keys(coachAssignments).length > 0) {
      // Find which coach has this player
      for (const [coachId, assignedDataArray] of Object.entries(coachAssignments)) {
        const playerExists = assignedDataArray.some(item => {
          const pId = item.player?._id || item.player?.playerId || item._id || item.playerId;
          return pId === selectedSwapPlayer;
        });
        if (playerExists) {
          setSelectedSwapFromCoach(coachId);
          setSelectedSwapToCoach(''); // reset To coach
          return;
        }
      }
    } else if (!selectedSwapPlayer) {
      setSelectedSwapFromCoach('');
      setSelectedSwapToCoach('');
    }
  }, [selectedSwapPlayer, coachAssignments]);

  const handleAssign = async () => {
    if (selectedPlayer && selectedCoach) {
      setIsAssigning(true);
      setAssignmentError(null);
      const result = await assignPlayerToCoach(selectedPlayer, selectedCoach);
      if (result.success) {
        const playerName = players.find(p => p.playerId === selectedPlayer)?.name;
        const coachName = coaches.find(c => c.coachId === selectedCoach)?.name;
        setAssignmentSuccess({
          player: playerName,
          coach: coachName
        });
        setToast({
          type: 'success',
          message: `Player assigned successfully to ${coachName}`
        });
        setSelectedPlayer('');
        setSelectedCoach('');
        await fetchAllAssignments(); // update assignments in UI
        setTimeout(() => {
          setAssignmentSuccess(null);
          setToast(null);
        }, 3000);
      } else {
        setAssignmentError(result.error || 'Failed to assign player');
        setToast({
          type: 'error',
          message: result.error || 'Failed to assign player'
        });
        setTimeout(() => {
          setAssignmentError(null);
          setToast(null);
        }, 3000);
      }
      setIsAssigning(false);
    }
  };

  const handleRemovePlayer = async (playerId, fromCoachId) => {
    setRemovingPlayerId(playerId);
    setAssignmentError(null);
    const result = await removePlayerFromCoach({ playerId, fromCoachId });
    if (result.success) {
      const playerName = players.find(p => p.playerId === playerId)?.name;
      const coachName = coaches.find(c => c.coachId === fromCoachId)?.name;
      setAssignmentSuccess({ 
        player: playerName, 
        coach: coachName, 
        action: 'removed' 
      });
      setToast({
        type: 'success',
        message: `Player unassigned successfully from ${coachName}`
      });
      await fetchAllAssignments(); // update assignments in UI
      setTimeout(() => {
        setAssignmentSuccess(null);
        setToast(null);
      }, 3000);
    } else {
      setAssignmentError(result.error || 'Failed to remove player');
      setToast({
        type: 'error',
        message: result.error || 'Failed to remove player'
      });
      setTimeout(() => {
        setAssignmentError(null);
        setToast(null);
      }, 3000);
    }
    setRemovingPlayerId(null);
  };

  const handleSwapPlayer = async () => {
    if (selectedSwapPlayer && selectedSwapFromCoach && selectedSwapToCoach) {
      setIsSwapping(true);
      setAssignmentError(null);
      const result = await swapPlayerBetweenCoaches(selectedSwapPlayer, selectedSwapFromCoach, selectedSwapToCoach);
      if (result.success) {
        const fromCoachName = coaches.find(c => c.coachId === selectedSwapFromCoach)?.name;
        const toCoachName = coaches.find(c => c.coachId === selectedSwapToCoach)?.name;
        setToast({
          type: 'success',
          message: `Player swapped from ${fromCoachName} to ${toCoachName}`
        });
        setSelectedSwapPlayer('');
        setSelectedSwapFromCoach('');
        setSelectedSwapToCoach('');
        await fetchAllAssignments(); // update assignments in UI
        setTimeout(() => {
          setToast(null);
        }, 3000);
      } else {
        setAssignmentError(result.error || 'Failed to swap player');
        setToast({
          type: 'error',
          message: result.error || 'Failed to swap player'
        });
        setTimeout(() => {
          setAssignmentError(null);
          setToast(null);
        }, 3000);
      }
      setIsSwapping(false);
    }
  };
  
  // Use API assignments
  const assignments = coaches.map((coach) => ({
    coach,
    assignedData: coachAssignments[coach.coachId] || [],
  }));

  const filteredAssignments = assignments
    .filter(a => {
      const matchesCoachFilter = filterCoach === 'all' || a.coach.coachId === filterCoach;
      const matchesSearch = a.assignedData.some(item => {
        const playerName = (item.player?.playerName || item.player?.name || '').toLowerCase();
        return playerName.includes(searchTerm.toLowerCase());
      });
      return matchesCoachFilter && (searchTerm === '' || matchesSearch);
    });

  const stats = {
    totalPlayers: players.length,
    assignedPlayers: Object.keys(assignedPlayersData).length,
    unassignedPlayers: players.length - Object.keys(assignedPlayersData).length,
    totalAssignments: Object.values(coachAssignments).reduce((sum, a) => sum + a.length, 0),
  };

  // Show all players in dropdown (including assigned ones for re-assignment)
  const availablePlayers = players;

  if (isPageLoading) {
    return (
      <Layout>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
          {/* Header Skeleton */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(6, 0, 48, 0.4) 0%, rgba(0, 0, 0, 0.4) 100%)',
            padding: '40px 32px',
            borderRadius: '12px',
            border: '1px solid rgba(226, 232, 240, 0.3)',
            marginBottom: '32px'
          }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                width: '320px',
                height: '32px',
                background: 'rgba(200, 200, 200, 0.3)',
                borderRadius: '6px',
                marginBottom: '12px',
                animation: 'pulse 2s ease-in-out infinite'
              }} />
              <div style={{
                width: '280px',
                height: '16px',
                background: 'rgba(200, 200, 200, 0.3)',
                borderRadius: '6px',
                animation: 'pulse 2s ease-in-out infinite 0.1s'
              }} />
            </div>

            {/* Stats Grid Skeleton */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{
                  background: 'rgba(248, 250, 252, 0.5)',
                  padding: '16px',
                  borderRadius: '8px',
                  animation: `pulse 2s ease-in-out infinite ${i * 0.1}s`
                }}>
                  <div style={{
                    width: '50%',
                    height: '14px',
                    background: 'rgba(200, 200, 200, 0.3)',
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }} />
                  <div style={{
                    width: '40%',
                    height: '24px',
                    background: 'rgba(200, 200, 200, 0.3)',
                    borderRadius: '4px'
                  }} />
                </div>
              ))}
            </div>
          </div>

          {/* Two Column Layout Skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '32px', marginBottom: '32px' }}>
            {/* Sidebar Forms Skeleton */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{
                  backgroundColor: 'white',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '24px',
                  animation: `pulse 2s ease-in-out infinite ${i * 0.1}s`
                }}>
                  <div style={{
                    width: '140px',
                    height: '18px',
                    background: 'rgba(200, 200, 200, 0.3)',
                    borderRadius: '4px',
                    marginBottom: '16px'
                  }} />
                  {[1, 2].map((j) => (
                    <div key={j} style={{ marginBottom: '12px' }}>
                      <div style={{
                        width: '80%',
                        height: '14px',
                        background: 'rgba(200, 200, 200, 0.3)',
                        borderRadius: '4px',
                        marginBottom: '8px'
                      }} />
                      <div style={{
                        width: '100%',
                        height: '36px',
                        background: 'rgba(200, 200, 200, 0.3)',
                        borderRadius: '4px'
                      }} />
                    </div>
                  ))}
                  <div style={{
                    width: '100%',
                    height: '36px',
                    background: 'rgba(200, 200, 200, 0.3)',
                    borderRadius: '4px',
                    marginTop: '12px'
                  }} />
                </div>
              ))}
            </div>

            {/* Main Content Skeleton */}
            <div>
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px'
              }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{
                    width: '200px',
                    height: '36px',
                    background: 'rgba(200, 200, 200, 0.3)',
                    borderRadius: '6px',
                    animation: `pulse 2s ease-in-out infinite ${i * 0.1}s`
                  }} />
                ))}
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '24px' }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    paddingBottom: '16px',
                    marginBottom: '16px',
                    borderBottom: i < 5 ? '1px solid #F1F5F9' : 'none',
                    animation: `pulse 2s ease-in-out infinite ${i * 0.1}s`
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'rgba(200, 200, 200, 0.3)',
                      borderRadius: '50%',
                      marginRight: '16px'
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        width: '60%',
                        height: '16px',
                        background: 'rgba(200, 200, 200, 0.3)',
                        borderRadius: '4px',
                        marginBottom: '8px'
                      }} />
                      <div style={{
                        width: '40%',
                        height: '14px',
                        background: 'rgba(200, 200, 200, 0.3)',
                        borderRadius: '4px'
                      }} />
                    </div>
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

  return (
    <Layout>
      {toast && <Toast type={toast.type} message={toast.message} />}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
        {/* Header with Stats */}
        <div style={{
          background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
          backdropFilter: 'blur(20px)',
          color: 'white',
          padding: '40px 32px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 8px 32px rgba(37, 44, 53, 0.15)',
          marginBottom: '32px'
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 4px 0' }}>Player Assignments</h1>
              <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>Manage coach-player relationships</p>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Players</p>
                <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{stats.totalPlayers}</p>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned</p>
                <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{stats.assignedPlayers}</p>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unassigned</p>
                <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{stats.unassignedPlayers}</p>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Assignments</p>
                <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{stats.totalAssignments}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ padding: '0 32px', maxWidth: '1400px', margin: '0 auto' }}>

        {/* Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '32px', marginBottom: '32px' }}>
          {/* Sidebar - Forms */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Assign Form */}
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '24px',
              opacity: isLoading ? 0.6 : 1
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 18px 0' }}>Assign Player</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                    Player *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      className="assign-select"
                      disabled={isLoading}
                      value={selectedPlayer}
                      onChange={(e) => setSelectedPlayer(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        paddingRight: '36px',
                        border: '2px solid #E2E8F0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s',
                        fontWeight: '500',
                        color: selectedPlayer ? '#111827' : '#999',
                        appearance: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#060030ff';
                        e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#E2E8F0';
                        e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                      }}
                    >
                      {isLoading ? (
                        <option>Loading...</option>
                      ) : (
                        <>
                          <option value="">Choose player...</option>
                          {availablePlayers.map((p) => (
                            <option key={p.playerId} value={p.playerId}>
                              {p.name || p.playerName}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    <ChevronDown size={18} style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: '#111827'
                    }} />
                  </div>
                  {availablePlayers.length === 0 && !isLoading && (
                    <p style={{ fontSize: '12px', color: '#ff0000ff', margin: '6px 0 0 6px', fontStyle: 'italic' }}>
                      No players available
                    </p>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                    Coach *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      className="assign-select"
                      disabled={isLoading}
                      value={selectedCoach}
                      onChange={(e) => setSelectedCoach(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        paddingRight: '36px',
                        border: '2px solid #E2E8F0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s',
                        fontWeight: '500',
                        color: selectedCoach ? '#111827' : '#999',
                        appearance: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#060030ff';
                        e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#E2E8F0';
                        e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                      }}
                    >
                      {isLoading ? (
                        <option>Loading...</option>
                      ) : (
                        <>
                          <option value="">Choose coach...</option>
                          {coaches.map((c) => (
                            <option key={c.coachId || c._id} value={c.coachId || c._id}>
                              {c.name} {c.specialization ? `(${c.specialization})` : ''}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    <ChevronDown size={18} style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: '#111827'
                    }} />
                  </div>
                </div>

                <button
                  onClick={handleAssign}
                  disabled={!selectedPlayer || !selectedCoach || isAssigning || isLoading}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '14px',
                    background: (selectedPlayer && selectedCoach && !isAssigning && !isLoading) ? '#060030ff' : '#E5E7EB',
                    color: (selectedPlayer && selectedCoach && !isAssigning && !isLoading) ? 'white' : '#999',
                    border: 'none',
                    cursor: (selectedPlayer && selectedCoach && !isAssigning && !isLoading) ? 'pointer' : 'not-allowed'
                  }}
                >
                  {isAssigning ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>

            {/* Swap Form */}
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '24px',
              opacity: isLoading ? 0.6 : 1
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 18px 0' }}>Swap Player</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                    Player *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      className="assign-select"
                      disabled={isLoading}
                      value={selectedSwapPlayer}
                      onChange={(e) => setSelectedSwapPlayer(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        paddingRight: '36px',
                        border: '2px solid #E2E8F0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s',
                        fontWeight: '500',
                        color: selectedSwapPlayer ? '#111827' : '#999',
                        appearance: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#060030ff';
                        e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#E2E8F0';
                        e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                      }}
                    >
                      {isLoading ? (
                        <option>Loading...</option>
                      ) : (
                        <>
                          <option value="">Choose player</option>
                          {Object.values(assignedPlayersData).map((item) => {
                            const playerId = item.player?._id || item.player?.playerId;
                            const playerName = item.player?.playerName || item.player?.name || 'Unknown';
                            return (
                              <option key={playerId} value={playerId}>
                                {playerName}
                              </option>
                            );
                          })}
                        </>
                      )}
                    </select>
                    <ChevronDown size={18} style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: '#111827'
                    }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                    From *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      className="assign-select"
                      disabled={isLoading}
                      value={selectedSwapFromCoach}
                      onChange={(e) => setSelectedSwapFromCoach(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        paddingRight: '36px',
                        border: '2px solid #E2E8F0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s',
                        fontWeight: '500',
                        color: selectedSwapFromCoach ? '#111827' : '#999',
                        appearance: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#060030ff';
                        e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#E2E8F0';
                        e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                      }}
                    >
                      {isLoading ? (
                        <option>Loading...</option>
                      ) : (
                        <>
                          <option value="">Choose coach</option>
                          {coaches.map((c) => (
                            <option key={c.coachId || c._id} value={c.coachId || c._id}>
                              {c.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    <ChevronDown size={18} style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: '#111827'
                    }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                    To *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      className="assign-select"
                      disabled={isLoading}
                      value={selectedSwapToCoach}
                      onChange={(e) => setSelectedSwapToCoach(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        paddingRight: '36px',
                        border: '2px solid #E2E8F0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s',
                        fontWeight: '500',
                        color: selectedSwapToCoach ? '#111827' : '#999',
                        appearance: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#060030ff';
                        e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#E2E8F0';
                        e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                      }}
                    >
                      {isLoading ? (
                        <option>Loading...</option>
                      ) : (
                        <>
                          <option value="">Choose coach</option>
                          {coaches.filter(c => (c.coachId || c._id) !== selectedSwapFromCoach).map((c) => (
                            <option key={c.coachId || c._id} value={c.coachId || c._id}>
                              {c.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    <ChevronDown size={18} style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: '#111827'
                    }} />
                  </div>
                </div>

                <button
                  onClick={handleSwapPlayer}
                  disabled={!selectedSwapPlayer || !selectedSwapFromCoach || !selectedSwapToCoach || isSwapping || isLoading}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '14px',
                    background: (selectedSwapPlayer && selectedSwapFromCoach && selectedSwapToCoach && !isSwapping && !isLoading) ? '#060030ff' : '#E5E7EB',
                    color: (selectedSwapPlayer && selectedSwapFromCoach && selectedSwapToCoach && !isSwapping && !isLoading) ? 'white' : '#999',
                    border: 'none',
                    cursor: (selectedSwapPlayer && selectedSwapFromCoach && selectedSwapToCoach && !isSwapping && !isLoading) ? 'pointer' : 'not-allowed'
                  }}
                >
                  {isSwapping ? 'Swapping...' : 'Swap'}
                </button>
              </div>
            </div>
          </div>

          {/* Main - Assignments List */}
          <div>
            {/* Search & Filter */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '6px',
              }}>
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                  width: '100%',
                  padding: '12px 10px 12px 40px',
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
              <div style={{ position: 'relative' }}>
                <select
                  className="assign-select"
                  value={filterCoach}
                  onChange={(e) => setFilterCoach(e.target.value)}
                  style={{
                    padding: '15px 12px 15px 12px',
                    paddingRight: '36px',
                    borderRadius: '6px',
                    border: '2px solid #E2E8F0',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    minWidth: '160px',
                    fontWeight: '500',
                    color: filterCoach ? '#111827' : '#999',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s',
                    appearance: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#060030ff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E8F0';
                    e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  <option value="all">All Coaches</option>
                  {coaches.map(c => (
                    <option key={c.coachId} value={c.coachId}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown size={18} style={{
                  position: 'absolute',
                  right: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#111827'
                }} />
              </div>
            </div>

            {/* Assignments - Detailed View */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {filteredAssignments.length > 0 ? (
                filteredAssignments.map((assignment) => (
                  <div key={assignment.coach.coachId}>
                    {/* Coach Section Header */}
                    <div style={{
                      background: 'linear-gradient(135deg, #060030ff 0%, #1a0055 100%)',
                      color: 'white',
                      padding: '16px 20px',
                      borderRadius: '8px 8px 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '-1px'
                    }}>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>
                          {assignment.coach.name}
                        </h3>
                        <p style={{ fontSize: '12px', opacity: 0.85, margin: '4px 0 0 0' }}>
                          {assignment.coach.specialization || 'Coach'}
                        </p>
                      </div>
                      <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '700'
                      }}>
                        {assignment.assignedData.length} player{assignment.assignedData.length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Assigned Players Cards */}
                    {assignment.assignedData.length > 0 ? (
                      <div style={{
                        backgroundColor: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '0 0 8px 8px',
                        padding: '16px',
                        borderTop: 'none'
                      }}>
                        <div style={{ display: 'grid', gap: '16px' }}>
                          {assignment.assignedData.map((item) => {
                            const player = item.player;
                            const playerId = player?._id || player?.playerId;
                            const playerName = player?.playerName || player?.name || 'Unknown Player';

                            return (
                              <div
                                key={`${assignment.coach.coachId}-${playerId}`}
                                style={{
                                  backgroundColor: '#F9FAFB',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: '8px',
                                  overflow: 'hidden'
                                }}
                              >
                                {/* Player Header */}
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '12px 16px',
                                  backgroundColor: '#F3F4F6',
                                  borderBottom: 'none'
                                }}>
                                  <div style={{ flex: 1 }}>
                                    <h4 style={{
                                      fontSize: '14px',
                                      fontWeight: '600',
                                      margin: 0,
                                      color: '#111827'
                                    }}>
                                      {playerName}
                                    </h4>
                                  </div>

                                  {/* Remove Button */}
                                  <button
                                    onClick={() => handleRemovePlayer(playerId, assignment.coach.coachId)}
                                    disabled={removingPlayerId === playerId}
                                    style={{
                                      padding: '4px 8px',
                                      backgroundColor: '#fee2e2',
                                      border: '1px solid #fecaca',
                                      borderRadius: '4px',
                                      color: '#dc2626',
                                      cursor: 'pointer',
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    {removingPlayerId === playerId ? '...' : (
                                      <>
                                        <X size={14} />
                                        Remove
                                      </>
                                    )}
                                  </button>
                                </div>

                                {/* Remove the sections below - no sessions, no points, no other details */}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        backgroundColor: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '0 0 8px 8px',
                        padding: '24px',
                        textAlign: 'center',
                        color: '#999',
                        fontSize: '13px'
                      }}>
                        No players assigned to this coach
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '48px 20px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0'
                }}>
                  <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.2, color: '#999' }} />
                  <p style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>No assignments</p>
                  <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>
                    {searchTerm || filterCoach !== 'all' ? 'No results for current filters' : 'No player assignments yet'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </Layout>
  );
};

export default AssignPlayers;


