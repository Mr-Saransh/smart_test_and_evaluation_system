import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { POST } from '../../utils/api';
import { GraduationCapIcon, ArrowRightIcon } from '../../components/common/Icons';

export function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
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

      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
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
            <h2>The smart way to manage your institute.</h2>
            <p>
              Complete ERP for coaching institutes — admissions, batches,
              attendance, tests, fees, and parent communication in one platform.
            </p>
          </div>
          <div style={{ opacity: 0.7, fontSize: 13, position: 'relative', zIndex: 1 }}>
            Trusted by 500+ coaching institutes across India
          </div>
        </div>
        <div className="auth-right">
          <div className="card auth-card">
            <div style={{ marginBottom: 28 }}>
              <h2 className="h2" style={{ marginBottom: 6 }}>Welcome back</h2>
              <p className="muted">Sign in to your account to continue</p>
            </div>
            <form onSubmit={handleLogin} className="auth-form">
              {error && <div className="auth-error animate-fade-in">{error}</div>}

              <div className="field">
                <label htmlFor="login-identifier">Phone or Email</label>
                <input
                  id="login-identifier"
                  className="inp"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your registered phone or email"
                  autoComplete="username"
                />
              </div>

              <div className="field">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  className="inp"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <div className="fxb" style={{ marginBottom: 24, marginTop: -4 }}>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
              </div>

              <button
                type="submit"
                className="btn bp btn-full"
                disabled={loading}
                style={{ height: 44, fontSize: 15 }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
                {!loading && <ArrowRightIcon size={16} />}
              </button>
            </form>
            <div className="auth-footer">
              New to Apni Vidya?{' '}
              <Link to="/signup">Create an account</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
