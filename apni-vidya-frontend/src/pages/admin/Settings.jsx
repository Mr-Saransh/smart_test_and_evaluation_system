import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldIcon, UserCheckIcon, LogOutIcon } from '../../components/common/Icons';
import { Link, useNavigate } from 'react-router-dom';

export function Settings() {
  const { user, institute, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 800 }}>
      <div className="page-header">
        <h1 className="h1">Settings</h1>
        <p className="page-subtitle">Manage your personal account preferences</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="h2" style={{ marginBottom: 16 }}>Personal Profile</h3>
        <div className="g2">
          <div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Full Name</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{user?.full_name}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Role</div>
            <div style={{ fontSize: 15, fontWeight: 500, textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Phone</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{user?.phone}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Email</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{user?.email || '—'}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="fx" style={{ gap: 12, marginBottom: 16 }}>
          <ShieldIcon size={24} color="var(--color-primary)" />
          <h3 className="h2" style={{ marginBottom: 0 }}>Security</h3>
        </div>
        <div className="fxb" style={{ padding: '16px 0', borderTop: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Change Password</div>
            <div className="muted" style={{ fontSize: 13 }}>Update your password to keep your account secure.</div>
          </div>
          <Link to="/change-password" className="btn bs">Update Password</Link>
        </div>
      </div>

      {user?.role === 'institute_admin' && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="fx" style={{ gap: 12, marginBottom: 16 }}>
            <UserCheckIcon size={24} color="var(--color-primary)" />
            <h3 className="h2" style={{ marginBottom: 0 }}>Institute Quick Links</h3>
          </div>
          <div className="fx fw" style={{ gap: 12 }}>
            <Link to="/admin/institute" className="btn bs">Edit Institute Profile</Link>
            {institute && (
              <a href={`/enroll/${institute.enrollment_slug}`} target="_blank" rel="noreferrer" className="btn bs">View Enrollment Page</a>
            )}
          </div>
        </div>
      )}

      <button className="btn bd" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center' }}>
        <LogOutIcon size={16} /> Sign Out
      </button>
    </div>
  );
}
