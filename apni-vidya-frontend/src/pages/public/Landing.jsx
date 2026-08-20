import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCapIcon, UsersIcon, ClipboardIcon, FileTextIcon,
  CurrencyIcon, BookOpenIcon, ArrowRightIcon, CheckCircleIcon,
  ShieldIcon, CalendarIcon, AwardIcon, ChevronRightIcon,
  TrendingUpIcon, ClockIcon, CpuIcon, TrophyIcon, BellIcon
} from '../../components/common/Icons';

export function Landing() {
  const [openFaq, setOpenFaq] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  // Configuration for Institute Branding
  const instituteName = "Apni Vidya"; // Replace with your institute name
  const instituteLogoUrl = "/logo.png"; // Replace with your logo URL if available

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
      badge: 'WhatsApp Alerts',
      desc: 'Take attendance batch-by-batch in under 10 seconds. Parents receive instant WhatsApp and SMS alerts when a student is marked absent.'
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
      badge: 'Razorpay UPI',
      desc: 'Set installment schedules, track pending dues, send 1-click reminders, and collect payments directly via Razorpay UPI and cards with automated digital receipts.'
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
      a: `${instituteName} is a complete, unified management platform. It replaces manual paper registers, scattered WhatsApp groups, and spreadsheets with one centralized dashboard for admissions, attendance, exams, fees, and study materials.`
    },
    {
      q: 'Can parents track student progress on WhatsApp?',
      a: `Yes. ${instituteName} integrates with SMS and WhatsApp notification services to deliver automated absent notifications, test score cards, and fee payment receipts directly to registered parent mobile numbers.`
    },
    {
      q: 'Do students and teachers get their own logins?',
      a: 'Yes. The system provides dedicated portals for Institute Admins, Teachers, and Students with granular Role-Based Access Controls (RBAC).'
    },
    {
      q: 'How does fee collection work?',
      a: 'You can define custom course fees and installment plans. Parents can pay securely online via Razorpay (UPI, Google Pay, PhonePe, Cards), or you can record offline cash/cheque payments with instant PDF receipt generation.'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'var(--font-sans, sans-serif)', overflowX: 'hidden' }}>
      
      {/* ─── 1. MINIMALIST TOPBAR ─── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 32px',
        background: 'rgba(255, 255, 255, 0.90)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 4px 20px -5px rgba(15, 23, 42, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {instituteLogoUrl ? (
            <div style={{ height: 44, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
              <img src={instituteLogoUrl} alt="Institute Logo" style={{ height: 72, width: 'auto', objectFit: 'contain' }} />
            </div>
          ) : (
            <>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
              }}>
                <GraduationCapIcon size={22} color="#fff" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ 
                  fontSize: instituteName.length > 15 ? 16 : 22, 
                  fontWeight: 900, 
                  fontFamily: 'var(--font-heading, sans-serif)', 
                  color: '#0f172a', 
                  letterSpacing: '-0.03em',
                  lineHeight: 1.1,
                  whiteSpace: 'normal',
                  wordWrap: 'break-word',
                  maxWidth: '200px'
                }}>
                  {instituteName}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Desktop Navigation Quick-Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }} className="desktop-only">
          <a href="#features" style={{ fontSize: 14, fontWeight: 600, color: '#475569', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#2563eb'} onMouseLeave={e => e.currentTarget.style.color = '#475569'}>Modules</a>
          <a href="#security" style={{ fontSize: 14, fontWeight: 600, color: '#475569', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#2563eb'} onMouseLeave={e => e.currentTarget.style.color = '#475569'}>Security</a>
          <a href="#faq" style={{ fontSize: 14, fontWeight: 600, color: '#475569', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#2563eb'} onMouseLeave={e => e.currentTarget.style.color = '#475569'}>FAQ</a>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/login" className="btn hover-lift" style={{ 
            background: '#ffffff', 
            color: '#1e293b', 
            border: '1.5px solid #cbd5e1', 
            fontWeight: 700, 
            fontSize: 14, 
            height: 40, 
            padding: '0 20px', 
            borderRadius: 10,
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
          }}>
            Sign In
          </Link>
          <Link to="/signup" className="btn hover-lift" style={{ 
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', 
            color: '#ffffff', 
            fontWeight: 800, 
            fontSize: 14, 
            height: 40, 
            padding: '0 22px', 
            borderRadius: 10, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8,
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
          }}>
            <span>Start Free</span>
            <ArrowRightIcon size={16} />
          </Link>
        </div>
      </header>

      {/* ─── 2. GREENBOARD HERO SECTION (Navy Board Theme) ─── */}
      <section style={{
        position: 'relative',
        padding: '90px 20px 90px',
        textAlign: 'center',
        backgroundImage: 'url(/greenboard_texture.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#ffffff',
        borderBottom: '4px solid #2563eb',
        boxShadow: 'inset 0 0 120px rgba(0,0,0,0.85)',
        overflow: 'hidden'
      }}>
        {/* Deep navy overlay + radial lighting */}
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'radial-gradient(circle at 50% 15%, rgba(37, 99, 235, 0.45) 0%, rgba(10, 24, 60, 0.92) 65%, rgba(6, 14, 38, 0.98) 100%)' 
        }}></div>

        {/* Ambient background glow dots */}
        <div style={{ position: 'absolute', top: '10%', left: '8%', width: 280, height: 280, borderRadius: '50%', background: 'rgba(37, 99, 235, 0.15)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '8%', width: 320, height: 320, borderRadius: '50%', background: 'rgba(251, 191, 36, 0.12)', filter: 'blur(90px)', pointerEvents: 'none' }} />
        
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1040, margin: '0 auto' }}>
          
          {/* Badge */}
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 10, 
            padding: '8px 22px', 
            borderRadius: 30, 
            background: 'rgba(255,255,255,0.12)', 
            border: '1px solid rgba(255,255,255,0.25)', 
            color: '#e2e8f0', 
            fontSize: 13, 
            fontWeight: 700, 
            marginBottom: 28, 
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <span style={{ display: 'flex', width: 8, height: 8, borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 10px #fbbf24' }}></span>
            <AwardIcon size={16} color="#fbbf24" />
            <span style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>Upgrade your Institute with the power of A</span>
          </div>

          {/* Heading */}
          <h1 style={{ 
            fontSize: 'clamp(2.8rem, 6vw, 4.6rem)', 
            fontWeight: 900, 
            lineHeight: 1.12, 
            letterSpacing: '-0.035em', 
            marginBottom: 24, 
            fontFamily: 'var(--font-heading, serif)', 
            textShadow: '0 6px 20px rgba(0,0,0,0.6)' 
          }}>
            Your Institute.<br/>
            <span style={{ 
              color: '#fbbf24', 
              textShadow: '0 2px 16px rgba(251, 191, 36, 0.4)',
              background: 'linear-gradient(135deg, #fef08a 0%, #fbbf24 60%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block'
            }}>
              Reimagined for the Future.
            </span>
          </h1>

          {/* Paragraph */}
          <p style={{ 
            fontSize: 'clamp(1.1rem, 2.3vw, 1.28rem)', 
            color: '#e2e8f0', 
            lineHeight: 1.65, 
            maxWidth: 760, 
            margin: '0 auto 20px', 
            fontWeight: 500, 
            textShadow: '0 2px 6px rgba(0,0,0,0.6)' 
          }}>
            You focus on teaching. We simplify everything else. From student onboarding to fees, attendance, exams, performance and communication—run your entire institute from one intelligent platform designed to save time, reduce leakage and accelerate growth.
          </p>
          <p style={{ 
            fontSize: '1.25rem', 
            color: '#fbbf24', 
            fontWeight: 800, 
            marginBottom: 36, 
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            letterSpacing: '0.01em'
          }}>
            Run Smarter. Save More. Grow Faster.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 50 }}>
            <Link to="/signup" className="btn hover-lift" style={{ 
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 
              color: '#0f172a', 
              fontWeight: 900, 
              height: 56, 
              fontSize: 16, 
              padding: '0 36px', 
              borderRadius: 14, 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 10, 
              boxShadow: '0 10px 30px rgba(251, 191, 36, 0.35)',
              border: '1px solid rgba(255,255,255,0.4)'
            }}>
              Create Free Account <ArrowRightIcon size={18} />
            </Link>
            <Link to="/login" className="btn hover-lift" style={{ 
              background: 'rgba(255,255,255,0.12)', 
              color: '#ffffff', 
              border: '1.5px solid rgba(255,255,255,0.35)', 
              fontWeight: 700, 
              height: 56, 
              fontSize: 16, 
              padding: '0 32px', 
              borderRadius: 14, 
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
            }}>
              Sign In To Portal
            </Link>
          </div>

          {/* ─── LIVE PRODUCT SHOWCASE / MOCKUP CARD ─── */}
          <div style={{
            maxWidth: 880,
            margin: '0 auto',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 20,
            padding: '24px 28px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(37, 99, 235, 0.25)',
            textAlign: 'left'
          }}>
            {/* Topbar of the Mockup */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginLeft: 12, letterSpacing: '0.03em' }}>
                  {instituteName} Management Console • v2.4 Live
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(37, 99, 235, 0.25)', border: '1px solid rgba(37, 99, 235, 0.4)', fontSize: 11, fontWeight: 700, color: '#93c5fd' }}>
                  ⚡ System Operational
                </span>
              </div>
            </div>

            {/* Metric Pills Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
              <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>Today's Attendance</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 8 }}>
                  98.4% <span style={{ fontSize: 11, color: '#34d399', fontWeight: 700 }}>+2.1%</span>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>Active Students</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 8 }}>
                  1,240 <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700 }}>QR Onboarded</span>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>Fees Collected (Aug)</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#34d399', display: 'flex', alignItems: 'center', gap: 8 }}>
                  ₹4,82,500 <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 700 }}>Razorpay Auto</span>
                </div>
              </div>
            </div>

            {/* Quick Interactive Simulation Strip */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: '10px 16px', background: 'rgba(37, 99, 235, 0.15)', borderRadius: 10, border: '1px solid rgba(37, 99, 235, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#dbeafe', fontWeight: 600 }}>
                <ClockIcon size={16} color="#60a5fa" />
                <span>Next Scheduled Exam: <strong>Class 12 Physics Mock #3</strong></span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#fbbf24', background: 'rgba(251, 191, 36, 0.15)', padding: '2px 10px', borderRadius: 6 }}>
                Auto-Grading Ready
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* ─── 3. PLATFORM STATISTICS (Trust Section) ─── */}
      <section style={{ 
        padding: '50px 20px', 
        background: '#0a1532', 
        color: '#ffffff',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32, alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, background: 'rgba(255,255,255,0.04)', padding: '18px 22px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: 50, height: 50, borderRadius: 12, background: 'rgba(37, 99, 235, 0.2)', border: '1px solid rgba(37, 99, 235, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <UsersIcon size={24} color="#60a5fa" />
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#3b82f6', lineHeight: 1 }}>500+</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Institutes Enrolled</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18, background: 'rgba(255,255,255,0.04)', padding: '18px 22px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: 50, height: 50, borderRadius: 12, background: 'rgba(251, 191, 36, 0.2)', border: '1px solid rgba(251, 191, 36, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUpIcon size={24} color="#fbbf24" />
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#fbbf24', lineHeight: 1 }}>2M+</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Attendance Records</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18, background: 'rgba(255,255,255,0.04)', padding: '18px 22px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: 50, height: 50, borderRadius: 12, background: 'rgba(96, 165, 250, 0.2)', border: '1px solid rgba(96, 165, 250, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldIcon size={24} color="#60a5fa" />
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#60a5fa', lineHeight: 1 }}>100%</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Secure & Encrypted</div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── 4. NOTEBOOK CORE FEATURES ─── */}
      <section id="features" style={{ 
        padding: '100px 20px 90px', 
        backgroundImage: 'url(/notebook_pattern.jpg)',
        backgroundSize: '400px',
        backgroundRepeat: 'repeat',
        position: 'relative'
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(248,250,252,0.7) 0%, rgba(255,255,255,0.92) 100%)', pointerEvents: 'none' }} />
        
        <div style={{ maxWidth: 1180, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 20, background: '#dbeafe', color: '#1e40af', fontSize: 13, fontWeight: 800, marginBottom: 16 }}>
              <span>🚀 All-In-One Toolkit</span>
            </div>
            <h2 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', fontWeight: 900, fontFamily: 'var(--font-heading, serif)', letterSpacing: '-0.025em', color: '#0f172a', marginBottom: 16 }}>
              Engineered For Modern Institutes
            </h2>
            <p style={{ color: '#475569', fontSize: 18, maxWidth: 680, margin: '0 auto', lineHeight: 1.6, fontWeight: 500 }}>
              Built specifically to solve real administrative bottlenecks in coaching centers, academies, and private schools. Professional tools, beautifully organized.
            </p>

            {/* Interactive Module Categories */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32, flexWrap: 'wrap' }}>
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
                  style={{
                    padding: '8px 20px',
                    borderRadius: 30,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 28 }}>
            {filteredModules.map((m) => {
              const Icon = m.icon;
              return (
                <div 
                  key={m.id} 
                  className="hover-lift" 
                  style={{ 
                    background: '#ffffff', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: 18, 
                    padding: '36px 30px', 
                    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    position: 'relative', 
                    overflow: 'hidden',
                    transition: 'all 0.25s ease'
                  }}
                >
                  {/* Glowing Top Accent Strip */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: m.accent }} />
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ 
                      width: 58, 
                      height: 58, 
                      borderRadius: 16, 
                      background: `${m.accent}15`, 
                      border: `1.5px solid ${m.accent}30`, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      boxShadow: `0 4px 12px ${m.accent}20`
                    }}>
                      <Icon size={28} color={m.accent} />
                    </div>
                    {m.badge && (
                      <span style={{ 
                        fontSize: 11, 
                        fontWeight: 800, 
                        color: m.accent, 
                        background: `${m.accent}12`, 
                        border: `1px solid ${m.accent}25`, 
                        padding: '4px 12px', 
                        borderRadius: 20, 
                        letterSpacing: '0.02em',
                        textTransform: 'uppercase'
                      }}>
                        {m.badge}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 style={{ fontSize: 21, fontWeight: 900, marginBottom: 12, color: '#0f172a', letterSpacing: '-0.015em' }}>
                      {m.title}
                    </h3>
                    <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.65 }}>
                      {m.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 5. SECURITY & RELIABILITY ─── */}
      <section id="security" style={{ background: '#ffffff', padding: '100px 20px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 48, alignItems: 'center' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: '#eff6ff', color: '#2563eb', fontSize: 13, fontWeight: 800, marginBottom: 16 }}>
                <ShieldIcon size={16} color="#2563eb" />
                <span>Enterprise Grade Security</span>
              </div>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.9rem)', fontWeight: 900, fontFamily: 'var(--font-heading, serif)', letterSpacing: '-0.02em', color: '#0f172a', marginBottom: 20, lineHeight: 1.2 }}>
                Secure, Reliable & Cloud-Backed
              </h2>
              <p style={{ color: '#475569', fontSize: 16, lineHeight: 1.65, marginBottom: 28 }}>
                We treat your data with the highest level of security. Every institute operates in a strictly isolated workspace to guarantee privacy and integrity.
              </p>
              
              <div style={{ display: 'grid', gap: 16 }}>
                {[
                  'Granular Role-Based Access Control (RBAC)',
                  'Secure JWT session authentication',
                  'Encrypted database & daily automated backups',
                  'Razorpay PCI-DSS verified payments integration',
                ].map(b => (
                  <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#f8fafc', padding: '10px 16px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)' }}>
                      <CheckCircleIcon size={14} color="#fff" />
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* High-Tech Security Card */}
            <div style={{ 
              background: 'linear-gradient(135deg, #0a1532 0%, #0f172a 100%)', 
              border: '1px solid rgba(255, 255, 255, 0.12)', 
              borderRadius: 24, 
              padding: 38, 
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)',
              color: '#ffffff',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(37, 99, 235, 0.25)', filter: 'blur(50px)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
                <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(37, 99, 235, 0.2)', border: '1.5px solid rgba(37, 99, 235, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldIcon size={32} color="#60a5fa" />
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 20, color: '#ffffff' }}>Data Integrity</div>
                  <div style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>Your institute data stays strictly yours</div>
                </div>
              </div>

              {/* Status Indicator */}
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: '14px 18px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>Cloud Workspace Isolation</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#34d399' }}>Active & Protected</span>
                </div>
                <div style={{ width: '100%', height: 6, borderRadius: 10, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #2563eb, #34d399)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {['RBAC Secured', 'Encrypted DB', 'Razorpay Verified', 'JWT Protected'].map(t => (
                  <span key={t} style={{ 
                    padding: '8px 16px', 
                    borderRadius: 10, 
                    background: 'rgba(37, 99, 235, 0.15)', 
                    color: '#93c5fd', 
                    fontSize: 13, 
                    fontWeight: 800, 
                    border: '1px solid rgba(37, 99, 235, 0.35)' 
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. FREQUENTLY ASKED QUESTIONS ─── */}
      <section id="faq" style={{ padding: '100px 20px', maxWidth: 880, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 20, background: '#eff6ff', color: '#2563eb', fontSize: 13, fontWeight: 800, marginBottom: 16 }}>
            <span>💡 Have Questions?</span>
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 900, fontFamily: 'var(--font-heading, serif)', letterSpacing: '-0.02em', color: '#0f172a', marginBottom: 12 }}>
            Frequently Asked Questions
          </h2>
          <p style={{ color: '#64748b', fontSize: 16, fontWeight: 500 }}>Clear answers to common questions about {instituteName}.</p>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {faqs.map((faq, idx) => (
            <div 
              key={faq.q} 
              onClick={() => setOpenFaq(openFaq === idx ? null : idx)} 
              style={{ 
                background: openFaq === idx ? '#f8fafc' : '#ffffff', 
                border: openFaq === idx ? '1.5px solid #2563eb' : '1px solid #e2e8f0', 
                borderRadius: 16, 
                padding: '24px 28px', 
                cursor: 'pointer', 
                boxShadow: openFaq === idx ? '0 8px 24px rgba(37, 99, 235, 0.08)' : '0 2px 10px rgba(0,0,0,0.02)', 
                transition: 'all 0.2s' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16.5, fontWeight: 800, color: openFaq === idx ? '#1e40af' : '#0f172a' }}>{faq.q}</span>
                <span style={{ 
                  fontSize: 20, 
                  fontWeight: 900, 
                  color: openFaq === idx ? '#ffffff' : '#2563eb',
                  background: openFaq === idx ? '#2563eb' : '#eff6ff',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 16,
                  flexShrink: 0
                }}>
                  {openFaq === idx ? '−' : '+'}
                </span>
              </div>
              {openFaq === idx && (
                <p style={{ color: '#475569', fontSize: 15.5, lineHeight: 1.65, marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── 7. CALL TO ACTION ─── */}
      <section style={{ 
        padding: '90px 20px', 
        background: 'linear-gradient(135deg, #0a1532 0%, #0f172a 100%)', 
        textAlign: 'center', 
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37, 99, 235, 0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 740, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', fontWeight: 900, marginBottom: 20, fontFamily: 'var(--font-heading, serif)', color: '#ffffff', letterSpacing: '-0.025em' }}>
            Ready to Modernize?
          </h2>
          <p style={{ fontSize: 'clamp(1.1rem, 2vw, 1.25rem)', color: '#cbd5e1', maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.65 }}>
            Set up your coaching center in minutes. Start enrolling students, taking digital attendance, and managing fees today.
          </p>
          <Link to="/signup" className="btn hover-lift" style={{ 
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 
            color: '#0f172a', 
            fontWeight: 900, 
            height: 58, 
            fontSize: 16.5, 
            padding: '0 44px', 
            borderRadius: 14, 
            boxShadow: '0 12px 35px rgba(251, 191, 36, 0.35)', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 10,
            border: '1px solid rgba(255,255,255,0.4)'
          }}>
            Get Started Free <ArrowRightIcon size={18} />
          </Link>
        </div>
      </section>

      {/* ─── 8. FOOTER ─── */}
      <footer style={{ padding: '48px 20px', background: '#ffffff', borderTop: '1px solid #e2e8f0', color: '#64748b', textAlign: 'center', fontSize: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
          {instituteLogoUrl ? (
            <div style={{ height: 34, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
              <img src={instituteLogoUrl} alt="Institute Logo" style={{ height: 54, width: 'auto', objectFit: 'contain' }} />
            </div>
          ) : (
            <>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCapIcon size={18} color="#fff" />
              </div>
              <span style={{ fontWeight: 900, fontSize: 18, color: '#0f172a', fontFamily: 'var(--font-heading, sans-serif)' }}>{instituteName}</span>
            </>
          )}
        </div>
        <p style={{ marginBottom: 6, fontWeight: 600, color: '#334155' }}>© {new Date().getFullYear()} {instituteName}. All rights reserved.</p>
        <p style={{ fontSize: 13, color: '#64748b' }}>The premium management platform for coaching institutes.</p>
      </footer>
    </div>
  );
}

export default Landing;

