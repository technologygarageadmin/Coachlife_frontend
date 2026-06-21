import React from 'react';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { BookOpen, CheckCircle, Clock, Star, Calendar, ChevronRight } from 'lucide-react';

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

const PastSessions = () => {
  const { currentUser, sessionHistory } = useStore();

  const mySessions = sessionHistory.filter((s) => s.coachId === currentUser.id);

  const pendingSessions = mySessions.filter((s) => s.status === 'pending');
  const completedSessions = mySessions.filter((s) => s.status === 'completed');
  const avgRating = (mySessions.reduce((sum, s) => sum + (s.rating || 0), 0) / (mySessions.length || 1)).toFixed(1);

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
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,.12)', border: '1.5px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: '0 0 3px', letterSpacing: '-.5px' }}>Past Sessions</h1>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.6)', margin: 0, fontWeight: '500' }}>Review and track all your completed coaching sessions</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
          <SummaryCard label="Total Sessions" value={mySessions.length} icon={BookOpen} accent="#6366F1" />
          <SummaryCard label="Completed" value={completedSessions.length} icon={CheckCircle} accent="#10B981" />
          <SummaryCard label="Pending" value={pendingSessions.length} icon={Clock} accent="#F59E0B" />
          <SummaryCard label="Avg Rating" value={`${avgRating}⭐`} icon={Star} accent="#8B5CF6" />
        </div>

        {/* Pending Sessions */}
        {pendingSessions.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #E2E8F0'
            }}>
              <Clock size={20} color="#6366F1" />
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0F172A', margin: '0' }}>
                Pending Sessions
              </h2>
              <span style={{
                backgroundColor: '#FFFBEB', color: '#6366F1', fontSize: '12px', fontWeight: '600',
                padding: '4px 10px', borderRadius: '20px', marginLeft: 'auto'
              }}>
                {pendingSessions.length}
              </span>
            </div>
            <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              {pendingSessions.slice().reverse().map((session, index) => (
                <div key={session.sessionId} style={{
                  padding: '16px 20px',
                  borderBottom: index !== pendingSessions.length - 1 ? '1px solid #E2E8F0' : 'none',
                  backgroundColor: '#FFFFFF', transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '16px', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 4px 0' }}>player</p>
                      <p style={{ fontSize: '15px', fontWeight: '600', color: '#0F172A', margin: '0' }}>{session.player}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 4px 0' }}>Date</p>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#0F172A', margin: '0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} />
                        {session.date}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 4px 0' }}>Status</p>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600',
                        padding: '4px 10px', borderRadius: '6px', backgroundColor: '#FFFBEB', color: '#6366F1'
                      }}>⏳ Pending</span>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 4px 0' }}>Feedback</p>
                      {session.feedback ? (
                        <p style={{ fontSize: '13px', color: '#475569', margin: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{session.feedback}</p>
                      ) : (
                        <p style={{ fontSize: '13px', color: '#CBD5E1', margin: '0', fontStyle: 'italic' }}>No feedback</p>
                      )}
                    </div>
                    <ChevronRight size={20} style={{ color: '#CBD5E1' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Sessions */}
        {completedSessions.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid #E2E8F0'
            }}>
              <CheckCircle size={20} color="#10B981" />
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0F172A', margin: '0' }}>
                Completed Sessions
              </h2>
              <span style={{
                backgroundColor: '#F0FDF4', color: '#10B981', fontSize: '12px', fontWeight: '600',
                padding: '4px 10px', borderRadius: '20px', marginLeft: 'auto'
              }}>
                {completedSessions.length}
              </span>
            </div>
            <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              {completedSessions.slice().reverse().map((session, index) => (
                <div key={session.sessionId} style={{
                  padding: '16px 20px',
                  borderBottom: index !== completedSessions.length - 1 ? '1px solid #E2E8F0' : 'none',
                  backgroundColor: '#FFFFFF', transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F0FDF4'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '16px', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 4px 0' }}>player</p>
                      <p style={{ fontSize: '15px', fontWeight: '600', color: '#0F172A', margin: '0' }}>{session.player}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 4px 0' }}>Date</p>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#0F172A', margin: '0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} />
                        {session.date}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 4px 0' }}>Status & Rating</p>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600',
                          padding: '4px 10px', borderRadius: '6px', backgroundColor: '#F0FDF4', color: '#10B981'
                        }}>✓ Completed</span>
                        {session.rating && (
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#6366F1' }}>⭐ {session.rating}/5</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 4px 0' }}>Feedback</p>
                      {session.feedback ? (
                        <p style={{ fontSize: '13px', color: '#475569', margin: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{session.feedback}</p>
                      ) : (
                        <p style={{ fontSize: '13px', color: '#CBD5E1', margin: '0', fontStyle: 'italic' }}>No feedback</p>
                      )}
                    </div>
                    <ChevronRight size={20} style={{ color: '#CBD5E1' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {mySessions.length === 0 && (
          <div style={{ background: '#FFFFFF', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', textAlign: 'center', padding: '48px 20px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '80px', height: '80px', backgroundColor: '#F8FAFC', borderRadius: '50%', marginBottom: '16px'
            }}>
              <BookOpen size={40} color="#6366F1" />
            </div>
            <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: '#475569' }}>
              No sessions yet
            </p>
            <p style={{ fontSize: '14px', color: '#94A3B8', margin: '0' }}>
              Your sessions will appear here once created
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PastSessions;
