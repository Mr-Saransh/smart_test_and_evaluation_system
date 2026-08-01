import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, PUT, toast } from '../../utils/api';

export function InstituteProfile() {
  const { institute, setInstitute } = useAuth();
  const [form, setForm] = useState({ name: '', city: '', state: '', address: '', pincode: '' });
  const [saving, setSaving] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    if (institute) setForm({ name: institute.name || '', city: institute.city || '', state: institute.state || '', address: institute.address || '', pincode: institute.pincode || '' });
  }, [institute]);

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const save = async () => {
    if (!form.name) { toast('Institute name is required'); return; }
    setSaving(true);
    try {
      if (institute) {
        const u = await PUT(`/institutes/${institute.id}`, form, 'Institute updated');
        setInstitute(u);
      } else {
        const n = await POST('/institutes', form, 'Institute created');
        setInstitute(n);
      }
    } catch { /* handled by api */ }
    setSaving(false);
  };

  const regenQR = async () => {
    if (!institute) return;
    setQrLoading(true);
    try {
      const res = await POST(`/institutes/${institute.id}/regenerate-qr`, undefined, 'QR code regenerated');
      if (res?.qr_code_data) setInstitute({ ...institute, qr_code_data: res.qr_code_data });
    } catch { /* */ }
    setQrLoading(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="h1">Institute Settings</h1>
        <p className="page-subtitle">Manage your institute profile, address, and enrollment settings</p>
      </div>

      <div className="fx fw" style={{ alignItems: 'flex-start', gap: 24 }}>
        <div className="card" style={{ flex: 1, minWidth: 300 }}>
          <h3 className="h2" style={{ marginBottom: 16 }}>Institute Profile & Address</h3>
          <div className="g2">
            <div className="field"><label>Institute Name *</label><input className="inp" value={form.name} onChange={set('name')} placeholder="e.g. Apni Coaching Academy" /></div>
            <div className="field"><label>City</label><input className="inp" value={form.city} onChange={set('city')} placeholder="City" /></div>
            <div className="field"><label>State</label><input className="inp" value={form.state} onChange={set('state')} placeholder="State" /></div>
            <div className="field"><label>Pincode</label><input className="inp" value={form.pincode} onChange={set('pincode')} placeholder="6-digit pincode" /></div>
          </div>
          <div className="field"><label>Full Address</label><textarea className="inp" value={form.address} onChange={set('address')} placeholder="Full address with street name" /></div>
          <button className="btn bp" onClick={save} disabled={saving}>{saving ? 'Saving...' : institute ? 'Update Profile' : 'Create Institute'}</button>
        </div>

        {institute && (
          <div className="card" style={{ flex: '0 0 300px', textAlign: 'center' }}>
            <h3 className="h2" style={{ marginBottom: 8 }}>Enrollment QR Code</h3>
            <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>Scan to open student self-enrollment form</p>
            <div style={{ width: 200, height: 200, margin: '0 auto 16px', background: '#fff', border: '1px solid var(--border-color)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
              {qrLoading ? (
                <span className="muted" style={{ fontSize: 13 }}>Generating...</span>
              ) : institute.qr_code_data ? (
                <img src={institute.qr_code_data} alt="Enrollment QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <span className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>No QR Generated</span>
                  <button className="btn bs bsm" onClick={regenQR}>Generate QR</button>
                </div>
              )}
            </div>
            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', wordBreak: 'break-all', marginBottom: 12 }}>
              /enroll/{institute.enrollment_slug}
            </div>
            <button className="btn bs bsm w-full" style={{ justifyContent: 'center' }} onClick={regenQR} disabled={qrLoading}>
              {qrLoading ? 'Generating...' : 'Regenerate QR Code'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
