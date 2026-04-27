import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useStore } from '../context/store';
import { Button } from './Button';
import { Toast } from './Toast';
import logo from '../assets/favicon-white.png'; // If you need to use the image, use this syntax
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Target, 
  Gift, 
  BarChart3, 
  BookOpen,
  UserCheck,
  Zap,
  User,
  UserPen,
  LogOut,
  Loader,
  Home,
  ChevronRight,
  Menu,
  Trophy,
  X,
  FileText
} from 'lucide-react';

export const Sidebar = ({ onClose, isOpen = true }) => {
  const { currentUser, logout } = useStore();
  const [toastMessage, setToastMessage] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      // Show success toast
      setToastMessage('Logged out successfully');
      // Navigate after toast duration (ensure auth state is fully cleared)
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 800);
    } catch (error) {
      console.error('Logout error:', error);
      setToastMessage('Logout failed');
      setIsLoggingOut(false);
    }
  };

  const handleNavigation = () => {
    if (onClose) {
      onClose();
    }
  };

  const menuItems = {
    admin: [
      { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
      { label: 'Players', path: '/admin/players', icon: Users },
      { label: 'Coaches', path: '/admin/coaches', icon: User },
      { label: 'Assign Players', path: '/admin/assign-players', icon: UserPen },
      { label: 'Session Card', path: '/admin/session-card', icon: FileText },
      { label: 'Learning Pathway', path: '/admin/learning-pathway', icon: BookOpen },
      { label: "Leaderboard", path: '/leaderboard', icon: Trophy },
      { label: 'Rewards', path: '/admin/rewards', icon: Gift },
      { label: 'Redemption', path: '/admin/redeem-history', icon: BarChart3 },
      { label: 'Profile', path: '/admin/profile', icon: UserCheck },
    ],
    coach: [
      { label: 'Dashboard', path: '/coach', icon: LayoutDashboard },
      { label: 'My Players', path: '/coach/players', icon: Users },
      { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
      { label: 'Start Session', path: '/coach/start-session', icon: BookOpen },
      { label: 'Profile', path: '/coach/profile', icon: UserCheck },
    ],
  };

  // Get all menu items for users with multiple roles
  const getAllMenuItems = () => {
    const userRoles = currentUser?.roles || [currentUser?.role];
    
    // If single role, use original behavior
    if (userRoles.length === 1) {
      const items = menuItems[userRoles[0]] || [];
      return sortItemsWithProfileLast(items);
    }
    
    // For multiple roles, merge items intelligently
    const itemsByLabel = new Map();
    
    // Collect items from all roles
    userRoles.forEach(role => {
      const roleItems = menuItems[role] || [];
      roleItems.forEach(item => {
        if (!itemsByLabel.has(item.label)) {
          itemsByLabel.set(item.label, []);
        }
        itemsByLabel.get(item.label).push(item);
      });
    });
    
    // Convert to flat array, excluding duplicate labels
    const result = [];
    const seenLabels = new Set();
    
    userRoles.forEach(role => {
      const roleItems = menuItems[role] || [];
      roleItems.forEach(item => {
        // Skip if we've already added this label
        if (!seenLabels.has(item.label)) {
          // For duplicates (like Profile), prefer admin version if available
          const itemsWithLabel = itemsByLabel.get(item.label);
          let selectedItem = item;
          
          if (itemsWithLabel.length > 1) {
            // For Profile, prefer /admin/profile if user has admin role
            if (item.label === 'Profile' && userRoles.includes('admin')) {
              selectedItem = itemsWithLabel.find(i => i.path === '/admin/profile') || itemsWithLabel[0];
            } else {
              selectedItem = itemsWithLabel[0];
            }
          }
          
          result.push(selectedItem);
          seenLabels.add(item.label);
        }
      });
    });
    
    return sortItemsWithProfileLast(result);
  };

  // Helper function to move Profile to the end
  const sortItemsWithProfileLast = (items) => {
    const profileItem = items.find(item => item.label === 'Profile');
    const otherItems = items.filter(item => item.label !== 'Profile');
    
    if (profileItem) {
      return [...otherItems, profileItem];
    }
    return items;
  };

  const items = currentUser ? getAllMenuItems() : [];

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <Toast 
          message={toastMessage} 
          type="success" 
          duration={3000}
          onClose={() => setToastMessage('')}
        />
      )}
      
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(185, 21, 21, 0.5)',
            zIndex: 99,
            display: 'none'
          }}
          className="sidebar-overlay"
          onClick={onClose}
        />
      )}

    <div style={{
      width: 'clamp(200px, 25vw, 280px)',
      height: '100dvh',
      background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
      color: 'white',
      overflow: 'hidden',
      transition: 'transform 0.3s ease, left 0.3s ease'
    }}
    className={`sidebar-container ${isOpen ? 'open' : ''}`}
    >
      {/* Close Button - Mobile Only */}
      <div style={{
        display: 'none',
        position: 'absolute',
        top: '25px',
        right: '16px',
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        padding: '8px',
        cursor: 'pointer',
        zIndex: 110,
        color: 'white'
      }}
      className="sidebar-close-btn"
      onClick={onClose}
      title="Close sidebar"
      >
        <X size={20} />
      </div>

      {/* Header */}
      <div style={{
        padding: 'clamp(12px, 2vw, 18px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'transparent',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(12px, 2vw, 15px)',
        }}>
          <div className="logo-container" style={{
            width: 'clamp(40px, 8vw, 50px)',
            height: 'clamp(40px, 8vw, 50px)',
            borderRadius: 'clamp(4px, 1vw, 6px)',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            boxShadow: 'rgba(255, 255, 255, 0.17) 0px -23px 25px 0px inset, rgba(255, 255, 255, 0.15) 0px -36px 30px 0px inset, rgba(255, 255, 255, 0.1) 0px -79px 40px 0px inset, rgba(255, 255, 255, 0.06) 0px 2px 1px, rgba(255, 255, 255, 0.09) 0px 4px 2px, rgba(255, 255, 255, 0.09) 0px 8px 4px, rgba(255, 255, 255, 0.09) 0px 16px 8px, rgba(255, 255, 255, 0.09) 12px 15px 16px',
            flexShrink: 0,
            backdropFilter: 'blur(8px)',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}>
            <img className="logo-img" src={logo} alt="CoachLife Logo" style={{ width: 'clamp(40px, 8vw, 50px)', height: 'clamp(40px, 8vw, 50px)' }} />
          </div>
          <div>
            <h1 style={{
              fontSize: 'clamp(16px, 3vw, 20px)',
              fontWeight: 'bold',
              margin: 0,
              letterSpacing: '0.5px',
              color: '#e8eef5',
              textShadow: '0 2px 8px rgba(100, 65, 165, 0.3)'
            }}>CoachLife</h1>
            <p style={{
              fontSize: 'clamp(9px, 1.5vw, 11px)',
              color: 'rgba(255, 255, 255, 0.5)',
              margin: '2px 0 0 0',
              fontWeight: '500',
              letterSpacing: '0.2px'
            }}>Technology Garage</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{
        flex: 1,
        overflowY: 'auto',
        padding: 'clamp(12px, 2vw, 18px) clamp(6px, 1vw, 8px)',
        scrollBehavior: 'smooth'
      }}>
        

        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleNavigation}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'clamp(10px, 2vw, 12px) clamp(12px, 2.5vw, 14px)',
                margin: 'clamp(4px, 0.8vw, 6px) 0',
                borderRadius: 'clamp(8px, 1.5vw, 10px)',
                textDecoration: 'none',
                color: isActive ? '#dde3e8' : 'rgba(255, 255, 255, 0.75)',
                background: isActive ? 'rgba(255, 255, 255, 0.3)' : 'transparent',
                border: isActive ? '1.5px solid #ffffffff' : '1.5px solid transparent',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                position: 'relative',
                fontSize: 'clamp(12px, 2.2vw, 14px)',
                fontWeight: isActive ? '600' : '500',
                boxShadow: isActive ? '0 4px 12px rgba(82, 102, 129, 0.1)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateX(6px)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
              title={item.label}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 2vw, 14px)', flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 'clamp(16px, 3vw, 20px)'
                }}>
                  <Icon size={20} />
                </div>
                <span style={{ letterSpacing: '0.3px' }}>{item.label}</span>
              </div>
              {isActive && (
                <ChevronRight 
                  size={18} 
                  style={{
                    transition: 'transform 0.3s ease',
                    transform: 'scaleX(1.2)'
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div style={{
        height: '1px',
        background: 'rgba(255, 255, 255, 0.1)',
        margin: '8px 0'
      }} />

      {/* Footer */}
      <div style={{
        padding: 'clamp(12px, 2vw, 16px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(10px, 2vw, 12px)',
      }}>
        {/* User Card */}
        <div style={{
          padding: 'clamp(10px, 2vw, 14px) clamp(10px, 2vw, 12px)',
          borderRadius: 'clamp(10px, 1.5vw, 12px)',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          gap: 'clamp(10px, 2vw, 12px)',
          alignItems: 'center',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        }}
        >
          <div style={{
            width: 'clamp(36px, 7vw, 44px)',
            height: 'clamp(36px, 7vw, 44px)',
            borderRadius: 'clamp(10px, 1.5vw, 12px)',
            background: '#ffffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'clamp(14px, 2.5vw, 16px)',
            fontWeight: 'bold',
            color: '#000000ff',
            flexShrink: 0,
            boxShadow: '0 4px 8px #000000ff'
          }}>
            {currentUser?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0,
              fontSize: 'clamp(11px, 2vw, 13px)',
              fontWeight: '600',
              color: 'white',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '0.3px'
            }}>
              {currentUser?.name}
            </p>
            <div style={{
              margin: 'clamp(2px, 0.5vw, 3px) 0 0 0',
              fontSize: 'clamp(9px, 1.5vw, 11px)',
              color: 'rgba(255, 255, 255, 0.6)',
              fontWeight: '500',
              display: 'flex',
              gap: '4px',
              flexWrap: 'wrap'
            }}>
              {currentUser?.roles && currentUser.roles.length > 0 ? (
                currentUser.roles.map((role) => (
                  <span 
                    key={role}
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.15)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      textTransform: 'capitalize',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {role === 'admin' ? 'Admin' : role === 'coach' ? 'Coach' : 'Player'}
                  </span>
                ))
              ) : (
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  textTransform: 'capitalize'
                }}>
                  {currentUser?.role === 'admin' ? 'Admin' : currentUser?.role === 'coach' ? 'Coach' : 'Player'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: 'clamp(10px, 2vw, 11px) clamp(12px, 2.5vw, 14px)',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid rgba(255, 255, 255, 0.6)',
            borderRadius: 'clamp(8px, 1.5vw, 10px)',
            color: '#ffffffff',
            fontSize: 'clamp(12px, 2vw, 13px)',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'clamp(6px, 1vw, 8px)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            letterSpacing: '0.3px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 0, 0, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
          }}
          title="Logout"
          aria-label="Logout"
        >
          {isLoggingOut ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <LogOut size={16} />}
          <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
        </button>
      </div>
    </div>

    <style>{`
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
      }
      @keyframes logoLoad {
        from {
          opacity: 0;
          transform: scale(0.8) translateY(-10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      .logo-container {
        animation: logoLoad 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, float 3s ease-in-out infinite;
        animation-delay: 0s, 0.6s;
      }
      .logo-container:hover {
        animation-play-state: paused;
      }
      .logo-img {
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease;
      }
      .logo-container:hover .logo-img {
        transform: scale(1.1) rotate(-5deg);
        filter: brightness(1.2) drop-shadow(0 4px 12px rgba(124, 58, 237, 0.4));
      }
      
      /* Responsive Sidebar */
      @media (max-width: 1024px) {
        .sidebar-container {
          width: 240px !important;
        }
      }

      @media (max-width: 768px) {
        .sidebar-overlay {
          display: block !important;
        }

        .sidebar-container {
          width: 280px !important;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          left: 0 !important;
        }

        .sidebar-container.open {
          transform: translateX(0);
          box-shadow: 2px 0 16px rgba(0, 0, 0, 0.3);
        }

        .sidebar-close-btn {
          display: flex !important;
          align-items: center;
          justify-content: center;
        }
      }

      @media (max-width: 480px) {
        .sidebar-container {
          width: 100% !important;
          max-width: 280px;
        }

        .sidebar-close-btn {
          display: flex !important;
        }
      }
    `}</style>
    </>
  );
};


