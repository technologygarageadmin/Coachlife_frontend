import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LogIn, Users, BarChart3, Target, Trophy, Zap, ArrowRight, Award, BookOpen, TrendingUp, Sparkles, Play } from 'lucide-react';
import { Button } from '../../components/Button';
import { useStore } from '../../context/store';

export function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, lastVisitedPage, currentUser } = useStore();

  useEffect(() => {
    // If user is authenticated and there's a last visited page, redirect to it
    // But avoid redirecting to invalid pages like "/404"
    if (isAuthenticated && lastVisitedPage && lastVisitedPage !== '/' && lastVisitedPage !== '/404' && lastVisitedPage !== '/login' && lastVisitedPage !== '/register') {
      navigate(lastVisitedPage, { replace: true });
    } else if (isAuthenticated && currentUser?.role) {
      // If authenticated but no valid last visited page, redirect to their dashboard
      const role = Array.isArray(currentUser.role) ? currentUser.role[0] : currentUser.role;
      if (role) {
        navigate(`/${role}`, { replace: true });
      }
    }
  }, [isAuthenticated, lastVisitedPage, currentUser, navigate]);

  // If user is authenticated, show loading while redirecting
  if (isAuthenticated) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>Redirecting...</p></div>;
  }

  const features = [
    {
      icon: Users,
      title: 'Player Management',
      description: 'Comprehensive player tracking and development',
      color: '#0EA5E9'
    },
    {
      icon: Target,
      title: 'Learning Pathways',
      description: 'Structured training programs by skill level',
      color: '#8B5CF6'
    },
    {
      icon: Trophy,
      title: 'Reward System',
      description: 'Gamified achievements and point tracking',
      color: '#EC4899'
    },
    {
      icon: Zap,
      title: 'Session Management',
      description: 'Create, track, and analyze training sessions',
      color: '#F59E0B'
    },
    {
      icon: TrendingUp,
      title: 'Analytics',
      description: 'Real-time performance insights and metrics',
      color: '#10B981'
    },
    {
      icon: BookOpen,
      title: 'Content Library',
      description: 'Extensive resources for continuous learning',
      color: '#EF4444'
    }
  ];

  return (
    <main style={{ background: '#ffffff' }}>
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
        }

        /* ===== HERO SECTION ===== */
        .hero {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          color: white;
          padding: 120px 20px 80px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .hero::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -10%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, transparent 70%);
          border-radius: 50%;
        }

        .hero::after {
          content: '';
          position: absolute;
          bottom: -40%;
          left: -5%;
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
          border-radius: 50%;
        }

        .hero-content {
          max-width: 750px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .hero-eyebrow {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #93c5fd;
          margin-bottom: 20px;
          font-weight: 700;
        }

        .hero-title {
          font-size: 52px;
          font-weight: 800;
          line-height: 1.2;
          margin: 0 0 20px;
        }

        .hero-highlight {
          background: linear-gradient(120deg, #60a5fa, #34d399);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-description {
          font-size: 18px;
          line-height: 1.6;
          opacity: 0.9;
          margin-bottom: 40px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 0;
        }

        .btn-large {
          padding: 16px 40px;
          font-size: 15px;
          font-weight: 700;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .btn-primary-lg {
          background: linear-gradient(120deg, #3b82f6, #2563eb);
          color: white;
          box-shadow: 0 12px 30px rgba(59, 130, 246, 0.3);
        }

        .btn-primary-lg:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 40px rgba(59, 130, 246, 0.4);
        }

        .btn-secondary-lg {
          background: rgba(255, 255, 255, 0.12);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
        }

        .btn-secondary-lg:hover {
          background: rgba(255, 255, 255, 0.18);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-2px);
        }

        /* ===== STATS SECTION ===== */
        .stats-section {
          padding: 80px 20px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }

        .stats-container {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 40px;
        }

        .stat-box {
          text-align: center;
        }

        .stat-number {
          font-size: 44px;
          font-weight: 900;
          background: linear-gradient(120deg, #3b82f6, #2563eb);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
        }

        .stat-label {
          font-size: 14px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 8px 0 0 0;
        }

        /* ===== FEATURES SECTION ===== */
        .features-section {
          padding: 100px 20px;
          background: #ffffff;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-header {
          text-align: center;
          margin-bottom: 60px;
        }

        .section-title {
          font-size: 42px;
          font-weight: 900;
          color: #0f172a;
        }

        .section-subtitle {
          font-size: 16px;
          color: #64748b;
          max-width: 500px;
          margin: 0 auto;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 32px;
        }

        .feature-item {
          background: white;
          padding: 36px 28px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .feature-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6, #2563eb);
          transform: scaleX(0);
          transition: transform 0.3s ease;
          transform-origin: left;
        }

        .feature-item:hover::before {
          transform: scaleX(1);
        }

        .feature-item:hover {
          border-color: #e0e7ff;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.08);
          transform: translateY(-4px);
        }

        .feature-icon {
          width: 54px;
          height: 54px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          font-size: 26px;
        }

        .feature-item h3 {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 12px 0;
        }

        .feature-item p {
          font-size: 14px;
          color: #64748b;
          line-height: 1.6;
          margin: 0;
        }

        /* ===== TESTIMONIALS ===== */
        .testimonials-section {
          padding: 100px 20px;
          background: #f8fafc;
        }

        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 28px;
        }

        .testimonial {
          background: white;
          padding: 32px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
        }

        .testimonial:hover {
          box-shadow: 0 16px 32px rgba(0, 0, 0, 0.08);
          border-color: #e0e7ff;
        }

        .stars {
          font-size: 16px;
          margin-bottom: 16px;
        }

        .testimonial-text {
          font-size: 15px;
          color: #334155;
          line-height: 1.7;
          font-weight: 500;
          margin-bottom: 20px;
          font-style: italic;
        }

        .author {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .author-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(120deg, #3b82f6, #2563eb);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 18px;
        }

        .author-name {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .author-role {
          font-size: 12px;
          color: #64748b;
          margin: 4px 0 0 0;
        }

        /* ===== CREDENTIALS SECTION ===== */
        .credentials-section {
          padding: 100px 20px;
          background: #ffffff;
        }

        .credentials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 32px;
          max-width: 900px;
          margin: 0 auto;
        }

        .credential-box {
          background: white;
          padding: 40px;
          border-radius: 16px;
          border: 2px solid #e2e8f0;
          text-align: center;
          transition: all 0.3s ease;
        }

        .credential-box:hover {
          border-color: #3b82f6;
          box-shadow: 0 20px 40px rgba(59, 130, 246, 0.12);
          transform: translateY(-4px);
        }

        .cred-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin: 0 auto 24px;
          font-size: 36px;
        }

        .credential-box h3 {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 24px 0;
        }

        .cred-info {
          background: #f8fafc;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          margin-bottom: 24px;
        }

        .cred-row {
          font-size: 13px;
          margin: 10px 0;
          color: #334155;
          font-family: 'Courier New', monospace;
          font-weight: 500;
        }

        .cred-row strong {
          color: #0f172a;
          font-weight: 700;
        }

        .cred-description {
          font-size: 14px;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .credential-button {
          width: 100%;
          padding: 14px;
          background: linear-gradient(120deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .credential-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(59, 130, 246, 0.3);
        }

        /* ===== CTA SECTION ===== */
        .cta-section {
          padding: 80px 20px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: white;
          text-align: center;
        }

        .cta-inner {
          max-width: 600px;
          margin: 0 auto;
        }

        .cta-section h2 {
          font-size: 38px;
          font-weight: 900;
          margin: 0 0 20px 0;
        }

        .cta-section p {
          font-size: 16px;
          opacity: 0.9;
          margin: 0;
          line-height: 1.6;
        }

        /* ===== FOOTER ===== */
        .footer {
          background: #0f172a;
          color: white;
          text-align: center;
          padding: 32px 20px;
          font-size: 13px;
          opacity: 0.8;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 768px) {
          .hero {
            padding: 80px 20px 60px;
          }

          .hero-title {
            font-size: 36px;
          }

          .hero-description {
            font-size: 16px;
          }

          .hero-buttons {
            flex-direction: column;
          }

          .btn-large {
            width: 100%;
            max-width: 320px;
            margin: 0 auto;
          }

          .section-title {
            font-size: 32px;
          }

          .stat-number {
            font-size: 36px;
          }

          .features-grid,
          .testimonials-grid,
          .credentials-grid {
            gap: 24px;
          }

          .cta-section h2 {
            font-size: 28px;
          }
        }
      `}</style>
      <style>{`
        * {
          box-sizing: border-box;
        }

        .home-container {
          min-height: 100vh;
          background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%);
          overflow-x: hidden;
          width: 100%;
          max-width: 100vw;
        }

        /* Header Hero Section */
        .home-header {
          background: linear-gradient(135deg, #060030ff 0%, #000000ff 100%);
          color: white;
          padding: 50px 60px;
          text-align: center;
          position: relative;
          overflow: hidden;
          min-height: auto;
          width: 100%;
          box-sizing: border-box;
        }

        .hero-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          opacity: 0.1;
          background-image: 
            radial-gradient(circle at 20% 50%, rgba(255,255,255,0.5) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(255,255,255,0.5) 0%, transparent 50%);
          pointer-events: none;
        }

        .home-header-content {
          max-width: 700px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .home-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          animation: fadeInDown 0.8s ease-out;
        }

        .home-logo h1 {
          font-size: 38px;
          font-weight: 800;
          color: white;
          margin: 0;
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, #ffffff 0%, #e5e7eb 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .logo-icon {
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15));
          animation: pulse 2s ease-in-out infinite;
        }

        .home-tagline {
          font-size: 18px;
          font-weight: 500;
          margin-bottom: 16px;
          opacity: 0.95;
          animation: fadeInUp 0.8s ease-out 0.2s both;
        }

        .hero-subtitle {
          font-size: 13px;
          opacity: 0.85;
          margin-bottom: 20px;
          animation: fadeInUp 0.8s ease-out 0.3s both;
        }

        .cta-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
          animation: fadeInUp 0.8s ease-out 0.4s both;
        }

        .home-cta-button {
          padding: 11px 24px !important;
          font-size: 13px !important;
          border-radius: 8px !important;
          background: white !important;
          color: #252c35 !important;
          font-weight: 700 !important;
          border: none !important;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .home-cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
        }

        .secondary-button {
          background: rgba(255, 255, 255, 0.15) !important;
          border: 2px solid rgba(255, 255, 255, 0.3) !important;
          color: white !important;
        }

        .secondary-button:hover {
          background: rgba(255, 255, 255, 0.25) !important;
          border-color: rgba(255, 255, 255, 0.5) !important;
        }

        /* Stats Section */
        .stats-section {
          padding: 20px 20px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          animation: fadeIn 0.8s ease-out 0.6s both;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 12px;
          max-width: 900px;
          margin: 0 auto;
        }

        .stat-card {
          text-align: center;
          padding: 12px;
          border-radius: 10px;
          background: linear-gradient(135deg, #f8f9fa 0%, #f3f4f6 100%);
          border: 1px solid #e5e7eb;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
          border-color: #252c35;
        }

        .stat-number {
          font-size: 26px;
          font-weight: 800;
          background: linear-gradient(135deg, #060030ff 0%, #252c35 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
        }

        .stat-icon {
          width: 38px;
          height: 38px;
          background: linear-gradient(135deg, #060030ff20, #25263520);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 6px;
          font-size: 18px;
        }

        .stat-label {
          font-size: 11px;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin: 6px 0 0 0;
        }

        /* Features Section */
        .home-features {
          padding: 30px 20px;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }

        .section-title {
          font-size: 28px;
          font-weight: 800;
          text-align: center;
          color: #1f2937;
          animation: fadeInUp 0.8s ease-out;
        }

        .section-subtitle {
          text-align: center;
          color: #6b7280;
          font-size: 15px;
          margin-bottom: 48px;
          animation: fadeInUp 0.8s ease-out 0.1s both;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }

        .feature-card {
          background: white;
          padding: 28px;
          border-radius: 12px;
          text-align: left;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
          transition: all 0.3s ease;
          animation: fadeInUp 0.6s ease-out;
        }

        .feature-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
          border-color: transparent;
        }

        .feature-icon {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin-bottom: 16px;
          font-size: 28px;
        }

        .feature-card h3 {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 10px;
          color: #1f2937;
        }

        .feature-card p {
          font-size: 14px;
          color: #6b7280;
          line-height: 1.6;
          margin: 0;
        }

        /* Testimonials Section */
        .testimonials-section {
          display: none;
          padding: 0;
          background: transparent;
        }

        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .testimonial-card {
          background: white;
          padding: 28px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          transition: all 0.3s ease;
          animation: fadeInUp 0.6s ease-out;
        }

        .testimonial-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .testimonial-text {
          font-size: 14px;
          color: #4b5563;
          line-height: 1.7;
          margin-bottom: 16px;
          font-style: italic;
        }

        .testimonial-author {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .author-avatar {
          font-size: 32px;
        }

        .author-info h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: #1f2937;
        }

        .author-info p {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #6b7280;
        }

        /* Login Credentials Section */
        .home-credentials {
          display: none;
          padding: 0;
          background: transparent;
        }

        .credentials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 24px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .credential-card {
          background: white;
          padding: 32px;
          border-radius: 14px;
          border: 2px solid #e5e7eb;
          text-align: center;
          transition: all 0.3s ease;
          animation: fadeInUp 0.6s ease-out;
        }

        .credential-card:hover {
          border-color: #252c35;
          box-shadow: 0 12px 32px rgba(37, 44, 53, 0.15);
          transform: translateY(-4px);
        }

        .credential-icon {
          width: 70px;
          height: 70px;
          background: linear-gradient(135deg, #060030ff 0%, #000000ff 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin: 0 auto 20px;
          font-size: 36px;
        }

        .credential-card h3 {
          font-size: 22px;
          font-weight: 800;
          margin-bottom: 12px;
          color: #1f2937;
        }

        .credential-info {
          background: linear-gradient(135deg, #f8f9fa 0%, #f3f4f6 100%);
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          border: 1px solid #e5e7eb;
        }

        .credential-info p {
          font-size: 13px;
          margin: 8px 0;
          color: #374151;
          font-family: 'Courier New', monospace;
          word-break: break-all;
        }

        .credential-info strong {
          color: #252c35;
          font-weight: 700;
        }

        .credential-description {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 20px;
          line-height: 1.6;
        }

        .credential-button {
          width: 100%;
          padding: 12px 16px !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          border-radius: 8px !important;
          background: linear-gradient(135deg, #060030ff 0%, #000000ff 100%) !important;
          color: white !important;
          border: none !important;
          transition: all 0.3s ease;
        }

        .credential-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(37, 44, 53, 0.25);
        }

        /* CTA Section */
        .cta-section {
          display: none;
          padding: 0;
          background: transparent;
          color: white;
          text-align: center;
        }

        .cta-content {
          max-width: 600px;
          margin: 0 auto;
        }

        .cta-content h2 {
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 16px;
        }

        .cta-content p {
          font-size: 16px;
          opacity: 0.95;
          margin-bottom: 24px;
        }

        /* Footer */
        .home-footer {
          background: #000000;
          color: white;
          text-align: center;
          padding: 24px 20px;
          font-size: 13px;
          opacity: 0.9;
          width: 100%;
          box-sizing: border-box;
        }

        /* Animations */
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        /* Benefits List */
        .benefits-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-top: 32px;
        }

        .benefit-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .benefit-item svg {
          flex-shrink: 0;
          color: #4AE5A0;
        }

        .benefit-item span {
          font-size: 13px;
          font-weight: 500;
        }

        /* Tablet Landscape */
        @media (max-width: 1024px) {
          .home-header {
            padding: 40px 30px;
          }

          .home-logo h1 {
            font-size: 34px;
          }

          .section-title {
            font-size: 26px;
          }

          .features-grid {
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 16px;
          }

          .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          }

          .feature-card {
            padding: 20px;
          }
        }

        /* Tablet Portrait */
        @media (max-width: 768px) {
          .home-header {
            padding: 35px 20px 30px;
          }

          .home-logo h1 {
            font-size: 32px;
          }

          .home-tagline {
            font-size: 16px;
            margin-bottom: 12px;
          }

          .hero-subtitle {
            font-size: 12px;
            margin-bottom: 16px;
          }

          .section-title {
            font-size: 24px;
            margin-bottom: 6px;
          }

          .section-subtitle {
            font-size: 13px;
            margin-bottom: 20px;
          }

          .cta-buttons {
            gap: 8px;
          }

          .home-cta-button {
            padding: 10px 20px !important;
            font-size: 12px !important;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            max-width: 100%;
          }

          .stat-card {
            padding: 10px;
          }

          .stat-number {
            font-size: 22px;
          }

          .stat-icon {
            width: 34px;
            height: 34px;
            margin: 0 auto 4px;
            font-size: 16px;
          }

          .stat-label {
            font-size: 10px;
            margin: 4px 0 0 0;
          }

          .home-features {
            padding: 25px 15px;
          }

          .features-grid {
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 12px;
          }

          .feature-card {
            padding: 14px;
          }

          .feature-icon {
            width: 40px;
            height: 40px;
            margin-bottom: 8px;
            font-size: 18px;
          }

          .feature-card h3 {
            font-size: 14px;
            margin-bottom: 6px;
          }

          .feature-card p {
            font-size: 12px;
            line-height: 1.4;
          }

          .home-footer {
            padding: 16px 15px;
            font-size: 10px;
          }

          .credential-card {
            padding: 24px;
          }
        }

        /* Small Mobile */
        @media (max-width: 480px) {
          .home-header {
            padding: 30px 16px 25px;
          }

          .home-logo h1 {
            font-size: 28px;
            letter-spacing: -0.3px;
          }

          .home-tagline {
            font-size: 14px;
            margin-bottom: 8px;
          }

          .hero-subtitle {
            font-size: 11px;
            margin-bottom: 14px;
            line-height: 1.4;
          }

          .cta-buttons {
            gap: 6px;
          }

          .home-cta-button {
            padding: 9px 16px !important;
            font-size: 11px !important;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }

          .stat-card {
            padding: 8px;
            border-radius: 8px;
          }

          .stat-number {
            font-size: 20px;
          }

          .stat-icon {
            width: 32px;
            height: 32px;
            margin: 0 auto 4px;
            border-radius: 5px;
            font-size: 14px;
          }

          .stat-label {
            font-size: 9px;
            margin: 4px 0 0 0;
            letter-spacing: 0.2px;
          }

          .section-title {
            font-size: 22px;
            margin-bottom: 4px;
          }

          .section-subtitle {
            font-size: 12px;
            margin-bottom: 16px;
          }

          .home-features {
            padding: 20px 12px;
            max-width: 100%;
          }

          .features-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .feature-card {
            padding: 12px;
            border-radius: 9px;
          }

          .feature-icon {
            width: 38px;
            height: 38px;
            margin-bottom: 8px;
            font-size: 16px;
            border-radius: 6px;
          }

          .feature-card h3 {
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 4px;
          }

          .feature-card p {
            font-size: 11px;
            line-height: 1.4;
          }

          .home-footer {
            padding: 12px 12px;
            font-size: 9px;
          }

          .home-header-content {
            max-width: 100%;
          }

          .stat-card:hover {
            transform: translateY(-1px);
          }

          .feature-card:hover {
            transform: translateY(-2px);
          }
        }

        /* Extra Small Mobile */
        @media (max-width: 360px) {
          .home-header {
            padding: 25px 12px 20px;
          }

          .home-logo h1 {
            font-size: 26px;
          }

          .home-tagline {
            font-size: 13px;
            margin-bottom: 6px;
          }

          .hero-subtitle {
            font-size: 10px;
            margin-bottom: 12px;
          }

          .home-cta-button {
            padding: 8px 14px !important;
            font-size: 10px !important;
          }

          .stats-grid {
            gap: 6px;
          }

          .stat-card {
            padding: 6px;
          }

          .stat-number {
            font-size: 18px;
          }

          .stat-label {
            font-size: 8px;
          }

          .section-title {
            font-size: 20px;
          }

          .section-subtitle {
            font-size: 11px;
            margin-bottom: 12px;
          }

          .home-features {
            padding: 16px 10px;
          }

          .feature-card {
            padding: 10px;
          }

          .feature-icon {
            width: 36px;
            height: 36px;
            font-size: 14px;
          }

          .feature-card h3 {
            font-size: 12px;
          }

          .feature-card p {
            font-size: 10px;
          }
        }
      `}</style>

      {/* Header Hero */}
      <header className="home-header">
        <div className="hero-background"></div>
        <div className="home-header-content">
          <div className="home-logo">
            <h1>Technology Garage</h1>
          </div>
          <p className="home-tagline">Coach Life</p>
          <p className="hero-subtitle">Empower your coaching with real-time analytics, interactive learning, and gamified rewards</p>
          <div className="cta-buttons">
            <Button 
              onClick={() => navigate('/login')}
              className="home-cta-button"
            >
              <LogIn size={18} /> Get Started
            </Button>
            
          </div>
        </div>
      </header>

     

      {/* Features Section */}
      <section className="home-features">
        <h2 className="section-title">Features</h2>
        <p className="section-subtitle">Everything you need in one platform</p>
        <div className="features-grid">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className="feature-card">
                <div className="feature-icon" style={{ background: `linear-gradient(135deg, ${feature.color} 0%, ${feature.color}cc 100%)` }}>
                  <Icon size={28} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <p>&copy; 2026 CoachLife | Technology Garage | All rights reserved.</p>
      </footer>
    </main>
  );
}
