import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Table } from '../../components/Table';
import { SkeletonContainer } from '../../components/SkeletonLoader';
import { Gift, CheckCircle, BarChart3, Search, Filter, ChevronDown, Zap, Users, Loader } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Toast } from '../../components/Toast';

const API_ENDPOINTS = {
  VIEW_PLAYERS: 'https://jrrnyyf9r9.execute-api.ap-south-1.amazonaws.com/default/CL_Get_All_Players',
  VIEW_REWARDS: 'https://vzcyj52ypb.execute-api.ap-south-1.amazonaws.com/default/CL_View_Reward',
  REDEEM_POINTS: 'https://s86lf3ex9c.execute-api.ap-south-1.amazonaws.com/default/CL_Redem_Points',
  VIEW_REDEEM_HISTORY: 'https://az8e86z41f.execute-api.ap-south-1.amazonaws.com/default/CL_View_Allplayer_Redeemhistory'
};

const RedeemHistory = () => {
  const { userToken } = useStore();
  const [players, setPlayers] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [redeemHistory, setRedeemHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedRewardId, setSelectedRewardId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedPlayerPoints, setSelectedPlayerPoints] = useState(0);
  const [selectedRewardCost, setSelectedRewardCost] = useState(0);
  const hasFetchedRef = useRef(false);

  // Fetch players and rewards on initial mount only
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchPlayersRewardsAndHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update selected player points when player is selected
  useEffect(() => {
    if (selectedPlayerId) {
      const player = players.find((p) => {
        if (p.id === selectedPlayerId) return true;
        if (p.playerId === selectedPlayerId) return true;
        if (p._id === selectedPlayerId) return true;
        if (String(p.id) === String(selectedPlayerId)) return true;
        if (String(p.playerId) === String(selectedPlayerId)) return true;
        if (String(p._id) === String(selectedPlayerId)) return true;
        return false;
      });
      
      if (player) {
        const points = player.PointBalance || player.pointBalance || 0;
        setSelectedPlayerPoints(Number(points) || 0);
      } else {
        setSelectedPlayerPoints(0);
      }
    } else {
      setSelectedPlayerPoints(0);
    }
  }, [selectedPlayerId, players]);

  // Update selected reward cost when reward is selected
  useEffect(() => {
    if (selectedRewardId) {
      const reward = rewards.find((r) => {
        if (r.rewardId === selectedRewardId) return true;
        if (r._id === selectedRewardId) return true;
        if (r.id === selectedRewardId) return true;
        if (String(r.rewardId) === String(selectedRewardId)) return true;
        if (String(r._id) === String(selectedRewardId)) return true;
        return false;
      });
      
      if (reward) {
        const cost = reward.points || reward.rewardPoints || reward.pointsRequired || 0;
        setSelectedRewardCost(Number(cost) || 0);
      } else {
        setSelectedRewardCost(0);
      }
    } else {
      setSelectedRewardCost(0);
    }
  }, [selectedRewardId, rewards]);

  const fetchPlayersRewardsAndHistory = async () => {
    try {
      setLoading(true);
      
      // Fetch all players
      const playersResponse = await fetch(API_ENDPOINTS.VIEW_PLAYERS, {
        headers: { 'userToken': userToken }
      });
      const playersData = await playersResponse.json();
      
      // Handle different response structures
      let playersList = [];
      if (Array.isArray(playersData)) {
        playersList = playersData;
      } else if (playersData.data && Array.isArray(playersData.data)) {
        playersList = playersData.data;
      } else if (playersData.players && Array.isArray(playersData.players)) {
        playersList = playersData.players;
      }
      setPlayers(playersList);

      // Fetch all rewards
      const rewardsResponse = await fetch(API_ENDPOINTS.VIEW_REWARDS, {
        headers: { 'userToken': userToken }
      });
      const rewardsData = await rewardsResponse.json();
      
      // Handle different response structures
      let rewardsList = [];
      if (Array.isArray(rewardsData)) {
        rewardsList = rewardsData;
      } else if (rewardsData.data && Array.isArray(rewardsData.data)) {
        rewardsList = rewardsData.data;
      } else if (rewardsData.rewards && Array.isArray(rewardsData.rewards)) {
        rewardsList = rewardsData.rewards;
      }
      setRewards(rewardsList);

      // Fetch redeem history
      const historyResponse = await fetch(API_ENDPOINTS.VIEW_REDEEM_HISTORY, {
        headers: { 'userToken': userToken }
      });
      const historyData = await historyResponse.json();
      
      // Handle the redeem history response structure
      let historyList = [];
      if (Array.isArray(historyData)) {
        historyList = historyData;
      } else if (historyData.redeemHistory && Array.isArray(historyData.redeemHistory)) {
        historyList = historyData.redeemHistory;
      } else if (historyData.data && Array.isArray(historyData.data)) {
        historyList = historyData.data;
      }
      setRedeemHistory(historyList);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRedeem = async (e) => {
    e.preventDefault();
    
    if (!selectedPlayerId || !selectedRewardId) {
      showToast('Please select both player and reward', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        playerId: selectedPlayerId,
        rewardId: selectedRewardId
      };
      

      const response = await fetch(API_ENDPOINTS.REDEEM_POINTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'userToken': userToken },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      

      if (response.ok) {
        showToast('Reward redeemed successfully!', 'success');
        setSelectedPlayerId('');
        setSelectedRewardId('');
        fetchPlayersRewardsAndHistory();
      } else {
        console.error('Redeem error:', result);
        showToast(result.message || 'Failed to redeem reward', 'error');
      }
    } catch (error) {
      console.error('Error redeeming reward:', error);
      showToast('Error redeeming reward', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getPlayerName = (playerId) => {
    if (!playerId || !players.length) return 'Unknown';
    
    const player = players.find((p) => {
      if (p.id === playerId) return true;
      if (p.playerId === playerId) return true;
      if (p._id === playerId) return true;
      if (String(p.id) === String(playerId)) return true;
      if (String(p.playerId) === String(playerId)) return true;
      if (String(p._id) === String(playerId)) return true;
      return false;
    });
    
    if (!player) return 'Unknown';
    
    // Try multiple name field variations
    return player.playerName || player.name || player.fullName || player.playerFullName || 'Unknown';
  };

  const totalPoints = redeemHistory.reduce((sum, r) => sum + (r.pointsUsed || 0), 0);
  const completedCount = redeemHistory.length; // All API records are completed

  const filteredHistory = redeemHistory.filter(record => {
    const matchesSearch = getPlayerName(record.playerId).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.rewardName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const sortedHistory = [...filteredHistory].sort((a, b) => {
    if (sortBy === 'recent') return new Date(b.redeemedAt) - new Date(a.redeemedAt);
    if (sortBy === 'oldest') return new Date(a.redeemedAt) - new Date(b.redeemedAt);
    if (sortBy === 'points-high') return b.pointsUsed - a.pointsUsed;
    if (sortBy === 'points-low') return a.pointsUsed - b.pointsUsed;
    return 0;
  });

  const columns = [
    {
      key: 'rewardName',
      label: 'Reward',
      render: (value, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#FEF3C7',
            backgroundImage: 'linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(252, 211, 77, 0.2)'
          }}>
            <Gift size={20} style={{ color: '#D97706' }} />
          </div>
          <div>
            <div style={{ fontWeight: '600', color: '#111827' }}>{value}</div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{row.rewardDescription}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'playerId',
      label: 'Player',
      render: (value) => (
        <div style={{ fontWeight: '500', color: '#252c35' }}>{getPlayerName(value)}</div>
      ),
    },
    {
      key: 'pointsUsed',
      label: 'Points',
      render: (value) => (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          backgroundColor: '#FEF3C7',
          color: '#92400e',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '700',
          border: '1px solid rgba(217, 119, 6, 0.2)',
          boxShadow: '0 2px 4px rgba(217, 119, 6, 0.1)'
        }}>
          <Zap size={14} />
          {value} pts
        </div>
      ),
    },
    {
      key: 'redeemedAt',
      label: 'Date',
      render: (value) => (
        <span style={{ color: '#666', fontSize: '13px' }}>
          {new Date(value).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      ),
    },
    {
      key: 'redeemedByName',
      label: 'Redeemed By',
      render: (value) => (
        <div style={{ fontWeight: '500', color: '#252c35' }}>{value || 'Unknown'}</div>
      ),
    },
  ];

  return (
    <Layout>
      <style>{`
        /* Mobile (350px - 768px) */
        @media (max-width: 768px) {
          .redeem-container {
            padding: 0 clamp(12px, 4vw, 24px) !important;
          }
          
          .redeem-header {
            padding: clamp(20px, 5vw, 40px) clamp(16px, 4vw, 32px) !important;
            margin-bottom: clamp(20px, 5vw, 32px) !important;
          }
          
          .redeem-header h1 {
            font-size: clamp(24px, 6vw, 32px) !important;
          }
          
          .redeem-header p {
            font-size: clamp(12px, 3vw, 14px) !important;
          }
          
          .stats-grid {
            grid-template-columns: 1fr !important;
            gap: clamp(12px, 3vw, 16px) !important;
          }
          
          .stat-box {
            padding: clamp(12px, 3vw, 16px) !important;
          }
          
          .stat-box p:first-of-type {
            font-size: clamp(10px, 2.5vw, 11px) !important;
          }
          
          .stat-box p:last-of-type {
            font-size: clamp(20px, 5vw, 28px) !important;
          }
          
          .redeem-form {
            padding: clamp(20px, 4vw, 32px) !important;
            margin-bottom: clamp(20px, 5vw, 32px) !important;
          }
          
          .form-title {
            font-size: clamp(18px, 5vw, 22px) !important;
          }
          
          .form-title-desc {
            font-size: clamp(12px, 3vw, 13px) !important;
          }
          
          .form-grid {
            grid-template-columns: 1fr !important;
            gap: clamp(12px, 3vw, 16px) !important;
          }
          
          .info-box {
            padding: clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px) !important;
          }
          
          .info-box p:first-of-type {
            font-size: clamp(10px, 2vw, 11px) !important;
          }
          
          .info-box p:last-of-type {
            font-size: clamp(16px, 4vw, 18px) !important;
          }
          
          .form-label {
            font-size: clamp(12px, 3vw, 14px) !important;
          }
          
          .form-select,
          .form-input {
            font-size: clamp(12px, 3vw, 14px) !important;
            padding: clamp(10px, 2.5vw, 12px) clamp(11px, 2.5vw, 14px) !important;
          }
          
          .submit-btn {
            padding: clamp(10px, 2.5vw, 12px) clamp(14px, 3vw, 28px) !important;
            font-size: clamp(12px, 2.5vw, 14px) !important;
          }
          
          .search-container {
            flex-direction: column !important;
            gap: clamp(12px, 3vw, 16px) !important;
            padding: clamp(12px, 3vw, 16px) !important;
          }
          
          .search-input {
            width: 100% !important;
            min-width: auto !important;
            font-size: clamp(12px, 3vw, 14px) !important;
            padding: clamp(8px, 2vw, 10px) clamp(10px, 2.5vw, 40px) !important;
          }
          
          .sort-select {
            width: 100% !important;
            min-width: auto !important;
            font-size: clamp(12px, 3vw, 14px) !important;
            padding: clamp(8px, 2vw, 10px) clamp(10px, 2.5vw, 12px) !important;
          }
          
          .table-container {
            max-width: 100% !important;
          }
          
          .table-header {
            padding: clamp(12px, 3vw, 16px) clamp(12px, 3vw, 24px) !important;
          }
          
          .table-header h3 {
            font-size: clamp(14px, 4vw, 16px) !important;
          }
          
          .table-header p {
            font-size: clamp(12px, 3vw, 13px) !important;
          }
        }
        
        /* Tablet (768px - 1024px) */
        @media (min-width: 769px) and (max-width: 1024px) {
          .redeem-container {
            padding: 0 clamp(20px, 4vw, 32px) !important;
          }
          
          .redeem-header {
            padding: clamp(28px, 4vw, 40px) clamp(20px, 3vw, 32px) !important;
            margin-bottom: clamp(24px, 4vw, 32px) !important;
          }
          
          .redeem-header h1 {
            font-size: clamp(26px, 5vw, 32px) !important;
          }
          
          .redeem-header p {
            font-size: clamp(13px, 2vw, 14px) !important;
          }
          
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: clamp(14px, 3vw, 16px) !important;
          }
          
          .stat-box {
            padding: clamp(14px, 2.5vw, 16px) !important;
          }
          
          .stat-box p:first-of-type {
            font-size: clamp(10px, 1.8vw, 11px) !important;
          }
          
          .stat-box p:last-of-type {
            font-size: clamp(22px, 4vw, 28px) !important;
          }
          
          .redeem-form {
            padding: clamp(24px, 3.5vw, 32px) !important;
            margin-bottom: clamp(24px, 4vw, 32px) !important;
          }
          
          .form-title {
            font-size: clamp(19px, 4vw, 22px) !important;
          }
          
          .form-title-desc {
            font-size: clamp(12px, 2vw, 13px) !important;
          }
          
          .form-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: clamp(14px, 2.5vw, 16px) !important;
          }
          
          .info-box {
            padding: clamp(11px, 2vw, 12px) clamp(14px, 2.5vw, 16px) !important;
          }
          
          .info-box p:first-of-type {
            font-size: clamp(10px, 1.5vw, 11px) !important;
          }
          
          .info-box p:last-of-type {
            font-size: clamp(16px, 3vw, 18px) !important;
          }
          
          .form-label {
            font-size: clamp(13px, 2vw, 14px) !important;
          }
          
          .form-select,
          .form-input {
            font-size: clamp(13px, 2vw, 14px) !important;
            padding: clamp(10px, 2vw, 12px) clamp(12px, 2vw, 14px) !important;
          }
          
          .submit-btn {
            padding: clamp(11px, 2vw, 12px) clamp(20px, 3vw, 28px) !important;
            font-size: clamp(13px, 1.8vw, 14px) !important;
          }
          
          .search-container {
            flex-direction: row !important;
            gap: clamp(12px, 2.5vw, 16px) !important;
            padding: clamp(14px, 2.5vw, 16px) !important;
          }
          
          .search-input {
            width: auto !important;
            min-width: clamp(200px, 30vw, 250px) !important;
            font-size: clamp(13px, 2vw, 14px) !important;
            padding: clamp(9px, 1.5vw, 10px) clamp(10px, 2vw, 40px) !important;
          }
          
          .sort-select {
            width: auto !important;
            min-width: clamp(140px, 20vw, 160px) !important;
            font-size: clamp(13px, 2vw, 14px) !important;
            padding: clamp(9px, 1.5vw, 10px) clamp(10px, 2vw, 12px) !important;
          }
          
          .table-container {
            max-width: 100% !important;
          }
          
          .table-header {
            padding: clamp(14px, 2.5vw, 16px) clamp(16px, 2.5vw, 24px) !important;
          }
          
          .table-header h3 {
            font-size: clamp(15px, 2.5vw, 16px) !important;
          }
          
          .table-header p {
            font-size: clamp(12px, 2vw, 13px) !important;
          }
        }
        
        /* Laptop Small (1024px+) */
        @media (min-width: 1025px) {
          .redeem-container {
            padding: 0 32px;
          }
          
          .redeem-header {
            padding: 40px 32px;
            margin-bottom: 32px;
          }
          
          .redeem-header h1 {
            font-size: 32px;
          }
          
          .redeem-header p {
            font-size: 14px;
          }
          
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
          
          .stat-box {
            padding: 16px;
          }
          
          .stat-box p:first-of-type {
            font-size: 11px;
          }
          
          .stat-box p:last-of-type {
            font-size: 28px;
          }
          
          .redeem-form {
            padding: 32px;
            margin-bottom: 32px;
          }
          
          .form-title {
            font-size: 22px;
          }
          
          .form-title-desc {
            font-size: 13px;
          }
          
          .form-grid {
            grid-template-columns: 1fr 1fr 1fr;
            gap: 16px;
          }
          
          .info-box {
            padding: 12px 16px;
          }
          
          .info-box p:first-of-type {
            font-size: 11px;
          }
          
          .info-box p:last-of-type {
            font-size: 18px;
          }
          
          .form-label {
            font-size: 14px;
          }
          
          .form-select,
          .form-input {
            font-size: 14px;
            padding: 12px 14px;
          }
          
          .submit-btn {
            padding: 12px 28px;
            font-size: 14px;
          }
          
          .search-container {
            flex-direction: row;
            gap: 12px;
            padding: 16px;
          }
          
          .search-input {
            width: auto;
            min-width: 250px;
            font-size: 14px;
            padding: 10px 10px 10px 40px;
          }
          
          .sort-select {
            width: auto;
            min-width: 160px;
            font-size: 14px;
            padding: 10px 12px;
          }
          
          .table-container {
            max-width: 1300px;
          }
          
          .table-header {
            padding: 16px 24px;
          }
          
          .table-header h3 {
            font-size: 16px;
          }
          
          .table-header p {
            font-size: 13px;
          }
        }
      `}</style>
      
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }} className="redeem-container">
        {loading ? (
          <SkeletonContainer>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              {/* Header Skeleton with Enhanced Design */}
              <div style={{
                background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
                padding: '40px 32px',
                marginBottom: '32px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                minHeight: '280px'
              }}>
                {/* Title Skeleton */}
                <div style={{
                  height: '40px',
                  background: 'rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  maxWidth: '300px'
                }} />
                <div style={{
                  height: '16px',
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: '4px',
                  marginBottom: '24px',
                  width: '60%',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  animationDelay: '0.1s'
                }} />
                
                {/* Stats Grid Skeleton */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '16px'
                }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{
                      height: '110px',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                      animationDelay: `${i * 0.1}s`,
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{
                        height: '12px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        width: '80%'
                      }} />
                      <div style={{
                        height: '28px',
                        background: 'rgba(255,255,255,0.12)',
                        borderRadius: '4px',
                        width: '60%'
                      }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Section Skeleton */}
              <div style={{
                background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
                padding: '32px',
                marginBottom: '32px',
                borderRadius: '12px',
                border: '2px solid #1e3a8a'
              }}>
                {/* Form Title Skeleton */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }} />
                  <div style={{
                    flex: 1
                  }}>
                    <div style={{
                      height: '22px',
                      background: 'rgba(255,255,255,0.12)',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      width: '150px',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                      animationDelay: '0.1s'
                    }} />
                    <div style={{
                      height: '13px',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '4px',
                      width: '200px',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                      animationDelay: '0.15s'
                    }} />
                  </div>
                </div>

                {/* Info Boxes Skeleton */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  {[1, 2].map(i => (
                    <div key={i} style={{
                      height: '70px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      padding: '12px 16px',
                      animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                      animationDelay: `${i * 0.1}s`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{
                        height: '11px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '3px',
                        width: '70%'
                      }} />
                      <div style={{
                        height: '24px',
                        background: 'rgba(255,255,255,0.15)',
                        borderRadius: '4px',
                        width: '50%'
                      }} />
                    </div>
                  ))}
                </div>

                {/* Form Fields Skeleton */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                  alignItems: 'flex-end'
                }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{
                      animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                      animationDelay: `${i * 0.1}s`
                    }}>
                      <div style={{
                        height: '16px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        marginBottom: '8px',
                        width: '100px'
                      }} />
                      <div style={{
                        height: '44px',
                        background: 'rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Search & Filters Skeleton */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px',
                maxWidth: '1300px',
                margin: '0 auto 32px auto',
                backgroundColor: 'white',
                padding: '16px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e5e7eb'
              }}>
                {[1, 2].map(i => (
                  <div key={i} style={{
                    flex: i === 1 ? 1 : 'auto',
                    minWidth: i === 1 ? '250px' : '160px',
                    height: '44px',
                    background: '#f5f5f5',
                    borderRadius: '8px',
                    animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                    animationDelay: `${i * 0.1}s`
                  }} />
                ))}
              </div>

              {/* Table Skeleton */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e5e7eb',
                overflow: 'hidden',
                maxWidth: '1300px',
                margin: '0 auto'
              }}>
                {/* Table Header */}
                <div style={{
                  backgroundColor: '#f9fafb',
                  padding: '16px 24px',
                  borderBottom: '1px solid #e5e7eb',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}>
                  <div style={{
                    height: '20px',
                    background: '#e5e7eb',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    width: '150px'
                  }} />
                  <div style={{
                    height: '13px',
                    background: '#f0f0f0',
                    borderRadius: '3px',
                    width: '200px'
                  }} />
                </div>

                {/* Table Rows Skeleton */}
                {[1, 2, 3, 4, 5].map((rowIdx) => (
                  <div key={rowIdx} style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '12px',
                    padding: '20px 24px',
                    borderBottom: rowIdx < 5 ? '1px solid #e5e7eb' : 'none',
                    animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                    animationDelay: `${rowIdx * 0.08}s`
                  }}>
                    {[1, 2, 3, 4, 5].map((colIdx) => (
                      <div key={colIdx} style={{
                        height: '18px',
                        background: '#f5f5f5',
                        borderRadius: '4px',
                        width: colIdx === 1 ? '90%' : '80%'
                      }} />
                    ))}
                  </div>
                ))}
              </div>

              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
              `}</style>
            </div>
          </SkeletonContainer>
        ) : (
        <>
        {/* Header with Stats */}
        <div style={{
          background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
          backdropFilter: 'blur(20px)',
          color: 'white',
          padding: '40px 32px',
          marginBottom: '32px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 8px 32px rgba(37, 44, 53, 0.15)'
        }} className="redeem-header">
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 4px 0' }}>Redeem History</h1>
              <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>Track {redeemHistory.length} reward redemption{redeemHistory.length !== 1 ? 's' : ''} and player engagement</p>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }} className="stats-grid">
              <div style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                padding: '16px', 
                borderRadius: '8px', 
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Gift size={18} style={{ opacity: 0.8 }} />
                  <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Redeems</p>
                </div>
                <p style={{ fontSize: '28px', fontWeight: '700', margin: '8px 0 0 0' }}>{redeemHistory.length}</p>
              </div>
              <div style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                padding: '16px', 
                borderRadius: '8px', 
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={18} style={{ opacity: 0.8, color: '#86EFAC' }} />
                  <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed</p>
                </div>
                <p style={{ fontSize: '28px', fontWeight: '700', margin: '8px 0 0 0', color: '#86EFAC' }}>{completedCount}</p>
              </div>
              <div style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                padding: '16px', 
                borderRadius: '8px', 
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart3 size={18} style={{ opacity: 0.8 }} />
                  <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Points Used</p>
                </div>
                <p style={{ fontSize: '28px', fontWeight: '700', margin: '8px 0 0 0' }}>{totalPoints}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Redeem Form Section */}
        {!loading && (
          <div style={{
            background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
            padding: '32px',
            marginBottom: '32px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
            border: '2px solid #1e3a8a',
            position: 'relative',
            overflow: 'hidden'
          }} className="redeem-form">
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <Zap size={28} style={{ color: '#D97706' }} />
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: '700', margin: '0', color: '#ffffff' }} className="form-title">New Redemption</h2>
                  <p style={{ fontSize: '13px', color: '#afafaf', margin: '4px 0 0 0' }} className="form-title-desc">Reward your players for their achievements</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }} className="info-box">
                  <p style={{ fontSize: '11px', color: '#999', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Available Players</p>
                  <p style={{ fontSize: '18px', fontWeight: '700', margin: '6px 0 0 0', color: '#111827' }}>{players.length}</p>
                </div>
                <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }} className="info-box">
                  <p style={{ fontSize: '11px', color: '#999', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Available Rewards</p>
                  <p style={{ fontSize: '18px', fontWeight: '700', margin: '6px 0 0 0', color: '#111827' }}>{rewards.length}</p>
                </div>
              </div>

              {selectedPlayerId && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.95)', padding: '12px 16px', borderRadius: '8px', border: '2px solid #D97706' }} className="info-box">
                    <p style={{ fontSize: '11px', color: '#666', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Player Points Balance</p>
                    <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0', color: '#D97706' }}>{selectedPlayerPoints}</p>
                  </div>
                  {selectedRewardId && (
                    <div style={{ background: 'rgba(255, 255, 255, 0.95)', padding: '12px 16px', borderRadius: '8px', border: `2px solid ${selectedPlayerPoints >= selectedRewardCost ? '#10b981' : '#ef4444'}` }} className="info-box">
                      <p style={{ fontSize: '11px', color: '#666', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Reward Cost</p>
                      <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0', color: selectedPlayerPoints >= selectedRewardCost ? '#10b981' : '#ef4444' }}>
                        {selectedRewardCost} pts
                        {selectedPlayerPoints < selectedRewardCost && <span style={{ fontSize: '12px', marginLeft: '8px' }}>Insufficient</span>}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleRedeem} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'flex-end' }} className="form-grid">
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#ffffff' }} className="form-label">
                    <Users size={16} />
                    Select Player
                  </label>
                  <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '2px solid #E2E8F0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      backgroundColor: 'white',
                      color: selectedPlayerId ? '#111827' : '#999',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'all 0.3s',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}
                    className="form-select"
                    onFocus={(e) => {
                      e.target.style.borderColor = '#D97706';
                      e.target.style.boxShadow = '0 0 0 3px rgba(217, 119, 6, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#E2E8F0';
                      e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                    }}
                  >
                    <option value="">-- Choose a player --</option>
                    {players.length > 0 ? players.map((player) => (
                      <option key={player.id || player._id || player.playerId} value={player.id || player._id || player.playerId}>
                        {player.playerName || player.name}
                      </option>
                    )) : <option disabled>No players available</option>}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#ffffff' }} className="form-label">
                    <Gift size={16} />
                    Select Reward
                  </label>
                  <select
                    value={selectedRewardId}
                    onChange={(e) => setSelectedRewardId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '2px solid #E2E8F0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      backgroundColor: 'white',
                      color: selectedRewardId ? '#111827' : '#999',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'all 0.3s',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}
                    className="form-select"
                    onFocus={(e) => {
                      e.target.style.borderColor = '#D97706';
                      e.target.style.boxShadow = '0 0 0 3px rgba(217, 119, 6, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#E2E8F0';
                      e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                    }}
                  >
                    <option value="">-- Choose a reward --</option>
                    {rewards.length > 0 ? rewards.filter((reward) => reward.isActive === true || reward.active === true).map((reward) => (
                      <option key={reward.id || reward._id || reward.rewardId} value={reward.id || reward._id || reward.rewardId}>
                        {reward.rewardName || reward.name} ({reward.points} pts)
                      </option>
                    )) : <option disabled>No rewards available</option>}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedPlayerId || !selectedRewardId || players.length === 0 || rewards.length === 0 || selectedPlayerPoints < selectedRewardCost}
                  style={{
                    padding: '12px 28px',
                    backgroundColor: submitting || !selectedPlayerId || !selectedRewardId || players.length === 0 || rewards.length === 0 || selectedPlayerPoints < selectedRewardCost ? '#D1D5DB' : '#D97706',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: submitting || !selectedPlayerId || !selectedRewardId || players.length === 0 || rewards.length === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    opacity: submitting || !selectedPlayerId || !selectedRewardId || players.length === 0 || rewards.length === 0 ? 0.6 : 1,
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  className="submit-btn"
                  onMouseEnter={(e) => {
                    if (!submitting && selectedPlayerId && selectedRewardId && players.length > 0 && rewards.length > 0 && selectedPlayerPoints >= selectedRewardCost) {
                      e.target.style.backgroundColor = '#B45309';
                      e.target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!submitting && selectedPlayerId && selectedRewardId && players.length > 0 && rewards.length > 0 && selectedPlayerPoints >= selectedRewardCost) {
                      e.target.style.backgroundColor = '#D97706';
                      e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                    }
                  }}
                >
                  <Zap size={16} />
                  {submitting ? 'Processing...' : 'Redeem Reward'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          flexWrap: 'wrap',
          maxWidth: '1300px',
          margin: '0 auto 32px auto',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e5e7eb',
          justifyContent: 'space-between',
          alignItems: 'center',
        }} className="search-container">
            <div style={{ flex: 1, minWidth: '250px', position: 'relative' }} className="search-input">
              <Search size={18} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#9CA3AF'
                }} />
              <input
                type="text"
                placeholder="Search by player or reward..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 10px 10px 40px',
                  border: '2px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'white'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#060030ff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(82, 102, 129, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E2E8F0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            <div style={{ position: 'relative', minWidth: '160px' }} className="sort-select">
              <select
                className="assign-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  paddingRight: '36px',
                  border: '2px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: 'white',
                  color: sortBy !== 'recent' ? '#111827' : '#999',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  appearance: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#D97706';
                  e.target.style.boxShadow = '0 0 0 3px rgba(217, 119, 6, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E2E8F0';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="points-high">Highest Points</option>
                <option value="points-low">Lowest Points</option>
              </select>
              <ChevronDown size={18} style={{
                  position: 'absolute',
                  right: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#111827'
                }} />
            </div>
          </div>

          {/* History Table */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
            maxWidth: '1300px',
            margin: '0 auto',
            transition: 'all 0.3s'
          }} className="table-container">
            <div style={{ backgroundColor: '#f9fafb', padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }} className="table-header">
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0 }}>Redemption History</h3>
              <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0 0' }}>Track all reward redemptions</p>
            </div>
            {sortedHistory.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <Table columns={columns} data={sortedHistory} />
              </div>
            ) : (
              <div style={{
                padding: '64px 24px',
                textAlign: 'center',
                background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: 'linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  boxShadow: '0 4px 12px rgba(252, 211, 77, 0.3)'
                }}>
                  <Gift size={40} style={{ color: '#D97706' }} />
                </div>
                <p style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 8px 0' }}>No redemptions yet</p>
                <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Start redeeming rewards for your players using the form above</p>
              </div>
            )}
          </div>
        </>
        )}
      </div>
    </Layout>
  );
};

export default RedeemHistory;


