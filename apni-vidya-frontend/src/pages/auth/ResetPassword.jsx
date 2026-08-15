import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { POST } from '../../utils/api';
import { GraduationCapIcon, ArrowRightIcon, ShieldIcon } from '../../components/common/Icons';
import { validatePassword, passwordStrength } from '../../utils/helpers';
import edtechBg from '../../assets/edtech_auth_bg.jpg';
import './Auth.css';

export function ResetPassword() {
  const [form, setForm] = useState({ phone: '', otp: '', new_password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));
  const pwdCheck = validatePassword(form.new_password);
  const pwdPct = passwordStrength(form.new_password);
  const pwdColor = pwdPct >= 80 ? '#10b981' : pwdPct >= 50 ? '#f59e0b' : '#ef4444';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.phone || !form.otp || !form.new_password) {
      setError('All fields are required');
      return;
    }
    if (!pwdCheck.valid) { setError(pwdCheck.message); return; }
    setLoading(true);
    setError('');
    try {
      await POST('/auth/reset', form);
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setError(err.message || 'Reset failed');
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
        {/* Desktop Left Hero */}
        <div className="auth-left">
          <Link to="/" className="auth-brand" style={{ textDecoration: 'none' }}>
            <div className="auth-brand-icon">
              <GraduationCapIcon size={26} color="#fff" />
            </div>
            <h1>Apni Vidya</h1>
          </Link>

          <div className="auth-hero">
            <h2>Set your new password.</h2>
            <p>
              Enter the 6-digit verification code sent to your registered phone along with your new password to regain access.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.9, fontSize: 13 }}>
            <ShieldIcon size={16} color="#a5b4fc" />
            <span>Encrypted Credential Update & Immediate Sync</span>
          </div>
        </div>

        {/* Right Area */}
        <div className="auth-right">
          {/* Mobile Top Brand Header */}
          <Link to="/" className="mobile-auth-header">
            <div className="logo-badge">
              <GraduationCapIcon size={26} color="#fff" />
            </div>
            <div className="logo-text">Apni Vidya</div>
          </Link>
          <div className="mobile-auth-tagline">Set New Password</div>

          {/* Form Card */}
          <div className="auth-card-container">
            <div className="auth-card">
              {success ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 60,
                    height: 60,
                    borderRadius: 16,
                    background: '#dcfce7',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: 28,
                    fontWeight: 900
                  }}>
                    ✓
                  </div>
                  <h2 className="h2" style={{ marginBottom: 8 }}>Password Reset!</h2>
                  <p className="muted" style={{ marginBottom: 20 }}>
                    Your password has been successfully updated. Redirecting to sign in...
                  </p>
                </div>
              ) : (
                <>
                  <div className="auth-card-header">
                    <h2 className="h2">Reset Password</h2>
                    <p className="muted">Enter your verification code and choose a new password</p>
                  </div>
                  <form onSubmit={handleSubmit} className="auth-form">
                    {error && <div className="auth-error">{error}</div>}
                    <div className="field">
                      <label htmlFor="reset-phone">Phone Number</label>
                      <input
                        id="reset-phone"
                        className="inp"
                        type="tel"
                        value={form.phone}
                        onChange={set('phone')}
                        placeholder="Registered phone number"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="reset-otp">6-Digit Code</label>
                      <input
                        id="reset-otp"
                        className="inp"
                        type="text"
                        value={form.otp}
                        onChange={set('otp')}
                        placeholder="••••••"
                        maxLength={6}
                        style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: 18, fontWeight: 700 }}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="reset-password">New Password</label>
                      <input
                        id="reset-password"
                        className="inp"
                        type="password"
                        value={form.new_password}
                        onChange={set('new_password')}
                        placeholder="Min 8 chars, mixed letters & numbers"
                        autoComplete="new-password"
                      />
                      {form.new_password && (
                        <>
                          <div className="pwd-strength" style={{ marginTop: 8 }}>
                            <div className="pwd-strength-fill" style={{ width: `${pwdPct}%`, background: pwdColor }} />
                          </div>
                          <div className="field-hint" style={{ color: pwdColor, fontWeight: 600 }}>
                            {pwdCheck.valid ? 'Strong password' : pwdCheck.message}
                          </div>
                        </>
                      )}
                    </div>
                    <button type="submit" className="auth-submit-btn" disabled={loading} style={{ marginTop: 8 }}>
                      {loading ? 'Resetting...' : 'Reset Password'}
                      {!loading && <ArrowRightIcon size={16} />}
                    </button>
                  </form>
                  <div className="auth-footer">
                    <Link to="/login">Back to Sign In</Link>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="auth-bottom-brand-note">
            © {new Date().getFullYear()} Apni Vidya • Fast, Secure & Reliable
          </div>
        </div>
      </div>
    </div>
  );
}
