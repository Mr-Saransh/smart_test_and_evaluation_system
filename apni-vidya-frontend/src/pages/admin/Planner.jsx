import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, DEL, toast } from '../../utils/api';
import { CalendarIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate } from '../../utils/helpers';
import { SkeletonCard } from '../../components/common/Skeleton';

export function Planner() {
  const { institute, user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', subject: '', link: '', due_date: '', type: 'lecture' });
  const [saving, setSaving] = useState(false);

  // RBAC
  const isAdmin = user?.role === 'institute_admin';
  const isTeacher = user?.role === 'teacher';
  // Admin is read-only for planner (can view progress). Teachers have full CRUD.
  const canEdit = isTeacher; 

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
    GET(`/planner/batch/${batchId}`)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [batchId]);

  const setF = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const saveItem = async () => {
    if (!form.title || !form.due_date) { toast('Title and date are required'); return; }
    setSaving(true);
    
    // We store type, subject, and link within the description to avoid DB schema changes.
    let fullDesc = '';
    if (form.type) fullDesc += `[Type: ${form.type}]\n`;
    if (form.subject) fullDesc += `[Subject: ${form.subject}]\n`;
    if (form.link) fullDesc += `[Link: ${form.link}]\n`;
    if (fullDesc) fullDesc += `\n`;
    fullDesc += form.description;

    try {
      await POST('/planner', { 
        title: form.title, 
        description: fullDesc.trim(), 
        due_date: form.due_date, 
        institute_id: institute.id, 
        batch_id: batchId 
      }, 'Planner item added');
      
      setShowForm(false);
      setForm({ title: '', description: '', subject: '', link: '', due_date: '', type: 'lecture' });
      const res = await GET(`/planner/batch/${batchId}`);
      setItems(res);
    } catch { /* toast handled */ }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this plan item?')) return;
    try {
      await DEL(`/planner/${id}`, 'Item removed');
      const res = await GET(`/planner/batch/${batchId}`);
      setItems(res);
    } catch { /* toast handled */ }
  };

  // Helper to extract metadata from description
  const parseDesc = (desc) => {
    if (!desc) return { text: '', type: 'lecture', subject: '', link: '' };
    let text = desc;
    const typeMatch = text.match(/\[Type: (.*?)\]\n?/);
    const subjMatch = text.match(/\[Subject: (.*?)\]\n?/);
    const linkMatch = text.match(/\[Link: (.*?)\]\n?/);
    
    if (typeMatch) text = text.replace(typeMatch[0], '');
    if (subjMatch) text = text.replace(subjMatch[0], '');
    if (linkMatch) text = text.replace(linkMatch[0], '');
    
    return {
      text: text.trim(),
      type: typeMatch ? typeMatch[1] : 'lecture',
      subject: subjMatch ? subjMatch[1] : '',
      link: linkMatch ? linkMatch[1] : ''
    };
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
        <div>
          <h1 className="h1">Academic Planner</h1>
          <p className="page-subtitle">
            {canEdit ? 'Manage syllabus and assignments' : 'View batch academic progress'}
          </p>
        </div>
        {canEdit && (
          <button className="btn bp" onClick={() => { setForm({ title: '', description: '', subject: '', link: '', due_date: '', type: 'lecture' }); setShowForm(true); }} disabled={!batchId}>
            + Add Plan Item
          </button>
        )}
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 24 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Select Batch to View Plan</label>
        <select className="sel" value={batchId} onChange={e => setBatchId(e.target.value)} style={{ minWidth: 300 }}>
          {batches.length === 0 && <option value="">No batches found</option>}
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="g3"><SkeletonCard height={120} /><SkeletonCard height={120} /></div>
      ) : !batchId ? (
        <EmptyState icon={CalendarIcon} title="Select a Batch" description="Choose a batch to view its academic planner." />
      ) : items.length === 0 ? (
        <EmptyState 
          icon={CalendarIcon} 
          title="No Plan Found" 
          description={canEdit ? "Start adding syllabus topics, assignments, or tests." : "No planner items have been added to this batch yet."} 
          actionLabel={canEdit ? "+ Add Item" : undefined} 
          onAction={canEdit ? () => setShowForm(true) : undefined} 
        />
      ) : (
        <div className="timeline">
          {items.map(item => {
            const meta = parseDesc(item.description);
            const tColor = typeColors[meta.type] || typeColors.lecture;
            
            return (
              <div key={item.id} className="timeline-item fx" style={{ gap: 20, marginBottom: 24 }}>
                <div style={{ width: 100, flexShrink: 0, textAlign: 'right', fontWeight: 600, fontSize: 14 }}>
                  {formatDate(item.due_date)}
                </div>
                <div style={{ width: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: tColor.fg, zIndex: 2 }} />
                  <div style={{ width: 2, background: 'var(--border-color)', position: 'absolute', top: 12, bottom: -24, zIndex: 1 }} />
                </div>
                <div className="card" style={{ flex: 1, padding: 16, marginTop: -8, transition: 'all 0.2s', borderLeft: `3px solid ${tColor.fg}` }}>
                  <div className="fxb" style={{ marginBottom: 8 }}>
                    <div className="fx" style={{ gap: 12, flexWrap: 'wrap' }}>
                      <h3 className="h3" style={{ marginBottom: 0 }}>{item.title}</h3>
                      <span className="badge" style={{ background: tColor.bg, color: tColor.fg, textTransform: 'capitalize' }}>{meta.type}</span>
                      {meta.subject && <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>📚 {meta.subject}</span>}
                    </div>
                    {canEdit && <button className="btn bd bsm" onClick={() => remove(item.id)}>Del</button>}
                  </div>
                  
                  {meta.text && <p className="muted" style={{ fontSize: 13, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{meta.text}</p>}
                  
                  <div className="fxb" style={{ marginTop: 12, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      <span style={{ color: item.completed_count > 0 ? 'var(--color-success)' : 'inherit' }}>
                        ✓ {item.completed_count || 0} students completed
                      </span>
                    </div>
                    {meta.link && (
                      <a href={meta.link.startsWith('http') ? meta.link : `https://${meta.link}`} target="_blank" rel="noreferrer" 
                         className="btn bsm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                        🔗 Open Material
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Plan Item</h2>
              <button className="btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            
            <div className="g2">
              <div className="field">
                <label>Type *</label>
                <select className="sel w-full" value={form.type} onChange={setF('type')}>
                  <option value="lecture">Lecture / Topic</option>
                  <option value="test">Test / Exam</option>
                  <option value="event">Event / Activity</option>
                  <option value="holiday">Holiday</option>
                </select>
              </div>
              <div className="field"><label>Due Date / Date *</label><input className="inp" type="date" value={form.due_date} onChange={setF('due_date')} /></div>
            </div>

            <div className="g2">
              <div className="field"><label>Subject (Optional)</label><input className="inp" value={form.subject} onChange={setF('subject')} placeholder="e.g. Physics" /></div>
              <div className="field"><label>Material Link (Optional)</label><input className="inp" value={form.link} onChange={setF('link')} placeholder="https://..." /></div>
            </div>

            <div className="field"><label>Title *</label><input className="inp" value={form.title} onChange={setF('title')} placeholder="e.g. Chapter 1: Kinematics" /></div>
            <div className="field"><label>Description</label><textarea className="inp" value={form.description} onChange={setF('description')} placeholder="Notes, homework instructions, or syllabus details" rows={3} /></div>

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
