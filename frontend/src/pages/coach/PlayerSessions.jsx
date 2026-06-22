import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useStore } from '../../context/store';
import { useTheme } from '../../context/ThemeContext';
import { Layout } from '../../components/Layout';
import {
  Calendar, Award, ArrowLeft, BookOpen, TrendingUp, Target,
  ChevronRight, CheckCircle, Clock, AlertCircle,
} from 'lucide-react';

const VIEW_SESSION_CARD_URL = 'https://y6agq7hb3l.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_View_Sessioncard';

const PALETTES = [
  ['#6366F1','#818CF8'], ['#10B981','#34D399'], ['#F59E0B','#FBBF24'],
  ['#EC4899','#F472B6'], ['#3B82F6','#60A5FA'], ['#8B5CF6','#A78BFA'],
  ['#EF4444','#F87171'], ['#06B6D4','#22D3EE'],
];
const pal = (name = '') => PALETTES[(name.charCodeAt(0) || 0) % PALETTES.length];

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

const PlayerSessions = () => {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { players, fetchPlayers, userToken } = useStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const surface = dark ? 'var(--cl-surface)' : '#fff';
  const border = dark ? 'var(--cl-border)' : '#E5E7EB';
  const textPrimary = dark ? 'var(--cl-text)' : '#0F172A';
  const textSecondary = dark ? 'var(--cl-text-2)' : '#475569';
  const textMuted = dark ? 'var(--cl-text-3)' : '#94A3B8';

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const player = players.find(p => p.playerId === playerId);

  useEffect(() => {
    if (players.length === 0) fetchPlayers();
  }, []);

  useEffect(() => {
    if (!player) return;
    const controller = new AbortController();

    const loadSessions = async () => {
      setLoading(true);
      setError(null);
      try {
        const ids = player.sessionCardIds || [];
        if (ids.length === 0) {
          setSessions([]);
          setLoading(false);
          return;
        }
        const headers = { 'Content-Type': 'application/json', ...(userToken && { userToken }) };
        const results = await Promise.all(
          ids.map(id =>
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
          setSessions(results.filter(Boolean));
          setLoading(false);
        }
      } catch (err) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        setError('Failed to load sessions');
        setLoading(false);
      }
    };

    loadSessions();
    return () => controller.abort();
  }, [player?.playerId, player?.sessionCardIds?.length, userToken]);

  if (!loading && !player) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '20px', fontWeight: '600', color: textPrimary, marginBottom: '8px' }}>Player not found</p>
            <button
              onClick={() => navigate(-1)}
              style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
            >
              Go Back
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const normalizeStatus = s => (s || '').toLowerCase().replace(/_/g, ' ');
  const upcomingSessions = sessions.filter(s => ['upcoming', 'draft'].includes(normalizeStatus(s.status)));
  const inProgressSessions = sessions.filter(s => normalizeStatus(s.status) === 'in progress');
  const pendingSessions = sessions.filter(s => ['pending', 'absent', 'excused'].includes(normalizeStatus(s.status)));
  const completedSessions = sessions.filter(s => ['completed', 'submitted'].includes(normalizeStatus(s.status)));

  const avgRating = completedSessions.length > 0
    ? (completedSessions.reduce((sum, s) => sum + (s.rating || 0), 0) / completedSessions.length).toFixed(1)
    : '—';

  const sessionLink = (s) => {
    const st = normalizeStatus(s.status);
    if (st === 'completed' || st === 'submitted') return `/coach/view-completed-session/${s.sessionCardId || s._id}`;
    return `/coach/session/${s.sessionCardId || s._id}`;
  };

  const renderRow = (session, index, total, accent) => (
    <Link
      key={session.sessionCardId || session._id || index}
      to={sessionLink(session)}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', borderBottom: index !== total - 1 ? `1px solid ${border}` : 'none',
        backgroundColor: surface, textDecoration: 'none', color: 'inherit', transition: 'background-color 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = `${accent}12`}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = surface}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '15px', fontWeight: '600', color: textPrimary }}>Session {session.session || '#'}</span>
          {session.Topic && (
            <span style={{ fontSize: '12px', fontWeight: '600', padding: '2px 10px', borderRadius: '20px', background: `${accent}18`, color: accent }}>
              {session.Topic}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: textSecondary, flexWrap: 'wrap' }}>
          {session.totalDuration && <span><Clock size={13} style={{ verticalAlign: 'middle' }} /> {session.totalDuration} min</span>}
          {session.rating > 0 && <span>⭐ {session.rating}</span>}
        </div>
      </div>
      <ChevronRight size={20} color={accent} />
    </Link>
  );

  const renderSection = (title, list, accent, Icon) => {
    if (!list.length) return null;
    return (
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: `2px solid ${border}` }}>
          <Icon size={20} color={accent} />
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: textPrimary, margin: 0 }}>{title}</h2>
          <span style={{ background: `${accent}18`, color: accent, fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '20px', marginLeft: 'auto' }}>{list.length}</span>
        </div>
        <div style={{ background: surface, borderRadius: '12px', overflow: 'hidden', border: `1px solid ${border}` }}>
          {list.map((s, i) => renderRow(s, i, list.length, accent))}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <style>{`@keyframes skPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
          borderRadius: '20px', padding: '28px 32px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
          boxShadow: '0 12px 40px rgba(6,0,48,.3)',
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.18)', color: 'white', border: '1px solid rgba(255,255,255,0.25)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.28)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.18)'}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,.12)', border: '1.5px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: '0 0 3px', letterSpacing: '-.5px' }}>Player Sessions</h1>
            {player && <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.6)', margin: 0, fontWeight: '500' }}>{player.playerName || player.name}</p>}
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
            <SummaryCard label="Total Sessions" value={sessions.length} icon={BookOpen} accent="#6366F1" surface={surface} border={border} />
            <SummaryCard label="Completed" value={completedSessions.length} icon={CheckCircle} accent="#10B981" surface={surface} border={border} />
            <SummaryCard label="In Progress" value={inProgressSessions.length} icon={TrendingUp} accent="#F59E0B" surface={surface} border={border} />
            <SummaryCard label="Avg Rating" value={avgRating} icon={Target} accent="#8B5CF6" surface={surface} border={border} />
          </div>
        )}

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: '#DC2626' }}>
            <AlertCircle size={20} /> <span>{error}</span>
          </div>
        )}

        {!loading && !error && (
          <>
            {renderSection('In Progress', inProgressSessions, '#F59E0B', Clock)}
            {renderSection('Upcoming', upcomingSessions, '#6366F1', Clock)}
            {renderSection('Pending / Absent', pendingSessions, '#94A3B8', Clock)}
            {renderSection('Completed', completedSessions, '#10B981', CheckCircle)}
            {sessions.length === 0 && (
              <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '12px', textAlign: 'center', padding: '48px 20px' }}>
                <BookOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#94A3B8' }} />
                <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: textSecondary }}>No sessions yet</p>
                <p style={{ fontSize: '14px', color: textMuted, margin: 0 }}>Sessions will appear here once created</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default PlayerSessions;
