import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, toast } from '../../utils/api';
import { CurrencyIcon, CheckCircleIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/Skeleton';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { STATUS_CONFIG } from '../../utils/constants';

export function Fees() {
  const { institute } = useAuth();
  const [structures, setStructures] = useState([]);
  const [records, setRecords] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
      GET(`/fees/structures/${institute.id}`),
      GET(`/fees/records/${institute.id}`),
      GET(`/batches/${institute.id}`)
    ]).then(([s, r, b]) => { setStructures(s); setRecords(r); setBatches(b); })
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
      await POST('/fees/pay', { fee_record_id: payRec.id, amount: Number(payAmt) }, 'Payment recorded manually');
      setShowPay(false); load();
    } catch { /* */ }
    setPaying(false);
  };

  if (!institute) return <EmptyState icon={CurrencyIcon} title="Set up your institute first" />;

  return (
    <div className="animate-fade-in">
      <div className="page-header page-header-row">
        <div><h1 className="h1">Fee Management</h1><p className="page-subtitle">Track payments, due dates, and record cash payments</p></div>
        <button className="btn bp" onClick={() => { setForm({ title: '', amount: '', due_date: '', batch_id: '' }); setShowCreate(true); }}>+ New Fee Structure</button>
      </div>

      <div className="g3" style={{ marginBottom: 24 }}>
        <div className="sc">
          <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Total Expected</div>
          <div className="sn">{formatCurrency(records.reduce((a, r) => a + (Number(r.amount_due) || 0), 0))}</div>
        </div>
        <div className="sc">
          <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Total Collected</div>
          <div className="sn" style={{ color: 'var(--color-success)' }}>{formatCurrency(records.reduce((a, r) => a + (Number(r.amount_paid) || 0), 0))}</div>
        </div>
        <div className="sc">
          <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Pending/Overdue</div>
          <div className="sn" style={{ color: 'var(--color-error)' }}>{formatCurrency(records.reduce((a, r) => a + Math.max(0, (Number(r.amount_due) || 0) - (Number(r.amount_paid) || 0)), 0))}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="fxb" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
          <h3 className="h3">Student Fee Records</h3>
        </div>
        
        <div className="tblwrap">
          {loading ? (
            <div style={{ padding: 20 }}><SkeletonTable /></div>
          ) : records.length === 0 ? (
            <EmptyState icon={CurrencyIcon} title="No Fee Records" description="Create a fee structure to assign fees to students." />
          ) : (
            <table className="tbl">
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
                {records.map(r => {
                  const bal = Math.max(0, Number(r.amount_due) - Number(r.amount_paid));
                  return (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.student_name}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{r.batch_name || 'No Batch'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{r.fee_title}</div>
                        <div className="muted" style={{ fontSize: 12 }}>Due: {formatDate(r.due_date)}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(r.amount_due)}</td>
                      <td><span style={{ fontWeight: 600, color: r.amount_paid > 0 ? 'var(--color-success)' : 'inherit' }}>{formatCurrency(r.amount_paid)}</span></td>
                      <td>
                        <span className="badge" style={{ background: STATUS_CONFIG[r.status]?.bg, color: STATUS_CONFIG[r.status]?.fg }}>
                          {STATUS_CONFIG[r.status]?.label}
                        </span>
                        {bal > 0 && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Bal: {formatCurrency(bal)}</div>}
                      </td>
                      <td>
                        {r.status !== 'paid' ? (
                          <button className="btn bs bsm" onClick={() => { setPayRec(r); setPayAmt(bal); setShowPay(true); }}>Record Pay</button>
                        ) : (
                          <div className="fx" style={{ gap: 4, color: 'var(--color-success)' }}><CheckCircleIcon size={16} /><span style={{ fontSize: 12, fontWeight: 600 }}>Paid</span></div>
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
            <div style={{ background: 'var(--bg-tertiary)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <div className="fxb" style={{ marginBottom: 4 }}>
                <span className="muted" style={{ fontSize: 13 }}>Student:</span>
                <span style={{ fontWeight: 600 }}>{payRec.student_name}</span>
              </div>
              <div className="fxb" style={{ marginBottom: 4 }}>
                <span className="muted" style={{ fontSize: 13 }}>Fee:</span>
                <span style={{ fontWeight: 500 }}>{payRec.fee_title}</span>
              </div>
              <div className="fxb">
                <span className="muted" style={{ fontSize: 13 }}>Balance Due:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-error)' }}>
                  {formatCurrency(Math.max(0, Number(payRec.amount_due) - Number(payRec.amount_paid)))}
                </span>
              </div>
            </div>
            <div className="field"><label>Amount Received (Cash/Offline) (₹)</label><input className="inp" type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} /></div>
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
