import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCapIcon, UsersIcon, ClipboardIcon, FileTextIcon, CurrencyIcon, TrendingUpIcon, BookOpenIcon, ArrowRightIcon, CheckCircleIcon, ShieldIcon } from '../../components/common/Icons';

const features = [
  { icon: UsersIcon, title: 'Student Management', desc: 'Complete CRM for admissions, enrollment, and student lifecycle management with QR-based onboarding.', color: '#4f46e5', bg: '#e0e7ff' },
  { icon: ClipboardIcon, title: 'Attendance Tracking', desc: 'Digital attendance with batch-wise sheets, summary analytics, and automated parent notifications.', color: '#10b981', bg: '#d1fae5' },
  { icon: FileTextIcon, title: 'Tests & Assessments', desc: 'Create MCQ and subjective tests from your question bank. Auto-grade, rank, and generate SWOT analysis.', color: '#f59e0b', bg: '#fef3c7' },
  { icon: CurrencyIcon, title: 'Fee Management', desc: 'Structure fees, track payments, send reminders, and accept online payments via Razorpay.', color: '#ef4444', bg: '#fee2e2' },
  { icon: BookOpenIcon, title: 'Study Materials', desc: 'Upload and share PDFs, video lectures, notes, and links organized by subject and batch.', color: '#7c3aed', bg: '#f5f3ff' },
  { icon: TrendingUpIcon, title: 'Reports & Analytics', desc: 'Student progress reports, batch analytics, topic-wise SWOT, and automated parent report delivery.', color: '#3b82f6', bg: '#dbeafe' },
];

const stats = [
  { num: '500+', label: 'Coaching Institutes' },
  { num: '50K+', label: 'Students Enrolled' },
  { num: '1M+', label: 'Tests Conducted' },
  { num: '99.9%', label: 'Uptime' },
];

export function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="fx" style={{ gap: 10 }}>
          <GraduationCapIcon size={28} color="var(--color-primary)" />
          <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Apni Vidya</span>
        </div>
        <div className="fx" style={{ gap: 10 }}>
          <Link to="/login" className="btn bs">Sign In</Link>
          <Link to="/signup" className="btn bp">Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="landing-hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600, marginBottom: 20, backdropFilter: 'blur(4px)' }}>
            ✨ Complete Coaching Institute ERP
          </div>
          <h1>Run Your Institute<br />Like a Pro</h1>
          <p>
            The all-in-one platform for coaching institutes — admissions, batches,
            attendance, tests, fees, study materials, and parent communication.
          </p>
          <div className="fx" style={{ justifyContent: 'center', gap: 12 }}>
            <Link to="/signup" className="btn" style={{ background: '#fff', color: '#4f46e5', fontWeight: 700, height: 48, fontSize: 15 }}>
              Start Free Trial <ArrowRightIcon size={16} />
            </Link>
            <Link to="/login" className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', height: 48, fontSize: 15 }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '40px 32px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="g4" style={{ maxWidth: 900, margin: '0 auto' }}>
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>{s.num}</div>
              <div className="muted">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="landing-section">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 34, fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em', marginBottom: 12 }}>
            Everything you need to manage your institute
          </h2>
          <p className="muted" style={{ fontSize: 16, maxWidth: 560, margin: '0 auto' }}>
            From student enrollment to parent reports — every workflow automated and accessible from any device.
          </p>
        </div>
        <div className="feature-grid">
          {features.map(f => (
            <div key={f.title} className="feature-card animate-fade-in">
              <div className="feature-icon" style={{ background: f.bg }}>
                <f.icon size={24} color={f.color} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, fontFamily: 'var(--font-heading)' }}>{f.title}</h3>
              <p className="muted" style={{ lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div style={{ background: 'var(--bg-secondary)', padding: '64px 32px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 34, fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em', marginBottom: 12 }}>
              Get Started in 3 Steps
            </h2>
          </div>
          <div className="g3">
            {[
              { step: '1', title: 'Register & Setup', desc: 'Create your account, add institute details, courses, and batches in minutes.' },
              { step: '2', title: 'Enroll Students', desc: 'Share your unique QR code. Students scan, fill the form, and you approve.' },
              { step: '3', title: 'Manage Everything', desc: 'Track attendance, conduct tests, manage fees, and send reports to parents.' },
            ].map(s => (
              <div key={s.step} style={{ textAlign: 'center', padding: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 20, fontWeight: 800 }}>{s.step}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
                <p className="muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="landing-section">
        <div className="g2" style={{ alignItems: 'center', gap: 48 }}>
          <div>
            <h2 style={{ fontSize: 30, fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em', marginBottom: 20 }}>
              Why coaching institutes choose Apni Vidya
            </h2>
            <div style={{ display: 'grid', gap: 16 }}>
              {[
                'QR-based student enrollment — no manual data entry',
                'Auto-graded tests with topic-wise SWOT analysis',
                'Automated fee reminders via SMS & WhatsApp',
                'Scheduled parent progress reports',
                'Multi-batch, multi-course management',
                'Mobile-first design — works on any device',
              ].map(b => (
                <div key={b} className="fx" style={{ gap: 10 }}>
                  <CheckCircleIcon size={20} color="var(--color-success)" />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{b}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 32, background: 'linear-gradient(135deg, #f8fafc, #e0e7ff)', border: '1px solid #c7d2fe' }}>
            <div className="fx" style={{ gap: 12, marginBottom: 20 }}>
              <ShieldIcon size={24} color="var(--color-primary)" />
              <span style={{ fontWeight: 700, fontSize: 16 }}>Trusted & Secure</span>
            </div>
            <p className="muted" style={{ lineHeight: 1.7, marginBottom: 16 }}>
              Bank-grade security with JWT authentication, rate limiting, RBAC, and encrypted data storage. Your institute data is safe with us.
            </p>
            <div className="fx fw" style={{ gap: 8 }}>
              {['RBAC', 'JWT Auth', 'Rate Limited', 'Encrypted'].map(t => (
                <span key={t} className="badge" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', padding: '64px 32px', textAlign: 'center', color: '#fff' }}>
        <h2 style={{ fontSize: 34, fontWeight: 800, color: '#fff', marginBottom: 16, fontFamily: 'var(--font-heading)' }}>
          Ready to transform your institute?
        </h2>
        <p style={{ opacity: 0.9, fontSize: 17, marginBottom: 28, maxWidth: 500, margin: '0 auto 28px' }}>
          Join 500+ coaching institutes already using Apni Vidya to streamline their operations.
        </p>
        <Link to="/signup" className="btn" style={{ background: '#fff', color: '#4f46e5', fontWeight: 700, height: 48, fontSize: 15 }}>
          Get Started Free <ArrowRightIcon size={16} />
        </Link>
      </div>

      {/* Footer */}
      <footer style={{ padding: '32px', background: '#0f172a', color: '#94a3b8', textAlign: 'center', fontSize: 13 }}>
        <div className="fx" style={{ justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <GraduationCapIcon size={20} color="#94a3b8" />
          <span style={{ fontWeight: 700, color: '#f8fafc' }}>Apni Vidya</span>
        </div>
        <div>© {new Date().getFullYear()} Apni Vidya. All rights reserved.</div>
      </footer>
    </div>
  );
}
