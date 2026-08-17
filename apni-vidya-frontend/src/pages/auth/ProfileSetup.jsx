import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { POST } from '../../utils/api';
import { ROLE_HOME } from '../../utils/constants';
import { GraduationCapIcon, ArrowRightIcon } from '../../components/common/Icons';
import edtechBg from '../../assets/edtech_auth_bg.jpg';
import './Auth.css';
import './ProfileSetup.css';

export function ProfileSetup() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: (user?.phone || '').startsWith('TMP') ? '' : (user?.phone || ''),
    address: '',
    date_of_birth: '',
    parent_name: '',
    parent_phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.full_name.trim()) { setError('Full name is required'); return; }
    if (!form.phone.trim() || !/^(\+?91|0)?[6-9]\d{9}$/.test(form.phone.trim())) {
      setError('Enter a valid 10-digit mobile number'); return;
    }

    setLoading(true);
    setError('');

    try {
      await POST('/students/profile-setup', {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim() || null,
        date_of_birth: form.date_of_birth || null,
        parent_name: form.parent_name.trim() || null,
        parent_phone: form.parent_phone.trim() || null,
      });

      updateUser({ profile_completed: true, full_name: form.full_name.trim(), phone: form.phone.trim() });
      setSuccess(true);

      setTimeout(() => {
        navigate(ROLE_HOME[user?.role] || '/student', { replace: true });
      }, 1800);
    } catch (err) {
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container profile-setup-container">
      <div className="auth-bg-layer" style={{ backgroundImage: `url(${edtechBg})` }} />
      <div className="auth-bg-tint" />
      <div className="auth-gradient-orb auth-orb-1" />
      <div className="auth-gradient-orb auth-orb-2" />

      <div className="profile-setup-card">
        {success ? (
          <div className="profile-setup-success">
            <div className="profile-setup-success-icon">✓</div>
            <h2>Profile Complete!</h2>
            <p>Redirecting to your dashboard...</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="profile-setup-card-header">
              <div className="profile-setup-icon">
                <GraduationCapIcon size={30} color="#fff" />
              </div>
              <h2>Complete Your Profile</h2>
              <p>Please fill in your details to get started with Apni Vidya</p>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="profile-setup-body">
              {error && <div className="profile-setup-error">{error}</div>}

              {/* Personal Details */}
              <div className="profile-setup-section">
                <div className="profile-setup-section-title">Personal Details</div>
                <div className="profile-setup-row">
                  <div className="profile-setup-field">
                    <label>Full Name <span className="required">*</span></label>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={set('full_name')}
                      placeholder="Enter your full name"
                      autoFocus
                    />
                  </div>
                  <div className="profile-setup-field">
                    <label>Phone Number <span className="required">*</span></label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={set('phone')}
                      placeholder="10-digit mobile number"
                    />
                  </div>
                </div>
                <div className="profile-setup-row">
                  <div className="profile-setup-field">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      value={form.date_of_birth}
                      onChange={set('date_of_birth')}
                    />
                  </div>
                  <div className="profile-setup-field" style={{ gridColumn: 'span 1' }} />
                </div>
                <div className="profile-setup-row single">
                  <div className="profile-setup-field">
                    <label>Address</label>
                    <textarea
                      value={form.address}
                      onChange={set('address')}
                      placeholder="Your residential address"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Guardian Details */}
              <div className="profile-setup-section" style={{ marginBottom: 8 }}>
                <div className="profile-setup-section-title">Guardian / Parent Details</div>
                <div className="profile-setup-row">
                  <div className="profile-setup-field">
                    <label>Parent / Guardian Name</label>
                    <input
                      type="text"
                      value={form.parent_name}
                      onChange={set('parent_name')}
                      placeholder="Parent's full name"
                    />
                  </div>
                  <div className="profile-setup-field">
                    <label>Parent Phone</label>
                    <input
                      type="tel"
                      value={form.parent_phone}
                      onChange={set('parent_phone')}
                      placeholder="10-digit number"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="profile-setup-submit" disabled={loading}>
                {loading ? 'Saving Profile...' : 'Complete Setup'}
                {!loading && <ArrowRightIcon size={16} />}
              </button>
            </form>
          </>
        )}

        <div className="profile-setup-footer">
          © {new Date().getFullYear()} Apni Vidya • Fast, Secure & Reliable
        </div>
      </div>
    </div>
  );
}
