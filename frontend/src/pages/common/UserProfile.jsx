import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/store';
import { Layout } from '../../components/Layout';
import CryptoJS from 'crypto-js';

const CHANGE_PASSWORD_URL = 'https://sn11kysiv0.execute-api.ap-south-1.amazonaws.com/CL_Change_Password';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Edit2,
  Save,
  X,
  Users,
  Award,
  AtSign,
  Lock,
  User
} from 'lucide-react';

const inputBase = {
  width: '100%', padding: '10px 13px', border: '1.5px solid #E2E8F0',
  borderRadius: '9px', fontSize: '13.5px', fontWeight: '500',
  background: '#FAFBFC', color: '#1E293B', boxSizing: 'border-box',
  outline: 'none', fontFamily: 'inherit',
  transition: 'border-color .18s, box-shadow .18s, background .18s',
};
const iFocus = e => { e.target.style.borderColor = '#6366F1'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,.12)'; };
const iBlur  = e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#FAFBFC'; e.target.style.boxShadow = 'none'; };

const Sk = ({ w, h, r = 8, style = {} }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: '#EEF2F7', animation: 'skPulse 1.6s ease-in-out infinite', flexShrink: 0, ...style }} />
);

const UserProfile = () => {
  const { currentUser, fetchUserProfile, userToken } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
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

  const handleUpdatePassword = async () => {
    if (!passwordData.currentPassword) {
      alert('Enter your current password');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    if (passwordData.newPassword === passwordData.currentPassword) {
      alert('New password must be different from the current password');
      return;
    }

    setUpdatingPassword(true);
    try {
      // Hash both with SHA256 before sending - same scheme as login, so the plaintext
      // never leaves the browser and the backend compares/stores only hashes.
      const res = await fetch(CHANGE_PASSWORD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(userToken && { userToken }) },
        body: JSON.stringify({
          currentPassword: CryptoJS.SHA256(passwordData.currentPassword).toString(),
          newPassword: CryptoJS.SHA256(passwordData.newPassword).toString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update password');

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      alert('Password updated successfully');
    } catch (err) {
      alert(err.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (!currentUser) {
    return (
      <Layout>
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ fontSize: '16px', color: '#475569' }}>Please log in to view your profile</p>
        </div>
      </Layout>
    );
  }

  const userRole = currentUser?.role || 'User';
  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'coach' ||
    (Array.isArray(profileData?.role) && profileData.role.includes('coach'));
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

  const cardStyle = {
    background: '#FFFFFF', border: '1.5px solid #E2E8F0',
    borderRadius: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', overflow: 'hidden'
  };
  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };
  const valueStyle = { fontSize: '14px', color: '#0F172A', margin: 0, fontWeight: '600' };

  const infoRows = [
    { icon: Mail, label: 'Email', value: profileData?.email || formData.email || 'Not available', breakAll: true, show: true },
    { icon: Phone, label: 'Phone', value: profileData?.phone, breakAll: false, show: !!profileData?.phone },
    { icon: Award, label: 'Specialization', value: profileData?.specialization || formData.specialization || 'Not specified', breakAll: false, show: true },
    { icon: Calendar, label: 'Last Login', value: profileData?.lastLogin ? `${new Date(profileData.lastLogin).toLocaleDateString()} ${new Date(profileData.lastLogin).toLocaleTimeString()}` : null, breakAll: false, show: !!profileData?.lastLogin }
  ];

  return (
    <Layout>
      <style>{`@keyframes skPulse { 0%,100%{opacity:.5}50%{opacity:1} }`}</style>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 32px' }}>

        {/* ===== Header ===== */}
        {isLoading ? (
          <div style={{
            background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
            borderRadius: '20px', padding: '28px 32px', marginBottom: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
            boxShadow: '0 12px 40px rgba(6,0,48,.3)', flexWrap: 'wrap',
          }}>
            <Sk w="320px" h="104px" r={20} />
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
            borderRadius: '20px', padding: '28px 32px', marginBottom: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
            boxShadow: '0 12px 40px rgba(6,0,48,.3)', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,.12)', border: '1.5px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={24} color="#fff" />
              </div>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: '0 0 3px', letterSpacing: '-.5px' }}>My Profile</h1>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.6)', margin: 0, fontWeight: '500' }}>Manage your account settings and information</p>
              </div>
            </div>
            <button
              onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
                background: isEditing ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.15)',
                border: '1.5px solid rgba(255,255,255,0.35)', borderRadius: '11px',
                color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = isEditing ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.28)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = isEditing ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.15)'; }}
            >
              {isEditing ? <X size={15} /> : <Edit2 size={15} />}
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        )}

        {/* ===== Body ===== */}
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '24px' }}>
            <div style={{ ...cardStyle, padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Sk w="104px" h="104px" r={20} style={{ marginBottom: '20px' }} />
              <Sk w="160px" h="22px" r={6} style={{ marginBottom: '12px' }} />
              <Sk w="120px" h="16px" r={6} style={{ marginBottom: '24px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                {[1, 2, 3].map((i) => (
                  <Sk key={i} w="100%" h="58px" r={12} />
                ))}
              </div>
            </div>
            <div style={{ ...cardStyle, padding: '32px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <Sk w="100px" h="12px" r={4} style={{ marginBottom: '8px' }} />
                  <Sk w="100%" h="40px" r={10} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '24px' }}>

            {/* ===== Left: Identity card ===== */}
            <div style={{ ...cardStyle, overflow: 'visible' }}>
              {/* gradient banner behind avatar */}
              <div style={{ height: '100px', background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)', borderRadius: '16px 16px 0 0', position: 'relative' }} />
              <div style={{ padding: '0 28px 28px', marginTop: '-52px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: '104px', height: '104px', borderRadius: '24px',
                  background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '44px', fontWeight: '800', color: '#fff',
                  boxShadow: '0 10px 24px rgba(6,0,48,0.5)',
                  border: '4px solid #FFFFFF'
                }}>
                  {(formData.name || currentUser?.name || 'U')?.charAt(0).toUpperCase()}
                </div>

                <h2 style={{ fontSize: '23px', fontWeight: '800', color: '#0F172A', margin: '16px 0 8px 0' }}>
                  {formData.name || currentUser?.name}
                </h2>

                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '5px 14px', borderRadius: '20px',
                  background: 'rgba(99,102,241,0.15)', color: '#818CF8',
                  fontSize: '12px', fontWeight: '700', letterSpacing: '0.3px',
                  marginBottom: '20px',
                  border: '1px solid rgba(99,102,241,0.25)'
                }}>
                  <Shield size={13} />
                  {getRoleLabel()}
                </span>

                {isCoach && (
                  <div style={{
                    width: '100%', padding: '18px',
                    background: 'linear-gradient(135deg, rgba(6,0,48,0.05) 0%, rgba(59,0,128,0.08) 100%)',
                    border: '1px solid rgba(6,0,48,0.12)',
                    borderRadius: '14px', marginBottom: '16px',
                    display: 'flex', alignItems: 'center', gap: '14px'
                  }}>
                    <div style={{
                      width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0,
                      background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: '#fff', boxShadow: '0 6px 14px rgba(6,0,48,0.35)'
                    }}>
                      <Users size={22} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: '11px', color: '#94A3B8', margin: '0 0 2px 0', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Players Assigned</p>
                      <p style={{ fontSize: '26px', fontWeight: '800', color: '#0F172A', margin: 0, lineHeight: 1 }}>{myplayers}</p>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                  {infoRows.filter(r => r.show && r.value).map((row, idx) => {
                    const Icon = row.icon;
                    return (
                      <div key={idx} style={{
                        display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left',
                        padding: '12px 14px', background: '#F8FAFC',
                        border: '1px solid #E2E8F0', borderRadius: '12px'
                      }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
                          background: 'rgba(99,102,241,0.12)', color: '#818CF8',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <Icon size={16} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '10px', color: '#94A3B8', margin: '0 0 2px 0', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.4px' }}>{row.label}</p>
                          <p style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', margin: 0, wordBreak: row.breakAll ? 'break-all' : 'normal' }}>{row.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ===== Right: Details / Edit form ===== */}
            <div style={{ ...cardStyle, padding: '32px' }}>
              <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#0F172A', margin: '0 0 4px 0' }}>
                {isEditing ? 'Edit Profile' : 'Profile Details'}
              </h3>
              <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 24px 0' }}>
                {isEditing ? 'Update your personal information below.' : 'Your account information at a glance.'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Username (read-only) */}
                <div>
                  <label style={labelStyle}><AtSign size={11} style={{ verticalAlign: '-1px', marginRight: '4px' }} />Username</label>
                  <p style={valueStyle}>{formData.username}</p>
                </div>

                {/* Name */}
                <div>
                  <label style={labelStyle}>Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      style={inputBase}
                      onFocus={iFocus}
                      onBlur={iBlur}
                    />
                  ) : (
                    <p style={valueStyle}>{formData.name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label style={labelStyle}>Email Address</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      style={inputBase}
                      onFocus={iFocus}
                      onBlur={iBlur}
                    />
                  ) : (
                    <p style={{ ...valueStyle, wordBreak: 'break-all' }}>{formData.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      style={inputBase}
                      onFocus={iFocus}
                      onBlur={iBlur}
                    />
                  ) : (
                    <p style={valueStyle}>{formData.phone || 'Not specified'}</p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label style={labelStyle}><MapPin size={11} style={{ verticalAlign: '-1px', marginRight: '4px' }} />Address</label>
                  {isEditing ? (
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      style={{ ...inputBase, minHeight: '80px', resize: 'vertical' }}
                      onFocus={iFocus}
                      onBlur={iBlur}
                    />
                  ) : (
                    <p style={valueStyle}>{formData.address || 'Not specified'}</p>
                  )}
                </div>

                {/* Specialization */}
                <div>
                  <label style={labelStyle}>Specialization</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.specialization}
                      onChange={(e) => handleInputChange('specialization', e.target.value)}
                      style={inputBase}
                      onFocus={iFocus}
                      onBlur={iBlur}
                    />
                  ) : (
                    <p style={valueStyle}>{formData.specialization || 'Not specified'}</p>
                  )}
                </div>

                {/* Action Buttons */}
                {isEditing && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                    <button
                      onClick={handleSave}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        padding: '12px 16px',
                        background: 'linear-gradient(135deg, #060030 0%, #1a0060 55%, #3b0080 100%)',
                        border: 'none', borderRadius: '10px', color: '#fff', fontWeight: '700', fontSize: '13px',
                        cursor: 'pointer', transition: 'all 0.25s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <Save size={16} />
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancel}
                      style={{
                        flex: 1, padding: '12px 16px', background: '#F8FAFC',
                        border: '1.5px solid #E2E8F0', borderRadius: '10px',
                        color: '#64748B', fontWeight: '700', fontSize: '13px',
                        cursor: 'pointer', transition: 'all 0.25s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#EEF2F7'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Change Password Section */}
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #E2E8F0' }}>
                  <button
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      padding: '11px 16px',
                      background: showPasswordForm ? '#F8FAFC' : 'rgba(239,68,68,0.1)',
                      border: showPasswordForm ? '1.5px solid #E2E8F0' : '1.5px solid rgba(239,68,68,0.1)',
                      borderRadius: '10px',
                      color: showPasswordForm ? '#475569' : '#DC2626',
                      fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.25s ease'
                    }}
                  >
                    <Lock size={15} />
                    {showPasswordForm ? 'Cancel Password Change' : 'Change Password'}
                  </button>

                  {showPasswordForm && (
                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <label style={labelStyle}>Current Password</label>
                        <input
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                          placeholder="Enter current password"
                          style={inputBase}
                          onFocus={iFocus}
                          onBlur={iBlur}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>New Password</label>
                        <input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                          placeholder="Enter new password"
                          style={inputBase}
                          onFocus={iFocus}
                          onBlur={iBlur}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Confirm Password</label>
                        <input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                          placeholder="Confirm new password"
                          style={inputBase}
                          onFocus={iFocus}
                          onBlur={iBlur}
                        />
                      </div>
                      <button
                        onClick={handleUpdatePassword}
                        disabled={updatingPassword}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          padding: '12px 16px', background: '#DC2626', border: 'none',
                          borderRadius: '10px', color: '#fff', fontWeight: '700', fontSize: '13px',
                          cursor: updatingPassword ? 'not-allowed' : 'pointer', opacity: updatingPassword ? 0.7 : 1,
                          transition: 'all 0.25s ease'
                        }}
                        onMouseEnter={(e) => { if (!updatingPassword) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <Shield size={16} />
                        {updatingPassword ? 'Updating…' : 'Update Password'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default UserProfile;
