import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GET } from '../../utils/api';
import { CheckCircleIcon, XCircleIcon, ClockIcon, TrendingUpIcon, HelpCircleIcon } from '../../components/common/Icons';

export function DetailedReport() {
  const { test_id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If student_id is passed as query param, the backend handles it.
    const urlParams = new URLSearchParams(window.location.search);
    const sId = urlParams.get('student_id');
    const path = sId ? `/tests/${test_id}/result-detail?student_id=${sId}` : `/tests/${test_id}/result-detail`;
    
    GET(path)
      .then(setReport)
      .catch(() => navigate(-1))
      .finally(() => setLoading(false));
  }, [test_id, navigate]);

  if (loading) {
    return <div className="skeleton" style={{ height: 400, width: '100%', borderRadius: 16 }}></div>;
  }

  if (!report) return null;

  const { stats, breakdown, questions, submission } = report;

  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <button className="btn bs" style={{ marginBottom: 24 }} onClick={() => navigate(-1)}>← Back</button>
      
      <div className="page-header" style={{ marginBottom: 32 }}>
        <h1 className="h1">Detailed Evaluation Report</h1>
        <p className="page-subtitle">Test Attempt {submission.attempt_number} • Score: {submission.score}/{submission.max_marks}</p>
      </div>

      <div className="g4" style={{ marginBottom: 32 }}>
        <div className="card sc" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
          <div className="muted" style={{ fontWeight: 600, color: 'inherit' }}>Accuracy</div>
          <div className="sn">{stats.accuracy}%</div>
        </div>
        <div className="card sc" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
          <div className="muted" style={{ fontWeight: 600, color: 'inherit' }}>Correct</div>
          <div className="sn">{stats.correct}</div>
        </div>
        <div className="card sc" style={{ background: 'var(--color-error-light)', color: 'var(--color-error)' }}>
          <div className="muted" style={{ fontWeight: 600, color: 'inherit' }}>Wrong</div>
          <div className="sn">{stats.wrong}</div>
        </div>
        <div className="card sc">
          <div className="muted" style={{ fontWeight: 600 }}>Skipped</div>
          <div className="sn">{stats.skipped}</div>
        </div>
      </div>

      <div className="g2" style={{ alignItems: 'start', marginBottom: 32 }}>
        <div className="card">
          <h2 className="h2" style={{ marginBottom: 16 }}>Subject Breakdown</h2>
          <table className="tbl">
            <thead><tr><th>Subject</th><th>Correct / Total</th><th>Accuracy</th></tr></thead>
            <tbody>
              {Object.keys(breakdown).map(k => (
                <tr key={k}>
                  <td style={{ fontWeight: 600 }}>{k}</td>
                  <td>{breakdown[k].correct} / {breakdown[k].total}</td>
                  <td>{Math.round((breakdown[k].correct / breakdown[k].total) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card sc" style={{ background: 'var(--bg-tertiary)', border: 'none', padding: 32 }}>
          <TrendingUpIcon size={32} color="var(--color-primary)" style={{ marginBottom: 16 }} />
          <div className="muted" style={{ fontSize: 14, fontWeight: 600 }}>Average Time Per Question</div>
          <div className="sn" style={{ color: 'var(--text-primary)', marginTop: 8 }}>{stats.avg_time_sec} secs</div>
        </div>
      </div>

      <h2 className="h2" style={{ marginBottom: 16 }}>Question-wise Review</h2>
      <div className="fx" style={{ flexDirection: 'column', gap: 16 }}>
        {questions.map((q, i) => (
          <div key={q.id} className="card" style={{ borderLeft: `4px solid ${q.status === 'correct' ? '#10b981' : q.status === 'wrong' ? '#ef4444' : '#94a3b8'}` }}>
            <div className="fxb" style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600 }}>Question {i + 1}</div>
              <div className="fx" style={{ gap: 8 }}>
                {q.status === 'correct' ? <CheckCircleIcon color="#10b981" /> : q.status === 'wrong' ? <XCircleIcon color="#ef4444" /> : <HelpCircleIcon color="#94a3b8" />}
                <span style={{ fontSize: 12, fontWeight: 600, color: q.status === 'correct' ? '#10b981' : q.status === 'wrong' ? '#ef4444' : '#94a3b8' }}>
                  {q.status.toUpperCase()}
                </span>
              </div>
            </div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>{q.text}</div>
            {q.type === 'mcq' && (
              <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 13, marginBottom: 8 }}>
                  <strong style={{ color: 'var(--color-success)' }}>Correct Answer:</strong> {q.options[q.correct_index]}
                </div>
                {q.status === 'wrong' && q.student_answer !== null && (
                  <div style={{ fontSize: 13 }}>
                    <strong style={{ color: 'var(--color-error)' }}>Your Answer:</strong> {q.options[q.student_answer]}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
