import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET } from '../../utils/api';
import { getGreeting, formatCurrency, formatDate } from '../../utils/helpers';
import { UsersIcon, BuildingIcon, BookOpenIcon, CurrencyIcon, ClipboardIcon, FileTextIcon, UserCheckIcon, ClockIcon, MegaphoneIcon, TrendingUpIcon } from '../../components/common/Icons';
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

  const stats = [
    { label: 'Total Students', value: totalStudents, icon: <UsersIcon size={22} />, fg: '#4f46e5', bg: '#e0e7ff', path: '/admin/students' },
    { label: 'Active Batches', value: batches.length, icon: <BuildingIcon size={22} />, fg: '#10b981', bg: '#d1fae5', path: '/admin/batches' },
    { label: 'Courses', value: courses.length, icon: <BookOpenIcon size={22} />, fg: '#f59e0b', bg: '#fef3c7', path: '/admin/courses' },
    { label: 'Pending Enrollments', value: pendingEnrollments, icon: <UserCheckIcon size={22} />, fg: '#7c3aed', bg: '#f5f3ff', path: '/admin/enrollments' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Welcome Banner */}
      <div className="card glass" style={{ marginBottom: 24, padding: '32px 28px', background: 'var(--gradient-primary)', color: 'white', border: 'none', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(40px)' }}></div>
        <div style={{ position: 'absolute', bottom: '-50%', right: '-10%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(40px)' }}></div>
        
        <div className="fxb" style={{ flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 1 }}>
          <div>
            <h1 className="h1" style={{ color: '#fff', fontSize: 28, marginBottom: 6, fontWeight: 800 }}>
              {getGreeting()}, {user?.full_name}
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 15, fontWeight: 500 }}>{institute.name} • Institute Dashboard</p>
          </div>
          <div className="fx" style={{ gap: 12 }}>
            <button className="btn" style={{ background: '#fff', color: 'var(--color-primary)', fontWeight: 700 }} onClick={() => navigate('/admin/attendance')}>
              <ClipboardIcon size={18} color="var(--color-primary)" /> Mark Attendance
            </button>
            <button className="btn glass hover-glow" style={{ color: '#fff', borderColor: 'rgba(255, 255, 255, 0.4)' }} onClick={() => navigate('/admin/tests')}>
              <FileTextIcon size={18} color="#fff" /> Create Test
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="g4 animate-stagger" style={{ marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} className="sc hover-lift" onClick={() => navigate(s.path)} style={{ cursor: 'pointer' }}>
            <div className="fxb">
              <div>
                <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                <div className="sn" style={{ color: s.fg }}>{s.value}</div>
              </div>
              <div style={{ background: s.bg, width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.fg }}>
                {s.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions + Recent */}
      <div className="g2" style={{ alignItems: 'start', gap: 20 }}>
        {/* Pending Enrollments */}
        <div className="card">
          <div className="fxb" style={{ marginBottom: 14 }}>
            <h3 className="h2" style={{ marginBottom: 0 }}>Pending Enrollments</h3>
            <span className="badge" style={{ background: pendingEnrollments > 0 ? '#fef3c7' : '#d1fae5', color: pendingEnrollments > 0 ? '#d97706' : '#059669' }}>
              {pendingEnrollments > 0 ? `${pendingEnrollments} pending` : 'All clear'}
            </span>
          </div>
          {enrollments.filter(e => e.status === 'pending').slice(0, 5).map(e => (
            <div key={e.id} className="fx" style={{ justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{e.student_name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{e.student_phone}</div>
              </div>
              <button className="btn bp bsm" onClick={() => navigate('/admin/enrollments')}>Review</button>
            </div>
          ))}
          {pendingEnrollments === 0 && (
            <EmptyState icon={UserCheckIcon} title="No Pending Requests" description="All enrollment requests have been processed." />
          )}
        </div>

        {/* Latest Announcements */}
        <div className="card">
          <div className="fxb" style={{ marginBottom: 14 }}>
            <h3 className="h2" style={{ marginBottom: 0 }}>Recent Announcements</h3>
            <button className="btn bs bsm" onClick={() => navigate('/admin/announcements')}>+ New</button>
          </div>
          {announcements.length > 0 ? announcements.slice(0, 3).map(a => (
            <div key={a.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--bg-tertiary)' }}>
              <div className="fxb" style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</span>
                <span className="badge" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>{a.audience}</span>
              </div>
              <p className="muted" style={{ fontSize: 13 }}>{a.body?.slice(0, 100)}{a.body?.length > 100 ? '…' : ''}</p>
            </div>
          )) : (
            <EmptyState icon={MegaphoneIcon} title="No Announcements" description="Create announcements to communicate with students and parents." actionLabel="+ Broadcast" onAction={() => navigate('/admin/announcements')} />
          )}
        </div>
      </div>
    </div>
  );
}
