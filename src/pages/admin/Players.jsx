import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { Table } from '../../components/Table';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { Toast } from '../../components/Toast';
import { SkeletonContainer } from '../../components/SkeletonLoader';
import { Users, Plus, Search, Trash2, Edit3, Eye, Award, Target, TrendingUp, AlertCircle, Loader, CheckCircle, ChevronDown } from 'lucide-react';

const Players = () => {
  const { players, fetchPlayers, addPlayerRemote, updatePlayerRemote, deletePlayerRemote, learningPathway, fetchLearningPathway } = useStore();
  const [toastMessage, setToastMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [LearningPathwayFilter, setLearningPathwayFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const initialFetchRef = useRef(false);
  const [formData, setFormData] = useState({
    playerName: '',
    fatherName: '',
    motherName: '',
    dateOfBirth: '',
    address: '',
    phone: '',
    alternativeNumber: '',
    age: '',
    LearningPathway: '',
    status: 'active',
  });

  const filteredPlayers = players
    .filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPathway = LearningPathwayFilter === 'all' || p.LearningPathway === LearningPathwayFilter;
      return matchesSearch && matchesPathway;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'level') return (a.LearningPathway || '').localeCompare(b.LearningPathway || '');
      if (sortBy === 'progress') return b.progress - a.progress;
      if (sortBy === 'points') return b.totalPoints - a.totalPoints;
      return 0;
    });

  const stats = {
    total: players.length,
    balancePointTotal: players.reduce((sum, p) => sum + (p.PointBalance || p.pointBalance || 0), 0),
    totalPoints: players.reduce((sum, p) => sum + (p.totalPoints || 0), 0),
  };

  // Calculate age from date of birth and prevent future dates
  const handleDateOfBirthChange = (e) => {
    const selectedDate = e.target.value;
    const today = new Date().toISOString().split('T')[0];

    // Prevent selecting future dates
    if (selectedDate > today) {
      setToastMessage('Date of birth cannot be in the future');
      return;
    }

    // Calculate age
    const birthDate = new Date(selectedDate);
    const today_obj = new Date();
    let age = today_obj.getFullYear() - birthDate.getFullYear();
    const monthDiff = today_obj.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today_obj.getDate() < birthDate.getDate())) {
      age--;
    }

    setFormData({ 
      ...formData, 
      dateOfBirth: selectedDate,
      age: Math.max(0, age).toString()
    });
    setToastMessage('');
  };

  const handleAddPlayer = () => {
    (async () => {
      setToastMessage('');
      setToastMessage('');
      
      // Validation based on mode
      if (!isEditMode) {
        // Add mode - required fields: playerName, phone, age, LearningPathway.
        // Optional fields: fatherName, motherName, dateOfBirth, address, alternativeNumber
        if (!formData.playerName || !formData.phone || !formData.age || !formData.LearningPathway) {
          console.error('Validation failed - missing required fields');
          if (!formData.LearningPathway) {
            setToastMessage('Please select a Learning Pathway');
          } else if (!formData.playerName || !formData.phone) {
            setToastMessage('Player name and phone are required');
          } else {
            setToastMessage('Please fill all required fields (name, phone, age, pathway)');
          }
          return;
        }
      } else {
        // Edit mode - only name and phone required
        if (!formData.playerName || !formData.phone) {
          console.error('Validation failed - missing name or phone');
          setToastMessage('Player name and phone are required');
          return;
        }
      }
      
      setLoading(true);
      try {
        const payload = {
          playerName: formData.playerName,
          fatherName: formData.fatherName || '',
          motherName: formData.motherName || '',
          dateOfBirth: formData.dateOfBirth || '',
          address: formData.address || '',
          phone: formData.phone,
          alternativeNumber: formData.alternativeNumber || '',
          age: formData.age || '',
          LearningPathway: formData.LearningPathway || null,
          status: formData.status || 'active'
        };
        
        
        let res;
        if (isEditMode) {
          res = await updatePlayerRemote(editingPlayerId, payload);
          
          if (res.success) {
            setToastMessage('Player updated successfully!');
          }
        } else {
          res = await addPlayerRemote(payload);
          if (res.success) {
            setToastMessage('Player created successfully!');
          }
        }
        
        if (!res.success) {
          console.error('API returned error:', res.error);
          setToastMessage(res.error || (isEditMode ? 'Failed to update player' : 'Failed to create player'));
        } else {
          setFormData({
            playerName: '',
            fatherName: '',
            motherName: '',
            dateOfBirth: '',
            address: '',
            phone: '',
            alternativeNumber: '',
            age: '',
            LearningPathway: '',
            status: 'active',
          });
          
          // Refetch players data
          await fetchPlayers();
          
          setTimeout(() => {
            setIsModalOpen(false);
            setToastMessage('');
            setIsEditMode(false);
            setEditingPlayerId(null);
            // Show toast notification AFTER modal closes
            setToastMessage(isEditMode ? 'Player updated successfully' : 'Player added successfully');
          }, 1200);
        }
      } catch (err) {
        setToastMessage(err.message || (isEditMode ? 'Failed to update player' : 'Failed to create player'));
      } finally {
        setLoading(false);
      }
    })();
  };

  // Fetch players and learning pathways on initial mount only
  useEffect(() => {
    if (initialFetchRef.current) {
      // If already fetched in this mount (or preserved via Fast Refresh), ensure loading stops
      setIsFetching(false);
      return;
    }
    initialFetchRef.current = true;

    let mounted = true;
    const load = async () => {
      setToastMessage('');
      setIsFetching(true);
      try {
        await fetchPlayers();
        await fetchLearningPathway();
      } catch (err) {
        if (mounted) setToastMessage(err.message || 'Unable to load players');
      } finally {
        if (mounted) setIsFetching(false);
      }
    };
    load();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = [
    { 
      key: 'name', 
      label: 'Name',
      render: (value) => <span style={{ fontWeight: '600', color: '#111827' }}>{value}</span>
    },
    {
      key: 'LearningPathway',
      label: 'Learning Pathway',
      render: (value) => (
        <span style={{
          display: 'inline-block',
          padding: '6px 12px',
          backgroundColor: '#FFFBEB',
          color: '#060030ff',
          borderRadius: '6px',
          fontWeight: '600',
          fontSize: '12px'
        }}>
          {value && typeof value === 'string' ? value : 'Not Assigned'}
        </span>
      )
    },
    {
      key: 'TotalPoints',
      label: 'Total Points Earned',
      render: (value, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Award size={16} color="#10B981" />
          <span style={{ fontWeight: '700', color: '#10B981', fontSize: '14px' }}>{value ?? row.totalPoints ?? row.TotalPoints ?? 0}</span>
        </div>
      ),
    },
    {
      key: 'Point Balance ',
      label: 'Balance',
      render: (value, row) => (
        <span style={{ fontWeight: '700', color: '#111827' }}>{value ?? row.PointBalance ?? row.pointBalance ?? 0}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span style={{ textTransform: 'capitalize', fontWeight: 600, color: value === 'active' ? '#059669' : '#d97706' }}>{value}</span>
      )
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (value, row) => <span style={{ fontSize: '13px', color: '#666' }}>{value ?? row.phone ?? row.mobile ?? '-'}</span>
    }
  ];

  return (
    <Layout>
      {/* Toast Notification */}
      {toastMessage && (
        <Toast 
          message={toastMessage} 
          type="success" 
          duration={3000}
          onClose={() => setToastMessage('')}
        />
      )}
      
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
        <style>{`
          @media (max-width: 640px) {
            .players-header {
              padding: 20px 12px !important;
              marginBottom: 16px !important;
            }
            .players-title {
              fontSize: 20px !important;
            }
            .players-subtitle {
              fontSize: 11px !important;
            }
            .players-stats {
              gridTemplateColumns: 1fr 1fr !important;
              gap: 10px !important;
            }
            .players-stat-box {
              padding: 8px 10px !important;
            }
            .players-stat-label {
              fontSize: 9px !important;
            }
            .players-stat-value {
              fontSize: 16px !important;
            }
            .players-main-content {
              padding: 0 12px !important;
            }
            .players-filters {
              display: flex !important;
              flexDirection: column !important;
              gap: 10px !important;
              marginBottom: 16px !important;
              width: 100% !important;
            }
            .players-search-box {
              width: 100% !important;
            }
            .players-search-box input {
              fontSize: 12px !important;
              padding: 9px 10px !important;
            }
            .players-filter-select {
              width: 100% !important;
              fontSize: 12px !important;
              padding: 9px 10px !important;
              paddingRight: 32px !important;
            }
            .players-filter-btn {
              width: 100% !important;
              padding: 9px 12px !important;
              fontSize: 12px !important;
            }
          }
          @media (max-width: 767px) {
            .players-header {
              padding: 24px 16px !important;
              marginBottom: 20px !important;
            }
            .players-title {
              fontSize: 24px !important;
            }
            .players-subtitle {
              fontSize: 12px !important;
            }
            .players-stats {
              gridTemplateColumns: 1fr 1fr !important;
              gap: 12px !important;
            }
            .players-stat-box {
              padding: 10px 12px !important;
            }
            .players-stat-label {
              fontSize: 10px !important;
            }
            .players-stat-value {
              fontSize: 18px !important;
            }
            .players-main-content {
              padding: 0 16px !important;
            }
            .players-filters {
              display: flex !important;
              flexDirection: column !important;
              gap: 10px !important;
              marginBottom: 20px !important;
              width: 100% !important;
            }
            .players-search-box {
              width: 100% !important;
            }
            .players-search-box input {
              fontSize: 13px !important;
              padding: 10px 12px !important;
            }
            .players-filter-select {
              width: 100% !important;
              fontSize: 13px !important;
              padding: 10px 12px !important;
              paddingRight: 35px !important;
            }
            .players-filter-btn {
              width: 100% !important;
              justify-content: center !important;
              padding: 10px 14px !important;
              fontSize: 13px !important;
              gap: 6px !important;
            }
            .players-filter-btn svg {
              width: 16px !important;
              height: 16px !important;
            }
          }
          @media (min-width: 768px) and (max-width: 1024px) {
            .players-header {
              padding: 32px 24px !important;
            }
            .players-title {
              fontSize: 28px !important;
            }
            .players-stats {
              gridTemplateColumns: repeat(2, 1fr) !important;
              gap: 14px !important;
            }
            .players-filters {
              gridTemplateColumns: 2fr 1fr 1fr auto !important;
              gap: 10px !important;
              marginBottom: 20px !important;
            }
            .players-search-box {
              width: 100% !important;
            }
            .players-filter-select {
              width: 100% !important;
              fontSize: 12px !important;
              padding: 8px 10px !important;
            }
            .players-filter-btn {
              padding: 9px 12px !important;
              font-size: 12px !important;
            }
            .players-main-content {
              padding: 0 24px !important;
            }
          }
          @media (max-width: 640px) {
            .players-filters {
              gridTemplateColumns: 1fr 1fr !important;
              gap: 8px !important;
            }
            .players-search-box {
              gridColumn: 1 / -1 !important;
            }
            .players-filter-select {
              width: 100% !important;
              fontSize: 12px !important;
              padding: 8px 8px !important;
            }
            .players-filter-btn {
              gridColumn: 1 / -1 !important;
              justify-content: center !important;
              padding: 10px 12px !important;
              fontSize: 12px !important;
              gap: 6px !important;
            }
            .players-filter-btn svg {
              width: 16px !important;
              height: 16px !important;
            }
          }
        `}</style>
        {/* Header with Stats */}
        {isFetching ? (
          <SkeletonContainer>
            <div style={{
              background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
              padding: '40px 32px',
              marginBottom: '32px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              minHeight: '240px'
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
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    height: '100px',
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

              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
              `}</style>
            </div>
          </SkeletonContainer>
        ) : (
          <div style={{
            background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
            backdropFilter: 'blur(20px)',
            color: 'white',
            padding: '40px 32px',
            marginBottom: '32px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px rgba(37, 44, 53, 0.15)'
          }}
          className="players-header"
          >
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 4px 0' }} className="players-title">Players Management</h1>
                <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }} className="players-subtitle">Manage {stats.total} player{stats.total !== 1 ? 's' : ''}, track progress, and monitor performance</p>
              </div>

              {/* Stats Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }} className="players-stats">
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }} className="players-stat-box">
                  <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }} className="players-stat-label">Active Players</p>
                  <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }} className="players-stat-value">{stats.total}</p>
                </div>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }} className="players-stat-box">
                  <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }} className="players-stat-label">Total Points Earned</p>
                  <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }} className="players-stat-value">{players.reduce((sum, p) => sum + (p.totalPoints || 0), 0)}</p>
                </div>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }} className="players-stat-box">
                  <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }} className="players-stat-label">Balance Points</p>
                  <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }} className="players-stat-value">{stats.balancePointTotal}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div style={{ padding: '0 32px', maxWidth: '1400px', margin: '0 auto' }} className="players-main-content">

        {/* Search & Filter Section - Skeleton or Real */}
        {isFetching ? (
          <SkeletonContainer>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.2fr 1.2fr 1.2fr auto',
              gap: '10px',
              marginBottom: '24px',
              alignItems: 'center',
              width: '100%'
            }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{
                  height: '40px',
                  background: '#f5f5f5',
                  borderRadius: '6px',
                  animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                  animationDelay: `${i * 0.08}s`
                }} />
              ))}
            </div>
            <style>{`
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
              }
            `}</style>
          </SkeletonContainer>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.2fr 1.2fr 1.2fr auto',
            gap: '10px',
            marginBottom: '24px',
            backgroundColor: 'white',
            padding: '10px 14px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            alignItems: 'center',
            width: '100%'
          }} className="players-filters">
          <div style={{
            backgroundColor: 'transparent',
            borderRadius: '8px',
            padding: '9px 14px',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.3s'
          }}
          className="players-search-box"
          >
            {/* <Search size={18} color="#060030ff" /> */}
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{  
                outline: 'none', 
                flex: 1, 
                fontSize: '14px', 
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: '#E2E8F0',
                backgroundColor: 'white',
                color: '#111827',
                fontWeight: '500'
              }}
            />
            {searchTerm && (
              <span style={{
                fontSize: '12px',
                color: '#999',
                fontWeight: '600',
                backgroundColor: '#f3f4f6',
                padding: '4px 8px',
                borderRadius: '4px',
                whiteSpace: 'nowrap'
              }}>
                {filteredPlayers.length}
              </span>
            )}
          </div>


          <div style={{ position: 'relative', width: '100%', minWidth: 0 }}>
            <select
              className="assign-select players-filter-select"
              value={LearningPathwayFilter}
              onChange={(e) => setLearningPathwayFilter(e.target.value)}
              style={{
                paddingRight: '30px',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: '#E2E8F0',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                width: '100%',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s',
                color: LearningPathwayFilter !== 'all' ? '#111827' : '#999',
                appearance: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#060030ff';
                e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E2E8F0';
                e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
              }}
            >
              <option value="all">All LearningPathways</option>
              {Array.isArray(players) && players.length > 0 ? (
                [...new Set(players.map(p => p.LearningPathway).filter(Boolean))].map((pathway) => (
                  <option key={pathway} value={pathway}>
                    {pathway}
                  </option>
                ))
              ) : (
                <>
                  <option value="foundation">Foundation</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </>
              )}
            </select>
            <ChevronDown size={16} style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: '#111827'
            }} />
          </div>

          <div style={{ position: 'relative', width: '100%', minWidth: 0 }}>
            <select
              className="assign-select players-filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                paddingRight: '30px',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: '#E2E8F0',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                width: '100%',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s',
                color: sortBy !== 'name' ? '#111827' : '#999',
                appearance: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#060030ff';
                e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E2E8F0';
                e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
              }}
            >
              <option value="name">Sort by Name</option>
              <option value="points">Sort by Points</option>
            </select>
            <ChevronDown size={16} style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: '#111827'
            }} />
          </div>

          <button
            onClick={() => {
              setFormData({
                playerName: '',
                fatherName: '',
                motherName: '',
                dateOfBirth: '',
                address: '',
                phone: '',
                alternativeNumber: '',
                age: '',
                LearningPathway: '',
              });
              setIsModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '12px 18px',
              borderRadius: '6px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 2px 8px rgba(6, 0, 48, 0.15)',
              fontSize: '13px',
              whiteSpace: 'nowrap'
            }}
            className="players-filter-btn"
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 0, 48, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(6, 0, 48, 0.15)';
            }}
          >
            <Plus size={18} /> Add Player
          </button>
        </div>
        )}

        {/* Results Summary */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#666', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: '500' }}>Showing</span>
          <span style={{ fontWeight: '600', color: '#111827' }}>{filteredPlayers.length}</span>
          <span>of</span>
          <span style={{ fontWeight: '600', color: '#111827' }}>{players.length}</span>
          <span>players</span>
        </div>

        {/* Table Card */}
        <Card className="card-elevated" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
          {isFetching ? (
            <SkeletonContainer>
              <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Table Header Skeleton */}
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

                {/* Table Rows Skeleton - 6 columns */}
                {[1, 2, 3, 4, 5, 6].map((rowIdx) => (
                  <div key={rowIdx} style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: '12px',
                    padding: '20px 24px',
                    borderBottom: rowIdx < 6 ? '1px solid #e5e7eb' : 'none',
                    animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                    animationDelay: `${rowIdx * 0.1}s`
                  }}>
                    {[1, 2, 3, 4, 5, 6].map((colIdx) => (
                      <div key={colIdx} style={{
                        height: '18px',
                        background: '#f5f5f5',
                        borderRadius: '4px',
                        width: colIdx === 1 ? '90%' : '80%'
                      }} />
                    ))}
                  </div>
                ))}

                <style>{`
                  @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                  }
                `}</style>
              </div>
            </SkeletonContainer>
          ) : filteredPlayers.length > 0 ? (
            <Table
              columns={columns}
              data={filteredPlayers}
              actions={(row) => (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                    onClick={() => {
                      setIsEditMode(true);
                      setEditingPlayerId(row.playerId);
                      setFormData({ 
                        playerName: row.playerName || row.name || '',
                        fatherName: row.fatherName || '',
                        motherName: row.motherName || '',
                        dateOfBirth: row.dateOfBirth ? row.dateOfBirth.split('T')[0] : '',
                        address: row.address || '',
                        phone: row.phone || '',
                        alternativeNumber: row.alternativeNumber || '',
                        age: row.age || '',
                        LearningPathway: row.LearningPathway || '',
                        status: row.status || 'active'
                      });
                      setIsModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#f3f4f6',
                      color: '#111827',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#E8F2F8';
                      e.currentTarget.style.borderColor = '#060030ff';
                      e.currentTarget.style.color = '#060030ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.color = '#111827';
                    }}
                  >
                      <Edit3 size={14} /> Edit
                  </button>
                    <button
                    onClick={() => {
                      setSelectedPlayer(row);
                      setDetailsOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#f3f4f6',
                      color: '#111827',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#E8F2F8';
                      e.currentTarget.style.borderColor = '#060030ff';
                      e.currentTarget.style.color = '#060030ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.color = '#111827';
                    }}
                  >
                      <Eye size={14} /> Full Details
                  </button>
                    <button
                      onClick={() => setDeleteConfirm(row.playerId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #fee2e2',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#EF4444';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.borderColor = '#EF4444';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fef2f2';
                      e.currentTarget.style.color = '#dc2626';
                      e.currentTarget.style.borderColor = '#fee2e2';
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
              <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>No players found</p>
              <p style={{ fontSize: '13px', color: '#bbb' }}>
                {searchTerm ? 'Try adjusting your search criteria' : 'Start by adding your first player'}
              </p>
            </div>
          )}
        </Card>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <Modal
            isOpen={!!deleteConfirm}
            onClose={() => setDeleteConfirm(null)}
            title="Delete Player"
          >
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#FEF2F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Trash2 size={28} color="#EF4444" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>Delete this player?</h3>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
                This action cannot be undone. The player and all associated data will be permanently deleted.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Button
                  onClick={() => setDeleteConfirm(null)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontWeight: '500',
                    backgroundColor: '#f3f4f6',
                    color: '#111827',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    setToastMessage('');
                    setLoading(true);
                    try {
                      const res = await deletePlayerRemote(deleteConfirm);
                      if (!res.success) {
                        setToastMessage(res.error || 'Failed to delete player');
                      } else {
                        // Show toast notification
                        setToastMessage('Player deleted successfully');
                        // Refetch players data
                        await fetchPlayers();
                      }
                      setDeleteConfirm(null);
                    } catch (err) {
                      setToastMessage(err.message || 'Failed to delete player');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontWeight: '500',
                    backgroundColor: loading ? '#DC2626' : '#EF4444',
                    color: 'white',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    opacity: loading ? 0.8 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    justifyContent: 'center'
                  }}
                  disabled={loading}
                >
                  {loading && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                  {loading ? 'Deleting...' : 'Delete Permanently'}
                  <style>{`
                    @keyframes spin {
                      from { transform: rotate(0deg); }
                      to { transform: rotate(360deg); }
                    }
                  `}</style>
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Player Details Modal */}
        {detailsOpen && selectedPlayer && (
          <Modal
            isOpen={detailsOpen}
            onClose={() => { setDetailsOpen(false); setSelectedPlayer(null); }}
            title="Player Profile"
          >
            <div style={{ padding: '24px', maxWidth: '700px' }}>
              {/* Header with Player Name and Status */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '2px solid #E5E7EB'
              }}>
                <div>
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                    {selectedPlayer.playerName || selectedPlayer.name}
                  </h2>
                  <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>Player ID: {selectedPlayer.playerId || 'N/A'}</p>
                </div>
                
              </div>

              {/* Personal Information Section */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Personal Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="players-details-grid">
                  <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Father Name</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#111827' }}>{selectedPlayer.fatherName ?? '-'}</p>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Mother Name</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#111827' }}>{selectedPlayer.motherName ?? '-'}</p>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Date of Birth</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                      {selectedPlayer.dateOfBirth ? new Date(selectedPlayer.dateOfBirth).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Age</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#111827' }}>{selectedPlayer.age ?? '-'}</p>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>LearningPathway</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#111827', textTransform: 'capitalize' }}>{selectedPlayer.LearningPathway ?? '-'}</p>
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Contact Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Phone</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#111827' }}>{selectedPlayer.phone ?? selectedPlayer.mobile ?? '-'}</p>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Alt. Phone</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#111827' }}>{selectedPlayer.alternativeNumber ?? '-'}</p>
                  </div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Address</p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#111827' }}>{selectedPlayer.address ?? '-'}</p>
                </div>
              </div>

              {/* Performance & Points Section */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Performance & Points
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div style={{ padding: '14px', backgroundColor: '#DBEAFE', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '600', color: '#0369A1', textTransform: 'uppercase' }}>Total Points</p>
                    <p style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0369A1' }}>
                      {selectedPlayer.TotalPoints ?? selectedPlayer.totalPoints ?? 0}
                    </p>
                  </div>
                  <div style={{ padding: '14px', backgroundColor: '#DCFCE7', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '600', color: '#15803D', textTransform: 'uppercase' }}>Point Balance</p>
                    <p style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#15803D' }}>
                      {selectedPlayer.PointBalance ?? selectedPlayer.pointBalance ?? selectedPlayer.TotalPoints ?? selectedPlayer.totalPoints ?? 0}
                    </p>
                  </div>
                  
                </div>
              </div>

              {/* Academy Information Section */}
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Academy Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Primary Coach</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#111827' }}>{selectedPlayer.primaryCoach ?? '-'}</p>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Registration Date</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                      {selectedPlayer.dateOfRegistration ? new Date(selectedPlayer.dateOfRegistration).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setFormData({
              playerName: '',
              fatherName: '',
              motherName: '',
              dateOfBirth: '',
              address: '',
              phone: '',
              alternativeNumber: '',
              age: '',
              LearningPathway: '',
              status: 'active',
            });
            setToastMessage('');
            setToastMessage('');
            setIsEditMode(false);
            setEditingPlayerId(null);
          }}
          title={isEditMode ? 'Edit Player' : 'Add New Player'}
        >
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 32px 0px 32px' }} className="modal-body">
              
            <style>{`
              @media (max-width: 767px) {
                .modal-body {
                  padding: 0 16px 0 16px !important;
                }
                .modal-form-grid {
                  gridTemplateColumns: 1fr !important;
                  gap: 16px !important;
                }
                .players-details-grid {
                  gridTemplateColumns: 1fr !important;
                }
                .modal-actions {
                  gridTemplateColumns: 1fr !important;
                }
              }
              @media (min-width: 768px) and (max-width: 1024px) {
                .modal-body {
                  padding: 0 24px 0 24px !important;
                }
                .modal-form-grid {
                  gridTemplateColumns: 1fr !important;
                  gap: 18px !important;
                }
              }
            `}</style>
              
            

            

            {/* Form Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }} className="modal-form-grid">
              {/* Player Name Field */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '700', 
                  color: '#111827', 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Player Name
                  <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={formData.playerName}
                  onChange={(e) => setFormData({ ...formData, playerName: e.target.value })}
                  required={!isEditMode}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: '#E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    boxSizing: 'border-box',
                    background: '#F9FAFB',
                    color: '#111827'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#060030ff';
                    e.target.style.background = '#FFFFFF';
                    e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.background = '#F9FAFB';
                    e.target.style.boxShadow = 'none';
                  }}
                  disabled={loading}
                />
              </div>

              {/* Father Name Field */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '700', 
                  color: '#111827', 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Father Name
                </label>
                <input
                  type="text"
                  placeholder="Father's full name"
                  value={formData.fatherName}
                  onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                  
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: '#E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    boxSizing: 'border-box',
                    background: '#F9FAFB',
                    color: '#111827'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#060030ff';
                    e.target.style.background = '#FFFFFF';
                    e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.background = '#F9FAFB';
                    e.target.style.boxShadow = 'none';
                  }}
                  disabled={loading}
                />
              </div>

              {/* Mother Name Field */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '700', 
                  color: '#111827', 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Mother Name
                </label>
                <input
                  type="text"
                  placeholder="Mother's full name"
                  value={formData.motherName}
                  onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                  
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: '#E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    boxSizing: 'border-box',
                    background: '#F9FAFB',
                    color: '#111827'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#060030ff';
                    e.target.style.background = '#FFFFFF';
                    e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.background = '#F9FAFB';
                    e.target.style.boxShadow = 'none';
                  }}
                  disabled={loading}
                />
              </div>

              {/* Phone Field */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '700', 
                  color: '#111827', 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Phone Number
                  <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                </label>
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(e) => {
                    const filtered = e.target.value.replace(/[^0-9+\-]/g, '');
                    setFormData({ ...formData, phone: filtered });
                  }}
                  required={!isEditMode}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    boxSizing: 'border-box',
                    background: '#F9FAFB',
                    color: '#111827'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#060030ff';
                    e.target.style.background = '#FFFFFF';
                    e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.background = '#F9FAFB';
                    e.target.style.boxShadow = 'none';
                  }}
                  disabled={loading}
                />
              </div>

              {/* Alternative Number Field */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '700', 
                  color: '#111827', 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Alternative Number
                </label>
                <input
                  type="tel"
                  placeholder="Enter alternative phone"
                  value={formData.alternativeNumber}
                  onChange={(e) => {
                    const filtered = e.target.value.replace(/[^0-9+\-]/g, '');
                    setFormData({ ...formData, alternativeNumber: filtered });
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    boxSizing: 'border-box',
                    background: '#F9FAFB',
                    color: '#111827'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#060030ff';
                    e.target.style.background = '#FFFFFF';
                    e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.background = '#F9FAFB';
                    e.target.style.boxShadow = 'none';
                  }}
                  disabled={loading}
                />
              </div>

              {/* Date of Birth Field */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '700', 
                  color: '#111827', 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleDateOfBirthChange}
                  max={new Date().toISOString().split('T')[0]}
                  
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    boxSizing: 'border-box',
                    background: '#F9FAFB',
                    color: '#111827'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#060030ff';
                    e.target.style.background = '#FFFFFF';
                    e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.background = '#F9FAFB';
                    e.target.style.boxShadow = 'none';
                  }}
                  disabled={loading}
                />
              </div>

              {/* Age Field */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '700', 
                  color: '#111827', 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Age
                  {!isEditMode && <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>}
                </label>
                <input
                  type="number"
                  placeholder="Enter age"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  required={!isEditMode}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    boxSizing: 'border-box',
                    background: '#F9FAFB',
                    color: '#111827'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#060030ff';
                    e.target.style.background = '#FFFFFF';
                    e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.background = '#F9FAFB';
                    e.target.style.boxShadow = 'none';
                  }}
                  disabled={loading}
                />
              </div>



              {/* Status Field */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '700', 
                  color: '#111827', 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Status
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    className="assign-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      paddingRight: '40px',
                      border: '2px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.3s',
                      boxSizing: 'border-box',
                      background: '#F9FAFB',
                      color: '#111827',
                      cursor: 'pointer',
                      appearance: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#060030ff';
                      e.target.style.background = '#FFFFFF';
                      e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#E5E7EB';
                      e.target.style.background = '#F9FAFB';
                      e.target.style.boxShadow = 'none';
                    }}
                    disabled={loading}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <ChevronDown size={18} style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#111827'
                  }} />
                </div>
              </div>

              {/* LearningPathway Field */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '700', 
                  color: '#111827', 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Learning Pathway
                  <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                </label>
                <select
                  value={formData.LearningPathway}
                  onChange={(e) => setFormData({ ...formData, LearningPathway: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    boxSizing: 'border-box',
                    background: '#F9FAFB',
                    color: '#111827',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#060030ff';
                    e.target.style.background = '#FFFFFF';
                    e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.background = '#F9FAFB';
                    e.target.style.boxShadow = 'none';
                  }}
                  disabled={loading}
                >
                  {Array.isArray(learningPathway) && learningPathway.length > 0 ? (
                    <>
                      <option value="" disabled>Select Learning Pathway</option>
                      {[...new Set(learningPathway.map(p => p.LearningPathway || p.name || p.pathwayName).filter(Boolean))].map((pathwayName) => (
                        <option key={pathwayName} value={pathwayName}>
                          {pathwayName}
                        </option>
                      ))}
                    </>
                  ) : (
                    <>
                      <option value="" disabled>Select Learning Pathway</option>
                      <option value="Foundation">Foundation</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </>
                  )}
                </select>
              </div>

              {/* Address Field - Full Width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '700', 
                  color: '#111827', 
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Address
                </label>
                <textarea
                  placeholder="Enter complete address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.3s',
                    boxSizing: 'border-box',
                    background: '#F9FAFB',
                    color: '#111827',
                    resize: 'vertical',
                    minHeight: '80px',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#060030ff';
                    e.target.style.background = '#FFFFFF';
                    e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.background = '#F9FAFB';
                    e.target.style.boxShadow = 'none';
                  }}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Divider */}
            {/* <div style={{ height: '1px', background: '#f3f4f6', margin: '24px 0' }}></div> */}

            {/* Form Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="modal-actions">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setFormData({
                    playerName: '',
                    fatherName: '',
                    motherName: '',
                    dateOfBirth: '',
                    address: '',
                    phone: '',
                    alternativeNumber: '',
                    age: '',
                    LearningPathway: 'foundation',
                    status: 'active',
                  });
                  setToastMessage('');
                  setToastMessage('');
                  setIsEditMode(false);
                  setEditingPlayerId(null);
                }}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  backgroundColor: '#F3F4F6',
                  color: '#111827',
                  border: '2px solid #E5E7EB',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  opacity: loading ? 0.6 : 1,
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#E5E7EB')}
                onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#F3F4F6')}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleAddPlayer}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  background: 'linear-gradient(135deg, rgb(6, 0, 48) 0%, rgb(0, 0, 0) 100%)',
                  color: 'white',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  opacity: loading ? 0.8 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
                }}
                onMouseEnter={(e) => !loading && (e.target.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.25)')}
                onMouseLeave={(e) => !loading && (e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)')}
                disabled={loading}
              >
                {loading && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                <span>{loading ? (isEditMode ? 'Updating Player...' : 'Creating Player...') : (isEditMode ? 'Update Player' : 'Create Player')}</span>
              </button>
            </div>

            {/* Animations */}
            <style>{`
              @keyframes slideIn {
                from {
                  opacity: 0;
                  transform: translateY(-10px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </Modal>
        </div>
      </div>
    </Layout>
  );
};

export default Players;
