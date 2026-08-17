import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { POST } from '../../utils/api';
import { validatePassword, passwordStrength } from '../../utils/helpers';
import { ROLE_HOME } from '../../utils/constants';
import { GraduationCapIcon, ArrowRightIcon } from '../../components/common/Icons';
import edtechBg from '../../assets/edtech_auth_bg.jpg';
import './Auth.css';

export function ChangePassword() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isForced = user?.must_reset_password;
  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));
  const pwdCheck = validatePassword(form.new_password);
  const pwdPct = passwordStrength(form.new_password);
  const pwdColor = pwdPct >= 80 ? '#10b981' : pwdPct >= 50 ? '#f59e0b' : '#ef4444';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isForced && !form.current_password) { setError('Current password is required'); return; }
    if (!pwdCheck.valid) { setError(pwdCheck.message); return; }
    if (form.new_password !== form.confirm) { setError('Passwords do not match'); return; }

    setLoading(true);
    setError('');
    try {
      await POST('/auth/change-password', {
        current_password: isForced ? undefined : form.current_password,
        new_password: form.new_password,
      });
      setSuccess(true);
      updateUser({ must_reset_password: false });
      setTimeout(() => {
        if (user?.role === 'student' && !user?.profile_completed) {
          navigate('/setup-profile', { replace: true });
        } else {
          const home = ROLE_HOME[user?.role] || '/';
          navigate(home, { replace: true });
        }
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      {/* Background illustration & ambient glowing orbs */}
      <div className="auth-bg-layer" style={{ backgroundImage: `url(${edtechBg})` }} />
      <div className="auth-bg-tint" />
      <div className="auth-gradient-orb auth-orb-1" />
      <div className="auth-gradient-orb auth-orb-2" />

      <div style={{ width: '100%', maxWidth: 460, margin: '0 auto', padding: '24px 16px', position: 'relative', zIndex: 1 }}>
        <Link to="/" className="mobile-auth-header" style={{ display: 'flex', marginBottom: 16 }}>
          <div className="logo-badge">
            <GraduationCapIcon size={26} color="#fff" />
          </div>
          <div className="logo-text">Apni Vidya</div>
        </Link>

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
              <h2 className="h2" style={{ marginBottom: 8 }}>Password Updated!</h2>
              <p className="muted">Redirecting to your personalized dashboard...</p>
            </div>
          ) : (
            <>
              <div className="auth-card-header">
                <h2 className="h2">
                  {isForced ? 'Set Your Password' : 'Change Password'}
                </h2>
                <p className="muted">
                  {isForced
                    ? 'Your account requires a password update before proceeding.'
                    : 'Update your password to keep your account secure'}
                </p>
              </div>
              <form onSubmit={handleSubmit} className="auth-form">
                {error && <div className="auth-error">{error}</div>}

                {!isForced && (
                  <div className="field">
                    <label htmlFor="cp-current">Current Password</label>
                    <input
                      id="cp-current"
                      className="inp"
                      type="password"
                      value={form.current_password}
                      onChange={set('current_password')}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                    />
                  </div>
                )}

                <div className="field">
                  <label htmlFor="cp-new">New Password</label>
                  <input
                    id="cp-new"
                    className="inp"
                    type="password"
                    value={form.new_password}
                    onChange={set('new_password')}
                    placeholder="Min 8 chars, uppercase, lowercase, number, symbol"
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

                <div className="field">
                  <label htmlFor="cp-confirm">Confirm New Password</label>
                  <input
                    id="cp-confirm"
                    className="inp"
                    type="password"
                    value={form.confirm}
                    onChange={set('confirm')}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                  />
                </div>

                <button type="submit" className="auth-submit-btn" disabled={loading} style={{ marginTop: 8 }}>
                  {loading ? 'Updating Password...' : 'Update Password'}
                  {!loading && <ArrowRightIcon size={16} />}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="auth-bottom-brand-note">
          © {new Date().getFullYear()} Apni Vidya • Fast, Secure & Reliable
        </div>
      </div>
    </div>
  );
}
