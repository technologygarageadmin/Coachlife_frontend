import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { SkeletonContainer } from '../../components/SkeletonLoader';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  User, 
  Edit2, 
  Save, 
  X,
  Users,
  Award,
  BarChart3,
  Star,
  TrendingUp,
  Loader
} from 'lucide-react';

const UserProfile = () => {
  const { currentUser, fetchUserProfile } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const fetchedUserIdRef = useRef(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [formData, setFormData] = useState({
    username: currentUser?.username || '',
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    address: currentUser?.address || '',
    specialization: currentUser?.specialization || ''
  });

  // Synchronize formData when profileData updates
  useEffect(() => {
    if (profileData) {
      setFormData(prev => ({
        ...prev,
        username: profileData.username || prev.username,
        name: profileData.name || prev.name,
        email: profileData.email || prev.email,
        phone: profileData.phone || prev.phone,
        address: profileData.address || prev.address,
        specialization: profileData.specialization || prev.specialization
      }));
    }
  }, [profileData]);

  // Fetch full user profile from API (once per user id)
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!currentUser?.id && !currentUser?._id) {
        return;
      }

      const userId = currentUser.id || currentUser._id;
      if (fetchedUserIdRef.current === userId) {
        return;
      }
      fetchedUserIdRef.current = userId;
      
      try {
        setIsLoading(true);
        
        if (!fetchUserProfile) {
          console.error('fetchUserProfile is not available in store');
          return;
        }
        
        const result = await fetchUserProfile(userId);
        
        if (result.success && result.profile) {
          setProfileData(result.profile);
        } else {
          console.warn('Profile fetch failed:', result.error);
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserProfile();
  }, [currentUser?.id, currentUser?._id, fetchUserProfile]);

  // Get assigned players from profile data
  const myplayers = profileData?.PlayersList?.length || 0;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // TODO: Save profile to backend
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      username: currentUser?.username || '',
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      address: currentUser?.address || '',
      specialization: currentUser?.specialization || ''
    });
    setIsEditing(false);
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdatePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    // TODO: Call password update API
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswordForm(false);
    alert('Password updated successfully');
  };

  if (!currentUser) {
    return (
      <Layout>
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ fontSize: '16px', color: '#6B7280' }}>Please log in to view your profile</p>
        </div>
      </Layout>
    );
  }

  const userRole = currentUser?.role || 'User';
  const getRoleLabel = () => {
    if (Array.isArray(profileData?.role)) {
      return profileData.role.map(r => 
        r === 'admin' ? 'Administrator' : 
        r === 'coach' ? 'Professional Coach' : 
        r.charAt(0).toUpperCase() + r.slice(1)
      ).join(' & ');
    }
    return userRole === 'ADMIN' ? 'Administrator' : 
           userRole === 'COACH' ? 'Professional Coach' : 'User';
  };

  return (
    <Layout>
      <style>{`
        /* Mobile (350px - 768px) */
        @media (max-width: 768px) {
          .profile-container {
            padding: 0 clamp(12px, 4vw, 24px) !important;
          }
          
          .profile-header {
            padding: clamp(20px, 5vw, 40px) clamp(16px, 4vw, 32px) !important;
            margin-bottom: clamp(20px, 5vw, 32px) !important;
          }
          
          .profile-header h1 {
            font-size: clamp(24px, 6vw, 32px) !important;
          }
          
          .profile-header p {
            font-size: clamp(12px, 3vw, 14px) !important;
          }
          
          .profile-content {
            grid-template-columns: 1fr !important;
            gap: clamp(16px, 4vw, 32px) !important;
          }
          
          .profile-card {
            padding: clamp(20px, 4vw, 32px) !important;
          }
          
          .profile-card h2 {
            font-size: clamp(18px, 5vw, 24px) !important;
          }
          
          .profile-card h3 {
            font-size: clamp(14px, 4vw, 18px) !important;
          }
          
          .avatar {
            width: clamp(70px, 15vw, 100px) !important;
            height: clamp(70px, 15vw, 100px) !important;
            font-size: clamp(28px, 8vw, 44px) !important;
            margin-bottom: clamp(12px, 3vw, 20px) !important;
          }
          
          .form-field label {
            font-size: clamp(10px, 2.5vw, 12px) !important;
          }
          
          .form-field input,
          .form-field textarea {
            font-size: clamp(12px, 3vw, 14px) !important;
            padding: clamp(8px, 2vw, 10px) clamp(10px, 2.5vw, 12px) !important;
          }
          
          .form-value {
            font-size: clamp(12px, 3vw, 14px) !important;
          }
          
          .button-group {
            flex-direction: column !important;
          }
          
          .button-group button {
            width: 100% !important;
            padding: clamp(10px, 2.5vw, 10px) clamp(12px, 3vw, 16px) !important;
            font-size: clamp(12px, 2.5vw, 13px) !important;
          }
          
          .info-box {
            padding: clamp(10px, 2vw, 12px) !important;
          }
          
          .info-box-label {
            font-size: clamp(9px, 2vw, 10px) !important;
          }
          
          .info-box-value {
            font-size: clamp(11px, 2.5vw, 13px) !important;
          }
          
          .stats-box {
            padding: clamp(12px, 3vw, 16px) !important;
            margin-bottom: clamp(12px, 3vw, 16px) !important;
          }
          
          .stats-box-label {
            font-size: clamp(9px, 2vw, 11px) !important;
          }
          
          .stats-box-value {
            font-size: clamp(20px, 6vw, 28px) !important;
          }
        }
        
        /* Tablet (768px - 1024px) */
        @media (min-width: 769px) and (max-width: 1024px) {
          .profile-container {
            padding: 0 clamp(20px, 4vw, 32px) !important;
          }
          
          .profile-header {
            padding: clamp(28px, 4vw, 40px) clamp(20px, 3vw, 32px) !important;
            margin-bottom: clamp(24px, 4vw, 32px) !important;
          }
          
          .profile-header h1 {
            font-size: clamp(26px, 5vw, 32px) !important;
          }
          
          .profile-header p {
            font-size: clamp(13px, 2vw, 14px) !important;
          }
          
          .profile-content {
            grid-template-columns: 1fr !important;
            gap: clamp(20px, 3vw, 32px) !important;
          }
          
          
          .profile-card h2 {
            font-size: clamp(20px, 4vw, 24px) !important;
          }
          
          .profile-card h3 {
            font-size: clamp(16px, 3vw, 18px) !important;
          }
          
          .avatar {
            width: clamp(80px, 12vw, 100px) !important;
            height: clamp(80px, 12vw, 100px) !important;
            font-size: clamp(32px, 7vw, 44px) !important;
            margin-bottom: clamp(14px, 2vw, 20px) !important;
          }
          
          .form-field label {
            font-size: clamp(11px, 2vw, 12px) !important;
          }
          
          .form-field input,
          .form-field textarea {
            font-size: clamp(13px, 2vw, 14px) !important;
            padding: clamp(8px, 1.5vw, 10px) clamp(10px, 2vw, 12px) !important;
          }
          
          .form-value {
            font-size: clamp(13px, 2vw, 14px) !important;
          }
          
          .button-group {
            flex-direction: row !important;
          }
          
          .button-group button {
            width: auto !important;
            flex: 1 !important;
            padding: clamp(9px, 2vw, 10px) clamp(14px, 2.5vw, 16px) !important;
            font-size: clamp(12px, 2vw, 13px) !important;
          }
          
          .info-box {
            padding: clamp(11px, 1.5vw, 12px) !important;
          }
          
          .info-box-label {
            font-size: clamp(9px, 1.5vw, 10px) !important;
          }
          
          .info-box-value {
            font-size: clamp(12px, 1.8vw, 13px) !important;
          }
          
          .stats-box {
            padding: clamp(14px, 2.5vw, 16px) !important;
            margin-bottom: clamp(12px, 2vw, 16px) !important;
          }
          
          .stats-box-label {
            font-size: clamp(10px, 1.5vw, 11px) !important;
          }
          
          .stats-box-value {
            font-size: clamp(22px, 4vw, 28px) !important;
          }
        }
        
        /* Laptop Small (1024px+) */
        @media (min-width: 1025px) {
          .profile-container {
            padding: 0 32px;
          }
          
          .profile-header {
            padding: 40px 32px;
            margin-bottom: 32px;
          }
          
          .profile-header h1 {
            font-size: 32px;
          }
          
          .profile-header p {
            font-size: 14px;
          }
          
          .profile-content {
            grid-template-columns: 1fr 1fr;
            gap: 32px;
          }
          
          
          .profile-card h2 {
            font-size: 24px;
          }
          
          .profile-card h3 {
            font-size: 18px;
          }
          
          .avatar {
            width: 100px;
            height: 100px;
            font-size: 44px;
            margin-bottom: 20px;
          }
          
          .form-field label {
            font-size: 12px;
          }
          
          .form-field input,
          .form-field textarea {
            font-size: 14px;
            padding: 10px 12px;
          }
          
          .form-value {
            font-size: 14px;
          }
          
          .button-group {
            flex-direction: row;
          }
          
          .button-group button {
            width: auto;
            flex: 1;
            padding: 10px 16px;
            font-size: 13px;
          }
          
          .info-box {
            padding: 12px;
          }
          
          .info-box-label {
            font-size: 10px;
          }
          
          .info-box-value {
            font-size: 13px;
          }
          
          .stats-box {
            padding: 16px;
            margin-bottom: 16px;
          }
          
          .stats-box-label {
            font-size: 11px;
          }
          
          .stats-box-value {
            font-size: 28px;
          }
        }
      `}</style>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }} className="profile-container">
        
        {/* Header */}
        {isLoading ? (
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
              minHeight: '160px'
            }}>
              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
              `}</style>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    height: '32px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    width: '200px'
                  }} />
                  <div style={{
                    height: '14px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.1s',
                    width: '300px'
                  }} />
                </div>
                <div style={{
                  height: '36px',
                  width: '120px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.15s',
                  flexShrink: 0
                }} />
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
        }} className="profile-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: '700',
                margin: '0 0 8px 0'
              }}>
                My Profile
              </h1>
              <p style={{
                fontSize: '14px',
                opacity: 0.9,
                margin: 0
              }}>
                Manage your account settings and information
              </p>
            </div>
            <button
              onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: isEditing ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.15)',
                border: isEditing ? '2px solid rgba(239, 68, 68, 0.5)' : '2px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '8px',
                color: 'white',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isEditing ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.borderColor = isEditing ? 'rgba(239, 68, 68, 0.7)' : 'rgba(255, 255, 255, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isEditing ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.borderColor = isEditing ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.4)';
              }}
            >
              {isEditing ? <X size={16} /> : <Edit2 size={16} />}
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </div>
        )}

        {isLoading ? (
          <SkeletonContainer>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              {/* Profile Card Skeleton */}
              <Card style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>                {/* Avatar Skeleton */}
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '16px',
                  background: 'rgba(200, 200, 200, 0.3)',
                  marginBottom: '20px',
                  animation: 'pulse 2s ease-in-out infinite'
                }} />
                
                {/* Name Skeleton */}
                <div style={{
                  width: '160px',
                  height: '24px',
                  background: 'rgba(200, 200, 200, 0.3)',
                  borderRadius: '6px',
                  marginBottom: '12px',
                  animation: 'pulse 2s ease-in-out infinite 0.1s'
                }} />
                
                {/* Role Skeleton */}
                <div style={{
                  width: '120px',
                  height: '16px',
                  background: 'rgba(200, 200, 200, 0.3)',
                  borderRadius: '6px',
                  marginBottom: '24px',
                  animation: 'pulse 2s ease-in-out infinite 0.2s'
                }} />

                {/* Info Boxes Skeleton */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  width: '100%'
                }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} style={{
                      height: '60px',
                      background: 'rgba(200, 200, 200, 0.3)',
                      borderRadius: '8px',
                      animation: `pulse 2s ease-in-out infinite ${i * 0.1}s`
                    }} />
                  ))}
                </div>
              </Card>

              {/* Details Card Skeleton */}
              <Card style={{ padding: '32px' }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px'
                }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i}>
                      <div style={{
                        height: '14px',
                        width: '100px',
                        background: 'rgba(200, 200, 200, 0.3)',
                        borderRadius: '4px',
                        marginBottom: '8px',
                        animation: `pulse 2s ease-in-out infinite ${i * 0.1}s`
                      }} />
                      <div style={{
                        height: '36px',
                        background: 'rgba(200, 200, 200, 0.3)',
                        borderRadius: '8px',
                        animation: `pulse 2s ease-in-out infinite ${(i * 0.1) + 0.05}s`
                      }} />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </SkeletonContainer>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px'}} className="profile-content">
            
            {/* Profile Card - Minimal */}
            <Card style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }} className="profile-card">
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '44px',
                fontWeight: 'bold',
                color: 'white',
                boxShadow: '0 8px 16px rgba(6, 0, 48, 0.2)',
                marginBottom: '20px'
              }} className="avatar">
                {(formData.name || currentUser?.name || 'U')?.charAt(0).toUpperCase()}
              </div>
              
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1f2937',
                margin: '0 0 8px 0'
              }} className="profile-card">
                {formData.name || currentUser?.name}
              </h2>
              
              <p style={{
                fontSize: '13px',
                color: '#6B7280',
                margin: '0 0 24px 0',
                textTransform: 'capitalize'
              }}>
                {getRoleLabel()}
              </p>

              {(currentUser?.role === 'COACH' || (Array.isArray(profileData?.role) && profileData.role.includes('coach'))) && (
                <div style={{
                  width: '100%',
                  padding: '16px',
                  background: '#F3F4F6',
                  borderRadius: '12px',
                  marginBottom: '16px'
                }} className="stats-box">
                  <p style={{ fontSize: '11px', color: '#6B7280', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: '600' }} className="stats-box-label">Players Assigned</p>
                  <p style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', margin: 0 }} className="stats-box-value">
                    {myplayers}
                  </p>
                </div>
              )}

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                width: '100%'
              }}>
                <div style={{ textAlign: 'left', padding: '12px', background: '#FAFAFA', borderRadius: '8px' }} className="info-box">
                  <p style={{ fontSize: '10px', color: '#6B7280', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: '600' }} className="info-box-label">Email</p>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937', margin: 0, wordBreak: 'break-all' }} className="info-box-value">{profileData?.email || formData.email || 'Not available'}</p>
                </div>
                {profileData?.phone && (
                  <div style={{ textAlign: 'left', padding: '12px', background: '#FAFAFA', borderRadius: '8px' }} className="info-box">
                    <p style={{ fontSize: '10px', color: '#6B7280', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: '600' }} className="info-box-label">Phone</p>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937', margin: 0 }} className="info-box-value">{profileData.phone}</p>
                  </div>
                )}
                <div style={{ textAlign: 'left', padding: '12px', background: '#FAFAFA', borderRadius: '8px' }} className="info-box">
                  <p style={{ fontSize: '10px', color: '#6B7280', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: '600' }} className="info-box-label">Specialization</p>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937', margin: 0 }} className="info-box-value">{profileData?.specialization || formData.specialization || 'Not specified'}</p>
                </div>
                {profileData?.lastLogin && (
                  <div style={{ textAlign: 'left', padding: '12px', background: '#FAFAFA', borderRadius: '8px' }} className="info-box">
                    <p style={{ fontSize: '10px', color: '#6B7280', margin: '0 0 4px 0', textTransform: 'uppercase', fontWeight: '600' }} className="info-box-label">Last Login</p>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937', margin: 0 }} className="info-box-value">{new Date(profileData.lastLogin).toLocaleDateString()} {new Date(profileData.lastLogin).toLocaleTimeString()}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Edit Form - Minimal */}
            <Card style={{ padding: '32px' }} className="profile-card">
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#1f2937',
                margin: '0 0 24px 0'
              }}>
                {isEditing ? 'Edit Profile' : 'Profile Details'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Username */}
                <div className="form-field">
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '6px',
                    textTransform: 'uppercase'
                  }}>
                    Username
                  </label>
                  <p style={{ fontSize: '14px', color: '#1f2937', margin: 0, fontWeight: '600' }} className="form-value">{formData.username}</p>
                </div>

                {/* Name */}
                <div className="form-field">
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '6px',
                    textTransform: 'uppercase'
                  }}>
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1.5px solid #D1D5DB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#8B5CF6'}
                      onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                    />
                  ) : (
                    <p style={{ fontSize: '14px', color: '#1f2937', margin: 0, fontWeight: '600' }}>{formData.name}</p>
                  )}
                </div>

                {/* Email */}
                <div className="form-field">
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '6px',
                    textTransform: 'uppercase'
                  }}>
                    Email Address
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1.5px solid #D1D5DB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#8B5CF6'}
                      onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                    />
                  ) : (
                    <p style={{ fontSize: '14px', color: '#1f2937', margin: 0, fontWeight: '600', wordBreak: 'break-all' }}>{formData.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="form-field">
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '6px',
                    textTransform: 'uppercase'
                  }}>
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1.5px solid #D1D5DB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#8B5CF6'}
                      onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                    />
                  ) : (
                    <p style={{ fontSize: '14px', color: '#1f2937', margin: 0, fontWeight: '600' }}>{formData.phone || 'Not specified'}</p>
                  )}
                </div>

                {/* Address */}
                <div className="form-field">
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '6px',
                    textTransform: 'uppercase'
                  }}>
                    Address
                  </label>
                  {isEditing ? (
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1.5px solid #D1D5DB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box',
                        minHeight: '80px',
                        resize: 'vertical'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#8B5CF6'}
                      onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                    />
                  ) : (
                    <p style={{ fontSize: '14px', color: '#1f2937', margin: 0, fontWeight: '600' }}>{formData.address || 'Not specified'}</p>
                  )}
                </div>

                {/* Specialization */}
                <div className="form-field">
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '6px',
                    textTransform: 'uppercase'
                  }}>
                    Specialization
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.specialization}
                      onChange={(e) => handleInputChange('specialization', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1.5px solid #D1D5DB',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#8B5CF6'}
                      onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                    />
                  ) : (
                    <p style={{ fontSize: '14px', color: '#1f2937', margin: 0, fontWeight: '600' }}>{formData.specialization || 'Not specified'}</p>
                  )}
                </div>

                {/* Action Buttons */}
                {isEditing && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }} className="button-group">
                    <button
                      onClick={handleSave}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        background: 'linear-gradient(135deg, #060030ff 0%, #000000 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <Save size={16} style={{ marginRight: '6px' }} />
                      Save
                    </button>
                    <button
                      onClick={handleCancel}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        background: '#F3F4F6',
                        border: '1.5px solid #D1D5DB',
                        borderRadius: '8px',
                        color: '#374151',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#E5E7EB';
                        e.currentTarget.style.borderColor = '#9CA3AF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#F3F4F6';
                        e.currentTarget.style.borderColor = '#D1D5DB';
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Change Password Section */}
                <div style={{
                  marginTop: '24px',
                  paddingTop: '16px',
                  borderTop: '1px solid #E5E7EB'
                }}>
                  <button
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: '#FEF2F2',
                      border: '1.5px solid #FECACA',
                      borderRadius: '8px',
                      color: '#DC2626',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#FEE2E2';
                      e.currentTarget.style.borderColor = '#FECACA';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#FEF2F2';
                      e.currentTarget.style.borderColor = '#FECACA';
                    }}
                  >
                    {showPasswordForm ? 'Cancel Password Change' : 'Change Password'}
                  </button>

                  {showPasswordForm && (
                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '6px',
                          textTransform: 'uppercase'
                        }}>
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                          placeholder="Enter current password"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1.5px solid #D1D5DB',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            transition: 'all 0.2s',
                            boxSizing: 'border-box'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#DC2626'}
                          onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                        />
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '6px',
                          textTransform: 'uppercase'
                        }}>
                          New Password
                        </label>
                        <input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                          placeholder="Enter new password"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1.5px solid #D1D5DB',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            transition: 'all 0.2s',
                            boxSizing: 'border-box'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#DC2626'}
                          onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                        />
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#374151',
                          marginBottom: '6px',
                          textTransform: 'uppercase'
                        }}>
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                          placeholder="Confirm new password"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1.5px solid #D1D5DB',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            transition: 'all 0.2s',
                            boxSizing: 'border-box'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#DC2626'}
                          onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                        />
                      </div>

                      <button
                        onClick={handleUpdatePassword}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          background: '#DC2626',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#B91C1C'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#DC2626'}
                      >
                        <Shield size={16} style={{ marginRight: '6px' }} />
                        Update Password
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default UserProfile;
