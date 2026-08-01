import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, PUT, DEL, toast, POST } from '../../utils/api';
import { UsersIcon, SearchIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/Skeleton';
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
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', password: '', parent_name: '', parent_phone: '', batch_id: '', roll_number: '' });
  const [saving, setSaving] = useState(false);

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
  const openCreate = () => { setEditing(null); setForm({ full_name: '', phone: '', email: '', password: '', parent_name: '', parent_phone: '', batch_id: '', roll_number: '' }); setShow(true); };
  const openEdit = (s) => { 
    setEditing(s); 
    setForm({ 
      full_name: s.full_name, phone: s.phone, email: s.email || '', password: '', 
      parent_name: s.parent_name || '', parent_phone: s.parent_phone || '', 
      batch_id: s.batch_id || '', roll_number: s.roll_number || '' 
    }); 
    setShow(true); 
  };

  const save = async () => {
    if (!form.full_name || !form.phone || (!editing && !form.password)) {
      toast('Name, phone, and password are required'); return;
    }
    setSaving(true);
    try {
      const body = { ...form, institute_id: institute.id };
      if (!body.password) delete body.password;
      
      if (editing) await PUT(`/students/${editing.id}`, body, 'Student updated');
      else await POST('/students', body, 'Student created');
      
      setShow(false); load();
    } catch { /* */ }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this student? This will remove all their records (attendance, tests, fees).')) return;
    await DEL(`/students/${id}`, 'Student deleted'); load();
  };

  if (!institute) return <EmptyState icon={UsersIcon} title="Set up your institute first" />;

  return (
    <div className="animate-fade-in">
      <div className="page-header page-header-row">
        <div><h1 className="h1">Students</h1><p className="page-subtitle">Manage enrolled students and parents</p></div>
        <button className="btn bp" onClick={openCreate}>+ Add Student</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div className="fxb" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 12 }}>
          <div className="search-bar" style={{ width: 300 }}>
            <SearchIcon size={16} color="var(--text-tertiary)" />
            <input className="search-inp" placeholder="Search by name, phone, roll no..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="sel" value={batchFilter} onChange={e => setBatchFilter(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">All Batches</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="tblwrap">
          {loading ? (
            <div style={{ padding: 20 }}><SkeletonTable rows={5} /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={UsersIcon} title="No Students Found" description="Try adjusting your filters or add a new student." />
          ) : (
            <table className="tbl">
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
                    <td>
                      <div className="fx" style={{ gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12, flexShrink: 0 }}>
                          {getInitials(s.full_name)}
                        </div>
                        <span style={{ fontWeight: 600 }}>{s.full_name}</span>
                      </div>
                    </td>
                    <td><div className="muted" style={{ fontSize: 13 }}>{s.phone}</div></td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{s.batch_name || 'No Batch'}</div>
                      {s.roll_number && <div className="muted" style={{ fontSize: 12 }}>Roll: {s.roll_number}</div>}
                    </td>
                    <td>
                      {s.parent_name ? (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{s.parent_name}</div>
                          <div className="muted" style={{ fontSize: 12 }}>{s.parent_phone}</div>
                        </>
                      ) : <span className="muted" style={{ fontSize: 13 }}>—</span>}
                    </td>
                    <td><div className="muted" style={{ fontSize: 13 }}>{formatDate(s.created_at)}</div></td>
                    <td>
                      <div className="fx" style={{ gap: 8 }}>
                        <button className="btn bs bsm" onClick={() => openEdit(s)}>Edit</button>
                        <button className="btn bd bsm" onClick={() => remove(s.id)}>Del</button>
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
              <h2>{editing ? 'Edit Student' : 'New Student'}</h2>
              <button className="btn-icon" onClick={() => setShow(false)}>✕</button>
            </div>
            
            <h3 className="h3" style={{ marginBottom: 12 }}>Student Details</h3>
            <div className="g2" style={{ marginBottom: 16 }}>
              <div className="field"><label>Full Name *</label><input className="inp" value={form.full_name} onChange={setF('full_name')} placeholder="Student name" /></div>
              <div className="field"><label>Phone Number *</label><input className="inp" type="tel" value={form.phone} onChange={setF('phone')} placeholder="10-digit number" /></div>
            </div>
            <div className="g3" style={{ marginBottom: 24 }}>
              <div className="field"><label>Batch</label>
                <select className="sel w-full" value={form.batch_id} onChange={setF('batch_id')}>
                  <option value="">None</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="field"><label>Roll Number</label><input className="inp" value={form.roll_number} onChange={setF('roll_number')} placeholder="Optional" /></div>
              <div className="field"><label>{editing ? 'New Password' : 'Password *'}</label><input className="inp" type="password" value={form.password} onChange={setF('password')} placeholder="Min 8 chars" /></div>
            </div>

            <h3 className="h3" style={{ marginBottom: 12, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>Parent/Guardian Details</h3>
            <div className="g2">
              <div className="field"><label>Parent Name</label><input className="inp" value={form.parent_name} onChange={setF('parent_name')} placeholder="Parent name" /></div>
              <div className="field"><label>Parent Phone</label><input className="inp" type="tel" value={form.parent_phone} onChange={setF('parent_phone')} placeholder="10-digit number (creates parent login)" /></div>
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
