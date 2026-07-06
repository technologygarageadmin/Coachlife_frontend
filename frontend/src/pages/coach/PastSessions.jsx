import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useStore } from '../../context/store';
import { useTheme } from '../../context/ThemeContext';
import { Layout } from '../../components/Layout';
import { BookOpen, CheckCircle, Clock, Star, Calendar, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';

const VIEW_SESSION_CARD_URL = 'https://kyfkhl8v4l.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_View_Sessioncard';

const SummaryCard = ({ label, value, icon: SIcon, accent, surface, border }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: surface, border: `1.5px solid ${hov ? accent + '44' : border}`,
        borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px',
        boxShadow: hov ? `0 8px 24px ${accent}22` : '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'all .2s', flex: 1, minWidth: '140px',
      }}
    >
      <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {React.createElement(SIcon, { size: 22, color: accent })}
      </div>
      <div>
        <p style={{ fontSize: '10.5px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', margin: '0 0 4px', letterSpacing: '.5px' }}>{label}</p>
        <p style={{ fontSize: '23px', fontWeight: '800', color: accent, margin: 0 }}>{value}</p>
      </div>
    </div>
  );
};

const PastSessions = () => {
  const { currentUser, fetchAssignedPlayersForCoach, userToken } = useStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const navigate = useNavigate();

  const surface = dark ? 'var(--cl-surface)' : '#fff';
  const border = dark ? 'var(--cl-border)' : '#E5E7EB';
  const textPrimary = dark ? 'var(--cl-text)' : '#0F172A';
  const textSecondary = dark ? 'var(--cl-text-2)' : '#475569';
  const textMuted = dark ? 'var(--cl-text-3)' : '#94A3B8';

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const coachId = currentUser?.id || currentUser?.userId;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchAssignedPlayersForCoach(coachId);
        if (!res.success) throw new Error(res.error || 'Failed to load players');

        const players = res.players || [];
        const allIds = players.flatMap(p => Array.isArray(p.sessionCardIds) ? p.sessionCardIds : []);

        if (allIds.length === 0) {
          setSessions([]);
          setLoading(false);
          return;
        }

        const headers = { 'Content-Type': 'application/json', ...(userToken && { userToken }) };
        const cards = await Promise.all(
          allIds.map(id =>
            axios.post(VIEW_SESSION_CARD_URL, { sessionCardId: id }, { headers, signal: controller.signal })
              .then(r => {
                const d = r.data;
                if (d?.sessionCard) return d.sessionCard;
                if (d?.data) return d.data;
                if (d?.session) return d.session;
                if (d && !d.message) return d;
                return null;
              })
              .catch(() => null)
          )
        );

        if (!controller.signal.aborted) {
          const normalizeStatus = s => (s || '').toLowerCase().replace(/_/g, ' ');
          const completed = cards.filter(c => c && ['completed', 'submitted'].includes(normalizeStatus(c.status)));
          completed.sort((a, b) => (b.session || 0) - (a.session || 0));

          const playerMap = {};
          players.forEach(item => {
            const p = item.player || item;
            const id = String(p._id || p.id || p.playerId || '');
            playerMap[id] = p.playerName || p.name || '';
          });
          const enriched = completed.map(c => ({
            ...c,
            playerName: playerMap[String(c.playerId||'')] || c.playerName || 'Unknown',
          }));

          setSessions(enriched);
          setLoading(false);
        }
      } catch (err) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        setError('Failed to load past sessions');
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [currentUser?.id, userToken]);

  const avgRating = sessions.length > 0
    ? (sessions.reduce((sum, s) => sum + (s.rating || 0), 0) / sessions.length).toFixed(1)
    : '-';

  return (
    <Layout>
      <style>{`@keyframes skPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <button
          onClick={() => navigate('/coach')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: surface, border: `1.5px solid ${border}`, borderRadius: '10px',
            padding: '9px 16px 9px 12px', marginBottom: '16px',
            fontSize: '14px', fontWeight: '600', color: textSecondary,
            cursor: 'pointer', transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'; e.currentTarget.style.color = textPrimary; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = surface; e.currentTarget.style.color = textSecondary; }}
        >
          <ChevronLeft size={18} /> Back to Dashboard
        </button>
        <div style={{
          background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
          borderRadius: '20px', padding: '28px 32px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
          boxShadow: '0 12px 40px rgba(6,0,48,.3)',
        }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,.12)', border: '1.5px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: '0 0 3px', letterSpacing: '-.5px' }}>Past Sessions</h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.6)', margin: 0, fontWeight: '500' }}>Review and track all your completed coaching sessions</p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ flex: 1, minWidth: '140px', height: '92px', borderRadius: '16px', background: '#EEF2F7', animation: 'skPulse 1.6s ease-in-out infinite' }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
            <SummaryCard label="Completed Sessions" value={sessions.length} icon={BookOpen} accent="#6366F1" surface={surface} border={border} />
            <SummaryCard label="Avg Rating" value={avgRating} icon={Star} accent="#8B5CF6" surface={surface} border={border} />
          </div>
        )}

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: '#DC2626' }}>
            <AlertCircle size={20} /> <span>{error}</span>
          </div>
        )}

        {!loading && !error && sessions.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: `2px solid ${border}` }}>
              <CheckCircle size={20} color="#10B981" />
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: textPrimary, margin: 0 }}>Completed Sessions</h2>
              <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '20px', marginLeft: 'auto' }}>{sessions.length}</span>
            </div>
            <div style={{ background: surface, borderRadius: '12px', overflow: 'hidden', border: `1px solid ${border}` }}>
              {sessions.map((session, index) => (
                <div
                  key={session.sessionCardId || session._id || index}
                  onClick={() => navigate(`/coach/view-completed-session/${session.sessionCardId || session._id}`)}
                  style={{
                    padding: '16px 20px', borderBottom: index !== sessions.length - 1 ? `1px solid ${border}` : 'none',
                    backgroundColor: surface, transition: 'background-color 0.2s', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '16px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = dark ? 'rgba(16,185,129,0.06)' : '#F0FDF4'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = surface}
                >
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '16px', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '12px', color: textMuted, margin: '0 0 3px' }}>Player</p>
                      <p style={{ fontSize: '15px', fontWeight: '600', color: textPrimary, margin: 0 }}>
                        {session.playerName || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: textMuted, margin: '0 0 3px' }}>Session</p>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: textPrimary, margin: 0 }}>
                        {session.session ? `#${session.session}` : '-'}{session.Topic ? ` - ${session.Topic}` : ''}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: textMuted, margin: '0 0 3px' }}>Rating</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ background: dark ? 'rgba(16,185,129,0.12)' : '#F0FDF4', color: '#10B981', fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '6px' }}>✓ Completed</span>
                        {session.rating > 0 && <span style={{ fontSize: '13px', fontWeight: '600', color: '#8B5CF6' }}>⭐ {session.rating}/5</span>}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={20} color={textMuted} />
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '12px', textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', backgroundColor: dark ? 'rgba(148,163,184,0.1)' : '#F8FAFC', borderRadius: '50%', marginBottom: '16px' }}>
              <BookOpen size={40} color="#6366F1" />
            </div>
            <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: textSecondary }}>No past sessions yet</p>
            <p style={{ fontSize: '14px', color: textMuted, margin: 0 }}>Your completed sessions will appear here</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PastSessions;
