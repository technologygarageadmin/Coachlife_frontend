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
import { Users, Plus, Search, Edit3, Trash2, BarChart3, Award, TrendingUp, BookOpen, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import axios from 'axios';
import CryptoJS from 'crypto-js';

const COACH_API_URL = 'https://4w5wn37653.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_Adding_Coaches';

const Coaches = () => {
  const { coaches, fetchCoaches, coachesLoading, deleteCoachRemote, userToken, clearCoachesCache } = useStore();
  const { updateCoachRemote } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editingCoachId, setEditingCoachId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    specialization: '',
    role: [],
    PlayersList: [],
    sessions: 0,
  });
  const initialFetchRef = useRef(false);

  // Fetch coaches when component mounts
  useEffect(() => {
    if (initialFetchRef.current) return;
    initialFetchRef.current = true;

    let mounted = true;
    const load = async () => {
      setApiError('');
      try {
        const res = await fetchCoaches();
        if (!res.success && mounted) {
          setApiError(res.error || 'Unable to load coaches');
        }
      } catch (err) {
        if (mounted) setApiError(err.message || 'Unable to load coaches');
      }
    };
    load();
    return () => { mounted = false; };
  }, [fetchCoaches]);

  const filteredCoaches = coaches
    .filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.specialization.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .map(c => {
      const normalizedRole = Array.isArray(c.role) ? c.role : (c.role ? [c.role] : []);
      return {
        _id: c._id,
        coachId: c._id,
        name: c.name,
        email: c.email,
        username: c.username,
        specialization: c.specialization,
        role: normalizedRole,
        assignedPlayers: c.PlayersList || [],
        totalSessions: c.sessions || 0,
        lastLogin: c.lastLogin,
        PlayersList: c.PlayersList || [],
        createdBy: c.createdBy,
        registrationTime: c.registrationTime,
        userToken: c.userToken
      };
    });

  const stats = {
    total: coaches.length,
    totalPlayers: coaches.reduce((sum, c) => sum + (c.PlayersList?.length || 0), 0),
    avgplayersPerCoach: coaches.length > 0 ? Math.round(coaches.reduce((sum, c) => sum + (c.PlayersList?.length || 0), 0) / coaches.length) : 0,
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const hashPassword = (password) => {
    return CryptoJS.SHA256(password).toString();
  };

  const handleAddCoach = async () => {
    setLoading(true);
    setApiError('');
    setApiSuccess('');

    try {
      if (isEditing) {
        // For edit: only require name (others optional). Send password only if provided.
        if (!formData.name || !formData.name.trim()) {
          setApiError('Coach name is required');
          setLoading(false);
          return;
        }
        if (formData.email && !validateEmail(formData.email)) {
          setApiError('Enter a valid email address');
          setLoading(false);
          return;
        }
        if (!formData.role || formData.role.length === 0) {
          setApiError('Select at least one role');
          setLoading(false);
          return;
        }
        if (formData.password && formData.password.length < 6) {
          setApiError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        const updatePayload = {
          coachId: editingCoachId || formData.coachId,
          name: formData.name,
          specialization: formData.specialization || '',
          username: formData.username || '',
          email: formData.email || '',
          role: formData.role.length > 0 ? formData.role : ['coach'],
        };

        if (formData.password) {
          updatePayload.password = hashPassword(formData.password);
        }

        console.log('=== EDIT COACH DEBUG ===');
        console.log('Edit Coach Payload:', updatePayload);
        console.log('Payload Fields Check:', {
          hasName: !!updatePayload.name,
          hasUsername: !!updatePayload.username,
          hasPassword: !!updatePayload.password,
          hasEmail: !!updatePayload.email,
          hasSpecialization: !!updatePayload.specialization,
          specializationValue: updatePayload.specialization,
          hasRole: !!updatePayload.role,
          hasPlayersList: Array.isArray(updatePayload.PlayersList),
          hasSessions: typeof updatePayload.sessions === 'number'
        });
        console.log('Coach ID:', editingCoachId || formData.coachId);
        console.log('=== END EDIT COACH DEBUG ===');

        const res = await updateCoachRemote(editingCoachId || formData.coachId, updatePayload);
        console.log('Edit Coach Response:', res);
        console.log('=== FULL EDIT RESPONSE DEBUG ===');
        console.log('Response Success:', res.success);
        console.log('Response Error:', res.error);
        console.log('Updated Coach Data:', res.data || res.coach || res);
        console.log('=== END FULL EDIT RESPONSE DEBUG ===');
        if (res.success) {
          console.log('=== REFETCHING COACHES DATA ===');
          console.log('Initiating fetchCoaches after edit...');
          console.log('Edited Coach ID:', editingCoachId || formData.coachId);
          console.log('Edited Coach Name:', formData.name);
          console.log('Edited Coach Specialization:', formData.specialization);
          
          // Clear cache to force fresh API call
          console.log('📌 Clearing coaches cache...');
          clearCoachesCache();
          
          // Retry logic with delay to handle potential database write delays
          let refetchResult = null;
          let editedCoachInList = null;
          let retryCount = 0;
          const maxRetries = 3;
          const retryDelay = 1000; // 1 second
          
          try {
            while (retryCount < maxRetries && !editedCoachInList) {
              if (retryCount > 0) {
                console.log(`Retry attempt ${retryCount}/${maxRetries} after ${retryDelay}ms delay...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
              } else {
                console.log('🔄 Making fresh API call to fetchCoaches...');
              }
              
              refetchResult = await fetchCoaches();
              const coachesList = refetchResult?.coaches || refetchResult || [];
              console.log(`Refetch Attempt ${retryCount + 1} - Result Count:`, Array.isArray(coachesList) ? coachesList.length : 0);
              console.log('Refetch Result:', { success: refetchResult?.success, count: Array.isArray(coachesList) ? coachesList.length : 0 });
              
              // Check if edited coach is in the list with updated data
              editedCoachInList = Array.isArray(coachesList) ? coachesList.find(c => c._id === (editingCoachId || formData.coachId)) : null;
              
              if (editedCoachInList) {
                console.log('✅ Edited Coach Found in List: YES (after', retryCount, 'retries)');
                console.log('Updated Coach Details:', {
                  name: editedCoachInList.name,
                  email: editedCoachInList.email,
                  specialization: editedCoachInList.specialization,
                  username: editedCoachInList.username,
                  role: editedCoachInList.role,
                  _id: editedCoachInList._id
                });
                console.log('Specialization Match:', editedCoachInList.specialization === formData.specialization ? 'YES ✅' : 'NO ⚠️');
              }
              
              retryCount++;
            }
            
            if (!editedCoachInList && retryCount >= maxRetries) {
              console.warn('⚠️ WARNING: Edited coach NOT found after', maxRetries, 'attempts!');
              console.log('⚠️ This may indicate a backend/database issue');
              console.log('ℹ️ Coach may appear after manual page refresh');
            }
            
            console.log('Coaches data refreshed successfully');
          } catch (refetchErr) {
            console.error('Error during refetch:', refetchErr);
          }
          console.log('=== END REFETCH ===');
          setTimeout(() => {
            setIsModalOpen(false);
            setApiSuccess('');
            setIsEditing(false);
            setEditingCoachId(null);
            // Show toast notification AFTER modal closes
            setToastMessage('Coach updated successfully');
          }, 4000);
        } else {
          setApiError(res.error || 'Failed to update coach');
        }

      } else {
        // For add: require all fields
        if (!formData.name || !formData.name.trim()) {
          setApiError('Coach name is required');
          setLoading(false);
          return;
        }
        if (!formData.username || !formData.username.trim()) {
          setApiError('Username is required');
          setLoading(false);
          return;
        }
        if (!formData.email || !formData.email.trim()) {
          setApiError('Email is required');
          setLoading(false);
          return;
        }
        if (!validateEmail(formData.email)) {
          setApiError('Enter a valid email address');
          setLoading(false);
          return;
        }
        if (!formData.password) {
          setApiError('Password is required');
          setLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          setApiError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        if (!formData.specialization || !formData.specialization.trim()) {
          setApiError('Specialization is required');
          setLoading(false);
          return;
        }
        if (!formData.role || formData.role.length === 0) {
          setApiError('Select at least one role');
          setLoading(false);
          return;
        }

        const hashedPassword = hashPassword(formData.password);

        const payload = {
          name: formData.name,
          username: formData.username,
          password: hashedPassword,
          email: formData.email,
          specialization: formData.specialization,
          role: formData.role.length > 0 ? formData.role : ['coach'],
        };

        console.log('=== ADD COACH DEBUG ===');
        console.log('Add Coach Payload:', payload);
        console.log('Payload Fields Check:', {
          hasName: !!payload.name,
          hasUsername: !!payload.username,
          hasPassword: !!payload.password,
          hasEmail: !!payload.email,
          hasSpecialization: !!payload.specialization,
          specializationValue: payload.specialization,
          hasRole: !!payload.role,
          hasPlayersList: Array.isArray(payload.PlayersList),
          hasSessions: typeof payload.sessions === 'number'
        });
        console.log('API URL:', COACH_API_URL);
        console.log('=== END ADD COACH DEBUG ===');

        const response = await axios.post(COACH_API_URL, payload, {
          headers: {
            'Content-Type': 'application/json',
            ...(userToken && { 'usertoken': userToken })
          }
        });

        console.log('Add Coach API Response:', {
          status: response.status,
          statusCode: response.data?.statusCode,
          data: response.data
        });

        console.log('=== FULL API RESPONSE DEBUG ===');
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));
        console.log('Saved Coach Object:', response.data?.data || response.data?.coach || response.data);
        console.log('=== END FULL API RESPONSE DEBUG ===');

        if (response.data && (response.data.statusCode === 200 || response.data.statusCode === 201 || response.status === 200 || response.status === 201)) {
          console.log('=== REFETCHING COACHES DATA ===');
          console.log('Initiating fetchCoaches after add...');
          console.log('Added Coach Name:', formData.name);
          console.log('Added Coach Email:', formData.email);
          
          // Clear cache to force fresh API call
          console.log('📌 Clearing coaches cache...');
          clearCoachesCache();
          
          // Retry logic with delay to handle potential database write delays
          let refetchResult = null;
          let newCoachInList = null;
          let retryCount = 0;
          const maxRetries = 3;
          const retryDelay = 1000; // 1 second
          
          try {
            while (retryCount < maxRetries && !newCoachInList) {
              if (retryCount > 0) {
                console.log(`Retry attempt ${retryCount}/${maxRetries} after ${retryDelay}ms delay...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
              } else {
                console.log('🔄 Making fresh API call to fetchCoaches...');
              }
              
              refetchResult = await fetchCoaches();
              const coachesList = refetchResult?.coaches || refetchResult || [];
              console.log(`Refetch Attempt ${retryCount + 1} - Result Count:`, Array.isArray(coachesList) ? coachesList.length : 0);
              console.log('Refetch Result:', { success: refetchResult?.success, count: Array.isArray(coachesList) ? coachesList.length : 0 });
              
              // Check if newly added coach is in the list
              newCoachInList = Array.isArray(coachesList) ? coachesList.find(c => c.name === formData.name && c.email === formData.email) : null;
              
              if (newCoachInList) {
                console.log('✅ Newly Added Coach Found in List: YES (after', retryCount, 'retries)');
                console.log('New Coach Details:', {
                  name: newCoachInList.name,
                  email: newCoachInList.email,
                  specialization: newCoachInList.specialization,
                  username: newCoachInList.username,
                  role: newCoachInList.role,
                  _id: newCoachInList._id
                });
              }
              
              retryCount++;
            }
            
            if (!newCoachInList && retryCount >= maxRetries) {
              console.warn('⚠️ WARNING: Newly added coach NOT found after', maxRetries, 'attempts!');
              const coachesList = refetchResult?.coaches || refetchResult || [];
              console.log('⚠️ This may indicate a backend/database issue');
              console.log('Coaches currently in list:', Array.isArray(coachesList) ? coachesList.map(c => ({ name: c.name, email: c.email })) : coachesList);
              console.log('ℹ️ Coach may appear after manual page refresh');
            }
            
            console.log('Coaches data refreshed successfully');
          } catch (refetchErr) {
            console.error('Error during refetch:', refetchErr);
          }
          console.log('=== END REFETCH ===');

          // Reset form
          setFormData({
            name: '',
            username: '',
            email: '',
            password: '',
            specialization: '',
            role: [],
            PlayersList: [],
            sessions: 0,
          });

          setTimeout(() => {
            setIsModalOpen(false);
            setApiSuccess('');
            // Show toast notification AFTER modal closes
            setToastMessage('Coach added successfully');
          }, 4000);
        } else {
          setApiError(response.data?.message || 'Failed to add coach');
        }
      }
    } catch (err) {
      console.error('Error adding/updating coach:', err);
      console.error('Error Details:', {
        message: err.message,
        status: err.response?.status,
        statusCode: err.response?.data?.statusCode,
        errorData: err.response?.data,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          data: err.config?.data
        }
      });
      setApiError(err.response?.data?.message || err.message || 'An error occurred while processing the request');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { 
      key: 'name', 
      label: 'Name',
      render: (value) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            {value.charAt(0)}
          </div>
          <span style={{ fontWeight: '500', color: '#111827' }}>{value}</span>
        </div>
      )
    },
    { 
      key: 'email', 
      label: 'Email',
      render: (value) => <span style={{ fontSize: '13px', color: '#666' }}>{value}</span>
    },
    {
      key: 'username',
      label: 'Username',
      render: (value) => <span style={{ fontSize: '13px', color: '#666', fontWeight: '600' }}>{value}</span>
    },
    {
      key: 'specialization', 
      label: 'Specialization',
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
          {value}
        </span>
      )
    },
    {
      key: 'role',
      label: 'Role',
      render: (value) => {
        const roles = Array.isArray(value) ? value : [];
        return (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {roles.map((r) => (
              <span
                key={r}
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  backgroundColor: r === 'admin' ? '#FEE2E2' : '#DBEAFE',
                  color: r === 'admin' ? '#991B1B' : '#0369A1',
                  borderRadius: '4px',
                  fontWeight: '600',
                  fontSize: '11px',
                  textTransform: 'capitalize'
                }}
              >
                {r}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      key: 'assignedPlayers',
      label: 'Players',
      render: (value) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={16} color="#060030ff" />
          <span style={{ fontWeight: '700', color: '#060030ff', fontSize: '14px' }}>{Array.isArray(value) ? value.length : 0}</span>
        </div>
      ),
    },
    {
      key: 'lastLogin',
      label: 'Last Login',
      render: (value) => (
        <span style={{ fontSize: '13px', color: '#666' }}>
          {value ? new Date(value).toLocaleDateString() : '-'}
        </span>
      ),
    },
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
            .coaches-header {
              padding: 20px 12px !important;
              marginBottom: 16px !important;
            }
            .coaches-title {
              fontSize: 20px !important;
            }
            .coaches-subtitle {
              fontSize: 11px !important;
            }
            .coaches-stats {
              gridTemplateColumns: 1fr 1fr !important;
              gap: 10px !important;
            }
            .coaches-stat-box {
              padding: 8px 10px !important;
            }
            .coaches-stat-label {
              fontSize: 9px !important;
            }
            .coaches-stat-value {
              fontSize: 16px !important;
            }
            .coaches-main-content {
              padding: 0 12px !important;
            }
            .coaches-filters {
              display: flex !important;
              flexDirection: column !important;
              gap: 10px !important;
              marginBottom: 16px !important;
              width: 100% !important;
            }
            .coaches-search-box {
              width: 100% !important;
            }
            .coaches-search-box input {
              fontSize: 12px !important;
              padding: 9px 10px !important;
            }
            .coaches-filter-btn {
              width: 100% !important;
              padding: 9px 12px !important;
              fontSize: 12px !important;
            }
          }
          @media (max-width: 767px) {
            .coaches-header {
              padding: 24px 16px !important;
              marginBottom: 20px !important;
            }
            .coaches-title {
              fontSize: 24px !important;
            }
            .coaches-subtitle {
              fontSize: 12px !important;
            }
            .coaches-stats {
              gridTemplateColumns: 1fr 1fr !important;
              gap: 12px !important;
            }
            .coaches-stat-box {
              padding: 10px 12px !important;
            }
            .coaches-stat-label {
              fontSize: 10px !important;
            }
            .coaches-stat-value {
              fontSize: 18px !important;
            }
            .coaches-main-content {
              padding: 0 16px !important;
            }
            .coaches-filters {
              display: flex !important;
              flexDirection: column !important;
              gap: 10px !important;
              marginBottom: 20px !important;
              width: 100% !important;
            }
            .coaches-search-box {
              width: 100% !important;
            }
            .coaches-search-box input {
              fontSize: 13px !important;
              padding: 10px 12px !important;
            }
            .coaches-filter-btn {
              width: 100% !important;
              justify-content: center !important;
              padding: 10px 14px !important;
              fontSize: 13px !important;
              gap: 6px !important;
            }
            .coaches-filter-btn svg {
              width: 16px !important;
              height: 16px !important;
            }
          }
          @media (min-width: 768px) and (max-width: 1024px) {
            .coaches-header {
              padding: 32px 24px !important;
            }
            .coaches-title {
              fontSize: 28px !important;
            }
            .coaches-stats {
              gridTemplateColumns: repeat(2, 1fr) !important;
              gap: 14px !important;
            }
            .coaches-filters {
              gridTemplateColumns: 1fr auto !important;
              gap: 10px !important;
              marginBottom: 20px !important;
            }
            .coaches-search-box {
              width: 100% !important;
            }
            .coaches-filter-btn {
              padding: 9px 12px !important;
              font-size: 12px !important;
            }
            .coaches-main-content {
              padding: 0 24px !important;
            }
          }
        `}</style>
        {/* Enhanced Header */}
        {coachesLoading ? (
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
              <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
                <div style={{
                  height: '32px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  width: '250px'
                }} />
                <div style={{
                  height: '14px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  marginBottom: '24px',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.1s',
                  width: '400px'
                }} />
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{
                      height: '80px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite ${i * 0.08}s`,
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
        }}
        className="coaches-header"
        data-aos="fade-up"
        data-aos-duration="800">
          <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: '0 0 8px 0' }} className="coaches-title">Coaches Management</h1>
            <p style={{ fontSize: '14px', opacity: 0.95, margin: 0 }} className="coaches-subtitle">Manage {stats.total} coach{stats.total !== 1 ? 'es' : ''}, monitor performance, and track players</p>
            
            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '24px' }} className="coaches-stats">
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '12px 16px',
                borderRadius: '6px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }} className="coaches-stat-box">
                <p style={{ fontSize: '12px', opacity: 0.9, margin: '0 0 4px 0' }} className="coaches-stat-label">Total Coaches</p>
                <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }} className="coaches-stat-value">{stats.total}</p>
              </div>
              
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '12px 16px',
                borderRadius: '6px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }} className="coaches-stat-box">
                <p style={{ fontSize: '12px', opacity: 0.9, margin: '0 0 4px 0' }} className="coaches-stat-label">Total Players</p>
                <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }} className="coaches-stat-value">{stats.totalPlayers}</p>
              </div>
              
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '12px 16px',
                borderRadius: '6px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }} className="coaches-stat-box">
                <p style={{ fontSize: '12px', opacity: 0.9, margin: '0 0 4px 0' }} className="coaches-stat-label">Avg Players/Coach</p>
                <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }} className="coaches-stat-value">{stats.avgplayersPerCoach}</p>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Search & Filter Section */}
        <div style={{
          padding: '0 32px',
          maxWidth: '1400px',
          margin: '0 auto'
        }} className="coaches-main-content">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '12px',
            marginBottom: '24px',
            backgroundColor: 'white',
            padding: '10px 14px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            alignItems: 'center',
            width: '100%'
          }} className="coaches-filters">
            <div style={{
              borderRadius: '12px',
              padding: '10px 14px',
              
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.3s'
            }}
            className="coaches-search-box"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#060030ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}>
              <Search size={18} color="#060030ff" />
              <input
                type="text"
                placeholder="Search by name, email, or specialization..."
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
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E2E8F0';
                  e.target.style.boxShadow = 'none';
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
                  {filteredCoaches.length}
                </span>
              )}
            </div>
          
          <button
            onClick={() => {
              setIsEditing(false);
              setEditingCoachId(null);
              setFormData({
                coachId: null,
                name: '',
                username: '',
                email: '',
                password: '',
                specialization: '',
                role: [],
                PlayersList: [],
                sessions: 0,
              });
              setApiError('');
              setApiSuccess('');
              setIsModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
              color: 'white',
              border: '2px solid #060030ff',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 4px 12px rgba(6, 0, 48, 0.2)',
              whiteSpace: 'nowrap'
            }}
            className="coaches-filter-btn"
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 0, 48, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 0, 48, 0.2)';
            }}
          >
            <Plus size={18} /> Add Coach
          </button>
          </div>

          {/* Results Summary */}
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#666', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '500' }}>Showing</span>
            <span style={{ fontWeight: '600', color: '#111827' }}>{filteredCoaches.length}</span>
            <span>of</span>
            <span style={{ fontWeight: '600', color: '#111827' }}>{coaches.length}</span>
            <span>coaches</span>
          </div>

          {/* Table Card */}
        {coachesLoading ? (
          <SkeletonContainer>
            <Card className="card-elevated" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '20px' }}>
                {/* Header Skeleton */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
                  gap: '16px',
                  marginBottom: '20px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} style={{
                      height: '20px',
                      background: '#f0f0f0',
                      borderRadius: '6px',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                      animationDelay: `${i * 0.1}s`
                    }} />
                  ))}
                </div>
                {/* Row Skeletons */}
                {[1, 2, 3, 4, 5].map((row) => (
                  <div key={row} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
                    gap: '16px',
                    marginBottom: '16px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #f0f0f0'
                  }}>
                    {[1, 2, 3, 4, 5, 6].map((col) => (
                      <div key={col} style={{
                        height: '16px',
                        background: '#f5f5f5',
                        borderRadius: '4px',
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        animationDelay: `${(row + col) * 0.05}s`
                      }} />
                    ))}
                  </div>
                ))}
              </div>
            </Card>
            <style>{`
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
              }
            `}</style>
          </SkeletonContainer>
        ) : (
          <Card className="card-elevated" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
            {filteredCoaches.length > 0 ? (
              <Table
                columns={columns}
                data={filteredCoaches}
                actions={(row) => (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setEditingCoachId(row.coachId);
                        const normalizedRole = Array.isArray(row.role) ? row.role : (row.role ? [row.role] : []);
                        setFormData({
                          coachId: row.coachId,
                          name: row.name || '',
                          username: row.username || '',
                          email: row.email || '',
                          password: '',
                          specialization: row.specialization || '',
                          role: normalizedRole,
                          PlayersList: row.assignedPlayers || [],
                          sessions: row.totalSessions || 0,
                        });
                        setApiError('');
                        setApiSuccess('');
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
                      onClick={() => setDeleteConfirm(row.coachId)}
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
                <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>No coaches found</p>
                <p style={{ fontSize: '13px', color: '#bbb' }}>
                  {searchTerm ? 'Try adjusting your search criteria' : 'Start by adding your first coach'}
                </p>
              </div>
            )}
          </Card>
        )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <Modal
            isOpen={!!deleteConfirm}
            onClose={() => setDeleteConfirm(null)}
            title="Delete Coach"
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
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>Delete this coach?</h3>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
                This action cannot be undone. The coach and all associated data will be permanently deleted.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontWeight: '500',
                    backgroundColor: '#f3f4f6',
                    color: '#111827',
                    border: '1px solid #e5e7eb',
                    cursor: deleteLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      setDeleteLoading(true);
                      setDeleteSuccess(false);

                      const res = await deleteCoachRemote(deleteConfirm);

                      if (res.success) {
                        setToastMessage('Coach deleted successfully');
                        await fetchCoaches();
                        setDeleteSuccess(true);
                        await new Promise((r) => setTimeout(r, 800));
                        setDeleteConfirm(null);
                        setDeleteSuccess(false);
                      } else {
                        setApiError(res.error || 'Failed to delete coach');
                      }
                    } catch (err) {
                      console.error('Delete coach error:', err);
                      setApiError(err.message || 'Delete failed');
                    } finally {
                      setDeleteLoading(false);
                    }
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontWeight: '500',
                    backgroundColor: deleteSuccess ? '#10B981' : '#EF4444',
                    color: 'white',
                    border: 'none',
                    cursor: deleteLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <>
                      <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Deleting...</span>
                    </>
                  ) : deleteSuccess ? (
                    <>
                      <CheckCircle size={14} />
                      <span>Deleted</span>
                    </>
                  ) : (
                    <span>Delete Permanently</span>
                  )}
                </button>
              </div>
            </div>
          </Modal>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setApiError('');
            setApiSuccess('');
            setIsEditing(false);
            setEditingCoachId(null);
          }}
          title={isEditing ? 'Edit Coach' : 'Add New Coach'}
        >
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 32px 32px 32px' }} className="modal-body">
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
            `}</style>
            {/* Form Header */}
            <div style={{ marginBottom: '28px', borderBottom: '2px solid #f3f4f6', paddingBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 6px 0' }}>Coach Details</h3>
              <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                All fields are required.
              </p>
            </div>

            {/* Error Message */}
            {apiError && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                background: '#FEF2F2',
                border: '2px solid #FECACA',
                color: '#991B1B',
                padding: '14px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '24px',
                animation: 'slideIn 0.3s ease'
              }}>
                <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p style={{ fontWeight: '600', margin: '0 0 4px 0' }}>Error</p>
                  <p style={{ margin: 0 }}>{apiError}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {apiSuccess && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                background: '#F0FDF4',
                border: '2px solid #86EFAC',
                color: '#166534',
                padding: '14px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '24px',
                animation: 'slideIn 0.3s ease'
              }}>
                <CheckCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p style={{ fontWeight: '600', margin: '0 0 4px 0' }}>Success</p>
                  <p style={{ margin: 0 }}>{apiSuccess}</p>
                </div>
              </div>
            )}

            {/* Form Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              {/* Name Field */}
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
                  Full Name
                  <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

              {/* Username Field */}
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
                  Username
                  <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Name-TG"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
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

              {/* Email Field */}
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
                  Email Address
                  <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                </label>
                <input
                  type="email"
                  placeholder="name@technology-garage.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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

              {/* Password Field */}
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
                  Password
                  <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

              {/* Specialization Field */}
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
                  Specialization
                  <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Python & Web Development, Data Science & ML"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
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

              {/* Role Selection - Modern Toggle Style */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '700', 
                  color: '#111827', 
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Select Role
                  <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {['coach', 'admin'].map((roleOption) => {
                    const roles = formData.role || [];
                    const isSelected = roles.includes(roleOption);
                    return (
                    <button
                      key={roleOption}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setFormData({
                            ...formData,
                            role: roles.filter(r => r !== roleOption)
                          });
                        } else {
                          setFormData({
                            ...formData,
                            role: [...roles, roleOption]
                          });
                        }
                      }}
                      disabled={loading}
                      style={{
                        padding: '12px 30px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        textTransform: 'capitalize',
                        borderColor: isSelected ? '2px solid #fff' : '2px solid #060030ff',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        backgroundColor: isSelected ? '#060030ff' : '#F3F4F6',
                        color: isSelected ? '#FFFFFF' : '#060030ff',
                        boxShadow: isSelected ? '0 4px 12px rgba(6, 0, 48, 0.25)' : 'none',
                        transform: isSelected ? 'scale(1)' : 'scale(1)',
                        opacity: loading ? 0.6 : 1,
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          if (isSelected) {
                            e.currentTarget.style.backgroundColor = '#0a0040';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(6, 0, 48, 0.35)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          } else {
                            e.currentTarget.style.backgroundColor = '#E5E7EB';
                          }
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) {
                          if (isSelected) {
                            e.currentTarget.style.backgroundColor = '#060030ff';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 0, 48, 0.25)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          } else {
                            e.currentTarget.style.backgroundColor = '#F3F4F6';
                          }
                        }
                      }}
                    >
                      {/* {isSelected && (
                        <span style={{ marginRight: '6px', fontSize: '16px' }}>✓</span>
                      )} */}
                      {roleOption}
                    </button>
                    );
                  })}
                </div>

                {/* Role Selection Error Message */}
                {(!formData.role || formData.role.length === 0) && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '12px',
                    color: '#EF4444',
                    fontSize: '13px',
                    fontWeight: '500',
                    animation: 'slideIn 0.3s ease'
                  }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>Select at least one role</span>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: '#f3f4f6', margin: '24px 0' }}></div>

            {/* Form Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setIsEditing(false);
                  setEditingCoachId(null);
                  setFormData({
                    name: '',
                    username: '',
                    email: '',
                    password: '',
                    specialization: '',
                    role: [],
                    PlayersList: [],
                    sessions: 0,
                  });
                  setApiError('');
                  setApiSuccess('');
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
                onClick={handleAddCoach}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  background: 'linear-gradient(135deg, #060030ff 0%, #000000ff 100%)',
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
                  boxShadow: '0 4px 12px rgba(6, 0, 48, 0.15)'
                }}
                onMouseEnter={(e) => !loading && (e.target.style.boxShadow = '0 6px 20px rgba(6, 0, 48, 0.25)')}
                onMouseLeave={(e) => !loading && (e.target.style.boxShadow = '0 4px 12px rgba(6, 0, 48, 0.15)')}
                disabled={loading}
              >
                {loading && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                <span>{loading ? (isEditing ? 'Updating Coach...' : 'Creating Coach...') : (isEditing ? 'Update Coach' : 'Create Coach')}</span>
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
    </Layout>
  );
};

export default Coaches;


