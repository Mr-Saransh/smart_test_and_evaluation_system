import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { POST } from '../../utils/api';
import { GraduationCapIcon } from '../../components/common/Icons';
import { validatePassword, passwordStrength } from '../../utils/helpers';

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
      <div className="auth-split">
        <div className="auth-left">
          <div className="auth-brand">
            <GraduationCapIcon size={32} color="#fff" />
            <h1>Apni Vidya</h1>
          </div>
          <div className="auth-hero">
            <h2>Set your new password.</h2>
            <p>Enter the 6-digit code sent to your phone along with your new password.</p>
          </div>
        </div>
        <div className="auth-right">
          <div className="card auth-card">
            {success ? (
              <div className="animate-fade-in" style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>✓</div>
                <h2 className="h2" style={{ marginBottom: 8 }}>Password Reset</h2>
                <p className="muted">Your password has been reset. Redirecting to sign in...</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 28 }}>
                  <h2 className="h2" style={{ marginBottom: 6 }}>Reset Password</h2>
                  <p className="muted">Enter the code you received and your new password</p>
                </div>
                <form onSubmit={handleSubmit} className="auth-form">
                  {error && <div className="auth-error animate-fade-in">{error}</div>}
                  <div className="field">
                    <label htmlFor="reset-phone">Phone Number</label>
                    <input id="reset-phone" className="inp" type="tel" value={form.phone} onChange={set('phone')} placeholder="Registered phone number" />
                  </div>
                  <div className="field">
                    <label htmlFor="reset-otp">6-Digit Code</label>
                    <input id="reset-otp" className="inp" type="text" value={form.otp} onChange={set('otp')} placeholder="Enter OTP" maxLength={6} style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: 20, fontWeight: 700 }} />
                  </div>
                  <div className="field">
                    <label htmlFor="reset-password">New Password</label>
                    <input id="reset-password" className="inp" type="password" value={form.new_password} onChange={set('new_password')} placeholder="Min 8 chars, uppercase, lowercase, number, symbol" autoComplete="new-password" />
                    {form.new_password && (
                      <>
                        <div className="pwd-strength" style={{ marginTop: 8 }}>
                          <div className="pwd-strength-fill" style={{ width: `${pwdPct}%`, background: pwdColor }} />
                        </div>
                        <div className="field-hint" style={{ color: pwdColor }}>{pwdCheck.valid ? 'Strong password' : pwdCheck.message}</div>
                      </>
                    )}
                  </div>
                  <button type="submit" className="btn bp btn-full" disabled={loading} style={{ height: 44, marginTop: 8 }}>
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
                <div className="auth-footer">
                  <Link to="/login">Back to Sign In</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
