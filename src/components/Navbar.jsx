import { useStore } from '../context/store';
import { LogOut, Search, Menu, User, Loader } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Toast } from './Toast';

export const Navbar = () => {
  const { currentUser, logout } = useStore();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Function to reliably check internet connectivity
    const checkConnection = async () => {
      try {
        // Use a simple image ping - fastest and most reliable
        const timestamp = new Date().getTime();
        const img = new Image();
        img.src = `https://www.gstatic.com/images/branding/product/1x/keep_2020q4_48dp.png?t=${timestamp}`;
        
        img.onload = () => {
          setIsOnline(true);
        };
        
        img.onerror = () => {
          setIsOnline(false);
        };
        
        // Timeout after 5 seconds
        setTimeout(() => {
          if (img.complete === false) {
            setIsOnline(false);
          }
        }, 5000);
        
      } catch {
        setIsOnline(false);
      }
    };

    // Check immediately
    checkConnection();

    // Listen to online/offline events
    const handleOnline = () => {
      setIsOnline(true);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection every 10 seconds instead of 3 (reduced frequency for better performance)
    const intervalId = setInterval(checkConnection, 10000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, []);

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
    <div style={{
      width: '100%',
      height: '90px',
      background: 'linear-gradient(90deg, #FFFFFF 0%, #F8FAFC 100%)',
      borderBottom: '2px solid #E2E8F0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px 0 90px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}
    className="navbar-main"
    >
      <style>{`
        @media (min-width: 768px) and (max-width: 1024px) {
          .navbar-main {
            minHeight: 70px !important;
            padding: 0 32px 0 80px !important;
          }
          .navbar-title {
            fontSize: 20px !important;
          }
          .navbar-actions {
            gap: 8px !important;
          }
          .navbar-button {
            width: 38px !important;
            height: 38px !important;
          }
          .navbar-status-badge {
            fontSize: 10px !important;
            padding: 5px 10px !important;
          }
          .navbar-profile-dropdown {
            width: 240px !important;
            right: -50px !important;
          }
        }
        @media (max-width: 767px) {
          .navbar-main {
            minHeight: 60px !important;
            padding: 0 16px 0 70px !important;
          }
          .navbar-title {
            fontSize: 18px !important;
          }
          .navbar-actions {
            gap: 8px !important;
          }
          .navbar-button {
            width: 36px !important;
            height: 36px !important;
          }
          .navbar-status-badge {
            fontSize: 9px !important;
            padding: 4px 8px !important;
          }
          .navbar-profile-dropdown {
            position: fixed !important;
            width: calc(100vw - 32px) !important;
            max-width: 340px !important;
            right: 16px !important;
            left: auto !important;
            top: 70px !important;
          }
        }
        @media (min-width: 1025px) {
          .navbar-main {
            minHeight: 90px !important;
            padding: 0 32px !important;
          }
          .navbar-title {
            fontSize: 24px !important;
          }
          .navbar-status-badge {
            fontSize: 11px !important;
            padding: 6px 12px !important;
          }
          .navbar-profile-button {
            width: 42px !important;
            height: 42px !important;
            fontSize: 16px !important;
          }
          .navbar-profile-dropdown {
            width: 260px !important;
          }
        }
      `}</style>
      {/* Left Section - Title & Breadcrumb */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #000000ff, #060030ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            letterSpacing: '-0.5px'
          }}
          className="navbar-title"
          >
            CoachLife
          </h1>
          
        </div>
      </div>

      {/* Right Section - Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}
      className="navbar-actions"
      >

        {/* Status Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          backgroundColor: isOnline ? '#d2f8ddff' : '#fde9e9ff',
          color: isOnline ? '#15803d' : '#DC2626',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          border: isOnline ? '1px solid #DCFCE7' : '1px solid #FECACA'
        }}
        className="navbar-status-badge"
        >
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: isOnline ? '#15803d' : '#DC2626',
            animation: isOnline ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
          }} />
          {isOnline ? 'Online' : 'Offline'}
        </div>
        



        {/* Profile */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setShowProfile(!showProfile);
            }}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              border: '1.5px solid #E5E7EB',
              background: 'linear-gradient(135deg, #000000ff, #060030ff)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              transition: 'all 0.3s ease'
            }}
            className="navbar-profile-button"
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 44, 53, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
            title="Profile"
          >
            {currentUser?.name?.charAt(0).toUpperCase()}
          </button>

          {/* Profile Dropdown */}
          {showProfile && (
            <div style={{
              position: 'absolute',
              top: '52px',
              right: 0,
              width: '260px',
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1.5px solid #E5E7EB',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
              zIndex: 1000,
              overflow: 'hidden'
            }}
            className="navbar-profile-dropdown"
            >
              <div style={{
                padding: '16px',
                borderBottom: '1px solid #E5E7EB'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}>
                    {currentUser?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#111827'
                    }}>
                      {currentUser?.name}
                    </p>
                    <p style={{
                      margin: '4px 0 0 0',
                      fontSize: '11px',
                      color: '#64748B',
                      textTransform: 'capitalize'
                    }}>
                      {currentUser?.role}
                    </p>
                  </div>
                </div>
              </div>
              {[
                { label: 'View Profile', path: currentUser?.role === 'admin' ? '/admin/profile' : '/coach/profile' },
                { label: 'My Account', path: currentUser?.role === 'admin' ? '/admin/profile' : '/coach/profile' },
              ].map((item, idx) => (
                <Link
                  key={idx}
                  to={item.path}
                  style={{ textDecoration: 'none' }}
                  onClick={() => setShowProfile(false)}
                >
                  <button
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#111827',
                      borderBottom: idx < 1 ? '1px solid #F3F4F6' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                  >
                    {item.label}
                  </button>
                </Link>
              ))}
              <div style={{
                padding: '12px 16px',
                borderTop: '1px solid #E5E7EB'
              }}>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1.5px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: '#EF4444',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.3s ease',
                    opacity: isLoggingOut ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoggingOut) {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                      e.currentTarget.style.color = '#DC2626';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoggingOut) {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                      e.currentTarget.style.color = '#EF4444';
                    }
                  }}
                >
                  {isLoggingOut ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <LogOut size={16} />}
                  <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
    </>
  );
};


