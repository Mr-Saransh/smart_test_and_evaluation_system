import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { GET, toast } from '../../utils/api';
import {
  CheckCircleIcon,
  XCircleIcon,
  HelpCircleIcon,
  ClockIcon,
  TrendingUpIcon,
  TrophyIcon,
  DownloadIcon,
  SparklesIcon
} from '../../components/common/Icons';
import { getScoreColor, formatDate } from '../../utils/helpers';
import { SkeletonCard, SkeletonTable } from '../../components/common/Skeleton';

export function DetailedReport() {
  const { test_id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'correct' | 'wrong' | 'skipped'

  useEffect(() => {
    const sId = searchParams.get('student_id');
    const path = sId ? `/tests/${test_id}/result-detail?student_id=${sId}` : `/tests/${test_id}/result-detail`;

    GET(path)
      .then(setReport)
      .catch(err => {
        toast(err.message || 'Failed to load detailed assessment report');
        navigate(-1);
      })
      .finally(() => setLoading(false));
  }, [test_id, searchParams, navigate]);

  const filteredQuestions = useMemo(() => {
    if (!report?.questions) return [];
    if (filter === 'correct') return report.questions.filter(q => q.status === 'correct');
    if (filter === 'wrong') return report.questions.filter(q => q.status === 'wrong');
    if (filter === 'skipped') return report.questions.filter(q => q.status === 'skipped');
    return report.questions;
  }, [report, filter]);

  if (loading) {
    return (
      <div style={{ padding: 40, maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SkeletonCard height={120} />
        <div className="g4">
          <SkeletonCard height={80} />
          <SkeletonCard height={80} />
          <SkeletonCard height={80} />
          <SkeletonCard height={80} />
        </div>
        <SkeletonTable rows={5} />
      </div>
    );
  }

  if (!report) return null;

  const { test, submission, stats, subject_breakdown, insights, questions } = report;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="animate-fade-in assessment-report-page" style={{ padding: '24px 20px 60px 20px', maxWidth: 1000, margin: '0 auto' }}>
      
      {/* Top Action Bar */}
      <div className="fxb" style={{ marginBottom: 20 }}>
        <button className="btn bs" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <button className="btn bs" onClick={handlePrint} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <DownloadIcon size={16} /> Print Report
        </button>
      </div>

      {/* Hero Scorecard Banner */}
      <div className="card" style={{ background: 'var(--gradient-brand)', color: '#fff', padding: 28, marginBottom: 24, borderRadius: 'var(--radius-xl)' }}>
        <div className="fxb" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.9, fontWeight: 700, marginBottom: 4 }}>
              Learning Evaluation Report &bull; {test.subject}
            </div>
            <h1 className="h1" style={{ color: '#fff', marginBottom: 6, fontSize: '1.75rem' }}>{test.title}</h1>
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              Student: <strong>{submission.student_name}</strong> &bull; Attempt #{submission.attempt_number} &bull; Submitted: {formatDate(submission.submitted_at)}
            </div>
          </div>

          {/* Large Score Pill */}
          <div style={{ background: 'rgba(255, 255, 255, 0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', padding: '16px 28px', borderRadius: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: 0.85 }}>TOTAL SCORE</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1.1 }}>
              {submission.score} <span style={{ fontSize: '1.25rem', opacity: 0.75 }}>/ {submission.max_marks}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>
              {submission.percentage}% &bull; Rank #{submission.rank || '-'}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="g4" style={{ marginBottom: 24 }}>
        <div className="card sc" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
          <div className="muted" style={{ fontWeight: 700, color: '#047857', fontSize: 11, textTransform: 'uppercase' }}>Accuracy Rate</div>
          <div className="sn" style={{ color: '#059669', fontSize: '2rem' }}>{stats.accuracy}%</div>
        </div>
        <div className="card sc" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <div className="muted" style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 11, textTransform: 'uppercase' }}>Correct Answers</div>
          <div className="sn" style={{ color: '#2563eb', fontSize: '2rem' }}>{stats.correct}</div>
        </div>
        <div className="card sc" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div className="muted" style={{ fontWeight: 700, color: '#b91c1c', fontSize: 11, textTransform: 'uppercase' }}>Incorrect Answers</div>
          <div className="sn" style={{ color: '#dc2626', fontSize: '2rem' }}>{stats.wrong}</div>
        </div>
        <div className="card sc" style={{ background: 'var(--bg-subtle)' }}>
          <div className="muted" style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Skipped</div>
          <div className="sn" style={{ fontSize: '2rem' }}>{stats.skipped}</div>
        </div>
      </div>

      {/* Subject Breakdown & Time Efficiency */}
      <div className="g2" style={{ alignItems: 'stretch', marginBottom: 24 }}>
        {/* Subject Mastery */}
        <div className="card" style={{ padding: 20 }}>
          <h3 className="h3" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUpIcon size={18} /> Subject & Concept Mastery
          </h3>
          <div className="fx" style={{ flexDirection: 'column', gap: 12 }}>
            {(subject_breakdown || []).map((s, idx) => (
              <div key={idx}>
                <div className="fxb" style={{ fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{s.subject}</span>
                  <span style={{ fontWeight: 700, color: getScoreColor(s.accuracy) }}>
                    {s.correct} / {s.total} ({s.accuracy}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: 8, background: 'var(--bg-subtle)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.accuracy}%`, background: getScoreColor(s.accuracy), borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Time Efficiency */}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--bg-surface)' }}>
          <div className="fx" style={{ gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-primary-bg)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClockIcon size={24} />
            </div>
            <div>
              <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Speed & Time Management</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.avg_time_sec} Seconds</div>
            </div>
          </div>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>
            Total time taken: <strong>{submission.time_taken_min} minute(s)</strong> across {stats.total_questions} questions.
          </p>
        </div>
      </div>

      {/* Deterministic Learning Insights */}
      {insights && insights.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 28, background: 'var(--bg-surface)', borderLeft: '4px solid var(--color-primary)' }}>
          <h3 className="h3" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <SparklesIcon size={18} color="var(--color-primary)" /> Assessment Learning Insights
          </h3>
          <div className="fx" style={{ flexDirection: 'column', gap: 10 }}>
            {insights.map((item, idx) => (
              <div key={idx} className="fx" style={{ gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16 }}>
                  {item.type === 'strength' ? '🌟' : item.type === 'warning' ? '⚠️' : '💡'}
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{item.title}</div>
                  <div className="muted" style={{ fontSize: 13 }}>{item.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question-by-Question Detailed Review */}
      <div>
        <div className="fxb" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h2 className="h2" style={{ marginBottom: 0 }}>Question-wise Detailed Review</h2>
          
          {/* Question Filter Badges */}
          <div className="fx" style={{ gap: 6 }}>
            {[
              { id: 'all', label: `All (${questions.length})` },
              { id: 'correct', label: `Correct (${stats.correct})` },
              { id: 'wrong', label: `Wrong (${stats.wrong})` },
              { id: 'skipped', label: `Skipped (${stats.skipped})` }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`btn bsm ${filter === tab.id ? 'bp' : 'bs'}`}
                onClick={() => setFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Question Cards List */}
        <div className="fx" style={{ flexDirection: 'column', gap: 16 }}>
          {filteredQuestions.map((q, idx) => {
            const isCorrect = q.status === 'correct';
            const isWrong = q.status === 'wrong';
            const isSkipped = q.status === 'skipped';

            const borderCol = isCorrect ? 'var(--color-success)' : isWrong ? 'var(--color-error)' : 'var(--border-light)';
            const statusBg = isCorrect ? '#d1fae5' : isWrong ? '#fee2e2' : 'var(--bg-subtle)';
            const statusFg = isCorrect ? '#059669' : isWrong ? '#dc2626' : 'var(--text-secondary)';

            return (
              <div
                key={q.id}
                className="card"
                style={{
                  padding: 20,
                  borderLeft: `5px solid ${borderCol}`,
                  background: 'var(--bg-surface)'
                }}
              >
                {/* Question Card Header */}
                <div className="fxb" style={{ marginBottom: 12 }}>
                  <div className="fx" style={{ gap: 10, alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>Question {q.position}</span>
                    <span className="badge" style={{ background: statusBg, color: statusFg, fontWeight: 700 }}>
                      {isCorrect ? '✓ Correct' : isWrong ? '✗ Incorrect' : '— Skipped'}
                    </span>
                  </div>
                  <span className="badge" style={{ background: 'var(--bg-subtle)', fontWeight: 700 }}>
                    {isCorrect ? `+${q.marks_earned} Marks` : isWrong ? `${q.marks_earned} Marks` : '0 Marks'}
                  </span>
                </div>

                {/* Question Statement */}
                <p style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.5, marginBottom: 16, color: 'var(--text-primary)' }}>
                  {q.text}
                </p>

                {/* Options Review Grid */}
                {q.options && Array.isArray(q.options) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    {q.options.map((opt, oIdx) => {
                      const isStudentChoice = q.student_answer === oIdx;
                      const isCorrectChoice = q.correct_index === oIdx;

                      let optBg = 'var(--bg-subtle)';
                      let optBorder = '1px solid var(--border-light)';
                      let badge = null;

                      if (isCorrectChoice) {
                        optBg = '#ecfdf5';
                        optBorder = '2px solid #10b981';
                        badge = <span style={{ color: '#059669', fontWeight: 700, fontSize: 12, marginLeft: 'auto' }}>✓ Correct Answer</span>;
                      } else if (isStudentChoice && !isCorrectChoice) {
                        optBg = '#fef2f2';
                        optBorder = '2px solid #ef4444';
                        badge = <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 12, marginLeft: 'auto' }}>✗ Your Choice</span>;
                      }

                      return (
                        <div
                          key={oIdx}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            background: optBg,
                            border: optBorder,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 13
                          }}
                        >
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{String.fromCharCode(65 + oIdx)}.</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: isCorrectChoice || isStudentChoice ? 600 : 400 }}>
                            {opt}
                          </span>
                          {badge}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Explanation / Notes */}
                {q.explanation && (
                  <div style={{ background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
