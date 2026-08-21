import React, { useState, useEffect } from 'react';
import { GET, toast } from '../../utils/api';
import { Modal } from '../common/Modal';
import { SkeletonCard, SkeletonTable } from '../common/Skeleton';
import { getScoreColor, formatDate } from '../../utils/helpers';
import { CheckCircleIcon, TrendingUpIcon, ClockIcon, TrophyIcon, DownloadIcon } from '../common/Icons';

export function StudentReportCardModal({ studentId, isOpen, onClose, onOpenDetailReport }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !studentId) return;
    setLoading(true);
    GET(`/tests/report-card/student/${studentId}`)
      .then(setData)
      .catch(err => {
        toast(err.message || 'Failed to load student report card');
        onClose();
      })
      .finally(() => setLoading(false));
  }, [isOpen, studentId, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Assessment Report Card"
      className="modal-xl"
      footer={
        <div className="fxb w-full">
          <button className="btn bs" onClick={handlePrint} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <DownloadIcon size={16} /> Print / Save PDF
          </button>
          <button className="btn bp" onClick={onClose}>Close</button>
        </div>
      }
    >
      {loading ? (
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SkeletonCard height={80} />
          <SkeletonTable rows={4} />
        </div>
      ) : !data ? (
        <div style={{ padding: 32, textAlign: 'center' }} className="muted">No assessment data available for this student.</div>
      ) : (
        <div className="report-card-content" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Header Banner */}
          <div className="card" style={{ background: 'var(--gradient-brand)', color: '#fff', padding: 20 }}>
            <div className="fxb" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 className="h2" style={{ color: '#fff', marginBottom: 4 }}>{data.student.full_name}</h2>
                <div style={{ opacity: 0.9, fontSize: 13 }}>
                  Batch: <strong>{data.student.batch_name || 'Unassigned'}</strong> &bull; Roll No: <strong>{data.student.roll_number || 'N/A'}</strong> &bull; {data.student.email}
                </div>
              </div>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 13, padding: '6px 12px' }}>
                {data.metrics.tests_taken} Tests Completed
              </span>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="g4">
            <div className="card sc" style={{ background: 'var(--bg-surface)' }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Average Score</div>
              <div className="sn" style={{ color: getScoreColor(data.metrics.avg_score_pct), fontSize: '1.75rem' }}>
                {data.metrics.avg_score_pct}%
              </div>
            </div>
            <div className="card sc" style={{ background: 'var(--bg-surface)' }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Highest Score</div>
              <div className="sn" style={{ color: 'var(--color-primary)', fontSize: '1.75rem' }}>
                {data.metrics.highest_score_pct}%
              </div>
            </div>
            <div className="card sc" style={{ background: 'var(--bg-surface)' }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Tests Taken</div>
              <div className="sn" style={{ fontSize: '1.75rem' }}>
                {data.metrics.tests_taken}
              </div>
            </div>
            <div className="card sc" style={{ background: 'var(--bg-surface)' }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Avg Time / Test</div>
              <div className="sn" style={{ fontSize: '1.75rem' }}>
                {data.metrics.avg_time_min}m
              </div>
            </div>
          </div>

          {/* Subject Performance Breakdown */}
          {data.subject_performance?.length > 0 && (
            <div>
              <h3 className="h3" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUpIcon size={18} /> Subject-wise Performance
              </h3>
              <div className="g3">
                {data.subject_performance.map((s, idx) => (
                  <div key={idx} className="card" style={{ padding: 16 }}>
                    <div className="fxb" style={{ marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{s.subject}</span>
                      <span style={{ fontWeight: 700, color: getScoreColor(s.avg_percentage), fontSize: 14 }}>{s.avg_percentage}%</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'var(--bg-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${s.avg_percentage}%`, background: getScoreColor(s.avg_percentage), borderRadius: 3 }} />
                    </div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>{s.tests_count} test(s) evaluated</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test History Table */}
          <div>
            <h3 className="h3" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrophyIcon size={18} /> Assessment History & Attempts
            </h3>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Test Name</th>
                    <th>Subject</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Rank</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.test_history?.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.test_title}</td>
                      <td className="muted">{t.subject || 'General'}</td>
                      <td><strong>{t.score}</strong> / {t.max_marks}</td>
                      <td>
                        <span className="badge" style={{ background: 'var(--bg-subtle)', color: getScoreColor(t.percentage) }}>
                          {t.percentage}%
                        </span>
                      </td>
                      <td>#{t.rank || '-'}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{formatDate(t.submitted_at)}</td>
                      <td>
                        <button
                          className="btn bd bsm"
                          onClick={() => {
                            if (onOpenDetailReport) {
                              onOpenDetailReport(t.test_id, data.student.id);
                            } else {
                              window.open(`/report/${t.test_id}?student_id=${data.student.id}`, '_blank');
                            }
                          }}
                        >
                          View Evaluation
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!data.test_history || data.test_history.length === 0) && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 24 }} className="muted">No completed tests yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </Modal>
  );
}
