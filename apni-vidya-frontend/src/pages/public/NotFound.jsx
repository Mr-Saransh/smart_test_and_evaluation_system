import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCapIcon } from '../../components/common/Icons';

export function NotFound() {
  return (
    <div className="error-page">
      <div className="error-code">404</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-heading)', marginBottom: 8 }}>Page Not Found</h1>
      <p className="muted" style={{ fontSize: 16, maxWidth: 420 }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="fx" style={{ gap: 10, marginTop: 12 }}>
        <Link to="/" className="btn bp" style={{ height: 44 }}>
          <GraduationCapIcon size={18} /> Go to Home
        </Link>
        <Link to="/login" className="btn bs" style={{ height: 44 }}>
          Sign In
        </Link>
      </div>
    </div>
  );
}
