import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldIcon, UserCheckIcon, LogOutIcon, CheckCircleIcon } from '../../components/common/Icons';
import { Link, useNavigate } from 'react-router-dom';
import { GET, POST } from '../../utils/api';

export function Settings() {
  const { user, institute, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [studentProfile, setStudentProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    date_of_birth: '',
    address: '',
    parent_name: '',
    parent_phone: '',
  });

  useEffect(() => {
    if (user?.role === 'student') {
      GET('/students/me')
        .then((p) => {
          if (p) {
            setStudentProfile(p);
            setForm({
              full_name: p.full_name || user?.full_name || '',
              phone: p.phone || (user?.phone?.startsWith('TMP') ? '' : user?.phone) || '',
              date_of_birth: p.date_of_birth ? p.date_of_birth.slice(0, 10) : '',
              address: p.address || '',
              parent_name: p.parent_name || '',
              parent_phone: p.parent_phone || '',
            });
          }
        })
        .catch(() => {});
    } else if (user) {
      setForm({
        full_name: user.full_name || '',
        phone: (user.phone || '').startsWith('TMP') ? '' : user.phone || '',
        date_of_birth: '',
        address: '',
        parent_name: '',
        parent_phone: '',
      });
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setError('Full name is required');
      return;
    }
    if (!form.phone.trim() || !/^(\+?91|0)?[6-9]\d{9}$/.test(form.phone.trim())) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (user?.role === 'student') {
        await POST('/students/profile-setup', {
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim() || null,
          date_of_birth: form.date_of_birth || null,
          parent_name: form.parent_name.trim() || null,
          parent_phone: form.parent_phone.trim() || null,
        });

        setStudentProfile(prev => ({
          ...(prev || {}),
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          date_of_birth: form.date_of_birth,
          parent_name: form.parent_name.trim(),
          parent_phone: form.parent_phone.trim(),
        }));
      }

      updateUser({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        profile_completed: true,
      });

      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

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

      {success && (
        <div style={{ padding: '12px 16px', background: '#d1fae5', color: '#059669', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          ✓ {success}
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="fxb" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 className="h2" style={{ marginBottom: 2 }}>Personal Profile</h3>
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>Your identity & contact details</p>
          </div>
          {!isEditing ? (
            <button
              type="button"
              className="btn bp bsm"
              onClick={() => {
                setIsEditing(true);
                setError('');
              }}
            >
              ✏️ Edit Profile
            </button>
          ) : (
            <button
              type="button"
              className="btn bs bsm"
              onClick={() => {
                setIsEditing(false);
                setError('');
              }}
            >
              Cancel
            </button>
          )}
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#dc2626', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {!isEditing ? (
          <div>
            <div className="g2" style={{ marginBottom: 16 }}>
              <div>
                <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Full Name</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.full_name}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Role</div>
                <div style={{ fontSize: 15, fontWeight: 500, textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Mobile Number</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>
                  {(user?.phone || '').startsWith('TMP') ? (
                    <span style={{ color: '#d97706', fontSize: 13, fontWeight: 600 }}>⚠️ Not configured (Click Edit Profile)</span>
                  ) : (
                    user?.phone
                  )}
                </div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Email Address</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{user?.email || '—'}</div>
              </div>
            </div>

            {user?.role === 'student' && (
              <>
                <div className="g2" style={{ padding: '14px 0', borderTop: '1px solid var(--border-light)', marginBottom: 8 }}>
                  <div>
                    <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Batch</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{studentProfile?.batch_name || 'Enrolled Batch'}</div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Roll Number</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{studentProfile?.roll_number || '—'}</div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Date of Birth</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {studentProfile?.date_of_birth ? new Date(studentProfile.date_of_birth).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Address</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{studentProfile?.address || '—'}</div>
                  </div>
                </div>

                <div className="g2" style={{ padding: '14px 0', borderTop: '1px solid var(--border-light)' }}>
                  <div>
                    <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Parent / Guardian Name</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{studentProfile?.parent_name || '—'}</div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Parent Mobile Number</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{studentProfile?.parent_phone || '—'}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="g2" style={{ marginBottom: 16 }}>
              <div className="field">
                <label>Full Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input
                  type="text"
                  className="inp"
                  value={form.full_name}
                  onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Your full name"
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Mobile Number (10 digits) <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input
                  type="tel"
                  className="inp"
                  value={form.phone}
                  onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="10-digit mobile number"
                />
              </div>
              <div className="field">
                <label>Email Address</label>
                <input
                  type="email"
                  className="inp"
                  value={user?.email || ''}
                  disabled
                  style={{ background: 'var(--bg-secondary)', cursor: 'not-allowed', color: 'var(--text-tertiary)' }}
                />
              </div>
              {user?.role === 'student' && (
                <div className="field">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    className="inp"
                    value={form.date_of_birth}
                    onChange={(e) => setForm(p => ({ ...p, date_of_birth: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {user?.role === 'student' && (
              <>
                <div className="field" style={{ marginBottom: 16 }}>
                  <label>Residential Address</label>
                  <textarea
                    className="inp"
                    rows={2}
                    value={form.address}
                    onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))}
                    placeholder="Enter your complete address"
                  />
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', margin: '16px 0 12px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Parent / Guardian Details
                </div>
                <div className="g2" style={{ marginBottom: 20 }}>
                  <div className="field">
                    <label>Parent Name</label>
                    <input
                      type="text"
                      className="inp"
                      value={form.parent_name}
                      onChange={(e) => setForm(p => ({ ...p, parent_name: e.target.value }))}
                      placeholder="Parent's full name"
                    />
                  </div>
                  <div className="field">
                    <label>Parent Mobile Number</label>
                    <input
                      type="tel"
                      className="inp"
                      value={form.parent_phone}
                      onChange={(e) => setForm(p => ({ ...p, parent_phone: e.target.value }))}
                      placeholder="10-digit parent phone"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="fx" style={{ gap: 10, marginTop: 16 }}>
              <button type="submit" className="btn bp" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
              <button type="button" className="btn bs" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
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
