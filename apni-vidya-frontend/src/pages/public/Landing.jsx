import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCapIcon, UsersIcon, ClipboardIcon, FileTextIcon,
  CurrencyIcon, BookOpenIcon, ArrowRightIcon, CheckCircleIcon,
  ShieldIcon, CalendarIcon, BellIcon, ChevronRightIcon, AwardIcon
} from '../../components/common/Icons';

export function Landing() {
  const [activeTab, setActiveTab] = useState('admissions');
  const [interactiveScore, setInteractiveScore] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  const modules = [
    {
      id: 'admissions',
      title: 'QR Student Onboarding',
      icon: UsersIcon,
      accent: '#4f46e5',
      desc: 'Eliminate manual paperwork. Share your custom QR code on your reception desk, flyers, or social media. Students fill their own profiles, and you approve them in one click.'
    },
    {
      id: 'attendance',
      title: '1-Tap Digital Attendance',
      icon: ClipboardIcon,
      accent: '#10b981',
      desc: 'Take attendance batch-by-batch in under 10 seconds. Parents receive instant WhatsApp and SMS alerts when a student is marked absent.'
    },
    {
      id: 'assessments',
      title: 'Online & Subjective Exams',
      icon: FileTextIcon,
      accent: '#f59e0b',
      desc: 'Create chapter tests from question banks. Objective tests are auto-graded instantly with leaderboards, percentiles, and topic SWOT weakness analysis.'
    },
    {
      id: 'fees',
      title: 'Fee Collection & Invoicing',
      icon: CurrencyIcon,
      accent: '#e11d48',
      desc: 'Set installment schedules, track pending dues, send 1-click reminders, and collect payments directly via Razorpay UPI and cards with automated digital receipts.'
    },
    {
      id: 'materials',
      title: 'Study Notes & Video Vault',
      icon: BookOpenIcon,
      accent: '#7c3aed',
      desc: 'Upload PDFs, assignment keys, and private lecture recordings categorized cleanly by subject, chapter, and batch.'
    },
    {
      id: 'timetable',
      title: 'Batch Timetable Planner',
      icon: CalendarIcon,
      accent: '#0284c7',
      desc: 'Visual weekly timetable scheduling with automatic teacher and room clash detection. Students and faculty see live updated schedules on their portals.'
    }
  ];

  const faqs = [
    {
      q: 'How does Apni Vidya help coaching institutes?',
      a: 'Apni Vidya is a complete, unified management platform. It replaces manual paper registers, scattered WhatsApp groups, and spreadsheets with one centralized dashboard for admissions, attendance, exams, fees, and study materials.'
    },
    {
      q: 'Can parents track student progress on WhatsApp?',
      a: 'Yes. Apni Vidya integrates with SMS and WhatsApp notification services to deliver automated absent notifications, test score cards, and fee payment receipts directly to registered parent mobile numbers.'
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
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#0f172a', fontFamily: 'var(--font-body, sans-serif)', overflowX: 'hidden' }}>
      
      {/* ─── 1. MINIMALIST TOPBAR (Logo on left, Auth on right) ─── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 28px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(79, 70, 229, 0.35)'
          }}>
            <GraduationCapIcon size={24} color="#fff" />
          </div>
          <span style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--font-heading, sans-serif)', color: '#0f172a', letterSpacing: '-0.03em' }}>
            Apni Vidya
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/login"
            className="btn"
            style={{
              background: '#f8fafc',
              color: '#1e293b',
              border: '1.5px solid #cbd5e1',
              fontWeight: 700,
              fontSize: 14,
              height: 42,
              padding: '0 20px',
              borderRadius: 10
            }}
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="btn"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 14,
              height: 42,
              padding: '0 22px',
              borderRadius: 10,
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span>Start Free</span>
            <ArrowRightIcon size={16} />
          </Link>
        </div>
      </header>

      {/* ─── 2. HERO SECTION ─── */}
      <section style={{
        position: 'relative',
        padding: '70px 20px 50px',
        textAlign: 'center',
        background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99, 102, 241, 0.12) 0%, rgba(255, 255, 255, 0) 80%)'
      }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          {/* Release Tag */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 24,
            background: '#eef2ff',
            border: '1px solid #c7d2fe',
            color: '#4338ca',
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 20
          }}>
            <span>⚡ Complete Coaching & Institute Management Platform</span>
          </div>

          {/* Clean Main Title */}
          <h1 style={{
            fontSize: 'clamp(2.4rem, 5.5vw, 4rem)',
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: '-0.035em',
            marginBottom: 18,
            fontFamily: 'var(--font-heading, sans-serif)',
            color: '#0f172a'
          }}>
            Manage Your Institute With{' '}
            <span style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block'
            }}>
              Clarity & Speed
            </span>
          </h1>

          {/* Subtext */}
          <p style={{
            fontSize: 'clamp(1rem, 2.2vw, 1.2rem)',
            color: '#475569',
            lineHeight: 1.65,
            maxWidth: 660,
            margin: '0 auto 34px',
            fontWeight: 450
          }}>
            Everything coaching centers and schools need to run smoothly:
            contactless QR onboarding, instant digital attendance, automated test grading,
            and 1-click fee tracking.
          </p>

          {/* Primary Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
            marginBottom: 50
          }}>
            <Link
              to="/signup"
              className="btn"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                color: '#ffffff',
                fontWeight: 800,
                height: 52,
                fontSize: 16,
                padding: '0 32px',
                borderRadius: 12,
                boxShadow: '0 8px 24px rgba(79, 70, 229, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              Create Free Account <ArrowRightIcon size={18} />
            </Link>
            <Link
              to="/login"
              className="btn"
              style={{
                background: '#ffffff',
                color: '#0f172a',
                border: '1.5px solid #cbd5e1',
                fontWeight: 700,
                height: 52,
                fontSize: 16,
                padding: '0 26px',
                borderRadius: 12,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
              }}
            >
              Sign In To Portal
            </Link>
          </div>
        </div>

        {/* ─── 3. INTERACTIVE LIVE FEATURE PREVIEW BOX ─── */}
        <div style={{
          maxWidth: 960,
          margin: '0 auto',
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: 24,
          padding: '28px',
          boxShadow: '0 20px 50px -15px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.02)',
          textAlign: 'left'
        }}>
          {/* Module Selector Bar */}
          <div style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 12,
            marginBottom: 24,
            borderBottom: '1px solid #f1f5f9'
          }}>
            {modules.map(m => {
              const active = activeTab === m.id;
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveTab(m.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 18px',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 13.5,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    border: active ? `2px solid ${m.accent}` : '1.5px solid #e2e8f0',
                    background: active ? m.accent : '#f8fafc',
                    color: active ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={18} color={active ? '#fff' : m.accent} />
                  <span>{m.title}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Tab Body */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 28,
            alignItems: 'center'
          }}>
            {/* Left description */}
            <div>
              <div style={{
                display: 'inline-block',
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: '#4f46e5',
                marginBottom: 6
              }}>
                Feature Spotlight
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginBottom: 12 }}>
                {modules.find(m => m.id === activeTab)?.title}
              </h3>
              <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.65, marginBottom: 20 }}>
                {modules.find(m => m.id === activeTab)?.desc}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4f46e5', fontSize: 14, fontWeight: 700 }}>
                <span>Standard feature in all plans</span>
                <CheckCircleIcon size={18} color="#10b981" />
              </div>
            </div>

            {/* Right UI Interactive Preview Graphic */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 18,
              padding: '24px',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
            }}>
              {activeTab === 'admissions' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 90,
                    height: 90,
                    margin: '0 auto 16px',
                    borderRadius: 16,
                    background: '#ffffff',
                    border: '2px dashed #4f46e5',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 8
                  }}>
                    <span style={{ fontSize: 32 }}>📱</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Scan QR To Self-Register</div>
                  <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 14 }}>apex-academy.apnividya.in/enroll</div>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#059669',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <span>✓ 1-Click Director Approval</span>
                  </div>
                </div>
              )}

              {activeTab === 'attendance' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Physics Batch A (Morning)</span>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: '#dcfce7', color: '#15803d' }}>Live Sheet</span>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {[
                      { name: 'Aarav Sharma', roll: 'Roll #101', status: 'Present', color: '#10b981' },
                      { name: 'Diya Patel', roll: 'Roll #102', status: 'Present', color: '#10b981' },
                      { name: 'Rohan Verma', roll: 'Roll #103', status: 'Absent (WhatsApp Sent)', color: '#ef4444' },
                    ].map(s => (
                      <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{s.roll}</div>
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: s.color }}>{s.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'assessments' && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
                    Live Auto-Grading Sandbox:
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#334155', marginBottom: 12 }}>
                    Q: What is the SI unit of electric charge?
                  </div>
                  <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                    {[
                      { opt: 'A', text: 'Ampere', correct: false },
                      { opt: 'B', text: 'Coulomb', correct: true },
                      { opt: 'C', text: 'Volt', correct: false },
                    ].map(item => (
                      <button
                        key={item.opt}
                        onClick={() => setInteractiveScore(item.correct ? 'Correct! Auto-graded +4 Marks' : 'Incorrect (-1 Mark)')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ fontWeight: 800, color: '#4f46e5' }}>{item.opt}.</span>
                        <span>{item.text}</span>
                      </button>
                    ))}
                  </div>
                  {interactiveScore && (
                    <div style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '6px 12px',
                      borderRadius: 8,
                      background: interactiveScore.includes('Correct') ? '#dcfce7' : '#fee2e2',
                      color: interactiveScore.includes('Correct') ? '#15803d' : '#b91c1c'
                    }}>
                      {interactiveScore}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'fees' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>Fee Ledger Preview</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5' }}>Razorpay Enabled</span>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Term 2 Installment:</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>₹15,000</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#dcfce7', color: '#16a34a' }}>Paid Online</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', cursor: 'pointer' }}>Download Receipt 📄</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'materials' && (
                <div style={{ display: 'grid', gap: 8 }}>
                  {[
                    { title: 'Chapter 4: Rotational Dynamics Notes.pdf', size: '2.4 MB', type: 'PDF' },
                    { title: 'Organic Chemistry Formula Sheet.pdf', size: '1.1 MB', type: 'PDF' },
                    { title: 'Mock Test 3 Solution Video Key', size: 'HD Video', type: 'Video' },
                  ].map(m => (
                    <div key={m.title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>{m.title}</div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{m.size}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'timetable' && (
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Today's Scheduled Sessions</div>
                  {[
                    { time: '09:00 AM - 10:30 AM', subject: 'Physics (Room 101)', teacher: 'Dr. Sharma' },
                    { time: '11:00 AM - 12:30 PM', subject: 'Mathematics (Room 102)', teacher: 'Prof. Gupta' },
                    { time: '02:00 PM - 03:30 PM', subject: 'Chemistry Doubt Session', teacher: 'Mrs. Verma' },
                  ].map(t => (
                    <div key={t.time} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>{t.subject}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{t.teacher}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5' }}>{t.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. CORE PLATFORM CAPABILITIES ─── */}
      <section style={{ padding: '80px 20px', maxWidth: 1140, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 2.6rem)',
            fontWeight: 900,
            fontFamily: 'var(--font-heading, sans-serif)',
            letterSpacing: '-0.025em',
            color: '#0f172a',
            marginBottom: 12
          }}>
            Engineered For Modern Institutes
          </h2>
          <p style={{ color: '#64748b', fontSize: 16, maxWidth: 600, margin: '0 auto' }}>
            Built specifically to solve real administrative bottlenecks in coaching centers, academies, and private schools.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24
        }}>
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 20,
                  padding: '28px 24px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 18
                  }}>
                    <Icon size={24} color={m.accent} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>
                    {m.title}
                  </h3>
                  <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                    {m.desc}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4f46e5', fontSize: 13.5, fontWeight: 700 }}>
                  <span>Learn workflow</span> <ArrowRightIcon size={14} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 5. SECURITY & RELIABILITY ─── */}
      <section style={{
        background: '#f8fafc',
        padding: '70px 20px',
        borderTop: '1px solid #e2e8f0',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 36,
            alignItems: 'center'
          }}>
            <div>
              <h2 style={{
                fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)',
                fontWeight: 900,
                fontFamily: 'var(--font-heading, sans-serif)',
                letterSpacing: '-0.02em',
                color: '#0f172a',
                marginBottom: 16
              }}>
                Secure, Reliable & Cloud-Backed
              </h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  'Granular Role-Based Access Control (RBAC)',
                  'Secure JWT session authentication & rate limiting',
                  'Encrypted database storage & daily automated backups',
                  'Direct integration with Razorpay PCI-DSS verified payments',
                ].map(b => (
                  <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#ecfdf5',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <CheckCircleIcon size={14} color="#059669" />
                    </div>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: '#334155' }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              border: '1.5px solid #c7d2fe',
              borderRadius: 20,
              padding: 28,
              boxShadow: '0 8px 24px rgba(79, 70, 229, 0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: '#eef2ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldIcon size={24} color="#4f46e5" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>Data Privacy & Integrity</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Your institute data stays strictly yours</div>
                </div>
              </div>
              <p style={{ color: '#475569', fontSize: 13.5, lineHeight: 1.6, marginBottom: 16 }}>
                Every institute operates in a secure, isolated workspace. Student contact numbers and revenue figures are protected with industry-standard encryption.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['RBAC Secured', 'Encrypted DB', 'Razorpay Verified', 'JWT Protected'].map(t => (
                  <span
                    key={t}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      background: '#f8fafc',
                      color: '#4338ca',
                      fontSize: 11.5,
                      fontWeight: 700,
                      border: '1px solid #c7d2fe'
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. FREQUENTLY ASKED QUESTIONS ─── */}
      <section style={{ padding: '80px 20px', maxWidth: 840, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <h2 style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
            fontWeight: 900,
            fontFamily: 'var(--font-heading, sans-serif)',
            letterSpacing: '-0.02em',
            color: '#0f172a',
            marginBottom: 8
          }}>
            Frequently Asked Questions
          </h2>
          <p style={{ color: '#64748b', fontSize: 15 }}>Clear answers to common questions about Apni Vidya 2.0.</p>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {faqs.map((faq, idx) => (
            <div
              key={faq.q}
              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: 16,
                padding: '18px 22px',
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15.5, fontWeight: 800, color: '#0f172a' }}>{faq.q}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#4f46e5', marginLeft: 12 }}>
                  {openFaq === idx ? '−' : '+'}
                </span>
              </div>
              {openFaq === idx && (
                <p style={{ color: '#475569', fontSize: 14.5, lineHeight: 1.6, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── 7. CALL TO ACTION ─── */}
      <section style={{
        padding: '70px 20px',
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        textAlign: 'center',
        color: '#ffffff'
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 4.5vw, 2.8rem)',
            fontWeight: 900,
            marginBottom: 14,
            fontFamily: 'var(--font-heading, sans-serif)',
            color: '#ffffff',
            letterSpacing: '-0.025em'
          }}>
            Ready to Modernize Your Institute?
          </h2>
          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.15rem)',
            opacity: 0.92,
            maxWidth: 520,
            margin: '0 auto 28px',
            lineHeight: 1.6
          }}>
            Set up your coaching center in minutes. Start enrolling students, taking digital attendance, and managing fees today.
          </p>
          <Link
            to="/signup"
            className="btn"
            style={{
              background: '#ffffff',
              color: '#4338ca',
              fontWeight: 900,
              height: 52,
              fontSize: 16,
              padding: '0 32px',
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            Get Started Free <ArrowRightIcon size={18} />
          </Link>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 22, fontSize: 13, opacity: 0.85, flexWrap: 'wrap' }}>
            <span>✓ No credit card required</span>
            <span>✓ 5-minute instant setup</span>
            <span>✓ Fast student self-onboarding</span>
          </div>
        </div>
      </section>

      {/* ─── 8. FOOTER ─── */}
      <footer style={{
        padding: '36px 20px',
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        color: '#64748b',
        textAlign: 'center',
        fontSize: 13.5
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <GraduationCapIcon size={20} color="#4f46e5" />
          <span style={{ fontWeight: 900, color: '#0f172a', fontSize: 15 }}>Apni Vidya 2.0</span>
        </div>
        <div>© {new Date().getFullYear()} Apni Vidya. The modern operating system for coaching institutes and academies.</div>
      </footer>

    </div>
  );
}
