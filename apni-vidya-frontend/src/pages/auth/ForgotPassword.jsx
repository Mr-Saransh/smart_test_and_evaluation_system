import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { POST } from '../../utils/api';
import { GraduationCapIcon, ArrowRightIcon, ShieldIcon } from '../../components/common/Icons';
import edtechBg from '../../assets/edtech_auth_bg.jpg';
import './Auth.css';

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
            <h2>Reset your password securely.</h2>
            <p>
              We will send a 6-digit verification code to your registered mobile number
              to verify your identity and restore instant access.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.9, fontSize: 13 }}>
            <ShieldIcon size={16} color="#a5b4fc" />
            <span>2-Factor SMS Verification & Account Protection</span>
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
          <div className="mobile-auth-tagline">Password Recovery</div>

          {/* Form Card */}
          <div className="auth-card-container">
            <div className="auth-card">
              {sent ? (
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
                  <h2 className="h2" style={{ marginBottom: 8 }}>OTP Code Sent</h2>
                  <p className="muted" style={{ marginBottom: 24 }}>
                    If the number is registered, a reset code has been sent via SMS. It expires in 10 minutes.
                  </p>
                  <Link to="/reset-password" className="auth-submit-btn" style={{ textDecoration: 'none', justifyContent: 'center' }}>
                    Enter Reset Code <ArrowRightIcon size={16} />
                  </Link>
                  <div className="auth-footer" style={{ marginTop: 20 }}>
                    <Link to="/login">Back to Sign In</Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="auth-card-header">
                    <h2 className="h2">Forgot Password</h2>
                    <p className="muted">Enter your registered phone number to receive a reset code</p>
                  </div>
                  <form onSubmit={handleSubmit} className="auth-form">
                    {error && <div className="auth-error">{error}</div>}
                    <div className="field">
                      <label htmlFor="forgot-phone">Registered Phone Number</label>
                      <input
                        id="forgot-phone"
                        className="inp"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        autoComplete="tel"
                      />
                    </div>
                    <button type="submit" className="auth-submit-btn" disabled={loading} style={{ marginTop: 8 }}>
                      {loading ? 'Sending Code...' : 'Send Reset Code'}
                      {!loading && <ArrowRightIcon size={16} />}
                    </button>
                  </form>
                  <div className="auth-footer">
                    Remember your password?{' '}
                    <Link to="/login">Sign in</Link>
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
