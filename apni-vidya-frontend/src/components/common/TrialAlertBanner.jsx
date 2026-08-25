import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { payInstituteSubscription, GET } from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { CreditCard, AlertCircle, Clock, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';

export function TrialAlertBanner() {
  const { institute, setInstitute, user } = useAuth();
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);

  // Only relevant for institute_admin
  if (user?.role !== 'institute_admin' || !institute) {
    return null;
  }

  const sub = institute.subscription || {
    status: institute.subscription_status || 'trial',
    is_trial_active: true,
    trial_days_left: 7,
    total_students: 0,
    total_batches: 0,
    rate_per_student: 80,
    amount_due: 0,
  };

  const refreshInstitute = async () => {
    try {
      const updated = await GET('/institutes/mine');
      if (updated) setInstitute(updated);
    } catch { /* */ }
  };

  const handlePayNow = (e) => {
    e.stopPropagation();
    setPaying(true);
    payInstituteSubscription(institute.id, async (success) => {
      setPaying(false);
      if (success) {
        await refreshInstitute();
      }
    });
  };

  // 1. Trial Expired State (Prominent Urgent Payment Alert)
  if (sub.is_trial_expired || sub.status === 'expired') {
    const studentCount = sub.total_students || 0;
    const rate = sub.rate_per_student || 80;
    const totalDue = sub.amount_due || (studentCount * rate);

    return (
      <div 
        style={{
          background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          boxShadow: '0 8px 24px rgba(239, 68, 68, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          animation: 'fadeIn 0.3s ease-in-out'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 320px' }}>
          <div 
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <AlertCircle size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>7-Day Free Trial Expired</span>
              <span style={{ fontSize: '11px', background: 'rgba(0, 0, 0, 0.3)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>Payment Due</span>
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.92)', marginTop: '2px', lineHeight: 1.4 }}>
              You have <strong>{studentCount} Enrolled Students</strong> across <strong>{sub.total_batches || 0} Batches</strong>. 
              Monthly subscription fee: <strong style={{ textDecoration: 'underline', color: '#fef08a' }}>{formatCurrency(totalDue)}</strong> ({formatCurrency(rate)}/student/month).
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/admin/billing')}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            Billing Breakdown
          </button>

          <button
            onClick={handlePayNow}
            disabled={paying}
            style={{
              background: '#ffffff',
              color: '#b91c1c',
              border: 'none',
              padding: '9px 18px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '13px',
              cursor: paying ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              transition: 'transform 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <CreditCard size={16} />
            {paying ? 'Processing...' : `Pay ${formatCurrency(totalDue)} & Activate`}
          </button>
        </div>
      </div>
    );
  }

  // 2. Active Trial State (Friendly countdown badge)
  if (sub.is_trial_active || sub.status === 'trial') {
    const daysLeft = sub.trial_days_left;
    const isUrgent = daysLeft <= 2;

    return (
      <div 
        style={{
          background: isUrgent 
            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
            : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: '12px',
          marginBottom: '20px',
          boxShadow: isUrgent ? '0 6px 20px rgba(245, 158, 11, 0.2)' : '0 6px 20px rgba(79, 70, 229, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {isUrgent ? <Clock size={18} color="#fff" /> : <Sparkles size={18} color="#fff" />}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🚀 7-Day Free Trial Active</span>
              <span 
                style={{ 
                  fontSize: '11px', 
                  background: 'rgba(0, 0, 0, 0.25)', 
                  padding: '2px 8px', 
                  borderRadius: '10px', 
                  fontWeight: 700 
                }}
              >
                {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.9)', marginTop: '2px' }}>
              Unlimited Batches & Students unlocked. After trial, pay only ₹80/student per month.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navigate('/admin/billing')}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              padding: '6px 14px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            Plan & Billing Details <ChevronRight size={13} />
          </button>
        </div>
      </div>
    );
  }

  // 3. Active Subscription State (Subtle notification)
  if (sub.is_subscription_active || sub.status === 'active') {
    return (
      <div 
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-light)',
          color: 'var(--text-primary)',
          padding: '8px 16px',
          borderRadius: '10px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span>
          <span style={{ fontWeight: 600, color: '#10b981' }}>Active Monthly Subscription</span>
          <span className="muted">•</span>
          <span className="muted">
            {sub.total_students || 0} Students enrolled ({formatCurrency((sub.total_students || 0) * (sub.rate_per_student || 80))}/mo)
          </span>
          {sub.subscription_valid_until && (
            <span className="muted">• Valid until {formatDate(sub.subscription_valid_until)}</span>
          )}
        </div>
        <button 
          onClick={() => navigate('/admin/billing')}
          style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}
        >
          Manage Subscription →
        </button>
      </div>
    );
  }

  return null;
}
