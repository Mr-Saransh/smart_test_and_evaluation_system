import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, PUT, DEL, toast } from '../../utils/api';
import { BookOpenIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { formatCurrency } from '../../utils/helpers';

export function Courses() {
  const { institute } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', fee_amount: '', duration_days: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!institute) return;
    GET(`/courses/${institute.id}`).then(setItems).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [institute]);

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', fee_amount: '', duration_days: '' }); setShow(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, description: c.description || '', fee_amount: c.fee_amount || '', duration_days: c.duration_days || '' }); setShow(true); };

  const save = async () => {
    if (!form.name) { toast('Course name is required'); return; }
    setSaving(true);
    try {
      const body = { ...form, fee_amount: form.fee_amount ? Number(form.fee_amount) : 0, duration_days: form.duration_days ? Number(form.duration_days) : null, institute_id: institute.id };
      if (editing) {
        await PUT(`/courses/${editing.id}`, body, 'Course updated');
      } else {
        await POST('/courses', body, 'Course created');
      }
      setShow(false); load();
    } catch { /* */ }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this course?')) return;
    await DEL(`/courses/${id}`, 'Course deleted');
    load();
  };

  if (!institute) return <EmptyState icon={BookOpenIcon} title="Set up your institute first" description="Create your institute to manage courses." />;

  return (
    <div className="animate-fade-in">
      <div className="page-header page-header-row">
        <div><h1 className="h1">Courses</h1><p className="page-subtitle">Manage your course catalog</p></div>
        <button className="btn bp" onClick={openCreate}>+ Add Course</button>
      </div>

      {loading ? (
        <div className="g3">{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={BookOpenIcon} title="No Courses Yet" description="Create your first course to start organizing your curriculum." actionLabel="+ Add Course" onAction={openCreate} />
      ) : (
        <div className="g3">
          {items.map(c => (
            <div key={c.id} className="card">
              <div className="fxb" style={{ marginBottom: 12 }}>
                <h3 className="h3">{c.name}</h3>
                <span className="badge" style={{ background: c.is_active ? 'var(--color-success-bg)' : 'var(--bg-tertiary)', color: c.is_active ? 'var(--color-success)' : 'var(--text-muted)' }}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {c.description && <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{c.description}</p>}
              <div className="fx" style={{ gap: 16, marginBottom: 12 }}>
                <span className="muted" style={{ fontSize: 13 }}>Fee: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(c.fee_amount)}</strong></span>
                {c.duration_days && <span className="muted" style={{ fontSize: 13 }}>{c.duration_days} days</span>}
              </div>
              <div className="fx" style={{ gap: 8 }}>
                <button className="btn bs bsm" onClick={() => openEdit(c)}>Edit</button>
                <button className="btn bd bsm" onClick={() => remove(c.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={show}
        onClose={() => setShow(false)}
        title={editing ? 'Edit Course' : 'New Course'}
        footer={
          <>
            <button className="btn bs" onClick={() => setShow(false)}>Cancel</button>
            <button className="btn bp" onClick={save} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update Course' : 'Create Course'}
            </button>
          </>
        }
      >
        <div className="field">
          <label>Course Name *</label>
          <input className="inp" value={form.name} onChange={set('name')} placeholder="e.g. JEE Advanced 2026" autoFocus />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea className="inp" value={form.description} onChange={set('description')} placeholder="Brief description" rows={2} />
        </div>
        <div className="g2">
          <div className="field">
            <label>Fee Amount (₹)</label>
            <input className="inp" type="number" value={form.fee_amount} onChange={set('fee_amount')} placeholder="0" />
          </div>
          <div className="field">
            <label>Duration (days)</label>
            <input className="inp" type="number" value={form.duration_days} onChange={set('duration_days')} placeholder="365" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
