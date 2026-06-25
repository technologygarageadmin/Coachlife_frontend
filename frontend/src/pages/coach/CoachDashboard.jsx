import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import {
  Users, BookOpen, Plus, Award, Search, ChevronRight, ChevronLeft,
  AlertCircle, Loader, Layers, X, ExternalLink, Calendar, Trophy,
  Clock, CheckCircle, AlertTriangle, Play, BarChart2,
} from 'lucide-react';

/* ─── constants ─────────────────────────────────────────────────────── */
const PALETTES = [
  '#6366F1','#10B981','#F59E0B','#EC4899',
  '#3B82F6','#8B5CF6','#EF4444','#06B6D4',
];
const avatarColor = name => PALETTES[(name?.charCodeAt(0) || 0) % PALETTES.length];

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const BATCHES_URL   = 'https://ts6wti3133.execute-api.ap-south-1.amazonaws.com/default/CL_Get_Batches';
const VIEW_CARD_URL = 'https://kyfkhl8v4l.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_View_Sessioncard';
const ATTEND_URL    = 'https://expqdxymlf.execute-api.ap-south-1.amazonaws.com/default/CL_Get_Attendance';

const ATT_CFG = {
  Present: { bg:'#DCFCE7', color:'#16A34A', border:'#BBF7D0', dot:'#22C55E' },
  Absent:  { bg:'#FEE2E2', color:'#DC2626', border:'#FECACA', dot:'#EF4444' },
};

const toDateStr = d => {
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
};
const getDaysInMonth = (y,m) => new Date(y,m+1,0).getDate();
const getFirstWeekday = (y,m) => { const d=new Date(y,m,1).getDay(); return d===0?6:d-1; };
const normStatus = s => (s||'').toLowerCase().replace(/[\s_]/g,'');
const DONE_STATUSES = new Set(['completed', 'submitted']);
const UPCOMING_STATUSES = new Set(['upcoming', 'draft']);
const isDoneCard     = c => DONE_STATUSES.has(normStatus(c.status));
const isUpcomingCard = c => UPCOMING_STATUSES.has(normStatus(c.status));
// "Pending" = needs the coach's attention now (not completed, not just upcoming/scheduled)
const isPendingCard  = c => !isDoneCard(c) && !isUpcomingCard(c);

/* ─── PlayerRow ─────────────────────────────────────────────────────── */
const PlayerRow = React.memo(({ player, selected, onClick }) => {
  const [hov, setHov] = useState(false);
  const color = avatarColor(player.name);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:'flex', alignItems:'center', gap:'12px',
        padding:'11px 14px', borderRadius:'12px', cursor:'pointer',
        background: selected ? '#060030' : hov ? '#EEF2FF' : 'transparent',
        border: `1.5px solid ${selected ? '#060030' : hov ? '#C7D2FE' : 'transparent'}`,
        transition:'all .18s', marginBottom:'4px',
      }}
    >
      <div style={{
        width:'38px', height:'38px', borderRadius:'50%', flexShrink:0,
        background: selected ? 'rgba(255,255,255,.18)' : color,
        border: selected ? '2px solid rgba(255,255,255,.4)' : `2px solid ${color}22`,
        display:'flex', alignItems:'center', justifyContent:'center',
        color:'#fff', fontWeight:'800', fontSize:'15px',
      }}>
        {player.name.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:'13px', fontWeight:'700', margin:'0 0 1px',
          color: selected?'#fff':'#0F172A',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {player.name}
        </p>
        <p style={{ fontSize:'11px', margin:0,
          color: selected?'rgba(255,255,255,.55)':'#64748B',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {player.LearningPathway || 'No pathway'}
        </p>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'3px', flexShrink:0 }}>
        <span style={{
          fontSize:'10px', fontWeight:'700', padding:'2px 8px', borderRadius:'999px',
          background: selected?'rgba(255,255,255,.15)':'rgba(99,102,241,.1)',
          color: selected?'#fff':'#6366F1',
        }}>
          {player.sessionCardIds?.length||0} cards
        </span>
        <span style={{ fontSize:'10px', fontWeight:'600', color: selected?'rgba(255,255,255,.5)':'#94A3B8' }}>
          {player.totalPoints||0} pts
        </span>
      </div>
    </div>
  );
});

/* ─── StatTile ──────────────────────────────────────────────────────── */
const StatTile = ({ label, value, Icon, color, gradBg, onClick, active }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex:1, minWidth:'160px', background:'#fff', borderRadius:'16px', padding:'20px',
        border: `1px solid ${(hov||active) ? color+'40' : '#EEF2F7'}`,
        boxShadow: (hov||active) ? `0 8px 24px ${color}20` : '0 2px 8px rgba(0,0,0,0.04)',
        display:'flex', alignItems:'center', gap:'16px',
        cursor: onClick ? 'pointer' : 'default',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        transition:'all .25s ease',
      }}
    >
      <div style={{
        width:'52px', height:'52px', borderRadius:'14px',
        background: gradBg, flexShrink:0,
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:`0 4px 12px ${color}30`,
      }}>
        <Icon size={22} color={color} />
      </div>
      <div style={{ flex:1 }}>
        <p style={{ fontSize:'11px', fontWeight:'600', color:'#94A3B8', margin:0,
          textTransform:'uppercase', letterSpacing:'.6px' }}>{label}</p>
        <p style={{ fontSize:'26px', fontWeight:'800', color:'#1E293B', margin:'4px 0 0',
          letterSpacing:'-.5px' }}>{value}</p>
      </div>
      {onClick && <ChevronRight size={14} color={active ? color : '#CBD5E1'} style={{ flexShrink:0 }} />}
    </div>
  );
};

/* ─── main ──────────────────────────────────────────────────────────── */
export default function CoachDashboard() {
  const { currentUser, fetchAssignedPlayersForCoach, userToken } = useStore();
  const navigate = useNavigate();

  const [myPlayers,    setMyPlayers]    = useState([]);
  const [batchCount,   setBatchCount]   = useState(0);
  const [attRecs,      setAttRecs]      = useState([]);
  const [cardsMap,     setCardsMap]     = useState({});
  const [loading,      setLoading]      = useState(true);
  const [cardsLoading, setCardsLoading] = useState(false);

  const [selected,    setSelected]    = useState(null);
  const [search,      setSearch]      = useState('');
  const [showPending, setShowPending] = useState(false);

  const [calNav,   setCalNav]   = useState(() => { const n=new Date(); return { month:n.getMonth(), year:n.getFullYear() }; });
  const [selDate,  setSelDate]  = useState(null);

  const axiosHeaders = useMemo(
    () => ({ 'Content-Type':'application/json', 'userToken': userToken, 'usertoken': userToken }),
    [userToken]
  );
  const cardAxiosHeaders = useMemo(
    () => ({ 'Content-Type':'application/json', ...(userToken && { userToken }) }),
    [userToken]
  );

  /* ── Effect 1: players first (unblocks UI), then batches + attendance in bg ── */
  useEffect(() => {
    if (!currentUser?.id || !userToken) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      let list = [];
      try {
        const result = await fetchAssignedPlayersForCoach(currentUser.id);
        if (!result.success || !result.players || cancelled) return;

        list = result.players.map(item => {
          const p = item.player || item;
          return {
            playerId:        p._id||p.id||p.playerId,
            name:            p.playerName||p.name||'',
            LearningPathway: p.LearningPathway||'',
            totalPoints:     p.TotalPoints||p.totalPoints||0,
            sessionCardIds:  item.sessionCardIds||p.sessionCardIds||[],
          };
        });

        // paint immediately — player list + card fetch (Effect 2) can start now
        setMyPlayers(list);
      } finally {
        if (!cancelled) setLoading(false);
      }

      // background: batches + attendance (don't block the page)
      const pnames = new Set(list.map(p => (p.name||'').toLowerCase().trim()));
      const [bRes, aRes] = await Promise.allSettled([
        fetch(BATCHES_URL, { headers: { 'Content-Type':'application/json', 'userToken': userToken } })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null),
        axios.post(ATTEND_URL, {}, { headers: axiosHeaders })
          .then(r => r.data)
          .catch(() => null),
      ]);
      if (cancelled) return;

      if (bRes.status === 'fulfilled' && bRes.value) {
        let bd = bRes.value;
        if (bd?.body && typeof bd.body === 'string') bd = JSON.parse(bd.body);
        const batches = Array.isArray(bd) ? bd : (bd.batches || []);
        setBatchCount(batches.filter(b => b.coachIds && b.coachIds.includes(currentUser.id)).length);
      }

      if (aRes.status === 'fulfilled' && aRes.value) {
        let ad = aRes.value;
        if (ad?.body && typeof ad.body === 'string') ad = JSON.parse(ad.body);
        setAttRecs((ad.records || []).filter(r => pnames.has((r.playerName||'').toLowerCase().trim())));
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.id, userToken]);

  /* ── Effect 2: session cards — runs after players load, non-blocking ── */
  useEffect(() => {
    if (myPlayers.length === 0 || !userToken) return;
    let cancelled = false;

    const cardEntries = myPlayers.flatMap(p =>
      (p.sessionCardIds||[]).map(id => ({ playerId: String(p.playerId), id }))
    );
    if (cardEntries.length === 0) return;

    // Fetch one card; retry transient failures (the Lambda throttles request bursts).
    const fetchCard = async (id, attempt = 0) => {
      try {
        const r = await axios.post(VIEW_CARD_URL, { sessionCardId: id }, { headers: cardAxiosHeaders });
        let d = r.data;
        if (d?.body && typeof d.body === 'string') { try { d = JSON.parse(d.body); } catch { return null; } }
        if (!d) return null;
        const card = d.sessionCard || d.data || d;
        const isCard = card && typeof card === 'object' &&
          (card.activities || card.Topic || card.status || card.session !== undefined || card.sessionCardId || card._id);
        return isCard ? { sessionCardId: id, ...card } : null;
      } catch {
        if (attempt < 2 && !cancelled) {
          await new Promise(res => setTimeout(res, 300 * (attempt + 1)));
          return fetchCard(id, attempt + 1);
        }
        return null;
      }
    };

    // Run with limited concurrency so we don't burst the API (firing every
    // player's cards at once was throttling and silently dropping some).
    const runPool = async (entries, limit) => {
      const out = new Array(entries.length);
      let idx = 0;
      const worker = async () => {
        while (idx < entries.length && !cancelled) {
          const cur = idx++;
          out[cur] = await fetchCard(entries[cur].id);
        }
      };
      await Promise.all(Array.from({ length: Math.min(limit, entries.length) }, worker));
      return out;
    };

    (async () => {
      setCardsLoading(true);
      try {
        const results = await runPool(cardEntries, 5);
        if (cancelled) return;
        const cMap = {};
        myPlayers.forEach(p => { cMap[String(p.playerId)] = []; });
        results.forEach((val, i) => {
          if (val) {
            const pid = cardEntries[i].playerId;
            if (cMap[pid]) cMap[pid].push(val);
          }
        });
        setCardsMap(cMap);
      } finally {
        if (!cancelled) setCardsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [myPlayers, userToken]);

  /* ── derived (all from already-loaded cardsMap, no extra fetches) ── */
  const totalPoints = useMemo(() => myPlayers.reduce((s,p)=>s+(p.totalPoints||0),0), [myPlayers]);

  const pendingMap = useMemo(() => {
    const map = {};
    myPlayers.forEach(p => {
      const pCards = cardsMap[String(p.playerId)] || [];
      map[String(p.playerId)] = { name: p.name, count: pCards.filter(isPendingCard).length };
    });
    return map;
  }, [myPlayers, cardsMap]);

  const totalPending = useMemo(
    () => Object.values(pendingMap).reduce((s,v) => s + v.count, 0),
    [pendingMap]
  );

  const selectedCards = useMemo(
    () => selected ? (cardsMap[String(selected.playerId)] || []) : [],
    [selected, cardsMap]
  );

  const cardStats = useMemo(() => {
    if (!selected) return null;
    return {
      total:     selectedCards.length,
      completed: selectedCards.filter(isDoneCard).length,
      pending:   selectedCards.filter(isPendingCard).length,
      upcoming:  selectedCards.filter(isUpcomingCard).length,
    };
  }, [selected, selectedCards]);

  const filtered = useMemo(
    ()=>myPlayers.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())),
    [myPlayers, search]
  );

  /* ── calendar ───────────────────────────────────────────────────── */
  const cells = useMemo(() => {
    const {month,year}=calNav;
    const blanks=getFirstWeekday(year,month), days=getDaysInMonth(year,month);
    return [...Array(blanks).fill(null), ...Array.from({length:days},(_,i)=>i+1)];
  }, [calNav]);

  const byDate = useMemo(() => {
    const map={};
    attRecs.forEach(r=>{ if (!r.sessionDate) return; if (!map[r.sessionDate]) map[r.sessionDate]=[]; map[r.sessionDate].push(r); });
    return map;
  }, [attRecs]);

  const selDateRecs = useMemo(()=>selDate?(byDate[selDate]||[]):[], [byDate,selDate]);
  const today = toDateStr(new Date());

  /* ── loading skeleton ───────────────────────────────────────────── */
  if (loading) return (
    <Layout>
      <style>{`@keyframes skPulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
      <div style={{ maxWidth:'1300px',margin:'0 auto',padding:'0 28px 40px' }}>
        <div style={{ height:'90px',borderRadius:'18px',background:'linear-gradient(135deg,#060030,#3b0080)',marginBottom:'20px' }} />
        <div style={{ display:'flex',gap:'14px',marginBottom:'20px' }}>
          {[1,2,3,4].map(i=><div key={i} style={{ flex:1,height:'90px',borderRadius:'14px',background:'#F1F5F9',animation:'skPulse 1.6s infinite' }} />)}
        </div>
      </div>
    </Layout>
  );

  /* ── render ─────────────────────────────────────────────────────── */
  return (
    <Layout>
      <style>{`
        @keyframes skPulse{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div style={{ maxWidth:'1300px',margin:'0 auto',padding:'0 28px 48px' }}>

        {/* ── Banner ─────────────────────────────────────────────── */}
        <div style={{
          background:'linear-gradient(135deg,#060030 0%,#1a0060 60%,#3b0080 100%)',
          borderRadius:'18px', padding:'22px 28px', marginBottom:'20px',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px',
          boxShadow:'0 10px 36px rgba(6,0,48,.32)', flexWrap:'wrap',
        }}>
          <div style={{ display:'flex',alignItems:'center',gap:'14px' }}>
            <div style={{ width:'46px',height:'46px',borderRadius:'12px',background:'rgba(255,255,255,.12)',border:'1.5px solid rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <BookOpen size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize:'20px',fontWeight:'800',color:'#fff',margin:'0 0 3px',letterSpacing:'-.4px' }}>
                Welcome back, {currentUser?.username}
              </h1>
              <p style={{ fontSize:'12px',color:'rgba(255,255,255,.55)',margin:0 }}>
                {myPlayers.length} player{myPlayers.length!==1?'s':''} · {batchCount} batch{batchCount!==1?'es':''}
              </p>
            </div>
          </div>
          <div style={{ display:'flex',gap:'10px' }}>
            <Link to="/coach/start-session" style={{ display:'flex',alignItems:'center',gap:'7px',padding:'9px 18px',borderRadius:'9px',background:'rgba(255,255,255,.15)',border:'1.5px solid rgba(255,255,255,.25)',color:'#fff',fontSize:'13px',fontWeight:'700',textDecoration:'none' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.25)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.15)'}
            ><Play size={14} /> Start Session</Link>
            <Link to="/coach/past-sessions" style={{ display:'flex',alignItems:'center',gap:'7px',padding:'9px 18px',borderRadius:'9px',background:'rgba(255,255,255,.08)',border:'1.5px solid rgba(255,255,255,.15)',color:'rgba(255,255,255,.8)',fontSize:'13px',fontWeight:'600',textDecoration:'none' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.15)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.08)'}
            ><BarChart2 size={14} /> Past Sessions</Link>
          </div>
        </div>

        {/* ── Stats ──────────────────────────────────────────────── */}
        <div style={{ display:'flex',gap:'16px',marginBottom:'20px',flexWrap:'wrap' }}>
          <StatTile label="My Players"    value={myPlayers.length}                           Icon={Users}         color="#6366F1" gradBg="linear-gradient(135deg,#EEF2FF,#E0E7FF)" />
          <StatTile label="My Batches"    value={batchCount}                                 Icon={Layers}        color="#10B981" gradBg="linear-gradient(135deg,#ECFDF5,#D1FAE5)" />
          <StatTile
            label="Pending Cards"
            value={cardsLoading ? '…' : totalPending}
            Icon={AlertTriangle}
            color="#F59E0B"
            gradBg="linear-gradient(135deg,#FFFBEB,#FEF3C7)"
            onClick={() => setShowPending(p => !p)}
            active={showPending}
          />
          <StatTile label="Points Earned" value={totalPoints.toLocaleString()}               Icon={Trophy}        color="#8B5CF6" gradBg="linear-gradient(135deg,#F5F3FF,#EDE9FE)" />
        </div>

        {/* ── Pending Panel ──────────────────────────────────────── */}
        {showPending && (
          <div style={{ background:'#FFFBEB',border:'1.5px solid #FDE68A',borderRadius:'14px',marginBottom:'20px',overflow:'hidden',animation:'fadeIn .22s ease',boxShadow:'0 4px 18px rgba(245,158,11,.12)' }}>
            <div style={{ padding:'14px 20px',borderBottom:'1px solid #FDE68A',display:'flex',alignItems:'center',gap:'10px' }}>
              <AlertTriangle size={16} color="#D97706" />
              <p style={{ fontSize:'14px',fontWeight:'800',color:'#92400E',margin:0,flex:1 }}>Pending Session Cards</p>
              <button onClick={()=>setShowPending(false)} style={{ background:'none',border:'none',cursor:'pointer',color:'#B45309',display:'flex' }}><X size={16} /></button>
            </div>
            <div style={{ padding:'12px 14px' }}>
              {cardsLoading ? (
                <div style={{ display:'flex',alignItems:'center',gap:'10px',padding:'16px',color:'#B45309' }}>
                  <Loader size={16} style={{ animation:'spin 1s linear infinite' }} />
                  <span style={{ fontSize:'13px',fontWeight:'600' }}>Loading session card statuses…</span>
                </div>
              ) : (
                <div style={{ display:'flex',flexWrap:'wrap',gap:'8px' }}>
                  {myPlayers.map(player => {
                    const info = pendingMap[String(player.playerId)]||{ count:0 };
                    const hasPending = info.count > 0;
                    return (
                      <div key={player.playerId} style={{ display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',borderRadius:'10px',background:hasPending?'#fff':'#F9FAFB',border:`1.5px solid ${hasPending?'#FDE68A':'#E2E8F0'}`,minWidth:'200px',flex:'1 1 200px' }}>
                        <div style={{ width:'34px',height:'34px',borderRadius:'50%',background:avatarColor(player.name),display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:'800',fontSize:'13px',flexShrink:0 }}>
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <p style={{ fontSize:'13px',fontWeight:'700',color:'#0F172A',margin:'0 0 1px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{player.name}</p>
                          {hasPending
                            ? <p style={{ fontSize:'11px',color:'#D97706',fontWeight:'600',margin:0 }}>{info.count} pending</p>
                            : <p style={{ fontSize:'11px',color:'#16A34A',fontWeight:'600',margin:0 }}>All clear</p>}
                        </div>
                        {hasPending && (
                          <Link to={`/coach/player/${player.playerId}/sessions`} state={{ playerName:player.name, sessionCardIds:player.sessionCardIds||[] }}
                            style={{ fontSize:'11px',fontWeight:'700',color:'#D97706',textDecoration:'none',display:'flex',alignItems:'center',gap:'2px',flexShrink:0 }}>
                            View <ChevronRight size={12} />
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Main 2-col ─────────────────────────────────────────── */}
        <div style={{ display:'grid',gridTemplateColumns:'300px 1fr',gap:'20px',alignItems:'start' }}>

          {/* ── Left: My Players ─────────────────────────────────── */}
          <div style={{ background:'#fff',borderRadius:'16px',border:'1.5px solid #E2E8F0',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
            {/* header */}
            <div style={{ padding:'16px 18px 12px',borderBottom:'1.5px solid #F1F5F9' }}>
              <div style={{ display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px' }}>
                <div style={{ width:'32px',height:'32px',borderRadius:'9px',background:'rgba(99,102,241,.1)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <Users size={16} color="#6366F1" />
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:'14px',fontWeight:'800',color:'#0F172A',margin:0 }}>My Players</p>
                </div>
                <span style={{ fontSize:'11px',fontWeight:'700',padding:'2px 9px',borderRadius:'999px',background:'rgba(99,102,241,.1)',color:'#6366F1' }}>
                  {myPlayers.length}
                </span>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:'7px',padding:'8px 11px',background:'#F8FAFC',borderRadius:'9px',border:'1.5px solid #E2E8F0' }}>
                <Search size={13} color="#94A3B8" />
                <input
                  type="text" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}
                  style={{ border:'none',background:'transparent',outline:'none',fontSize:'13px',color:'#0F172A',flex:1 }}
                />
                {search && <button onClick={()=>setSearch('')} style={{ background:'none',border:'none',cursor:'pointer',display:'flex',padding:0 }}><X size={12} color="#94A3B8" /></button>}
              </div>
            </div>

            {/* player list */}
            <div style={{ padding:'10px 10px',maxHeight:'420px',overflowY:'auto' }}>
              {filtered.length===0 ? (
                <div style={{ padding:'28px',textAlign:'center' }}>
                  <AlertCircle size={26} color="#CBD5E1" style={{ display:'block',margin:'0 auto 8px' }} />
                  <p style={{ fontSize:'13px',color:'#94A3B8',margin:0 }}>No players found</p>
                </div>
              ) : filtered.map(player => (
                <PlayerRow
                  key={player.playerId}
                  player={player}
                  selected={selected?.playerId===player.playerId}
                  onClick={()=>setSelected(p=>p?.playerId===player.playerId?null:player)}
                />
              ))}
            </div>

            {/* selected player session card strip */}
            {selected && (
              <div style={{ borderTop:'1.5px solid #F1F5F9',padding:'14px 16px',background:'#F8FAFC',animation:'fadeIn .2s ease' }}>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px' }}>
                  <p style={{ fontSize:'12px',fontWeight:'800',color:'#060030',margin:0 }}>{selected.name}</p>
                  <Link to={`/coach/player/${selected.playerId}/sessions`} state={{ playerName:selected.name, sessionCardIds:selected.sessionCardIds||[] }}
                    style={{ display:'flex',alignItems:'center',gap:'3px',fontSize:'11px',fontWeight:'700',color:'#6366F1',textDecoration:'none' }}>
                    View All <ChevronRight size={12} />
                  </Link>
                </div>
                {cardsLoading && selectedCards.length===0 && (selected.sessionCardIds?.length||0)>0 ? (
                  <div style={{ display:'flex',alignItems:'center',gap:'8px',padding:'8px 0',color:'#94A3B8' }}>
                    <Loader size={14} style={{ animation:'spin 1s linear infinite' }} />
                    <span style={{ fontSize:'12px' }}>Loading cards…</span>
                  </div>
                ) : cardStats && cardStats.total>0 ? (
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px' }}>
                    {[
                      { label:'Total',     value:cardStats.total,     bg:'#EEF2FF', color:'#6366F1' },
                      { label:'Completed', value:cardStats.completed,  bg:'#F0FDF4', color:'#16A34A' },
                      { label:'Pending',   value:cardStats.pending,    bg:'#FFFBEB', color:'#D97706' },
                      { label:'Upcoming',  value:cardStats.upcoming,   bg:'#EFF6FF', color:'#2563EB' },
                    ].map(s=>(
                      <div key={s.label} style={{ padding:'9px 11px',borderRadius:'9px',background:s.bg,border:`1px solid ${s.color}22` }}>
                        <p style={{ fontSize:'9px',fontWeight:'700',color:s.color,margin:'0 0 2px',textTransform:'uppercase',letterSpacing:'.4px' }}>{s.label}</p>
                        <p style={{ fontSize:'18px',fontWeight:'800',color:s.color,margin:0,lineHeight:1 }}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize:'12px',color:'#94A3B8',margin:0 }}>No session cards yet.</p>
                )}
                {/* recent cards */}
                {selectedCards.length>0 && (
                  <div style={{ marginTop:'10px' }}>
                    <p style={{ fontSize:'11px',fontWeight:'700',color:'#475569',margin:'0 0 7px',textTransform:'uppercase',letterSpacing:'.4px' }}>Recent</p>
                    <div style={{ display:'flex',flexDirection:'column',gap:'5px' }}>
                      {selectedCards.slice().reverse().slice(0,4).map((c,i)=>{
                        const st=normStatus(c.status);
                        const cfg={ completed:{bg:'#F0FDF4',color:'#16A34A',label:'Done'}, pending:{bg:'#FFFBEB',color:'#D97706',label:'Pending'}, inprogress:{bg:'#EFF6FF',color:'#2563EB',label:'Active'} }[st]||{bg:'#F9FAFB',color:'#64748B',label:'Upcoming'};
                        return (
                          <div key={i} style={{ display:'flex',alignItems:'center',gap:'9px',padding:'8px 10px',borderRadius:'8px',background:cfg.bg,border:`1px solid ${cfg.color}22` }}>
                            <span style={{ fontSize:'11px',fontWeight:'800',color:cfg.color,minWidth:'22px' }}>S{c.session||(i+1)}</span>
                            <p style={{ fontSize:'12px',fontWeight:'600',color:'#0F172A',margin:0,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.Topic||'Session'}</p>
                            <span style={{ fontSize:'10px',fontWeight:'700',color:cfg.color,flexShrink:0 }}>{cfg.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <button onClick={()=>navigate(`/coach/start-session/${selected.playerId}`)}
                  style={{ marginTop:'12px',width:'100%',padding:'10px',borderRadius:'9px',background:'#060030',border:'none',color:'#fff',fontSize:'13px',fontWeight:'700',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'7px' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#0a0050'}
                  onMouseLeave={e=>e.currentTarget.style.background='#060030'}
                >
                  <Play size={13} /> Start Session
                </button>
              </div>
            )}

            {/* quick links footer */}
            <div style={{ padding:'10px',borderTop:'1.5px solid #F1F5F9',display:'flex',gap:'6px' }}>
              {[
                { to:'/coach/players',      label:'Players', Icon:Users },
                { to:'/coach/past-sessions',label:'History', Icon:BarChart2 },
                { to:'/coach/profile',      label:'Profile',  Icon:Award },
              ].map(a=>(
                <Link key={a.to} to={a.to} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',padding:'8px 4px',borderRadius:'9px',background:'#F8FAFC',border:'1px solid #E2E8F0',textDecoration:'none',color:'#475569' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='#EEF2FF';e.currentTarget.style.color='#6366F1';e.currentTarget.style.borderColor='#C7D2FE';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='#F8FAFC';e.currentTarget.style.color='#475569';e.currentTarget.style.borderColor='#E2E8F0';}}
                >
                  <a.Icon size={15} />
                  <span style={{ fontSize:'10px',fontWeight:'700' }}>{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Right: Attendance Calendar ────────────────────────── */}
          <div style={{ background:'#fff',borderRadius:'16px',border:'1.5px solid #E2E8F0',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
            {/* calendar header */}
            <div style={{ padding:'16px 20px',borderBottom:'1.5px solid #F1F5F9',display:'flex',alignItems:'center',gap:'10px' }}>
              <div style={{ width:'32px',height:'32px',borderRadius:'9px',background:'rgba(99,102,241,.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                <Calendar size={16} color="#6366F1" />
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:'14px',fontWeight:'800',color:'#0F172A',margin:0 }}>Attendance Calendar</p>
                <p style={{ fontSize:'11px',color:'#64748B',margin:0 }}>Your players' attendance at a glance</p>
              </div>
              {loading && <Loader size={14} color="#6366F1" style={{ animation:'spin 1s linear infinite',flexShrink:0 }} />}
            </div>

            <div style={{ padding:'16px 20px' }}>
              {/* Month nav */}
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px' }}>
                <button onClick={()=>setCalNav(p=>{ let m=p.month-1,y=p.year; if(m<0){m=11;y--;} return {month:m,year:y}; })}
                  style={{ width:'30px',height:'30px',borderRadius:'8px',border:'1.5px solid #E2E8F0',background:'#F8FAFC',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#E2E8F0'} onMouseLeave={e=>e.currentTarget.style.background='#F8FAFC'}>
                  <ChevronLeft size={15} color="#475569" />
                </button>
                <p style={{ fontSize:'14px',fontWeight:'800',color:'#0F172A',margin:0 }}>
                  {MONTHS[calNav.month]} {calNav.year}
                </p>
                <button onClick={()=>setCalNav(p=>{ let m=p.month+1,y=p.year; if(m>11){m=0;y++;} return {month:m,year:y}; })}
                  style={{ width:'30px',height:'30px',borderRadius:'8px',border:'1.5px solid #E2E8F0',background:'#F8FAFC',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#E2E8F0'} onMouseLeave={e=>e.currentTarget.style.background='#F8FAFC'}>
                  <ChevronRight size={15} color="#475569" />
                </button>
              </div>

              {/* Day headers */}
              <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'3px',marginBottom:'3px' }}>
                {DAYS.map(d=>(
                  <p key={d} style={{ fontSize:'9px',fontWeight:'700',color:'#94A3B8',textAlign:'center',margin:0,textTransform:'uppercase',letterSpacing:'.4px' }}>{d}</p>
                ))}
              </div>

              {/* Calendar grid — compact */}
              <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'3px' }}>
                {cells.map((day,idx)=>{
                  if (!day) return <div key={`b${idx}`} />;
                  const ds=`${calNav.year}-${String(calNav.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const recs=byDate[ds]||[];
                  const isToday=ds===today;
                  const isSel=ds===selDate;
                  const lcSt = r => (r.attendanceStatus||'').toLowerCase();
                  const hasPresent=recs.some(r=>lcSt(r)==='present');
                  const hasAbsent =recs.some(r=>lcSt(r)==='absent');
                  const hasRecs=recs.length>0;
                  return (
                    <div key={ds} onClick={()=>hasRecs&&setSelDate(d=>d===ds?null:ds)}
                      style={{
                        borderRadius:'7px',padding:'5px 2px 4px',textAlign:'center',
                        cursor:hasRecs?'pointer':'default',
                        background:isSel?'#060030':isToday?'#EEF2FF':hasRecs?'#F8FAFC':'transparent',
                        border:`1.5px solid ${isSel?'#060030':isToday?'#818CF8':hasRecs?'#C7D2FE':'transparent'}`,
                        transition:'all .15s',
                      }}
                      onMouseEnter={e=>{ if (hasRecs&&!isSel) e.currentTarget.style.background='#E0E7FF'; }}
                      onMouseLeave={e=>{ if (hasRecs&&!isSel) e.currentTarget.style.background=hasRecs?'#F8FAFC':'transparent'; }}
                    >
                      <p style={{ fontSize:'11px',fontWeight:isToday?'800':'600',margin:'0 0 3px',
                        color:isSel?'#fff':isToday?'#4338CA':'#374151' }}>{day}</p>
                      {hasRecs && (
                        <div style={{ display:'flex',justifyContent:'center',gap:'2px' }}>
                          {hasPresent&&<div style={{ width:'5px',height:'5px',borderRadius:'50%',background:isSel?'#4ADE80':'#22C55E' }} />}
                          {hasAbsent &&<div style={{ width:'5px',height:'5px',borderRadius:'50%',background:isSel?'#FCA5A5':'#EF4444' }} />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend - only Present + Absent */}
              <div style={{ display:'flex',gap:'16px',marginTop:'12px',justifyContent:'center' }}>
                <div style={{ display:'flex',alignItems:'center',gap:'5px' }}>
                  <div style={{ width:'7px',height:'7px',borderRadius:'50%',background:'#22C55E' }} />
                  <span style={{ fontSize:'11px',color:'#64748B',fontWeight:'600' }}>Present</span>
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:'5px' }}>
                  <div style={{ width:'7px',height:'7px',borderRadius:'50%',background:'#EF4444' }} />
                  <span style={{ fontSize:'11px',color:'#64748B',fontWeight:'600' }}>Absent</span>
                </div>
              </div>
            </div>

            {/* Selected date detail */}
            {selDate && (
              <div style={{ borderTop:'1.5px solid #F1F5F9',padding:'14px 20px',animation:'fadeIn .18s ease' }}>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px' }}>
                  <p style={{ fontSize:'13px',fontWeight:'700',color:'#0F172A',margin:0 }}>
                    {new Date(selDate+'T00:00:00').toLocaleDateString('en-IN',{ weekday:'short',day:'numeric',month:'short' })}
                  </p>
                  <button onClick={()=>setSelDate(null)} style={{ background:'none',border:'none',cursor:'pointer',display:'flex',color:'#94A3B8' }}><X size={14} /></button>
                </div>
                {selDateRecs.length===0 ? (
                  <p style={{ fontSize:'12px',color:'#94A3B8',margin:0,textAlign:'center',padding:'10px 0' }}>No records</p>
                ) : (
                  <div style={{ display:'flex',flexDirection:'column',gap:'6px' }}>
                    {selDateRecs.map((r,i)=>{
                      const rawSt = r.attendanceStatus||'';
                      const normSt = rawSt.charAt(0).toUpperCase()+rawSt.slice(1).toLowerCase();
                      const cfg=ATT_CFG[normSt]||{bg:'#F9FAFB',color:'#6B7280',border:'#E5E7EB',dot:'#9CA3AF'};
                      return (
                        <div key={i} style={{ display:'flex',alignItems:'center',gap:'10px',padding:'9px 12px',borderRadius:'9px',background:cfg.bg,border:`1px solid ${cfg.border}` }}>
                          <div style={{ width:'7px',height:'7px',borderRadius:'50%',background:cfg.dot,flexShrink:0 }} />
                          <p style={{ fontSize:'13px',fontWeight:'700',color:'#0F172A',margin:0,flex:1 }}>{r.playerName}</p>
                          <span style={{ fontSize:'11px',fontWeight:'700',color:cfg.color }}>{r.attendanceStatus||'–'}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
