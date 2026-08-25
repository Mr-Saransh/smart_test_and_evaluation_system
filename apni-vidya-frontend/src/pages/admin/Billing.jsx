import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, payInstituteSubscription, toast } from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { SkeletonCard, SkeletonTable } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { 
  CreditCard, Shield, CheckCircle2, AlertCircle, Clock, Users, Building, 
  ArrowRight, RefreshCw, Receipt, HelpCircle, Sparkles, Check
} from 'lucide-react';

export function Billing() {
  const { institute, setInstitute } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const loadBilling = async () => {
    if (!institute) return;
    setLoading(true);
    try {
      const res = await GET(`/institutes/${institute.id}/billing-summary`);
      setData(res);
      // Refresh current institute in auth context as well
      const updatedInst = await GET('/institutes/mine');
      if (updatedInst) setInstitute(updatedInst);
    } catch (err) {
      toast(err.message || 'Failed to load billing summary', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBilling();
  }, [institute?.id]);

  const handlePay = () => {
    if (!institute) return;
    setPaying(true);
    payInstituteSubscription(institute.id, async (success) => {
      setPaying(false);
      if (success) {
        toast('Subscription activated successfully!', 'success');
        await loadBilling();
      }
    });
  };

  if (loading && !data) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: 1100 }}>
        <div className="page-header">
          <h1 className="h1">Billing & Subscriptions</h1>
          <p className="page-subtitle">Manage your institute subscription, student capacity, and invoices</p>
        </div>
        <div className="g3" style={{ marginBottom: 24 }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <div style={{ marginTop: 24 }}><SkeletonTable /></div>
      </div>
    );
  }

  const sub = data?.subscription || institute?.subscription || {
    status: 'trial',
    is_trial_active: true,
    trial_days_left: 7,
    total_students: 0,
    total_batches: 0,
    rate_per_student: 80,
    amount_due: 0,
    trial_ends_at: null,
    subscription_valid_until: null
  };

  const studentCount = sub.total_students || 0;
  const rate = sub.rate_per_student || 80;
  const totalMonthlyAmount = sub.amount_due || (studentCount * rate);
  const billableAmount = Math.max(totalMonthlyAmount, rate); // Min ₹80 for Razorpay base unit

  const isTrial = sub.is_trial_active;
  const isExpired = sub.is_trial_expired || sub.status === 'expired';
  const isActive = sub.is_subscription_active || sub.status === 'active';

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1100, paddingBottom: 60 }}>
      {/* Page Header */}
      <div className="page-header page-header-row">
        <div>
          <h1 className="h1">Billing & Subscriptions</h1>
          <p className="page-subtitle">
            Transparent pricing at <strong>₹{rate}/student per month</strong> with unlimited batches and features.
          </p>
        </div>
        <button className="btn bd bsm" onClick={loadBilling} title="Refresh billing data">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Hero Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 28 }}>
        
        {/* Status Card */}
        <div 
          className="card" 
          style={{ 
            background: isExpired 
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, var(--bg-surface) 100%)' 
              : isTrial 
              ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, var(--bg-surface) 100%)' 
              : 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, var(--bg-surface) 100%)',
            border: isExpired ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-light)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
                Subscription Plan
              </span>
              <h3 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800 }}>Apni Vidya Pro</h3>
            </div>
            <span 
              className="badge"
              style={{
                background: isActive ? '#d1fae5' : isTrial ? '#e0e7ff' : '#fee2e2',
                color: isActive ? '#059669' : isTrial ? '#4338ca' : '#dc2626',
                fontWeight: 700,
                fontSize: 12,
                padding: '4px 10px'
              }}
            >
              {isActive ? 'ACTIVE PLAN' : isTrial ? '7-DAY FREE TRIAL' : 'TRIAL EXPIRED'}
            </span>
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
            {isActive && (
              <span>
                Your monthly subscription is active. Renews on <strong>{formatDate(sub.subscription_valid_until)}</strong>.
              </span>
            )}
            {isTrial && (
              <span>
                Free trial active: <strong>{sub.trial_days_left} days remaining</strong> (Trial ends {formatDate(sub.trial_ends_at)}). Unlimited batches & students.
              </span>
            )}
            {isExpired && (
              <span style={{ color: '#ef4444', fontWeight: 600 }}>
                Your 7-day free trial has expired. Please pay to continue seamless usage across all features.
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>₹{rate}</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>/ student / month</span>
          </div>
        </div>

        {/* Current Usage Card */}
        <div className="card">
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            Active Platform Usage
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16, marginBottom: 16 }}>
            <div style={{ background: 'var(--bg-tertiary)', padding: 14, borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', marginBottom: 4 }}>
                <Users size={16} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Students</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{studentCount}</div>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: 14, borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', marginBottom: 4 }}>
                <Building size={16} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Batches</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{sub.total_batches || 0}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            ✓ Batches & test engine creation are completely unlimited.
          </div>
        </div>

        {/* Amount Due / Payment Action Card */}
        <div 
          className="card"
          style={{
            background: 'var(--gradient-brand)',
            color: '#ffffff',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 8px 24px rgba(79, 70, 229, 0.25)'
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isActive ? 'Next Month Bill Estimate' : 'Monthly Subscription Due'}
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, marginTop: 6, letterSpacing: '-0.02em' }}>
              {formatCurrency(totalMonthlyAmount)}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.85)', marginTop: 4 }}>
              Calculated for {studentCount} active students × ₹{rate}
            </div>
          </div>

          <button
            onClick={handlePay}
            disabled={paying}
            style={{
              background: '#ffffff',
              color: 'var(--color-primary)',
              border: 'none',
              borderRadius: 8,
              padding: '12px 18px',
              fontWeight: 800,
              fontSize: 14,
              cursor: paying ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 20,
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              transition: 'transform 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <CreditCard size={18} />
            {paying ? 'Processing...' : (isActive ? `Renew Subscription (${formatCurrency(billableAmount)})` : `Pay ${formatCurrency(billableAmount)} Now`)}
          </button>
        </div>
      </div>

      {/* Plan Features & Batch Distribution Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 32 }}>
        
        {/* Batch Breakdown */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Student Count by Batch</h3>
          {data?.batches && data.batches.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.batches.map(b => (
                <div 
                  key={b.id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Building size={16} color="var(--color-primary)" />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{b.name}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {b.student_count} <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>students</span>
                  </div>
                </div>
              ))}
              {data?.unassigned_students > 0 && (
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'var(--bg-tertiary)',
                    border: '1px dashed var(--border-light)'
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Unassigned Students</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{data.unassigned_students} students</span>
                </div>
              )}
            </div>
          ) : (
            <EmptyState icon={Users} title="No Batches Created Yet" description="Create batches and enroll students to view the distribution." />
          )}
        </div>

        {/* All Inclusive Pro Features */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="var(--color-primary)" /> What's Included in Your Plan
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              "Unlimited Batches & Courses",
              "Automated Test Engine & Instant AI-Powered Evaluation",
              "QR Code Self-Enrollment & Admissions Portal",
              "Individual Student Portals & Parent Tracking Dashboards",
              "Study Material Sharing & Live Class Integration",
              "Daily Attendance & Automated Fee Collection Module",
              "Class Timetable & Study Planner Tools"
            ].map((feat, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={12} strokeWidth={3} />
                </div>
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment & Invoice History Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Subscription & Payment History</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>All past monthly subscription receipts and invoices</p>
          </div>
          <Receipt size={20} color="var(--text-tertiary)" />
        </div>

        <div className="tblwrap">
          {data?.history && data.history.length > 0 ? (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction / Order ID</th>
                  <th>Students Billed</th>
                  <th>Coverage Period</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((inv) => (
                  <tr key={inv.id}>
                    <td>{formatDate(inv.created_at)}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, fontFamily: 'monospace' }}>
                        {inv.razorpay_payment_id || inv.razorpay_order_id}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{inv.student_count}</span> Students
                    </td>
                    <td>
                      {inv.period_start && inv.period_end ? (
                        <span style={{ fontSize: 12 }}>
                          {formatDate(inv.period_start)} → {formatDate(inv.period_end)}
                        </span>
                      ) : (
                        <span className="muted">1 Month</span>
                      )}
                    </td>
                    <td>
                      <strong style={{ color: '#10b981' }}>{formatCurrency(inv.amount / 100)}</strong>
                    </td>
                    <td>
                      <span className="badge" style={{ background: inv.status === 'paid' ? '#d1fae5' : '#fee2e2', color: inv.status === 'paid' ? '#059669' : '#dc2626' }}>
                        {inv.status ? inv.status.toUpperCase() : 'PENDING'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Receipt size={36} color="var(--text-tertiary)" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 600, fontSize: 14 }}>No Invoices Yet</div>
              <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>Your subscription payment receipts will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
