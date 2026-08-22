import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GET, POST, toast } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  FlagIcon,
  ShieldIcon,
  SparklesIcon,
  TrophyIcon
} from '../../components/common/Icons';
import { Modal } from '../../components/common/Modal';

const MAX_WARNINGS = 3;

export function TestPlayer() {
  const { test_id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Student Test State
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Anti-Cheat & Integrity State
  const [hasStarted, setHasStarted] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [showWarningOverlay, setShowWarningOverlay] = useState(false);
  const [lastWarningReason, setLastWarningReason] = useState('');

  // Submission State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [submitReason, setSubmitReason] = useState('');

  // Load Test Data and Sync Local Attempt
  useEffect(() => {
    if (!user || !test_id) return;
    const sessionKey = `av2_test_session_${test_id}_${user.id}`;

    GET(`/tests/student/${test_id}`)
      .then(res => {
        setData(res);
        const durationSec = (res.test.duration_min || 30) * 60;

        try {
          const cached = localStorage.getItem(sessionKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000);
            if (elapsed < durationSec && !parsed.submitted) {
              setStartTime(parsed.startTime);
              setTimeRemaining(durationSec - elapsed);
              if (parsed.answers) setAnswers(parsed.answers);
              if (parsed.markedForReview) setMarkedForReview(parsed.markedForReview);
              if (parsed.securityEvents) setSecurityEvents(parsed.securityEvents);
              setLoading(false);
              return;
            } else {
              localStorage.removeItem(sessionKey);
            }
          }
        } catch (e) {}

        const now = Date.now();
        setStartTime(now);
        setTimeRemaining(durationSec);
        localStorage.setItem(sessionKey, JSON.stringify({
          startTime: now,
          answers: {},
          markedForReview: {},
          securityEvents: [],
          submitted: false
        }));
      })
      .catch(err => {
        toast(err.message || 'Error loading test');
        navigate('/student/tests');
      })
      .finally(() => setLoading(false));
  }, [test_id, navigate, user]);

  // Record Security Event Helper
  const logSecurityViolation = useCallback((type, detail) => {
    const event = {
      type,
      detail,
      timestamp: new Date().toISOString()
    };
    setSecurityEvents(prev => {
      const updated = [...prev, event];
      if (user) {
        const sessionKey = `av2_test_session_${test_id}_${user.id}`;
        try {
          const cached = JSON.parse(localStorage.getItem(sessionKey) || '{}');
          cached.securityEvents = updated;
          localStorage.setItem(sessionKey, JSON.stringify(cached));
        } catch (e) {}
      }
      return updated;
    });
  }, [test_id, user]);

  // Final Submit Handler
  const handleSubmit = async (isAuto = false, customReason = '') => {
    if (submitted || submitting) return;
    setSubmitting(true);
    const timeTakenMin = Math.max(1, Math.round((Date.now() - startTime) / 60000));

    try {
      const res = await POST(`/tests/${test_id}/submit`, {
        answers,
        time_taken_min: timeTakenMin,
        security_events: securityEvents,
        auto_submitted: Boolean(isAuto)
      });

      setSubmitted(true);
      setResult(res);
      if (customReason) setSubmitReason(customReason);

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      if (user) {
        localStorage.removeItem(`av2_test_session_${test_id}_${user.id}`);
      }
      toast(isAuto ? 'Assessment auto-submitted.' : 'Assessment submitted successfully!', 'success');
    } catch (err) {
      toast(err.message || 'Error submitting assessment');
    } finally {
      setSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  // Anti-Cheat Event Listeners
  useEffect(() => {
    if (!hasStarted || submitted || showWarningOverlay) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerWarning('Tab switch or browser minimization detected.');
        logSecurityViolation('tab_switch', 'Tab switch or window minimized');
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && hasStarted && !submitted) {
        triggerWarning('Fullscreen mode was exited.');
        logSecurityViolation('fullscreen_exit', 'Student exited fullscreen mode');
      }
    };

    const handleWindowBlur = () => {
      logSecurityViolation('window_blur', 'Window lost focus');
    };

    const handleContextMenu = (e) => e.preventDefault();
    const handleCopyPaste = (e) => {
      e.preventDefault();
      logSecurityViolation('copy_paste_attempt', 'Attempted copy/paste/cut');
    };

    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen' || e.key === 'F12') {
        e.preventDefault();
        logSecurityViolation('shortcut_attempt', `Shortcut ${e.key} triggered`);
        triggerWarning(`Restricted keyboard shortcut (${e.key}) is disabled.`);
      }
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a', 'p', 's'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        logSecurityViolation('clipboard_shortcut', `Ctrl+${e.key.toUpperCase()} pressed`);
      }
    };

    const triggerWarning = (reason) => {
      setWarnings(prev => {
        const next = prev + 1;
        setLastWarningReason(reason);
        if (next >= MAX_WARNINGS) {
          handleSubmit(true, `Test auto-submitted due to rule violations (${reason})`);
        } else {
          setShowWarningOverlay(true);
        }
        return next;
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasStarted, submitted, showWarningOverlay, answers, startTime, logSecurityViolation]);

  // Server-Aware Countdown Timer
  useEffect(() => {
    if (loading || submitted || timeRemaining <= 0 || !hasStarted) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true, "Time expired! Assessment auto-submitted.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, submitted, timeRemaining, hasStarted]);

  // Protect Unload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasStarted && !submitted && data) {
        e.preventDefault();
        e.returnValue = 'Assessment is in progress. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [submitted, data, hasStarted]);

  // Option Selection & Auto-Save
  const handleOptionSelect = (qId, optionIndex) => {
    if (submitted) return;
    setAnswers(prev => {
      const newAns = { ...prev, [qId]: optionIndex };
      if (user) {
        const sessionKey = `av2_test_session_${test_id}_${user.id}`;
        try {
          const cached = JSON.parse(localStorage.getItem(sessionKey) || '{}');
          cached.answers = newAns;
          localStorage.setItem(sessionKey, JSON.stringify(cached));
        } catch (e) {}
      }
      return newAns;
    });
  };

  // Clear Answer
  const handleClearAnswer = (qId) => {
    if (submitted) return;
    setAnswers(prev => {
      const copy = { ...prev };
      delete copy[qId];
      if (user) {
        const sessionKey = `av2_test_session_${test_id}_${user.id}`;
        try {
          const cached = JSON.parse(localStorage.getItem(sessionKey) || '{}');
          cached.answers = copy;
          localStorage.setItem(sessionKey, JSON.stringify(cached));
        } catch (e) {}
      }
      return copy;
    });
  };

  // Toggle Mark for Review
  const handleToggleMarkForReview = (qId) => {
    setMarkedForReview(prev => {
      const updated = { ...prev, [qId]: !prev[qId] };
      if (user) {
        const sessionKey = `av2_test_session_${test_id}_${user.id}`;
        try {
          const cached = JSON.parse(localStorage.getItem(sessionKey) || '{}');
          cached.markedForReview = updated;
          localStorage.setItem(sessionKey, JSON.stringify(cached));
        } catch (e) {}
      }
      return updated;
    });
  };

  // Pre-Exam Start Action (Enter Fullscreen)
  const startTest = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {
        toast('Please enable fullscreen in your browser settings to proceed.');
      });
    }
    setHasStarted(true);
  };

  const resumeFromWarning = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    }
    setShowWarningOverlay(false);
  };

  // Progress calculations
  const totalQuestions = data?.questions?.length || 0;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = totalQuestions - answeredCount;
  const reviewCount = Object.values(markedForReview).filter(Boolean).length;

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 32, width: '60%', margin: '0 auto 20px' }}></div>
        <div className="skeleton" style={{ height: 240, width: '100%', borderRadius: 16 }}></div>
      </div>
    );
  }

  // Post-Submission Screen
  if (submitted && result) {
    return (
      <div className="animate-fade-in" style={{ padding: 40, maxWidth: 680, margin: '40px auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: submitReason ? 'var(--color-error-bg)' : 'var(--color-success-bg)', color: submitReason ? 'var(--color-error)' : 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
            <CheckCircleIcon size={44} />
          </div>
          <h1 className="h1" style={{ marginBottom: 8 }}>{submitReason ? 'Assessment Submitted' : 'Assessment Completed!'}</h1>
          <p className="muted" style={{ marginBottom: 28, fontSize: 14 }}>
            {submitReason || 'Your responses have been recorded and auto-evaluated.'}
          </p>

          {/* Quick Score Card */}
          <div className="g3" style={{ marginBottom: 32 }}>
            <div className="card sc" style={{ background: 'var(--bg-subtle)' }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Score</div>
              <div className="sn" style={{ color: 'var(--color-primary)', fontSize: '2rem' }}>
                {result.score} / {result.max_marks}
              </div>
            </div>
            <div className="card sc" style={{ background: 'var(--bg-subtle)' }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Accuracy</div>
              <div className="sn" style={{ color: getScoreColor(result.stats?.accuracy || 0), fontSize: '2rem' }}>
                {result.stats?.accuracy || 0}%
              </div>
            </div>
            <div className="card sc" style={{ background: 'var(--bg-subtle)' }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Time Taken</div>
              <div className="sn" style={{ fontSize: '2rem' }}>
                {result.time_taken_min || 1}m
              </div>
            </div>
          </div>

          <div className="fx" style={{ gap: 12, justifyContent: 'center' }}>
            <button className="btn bp" onClick={() => navigate(`/report/${test_id}`)}>
              View Detailed Evaluation Report →
            </button>
            <button className="btn bs" onClick={() => navigate('/student/tests')}>
              Return to Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pre-Exam Instruction Gate
  if (!hasStarted) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, background: 'var(--bg-primary)' }}>
        <div className="card" style={{ maxWidth: 640, width: '100%', padding: 40, border: '1px solid var(--border-light)' }}>
          <div className="fxb" style={{ marginBottom: 16 }}>
            <span className="badge" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', fontWeight: 700 }}>
              {data.test.subject || 'General Assessment'}
            </span>
            <span className="muted" style={{ fontSize: 13 }}>Duration: <strong>{data.test.duration_min} Mins</strong></span>
          </div>

          <h1 className="h1" style={{ marginBottom: 8 }}>{data.test.title}</h1>
          <p className="muted" style={{ marginBottom: 24, fontSize: 14 }}>
            Please read the instructions carefully before entering the examination environment.
          </p>

          {/* Exam Specs Box */}
          <div className="g3" style={{ marginBottom: 24 }}>
            <div className="card" style={{ padding: 12, background: 'var(--bg-subtle)', textAlign: 'center' }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 700 }}>QUESTIONS</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{data.questions.length}</div>
            </div>
            <div className="card" style={{ padding: 12, background: 'var(--bg-subtle)', textAlign: 'center' }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 700 }}>TOTAL MARKS</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{data.test.total_marks}</div>
            </div>
            <div className="card" style={{ padding: 12, background: 'var(--bg-subtle)', textAlign: 'center' }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 700 }}>ATTEMPT LIMIT</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{data.test.attempt_limit || 1}</div>
            </div>
          </div>

          {/* Rules & Anti-Cheat Summary */}
          <div style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning)', padding: 16, borderRadius: 10, marginBottom: 28 }}>
            <div style={{ fontWeight: 700, color: 'var(--color-warning)', fontSize: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldIcon size={18} /> Examination Integrity & Rules
            </div>
            <ul style={{ margin: '0 0 0 20px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <li>The test will launch in <strong>Fullscreen Mode</strong>. Exiting fullscreen triggers a violation alert.</li>
              <li>Switching tabs, minimizing the browser, or losing window focus is monitored.</li>
              <li>Text copy/paste and right-click context menus are disabled.</li>
              <li>Accumulating <strong>{MAX_WARNINGS} warnings</strong> will result in automatic submission.</li>
              <li>The server timer auto-submits your test when time runs out.</li>
            </ul>
          </div>

          <button className="btn bp w-full" style={{ padding: '14px 24px', fontSize: 16, justifyContent: 'center' }} onClick={startTest}>
            Accept Rules & Begin Examination
          </button>
        </div>
      </div>
    );
  }

  // Violation Warning Overlay Modal
  if (showWarningOverlay) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.95)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card" style={{ maxWidth: 480, width: '100%', textAlign: 'center', padding: 36, border: '2px solid var(--color-error)' }}>
          <AlertTriangleIcon size={56} color="var(--color-error)" style={{ marginBottom: 16 }} />
          <h2 className="h2" style={{ color: 'var(--color-error)', marginBottom: 12 }}>Rule Violation Detected</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
            {lastWarningReason}
          </p>
          <div style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, marginBottom: 24 }}>
            Warning {warnings} of {MAX_WARNINGS}. You have {MAX_WARNINGS - warnings} warning(s) remaining before auto-submission.
          </div>
          <button className="btn bp w-full" style={{ background: 'var(--color-error)', borderColor: 'var(--color-error)', justifyContent: 'center' }} onClick={resumeFromWarning}>
            Return to Fullscreen & Resume
          </button>
        </div>
      </div>
    );
  }

  // Timer format
  const mins = Math.floor(timeRemaining / 60);
  const secs = timeRemaining % 60;
  const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  const isTimeLow = timeRemaining < 300; // < 5 mins

  const currentQ = data.questions[currentIndex] || {};
  const isAnswered = answers[currentQ.id] !== undefined;
  const isMarked = Boolean(markedForReview[currentQ.id]);

  return (
    <div className="animate-fade-in exam-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', userSelect: 'none', WebkitUserSelect: 'none', background: 'var(--bg-primary)' }}>
      
      {/* Top Examination Header */}
      <div className="fxb" style={{ padding: '12px 24px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)', zIndex: 10 }}>
        <div>
          <h2 className="h3" style={{ marginBottom: 2 }}>{data.test.title}</h2>
          <div className="muted" style={{ fontSize: 12 }}>
            {data.test.subject} &bull; Question {currentIndex + 1} of {totalQuestions}
          </div>
        </div>

        <div className="fx" style={{ gap: 16, alignItems: 'center' }}>
          {/* Live Timer */}
          <div
            className="card"
            style={{
              padding: '6px 14px',
              background: isTimeLow ? 'var(--color-error-bg)' : 'var(--bg-subtle)',
              color: isTimeLow ? 'var(--color-error)' : 'var(--text-primary)',
              border: isTimeLow ? '1px solid var(--color-error)' : '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 8
            }}
          >
            <ClockIcon size={16} />
            <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'monospace' }}>{timeStr}</span>
          </div>

          <button className="btn bp" onClick={() => setShowConfirmModal(true)}>
            Submit Test
          </button>
        </div>
      </div>

      {/* Main Examination Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Question Area */}
        <div style={{ flex: 1, padding: 32, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div className="card" style={{ maxWidth: 840, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column', padding: 28 }}>
            
            {/* Question Top Info Bar */}
            <div className="fxb" style={{ marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border-light)' }}>
              <div className="fx" style={{ gap: 10, alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>
                  Question {currentIndex + 1}
                </span>
                {isMarked && (
                  <span className="badge" style={{ background: '#f3e8ff', color: '#9333ea', fontWeight: 700 }}>
                    ⚑ Marked for Review
                  </span>
                )}
              </div>
              <div className="badge" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                +{currentQ.marks || 1} Marks {currentQ.negative_marks > 0 ? `| -${currentQ.negative_marks}` : ''}
              </div>
            </div>

            {/* Question Statement */}
            <div style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.6, marginBottom: 28, color: 'var(--text-primary)' }}>
              {currentQ.text}
            </div>

            {/* Options List */}
            {currentQ.options && Array.isArray(currentQ.options) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                {currentQ.options.map((opt, oIdx) => {
                  const isSelected = answers[currentQ.id] === oIdx;
                  const optLabel = String.fromCharCode(65 + oIdx);
                  return (
                    <label
                      key={oIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '14px 18px',
                        borderRadius: 10,
                        border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-light)',
                        background: isSelected ? 'var(--color-primary-bg)' : 'var(--bg-surface)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="radio"
                        name={`q_${currentQ.id}`}
                        checked={isSelected}
                        onChange={() => handleOptionSelect(currentQ.id, oIdx)}
                        style={{ marginRight: 14, width: 18, height: 18 }}
                      />
                      <span style={{ fontWeight: 700, marginRight: 10, color: isSelected ? 'var(--color-primary)' : 'var(--text-secondary)' }}>
                        {optLabel}.
                      </span>
                      <span style={{ fontSize: 15, fontWeight: isSelected ? 600 : 400, color: 'var(--text-primary)' }}>
                        {opt}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="fxb" style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border-light)', flexWrap: 'wrap', gap: 12 }}>
              <div className="fx" style={{ gap: 10 }}>
                <button
                  type="button"
                  className={`btn ${isMarked ? 'bp' : 'bs'} bsm`}
                  onClick={() => handleToggleMarkForReview(currentQ.id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <FlagIcon size={14} /> {isMarked ? 'Unmark Review' : 'Mark for Review'}
                </button>
                {isAnswered && (
                  <button
                    type="button"
                    className="btn bd bsm"
                    onClick={() => handleClearAnswer(currentQ.id)}
                  >
                    Clear Response
                  </button>
                )}
              </div>

              <div className="fx" style={{ gap: 10 }}>
                <button
                  type="button"
                  className="btn bs"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => prev - 1)}
                >
                  ← Previous
                </button>
                {currentIndex < totalQuestions - 1 ? (
                  <button
                    type="button"
                    className="btn bp"
                    onClick={() => setCurrentIndex(prev => prev + 1)}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn bp"
                    onClick={() => setShowConfirmModal(true)}
                  >
                    Review & Submit
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Question Palette Sidebar */}
        <div style={{ width: 280, background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-light)', padding: 20, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <h3 className="h4" style={{ marginBottom: 14 }}>Question Palette</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 24 }}>
            {data.questions.map((q, i) => {
              const answered = answers[q.id] !== undefined;
              const reviewed = Boolean(markedForReview[q.id]);
              const isCurrent = currentIndex === i;

              let bg = 'var(--bg-subtle)';
              let color = 'var(--text-primary)';
              let border = '1px solid var(--border-light)';

              if (answered && reviewed) {
                bg = '#10b981';
                color = '#fff';
                border = '2px solid #9333ea';
              } else if (reviewed) {
                bg = '#f3e8ff';
                color = '#9333ea';
                border = '1px solid #c084fc';
              } else if (answered) {
                bg = 'var(--color-success)';
                color = '#fff';
                border = 'none';
              }

              if (isCurrent) {
                border = '2px solid var(--color-primary)';
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 6,
                    background: bg,
                    color,
                    border,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  {i + 1}
                  {reviewed && (
                    <span style={{ position: 'absolute', top: 1, right: 2, fontSize: 8 }}>⚑</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Palette Legend */}
          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            <div className="fx" style={{ gap: 8, alignItems: 'center' }}>
              <div style={{ width: 14, height: 14, background: 'var(--color-success)', borderRadius: 3 }} />
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="fx" style={{ gap: 8, alignItems: 'center' }}>
              <div style={{ width: 14, height: 14, background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: 3 }} />
              <span>Unanswered ({unansweredCount})</span>
            </div>
            <div className="fx" style={{ gap: 8, alignItems: 'center' }}>
              <div style={{ width: 14, height: 14, background: '#f3e8ff', border: '1px solid #c084fc', borderRadius: 3 }} />
              <span>Marked for Review ({reviewCount})</span>
            </div>
          </div>
        </div>

      </div>

      {/* Pre-Submission Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Assessment Submission"
        footer={
          <div className="fxb w-full">
            <button className="btn bs" onClick={() => setShowConfirmModal(false)}>Back to Exam</button>
            <button className="btn bp" onClick={() => handleSubmit(false)} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Yes, Submit Test'}
            </button>
          </div>
        }
      >
        <p className="muted" style={{ marginBottom: 20 }}>
          Are you sure you want to submit? Once submitted, you cannot modify your answers.
        </p>

        <div className="g3" style={{ marginBottom: 16 }}>
          <div className="card" style={{ padding: 12, textAlign: 'center', background: '#d1fae5', color: '#059669' }}>
            <div style={{ fontSize: 11, fontWeight: 700 }}>ANSWERED</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{answeredCount}</div>
          </div>
          <div className="card" style={{ padding: 12, textAlign: 'center', background: '#fee2e2', color: '#dc2626' }}>
            <div style={{ fontSize: 11, fontWeight: 700 }}>UNANSWERED</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{unansweredCount}</div>
          </div>
          <div className="card" style={{ padding: 12, textAlign: 'center', background: '#f3e8ff', color: '#9333ea' }}>
            <div style={{ fontSize: 11, fontWeight: 700 }}>MARKED REVIEW</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{reviewCount}</div>
          </div>
        </div>
      </Modal>

    </div>
  );
}
