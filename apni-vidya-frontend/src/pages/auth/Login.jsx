import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { POST } from '../../utils/api';
import { GraduationCapIcon, ArrowRightIcon, ShieldIcon, UsersIcon } from '../../components/common/Icons';
import edtechBg from '../../assets/edtech_auth_bg.jpg';
import './Auth.css';

export function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please enter both phone/email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await POST('/auth/login', { identifier, password });
      login(res.user, res.token);

      if (res.user.must_reset_password) {
        navigate('/change-password', { replace: true });
        return;
      }

      if (res.user.role === 'student' && !res.user.profile_completed) {
        navigate('/setup-profile', { replace: true });
        return;
      }

      const rolePaths = {
        institute_admin: '/admin',
        teacher: '/teacher',
        student: '/student',
        parent: '/parent',
        super_admin: '/superadmin'
      };
      
      const from = location.state?.from?.pathname && location.state.from.pathname !== '/' 
        ? location.state.from.pathname 
        : rolePaths[res.user.role] || '/';
        
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Background illustration & ambient glowing orbs */}
      <div className="auth-bg-layer" style={{ backgroundImage: `url(${edtechBg})` }} />
      <div className="auth-bg-tint" />
      <div className="auth-gradient-orb auth-orb-1" />
      <div className="auth-gradient-orb auth-orb-2" />

      <div className="auth-split">
        {/* Desktop Left Brand & Value Proposition */}
        <div className="auth-left">
          <Link to="/" className="auth-brand" style={{ textDecoration: 'none' }}>
            <div className="auth-brand-icon">
              <GraduationCapIcon size={26} color="#fff" />
            </div>
            <h1>Apni Vidya</h1>
          </Link>

          <div className="auth-hero">
            <h2>The smarter way to power your institute.</h2>
            <p>
              Automate admissions, batch timetables, attendance, digital exams, fee collections,
              and real-time parent reports — all in one modern platform.
            </p>

            <div className="auth-hero-features">
              <div className="auth-hero-feat-item">
                <span className="auth-hero-feat-bullet">✓</span>
                <span>QR-based rapid student self-onboarding</span>
              </div>
              <div className="auth-hero-feat-item">
                <span className="auth-hero-feat-bullet">✓</span>
                <span>Automated MCQ & Subjective test evaluation</span>
              </div>
              <div className="auth-hero-feat-item">
                <span className="auth-hero-feat-bullet">✓</span>
                <span>WhatsApp & SMS fee reminder dispatches</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.9, fontSize: 13 }}>
            <ShieldIcon size={16} color="#a5b4fc" />
            <span>Trusted by 500+ coaching institutes & schools across India</span>
          </div>
        </div>

        {/* Right Auth Area (Mobile Header at Top, Form centered in middle) */}
        <div className="auth-right">
          {/* Mobile Top Brand Header with Crisp White Text */}
          <Link to="/" className="mobile-auth-header">
            <div className="logo-badge">
              <GraduationCapIcon size={26} color="#fff" />
            </div>
            <div className="logo-text">Apni Vidya</div>
          </Link>
          <div className="mobile-auth-tagline">Coaching Institute ERP</div>

          {/* Form Card */}
          <div className="auth-card-container">
            <div className="auth-card">
              <div className="auth-card-badge">
                ✨ Secure Portal Access
              </div>

              <div className="auth-card-header">
                <h2 className="h2">Welcome back</h2>
                <p className="muted">Sign in with your registered phone or email</p>
              </div>

              <form onSubmit={handleLogin} className="auth-form">
                {error && <div className="auth-error">{error}</div>}

                <div className="field">
                  <label htmlFor="login-identifier">Phone or Email</label>
                  <div className="auth-input-wrapper">
                    <div className="auth-input-icon">
                      <UsersIcon size={18} color="#64748b" />
                    </div>
                    <input
                      id="login-identifier"
                      className="inp"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. 9876543210 or admin@institute.com"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="login-password">Password</label>
                  <div className="auth-input-wrapper">
                    <div className="auth-input-icon">
                      <ShieldIcon size={18} color="#64748b" />
                    </div>
                    <input
                      id="login-password"
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

                <div className="fxb" style={{ marginBottom: 20, marginTop: -4 }}>
                  <label className="checkbox-row" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <span style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                  {!loading && <ArrowRightIcon size={16} />}
                </button>
              </form>

              <div className="auth-footer">
                New to Apni Vidya?{' '}
                <Link to="/signup">Create an institute account</Link>
              </div>
            </div>
          </div>

          {/* Bottom Copyright in Crisp White */}
          <div className="auth-bottom-brand-note">
            © {new Date().getFullYear()} Apni Vidya • Fast, Secure & Reliable
          </div>
        </div>
      </div>
    </div>
  );
}
