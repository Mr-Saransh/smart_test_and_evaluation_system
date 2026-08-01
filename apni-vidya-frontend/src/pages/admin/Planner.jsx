import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, DEL, toast } from '../../utils/api';
import { CalendarIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate } from '../../utils/helpers';

export function Planner() {
  const { institute } = useAuth();
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', date: '', type: 'lecture' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (institute) {
      GET(`/batches/${institute.id}`).then(b => {
        setBatches(b);
        if (b.length > 0) setBatchId(b[0].id);
      }).catch(() => {});
    }
  }, [institute]);

  useEffect(() => {
    if (!batchId) { setItems([]); return; }
    setLoading(true);
    GET(`/planner/${batchId}`)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [batchId]);

  const setF = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const saveItem = async () => {
    if (!form.title || !form.date) { toast('Title and date are required'); return; }
    setSaving(true);
    try {
      await POST('/planner', { ...form, institute_id: institute.id, batch_id: batchId }, 'Planner item added');
      setShowForm(false);
      const res = await GET(`/planner/${batchId}`);
      setItems(res);
    } catch { /* */ }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this plan item?')) return;
    await DEL(`/planner/${id}`, 'Item removed');
    const res = await GET(`/planner/${batchId}`);
    setItems(res);
  };

  if (!institute) return <EmptyState icon={CalendarIcon} title="Set up your institute first" />;

  const typeColors = {
    lecture: { bg: '#e0e7ff', fg: '#4f46e5' },
    test: { bg: '#fee2e2', fg: '#ef4444' },
    holiday: { bg: '#d1fae5', fg: '#10b981' },
    event: { bg: '#fef3c7', fg: '#f59e0b' }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header page-header-row">
        <div><h1 className="h1">Academic Planner</h1><p className="page-subtitle">Syllabus planning and important dates</p></div>
        <button className="btn bp" onClick={() => { setForm({ title: '', description: '', date: '', type: 'lecture' }); setShowForm(true); }} disabled={!batchId}>
          + Add Plan Item
        </button>
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 24 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Select Batch to View Plan</label>
        <select className="sel" value={batchId} onChange={e => setBatchId(e.target.value)} style={{ minWidth: 300 }}>
          {batches.length === 0 && <option value="">No batches found</option>}
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="g3">{[1,2].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 8 }} />)}</div>
      ) : !batchId ? (
        <EmptyState icon={CalendarIcon} title="Select a Batch" description="Choose a batch to view and manage its academic planner." />
      ) : items.length === 0 ? (
        <EmptyState icon={CalendarIcon} title="No Plan Found" description="Start adding syllabus topics, tests, or holidays." actionLabel="+ Add Item" onAction={() => setShowForm(true)} />
      ) : (
        <div className="timeline">
          {items.map(item => (
            <div key={item.id} className="timeline-item fx" style={{ gap: 20, marginBottom: 24 }}>
              <div style={{ width: 100, flexShrink: 0, textAlign: 'right', fontWeight: 600, fontSize: 14 }}>
                {formatDate(item.date)}
              </div>
              <div style={{ width: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: typeColors[item.type]?.fg || '#94a3b8', zIndex: 2 }} />
                <div style={{ width: 2, background: 'var(--border-color)', position: 'absolute', top: 12, bottom: -24, zIndex: 1 }} />
              </div>
              <div className="card" style={{ flex: 1, padding: 16, marginTop: -8 }}>
                <div className="fxb" style={{ marginBottom: 8 }}>
                  <div className="fx" style={{ gap: 12 }}>
                    <h3 className="h3" style={{ marginBottom: 0 }}>{item.title}</h3>
                    <span className="badge" style={{ background: typeColors[item.type]?.bg, color: typeColors[item.type]?.fg, textTransform: 'capitalize' }}>{item.type}</span>
                  </div>
                  <button className="btn bd bsm" onClick={() => remove(item.id)}>Del</button>
                </div>
                {item.description && <p className="muted" style={{ fontSize: 13 }}>{item.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Plan Item</h2>
              <button className="btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            
            <div className="field">
              <label>Type *</label>
              <select className="sel w-full" value={form.type} onChange={setF('type')}>
                <option value="lecture">Lecture / Topic</option>
                <option value="test">Test / Exam</option>
                <option value="event">Event / Activity</option>
                <option value="holiday">Holiday</option>
              </select>
            </div>

            <div className="field"><label>Date *</label><input className="inp" type="date" value={form.date} onChange={setF('date')} /></div>
            <div className="field"><label>Title *</label><input className="inp" value={form.title} onChange={setF('title')} placeholder="e.g. Chapter 1: Kinematics" /></div>
            <div className="field"><label>Description</label><textarea className="inp" value={form.description} onChange={setF('description')} placeholder="Notes or syllabus details" /></div>

            <div className="modal-footer">
              <button className="btn bs" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn bp" onClick={saveItem} disabled={saving}>{saving ? 'Saving...' : 'Add Item'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
