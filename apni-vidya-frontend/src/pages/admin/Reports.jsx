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
    GET(`/dashboard/report/weekly/${institute.id}`)
      .then(res => {
        setData(res);
        setTab('weekly'); // Default to weekly trend
      })
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

      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab${tab === 'weekly' ? ' active' : ''}`} onClick={() => setTab('weekly')}>7-Day Trend</button>
      </div>

      {tab === 'weekly' && (
        <div className="g2" style={{ alignItems: 'start' }}>
          <div className="card" style={{ flex: 2 }}>
            <h3 className="h2" style={{ marginBottom: 16 }}>Weekly Performance & Attendance</h3>
            <div className="tblwrap" style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Submissions</th>
                    <th>Avg Score</th>
                    <th>Attendance Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trend?.map((t, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{new Date(t.day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                      <td>{t.submissions}</td>
                      <td>
                        {t.avg_score !== null ? (
                          <span style={{ fontWeight: 700, color: getScoreColor(t.avg_score) }}>{t.avg_score}%</span>
                        ) : <span className="muted">-</span>}
                      </td>
                      <td>
                        {t.attendance_pct !== null ? (
                          <div className="fx" style={{ gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${t.attendance_pct}%`, height: '100%', background: getAttendanceColor(t.attendance_pct) }} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: getAttendanceColor(t.attendance_pct), width: 40 }}>{t.attendance_pct}%</span>
                          </div>
                        ) : <span className="muted">-</span>}
                      </td>
                    </tr>
                  ))}
                  {(!data.trend || data.trend.length === 0) && <tr><td colSpan={4} className="empty">No trend data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="card sc" style={{ flex: 1, background: 'var(--bg-secondary)', border: 'none' }}>
            <h3 className="h2" style={{ marginBottom: 16 }}>Week Summary</h3>
            <div style={{ marginBottom: 16 }}>
              <div className="muted" style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Total Submissions (7 Days)</div>
              <div className="sn">{data.trend?.reduce((acc, curr) => acc + (curr.submissions || 0), 0) || 0}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Current Trend</div>
              <p className="muted" style={{ fontSize: 14 }}>
                Keep encouraging students to take daily tests to maintain a solid performance trajectory.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
