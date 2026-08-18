import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCapIcon, UsersIcon, ClipboardIcon, FileTextIcon,
  CurrencyIcon, BookOpenIcon, ArrowRightIcon, CheckCircleIcon,
  ShieldIcon, CalendarIcon, AwardIcon, ChevronRightIcon
} from '../../components/common/Icons';

export function Landing() {
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
      
      {/* ─── 1. MINIMALIST TOPBAR ─── */}
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
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <GraduationCapIcon size={24} color="#fff" />
          </div>
          <span style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--font-heading, sans-serif)', color: '#0f172a', letterSpacing: '-0.03em' }}>
            Apni Vidya
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/login" className="btn hover-lift" style={{ background: '#f8fafc', color: '#1e293b', border: '1.5px solid #cbd5e1', fontWeight: 700, fontSize: 14, height: 42, padding: '0 20px', borderRadius: 10 }}>
            Sign In
          </Link>
          <Link to="/signup" className="btn hover-lift" style={{ background: '#10b981', color: '#ffffff', fontWeight: 800, fontSize: 14, height: 42, padding: '0 22px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Start Free</span>
            <ArrowRightIcon size={16} />
          </Link>
        </div>
      </header>

      {/* ─── 2. GREENBOARD HERO SECTION ─── */}
      <section style={{
        position: 'relative',
        padding: '100px 20px 80px',
        textAlign: 'center',
        backgroundImage: 'url(/greenboard_texture.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#ffffff',
        borderBottom: '4px solid #10b981',
        boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8)'
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.4)' }}></div>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto' }}>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 30, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#e2e8f0', fontSize: 13, fontWeight: 700, marginBottom: 24, backdropFilter: 'blur(10px)' }}>
            <AwardIcon size={16} color="#fbbf24" />
            <span style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>India's #1 Institute Management Platform</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.8rem, 6vw, 4.5rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.035em', marginBottom: 24, fontFamily: 'var(--font-heading, serif)', textShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
            Manage Your Institute With<br/>
            <span style={{ color: '#fbbf24', textShadow: '0 2px 8px rgba(251, 191, 36, 0.3)' }}>Absolute Clarity</span>
          </h1>

          <p style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)', color: '#f1f5f9', lineHeight: 1.6, maxWidth: 700, margin: '0 auto 40px', fontWeight: 500, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            Everything coaching centers and premium academies need to run smoothly: contactless QR onboarding, instant digital attendance, automated test grading, and 1-click fee tracking.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn hover-lift" style={{ background: '#fbbf24', color: '#0f172a', fontWeight: 900, height: 56, fontSize: 16, padding: '0 36px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 24px rgba(251, 191, 36, 0.25)' }}>
              Create Free Account <ArrowRightIcon size={18} />
            </Link>
            <Link to="/login" className="btn hover-lift" style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', border: '2px solid rgba(255,255,255,0.3)', fontWeight: 700, height: 56, fontSize: 16, padding: '0 32px', borderRadius: 12, backdropFilter: 'blur(10px)' }}>
              Sign In To Portal
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 3. PLATFORM STATISTICS (Trust Section) ─── */}
      <section style={{ padding: '40px 20px', background: '#0f172a', color: '#ffffff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 30 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#10b981', marginBottom: 4 }}>500+</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Institutes Enrolled</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#fbbf24', marginBottom: 4 }}>2M+</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance Records</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#38bdf8', marginBottom: 4 }}>100%</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Secure & Encrypted</div>
          </div>
        </div>
      </section>

      {/* ─── 4. NOTEBOOK CORE FEATURES ─── */}
      <section style={{ 
        padding: '100px 20px', 
        backgroundImage: 'url(/notebook_pattern.jpg)',
        backgroundSize: '400px',
        backgroundRepeat: 'repeat',
        position: 'relative'
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 100%)', pointerEvents: 'none' }} />
        
        <div style={{ maxWidth: 1140, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)', fontWeight: 900, fontFamily: 'var(--font-heading, serif)', letterSpacing: '-0.025em', color: '#0f172a', marginBottom: 16 }}>
              Engineered For Modern Institutes
            </h2>
            <p style={{ color: '#475569', fontSize: 18, maxWidth: 680, margin: '0 auto', lineHeight: 1.6, fontWeight: 500 }}>
              Built specifically to solve real administrative bottlenecks in coaching centers, academies, and private schools. Professional tools, beautifully organized.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 30 }}>
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.id} className="hover-lift" style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: 16, padding: '36px 28px', boxShadow: '0 10px 40px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', backdropFilter: 'blur(10px)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: m.accent }} />
                  <div>
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: `${m.accent}15`, border: `1px solid ${m.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                      <Icon size={28} color={m.accent} />
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 12, color: '#0f172a', letterSpacing: '-0.01em' }}>
                      {m.title}
                    </h3>
                    <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>
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
      <section style={{ background: '#f8fafc', padding: '90px 20px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 40, alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 900, fontFamily: 'var(--font-heading, serif)', letterSpacing: '-0.02em', color: '#0f172a', marginBottom: 20 }}>
                Secure, Reliable & Cloud-Backed
              </h2>
              <p style={{ color: '#475569', fontSize: 16, lineHeight: 1.6, marginBottom: 24 }}>
                We treat your data with the highest level of security. Every institute operates in a strictly isolated workspace to guarantee privacy and integrity.
              </p>
              <div style={{ display: 'grid', gap: 16 }}>
                {[
                  'Granular Role-Based Access Control (RBAC)',
                  'Secure JWT session authentication',
                  'Encrypted database & daily automated backups',
                  'Razorpay PCI-DSS verified payments integration',
                ].map(b => (
                  <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircleIcon size={14} color="#fff" />
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#334155' }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 24, padding: 40, boxShadow: '0 20px 40px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldIcon size={30} color="#4f46e5" />
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18, color: '#0f172a' }}>Data Integrity</div>
                  <div style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>Your institute data stays strictly yours</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {['RBAC Secured', 'Encrypted DB', 'Razorpay Verified', 'JWT Protected'].map(t => (
                  <span key={t} style={{ padding: '6px 14px', borderRadius: 8, background: '#f8fafc', color: '#4338ca', fontSize: 13, fontWeight: 800, border: '1px solid #c7d2fe' }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. FREQUENTLY ASKED QUESTIONS ─── */}
      <section style={{ padding: '90px 20px', maxWidth: 840, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 900, fontFamily: 'var(--font-heading, serif)', letterSpacing: '-0.02em', color: '#0f172a', marginBottom: 12 }}>
            Frequently Asked Questions
          </h2>
          <p style={{ color: '#64748b', fontSize: 16, fontWeight: 500 }}>Clear answers to common questions about Apni Vidya.</p>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {faqs.map((faq, idx) => (
            <div key={faq.q} onClick={() => setOpenFaq(openFaq === idx ? null : idx)} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{faq.q}</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#10b981', marginLeft: 16 }}>
                  {openFaq === idx ? '−' : '+'}
                </span>
              </div>
              {openFaq === idx && (
                <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.6, marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── 7. CALL TO ACTION ─── */}
      <section style={{ padding: '80px 20px', background: '#0f172a', textAlign: 'center', color: '#ffffff' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', fontWeight: 900, marginBottom: 20, fontFamily: 'var(--font-heading, serif)', color: '#ffffff', letterSpacing: '-0.025em' }}>
            Ready to Modernize?
          </h2>
          <p style={{ fontSize: 'clamp(1.1rem, 2vw, 1.25rem)', color: '#94a3b8', maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.6 }}>
            Set up your coaching center in minutes. Start enrolling students, taking digital attendance, and managing fees today.
          </p>
          <Link to="/signup" className="btn hover-lift" style={{ background: '#fbbf24', color: '#0f172a', fontWeight: 900, height: 56, fontSize: 16, padding: '0 40px', borderRadius: 12, boxShadow: '0 8px 30px rgba(251, 191, 36, 0.25)', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            Get Started Free <ArrowRightIcon size={18} />
          </Link>
        </div>
      </section>

      {/* ─── 8. FOOTER ─── */}
      <footer style={{ padding: '40px 20px', background: '#ffffff', borderTop: '1px solid #e2e8f0', color: '#64748b', textAlign: 'center', fontSize: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCapIcon size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 900, fontSize: 18, color: '#0f172a', fontFamily: 'var(--font-heading, sans-serif)' }}>Apni Vidya</span>
        </div>
        <p style={{ marginBottom: 4, fontWeight: 500 }}>© {new Date().getFullYear()} Apni Vidya. All rights reserved.</p>
        <p style={{ fontSize: 12 }}>The premium management platform for coaching institutes.</p>
      </footer>
    </div>
  );
}
