import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET } from '../../utils/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarIcon, FileTextIcon, BookOpenIcon, ClockIcon, TrendingUpIcon, ClipboardIcon, CurrencyIcon, MegaphoneIcon } from '../../components/common/Icons';
import { SkeletonTable } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency, formatDate, getScoreColor, getAttendanceColor, formatTime } from '../../utils/helpers';
import { TT_DAYS, STATUS_CONFIG } from '../../utils/constants';

export function StudentPortal() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  // Extract the view from the URL (e.g. /student/attendance -> attendance)
  const view = location.pathname.split('/')[2] || 'home';

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    // Fetch all student-related data in parallel. 
    // In a real app, these would be separate calls per tab to save bandwidth,
    // but fetching all here simplifies the UI for this MVP.
    Promise.all([
      GET(`/public/portfolio/${user.id}`).catch(() => ({})), // Reusing portfolio API for overview
      GET(`/timetable/${user.batch_id}`).catch(() => []),
      GET(`/planner/${user.batch_id}`).catch(() => []),
      GET(`/materials/${user.institute_id}`).catch(() => []),
      GET(`/tests/institute/${user.institute_id}`).catch(() => []),
      GET(`/announcements/institute/${user.institute_id}`).catch(() => []),
      GET(`/fees/records/${user.institute_id}`).catch(() => [])
    ]).then(([portfolio, timetable, planner, materials, tests, announcements, fees]) => {
      setData({
        portfolio,
        timetable,
        planner,
        // Filter batch-specific items
        materials: materials.filter(m => !m.batch_id || m.batch_id === user.batch_id),
        tests: tests.filter(t => t.batch_id === user.batch_id),
        announcements: announcements.filter(a => a.audience === 'all' || a.batch_id === user.batch_id),
        fees: fees.filter(f => f.student_id === user.id)
      });
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <div style={{ padding: 32 }}><SkeletonTable rows={10} /></div>;
  }

  // --- Views ---

  const renderHome = () => {
    const { student, performance, attendance, swot } = data.portfolio || {};
    const p = performance || {};
    const pct = Number(attendance?.attendance_pct) || 0;

    return (
      <div className="g2" style={{ alignItems: 'start' }}>
        {/* Profile Card */}
        <div className="card card-dark" style={{ gridColumn: '1 / -1' }}>
          <h2 className="h1" style={{ color: '#fff', marginBottom: 4 }}>Welcome, {user.full_name}</h2>
          <p className="muted">{student?.batch || 'Enrolled Student'}</p>
        </div>

        {/* Quick Stats */}
        <div className="sc">
          <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Attendance</div>
          <div className="sn" style={{ color: getAttendanceColor(pct) }}>{pct}%</div>
        </div>
        <div className="sc">
          <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Average Score</div>
          <div className="sn" style={{ color: getScoreColor(p.average_pct) }}>{p.average_pct || 0}%</div>
        </div>

        {/* Recent Tests */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 className="h2" style={{ marginBottom: 16 }}>Recent Performance</h3>
          {p.recent_tests?.length > 0 ? (
            <table className="tbl">
              <thead><tr><th>Test</th><th>Score</th><th>%</th></tr></thead>
              <tbody>
                {p.recent_tests.map((t, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{t.title}</td>
                    <td>{t.score}/{t.max_marks}</td>
                    <td><span style={{ fontWeight: 700, color: getScoreColor(t.percentage) }}>{t.percentage}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="muted">No test results available yet.</div>}
        </div>
      </div>
    );
  };

  const renderTimetable = () => {
    const slots = data.timetable || [];
    const schedule = {};
    TT_DAYS.forEach(d => schedule[d] = []);
    slots.forEach(s => { if (schedule[s.day_of_week]) schedule[s.day_of_week].push(s); });
    TT_DAYS.forEach(d => schedule[d].sort((a, b) => a.start_time.localeCompare(b.start_time)));

    return (
      <div className="card" style={{ overflowX: 'auto' }}>
        <h3 className="h2" style={{ marginBottom: 16 }}>Weekly Schedule</h3>
        <div style={{ minWidth: 600, display: 'flex', gap: 12 }}>
          {TT_DAYS.map(day => (
            <div key={day} style={{ flex: 1 }}>
              <div style={{ padding: '8px 0', borderBottom: '2px solid var(--border-color)', marginBottom: 12, textAlign: 'center', fontWeight: 600 }}>{day.substring(0,3)}</div>
              <div className="fx" style={{ flexDirection: 'column', gap: 8 }}>
                {schedule[day].length === 0 ? <div className="muted" style={{ textAlign: 'center', fontSize: 12 }}>-</div> :
                  schedule[day].map(s => (
                    <div key={s.id} style={{ background: 'var(--bg-tertiary)', padding: 10, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{s.subject}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{formatTime(s.start_time)} - {formatTime(s.end_time)}</div>
                    </div>
                  ))
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTests = () => {
    const tests = data.tests || [];
    return tests.length === 0 ? <EmptyState icon={FileTextIcon} title="No Tests" /> : (
      <div className="g3">
        {tests.map(t => (
          <div key={t.id} className="card">
            <h3 className="h3" style={{ marginBottom: 4 }}>{t.title}</h3>
            <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{t.subject}</div>
            <div className="fxb" style={{ marginBottom: 16 }}>
              <div className="muted" style={{ fontSize: 12 }}>
                {t.duration_min} mins • {t.total_marks} marks<br/>
                {t.start_date && t.end_date ? `${formatDate(t.start_date)} - ${formatDate(t.end_date)}` : ''}
              </div>
              <span className="badge" style={{ background: t.status === 'active' ? '#d1fae5' : '#f1f5f9', color: t.status === 'active' ? '#059669' : '#475569' }}>
                {t.status.toUpperCase()}
              </span>
            </div>
            {t.status === 'active' && !t.submitted && (t.attempts_used < (t.attempt_limit || 1)) && (
              <button className="btn bp w-full" style={{ justifyContent: 'center' }} onClick={() => navigate(`/play-test/${t.id}`)}>
                Start Test (Attempt {t.attempts_used + 1}/{t.attempt_limit || 1})
              </button>
            )}
            {t.submitted && (
              <div className="fx fxb w-full">
                <div className="muted" style={{ fontSize: 13 }}>Score: {t.score}/{t.max_marks}</div>
                {(t.attempts_used < (t.attempt_limit || 1)) && t.status === 'active' && (
                   <button className="btn bd bsm" onClick={() => navigate(`/play-test/${t.id}`)}>Retake</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderMaterials = () => {
    const mats = data.materials || [];
    return mats.length === 0 ? <EmptyState icon={BookOpenIcon} title="No Materials" /> : (
      <div className="g3">
        {mats.map(m => (
          <div key={m.id} className="card">
            <h3 className="h3" style={{ marginBottom: 4 }}>{m.title}</h3>
            <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>{m.subject}</div>
            <a href={m.url} target="_blank" rel="noreferrer" className="btn bs w-full" style={{ justifyContent: 'center' }}>
              View {m.type}
            </a>
          </div>
        ))}
      </div>
    );
  };

  const renderFees = () => {
    const fees = data.fees || [];
    return fees.length === 0 ? <EmptyState icon={CurrencyIcon} title="No Fee Records" /> : (
      <div className="tblwrap card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead><tr><th>Fee Title</th><th>Due Date</th><th>Amount Due</th><th>Amount Paid</th><th>Status</th></tr></thead>
          <tbody>
            {fees.map(f => (
              <tr key={f.id}>
                <td style={{ fontWeight: 600 }}>{f.fee_title}</td>
                <td className="muted">{formatDate(f.due_date)}</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(f.amount_due)}</td>
                <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>{formatCurrency(f.amount_paid)}</td>
                <td>
                  <span className="badge" style={{ background: STATUS_CONFIG[f.status]?.bg, color: STATUS_CONFIG[f.status]?.fg }}>
                    {STATUS_CONFIG[f.status]?.label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAnnouncements = () => {
    const anns = data.announcements || [];
    return anns.length === 0 ? <EmptyState icon={MegaphoneIcon} title="No Announcements" /> : (
      <div className="g2">
        {anns.map(a => (
          <div key={a.id} className="card">
            <div className="fxb" style={{ marginBottom: 12 }}>
              <h3 className="h3" style={{ marginBottom: 0 }}>{a.title}</h3>
              <div className="muted" style={{ fontSize: 12 }}>{formatDate(a.created_at)}</div>
            </div>
            <p className="muted" style={{ fontSize: 14 }}>{a.body}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderPlanner = () => {
    const planner = data.planner || [];
    return planner.length === 0 ? <EmptyState icon={ClockIcon} title="No Planner Items" /> : (
      <div className="g3">
        {planner.map(p => (
          <div key={p.id} className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
            <div className="fxb" style={{ marginBottom: 8 }}>
              <h3 className="h3" style={{ marginBottom: 0 }}>{p.title}</h3>
              <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{p.type}</span>
            </div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CalendarIcon size={14} /> {formatDate(p.date)}
            </div>
            {p.description && <p className="muted" style={{ fontSize: 13 }}>{p.description}</p>}
          </div>
        ))}
      </div>
    );
  };

  const renderAttendance = () => {
    const attendance = data.portfolio?.attendance || {};
    const pct = Number(attendance.attendance_pct) || 0;
    
    return (
      <div className="card" style={{ maxWidth: 600 }}>
        <h3 className="h2" style={{ marginBottom: 16 }}>Attendance Overview</h3>
        <div className="fx" style={{ gap: 24, marginBottom: 24 }}>
          <div className="sc">
            <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Overall Attendance</div>
            <div className="sn" style={{ color: getAttendanceColor(pct) }}>{pct}%</div>
          </div>
          <div className="sc">
            <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Classes Attended</div>
            <div className="sn">{attendance.present_days || 0} / {attendance.total_days || 0}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderProgress = () => {
    const performance = data.portfolio?.performance || {};
    const swot = data.portfolio?.swot || {};
    
    return (
      <div className="g2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 className="h2" style={{ marginBottom: 16 }}>Test Performance</h3>
          <div className="fx" style={{ gap: 24 }}>
            <div className="sc">
              <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Average Score</div>
              <div className="sn" style={{ color: getScoreColor(performance.average_pct) }}>{performance.average_pct || 0}%</div>
            </div>
            <div className="sc">
              <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Tests Taken</div>
              <div className="sn">{performance.tests_taken || 0}</div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <h3 className="h3" style={{ marginBottom: 16, color: 'var(--color-success)' }}>Strengths</h3>
          {swot.strengths?.length > 0 ? (
            <ul style={{ paddingLeft: 20 }}>
              {swot.strengths.map((s, i) => <li key={i} style={{ marginBottom: 8 }}>{s.topic} ({s.accuracy}%)</li>)}
            </ul>
          ) : <div className="muted">No data yet.</div>}
        </div>
        
        <div className="card">
          <h3 className="h3" style={{ marginBottom: 16, color: 'var(--color-error)' }}>Areas to Improve</h3>
          {swot.weaknesses?.length > 0 ? (
            <ul style={{ paddingLeft: 20 }}>
              {swot.weaknesses.map((w, i) => <li key={i} style={{ marginBottom: 8 }}>{w.topic} ({w.accuracy}%)</li>)}
            </ul>
          ) : <div className="muted">No data yet.</div>}
        </div>
      </div>
    );
  };

  const views = {
    home: renderHome,
    timetable: renderTimetable,
    tests: renderTests,
    materials: renderMaterials,
    fees: renderFees,
    announcements: renderAnnouncements,
    planner: renderPlanner,
    attendance: renderAttendance,
    progress: renderProgress,
  };

  const viewNames = {
    home: 'Dashboard', timetable: 'Timetable', tests: 'Tests & Assessments', 
    materials: 'Study Materials', fees: 'Fee Status', announcements: 'Announcements',
    planner: 'Study Planner', attendance: 'Attendance Record', progress: 'My Progress'
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="h1">{viewNames[view] || 'Student Portal'}</h1>
        <p className="page-subtitle">Access your academic information</p>
      </div>
      {(views[view] || renderHome)()}
    </div>
  );
}
