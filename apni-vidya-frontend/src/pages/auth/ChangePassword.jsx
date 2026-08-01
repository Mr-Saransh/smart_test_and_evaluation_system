import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { POST } from '../../utils/api';
import { validatePassword, passwordStrength } from '../../utils/helpers';
import { ROLE_HOME } from '../../utils/constants';

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
        const home = ROLE_HOME[user?.role] || '/';
        navigate(home, { replace: true });
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', padding: 24 }}>
        <div className="card" style={{ padding: 32 }}>
          {success ? (
            <div className="animate-fade-in" style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>✓</div>
              <h2 className="h2" style={{ marginBottom: 8 }}>Password Updated</h2>
              <p className="muted">Redirecting to your dashboard...</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 24 }}>
                <h2 className="h2" style={{ marginBottom: 6 }}>
                  {isForced ? 'Set Your Password' : 'Change Password'}
                </h2>
                <p className="muted">
                  {isForced
                    ? 'Your account requires a password change before continuing.'
                    : 'Update your password to keep your account secure'}
                </p>
              </div>
              <form onSubmit={handleSubmit}>
                {error && <div className="auth-error animate-fade-in">{error}</div>}

                {!isForced && (
                  <div className="field">
                    <label htmlFor="cp-current">Current Password</label>
                    <input id="cp-current" className="inp" type="password" value={form.current_password} onChange={set('current_password')} placeholder="Enter current password" autoComplete="current-password" />
                  </div>
                )}

                <div className="field">
                  <label htmlFor="cp-new">New Password</label>
                  <input id="cp-new" className="inp" type="password" value={form.new_password} onChange={set('new_password')} placeholder="Min 8 chars, uppercase, lowercase, number, symbol" autoComplete="new-password" />
                  {form.new_password && (
                    <>
                      <div className="pwd-strength" style={{ marginTop: 8 }}>
                        <div className="pwd-strength-fill" style={{ width: `${pwdPct}%`, background: pwdColor }} />
                      </div>
                      <div className="field-hint" style={{ color: pwdColor }}>{pwdCheck.valid ? 'Strong password' : pwdCheck.message}</div>
                    </>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="cp-confirm">Confirm New Password</label>
                  <input id="cp-confirm" className="inp" type="password" value={form.confirm} onChange={set('confirm')} placeholder="Re-enter new password" autoComplete="new-password" />
                </div>

                <button type="submit" className="btn bp btn-full" disabled={loading} style={{ height: 44, marginTop: 8 }}>
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
