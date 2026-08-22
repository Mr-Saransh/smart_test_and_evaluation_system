import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, UPLOAD, toast } from '../../utils/api';
import {
  FileTextIcon,
  TrendingUpIcon,
  UsersIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  SparklesIcon,
  UploadIcon,
  TrashIcon,
  CopyIcon,
  PlusIcon,
  DownloadIcon,
  ClockIcon,
  TrophyIcon
} from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { SkeletonTable, SkeletonCard } from '../../components/common/Skeleton';
import { getScoreColor, formatDate } from '../../utils/helpers';
import { StudentReportCardModal } from '../../components/dashboard/StudentReportCardModal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function Tests() {
  const { institute } = useAuth();
  const [batches, setBatches] = useState([]);
  const [batchFilter, setBatchFilter] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Test Creation & Importer State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState('input'); // 'input' | 'review'
  const [inputType, setInputType] = useState('pdf'); // 'pdf' | 'docx' | 'text' | 'manual'
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [savingTest, setSavingTest] = useState(false);

  // Extracted Questions for Review Workspace
  const [reviewQuestions, setReviewQuestions] = useState([]);
  const [questionFilter, setQuestionFilter] = useState('all'); // 'all' | 'needs_review' | 'valid'
  const fileInputRef = useRef(null);

  // Compact Test Settings Form
  const [testForm, setTestForm] = useState({
    title: '',
    subject: '',
    batch_id: '',
    duration_min: 30,
    chapter: '',
    difficulty: 'medium',
    start_date: '',
    end_date: '',
    attempt_limit: 1,
    marks_per_question: 1,
    negative_marks_per_question: 0
  });

  // Batch Analytics Drawer State
  const [selectedTest, setSelectedTest] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState('overview'); // 'overview' | 'quality' | 'scoreboard'

  // Student Report Card Modal
  const [selectedStudentForReport, setSelectedStudentForReport] = useState(null);

  // Load Batches
  useEffect(() => {
    if (!institute) return;
    GET(`/batches/${institute.id}`)
      .then(b => {
        setBatches(b);
        if (b.length > 0) setBatchFilter(b[0].id);
      })
      .catch(() => setLoading(false));
  }, [institute]);

  // Load Tests for selected Batch
  useEffect(() => {
    if (!batchFilter) { setItems([]); setLoading(false); return; }
    setLoading(true);
    GET(`/tests/batch/${batchFilter}`)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [batchFilter]);

  const setF = (k) => (e) => setTestForm(prev => ({ ...prev, [k]: e.target.value }));

  // Open Create Test Flow
  const handleOpenCreate = () => {
    const todayFormatted = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    setTestForm({
      title: `General Assessment — ${todayFormatted}`,
      subject: '',
      batch_id: batchFilter || (batches[0]?.id || ''),
      duration_min: 30,
      chapter: '',
      difficulty: 'medium',
      start_date: '',
      end_date: '',
      attempt_limit: 1,
      marks_per_question: 1,
      negative_marks_per_question: 0
    });
    setInputType('pdf');
    setRawText('');
    setSelectedFile(null);
    setReviewQuestions([]);
    setCreateStep('input');
    setShowCreateModal(true);
  };

  // Step 1 -> Step 2: Intelligent Extraction
  const handleStartExtraction = async () => {
    if (inputType === 'manual') {
      // Start with 1 clean question
      setReviewQuestions([
        {
          id: `manual_q_${Date.now()}`,
          text: '',
          options: ['', '', '', ''],
          correct_index: null,
          marks: Number(testForm.marks_per_question) || 1,
          negative_marks: Number(testForm.negative_marks_per_question) || 0,
          difficulty: 'medium',
          explanation: '',
          status: 'needs_review',
          is_valid: false,
          issues: ['Question text is missing or empty.', 'Correct answer has not been selected.']
        }
      ]);
      setCreateStep('review');
      return;
    }

    setIsExtracting(true);

    try {
      let result;
      if (inputType === 'pdf' || inputType === 'docx') {
        const file = selectedFile || fileInputRef.current?.files[0];
        if (!file) {
          toast('Please select a document file (.pdf or .docx)');
          setIsExtracting(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('subject', testForm.subject || '');
        formData.append('marks_per_question', testForm.marks_per_question || 1);
        formData.append('negative_marks', testForm.negative_marks_per_question || 0);

        result = await UPLOAD('/questions/upload-document', formData);
      } else {
        if (!rawText.trim()) {
          toast('Please paste text containing your questions');
          setIsExtracting(false);
          return;
        }
        result = await POST('/questions/extract-text', {
          text: rawText,
          subject: testForm.subject || '',
          marks_per_question: testForm.marks_per_question || 1,
          negative_marks: testForm.negative_marks_per_question || 0
        });
      }

      if (!result.questions || result.questions.length === 0) {
        toast('Could not detect any questions. Please check the document content.');
        setIsExtracting(false);
        return;
      }

      setReviewQuestions(result.questions);
      
      // Auto-populate subject and title if not set
      if (result.metadata?.subject && !testForm.subject) {
        const todayFormatted = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        setTestForm(prev => ({
          ...prev,
          subject: result.metadata.subject,
          title: `${result.metadata.subject} Assessment — ${todayFormatted}`
        }));
      }

      toast(`Extracted ${result.questions.length} question(s) for review!`, 'success');
      setCreateStep('review');
    } catch (err) {
      toast(err.message || 'Extraction failed');
    } finally {
      setIsExtracting(false);
    }
  };

  // Inline Question Card Handlers
  const handleUpdateQuestionText = (index, text) => {
    setReviewQuestions(prev => {
      const copy = [...prev];
      copy[index] = validateSingleQuestion({ ...copy[index], text });
      return copy;
    });
  };

  const handleUpdateOption = (qIndex, optIndex, value) => {
    setReviewQuestions(prev => {
      const copy = [...prev];
      const newOpts = [...(copy[qIndex].options || [])];
      newOpts[optIndex] = value;
      copy[qIndex] = validateSingleQuestion({ ...copy[qIndex], options: newOpts });
      return copy;
    });
  };

  const handleSetCorrectAnswer = (qIndex, answerIndex) => {
    setReviewQuestions(prev => {
      const copy = [...prev];
      copy[qIndex] = validateSingleQuestion({
        ...copy[qIndex],
        correct_index: answerIndex === '' ? null : Number(answerIndex)
      });
      return copy;
    });
  };

  const handleAddOption = (qIndex) => {
    setReviewQuestions(prev => {
      const copy = [...prev];
      const opts = [...(copy[qIndex].options || []), ''];
      copy[qIndex] = validateSingleQuestion({ ...copy[qIndex], options: opts });
      return copy;
    });
  };

  const handleRemoveOption = (qIndex, optIndex) => {
    setReviewQuestions(prev => {
      const copy = [...prev];
      const opts = copy[qIndex].options.filter((_, i) => i !== optIndex);
      let correctIdx = copy[qIndex].correct_index;
      if (correctIdx === optIndex) correctIdx = null;
      else if (correctIdx > optIndex) correctIdx--;
      copy[qIndex] = validateSingleQuestion({ ...copy[qIndex], options: opts, correct_index: correctIdx });
      return copy;
    });
  };

  const handleDeleteQuestion = (index) => {
    setReviewQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleDuplicateQuestion = (index) => {
    setReviewQuestions(prev => {
      const copy = [...prev];
      const q = copy[index];
      const dup = {
        ...q,
        id: `dup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        text: `${q.text} (Copy)`
      };
      copy.splice(index + 1, 0, dup);
      return copy;
    });
  };

  const handleAddNewQuestion = () => {
    setReviewQuestions(prev => [
      ...prev,
      {
        id: `manual_${Date.now()}`,
        text: '',
        options: ['', '', '', ''],
        correct_index: null,
        marks: Number(testForm.marks_per_question) || 1,
        negative_marks: Number(testForm.negative_marks_per_question) || 0,
        difficulty: 'medium',
        explanation: '',
        status: 'needs_review',
        is_valid: false,
        issues: ['Question text is missing or empty.', 'Correct answer has not been selected.']
      }
    ]);
  };

  // Helper validation for inline edits
  const validateSingleQuestion = (q) => {
    const issues = [];
    if (!q.text || !q.text.trim()) issues.push('Question text is missing.');
    if (!Array.isArray(q.options) || q.options.length < 2) {
      issues.push('At least 2 options are required.');
    } else {
      const emptyOpts = q.options.filter(o => !o || !o.trim());
      if (emptyOpts.length > 0) issues.push('Some options are empty.');
      const uniqueOpts = new Set(q.options.map(o => o.trim().toLowerCase()).filter(Boolean));
      if (uniqueOpts.size < q.options.filter(o => o.trim()).length) {
        issues.push('Duplicate option values detected.');
      }
    }
    if (q.correct_index === null || q.correct_index === undefined) {
      issues.push('Correct answer is not selected.');
    } else if (q.correct_index < 0 || (q.options && q.correct_index >= q.options.length)) {
      issues.push('Correct answer option is invalid.');
    }

    const isValid = issues.length === 0;
    return {
      ...q,
      is_valid: isValid,
      status: isValid ? 'valid' : 'needs_review',
      issues
    };
  };

  // Validation status for Review Workspace
  const reviewStats = useMemo(() => {
    const total = reviewQuestions.length;
    const valid = reviewQuestions.filter(q => q.is_valid).length;
    const needsReview = total - valid;
    const canPublish = total > 0 && needsReview === 0;
    return { total, valid, needsReview, canPublish };
  }, [reviewQuestions]);

  const filteredQuestions = useMemo(() => {
    if (questionFilter === 'valid') return reviewQuestions.filter(q => q.is_valid);
    if (questionFilter === 'needs_review') return reviewQuestions.filter(q => !q.is_valid);
    return reviewQuestions;
  }, [reviewQuestions, questionFilter]);

  // Final Publish Test Action
  const handlePublishTest = async () => {
    if (!testForm.title.trim() || !testForm.batch_id) {
      toast('Test title and batch are required');
      return;
    }
    if (reviewQuestions.length === 0) {
      toast('Please add at least one question');
      return;
    }
    if (!reviewStats.canPublish) {
      toast(`Cannot launch test: ${reviewStats.needsReview} question(s) need your review`);
      return;
    }

    setSavingTest(true);
    try {
      const payload = {
        ...testForm,
        institute_id: institute.id,
        start_date: testForm.start_date ? new Date(testForm.start_date).toISOString() : null,
        end_date: testForm.end_date ? new Date(testForm.end_date).toISOString() : null,
        raw_questions: reviewQuestions
      };

      await POST('/tests', payload, `Test "${testForm.title}" created with ${reviewQuestions.length} questions!`);
      setShowCreateModal(false);
      GET(`/tests/batch/${batchFilter}`).then(setItems);
    } catch (err) {
      toast(err.message || 'Failed to create test');
    } finally {
      setSavingTest(false);
    }
  };

  // Open Batch Analytics Drawer
  const openAnalytics = async (testItem) => {
    setSelectedTest(testItem);
    setLoadingAnalytics(true);
    setActiveAnalyticsTab('overview');
    try {
      const data = await GET(`/tests/${testItem.id}/batch-analytics`);
      setAnalyticsData(data);
    } catch (err) {
      toast(err.message || 'Failed to load test analytics');
      setSelectedTest(null);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Export Scoreboard to CSV
  const handleExportCSV = () => {
    if (!analyticsData?.scoreboard || analyticsData.scoreboard.length === 0) {
      toast('No submission data available to export');
      return;
    }
    const headers = ['Rank,Student Name,Score,Max Marks,Percentage,Time (Mins),Submitted At,Security Warnings\n'];
    const rows = analyticsData.scoreboard.map(s => 
      `"${s.rank}","${s.student_name.replace(/"/g, '""')}","${s.score}","${s.max_marks}","${s.percentage}%","${s.time_taken_min}","${formatDate(s.submitted_at)}","${s.security_warnings_count}"`
    );
    const blob = new Blob([headers.concat(rows.join('\n'))], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedTest.title.replace(/\s+/g, '_')}_Scoreboard.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusColors = { draft: '#94a3b8', active: '#059669', completed: '#2563eb', closed: '#64748b' };
  const statusBgs = { draft: '#f1f5f9', active: '#d1fae5', completed: '#dbeafe', closed: '#f1f5f9' };

  if (!institute) return <EmptyState icon={FileTextIcon} title="Set up your institute first" />;

  return (
    <div className="animate-fade-in has-detail-drawer" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      
      {/* Main Tests Table Column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="page-header page-header-row">
          <div>
            <h1 className="h1">Tests & Assessments</h1>
            <p className="page-subtitle">Intelligent document parser, secure student exam player, and item quality analytics</p>
          </div>
          <button className="btn bp" onClick={handleOpenCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <PlusIcon size={18} /> Create Test
          </button>
        </div>

        <div className="fxb" style={{ marginBottom: 20 }}>
          <div className="fx" style={{ gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Select Batch:</label>
            <select className="sel" value={batchFilter} onChange={e => setBatchFilter(e.target.value)} style={{ minWidth: 200, padding: '6px 12px' }}>
              <option value="" disabled>Select Batch</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: 20 }}><SkeletonTable rows={8} /></div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={FileTextIcon}
                title="No Assessments Yet"
                description={batchFilter ? "Create a test for this batch by uploading a PDF, DOCX, or pasting question text." : "Select a batch to view tests."}
                actionLabel={batchFilter ? "+ Create Test" : undefined}
                onAction={handleOpenCreate}
              />
            ) : (
              <table className="data-grid">
                <thead>
                  <tr>
                    <th>Test Name & Details</th>
                    <th>Schedule & Limits</th>
                    <th>Submissions & Avg</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(t => {
                    const isSelected = selectedTest?.id === t.id;
                    return (
                      <tr key={t.id} onClick={() => openAnalytics(t)} style={{ cursor: 'pointer', background: isSelected ? 'var(--bg-subtle)' : 'transparent' }}>
                        <td data-label="Test Name & Details">
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</div>
                          <div className="muted" style={{ fontSize: '0.8125rem' }}>{t.subject || 'General'} {t.chapter ? `• ${t.chapter}` : ''}</div>
                          <div className="muted" style={{ fontSize: '0.75rem' }}>{t.duration_min} mins &bull; {t.total_marks} marks &bull; {t.question_count || 0} Questions</div>
                        </td>
                        <td data-label="Schedule & Limits">
                          <div style={{ fontSize: '0.8125rem' }}>Attempts Limit: {t.attempt_limit || 1}</div>
                          <div className="muted" style={{ fontSize: '0.75rem' }}>
                            {t.start_date ? formatDate(t.start_date) : 'Always open'} - {t.end_date ? formatDate(t.end_date) : 'No end date'}
                          </div>
                        </td>
                        <td data-label="Submissions & Avg">
                          <div style={{ fontWeight: 600 }}>{t.submission_count || 0} Submissions</div>
                          <div className="muted" style={{ fontSize: '0.75rem' }}>
                            Avg Score: <strong style={{ color: getScoreColor(t.avg_score_pct) }}>{t.avg_score_pct ? `${t.avg_score_pct}%` : 'N/A'}</strong>
                          </div>
                        </td>
                        <td data-label="Status">
                          <span className="badge" style={{ background: statusBgs[t.status] || '#f1f5f9', color: statusColors[t.status] || '#64748b' }}>
                            {(t.status || 'ACTIVE').toUpperCase()}
                          </span>
                        </td>
                        <td data-label="Actions">
                          <div className="fx" style={{ gap: 8 }}>
                            <button
                              className="btn bp bsm"
                              onClick={(e) => { e.stopPropagation(); openAnalytics(t); }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <TrendingUpIcon size={14} /> Analytics
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Batch Analytics & Question Quality Drawer */}
      {selectedTest && (
        <div className="glass-panel animate-fade-in detail-drawer" style={{ maxHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div className="fxb" style={{ padding: 20, background: 'var(--gradient-brand)', color: '#fff' }}>
            <div>
              <h2 className="h2" style={{ color: '#fff', marginBottom: 4, fontSize: '1.25rem' }}>{selectedTest.title}</h2>
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                {selectedTest.subject} &bull; {selectedTest.duration_min} mins &bull; {selectedTest.total_marks} marks
              </div>
            </div>
            <button className="btn-icon" style={{ color: '#fff' }} onClick={() => setSelectedTest(null)}>✕</button>
          </div>

          {/* Drawer Navigation Tabs */}
          <div className="fx" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)', padding: '8px 16px', gap: 8 }}>
            <button
              className={`tab${activeAnalyticsTab === 'overview' ? ' active' : ''}`}
              style={{ fontSize: 13, padding: '6px 12px' }}
              onClick={() => setActiveAnalyticsTab('overview')}
            >
              Overview
            </button>
            <button
              className={`tab${activeAnalyticsTab === 'quality' ? ' active' : ''}`}
              style={{ fontSize: 13, padding: '6px 12px' }}
              onClick={() => setActiveAnalyticsTab('quality')}
            >
              Question Quality
            </button>
            <button
              className={`tab${activeAnalyticsTab === 'scoreboard' ? ' active' : ''}`}
              style={{ fontSize: 13, padding: '6px 12px' }}
              onClick={() => setActiveAnalyticsTab('scoreboard')}
            >
              Scoreboard
            </button>
          </div>

          {/* Content Area */}
          <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
            {loadingAnalytics ? (
              <div className="fx" style={{ flexDirection: 'column', gap: 16 }}>
                <SkeletonCard height={80} />
                <SkeletonCard height={120} />
              </div>
            ) : !analyticsData || analyticsData.scoreboard.length === 0 ? (
              <EmptyState
                icon={UsersIcon}
                title="No Submissions Yet"
                description="Waiting for students to take this assessment."
              />
            ) : (
              <div>
                {/* TAB 1: OVERVIEW */}
                {activeAnalyticsTab === 'overview' && (
                  <div className="fx" style={{ flexDirection: 'column', gap: 20 }}>
                    {/* Key Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="card sc" style={{ padding: 14 }}>
                        <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Avg Score</div>
                        <div className="sn" style={{ color: getScoreColor(analyticsData.overview.avg_score_pct), fontSize: '1.75rem' }}>
                          {analyticsData.overview.avg_score_pct}%
                        </div>
                      </div>
                      <div className="card sc" style={{ padding: 14 }}>
                        <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Pass Rate</div>
                        <div className="sn" style={{ color: analyticsData.overview.pass_rate >= 50 ? 'var(--color-success)' : 'var(--color-error)', fontSize: '1.75rem' }}>
                          {analyticsData.overview.pass_rate}%
                        </div>
                      </div>
                      <div className="card sc" style={{ padding: 14 }}>
                        <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Participation</div>
                        <div className="sn" style={{ fontSize: '1.75rem' }}>
                          {analyticsData.overview.attempted_count} / {analyticsData.overview.total_enrolled}
                        </div>
                        <div className="muted" style={{ fontSize: 11 }}>{analyticsData.overview.participation_rate}% turnout</div>
                      </div>
                      <div className="card sc" style={{ padding: 14 }}>
                        <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Score Range</div>
                        <div className="sn" style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginTop: 4 }}>
                          {analyticsData.overview.lowest_score}% – {analyticsData.overview.highest_score}%
                        </div>
                      </div>
                    </div>

                    {/* Score Distribution Chart */}
                    <div className="card" style={{ padding: 16 }}>
                      <h4 className="h4" style={{ marginBottom: 12 }}>Score Distribution</h4>
                      <div style={{ height: 160, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData.score_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]}>
                              {analyticsData.score_distribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 3 ? '#10b981' : index === 0 ? '#ef4444' : 'var(--color-primary)'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Quick Top 3 */}
                    <div className="card" style={{ padding: 16 }}>
                      <h4 className="h4" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TrophyIcon size={16} /> Top Performers
                      </h4>
                      <div className="fx" style={{ flexDirection: 'column', gap: 8 }}>
                        {analyticsData.scoreboard.slice(0, 3).map((s, idx) => (
                          <div key={s.submission_id} className="fxb" style={{ padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: 8 }}>
                            <div className="fx" style={{ gap: 10 }}>
                              <span style={{ fontWeight: 800, color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : '#b45309' }}>
                                #{s.rank}
                              </span>
                              <span style={{ fontWeight: 600, fontSize: 13 }}>{s.student_name}</span>
                            </div>
                            <span className="badge" style={{ background: 'var(--bg-surface)', color: getScoreColor(s.percentage), fontWeight: 700 }}>
                              {s.score}/{s.max_marks} ({s.percentage}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: QUESTION QUALITY ANALYTICS */}
                {activeAnalyticsTab === 'quality' && (
                  <div className="fx" style={{ flexDirection: 'column', gap: 16 }}>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Empirical difficulty and error rates derived from actual student performance:
                    </div>

                    {analyticsData.question_quality.map(q => (
                      <div
                        key={q.id}
                        className="card"
                        style={{
                          padding: 14,
                          borderLeft: `4px solid ${q.is_problematic ? 'var(--color-error)' : q.empirical_difficulty === 'Easy' ? 'var(--color-success)' : 'var(--color-primary)'}`
                        }}
                      >
                        <div className="fxb" style={{ marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>Q{q.position}</span>
                          <span
                            className="badge"
                            style={{
                              background: q.empirical_difficulty === 'Easy' ? '#d1fae5' : q.empirical_difficulty === 'Hard' ? '#fee2e2' : '#e0e7ff',
                              color: q.empirical_difficulty === 'Easy' ? '#059669' : q.empirical_difficulty === 'Hard' ? '#dc2626' : '#4f46e5'
                            }}
                          >
                            {q.empirical_difficulty.toUpperCase()}
                          </span>
                        </div>

                        <p style={{ fontSize: 13, marginBottom: 10, color: 'var(--text-primary)' }}>{q.text_preview}</p>

                        {q.is_problematic && (
                          <div style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)', padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
                            ⚠️ {q.alert_message}
                          </div>
                        )}

                        <div className="fxb" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          <span>✓ Correct: <strong style={{ color: 'var(--color-success)' }}>{q.correct_pct}%</strong> ({q.correct_count})</span>
                          <span>✗ Wrong: <strong style={{ color: 'var(--color-error)' }}>{q.wrong_pct}%</strong> ({q.wrong_count})</span>
                          <span>— Skipped: <strong>{q.skipped_pct}%</strong> ({q.skipped_count})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 3: SCOREBOARD */}
                {activeAnalyticsTab === 'scoreboard' && (
                  <div className="fx" style={{ flexDirection: 'column', gap: 16 }}>
                    <div className="fxb">
                      <span className="muted" style={{ fontSize: 12 }}>{analyticsData.scoreboard.length} student submission(s)</span>
                      <button className="btn bs bsm" onClick={handleExportCSV} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <DownloadIcon size={14} /> Export CSV
                      </button>
                    </div>

                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                      <table className="tbl" style={{ fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Student</th>
                            <th>Score</th>
                            <th>%</th>
                            <th>Time</th>
                            <th>Flags</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.scoreboard.map(s => (
                            <tr
                              key={s.submission_id}
                              onClick={() => setSelectedStudentForReport(s.student_id)}
                              style={{ cursor: 'pointer' }}
                              title="Click to view student report card"
                            >
                              <td style={{ fontWeight: 700 }}>#{s.rank}</td>
                              <td style={{ fontWeight: 600 }}>{s.student_name}</td>
                              <td>{s.score}/{s.max_marks}</td>
                              <td style={{ color: getScoreColor(s.percentage), fontWeight: 700 }}>{s.percentage}%</td>
                              <td>{s.time_taken_min}m</td>
                              <td>
                                {s.has_violations ? (
                                  <span className="badge" style={{ background: '#fee2e2', color: '#dc2626' }}>
                                    {s.security_warnings_count} alert(s)
                                  </span>
                                ) : (
                                  <span className="badge" style={{ background: '#d1fae5', color: '#059669' }}>
                                    Clean
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE TEST / REVIEW WORKSPACE MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={createStep === 'input' ? 'Create Assessment' : 'Review Questions Workspace'}
        className="modal-xl"
        footer={
          createStep === 'input' ? (
            <div className="fxb w-full" style={{ gap: 10, flexWrap: 'wrap' }}>
              <button className="btn bs" onClick={() => setShowCreateModal(false)} style={{ flex: '1 1 100px' }}>
                Cancel
              </button>
              <button
                className="btn bp"
                onClick={handleStartExtraction}
                disabled={isExtracting}
                style={{ flex: '2 1 180px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <SparklesIcon size={16} /> {isExtracting ? 'Extracting Questions...' : 'Process Document & Review'}
              </button>
            </div>
          ) : (
            <div className="fxb w-full" style={{ gap: 10, flexWrap: 'wrap' }}>
              <button className="btn bs" onClick={() => setCreateStep('input')} style={{ flex: '1 1 120px' }}>
                ← Back to Upload
              </button>
              <div className="fx fw" style={{ gap: 10, flex: '2 1 200px', justifyContent: 'flex-end' }}>
                {!reviewStats.canPublish && (
                  <span style={{ fontSize: 12, color: 'var(--color-warning)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangleIcon size={14} /> {reviewStats.needsReview} unanswered / invalid
                  </span>
                )}
                <button
                  className="btn bp"
                  onClick={handlePublishTest}
                  disabled={savingTest || !reviewStats.canPublish}
                  style={{ flex: '1 1 140px', justifyContent: 'center' }}
                >
                  {savingTest ? 'Saving Test...' : 'Save & Launch Test'}
                </button>
              </div>
            </div>
          )
        }
      >
        {createStep === 'input' ? (
          /* STEP 1: INPUT SOURCE & BASIC CONFIG */
          <div className="fx" style={{ flexDirection: 'column', gap: 18, width: '100%' }}>
            {/* Primary Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, width: '100%' }}>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Test Title *</label>
                <input className="inp" value={testForm.title} onChange={setF('title')} placeholder="e.g. Physics Weekly Assessment" />
              </div>
              <div className="field">
                <label>Assign Batch *</label>
                <select className="sel w-full" value={testForm.batch_id} onChange={setF('batch_id')}>
                  <option value="" disabled>Select Batch</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Subject</label>
                <input className="inp" value={testForm.subject} onChange={setF('subject')} placeholder="e.g. Mathematics" />
              </div>
            </div>

            {/* Test Numerical Parameters: Fluid 2x2 or 4x1 grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, width: '100%' }}>
              <div className="field">
                <label>Duration (Mins)</label>
                <input className="inp" type="number" min="1" value={testForm.duration_min} onChange={setF('duration_min')} />
              </div>
              <div className="field">
                <label>Marks / Q</label>
                <input className="inp" type="number" min="1" value={testForm.marks_per_question} onChange={setF('marks_per_question')} />
              </div>
              <div className="field">
                <label>Negative Marks / Q</label>
                <input className="inp" type="number" min="0" step="0.25" value={testForm.negative_marks_per_question} onChange={setF('negative_marks_per_question')} />
              </div>
              <div className="field">
                <label>Attempt Limit</label>
                <input className="inp" type="number" min="1" value={testForm.attempt_limit} onChange={setF('attempt_limit')} />
              </div>
            </div>

            {/* Ingestion Source Tabs: Responsive 2x2 or 4x1 Grid */}
            <div style={{ width: '100%' }}>
              <label style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'block' }}>Question Input Method</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 16, width: '100%' }}>
                {[
                  { id: 'pdf', label: 'PDF Document' },
                  { id: 'docx', label: 'Word (.docx)' },
                  { id: 'text', label: 'Paste Text' },
                  { id: 'manual', label: 'Manual Entry' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`btn ${inputType === tab.id ? 'bp' : 'bs'}`}
                    style={{ minWidth: 0, padding: '10px 8px', fontSize: '0.8125rem', textAlign: 'center', justifyContent: 'center', height: 'auto', minHeight: 40 }}
                    onClick={() => setInputType(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {inputType === 'pdf' || inputType === 'docx' ? (
                <div className="card" style={{ borderStyle: 'dashed', textAlign: 'center', padding: '24px 16px', background: 'var(--bg-subtle)', width: '100%', boxSizing: 'border-box' }}>
                  <UploadIcon size={36} color="var(--color-primary)" style={{ marginBottom: 10 }} />
                  <h3 className="h3" style={{ marginBottom: 6, fontSize: '1rem' }}>Upload Test Document</h3>
                  <p className="muted" style={{ fontSize: 12, marginBottom: 16, lineHeight: 1.4 }}>
                    Upload educational material ({inputType.toUpperCase()}). The engine automatically normalizes questions, options, and answer keys.
                  </p>
                  <input
                    type="file"
                    accept={inputType === 'pdf' ? '.pdf' : '.docx,.doc'}
                    ref={fileInputRef}
                    onChange={e => setSelectedFile(e.target.files[0])}
                    style={{ display: 'none' }}
                    id="doc-upload"
                  />
                  <label htmlFor="doc-upload" className="btn bs" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                    Select {inputType.toUpperCase()} File
                  </label>
                  {selectedFile && (
                    <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', wordBreak: 'break-all' }}>
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
              ) : inputType === 'text' ? (
                <div className="field">
                  <textarea
                    className="inp"
                    rows={8}
                    style={{ fontFamily: 'monospace', fontSize: 13, width: '100%' }}
                    placeholder={`1. What is the unit of electric current?\nA. Volt\nB. Ampere\nC. Ohm\nD. Watt\nAns: B\n\nQ2. Which planet is closest to the Sun?\n(A) Venus\n(B) Mercury\n(C) Mars\n(D) Earth\nAnswer: B`}
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                  />
                </div>
              ) : (
                <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                  <p className="muted" style={{ fontSize: 14 }}>
                    Start with a clean interactive card to create and edit questions one by one.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* STEP 2: REVIEW QUESTIONS WORKSPACE */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
            {/* Status Summary Bar */}
            <div className="card" style={{ background: 'var(--bg-subtle)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, width: '100%', boxSizing: 'border-box' }}>
              <div className="fx fw" style={{ gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Total: {reviewStats.total} Questions</span>
                <span className="badge" style={{ background: '#d1fae5', color: '#059669' }}>
                  ✓ {reviewStats.valid} Valid
                </span>
                {reviewStats.needsReview > 0 && (
                  <span className="badge" style={{ background: '#fee2e2', color: '#dc2626' }}>
                    ⚠️ {reviewStats.needsReview} Needs Review
                  </span>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="fx fw" style={{ gap: 6 }}>
                <button
                  type="button"
                  className={`btn bsm ${questionFilter === 'all' ? 'bp' : 'bs'}`}
                  onClick={() => setQuestionFilter('all')}
                >
                  All ({reviewStats.total})
                </button>
                <button
                  type="button"
                  className={`btn bsm ${questionFilter === 'needs_review' ? 'bd' : 'bs'}`}
                  onClick={() => setQuestionFilter('needs_review')}
                >
                  Needs Review ({reviewStats.needsReview})
                </button>
                <button
                  type="button"
                  className={`btn bsm ${questionFilter === 'valid' ? 'bg' : 'bs'}`}
                  onClick={() => setQuestionFilter('valid')}
                >
                  Valid ({reviewStats.valid})
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '55vh', overflowY: 'auto', overflowX: 'hidden', paddingRight: 4, width: '100%', boxSizing: 'border-box' }}>
              {filteredQuestions.map((q, qIndex) => {
                const actualIndex = reviewQuestions.findIndex(item => item.id === q.id);
                return (
                  <div
                    key={q.id}
                    className="card"
                    style={{
                      padding: 16,
                      border: q.is_valid ? '1px solid var(--border-light)' : '2px solid var(--color-warning)',
                      background: q.is_valid ? 'var(--bg-surface)' : 'var(--color-warning-bg)',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    {/* Question Header */}
                    <div className="fxb" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div className="fx" style={{ gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                          Question {actualIndex + 1}
                        </span>
                        <span className="badge" style={{ background: q.is_valid ? '#d1fae5' : '#fee2e2', color: q.is_valid ? '#059669' : '#dc2626' }}>
                          {q.is_valid ? '✓ Valid' : '⚠️ Needs Review'}
                        </span>
                      </div>

                      {/* Card Actions */}
                      <div className="fx" style={{ gap: 6 }}>
                        <button
                          type="button"
                          className="btn-icon"
                          title="Duplicate Question"
                          onClick={() => handleDuplicateQuestion(actualIndex)}
                        >
                          <CopyIcon size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          title="Delete Question"
                          style={{ color: 'var(--color-error)' }}
                          onClick={() => handleDeleteQuestion(actualIndex)}
                        >
                          <TrashIcon size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Validation issues banner if invalid */}
                    {!q.is_valid && q.issues?.length > 0 && (
                      <div style={{ background: '#fef2f2', color: '#dc2626', padding: '6px 12px', borderRadius: 6, fontSize: 12, marginBottom: 12, fontWeight: 500, wordBreak: 'break-word' }}>
                        {q.issues.join(' • ')}
                      </div>
                    )}

                    {/* Question Text */}
                    <div className="field" style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 600 }}>Question Statement</label>
                      <textarea
                        className="inp"
                        rows={2}
                        value={q.text}
                        onChange={e => handleUpdateQuestionText(actualIndex, e.target.value)}
                        placeholder="Type question text..."
                        style={{ fontSize: 13, width: '100%' }}
                      />
                    </div>

                    {/* Options List: Responsive 1-col on mobile, 2-col on wider */}
                    <div className="field" style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 600 }}>Options</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, width: '100%' }}>
                        {(q.options || []).map((opt, oIdx) => {
                          const optLabel = String.fromCharCode(65 + oIdx);
                          const isCorrect = q.correct_index === oIdx;
                          return (
                            <div key={oIdx} className="fx" style={{ gap: 6, alignItems: 'center', width: '100%', minWidth: 0 }}>
                              <span style={{ fontWeight: 700, fontSize: 13, color: isCorrect ? 'var(--color-success)' : 'var(--text-secondary)', width: 18, flexShrink: 0 }}>
                                {optLabel}.
                              </span>
                              <input
                                className="inp"
                                style={{ flex: 1, minWidth: 0, fontSize: 13, border: isCorrect ? '2px solid var(--color-success)' : '1px solid var(--border-light)' }}
                                value={opt}
                                onChange={e => handleUpdateOption(actualIndex, oIdx, e.target.value)}
                                placeholder={`Option ${optLabel}`}
                              />
                              {q.options.length > 2 && (
                                <button
                                  type="button"
                                  className="btn-icon"
                                  style={{ padding: 2, color: 'var(--text-tertiary)', flexShrink: 0 }}
                                  onClick={() => handleRemoveOption(actualIndex, oIdx)}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer: Correct Answer Dropdown & Metadata */}
                    <div className="fxb" style={{ flexWrap: 'wrap', gap: 12, paddingTop: 10, borderTop: '1px solid var(--border-light)' }}>
                      <div className="fx fw" style={{ gap: 8, alignItems: 'center' }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                          Correct Answer:
                        </label>
                        <select
                          className="sel"
                          style={{
                            padding: '4px 10px',
                            fontWeight: 700,
                            borderColor: q.correct_index === null ? 'var(--color-error)' : 'var(--color-success)',
                            color: q.correct_index === null ? 'var(--color-error)' : 'var(--color-success)',
                            minWidth: 120
                          }}
                          value={q.correct_index === null ? '' : q.correct_index}
                          onChange={e => handleSetCorrectAnswer(actualIndex, e.target.value)}
                        >
                          <option value="">Select Answer</option>
                          {(q.options || []).map((_, oIdx) => (
                            <option key={oIdx} value={oIdx}>
                              Option {String.fromCharCode(65 + oIdx)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        className="btn bs bsm"
                        onClick={() => handleAddOption(actualIndex)}
                      >
                        + Add Option
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                className="btn bs w-full"
                onClick={handleAddNewQuestion}
                style={{ justifyContent: 'center', borderStyle: 'dashed', padding: 14 }}
              >
                + Add Another Question Manually
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* INDIVIDUAL STUDENT REPORT CARD MODAL */}
      {selectedStudentForReport && (
        <StudentReportCardModal
          studentId={selectedStudentForReport}
          isOpen={Boolean(selectedStudentForReport)}
          onClose={() => setSelectedStudentForReport(null)}
          onOpenDetailReport={(testId, studentId) => {
            window.open(`/report/${testId}?student_id=${studentId}`, '_blank');
          }}
        />
      )}
    </div>
  );
}
