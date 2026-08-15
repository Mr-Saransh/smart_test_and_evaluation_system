import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { POST } from '../../utils/api';
import { GraduationCapIcon, ArrowRightIcon, ShieldIcon, UsersIcon } from '../../components/common/Icons';
import { validatePassword, passwordStrength } from '../../utils/helpers';
import edtechBg from '../../assets/edtech_auth_bg.jpg';
import './Auth.css';

export function Signup() {
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', password: '', role: 'institute_admin' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const pwdCheck = validatePassword(form.password);
  const pwdPct = passwordStrength(form.password);
  const pwdColor = pwdPct >= 80 ? '#10b981' : pwdPct >= 50 ? '#f59e0b' : '#ef4444';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.phone || !form.password) {
      setError('Full name, phone, and password are required');
      return;
    }
    if (!pwdCheck.valid) {
      setError(pwdCheck.message);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await POST('/auth/signup', form);
      login(res.user, res.token);
      navigate('/admin/institute', { replace: true });
    } catch (err) {
      setError(err.message || 'Signup failed');
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
        {/* Desktop Left Hero Panel */}
        <div className="auth-left">
          <Link to="/" className="auth-brand" style={{ textDecoration: 'none' }}>
            <div className="auth-brand-icon">
              <GraduationCapIcon size={26} color="#fff" />
            </div>
            <h1>Apni Vidya</h1>
          </Link>

          <div className="auth-hero">
            <h2>Start managing your institute in minutes.</h2>
            <p>
              Create your account, add your courses & batches, and enroll students
              effortlessly with our instant QR-code onboarding system.
            </p>

            <div className="auth-hero-features">
              <div className="auth-hero-feat-item">
                <span className="auth-hero-feat-bullet">✓</span>
                <span>Free 14-day full platform access</span>
              </div>
              <div className="auth-hero-feat-item">
                <span className="auth-hero-feat-bullet">✓</span>
                <span>No credit card or setup fees required</span>
              </div>
              <div className="auth-hero-feat-item">
                <span className="auth-hero-feat-bullet">✓</span>
                <span>Instant automated student portals & test engine</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.9, fontSize: 13 }}>
            <ShieldIcon size={16} color="#a5b4fc" />
            <span>Bank-grade 256-bit encryption & privacy compliant</span>
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
          <div className="mobile-auth-tagline">Start your free trial today</div>

          {/* Form Card */}
          <div className="auth-card-container">
            <div className="auth-card">
              <div className="auth-card-badge">
                🚀 14-Day Free Access
              </div>

              <div className="auth-card-header">
                <h2 className="h2">Create institute account</h2>
                <p className="muted">Register as an Institute Administrator to get started</p>
              </div>

              <form onSubmit={handleSubmit} className="auth-form">
                {error && <div className="auth-error">{error}</div>}

                <div className="field">
                  <label htmlFor="signup-name">Full Name</label>
                  <div className="auth-input-wrapper">
                    <div className="auth-input-icon">
                      <UsersIcon size={18} color="#64748b" />
                    </div>
                    <input
                      id="signup-name"
                      className="inp"
                      type="text"
                      value={form.full_name}
                      onChange={set('full_name')}
                      placeholder="e.g. Dr. Rajesh Sharma"
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="signup-phone">Phone Number</label>
                  <div className="auth-input-wrapper">
                    <div className="auth-input-icon">
                      <ShieldIcon size={18} color="#64748b" />
                    </div>
                    <input
                      id="signup-phone"
                      className="inp"
                      type="tel"
                      value={form.phone}
                      onChange={set('phone')}
                      placeholder="10-digit mobile number"
                      autoComplete="tel"
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="signup-email">Email <span className="muted">(optional)</span></label>
                  <div className="auth-input-wrapper">
                    <div className="auth-input-icon">
                      <span style={{ fontSize: 16 }}>✉️</span>
                    </div>
                    <input
                      id="signup-email"
                      className="inp"
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      placeholder="director@institute.com"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="signup-password">Password</label>
                  <div className="auth-input-wrapper">
                    <div className="auth-input-icon">
                      <ShieldIcon size={18} color="#64748b" />
                    </div>
                    <input
                      id="signup-password"
                      className="inp"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={set('password')}
                      placeholder="Min 8 chars (letters, numbers, symbols)"
                      autoComplete="new-password"
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
                  {form.password && (
                    <>
                      <div className="pwd-strength" style={{ marginTop: 8 }}>
                        <div className="pwd-strength-fill" style={{ width: `${pwdPct}%`, background: pwdColor }} />
                      </div>
                      <div className="field-hint" style={{ color: pwdColor, fontWeight: 700 }}>
                        {pwdCheck.valid ? 'Strong password' : pwdCheck.message}
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                  style={{ marginTop: 8 }}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                  {!loading && <ArrowRightIcon size={16} />}
                </button>
              </form>

              <div className="auth-footer">
                Already have an account?{' '}
                <Link to="/login">Sign in</Link>
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
