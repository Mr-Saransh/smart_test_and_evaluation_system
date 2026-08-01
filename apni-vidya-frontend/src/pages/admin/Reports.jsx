import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET } from '../../utils/api';
import { TrendingUpIcon, UsersIcon, ClipboardIcon, CurrencyIcon, FileTextIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency, getAttendanceColor, getScoreColor } from '../../utils/helpers';

export function Reports() {
  const { institute } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview'); // overview, attendance, performance

  useEffect(() => {
    if (!institute) return;
    setLoading(true);
    GET(`/analytics/${institute.id}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [institute]);

  if (!institute) return <EmptyState icon={TrendingUpIcon} title="Set up your institute first" />;
  
  if (loading) return (
    <div className="g3">
      <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
      <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
      <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
    </div>
  );

  if (!data) return <EmptyState icon={TrendingUpIcon} title="No Data Available" description="There is not enough data to generate analytics yet." />;

  const { overview, performance, attendance } = data;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="h1">Reports & Analytics</h1>
        <p className="page-subtitle">Institute performance and attendance insights</p>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab${tab === 'overview' ? ' active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
        <button className={`tab${tab === 'performance' ? ' active' : ''}`} onClick={() => setTab('performance')}>Performance</button>
        <button className={`tab${tab === 'attendance' ? ' active' : ''}`} onClick={() => setTab('attendance')}>Attendance</button>
      </div>

      {tab === 'overview' && (
        <div className="g3">
          <div className="sc">
            <div className="fxb" style={{ marginBottom: 8 }}>
              <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Total Students</div>
              <UsersIcon size={18} color="var(--color-primary)" />
            </div>
            <div className="sn">{overview.total_students || 0}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Active Enrollments</div>
          </div>
          <div className="sc">
            <div className="fxb" style={{ marginBottom: 8 }}>
              <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Avg Attendance</div>
              <ClipboardIcon size={18} color="var(--color-success)" />
            </div>
            <div className="sn" style={{ color: getAttendanceColor(overview.avg_attendance_pct) }}>{overview.avg_attendance_pct || 0}%</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Last 30 days</div>
          </div>
          <div className="sc">
            <div className="fxb" style={{ marginBottom: 8 }}>
              <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Fee Collection</div>
              <CurrencyIcon size={18} color="#f59e0b" />
            </div>
            <div className="sn">{formatCurrency(overview.total_fees_collected)}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Pending: {formatCurrency(overview.total_fees_pending)}</div>
          </div>
        </div>
      )}

      {tab === 'performance' && (
        <div className="g2" style={{ alignItems: 'start' }}>
          <div className="card">
            <h3 className="h2" style={{ marginBottom: 16 }}>Batch Wise Performance</h3>
            <div className="tblwrap">
              <table className="tbl">
                <thead><tr><th>Batch</th><th>Tests Taken</th><th>Avg Score</th></tr></thead>
                <tbody>
                  {performance.batch_wise?.map(b => (
                    <tr key={b.batch_id}>
                      <td style={{ fontWeight: 600 }}>{b.batch_name}</td>
                      <td>{b.test_count}</td>
                      <td><span style={{ fontWeight: 700, color: getScoreColor(b.avg_score_pct) }}>{b.avg_score_pct}%</span></td>
                    </tr>
                  ))}
                  {(!performance.batch_wise || performance.batch_wise.length === 0) && <tr><td colSpan={3} className="empty">No test data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <h3 className="h2" style={{ marginBottom: 16 }}>Top Performers</h3>
            <div className="tblwrap">
              <table className="tbl">
                <thead><tr><th>Student</th><th>Batch</th><th>Avg Score</th></tr></thead>
                <tbody>
                  {performance.top_students?.map(s => (
                    <tr key={s.student_id}>
                      <td style={{ fontWeight: 600 }}>{s.student_name}</td>
                      <td className="muted" style={{ fontSize: 13 }}>{s.batch_name}</td>
                      <td><span style={{ fontWeight: 700, color: 'var(--color-success)' }}>{s.avg_score_pct}%</span></td>
                    </tr>
                  ))}
                  {(!performance.top_students || performance.top_students.length === 0) && <tr><td colSpan={3} className="empty">No test data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="card">
          <h3 className="h2" style={{ marginBottom: 16 }}>Batch Wise Attendance Rate</h3>
          <div className="tblwrap">
            <table className="tbl">
              <thead><tr><th>Batch</th><th>Classes Held</th><th>Avg Attendance</th><th>Status</th></tr></thead>
              <tbody>
                {attendance.batch_wise?.map(b => (
                  <tr key={b.batch_id}>
                    <td style={{ fontWeight: 600 }}>{b.batch_name}</td>
                    <td>{b.classes_held}</td>
                    <td>
                      <div className="fx" style={{ gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${b.attendance_pct}%`, height: '100%', background: getAttendanceColor(b.attendance_pct) }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: getAttendanceColor(b.attendance_pct), width: 40 }}>{b.attendance_pct}%</span>
                      </div>
                    </td>
                    <td>
                      {b.attendance_pct < 60 ? <span className="badge" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>Critical</span> : 
                       b.attendance_pct < 80 ? <span className="badge" style={{ background: 'var(--color-warning-bg)', color: '#b45309' }}>Warning</span> : 
                       <span className="badge" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>Healthy</span>}
                    </td>
                  </tr>
                ))}
                {(!attendance.batch_wise || attendance.batch_wise.length === 0) && <tr><td colSpan={4} className="empty">No attendance data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
