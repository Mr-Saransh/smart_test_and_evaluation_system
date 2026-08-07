import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, PUT, DEL, toast, POST } from '../../utils/api';
import { UsersIcon, SearchIcon, CopyIcon, CheckCircleIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonTable, SkeletonCard } from '../../components/common/Skeleton';
import { getInitials, formatDate } from '../../utils/helpers';
import { useDebounce } from '../../hooks/useDebounce';

export function Students() {
  const { institute } = useAuth();
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', parent_name: '', parent_phone: '', batch_id: '', roll_number: '' });
  const [saving, setSaving] = useState(false);

  const [showCreds, setShowCreds] = useState(false);
  const [creds, setCreds] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = () => {
    if (!institute) return;
    Promise.all([
      GET(`/students/${institute.id}`),
      GET(`/batches/${institute.id}`)
    ]).then(([s, b]) => { setItems(s); setBatches(b); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [institute]);

  const filtered = useMemo(() => {
    return items.filter(s => {
      const matchSearch = !debouncedSearch || 
        s.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
        s.phone?.includes(debouncedSearch) ||
        s.roll_number?.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchBatch = !batchFilter || s.batch_id === batchFilter;
      return matchSearch && matchBatch;
    });
  }, [items, debouncedSearch, batchFilter]);

  const setF = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));
  const openCreate = () => { setEditing(null); setForm({ full_name: '', phone: '', email: '', parent_name: '', parent_phone: '', batch_id: '', roll_number: '' }); setShow(true); };
  const openEdit = (s) => { 
    setEditing(s); 
    setForm({ 
      full_name: s.full_name, phone: s.phone, email: s.email || '', 
      parent_name: s.parent_name || '', parent_phone: s.parent_phone || '', 
      batch_id: s.batch_id || '', roll_number: s.roll_number || '' 
    }); 
    setShow(true); 
  };

  const save = async () => {
    if (!form.full_name || !form.phone || !form.batch_id) {
      toast('Name, phone, and batch are required'); return;
    }
    setSaving(true);
    try {
      const body = { ...form, institute_id: institute.id };
      
      if (editing) {
        await PUT(`/students/${editing.id}`, body, 'Student updated');
        setShow(false); 
        load();
      } else {
        const res = await POST('/students', body, 'Student created successfully');
        setShow(false); 
        load();
        if (res.credentials) {
          setCreds(res);
          setShowCreds(true);
        }
      }
    } catch { /* */ }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this student? This will remove all their records (attendance, tests, fees).')) return;
    await DEL(`/students/${id}`, 'Student deleted'); load();
  };

  const copyCreds = () => {
    if (!creds) return;
    const text = `Apni Vidya 2.0 Credentials\n\nStudent Login:\nPhone: ${creds.credentials.student.phone}\nPassword: ${creds.credentials.student.temp_password}\n\n${creds.credentials.parent ? `Parent Login:\nPhone: ${creds.credentials.parent.phone}\nPassword: ${creds.credentials.parent.temp_password}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!institute) return <EmptyState icon={UsersIcon} title="Set up your institute first" />;

  return (
    <div className="animate-fade-in">
      <div className="page-header page-header-row">
        <div><h1 className="h1">Students</h1><p className="page-subtitle">Manage enrolled students and automatically generate credentials</p></div>
        <button className="btn bp" onClick={openCreate}>+ Add Student</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div className="fxb" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 12, background: 'var(--bg-tertiary)' }}>
          <div className="search-bar" style={{ width: 300, background: 'var(--bg-primary)' }}>
            <SearchIcon size={16} color="var(--text-tertiary)" />
            <input className="search-inp" placeholder="Search by name, phone, roll no..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="sel" value={batchFilter} onChange={e => setBatchFilter(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">All Batches</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        {/* Data Grid */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 20 }}><SkeletonTable rows={8} /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={UsersIcon} title="No Students Found" description="Try adjusting your filters or add a new student." />
          ) : (
            <table className="data-grid">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Contact</th>
                  <th>Batch & Roll No</th>
                  <th>Parent Details</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td data-label="Student Name">
                      <div className="fx" style={{ gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {getInitials(s.full_name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.full_name}</div>
                          {s.email && <div className="muted" style={{ fontSize: 12 }}>{s.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td data-label="Contact"><div className="muted" style={{ fontSize: 13, fontWeight: 500 }}>{s.phone}</div></td>
                    <td data-label="Batch & Roll No">
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.batch_name || 'No Batch'}</div>
                      {s.roll_number && <div className="muted" style={{ fontSize: 12 }}>Roll: {s.roll_number}</div>}
                    </td>
                    <td data-label="Parent Details">
                      {s.parent_name ? (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{s.parent_name}</div>
                          <div className="muted" style={{ fontSize: 12 }}>{s.parent_phone}</div>
                        </>
                      ) : <span className="muted" style={{ fontSize: 13 }}>—</span>}
                    </td>
                    <td data-label="Joined"><div className="muted" style={{ fontSize: 13 }}>{formatDate(s.created_at)}</div></td>
                    <td data-label="Actions">
                      <div className="fx" style={{ gap: 8 }}>
                        <button className="btn bs bsm" onClick={() => openEdit(s)}>Edit</button>
                        <button className="btn bd bsm" style={{ color: 'var(--color-error)' }} onClick={() => remove(s.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Student' : 'Onboard New Student'}</h2>
              <button className="btn-icon" onClick={() => setShow(false)}>✕</button>
            </div>
            
            <div style={{ padding: '12px 16px', background: 'var(--color-primary-bg)', borderRadius: 8, marginBottom: 24, border: '1px solid var(--color-primary-light)' }}>
              <span style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 500 }}>
                💡 {editing ? 'Editing details will not change their password.' : 'System will automatically generate secure login credentials for the student and parent upon creation.'}
              </span>
            </div>

            <div className="g2" style={{ marginBottom: 16 }}>
              <div className="field">
                <label>Assign to Batch *</label>
                <select className="sel w-full" value={form.batch_id} onChange={setF('batch_id')}>
                  <option value="">— Select Batch —</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="field"><label>Roll Number (Optional)</label><input className="inp" value={form.roll_number} onChange={setF('roll_number')} placeholder="e.g. 101" /></div>
            </div>

            <h3 className="h4" style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>Student Details</h3>
            <div className="g3" style={{ marginBottom: 24 }}>
              <div className="field"><label>Full Name *</label><input className="inp" value={form.full_name} onChange={setF('full_name')} placeholder="Student name" /></div>
              <div className="field"><label>Phone Number *</label><input className="inp" type="tel" value={form.phone} onChange={setF('phone')} placeholder="10-digit number" /></div>
              <div className="field"><label>Email Address</label><input className="inp" type="email" value={form.email} onChange={setF('email')} placeholder="student@example.com" /></div>
            </div>

            <h3 className="h4" style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>Parent/Guardian Details</h3>
            <div className="g2">
              <div className="field"><label>Parent Name</label><input className="inp" value={form.parent_name} onChange={setF('parent_name')} placeholder="Parent name" /></div>
              <div className="field"><label>Parent Phone</label><input className="inp" type="tel" value={form.parent_phone} onChange={setF('parent_phone')} placeholder="10-digit number (creates parent login)" /></div>
            </div>
            
            <div className="modal-footer">
              <button className="btn bs" onClick={() => setShow(false)}>Cancel</button>
              <button className="btn bp" onClick={save} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Generate & Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Credentials Modal */}
      {showCreds && creds && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, background: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <CheckCircleIcon size={32} />
              </div>
              <h2 className="h2">Student Onboarded!</h2>
              <p className="muted" style={{ fontSize: 14 }}>Credentials generated successfully. Share these with the student.</p>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, marginBottom: 24, border: '1px solid var(--border-color)', position: 'relative' }}>
              <button className="btn bs bsm" onClick={copyCreds} style={{ position: 'absolute', top: 12, right: 12 }}>
                {copied ? 'Copied!' : <><CopyIcon size={14} style={{ marginRight: 6 }}/> Copy All</>}
              </button>

              <h3 className="h4" style={{ marginBottom: 12 }}>🧑‍🎓 Student Login</h3>
              <div className="fxb" style={{ marginBottom: 8 }}><span className="muted">Phone / Username:</span><strong style={{ userSelect: 'all' }}>{creds.credentials.student.phone}</strong></div>
              <div className="fxb" style={{ marginBottom: 16 }}><span className="muted">Temporary Password:</span><strong style={{ userSelect: 'all', color: 'var(--color-primary)' }}>{creds.credentials.student.temp_password}</strong></div>

              {creds.credentials.parent && (
                <>
                  <div style={{ height: 1, background: 'var(--border-color)', margin: '16px 0' }} />
                  <h3 className="h4" style={{ marginBottom: 12 }}>👨‍👩‍👦 Parent Login</h3>
                  <div className="fxb" style={{ marginBottom: 8 }}><span className="muted">Phone / Username:</span><strong style={{ userSelect: 'all' }}>{creds.credentials.parent.phone}</strong></div>
                  <div className="fxb"><span className="muted">Temporary Password:</span><strong style={{ userSelect: 'all', color: 'var(--color-primary)' }}>{creds.credentials.parent.temp_password}</strong></div>
                </>
              )}
            </div>

            <button className="btn bp w-full" style={{ justifyContent: 'center' }} onClick={() => setShowCreds(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
