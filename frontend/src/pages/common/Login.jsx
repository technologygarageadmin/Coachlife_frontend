import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { LogIn, Lock, Mail, AlertCircle, ChevronRight, BarChart3, Target, Trophy, ArrowLeft, Loader } from 'lucide-react';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Clear old cache from device when sign in is clicked (but preserve auth data)
    // Get all localStorage keys and clear specific old cache keys, not everything
    const keysToPreserve = ['coachlife_auth', 'coachlife-store']; // Keys used by our app
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!keysToPreserve.includes(key)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove old cache keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    try {
      ('Attempting login with:', { username });
      const result = await login(username, password);
      ('Login result:', result);
      
      if (result.success) {
        // Handle multi-role users
        const userRoles = result.user.roles || [result.user.role];
        
        // If user has admin role, navigate to admin dashboard
        if (userRoles.includes('admin')) {
          navigate('/admin');
        } else if (userRoles.includes('coach')) {
          navigate('/coach');
        } else {
          navigate(`/${result.user.role}`);
        }
      } else {
        console.error('Login failed:', result.error);
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error details:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-wrapper">
      <style>{`
        .login-wrapper {
          min-height: 100vh;
          display: flex;
          background: #f8f9fa;
          position: relative;
          width: 100%;
          box-sizing: border-box;
        }

        .back-to-home-btn {
          position: absolute;
          top: 20px;
          left: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          color: #252c35;
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: 100;
        }

        .back-to-home-btn:hover {
          background: #252c35;
          color: white;
          box-shadow: 0 2px 8px rgba(37, 44, 53, 0.2);
        }

        .login-left {
          flex: 1;
          background: linear-gradient(135deg, #060030ff 0%, #000000ff 100%);
          color: white;
          padding: 60px 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          width: 100%;
        }

        .login-left-content {
          max-width: 450px;
        }

        .login-logo-large {
          font-size: 48px;
          margin-bottom: 20px;
          opacity: 0.95;
        }

        .login-left-title {
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }

        .login-left-text {
          font-size: 14px;
          opacity: 0.9;
          line-height: 1.6;
          margin-bottom: 32px;
        }

        .login-features {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .login-feature-item {
          display: flex;
          gap: 12px;
        }

        .login-feature-icon {
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .login-feature-item h4 {
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 4px 0;
        }

        .login-feature-item p {
          font-size: 12px;
          opacity: 0.85;
          margin: 0;
        }

        .login-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          box-sizing: border-box;
          width: 100%;
        }

        .login-form-container {
          width: 100%;
          max-width: 400px;
          background: white;
          padding: 32px;
          border-radius: 8px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          border: 1px solid #e5e7eb;
        }

        .login-form-header h2 {
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 6px;
          color: #1f2937;
        }

        .login-form-header p {
          font-size: 13px;
          color: #6b7280;
          margin: 0 0 24px 0;
        }

        .login-error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #991b1b;
          padding: 12px 14px;
          border-radius: 6px;
          font-size: 13px;
          margin-bottom: 20px;
        }

        .login-form-main {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 20px;
        }

        .login-submit-btn {
          background: linear-gradient(135deg, #060030ff 0%, #000000ff 100%) !important;
          color: white !important;
          border: none !important;
          padding: 12px !important;
          font-weight: 700 !important;
          border-radius: 6px !important;
          font-size: 14px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
        }

        .login-submit-btn:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(37, 44, 53, 0.3);
        }

        .login-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-divider-new {
          text-align: center;
          margin-bottom: 20px;
          font-size: 13px;
          color: #6b7280;
          font-weight: 600;
        }

        .demo-logins {
          padding-top: 16px;
        }

        .demo-title {
          font-size: 12px;
          color: #6b7280;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .demo-buttons-new {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .demo-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          background: #f8f9fa;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .demo-btn:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border-color: #252c35;
        }

        .demo-btn-admin:hover {
          background: #252c35;
          color: white;
          border-color: #252c35;
        }

        .demo-btn-coach:hover {
          background: #060030ff;
          color: white;
          border-color: #060030ff;
        }

        @media (max-width: 1024px) {
          .login-wrapper {
            flex-direction: column;
          }

          .login-left {
            padding: 40px 20px;
            min-height: 280px;
          }

          .login-right {
            padding: 30px 20px;
          }

          .login-form-container {
            max-width: 100%;
            width: 100%;
          }

          .login-logo-large {
            font-size: 44px;
            margin-bottom: 16px;
          }

          .login-left-title {
            font-size: 28px;
            margin-bottom: 10px;
          }

          .login-left-text {
            font-size: 13px;
            margin-bottom: 24px;
          }

          .login-features {
            gap: 12px;
          }

          .login-feature-icon {
            width: 36px;
            height: 36px;
          }

          .login-feature-item h4 {
            font-size: 13px;
          }

          .login-feature-item p {
            font-size: 11px;
          }
        }

        /* Tablet Portrait */
        @media (max-width: 768px) {
          .login-wrapper {
            flex-direction: column;
          }

          .back-to-home-btn {
            top: 16px;
            left: 16px;
            padding: 8px 12px;
            font-size: 12px;
          }

          .login-left {
            padding: 30px 20px;
            min-height: 240px;
          }

          .login-right {
            padding: 24px 20px;
            min-height: auto;
          }

          .login-form-container {
            max-width: 100%;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          }

          .login-form-header h2 {
            font-size: 22px;
            margin-bottom: 6px;
          }

          .login-form-header p {
            font-size: 12px;
            margin-bottom: 20px;
          }

          .login-logo-large {
            font-size: 40px;
            margin-bottom: 14px;
          }

          .login-left-title {
            font-size: 26px;
            margin-bottom: 10px;
          }

          .login-left-text {
            font-size: 12px;
            margin-bottom: 20px;
            line-height: 1.5;
          }

          .login-features {
            gap: 12px;
          }

          .login-feature-icon {
            width: 36px;
            height: 36px;
          }

          .login-feature-item {
            gap: 10px;
          }

          .login-feature-item h4 {
            font-size: 12px;
            margin: 0 0 2px 0;
          }

          .login-feature-item p {
            font-size: 10px;
          }

          .login-form-main {
            gap: 14px;
            margin-bottom: 16px;
          }

          .login-error-banner {
            padding: 10px 12px;
            font-size: 12px;
            margin-bottom: 16px;
          }

          .login-submit-btn {
            padding: 11px !important;
            font-size: 13px !important;
          }

          .demo-buttons-new {
            gap: 10px;
          }

          .demo-btn {
            padding: 8px;
            font-size: 11px;
          }
        }

        /* Small Mobile */
        @media (max-width: 480px) {
          .login-wrapper {
            flex-direction: column;
            background: #ffffff;
          }

          .back-to-home-btn {
            top: 12px;
            left: 12px;
            padding: 8px 10px;
            font-size: 11px;
            gap: 4px;
          }

          .login-left {
            padding: 24px 16px;
            min-height: 220px;
          }

          .login-left-content {
            max-width: 100%;
          }

          .login-right {
            padding: 16px;
            min-height: auto;
          }

          .login-form-container {
            max-width: 100%;
            padding: 20px;
            border-radius: 6px;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
          }

          .login-form-header h2 {
            font-size: 20px;
            margin-bottom: 4px;
          }

          .login-form-header p {
            font-size: 11px;
            margin-bottom: 16px;
          }

          .login-logo-large {
            font-size: 36px;
            margin-bottom: 12px;
          }

          .login-left-title {
            font-size: 24px;
            margin-bottom: 8px;
            letter-spacing: -0.3px;
          }

          .login-left-text {
            font-size: 11px;
            margin-bottom: 16px;
            line-height: 1.4;
          }

          .login-features {
            gap: 10px;
          }

          .login-feature-icon {
            width: 34px;
            height: 34px;
            border-radius: 6px;
          }

          .login-feature-item {
            gap: 10px;
          }

          .login-feature-item h4 {
            font-size: 11px;
            font-weight: 700;
            margin: 0 0 2px 0;
          }

          .login-feature-item p {
            font-size: 9px;
            line-height: 1.3;
          }

          .login-form-main {
            gap: 12px;
            margin-bottom: 12px;
          }

          .login-error-banner {
            padding: 8px 10px;
            font-size: 11px;
            margin-bottom: 12px;
            gap: 6px;
          }

          .login-submit-btn {
            padding: 10px !important;
            font-size: 12px !important;
            gap: 6px !important;
          }

          div[style*="marginBottom: '16px'"] {
            margin-bottom: 12px !important;
          }

          .demo-title {
            font-size: 11px;
            margin-bottom: 10px;
          }

          .demo-buttons-new {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .demo-btn {
            padding: 8px;
            font-size: 10px;
            gap: 4px;
          }

          a {
            font-size: 11px;
          }
        }

        /* Extra Small Mobile */
        @media (max-width: 360px) {
          .login-wrapper {
            flex-direction: column;
            min-height: 100vh;
          }

          .back-to-home-btn {
            top: 10px;
            left: 10px;
            padding: 6px 8px;
            font-size: 10px;
            gap: 3px;
            border-radius: 4px;
          }

          .login-left {
            padding: 20px 12px;
            min-height: 200px;
          }

          .login-right {
            padding: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: auto;
          }

          .login-form-container {
            width: 100%;
            padding: 16px;
            border-radius: 6px;
          }

          .login-form-header h2 {
            font-size: 18px;
            margin-bottom: 3px;
          }

          .login-form-header p {
            font-size: 10px;
            margin-bottom: 14px;
          }

          .login-logo-large {
            font-size: 32px;
            margin-bottom: 10px;
          }

          .login-left-title {
            font-size: 22px;
            margin-bottom: 6px;
          }

          .login-left-text {
            font-size: 10px;
            margin-bottom: 14px;
            line-height: 1.3;
          }

          .login-features {
            gap: 8px;
          }

          .login-feature-icon {
            width: 32px;
            height: 32px;
            border-radius: 5px;
          }

          .login-feature-item {
            gap: 8px;
          }

          .login-feature-item h4 {
            font-size: 10px;
            margin: 0 0 1px 0;
          }

          .login-feature-item p {
            font-size: 8px;
            line-height: 1.2;
          }

          .login-form-main {
            gap: 10px;
            margin-bottom: 10px;
          }

          .login-error-banner {
            padding: 6px 8px;
            font-size: 10px;
            margin-bottom: 10px;
            gap: 4px;
          }

          .login-submit-btn {
            padding: 9px !important;
            font-size: 11px !important;
            gap: 4px !important;
          }

          .demo-title {
            font-size: 10px;
            margin-bottom: 8px;
          }

          .demo-buttons-new {
            gap: 6px;
          }

          .demo-btn {
            padding: 6px;
            font-size: 9px;
            gap: 2px;
            border-radius: 4px;
          }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <button 
        className="back-to-home-btn"
        onClick={() => navigate('/')}
        title="Go back to home page"
      >
        <ArrowLeft size={16} /> Back to Home
      </button>

      <div className="login-left">
        <div className="login-left-content" data-aos="fade-up" data-aos-duration="800">
          <div className="login-logo-large">
            <LogIn size={48} />
          </div>
          <h1 className="login-left-title">Welcome Back</h1>
          <p className="login-left-text">Sign in to your CoachLife account to continue your journey in player development</p>
          
          <div className="login-features">
            <div className="login-feature-item">
              <div className="login-feature-icon">
                <Mail size={24} />
              </div>
              <div>
                <h4>Real-time Analytics</h4>
                <p>Track player progress instantly</p>
              </div>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon">
                <LogIn size={24} />
              </div>
              <div>
                <h4>Secure Access</h4>
                <p>Your data is always protected</p>
              </div>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon">
                <Lock size={24} />
              </div>
              <div>
                <h4>Role-Based Control</h4>
                <p>Tailored experience for each role</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-container" data-aos="fade-up" data-aos-delay="100" data-aos-duration="800">
          <div className="login-form-header">
            <h2>Sign In</h2>
            <p>Enter your credentials to access your dashboard</p>
          </div>

          {error && (
            <div className="login-error-banner">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form-main">
            <Input
              label="Username"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              icon={<Mail size={18} />}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              icon={<Lock size={18} />}
            />
            <Button type="submit" className="login-submit-btn" size="md" disabled={loading}>
              {loading ? (
                <>
                  <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={18} /> Sign In
                </>
              )}
            </Button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
            Don't have an account? <a href="/register" style={{ color: '#060030ff', textDecoration: 'none', fontWeight: '700', cursor: 'pointer' }} onMouseEnter={(e) => e.target.style.textDecoration = 'underline'} onMouseLeave={(e) => e.target.style.textDecoration = 'none'}>Register here</a>
          </div>
        </div>
      </div>
    </main>
  );
};

