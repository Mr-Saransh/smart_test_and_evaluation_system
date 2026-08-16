import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, UPLOAD, DEL, toast } from '../../utils/api';
import { BookOpenIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { SkeletonTable } from '../../components/common/Skeleton';
import { formatDate } from '../../utils/helpers';

export function StudyMaterials() {
  const { institute } = useAuth();
  const [batches, setBatches] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', subject: '', batch_id: '', type: 'document', url: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!institute) return;
    Promise.all([
      GET(`/materials/${institute.id}`),
      GET(`/batches/${institute.id}`)
    ]).then(([m, b]) => { setItems(m); setBatches(b); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [institute]);

  const setF = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const save = async () => {
    if (!form.title || !form.batch_id) { toast('Title and Batch are required'); return; }
    if (form.type === 'document' && !file) { toast('Please select a file to upload'); return; }
    if ((form.type === 'video' || form.type === 'link') && !form.url) { toast('Please provide a URL'); return; }
    
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('institute_id', institute.id);
      fd.append('title', form.title);
      fd.append('subject', form.subject);
      fd.append('batch_id', form.batch_id);
      fd.append('type', form.type);
      if (form.url) fd.append('url', form.url);
      if (file) fd.append('file', file);

      await UPLOAD('/materials', fd, 'Material uploaded');
      setShowForm(false);
      setFile(null);
      load();
    } catch { /* */ }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this material?')) return;
    await DEL(`/materials/${id}`, 'Material deleted');
    load();
  };

  if (!institute) return <EmptyState icon={BookOpenIcon} title="Set up your institute first" />;

  const typeIcons = { document: '📄', video: '🎥', link: '🔗' };

  return (
    <div className="animate-fade-in">
      <div className="page-header page-header-row">
        <div><h1 className="h1">Study Materials</h1><p className="page-subtitle">Upload and share notes, videos, and links</p></div>
        <button className="btn bp" onClick={() => { setForm({ title: '', subject: '', batch_id: '', type: 'document', url: '' }); setFile(null); setShowForm(true); }}>
          + Add Material
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="tblwrap">
          {loading ? (
            <div style={{ padding: 20 }}><SkeletonTable /></div>
          ) : items.length === 0 ? (
            <EmptyState icon={BookOpenIcon} title="No Materials Yet" description="Share documents and links with your students." actionLabel="+ Add Material" onAction={() => setShowForm(true)} />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Title & Subject</th>
                  <th>Batch</th>
                  <th>Type</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{m.title}</div>
                      <div className="muted" style={{ fontSize: 13 }}>{m.subject || 'General'}</div>
                    </td>
                    <td><div style={{ fontSize: 13, fontWeight: 500 }}>{m.batch_name || 'All'}</div></td>
                    <td>
                      <span className="badge" style={{ background: 'var(--bg-tertiary)', textTransform: 'capitalize' }}>
                        {typeIcons[m.type]} {m.type}
                      </span>
                    </td>
                    <td><div className="muted" style={{ fontSize: 13 }}>{formatDate(m.created_at)}</div></td>
                    <td>
                      <div className="fx" style={{ gap: 8 }}>
                        {m.url && (
                          <a href={m.url} target="_blank" rel="noreferrer" className="btn bs bsm">Open</a>
                        )}
                        <button className="btn bd bsm" onClick={() => remove(m.id)}>Del</button>
                      </div>
                    </td>
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
        title="Add Study Material"
        footer={
          <>
            <button className="btn bs" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn bp" onClick={save} disabled={saving}>
              {saving ? 'Uploading...' : 'Save Material'}
            </button>
          </>
        }
      >
        <div className="field">
          <label>Material Type *</label>
          <div className="fx fw" style={{ gap: 8 }}>
            {['document', 'video', 'link'].map(t => (
              <button 
                key={t} 
                type="button"
                className="btn bs" 
                style={{ flex: 1, textTransform: 'capitalize', background: form.type === t ? 'var(--color-primary)' : '', color: form.type === t ? '#fff' : '', borderColor: form.type === t ? 'var(--color-primary)' : '' }}
                onClick={() => setForm({ ...form, type: t, url: '' })}
              >
                {typeIcons[t]} {t}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Assign to Batch *</label>
          <select className="sel w-full" value={form.batch_id} onChange={setF('batch_id')}>
            <option value="">Select Batch</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div className="field"><label>Title *</label><input className="inp" value={form.title} onChange={setF('title')} placeholder="e.g. Chapter 1 Notes" autoFocus /></div>
        <div className="field"><label>Subject</label><input className="inp" value={form.subject} onChange={setF('subject')} placeholder="e.g. Physics" /></div>

        {form.type === 'document' ? (
          <div className="field">
            <label>File Upload (PDF, DOCX, ZIP) *</label>
            <input className="inp" type="file" onChange={e => setFile(e.target.files[0])} accept=".pdf,.doc,.docx,.zip,.jpg,.png" />
          </div>
        ) : (
          <div className="field">
            <label>{form.type === 'video' ? 'Video URL (YouTube, Drive)' : 'Web URL'} *</label>
            <input className="inp" value={form.url} onChange={setF('url')} placeholder="https://..." />
          </div>
        )}
      </Modal>
    </div>
  );
}
