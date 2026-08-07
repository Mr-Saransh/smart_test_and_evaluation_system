import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET } from '../../utils/api';
import { getGreeting, formatCurrency, formatDate } from '../../utils/helpers';
import { UsersIcon, BuildingIcon, BookOpenIcon, FileTextIcon, UserCheckIcon, MegaphoneIcon, CalendarIcon, ClockIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/common/Skeleton';
import { useNavigate } from 'react-router-dom';

export function Overview() {
  const { user, institute } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!institute) { setLoading(false); return; }
    Promise.all([
      GET(`/batches/${institute.id}`).catch(() => []),
      GET(`/courses/${institute.id}`).catch(() => []),
      GET(`/enrollment/requests/${institute.id}`).catch(() => []),
      GET(`/announcements/institute/${institute.id}`).catch(() => []),
    ]).then(([b, c, e, a]) => {
      setBatches(b); setCourses(c); setEnrollments(e); setAnnouncements(a);
    }).finally(() => setLoading(false));
  }, [institute]);

  const isTeacher = user?.role === 'teacher';
  const totalStudents = batches.reduce((a, c) => a + (c.student_count || 0), 0);
  const pendingEnrollments = enrollments.filter(e => e.status === 'pending').length;

  if (!institute) {
    return (
      <div>
        <h1 className="h1" style={{ marginBottom: 8 }}>{getGreeting()}, {user?.full_name}</h1>
        <p className="muted" style={{ marginBottom: 24 }}>Set up your institute to get started</p>
        <EmptyState
          icon={BuildingIcon}
          title="No Institute Found"
          description="Create your institute profile to start managing courses, batches, and students."
          actionLabel="Set Up Institute"
          onAction={() => navigate('/admin/institute')}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <Skeleton width="300px" height="32px" style={{ marginBottom: 24 }} />
        <div className="g4" style={{ marginBottom: 24 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)}
        </div>
      </div>
    );
  }

  const adminStats = [
    { label: 'Total Students', value: totalStudents, icon: <UsersIcon size={22} />, fg: '#4f46e5', bg: '#e0e7ff', path: '/admin/students' },
    { label: 'Active Batches', value: batches.length, icon: <BuildingIcon size={22} />, fg: '#10b981', bg: '#d1fae5', path: '/admin/batches' },
    { label: 'Courses', value: courses.length, icon: <BookOpenIcon size={22} />, fg: '#f59e0b', bg: '#fef3c7', path: '/admin/courses' },
    { label: 'Pending Requests', value: pendingEnrollments, icon: <UserCheckIcon size={22} />, fg: '#7c3aed', bg: '#f5f3ff', path: '/admin/enrollments' },
  ];

  const teacherStats = [
    { label: 'My Batches', value: batches.length, icon: <BuildingIcon size={22} />, fg: '#10b981', bg: '#d1fae5', path: '/teacher/timetable' },
    { label: 'My Students', value: totalStudents, icon: <UsersIcon size={22} />, fg: '#4f46e5', bg: '#e0e7ff', path: '/teacher/students' },
    { label: 'Announcements', value: announcements.length, icon: <MegaphoneIcon size={22} />, fg: '#f59e0b', bg: '#fef3c7', path: '/teacher/announcements' },
    { label: 'Schedule', value: 'Timetable', icon: <CalendarIcon size={22} />, fg: '#7c3aed', bg: '#f5f3ff', path: '/teacher/timetable' },
  ];

  const stats = isTeacher ? teacherStats : adminStats;
  const prefix = isTeacher ? '/teacher' : '/admin';

  return (
    <div className="animate-fade-in">
      {/* Sleek Welcome Banner */}
      <div className="glass-panel" style={{ marginBottom: 32, padding: '32px', background: 'var(--gradient-brand)', color: 'white', borderRadius: 'var(--radius-xl)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', flexWrap: 'wrap', gap: 24 }}>
        <div style={{ position: 'absolute', top: '-50%', left: '10%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(40px)' }}></div>
        <div style={{ position: 'absolute', bottom: '-50%', right: '10%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.15)', borderRadius: '50%', filter: 'blur(50px)' }}></div>
        
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 250px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            {isTeacher ? '👨‍🏫' : '🎓'}
          </div>
          <div>
            <h1 className="h2" style={{ color: '#fff', marginBottom: 2, fontWeight: 700 }}>
              {getGreeting()}, {user?.full_name}
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13, margin: 0 }}>
              {institute.name} • {isTeacher ? 'Teacher Dashboard' : 'Admin Overview'}
            </p>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(12px)' }} onClick={() => navigate(`${prefix}/attendance`)}>
            Mark Attendance
          </button>
          <button className="btn" style={{ background: '#fff', color: 'var(--color-primary)', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} onClick={() => navigate(`${prefix}/planner`)}>
            Study Planner
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid animate-stagger" style={{ marginBottom: 32 }}>
        {stats.map(s => (
          <div key={s.label} className="glass-panel hover-lift" onClick={() => navigate(s.path)} style={{ cursor: 'pointer', padding: '20px 16px', borderRadius: 'var(--radius-xl)' }}>
            <div className="fxb" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ background: s.bg, width: 44, height: 44, borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.fg }}>
                  {s.icon}
                </div>
              </div>
              <div>
                <div className="h4" style={{ marginBottom: 4, color: 'var(--text-secondary)', fontSize: '0.65rem' }}>{s.label}</div>
                <div className="sn" style={{ color: 'var(--text-primary)', fontSize: '1.75rem' }}>{s.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="g2" style={{ alignItems: 'start', gap: 24 }}>
        
        {/* Dynamic Widget: Enrollments or Timetable shortcut */}
        {!isTeacher ? (
          <div className="glass-panel" style={{ flex: 1, minWidth: 320, padding: 24, borderRadius: 'var(--radius-xl)' }}>
            <div className="fxb" style={{ marginBottom: 24 }}>
              <h3 className="h3" style={{ marginBottom: 0 }}>Pending Enrollments</h3>
              <span className="badge" style={{ background: pendingEnrollments > 0 ? 'var(--color-warning-bg)' : 'var(--color-success-bg)', color: pendingEnrollments > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                {pendingEnrollments > 0 ? `${pendingEnrollments} pending` : 'All clear'}
              </span>
            </div>
            {enrollments.filter(e => e.status === 'pending').slice(0, 5).map(e => (
              <div key={e.id} className="fxb hover-lift" style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', background: 'var(--bg-surface)', marginBottom: 12, cursor: 'pointer' }} onClick={() => navigate('/admin/enrollments')}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{e.student_name}</div>
                  <div className="muted" style={{ fontSize: '0.75rem' }}>{e.student_phone}</div>
                </div>
                <div className="muted" style={{ fontSize: '0.75rem' }}>{formatDate(e.created_at)}</div>
              </div>
            ))}
            {pendingEnrollments === 0 && (
              <EmptyState icon={UserCheckIcon} title="No Pending Requests" description="All enrollment requests have been processed." />
            )}
          </div>
        ) : (
          <div className="card" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="fxb" style={{ marginBottom: 16 }}>
              <h3 className="h3" style={{ marginBottom: 0 }}>Quick Actions</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
               <button className="btn bd w-full" style={{ height: 60, justifyContent: 'center', flexDirection: 'column', gap: 4 }} onClick={() => navigate('/teacher/timetable')}>
                 <CalendarIcon size={18} /> View Timetable
               </button>
               <button className="btn bd w-full" style={{ height: 60, justifyContent: 'center', flexDirection: 'column', gap: 4 }} onClick={() => navigate('/teacher/materials')}>
                 <BookOpenIcon size={18} /> Study Materials
               </button>
               <button className="btn bd w-full" style={{ height: 60, justifyContent: 'center', flexDirection: 'column', gap: 4 }} onClick={() => navigate('/teacher/tests')}>
                 <FileTextIcon size={18} /> Manage Tests
               </button>
               <button className="btn bd w-full" style={{ height: 60, justifyContent: 'center', flexDirection: 'column', gap: 4 }} onClick={() => navigate('/teacher/planner')}>
                 <ClockIcon size={18} /> Planner
               </button>
            </div>
          </div>
        )}

        {/* Latest Announcements */}
        <div className="glass-panel" style={{ flex: 1, minWidth: 320, padding: 24, borderRadius: 'var(--radius-xl)' }}>
          <div className="fxb" style={{ marginBottom: 24 }}>
            <h3 className="h3" style={{ marginBottom: 0 }}>Recent Announcements</h3>
            <button className="btn bs bsm" onClick={() => navigate(`${prefix}/announcements`)}>View All</button>
          </div>
          {announcements.length > 0 ? announcements.slice(0, 4).map(a => (
            <div key={a.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--border-light)' }}>
              <div className="fxb" style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{a.title}</span>
                <span className="badge" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>{a.audience}</span>
              </div>
              <p className="muted" style={{ fontSize: '0.8125rem', lineHeight: 1.5, margin: 0 }}>{a.body?.slice(0, 80)}{a.body?.length > 80 ? '…' : ''}</p>
            </div>
          )) : (
            <EmptyState icon={MegaphoneIcon} title="No Announcements" description="Create announcements to communicate with students and parents." actionLabel={!isTeacher ? "+ Broadcast" : undefined} onAction={!isTeacher ? () => navigate('/admin/announcements') : undefined} />
          )}
        </div>
      </div>
    </div>
  );
}
