import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, DEL, toast } from '../../utils/api';
import { MegaphoneIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { SkeletonTable } from '../../components/common/Skeleton';
import { formatDate } from '../../utils/helpers';

export function Announcements() {
  const { institute } = useAuth();
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', audience: 'all', batch_id: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!institute) return;
    Promise.all([
      GET(`/announcements/institute/${institute.id}`),
      GET(`/batches/${institute.id}`)
    ]).then(([a, b]) => { setItems(a); setBatches(b); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [institute]);

  const setF = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const save = async () => {
    if (!form.title || !form.body) { toast('Title and message are required'); return; }
    if (form.audience === 'batch' && !form.batch_id) { toast('Please select a batch'); return; }
    
    setSaving(true);
    try {
      const body = { ...form, institute_id: institute.id };
      if (form.audience !== 'batch') delete body.batch_id;
      
      await POST('/announcements', body, 'Announcement broadcasted');
      setShowForm(false);
      load();
    } catch { /* */ }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this announcement? It will be removed from student dashboards.')) return;
    await DEL(`/announcements/${id}`, 'Announcement deleted');
    load();
  };

  if (!institute) return <EmptyState icon={MegaphoneIcon} title="Set up your institute first" />;

  return (
    <div className="animate-fade-in">
      <div className="page-header page-header-row">
        <div><h1 className="h1">Announcements</h1><p className="page-subtitle">Broadcast messages to students and parents</p></div>
        <button className="btn bp" onClick={() => { setForm({ title: '', body: '', audience: 'all', batch_id: '' }); setShowForm(true); }}>
          + New Announcement
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="tblwrap">
          {loading ? (
            <div style={{ padding: 20 }}><SkeletonTable /></div>
          ) : items.length === 0 ? (
            <EmptyState icon={MegaphoneIcon} title="No Announcements" description="Create your first announcement to inform students." actionLabel="+ New Announcement" onAction={() => setShowForm(true)} />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th style={{ width: '40%' }}>Title & Message</th>
                  <th>Audience</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map(a => (
                  <tr key={a.id}>
                    <td><div className="muted" style={{ fontSize: 13 }}>{formatDate(a.created_at)}</div></td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{a.title}</div>
                      <div className="muted" style={{ fontSize: 13 }}>{a.body.substring(0, 100)}{a.body.length > 100 ? '...' : ''}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                        {a.audience === 'batch' ? a.batch_name || 'Specific Batch' : a.audience.toUpperCase()}
                      </span>
                    </td>
                    <td><button className="btn bd bsm" onClick={() => remove(a.id)}>Del</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="New Announcement"
        footer={
          <>
            <button className="btn bs" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn bp" onClick={save} disabled={saving}>
              {saving ? 'Broadcasting...' : 'Broadcast Now'}
            </button>
          </>
        }
      >
        <div className="field">
          <label>Audience *</label>
          <select className="sel w-full" value={form.audience} onChange={setF('audience')}>
            <option value="all">All Students</option>
            <option value="batch">Specific Batch</option>
          </select>
        </div>

        {form.audience === 'batch' && (
          <div className="field animate-fade-in">
            <label>Select Batch *</label>
            <select className="sel w-full" value={form.batch_id} onChange={setF('batch_id')}>
              <option value="">Choose Batch...</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        <div className="field"><label>Title / Subject *</label><input className="inp" value={form.title} onChange={setF('title')} placeholder="e.g. Holiday on Friday" autoFocus /></div>
        <div className="field"><label>Message *</label><textarea className="inp" style={{ height: 120 }} value={form.body} onChange={setF('body')} placeholder="Detailed message content..." /></div>
      </Modal>
    </div>
  );
}
