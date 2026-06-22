import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, Flame, Grid3x3, List, Loader, Star, Trophy, Users } from "lucide-react";
import { Layout } from "../../components/Layout";
import { useStore } from "../../context/store";
import { useTheme } from "../../context/ThemeContext";

const API_ENDPOINT =
  "https://jrrnyyf9r9.execute-api.ap-south-1.amazonaws.com/default/CL_Get_All_Players";

/* ── Design system helpers ── */
const PALETTES = [
  ['#6366F1','#818CF8'], ['#10B981','#34D399'], ['#F59E0B','#FBBF24'],
  ['#EC4899','#F472B6'], ['#3B82F6','#60A5FA'], ['#8B5CF6','#A78BFA'],
  ['#EF4444','#F87171'], ['#06B6D4','#22D3EE'],
];
const pal = (name = '') => PALETTES[(name.charCodeAt(0) || 0) % PALETTES.length];

const SummaryCard = ({ label, value, icon: SIcon, accent, dark }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: dark ? 'var(--cl-surface)' : '#fff',
      border: `1.5px solid ${hov ? accent + '44' : (dark ? 'var(--cl-border)' : '#E2E8F0')}`,
      borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px',
      boxShadow: hov ? `0 8px 24px ${accent}22` : '0 2px 8px rgba(0,0,0,0.04)',
      transition: 'all .2s', cursor: 'default', flex: 1, minWidth: '140px',
    }}>
      <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {React.createElement(SIcon, { size: 22, color: accent })}
      </div>
      <div>
        <p style={{ fontSize: '10.5px', fontWeight: '700', color: dark ? 'var(--cl-text-3)' : '#94A3B8', textTransform: 'uppercase', margin: '0 0 4px', letterSpacing: '.5px' }}>{label}</p>
        <p style={{ fontSize: '23px', fontWeight: '800', color: dark ? 'var(--cl-text)' : '#0F172A', margin: 0 }}>{value}</p>
      </div>
    </div>
  );
};

/* ======================================================
   MAIN PAGE
====================================================== */
export default function LeaderBoard() {
  const navigate = useNavigate();
  const { userToken, hasRole, currentUser, fetchAssignedPlayersForCoach } = useStore();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [players, setPlayers] = useState([]);
  const [assignedPlayerIds, setAssignedPlayerIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("grid"); // grid | list
  const fetchIntervalRef = useRef(null);

  useEffect(() => {
    const isCoach = hasRole('coach');
    const hasUserId = !!currentUser?.id;

    // Unified loader so we use the latest token/user and reuse for interval
    const load = async () => {
      await fetchPlayers();
      if (isCoach && hasUserId) {
        await loadCoachAssignments();
      }
    };

    // Run immediately
    load();

    // Set up 10-minute refresh
    if (fetchIntervalRef.current) {
      clearInterval(fetchIntervalRef.current);
    }
    fetchIntervalRef.current = setInterval(load, 10 * 60 * 1000);

    return () => {
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
        fetchIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role, userToken]);

  async function loadCoachAssignments() {
    try {
      const result = await fetchAssignedPlayersForCoach(currentUser.id);

      if (result.success && result.players) {
        // Handle both direct player objects and nested player.player structure
        const assignedIds = new Set(result.players.map(p => {
          const player = p.player || p; // Handle nested structure
          const playerId = player._id || player.id || player.playerId;
          return playerId;
        }));
        setAssignedPlayerIds(assignedIds);
      }
    } catch (err) {
      console.error("Failed to load coach assignments", err);
    }
  }

  async function fetchPlayers() {
    try {
      setLoading(true);
      const res = await fetch(API_ENDPOINT, {
        headers: { userToken },
      });
      const data = await res.json();

      let rawPlayers = [];
      if (Array.isArray(data)) rawPlayers = data;
      else if (data?.players) rawPlayers = data.players;
      else if (data?.Items) rawPlayers = data.Items;
      else if (data?.data) rawPlayers = data.data;
      else if (data?.body && typeof data.body === 'string') { try { rawPlayers = JSON.parse(data.body); } catch { rawPlayers = []; } }

      if (rawPlayers.length > 0) {
        const mappedPlayers = rawPlayers.map((p) => ({
          id: p._id || p.id || p.playerId,
          playerName: p.playerName,
          name: p.playerName,
          totalPoints: p.TotalPoints || 0,
          redeemed: p.TotalPointsRedeemed || 0,
          balance: p.PointBalance || 0,
          // Include all necessary fields for PlayerDetail
          fatherName: p.fatherName || 'N/A',
          motherName: p.motherName || 'N/A',
          phone: p.phone || '',
          alternativeNumber: p.alternativeNumber || '',
          dateOfBirth: p.dateOfBirth || '',
          bloodGroup: p.bloodGroup || 'N/A',
          address: p.address || '',
          age: p.age || '',
          stage: p.stage || '',
          LearningPathway: p.LearningPathway || '',
          status: p.status || 'active',
          progress: p.progress || 'Not Started',
          createdAt: p.createdAt || '',
          dateOfRegistration: p.dateOfRegistration || '',
          sessionCardIds: p.sessionCardIds || []
        }));
        setPlayers(mappedPlayers);
      }
    } catch (err) {
      console.error('Failed to load leaderboard', err);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => b.totalPoints - a.totalPoints),
    [players]
  );

  const topScorer = sortedPlayers[0];
  const avgPoints = players.length
    ? Math.round(players.reduce((s, p) => s + p.totalPoints, 0) / players.length)
    : 0;
  const topBalance = players.length
    ? Math.max(...players.map(p => p.balance))
    : 0;

  return (
    <Layout>
      <style>{`@keyframes skPulse { 0%,100%{opacity:.5}50%{opacity:1} }`}</style>
      <div style={{ ...styles.page, background: dark ? 'var(--cl-bg)' : '#F8FAFC' }} className="page-container">
        <Hero
          totalPlayers={players.length}
          topPlayer={sortedPlayers[0]}
          view={view}
          setView={setView}
          loading={loading}
        />

        {/* Summary row */}
        {!loading && players.length > 0 && (
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <SummaryCard label="Total Players" value={players.length} icon={Users} accent="#6366F1" dark={dark} />
            <SummaryCard label="Top Scorer" value={topScorer?.name || '-'} icon={Trophy} accent="#F59E0B" dark={dark} />
            <SummaryCard label="Avg Points" value={avgPoints.toLocaleString()} icon={Star} accent="#10B981" dark={dark} />
            <SummaryCard label="Top Balance" value={topBalance.toLocaleString()} icon={Award} accent="#EC4899" dark={dark} />
          </div>
        )}

        {loading ? (
          <Skeleton />
        ) : sortedPlayers.length === 0 ? (
          <EmptyState />
        ) : view === "grid" ? (
          <GridView players={sortedPlayers} navigate={navigate} hasRole={hasRole} currentUser={currentUser} assignedPlayerIds={assignedPlayerIds} dark={dark} />
        ) : (
          <ListView players={sortedPlayers} navigate={navigate} hasRole={hasRole} currentUser={currentUser} assignedPlayerIds={assignedPlayerIds} dark={dark} />
        )}
      </div>
    </Layout>
  );
}

/* ======================================================
   HERO
====================================================== */
function Hero({ totalPlayers, view, setView, loading }) {
  const [headerHover, setHeaderHover] = React.useState(false);

  if (loading) {
    return (
      <div style={{
        ...styles.hero,
        minHeight: '200px'
      }}>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
        <div style={styles.heroLeft}>
          <div style={styles.titleContainer}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              flexShrink: 0
            }} />
            <div style={{ flex: 1 }}>
              <div style={{
                height: '40px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                marginBottom: '12px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.1s',
                width: '300px'
              }} />
              <div style={{
                height: '16px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.2s',
                width: '400px'
              }} />
            </div>
          </div>
        </div>
        <div style={styles.heroRight}>
          <div style={styles.heroStats}>
            <div style={{
              ...styles.statBox,
              background: 'rgba(255, 255, 255, 0.06)',
              minHeight: '80px'
            }}>
              <div style={{
                height: '12px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                marginBottom: '8px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.1s',
                width: '60%'
              }} />
              <div style={{
                height: '24px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                marginTop: '8px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.2s'
              }} />
            </div>
            <div style={{
              ...styles.statBox,
              background: 'rgba(255, 255, 255, 0.06)',
              minHeight: '80px'
            }}>
              <div style={{
                height: '12px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                marginBottom: '8px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.15s',
                width: '60%'
              }} />
              <div style={{
                height: '24px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                marginTop: '8px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.25s'
              }} />
            </div>
          </div>
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            <div style={{
              width: '60px',
              height: '36px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.2s'
            }} />
            <div style={{
              width: '60px',
              height: '36px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.25s'
            }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...styles.hero,
        ...(headerHover && { boxShadow: "0 20px 60px rgba(6, 0, 48, 0.3)", transform: "translateY(-2px)" })
      }}
      className="hero-container"
      onMouseEnter={() => setHeaderHover(true)}
      onMouseLeave={() => setHeaderHover(false)}
    >
      <div style={styles.heroLeft} className="hero-left">
        <div style={styles.titleContainer} className="title-container">
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,.12)', border: '1.5px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={24} color="#fff" />
          </div>
          <div>
            <h1 style={styles.heroTitle} className="hero-title">Leaderboard</h1>
            <p style={styles.heroSubtitle} className="hero-subtitle">
              Competing across {totalPlayers} players
            </p>
          </div>
        </div>
      </div>

      <div style={styles.heroRight} className="hero-right">

        <div style={styles.toggle} className="toggle">
          <button
            onClick={() => setView("grid")}
            style={{
              ...styles.toggleBtn,
              ...(view === "grid" && styles.toggleActive),
            }}
            className="toggle-btn"
            title="Grid View"
          >
            <Grid3x3 size={16} /> Grid
          </button>
          <button
            onClick={() => setView("list")}
            style={{
              ...styles.toggleBtn,
              ...(view === "list" && styles.toggleActive),
            }}
            className="toggle-btn"
            title="List View"
          >
            <List size={16} /> List
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======================================================
   GRID VIEW
====================================================== */
function GridView({ players, navigate, hasRole, currentUser, assignedPlayerIds, dark }) {
  return (
    <div style={styles.grid} className="grid-container">
      {players.map((p, i) => (
        <GridCard key={p.id} player={p} rank={i} navigate={navigate} hasRole={hasRole} currentUser={currentUser} assignedPlayerIds={assignedPlayerIds} dark={dark} />
      ))}
    </div>
  );
}

function GridCard({ player, rank, navigate, hasRole, assignedPlayerIds, dark }) {
  const isTop = rank < 3;
  const [hover, setHover] = React.useState(false);

  // Allow access if admin OR (coach AND player is assigned to this coach)
  const isAdmin = hasRole('admin');
  const isCoach = hasRole('coach');
  const isPlayerAssignedToCoach = isCoach && assignedPlayerIds && assignedPlayerIds.has(player.id);
  const canAccess = isAdmin || isPlayerAssignedToCoach;

  React.useEffect(() => {
    if (rank < 2) { // Only log first 2 cards to avoid spam
      // Component mounted
    }
  }, [isCoach, isAdmin, player.id, player.name, isPlayerAssignedToCoach, assignedPlayerIds, rank]);

  const handleCardClick = () => {
    if (!canAccess) {
      return;
    }
    // Route based on user role: admins go to /admin, coaches go to /coach
    const route = isAdmin ? `/admin/player-detail/${player.id}` : `/coach/player/${player.id}`;
    navigate(route, { state: { player } });
  };

  const avatarBg = isTop ? '#FFD700' : 'linear-gradient(135deg, #6366F1, #8B5CF6)';
  const cardBg = isTop
    ? (dark ? 'rgba(255,215,0,0.07)' : 'linear-gradient(135deg, #FFF9E6 0%, #FFFFFF 100%)')
    : (dark ? 'var(--cl-surface)' : 'white');
  const balanceBg = dark ? 'rgba(14,165,233,0.12)' : 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)';
  const balanceColor = dark ? '#7DD3FC' : '#0369A1';

  return (
    <div
      style={{
        ...styles.card,
        background: cardBg,
        ...(isTop && { border: '2px solid #FFD700' }),
        ...(hover && canAccess && { transform: "translateY(-8px)", boxShadow: "0 20px 48px rgba(0,0,0,0.15)" }),
        cursor: canAccess ? "pointer" : "default",
        opacity: 1
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={handleCardClick}
    >
      <div style={styles.rankBadge(isTop)}>
        {isTop ? <Flame size={18} /> : rank + 1}
      </div>

      <div style={{ ...styles.avatar(isTop), background: avatarBg }}>
        {player.name.charAt(0).toUpperCase()}
      </div>

      <div style={{ ...styles.name, color: dark ? 'var(--cl-text)' : '#0F172A' }}>{player.name}</div>

      <div style={{ ...styles.points, color: dark ? 'var(--cl-text)' : '#1e293b' }}>
        {player.totalPoints.toLocaleString()}
        <span style={{ ...styles.pointsLabel, color: dark ? 'var(--cl-text-3)' : '#64748B' }}>points</span>
      </div>

      <div style={{ ...styles.row, color: dark ? 'var(--cl-text-3)' : '#64748B', borderTop: `1px solid ${dark ? 'var(--cl-border)' : '#e2e8f0'}` }}>
        <span>Redeemed</span>
        <strong style={{ color: dark ? 'var(--cl-text-2)' : 'inherit' }}>{player.redeemed.toLocaleString()}</strong>
      </div>

      <div style={{ ...styles.balance, background: balanceBg, color: balanceColor }}>
        Balance: {player.balance.toLocaleString()}
      </div>
    </div>
  );
}

/* ======================================================
   LIST VIEW
====================================================== */
function ListView({ players, navigate, hasRole, currentUser, assignedPlayerIds, dark }) {
  return (
    <div style={styles.list}>
      {players.map((p, i) => (
        <ListRow key={p.id} player={p} rank={i} navigate={navigate} hasRole={hasRole} currentUser={currentUser} assignedPlayerIds={assignedPlayerIds} dark={dark} />
      ))}
    </div>
  );
}

function ListRow({ player, rank, navigate, hasRole, assignedPlayerIds, dark }) {
  const isTop = rank < 3;
  const [hover, setHover] = React.useState(false);

  // Allow access if admin OR (coach AND player is assigned to this coach)
  const isAdmin = hasRole('admin');
  const isCoach = hasRole('coach');
  const isPlayerAssignedToCoach = isCoach && assignedPlayerIds && assignedPlayerIds.has(player.id);
  const canAccess = isAdmin || isPlayerAssignedToCoach;

  const handleRowClick = () => {
    if (!canAccess) return;
    // Route based on user role: admins go to /admin, coaches go to /coach
    const route = isAdmin ? `/admin/player-detail/${player.id}` : `/coach/player/${player.id}`;
    navigate(route, { state: { player } });
  };

  const avatarBg = isTop ? '#FFD700' : 'linear-gradient(135deg, #6366F1, #8B5CF6)';

  const rowBg = dark ? 'var(--cl-surface)' : 'white';
  const hoverBg = dark ? 'var(--cl-surface-2)' : '#F8FAFC';

  return (
    <div
      style={{
        ...styles.listRow,
        background: hover && canAccess ? hoverBg : rowBg,
        ...(hover && canAccess && { boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }),
        cursor: canAccess ? "pointer" : "default"
      }}
      className="list-row"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={handleRowClick}
    >
      <div style={styles.listRank(isTop)}>
        {isTop ? <Flame size={16} /> : rank + 1}
      </div>

      <div style={{ ...styles.listAvatar(isTop), background: avatarBg }}>
        {player.name.charAt(0)}
      </div>

      <div style={{ ...styles.listName, color: dark ? 'var(--cl-text)' : 'inherit' }}>{player.name}</div>

      <div style={{ ...styles.listPoints, color: dark ? 'var(--cl-text)' : 'inherit' }}>
        {player.totalPoints.toLocaleString()}
      </div>

      <div style={{ ...styles.listBalance, color: dark ? '#7DD3FC' : '#0369A1' }}>
        {player.balance.toLocaleString()}
      </div>
    </div>
  );
}

/* ======================================================
   STATES
====================================================== */
function Skeleton() {
  return (
    <div>
      {/* Header Skeleton */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        padding: '0 16px'
      }}>
        <div style={{
          width: '180px',
          height: '32px',
          background: 'rgba(200, 200, 200, 0.3)',
          borderRadius: '6px',
          animation: 'skPulse 1.6s ease-in-out infinite'
        }} />
        <div style={{ display: 'flex', gap: '12px' }}>
          {[1, 2].map((i) => (
            <div key={i} style={{
              width: '100px',
              height: '36px',
              background: 'rgba(200, 200, 200, 0.3)',
              borderRadius: '6px',
              animation: `skPulse 1.6s ease-in-out infinite ${i * 0.1}s`
            }} />
          ))}
        </div>
      </div>

      {/* Grid Skeleton */}
      <div style={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '20px',
            animation: `skPulse 1.6s ease-in-out infinite ${i * 0.08}s`
          }}>
            {/* Avatar Skeleton */}
            <div style={{
              width: '60px',
              height: '60px',
              background: 'rgba(200, 200, 200, 0.3)',
              borderRadius: '50%',
              marginBottom: '16px'
            }} />

            {/* Title and Subtitle Skeleton */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                width: '70%',
                height: '18px',
                background: 'rgba(200, 200, 200, 0.3)',
                borderRadius: '6px',
                marginBottom: '8px'
              }} />
              <div style={{
                width: '50%',
                height: '14px',
                background: 'rgba(200, 200, 200, 0.3)',
                borderRadius: '6px'
              }} />
            </div>

            {/* Stats Skeleton */}
            <div style={{ marginBottom: '16px' }}>
              {[1, 2, 3].map((j) => (
                <div key={j} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: '8px',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    width: '40%',
                    height: '14px',
                    background: 'rgba(200, 200, 200, 0.3)',
                    borderRadius: '4px'
                  }} />
                  <div style={{
                    width: '30%',
                    height: '14px',
                    background: 'rgba(200, 200, 200, 0.3)',
                    borderRadius: '4px'
                  }} />
                </div>
              ))}
            </div>

            {/* Button Skeleton */}
            <div style={{
              width: '100%',
              height: '36px',
              background: 'rgba(200, 200, 200, 0.3)',
              borderRadius: '6px'
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={styles.empty}>
      <Loader size={36} />
      <p>No players found</p>
    </div>
  );
}

/* ======================================================
   STYLES
====================================================== */
const styles = {
  page: {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "clamp(16px, 4vw, 48px) clamp(12px, 3vw, 32px)",
    background: "#F8FAFC",
    minHeight: "100vh",
  },

  hero: {
    background: "linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)",
    color: "white",
    padding: "28px 32px",
    borderRadius: "20px",
    display: "flex",
    flexDirection: "row",
    gap: "clamp(24px, 5vw, 48px)",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    boxShadow: "0 12px 40px rgba(6,0,48,.3)",
    border: "1px solid rgba(255,255,255,0.08)",
    transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
    position: "relative",
    overflow: "hidden",
  },

  heroLeft: {
    flex: 1,
  },

  titleContainer: {
    display: "flex",
    alignItems: "center",
    gap: "clamp(12px, 2vw, 20px)",
  },

  flameIconWrapper: {
    width: "clamp(40px, 8vw, 56px)",
    height: "clamp(40px, 8vw, 56px)",
    borderRadius: "clamp(10px, 1.5vw, 14px)",
    background: "linear-gradient(135deg, rgba(255, 183, 3, 0.2) 0%, rgba(255, 107, 3, 0.1) 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(255, 183, 3, 0.2)",
    transition: "all 0.3s ease",
  },

  titleIcon: {
    color: "#FFD700",
    filter: "drop-shadow(0 0 12px rgba(255, 215, 0, 0.5))",
  },

  heroTitle: {
    fontSize: "clamp(28px, 6vw, 42px)",
    fontWeight: 950,
    margin: "0 0 3px",
    letterSpacing: "-.5px",
    color: "#ffffff",
  },

  heroSubtitle: {
    fontSize: "13px",
    color: "rgba(255,255,255,.6)",
    margin: 0,
    fontWeight: "500",
  },

  heroRight: {
    display: "flex",
    gap: "clamp(16px, 3vw, 32px)",
    flexWrap: "wrap",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },

  heroStats: {
    display: "flex",
    gap: "clamp(12px, 2vw, 16px)",
    flexWrap: "wrap",
    flex: 1,
  },

  statBox: {
    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)",
    padding: "clamp(14px, 2vw, 18px) clamp(16px, 3vw, 44px)",
    borderRadius: "clamp(12px, 1.5vw, 16px)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    backdropFilter: "blur(12px)",
    borderLeft: "3px solid rgba(255, 255, 255, 0.5)",
    transition: "all 0.3s ease",
  },

  statBoxHover: {
    cursor: "pointer",
  },

  heroStatLabel: {
    fontSize: "clamp(10px, 1.8vw, 12px)",
    opacity: 0.8,
    fontWeight: 600,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    color: "rgba(255, 255, 255, 0.8)",
  },

  heroStatValue: {
    fontSize: "clamp(18px, 3.5vw, 24px)",
    fontWeight: 900,
    marginTop: "clamp(6px, 1vw, 8px)",
    color: "#ffffff",
    letterSpacing: "-0.5px",
  },

  toggle: {
    display: "flex",
    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)",
    padding: "clamp(6px, 1vw, 8px)",
    borderRadius: "clamp(10px, 1.5vw, 12px)",
    gap: "clamp(6px, 1vw, 8px)",
    transition: "all 0.3s ease",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  toggleBtn: {
    background: "transparent",
    color: "rgba(255, 255, 255, 0.8)",
    border: "none",
    padding: "clamp(8px, 1.5vw, 10px) clamp(12px, 2vw, 16px)",
    borderRadius: "clamp(8px, 1.5vw, 10px)",
    display: "flex",
    gap: "clamp(6px, 1vw, 8px)",
    alignItems: "center",
    cursor: "pointer",
    fontWeight: 600,
    transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
    fontSize: "clamp(11px, 2vw, 13px)",
  },
  toggleActive: {
    background: "linear-gradient(135deg, #ffffff80 0%, #ffffff69 100%)",
    color: "#ffffff",
    transform: "scale(1.05)",
  },

  /* Grid */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(clamp(200px, 20vw, 260px), 1fr))",
    gap: "clamp(16px, 3vw, 28px)",
  },

  card: {
    background: "white",
    borderRadius: "clamp(16px, 2vw, 20px)",
    padding: "clamp(16px, 3vw, 28px)",
    textAlign: "center",
    position: "relative",
    boxShadow: "0 12px 32px rgba(0,0,0,0.08)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "pointer",
  },
  topCard: {
    border: "2px solid #FFD700",
    background: "linear-gradient(135deg, #FFF9E6 0%, #FFFFFF 100%)",
  },

  rankBadge: (top) => ({
    position: "absolute",
    top: "clamp(8px, 1.5vw, 16px)",
    right: "clamp(8px, 1.5vw, 16px)",
    width: "clamp(32px, 6vw, 40px)",
    height: "clamp(32px, 6vw, 40px)",
    borderRadius: "50%",
    background: top ? "#FFD700" : "#252c35",
    color: top ? "#252c35" : "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
  }),

  avatar: (top) => ({
    width: "clamp(48px, 10vw, 64px)",
    height: "clamp(48px, 10vw, 64px)",
    borderRadius: "50%",
    margin: "0 auto clamp(8px, 1.5vw, 12px)",
    color: "white",
    fontSize: "clamp(20px, 4vw, 28px)",
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }),

  name: { fontSize: "clamp(14px, 2.5vw, 18px)", fontWeight: 800, marginTop: "clamp(6px, 1vw, 8px)" },
  points: { fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 900, marginTop: "clamp(12px, 2vw, 16px)", color: "#1e293b" },
  pointsLabel: { fontSize: "clamp(9px, 1.5vw, 11px)", color: "#64748B", marginLeft: 4 },

  row: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "clamp(11px, 2vw, 13px)",
    color: "#64748B",
    marginTop: "clamp(8px, 1.5vw, 12px)",
    padding: "clamp(6px, 1vw, 8px) 0",
    borderTop: "1px solid #e2e8f0",
  },

  balance: {
    marginTop: "clamp(8px, 1.5vw, 12px)",
    background: "linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)",
    color: "#0369A1",
    padding: "clamp(8px, 1.5vw, 10px) clamp(10px, 2vw, 12px)",
    borderRadius: "clamp(10px, 1.5vw, 12px)",
    fontWeight: 800,
    fontSize: "clamp(11px, 2vw, 13px)",
  },

  /* List */
  list: { display: "flex", flexDirection: "column", gap: "clamp(10px, 2vw, 14px)" },

  listRow: {
    background: "white",
    borderRadius: 14,
    padding: "16px 20px",
    display: "grid",
    gridTemplateColumns: "60px 56px 1fr 160px 160px",
    alignItems: "center",
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
    transition: "all 0.3s ease",
    cursor: "pointer",
  },

  listRank: (top) => ({
    fontWeight: 900,
    color: top ? "#FFD700" : "#252c35",
  }),

  listAvatar: (top) => ({
    width: 44,
    height: 44,
    borderRadius: "50%",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
  }),

  listName: { fontWeight: 800 },
  listPoints: { fontWeight: 900 },
  listBalance: { fontWeight: 700, color: "#0369A1" },

  skeleton: {
    height: 260,
    borderRadius: 20,
    background:
      "linear-gradient(90deg,#eee 25%,#f5f5f5 37%,#eee 63%)",
    backgroundSize: "400% 100%",
    animation: "shimmer 1.4s infinite",
  },

  empty: {
    textAlign: "center",
    padding: 80,
    color: "#64748B",
  },
};

/* ======================================================
   ANIMATION
====================================================== */
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes shimmer {
      0% { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }

    /* Responsive Design */
    @media (max-width: 1024px) {
      .hero-container {
        padding: 24px 20px !important;
        gap: 24px !important;
      }
      .grid-container {
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important;
        gap: 20px !important;
      }
    }

    @media (max-width: 768px) {
      .hero-container {
        flex-direction: column;
        text-align: center;
        padding: 20px 16px !important;
        gap: 16px !important;
        flex-wrap: wrap;
      }
      .hero-left {
        flex: none !important;
        width: 100%;
        order: 1;
      }
      .hero-right {
        flex: none !important;
        flex-direction: row !important;
        justify-content: center !important;
        width: 100%;
        gap: 16px !important;
        order: 2;
      }
      .title-container {
        justify-content: center !important;
      }
      .hero-stats {
        width: auto !important;
        justify-content: center !important;
        flex-direction: row !important;
        flex: 1;
      }
      .stat-box {
        min-width: auto !important;
        flex: 1;
      }
      .toggle {
        width: auto !important;
        order: 0;
        visibility: visible !important;
        display: flex !important;
        background: linear-gradient(135deg, rgba(255, 183, 3, 0.2) 0%, rgba(255, 107, 3, 0.1) 100%) !important;
        border: 1px solid rgba(255, 183, 3, 0.2) !important;
        padding: 8px 12px !important;
      }
      .toggle-btn {
        padding: 8px 14px !important;
        font-size: 12px !important;
      }
      .grid-container {
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)) !important;
        gap: 16px !important;
      }
      .list-row {
        grid-template-columns: 50px 44px 1fr 100px !important;
        gap: 12px !important;
        padding: 12px 16px !important;
      }
      .hero-title {
        font-size: 32px !important;
      }
      .hero-stat-value {
        font-size: 20px !important;
      }
    }

    @media (max-width: 480px) {
      .page-container {
        padding: 16px 12px !important;
      }
      .hero-container {
        flex-direction: column;
        padding: 16px 12px !important;
        border-radius: 10px !important;
        display: flex;
        flex-wrap: wrap;
      }
      .hero-left {
        width: 100% !important;
        order: 1;
      }
      .hero-stats {
        width: 100% !important;
        order: 2;
        flex-direction: column !important;
        gap: 12px !important;
      }
      .toggle {
        width: 100% !important;
        order: 3;
        padding: 12px 8px !important;
        background: linear-gradient(135deg, rgba(255, 183, 3, 0.15) 0%, rgba(255, 107, 3, 0.1) 100%) !important;
        border: 1px solid rgba(255, 183, 3, 0.3) !important;
        margin-top: 12px;
        display: flex !important;
        justify-content: space-around !important;
      }
      .toggle-btn {
        flex: 1 !important;
        padding: 10px 8px !important;
        font-size: 13px !important;
        font-weight: 700 !important;
        border-radius: 8px !important;
        transition: all 0.3s ease !important;
      }
      .toggle-btn:active {
        transform: scale(0.95) !important;
      }
      .hero-title {
        font-size: 24px !important;
        letter-spacing: 0 !important;
      }
      .hero-subtitle {
        font-size: 13px !important;
      }
      .stat-box {
        width: 100% !important;
        padding: 14px 16px !important;
      }
      .toggle {
        width: 100%;
        justify-content: space-evenly !important;
      }
      .toggle-btn {
        flex: 1;
        justify-content: center !important;
        padding: 8px 12px !important;
        font-size: 12px !important;
      }
      .grid-container {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }
      .card {
        padding: 20px !important;
        border-radius: 10px !important;
      }
      .list-row {
        grid-template-columns: 40px 40px 1fr !important;
        padding: 12px !important;
        border-radius: 12px !important;
      }
      .list-balance {
        display: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}
