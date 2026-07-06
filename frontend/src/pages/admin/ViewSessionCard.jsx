import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/store';
import { useTheme } from '../../context/ThemeContext';
import { Layout } from '../../components/Layout';
import {
  ChevronLeft, ChevronDown, ChevronUp, CheckCircle, Clock, BookOpen,
  Zap, Target, Code2, Wrench, Star, MessageSquare, Lightbulb, User,
  FileText, List, Award, Activity,
} from 'lucide-react';

const statusConfig = {
  completed:  { bg: '#DCFCE7', color: '#16A34A', dot: '#22C55E', label: 'Completed' },
  inprogress: { bg: '#DBEAFE', color: '#1D4ED8', dot: '#3B82F6', label: 'In Progress' },
  pending:    { bg: '#FEF3C7', color: '#D97706', dot: '#F59E0B', label: 'Pending' },
  upcoming:   { bg: '#EDE9FE', color: '#7C3AED', dot: '#8B5CF6', label: 'Upcoming' },
  draft:      { bg: '#F1F5F9', color: '#64748B', dot: '#94A3B8', label: 'Draft' },
};
const getStatus = (raw = '') => statusConfig[raw.toLowerCase().replace(/[\s_]/g, '')] || statusConfig.upcoming;

const Section = ({ icon: Icon, title, accent = '#6366F1', children }) => (
  <div style={{ marginBottom: '16px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
      <Icon size={13} color={accent} strokeWidth={2.5} />
      <span style={{ fontSize: '11px', fontWeight: '700', color: accent, textTransform: 'uppercase', letterSpacing: '.6px' }}>{title}</span>
    </div>
    {children}
  </div>
);

const Stars = ({ rating, size = 15 }) => (
  <div style={{ display: 'flex', gap: '2px' }}>
    {[1,2,3,4,5].map(i => (
      <span key={i} style={{ fontSize: `${size}px`, color: i <= rating ? '#F59E0B' : '#E2E8F0', lineHeight: 1 }}>★</span>
    ))}
  </div>
);

const Pill = ({ children, bg = '#EEF2FF', color = '#4338CA' }) => (
  <span style={{ background: bg, color, fontSize: '10.5px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', display: 'inline-block' }}>
    {children}
  </span>
);

const ViewSessionCard = () => {
  const { sessionId, id } = useParams();
  const cardId = sessionId || id;
  const navigate = useNavigate();
  const location = useLocation();
  const { userToken } = useStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const surface   = dark ? 'var(--cl-surface)'   : '#FFFFFF';
  const surface2  = dark ? 'var(--cl-surface-2)' : '#F8FAFC';
  const border    = dark ? 'var(--cl-border)'    : '#E2E8F0';
  const textPri   = dark ? 'var(--cl-text)'      : '#0F172A';
  const textSec   = dark ? 'var(--cl-text-2)'    : '#475569';
  const textMuted = dark ? 'var(--cl-text-3)'    : '#94A3B8';

  const [sessionData, setSessionData]         = useState(null);
  const [playerData, setPlayerData]           = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);
  const [expanded, setExpanded]               = useState({});
  const [hoverBack, setHoverBack]             = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (location.state?.session) {
      const s = location.state.session;
      setSessionData({
        ...s,
        activities: (s.activities || []).slice().sort((a, b) => (a.activitySequence || 0) - (b.activitySequence || 0)),
      });
      if (location.state?.player) setPlayerData(location.state.player);
      setError(null);
      setLoading(false);
      return;
    }

    if (!cardId) {
      setError('Session data not found. Please select a session from the list.');
      setLoading(false);
      return;
    }

    // No navigation state (came from Past Sessions, a deep link, or a page reload):
    // fetch the card by its id from the URL.
    setLoading(true);
    setError(null);
    const token = userToken || JSON.parse(localStorage.getItem('coachlife_auth') || '{}').userToken;
    const headers = { 'Content-Type': 'application/json', ...(token && { userToken: token }) };

    fetch('https://kyfkhl8v4l.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_View_Sessioncard', {
      method: 'POST',
      headers,
      body: JSON.stringify({ sessionCardId: cardId }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(raw => {
        if (cancelled) return;
        let d = raw;
        if (d?.body && typeof d.body === 'string') { try { d = JSON.parse(d.body); } catch { d = null; } }
        const card = d && (d.sessionCard || d.data || d);
        const isCard = card && typeof card === 'object' &&
          (card.activities || card.Topic || card.status || card.session !== undefined || card.sessionCardId || card._id);
        if (isCard) {
          setSessionData({
            ...card,
            activities: (card.activities || []).slice().sort((a, b) => (a.activitySequence || 0) - (b.activitySequence || 0)),
          });
        } else {
          setError('Session data not found. Please select a session from the list.');
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Failed to load session details.');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [cardId, userToken, location]);

  const toggle = idx => setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));

  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTopColor: '#060030ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: textMuted, fontSize: '14px' }}>Loading session details…</p>
        </div>
      </div>
    </Layout>
  );

  if (error || !sessionData) return (
    <Layout>
      <div style={{ padding: '48px 32px', maxWidth: '540px', margin: '0 auto' }}>
        <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: '14px', padding: '28px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', background: '#FEE2E2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Activity size={22} color="#EF4444" />
          </div>
          <p style={{ fontWeight: '700', fontSize: '16px', color: '#DC2626', margin: '0 0 8px' }}>Session not found</p>
          <p style={{ fontSize: '13px', color: '#EF4444', margin: '0 0 20px' }}>{error || 'Failed to load session details'}</p>
          <button onClick={() => navigate(-1)} style={{ padding: '10px 24px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
            Go Back
          </button>
        </div>
      </div>
    </Layout>
  );

  const status = getStatus(sessionData.status || 'upcoming');
  const activities = sessionData.activities || [];
  const totalPts = sessionData.totalPoints || activities.reduce((s, a) => s + (a.points?.total || 0), 0);
  const totalDur = activities.reduce((s, a) => s + (Number(a.duration) || 0), 0);

  return (
    <Layout>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeSlide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ maxWidth: '920px', margin: '0 auto', padding: '28px 28px 48px', animation: 'fadeSlide .35s ease' }}>

        {/* ── Back button ── */}
        <button
          onClick={() => navigate(-1)}
          onMouseEnter={() => setHoverBack(true)}
          onMouseLeave={() => setHoverBack(false)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: hoverBack ? (dark ? 'rgba(255,255,255,0.07)' : '#F1F5F9') : 'transparent',
            border: `1.5px solid ${hoverBack ? border : 'transparent'}`,
            borderRadius: '10px', padding: '7px 14px 7px 10px',
            color: '#060030ff', fontSize: '13px', fontWeight: '600',
            cursor: 'pointer', transition: 'all .18s', marginBottom: '24px',
          }}
        >
          <ChevronLeft size={16} strokeWidth={2.5} /> Back to Session Cards
        </button>

        {/* ── Hero card ── */}
        <div style={{
          background: 'linear-gradient(135deg, #060030ff 0%, #12005e 60%, #1a0080 100%)',
          borderRadius: '20px', padding: '36px 36px 28px', marginBottom: '28px',
          boxShadow: '0 20px 60px rgba(6,0,48,.35)', position: 'relative', overflow: 'hidden',
        }}>
          {/* decorative circles */}
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,.04)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-60px', left: '-30px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,.03)', pointerEvents: 'none' }} />

          {/* top row: type + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {sessionData.SessionType && (
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,.7)', background: 'rgba(255,255,255,.12)', padding: '4px 12px', borderRadius: '20px', letterSpacing: '.5px', textTransform: 'uppercase' }}>
                {sessionData.SessionType}
              </span>
            )}
            {sessionData.session && (
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,.7)', background: 'rgba(255,255,255,.10)', padding: '4px 12px', borderRadius: '20px' }}>
                Session {sessionData.session}
              </span>
            )}
            {sessionData.LearningPathway && (
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,.7)', background: 'rgba(255,255,255,.10)', padding: '4px 12px', borderRadius: '20px' }}>
                {sessionData.LearningPathway}
              </span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', background: status.bg, padding: '5px 14px', borderRadius: '20px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: status.dot }} />
              <span style={{ fontSize: '12px', fontWeight: '700', color: status.color }}>{status.label}</span>
            </div>
          </div>

          {/* title */}
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#fff', margin: '0 0 10px', lineHeight: 1.25, letterSpacing: '-.3px' }}>
            {sessionData.Topic || 'Session Card'}
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.75)', margin: '0 0 28px', lineHeight: 1.7, maxWidth: '680px' }}>
            {sessionData.Objective}
          </p>

          {/* stats row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {[
              { icon: List,   label: 'Activities',    value: activities.length },
              { icon: Zap,    label: 'Total Points',  value: `${totalPts} pts` },
              { icon: Clock,  label: 'Duration',      value: totalDur ? `${totalDur} min` : '-' },
              ...(playerData ? [{ icon: User, label: 'Player', value: playerData.playerName || playerData.name || '-' }] : []),
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,.10)', borderRadius: '12px',
                padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px',
                backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,.12)',
              }}>
                <Icon size={16} color="rgba(255,255,255,.7)" />
                <div>
                  <p style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,.55)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</p>
                  <p style={{ fontSize: '15px', fontWeight: '700', color: '#fff', margin: 0 }}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Session-level rating & coach comment (completed) ── */}
        {sessionData.status?.toLowerCase() === 'completed' && (sessionData.rating > 0 || sessionData.coachComment) && (
          <div style={{
            background: surface, border: `1.5px solid ${border}`, borderRadius: '16px',
            padding: '22px 24px', marginBottom: '20px',
            boxShadow: dark ? 'none' : '0 2px 12px rgba(0,0,0,.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={17} color="#D97706" fill="#D97706" />
              </div>
              <span style={{ fontSize: '14px', fontWeight: '700', color: textPri }}>Session Feedback</span>
            </div>
            {sessionData.rating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: sessionData.coachComment ? '12px' : 0 }}>
                <Stars rating={sessionData.rating} size={18} />
                <span style={{ fontSize: '13px', fontWeight: '700', color: textPri }}>{sessionData.rating}/5</span>
              </div>
            )}
            {sessionData.coachComment && (
              <p style={{ fontSize: '13.5px', color: textSec, lineHeight: 1.7, margin: 0, background: surface2, padding: '12px 16px', borderRadius: '10px', borderLeft: '3px solid #060030ff' }}>
                {sessionData.coachComment}
              </p>
            )}
          </div>
        )}

        {/* ── Activities ── */}
        {activities.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#060030ff,#1a0080)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={18} color="#fff" />
              </div>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: textPri, margin: 0 }}>Activities</h2>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#060030ff', background: '#EDE9FE', padding: '3px 10px', borderRadius: '20px' }}>
                {activities.length}
              </span>
              <button
                onClick={() => {
                  const allExpanded = activities.every((_, i) => expanded[i]);
                  const next = {};
                  activities.forEach((_, i) => { next[i] = !allExpanded; });
                  setExpanded(next);
                }}
                style={{
                  marginLeft: 'auto', fontSize: '12px', fontWeight: '600', color: '#060030ff',
                  background: 'transparent', border: '1.5px solid #060030ff',
                  borderRadius: '8px', padding: '5px 12px', cursor: 'pointer',
                }}
              >
                {activities.every((_, i) => expanded[i]) ? 'Collapse All' : 'Expand All'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activities.map((activity, idx) => {
                const isOpen = !!expanded[idx];
                const pts = activity.points?.total || 0;
                const dur = Number(activity.duration) || 0;
                const hasCode = !!activity.code;
                const hasAI = activity.aiTools?.length > 0;

                return (
                  <div
                    key={idx}
                    style={{
                      background: surface, border: `1.5px solid ${isOpen ? '#060030ff' : border}`,
                      borderRadius: '14px', overflow: 'hidden',
                      boxShadow: isOpen
                        ? '0 8px 32px rgba(6,0,48,.12)'
                        : dark ? 'none' : '0 1px 4px rgba(0,0,0,.04)',
                      transition: 'all .2s',
                    }}
                  >
                    {/* Activity header */}
                    <div
                      onClick={() => toggle(idx)}
                      style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', cursor: 'pointer' }}
                      onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = dark ? 'rgba(255,255,255,.04)' : '#F8FAFC'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* number badge */}
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                        background: isOpen ? 'linear-gradient(135deg,#060030ff,#1a0080)' : (dark ? 'rgba(255,255,255,.08)' : '#EEF2F7'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '800', fontSize: '14px', color: isOpen ? '#fff' : textMuted,
                        transition: 'all .2s',
                      }}>
                        {idx + 1}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14.5px', fontWeight: '700', color: textPri, margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {activity.activityTitle}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {dur > 0 && <span style={{ fontSize: '11.5px', color: textMuted, display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={11} />{dur} min</span>}
                          {hasCode && <Pill bg="#F0FDF4" color="#16A34A">Code</Pill>}
                          {hasAI && <Pill bg="#FFF7ED" color="#C2410C">AI Tools</Pill>}
                          {activity.project && <Pill bg="#F0F9FF" color="#0369A1">Project</Pill>}
                        </div>
                      </div>

                      {/* points + chevron */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        {pts > 0 && (
                          <div style={{ background: 'linear-gradient(135deg,#060030ff,#1a0080)', padding: '5px 13px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', color: '#fff' }}>
                            {pts} pts
                          </div>
                        )}
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: dark ? 'rgba(255,255,255,.06)' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isOpen ? <ChevronUp size={15} color={textMuted} /> : <ChevronDown size={15} color={textMuted} />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded body */}
                    {isOpen && (
                      <div style={{ borderTop: `1px solid ${border}`, padding: '20px 22px', animation: 'fadeSlide .2s ease' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0 32px' }}>

                          {/* Description */}
                          {activity.description && (
                            <Section icon={FileText} title="Description" accent="#6366F1">
                              <div style={{ fontSize: '13px', color: textSec, lineHeight: 1.7, background: surface2, padding: '12px 14px', borderRadius: '10px' }}
                                dangerouslySetInnerHTML={{ __html: activity.description }} />
                            </Section>
                          )}

                          {/* Story */}
                          {activity.story && activity.story.length > 0 && (
                            <Section icon={BookOpen} title="Story" accent="#0EA5E9">
                              <div style={{ background: surface2, padding: '12px 14px', borderRadius: '10px', borderLeft: '3px solid #0EA5E9' }}>
                                {(Array.isArray(activity.story) ? activity.story : [activity.story]).map((line, i) => (
                                  <div key={i} style={{ fontSize: '13px', color: textSec, lineHeight: 1.7, marginBottom: i < activity.story.length - 1 ? '6px' : 0 }}
                                    dangerouslySetInnerHTML={{ __html: line }} />
                                ))}
                              </div>
                            </Section>
                          )}

                          {/* Instructions to Coach */}
                          {activity.instructionsToCoach?.length > 0 && (
                            <Section icon={Target} title="Instructions for Coach" accent="#10B981">
                              <ol style={{ margin: 0, paddingLeft: '18px' }}>
                                {activity.instructionsToCoach.map((instr, i) => (
                                  <li key={i} style={{ fontSize: '13px', color: textSec, lineHeight: 1.65, marginBottom: '6px', paddingLeft: '4px' }}
                                    dangerouslySetInnerHTML={{ __html: instr }} />
                                ))}
                              </ol>
                            </Section>
                          )}

                          {/* Evaluation Criteria */}
                          {activity.points?.evaluationCriteria?.length > 0 && (
                            <Section icon={CheckCircle} title="Evaluation Criteria" accent="#8B5CF6">
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {activity.points.evaluationCriteria.map((c, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                                      <span style={{ fontSize: '9px', fontWeight: '800', color: '#7C3AED' }}>{i + 1}</span>
                                    </div>
                                    <p style={{ fontSize: '13px', color: textSec, margin: 0, lineHeight: 1.6 }}>{c}</p>
                                  </div>
                                ))}
                              </div>
                            </Section>
                          )}

                          {/* Code */}
                          {activity.code && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <Section icon={Code2} title="Code" accent="#10B981">
                                <div style={{ background: '#0F172A', borderRadius: '12px', padding: '16px', position: 'relative', overflow: 'hidden' }}>
                                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                                    {['#EF4444','#F59E0B','#22C55E'].map(c => <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />)}
                                    {activity.code.language && (
                                      <span style={{ marginLeft: '8px', fontSize: '10px', color: '#64748B', fontWeight: '600', textTransform: 'uppercase' }}>{activity.code.language}</span>
                                    )}
                                  </div>
                                  <pre style={{ margin: 0, fontFamily: "'JetBrains Mono',Consolas,monospace", fontSize: '12px', color: '#7DD3FC', overflow: 'auto', lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {typeof activity.code === 'object' ? activity.code.content : activity.code}
                                  </pre>
                                </div>
                              </Section>
                            </div>
                          )}

                          {/* Project */}
                          {activity.project && typeof activity.project === 'object' && (activity.project.title || activity.project.description) && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <Section icon={Wrench} title="Project" accent="#F59E0B">
                                <div style={{ background: surface2, borderRadius: '12px', padding: '14px 16px', border: `1px solid ${border}` }}>
                                  {activity.project.title && <p style={{ fontSize: '14px', fontWeight: '700', color: textPri, margin: '0 0 6px' }}>{activity.project.title}</p>}
                                  {activity.project.description && <div style={{ fontSize: '13px', color: textSec, lineHeight: 1.7, marginBottom: activity.project.workflow?.length ? '10px' : 0 }} dangerouslySetInnerHTML={{ __html: activity.project.description }} />}
                                  {activity.project.workflow?.length > 0 && (
                                    <>
                                      <p style={{ fontSize: '11px', fontWeight: '700', color: textMuted, margin: '10px 0 6px', textTransform: 'uppercase', letterSpacing: '.5px' }}>Workflow</p>
                                      <ol style={{ margin: 0, paddingLeft: '18px' }}>
                                        {activity.project.workflow.map((step, i) => (
                                          <li key={i} style={{ fontSize: '12.5px', color: textSec, marginBottom: '4px', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: step }} />
                                        ))}
                                      </ol>
                                    </>
                                  )}
                                </div>
                              </Section>
                            </div>
                          )}

                          {/* AI Tools */}
                          {activity.aiTools?.length > 0 && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <Section icon={Zap} title="AI Tools" accent="#F97316">
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                  {activity.aiTools.map((tool, i) => (
                                    <div key={i} style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '10px', padding: '10px 14px', minWidth: '160px' }}>
                                      <p style={{ fontSize: '13px', fontWeight: '700', color: '#C2410C', margin: '0 0 3px' }}>{tool.toolName}</p>
                                      {tool.usagePurpose && <p style={{ fontSize: '12px', color: '#92400E', margin: 0, lineHeight: 1.5 }}>{tool.usagePurpose}</p>}
                                    </div>
                                  ))}
                                </div>
                              </Section>
                            </div>
                          )}

                          {/* Activity feedback (completed only) */}
                          {sessionData.status?.toLowerCase() === 'completed' && (activity.feedback || activity.rating > 0) && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <Section icon={MessageSquare} title="Activity Feedback" accent="#16A34A">
                                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '14px 16px' }}>
                                  {activity.rating > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: activity.feedback ? '10px' : 0 }}>
                                      <Stars rating={activity.rating} />
                                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#15803D' }}>{activity.rating}/5</span>
                                    </div>
                                  )}
                                  {activity.feedback && <p style={{ fontSize: '13px', color: '#166534', margin: 0, lineHeight: 1.6 }}>{activity.feedback}</p>}
                                </div>
                              </Section>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Key Takeaways ── */}
        {sessionData.sessionTakeaways?.length > 0 && (
          <div style={{
            background: surface, border: `1.5px solid ${border}`, borderRadius: '16px',
            padding: '24px', marginBottom: '20px',
            boxShadow: dark ? 'none' : '0 2px 12px rgba(0,0,0,.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lightbulb size={18} color="#D97706" />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: textPri, margin: 0 }}>Key Takeaways</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sessionData.sessionTakeaways.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#D97706' }}>{i + 1}</span>
                  </div>
                  <p style={{ fontSize: '13.5px', color: textSec, margin: 0, lineHeight: 1.65 }}>{t}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Bottom actions ── */}
        <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #060030ff, #1a0080)',
              color: '#fff', border: 'none', borderRadius: '12px',
              fontSize: '14px', fontWeight: '700', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(6,0,48,.35)', transition: 'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(6,0,48,.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(6,0,48,.35)'; }}
          >
            ← Go Back
          </button>
        </div>

      </div>
    </Layout>
  );
};

export default ViewSessionCard;
