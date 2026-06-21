import { useStore } from '../context/store';
import { LogOut, Loader, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Toast } from './Toast';
import { useTheme } from '../context/ThemeContext';

const PAGE_TITLES = {
  '/admin': 'Dashboard',
  '/admin/players': 'Players',
  '/admin/coaches': 'Coaches',
  '/admin/assign-players': 'Assign Players',
  '/admin/session-card': 'Session Cards',
  '/admin/attendance': 'Attendance',
  '/admin/manage-batches': 'Manage Batches',
  '/admin/learning-pathway': 'Learning Pathway',
  '/admin/rewards': 'Rewards',
  '/admin/redeem-history': 'Redemption History',
  '/admin/profile': 'Profile',
  '/coach': 'Dashboard',
  '/coach/players': 'My Players',
  '/coach/start-session': 'Start Session',
  '/coach/past-sessions': 'Past Sessions',
  '/coach/profile': 'Profile',
  '/leaderboard': 'Leaderboard',
};

export const Navbar = () => {
  const { currentUser, logout } = useStore();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const pageTitle = PAGE_TITLES[location.pathname] || 'CoachLife';

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const timestamp = new Date().getTime();
        const img = new Image();
        img.src = `https://www.gstatic.com/images/branding/product/1x/keep_2020q4_48dp.png?t=${timestamp}`;
        img.onload = () => setIsOnline(true);
        img.onerror = () => setIsOnline(false);
        setTimeout(() => { if (!img.complete) setIsOnline(false); }, 5000);
      } catch {
        setIsOnline(false);
      }
    };

    checkConnection();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const intervalId = setInterval(checkConnection, 10000);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const closeOnOutside = (e) => {
      if (showProfile && !e.target.closest('.navbar-profile-area')) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, [showProfile]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setToastMessage('Logged out successfully');
      setTimeout(() => navigate('/', { replace: true }), 800);
    } catch (error) {
      console.error('Logout error:', error);
      setToastMessage('Logout failed');
      setIsLoggingOut(false);
    }
  };

  const profilePath = currentUser?.role === 'admin' ? '/admin/profile' : '/coach/profile';
  const initials = currentUser?.name?.charAt(0).toUpperCase() || '?';

  return (
    <>
      {toastMessage && (
        <Toast message={toastMessage} type="success" duration={3000} onClose={() => setToastMessage('')} />
      )}

      <div className="navbar-main" style={{
        width: '100%',
        background: 'var(--cl-surface)',
        borderBottom: '1px solid var(--cl-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: 'var(--cl-shadow-sm)'
      }}>
        {/* Gradient accent bar */}
        <div style={{
          height: '3px',
          background: 'linear-gradient(90deg, #6366F1, #8B5CF6, #FB7185, #F59E0B, #FB7185, #8B5CF6, #6366F1)',
          backgroundSize: '300% 100%',
          animation: 'navbarFlow 4s linear infinite'
        }} />

        {/* Main bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          height: '58px'
        }}
        className="navbar-inner"
        >
          {/* Left - Page title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '3px', height: '20px', borderRadius: '2px',
              background: 'var(--cl-gradient)'
            }} />
            <h1 style={{
              fontSize: 'clamp(15px, 2.5vw, 18px)',
              fontWeight: '700',
              margin: 0,
              color: 'var(--cl-text)',
              letterSpacing: '-0.3px'
            }} className="navbar-title">
              {pageTitle}
            </h1>
          </div>

          {/* Right - Status + Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

            {/* Connection badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '5px 10px',
              background: isOnline ? 'var(--cl-emerald-tint)' : 'var(--cl-danger-tint)',
              color: isOnline ? 'var(--cl-success)' : 'var(--cl-danger)',
              borderRadius: '20px',
              fontSize: '11px', fontWeight: '600',
              letterSpacing: '0.3px',
              border: isOnline ? '1px solid var(--cl-emerald-tint)' : '1px solid var(--cl-danger-tint)'
            }} className="navbar-status-badge">
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: isOnline ? 'var(--cl-emerald)' : 'var(--cl-danger)',
                animation: isOnline ? 'navPulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : 'none'
              }} />
              {isOnline ? 'Online' : 'Offline'}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle color theme"
              style={{
                width: '38px', height: '38px',
                borderRadius: '10px',
                border: '2px solid var(--cl-border)',
                background: 'var(--cl-surface-2)',
                color: theme === 'dark' ? 'var(--cl-yellow)' : 'var(--cl-primary)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease', flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--cl-primary)';
                e.currentTarget.style.boxShadow = 'var(--cl-ring)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--cl-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Profile area */}
            <div style={{ position: 'relative' }} className="navbar-profile-area">
              <button
                onClick={() => setShowProfile(!showProfile)}
                style={{
                  width: '38px', height: '38px',
                  borderRadius: '10px',
                  border: showProfile ? '2px solid var(--cl-primary)' : '2px solid var(--cl-border)',
                  background: 'linear-gradient(135deg, rgb(6,0,48) 0%, rgb(26,0,96) 55%, rgb(59,0,128) 100%)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '14px', fontWeight: '700',
                  transition: 'all 0.2s ease',
                  boxShadow: showProfile ? 'var(--cl-ring)' : 'none'
                }}
                className="navbar-profile-button"
                onMouseEnter={(e) => {
                  if (!showProfile) e.currentTarget.style.boxShadow = '0 4px 12px rgba(20,184,166,0.35)';
                }}
                onMouseLeave={(e) => {
                  if (!showProfile) e.currentTarget.style.boxShadow = 'none';
                }}
                title="Profile"
              >
                {initials}
              </button>

              {showProfile && (
                <div style={{
                  position: 'absolute', top: '48px', right: 0,
                  width: '252px',
                  background: 'var(--cl-surface)',
                  borderRadius: '16px',
                  border: '1px solid var(--cl-border)',
                  boxShadow: 'var(--cl-shadow-lg)',
                  zIndex: 1000, overflow: 'hidden',
                  animation: 'dropIn 0.18s cubic-bezier(0.34,1.56,0.64,1)'
                }} className="navbar-profile-dropdown">
                  {/* Profile header */}
                  <div style={{
                    padding: '16px',
                    background: 'var(--cl-gradient-soft)',
                    borderBottom: '1px solid var(--cl-border)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px', height: '42px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, rgb(6,0,48) 0%, rgb(26,0,96) 55%, rgb(59,0,128) 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '16px', fontWeight: '700',
                        boxShadow: '0 4px 12px rgba(6,0,48,0.3)'
                      }}>
                        {initials}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: 'var(--cl-text)' }}>
                          {currentUser?.name}
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--cl-primary)', fontWeight: '600', textTransform: 'capitalize' }}>
                          {currentUser?.role}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div style={{ padding: '6px' }}>
                    {[
                      { label: 'View Profile', path: profilePath },
                      { label: 'My Account', path: profilePath },
                    ].map((item, idx) => (
                      <Link key={idx} to={item.path} style={{ textDecoration: 'none' }} onClick={() => setShowProfile(false)}>
                        <button style={{
                          width: '100%', padding: '9px 12px',
                          border: 'none', background: 'transparent',
                          cursor: 'pointer', textAlign: 'left',
                          fontSize: '13px', fontWeight: '500', color: 'var(--cl-text-2)',
                          borderRadius: '8px', transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--cl-surface-3)';
                          e.currentTarget.style.color = 'var(--cl-text)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--cl-text-2)';
                        }}>
                          {item.label}
                        </button>
                      </Link>
                    ))}
                  </div>

                  {/* Logout */}
                  <div style={{ padding: '6px', borderTop: '1px solid var(--cl-border)' }}>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      style={{
                        width: '100%', padding: '9px 12px',
                        background: 'rgba(239,68,68,0.06)',
                        border: '1px solid rgba(239,68,68,0.15)',
                        borderRadius: '8px', color: 'var(--cl-danger-strong)',
                        fontSize: '13px', fontWeight: '600',
                        cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        transition: 'all 0.15s ease', opacity: isLoggingOut ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!isLoggingOut) {
                          e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
                          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isLoggingOut) {
                          e.currentTarget.style.background = 'rgba(239,68,68,0.06)';
                          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)';
                        }
                      }}
                    >
                      {isLoggingOut
                        ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        : <LogOut size={14} />}
                      <span>{isLoggingOut ? 'Logging out...' : 'Sign out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes navbarFlow {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 0%; }
        }
        @keyframes navPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (max-width: 767px) {
          .navbar-inner { padding: 0 14px !important; }
          .navbar-status-badge { display: none !important; }
        }
        @media (min-width: 768px) and (max-width: 1024px) {
          .navbar-inner { padding: 0 20px !important; }
        }
      `}</style>
    </>
  );
};
