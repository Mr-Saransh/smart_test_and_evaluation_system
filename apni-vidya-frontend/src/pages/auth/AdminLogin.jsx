import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { POST } from '../../utils/api';
import { ShieldIcon, ArrowRightIcon, UsersIcon } from '../../components/common/Icons';
import edtechBg from '../../assets/edtech_auth_bg.jpg';
import './Auth.css';

export function AdminLogin() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    if (e) e.preventDefault();
    if (!identifier || !password) {
      setError('Please enter admin ID and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await POST('/auth/login', { identifier, password });
      login(res.user, res.token);
      navigate('/superadmin', { replace: true });
    } catch (err) {
      setError(err.message || 'Admin authentication failed. Verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ background: '#090a12' }}>
      {/* Background illustration & ambient glowing orbs */}
      <div className="auth-bg-layer" style={{ backgroundImage: `url(${edtechBg})`, opacity: 0.45 }} />
      <div className="auth-bg-tint" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(10, 15, 30, 0.7) 0%, rgba(5, 7, 15, 0.95) 100%)' }} />
      <div className="auth-gradient-orb auth-orb-1" style={{ background: 'radial-gradient(circle, rgba(124, 58, 237, 0.4) 0%, rgba(0, 0, 0, 0) 70%)' }} />
      <div className="auth-gradient-orb auth-orb-2" style={{ background: 'radial-gradient(circle, rgba(79, 70, 229, 0.35) 0%, rgba(0, 0, 0, 0) 70%)' }} />

      <div style={{ width: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 440, width: '100%' }}>
          {/* Top Logo Badge */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ 
              width: 54, 
              height: 54, 
              margin: '0 auto 12px', 
              borderRadius: 16, 
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(124, 58, 237, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2)',
              fontSize: 26
            }}>
              👑
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
              Master Admin Console
            </h1>
            <p style={{ color: '#a5b4fc', fontSize: 13, marginTop: 4, fontWeight: 600 }}>
              Restricted System Surveillance & Monitoring
            </p>
          </div>

          {/* Frosted Glass Admin Login Card */}
          <div className="auth-card" style={{ 
            background: 'rgba(255, 255, 255, 0.96)', 
            backdropFilter: 'blur(20px)',
            borderRadius: 20,
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(165, 180, 252, 0.35)',
            padding: '32px 28px'
          }}>
            <form onSubmit={handleAdminLogin} className="auth-form">
              {error && <div className="auth-error">{error}</div>}

              <div className="field">
                <label htmlFor="admin-id">Admin Identifier / Email</label>
                <div className="auth-input-wrapper">
                  <div className="auth-input-icon">
                    <UsersIcon size={18} color="#64748b" />
                  </div>
                  <input
                    id="admin-id"
                    className="inp"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. admin or admin@apnividya.com"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="admin-pass">Admin Password</label>
                <div className="auth-input-wrapper">
                  <div className="auth-input-icon">
                    <ShieldIcon size={18} color="#64748b" />
                  </div>
                  <input
                    id="admin-pass"
                    className="inp"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                  boxShadow: '0 4px 16px rgba(124, 58, 237, 0.45)',
                  marginTop: 8
                }}
                disabled={loading}
              >
                {loading ? 'Entering Console...' : '⚡ Enter Monitoring Console'}
                {!loading && <ArrowRightIcon size={16} />}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#64748b' }}>
              Standard User?{' '}
              <a href="/login" style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}>
                Go to Public Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
