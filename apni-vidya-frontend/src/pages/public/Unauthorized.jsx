import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldIcon } from '../../components/common/Icons';

export function Unauthorized() {
  return (
    <div className="error-page">
      <div style={{ width: 80, height: 80, borderRadius: 20, background: 'var(--color-error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ShieldIcon size={40} color="var(--color-error)" />
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-heading)', marginBottom: 8 }}>Access Denied</h1>
      <p className="muted" style={{ fontSize: 16, maxWidth: 420 }}>
        You do not have permission to access this page. Please contact your administrator if you believe this is an error.
      </p>
      <div className="fx" style={{ gap: 10, marginTop: 12 }}>
        <Link to="/" className="btn bp" style={{ height: 44 }}>Go to Dashboard</Link>
        <Link to="/login" className="btn bs" style={{ height: 44 }}>Sign In as Different User</Link>
      </div>
    </div>
  );
}
