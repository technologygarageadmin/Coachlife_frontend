import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/store';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { UserPlus, Lock, Mail, AlertCircle, CheckCircle, ArrowLeft, Zap } from 'lucide-react';
import axios from 'axios';
import CryptoJS from 'crypto-js';

const API_URL = 'https://tbfwx7oig0.execute-api.ap-south-1.amazonaws.com/coachlife-com/CL_User_Registartion';

export const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    specialization: '',
    role: 'coach',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { addCoach } = useStore();
  const navigate = useNavigate();

  const hashPassword = (password) => {
    return CryptoJS.SHA256(password).toString();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (!formData.specialization.trim()) {
      setError('Specialization is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const hashedPassword = hashPassword(formData.password);
      
      const payload = {
        name: formData.name,
        username: formData.username,
        password: hashedPassword,
        email: formData.email,
        specialization: formData.specialization,
        role: formData.role
      };

      const response = await axios.post(API_URL, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && (response.data.statusCode === 200 || response.data.statusCode === 201 || response.status === 200 || response.status === 201)) {
        setSuccess(response.data?.message || 'Registration successful! Redirecting to login...');
        
        // Also add to local store
        addCoach({
          name: formData.name,
          email: formData.email,
          specialization: formData.specialization,
          assignedPlayers: [],
          totalSessions: 0,
          joinDate: new Date().toISOString().split('T')[0]
        });

        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(response.data?.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'An error occurred during registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-wrapper">
      <style>{`
        .register-wrapper {
          min-height: 100vh;
          display: flex;
          background: #f8f9fa;
          position: relative;
        }

        .back-to-login-btn {
          position: absolute;
          top: 20px;
          left: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          color: #252c35;
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: 100;
        }

        .back-to-login-btn:hover {
          background: #252c35;
          color: white;
          box-shadow: 0 2px 8px rgba(37, 44, 53, 0.2);
        }

        .register-left {
          flex: 1;
          background: linear-gradient(135deg, #060030ff 0%, #000000ff 100%);
          color: white;
          padding: 60px 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .register-left-content {
          max-width: 450px;
        }

        .register-logo-large {
          font-size: 48px;
          margin-bottom: 20px;
          opacity: 0.95;
        }

        .register-left-title {
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }

        .register-left-text {
          font-size: 14px;
          opacity: 0.9;
          line-height: 1.6;
          margin-bottom: 32px;
        }

        .register-features {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .register-feature-item {
          display: flex;
          gap: 12px;
        }

        .register-feature-icon {
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .register-feature-item h4 {
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 4px 0;
        }

        .register-feature-item p {
          font-size: 12px;
          opacity: 0.85;
          margin: 0;
        }

        .register-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .register-form-container {
          width: 100%;
          max-width: 400px;
          background: white;
          padding: 32px;
          border-radius: 8px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          border: 1px solid #e5e7eb;
        }

        .register-form-header h2 {
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 6px;
          color: #1f2937;
        }

        .register-form-header p {
          font-size: 13px;
          color: #6b7280;
          margin: 0 0 24px 0;
        }

        .register-error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #991b1b;
          padding: 12px 14px;
          border-radius: 6px;
          font-size: 13px;
          margin-bottom: 20px;
        }

        .register-success-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #dcfce7;
          border: 1px solid #86efac;
          color: #166534;
          padding: 12px 14px;
          border-radius: 6px;
          font-size: 13px;
          margin-bottom: 20px;
        }

        .register-form-main {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 20px;
        }

        .register-submit-btn {
          background: linear-gradient(135deg, #060030ff 0%, #000000ff 100%) !important;
          color: white !important;
          border: none !important;
          padding: 12px !important;
          font-weight: 700 !important;
          border-radius: 6px !important;
          font-size: 14px !important;
        }

        .register-submit-btn:hover {
          box-shadow: 0 4px 12px rgba(37, 44, 53, 0.3);
        }

        .register-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .register-signin-link {
          text-align: center;
          font-size: 13px;
          color: #6b7280;
        }

        .register-signin-link a {
          color: #060030ff;
          text-decoration: none;
          font-weight: 700;
          cursor: pointer;
        }

        .register-signin-link a:hover {
          text-decoration: underline;
        }

        @media (max-width: 1024px) {
          .register-wrapper {
            flex-direction: column;
          }

          .register-left {
            padding: 40px 20px;
            min-height: 300px;
          }

          .register-right {
            padding: 40px 20px;
          }

          .register-form-container {
            max-width: 100%;
          }
        }

        @media (max-width: 640px) {
          .register-left {
            padding: 30px 20px;
          }

          .register-form-container {
            padding: 24px;
          }

          .register-left-title {
            font-size: 24px;
          }

          .register-left-text {
            font-size: 13px;
            margin-bottom: 24px;
          }
        }
      `}</style>

      <button 
        className="back-to-login-btn"
        onClick={() => navigate('/login')}
        title="Back to login"
      >
        <ArrowLeft size={16} /> Back to Login
      </button>

      <div className="register-left">
        <div className="register-left-content" data-aos="fade-up" data-aos-duration="800">
          <div className="register-logo-large">
            <UserPlus size={48} />
          </div>
          <h1 className="register-left-title">Join Our Team</h1>
          <p className="register-left-text">Register as a coach and start managing your players effectively with CoachLife</p>
          
          <div className="register-features">
            <div className="register-feature-item">
              <div className="register-feature-icon">
                <Zap size={24} />
              </div>
              <div>
                <h4>Quick Setup</h4>
                <p>Get started in minutes</p>
              </div>
            </div>
            <div className="register-feature-item">
              <div className="register-feature-icon">
                <Mail size={24} />
              </div>
              <div>
                <h4>Secure Account</h4>
                <p>Your data is protected</p>
              </div>
            </div>
            <div className="register-feature-item">
              <div className="register-feature-icon">
                <UserPlus size={24} />
              </div>
              <div>
                <h4>Manage Players</h4>
                <p>Build and coach your team</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="register-right">
        <div className="register-form-container" data-aos="fade-up" data-aos-delay="100" data-aos-duration="800">
          <div className="register-form-header">
            <h2>Create Account</h2>
            <p>Register as a new coach</p>
          </div>

          {error && (
            <div className="register-error-banner">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="register-success-banner">
              <CheckCircle size={18} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="register-form-main">
            <Input
              label="Full Name"
              placeholder="Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              icon={<UserPlus size={18} />}
            />
            <Input
              label="Username"
              placeholder="name-TG"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              icon={<Mail size={18} />}
            />
            <Input
              label="Email"
              type="email"
              placeholder="name@coachlife.com"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              icon={<Mail size={18} />}
            />
            <Input
              label="Specialization"
              placeholder="e.g., Python, Data Science, Frontend"
              name="specialization"
              value={formData.specialization}
              onChange={handleInputChange}
              icon={<Zap size={18} />}
            />
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Role
              </label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="role"
                    value="coach"
                    checked={formData.role === 'coach'}
                    onChange={handleInputChange}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: '500', color: '#111827' }}>Coach</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={formData.role === 'admin'}
                    onChange={handleInputChange}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: '500', color: '#111827' }}>Admin</span>
                </label>
              </div>
            </div>
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              icon={<Lock size={18} />}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              icon={<Lock size={18} />}
            />
            <Button 
              type="submit" 
              className="register-submit-btn" 
              size="md"
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Create Account'}
            </Button>
          </form>

          <div className="register-signin-link">
            Already have an account? <a onClick={() => navigate('/login')}>Sign In</a>
          </div>
        </div>
      </div>
    </main>
  );
};
