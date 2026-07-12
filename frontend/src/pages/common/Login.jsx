import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { LogIn, Lock, Mail, AlertCircle, BarChart3, Target, Trophy, ArrowLeft, Loader, Zap, Shield, Users } from 'lucide-react';

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

    const keysToPreserve = ['coachlife_auth', 'coachlife-store', 'coachlife_theme'];
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!keysToPreserve.includes(key)) keysToRemove.push(key);
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    try {
      const result = await login(username, password);
      if (result.success) {
        const userRoles = result.user.roles || [result.user.role];
        if (userRoles.includes('admin')) navigate('/admin');
        else if (userRoles.includes('coach')) navigate('/coach');
        else navigate(`/${result.user.role}`);
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: BarChart3, title: 'Real-time Analytics', desc: 'Track player progress and performance instantly', color: '#818CF8' },
    { icon: Shield, title: 'Secure Access', desc: 'Enterprise-grade security for your data', color: '#34D399' },
    { icon: Users, title: 'Role-Based Control', desc: 'Tailored experience for admins and coaches', color: '#FBBF24' },
    { icon: Zap, title: 'Instant Updates', desc: 'Live session tracking and feedback', color: '#F472B6' },
  ];

  return (
    <main className="login-wrapper">
      <style>{`
        .login-wrapper {
          min-height: 100vh;
          display: flex;
          background: #F0F4F8;
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
          gap: 6px;
          padding: 9px 14px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.85);
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 100;
          backdrop-filter: blur(8px);
        }

        .back-to-home-btn:hover {
          background: rgba(255,255,255,0.22);
          color: white;
          border-color: rgba(255,255,255,0.4);
        }

        .login-left {
          flex: 1;
          background: linear-gradient(160deg, #0B0D1F 0%, #131526 60%, #0E1020 100%);
          color: white;
          padding: 60px 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
        }

        .login-left::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 80% 10%, rgba(99,102,241,0.18) 0%, transparent 55%),
            radial-gradient(ellipse at 15% 85%, rgba(139,92,246,0.12) 0%, transparent 50%);
          pointer-events: none;
        }

        .login-left-content {
          max-width: 440px;
          position: relative;
          z-index: 1;
        }

        .login-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 40px;
        }

        .login-brand-icon {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: rgba(99,102,241,0.25);
          border: 1px solid rgba(99,102,241,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(99,102,241,0.3);
        }

        .login-brand-name {
          font-size: 22px;
          font-weight: 800;
          color: #F1F5F9;
          letter-spacing: -0.3px;
        }

        .login-brand-sub {
          font-size: 12px;
          color: rgba(255,255,255,0.4);
          font-weight: 500;
          margin-top: 1px;
        }

        .login-left-title {
          font-size: 34px;
          font-weight: 800;
          margin-bottom: 12px;
          letter-spacing: -0.8px;
          color: #F1F5F9;
          line-height: 1.2;
        }

        .login-left-text {
          font-size: 14px;
          color: rgba(255,255,255,0.55);
          line-height: 1.7;
          margin-bottom: 40px;
          font-weight: 400;
        }

        .login-features {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .login-feature-item {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }

        .login-feature-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .login-feature-item h4 {
          font-size: 13px;
          font-weight: 700;
          margin: 0 0 3px 0;
          color: #E2E8F0;
        }

        .login-feature-item p {
          font-size: 12px;
          color: rgba(255,255,255,0.45);
          margin: 0;
          line-height: 1.5;
        }

        .login-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 32px;
          box-sizing: border-box;
        }

        .login-form-container {
          width: 100%;
          max-width: 400px;
          background: white;
          padding: 36px;
          border-radius: 20px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.08), 0 2px 12px rgba(0,0,0,0.04);
          border: 1px solid #EEF2F7;
        }

        .login-form-header h2 {
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 6px;
          color: #0F172A;
          letter-spacing: -0.5px;
        }

        .login-form-header p {
          font-size: 14px;
          color: #94A3B8;
          margin: 0 0 28px 0;
          font-weight: 400;
        }

        .login-error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #B91C1C;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 20px;
          font-weight: 500;
        }

        .login-form-main {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 20px;
        }

        .login-submit-btn {
          background: linear-gradient(135deg, #6366F1, #8B5CF6) !important;
          color: white !important;
          border: none !important;
          padding: 13px !important;
          font-weight: 700 !important;
          border-radius: 10px !important;
          font-size: 14px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          box-shadow: 0 4px 16px rgba(99,102,241,0.35) !important;
          transition: all 0.2s ease !important;
          letter-spacing: 0.1px !important;
        }

        .login-submit-btn:hover:not(:disabled) {
          box-shadow: 0 6px 20px rgba(99,102,241,0.5) !important;
          transform: translateY(-1px);
        }

        .login-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        @media (max-width: 1024px) {
          .login-wrapper { flex-direction: column; }
          .login-left { padding: 40px 28px; min-height: 300px; }
          .login-right { padding: 32px 24px; }
          .login-form-container { max-width: 100%; }
          .login-left-title { font-size: 28px; }
        }

        @media (max-width: 768px) {
          .back-to-home-btn { top: 14px; left: 14px; padding: 8px 12px; font-size: 12px; }
          .login-left { padding: 32px 20px; min-height: 260px; }
          .login-right { padding: 24px 16px; }
          .login-form-container { padding: 28px 22px; border-radius: 16px; }
          .login-left-title { font-size: 26px; }
          .login-features { gap: 12px; }
          .login-brand { margin-bottom: 28px; }
          .login-left-text { margin-bottom: 28px; }
        }

        @media (max-width: 480px) {
          .login-left { padding: 24px 16px; min-height: 240px; }
          .login-right { padding: 16px; }
          .login-form-container { padding: 24px 18px; border-radius: 14px; }
          .login-left-title { font-size: 23px; letter-spacing: -0.5px; }
          .login-form-header h2 { font-size: 21px; }
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
        <ArrowLeft size={15} /> Back to Home
      </button>

      {/* Left Panel */}
      <div className="login-left">
        <div className="login-left-content">
          <div className="login-brand">
            <div className="login-brand-icon">
              <LogIn size={22} color="#818CF8" />
            </div>
            <div>
              <div className="login-brand-name">CoachLife</div>
              <div className="login-brand-sub">Technology Garage</div>
            </div>
          </div>

          <h1 className="login-left-title">Your coaching<br />platform awaits</h1>
          <p className="login-left-text">
            Sign in to manage players, track sessions, and drive performance with real-time insights.
          </p>

          <div className="login-features">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="login-feature-item">
                  <div className="login-feature-icon">
                    <Icon size={18} color={feature.color} />
                  </div>
                  <div>
                    <h4>{feature.title}</h4>
                    <p>{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="login-right">
        <div className="login-form-container">
          <div className="login-form-header">
            <h2>Sign In</h2>
            <p>Enter your credentials to access your dashboard</p>
          </div>

          {error && (
            <div className="login-error-banner">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form-main">
            <Input
              label="Username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              icon={<Mail size={17} />}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              icon={<Lock size={17} />}
            />
            <Button type="submit" className="login-submit-btn" size="md" disabled={loading}>
              {loading ? (
                <>
                  <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={16} /> Sign In
                </>
              )}
            </Button>
          </form>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            background: '#F0F9FF', border: '1px solid #BAE6FD',
            borderRadius: '12px', padding: '12px 16px', marginTop: '4px',
          }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
              background: '#EEF2FF', border: '1px solid #C7D2FE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users size={16} color="#6366F1" />
            </div>
            <div>
              <p style={{ fontSize: '12.5px', fontWeight: '700', color: '#0F172A', margin: '0 0 2px' }}>
                Need an account?
              </p>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: '1.4' }}>
                Contact your administrator to get access
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
