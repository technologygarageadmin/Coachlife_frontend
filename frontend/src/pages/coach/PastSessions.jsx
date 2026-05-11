import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { BookOpen, CheckCircle, Clock, Star, TrendingUp, Award, Calendar, ChevronRight } from 'lucide-react';

const PastSessions = () => {
  const { currentUser, sessionHistory } = useStore();

  const mySessions = sessionHistory.filter((s) => s.coachId === currentUser.id);
  
  // Organize sessions by status
  const pendingSessions = mySessions.filter((s) => s.status === 'pending');
  const completedSessions = mySessions.filter((s) => s.status === 'completed');

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
          <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 8px 0' }}>
            Past Sessions
          </h1>
          <p style={{ fontSize: '16px', opacity: 0.9, margin: '0' }}>
            Review and track all your completed coaching sessions
          </p>
        </div>

        {/* Statistics Grid */}
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
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          on
          data-aos="zoom-in"
          data-aos-duration="800"MouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ backgroundColor: '#E8F2F8', borderRadius: '8px', padding: '8px' }}>
                <BookOpen size={24} color="#060030ff" />
              </div>
              <span style={{ fontSize: '14px', color: '#64748B', fontWeight: '500' }}>Total Sessions</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: '0' }}>
              {mySessions.length}
            </p>
          </div>

          {/* Completed Sessions Card */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            borderLeft: '4px solid #10B981',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s'
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
          data-aos-delay="100"
          data-aos-duration="800">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ backgroundColor: '#F0FDF4', borderRadius: '8px', padding: '8px' }}>
                <CheckCircle size={24} color="#10B981" />
              </div>
              <span style={{ fontSize: '14px', color: '#64748B', fontWeight: '500' }}>Completed</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: '0' }}>
              {mySessions.filter((s) => s.status === 'completed').length}
            </p>
          </div>

          {/* Average Rating Card */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            borderLeft: '4px solid #060030ff',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s'
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
          data-aos-delay="200"
          data-aos-duration="800">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ backgroundColor: '#FFFBEB', borderRadius: '8px', padding: '8px' }}>
                <Star size={24} color="#060030ff" />
              </div>
              <span style={{ fontSize: '14px', color: '#64748B', fontWeight: '500' }}>Average Rating</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: '0' }}>
              {(mySessions.reduce((sum, s) => sum + (s.rating || 0), 0) / (mySessions.length || 1)).toFixed(1)}⭐
            </p>
          </div>

          {/* Sessions Pending Card */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            borderLeft: '4px solid #252c35',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s'
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
                <Clock size={24} color="#252c35" />
              </div>
              <span style={{ fontSize: '14px', color: '#64748B', fontWeight: '500' }}>Pending</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: '0' }}>
              {mySessions.filter((s) => s.status === 'pending').length}
            </p>
          </div>
        </div>

        {/* Pending Sessions */}
        {pendingSessions.length > 0 && (
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
                Pending Sessions
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
                {pendingSessions.length}
              </span>
            </div>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}>
              {pendingSessions.slice().reverse().map((session, index) => (
                <div key={session.sessionId} style={{
                  padding: '16px 20px',
                  borderBottom: index !== pendingSessions.length - 1 ? '1px solid #E2E8F0' : 'none',
                  backgroundColor: 'white',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#FFFBEB'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                >
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
                    gap: '16px',
                    alignItems: 'center'
                  }}>
                    <div>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 4px 0' }}>player</p>
                      <p style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0' }}>{session.player}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 4px 0' }}>Date</p>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', margin: '0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} />
                        {session.date}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 4px 0' }}>Status</p>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#FFFBEB',
                        color: '#060030ff'
                      }}>⏳ Pending</span>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 4px 0' }}>Feedback</p>
                      {session.feedback ? (
                        <p style={{
                          fontSize: '13px',
                          color: '#475569',
                          margin: '0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '200px'
                        }}>{session.feedback}</p>
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
              {completedSessions.slice().reverse().map((session, index) => (
                <div key={session.sessionId} style={{
                  padding: '16px 20px',
                  borderBottom: index !== completedSessions.length - 1 ? '1px solid #E2E8F0' : 'none',
                  backgroundColor: 'white',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#F0FDF4'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                >
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
                    gap: '16px',
                    alignItems: 'center'
                  }}>
                    <div>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 4px 0' }}>player</p>
                      <p style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0' }}>{session.player}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 4px 0' }}>Date</p>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', margin: '0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} />
                        {session.date}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 4px 0' }}>Status & Rating</p>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#F0FDF4',
                          color: '#10B981'
                        }}>✓ Completed</span>
                        {session.rating && (
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#060030ff' }}>⭐ {session.rating}/5</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 4px 0' }}>Feedback</p>
                      {session.feedback ? (
                        <p style={{
                          fontSize: '13px',
                          color: '#475569',
                          margin: '0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '200px'
                        }}>{session.feedback}</p>
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
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            padding: '48px 20px'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              backgroundColor: '#E8F2F8',
              borderRadius: '50%',
              marginBottom: '16px'
            }}>
              <BookOpen size={40} color="#252c35" />
            </div>
            <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: '#64748B' }}>
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


