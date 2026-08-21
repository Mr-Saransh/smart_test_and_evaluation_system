import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, PUT, DEL, toast, POST } from '../../utils/api';
import { UsersIcon, SearchIcon, CopyIcon, CheckCircleIcon, PlusIcon, CloseIcon, DownloadIcon, AlertTriangleIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { SkeletonTable } from '../../components/common/Skeleton';
import { getInitials, formatDate } from '../../utils/helpers';
import { useDebounce } from '../../hooks/useDebounce';
import { StudentReportCardModal } from '../../components/dashboard/StudentReportCardModal';
import * as XLSX from 'xlsx';

export function Students() {
  const { institute } = useAuth();
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Admission modal state
  const [showAdmission, setShowAdmission] = useState(false);
  const [admissionMode, setAdmissionMode] = useState('bulk'); // 'bulk' | 'manual'
  const [admBatchId, setAdmBatchId] = useState('');
  const [admEmails, setAdmEmails] = useState(['']);
  const [admFile, setAdmFile] = useState(null);
  const [admParsedEmails, setAdmParsedEmails] = useState([]);
  const [admitting, setAdmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Results modal
  const [showResults, setShowResults] = useState(false);
  const [admissionResults, setAdmissionResults] = useState(null);

  // Edit modal (kept from original)
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', email: '', parent_name: '', parent_phone: '', batch_id: '', roll_number: '' });
  const [saving, setSaving] = useState(false);
  const [selectedReportStudentId, setSelectedReportStudentId] = useState(null);

  // Profile status view
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'status'
  const [profileStatus, setProfileStatus] = useState([]);
  const [statusLoading, setStatusLoading] = useState(false);

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

  const loadProfileStatus = () => {
    if (!institute) return;
    setStatusLoading(true);
    GET(`/students/profile-status/${institute.id}`)
      .then(setProfileStatus)
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'status') loadProfileStatus();
  }, [activeTab, institute]);

  const filtered = useMemo(() => {
    return items.filter(s => {
      const matchSearch = !debouncedSearch ||
        s.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        s.phone?.includes(debouncedSearch) ||
        s.email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        s.roll_number?.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchBatch = !batchFilter || s.batch_id === batchFilter;
      return matchSearch && matchBatch;
    });
  }, [items, debouncedSearch, batchFilter]);

  // ─── Admission Handlers ───
  const openAdmission = (mode) => {
    setAdmissionMode(mode);
    setAdmBatchId('');
    setAdmEmails(['']);
    setAdmFile(null);
    setAdmParsedEmails([]);
    setShowAdmission(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAdmFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Extract emails from all rows, first column
        const emails = [];
        for (const row of data) {
          const cell = String(row[0] || '').trim().toLowerCase();
          if (cell && cell.includes('@') && cell !== 'email') {
            emails.push(cell);
          }
        }
        setAdmParsedEmails([...new Set(emails)]); // deduplicate
      } catch {
        toast('Failed to parse the file. Please upload a valid Excel/CSV file.');
        setAdmFile(null);
        setAdmParsedEmails([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const addManualEmail = () => setAdmEmails(prev => [...prev, '']);
  const removeManualEmail = (idx) => setAdmEmails(prev => prev.filter((_, i) => i !== idx));
  const setManualEmail = (idx, val) => setAdmEmails(prev => prev.map((e, i) => i === idx ? val : e));

  const submitAdmission = async () => {
    if (!admBatchId) { toast('Please select a batch'); return; }

    const emailList = admissionMode === 'bulk'
      ? admParsedEmails
      : admEmails.map(e => e.trim()).filter(e => e);

    if (emailList.length === 0) {
      toast(admissionMode === 'bulk' ? 'No emails found in the file' : 'Please enter at least one email');
      return;
    }

    setAdmitting(true);
    try {
      const res = await POST('/students/bulk-admit', {
        institute_id: institute.id,
        batch_id: admBatchId,
        emails: emailList,
      });

      toast(`${res.summary?.created || 0} student(s) admitted successfully`, 'success');
      setAdmissionResults(res);
      setShowAdmission(false);
      setShowResults(true);
      load();
    } catch { /* error already toasted */ }
    setAdmitting(false);
  };

  // ─── Edit Handlers (from original) ───
  const setEF = (k) => (e) => setEditForm(prev => ({ ...prev, [k]: e.target.value }));
  const openEdit = (s) => {
    setEditing(s);
    setEditForm({
      full_name: s.full_name, phone: s.phone, email: s.email || '',
      parent_name: s.parent_name || '', parent_phone: s.parent_phone || '',
      batch_id: s.batch_id || '', roll_number: s.roll_number || ''
    });
    setShowEdit(true);
  };

  const saveEdit = async () => {
    if (!editForm.full_name || !editForm.batch_id) { toast('Name and batch are required'); return; }
    setSaving(true);
    try {
      await PUT(`/students/${editing.id}`, { ...editForm, institute_id: institute.id }, 'Student updated');
      setShowEdit(false);
      load();
    } catch { /* */ }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this student? This will remove all their records (attendance, tests, fees).')) return;
    await DEL(`/students/${id}`, 'Student deleted'); load();
  };

  if (!institute) return <EmptyState icon={UsersIcon} title="Set up your institute first" />;

  // ─── Render ───
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header page-header-row">
        <div>
          <h1 className="h1">Students</h1>
          <p className="page-subtitle">Manage admissions, enrolled students & profile status</p>
        </div>
        <div className="fx" style={{ gap: 10, flexWrap: 'wrap' }}>
          <button className="btn bs" onClick={() => openAdmission('manual')} style={{ fontWeight: 600 }}>
            <PlusIcon size={16} style={{ marginRight: 4 }} /> Individual
          </button>
          <button className="btn bp" onClick={() => openAdmission('bulk')}>
            <DownloadIcon size={16} style={{ marginRight: 4 }} /> Bulk Admission
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="fx" style={{ gap: 4, marginBottom: 20, background: 'var(--bg-tertiary)', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {[
          { key: 'students', label: 'All Students', count: items.length },
          { key: 'status', label: 'ID & Profile Status' },
        ].map(tab => (
          <button
            key={tab.key}
            className="btn"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              background: activeTab === tab.key ? '#fff' : 'transparent',
              color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === tab.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {tab.label} {tab.count !== undefined && <span style={{ opacity: 0.6, marginLeft: 4 }}>({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* ─── Tab: Students List ─── */}
      {activeTab === 'students' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Toolbar */}
          <div className="fxb" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 12, background: 'var(--bg-tertiary)' }}>
            <div className="search-bar" style={{ width: 300, background: 'var(--bg-primary)' }}>
              <SearchIcon size={16} color="var(--text-tertiary)" />
              <input className="search-inp" placeholder="Search by name, email, phone..." value={search} onChange={e => setSearch(e.target.value)} />
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
              <EmptyState icon={UsersIcon} title="No Students Found" description="Try adjusting your filters or admit new students." />
            ) : (
              <table className="data-grid">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Contact</th>
                    <th>Batch & Roll No</th>
                    <th>Profile Status</th>
                    <th>Parent</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id}>
                      <td data-label="Student">
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
                      <td data-label="Contact">
                        <div className="muted" style={{ fontSize: 13, fontWeight: 500 }}>
                          {s.phone?.startsWith('TMP') ? <span style={{ color: 'var(--color-warning)', fontSize: 12 }}>Pending setup</span> : s.phone}
                        </div>
                      </td>
                      <td data-label="Batch & Roll No">
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.batch_name || 'No Batch'}</div>
                        {s.roll_number && <div className="muted" style={{ fontSize: 12 }}>Roll: {s.roll_number}</div>}
                      </td>
                      <td data-label="Profile Status">
                        {s.profile_completed ? (
                          <span className="fx" style={{ gap: 4, color: 'var(--color-success)', fontWeight: 600, fontSize: 13 }}>
                            <CheckCircleIcon size={15} /> Complete
                          </span>
                        ) : (
                          <span className="fx" style={{ gap: 4, color: 'var(--color-warning)', fontWeight: 600, fontSize: 13 }}>
                            <AlertTriangleIcon size={15} /> Pending
                          </span>
                        )}
                      </td>
                      <td data-label="Parent">
                        {s.parent_name ? (
                          <>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{s.parent_name}</div>
                            <div className="muted" style={{ fontSize: 12 }}>{s.parent_phone}</div>
                          </>
                        ) : <span className="muted" style={{ fontSize: 13 }}>—</span>}
                      </td>
                      <td data-label="Joined"><div className="muted" style={{ fontSize: 13 }}>{formatDate(s.created_at)}</div></td>
                      <td data-label="Actions">
                        <div className="fx" style={{ gap: 6 }}>
                          <button className="btn bp bsm" onClick={() => setSelectedReportStudentId(s.id)}>Report</button>
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
      )}

      {/* ─── Tab: ID & Profile Status ─── */}
      {activeTab === 'status' && (
        <div>
          {statusLoading ? (
            <div style={{ padding: 20 }}><SkeletonTable rows={6} /></div>
          ) : profileStatus.length === 0 ? (
            <EmptyState icon={UsersIcon} title="No Students Yet" description="Admit students to see their profile status here." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {profileStatus.map(batch => (
                <div key={batch.batch_id || 'unassigned'} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Batch Header */}
                  <div className="fxb" style={{ padding: '16px 20px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <h3 className="h3" style={{ margin: 0 }}>{batch.batch_name}</h3>
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{batch.total} student{batch.total !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="fx" style={{ gap: 16 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-success)' }}>{batch.completed}</div>
                        <div className="muted" style={{ fontSize: 11, fontWeight: 600 }}>Complete</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-warning)' }}>{batch.pending}</div>
                        <div className="muted" style={{ fontSize: 11, fontWeight: 600 }}>Pending</div>
                      </div>
                    </div>
                  </div>
                  {/* Student Rows */}
                  <table className="data-grid">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Profile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.students.map(s => (
                        <tr key={s.id}>
                          <td data-label="Email">
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{s.email || '—'}</span>
                          </td>
                          <td data-label="Name">
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{s.full_name || '—'}</span>
                          </td>
                          <td data-label="Phone">
                            <span className="muted" style={{ fontSize: 13 }}>
                              {s.phone?.startsWith('TMP') ? '—' : (s.phone || '—')}
                            </span>
                          </td>
                          <td data-label="Profile">
                            {s.profile_completed ? (
                              <span className="badge" style={{ background: '#d1fae5', color: '#059669', fontWeight: 600 }}>✅ Complete</span>
                            ) : (
                              <span className="badge" style={{ background: '#fef3c7', color: '#d97706', fontWeight: 600 }}>⏳ Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Admission Modal ─── */}
      <Modal
        isOpen={showAdmission}
        onClose={() => setShowAdmission(false)}
        title={admissionMode === 'bulk' ? 'Bulk Student Admission' : 'Individual Admission'}
        className="modal-lg"
        footer={
          <>
            <button className="btn bs" onClick={() => setShowAdmission(false)}>Cancel</button>
            <button className="btn bp" onClick={submitAdmission} disabled={admitting}>
              {admitting ? 'Processing...' : `Admit ${admissionMode === 'bulk' ? admParsedEmails.length : admEmails.filter(e => e.trim()).length} Student(s)`}
            </button>
          </>
        }
      >
        {/* Batch Selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Select Batch <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <select className="sel w-full" value={admBatchId} onChange={e => setAdmBatchId(e.target.value)}>
            <option value="">— Choose Batch —</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        {/* Mode toggle inside modal */}
        <div className="fx" style={{ gap: 4, marginBottom: 20, background: 'var(--bg-tertiary)', padding: 3, borderRadius: 10, width: '100%' }}>
          {['bulk', 'manual'].map(m => (
            <button
              key={m}
              className="btn"
              onClick={() => { setAdmissionMode(m); setAdmParsedEmails([]); setAdmFile(null); setAdmEmails(['']); }}
              style={{
                flex: 1,
                padding: '8px 14px',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                background: admissionMode === m ? '#fff' : 'transparent',
                color: admissionMode === m ? 'var(--color-primary)' : 'var(--text-secondary)',
                boxShadow: admissionMode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center',
              }}
            >
              {m === 'bulk' ? '📄 Excel Upload' : '✏️ Manual Entry'}
            </button>
          ))}
        </div>

        {/* Bulk: File Upload */}
        {admissionMode === 'bulk' && (
          <div>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: 12,
                padding: '28px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--bg-secondary)',
                transition: 'border-color 0.2s, background 0.2s',
                marginBottom: 16,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-primary-bg)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, marginBottom: 4 }}>
                {admFile ? admFile.name : 'Click to upload Excel / CSV file'}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                The first column should contain student email addresses
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </div>

            {/* Parsed Emails Preview */}
            {admParsedEmails.length > 0 && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 14, border: '1px solid var(--border-color)' }}>
                <div className="fxb" style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-success)' }}>
                    ✅ {admParsedEmails.length} email{admParsedEmails.length !== 1 ? 's' : ''} found
                  </span>
                  <button className="btn bd bsm" onClick={() => { setAdmFile(null); setAdmParsedEmails([]); if (fileInputRef.current) fileInputRef.current.value = ''; }}>Clear</button>
                </div>
                <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {admParsedEmails.map((email, i) => (
                    <div key={i} style={{ fontSize: 13, padding: '5px 10px', background: '#fff', borderRadius: 6, color: 'var(--text-primary)', fontWeight: 500 }}>
                      {email}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual: Email Fields */}
        {admissionMode === 'manual' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
              {admEmails.map((email, idx) => (
                <div key={idx} className="fx" style={{ gap: 8 }}>
                  <input
                    className="inp"
                    type="email"
                    value={email}
                    onChange={e => setManualEmail(idx, e.target.value)}
                    placeholder={`student${idx + 1}@example.com`}
                    style={{ flex: 1 }}
                    autoFocus={idx === admEmails.length - 1}
                  />
                  {admEmails.length > 1 && (
                    <button
                      className="btn bd bsm"
                      onClick={() => removeManualEmail(idx)}
                      style={{ color: 'var(--color-error)', padding: '8px 10px', flexShrink: 0 }}
                      title="Remove"
                    >
                      <CloseIcon size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button className="btn bs bsm" onClick={addManualEmail} style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed' }}>
              <PlusIcon size={14} style={{ marginRight: 4 }} /> Add Another Email
            </button>
          </div>
        )}

        {/* Info Banner */}
        <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--color-primary-bg)', borderRadius: 10, border: '1px solid var(--color-primary-light)' }}>
          <span style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 500 }}>
            💡 A temporary password will be auto-generated and sent to each email. Students must set their own password and complete their profile on first login.
          </span>
        </div>
      </Modal>

      {/* ─── Admission Results Modal ─── */}
      <Modal
        isOpen={Boolean(showResults && admissionResults)}
        onClose={() => setShowResults(false)}
        title="Admission Results"
        maxWidth={520}
        footer={
          <button className="btn bp w-full" style={{ justifyContent: 'center' }} onClick={() => setShowResults(false)}>Done</button>
        }
      >
        {admissionResults && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, background: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <CheckCircleIcon size={32} />
              </div>
              <h2 className="h2">Admission Complete</h2>
              <p className="muted" style={{ fontSize: 14 }}>Credentials have been emailed to each student automatically.</p>
            </div>

            {/* Summary Cards */}
            <div className="fx" style={{ gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Created', val: admissionResults.summary.created, color: 'var(--color-success)', bg: '#d1fae5' },
                { label: 'Skipped', val: admissionResults.summary.skipped, color: '#d97706', bg: '#fef3c7' },
                { label: 'Failed', val: admissionResults.summary.failed, color: 'var(--color-error)', bg: '#fee2e2' },
              ].map(c => (
                <div key={c.label} style={{ flex: 1, textAlign: 'center', padding: '14px 10px', borderRadius: 10, background: c.bg }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.val}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: c.color, opacity: 0.85 }}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Detail rows */}
            {admissionResults.results?.length > 0 && (
              <div style={{ maxHeight: 240, overflowY: 'auto', background: 'var(--bg-secondary)', borderRadius: 10, padding: 10, border: '1px solid var(--border-color)' }}>
                {admissionResults.results.map((r, i) => (
                  <div key={i} className="fxb" style={{ padding: '8px 10px', borderBottom: i < admissionResults.results.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{r.email}</div>
                      {r.reason && (
                        <div style={{ fontSize: 11, color: r.status === 'failed' ? 'var(--color-error)' : '#d97706', marginTop: 2 }}>
                          {r.reason}
                        </div>
                      )}
                    </div>
                    <span className="badge" style={{
                      background: r.status === 'created' ? '#d1fae5' : r.status === 'skipped' ? '#fef3c7' : '#fee2e2',
                      color: r.status === 'created' ? '#059669' : r.status === 'skipped' ? '#d97706' : '#dc2626',
                      fontWeight: 600, fontSize: 11, flexShrink: 0,
                    }}>
                      {r.status === 'created' ? '✅ Created' : r.status === 'skipped' ? '⚠️ Skipped' : '❌ Failed'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Modal>

      {/* ─── Edit Student Modal ─── */}
      <Modal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit Student"
        className="modal-lg"
        footer={
          <>
            <button className="btn bs" onClick={() => setShowEdit(false)}>Cancel</button>
            <button className="btn bp" onClick={saveEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Update Student'}
            </button>
          </>
        }
      >
        <div style={{ padding: '12px 16px', background: 'var(--color-primary-bg)', borderRadius: 8, marginBottom: 24, border: '1px solid var(--color-primary-light)' }}>
          <span style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 500 }}>
            💡 Editing details will not change their password.
          </span>
        </div>

        <div className="g2" style={{ marginBottom: 16 }}>
          <div className="field">
            <label>Assign to Batch *</label>
            <select className="sel w-full" value={editForm.batch_id} onChange={setEF('batch_id')}>
              <option value="">— Select Batch —</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Roll Number</label><input className="inp" value={editForm.roll_number} onChange={setEF('roll_number')} placeholder="e.g. 101" /></div>
        </div>

        <h3 className="h4" style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>Student Details</h3>
        <div className="g3" style={{ marginBottom: 24 }}>
          <div className="field"><label>Full Name *</label><input className="inp" value={editForm.full_name} onChange={setEF('full_name')} placeholder="Student name" /></div>
          <div className="field"><label>Phone Number</label><input className="inp" type="tel" value={editForm.phone} onChange={setEF('phone')} placeholder="10-digit number" /></div>
          <div className="field"><label>Email Address</label><input className="inp" type="email" value={editForm.email} onChange={setEF('email')} placeholder="student@example.com" /></div>
        </div>

        <h3 className="h4" style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>Parent/Guardian Details</h3>
        <div className="g2">
          <div className="field"><label>Parent Name</label><input className="inp" value={editForm.parent_name} onChange={setEF('parent_name')} placeholder="Parent name" /></div>
          <div className="field"><label>Parent Phone</label><input className="inp" type="tel" value={editForm.parent_phone} onChange={setEF('parent_phone')} placeholder="10-digit number" /></div>
        </div>
      </Modal>

      {/* Student Assessment Report Card Modal */}
      {selectedReportStudentId && (
        <StudentReportCardModal
          studentId={selectedReportStudentId}
          isOpen={Boolean(selectedReportStudentId)}
          onClose={() => setSelectedReportStudentId(null)}
          onOpenDetailReport={(testId, studentId) => {
            window.open(`/report/${testId}?student_id=${studentId}`, '_blank');
          }}
        />
      )}
    </div>
  );
}
