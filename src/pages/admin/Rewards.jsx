import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { SkeletonContainer } from '../../components/SkeletonLoader';
import { Gift, Edit2, Trash2, Package, Search, ChevronDown, Plus, X, Loader } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Toast } from '../../components/Toast';

const API_ENDPOINTS = {
  VIEW: 'https://vzcyj52ypb.execute-api.ap-south-1.amazonaws.com/default/CL_View_Reward',
  ADD: 'https://rk37pftip6.execute-api.ap-south-1.amazonaws.com/default/CL_Add_Reward',
  UPDATE: 'https://5rb7nhg1rg.execute-api.ap-south-1.amazonaws.com/default/CL_Update_Reward',
  DELETE: 'https://dxliwg58k2.execute-api.ap-south-1.amazonaws.com/default/CL_Delete_Reward'
};

const Rewards = () => {
  const { userToken } = useStore();
  const [rewards, setRewards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const hasFetchedRef = useRef(false);
  const [formData, setFormData] = useState({
    rewardName: '',
    rewardDescription: '',
    points: '',
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch rewards from API - only on initial load
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchRewards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.VIEW, {
        headers: { 'userToken': userToken }
      });
      const data = await response.json();
      
      if (data.data) {
        setRewards(data.data);
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
      showToast('Failed to load rewards', 'error');
      setRewards([]);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteClick = (reward) => {
    setSelectedReward(reward);
    setDeleteModalOpen(true);
  };

  const handleDeleteReward = async () => {
    try {
      setSubmitting(true);
      const rewardId = selectedReward.id || selectedReward._id || selectedReward.rewardId;
      const response = await fetch(API_ENDPOINTS.DELETE, {
        method: 'DELETE',
        headers: { 'userToken': userToken },
        body: JSON.stringify({ rewardId: rewardId })
      });

      const result = await response.json();

      if (response.ok) {
        showToast('Reward deleted successfully', 'success');
        setDeleteModalOpen(false);
        fetchRewards();
      } else {
        console.error('Delete error:', result);
        showToast('Failed to delete reward', 'error');
      }
    } catch (error) {
      console.error('Error deleting reward:', error);
      showToast('Error deleting reward', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReward = async (e) => {
    e.preventDefault();
    
    if (!formData.rewardName || !formData.rewardDescription || !formData.points) {
      showToast('Please fill all fields', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        rewardName: formData.rewardName,
        rewardDescription: formData.rewardDescription,
        points: parseInt(formData.points),
        isActive: formData.isActive
      };

      const requestBody = editingReward ? { ...payload, rewardId: editingReward._id || editingReward.rewardId } : payload;
      

      const response = await fetch(editingReward ? API_ENDPOINTS.UPDATE : API_ENDPOINTS.ADD, {
        method: editingReward ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'userToken': userToken },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        showToast(editingReward ? 'Reward updated successfully' : 'Reward added successfully', 'success');
        setAddModalOpen(false);
        setEditingReward(null);
        setFormData({ rewardName: '', rewardDescription: '', points: '', isActive: true });
        fetchRewards();
      } else {
        showToast(editingReward ? 'Failed to update reward' : 'Failed to add reward', 'error');
      }
    } catch (error) {
      console.error('Error saving reward:', error);
      showToast('Error saving reward', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (reward) => {
    setEditingReward(reward);
    setFormData({
      rewardName: reward.rewardName,
      rewardDescription: reward.rewardDescription,
      points: reward.points.toString(),
      isActive: reward.isActive
    });
    setAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setAddModalOpen(false);
    setEditingReward(null);
    setFormData({ rewardName: '', rewardDescription: '', points: '', isActive: true });
  };

  const totalPoints = rewards.reduce((sum, r) => sum + (r.points || 0), 0);
  const avgPointsRequired = rewards.length > 0 ? Math.round(totalPoints / rewards.length) : 0;
  const activeRewards = rewards.filter(r => r.isActive).length;

  const filteredRewards = rewards.filter(reward => {
    const matchesSearch = reward.rewardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reward.rewardDescription.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
        {/* Header with Stats */}
        {loading ? (
          <SkeletonContainer>
            <div style={{
              background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
              backdropFilter: 'blur(20px)',
              color: 'white',
              padding: '40px 32px',
              marginBottom: '32px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 8px 32px rgba(37, 44, 53, 0.15)',
              minHeight: '240px'
            }}>
              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
              `}</style>
              <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      height: '32px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                      width: '280px'
                    }} />
                    <div style={{
                      height: '14px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.1s',
                      width: '340px'
                    }} />
                  </div>
                  <div style={{
                    height: '36px',
                    width: '140px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.15s',
                    flexShrink: 0
                  }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} style={{
                      height: '80px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite ${i * 0.1}s`,
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }} />
                  ))}
                </div>
              </div>
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
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: '700', margin: '0 0 4px 0' }}>Reward Management</h1>
                <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>Manage {rewards.length} reward{rewards.length !== 1 ? 's' : ''} and incentive catalog</p>
              </div>
              <button
                onClick={() => {
                  setEditingReward(null);
                  setFormData({ rewardName: '', rewardDescription: '', points: '', isActive: true });
                  setAddModalOpen(true);
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    background: 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    border: '2px solid rgba(255, 255, 255, 1)',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  }}
              >
                <Plus size={18} /> Add Reward
              </button>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Rewards</p>
                <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{rewards.length}</p>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Rewards</p>
                <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{activeRewards}</p>
              </div>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <p style={{ fontSize: '11px', opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Points Required</p>
                <p style={{ fontSize: '24px', fontWeight: '700', margin: '6px 0 0 0' }}>{avgPointsRequired}</p>
              </div>
            </div>
          </div>
        </div>
        )}

        <div style={{ padding: '0 32px' }}>
          {/* Search */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '32px',
            backgroundColor: 'white',
            padding: '10px 14px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
              <Search size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#060030ff'
              }} />
              <input
                type="text"
                placeholder="Search rewards by name or description..."
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
          </div>

          {/* Rewards Grid or Loading */}
          {loading ? (
            <SkeletonContainer>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '24px',
                marginBottom: '32px'
              }}>
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '14px',
                      padding: '24px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                      border: '1px solid #f0f0f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}
                  >
                    {/* Title Skeleton */}
                    <div style={{
                      height: '22px',
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #f9f9f9 50%, #f0f0f0 75%)',
                      backgroundSize: '200% 100%',
                      borderRadius: '6px',
                      animation: 'shimmer 2s infinite',
                      animationDelay: `${idx * 0.1}s`
                    }} />

                    {/* Description Skeleton */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{
                        height: '16px',
                        background: 'linear-gradient(90deg, #f5f5f5 25%, #fafafa 50%, #f5f5f5 75%)',
                        backgroundSize: '200% 100%',
                        borderRadius: '4px',
                        animation: 'shimmer 2s infinite',
                        animationDelay: `${idx * 0.1 + 0.05}s`
                      }} />
                      <div style={{
                        height: '16px',
                        background: 'linear-gradient(90deg, #f5f5f5 25%, #fafafa 50%, #f5f5f5 75%)',
                        backgroundSize: '200% 100%',
                        borderRadius: '4px',
                        width: '85%',
                        animation: 'shimmer 2s infinite',
                        animationDelay: `${idx * 0.1 + 0.1}s`
                      }} />
                    </div>

                    {/* Points Badge Skeleton */}
                    <div style={{
                      height: '28px',
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #f9f9f9 50%, #f0f0f0 75%)',
                      backgroundSize: '200% 100%',
                      borderRadius: '20px',
                      width: '100px',
                      animation: 'shimmer 2s infinite',
                      animationDelay: `${idx * 0.1 + 0.15}s`
                    }} />

                    {/* Status Badge Skeleton */}
                    <div style={{
                      height: '20px',
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #f9f9f9 50%, #f0f0f0 75%)',
                      backgroundSize: '200% 100%',
                      borderRadius: '4px',
                      width: '70px',
                      animation: 'shimmer 2s infinite',
                      animationDelay: `${idx * 0.1 + 0.2}s`
                    }} />

                    {/* Action Buttons Skeleton */}
                    <div style={{
                      display: 'flex',
                      gap: '10px',
                      marginTop: '12px'
                    }}>
                      <div style={{
                        flex: 1,
                        height: '36px',
                        background: 'linear-gradient(90deg, #f5f5f5 25%, #fafafa 50%, #f5f5f5 75%)',
                        backgroundSize: '200% 100%',
                        borderRadius: '8px',
                        animation: 'shimmer 2s infinite',
                        animationDelay: `${idx * 0.1 + 0.25}s`
                      }} />
                      <div style={{
                        flex: 1,
                        height: '36px',
                        background: 'linear-gradient(90deg, #f5f5f5 25%, #fafafa 50%, #f5f5f5 75%)',
                        backgroundSize: '200% 100%',
                        borderRadius: '8px',
                        animation: 'shimmer 2s infinite',
                        animationDelay: `${idx * 0.1 + 0.3}s`
                      }} />
                    </div>
                  </div>
                ))}
              </div>
              <style>{`
                @keyframes shimmer {
                  0% { backgroundPosition: 200% 0; }
                  100% { backgroundPosition: -200% 0; }
                }
              `}</style>
            </SkeletonContainer>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '24px',
              marginBottom: '32px'
            }}>
              {filteredRewards.length > 0 ? (
                filteredRewards.map((reward, index) => (
                  <div
                    key={reward._id || reward.rewardId || `reward-${index}`}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '14px',
                      padding: '24px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      border: '1px solid #f0f0f0',
                      transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 16px 32px rgba(0, 0, 0, 0.12)';
                      e.currentTarget.style.transform = 'translateY(-8px)';
                      e.currentTarget.style.borderColor = '#E5E7EB';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = '#f0f0f0';
                    }}
                  >
                    {/* Background accent */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: '110px',
                      height: '110px',
                      background: 'linear-gradient(135deg, rgb(177, 177, 177) 0%, transparent 100%)',
                      borderRadius: '0 0 0 100%',
                      pointerEvents: 'none'
                    }} />

                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '12px'
                      }}>
                        <h3 style={{
                          fontSize: '17px',
                          fontWeight: '700',
                          color: '#111827',
                          margin: 0,
                          flex: 1,
                          paddingRight: '12px'
                        }}>
                          {reward.rewardName}
                        </h3>
                        <span style={{
                          display: 'inline-block',
                          padding: '5px 10px',
                          backgroundColor: reward.isActive ? '#dbfeec' : '#FEE2E2',
                          color: reward.isActive ? '#03a12b' : '#ca0000',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}>
                          {reward.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <p style={{
                        fontSize: '13px',
                        color: '#6B7280',
                        marginBottom: '16px',
                        margin: '0 0 16px 0',
                        lineHeight: '1.5',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {reward.rewardDescription}
                      </p>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 14px',
                        background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
                        borderRadius: '8px',
                        marginBottom: '18px',
                        transition: 'all 0.3s ease'
                      }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'rgba(217, 119, 6, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Gift size={16} color="#D97706" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '11px', color: '#92400E', margin: '0 0 2px 0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Points Required</p>
                          <p style={{ fontSize: '16px', fontWeight: '800', color: '#B45309', margin: 0 }}>{reward.points}</p>
                        </div>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '10px'
                      }}>
                        <button
                          onClick={() => handleEditClick(reward)}
                          style={{
                            padding: '10px 14px',
                            background: 'linear-gradient(135deg, #060030ff 0%, #1a0050ff 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.3s ease',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #1a0050ff 0%, #060030ff 100%)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 0, 48, 0.3)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #060030ff 0%, #1a0050ff 100%)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(reward)}
                          style={{
                            padding: '10px 14px',
                            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.3s ease',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '64px 32px',
                  backgroundColor: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
                  borderRadius: '14px',
                  border: '2px dashed #E5E7EB'
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    margin: '0 auto 20px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(6, 0, 48, 0.05) 0%, rgba(6, 0, 48, 0.02) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Package size={40} style={{ color: '#D1D5DB' }} />
                  </div>
                  <p style={{ fontSize: '18px', fontWeight: '700', color: '#374151', margin: '0 0 8px 0' }}>No rewards found</p>
                  <p style={{ fontSize: '14px', color: '#6B7280', margin: '0' }}>Create your first reward or adjust your search filters</p>
                </div>
              )}
            </div>
          )}

          {/* Add/Edit Reward Modal */}
          {addModalOpen && (
            <div style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(4px)',
              animation: 'fadeIn 0.3s ease-out'
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '520px',
                width: '90%',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #060030ff 0%, #1a0050ff 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Gift size={20} color="white" />
                    </div>
                    <h3 style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#111827',
                      margin: 0
                    }}>
                      {editingReward ? 'Edit Reward' : 'Add New Reward'}
                    </h3>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F3F4F6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <X size={24} color="#6B7280" />
                  </button>
                </div>

                <form onSubmit={handleAddReward}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#111827',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Reward Name
                    </label>
                    <input
                      type="text"
                      value={formData.rewardName}
                      onChange={(e) => setFormData({ ...formData, rewardName: e.target.value })}
                      placeholder="e.g., OPENAI_SUBSCRIPTION"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '2px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'all 0.3s ease',
                        boxSizing: 'border-box',
                        backgroundColor: '#FAFBFC'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#060030ff';
                        e.target.style.backgroundColor = '#ffffff';
                        e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#E5E7EB';
                        e.target.style.backgroundColor = '#FAFBFC';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#111827',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Description
                    </label>
                    <textarea
                      value={formData.rewardDescription}
                      onChange={(e) => setFormData({ ...formData, rewardDescription: e.target.value })}
                      placeholder="e.g., Earn a free openai subscription"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '2px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'all 0.3s ease',
                        boxSizing: 'border-box',
                        minHeight: '100px',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        backgroundColor: '#FAFBFC'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#060030ff';
                        e.target.style.backgroundColor = '#ffffff';
                        e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#E5E7EB';
                        e.target.style.backgroundColor = '#FAFBFC';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#111827',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Points Required
                    </label>
                    <input
                      type="number"
                      value={formData.points}
                      onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                      placeholder="e.g., 1000"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '2px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'all 0.3s ease',
                        boxSizing: 'border-box',
                        backgroundColor: '#FAFBFC'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#060030ff';
                        e.target.style.backgroundColor = '#ffffff';
                        e.target.style.boxShadow = '0 0 0 3px rgba(6, 0, 48, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#E5E7EB';
                        e.target.style.backgroundColor = '#FAFBFC';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '28px', padding: '12px 14px', backgroundColor: '#F3F4F6', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      id="isActive"
                      style={{
                        cursor: 'pointer',
                        width: '18px',
                        height: '18px'
                      }}
                    />
                    <label htmlFor="isActive" style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#111827',
                      cursor: 'pointer',
                      margin: 0
                    }}>
                      Mark as active
                    </label>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px'
                  }}>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      style={{
                        padding: '12px 16px',
                        border: '2px solid #E5E7EB',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#111827',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#ffffff';
                        e.currentTarget.style.backgroundColor = '#000000';
                        e.currentTarget.style.borderColor = '#000000';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#111827';
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        padding: '12px 16px',
                        background: submitting ? 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)' : 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => {
                        if (!submitting) {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.color = '#060030ff';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 0, 48, 0.2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!submitting) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)';
                          e.currentTarget.style.color = '#ffffff';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    >
                      {submitting && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                      {editingReward ? 'Update' : 'Add'} Reward
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteModalOpen && selectedReward && (
            <div style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(4px)',
              animation: 'fadeIn 0.3s ease-out'
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '420px',
                width: '90%',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '12px',
                  background: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px'
                }}>
                  <Trash2 size={32} color="#DC2626" />
                </div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#111827',
                  textAlign: 'center',
                  margin: '0 0 8px 0'
                }}>
                  Delete Reward?
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#6B7280',
                  textAlign: 'center',
                  margin: '0 0 28px 0',
                  lineHeight: '1.6'
                }}>
                  Are you sure you want to delete <strong style={{ color: '#111827' }}>"{selectedReward.rewardName}"</strong>? This action cannot be undone.
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px'
                }}>
                  <button
                    onClick={() => setDeleteModalOpen(false)}
                    disabled={submitting}
                    style={{
                      padding: '12px 16px',
                      border: '2px solid #E5E7EB',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#111827',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#060030ff';
                      e.currentTarget.style.backgroundColor = '#F3F4F6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E5E7EB';
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteReward}
                    disabled={submitting}
                    style={{
                      padding: '12px 16px',
                      background: submitting ? '#FCA5A5' : 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      if (!submitting) {
                        e.currentTarget.style.background = '#DC2626';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!submitting) {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    {submitting && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Layout>
  );
};

export default Rewards;


