import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/store';
import { useTheme } from '../../context/ThemeContext';
import { Layout } from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import { User, Mail, Award, TrendingUp, FileText, BookOpen, ArrowLeft, ChevronRight, Calendar, Zap, Loader, Clock, CheckCircle, Sparkles, CalendarCheck, Eye, Edit3 } from 'lucide-react';

const normSt = (s) => (s || '').toLowerCase().replace(/[\s_]/g, '');
const statusColors = (status) => {
  const s = normSt(status);
  if (s === 'completed') return { bg: '#DCFCE7', text: '#16A34A' };
  if (s === 'inprogress') return { bg: '#E0E7FF', text: '#4F46E5' };
  if (['pending', 'notcompleted', 'absent', 'excused'].includes(s)) return { bg: '#FEF3C7', text: '#D97706' };
  return { bg: '#EFF6FF', text: '#2563EB' }; // upcoming / draft
};

// Compact session card - same look as the Session Card "By Batch" workspace.
const SessionMiniCard = ({ session, dark, onView, onEdit }) => {
  const [hov, setHov] = useState(false);
  const sc = statusColors(session.status);
  const border = dark ? 'var(--cl-border)' : '#E5E7EB';
  const textPrimary = dark ? 'var(--cl-text)' : '#111827';
  const textMuted = dark ? 'var(--cl-text-3)' : '#94A3B8';
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ borderRadius: '12px', border: `1px solid ${hov ? sc.text + '55' : border}`, background: dark ? 'rgba(255,255,255,0.03)' : '#fff', overflow: 'hidden', boxShadow: hov ? `0 8px 20px ${sc.text}22` : '0 1px 4px rgba(0,0,0,0.05)', transition: 'all .2s', transform: hov ? 'translateY(-3px)' : 'none' }}
    >
      <div style={{ height: '4px', background: sc.text }} />
      <div style={{ padding: '13px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginBottom: '7px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#4F46E5' }}>Session {session.session ?? '-'}</span>
          <span style={{ fontSize: '9.5px', fontWeight: '700', padding: '3px 9px', borderRadius: '20px', background: sc.bg, color: sc.text, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{session.status || 'Draft'}</span>
        </div>
        <p style={{ fontSize: '13.5px', fontWeight: '700', color: textPrimary, margin: '0 0 4px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{session.Topic || 'Untitled Session'}</p>
        <p style={{ fontSize: '11px', color: textMuted, margin: '0 0 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.LearningPathway || 'No pathway'}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '11px' }}>
          <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 9px', borderRadius: '6px', background: dark ? 'rgba(16,185,129,0.12)' : '#F0FDF4', color: '#16A34A', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Zap size={11} />{session.totalPoints || 0}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={onView} style={{ flex: 1, padding: '7px 8px', background: dark ? 'rgba(99,102,241,0.15)' : '#EEF2FF', color: '#4F46E5', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}><Eye size={13} /> View</button>
          {onEdit && (
            <button onClick={onEdit} style={{ flex: 1, padding: '7px 8px', background: dark ? 'rgba(245,158,11,0.15)' : '#FEF3C7', color: dark ? '#FBBF24' : '#92400E', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}><Edit3 size={13} /> Edit</button>
          )}
        </div>
      </div>
    </div>
  );
};

const GENERATE_CARD_URL = 'https://7mbaul8uz9.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_Session_Card_Generating';
const GET_ALL_PLAYERS_URL = 'https://jrrnyyf9r9.execute-api.ap-south-1.amazonaws.com/default/CL_Get_All_Players';
const GET_ATTENDANCE_URL = 'https://expqdxymlf.execute-api.ap-south-1.amazonaws.com/default/CL_Get_Attendance';

const ATT_STATUS_STYLE = {
  Present: { bg: '#DCFCE7', color: '#16A34A' },
  Absent:  { bg: '#FEE2E2', color: '#DC2626' },
  Late:    { bg: '#FEF3C7', color: '#D97706' },
  Excused: { bg: '#EDE9FE', color: '#7C3AED' },
};

const PALETTES = [
  ['#6366F1','#818CF8'], ['#10B981','#34D399'], ['#F59E0B','#FBBF24'],
  ['#EC4899','#F472B6'], ['#3B82F6','#60A5FA'], ['#8B5CF6','#A78BFA'],
  ['#EF4444','#F87171'], ['#06B6D4','#22D3EE'],
];
const pal = (name = '') => PALETTES[(name.charCodeAt(0) || 0) % PALETTES.length];

const Sk = ({ w, h, r = 8 }) => (
  <div style={{ width:w, height:h, borderRadius:r, background:'#EEF2F7', animation:'skPulse 1.6s ease-in-out infinite', flexShrink:0 }} />
);

const SummaryCard = ({ label, value, icon: SIcon, accent, surface = '#fff', border = '#E2E8F0', textPrimary = '#0F172A' }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      background: surface, border:`1.5px solid ${hov ? accent+'44' : border}`,
      borderRadius:'16px', padding:'20px', display:'flex', alignItems:'center', gap:'16px',
      boxShadow: hov ? `0 8px 24px ${accent}22` : '0 2px 8px rgba(0,0,0,0.04)',
      transition:'all .2s', flex:1, minWidth:'140px',
    }}>
      <div style={{ width:'46px', height:'46px', borderRadius:'12px', background:`${accent}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {React.createElement(SIcon, { size:22, color:accent })}
      </div>
      <div>
        <p style={{ fontSize:'10.5px', fontWeight:'700', color:'#94A3B8', textTransform:'uppercase', margin:'0 0 4px', letterSpacing:'.5px' }}>{label}</p>
        <p style={{ fontSize:'23px', fontWeight:'800', color: textPrimary, margin:0 }}>{value}</p>
      </div>
    </div>
  );
};

const PlayerDetail = () => {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, fetchAssignedPlayersForCoach, userToken } = useStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const surface = dark ? 'var(--cl-surface)' : '#fff';
  const border = dark ? 'var(--cl-border)' : '#E2E8F0';
  const textPrimary = dark ? 'var(--cl-text)' : '#0F172A';
  const textSecondary = dark ? 'var(--cl-text-2)' : '#475569';
  const textMuted = dark ? 'var(--cl-text-3)' : '#94A3B8';
  const surface2 = dark ? 'var(--cl-surface-2)' : '#F8FAFC';
  const [player, setPlayer] = useState(null);
  const [sessionCardIds, setSessionCardIds] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // This page is shared with the coach route. isAdmin only affects where the
  // View action links (read-only admin view vs. the coach teaching view).
  const isAdmin = currentUser?.role === 'admin' || (currentUser?.roles || []).includes('admin');

  const convertProgressToPercentage = (progress) => {
    if (typeof progress === 'number') return progress;
    if (progress === 'Not Started') return 0;
    if (progress === 'In Progress') return 50;
    if (progress === 'Completed') return 100;
    return 0;
  };

  const normalizeStatus = (status) => {
    if (!status) return '';
    return status.toLowerCase().replace(/[\s_]/g, '');
  };

  const isInProgress = (status) => normalizeStatus(status) === 'inprogress';
  const isCompleted = (status) => normalizeStatus(status) === 'completed';
  const isPending = (status) => normalizeStatus(status) === 'pending';

  // Admin views this page as a read-only observer (view-session-card); a coach
  // views it as the person who'll actually coach the session.
  const sessionLink = (session) => isAdmin
    ? `/admin/view-session-card/${session._id}`
    : (isCompleted(session.status)
      ? `/coach/view-completed-session/${session._id}`
      : `/coach/session/${session._id}`);

  const groupSessionsByPathway = (list) => {
    const groups = {};
    list.forEach(s => {
      const key = s.LearningPathway || 'Unassigned Pathway';
      (groups[key] = groups[key] || []).push(s);
    });
    return Object.keys(groups)
      .sort((a, b) => {
        if (a === player?.LearningPathway) return -1;
        if (b === player?.LearningPathway) return 1;
        return a.localeCompare(b);
      })
      .map(name => ({ name, sessions: groups[name] }));
  };

  useEffect(() => {
    const loadPlayerDetails = async () => {
      try {
        setIsLoading(true);

        const navigationPlayer = location.state?.player;
        if (navigationPlayer) {
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
          if (navigationPlayer.sessionCardIds && Array.isArray(navigationPlayer.sessionCardIds)) {
            setSessionCardIds(navigationPlayer.sessionCardIds);
          }
          setIsLoading(false);
          return;
        }

        const result = await fetchAssignedPlayersForCoach(currentUser.id);

        if (result.success && result.players) {
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

  useEffect(() => {
    const fetchSessions = async () => {
      if (!sessionCardIds || sessionCardIds.length === 0) {
        setSessions([]);
        return;
      }

      try {
        setSessionsLoading(true);
        const token = userToken || JSON.parse(localStorage.getItem('coachlife_auth') || '{}').userToken;
        const fetchedSessions = [];

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
        <style>{`
          @keyframes skPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
          @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
        `}</style>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(6, 0, 48, 0.4) 0%, rgba(0, 0, 0, 0.4) 100%)',
            padding: '40px 32px', borderRadius: '12px',
            border: '1px solid rgba(226, 232, 240, 0.3)', marginBottom: '32px',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div style={{ width: '100px', height: '100px', background: 'rgba(200, 200, 200, 0.3)', borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: '250px', height: '28px', background: 'rgba(200, 200, 200, 0.3)', borderRadius: '6px', marginBottom: '12px' }} />
                <div style={{ width: '300px', height: '16px', background: 'rgba(200, 200, 200, 0.3)', borderRadius: '6px' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{
                background: surface, borderRadius: '8px', padding: '16px',
                border: `1px solid ${border}`, animation: `pulse 2s ease-in-out infinite ${i * 0.1}s`
              }}>
                <div style={{ width: '50%', height: '14px', background: 'rgba(200, 200, 200, 0.3)', borderRadius: '4px', marginBottom: '8px' }} />
                <div style={{ width: '40%', height: '24px', background: 'rgba(200, 200, 200, 0.3)', borderRadius: '4px' }} />
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
            <div>
              {[1, 2].map((i) => (
                <div key={i} style={{
                  background: surface, borderRadius: '8px', padding: '24px',
                  border: `1px solid ${border}`, marginBottom: '24px',
                  animation: `pulse 2s ease-in-out infinite ${i * 0.15}s`
                }}>
                  <div style={{ width: '40%', height: '18px', background: 'rgba(200, 200, 200, 0.3)', borderRadius: '4px', marginBottom: '16px' }} />
                  {[1, 2, 3].map((j) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ width: '40%', height: '14px', background: 'rgba(200, 200, 200, 0.3)', borderRadius: '4px' }} />
                      <div style={{ width: '35%', height: '14px', background: 'rgba(200, 200, 200, 0.3)', borderRadius: '4px' }} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ background: surface, borderRadius: '8px', padding: '24px', border: `1px solid ${border}`, animation: 'pulse 2s ease-in-out infinite 0.2s' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ paddingBottom: '12px', marginBottom: '12px', borderBottom: i < 3 ? '1px solid #F1F5F9' : 'none' }}>
                  <div style={{ width: '70%', height: '14px', background: 'rgba(200, 200, 200, 0.3)', borderRadius: '4px', marginBottom: '6px' }} />
                  <div style={{ width: '50%', height: '14px', background: 'rgba(200, 200, 200, 0.3)', borderRadius: '4px' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!player) {
    return (
      <Layout>
        <style>{`
          @keyframes skPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        `}</style>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              backgroundColor: 'rgba(82, 102, 129, 0.1)', color: '#6366F1',
              border: 'none', padding: '8px 12px', borderRadius: '6px',
              cursor: 'pointer', marginBottom: '24px', transition: 'all 0.3s',
              fontSize: '14px', fontWeight: '500'
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '48px 20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <BookOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#CBD5E1' }} />
            <p style={{ fontSize: '16px', color: textSecondary, margin: '0' }}>Player not found.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <style>{`
        @keyframes skPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* Standard banner with back button */}
        <div style={{
          background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
          borderRadius: '20px', padding: '28px 32px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
          boxShadow: '0 12px 40px rgba(6,0,48,.3)', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                backgroundColor: 'rgba(255,255,255,0.18)', color: 'white',
                border: '1px solid rgba(255,255,255,0.25)',
                padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
                fontSize: '14px', fontWeight: '500', transition: 'all 0.2s', flexShrink: 0
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.28)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.18)'}
            >
              <ArrowLeft size={16} /> Back
            </button>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,.12)', border: '1.5px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: '0 0 3px', letterSpacing: '-.5px' }}>{player.name}</h1>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.6)', margin: 0, fontWeight: '500' }}>{player.LearningPathway || 'Player Profile'}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
          <SummaryCard label="Total Points" value={player.totalPoints} icon={Award} accent="#6366F1" surface={surface} border={border} textPrimary={textPrimary} />
          <SummaryCard label="Sessions" value={sessions.length} icon={BookOpen} accent="#10B981" surface={surface} border={border} textPrimary={textPrimary} />
          <SummaryCard label="Balance" value={player.currentPoints} icon={TrendingUp} accent="#F59E0B" surface={surface} border={border} textPrimary={textPrimary} />
          <SummaryCard label="Status" value={player.status || 'active'} icon={CheckCircle} accent={player.status === 'active' ? '#10B981' : '#EF4444'} surface={surface} border={border} textPrimary={textPrimary} />
        </div>

        {/* Hero info strip */}
        <div style={{
          background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
          borderRadius: '12px', padding: '32px', color: 'white', marginBottom: '32px',
          boxShadow: '0 8px 32px rgba(6,0,48,0.25)',
          display: 'grid', gridTemplateColumns: '1fr 3fr', alignItems: 'center', gap: '32px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '40px'
            }}>
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>{player.name}</h1>
              <span style={{ fontSize: '14px', opacity: 0.9 }}>{player.phone}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', padding: '16px', backdropFilter: 'blur(10px)' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 8px 0', textTransform: 'uppercase', fontWeight: '600' }}>Age</p>
              <p style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>{player.age} yrs</p>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', padding: '16px', backdropFilter: 'blur(10px)' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 8px 0', textTransform: 'uppercase', fontWeight: '600' }}>Learning Pathway</p>
              <p style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>{player.LearningPathway}</p>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', padding: '16px', backdropFilter: 'blur(10px)' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 8px 0', textTransform: 'uppercase', fontWeight: '600' }}>Total Points</p>
              <p style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>{player.totalPoints}</p>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', padding: '16px', backdropFilter: 'blur(10px)' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 8px 0', textTransform: 'uppercase', fontWeight: '600' }}>Points Redeemed</p>
              <p style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>{player.totalPointsRedeemed}</p>
            </div>
          </div>
        </div>

        {/* Personal Information Section */}
        <div style={{ background: surface, borderRadius: '12px', padding: '24px', marginBottom: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '4px', height: '28px', background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', borderRadius: '2px' }}></div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: textPrimary, margin: 0 }}>Personal Information</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Father Name */}
            <div style={{ padding: '16px', background: surface2, borderRadius: '10px', border: `1px solid ${border}`, transition: 'all 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E2E8F0'; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <User size={16} color="#064E3B" />
                <label style={{ fontSize: '11px', color: textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Father's Name</label>
              </div>
              <p style={{ fontSize: '15px', color: textPrimary, fontWeight: '600', margin: 0 }}>{player.fatherName}</p>
            </div>

            {/* Mother Name */}
            <div style={{ padding: '16px', background: surface2, borderRadius: '10px', border: `1px solid ${border}`, transition: 'all 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E2E8F0'; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <User size={16} color="#7C2D12" />
                <label style={{ fontSize: '11px', color: textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Mother's Name</label>
              </div>
              <p style={{ fontSize: '15px', color: textPrimary, fontWeight: '600', margin: 0 }}>{player.motherName}</p>
            </div>

            {/* Date of Birth */}
            <div style={{ padding: '16px', background: surface2, borderRadius: '10px', border: `1px solid ${border}`, transition: 'all 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E2E8F0'; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Calendar size={16} color="#7F1D1D" />
                <label style={{ fontSize: '11px', color: textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Date of Birth</label>
              </div>
              <p style={{ fontSize: '15px', color: textPrimary, fontWeight: '600', margin: 0 }}>
                {player.dateOfBirth ? new Date(player.dateOfBirth).toLocaleDateString() : 'N/A'}
              </p>
            </div>

            {/* Primary Phone */}
            <div style={{ padding: '16px', background: surface2, borderRadius: '10px', border: `1px solid ${border}`, transition: 'all 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E2E8F0'; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Mail size={16} color="#059669" />
                <label style={{ fontSize: '11px', color: textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Primary Phone</label>
              </div>
              <p style={{ fontSize: '15px', color: textPrimary, fontWeight: '600', margin: 0 }}>{player.phone}</p>
            </div>

            {/* Alternative Number */}
            <div style={{ padding: '16px', background: surface2, borderRadius: '10px', border: `1px solid ${border}`, transition: 'all 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E2E8F0'; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Mail size={16} color="#7C3AED" />
                <label style={{ fontSize: '11px', color: textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Alternative Number</label>
              </div>
              <p style={{ fontSize: '15px', color: textPrimary, fontWeight: '600', margin: 0 }}>{player.alternativeNumber || 'N/A'}</p>
            </div>

            {/* Registration Date */}
            <div style={{ padding: '16px', background: surface2, borderRadius: '10px', border: `1px solid ${border}`, transition: 'all 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E2E8F0'; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Calendar size={16} color="#0891B2" />
                <label style={{ fontSize: '11px', color: textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Registration Date</label>
              </div>
              <p style={{ fontSize: '15px', color: textPrimary, fontWeight: '600', margin: 0 }}>
                {player.dateOfRegistration ? new Date(player.dateOfRegistration).toLocaleDateString() : 'N/A'}
              </p>
            </div>

            {/* Status */}
            <div style={{ padding: '16px', background: surface2, borderRadius: '10px', border: `1px solid ${border}`, transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E2E8F0'; }}>
              <label style={{ fontSize: '11px', color: textSecondary, fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Status</label>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px',
                background: player.status === 'active' ? '#D1FAE5' : '#FEE2E2',
                color: player.status === 'active' ? '#065F46' : '#991B1B',
                borderRadius: '6px', fontSize: '13px', fontWeight: '600', textTransform: 'capitalize', width: 'fit-content'
              }}>
                <div style={{ width: '8px', height: '8px', background: player.status === 'active' ? '#10B981' : '#EF4444', borderRadius: '50%' }}></div>
                {player.status}
              </span>
            </div>

            {/* Address */}
            <div style={{ gridColumn: 'span 2', padding: '16px', background: surface2, borderRadius: '10px', border: `1px solid ${border}`, transition: 'all 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E2E8F0'; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <FileText size={16} color="#0369A1" />
                <label style={{ fontSize: '11px', color: textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Address</label>
              </div>
              <p style={{ fontSize: '15px', color: textPrimary, fontWeight: '600', margin: 0 }}>{player.address || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Player Sessions Section */}
        <div style={{ background: surface, borderRadius: '12px', padding: '24px', marginBottom: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '4px', height: '28px', background: 'linear-gradient(180deg, #3B82F6, #1D4ED8)', borderRadius: '2px' }}></div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: textPrimary, margin: 0 }}>Player Sessions</h3>
            </div>
            <span style={{ padding: '6px 14px', background: '#E0E7FF', color: '#3B82F6', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
              {sessions.length} Total
            </span>
          </div>

          {sessionsLoading ? (
            <div style={{ textAlign: 'center', padding: '48px 32px' }}>
              <Loader size={40} style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite', color: '#94A3B8' }} />
              <p style={{ color: textSecondary, fontSize: '14px', fontWeight: '500' }}>Loading sessions...</p>
            </div>
          ) : sessions.length > 0 ? (
            <div>
              {/* In Progress Sessions */}
              {sessions.filter(s => isInProgress(s.status)).length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '16px', borderBottom: '2px solid #E2E8F0', marginBottom: '24px' }}>
                    <Zap size={20} color="#94A3B8" />
                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: textPrimary, margin: 0 }}>In Progress Sessions</h4>
                    <span style={{ marginLeft: 'auto', padding: '4px 12px', background: surface2, color: textSecondary, borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                      {sessions.filter(s => isInProgress(s.status)).length}
                    </span>
                  </div>

                  {groupSessionsByPathway(sessions.filter(s => isInProgress(s.status))).map(group => (
                    <div key={group.name} style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: textPrimary }}>{group.name}</span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: textMuted, background: surface2, padding: '2px 9px', borderRadius: '20px' }}>{group.sessions.length}</span>
                        {group.name === player.LearningPathway && (
                          <span style={{ fontSize: '10px', fontWeight: '700', color: '#4F46E5', background: 'rgba(99,102,241,0.1)', padding: '2px 9px', borderRadius: '20px' }}>Current</span>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                        {group.sessions.map((session) => (
                          <SessionMiniCard
                            key={session._id}
                            session={session}
                            dark={dark}
                            onView={() => navigate(sessionLink(session), { state: { session, player } })}
                            onEdit={!isCompleted(session.status) ? () => navigate(`/admin/edit-session-card/${session._id}`, { state: { playerId: player.playerId } }) : null}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending Sessions */}
              {sessions.filter(s => isPending(s.status)).length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '16px', borderBottom: '2px solid #FCD34D', marginBottom: '24px' }}>
                    <Clock size={20} color="#D97706" />
                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: textPrimary, margin: 0 }}>Pending Sessions</h4>
                    <span style={{ marginLeft: 'auto', padding: '4px 12px', background: '#FEF3C7', color: '#92400E', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                      {sessions.filter(s => isPending(s.status)).length}
                    </span>
                  </div>
                  {groupSessionsByPathway(sessions.filter(s => isPending(s.status))).map(group => (
                    <div key={group.name} style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: textPrimary }}>{group.name}</span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: textMuted, background: surface2, padding: '2px 9px', borderRadius: '20px' }}>{group.sessions.length}</span>
                        {group.name === player.LearningPathway && (
                          <span style={{ fontSize: '10px', fontWeight: '700', color: '#4F46E5', background: 'rgba(99,102,241,0.1)', padding: '2px 9px', borderRadius: '20px' }}>Current</span>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                        {group.sessions.map((session) => (
                          <SessionMiniCard
                            key={session._id}
                            session={session}
                            dark={dark}
                            onView={() => navigate(sessionLink(session), { state: { session, player } })}
                            onEdit={!isCompleted(session.status) ? () => navigate(`/admin/edit-session-card/${session._id}`, { state: { playerId: player.playerId } }) : null}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upcoming Sessions */}
              {sessions.filter(s => !isCompleted(s.status) && !isInProgress(s.status) && !isPending(s.status)).length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '16px', borderBottom: '2px solid #E2E8F0', marginBottom: '24px' }}>
                    <Clock size={20} color="#94A3B8" />
                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: textPrimary, margin: 0 }}>Upcoming Sessions</h4>
                    <span style={{ marginLeft: 'auto', padding: '4px 12px', background: surface2, color: textSecondary, borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                      {sessions.filter(s => !isCompleted(s.status) && !isInProgress(s.status) && !isPending(s.status)).length}
                    </span>
                  </div>

                  {groupSessionsByPathway(sessions.filter(s => !isCompleted(s.status) && !isInProgress(s.status) && !isPending(s.status))).map(group => (
                    <div key={group.name} style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: textPrimary }}>{group.name}</span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: textMuted, background: surface2, padding: '2px 9px', borderRadius: '20px' }}>{group.sessions.length}</span>
                        {group.name === player.LearningPathway && (
                          <span style={{ fontSize: '10px', fontWeight: '700', color: '#4F46E5', background: 'rgba(99,102,241,0.1)', padding: '2px 9px', borderRadius: '20px' }}>Current</span>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                        {group.sessions.map((session) => (
                          <SessionMiniCard
                            key={session._id}
                            session={session}
                            dark={dark}
                            onView={() => navigate(sessionLink(session), { state: { session, player } })}
                            onEdit={!isCompleted(session.status) ? () => navigate(`/admin/edit-session-card/${session._id}`, { state: { playerId: player.playerId } }) : null}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Completed Sessions */}
              {sessions.filter(s => isCompleted(s.status)).length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '16px', borderBottom: '2px solid #E2E8F0', marginBottom: '24px' }}>
                    <CheckCircle size={20} color="#94A3B8" />
                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: textPrimary, margin: 0 }}>Completed Sessions</h4>
                    <span style={{ marginLeft: 'auto', padding: '4px 12px', background: surface2, color: textSecondary, borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                      {sessions.filter(s => isCompleted(s.status)).length}
                    </span>
                  </div>

                  {groupSessionsByPathway(sessions.filter(s => isCompleted(s.status))).map(group => (
                    <div key={group.name} style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: textPrimary }}>{group.name}</span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: textMuted, background: surface2, padding: '2px 9px', borderRadius: '20px' }}>{group.sessions.length}</span>
                        {group.name === player.LearningPathway && (
                          <span style={{ fontSize: '10px', fontWeight: '700', color: '#4F46E5', background: 'rgba(99,102,241,0.1)', padding: '2px 9px', borderRadius: '20px' }}>Current</span>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                        {group.sessions.map((session) => (
                          <SessionMiniCard
                            key={session._id}
                            session={session}
                            dark={dark}
                            onView={() => navigate(sessionLink(session), { state: { session, player } })}
                            onEdit={!isCompleted(session.status) ? () => navigate(`/admin/edit-session-card/${session._id}`, { state: { playerId: player.playerId } }) : null}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 32px', background: surface2, borderRadius: '10px', border: '2px dashed #E2E8F0' }}>
              <BookOpen size={40} style={{ margin: '0 auto 16px', opacity: 0.4, color: '#CBD5E1' }} />
              <p style={{ color: textSecondary, fontSize: '15px', margin: 0, fontWeight: '500' }}>No sessions assigned yet</p>
              <p style={{ color: textMuted, fontSize: '13px', margin: '8px 0 0 0' }}>Sessions will appear here once they are created</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PlayerDetail;
