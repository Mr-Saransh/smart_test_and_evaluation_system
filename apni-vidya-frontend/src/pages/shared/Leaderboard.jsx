import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET } from '../../utils/api';
import { AwardIcon, UsersIcon, CheckCircleIcon } from '../../components/common/Icons';

export function Leaderboard() {
  const { institute } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('scores');

  useEffect(() => {
    if (!institute) return;
    setLoading(true);
    GET(`/leaderboard/${institute.id}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [institute]);

  if (!institute) {
    return (
      <div className="empty">
        <h1 className="h1">Institute Required</h1>
        <p className="muted">Please join an institute to view the leaderboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="g3">
        <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
      </div>
    );
  }

  if (!data) return <div className="empty">Failed to load leaderboard</div>;

  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 32 }}>
        <h1 className="h1">Institute Leaderboard</h1>
        <p className="page-subtitle">Top performers and most consistent students</p>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab${tab === 'scores' ? ' active' : ''}`} onClick={() => setTab('scores')}>Top Scorers</button>
        <button className={`tab${tab === 'attendance' ? ' active' : ''}`} onClick={() => setTab('attendance')}>Top Attendance</button>
      </div>

      <div className="card">
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student</th>
                <th>Batch</th>
                {tab === 'scores' ? <th>Average Score</th> : <th>Attendance Rate</th>}
              </tr>
            </thead>
            <tbody>
              {tab === 'scores' && data.top_scorers.map((s, idx) => (
                <tr key={s.student_id}>
                  <td style={{ fontWeight: 600 }}>
                    {idx === 0 ? <AwardIcon color="#f59e0b" /> : 
                     idx === 1 ? <AwardIcon color="#94a3b8" /> : 
                     idx === 2 ? <AwardIcon color="#d97706" /> : `#${idx + 1}`}
                  </td>
                  <td style={{ fontWeight: 600 }}>{s.full_name}</td>
                  <td className="muted" style={{ fontSize: 13 }}>{s.batch_name}</td>
                  <td><span style={{ fontWeight: 700, color: 'var(--color-success)' }}>{s.avg_score}%</span></td>
                </tr>
              ))}
              {tab === 'attendance' && data.top_attendance.map((s, idx) => (
                <tr key={s.student_id}>
                  <td style={{ fontWeight: 600 }}>
                    {idx === 0 ? <AwardIcon color="#f59e0b" /> : 
                     idx === 1 ? <AwardIcon color="#94a3b8" /> : 
                     idx === 2 ? <AwardIcon color="#d97706" /> : `#${idx + 1}`}
                  </td>
                  <td style={{ fontWeight: 600 }}>{s.full_name}</td>
                  <td className="muted" style={{ fontSize: 13 }}>{s.batch_name}</td>
                  <td>
                    <div className="fx" style={{ gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${s.attendance_pct}%`, height: '100%', background: 'var(--color-primary)' }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', width: 40 }}>{s.attendance_pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {(tab === 'scores' && data.top_scorers.length === 0) && <tr><td colSpan={4} className="empty">No data available</td></tr>}
              {(tab === 'attendance' && data.top_attendance.length === 0) && <tr><td colSpan={4} className="empty">No data available</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
