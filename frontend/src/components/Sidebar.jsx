import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../context/store';
import { useTheme } from '../context/ThemeContext';
import { Toast } from './Toast';
import logo from '../assets/favicon-white.png';
import {
  LayoutDashboard,
  Users,
  Gift,
  BarChart3,
  BookOpen,
  UserCheck,
  User,
  UserPen,
  LogOut,
  Loader,
  ChevronRight,
  Trophy,
  X,
  FileText,
  CalendarCheck,
  Layers,
} from 'lucide-react';

// Pages that live under /admin but are also reachable from the coach menu. Landing
// on one must NOT flip a coach's sidebar into admin mode.
const SHARED_ADMIN_PATHS = [
  '/admin/session-card',
  '/admin/view-session-card',
  '/admin/edit-session-card',
  '/admin/custom-generate-card',
  '/admin/manage-batches',
  '/admin/batches',
  '/admin/learning-pathway/add/activity',
];
const isSharedAdminPath = (pathname) => SHARED_ADMIN_PATHS.some(p => pathname.startsWith(p));

export const Sidebar = ({ onClose, isOpen = true }) => {
  const { currentUser, logout } = useStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [toastMessage, setToastMessage] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const userRoles = currentUser?.roles || [currentUser?.role].filter(Boolean);
  const isSuperAdmin = userRoles.includes('superadmin');
  const isAdmin = userRoles.includes('admin');
  const isCoach = userRoles.includes('coach');
  // Anyone holding both admin and coach gets the mode toggle - superAdmin sees the
  // full unrestricted admin menu on the admin side, a scoped (non-super) admin sees
  // the restricted admin menu instead. Either way the coach side is the normal
  // coach menu.
  const hasBothRoles = isAdmin && isCoach;
  const [activeMode, setActiveMode] = useState(() => {
    if (location.pathname.startsWith('/coach')) return 'coach';
    if (location.pathname.startsWith('/admin') && !isSharedAdminPath(location.pathname)) return 'admin';
    return localStorage.getItem('coachlife_active_mode') || (currentUser?.role === 'coach' ? 'coach' : 'admin');
  });

  useEffect(() => {
    if (location.pathname.startsWith('/coach')) {
      setActiveMode('coach');
      localStorage.setItem('coachlife_active_mode', 'coach');
    } else if (location.pathname.startsWith('/admin') && !isSharedAdminPath(location.pathname)) {
      // Shared pages (Session Card, Batches, …) live under /admin but are reachable
      // from the coach menu too - don't force the sidebar into admin mode there, so
      // a coach stays in the coach sidebar after opening them.
      setActiveMode('admin');
      localStorage.setItem('coachlife_active_mode', 'admin');
    }
  }, [location.pathname]);

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

  const handleNavigation = () => { if (onClose) onClose(); };

  const handleModeSwitch = (mode) => {
    setActiveMode(mode);
    localStorage.setItem('coachlife_active_mode', mode);
    navigate(mode === 'admin' ? '/admin' : '/coach');
    if (onClose) onClose();
  };

  const menuItems = {
    admin: [
      { label: 'Dashboard',       path: '/admin',                  icon: LayoutDashboard, color: '#818CF8' },
      { label: 'Players',          path: '/admin/players',          icon: Users,           color: '#34D399' },
      { label: 'Coaches',          path: '/admin/coaches',          icon: User,            color: '#60A5FA' },
      { label: 'Assign Players',   path: '/admin/assign-players',   icon: UserPen,         color: '#FBBF24' },
      { label: 'Session Card',     path: '/admin/session-card',     icon: FileText,        color: '#A78BFA' },
      { label: 'Attendance',       path: '/admin/attendance',       icon: CalendarCheck,   color: '#F472B6' },
      { label: 'Batches',          path: '/admin/manage-batches',   icon: Layers,          color: '#FB7185' },
      { label: 'Learning Pathway', path: '/admin/learning-pathway', icon: BookOpen,        color: '#6EE7B7' },
      { label: 'Leaderboard',      path: '/leaderboard',            icon: Trophy,          color: '#FCD34D' },
      { label: 'Rewards',          path: '/admin/rewards',          icon: Gift,            color: '#C084FC' },
      { label: 'Redemption',       path: '/admin/redeem-history',   icon: BarChart3,       color: '#2DD4BF' },
      { label: 'Profile',          path: '/admin/profile',          icon: UserCheck,       color: '#94A3B8' },
    ],
    coach: [
      { label: 'Dashboard',    path: '/coach',               icon: LayoutDashboard, color: '#818CF8' },
      { label: 'My Players',   path: '/coach/players',       icon: Users,           color: '#34D399' },
      { label: 'Session Card', path: '/admin/session-card',  icon: FileText,        color: '#A78BFA' },
      { label: 'Batches',      path: '/admin/manage-batches',icon: Layers,          color: '#FB7185' },
      { label: 'Leaderboard',  path: '/leaderboard',         icon: Trophy,          color: '#FCD34D' },
      { label: 'Start Session',path: '/coach/start-session', icon: BookOpen,        color: '#6EE7B7' },
      { label: 'Profile',      path: '/coach/profile',       icon: UserCheck,       color: '#94A3B8' },
    ],
    // Scoped admin (admin role without superAdmin) - no Coaches / Assign Players,
    // and all data-bearing pages here are limited server-side to the admin's own
    // assigned players/batches.
    restrictedAdmin: [
      { label: 'Dashboard',       path: '/admin',                  icon: LayoutDashboard, color: '#818CF8' },
      { label: 'Players',         path: '/admin/players',          icon: Users,           color: '#34D399' },
      { label: 'Session Card',    path: '/admin/session-card',     icon: FileText,        color: '#A78BFA' },
      { label: 'Attendance',      path: '/admin/attendance',       icon: CalendarCheck,   color: '#F472B6' },
      { label: 'Batches',         path: '/admin/manage-batches',   icon: Layers,          color: '#FB7185' },
      { label: 'Learning Pathway',path: '/admin/learning-pathway', icon: BookOpen,        color: '#6EE7B7' },
      { label: 'Leaderboard',     path: '/leaderboard',            icon: Trophy,          color: '#FCD34D' },
      { label: 'Rewards',         path: '/admin/rewards',          icon: Gift,            color: '#C084FC' },
      { label: 'Redemption',      path: '/admin/redeem-history',   icon: BarChart3,       color: '#2DD4BF' },
      { label: 'Profile',         path: '/admin/profile',          icon: UserCheck,       color: '#94A3B8' },
    ],
  };

  const sortItemsWithProfileLast = (items) => {
    const profileItem = items.find(i => i.label === 'Profile');
    const others = items.filter(i => i.label !== 'Profile');
    return profileItem ? [...others, profileItem] : items;
  };

  const getAllMenuItems = () => {
    if (hasBothRoles) {
      if (activeMode === 'coach') return sortItemsWithProfileLast(menuItems.coach);
      return sortItemsWithProfileLast(isSuperAdmin ? menuItems.admin : menuItems.restrictedAdmin);
    }
    if (!isSuperAdmin && isAdmin) {
      // Scoped admin only (no coach role) - restricted menu, no toggle.
      return sortItemsWithProfileLast(menuItems.restrictedAdmin);
    }
    const mode = currentUser?.role || userRoles[0];
    return sortItemsWithProfileLast(menuItems[mode] || []);
  };

  const items = currentUser ? getAllMenuItems() : [];
  const initials = currentUser?.name?.charAt(0).toUpperCase();
  const roleName = hasBothRoles
    ? (activeMode === 'admin' ? 'Admin' : 'Coach')
    : (!isSuperAdmin && isAdmin)
      ? 'Admin'
      : (currentUser?.role === 'admin' ? 'Admin' : currentUser?.role === 'coach' ? 'Coach' : 'Player');

  /* ---- colour shortcuts (pull from CSS vars at render time) ---- */
  const v = (name) => `var(${name})`;

  return (
    <>
      {toastMessage && (
        <Toast message={toastMessage} type="success" duration={3000} onClose={() => setToastMessage('')} />
      )}

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 99, display: 'none',
          }}
          className="sidebar-overlay"
          onClick={onClose}
        />
      )}

      <div
        style={{
          width: '280px',
          height: '100dvh',
          background: v('--cl-sb-bg'),
          boxShadow: v('--cl-sb-shadow'),
          borderRight: `1px solid ${v('--cl-sb-border')}`,
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 100,
          overflow: 'hidden',
          transition: 'background 0.3s ease, box-shadow 0.3s ease',
        }}
        className={`sidebar-container ${isOpen ? 'open' : ''}`}
      >
        {/* Dark-mode decorative overlay */}
        {dark && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            background: v('--cl-sb-overlay'),
          }} />
        )}

        {/* Mobile close button */}
        <div
          style={{
            display: 'none', position: 'absolute', top: '20px', right: '14px',
            background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(100,116,139,0.08)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(100,116,139,0.2)'}`,
            borderRadius: '8px', padding: '7px', cursor: 'pointer', zIndex: 110,
            color: dark ? 'white' : '#475569',
          }}
          className="sidebar-close-btn"
          onClick={onClose}
        >
          <X size={18} />
        </div>

        {/* ===== Header ===== */}
        <div style={{
          padding: 'clamp(14px, 2vw, 18px) clamp(14px, 2vw, 16px)',
          borderBottom: `1px solid ${v('--cl-sb-divider')}`,
          position: 'relative', zIndex: 1, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div className="logo-container" style={{
              width: 'clamp(36px, 6vw, 44px)',
              height: 'clamp(36px, 6vw, 44px)',
              borderRadius: '11px',
              background: 'linear-gradient(135deg, rgb(6,0,48) 0%, rgb(26,0,96) 55%, rgb(59,0,128) 100%)',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(6,0,48,0.5)',
              cursor: 'pointer', transition: 'all 0.3s ease', flexShrink: 0,
            }}>
              <img className="logo-img" src={logo} alt="CoachLife" style={{ width: 'clamp(28px, 5vw, 34px)', height: 'clamp(28px, 5vw, 34px)' }} />
            </div>
            <div>
              <h1 style={{
                fontSize: 'clamp(14px, 2.5vw, 17px)', fontWeight: '800', margin: 0,
                letterSpacing: '-0.2px', color: v('--cl-sb-heading'),
                transition: 'color 0.3s ease',
              }}>CoachLife</h1>
              <p style={{
                fontSize: 'clamp(9px, 1.3vw, 10px)', color: v('--cl-sb-sub'),
                margin: '2px 0 0 0', fontWeight: '500', letterSpacing: '0.3px',
                transition: 'color 0.3s ease',
              }}>Technology Garage</p>
            </div>
          </div>
        </div>

        {/* ===== Navigation ===== */}
        <nav style={{
          flex: 1, overflowY: 'auto', padding: 'clamp(10px, 1.5vw, 12px) clamp(7px, 1.2vw, 10px)',
          scrollBehavior: 'smooth', position: 'relative', zIndex: 1,
        }}>
          {/* Mode toggle (admin + coach roles) */}
          {hasBothRoles && (
            <div style={{
              marginBottom: '10px', padding: '3px',
              background: v('--cl-sb-toggle-bg'),
              borderRadius: '10px',
              border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--cl-border)',
              display: 'flex',
            }}>
              {['admin', 'coach'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleModeSwitch(mode)}
                  style={{
                    flex: 1, padding: '7px 10px',
                    borderRadius: '7px', border: 'none', cursor: 'pointer',
                    fontSize: 'clamp(10px, 1.5vw, 12px)', fontWeight: '700',
                    letterSpacing: '0.3px', transition: 'all 0.22s ease',
                    background: activeMode === mode ? 'linear-gradient(135deg, rgb(6,0,48) 0%, rgb(26,0,96) 55%, rgb(59,0,128) 100%)' : 'transparent',
                    color: activeMode === mode ? '#fff' : v('--cl-sb-toggle-text'),
                    boxShadow: activeMode === mode ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
                  }}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* Nav links */}
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleNavigation}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'clamp(8px, 1.4vw, 10px) clamp(9px, 1.6vw, 11px)',
                  margin: '2px 0',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  color: isActive ? v('--cl-sb-active-c') : v('--cl-sb-item'),
                  background: isActive ? v('--cl-sb-active-bg') : 'transparent',
                  borderLeft: isActive ? `3px solid ${v('--cl-sb-active-border')}` : '3px solid transparent',
                  transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
                  fontSize: 'clamp(12px, 1.9vw, 13px)',
                  fontWeight: isActive ? '700' : '500',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = v('--cl-sb-item-hover-bg');
                    e.currentTarget.style.color = v('--cl-sb-item-hover-c');
                    e.currentTarget.style.borderLeftColor = dark ? 'rgba(255,255,255,0.2)' : v('--cl-border-strong');
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = v('--cl-sb-item');
                    e.currentTarget.style.borderLeftColor = 'transparent';
                  }
                }}
                title={item.label}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(9px, 1.6vw, 11px)', flex: 1 }}>
                  <div style={{
                    width: 'clamp(27px, 4.5vw, 30px)', height: 'clamp(27px, 4.5vw, 30px)',
                    borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isActive
                      ? (dark ? `${item.color}25` : `${item.color}18`)
                      : v('--cl-sb-icon-bg'),
                    color: isActive ? item.color : v('--cl-sb-icon-c'),
                    transition: 'all 0.18s ease', flexShrink: 0,
                  }}>
                    <Icon size={14} />
                  </div>
                  <span style={{ letterSpacing: '0.1px' }}>{item.label}</span>
                </div>

                {/* Animated active dot */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: item.color, flexShrink: 0,
                        boxShadow: `0 0 6px ${item.color}`,
                      }}
                    />
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div style={{ height: '1px', background: v('--cl-sb-divider'), margin: '0 10px', position: 'relative', zIndex: 1 }} />

        {/* ===== Footer ===== */}
        <div style={{
          padding: 'clamp(10px, 1.6vw, 14px)', display: 'flex', flexDirection: 'column',
          gap: '8px', position: 'relative', zIndex: 1, flexShrink: 0,
        }}>
          {/* User card */}
          <div style={{
            padding: 'clamp(9px, 1.4vw, 11px)',
            borderRadius: '11px',
            background: v('--cl-sb-user-bg'),
            border: `1px solid ${v('--cl-sb-user-border')}`,
            display: 'flex', gap: '9px', alignItems: 'center',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : '#F1F5F9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = v('--cl-sb-user-bg');
          }}
          >
            <div style={{
              width: 'clamp(32px, 5.5vw, 38px)', height: 'clamp(32px, 5.5vw, 38px)',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, rgb(6,0,48) 0%, rgb(26,0,96) 55%, rgb(59,0,128) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'clamp(12px, 2vw, 14px)', fontWeight: '800',
              color: '#fff', flexShrink: 0,
              boxShadow: '0 4px 10px rgba(6,0,48,0.4)',
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0, fontSize: 'clamp(11px, 1.7vw, 12px)', fontWeight: '700',
                color: v('--cl-sb-user-name'),
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                transition: 'color 0.3s ease',
              }}>
                {currentUser?.name}
              </p>
              <span style={{
                display: 'inline-block', marginTop: '2px',
                padding: '1px 7px', borderRadius: '4px',
                background: v('--cl-sb-badge-bg'),
                border: `1px solid ${v('--cl-sb-badge-border')}`,
                fontSize: 'clamp(9px, 1.2vw, 10px)', fontWeight: '700',
                color: v('--cl-sb-badge-c'),
                textTransform: 'capitalize', letterSpacing: '0.3px',
              }}>
                {roleName}
              </span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: 'clamp(9px, 1.4vw, 10px)',
              background: v('--cl-sb-logout-bg'),
              border: `1px solid ${v('--cl-sb-logout-border')}`,
              borderRadius: '10px',
              color: v('--cl-sb-logout-c'),
              fontSize: 'clamp(11px, 1.7vw, 12px)', fontWeight: '700',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '7px',
              transition: 'all 0.18s ease', letterSpacing: '0.2px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = dark ? 'rgba(239,68,68,0.18)' : '#FEE2E2';
              e.currentTarget.style.borderColor = dark ? 'rgba(239,68,68,0.4)' : '#FECACA';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = v('--cl-sb-logout-bg');
              e.currentTarget.style.borderColor = v('--cl-sb-logout-border');
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            aria-label="Logout"
          >
            {isLoggingOut
              ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
              : <LogOut size={13} />}
            <span>{isLoggingOut ? 'Logging out…' : 'Logout'}</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .logo-img { transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), filter 0.3s ease; }
        .logo-container:hover .logo-img {
          transform: scale(1.1) rotate(-4deg);
          filter: brightness(1.15) drop-shadow(0 4px 8px rgba(99,102,241,0.5));
        }
        nav::-webkit-scrollbar { width: 4px; }
        nav::-webkit-scrollbar-track { background: transparent; }
        nav::-webkit-scrollbar-thumb { background: var(--cl-sb-divider); border-radius: 2px; }

        @media (max-width: 1024px) { .sidebar-container { width: 244px !important; } }
        @media (max-width: 768px) {
          .sidebar-overlay { display: block !important; }
          .sidebar-container {
            width: 268px !important;
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
          }
          .sidebar-container.open {
            transform: translateX(0);
            box-shadow: 4px 0 32px rgba(0,0,0,0.35);
          }
          .sidebar-close-btn { display: flex !important; align-items: center; justify-content: center; }
        }
        @media (max-width: 480px) { .sidebar-container { width: 100% !important; max-width: 268px; } }
      `}</style>
    </>
  );
};
