import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GET, POST, toast } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { ClockIcon, CheckCircleIcon, AlertTriangleIcon } from '../../components/common/Icons';

const MAX_WARNINGS = 2;

export function TestPlayer() {
  const { test_id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  // Anti-cheat & Pagination state
  const [hasStarted, setHasStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [warnings, setWarnings] = useState(0);
  const [showWarningOverlay, setShowWarningOverlay] = useState(false);
  const [submitReason, setSubmitReason] = useState('');

  useEffect(() => {
    if (!user) return;
    const sessionKey = `test_session_${test_id}_${user.id}`;
    
    GET(`/tests/student/${test_id}`)
      .then(res => {
        setData(res);
        const durationSec = res.test.duration_min * 60;
        
        try {
          const cached = localStorage.getItem(sessionKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            const elapsed = Math.floor((Date.now() - parsed.startTime) / 1000);
            if (elapsed < durationSec && !parsed.submitted) {
              setStartTime(parsed.startTime);
              setTimeRemaining(durationSec - elapsed);
              if (parsed.answers) setAnswers(parsed.answers);
              setLoading(false);
              return;
            } else {
              localStorage.removeItem(sessionKey);
            }
          }
        } catch(e) {}
        
        const now = Date.now();
        setStartTime(now);
        setTimeRemaining(durationSec);
        localStorage.setItem(sessionKey, JSON.stringify({
          startTime: now,
          answers: {},
          submitted: false
        }));
      })
      .catch(err => {
        toast(err.message || 'Error loading test');
        navigate('/student/tests');
      })
      .finally(() => setLoading(false));
  }, [test_id, navigate, user]);

  const handleSubmit = async (isForced = false) => {
    if (submitted) return;
    const timeTakenMin = Math.round((Date.now() - startTime) / 60000);
    
    try {
      const res = await POST(`/tests/${test_id}/submit`, { answers, time_taken_min: timeTakenMin });
      setSubmitted(true);
      setResult(res);
      toast(isForced ? 'Test auto-submitted due to rule violation.' : 'Test submitted successfully');
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(()=>{});
      }
      if (user) {
        localStorage.removeItem(`test_session_${test_id}_${user.id}`);
      }
    } catch (err) {
      toast(err.message || 'Error submitting test');
    }
  };

  // Anti-Cheat Listeners
  useEffect(() => {
    if (!hasStarted || submitted || showWarningOverlay) return;

    const handleVisibilityChange = () => {
      if (document.hidden) triggerWarning("You switched tabs or minimized the browser.");
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) triggerWarning("You exited full screen.");
    };

    const handleContextMenu = (e) => e.preventDefault();
    const handleCopyPaste = (e) => e.preventDefault();

    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen' || e.key === 'F12') {
        e.preventDefault();
        triggerWarning(`Keyboard shortcut ${e.key} is not allowed.`);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
        e.preventDefault();
        triggerWarning("Copy/paste shortcuts are not allowed.");
      }
    };

    const triggerWarning = (reason) => {
      setWarnings(prev => {
        const next = prev + 1;
        if (next >= MAX_WARNINGS) {
          setSubmitReason(reason);
          handleSubmit(true);
        } else {
          setShowWarningOverlay(true);
        }
        return next;
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("cut", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("cut", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasStarted, submitted, showWarningOverlay, answers, startTime]);

  // Timer
  useEffect(() => {
    if (loading || submitted || timeRemaining <= 0 || !hasStarted) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setSubmitReason("Time's up!");
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, submitted, timeRemaining, hasStarted, answers, startTime]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasStarted && !submitted && data) {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your exam is still running.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [submitted, data, hasStarted]);

  const handleOptionSelect = (qId, optionIndex) => {
    if (submitted) return;
    setAnswers(prev => {
      const newAns = { ...prev, [qId]: optionIndex };
      if (user) {
        const sessionKey = `test_session_${test_id}_${user.id}`;
        try {
          const cached = JSON.parse(localStorage.getItem(sessionKey) || '{}');
          cached.answers = newAns;
          localStorage.setItem(sessionKey, JSON.stringify(cached));
        } catch(e) {}
      }
      return newAns;
    });
  };

  const startTest = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => {
        toast("Unable to enter fullscreen. Please check browser permissions.");
      });
    }
    setHasStarted(true);
  };

  const resumeFromWarning = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(()=>{});
    }
    setShowWarningOverlay(false);
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div className="skeleton" style={{ height: 40, width: '50%', margin: '0 auto 20px' }}></div>
        <div className="skeleton" style={{ height: 200, width: '100%', marginBottom: 20 }}></div>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="animate-fade-in" style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <CheckCircleIcon size={64} color={submitReason ? "var(--color-error)" : "var(--color-success)"} style={{ marginBottom: 20 }} />
          <h1 className="h1" style={{ marginBottom: 8 }}>{submitReason ? 'Test Terminated' : 'Test Completed!'}</h1>
          <p className="muted" style={{ marginBottom: 32 }}>
            {submitReason ? `Your test was automatically submitted because: ${submitReason}` : 'Your answers have been successfully submitted.'}
          </p>
          
          <div className="g2" style={{ textAlign: 'left', marginBottom: 32 }}>
            <div className="card sc" style={{ background: 'var(--bg-secondary)', border: 'none' }}>
              <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Score</div>
              <div className="sn" style={{ color: 'var(--color-primary)' }}>{result.score} / {result.max_marks}</div>
            </div>
            <div className="card sc" style={{ background: 'var(--bg-secondary)', border: 'none' }}>
              <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Time Taken</div>
              <div className="sn">{result.time_taken_min || Math.round((Date.now() - startTime) / 60000)} mins</div>
            </div>
          </div>
          
          <button className="btn bp" onClick={() => navigate('/student/tests')}>Return to Dashboard</button>
        </div>
      </div>
    );
  }

  // Pre-test gate
  if (!hasStarted) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 20 }}>
        <div className="card" style={{ maxWidth: 600, width: '100%', textAlign: 'center', padding: 40 }}>
          <h1 className="h1" style={{ marginBottom: 16 }}>{data.test.title}</h1>
          <p className="muted" style={{ marginBottom: 24 }}>This is a strict anti-cheat environment. You must stay in full screen and cannot switch tabs, take screenshots, or copy/paste.</p>
          
          <div style={{ background: 'var(--color-error-light)', color: 'var(--color-error)', padding: 16, borderRadius: 8, marginBottom: 32, textAlign: 'left' }}>
            <strong>Rules:</strong>
            <ul style={{ margin: '8px 0 0 20px', fontSize: 14 }}>
              <li>Do not exit full screen mode.</li>
              <li>Do not switch tabs or minimize the browser.</li>
              <li>Do not right-click or use keyboard shortcuts (Ctrl+C, PrintScreen).</li>
              <li>Violations will result in warnings. Reaching {MAX_WARNINGS} warnings will auto-submit the test.</li>
            </ul>
          </div>
          
          <button className="btn bp" style={{ padding: '12px 32px', fontSize: 16 }} onClick={startTest}>Accept Rules & Start Test</button>
        </div>
      </div>
    );
  }

  // Warning Overlay
  if (showWarningOverlay) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="card" style={{ maxWidth: 500, width: '100%', textAlign: 'center', padding: 40, border: '2px solid var(--color-error)' }}>
          <AlertTriangleIcon size={64} color="var(--color-error)" style={{ marginBottom: 20 }} />
          <h2 className="h2" style={{ color: 'var(--color-error)', marginBottom: 16 }}>Rule Violation Detected</h2>
          <p style={{ marginBottom: 24, fontSize: 15, lineHeight: 1.5 }}>
            You have triggered an anti-cheat warning. You have <strong>{MAX_WARNINGS - warnings}</strong> warning(s) remaining before your test is automatically submitted.
          </p>
          <button className="btn" style={{ background: 'var(--color-error)', color: '#fff', border: 'none', padding: '10px 24px' }} onClick={resumeFromWarning}>Return to Fullscreen & Resume</button>
        </div>
      </div>
    );
  }

  const mins = Math.floor(timeRemaining / 60);
  const secs = timeRemaining % 60;
  const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  const currentQ = data.questions[currentIndex];
  
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100vh', userSelect: 'none', WebkitUserSelect: 'none' }}>
      {/* Test Header */}
      <div className="fxb" style={{ padding: '16px 24px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', zIndex: 10 }}>
        <div>
          <h2 className="h2">{data.test.title}</h2>
          <div className="muted" style={{ fontSize: 13 }}>{data.test.subject} &bull; Question {currentIndex + 1} of {data.questions.length}</div>
        </div>
        <div className="fx" style={{ gap: 16 }}>
          <div className="card" style={{ padding: '8px 16px', background: timeRemaining < 300 ? 'var(--color-error-light)' : 'var(--bg-secondary)', color: timeRemaining < 300 ? 'var(--color-error)' : 'inherit', border: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClockIcon size={18} />
            <span style={{ fontSize: 16, fontWeight: 700 }}>{timeStr}</span>
          </div>
          <button className="btn bp" onClick={() => {
            if (window.confirm('Are you sure you want to submit the test?')) handleSubmit();
          }}>Submit Test</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Question Area */}
        <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
          <div className="card" style={{ maxWidth: 800, margin: '0 auto', minHeight: 400, display: 'flex', flexDirection: 'column' }}>
            <div className="fxb" style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Question {currentIndex + 1}</div>
              <div className="badge">{currentQ.marks} Marks</div>
            </div>
            
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 32, lineHeight: 1.6 }}>{currentQ.text}</div>
            
            {currentQ.type === 'mcq' && currentQ.options && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                {currentQ.options.map((opt, oIdx) => {
                  const isSelected = answers[currentQ.id] === oIdx;
                  return (
                    <label 
                      key={oIdx} 
                      style={{ 
                        display: 'flex', alignItems: 'center', padding: '16px', 
                        borderRadius: 8, border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-color)'}`,
                        background: isSelected ? 'var(--color-primary-light)' : 'transparent',
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      <input 
                        type="radio" 
                        name={`q_${currentQ.id}`} 
                        checked={isSelected}
                        onChange={() => handleOptionSelect(currentQ.id, oIdx)}
                        style={{ marginRight: 16, width: 18, height: 18 }}
                      />
                      <span style={{ fontSize: 15, fontWeight: isSelected ? 500 : 400 }}>{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}
            
            {/* Pagination Controls */}
            <div className="fxb" style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border-color)' }}>
              <button 
                className="btn bs" 
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => prev - 1)}
              >
                Previous
              </button>
              
              {currentIndex < data.questions.length - 1 ? (
                <button 
                  className="btn bp" 
                  onClick={() => setCurrentIndex(prev => prev + 1)}
                >
                  Next
                </button>
              ) : (
                <button 
                  className="btn bp" 
                  onClick={() => {
                    if (window.confirm('This is the last question. Submit test?')) handleSubmit();
                  }}
                >
                  Submit Final
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question Palette Sidebar */}
        <div style={{ width: 300, background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)', padding: 24, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <h3 className="h3" style={{ marginBottom: 16 }}>Questions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {data.questions.map((q, i) => {
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent = currentIndex === i;
              
              let bg = 'var(--bg-primary)';
              let color = 'inherit';
              let border = '1px solid var(--border-color)';
              
              if (isCurrent) {
                border = '2px solid var(--color-primary)';
              } else if (isAnswered) {
                bg = 'var(--color-primary)';
                color = '#fff';
                border = 'none';
              }
              
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(i)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 4,
                    background: bg,
                    color,
                    border,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: 0
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          
          <div style={{ marginTop: 'auto', paddingTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
              <div style={{ width: 12, height: 12, background: 'var(--color-primary)', borderRadius: 2 }} /> Answered
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
              <div style={{ width: 12, height: 12, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 2 }} /> Not Answered
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
