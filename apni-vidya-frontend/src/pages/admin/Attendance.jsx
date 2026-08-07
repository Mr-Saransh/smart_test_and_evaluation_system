import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, toast } from '../../utils/api';
import { ClipboardIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { today, formatDate, getInitials } from '../../utils/helpers';
import { ATTENDANCE_OPTIONS } from '../../utils/constants';

export function Attendance() {
  const { institute } = useAuth();
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [date, setDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null); // { sheet: [], date: "" }
  const [saving, setSaving] = useState(false);

  // Local state for the current sheet being marked
  const [marks, setMarks] = useState({});

  useEffect(() => {
    if (institute) {
      GET(`/batches/${institute.id}`).then(b => {
        setBatches(b);
        if (b.length > 0) setBatchId(b[0].id);
      }).catch(() => {});
    }
  }, [institute]);

  useEffect(() => {
    if (!batchId || !date) { setData(null); return; }
    setLoading(true);
    Promise.all([
      GET(`/attendance/sheet/${batchId}?date=${date}`)
    ]).then(([res]) => {
      setData(res);
      // Initialize local marks
      const initialMarks = {};
      res.sheet.forEach(s => {
        initialMarks[s.student_id] = s.status;
      });
      setMarks(initialMarks);
    })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [batchId, date]);

  const markAll = (status) => {
    const newMarks = { ...marks };
    data?.sheet?.forEach(s => { newMarks[s.student_id] = status; });
    setMarks(newMarks);
  };

  const handleMark = (studentId, status) => {
    setMarks(prev => ({ ...prev, [studentId]: status }));
  };

  const save = async () => {
    if (!batchId || !date) return;
    setSaving(true);
    try {
      const records = Object.entries(marks).map(([student_id, status]) => ({ student_id, status }));
      await POST('/attendance/mark', { institute_id: institute.id, batch_id: batchId, date, records }, 'Attendance saved');
      // reload
      const res = await GET(`/attendance/sheet/${batchId}?date=${date}`);
      setData(res);
    } catch { /* */ }
    setSaving(false);
  };

  if (!institute) return <EmptyState icon={ClipboardIcon} title="Set up your institute first" />;

  const presentCount = Object.values(marks).filter(s => s === 'present' || s === 'late').length;
  const totalCount = Object.keys(marks).length;
  const pct = totalCount ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <div className="page-header page-header-row">
        <div><h1 className="h1">Attendance</h1><p className="page-subtitle">Mark and view daily attendance</p></div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div className="fx fw" style={{ gap: 16 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Select Batch</label>
            <select className="sel w-full" value={batchId} onChange={e => setBatchId(e.target.value)}>
              {batches.length === 0 && <option value="">No batches found</option>}
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Date</label>
            <input className="inp w-full" type="date" value={date} onChange={e => setDate(e.target.value)} max={today()} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="skeleton" style={{ height: 400, borderRadius: 8 }} /></div>
      ) : !batchId ? (
        <EmptyState icon={ClipboardIcon} title="Select a Batch" description="Choose a batch to view and mark attendance." />
      ) : !data?.sheet?.length ? (
        <EmptyState icon={ClipboardIcon} title="No Students" description="There are no students enrolled in this batch." />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="fxb" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
            <div>
              <h3 className="h3" style={{ marginBottom: 2 }}>{formatDate(date)}</h3>
              <div className="muted" style={{ fontSize: 13 }}>{presentCount}/{totalCount} Present ({pct}%)</div>
            </div>
            <div className="fx" style={{ gap: 8 }}>
              <button className="btn bs bsm" onClick={() => markAll('present')}>Mark All P</button>
              <button className="btn bs bsm" onClick={() => markAll('absent')}>Mark All A</button>
              <button className="btn bp" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Attendance'}</button>
            </div>
          </div>
          
          <div className="tblwrap" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <table className="tbl">
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ width: '40%' }}>Student</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.sheet.map(s => (
                  <tr key={s.student_id}>
                    <td>
                      <div className="fx" style={{ gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12 }}>
                          {getInitials(s.student_name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.student_name}</div>
                          {s.roll_number && <div className="muted" style={{ fontSize: 12 }}>{s.roll_number}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="fx" style={{ gap: 6 }}>
                        {ATTENDANCE_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            className="btn bs"
                            style={{ 
                              padding: '6px 12px', minHeight: 32, 
                              background: marks[s.student_id] === opt.value ? opt.color : 'var(--bg-secondary)',
                              color: marks[s.student_id] === opt.value ? '#fff' : 'var(--text-secondary)',
                              borderColor: marks[s.student_id] === opt.value ? opt.color : 'var(--border-color)'
                            }}
                            onClick={() => handleMark(s.student_id, opt.value)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
