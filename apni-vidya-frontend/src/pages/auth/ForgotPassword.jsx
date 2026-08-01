import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { POST } from '../../utils/api';
import { GraduationCapIcon } from '../../components/common/Icons';

export function ForgotPassword() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone) { setError('Please enter your phone number'); return; }
    setLoading(true);
    setError('');
    try {
      await POST('/auth/forgot', { phone });
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset code');
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
            <h2>Reset your password securely.</h2>
            <p>We will send a 6-digit OTP to your registered phone number to verify your identity.</p>
          </div>
        </div>
        <div className="auth-right">
          <div className="card auth-card">
            {sent ? (
              <div className="animate-fade-in" style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>✓</div>
                <h2 className="h2" style={{ marginBottom: 8 }}>Code Sent</h2>
                <p className="muted" style={{ marginBottom: 24 }}>If the number is registered, a reset code has been sent via SMS. It expires in 10 minutes.</p>
                <Link to="/reset-password" className="btn bp btn-full" style={{ height: 44, justifyContent: 'center' }}>
                  Enter Reset Code
                </Link>
                <div className="auth-footer">
                  <Link to="/login">Back to Sign In</Link>
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 28 }}>
                  <h2 className="h2" style={{ marginBottom: 6 }}>Forgot Password</h2>
                  <p className="muted">Enter your registered phone number to receive a reset code</p>
                </div>
                <form onSubmit={handleSubmit} className="auth-form">
                  {error && <div className="auth-error animate-fade-in">{error}</div>}
                  <div className="field">
                    <label htmlFor="forgot-phone">Registered Phone Number</label>
                    <input id="forgot-phone" className="inp" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your 10-digit number" autoComplete="tel" />
                  </div>
                  <button type="submit" className="btn bp btn-full" disabled={loading} style={{ height: 44, marginTop: 8 }}>
                    {loading ? 'Sending...' : 'Send Reset Code'}
                  </button>
                </form>
                <div className="auth-footer">
                  Remember your password?{' '}<Link to="/login">Sign in</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
