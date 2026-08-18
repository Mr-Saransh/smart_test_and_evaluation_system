import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET } from '../../utils/api';
import { getGreeting, formatCurrency, formatDate } from '../../utils/helpers';
import { UsersIcon, BuildingIcon, BookOpenIcon, FileTextIcon, UserCheckIcon, MegaphoneIcon, CalendarIcon, ClockIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/common/Skeleton';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Building, Calendar, IndianRupee, UserCheck, FileText, TrendingUp, AlertCircle, Plus, CreditCard, PlayCircle, ClipboardList, Clock, CheckCircle2, ChevronRight, Megaphone } from 'lucide-react';

export function Overview() {
  const { user, institute } = useAuth();
  const navigate = useNavigate();
  
  // Teacher State
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  
  // Admin State
  const [adminData, setAdminData] = useState(null);
  
  const [loading, setLoading] = useState(true);

  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    if (!institute) { setLoading(false); return; }
    
    if (isTeacher) {
      Promise.all([
        GET(`/batches/${institute.id}`).catch(() => []),
        GET(`/courses/${institute.id}`).catch(() => []),
        GET(`/enrollment/requests/${institute.id}`).catch(() => []),
        GET(`/announcements/institute/${institute.id}`).catch(() => []),
      ]).then(([b, c, e, a]) => {
        setBatches(b); setCourses(c); setEnrollments(e); setAnnouncements(a);
      }).finally(() => setLoading(false));
    } else {
      GET(`/dashboard/admin/${institute.id}`).then(d => {
        setAdminData(d);
      }).catch(err => {
        console.error(err);
      }).finally(() => setLoading(false));
    }
  }, [institute, isTeacher]);

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

  if (isTeacher) {
    const totalStudents = batches.reduce((a, c) => a + (c.student_count || 0), 0);
    const pendingEnrollments = enrollments.filter(e => e.status === 'pending').length;
    
    const teacherStats = [
      { label: 'My Batches', value: batches.length, icon: <BuildingIcon size={22} />, fg: '#10b981', bg: '#d1fae5', path: '/teacher/timetable' },
      { label: 'My Students', value: totalStudents, icon: <UsersIcon size={22} />, fg: '#4f46e5', bg: '#e0e7ff', path: '/teacher/students' },
      { label: 'Announcements', value: announcements.length, icon: <MegaphoneIcon size={22} />, fg: '#f59e0b', bg: '#fef3c7', path: '/teacher/announcements' },
      { label: 'Schedule', value: 'Timetable', icon: <CalendarIcon size={22} />, fg: '#7c3aed', bg: '#f5f3ff', path: '/teacher/timetable' },
    ];

    return (
      <div className="animate-fade-in">
        {/* Sleek Welcome Banner */}
        <div className="glass-panel" style={{ marginBottom: 32, padding: '32px', background: 'var(--gradient-brand)', color: 'white', borderRadius: 'var(--radius-xl)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ position: 'absolute', top: '-50%', left: '10%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(40px)' }}></div>
          <div style={{ position: 'absolute', bottom: '-50%', right: '10%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.15)', borderRadius: '50%', filter: 'blur(50px)' }}></div>
          
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 250px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>👨‍🏫</div>
            <div>
              <h1 className="h2" style={{ color: '#fff', marginBottom: 2, fontWeight: 700 }}>{getGreeting()}, {user?.full_name}</h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13, margin: 0 }}>{institute.name} • Teacher Dashboard</p>
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <button className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(12px)' }} onClick={() => navigate(`/teacher/attendance`)}>Mark Attendance</button>
            <button className="btn" style={{ background: '#fff', color: 'var(--color-primary)', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} onClick={() => navigate(`/teacher/planner`)}>Study Planner</button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="animate-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: 12, marginBottom: 32 }}>
          {teacherStats.map(s => (
            <div key={s.label} className="hover-lift" onClick={() => navigate(s.path)} style={{ background: 'var(--bg-surface)', padding: 16, cursor: 'pointer', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden', width: '100%' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at top right, ${s.fg}15, transparent 70%)` }} />
              <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${s.fg}15, ${s.fg}05)`, color: s.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${s.fg}20`, zIndex: 1 }}>
                {s.icon}
              </div>
              <div style={{ zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: 4, textTransform: 'uppercase' }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="g2" style={{ alignItems: 'start', gap: 24 }}>
          <div className="card" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="fxb" style={{ marginBottom: 16 }}>
              <h3 className="h3" style={{ marginBottom: 0 }}>Quick Actions</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
               <button className="btn bd w-full" style={{ height: 60, justifyContent: 'center', flexDirection: 'column', gap: 4 }} onClick={() => navigate('/teacher/timetable')}><CalendarIcon size={18} /> View Timetable</button>
               <button className="btn bd w-full" style={{ height: 60, justifyContent: 'center', flexDirection: 'column', gap: 4 }} onClick={() => navigate('/teacher/materials')}><BookOpenIcon size={18} /> Study Materials</button>
               <button className="btn bd w-full" style={{ height: 60, justifyContent: 'center', flexDirection: 'column', gap: 4 }} onClick={() => navigate('/teacher/tests')}><FileTextIcon size={18} /> Manage Tests</button>
               <button className="btn bd w-full" style={{ height: 60, justifyContent: 'center', flexDirection: 'column', gap: 4 }} onClick={() => navigate('/teacher/planner')}><ClockIcon size={18} /> Planner</button>
            </div>
          </div>

          <div className="glass-panel" style={{ flex: 1, minWidth: 320, padding: 24, borderRadius: 'var(--radius-xl)' }}>
            <div className="fxb" style={{ marginBottom: 24 }}>
              <h3 className="h3" style={{ marginBottom: 0 }}>Recent Announcements</h3>
              <button className="btn bs bsm" onClick={() => navigate(`/teacher/announcements`)}>View All</button>
            </div>
            {announcements.length > 0 ? announcements.slice(0, 4).map(a => (
              <div key={a.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div className="fxb" style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{a.title}</span>
                  <span className="badge" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>{a.audience}</span>
                </div>
                <p className="muted" style={{ fontSize: '0.8125rem', lineHeight: 1.5, margin: 0 }}>{a.body?.slice(0, 80)}{a.body?.length > 80 ? '…' : ''}</p>
              </div>
            )) : <EmptyState icon={MegaphoneIcon} title="No Announcements" description="" />}
          </div>
        </div>
      </div>
    );
  }

  // ==== ADMIN DASHBOARD OVERVIEW ====
  if (!adminData) return <div className="muted card" style={{textAlign: 'center', padding: 40}}>Failed to load dashboard</div>;

  const m = adminData.metrics;
  const a = adminData.alerts;
  const c = adminData.charts;
  const l = adminData.lists;

  const topMetrics = [
    { title: "TOTAL STUDENTS", value: m.total_students, trend: "View list", color: "#4f46e5", icon: <Users size={20}/>, path: '/admin/students' },
    { title: "ACTIVE BATCHES", value: m.active_batches, trend: "Manage", color: "#10b981", icon: <Building size={20}/>, path: '/admin/batches' },
    { title: "TODAY'S ATTENDANCE", value: `${m.todays_attendance_pct}%`, trend: "Mark now", color: "#3b82f6", icon: <Calendar size={20}/>, path: '/admin/attendance' },
    { title: "FEES PENDING", value: formatCurrency(m.fees_pending), trend: "Collect", color: "#f59e0b", icon: <IndianRupee size={20}/>, path: '/admin/fees' },
    { title: "NEW ADMISSIONS", value: m.new_admissions, trend: "This month", color: "#ec4899", icon: <UserCheck size={20}/>, path: '/admin/enrollments' },
    { title: "TESTS THIS WEEK", value: m.tests_this_week, trend: "View all", color: "#8b5cf6", icon: <FileText size={20}/>, path: '/admin/tests' },
    { title: "AVG PERFORMANCE", value: `${m.avg_performance}%`, trend: "Analytics", color: "#0ea5e9", icon: <TrendingUp size={20}/>, path: '/admin/reports' }
  ];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
  const perfData = [
    { name: 'Excellent (>90%)', value: c.performance.excellent },
    { name: 'Good (75-90%)', value: c.performance.good },
    { name: 'Average (50-75%)', value: c.performance.average },
    { name: 'Needs Improvement (<50%)', value: c.performance.poor },
  ].filter(d => d.value > 0);
  
  const attendData = [
    { name: 'Present', value: c.attendance.present },
    { name: 'Absent', value: c.attendance.absent }
  ];
  const ATTEND_COLORS = ['#10b981', '#ef4444'];

  const feeCollectionPct = c.fees.total > 0 ? Math.round((c.fees.collected / c.fees.total) * 100) : 0;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 60 }}>
      {/* Premium Top Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: 12, marginBottom: 28 }}>
        {topMetrics.map((sm, i) => (
          <div key={i} onClick={() => navigate(sm.path)} className="hover-lift" style={{ background: 'var(--bg-surface)', padding: 16, cursor: 'pointer', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden', width: '100%' }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 100, height: 40, background: `radial-gradient(ellipse at top, ${sm.color}15, transparent 70%)` }} />
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${sm.color}15, ${sm.color}05)`, color: sm.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${sm.color}20`, zIndex: 1 }}>
              {sm.icon}
            </div>
            <div style={{ zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: 4 }}>{sm.title}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{sm.value}</div>
            </div>
            <div style={{ fontSize: 11, color: sm.color, fontWeight: 600, marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, zIndex: 1, background: `${sm.color}10`, padding: '4px 10px', borderRadius: 20 }}>
              {sm.trend} <ChevronRight size={12} />
            </div>
          </div>
        ))}
      </div>

      {/* Alerts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="hover-lift fxb" style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: '0 4px 16px rgba(0,0,0,0.02)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }} onClick={() => navigate('/admin/fees')}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'linear-gradient(to bottom, #f59e0b, #fbbf24)' }} />
          <div className="fx" style={{ gap: 12 }}>
            <div style={{ background: 'linear-gradient(135deg, #f59e0b20, #f59e0b10)', color: '#f59e0b', padding: 10, borderRadius: 10, border: '1px solid #f59e0b20' }}><IndianRupee size={18}/></div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Fee Dues</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{a.fee_dues_students} students</div>
            </div>
          </div>
          <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, background: '#f59e0b10', padding: '4px 8px', borderRadius: 6 }}>View</span>
        </div>

        <div className="hover-lift fxb" style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: '0 4px 16px rgba(0,0,0,0.02)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }} onClick={() => navigate('/admin/attendance')}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'linear-gradient(to bottom, #ef4444, #f87171)' }} />
          <div className="fx" style={{ gap: 12 }}>
            <div style={{ background: 'linear-gradient(135deg, #ef444420, #ef444410)', color: '#ef4444', padding: 10, borderRadius: 10, border: '1px solid #ef444420' }}><AlertCircle size={18}/></div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Low Attendance</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{a.low_attendance_students} students</div>
            </div>
          </div>
          <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, background: '#ef444410', padding: '4px 8px', borderRadius: 6 }}>View</span>
        </div>

        <div className="hover-lift fxb" style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: '0 4px 16px rgba(0,0,0,0.02)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }} onClick={() => navigate('/admin/tests')}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'linear-gradient(to bottom, #3b82f6, #60a5fa)' }} />
          <div className="fx" style={{ gap: 12 }}>
            <div style={{ background: 'linear-gradient(135deg, #3b82f620, #3b82f610)', color: '#3b82f6', padding: 10, borderRadius: 10, border: '1px solid #3b82f620' }}><FileText size={18}/></div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Upcoming Tests</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{a.upcoming_tests} tests</div>
            </div>
          </div>
          <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600, background: '#3b82f610', padding: '4px 8px', borderRadius: 6 }}>View</span>
        </div>

        <div className="hover-lift fxb" style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: '0 4px 16px rgba(0,0,0,0.02)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }} onClick={() => navigate('/admin/enrollments')}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'linear-gradient(to bottom, #8b5cf6, #a78bfa)' }} />
          <div className="fx" style={{ gap: 12 }}>
            <div style={{ background: 'linear-gradient(135deg, #8b5cf620, #8b5cf610)', color: '#8b5cf6', padding: 10, borderRadius: 10, border: '1px solid #8b5cf620' }}><UserCheck size={18}/></div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Pending Admissions</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{a.pending_requests} requests</div>
            </div>
          </div>
          <span style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 600, background: '#8b5cf610', padding: '4px 8px', borderRadius: 6 }}>View</span>
        </div>
      </div>

      {/* Row 1: Student Overview Chart, Performance Donut, Upcoming Tests */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 24, alignItems: 'start' }}>
        
        {/* Student Overview */}
        <div className="card" style={{ padding: 24, gridColumn: '1 / -1' }}>
          <div className="fxb" style={{ marginBottom: 24 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Student Overview</h3>
            <span className="badge" style={{ background: 'var(--bg-secondary)' }}>Last 30 Days</span>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={c.studentTimeline} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="date" tick={{fontSize: 12, fill: 'var(--text-secondary)'}} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={{fontSize: 12, fill: 'var(--text-secondary)'}} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12, fill: 'var(--text-secondary)'}} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Line yAxisId="left" type="monotone" dataKey="active_students" name="Active Students" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="new_admissions" name="New Admissions" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="fx" style={{ gap: 24, marginTop: 16, justifyContent: 'center' }}>
            <div className="fx" style={{ gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}><div style={{width: 10, height: 10, borderRadius: '50%', background: '#3b82f6'}}/> New Admissions</div>
            <div className="fx" style={{ gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}><div style={{width: 10, height: 10, borderRadius: '50%', background: '#10b981'}}/> Active Students</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 24 }}>
          {/* Performance Overview */}
          <div className="card" style={{ padding: 24 }}>
            <div className="fxb" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Performance Overview</h3>
            </div>
            {perfData.length > 0 ? (
              <div className="fx" style={{ gap: 24 }}>
                <div style={{ width: 140, height: 140, position: 'relative' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={perfData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                        {perfData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{m.avg_performance}%</div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Average</div>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  {perfData.map((entry, index) => (
                    <div key={index} className="fxb" style={{ marginBottom: 8 }}>
                      <div className="fx" style={{ gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[index % COLORS.length] }} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{entry.name.split(' ')[0]}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{Math.round((entry.value / c.performance.total_tests) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <div className="muted" style={{ fontSize: 13, textAlign: 'center', padding: 20 }}>No test data available.</div>}
          </div>

          {/* Upcoming Tests */}
          <div className="card" style={{ padding: 24 }}>
            <div className="fxb" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Upcoming Tests</h3>
              <span style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/admin/tests')}>View All</span>
            </div>
            {l.upcoming_tests.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {l.upcoming_tests.map(t => {
                  const daysLeft = Math.ceil((new Date(t.start_time) - new Date()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={t.id} className="fxb" style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 12 }}>
                      <div className="fx" style={{ gap: 12 }}>
                        <div style={{ background: '#3b82f615', color: '#3b82f6', padding: 8, borderRadius: 8 }}><FileText size={16}/></div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{t.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.batch_name || 'All Batches'} • {t.duration_minutes} Min</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{formatDate(t.start_time).split(',')[0]}</div>
                        <div style={{ fontSize: 11, color: daysLeft <= 1 ? '#ef4444' : daysLeft <= 3 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>{daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} Days Left`}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <div className="muted" style={{ fontSize: 13, textAlign: 'center', padding: 20 }}>No upcoming tests scheduled.</div>}
          </div>
      </div>

      {/* Row 2: Fee Collection, Attendance Summary, Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 24 }}>
        
        {/* Fee Collection */}
        <div className="card" style={{ padding: 24 }}>
          <div className="fxb" style={{ marginBottom: 24 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Fee Collection</h3>
            <span className="badge" style={{ background: 'var(--bg-secondary)' }}>Overall</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 800 }}>{formatCurrency(c.fees.collected)}</span>
            <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>Collected</span>
          </div>
          <div className="fxb" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total Fees: <strong>{formatCurrency(c.fees.total)}</strong></span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Pending: <strong style={{ color: '#ef4444' }}>{formatCurrency(c.fees.pending)}</strong></span>
            <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>{feeCollectionPct}%</span>
          </div>
          <div style={{ width: '100%', height: 10, background: 'var(--border-light)', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${feeCollectionPct}%`, background: '#10b981', borderRadius: 5 }} />
          </div>
          <div style={{ marginTop: 24, textAlign: 'right' }}>
             <span style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/admin/fees')}>View Full Report &rarr;</span>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="card" style={{ padding: 24 }}>
          <div className="fxb" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Attendance Summary</h3>
            <span className="badge" style={{ background: 'var(--bg-secondary)' }}>This Week</span>
          </div>
          <div className="fx" style={{ gap: 24 }}>
            <div style={{ width: 120, height: 120, position: 'relative' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={attendData} cx="50%" cy="50%" innerRadius={45} outerRadius={60} paddingAngle={2} dataKey="value">
                    {attendData.map((entry, index) => <Cell key={`cell-${index}`} fill={ATTEND_COLORS[index % ATTEND_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{c.attendance.total > 0 ? Math.round((c.attendance.present / c.attendance.total) * 100) : 0}%</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.1 }}>Overall<br/>Attendance</div>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="fxb">
                <div className="fx" style={{ gap: 8, color: '#10b981' }}><CheckCircle2 size={16}/> <span style={{ fontSize: 13, fontWeight: 600 }}>Present</span></div>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{c.attendance.present}</span>
              </div>
              <div className="fxb">
                <div className="fx" style={{ gap: 8, color: '#ef4444' }}><AlertCircle size={16}/> <span style={{ fontSize: 13, fontWeight: 600 }}>Absent</span></div>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{c.attendance.absent}</span>
              </div>
              <div style={{ height: 1, background: 'var(--border-light)' }}/>
              <div className="fxb">
                <div className="fx" style={{ gap: 8, color: 'var(--text-secondary)' }}><Users size={16}/> <span style={{ fontSize: 13, fontWeight: 600 }}>Total Records</span></div>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{c.attendance.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button className="btn bd" style={{ height: 70, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 12 }} onClick={() => navigate('/admin/students')}>
              <Plus size={20} color="#8b5cf6" /> <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Add Student</span>
            </button>
            <button className="btn bd" style={{ height: 70, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 12 }} onClick={() => navigate('/admin/batches')}>
              <Building size={20} color="#10b981" /> <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Create Batch</span>
            </button>
            <button className="btn bd" style={{ height: 70, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 12 }} onClick={() => navigate('/admin/tests')}>
              <FileText size={20} color="#3b82f6" /> <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Create Test</span>
            </button>
            <button className="btn bd" style={{ height: 70, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 6, borderRadius: 12 }} onClick={() => navigate('/admin/attendance')}>
              <Calendar size={20} color="#f59e0b" /> <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Mark Attendance</span>
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Tests Conducted, Announcements */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
        
        {/* Recent Tests Table */}
        <div className="card" style={{ padding: 24, overflowX: 'auto', gridColumn: '1 / -1' }}>
          <div className="fxb" style={{ marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Recent Tests Conducted</h3>
            <span style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/admin/tests')}>View All</span>
          </div>
          {l.recent_tests.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 0', borderBottom: '1px solid var(--border-light)', fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Test Name</th>
                  <th style={{ textAlign: 'left', padding: '12px 0', borderBottom: '1px solid var(--border-light)', fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Batch</th>
                  <th style={{ textAlign: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-light)', fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Students</th>
                  <th style={{ textAlign: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-light)', fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Avg Score</th>
                  <th style={{ textAlign: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-light)', fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Top Score</th>
                  <th style={{ textAlign: 'right', padding: '12px 0', borderBottom: '1px solid var(--border-light)', fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {l.recent_tests.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '16px 0', fontSize: 13, fontWeight: 600 }}>{t.title}</td>
                    <td style={{ padding: '16px 0', fontSize: 13, color: 'var(--text-secondary)' }}>{t.batch_name || 'All'}</td>
                    <td style={{ padding: '16px 0', fontSize: 13, textAlign: 'center', fontWeight: 600 }}>{t.student_count}</td>
                    <td style={{ padding: '16px 0', fontSize: 13, textAlign: 'center', fontWeight: 700 }}>{t.avg_score ? Math.round(t.avg_score) : 0}%</td>
                    <td style={{ padding: '16px 0', fontSize: 13, textAlign: 'center', fontWeight: 700, color: '#10b981' }}>{t.top_score ? Math.round(t.top_score) : 0}%</td>
                    <td style={{ padding: '16px 0', fontSize: 13, textAlign: 'right', color: 'var(--text-secondary)' }}>{formatDate(t.start_time).split(',')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="muted" style={{ padding: 20, textAlign: 'center' }}>No recent tests found.</div>}
        </div>

        {/* Recent Announcements */}
        <div className="card" style={{ padding: 24, gridColumn: '1 / -1' }}>
          <div className="fxb" style={{ marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Recent Announcements</h3>
            <span style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/admin/announcements')}>View All</span>
          </div>
          {l.announcements.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {l.announcements.map(a => (
                <div key={a.id} className="fx" style={{ gap: 12 }}>
                  <div style={{ padding: 10, borderRadius: '50%', background: a.type === 'alert' ? '#ef444415' : '#f59e0b15', color: a.type === 'alert' ? '#ef4444' : '#f59e0b' }}>
                    <Megaphone size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatDate(a.created_at).split(',')[0]} • {a.target_type === 'all' ? 'All Users' : a.target_type === 'batch' ? 'Batch specific' : 'Teachers'}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="muted" style={{ padding: 20, textAlign: 'center' }}>No recent announcements.</div>}
        </div>
      </div>
    </div>
  );
}
