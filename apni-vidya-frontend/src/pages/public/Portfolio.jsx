import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { GraduationCapIcon, AwardIcon } from '../../components/common/Icons';
import { getAttendanceColor, getScoreColor } from '../../utils/helpers';

export function Portfolio() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || ''}/public/portfolio/${token}`)
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message || 'Portfolio not found'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="error-page">
        <div className="skeleton" style={{ width: 200, height: 32 }} />
        <div className="skeleton" style={{ width: 300, height: 20, marginTop: 12 }} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="error-page">
        <AwardIcon size={48} color="var(--text-tertiary)" />
        <h2 className="h2" style={{ marginBottom: 8 }}>Portfolio Not Found</h2>
        <p className="muted">This portfolio link is invalid or has been disabled.</p>
      </div>
    );
  }

  const { student, attendance, performance, swot } = data;
  const a = attendance || {};
  const p = performance || {};
  const pct = Number(a.attendance_pct) || 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '32px 16px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div className="card card-dark" style={{ marginBottom: 24 }}>
          <div className="fx" style={{ gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, flexShrink: 0 }}>
              {student?.name?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{student?.name}</h1>
              <p className="muted">{student?.batch || 'Student'} • Academic Portfolio</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="g3" style={{ marginBottom: 24 }}>
          <div className="sc">
            <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Attendance Rate</div>
            <div className="sn" style={{ color: getAttendanceColor(pct) }}>{pct}%</div>
            <div className="pb" style={{ marginTop: 8, height: 6 }}>
              <div className="pbf" style={{ width: `${pct}%`, background: getAttendanceColor(pct) }} />
            </div>
          </div>
          <div className="sc">
            <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Average Score</div>
            <div className="sn" style={{ color: getScoreColor(p.average_pct || 0) }}>{p.average_pct || 0}%</div>
          </div>
          <div className="sc">
            <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Tests Taken</div>
            <div className="sn" style={{ color: 'var(--color-primary)' }}>{p.tests_taken || 0}</div>
          </div>
        </div>

        {/* SWOT */}
        {(swot?.weaknesses?.length > 0 || swot?.strengths?.length > 0) && (
          <div className="g2" style={{ marginBottom: 24, alignItems: 'start' }}>
            {swot.strengths?.length > 0 && (
              <div className="card">
                <h3 className="h2" style={{ color: 'var(--color-success)', marginBottom: 12 }}>⭐ Strengths</h3>
                <div className="fx fw" style={{ gap: 8 }}>
                  {swot.strengths.map(w => (
                    <span key={w.topic} className="badge" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                      {w.topic} ({w.accuracy}%)
                    </span>
                  ))}
                </div>
              </div>
            )}
            {swot.weaknesses?.length > 0 && (
              <div className="card">
                <h3 className="h2" style={{ color: 'var(--color-warning)', marginBottom: 12 }}>⚠️ Focus Areas</h3>
                <div className="fx fw" style={{ gap: 8 }}>
                  {swot.weaknesses.map(w => (
                    <span key={w.topic} className="badge" style={{ background: 'var(--color-warning-bg)', color: '#b45309' }}>
                      {w.topic} ({w.accuracy}%)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Tests */}
        <div className="card">
          <h3 className="h2" style={{ marginBottom: 16 }}>Recent Test Performance</h3>
          <div className="tblwrap">
            <table className="tbl">
              <thead><tr><th>Test</th><th>Score</th><th>Rank</th><th>%</th></tr></thead>
              <tbody>
                {(p.recent_tests || []).map((t, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{t.title}</td>
                    <td>{t.score} / {t.max_marks}</td>
                    <td>{t.rank ? <span className="badge" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>#{t.rank}</span> : '—'}</td>
                    <td><span style={{ fontWeight: 700, color: getScoreColor(t.percentage) }}>{t.percentage}%</span></td>
                  </tr>
                ))}
                {(p.recent_tests || []).length === 0 && (
                  <tr><td colSpan={4} className="empty">No test data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 32, padding: 16 }}>
          <div className="fx" style={{ justifyContent: 'center', gap: 8 }}>
            <GraduationCapIcon size={16} color="var(--text-tertiary)" />
            <span className="muted" style={{ fontSize: 12 }}>Powered by Apni Vidya</span>
          </div>
        </div>
      </div>
    </div>
  );
}
