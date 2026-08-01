import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { POST } from '../../utils/api';
import { GraduationCapIcon, ArrowRightIcon } from '../../components/common/Icons';
import { validatePassword, passwordStrength } from '../../utils/helpers';

export function Signup() {
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', password: '', role: 'institute_admin' });
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
      <div className="auth-split">
        <div className="auth-left">
          <div className="auth-brand">
            <GraduationCapIcon size={32} color="#fff" />
            <h1>Apni Vidya</h1>
          </div>
          <div className="auth-hero">
            <h2>Start managing your institute in minutes.</h2>
            <p>
              Create your free account, set up your institute, and start enrolling
              students with a single QR code.
            </p>
          </div>
          <div style={{ opacity: 0.7, fontSize: 13, position: 'relative', zIndex: 1 }}>
            Free to get started • No credit card required
          </div>
        </div>
        <div className="auth-right">
          <div className="card auth-card">
            <div style={{ marginBottom: 28 }}>
              <h2 className="h2" style={{ marginBottom: 6 }}>Create your account</h2>
              <p className="muted">Register as an Institute Admin to get started</p>
            </div>
            <form onSubmit={handleSubmit} className="auth-form">
              {error && <div className="auth-error animate-fade-in">{error}</div>}

              <div className="field">
                <label htmlFor="signup-name">Full Name</label>
                <input id="signup-name" className="inp" type="text" value={form.full_name} onChange={set('full_name')} placeholder="Enter your full name" autoComplete="name" />
              </div>

              <div className="field">
                <label htmlFor="signup-phone">Phone Number</label>
                <input id="signup-phone" className="inp" type="tel" value={form.phone} onChange={set('phone')} placeholder="10-digit mobile number" autoComplete="tel" />
              </div>

              <div className="field">
                <label htmlFor="signup-email">Email <span className="muted">(optional)</span></label>
                <input id="signup-email" className="inp" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
              </div>

              <div className="field">
                <label htmlFor="signup-password">Password</label>
                <input id="signup-password" className="inp" type="password" value={form.password} onChange={set('password')} placeholder="Min 8 chars, uppercase, lowercase, number, symbol" autoComplete="new-password" />
                {form.password && (
                  <>
                    <div className="pwd-strength" style={{ marginTop: 8 }}>
                      <div className="pwd-strength-fill" style={{ width: `${pwdPct}%`, background: pwdColor }} />
                    </div>
                    <div className="field-hint" style={{ color: pwdColor }}>
                      {pwdCheck.valid ? 'Strong password' : pwdCheck.message}
                    </div>
                  </>
                )}
              </div>

              <button type="submit" className="btn bp btn-full" disabled={loading} style={{ height: 44, fontSize: 15, marginTop: 8 }}>
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
      </div>
    </div>
  );
}
