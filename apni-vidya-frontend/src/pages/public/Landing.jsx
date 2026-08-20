import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCapIcon, UsersIcon, ClipboardIcon, FileTextIcon,
  CurrencyIcon, BookOpenIcon, ArrowRightIcon, CheckCircleIcon,
  ShieldIcon, CalendarIcon, AwardIcon, ChevronRightIcon,
  TrendingUpIcon, ClockIcon, CpuIcon, TrophyIcon, BellIcon,
  UserCheckIcon, SettingsIcon, SearchIcon, FilterIcon, BuildingIcon
} from '../../components/common/Icons';
import './Landing.css';

export function Landing() {
  // State for interactive elements
  const [openFaq, setOpenFaq] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [consoleTab, setConsoleTab] = useState('overview');
  const [studentCount, setStudentCount] = useState(350);
  const [reminderSent, setReminderSent] = useState(false);

  // Configuration for Institute Branding
  const instituteName = "Apni Vidya";
  const instituteLogoUrl = "/logo.png";

  const modules = [
    {
      id: 'admissions',
      title: 'QR Student Onboarding',
      icon: UsersIcon,
      accent: '#2563eb',
      category: 'admissions',
      badge: 'Zero Paperwork',
      desc: 'Eliminate manual paperwork. Share your custom QR code on your reception desk, flyers, or social media. Students fill their own profiles, and you approve them in one click.'
    },
    {
      id: 'attendance',
      title: '1-Tap Digital Attendance',
      icon: ClipboardIcon,
      accent: '#0284c7',
      category: 'operations',
      badge: 'Real-Time Alerts',
      desc: 'Take attendance batch-by-batch in under 10 seconds. Parents receive instant absent notifications and digital records are saved automatically.'
    },
    {
      id: 'assessments',
      title: 'Online & Subjective Exams',
      icon: FileTextIcon,
      accent: '#d97706',
      category: 'academics',
      badge: 'Auto-Graded & SWOT',
      desc: 'Create chapter tests from question banks. Objective tests are auto-graded instantly with leaderboards, percentiles, and topic SWOT weakness analysis.'
    },
    {
      id: 'fees',
      title: 'Fee Collection & Invoicing',
      icon: CurrencyIcon,
      accent: '#e11d48',
      category: 'finance',
      badge: 'Digital Invoicing',
      desc: 'Set installment schedules, track pending dues, send 1-click reminders, and record payments with automated digital PDF receipts.'
    },
    {
      id: 'materials',
      title: 'Study Notes & Video Vault',
      icon: BookOpenIcon,
      accent: '#7c3aed',
      category: 'academics',
      badge: 'Categorized Vault',
      desc: 'Upload PDFs, assignment keys, and private lecture recordings categorized cleanly by subject, chapter, and batch.'
    },
    {
      id: 'timetable',
      title: 'Batch Timetable Planner',
      icon: CalendarIcon,
      accent: '#059669',
      category: 'operations',
      badge: 'Clash Detection',
      desc: 'Visual weekly timetable scheduling with automatic teacher and room clash detection. Students and faculty see live updated schedules on their portals.'
    }
  ];

  const filteredModules = activeTab === 'all' 
    ? modules 
    : modules.filter(m => m.category === activeTab || m.id === activeTab);

  const faqs = [
    {
      q: `How does ${instituteName} help coaching institutes?`,
      a: `${instituteName} is a complete, unified management platform. It replaces manual paper registers, scattered communication channels, and spreadsheets with one centralized dashboard for admissions, attendance, exams, fees, and study materials.`
    },
    {
      q: 'How do parents stay updated with student progress?',
      a: `${instituteName} provides real-time notifications for attendance, test score cards, and fee receipts directly via the dedicated parent and student portal.`
    },
    {
      q: 'Do students and teachers get their own logins?',
      a: 'Yes. The system provides dedicated portals for Institute Admins, Teachers, and Students with granular Role-Based Access Controls (RBAC).'
    },
    {
      q: 'How does fee tracking and invoicing work?',
      a: 'You can define custom course fees and installment plans, record payments with instant PDF receipt generation, and track pending dues with 1-click reminders.'
    },
    {
      q: 'How fast can our institute get started?',
      a: 'You can create your institute account, upload your student list or generate your admission QR code, and start taking digital attendance in less than 5 minutes.'
    }
  ];

  const handleSendReminderSimulation = () => {
    setReminderSent(true);
    setTimeout(() => setReminderSent(false), 4000);
  };

  // ROI dynamic calculations
  const hoursSavedPerMonth = Math.round(studentCount * 0.12);
  const revenueLeakagePrevented = (studentCount * 380).toLocaleString('en-IN');
  const paperSavingsPerMonth = (studentCount * 40).toLocaleString('en-IN');

  return (
    <div className="landing-page">
      
      {/* ─── 1. ULTRA-RESPONSIVE TOPBAR ─── */}
      <header className="landing-header">
        <Link to="/" className="landing-brand" aria-label="Home">
          {instituteLogoUrl ? (
            <div className="landing-logo-box">
              <img src={instituteLogoUrl} alt={instituteName} className="landing-logo-img" />
            </div>
          ) : (
            <>
              <div className="landing-brand-icon">
                <GraduationCapIcon size={22} color="#fff" />
              </div>
              <span className="landing-brand-name">
                {instituteName}
              </span>
            </>
          )}
        </Link>

        {/* Desktop Navigation Quick-Links */}
        <nav className="landing-nav desktop-only">
          <a href="#console">Live Demo</a>
          <a href="#roles">Portals</a>
          <a href="#calculator">ROI Calculator</a>
          <a href="#features">Features</a>
          <a href="#faq">FAQ</a>
        </nav>

        {/* Action Buttons */}
        <div className="landing-header-actions">
          <Link to="/login" className="landing-signin-btn hover-lift">
            Sign In
          </Link>
          <Link to="/signup" className="landing-signup-btn hover-lift">
            <span>Start Free</span>
            <ArrowRightIcon size={15} />
          </Link>
        </div>
      </header>

      {/* ─── 2. STATE-OF-THE-ART HERO SECTION ─── */}
      <section className="landing-hero">
        <div className="landing-hero-grid-pattern" />
        <div className="landing-hero-glow-1" />
        <div className="landing-hero-glow-2" />
        
        <div className="landing-hero-container">
          
          {/* Badge */}
          <div className="landing-hero-badge">
            <span className="landing-live-pulse" />
            <AwardIcon size={15} color="#fbbf24" />
            <span>Upgrade your Institute with the power of AI</span>
          </div>

          {/* Heading */}
          <h1 className="landing-hero-title">
            Your Institute.<br />
            <span className="landing-hero-title-highlight">
              Reimagined for the Future.
            </span>
          </h1>

          {/* Paragraph */}
          <p className="landing-hero-desc">
            You focus on teaching. We simplify everything else. From student onboarding to fees, attendance, exams, performance and communication—run your entire institute from one intelligent platform designed to save time, reduce leakage and accelerate growth.
          </p>
          <p className="landing-hero-tagline">
            Run Smarter. Save More. Grow Faster.
          </p>

          {/* CTAs */}
          <div className="landing-hero-ctas">
            <Link to="/signup" className="landing-cta-primary hover-lift">
              <span>Start Free 14-Day Trial</span>
              <ArrowRightIcon size={18} />
            </Link>
            <a href="#console" className="landing-cta-secondary hover-lift">
              <span>Explore Live Console</span>
              <ChevronRightIcon size={18} />
            </a>
          </div>

          {/* Trust Bullets */}
          <div className="landing-trust-bullets">
            <div className="landing-trust-bullet-item">
              <span className="landing-trust-check">✓</span>
              <span>No Credit Card Required</span>
            </div>
            <div className="landing-trust-bullet-item">
              <span className="landing-trust-check">✓</span>
              <span>5-Minute Setup</span>
            </div>
            <div className="landing-trust-bullet-item">
              <span className="landing-trust-check">✓</span>
              <span>Cloud Backup & Instant Reports</span>
            </div>
          </div>

          {/* ─── 3. INTERACTIVE HERO ERP CONSOLE SHOWCASE ─── */}
          <div id="console" className="landing-console-frame">
            
            {/* Window Header with Mac Controls + Interactive View Tabs */}
            <div className="landing-console-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="landing-window-controls">
                  <span className="landing-traffic-dot" style={{ background: '#ef4444' }} />
                  <span className="landing-traffic-dot" style={{ background: '#f59e0b' }} />
                  <span className="landing-traffic-dot" style={{ background: '#10b981' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.02em' }} className="desktop-only">
                  {instituteName} Command Center
                </span>
              </div>

              {/* View Switcher Tabs */}
              <div className="landing-console-tabs">
                {[
                  { id: 'overview', label: '📊 Live Attendance', icon: TrendingUpIcon },
                  { id: 'admissions', label: '📲 QR Admissions', icon: UsersIcon },
                  { id: 'exams', label: '📝 AI Exams', icon: AwardIcon },
                  { id: 'fees', label: '💳 Fee Invoicing', icon: CurrencyIcon },
                  { id: 'timetable', label: '📅 Timetable', icon: CalendarIcon }
                ].map(tab => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setConsoleTab(tab.id)}
                      className={`landing-console-tab-btn ${consoleTab === tab.id ? 'active' : ''}`}
                    >
                      <TabIcon size={14} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Console Interactive Body */}
            <div className="landing-console-body">
              
              {/* TAB 1: OVERVIEW & ATTENDANCE */}
              {consoleTab === 'overview' && (
                <div>
                  <div className="landing-metrics-row">
                    <div className="landing-metric-box">
                      <div className="landing-metric-label">Today's Batch Attendance</div>
                      <div className="landing-metric-val" style={{ color: '#60a5fa' }}>
                        98.4% 
                        <span className="landing-metric-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                          +2.4% vs last week
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                        48/50 Present in <strong>Class 12 IIT-JEE</strong>
                      </div>
                    </div>

                    <div className="landing-metric-box">
                      <div className="landing-metric-label">Active Enrolled Students</div>
                      <div className="landing-metric-val" style={{ color: '#fbbf24' }}>
                        1,240
                        <span className="landing-metric-badge" style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' }}>
                          100% QR Verified
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                        Across 14 Active Batches
                      </div>
                    </div>

                    <div className="landing-metric-box">
                      <div className="landing-metric-label">August Fee Collections</div>
                      <div className="landing-metric-val" style={{ color: '#34d399' }}>
                        ₹4,82,500
                        <span className="landing-metric-badge" style={{ background: 'rgba(37, 99, 235, 0.2)', color: '#93c5fd' }}>
                          Auto Invoiced
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                        ₹38,000 pending across 6 students
                      </div>
                    </div>
                  </div>

                  {/* Live Stream / Feed Simulation Strip */}
                  <div className="landing-feed-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div className="landing-alert-pill">
                        <span>📢 Instant Parent Alert</span>
                      </div>
                      <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Parent of <strong>Aarav Sharma (Class 12)</strong> notified of on-time attendance at 08:30 AM.
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: '#34d399', fontWeight: 800, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                      Delivered Instantly
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: QR ADMISSIONS */}
              {consoleTab === 'admissions' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 14, padding: 18 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                        📲 Custom Institute QR Code
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 80, height: 80, background: '#ffffff', borderRadius: 10, padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: '100%', height: '100%', border: '4px dashed #1e3a8a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#1e3a8a' }}>
                            QR SCAN
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#ffffff' }}>Self-Onboarding Link</div>
                          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Place on reception desk, flyers, or social media</div>
                          <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700, marginTop: 6 }}>apnividya.in/enroll/apex-academy</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 14, padding: 18 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                        ⚡ Real-Time Applicant Queue
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 8 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>Rohan Verma</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Class 11 Physics • Scanned 2m ago</div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 800, background: '#2563eb', color: '#fff', padding: '4px 10px', borderRadius: 6 }}>
                            1-Click Approve
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: 8 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>Ananya Iyer</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Class 12 Chemistry • Enrolled</div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 800, background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '4px 10px', borderRadius: 6 }}>
                            ✓ Active
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: AI EXAMS & SWOT */}
              {consoleTab === 'exams' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 14, padding: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#fbbf24' }}>LIVE TEST EVALUATION</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399', background: 'rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: 4 }}>Auto-Graded</span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', marginBottom: 4 }}>Class 12 Physics Mock #4</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>45 Students submitted • Average Score: 78.5%</div>
                      
                      {/* Mini Leaderboard preview */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', background: 'rgba(251, 191, 36, 0.15)', padding: '4px 8px', borderRadius: 6 }}>🥇 Priya S. (98%)</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', background: 'rgba(255, 255, 255, 0.1)', padding: '4px 8px', borderRadius: 6 }}>🥈 Dev K. (94%)</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', background: 'rgba(217, 119, 6, 0.15)', padding: '4px 8px', borderRadius: 6 }}>🥉 Amit R. (91%)</span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(37, 99, 235, 0.15)', border: '1px solid rgba(37, 99, 235, 0.35)', borderRadius: 14, padding: 18 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#93c5fd', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CpuIcon size={16} color="#60a5fa" />
                        <span>AI SWOT Topic Weakness Intelligence</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5, marginBottom: 12 }}>
                        "62% of students in Batch JEE-A scored incorrectly on <strong>Electromagnetic Induction</strong> questions."
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 8, fontSize: 11.5, color: '#38bdf8', fontWeight: 600 }}>
                        💡 AI Action: Auto-generated 15 remedial practice questions for Batch JEE-A.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SMART FEE INVOICING */}
              {consoleTab === 'fees' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 16, marginBottom: 14 }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 14, padding: 18 }}>
                      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Automated Fee Recovery Rate</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: '#34d399', margin: '4px 0' }}>94.2% Collected</div>
                      <div style={{ fontSize: 12, color: '#cbd5e1' }}>Digital installment receipts with instant PDF generation</div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 14, padding: 18 }}>
                      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Pending Dues Across Batches</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: '#fbbf24', margin: '4px 0' }}>6 Students Pending</div>
                      <div style={{ fontSize: 12, color: '#cbd5e1' }}>Automated reminder queue ready</div>
                    </div>
                  </div>

                  <div className="landing-feed-card" style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.25)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CurrencyIcon size={18} color="#fbbf24" />
                      <span style={{ fontSize: 13, color: '#fef3c7', fontWeight: 600 }}>
                        {reminderSent ? "✓ Dispatched 6 payment reminders successfully!" : "6 parents have pending installment due this Friday."}
                      </span>
                    </div>
                    <button 
                      onClick={handleSendReminderSimulation}
                      style={{ 
                        background: reminderSent ? '#10b981' : '#fbbf24', 
                        color: '#0f172a', 
                        fontWeight: 800, 
                        fontSize: 12, 
                        padding: '6px 14px', 
                        borderRadius: 8, 
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {reminderSent ? "Sent Successfully ✓" : "📨 Send 1-Click Fee Reminders"}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: TIMETABLE & CLASH-DETECTION */}
              {consoleTab === 'timetable' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>Today's Interactive Batch Schedule</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#34d399', background: 'rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: 4 }}>
                      ✓ 0 Room & Teacher Clashes
                    </span>
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(37, 99, 235, 0.2)', border: '1px solid rgba(37, 99, 235, 0.4)', padding: '10px 14px', borderRadius: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#93c5fd' }}>09:00 - 10:30 AM</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>Class 12 Physics (Dr. Verma)</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>Main Hall Room 101 • IIT-JEE Batch</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#34d399', background: 'rgba(16, 185, 129, 0.2)', padding: '3px 8px', borderRadius: 6 }}>
                        ● Live In-Progress
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '10px 14px', borderRadius: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8' }}>11:00 - 12:30 PM</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>Class 11 Organic Chemistry (Prof. Gupta)</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>Science Lab 2 • NEET Batch</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
                        Upcoming Next
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </section>

      {/* ─── 4. STAKEHOLDER PORTALS (Role-Based Features) ─── */}
      <section id="roles" className="landing-roles-section">
        <div className="landing-section-header">
          <div className="landing-section-tag">
            <span>👥 Unified Ecosystem</span>
          </div>
          <h2 className="landing-section-title">
            Tailored Experiences For Every Stakeholder
          </h2>
          <p className="landing-section-subtitle">
            A single connected platform that eliminates silos between management, faculty, students, and parents.
          </p>
        </div>

        <div className="landing-roles-grid">
          
          {/* Role 1: Institute Directors */}
          <div className="landing-role-card">
            <div className="landing-role-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
              <BuildingIcon size={28} color="#2563eb" />
            </div>
            <h3 className="landing-role-title">Institute Directors</h3>
            <p className="landing-role-desc">
              Total operational visibility, automated fee recovery, teacher performance tracking, and growth analytics.
            </p>
            <div className="landing-role-bullets">
              <div>✓ Real-time revenue & pending dues ledger</div>
              <div>✓ Multi-branch & batch oversight</div>
              <div>✓ Automated attendance & fee reporting</div>
            </div>
          </div>

          {/* Role 2: Faculty & Teachers */}
          <div className="landing-role-card">
            <div className="landing-role-icon" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
              <GraduationCapIcon size={28} color="#0284c7" />
            </div>
            <h3 className="landing-role-title">Teachers & Faculty</h3>
            <p className="landing-role-desc">
              Take 10-second batch attendance, build test question banks, upload lecture notes, and track student weaknesses.
            </p>
            <div className="landing-role-bullets">
              <div>✓ 1-Tap batch digital attendance register</div>
              <div>✓ Auto-graded objective & subjective tests</div>
              <div>✓ Digital study notes & video vault storage</div>
            </div>
          </div>

          {/* Role 3: Students */}
          <div className="landing-role-card">
            <div className="landing-role-icon" style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}>
              <AwardIcon size={28} color="#d97706" />
            </div>
            <h3 className="landing-role-title">Students</h3>
            <p className="landing-role-desc">
              Dedicated student portal with mock tests, AI SWOT weakness reports, leaderboards, and timetables.
            </p>
            <div className="landing-role-bullets">
              <div>✓ Full-screen test player with timer</div>
              <div>✓ Topic-by-topic AI weakness diagnostics</div>
              <div>✓ Attendance streaks & academic badges</div>
            </div>
          </div>

          {/* Role 4: Parents */}
          <div className="landing-role-card">
            <div className="landing-role-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <UsersIcon size={28} color="#10b981" />
            </div>
            <h3 className="landing-role-title">Parents</h3>
            <p className="landing-role-desc">
              Unprecedented transparency with instant absent alerts, digital exam scorecards, and automated fee receipts.
            </p>
            <div className="landing-role-bullets">
              <div>✓ Instant absent alerts & notifications</div>
              <div>✓ Digital exam score card deliveries</div>
              <div>✓ Transparent installment schedules & PDF receipts</div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── 5. BEFORE VS AFTER COMPARISON ─── */}
      <section className="landing-compare-section">
        <div className="landing-section-header">
          <div className="landing-section-tag" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <span>⚡ The Upgrade</span>
          </div>
          <h2 className="landing-section-title">
            Why Institutes Are Replacing Outdated Systems
          </h2>
          <p className="landing-section-subtitle">
            See the difference between traditional manual operations and the Apni Vidya Smart LMS.
          </p>
        </div>

        <div className="landing-compare-grid">
          {/* Old Way */}
          <div className="landing-compare-card-old">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 24 }}>❌</span>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#991b1b' }}>The Old Manual Way</h3>
                <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>Paper Registers & Spreadsheet Chaos</span>
              </div>
            </div>

            <div className="landing-compare-item" style={{ color: '#7f1d1d' }}>
              <span>❌</span>
              <span>Physical paper registers prone to loss, damage, and manual calculation errors.</span>
            </div>
            <div className="landing-compare-item" style={{ color: '#7f1d1d' }}>
              <span>❌</span>
              <span>Calling parents manually for absent students, wasting 2+ hours every morning.</span>
            </div>
            <div className="landing-compare-item" style={{ color: '#7f1d1d' }}>
              <span>❌</span>
              <span>Uncollected fee leakage and lost paper receipts.</span>
            </div>
            <div className="landing-compare-item" style={{ color: '#7f1d1d' }}>
              <span>❌</span>
              <span>Manual test paper checking taking days, with zero insights on student weaknesses.</span>
            </div>
          </div>

          {/* New Way (Apni Vidya) */}
          <div className="landing-compare-card-new">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 24 }}>🚀</span>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#60a5fa' }}>The Apni Vidya Way</h3>
                <span style={{ fontSize: 12, color: '#34d399', fontWeight: 700 }}>Zero Paperwork & Intelligent Automation</span>
              </div>
            </div>

            <div className="landing-compare-item" style={{ color: '#e2e8f0' }}>
              <span>✓</span>
              <span><strong>10-Second QR Onboarding:</strong> Students scan QR and fill their own verified profile.</span>
            </div>
            <div className="landing-compare-item" style={{ color: '#e2e8f0' }}>
              <span>✓</span>
              <span><strong>Instant Parent Alerts:</strong> Parents notified automatically the moment a student is absent.</span>
            </div>
            <div className="landing-compare-item" style={{ color: '#e2e8f0' }}>
              <span>✓</span>
              <span><strong>Automated Fee Invoicing:</strong> Instant digital receipts with installment tracking and dues ledger.</span>
            </div>
            <div className="landing-compare-item" style={{ color: '#e2e8f0' }}>
              <span>✓</span>
              <span><strong>AI SWOT Diagnostics:</strong> Instant auto-grading with pinpoint topic weakness intelligence.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. INTERACTIVE ROI & TIME-SAVINGS CALCULATOR ─── */}
      <section id="calculator" className="landing-roi-section">
        <div className="landing-section-header">
          <div className="landing-section-tag">
            <span>📈 Financial Impact</span>
          </div>
          <h2 className="landing-section-title">
            Calculate Your Institute's Annual Savings
          </h2>
          <p className="landing-section-subtitle">
            See how much time and uncollected revenue you will recover every single month.
          </p>
        </div>

        <div className="landing-roi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>Your Current Student Strength:</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#fbbf24' }}>{studentCount} Students</span>
          </div>

          <input 
            type="range" 
            min="50" 
            max="2000" 
            step="25" 
            value={studentCount}
            onChange={(e) => setStudentCount(Number(e.target.value))}
            className="landing-slider"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
            <span>50 Students</span>
            <span>500 Students</span>
            <span>1,000 Students</span>
            <span>2,000+ Students</span>
          </div>

          <div className="landing-roi-results-grid">
            <div className="landing-roi-stat-box">
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Staff Hours Saved</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#60a5fa', margin: '6px 0' }}>
                {hoursSavedPerMonth} Hrs/mo
              </div>
              <div style={{ fontSize: 11.5, color: '#cbd5e1' }}>On registers & absent phone calls</div>
            </div>

            <div className="landing-roi-stat-box">
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Uncollected Dues Recovered</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#34d399', margin: '6px 0' }}>
                ₹{revenueLeakagePrevented}
              </div>
              <div style={{ fontSize: 11.5, color: '#cbd5e1' }}>Via automated fee tracking & installment reminders</div>
            </div>

            <div className="landing-roi-stat-box">
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Printing & Paper Cost Saved</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fbbf24', margin: '6px 0' }}>
                ₹{paperSavingsPerMonth}/mo
              </div>
              <div style={{ fontSize: 11.5, color: '#cbd5e1' }}>100% digital receipts & forms</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. CORE MODULES & FEATURES SECTION ─── */}
      <section id="features" className="landing-features-section">
        <div className="landing-section-header">
          <div className="landing-section-tag">
            <span>🚀 Complete Product Suite</span>
          </div>
          <h2 className="landing-section-title">
            Engineered For Modern Institutes
          </h2>
          <p className="landing-section-subtitle">
            Built specifically to solve real administrative bottlenecks in coaching centers, academies, and private schools.
          </p>

          {/* Interactive Module Categories (Horizontal swipe on mobile) */}
          <div className="landing-tabs-wrapper">
            {[
              { id: 'all', label: 'All Modules' },
              { id: 'admissions', label: 'Admissions' },
              { id: 'operations', label: 'Operations' },
              { id: 'academics', label: 'Exams & Vault' },
              { id: 'finance', label: 'Fees & Invoicing' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="landing-tab-btn"
                style={{
                  background: activeTab === tab.id ? '#2563eb' : '#ffffff',
                  color: activeTab === tab.id ? '#ffffff' : '#64748b',
                  border: activeTab === tab.id ? '1.5px solid #2563eb' : '1.5px solid #e2e8f0',
                  boxShadow: activeTab === tab.id ? '0 4px 14px rgba(37, 99, 235, 0.3)' : '0 2px 6px rgba(0,0,0,0.02)'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="landing-modules-grid">
          {filteredModules.map((m) => {
            const Icon = m.icon;
            return (
              <div 
                key={m.id} 
                className="landing-module-card"
              >
                {/* Glowing Top Accent Strip */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: m.accent }} />
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div style={{ 
                    width: 52, 
                    height: 52, 
                    borderRadius: 14, 
                    background: `${m.accent}15`, 
                    border: `1.5px solid ${m.accent}30`, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: `0 4px 12px ${m.accent}20`
                  }}>
                    <Icon size={26} color={m.accent} />
                  </div>
                  {m.badge && (
                    <span style={{ 
                      fontSize: 10.5, 
                      fontWeight: 800, 
                      color: m.accent, 
                      background: `${m.accent}12`, 
                      border: `1px solid ${m.accent}25`, 
                      padding: '4px 10px', 
                      borderRadius: 20, 
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase'
                    }}>
                      {m.badge}
                    </span>
                  )}
                </div>

                <div>
                  <h3 style={{ fontSize: 19, fontWeight: 900, marginBottom: 10, color: '#0f172a', letterSpacing: '-0.015em' }}>
                    {m.title}
                  </h3>
                  <p style={{ color: '#475569', fontSize: 14.5, lineHeight: 1.6 }}>
                    {m.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 8. DIRECTOR TESTIMONIALS (Social Proof) ─── */}
      <section className="landing-testimonials-section">
        <div className="landing-section-header">
          <div className="landing-section-tag" style={{ background: '#fef3c7', color: '#b45309' }}>
            <span>⭐ Testimonials</span>
          </div>
          <h2 className="landing-section-title">
            Loved By 500+ Institute Directors
          </h2>
          <p className="landing-section-subtitle">
            See how educators and academy leaders transformed their day-to-day operations with {instituteName}.
          </p>
        </div>

        <div className="landing-testimonials-grid">
          <div className="landing-testimonial-card">
            <div>
              <div style={{ color: '#fbbf24', fontSize: 18, marginBottom: 12 }}>★★★★★</div>
              <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.65, fontStyle: 'italic', marginBottom: 20 }}>
                "{instituteName} cut our morning attendance chaos down to under 2 minutes. Parents are thrilled receiving digital scorecards and automated payment receipts directly."
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                RK
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Rajesh Kapoor</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Director, Apex IIT-JEE Academy (650 Students)</div>
              </div>
            </div>
          </div>

          <div className="landing-testimonial-card">
            <div>
              <div style={{ color: '#fbbf24', fontSize: 18, marginBottom: 12 }}>★★★★★</div>
              <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.65, fontStyle: 'italic', marginBottom: 20 }}>
                "The automated fee ledger and installment reminders alone recovered over ₹2.4 Lakhs in pending dues that we used to lose track of in paper registers."
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                SM
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Dr. Sunita Mukherjee</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Founder, Pinnacle Medical Classes (420 Students)</div>
              </div>
            </div>
          </div>

          <div className="landing-testimonial-card">
            <div>
              <div style={{ color: '#fbbf24', fontSize: 18, marginBottom: 12 }}>★★★★★</div>
              <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.65, fontStyle: 'italic', marginBottom: 20 }}>
                "The AI SWOT exam evaluation gave our faculty exact insights into which physics chapters students were failing before the final board exams."
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                AS
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Anand Sharma</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Principal, Vidya Mandir Science Hub (800 Students)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 9. FREQUENTLY ASKED QUESTIONS ─── */}
      <section id="faq" className="landing-faq-section">
        <div className="landing-section-header">
          <div className="landing-section-tag">
            <span>💡 Have Questions?</span>
          </div>
          <h2 className="landing-section-title">
            Frequently Asked Questions
          </h2>
          <p className="landing-section-subtitle">Clear answers to common questions about {instituteName}.</p>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {faqs.map((faq, idx) => (
            <div 
              key={faq.q} 
              onClick={() => setOpenFaq(openFaq === idx ? null : idx)} 
              className={`landing-faq-item ${openFaq === idx ? 'open' : ''}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15.5, fontWeight: 800, color: openFaq === idx ? '#1e40af' : '#0f172a' }}>{faq.q}</span>
                <span style={{ 
                  fontSize: 18, 
                  fontWeight: 900, 
                  color: openFaq === idx ? '#ffffff' : '#2563eb',
                  background: openFaq === idx ? '#2563eb' : '#eff6ff',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 12,
                  flexShrink: 0
                }}>
                  {openFaq === idx ? '−' : '+'}
                </span>
              </div>
              {openFaq === idx && (
                <p style={{ color: '#475569', fontSize: 14.5, lineHeight: 1.65, marginTop: 14, paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── 10. CALL TO ACTION ─── */}
      <section className="landing-bottom-cta">
        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)', fontWeight: 900, marginBottom: 18, fontFamily: 'var(--font-heading, serif)', color: '#ffffff', letterSpacing: '-0.025em' }}>
            Ready to Digitize Your Institute?
          </h2>
          <p style={{ fontSize: 'clamp(1.05rem, 2.2vw, 1.25rem)', color: '#cbd5e1', maxWidth: 600, margin: '0 auto 34px', lineHeight: 1.65 }}>
            Join 500+ top institutes that automated their attendance, exams, and fee collections. Set up in less than 5 minutes.
          </p>
          <Link to="/signup" className="landing-cta-primary hover-lift" style={{ height: 58, fontSize: 17, padding: '0 40px' }}>
            <span>Create Free Account Now</span>
            <ArrowRightIcon size={18} />
          </Link>
        </div>
      </section>

      {/* ─── 11. FOOTER ─── */}
      <footer className="landing-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
          {instituteLogoUrl ? (
            <div style={{ height: 32, display: 'flex', alignItems: 'center' }}>
              <img src={instituteLogoUrl} alt={instituteName} style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
            </div>
          ) : (
            <>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCapIcon size={16} color="#fff" />
              </div>
              <span style={{ fontWeight: 900, fontSize: 16, color: '#0f172a', fontFamily: 'var(--font-heading, sans-serif)' }}>{instituteName}</span>
            </>
          )}
        </div>
        <p style={{ marginBottom: 4, fontWeight: 600, color: '#334155', fontSize: 13.5 }}>© {new Date().getFullYear()} {instituteName}. All rights reserved.</p>
        <p style={{ fontSize: 12.5, color: '#64748b' }}>The smart test evaluation & education operating system for modern institutes.</p>
      </footer>
    </div>
  );
}

export default Landing;
