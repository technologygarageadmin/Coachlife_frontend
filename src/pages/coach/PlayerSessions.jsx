import { Link, useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Calendar, Clock, Award, ArrowLeft, BookOpen, Plus, TrendingUp, Target, ChevronRight, CheckCircle } from 'lucide-react';

const PlayerSessions = () => {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { currentUser, players, getPlayerSessions } = useStore();
  
  const player = players.find(p => p.playerId === playerId);
  
  // Check if this player belongs to the current coach
  if (!player || player.primaryCoach !== currentUser.id) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-xl font-semibold text-gray-900">Access Denied</p>
            <p className="text-gray-500 mt-2">This player is not assigned to you</p>
            <button 
              onClick={() => navigate(-1)}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Get all sessions for this player
  const playerSessions = getPlayerSessions(playerId);
  
  // Organize sessions by status
  const upcomingSessions = playerSessions.filter(s => s.status === 'draft' || s.status === 'upcoming');
  const draftSessions = playerSessions.filter(s => s.status === 'draft');
  const completedSessions = playerSessions.filter(s => s.status === 'submitted' || s.status === 'completed');
  
  // Calculate session statistics
  const submittedCount = playerSessions.filter(s => s.status === 'submitted').length;
  const totalPoints = playerSessions.reduce((sum, s) => sum + (s.pointsEarned || s.defaultPoints + s.bonusPoints || 0), 0);
  const avgRating = playerSessions.length > 0 
    ? (playerSessions.reduce((sum, s) => sum + (s.rating || 0), 0) / playerSessions.length).toFixed(1)
    : 0;

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* Gradient Header */}
        <div style={{
          background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
          borderRadius: '12px',
          padding: '32px',
          color: 'white',
          marginBottom: '32px',
          boxShadow: '0 4px 15px rgba(37, 44, 53, 0.1)'
        }}
        data-aos="fade-up"
        data-aos-duration="800">
          <button 
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              marginBottom: '16px',
              transition: 'all 0.3s',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px', margin: '0 0 8px 0' }}>
              {player.name}'s Sessions
            </h1>
            <p style={{ fontSize: '16px', opacity: 0.9, margin: '0' }}>
              {player.email} • {player.learningPathway}
            </p>
          </div>
        </div>

        {/* Statistics Grid - 4 Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}
        data-aos="fade-up"
        data-aos-delay="100"
        data-aos-duration="800">
          {/* Total Sessions Card */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            borderLeft: '4px solid #060030ff',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'default'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          data-aos="zoom-in"
          data-aos-duration="800">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ backgroundColor: '#E8F2F8', borderRadius: '8px', padding: '8px' }}>
                <BookOpen size={24} color="#060030ff" />
              </div>
              <span style={{ fontSize: '14px', color: '#64748B', fontWeight: '500' }}>Total Sessions</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: '0' }}>
              {playerSessions.length}
            </p>
          </div>

          {/* Completed Sessions Card */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            borderLeft: '4px solid #060030ff',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'default'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ backgroundColor: '#FFFBEB', borderRadius: '8px', padding: '8px' }}>
                <Award size={24} color="#060030ff" />
              </div>
              <span style={{ fontSize: '14px', color: '#64748B', fontWeight: '500' }}>Submitted</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: '0' }}>
              {submittedCount}
            </p>
          </div>

          {/* Total Points Card */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            borderLeft: '4px solid #10B981',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'default'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ backgroundColor: '#F0FDF4', borderRadius: '8px', padding: '8px' }}>
                <TrendingUp size={24} color="#10B981" />
              </div>
              <span style={{ fontSize: '14px', color: '#64748B', fontWeight: '500' }}>Points Earned</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: '0' }}>
              {totalPoints}
            </p>
          </div>

          {/* Avg Rating Card */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            borderLeft: '4px solid #252c35',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'default'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ backgroundColor: '#E8F2F8', borderRadius: '8px', padding: '8px' }}>
                <Target size={24} color="#252c35" />
              </div>
              <span style={{ fontSize: '14px', color: '#64748B', fontWeight: '500' }}>Avg Rating</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: '0' }}>
              {avgRating}⭐
            </p>
          </div>
        </div>

        {/* Sessions by Category */}
        
        {/* Upcoming Sessions */}
        {upcomingSessions.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '2px solid #E2E8F0'
            }}>
              <Clock size={20} color="#060030ff" />
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0' }}>
                Upcoming Sessions
              </h2>
              <span style={{
                backgroundColor: '#E8F2F8',
                color: '#252c35',
                fontSize: '12px',
                fontWeight: '600',
                padding: '4px 10px',
                borderRadius: '20px',
                marginLeft: 'auto'
              }}>
                {upcomingSessions.length}
              </span>
            </div>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}>
              {upcomingSessions.map((session, index) => (
                <Link
                  key={session.sessionId}
                  to={`/session/${session.sessionId}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    borderBottom: index !== upcomingSessions.length - 1 ? '1px solid #E2E8F0' : 'none',
                    backgroundColor: 'white',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'background-color 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8F2F8'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0' }}>
                        Session #{session.sessionId}
                      </h3>
                      <Badge variant="secondary">📅 Upcoming</Badge>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#64748B' }}>
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
                  <ChevronRight size={20} color="#060030ff" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Draft Sessions */}
        {draftSessions.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '2px solid #E2E8F0'
            }}>
              <Clock size={20} color="#060030ff" />
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0' }}>
                Draft Sessions
              </h2>
              <span style={{
                backgroundColor: '#FFFBEB',
                color: '#060030ff',
                fontSize: '12px',
                fontWeight: '600',
                padding: '4px 10px',
                borderRadius: '20px',
                marginLeft: 'auto'
              }}>
                {draftSessions.length}
              </span>
            </div>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}>
              {draftSessions.map((session, index) => (
                <Link
                  key={session.sessionId}
                  to={`/session/${session.sessionId}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    borderBottom: index !== draftSessions.length - 1 ? '1px solid #E2E8F0' : 'none',
                    backgroundColor: 'white',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'background-color 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFFBEB'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0' }}>
                        Session #{session.sessionId}
                      </h3>
                      <Badge variant="secondary">✏️ Draft</Badge>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#64748B' }}>
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
                  <ChevronRight size={20} color="#060030ff" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Completed Sessions */}
        {completedSessions.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '2px solid #E2E8F0'
            }}>
              <CheckCircle size={20} color="#10B981" />
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0' }}>
                Completed Sessions
              </h2>
              <span style={{
                backgroundColor: '#F0FDF4',
                color: '#10B981',
                fontSize: '12px',
                fontWeight: '600',
                padding: '4px 10px',
                borderRadius: '20px',
                marginLeft: 'auto'
              }}>
                {completedSessions.length}
              </span>
            </div>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}>
              {completedSessions.map((session, index) => (
                <Link
                  key={session.sessionId}
                  to={`/session/${session.sessionId}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    borderBottom: index !== completedSessions.length - 1 ? '1px solid #E2E8F0' : 'none',
                    backgroundColor: 'white',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'background-color 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F0FDF4'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0' }}>
                        Session #{session.sessionId}
                      </h3>
                      <Badge variant="primary">✓ Completed</Badge>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#64748B' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} />
                        {new Date(session.sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Award size={14} />
                        {(session.pointsEarned || session.defaultPoints + session.bonusPoints || 0)} pts
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ⭐ {session.rating || 'N/A'}
                      </span>
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
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            padding: '48px 20px'
          }}>
            <BookOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#CBD5E1' }} />
            <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: '#64748B' }}>
              No sessions yet
            </p>
            <p style={{ fontSize: '14px', color: '#94A3B8' }}>
              Sessions will appear here once created
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PlayerSessions;


