import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, PUT, toast } from '../../utils/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarIcon, FileTextIcon, BookOpenIcon, ClockIcon, CurrencyIcon, MegaphoneIcon, CheckCircleIcon, UsersIcon, UserCheckIcon } from '../../components/common/Icons';
import { SkeletonTable, SkeletonCard } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency, formatDate, getScoreColor, getAttendanceColor, formatTime, getMondayBasedDayIndex } from '../../utils/helpers';
import { TT_DAYS, STATUS_CONFIG, getSubjectColor } from '../../utils/constants';

export function StudentPortal() {
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [plannerSubmitting, setPlannerSubmitting] = useState(false);

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    date_of_birth: '',
    address: '',
    parent_name: '',
    parent_phone: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ error: '', success: '' });

  const view = location.pathname.split('/')[2] || 'home';
  const todayIdx = getMondayBasedDayIndex();

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    Promise.all([
      GET(user.role === 'parent' ? '/dashboard/parent' : '/dashboard/student').catch(() => ({})),
      GET(`/timetable/me`).catch(() => ({ flat: [] })),
      GET(`/planner/mine`).catch(() => []),
      GET(`/materials/mine`).catch(() => []),
      GET(`/tests/student/mine`).catch(() => []),
      GET(`/announcements/feed`).catch(() => []),
      GET(`/fees/mine`).catch(() => []),
      GET(`/students/me`).catch(() => null)
    ]).then(([portfolio, timetableRes, planner, materials, tests, announcements, fees, profile]) => {
      setData({
        portfolio,
        timetable: timetableRes.flat || timetableRes || [],
        planner,
        materials: materials || [],
        tests: tests || [],
        announcements: announcements || [],
        fees: fees || [],
        profile
      });
      if (profile) {
        setProfileForm({
          full_name: profile.full_name || user?.full_name || '',
          phone: profile.phone || (user?.phone?.startsWith('TMP') ? '' : user?.phone) || '',
          date_of_birth: profile.date_of_birth ? profile.date_of_birth.slice(0, 10) : '',
          address: profile.address || '',
          parent_name: profile.parent_name || '',
          parent_phone: profile.parent_phone || '',
        });
      }
    }).finally(() => setLoading(false));
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.full_name.trim()) {
      setProfileMsg({ error: 'Full name is required', success: '' });
      return;
    }
    if (!profileForm.phone.trim() || !/^(\+?91|0)?[6-9]\d{9}$/.test(profileForm.phone.trim())) {
      setProfileMsg({ error: 'Enter a valid 10-digit mobile number', success: '' });
      return;
    }

    setProfileSaving(true);
    setProfileMsg({ error: '', success: '' });

    try {
      await POST('/students/profile-setup', {
        full_name: profileForm.full_name.trim(),
        phone: profileForm.phone.trim(),
        address: profileForm.address.trim() || null,
        date_of_birth: profileForm.date_of_birth || null,
        parent_name: profileForm.parent_name.trim() || null,
        parent_phone: profileForm.parent_phone.trim() || null,
      });

      updateUser({ full_name: profileForm.full_name.trim(), phone: profileForm.phone.trim(), profile_completed: true });
      setData(prev => ({
        ...prev,
        profile: {
          ...(prev.profile || {}),
          full_name: profileForm.full_name.trim(),
          phone: profileForm.phone.trim(),
          address: profileForm.address.trim(),
          date_of_birth: profileForm.date_of_birth,
          parent_name: profileForm.parent_name.trim(),
          parent_phone: profileForm.parent_phone.trim(),
        }
      }));
      setProfileMsg({ error: '', success: 'Profile updated successfully!' });
      setTimeout(() => setProfileMsg({ error: '', success: '' }), 4000);
    } catch (err) {
      setProfileMsg({ error: err.message || 'Failed to update profile', success: '' });
    } finally {
      setProfileSaving(false);
    }
  };

  const togglePlannerTask = async (taskId) => {
    if (plannerSubmitting) return;
    setPlannerSubmitting(true);
    try {
      const res = await POST(`/planner/${taskId}/toggle`, {});
      setData(prev => ({
        ...prev,
        planner: prev.planner.map(p => p.id === taskId ? { ...p, done: res.done } : p)
      }));
    } catch { /* error handled by api */ }
    setPlannerSubmitting(false);
  };

  const parsePlannerDesc = (desc) => {
    if (!desc) return { text: '', type: 'lecture', subject: '', link: '' };
    let text = desc;
    const typeMatch = text.match(/\[Type: (.*?)\]\n?/);
    const subjMatch = text.match(/\[Subject: (.*?)\]\n?/);
    const linkMatch = text.match(/\[Link: (.*?)\]\n?/);
    if (typeMatch) text = text.replace(typeMatch[0], '');
    if (subjMatch) text = text.replace(subjMatch[0], '');
    if (linkMatch) text = text.replace(linkMatch[0], '');
    return { text: text.trim(), type: typeMatch ? typeMatch[1] : 'lecture', subject: subjMatch ? subjMatch[1] : '', link: linkMatch ? linkMatch[1] : '' };
  };

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
        <div className="glass-panel" style={{ gridColumn: '1 / -1', position: 'relative', overflow: 'hidden', padding: 32, background: 'var(--gradient-brand)', color: 'white', borderRadius: 'var(--radius-xl)', border: 'none' }}>
          <div style={{ position: 'absolute', right: -20, top: -40, opacity: 0.1, fontSize: 180 }}>🎓</div>
          <div className="fxb" style={{ position: 'relative', alignItems: 'flex-start' }}>
            <div>
              <h2 className="h1" style={{ color: '#fff', marginBottom: 4 }}>Welcome back, {user.full_name}</h2>
              <p style={{ color: 'rgba(255,255,255,0.85)', margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>
                {student?.batch || data.profile?.batch_name || 'Enrolled Student'} • Roll {student?.roll_number || data.profile?.roll_number || 'No Roll No'}
              </p>
            </div>
            {user.role === 'student' && (
              <button 
                className="btn bs bsm" 
                onClick={() => navigate('/student/profile')}
                style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', backdropFilter: 'blur(8px)' }}
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="glass-panel hover-lift" onClick={() => navigate('/student/attendance')} style={{ cursor: 'pointer', flex: 1, padding: 24, borderRadius: 'var(--radius-xl)' }}>
          <div className="muted" style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase' }}>Attendance</div>
          <div className="sn" style={{ color: getAttendanceColor(pct), fontSize: '2.5rem', margin: '8px 0' }}>{pct}%</div>
          <div className="muted" style={{ fontSize: '0.75rem' }}>{attendance?.present_days || 0} / {attendance?.total_days || 0} days present</div>
        </div>
        <div className="glass-panel hover-lift" onClick={() => navigate('/student/progress')} style={{ cursor: 'pointer', flex: 1, padding: 24, borderRadius: 'var(--radius-xl)' }}>
          <div className="muted" style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase' }}>Average Score</div>
          <div className="sn" style={{ color: getScoreColor(p.average_pct), fontSize: '2.5rem', margin: '8px 0' }}>{p.average_pct || 0}%</div>
          <div className="muted" style={{ fontSize: '0.75rem' }}>Across {p.tests_taken || 0} tests</div>
        </div>

        {/* Parent Dashboard additions: Info Cards for fee status summary */}
        {data.fees?.length > 0 && (
          <div className="glass-panel hover-lift" onClick={() => navigate('/student/fees')} style={{ cursor: 'pointer', gridColumn: '1 / -1', background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-light)', padding: 24, borderRadius: 'var(--radius-xl)' }}>
            <div className="fxb w-full">
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)' }}>Fees Overview</div>
                <div className="muted" style={{ fontSize: '0.75rem' }}>Click to view details</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {formatCurrency(data.fees.reduce((acc, f) => acc + Number(f.amount_due || 0) - Number(f.amount_paid || 0), 0))}
                </div>
                <div className="muted" style={{ fontSize: '0.75rem' }}>Total Pending</div>
              </div>
            </div>
          </div>
        )}

        <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: 24, borderRadius: 'var(--radius-xl)' }}>
          <div className="fxb" style={{ marginBottom: 24 }}>
            <h3 className="h3" style={{ marginBottom: 0 }}>Recent Performance</h3>
            <button className="btn bd bsm" onClick={() => navigate('/student/progress')}>View All</button>
          </div>
          {p.recent_tests?.length > 0 ? (
            <div style={{ margin: '0 -24px -24px -24px', borderTop: '1px solid var(--border-light)', overflowX: 'auto' }}>
              <table className="data-grid">
                <thead><tr><th>Test</th><th>Score</th><th>%</th></tr></thead>
                <tbody>
                  {p.recent_tests.slice(0, 3).map((t, i) => (
                    <tr key={i}>
                      <td data-label="Test" style={{ fontWeight: 600 }}>{t.title}</td>
                      <td data-label="Score">{t.score}/{t.max_marks}</td>
                      <td data-label="%"><span style={{ fontWeight: 700, color: getScoreColor(t.percentage) }}>{t.percentage}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="muted" style={{ paddingBottom: 12 }}>No test results available yet.</div>}
        </div>
      </div>
    );
  };

  const renderTimetable = () => {
    const slots = data.timetable || [];
    const schedule = {};
    for (let i=0; i<7; i++) schedule[i] = [];
    slots.forEach(s => { const d = typeof s.day_of_week === 'number' ? s.day_of_week : 0; schedule[d].push(s); });
    Object.keys(schedule).forEach(d => schedule[d].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')));

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const isCurrentSlot = (s) => {
      if (s.day_of_week !== todayIdx) return false;
      const [sh, sm] = (s.start_time || '0:0').split(':').map(Number);
      const [eh, em] = (s.end_time || '0:0').split(':').map(Number);
      return nowMinutes >= sh * 60 + sm && nowMinutes < eh * 60 + em;
    };

    if (slots.length === 0) return <EmptyState icon={CalendarIcon} title="No Classes Scheduled" description="Your weekly timetable hasn't been set up yet." />;

    return (
      <div className="card" style={{ padding: 20, overflowX: 'auto', background: 'var(--bg-secondary)' }}>
        <h3 className="h2" style={{ marginBottom: 20 }}>Weekly Schedule</h3>
        <div style={{ minWidth: 800, display: 'flex', gap: 12 }}>
          {TT_DAYS.map((day, dayIdx) => {
            const isToday = dayIdx === todayIdx;
            return (
              <div key={day} style={{ flex: 1, minWidth: 120 }}>
                <div style={{
                  padding: '10px 0', borderBottom: isToday ? '3px solid var(--color-primary)' : '2px solid var(--border-color)',
                  marginBottom: 12, textAlign: 'center', fontWeight: 700, fontSize: 13,
                  color: isToday ? 'var(--color-primary)' : 'var(--text-secondary)',
                  background: isToday ? 'var(--color-primary-bg)' : 'transparent', borderRadius: isToday ? '8px 8px 0 0' : 0,
                }}>
                  {day.slice(0, 3)}
                  {isToday && <span style={{ display: 'block', fontSize: 10, fontWeight: 500, opacity: 0.7 }}>Today</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {schedule[dayIdx].length === 0 ? (
                    <div className="empty" style={{ padding: '24px 0', fontSize: 11, color: 'var(--text-tertiary)' }}>—</div>
                  ) : (
                    schedule[dayIdx].map(s => {
                      const [bg, fg] = getSubjectColor(s.subject);
                      const isCurrent = isCurrentSlot(s);
                      return (
                        <div key={s.id} className={isCurrent ? 'pulse-border' : ''} style={{
                          width: '100%', padding: '10px 12px', borderRadius: 10, background: bg,
                          borderLeft: `3px solid ${fg}`, position: 'relative',
                          boxShadow: isCurrent ? `0 0 12px ${fg}33` : 'none',
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: fg, marginBottom: 4, lineHeight: 1.2 }}>{s.subject}</div>
                          <div style={{ fontSize: 11, color: fg, opacity: 0.85, marginBottom: 2, fontWeight: 500 }}>
                            {formatTime(s.start_time)} – {formatTime(s.end_time)}
                          </div>
                          {s.teacher_name && <div style={{ fontSize: 11, color: fg, opacity: 0.8 }}>👨‍🏫 {s.teacher_name}</div>}
                          {s.room && <div style={{ fontSize: 11, color: fg, opacity: 0.8 }}>📍 {s.room}</div>}
                          {isCurrent && (
                            <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: fg, animation: 'pulse 1.5s infinite' }} />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTests = () => {
    const tests = data.tests || [];
    return tests.length === 0 ? <EmptyState icon={FileTextIcon} title="No Tests Available" description="No active or upcoming tests for your batch." /> : (
      <div className="g3">
        {tests.map(t => (
          <div key={t.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="fxb" style={{ marginBottom: 4 }}>
              <h3 className="h3" style={{ marginBottom: 0 }}>{t.title}</h3>
              <span className="badge" style={{ background: t.status === 'active' ? '#d1fae5' : '#f1f5f9', color: t.status === 'active' ? '#059669' : '#475569' }}>
                {t.status.toUpperCase()}
              </span>
            </div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{t.subject}</div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 16, flex: 1 }}>
              <div className="fx" style={{ gap: 6, marginBottom: 4 }}>🕒 {t.duration_min} mins</div>
              <div className="fx" style={{ gap: 6, marginBottom: 4 }}>🎯 {t.total_marks} marks</div>
              {t.start_date && t.end_date && <div className="fx" style={{ gap: 6 }}>📅 {formatDate(t.start_date)} to {formatDate(t.end_date)}</div>}
            </div>
            {t.status === 'active' && !t.submitted && (t.attempts_used < (t.attempt_limit || 1)) && (
              <button className="btn bp w-full" style={{ justifyContent: 'center' }} onClick={() => navigate(`/play-test/${t.id}`)}>
                Start Test (Attempt {t.attempts_used + 1}/{t.attempt_limit || 1})
              </button>
            )}
            {t.submitted && (
              <div className="fxb" style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 8, marginTop: 8 }}>
                <div style={{ fontSize: 13 }}>Score: <strong style={{ color: getScoreColor((t.score/t.max_marks)*100) }}>{t.score}/{t.max_marks}</strong></div>
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

  const renderPlanner = () => {
    const planner = data.planner || [];
    
    // Sort planner into Done and Todo
    const todo = planner.filter(p => !p.done);
    const done = planner.filter(p => p.done);
    
    if (planner.length === 0) return <EmptyState icon={ClockIcon} title="No Study Tasks" description="Your teachers haven't added any planner items yet." />;

    const typeColors = { lecture: { bg: '#e0e7ff', fg: '#4f46e5' }, test: { bg: '#fee2e2', fg: '#ef4444' }, holiday: { bg: '#d1fae5', fg: '#10b981' }, event: { bg: '#fef3c7', fg: '#f59e0b' } };

    const TaskCard = ({ p }) => {
      const meta = parsePlannerDesc(p.description);
      const tColor = typeColors[meta.type] || typeColors.lecture;
      
      return (
        <div className={`card ${p.done ? 'card-dimmed' : ''}`} style={{ borderLeft: `4px solid ${tColor.fg}`, transition: 'all 0.2s' }}>
          <div className="fxb" style={{ marginBottom: 12 }}>
            <div className="fx" style={{ gap: 12 }}>
              <button 
                className="btn-icon" 
                onClick={() => togglePlannerTask(p.id)}
                disabled={plannerSubmitting}
                style={{ 
                  width: 24, height: 24, padding: 0,
                  color: p.done ? 'var(--color-success)' : 'var(--text-tertiary)',
                  transition: 'color 0.2s, transform 0.1s'
                }}
              >
                <CheckCircleIcon size={24} />
              </button>
              <div>
                <h3 className="h3" style={{ marginBottom: 4, textDecoration: p.done ? 'line-through' : 'none', color: p.done ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{p.title}</h3>
                <div className="muted fx" style={{ gap: 8, fontSize: 12 }}>
                  <span className="badge" style={{ background: tColor.bg, color: tColor.fg, textTransform: 'capitalize' }}>{meta.type}</span>
                  {meta.subject && <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>{meta.subject}</span>}
                  <span className="fx" style={{ gap: 4 }}><CalendarIcon size={12} /> {formatDate(p.due_date)}</span>
                </div>
              </div>
            </div>
          </div>
          {meta.text && <p className="muted" style={{ fontSize: 13, marginBottom: 12, marginLeft: 36 }}>{meta.text}</p>}
          {meta.link && (
            <div style={{ marginLeft: 36 }}>
              <a href={meta.link.startsWith('http') ? meta.link : `https://${meta.link}`} target="_blank" rel="noreferrer" 
                 className="btn bsm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                🔗 View Material
              </a>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="g2" style={{ alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 className="h2" style={{ marginBottom: 0 }}>To Do ({todo.length})</h2>
          {todo.length === 0 && <div className="card" style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>🎉 All caught up!</div>}
          {todo.map(p => <TaskCard key={p.id} p={p} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 className="h2" style={{ marginBottom: 0 }}>Completed ({done.length})</h2>
          {done.length === 0 && <div className="card" style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>No completed tasks yet.</div>}
          {done.map(p => <TaskCard key={p.id} p={p} />)}
        </div>
      </div>
    );
  };

  const renderMaterials = () => {
    const mats = data.materials || [];
    return mats.length === 0 ? <EmptyState icon={BookOpenIcon} title="No Materials" /> : (
      <div className="g3">
        {mats.map(m => (
          <div key={m.id} className="card card-hover">
            <div className="fxb" style={{ marginBottom: 12 }}>
              <h3 className="h3" style={{ marginBottom: 0 }}>{m.title}</h3>
              <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{m.type}</span>
            </div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>{m.subject}</div>
            <a href={m.url} target="_blank" rel="noreferrer" className="btn bs w-full" style={{ justifyContent: 'center' }}>
              View Material
            </a>
          </div>
        ))}
      </div>
    );
  };

  const renderFees = () => {
    const fees = data.fees || [];
    if (fees.length === 0) {
      return (
         <div className="card" style={{ textAlign: 'center', padding: '60px 20px', background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-success-bg)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <CheckCircleIcon size={40} />
            </div>
            <h2 className="h2" style={{ marginBottom: 8 }}>All Clear!</h2>
            <p className="muted" style={{ maxWidth: 400, margin: '0 auto' }}>You have no pending fee records. Your financial status is completely up to date.</p>
         </div>
      );
    }
    
    const totalDue = fees.reduce((sum, f) => sum + Number(f.amount_due || 0), 0);
    const totalPaid = fees.reduce((sum, f) => sum + Number(f.amount_paid || 0), 0);
    const pending = totalDue - totalPaid;

    return (
      <div className="fx" style={{ flexDirection: 'column', gap: 24 }}>
        <div className="g3">
          <div className="card" style={{ background: pending > 0 ? '#fff1f2' : '#f0fdf4', border: `1px solid ${pending > 0 ? '#fecdd3' : '#bbf7d0'}` }}>
            <div className="muted" style={{ fontSize: 13, fontWeight: 600, color: pending > 0 ? '#e11d48' : '#15803d' }}>Total Pending</div>
            <div className="sn" style={{ color: pending > 0 ? '#be123c' : '#166534', fontSize: 32 }}>{formatCurrency(pending)}</div>
          </div>
          <div className="card">
            <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Total Paid</div>
            <div className="sn" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalPaid)}</div>
          </div>
          <div className="card">
            <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Total Fees</div>
            <div className="sn" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalDue)}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="tbl" style={{ border: 'none' }}>
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
      </div>
    );
  };

  const renderAnnouncements = () => {
    const anns = data.announcements || [];
    return anns.length === 0 ? <EmptyState icon={MegaphoneIcon} title="No Announcements" /> : (
      <div className="g2">
        {anns.map(a => (
          <div key={a.id} className="card card-hover" style={{ borderLeft: '4px solid var(--color-primary)' }}>
            <div className="fxb" style={{ marginBottom: 12 }}>
              <h3 className="h3" style={{ marginBottom: 0 }}>{a.title}</h3>
              <div className="muted" style={{ fontSize: 12 }}>{formatDate(a.created_at)}</div>
            </div>
            <p className="muted" style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{a.body}</p>
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
            <div className="sn" style={{ color: getAttendanceColor(pct), fontSize: 40 }}>{pct}%</div>
          </div>
          <div className="sc">
            <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Classes Attended</div>
            <div className="sn" style={{ fontSize: 40 }}>{attendance.present_days || 0} <span style={{ fontSize: 16, color: 'var(--text-tertiary)' }}>/ {attendance.total_days || 0}</span></div>
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
              <div className="sn" style={{ color: getScoreColor(performance.average_pct), fontSize: 40 }}>{performance.average_pct || 0}%</div>
            </div>
            <div className="sc">
              <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Tests Taken</div>
              <div className="sn" style={{ fontSize: 40 }}>{performance.tests_taken || 0}</div>
            </div>
          </div>
        </div>
        
        <div className="card" style={{ borderTop: '4px solid var(--color-success)' }}>
          <h3 className="h3" style={{ marginBottom: 16, color: 'var(--color-success)' }}>Strengths</h3>
          {swot.strengths?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {swot.strengths.map((s, i) => (
                <div key={i} className="fxb" style={{ padding: 12, background: 'var(--color-success-bg)', borderRadius: 8 }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>{s.topic}</span>
                  <span className="badge" style={{ background: '#fff', color: 'var(--color-success)' }}>{s.accuracy}% Acc</span>
                </div>
              ))}
            </div>
          ) : <div className="muted">No data yet. Keep practicing!</div>}
        </div>
        
        <div className="card" style={{ borderTop: '4px solid var(--color-error)' }}>
          <h3 className="h3" style={{ marginBottom: 16, color: 'var(--color-error)' }}>Areas to Improve</h3>
          {swot.weaknesses?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {swot.weaknesses.map((w, i) => (
                <div key={i} className="fxb" style={{ padding: 12, background: '#fff1f2', borderRadius: 8 }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-error)' }}>{w.topic}</span>
                  <span className="badge" style={{ background: '#fff', color: 'var(--color-error)' }}>{w.accuracy}% Acc</span>
                </div>
              ))}
            </div>
          ) : <div className="muted">No data yet. You're doing great!</div>}
        </div>
      </div>
    );
  };

  const renderProfile = () => {
    const prof = data.profile || {};
    return (
      <div className="animate-fade-in" style={{ maxWidth: 800 }}>
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="fxb" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 className="h2" style={{ marginBottom: 4 }}>Student Profile</h2>
              <p className="muted" style={{ fontSize: 13 }}>View and update your personal & guardian contact details</p>
            </div>
            <div className="fx" style={{ gap: 8 }}>
              {prof.batch_name && (
                <span className="badge" style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary)', fontWeight: 600 }}>
                  Batch: {prof.batch_name}
                </span>
              )}
              {prof.roll_number && (
                <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  Roll: {prof.roll_number}
                </span>
              )}
              {prof.institute_name && (
                <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  🏫 {prof.institute_name}
                </span>
              )}
            </div>
          </div>

          {profileMsg.error && (
            <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500 }}>
              {profileMsg.error}
            </div>
          )}
          {profileMsg.success && (
            <div style={{ padding: '12px 16px', background: '#d1fae5', color: '#059669', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500 }}>
              {profileMsg.success}
            </div>
          )}

          <form onSubmit={handleSaveProfile}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              👤 Personal Information
            </div>
            <div className="g2" style={{ marginBottom: 16 }}>
              <div className="field">
                <label>Full Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input
                  type="text"
                  className="inp"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Your full name"
                />
              </div>
              <div className="field">
                <label>Mobile Number <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input
                  type="tel"
                  className="inp"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="10-digit mobile number"
                />
              </div>
              <div className="field">
                <label>Email Address</label>
                <input
                  type="email"
                  className="inp"
                  value={prof.email || user?.email || ''}
                  disabled
                  style={{ background: 'var(--bg-secondary)', cursor: 'not-allowed', color: 'var(--text-tertiary)' }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Used for account sign in</div>
              </div>
              <div className="field">
                <label>Date of Birth</label>
                <input
                  type="date"
                  className="inp"
                  value={profileForm.date_of_birth}
                  onChange={(e) => setProfileForm(p => ({ ...p, date_of_birth: e.target.value }))}
                />
              </div>
            </div>

            <div className="field" style={{ marginBottom: 24 }}>
              <label>Residential Address</label>
              <textarea
                className="inp"
                rows={2}
                value={profileForm.address}
                onChange={(e) => setProfileForm(p => ({ ...p, address: e.target.value }))}
                placeholder="Enter complete residential address"
              />
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              👨‍👩‍👧 Guardian / Parent Details
            </div>
            <div className="g2" style={{ marginBottom: 24 }}>
              <div className="field">
                <label>Parent / Guardian Name</label>
                <input
                  type="text"
                  className="inp"
                  value={profileForm.parent_name}
                  onChange={(e) => setProfileForm(p => ({ ...p, parent_name: e.target.value }))}
                  placeholder="Parent's full name"
                />
              </div>
              <div className="field">
                <label>Parent Mobile Number</label>
                <input
                  type="tel"
                  className="inp"
                  value={profileForm.parent_phone}
                  onChange={(e) => setProfileForm(p => ({ ...p, parent_phone: e.target.value }))}
                  placeholder="10-digit mobile number"
                />
              </div>
            </div>

            <div className="fx" style={{ gap: 12 }}>
              <button type="submit" className="btn bp" disabled={profileSaving}>
                {profileSaving ? 'Saving Changes...' : 'Save Profile Details'}
              </button>
            </div>
          </form>
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
    profile: renderProfile,
  };

  const viewNames = {
    home: 'Dashboard', timetable: 'Timetable', tests: 'Tests & Assessments', 
    materials: 'Study Materials', fees: 'Fee Status', announcements: 'Announcements',
    planner: 'Study Planner', attendance: 'Attendance Record', progress: 'My Progress',
    profile: 'My Profile',
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
