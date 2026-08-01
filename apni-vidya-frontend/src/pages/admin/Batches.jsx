import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, PUT, DEL, toast } from '../../utils/api';
import { BuildingIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate } from '../../utils/helpers';

export function Batches() {
  const { institute } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!institute) return;
    GET(`/batches/${institute.id}`).then(setItems).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [institute]);

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));
  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', start_date: '', end_date: '' }); setShow(true); };
  const openEdit = (b) => { setEditing(b); setForm({ name: b.name, description: b.description || '', start_date: b.start_date?.split('T')[0] || '', end_date: b.end_date?.split('T')[0] || '' }); setShow(true); };

  const save = async () => {
    if (!form.name) { toast('Batch name is required'); return; }
    setSaving(true);
    try {
      const body = { ...form, institute_id: institute.id };
      if (editing) await PUT(`/batches/${editing.id}`, body, 'Batch updated');
      else await POST('/batches', body, 'Batch created');
      setShow(false); load();
    } catch { /* */ }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this batch? This will affect all related data.')) return;
    await DEL(`/batches/${id}`, 'Batch deleted'); load();
  };

  if (!institute) return <EmptyState icon={BuildingIcon} title="Set up your institute first" />;

  return (
    <div className="animate-fade-in">
      <div className="page-header page-header-row">
        <div><h1 className="h1">Batches</h1><p className="page-subtitle">Manage your batches and class groups</p></div>
        <button className="btn bp" onClick={openCreate}>+ Add Batch</button>
      </div>

      {loading ? (
        <div className="g3">{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={BuildingIcon} title="No Batches Yet" description="Create your first batch to start enrolling students." actionLabel="+ Add Batch" onAction={openCreate} />
      ) : (
        <div className="g3">
          {items.map(b => (
            <div key={b.id} className="card">
              <div className="fxb" style={{ marginBottom: 8 }}>
                <h3 className="h3">{b.name}</h3>
                <span className="badge" style={{ background: b.is_active ? 'var(--color-success-bg)' : 'var(--bg-tertiary)', color: b.is_active ? 'var(--color-success)' : 'var(--text-muted)' }}>
                  {b.is_active ? 'Active' : 'Ended'}
                </span>
              </div>
              {b.description && <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{b.description}</p>}
              <div className="fx" style={{ gap: 16, marginBottom: 12 }}>
                <span className="muted" style={{ fontSize: 12 }}>👥 {b.student_count || 0} students</span>
                {b.start_date && <span className="muted" style={{ fontSize: 12 }}>{formatDate(b.start_date)}</span>}
              </div>
              <div className="fx" style={{ gap: 8 }}>
                <button className="btn bs bsm" onClick={() => openEdit(b)}>Edit</button>
                <button className="btn bd bsm" onClick={() => remove(b.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Batch' : 'New Batch'}</h2>
              <button className="btn-icon" onClick={() => setShow(false)}>✕</button>
            </div>
            <div className="field"><label>Batch Name *</label><input className="inp" value={form.name} onChange={set('name')} placeholder="e.g. JEE 2026 Morning" /></div>
            <div className="field"><label>Description</label><textarea className="inp" value={form.description} onChange={set('description')} placeholder="Brief description" /></div>
            <div className="g2">
              <div className="field"><label>Start Date</label><input className="inp" type="date" value={form.start_date} onChange={set('start_date')} /></div>
              <div className="field"><label>End Date</label><input className="inp" type="date" value={form.end_date} onChange={set('end_date')} /></div>
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
