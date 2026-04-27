import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { ProgressBar } from '../../components/ProgressBar';
import { Button } from '../../components/Button';
import { Table } from '../../components/Table';
import { User, Mail, Award, TrendingUp, MessageSquare, FileText, Download, Star, BookOpen, ArrowLeft, ChevronRight, Calendar, Zap, Target, Loader, Clock, CheckCircle } from 'lucide-react';

const PlayerDetail = () => {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, fetchAssignedPlayersForCoach, userToken } = useStore();
  const [player, setPlayer] = useState(null);
  const [sessionCardIds, setSessionCardIds] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Convert progress string to percentage
  const convertProgressToPercentage = (progress) => {
    if (typeof progress === 'number') return progress;
    if (progress === 'Not Started') return 0;
    if (progress === 'In Progress') return 50;
    if (progress === 'Completed') return 100;
    return 0;
  };

  // Normalize status (handle variations: in_progress, in progress, inprogress)
  const normalizeStatus = (status) => {
    if (!status) return '';
    return status.toLowerCase().replace(/[\s_]/g, '');
  };

  const isInProgress = (status) => normalizeStatus(status) === 'inprogress';
  const isCompleted = (status) => normalizeStatus(status) === 'completed';

  // Fetch player details on mount
  useEffect(() => {
    const loadPlayerDetails = async () => {
      try {
        setIsLoading(true);
        
        // Check if player data is available from navigation state (from LeaderBoard)
        const navigationPlayer = location.state?.player;
        if (navigationPlayer) {
          // Use player data from navigation state
          const transformedPlayer = {
            playerId: navigationPlayer.id,
            name: navigationPlayer.name || navigationPlayer.playerName,
            fatherName: navigationPlayer.fatherName || 'N/A',
            motherName: navigationPlayer.motherName || 'N/A',
            phone: navigationPlayer.phone || '',
            alternativeNumber: navigationPlayer.alternativeNumber || '',
            dateOfBirth: navigationPlayer.dateOfBirth || '',
            bloodGroup: navigationPlayer.bloodGroup || 'N/A',
            address: navigationPlayer.address || '',
            age: navigationPlayer.age || '',
            stage: navigationPlayer.stage || '',
            LearningPathway: navigationPlayer.LearningPathway || 'N/A',
            progress: convertProgressToPercentage(navigationPlayer.progress),
            totalPoints: navigationPlayer.totalPoints || 0,
            totalPointsRedeemed: navigationPlayer.redeemed || 0,
            currentPoints: navigationPlayer.balance || 0,
            status: navigationPlayer.status || 'active',
            createdAt: navigationPlayer.createdAt || '',
            dateOfRegistration: navigationPlayer.dateOfRegistration || ''
          };
          setPlayer(transformedPlayer);
          // Set session card IDs if available
          if (navigationPlayer.sessionCardIds && Array.isArray(navigationPlayer.sessionCardIds)) {
            setSessionCardIds(navigationPlayer.sessionCardIds);
          }
          setIsLoading(false);
          return;
        }
        
        // If no navigation state, fetch from API
        const result = await fetchAssignedPlayersForCoach(currentUser.id);
        
        if (result.success && result.players) {
          // Find the specific player
          const playerItem = result.players.find(item => {
            const player = item.player || item;
            return (player._id || player.playerId) === playerId;
          });

          if (playerItem) {
            const playerData = playerItem.player || playerItem;
            const transformedPlayer = {
              playerId: playerData._id || playerData.playerId,
              name: playerData.playerName || playerData.name,
              fatherName: playerData.fatherName || 'N/A',
              motherName: playerData.motherName || 'N/A',
              phone: playerData.phone || '',
              alternativeNumber: playerData.alternativeNumber || '',
              dateOfBirth: playerData.dateOfBirth || '',
              bloodGroup: playerData.bloodGroup || 'N/A',
              address: playerData.address || '',
              age: playerData.age || '',
              stage: playerData.stage || '',
              LearningPathway: playerData.LearningPathway || 'N/A',
              progress: convertProgressToPercentage(playerData.progress),
              totalPoints: playerData.TotalPoints || 0,
              totalPointsRedeemed: playerData.TotalPointsRedeemed || 0,
              currentPoints: playerData.currentPoints || 0,
              status: playerData.status || 'active',
              createdAt: playerData.createdAt || '',
              dateOfRegistration: playerData.dateOfRegistration || ''
            };

            setPlayer(transformedPlayer);
            
            // Store session card IDs for fetching later
            if (playerItem.sessionCardIds && Array.isArray(playerItem.sessionCardIds)) {
              setSessionCardIds(playerItem.sessionCardIds);
            } else {
              setSessionCardIds([]);
            }
          } else {
            setPlayer(null);
            setSessionCardIds([]);
          }
        }
      } catch (error) {
        console.error('Error fetching player details:', error);
        setPlayer(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (playerId) {
      loadPlayerDetails();
    }
  }, [playerId, currentUser?.id, fetchAssignedPlayersForCoach, location.state?.player]);

  // Fetch session details when sessionCardIds change
  useEffect(() => {
    const fetchSessions = async () => {
      if (!sessionCardIds || sessionCardIds.length === 0) {
        setSessions([]);
        return;
      }

      try {
        setSessionsLoading(true);
        const token = userToken || localStorage.getItem('userToken');
        const fetchedSessions = [];

        // Fetch each session one by one
        for (const sessionCardId of sessionCardIds) {
          try {
            const response = await fetch(
              'https://kyfkhl8v4l.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_View_Sessioncard',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'userToken': token
                },
                body: JSON.stringify({ sessionCardId })
              }
            );

            if (response.ok) {
              const responseData = await response.json();
              // Extract sessionCard from the API response
              const sessionCard = responseData.sessionCard || responseData;
              fetchedSessions.push({
                _id: sessionCardId,
                ...sessionCard
              });
            } else {
              console.error(`Failed to fetch session ${sessionCardId}`);
            }
          } catch (error) {
            console.error(`Error fetching session ${sessionCardId}:`, error);
          }
        }

        setSessions(fetchedSessions);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setSessions([]);
      } finally {
        setSessionsLoading(false);
      }
    };

    fetchSessions();
  }, [sessionCardIds, userToken]);

  if (isLoading) {
    return (
      <Layout>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
          {/* Header Skeleton */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(6, 0, 48, 0.4) 0%, rgba(0, 0, 0, 0.4) 100%)',
            padding: '40px 32px',
            borderRadius: '12px',
            border: '1px solid rgba(226, 232, 240, 0.3)',
            marginBottom: '32px',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div style={{
                width: '100px',
                height: '100px',
                background: 'rgba(200, 200, 200, 0.3)',
                borderRadius: '50%'
              }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  width: '250px',
                  height: '28px',
                  background: 'rgba(200, 200, 200, 0.3)',
                  borderRadius: '6px',
                  marginBottom: '12px'
                }} />
                <div style={{
                  width: '300px',
                  height: '16px',
                  background: 'rgba(200, 200, 200, 0.3)',
                  borderRadius: '6px'
                }} />
              </div>
            </div>
          </div>

          {/* Stats Grid Skeleton */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px'
          }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{
                background: 'white',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #E2E8F0',
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

          {/* Sections Skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
            <div>
              {[1, 2].map((i) => (
                <div key={i} style={{
                  background: 'white',
                  borderRadius: '8px',
                  padding: '24px',
                  border: '1px solid #E2E8F0',
                  marginBottom: '24px',
                  animation: `pulse 2s ease-in-out infinite ${i * 0.15}s`
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
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        width: '40%',
                        height: '14px',
                        background: 'rgba(200, 200, 200, 0.3)',
                        borderRadius: '4px'
                      }} />
                      <div style={{
                        width: '35%',
                        height: '14px',
                        background: 'rgba(200, 200, 200, 0.3)',
                        borderRadius: '4px'
                      }} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #E2E8F0',
              animation: 'pulse 2s ease-in-out infinite 0.2s'
            }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{
                  paddingBottom: '12px',
                  marginBottom: '12px',
                  borderBottom: i < 3 ? '1px solid #F1F5F9' : 'none'
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

  if (!player) {
    return (
      <Layout>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(82, 102, 129, 0.1)',
              color: '#060030ff',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              marginBottom: '24px',
              transition: 'all 0.3s',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '48px 20px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <BookOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#CBD5E1' }} />
            <p style={{ fontSize: '16px', color: '#64748B', margin: '0' }}>Player not found.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* Back Button & Header */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(82, 102, 129, 0.1)',
            color: '#060030ff',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '24px',
            transition: 'all 0.3s',
            fontSize: '14px',
            fontWeight: '500'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(82, 102, 129, 0.2)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(82, 102, 129, 0.1)'}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Gradient Header with player Info */}
        <div style={{
          background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
          borderRadius: '12px',
          padding: '32px',
          color: 'white',
          marginBottom: '32px',
          boxShadow: '0 4px 15px rgba(37, 44, 53, 0.1)',
          display: 'grid',
          gridTemplateColumns: '1fr 3fr',
          alignItems: 'center',
          gap: '32px'
        }}
        data-aos="fade-up"
        data-aos-duration="800">
          {/* Left - Avatar & Name */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '700',
              fontSize: '40px'
            }}>
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>
                {player.name}
              </h1>
              <span style={{ fontSize: '14px', opacity: 0.9 }}>{player.phone}</span>
            </div>
          </div>

          {/* Right - Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px'
          }}>
            {/* Age */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '16px',
              backdropFilter: 'blur(10px)'
            }}>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 8px 0', textTransform: 'uppercase', fontWeight: '600' }}>Age</p>
              <p style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>{player.age} yrs</p>
            </div>

            {/* Learning Pathway */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '16px',
              backdropFilter: 'blur(10px)'
            }}>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 8px 0', textTransform: 'uppercase', fontWeight: '600' }}>Learning Pathway</p>
              <p style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>{player.LearningPathway}</p>
            </div>

            {/* Total Points */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '16px',
              backdropFilter: 'blur(10px)'
            }}>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 8px 0', textTransform: 'uppercase', fontWeight: '600' }}>Total Points</p>
              <p style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>{player.totalPoints}</p>
            </div>

            {/* Points Redeemed */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '16px',
              backdropFilter: 'blur(10px)'
            }}>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 8px 0', textTransform: 'uppercase', fontWeight: '600' }}>Points Redeemed</p>
              <p style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>{player.totalPointsRedeemed}</p>
            </div>
          </div>
        </div>

        

        
        {/* Personal Information Section - Enhanced */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '4px', height: '28px', background: 'linear-gradient(180deg, #060030ff, #252c35)', borderRadius: '2px' }}></div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>
              Personal Information
            </h3>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {/* Father Name */}
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <User size={16} color="#064E3B" />
                <label style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Father's Name</label>
              </div>
              <p style={{ fontSize: '15px', color: '#111827', fontWeight: '600', margin: 0 }}>
                {player.fatherName}
              </p>
            </div>

            {/* Mother Name */}
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <User size={16} color="#7C2D12" />
                <label style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Mother's Name</label>
              </div>
              <p style={{ fontSize: '15px', color: '#111827', fontWeight: '600', margin: 0 }}>
                {player.motherName}
              </p>
            </div>

            {/* Date of Birth */}
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Calendar size={16} color="#7F1D1D" />
                <label style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Date of Birth</label>
              </div>
              <p style={{ fontSize: '15px', color: '#111827', fontWeight: '600', margin: 0 }}>
                {player.dateOfBirth ? new Date(player.dateOfBirth).toLocaleDateString() : 'N/A'}
              </p>
            </div>

            

            {/* Primary Phone */}
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Mail size={16} color="#059669" />
                <label style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Primary Phone</label>
              </div>
              <p style={{ fontSize: '15px', color: '#111827', fontWeight: '600', margin: 0 }}>
                {player.phone}
              </p>
            </div>

            {/* Alternative Number */}
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Mail size={16} color="#7C3AED" />
                <label style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Alternative Number</label>
              </div>
              <p style={{ fontSize: '15px', color: '#111827', fontWeight: '600', margin: 0 }}>
                {player.alternativeNumber || 'N/A'}
              </p>
            </div>

            {/* Registration Date */}
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Calendar size={16} color="#0891B2" />
                <label style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Registration Date</label>
              </div>
              <p style={{ fontSize: '15px', color: '#111827', fontWeight: '600', margin: 0 }}>
                {player.dateOfRegistration ? new Date(player.dateOfRegistration).toLocaleDateString() : 'N/A'}
              </p>
            </div>

            {/* Status Badge */}
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}>
              <label style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Status</label>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                background: player.status === 'active' ? '#D1FAE5' : '#FEE2E2',
                color: player.status === 'active' ? '#065F46' : '#991B1B',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                textTransform: 'capitalize',
                width: 'fit-content'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  background: player.status === 'active' ? '#10B981' : '#EF4444',
                  borderRadius: '50%'
                }}></div>
                {player.status}
              </span>
            </div>

            {/* Address */}
            <div style={{ gridColumn: 'span 2',
              padding: '16px',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <FileText size={16} color="#0369A1" />
                <label style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Address</label>
              </div>
              <p style={{ fontSize: '15px', color: '#111827', fontWeight: '600', margin: 0 }}>
                {player.address || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Player Sessions Section - Enhanced */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '4px', height: '28px', background: 'linear-gradient(180deg, #3B82F6, #1D4ED8)', borderRadius: '2px' }}></div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>
                Player Sessions
              </h3>
            </div>
            <span style={{
              padding: '6px 14px',
              background: '#E0E7FF',
              color: '#3B82F6',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '700'
            }}>
              {sessions.length} Total
            </span>
          </div>

          {sessionsLoading ? (
            <div style={{ textAlign: 'center', padding: '48px 32px' }}>
              <Loader size={40} style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite', color: '#6B7280' }} />
              <p style={{ color: '#64748B', fontSize: '14px', fontWeight: '500' }}>Loading sessions...</p>
            </div>
          ) : sessions.length > 0 ? (
            <div>
              {/* In Progress Sessions */}
              {sessions.filter(s => isInProgress(s.status)).length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    paddingBottom: '16px',
                    borderBottom: '2px solid #6B7280',
                    marginBottom: '24px'
                  }}>
                    <Zap size={20} color="#6B7280" />
                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0 }}>
                      In Progress Sessions
                    </h4>
                    <span style={{
                      marginLeft: 'auto',
                      padding: '4px 12px',
                      background: '#F3F4F6',
                      color: '#6B7280',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}>
                      {sessions.filter(s => isInProgress(s.status)).length}
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '20px'
                  }}>
                    {sessions.filter(s => isInProgress(s.status)).map((session) => (
                      <div
                        key={session._id}
                        style={{
                          background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
                          border: '2px solid #E5E7EB',
                          borderRadius: '12px',
                          padding: '18px',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 12px 28px rgba(107, 114, 128, 0.15)';
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.borderColor = '#6B7280';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = '#E5E7EB';
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          width: '80px',
                          height: '80px',
                          background: 'radial-gradient(circle, rgba(107, 114, 128, 0.1) 0%, transparent 70%)',
                          borderRadius: '50%',
                          pointerEvents: 'none'
                        }}></div>
                        
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                          <div style={{
                            padding: '8px',
                            background: 'white',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Zap size={18} color="#6B7280" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <h5 style={{ fontSize: '14px', fontWeight: '700', color: '#111827', margin: 0 }}>
                              {session.Topic || 'Untitled Session'}
                            </h5>
                            <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0 0' }}>
                              {session.LearningPathway || 'No pathway assigned'}
                            </p>
                          </div>
                        </div>

                        <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5', margin: '0 0 14px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {session.Description || `Session ${session.session || 'N/A'}`}
                        </p>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                          <span style={{
                            padding: '5px 11px',
                            background: '#F3F4F6',
                            color: '#6B7280',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'capitalize'
                          }}>
                            In Progress
                          </span>

                          <span style={{
                            padding: '5px 11px',
                            background: '#FEF3C7',
                            color: '#92400E',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700'
                          }}>
                            {session.SessionType || 'Primary'}
                          </span>

                          {session.totalPoints && (
                            <span style={{
                              padding: '5px 11px',
                              background: '#F3F4F6',
                              color: '#6B7280',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '700',
                              marginLeft: 'auto',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Zap size={12} />
                              {session.totalPoints} pts
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => navigate(`/coach/session/${session._id}`, { state: { session, player } })}
                          style={{
                            width: '100%',
                            background: '#111827',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#374151';
                            e.currentTarget.style.transform = 'scale(1.02)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#111827';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          Continue Session
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Sessions */}
              {sessions.filter(s => !isCompleted(s.status) && !isInProgress(s.status)).length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    paddingBottom: '16px',
                    borderBottom: '2px solid #6B7280',
                    marginBottom: '24px'
                  }}>
                    <Clock size={20} color="#6B7280" />
                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0 }}>
                      Upcoming Sessions
                    </h4>
                    <span style={{
                      marginLeft: 'auto',
                      padding: '4px 12px',
                      background: '#F3F4F6',
                      color: '#6B7280',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}>
                      {sessions.filter(s => !isCompleted(s.status) && !isInProgress(s.status)).length}
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '20px'
                  }}>
                    {sessions.filter(s => !isCompleted(s.status) && !isInProgress(s.status)).map((session) => (
                      <div
                        key={session._id}
                        style={{
                          background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
                          border: '2px solid #E5E7EB',
                          borderRadius: '12px',
                          padding: '18px',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 12px 28px rgba(107, 114, 128, 0.15)';
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.borderColor = '#6B7280';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = '#E5E7EB';
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          width: '80px',
                          height: '80px',
                          background: 'radial-gradient(circle, rgba(107, 114, 128, 0.1) 0%, transparent 70%)',
                          borderRadius: '50%',
                          pointerEvents: 'none'
                        }}></div>
                        
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                          <div style={{
                            padding: '8px',
                            background: 'white',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Clock size={18} color="#6B7280" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <h5 style={{ fontSize: '14px', fontWeight: '700', color: '#111827', margin: 0 }}>
                              {session.Topic || 'Untitled Session'}
                            </h5>
                            <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0 0' }}>
                              {session.LearningPathway || 'No pathway assigned'}
                            </p>
                          </div>
                        </div>

                        <p style={{ fontSize: '13px', color: '#064E3B', lineHeight: '1.5', margin: '0 0 14px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {session.Description || `Session ${session.session || 'N/A'}`}
                        </p>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                          <span style={{
                            padding: '5px 11px',
                            background: '#F3F4F6',
                            color: '#6B7280',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'capitalize'
                          }}>
                            {session.status === 'in_progress' ? 'In Progress' : 'Upcoming'}
                          </span>

                          <span style={{
                            padding: '5px 11px',
                            background: '#FEF3C7',
                            color: '#92400E',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700'
                          }}>
                            {session.SessionType || 'Primary'}
                          </span>

                          <span style={{
                            padding: '5px 11px',
                            background: '#F0FDF4',
                            color: '#166534',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            marginLeft: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Zap size={12} />
                            {session.totalPoints || 0}
                          </span>
                        </div>

                        <button
                          onClick={() => navigate(`/coach/session/${session._id}`, { state: { session, player } })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: '#111827',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#374151';
                            e.currentTarget.style.transform = 'scale(1.02)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#111827';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          View Details
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Sessions */}
              {sessions.filter(s => isCompleted(s.status)).length > 0 && (
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    paddingBottom: '16px',
                    borderBottom: '2px solid #6B7280',
                    marginBottom: '24px'
                  }}>
                    <CheckCircle size={20} color="#6B7280" />
                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0 }}>
                      Completed Sessions
                    </h4>
                    <span style={{
                      marginLeft: 'auto',
                      padding: '4px 12px',
                      background: '#F3F4F6',
                      color: '#6B7280',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}>
                      {sessions.filter(s => isCompleted(s.status)).length}
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '20px'
                  }}>
                    {sessions.filter(s => isCompleted(s.status)).map((session) => (
                      <div
                        key={session._id}
                        style={{
                          background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
                          border: '2px solid #E5E7EB',
                          borderRadius: '12px',
                          padding: '18px',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 12px 28px rgba(107, 114, 128, 0.15)';
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.borderColor = '#6B7280';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = '#E5E7EB';
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          width: '80px',
                          height: '80px',
                          background: 'radial-gradient(circle, rgba(107, 114, 128, 0.1) 0%, transparent 70%)',
                          borderRadius: '50%',
                          pointerEvents: 'none'
                        }}></div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                          <div style={{
                            padding: '8px',
                            background: 'white',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <CheckCircle size={18} color="#6B7280" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <h5 style={{ fontSize: '14px', fontWeight: '700', color: '#111827', margin: 0 }}>
                              {session.Topic || 'Untitled Session'}
                            </h5>
                            <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0 0' }}>
                              {session.LearningPathway || 'No pathway assigned'}
                            </p>
                          </div>
                        </div>

                        <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5', margin: '0 0 14px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {session.Description || `Session ${session.session || 'N/A'}`}
                        </p>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                          <span style={{
                            padding: '5px 11px',
                            background: '#F3F4F6',
                            color: '#6B7280',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700'
                          }}>
                            Completed
                          </span>

                          <span style={{
                            padding: '5px 11px',
                            background: '#FEF3C7',
                            color: '#92400E',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700'
                          }}>
                            {session.SessionType || 'Primary'}
                          </span>

                          <span style={{
                            padding: '5px 11px',
                            background: '#F3F4F6',
                            color: '#6B7280',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            marginLeft: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Zap size={12} />
                            {session.totalPoints || 0}
                          </span>
                        </div>

                        <button
                          onClick={() => navigate(`/coach/view-completed-session/${session._id}`, { state: { session, player } })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: '#111827',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#374151';
                            e.currentTarget.style.transform = 'scale(1.02)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#111827';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          View Details
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '48px 32px',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
              borderRadius: '10px',
              border: '2px dashed #E2E8F0'
            }}>
              <BookOpen size={40} style={{ margin: '0 auto 16px', opacity: 0.4, color: '#CBD5E1' }} />
              <p style={{ color: '#64748B', fontSize: '15px', margin: 0, fontWeight: '500' }}>No sessions assigned yet</p>
              <p style={{ color: '#94A3B8', fontSize: '13px', margin: '8px 0 0 0' }}>Sessions will appear here once they are created</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PlayerDetail;

