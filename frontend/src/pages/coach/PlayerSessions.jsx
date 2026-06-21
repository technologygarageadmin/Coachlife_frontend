import React from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Calendar, Award, ArrowLeft, BookOpen, TrendingUp, Target, ChevronRight, CheckCircle, Clock } from 'lucide-react';

const PALETTES = [
  ['#6366F1','#818CF8'], ['#10B981','#34D399'], ['#F59E0B','#FBBF24'],
  ['#EC4899','#F472B6'], ['#3B82F6','#60A5FA'], ['#8B5CF6','#A78BFA'],
  ['#EF4444','#F87171'], ['#06B6D4','#22D3EE'],
];
const pal = (name = '') => PALETTES[(name.charCodeAt(0) || 0) % PALETTES.length];

const Sk = ({ w, h, r = 8 }) => (
  <div style={{ width:w, height:h, borderRadius:r, background:'#EEF2F7', animation:'skPulse 1.6s ease-in-out infinite', flexShrink:0 }} />
);

const SummaryCard = ({ label, value, icon: SIcon, accent }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      background:'#fff', border:`1.5px solid ${hov ? accent+'44' : '#E2E8F0'}`,
      borderRadius:'16px', padding:'20px', display:'flex', alignItems:'center', gap:'16px',
      boxShadow: hov ? `0 8px 24px ${accent}22` : '0 2px 8px rgba(0,0,0,0.04)',
      transition:'all .2s', flex:1, minWidth:'140px',
    }}>
      <div style={{ width:'46px', height:'46px', borderRadius:'12px', background:`${accent}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {React.createElement(SIcon, { size:22, color:accent })}
      </div>
      <div>
        <p style={{ fontSize:'10.5px', fontWeight:'700', color:'#94A3B8', textTransform:'uppercase', margin:'0 0 4px', letterSpacing:'.5px' }}>{label}</p>
        <p style={{ fontSize:'23px', fontWeight:'800', color:'#0F172A', margin:0 }}>{value}</p>
      </div>
    </div>
  );
};

const PlayerSessions = () => {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { currentUser, players, getPlayerSessions } = useStore();

  const player = players.find(p => p.playerId === playerId);

  if (!player || player.primaryCoach !== currentUser.id) {
    return (
      <Layout>
        <style>{`
          @keyframes skPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '20px', fontWeight: '600', color: '#0F172A', marginBottom: '8px' }}>
              Access Denied
            </p>
            <p style={{ color: '#475569', marginBottom: '16px' }}>
              This player is not assigned to you
            </p>
            <button
              onClick={() => navigate(-1)}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
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
        </div>
      </Layout>
    );
  }

  const playerSessions = getPlayerSessions(playerId);
  const upcomingSessions = playerSessions.filter(s => s.status === 'draft' || s.status === 'upcoming');
  const draftSessions = playerSessions.filter(s => s.status === 'draft');
  const completedSessions = playerSessions.filter(s => s.status === 'submitted' || s.status === 'completed');
  const submittedCount = playerSessions.filter(s => s.status === 'submitted').length;
  const totalPoints = playerSessions.reduce((sum, s) => sum + (s.pointsEarned || s.defaultPoints + s.bonusPoints || 0), 0);
  const avgRating = playerSessions.length > 0
    ? (playerSessions.reduce((sum, s) => sum + (s.rating || 0), 0) / playerSessions.length).toFixed(1)
    : 0;

  return (
    <Layout>
      <style>{`
        @keyframes skPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* Standard banner */}
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
              <BookOpen size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: '0 0 3px', letterSpacing: '-.5px' }}>Player Sessions</h1>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.6)', margin: 0, fontWeight: '500' }}>{player.name || player.playerName}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
          <SummaryCard label="Total Sessions" value={playerSessions.length} icon={BookOpen} accent="#6366F1" />
          <SummaryCard label="Submitted" value={submittedCount} icon={Award} accent="#6366F1" />
          <SummaryCard label="Points Earned" value={totalPoints} icon={TrendingUp} accent="#10B981" />
          <SummaryCard label={`Avg Rating`} value={`${avgRating}⭐`} icon={Target} accent="#94A3B8" />
        </div>

        {/* Upcoming Sessions */}
        {upcomingSessions.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #E2E8F0' }}>
              <Clock size={20} color="#6366F1" />
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0F172A', margin: 0 }}>Upcoming Sessions</h2>
              <span style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366F1', fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '20px', marginLeft: 'auto' }}>
                {upcomingSessions.length}
              </span>
            </div>
            <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              {upcomingSessions.map((session, index) => (
                <Link
                  key={session.sessionId}
                  to={`/session/${session.sessionId}`}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 20px', borderBottom: index !== upcomingSessions.length - 1 ? '1px solid #E2E8F0' : 'none',
                    backgroundColor: '#FFFFFF', textDecoration: 'none', color: 'inherit',
                    transition: 'background-color 0.2s', cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0F172A', margin: 0 }}>
                        Session #{session.sessionId}
                      </h3>
                      <span style={{ background: '#EEF2F7', color: '#475569', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>📅 Upcoming</span>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#475569' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} />
                        {new Date(session.sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Award size={14} />
                        {(session.pointsEarned || session.defaultPoints + session.bonusPoints || 0)} pts
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={20} color="#6366F1" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Draft Sessions */}
        {draftSessions.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #E2E8F0' }}>
              <Clock size={20} color="#6366F1" />
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0F172A', margin: 0 }}>Draft Sessions</h2>
              <span style={{ backgroundColor: '#FFFBEB', color: '#F59E0B', fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '20px', marginLeft: 'auto' }}>
                {draftSessions.length}
              </span>
            </div>
            <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              {draftSessions.map((session, index) => (
                <Link
                  key={session.sessionId}
                  to={`/session/${session.sessionId}`}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 20px', borderBottom: index !== draftSessions.length - 1 ? '1px solid #E2E8F0' : 'none',
                    backgroundColor: '#FFFFFF', textDecoration: 'none', color: 'inherit',
                    transition: 'background-color 0.2s', cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFFBEB'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0F172A', margin: 0 }}>
                        Session #{session.sessionId}
                      </h3>
                      <span style={{ background: '#FEF3C7', color: '#92400E', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>✏️ Draft</span>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#475569' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} />
                        {new Date(session.sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Award size={14} />
                        {(session.pointsEarned || session.defaultPoints + session.bonusPoints || 0)} pts
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={20} color="#6366F1" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Completed Sessions */}
        {completedSessions.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #E2E8F0' }}>
              <CheckCircle size={20} color="#10B981" />
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0F172A', margin: 0 }}>Completed Sessions</h2>
              <span style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981', fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '20px', marginLeft: 'auto' }}>
                {completedSessions.length}
              </span>
            </div>
            <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              {completedSessions.map((session, index) => (
                <Link
                  key={session.sessionId}
                  to={`/session/${session.sessionId}`}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 20px', borderBottom: index !== completedSessions.length - 1 ? '1px solid #E2E8F0' : 'none',
                    backgroundColor: '#FFFFFF', textDecoration: 'none', color: 'inherit',
                    transition: 'background-color 0.2s', cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0F172A', margin: 0 }}>
                        Session #{session.sessionId}
                      </h3>
                      <span style={{ background: '#D1FAE5', color: '#065F46', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>✓ Completed</span>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#475569' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} />
                        {new Date(session.sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Award size={14} />
                        {(session.pointsEarned || session.defaultPoints + session.bonusPoints || 0)} pts
                      </span>
                      <span>⭐ {session.rating || 'N/A'}</span>
                    </div>
                  </div>
                  <ChevronRight size={20} color="#10B981" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {playerSessions.length === 0 && (
          <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', textAlign: 'center', padding: '48px 20px' }}>
            <BookOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#94A3B8' }} />
            <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: '#475569' }}>
              No sessions yet
            </p>
            <p style={{ fontSize: '14px', color: '#94A3B8', margin: 0 }}>
              Sessions will appear here once created
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PlayerSessions;
