import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, toast } from '../../utils/api';
import { CurrencyIcon, CheckCircleIcon, DownloadIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonTable, SkeletonCard } from '../../components/common/Skeleton';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { STATUS_CONFIG } from '../../utils/constants';

export function Fees() {
  const { institute } = useAuth();
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({});
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filterBatch, setFilterBatch] = useState('all');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', amount: '', due_date: '', batch_id: '' });
  const [saving, setSaving] = useState(false);
  
  const [showPay, setShowPay] = useState(false);
  const [payRec, setPayRec] = useState(null);
  const [payAmt, setPayAmt] = useState('');
  const [paying, setPaying] = useState(false);

  const load = () => {
    if (!institute) return;
    Promise.all([
      GET(`/fees/all/${institute.id}`),
      GET(`/batches/${institute.id}`)
    ]).then(([res, b]) => { 
      setRecords(res.records || []); 
      setStats(res.stats || {}); 
      setBatches(b); 
    })
    .catch(() => {})
    .finally(() => setLoading(false));
  };
  
  useEffect(load, [institute]);

  const setF = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const createStructure = async () => {
    if (!form.title || !form.amount || !form.due_date) { toast('Title, amount and due date are required'); return; }
    setSaving(true);
    try {
      await POST('/fees/structures', { 
        institute_id: institute.id, 
        title: form.title, 
        total_amount: Number(form.amount), 
        due_date: form.due_date,
        batch_id: form.batch_id || null
      }, 'Fee structure created and assigned to students');
      setShowCreate(false); load();
    } catch { /* */ }
    setSaving(false);
  };

  const recordPayment = async () => {
    if (!payAmt) { toast('Enter amount'); return; }
    setPaying(true);
    try {
      await POST(`/fees/records/${payRec.id}/pay`, { amount: Number(payAmt) }, 'Payment recorded manually');
      setShowPay(false); load();
    } catch { /* */ }
    setPaying(false);
  };

  const exportCSV = () => {
    if (records.length === 0) return;
    const headers = ['Student Name', 'Phone', 'Batch', 'Fee Title', 'Amount Due', 'Amount Paid', 'Status', 'Due Date'];
    const rows = filteredRecords.map(r => [
      `"${r.student_name}"`, 
      r.student_phone || '', 
      `"${r.batch_name || 'No Batch'}"`, 
      `"${r.fee_title}"`, 
      r.amount_due, 
      r.amount_paid, 
      r.status, 
      formatDate(r.due_date)
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fee_report_${formatDate(new Date())}.csv`;
    a.click();
  };

  const filteredRecords = useMemo(() => {
    if (filterBatch === 'all') return records;
    return records.filter(r => r.batch_id === filterBatch);
  }, [records, filterBatch]);

  // Derive stats for filtered view
  const filteredStats = useMemo(() => {
    return filteredRecords.reduce((acc, r) => {
      acc.total_due += Number(r.amount_due) || 0;
      acc.total_paid += Number(r.amount_paid) || 0;
      acc.total_pending += Math.max(0, (Number(r.amount_due) || 0) - (Number(r.amount_paid) || 0));
      return acc;
    }, { total_due: 0, total_paid: 0, total_pending: 0 });
  }, [filteredRecords]);

  // Monthly collection chart data (naive implementation based on due date)
  // In a real app, this should be based on payment dates, but we don't track payment history in DB yet
  // We'll visualize expected vs collected based on fee due dates
  const monthlyData = useMemo(() => {
    const months = {};
    const today = new Date();
    // Initialize last 6 months
    for (let i=5; i>=0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const k = d.toLocaleString('default', { month: 'short' });
      months[k] = { label: k, expected: 0, collected: 0 };
    }
    records.forEach(r => {
      if (!r.due_date) return;
      const m = new Date(r.due_date).toLocaleString('default', { month: 'short' });
      if (months[m]) {
        months[m].expected += Number(r.amount_due) || 0;
        months[m].collected += Number(r.amount_paid) || 0;
      }
    });
    const arr = Object.values(months);
    const maxVal = Math.max(...arr.map(m => m.expected), 1);
    return { data: arr, maxVal };
  }, [records]);

  if (!institute) return <EmptyState icon={CurrencyIcon} title="Set up your institute first" />;

  if (loading) return <div style={{ padding: 24 }}><div className="g3"><SkeletonCard/><SkeletonCard/><SkeletonCard/></div><SkeletonTable rows={10} /></div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1 className="h1">Fee Management</h1>
          <p className="page-subtitle">Track batch-wise payments, revenue, and pending dues</p>
        </div>
        <button className="btn bp" onClick={() => { setForm({ title: '', amount: '', due_date: '', batch_id: '' }); setShowCreate(true); }}>
          + New Fee Structure
        </button>
      </div>

      <div className="fxb" style={{ marginBottom: 20 }}>
        <div className="fx" style={{ gap: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Filter by Batch:</label>
          <select className="sel" value={filterBatch} onChange={e => setFilterBatch(e.target.value)} style={{ minWidth: 200, padding: '6px 12px' }}>
            <option value="all">All Batches</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        
        <button className="btn bd" onClick={exportCSV} disabled={records.length === 0}>
          <DownloadIcon size={16} style={{ marginRight: 6 }} /> Export CSV
        </button>
      </div>

      <div className="g3" style={{ marginBottom: 32 }}>
        <div className="glass-panel" style={{ padding: 24, borderRadius: 'var(--radius-xl)' }}>
          <div className="muted" style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Total Expected Revenue</div>
          <div className="sn" style={{ fontSize: '2.5rem' }}>{formatCurrency(filteredStats.total_due)}</div>
          {filterBatch === 'all' && <div className="muted" style={{ fontSize: '0.75rem', marginTop: 8 }}>Across {stats.total_records || 0} student records</div>}
        </div>
        <div className="glass-panel" style={{ padding: 24, borderRadius: 'var(--radius-xl)', borderBottom: '4px solid var(--color-success)' }}>
          <div className="muted" style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Total Collected</div>
          <div className="sn" style={{ color: 'var(--color-success)', fontSize: '2.5rem' }}>{formatCurrency(filteredStats.total_paid)}</div>
          <div className="muted" style={{ fontSize: '0.75rem', marginTop: 8 }}>
            Collection Rate: {filteredStats.total_due > 0 ? Math.round((filteredStats.total_paid / filteredStats.total_due) * 100) : 0}%
          </div>
        </div>
        <div className="glass-panel" style={{ padding: 24, borderRadius: 'var(--radius-xl)', borderBottom: '4px solid var(--color-error)' }}>
          <div className="muted" style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Pending / Overdue</div>
          <div className="sn" style={{ color: 'var(--color-error)', fontSize: '2.5rem' }}>{formatCurrency(filteredStats.total_pending)}</div>
          {filterBatch === 'all' && <div className="muted" style={{ fontSize: '0.75rem', marginTop: 8 }}>{stats.overdue_count || 0} overdue records</div>}
        </div>
      </div>

      {filterBatch === 'all' && records.length > 0 && (
        <div className="glass-panel" style={{ marginBottom: 32, padding: 24, borderRadius: 'var(--radius-xl)' }}>
          <h3 className="h3" style={{ marginBottom: 20 }}>Revenue Trend (Last 6 Months)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: 200, gap: '4%', padding: '0 20px 20px 20px', borderBottom: '1px solid var(--border-color)' }}>
            {monthlyData.data.map(m => {
              const heightExp = Math.max(5, (m.expected / monthlyData.maxVal) * 100);
              const heightCol = Math.max(0, (m.collected / monthlyData.maxVal) * 100);
              return (
                <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                  <div style={{ display: 'flex', width: '100%', gap: 4, alignItems: 'flex-end', justifyContent: 'center', height: '100%' }}>
                    {/* Expected bar */}
                    <div style={{ width: '40%', maxWidth: 30, height: `${heightExp}%`, background: 'var(--bg-tertiary)', borderRadius: '4px 4px 0 0', position: 'relative' }}>
                      <div className="tooltip" style={{ display: 'none', position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', background: '#333', color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: 10, whiteSpace: 'nowrap', zIndex: 10 }}>Expected: {formatCurrency(m.expected)}</div>
                    </div>
                    {/* Collected bar */}
                    <div style={{ width: '40%', maxWidth: 30, height: `${heightCol}%`, background: 'var(--color-primary)', borderRadius: '4px 4px 0 0', position: 'relative' }}>
                       <div className="tooltip" style={{ display: 'none', position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', background: '#333', color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: 10, whiteSpace: 'nowrap', zIndex: 10 }}>Collected: {formatCurrency(m.collected)}</div>
                    </div>
                  </div>
                  <div style={{ position: 'absolute', bottom: -24, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{m.label}</div>
                </div>
              );
            })}
          </div>
          <div className="fx" style={{ justifyContent: 'center', gap: 20, marginTop: 30 }}>
            <div className="fx" style={{ gap: 6, fontSize: 12 }}><div style={{ width: 12, height: 12, background: 'var(--bg-tertiary)', borderRadius: 2 }} /> Expected Revenue</div>
            <div className="fx" style={{ gap: 6, fontSize: 12 }}><div style={{ width: 12, height: 12, background: 'var(--color-primary)', borderRadius: 2 }} /> Collected</div>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', borderRadius: 'var(--radius-xl)' }}>
        <div className="fxb" style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-surface)' }}>
          <h3 className="h3" style={{ margin: 0 }}>Student Fee Records</h3>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          {filteredRecords.length === 0 ? (
            <EmptyState icon={CurrencyIcon} title="No Fee Records" description="Create a fee structure or adjust your filters." />
          ) : (
            <table className="data-grid">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Fee Detail</th>
                  <th>Amount Due</th>
                  <th>Amount Paid</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(r => {
                  const bal = Math.max(0, Number(r.amount_due) - Number(r.amount_paid));
                  return (
                    <tr key={r.id}>
                      <td data-label="Student">
                        <div style={{ fontWeight: 600 }}>{r.student_name}</div>
                        <div className="muted" style={{ fontSize: '0.75rem' }}>{r.batch_name || 'No Batch'} • {r.student_phone || ''}</div>
                      </td>
                      <td data-label="Fee Detail">
                        <div style={{ fontWeight: 500 }}>{r.fee_title}</div>
                        <div className="muted" style={{ fontSize: '0.75rem' }}>Due: {formatDate(r.due_date)}</div>
                      </td>
                      <td data-label="Amount Due" style={{ fontWeight: 600 }}>{formatCurrency(r.amount_due)}</td>
                      <td data-label="Amount Paid"><span style={{ fontWeight: 600, color: r.amount_paid > 0 ? 'var(--color-success)' : 'inherit' }}>{formatCurrency(r.amount_paid)}</span></td>
                      <td data-label="Status">
                        <span className="badge" style={{ background: STATUS_CONFIG[r.status]?.bg, color: STATUS_CONFIG[r.status]?.fg }}>
                          {STATUS_CONFIG[r.status]?.label}
                        </span>
                        {bal > 0 && <div className="muted" style={{ fontSize: '0.65rem', marginTop: 4 }}>Bal: {formatCurrency(bal)}</div>}
                        {r.is_overdue && r.status !== 'paid' && <div style={{ fontSize: '0.65rem', color: 'var(--color-error)', fontWeight: 600, marginTop: 2 }}>OVERDUE</div>}
                      </td>
                      <td data-label="Action">
                        {r.status !== 'paid' ? (
                          <button className="btn bs bsm" onClick={() => { setPayRec(r); setPayAmt(bal); setShowPay(true); }}>Record Pay</button>
                        ) : (
                          <div className="fx" style={{ gap: 4, color: 'var(--color-success)' }}><CheckCircleIcon size={16} /><span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Paid</span></div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Structure Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Fee Structure</h2>
              <button className="btn-icon" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <div className="field">
              <label>Assign To Batch (Optional)</label>
              <select className="sel w-full" value={form.batch_id} onChange={setF('batch_id')}>
                <option value="">All Institute Students</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <div className="field-hint">Assigning will automatically create fee records for all students in the selected group.</div>
            </div>
            <div className="field"><label>Fee Title *</label><input className="inp" value={form.title} onChange={setF('title')} placeholder="e.g. Tuition Fee Q1" /></div>
            <div className="g2">
              <div className="field"><label>Total Amount (₹) *</label><input className="inp" type="number" value={form.amount} onChange={setF('amount')} placeholder="0" /></div>
              <div className="field"><label>Due Date *</label><input className="inp" type="date" value={form.due_date} onChange={setF('due_date')} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn bs" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn bp" onClick={createStructure} disabled={saving}>{saving ? 'Assigning...' : 'Assign Fee'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPay && payRec && (
        <div className="modal-overlay" onClick={() => setShowPay(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>Record Manual Payment</h2>
              <button className="btn-icon" onClick={() => setShowPay(false)}>✕</button>
            </div>
            <div style={{ background: 'var(--bg-tertiary)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
              <div className="fxb" style={{ marginBottom: 8 }}>
                <span className="muted" style={{ fontSize: 13 }}>Student:</span>
                <span style={{ fontWeight: 600 }}>{payRec.student_name}</span>
              </div>
              <div className="fxb" style={{ marginBottom: 8 }}>
                <span className="muted" style={{ fontSize: 13 }}>Fee:</span>
                <span style={{ fontWeight: 500 }}>{payRec.fee_title}</span>
              </div>
              <div className="fxb" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 8, marginTop: 8 }}>
                <span className="muted" style={{ fontSize: 13 }}>Balance Due:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-error)', fontSize: 18 }}>
                  {formatCurrency(Math.max(0, Number(payRec.amount_due) - Number(payRec.amount_paid)))}
                </span>
              </div>
            </div>
            <div className="field"><label>Amount Received (Cash/Offline) (₹)</label><input className="inp" type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} autoFocus /></div>
            <div className="modal-footer">
              <button className="btn bs" onClick={() => setShowPay(false)}>Cancel</button>
              <button className="btn bp" onClick={recordPayment} disabled={paying}>{paying ? 'Recording...' : 'Record Payment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
