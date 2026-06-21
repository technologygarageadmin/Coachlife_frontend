import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  LogIn, Users, Trophy, Zap, Award, BookOpen, BarChart3,
  ClipboardList, Star, MessageSquare, ArrowRight, Sparkles,
  ChevronRight, Activity, Play
} from 'lucide-react';
import { useStore } from '../../context/store';
import logo from '../../assets/favicon-white.png';

export function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, lastVisitedPage, currentUser } = useStore();

  useEffect(() => {
    if (isAuthenticated && lastVisitedPage && lastVisitedPage !== '/' && lastVisitedPage !== '/404' && lastVisitedPage !== '/login' && lastVisitedPage !== '/register') {
      navigate(lastVisitedPage, { replace: true });
    } else if (isAuthenticated && currentUser?.role) {
      const role = Array.isArray(currentUser.role) ? currentUser.role[0] : currentUser.role;
      if (role) navigate(`/${role}`, { replace: true });
    }
  }, [isAuthenticated, lastVisitedPage, currentUser, navigate]);

  if (isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0C0E1A' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(139,92,246,0.25)', borderTopColor: '#8B5CF6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const tools = [
    {
      icon: ClipboardList,
      label: 'Session Cards',
      desc: 'Open a player\'s session card, work through each activity, rate performance, and submit - all in a few taps.',
      color: '#8B5CF6',
      glow: 'rgba(139,92,246,0.12)',
      border: 'rgba(139,92,246,0.25)',
    },
    {
      icon: Users,
      label: 'My Players',
      desc: 'See all your assigned players at a glance - their learning pathway, progress, and point balance.',
      color: '#10B981',
      glow: 'rgba(16,185,129,0.12)',
      border: 'rgba(16,185,129,0.25)',
    },
    {
      icon: Star,
      label: 'Activity Feedback',
      desc: 'Rate each activity 1–5 stars and leave per-activity comments so every session is documented.',
      color: '#F59E0B',
      glow: 'rgba(245,158,11,0.12)',
      border: 'rgba(245,158,11,0.25)',
    },
    {
      icon: Trophy,
      label: 'Points & Rewards',
      desc: 'Players earn points for completed activities. Watch their balance grow and see the leaderboard update live.',
      color: '#EC4899',
      glow: 'rgba(236,72,153,0.12)',
      border: 'rgba(236,72,153,0.25)',
    },
    {
      icon: BookOpen,
      label: 'Learning Pathways',
      desc: 'Structured curricula - Foundation through Advanced - ensure every session builds on the last.',
      color: '#06B6D4',
      glow: 'rgba(6,182,212,0.12)',
      border: 'rgba(6,182,212,0.25)',
    },
    {
      icon: BarChart3,
      label: 'Progress Tracking',
      desc: 'View session history, completed cards, and overall stats for every player in your care.',
      color: '#6366F1',
      glow: 'rgba(99,102,241,0.12)',
      border: 'rgba(99,102,241,0.25)',
    },
  ];

  const flow = [
    { step: '1', title: 'Sign in', desc: 'Log into your coach account', icon: LogIn, color: '#8B5CF6' },
    { step: '2', title: 'Open Session Card', desc: 'Pick a player and open their session', icon: ClipboardList, color: '#10B981' },
    { step: '3', title: 'Work Activities', desc: 'Guide through each activity and rate it', icon: Star, color: '#F59E0B' },
    { step: '4', title: 'Submit & Done', desc: 'Points awarded, progress updated instantly', icon: Zap, color: '#EC4899' },
  ];

  return (
    <main style={{ background: '#0C0E1A', minHeight: '100vh', overflowX: 'hidden', color: 'white', fontFamily: 'inherit' }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGlow { 0%,100%{opacity:1;} 50%{opacity:0.5;} }
        @keyframes orbFloat { 0%,100%{transform:translate(0,0);} 50%{transform:translate(-12px, -18px);} }
        @keyframes orbFloat2 { 0%,100%{transform:translate(0,0);} 50%{transform:translate(14px, 12px);} }

        .tg-nav {
          position: sticky; top: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 clamp(18px, 5vw, 64px); height: 80px;
          background: rgba(12,14,26,0.92);
          backdrop-filter: blur(20px) saturate(1.4);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .tg-logo { display: flex; align-items: center; gap: 13px; cursor: pointer; }
        .tg-logo-badge {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #8B5CF6, #6366F1);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 16px rgba(139,92,246,0.45);
        }
        .tg-logo-name { font-size: 17px; font-weight: 800; color: #F1F5F9; letter-spacing: -0.4px; }
        .tg-logo-sub { font-size: 11px; color: rgba(255,255,255,0.35); font-weight: 500; margin-top: 1px; }
        .tg-signin-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 11px 24px; border-radius: 10px; border: none;
          background: linear-gradient(135deg, #8B5CF6, #6366F1);
          color: white; font-size: 14px; font-weight: 700; cursor: pointer;
          box-shadow: 0 4px 16px rgba(139,92,246,0.4);
          transition: all 0.2s ease; font-family: inherit;
        }
        .tg-signin-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(139,92,246,0.55); }

        /* HERO */
        .tg-hero {
          position: relative; overflow: hidden;
          padding: clamp(72px,10vh,120px) clamp(18px,5vw,64px) clamp(80px,10vh,120px);
          text-align: center;
        }
        .tg-orb-1 {
          position: absolute; width: 560px; height: 560px; border-radius: 50%;
          background: radial-gradient(circle, rgba(139,92,246,0.13) 0%, transparent 70%);
          top: -120px; right: -60px; pointer-events: none;
          animation: orbFloat 12s ease-in-out infinite;
        }
        .tg-orb-2 {
          position: absolute; width: 420px; height: 420px; border-radius: 50%;
          background: radial-gradient(circle, rgba(16,185,129,0.09) 0%, transparent 70%);
          bottom: -80px; left: -40px; pointer-events: none;
          animation: orbFloat2 15s ease-in-out infinite;
        }
        .tg-orb-3 {
          position: absolute; width: 280px; height: 280px; border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%);
          top: 35%; left: 8%; pointer-events: none;
          animation: orbFloat 18s ease-in-out infinite reverse;
        }
        .tg-hero-content { position: relative; z-index: 1; max-width: 760px; margin: 0 auto; }
        .tg-org-chip {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 16px; border-radius: 100px;
          background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.22);
          font-size: 12px; font-weight: 700; color: #C4B5FD;
          text-transform: uppercase; letter-spacing: 1.2px;
          margin-bottom: 30px; animation: fadeUp 0.6s ease both;
        }
        .tg-org-dot { width: 7px; height: 7px; border-radius: 50%; background: #8B5CF6; animation: pulseGlow 2s ease-in-out infinite; }
        .tg-hero-title {
          font-size: clamp(38px, 6vw, 72px); font-weight: 900;
          line-height: 1.08; letter-spacing: -2px;
          margin: 0 0 22px; color: #F8FAFC;
          animation: fadeUp 0.6s 0.1s ease both;
        }
        .tg-title-em {
          background: linear-gradient(135deg, #A78BFA 0%, #818CF8 40%, #34D399 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .tg-hero-sub {
          font-size: clamp(15px, 2vw, 18px); color: rgba(255,255,255,0.42);
          line-height: 1.7; max-width: 540px; margin: 0 auto 44px;
          font-weight: 400; animation: fadeUp 0.6s 0.2s ease both;
        }
        .tg-hero-btn {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 15px 36px; border-radius: 14px; border: none;
          background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);
          color: white; font-size: 16px; font-weight: 800; cursor: pointer;
          box-shadow: 0 8px 28px rgba(139,92,246,0.4), 0 2px 8px rgba(0,0,0,0.3);
          transition: all 0.25s ease; font-family: inherit;
          animation: fadeUp 0.6s 0.3s ease both; letter-spacing: -0.2px;
        }
        .tg-hero-btn:hover { transform: translateY(-3px); box-shadow: 0 14px 38px rgba(139,92,246,0.55); }
        .tg-lb-link {
          display: inline-flex; align-items: center; gap: 6px;
          margin-top: 18px; font-size: 13px; font-weight: 600;
          color: rgba(255,255,255,0.28); cursor: pointer;
          transition: color 0.2s ease; border: none; background: none;
          font-family: inherit; animation: fadeUp 0.6s 0.35s ease both;
        }
        .tg-lb-link:hover { color: rgba(255,255,255,0.6); }

        /* DIVIDER */
        .tg-divider {
          height: 1px; margin: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 70%, transparent);
        }

        /* SECTIONS */
        .tg-section { padding: clamp(56px,7vh,96px) clamp(18px,5vw,64px); }
        .tg-container { max-width: 1160px; margin: 0 auto; }
        .tg-label {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 11.5px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 1.2px; color: rgba(255,255,255,0.28);
          margin-bottom: 14px;
        }
        .tg-label-line { width: 20px; height: 1px; background: rgba(255,255,255,0.18); }
        .tg-section-title {
          font-size: clamp(24px,3.5vw,38px); font-weight: 800;
          color: #F1F5F9; margin: 0 0 12px; letter-spacing: -0.8px; line-height: 1.2;
        }
        .tg-section-sub {
          font-size: clamp(13.5px,1.6vw,15.5px); color: rgba(255,255,255,0.36);
          line-height: 1.7; font-weight: 400; max-width: 520px; margin-bottom: 44px;
        }

        /* TOOLS */
        .tg-tools-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
        }
        .tg-tool-card {
          padding: 26px; border-radius: 18px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          transition: all 0.25s ease; position: relative; overflow: hidden;
        }
        .tg-tool-icon {
          width: 46px; height: 46px; border-radius: 13px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 18px; transition: transform 0.25s ease;
        }
        .tg-tool-card:hover .tg-tool-icon { transform: scale(1.08) rotate(-5deg); }
        .tg-tool-card h3 { font-size: 15px; font-weight: 800; color: #F1F5F9; margin: 0 0 9px; }
        .tg-tool-card p { font-size: 13px; color: rgba(255,255,255,0.36); line-height: 1.65; margin: 0; }

        /* FLOW */
        .tg-flow-bg { background: rgba(255,255,255,0.015); }
        .tg-flow-grid {
          display: grid; grid-template-columns: repeat(4,1fr); gap: 2px;
          background: rgba(255,255,255,0.04); border-radius: 20px;
          overflow: hidden; border: 1px solid rgba(255,255,255,0.06);
        }
        .tg-flow-cell {
          padding: 28px 22px; background: #0C0E1A;
          position: relative; transition: background 0.2s ease;
        }
        .tg-flow-cell:not(:last-child)::after {
          content: ''; position: absolute; right: -1px; top: 28px; bottom: 28px;
          width: 1px; background: rgba(255,255,255,0.05);
        }
        .tg-flow-cell:hover { background: rgba(255,255,255,0.02); }
        .tg-flow-num { font-size: 11px; font-weight: 800; letter-spacing: 0.5px; color: rgba(255,255,255,0.16); margin-bottom: 16px; }
        .tg-flow-icon { width: 42px; height: 42px; border-radius: 11px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
        .tg-flow-title { font-size: 14px; font-weight: 800; color: #E2E8F0; margin: 0 0 8px; }
        .tg-flow-desc { font-size: 12.5px; color: rgba(255,255,255,0.3); line-height: 1.6; margin: 0; }

        /* CTA */
        .tg-cta-card {
          position: relative; overflow: hidden; border-radius: 24px;
          padding: clamp(48px,7vh,80px) clamp(24px,5vw,80px);
          background: linear-gradient(135deg, #180D33 0%, #0F0824 50%, #0B1630 100%);
          border: 1px solid rgba(139,92,246,0.18); text-align: center;
        }
        .tg-cta-o1 {
          position: absolute; width: 400px; height: 400px; border-radius: 50%;
          background: radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%);
          top: -100px; right: -80px; pointer-events: none;
        }
        .tg-cta-o2 {
          position: absolute; width: 320px; height: 320px; border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%);
          bottom: -80px; left: -60px; pointer-events: none;
        }
        .tg-cta-title {
          font-size: clamp(26px,4vw,46px); font-weight: 900; color: #F8FAFC;
          margin: 0 0 14px; letter-spacing: -1px;
          position: relative; z-index: 1; line-height: 1.15;
        }
        .tg-cta-sub {
          font-size: clamp(14px,1.7vw,16px); color: rgba(255,255,255,0.38);
          margin: 0 auto 36px; max-width: 440px; line-height: 1.7;
          position: relative; z-index: 1;
        }
        .tg-cta-btn {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 15px 38px; border-radius: 14px; border: none;
          background: linear-gradient(135deg, #8B5CF6, #6366F1);
          color: white; font-size: 16px; font-weight: 800; cursor: pointer;
          box-shadow: 0 8px 28px rgba(139,92,246,0.45);
          transition: all 0.25s ease; font-family: inherit;
          position: relative; z-index: 1;
        }
        .tg-cta-btn:hover { transform: translateY(-3px); box-shadow: 0 14px 38px rgba(139,92,246,0.6); }

        /* FOOTER */
        .tg-footer {
          padding: 24px clamp(18px,5vw,64px);
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
        }
        .tg-footer-badge {
          width: 28px; height: 28px; border-radius: 7px;
          background: linear-gradient(135deg,#8B5CF6,#6366F1);
          display: flex; align-items: center; justify-content: center;
        }
        .tg-footer-link {
          color: rgba(255,255,255,0.28); cursor: pointer; border: none;
          background: none; font-size: 12px; font-family: inherit;
          font-weight: 600; transition: color 0.18s;
        }
        .tg-footer-link:hover { color: rgba(255,255,255,0.6); }

        /* RESPONSIVE */
        @media (max-width: 900px) {
          .tg-tools-grid { grid-template-columns: repeat(2,1fr); }
          .tg-flow-grid { grid-template-columns: repeat(2,1fr); }
          .tg-flow-cell:nth-child(2)::after, .tg-flow-cell:nth-child(4)::after { display: none; }
        }
        @media (max-width: 580px) {
          .tg-tools-grid { grid-template-columns: 1fr; }
          .tg-flow-grid { grid-template-columns: 1fr; }
          .tg-flow-cell::after { display: none !important; }
          .tg-footer { flex-direction: column; text-align: center; }
        }
      `}</style>

      {/* NAV */}
      <nav className="tg-nav">
        <div className="tg-logo" onClick={() => navigate('/')}>
          <div className="tg-logo-badge">
            <img src={logo} alt="CoachLife" style={{ width: '38px', height: '38px' }} />
          </div>
          <div>
            <div className="tg-logo-name">CoachLife</div>
            <div className="tg-logo-sub">Technology Garage</div>
          </div>
        </div>
        <button className="tg-signin-btn" onClick={() => navigate('/login')}>
          <LogIn size={14} /> Sign In
        </button>
      </nav>

      {/* HERO */}
      <section className="tg-hero">
        <div className="tg-orb-1" />
        <div className="tg-orb-2" />
        <div className="tg-orb-3" />
        <div className="tg-hero-content">
          <div className="tg-org-chip">
            <div className="tg-org-dot" />
            Technology Garage · Internal Coach Portal
          </div>
          <h1 className="tg-hero-title">
            Your workspace for<br />
            <span className="tg-title-em">every great session</span>
          </h1>
          <p className="tg-hero-sub">
            CoachLife is Powered by Technology Garage. Coaches can track players, give feedback, and celebrate growth - every single day.
          </p>
          <button className="tg-hero-btn" onClick={() => navigate('/login')}>
            <LogIn size={18} /> Sign In to CoachLife
          </button>
        </div>
      </section>

      <div className="tg-divider" />

      {/* TOOLS */}
      <section className="tg-section">
        <div className="tg-container">
          <div className="tg-label">
            <div className="tg-label-line" /> What's inside <div className="tg-label-line" />
          </div>
          <h2 className="tg-section-title">Your coaching toolkit</h2>
          <p className="tg-section-sub">
            Everything you need to run a great session and track every player's journey - built for how coaches at Technology Garage actually work.
          </p>
          <div className="tg-tools-grid">
            {tools.map((t, i) => {
              const Icon = t.icon;
              return (
                <div key={i} className="tg-tool-card"
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = t.border;
                    e.currentTarget.style.background = t.glow;
                    e.currentTarget.style.boxShadow = `0 12px 32px ${t.glow}`;
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div className="tg-tool-icon" style={{ background: t.glow }}>
                    <Icon size={21} color={t.color} />
                  </div>
                  <h3>{t.label}</h3>
                  <p>{t.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="tg-divider" />

      {/* HOW A SESSION WORKS */}
      <section className="tg-section tg-flow-bg">
        <div className="tg-container">
          <div className="tg-label">
            <div className="tg-label-line" /> How a session works <div className="tg-label-line" />
          </div>
          <h2 className="tg-section-title">From sign-in to submitted<br />in 4 simple steps</h2>
          <p className="tg-section-sub" style={{ marginBottom: '36px' }}>
            CoachLife is designed to be fast so you can stay focused on teaching, not the tool.
          </p>

          <div className="tg-flow-grid">
            {flow.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="tg-flow-cell">
                  <div className="tg-flow-num">Step {f.step}</div>
                  <div className="tg-flow-icon" style={{ background: `${f.color}18` }}>
                    <Icon size={20} color={f.color} />
                  </div>
                  <p className="tg-flow-title">{f.title}</p>
                  <p className="tg-flow-desc">{f.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Session card mockup */}
          <div style={{
            marginTop: '24px', borderRadius: '16px', overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)'
          }}>
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
                <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'rgba(255,255,255,0.5)' }}>
                  Session Card - Anika · AI Foundation · Session 7
                </span>
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                background: 'rgba(16,185,129,0.1)', color: '#34D399',
                border: '1px solid rgba(16,185,129,0.2)'
              }}>In Progress</span>
            </div>
            {[
              { name: 'Intro to Machine Learning', rated: true, rating: 4, pts: 20 },
              { name: 'Build a Simple Classifier', active: true, pts: 30 },
              { name: 'Test & Evaluate the Model', pts: 25 },
            ].map((act, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 20px', flexWrap: 'wrap', gap: '8px',
                borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                background: act.active ? 'rgba(139,92,246,0.07)' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                  <div style={{
                    width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0,
                    background: act.rated ? '#10B981' : act.active ? '#8B5CF6' : 'rgba(255,255,255,0.12)'
                  }} />
                  <span style={{
                    fontSize: '13px', fontWeight: '600',
                    color: act.rated ? 'rgba(255,255,255,0.38)' : act.active ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.25)'
                  }}>
                    {act.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={12}
                        fill={act.rated && s <= act.rating ? '#F59E0B' : 'none'}
                        color={act.rated && s <= act.rating ? '#F59E0B' : 'rgba(255,255,255,0.1)'} />
                    ))}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.18)' }}>+{act.pts}pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="tg-divider" />

      {/* CTA */}
      <section className="tg-section">
        <div className="tg-container">
          <div className="tg-cta-card">
            <div className="tg-cta-o1" />
            <div className="tg-cta-o2" />
            <h2 className="tg-cta-title">Ready to start your session?</h2>
            <p className="tg-cta-sub">
              Sign in to your Technology Garage coach account and pick up right where you left off.
            </p>
            <button className="tg-cta-btn" onClick={() => navigate('/login')}>
              <LogIn size={18} /> Sign In Now
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="tg-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="tg-footer-badge">
            <img src={logo} alt="CoachLife" style={{ width: '30px', height: '30px' }} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(255,255,255,0.4)' }}>
            CoachLife · Technology Garage
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="tg-footer-link" onClick={() => navigate('/leaderboard')}>Leaderboard</button>
          <button className="tg-footer-link" onClick={() => navigate('/login')}>Sign In</button>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.18)' }}>© 2026 Technology Garage</span>
        </div>
      </footer>
    </main>
  );
}
