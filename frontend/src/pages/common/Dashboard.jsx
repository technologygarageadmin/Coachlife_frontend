import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useStore } from '../../context/store';
import { useTheme } from '../../context/ThemeContext';
import { Layout } from '../../components/Layout';
import { Users, TrendingUp, Award, BarChart3, Target, BookOpen, Trophy, Link2 } from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, color, bg, surface, border, textPrimary, textMuted }) => (
  <div style={{
    background: surface,
    borderRadius: '16px',
    padding: '20px',
    border: `1px solid ${border}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'all 0.25s ease'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.boxShadow = `0 8px 24px ${color}20`;
    e.currentTarget.style.borderColor = `${color}30`;
    e.currentTarget.style.transform = 'translateY(-2px)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
    e.currentTarget.style.borderColor = border;
    e.currentTarget.style.transform = 'translateY(0)';
  }}>
    <div style={{
      width: '52px', height: '52px', borderRadius: '14px',
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, boxShadow: `0 4px 12px ${color}30`
    }}>
      <Icon size={22} color={color} />
    </div>
    <div>
      <p style={{ fontSize: '11px', fontWeight: '600', color: textMuted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</p>
      <p style={{ fontSize: '26px', fontWeight: '800', color: textPrimary, margin: '4px 0 0 0', letterSpacing: '-0.5px' }}>{value}</p>
    </div>
  </div>
);

const ActionCard = ({ to, icon: Icon, label, color }) => (
  <Link to={to} style={{ textDecoration: 'none' }}>
    <div style={{
      padding: '20px 16px',
      border: `1.5px solid ${color}20`,
      borderRadius: '14px',
      background: `${color}08`,
      cursor: 'pointer',
      transition: 'all 0.25s ease',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '12px', height: '100%'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = `${color}60`;
      e.currentTarget.style.background = `${color}14`;
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = `0 12px 24px ${color}20`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = `${color}20`;
      e.currentTarget.style.background = `${color}08`;
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}>
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px',
        background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 10px ${color}20`
      }}>
        <Icon size={20} color={color} />
      </div>
      <span style={{ fontSize: '13px', fontWeight: '600', color: color, textAlign: 'center', lineHeight: 1.3 }}>
        {label}
      </span>
    </div>
  </Link>
);

const medalGradients = [
  { ring: '#FFD700', bg: 'linear-gradient(135deg, #FFE878, #FFA500)', shadow: '#FFD70050' },
  { ring: '#C0C0C0', bg: 'linear-gradient(135deg, #D8D8D8, #A0A0A0)', shadow: '#C0C0C050' },
  { ring: '#CD7F32', bg: 'linear-gradient(135deg, #D4946A, #8B4513)', shadow: '#CD7F3250' },
  { ring: '#8B7355', bg: 'linear-gradient(135deg, #9E8A6E, #5C4033)', shadow: '#8B735550' },
  { ring: '#6B5B4E', bg: 'linear-gradient(135deg, #7A6B5F, #3E332D)', shadow: '#6B5B4E50' },
];

const SkeletonBlock = ({ w, h, radius = 6 }) => (
  <div style={{
    width: w, height: h, borderRadius: radius,
    background: 'rgba(148,163,184,0.15)',
    animation: 'dashPulse 1.8s ease-in-out infinite'
  }} />
);

const Dashboard = () => {
  const { players, coaches, fetchCoaches, fetchPlayers } = useStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [isLoading, setIsLoading] = useState(true);

  const surface = dark ? 'var(--cl-surface)' : '#FFFFFF';
  const border = dark ? 'var(--cl-border)' : '#EEF2F7';
  const textPrimary = dark ? 'var(--cl-text)' : '#1E293B';
  const textSecondary = dark ? 'var(--cl-text-2)' : '#64748B';
  const textMuted = dark ? 'var(--cl-text-3)' : '#94A3B8';
  const surface2 = dark ? 'var(--cl-surface-2)' : '#F8FAFC';

  useEffect(() => {
    let loadingTimer;
    const startTime = Date.now();
    const fetchData = async () => {
      if (players.length === 0) await fetchPlayers();
      if (coaches.length === 0) await fetchCoaches();
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 300 - elapsed);
      loadingTimer = setTimeout(() => setIsLoading(false), remaining);
    };
    fetchData();
    return () => clearTimeout(loadingTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPlayers = players.length;
  const totalCoaches = coaches.length;
  const topPerformers = [...players].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)).slice(0, 5);

  if (isLoading) {
    return (
      <Layout>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 28px' }}>
          <div style={{ marginBottom: '28px' }}>
            <SkeletonBlock w="220px" h="28px" />
            <div style={{ marginTop: '8px' }}><SkeletonBlock w="320px" h="16px" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ background: surface, borderRadius: '16px', padding: '20px', border: `1px solid ${border}` }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <SkeletonBlock w="52px" h="52px" radius={14} />
                  <div style={{ flex: 1 }}>
                    <SkeletonBlock w="70%" h="11px" />
                    <div style={{ marginTop: '8px' }}><SkeletonBlock w="50%" h="24px" /></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <SkeletonBlock w="160px" h="20px" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px', marginTop: '16px' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background: surface, borderRadius: '14px', padding: '20px', border: `1px solid ${border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <SkeletonBlock w="44px" h="44px" radius={12} />
                <SkeletonBlock w="70%" h="12px" />
              </div>
            ))}
          </div>
        </div>
        <style>{`@keyframes dashPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }`}</style>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 28px' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: textPrimary, margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
            Welcome back 👋
          </h1>
          <p style={{ fontSize: '14px', color: textSecondary, margin: 0, fontWeight: '500' }}>
            Here's an overview - {totalPlayers} players and {totalCoaches} coaches in the system
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '36px' }}>
          <StatCard label="Total Players" value={totalPlayers} icon={Users} color="#6366F1" bg="linear-gradient(135deg, #EEF2FF, #E0E7FF)" surface={surface} border={border} textPrimary={textPrimary} textMuted={textMuted} />
          <StatCard label="Total Coaches" value={totalCoaches} icon={Award} color="#10B981" bg="linear-gradient(135deg, #ECFDF5, #D1FAE5)" surface={surface} border={border} textPrimary={textPrimary} textMuted={textMuted} />
        </div>

        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: '700', color: textPrimary, margin: '0 0 18px 0', letterSpacing: '-0.2px' }}>Management Center</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px' }}>
            <ActionCard to="/admin/players" icon={Users} label="Players" color="#6366F1" />
            <ActionCard to="/admin/coaches" icon={Award} label="Coaches" color="#10B981" />
            <ActionCard to="/admin/assign-players" icon={Link2} label="Assignments" color="#F59E0B" />
            <ActionCard to="/admin/rewards" icon={Trophy} label="Rewards" color="#EC4899" />
            <ActionCard to="/admin/learning-pathway" icon={TrendingUp} label="Learning" color="#8B5CF6" />
            <ActionCard to="/admin/redeem-history" icon={BarChart3} label="Redemptions" color="#EF4444" />
          </div>
        </div>

        {topPerformers.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '700', color: textPrimary, margin: 0, letterSpacing: '-0.2px' }}>Top Performers</h2>
              <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600', background: '#F1F5F9', padding: '4px 10px', borderRadius: '20px' }}>
                {topPerformers.length} players
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
              {topPerformers.map((player, idx) => {
                const medal = medalGradients[idx] || medalGradients[4];
                return (
                  <div key={player.playerId} style={{
                    background: surface, borderRadius: '16px', padding: '20px',
                    border: idx === 0 ? `2px solid ${medal.ring}60` : `1px solid ${border}`,
                    boxShadow: idx === 0 ? `0 8px 24px ${medal.shadow}` : '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'all 0.25s ease', position: 'relative', overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = `0 16px 32px ${medal.shadow}`;
                    e.currentTarget.style.borderColor = `${medal.ring}80`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = idx === 0 ? `0 8px 24px ${medal.shadow}` : '0 2px 8px rgba(0,0,0,0.04)';
                    e.currentTarget.style.borderColor = idx === 0 ? `${medal.ring}60` : border;
                  }}>
                    <div style={{
                      position: 'absolute', top: '14px', right: '14px',
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: medal.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: '800', color: 'white',
                      boxShadow: `0 4px 10px ${medal.shadow}`
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px',
                      background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', fontWeight: '800', color: '#6366F1',
                      marginBottom: '14px', border: `1.5px solid ${medal.ring}30`
                    }}>
                      {player.name?.charAt(0).toUpperCase()}
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: textPrimary, margin: '0 0 4px 0', paddingRight: '40px' }}>
                      {player.name}
                    </p>
                    <p style={{ fontSize: '12px', color: textMuted, margin: '0 0 16px 0', fontWeight: '500' }}>
                      {player.LearningPathway || 'Unassigned'}
                    </p>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 14px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
                      border: '1px solid #FDE68A'
                    }}>
                      <Trophy size={15} color="#D97706" />
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#92400E' }}>
                        {player.totalPoints?.toLocaleString() || 0} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
