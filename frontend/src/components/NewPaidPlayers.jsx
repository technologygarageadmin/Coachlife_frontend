import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/store';
import { useTheme } from '../context/ThemeContext';
import { Toast } from './Toast';
import { CL_SYNC_REGISTRATIONS_URL, syncNewPlayers, AUTO_SYNC_MINUTES } from '../utils/newPlayersApi';
import { pathwayNamesFrom, matchPathway, courseName, normKey } from '../utils/pathwayMatch';
import { UserPlus, RefreshCw, Loader, AlertTriangle, Undo2, X, ChevronDown, Plus } from 'lucide-react';


const BTN_BG = 'linear-gradient(135deg, rgb(6,0,48) 0%, rgb(26,0,96) 55%, rgb(59,0,128) 100%)';
const BTN_SHADOW = '0 2px 8px rgba(99,102,241,0.35)';
const BRAND = '#060030';

const COURSE_LABEL = {
  foundation: 'Foundation',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  tgsessions: 'TG Sessions',
  tgsessionstest: 'TG Sessions (test)',
};

const unwrap = (data) => {
  let d = data;
  if (d?.body && typeof d.body === 'string') d = JSON.parse(d.body);
  return d || {};
};

const apiError = (err, fallback) => err.response?.data?.error || err.response?.data?.message || fallback;

/*
 * New Technology Garage registrations that are not in CoachLife yet. Lives on the
 * Players pages. Syncs when it first appears, and on the Sync button. Placing a
 * player into a batch is a later step, so this only lists / dismisses for now.
 */
const NewPaidPlayers = ({ onAddPlayer }) => {
  const { userToken, learningPathway, fetchLearningPathway, hasRole } = useStore();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [view, setView] = useState('new');
  const [players, setPlayers] = useState([]);
  const [counts, setCounts] = useState({ new: 0, placed: 0, dismissed: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [open, setOpen] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [undo, setUndo] = useState(null);
  const rootRef = useRef(null);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    if (userToken && !(Array.isArray(learningPathway) && learningPathway.length)) {
      Promise.resolve(fetchLearningPathway?.()).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userToken]);

  // Below this width the one-line rows no longer fit, so each player becomes a small stacked card.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < 850));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const closeToast = useCallback(() => setToast(null), []);
  const headers = useMemo(() => ({ 'Content-Type': 'application/json', ...(userToken && { userToken }) }), [userToken]);
  const announceChange = () => window.dispatchEvent(new Event('newplayers:changed'));

  const runSync = useCallback(async (signal) => {
    setSyncing(true);
    try {
      const d = await syncNewPlayers(userToken, signal);
      setCounts(d.counts || { new: 0, placed: 0, dismissed: 0 });
      setError('');
      if (d.imported > 0) setToast({ message: `${d.imported} new player${d.imported === 1 ? '' : 's'} added`, type: 'success' });
      announceChange();
      return true;
    } catch (err) {
      if (err.name !== 'CanceledError') setError(apiError(err, 'Could not sync registrations'));
      return false;
    } finally {
      setSyncing(false);
    }
  }, [userToken]);

  useEffect(() => {
    if (!userToken) return undefined;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const d = unwrap((await axios.get(`${CL_SYNC_REGISTRATIONS_URL}?status=${view}`, { headers, signal: controller.signal })).data);
        setPlayers(d.players || []);
        setCounts(d.counts || { new: 0, placed: 0, dismissed: 0 });
      } catch (err) {
        if (err.name !== 'CanceledError') setError(apiError(err, 'Failed to load new players'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [view, reloadKey, headers, userToken]);

  useEffect(() => {
    const refresh = () => setReloadKey(k => k + 1);
    window.addEventListener('newplayers:refresh', refresh);
    return () => window.removeEventListener('newplayers:refresh', refresh);
  }, []);

  useEffect(() => {
    if (!undo) return undefined;
    const t = setTimeout(() => setUndo(null), 10000);
    return () => clearTimeout(t);
  }, [undo]);

  const syncNow = async () => {
    const ok = await runSync();
    if (ok) setReloadKey(k => k + 1);
  };

  const changeStatus = async (p, status) => {
    setBusyId(p.newPlayerId);
    try {
      await axios.post(CL_SYNC_REGISTRATIONS_URL, { action: 'setStatus', newPlayerId: p.newPlayerId, status }, { headers });
      if (status === 'dismissed') setUndo(p);
      else { setUndo(null); setToast({ message: `${p.name} restored`, type: 'success' }); }
      announceChange();
      setReloadKey(k => k + 1);
    } catch (err) {
      setToast({ message: apiError(err, 'Request failed'), type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const text = dark ? '#F1F5F9' : '#0F172A';
  const sub = dark ? '#94A3B8' : '#64748B';
  const line = dark ? 'rgba(255,255,255,0.08)' : '#E2E8F0';
  const card = dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const warnBg = dark ? 'rgba(245,158,11,0.14)' : '#FFFBEB';
  const warnBd = dark ? 'rgba(251,191,36,0.5)' : '#FCD34D';
  const warnFg = dark ? '#FCD34D' : '#92400E';
  const amber = '#F59E0B';

  const smallBtn = (disabled) => ({
    display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '0 11px', height: 28, borderRadius: '8px', cursor: 'pointer',
    border: `1.5px solid ${line}`, background: card, color: text, fontSize: '12px', fontWeight: '700', opacity: disabled ? 0.6 : 1,
  });

  const AVATARS = [['#6366F1', '#818CF8'], ['#10B981', '#34D399'], ['#F59E0B', '#FBBF24'], ['#EC4899', '#F472B6'], ['#3B82F6', '#60A5FA'], ['#8B5CF6', '#A78BFA']];
  const avatarFor = (name = '') => AVATARS[(name.charCodeAt(0) || 0) % AVATARS.length];
  const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';

  // Known short keys get a tidy label; anything else (a full pathway name) is shown as typed, title-cased.
  const courseText = (c) => COURSE_LABEL[c] || String(c || '').replace(/\b\w/g, ch => ch.toUpperCase()) || '—';
  const courseTone = (c) => {
    const key = ['foundation', 'intermediate', 'advanced', 'tgsession'].find(w => String(c || '').toLowerCase().includes(w)) || '';
    const t = COURSE_TONE[key === 'tgsession' ? 'tgsessions' : key] || ['#EEF2FF', '#3730A3', 'rgba(99,102,241,0.18)', '#C7D2FE'];
    return dark ? { bg: t[2], fg: t[3] } : { bg: t[0], fg: t[1] };
  };

  const COURSE_TONE = {
    foundation: ['#DCFCE7', '#166534', 'rgba(16,185,129,0.18)', '#6EE7B7'],
    intermediate: ['#DBEAFE', '#1E40AF', 'rgba(59,130,246,0.2)', '#93C5FD'],
    advanced: ['#EDE9FE', '#5B21B6', 'rgba(139,92,246,0.22)', '#C4B5FD'],
    tgsessions: ['#FEF3C7', '#92400E', 'rgba(245,158,11,0.2)', '#FCD34D'],
  };

  // Technology Garage stores "16-11-2026 22:15:09" (day-month-year); accept year-first too.
  const shortDate = (v) => {
    const raw = String(v || '').trim();
    const m = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/) || null;
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const parts = m ? [Number(m[3]), Number(m[2]), Number(m[1])] : (iso ? [Number(iso[1]), Number(iso[2]), Number(iso[3])] : null);
    if (!parts) return raw ? raw.slice(0, 11) : '—';
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    if (Number.isNaN(d.getTime())) return raw.slice(0, 11);
    const sameYear = parts[0] === new Date().getFullYear();
    return d.toLocaleDateString('en-GB', sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const COLS = `minmax(180px, 1.3fr) minmax(130px, 1fr) 142px 84px ${onAddPlayer && view === 'new' ? '206px' : '104px'}`;
  const headBg = dark ? 'rgba(255,255,255,0.03)' : '#F8FAFC';
  const hoverBg = dark ? 'rgba(255,255,255,0.05)' : '#F8FAFF';
  const newCount = counts.new || 0;

  // A course whose pathway CoachLife does not have yet. Only judged once the pathway list has loaded.
  const pathwayNames = useMemo(() => pathwayNamesFrom(learningPathway), [learningPathway]);
  const isMissing = (p) => pathwayNames.length > 0 && Boolean(p.course) && !matchPathway(p, pathwayNames);
  const missingGroups = useMemo(() => {
    if (view !== 'new' || !pathwayNames.length) return [];
    const groups = new Map();
    players.forEach((p) => {
      if (!p.course || matchPathway(p, pathwayNames)) return;
      const key = normKey(p.course);
      const g = groups.get(key) || { name: courseName(p.course), count: 0 };
      g.count += 1;
      groups.set(key, g);
    });
    return [...groups.values()];
  }, [players, pathwayNames, view]);
  const canAddPathway = typeof hasRole === 'function' && hasRole('admin');

  return (
    <div ref={rootRef} style={{ marginBottom: '16px', border: `1px solid ${newCount ? `${amber}66` : line}`, borderRadius: '14px', background: card, overflow: 'hidden', boxShadow: dark ? 'none' : '0 2px 8px rgba(15,23,42,0.04)' }}>
      {toast && <Toast message={toast.message} type={toast.type} duration={3000} onClose={closeToast} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', padding: '9px 14px' }}>
        <button onClick={() => setOpen(o => !o)} aria-expanded={open} style={{
          display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: text, textAlign: 'left', minWidth: 0,
        }}>
          <span style={{
            width: 30, height: 30, borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            background: `${amber}${dark ? '33' : '1F'}`, color: amber, border: `1px solid ${amber}${dark ? '55' : '33'}`,
          }}><UserPlus size={15} /></span>
          <span style={{ fontSize: '14.5px', fontWeight: '800' }}>New players</span>
          <span style={{
            minWidth: 22, height: 22, padding: '0 7px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, background: newCount ? amber : (dark ? 'rgba(255,255,255,0.1)' : '#EEF2F7'), color: newCount ? '#fff' : sub,
          }}>{newCount}</span>
          <span style={{ fontSize: '12px', color: sub, fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Registered on Technology Garage · not in a batch yet</span>
          <ChevronDown size={15} color={sub} style={{ flexShrink: 0, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => { setView(v => (v === 'new' ? 'dismissed' : 'new')); setOpen(true); }} style={smallBtn(false)}>
            {view === 'new' ? `Dismissed (${counts.dismissed || 0})` : 'Back to new'}
          </button>
          <button onClick={syncNow} disabled={syncing} title={`Check for new registrations now. This also runs by itself every ${AUTO_SYNC_MINUTES} minutes while CoachLife is open.`} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '0 13px', height: 28, borderRadius: '8px', border: `1.5px solid ${BRAND}`,
            color: '#fff', fontSize: '12px', fontWeight: '700', cursor: syncing ? 'wait' : 'pointer', opacity: syncing ? 0.75 : 1,
            background: BTN_BG, boxShadow: BTN_SHADOW,
          }}>
            <RefreshCw size={12} style={syncing ? { animation: 'spin 1s linear infinite' } : undefined} /> {syncing ? 'Syncing…' : 'Sync'}
          </button>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${line}` }}>
          {error && (
            <div style={{ margin: '10px 14px 0', padding: '8px 11px', borderRadius: '9px', color: '#DC2626', background: 'rgba(239,68,68,0.08)', fontSize: '12px', fontWeight: '600' }}>{error}</div>
          )}

          {missingGroups.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', margin: '10px 14px 0', padding: '9px 12px',
              borderRadius: '10px', background: warnBg, border: `1px solid ${warnBd}`, color: warnFg, fontSize: '12.5px', lineHeight: 1.45,
            }}>
              <span style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0 }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <b>New pathway needed in CoachLife:</b> {missingGroups.map(g => `${g.name} (${g.count} player${g.count === 1 ? '' : 's'})`).join(', ')}.
                  {' '}Ask a coach to add {missingGroups.length === 1 ? 'it' : 'them'} on the Learning Pathway page, then choose {missingGroups.length === 1 ? 'it' : 'them'} when you add these players.
                </span>
              </span>
              {canAddPathway && (
                <button onClick={() => navigate('/admin/learning-pathway/add')} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px', height: 26, padding: '0 11px', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  border: `1.5px solid ${warnBd}`, background: card, color: warnFg, fontSize: '12px', fontWeight: '700',
                }}><Plus size={12} /> Add pathway</button>
              )}
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px', color: sub }}>
              <Loader size={17} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : !players.length ? (
            <div style={{ padding: '14px', textAlign: 'center', color: sub, fontSize: '12.5px' }}>
              {view === 'new' ? 'No new players right now.' : 'Nothing dismissed.'}
            </div>
          ) : (
            <div>
              {!narrow && (
                <div style={{
                  display: 'grid', gridTemplateColumns: COLS, gap: '14px', padding: '6px 14px', background: headBg, borderBottom: `1px solid ${line}`,
                  fontSize: '10.5px', fontWeight: '800', letterSpacing: '.5px', textTransform: 'uppercase', color: sub,
                }}>
                  <span>Player</span><span>Parent</span><span>Course</span><span>Date</span><span />
                </div>
              )}
              {players.map((p, i) => {
                const [c1, c2] = avatarFor(p.name);
                const tone = courseTone(p.course);
                const busy = busyId === p.newPlayerId;

                const nameCell = (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <span style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11.5, fontWeight: 800, color: '#fff', background: `linear-gradient(135deg, ${c1}, ${c2})`,
                    }}>{initials(p.name)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.25 }}>{p.name || '—'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2px 6px', fontSize: '11.5px', color: sub, lineHeight: 1.25, marginTop: 1 }}>
                        <span style={{ whiteSpace: 'nowrap' }}>{p.isAdult ? 'Adult' : (p.age ? `${p.age} years` : '—')}</span>
                        {p.possibleDuplicate && (
                          <span title={`${p.possibleDuplicate.reason}${p.possibleDuplicate.playerName ? ` · ${p.possibleDuplicate.playerName}` : ''}`} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '0 6px', borderRadius: '5px', flexShrink: 0, whiteSpace: 'nowrap',
                            background: warnBg, border: `1px solid ${warnBd}`, color: warnFg, fontSize: '10.5px', fontWeight: '700',
                          }}><AlertTriangle size={10} /> Possible duplicate</span>
                        )}
                      </div>
                    </div>
                  </div>
                );

                const parentCell = (
                  <div style={{ minWidth: 0, lineHeight: 1.25 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '600', color: text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.parentName || '—'}</div>
                    <div style={{ fontSize: '11.5px', color: sub, marginTop: 1 }}>{p.phone || ''}</div>
                  </div>
                );

                const missing = isMissing(p);
                const courseChip = (
                  <span title={missing ? `${courseName(p.course)} is not a pathway in CoachLife yet. Ask a coach to add it.` : undefined} style={{
                    display: 'inline-block', maxWidth: '100%', padding: '3px 9px', borderRadius: '999px', fontSize: '11.5px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle',
                    background: missing ? warnBg : tone.bg, color: missing ? warnFg : tone.fg, ...(missing ? { border: `1px solid ${warnBd}` } : {}),
                  }}>{missing && <AlertTriangle size={10} style={{ marginRight: 4, verticalAlign: '-1px' }} />}{courseText(p.course)}</span>
                );

                const dateCell = <span title={p.paidAt || ''} style={{ display: 'block', minWidth: 0, fontSize: '12px', color: sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shortDate(p.paidAt)}</span>;

                const actions = (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {onAddPlayer && view === 'new' && (
                      <button
                        onClick={() => onAddPlayer(p)}
                        disabled={busy}
                        title="Open the Add Player form with this registration's details"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px', height: 26, padding: '0 11px', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                          border: `1.5px solid ${BRAND}`, background: BTN_BG, boxShadow: BTN_SHADOW, color: '#fff', fontSize: '12px', fontWeight: '700', opacity: busy ? 0.6 : 1,
                        }}
                      ><Plus size={12} /> Add player</button>
                    )}
                    <button
                      onClick={() => changeStatus(p, view === 'new' ? 'dismissed' : 'new')}
                      disabled={busy}
                      title={view === 'new' ? 'Hide from this list. You can undo it, or restore it later from Dismissed.' : 'Move back to New players'}
                      aria-label={`${view === 'new' ? 'Dismiss' : 'Restore'} ${p.name}`}
                      style={{ ...smallBtn(busy), height: 26, padding: '0 10px', color: sub, whiteSpace: 'nowrap', flexShrink: 0 }}
                      onMouseEnter={(e) => { if (view === 'new') { e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.45)'; } }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = sub; e.currentTarget.style.borderColor = line; }}
                    >
                      {view === 'new' ? <X size={12} /> : <Undo2 size={12} />} {view === 'new' ? 'Dismiss' : 'Restore'}
                    </button>
                  </div>
                );

                const hover = {
                  onMouseEnter: (e) => { e.currentTarget.style.background = hoverBg; },
                  onMouseLeave: (e) => { e.currentTarget.style.background = 'transparent'; },
                };

                return narrow ? (
                  <div key={p.newPlayerId} {...hover} style={{
                    display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 14px',
                    borderTop: i === 0 ? 'none' : `1px solid ${line}`, transition: 'background .12s',
                  }}>
                    {nameCell}
                    <div style={{ fontSize: '12.5px', color: sub, paddingLeft: 40 }}>
                      <span style={{ color: text, fontWeight: 600 }}>{p.parentName || '—'}</span>{p.phone ? ` · ${p.phone}` : ''}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingLeft: 40 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>{courseChip}{dateCell}</div>
                      {actions}
                    </div>
                  </div>
                ) : (
                  <div key={p.newPlayerId} {...hover} style={{
                    display: 'grid', gridTemplateColumns: COLS, gap: '14px', alignItems: 'center', padding: '7px 14px',
                    borderTop: i === 0 ? 'none' : `1px solid ${line}`, transition: 'background .12s',
                  }}>
                    {nameCell}
                    {parentCell}
                    <div>{courseChip}</div>
                    <div>{dateCell}</div>
                    {actions}
                  </div>
                );
              })}
            </div>
          )}

          {undo && view === 'new' && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 14px',
              borderTop: `1px solid ${line}`, background: dark ? 'rgba(255,255,255,0.04)' : '#F8FAFC', fontSize: '12.5px', color: text,
            }}>
              <span><b>{undo.name}</b> dismissed. Clicked by mistake?</span>
              <button onClick={() => changeStatus(undo, 'new')} style={{ ...smallBtn(false), height: 26, color: '#4F46E5', borderColor: 'rgba(79,70,229,0.4)' }}>
                <Undo2 size={12} /> Undo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NewPaidPlayers;
