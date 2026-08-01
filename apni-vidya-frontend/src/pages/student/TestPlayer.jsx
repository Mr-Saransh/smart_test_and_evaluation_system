import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GET, POST, toast } from '../../utils/api';
import { ClockIcon, CheckCircleIcon } from '../../components/common/Icons';

export function TestPlayer() {
  const { test_id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [answers, setAnswers] = useState({}); // { question_id: index }
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    GET(`/tests/student/${test_id}`)
      .then(res => {
        setData(res);
        setTimeRemaining(res.test.duration_min * 60);
        setStartTime(Date.now());
      })
      .catch(err => {
        toast(err.message || 'Error loading test');
        navigate('/student/tests');
      })
      .finally(() => setLoading(false));
  }, [test_id, navigate]);

  useEffect(() => {
    if (loading || submitted || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, submitted, timeRemaining]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOptionSelect = (qId, optionIndex) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qId]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (submitted) return;
    const timeTakenMin = Math.round((Date.now() - startTime) / 60000);
    
    try {
      const res = await POST(`/tests/${test_id}/submit`, { answers, time_taken_min: timeTakenMin });
      setSubmitted(true);
      setResult(res);
      toast('Test submitted successfully');
    } catch (err) {
      toast(err.message || 'Error submitting test');
    }
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
          <CheckCircleIcon size={64} color="var(--color-success)" style={{ marginBottom: 20 }} />
          <h1 className="h1" style={{ marginBottom: 8 }}>Test Completed!</h1>
          <p className="muted" style={{ marginBottom: 32 }}>Your answers have been submitted.</p>
          
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

  const mins = Math.floor(timeRemaining / 60);
  const secs = timeRemaining % 60;
  const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Test Header */}
      <div className="fxb" style={{ padding: '16px 24px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <h2 className="h2">{data.test.title}</h2>
          <div className="muted" style={{ fontSize: 13 }}>{data.test.subject} {data.test.chapter ? `• ${data.test.chapter}` : ''}</div>
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

      {/* Questions */}
      <div style={{ padding: 24, flex: 1, overflowY: 'auto', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        {data.questions.map((q, i) => (
          <div key={q.id} className="card" style={{ marginBottom: 20 }}>
            <div className="fxb" style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-tertiary)' }}>Question {i + 1}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{q.marks} Marks</div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, lineHeight: 1.5 }}>{q.text}</div>
            
            {q.type === 'mcq' && q.options && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.options.map((opt, oIdx) => {
                  const isSelected = answers[q.id] === oIdx;
                  return (
                    <label 
                      key={oIdx} 
                      style={{ 
                        display: 'flex', alignItems: 'center', padding: '12px 16px', 
                        borderRadius: 8, border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-color)'}`,
                        background: isSelected ? 'var(--color-primary-light)' : 'transparent',
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      <input 
                        type="radio" 
                        name={`q_${q.id}`} 
                        checked={isSelected}
                        onChange={() => handleOptionSelect(q.id, oIdx)}
                        style={{ marginRight: 12 }}
                      />
                      <span style={{ fontSize: 14, fontWeight: isSelected ? 500 : 400 }}>{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
