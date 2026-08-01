import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { GET, POST, toast } from '../../utils/api';
import { GraduationCapIcon, CheckCircleIcon } from '../../components/common/Icons';

export function EnrollmentForm() {
  const { slug } = useParams();
  const [institute, setInstitute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    student_name: '', student_phone: '',
    parent_name: '', parent_phone: '', batch_id: '',
  });

  useEffect(() => {
    GET(`/institutes/enroll/${slug}`)
      .then(setInstitute)
      .catch(() => setError('Institute not found or enrollment link is invalid.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.student_name || !form.student_phone) {
      toast('Student name and phone are required'); return;
    }
    setSubmitting(true);
    try {
      await POST(`/enrollment/request/${slug}`, form);
      setSubmitted(true);
    } catch (err) {
      toast(err.message || 'Failed to submit enrollment request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="error-page">
        <div className="skeleton" style={{ width: 200, height: 32 }} />
        <div className="skeleton" style={{ width: 300, height: 20, marginTop: 12 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-page">
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--color-error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>⚠️</div>
        <h2 className="h2">{error}</h2>
        <p className="muted">Please check the QR code or enrollment link and try again.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="error-page animate-fade-in">
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircleIcon size={32} color="var(--color-success)" />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-heading)' }}>Enrollment Submitted</h2>
        <p className="muted" style={{ maxWidth: 400, fontSize: 15 }}>
          Your enrollment request for <strong>{institute?.name}</strong> has been submitted.
          You will receive a confirmation once it is approved by the institute.
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '32px 16px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="fx" style={{ justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            <GraduationCapIcon size={28} color="var(--color-primary)" />
            <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-heading)' }}>Apni Vidya</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-heading)', marginBottom: 8 }}>
            Enroll at {institute?.name}
          </h1>
          {institute?.city && <p className="muted">{[institute.city, institute.state].filter(Boolean).join(', ')}</p>}
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Student Full Name *</label>
              <input className="inp" value={form.student_name} onChange={set('student_name')} placeholder="Enter student's full name" />
            </div>
            <div className="field">
              <label>Student Phone Number *</label>
              <input className="inp" type="tel" value={form.student_phone} onChange={set('student_phone')} placeholder="10-digit mobile number" />
            </div>
            <div className="field">
              <label>Parent/Guardian Name</label>
              <input className="inp" value={form.parent_name} onChange={set('parent_name')} placeholder="Enter parent's name" />
            </div>
            <div className="field">
              <label>Parent Phone Number</label>
              <input className="inp" type="tel" value={form.parent_phone} onChange={set('parent_phone')} placeholder="Parent's mobile number" />
            </div>
            {institute?.batches?.length > 0 && (
              <div className="field">
                <label>Select Batch</label>
                <select className="sel w-full" value={form.batch_id} onChange={set('batch_id')}>
                  <option value="">Choose a batch</option>
                  {institute.batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
            <button type="submit" className="btn bp btn-full" disabled={submitting} style={{ height: 44, marginTop: 8 }}>
              {submitting ? 'Submitting...' : 'Submit Enrollment Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
