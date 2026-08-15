import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, PUT, DEL, toast } from '../../utils/api';
import { UserCheckIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { getInitials } from '../../utils/helpers';

export function Teachers() {
  const { institute } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', password: '', subject: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!institute) return;
    GET(`/teachers/${institute.id}`).then(setItems).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [institute]);

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));
  const openCreate = () => { setEditing(null); setForm({ full_name: '', phone: '', email: '', password: '', subject: '' }); setShow(true); };
  const openEdit = (t) => { setEditing(t); setForm({ full_name: t.full_name, phone: t.phone, email: t.email || '', password: '', subject: t.subject || '' }); setShow(true); };

  const save = async () => {
    if (!form.full_name || !form.phone || (!editing && !form.password)) {
      toast('Name, phone, and password are required'); return;
    }
    setSaving(true);
    try {
      const body = { ...form, institute_id: institute.id };
      if (!body.password) delete body.password; // Don't send empty password on update
      
      if (editing) await PUT(`/teachers/${editing.id}`, body, 'Teacher updated');
      else await POST('/teachers', body, 'Teacher created');
      
      setShow(false); load();
    } catch { /* toast in api */ }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this teacher? They will lose access to the platform.')) return;
    await DEL(`/teachers/${id}`, 'Teacher deleted'); load();
  };

  if (!institute) return <EmptyState icon={UserCheckIcon} title="Set up your institute first" />;

  return (
    <div className="animate-fade-in">
      <div className="page-header page-header-row">
        <div><h1 className="h1">Teachers</h1><p className="page-subtitle">Manage teaching staff and access</p></div>
        <button className="btn bp" onClick={openCreate}>+ Add Teacher</button>
      </div>

      {loading ? (
        <div className="g3">{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={UserCheckIcon} title="No Teachers Yet" description="Add your first teacher to allow them to manage classes and tests." actionLabel="+ Add Teacher" onAction={openCreate} />
      ) : (
        <div className="g3">
          {items.map(t => (
            <div key={t.id} className="card">
              <div className="fx" style={{ gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {getInitials(t.full_name)}
                </div>
                <div>
                  <h3 className="h3" style={{ lineHeight: 1.2 }}>{t.full_name}</h3>
                  <div className="muted" style={{ fontSize: 12 }}>{t.subject || 'General'}</div>
                </div>
              </div>
              <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
                <div style={{ marginBottom: 4 }}>📞 {t.phone}</div>
                {t.email && <div>✉️ {t.email}</div>}
              </div>
              <div className="fx" style={{ gap: 8 }}>
                <button className="btn bs bsm" onClick={() => openEdit(t)}>Edit</button>
                <button className="btn bd bsm" onClick={() => remove(t.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Teacher' : 'New Teacher'}</h2>
              <button className="btn-icon" onClick={() => setShow(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="field"><label>Full Name *</label><input className="inp" value={form.full_name} onChange={set('full_name')} placeholder="Teacher name" /></div>
              <div className="g2">
                <div className="field"><label>Phone Number *</label><input className="inp" type="tel" value={form.phone} onChange={set('phone')} placeholder="10-digit number" /></div>
                <div className="field"><label>Email (Optional)</label><input className="inp" type="email" value={form.email} onChange={set('email')} placeholder="Email address" /></div>
              </div>
              <div className="g2">
                <div className="field"><label>Subject / Role</label><input className="inp" value={form.subject} onChange={set('subject')} placeholder="e.g. Physics" /></div>
                <div className="field"><label>{editing ? 'New Password (Optional)' : 'Password *'}</label><input className="inp" type="password" value={form.password} onChange={set('password')} placeholder="Min 8 chars" /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn bs" onClick={() => setShow(false)}>Cancel</button>
              <button className="btn bp" onClick={save} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
