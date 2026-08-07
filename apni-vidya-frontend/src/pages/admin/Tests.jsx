import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, toast } from '../../utils/api';
import { FileTextIcon, TrendingUpIcon, UsersIcon, CheckCircleIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonTable, SkeletonCard } from '../../components/common/Skeleton';
import { getScoreColor } from '../../utils/helpers';

export function Tests() {
  const { institute } = useAuth();
  const [batches, setBatches] = useState([]);
  const [batchFilter, setBatchFilter] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ 
    title: '', subject: '', batch_id: '', duration_min: 30, 
    chapter: '', difficulty: 'medium', start_date: '', end_date: '', attempt_limit: 1, total_marks: 100
  });
  const [saving, setSaving] = useState(false);
  
  // Importer state
  const [inputType, setInputType] = useState('pdf');
  const [rawText, setRawText] = useState('');
  const fileInputRef = useRef(null);

  // Detail Drawer state
  const [selectedTest, setSelectedTest] = useState(null);
  const [details, setDetails] = useState({ results: [], analysis: [] });
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!institute) return;
    GET(`/batches/${institute.id}`).then(b => {
      setBatches(b);
      if (b.length > 0) setBatchFilter(b[0].id);
    }).catch(() => setLoading(false));
  }, [institute]);

  useEffect(() => {
    if (!batchFilter) { setItems([]); setLoading(false); return; }
    setLoading(true);
    GET(`/tests/batch/${batchFilter}`).then(t => {
      setItems(t);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [batchFilter]);

  const setF = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const createTest = async () => {
    if (!form.title || !form.batch_id) {
      toast('Title and batch are required'); return;
    }
    
    setSaving(true);
    let parsedQuestions = [];

    try {
      if (inputType === 'pdf') {
        const file = fileInputRef.current?.files[0];
        if (!file) {
          toast('Please select a PDF file');
          setSaving(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${import.meta.env.VITE_API_URL}/questions/upload-pdf`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('av2_token')}` },
          body: formData
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'PDF Upload failed');
        parsedQuestions = data.questions;
      } else {
        if (!rawText.trim()) {
          toast('Please paste text to extract questions');
          setSaving(false);
          return;
        }
        const data = await POST('/questions/extract-text', { text: rawText });
        parsedQuestions = data.questions;
      }

      if (parsedQuestions.length === 0) {
        toast('No questions could be extracted. Please check the format.');
        setSaving(false);
        return;
      }

      const payload = { 
        ...form, 
        institute_id: institute.id, 
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        raw_questions: parsedQuestions
      };

      await POST('/tests', payload, `Test created with ${parsedQuestions.length} questions`);
      setShowCreate(false); 
      GET(`/tests/batch/${batchFilter}`).then(setItems);
    } catch (err) {
      toast(err.message || 'Failed to create test');
    }
    setSaving(false);
  };

  const updateStatus = async (id, status, msg, e) => {
    if (e) e.stopPropagation();
    try { 
      await POST(`/tests/${id}/status`, { status }, msg); 
      GET(`/tests/batch/${batchFilter}`).then(setItems);
      if (selectedTest?.id === id) setSelectedTest(prev => ({ ...prev, status }));
    } catch {}
  };

  const openDetails = async (t) => {
    setSelectedTest(t);
    setLoadingDetails(true);
    try {
      const [res, ana] = await Promise.all([
        GET(`/tests/${t.id}/results`),
        GET(`/tests/${t.id}/analysis`)
      ]);
      setDetails({ results: res, analysis: ana.breakdown || [] });
    } catch {
      toast('Failed to load test insights');
      setSelectedTest(null);
    }
    setLoadingDetails(false);
  };

  // Derive stats
  const stats = useMemo(() => {
    const res = details.results;
    if (!res || res.length === 0) return { avg: 0, high: 0, low: 0, passPct: 0 };
    
    let sum = 0, high = 0, low = 100, passCount = 0;
    res.forEach(r => {
      const pct = Number(r.percentage);
      sum += pct;
      if (pct > high) high = pct;
      if (pct < low) low = pct;
      if (pct >= 40) passCount++; // Assuming 40% is pass
    });
    
    return {
      avg: Math.round(sum / res.length),
      high: Math.round(high),
      low: Math.round(low),
      passPct: Math.round((passCount / res.length) * 100)
    };
  }, [details.results]);

  if (!institute) return <EmptyState icon={FileTextIcon} title="Set up your institute first" />;

  const statusColors = { draft: '#94a3b8', active: '#059669', completed: '#2563eb' };
  const statusBgs = { draft: '#f1f5f9', active: '#d1fae5', completed: '#dbeafe' };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      
      {/* Main Column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="page-header page-header-row">
          <div><h1 className="h1">Tests & Assessments</h1><p className="page-subtitle">Create and manage online tests and analyze performance</p></div>
          <button className="btn bp" onClick={() => { 
            setForm({ title: '', subject: '', batch_id: batchFilter, duration_min: 30, chapter: '', difficulty: 'medium', start_date: '', end_date: '', attempt_limit: 1, total_marks: 100 }); 
            setRawText(''); setInputType('pdf'); if (fileInputRef.current) fileInputRef.current.value = null;
            setShowCreate(true); 
          }}>+ Create Test</button>
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
              <EmptyState icon={FileTextIcon} title="No Tests Yet" description={batchFilter ? "Create a test for this batch using PDF upload or pasting text." : "Select a batch to view tests."} actionLabel={batchFilter ? "+ Create Test" : undefined} onAction={() => setShowCreate(true)} />
            ) : (
              <table className="data-grid">
                <thead>
                  <tr>
                    <th>Test Name & Details</th>
                    <th>Schedule & Limits</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(t => {
                    const isSelected = selectedTest?.id === t.id;
                    return (
                      <tr key={t.id} onClick={() => openDetails(t)} style={{ cursor: 'pointer', background: isSelected ? 'var(--bg-subtle)' : 'transparent' }}>
                        <td data-label="Test Name & Details">
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</div>
                          <div className="muted" style={{ fontSize: '0.8125rem' }}>{t.subject || 'General'} {t.chapter ? `• ${t.chapter}` : ''}</div>
                          <div className="muted" style={{ fontSize: '0.75rem' }}>{t.duration_min} mins • {t.total_marks} marks • {t.question_count || 0} Qs</div>
                        </td>
                        <td data-label="Schedule & Limits">
                          <div style={{ fontSize: '0.8125rem' }}>Attempts: {t.attempt_limit}</div>
                          <div className="muted" style={{ fontSize: '0.75rem' }}>
                            {t.start_date ? new Date(t.start_date).toLocaleDateString() : 'No start date'} - {t.end_date ? new Date(t.end_date).toLocaleDateString() : 'No end date'}
                          </div>
                        </td>
                        <td data-label="Status">
                          <span className="badge" style={{ background: statusBgs[t.status], color: statusColors[t.status] }}>
                            {t.status.toUpperCase()}
                          </span>
                        </td>
                        <td data-label="Actions">
                          <div className="fx" style={{ gap: 8 }}>
                            {t.status === 'draft' && <button className="btn bg bsm" onClick={(e) => updateStatus(t.id, 'active', 'Test started', e)}>Start</button>}
                            {t.status === 'active' && <button className="btn bp bsm" onClick={(e) => updateStatus(t.id, 'completed', 'Test ended', e)}>End</button>}
                            {t.status === 'completed' && <button className="btn bd bsm" onClick={(e) => { e.stopPropagation(); openDetails(t); }}>Results</button>}
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

      {/* Details Drawer */}
      {selectedTest && (
        <div className="glass-panel animate-fade-in" style={{ width: 450, flexShrink: 0, position: 'sticky', top: 24, padding: 0, overflow: 'hidden', borderRadius: 'var(--radius-xl)' }}>
          <div className="fxb" style={{ padding: '24px', background: 'var(--gradient-brand)', color: 'white' }}>
            <div>
              <h2 className="h2" style={{ marginBottom: 4, color: 'white' }}>{selectedTest.title}</h2>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}>{selectedTest.status.toUpperCase()}</span>
            </div>
            <button className="btn-icon" style={{ color: 'white' }} onClick={() => setSelectedTest(null)}>✕</button>
          </div>

          <div style={{ padding: 24 }}>
            {loadingDetails ? (
              <div className="fx" style={{ flexDirection: 'column', gap: 16 }}><SkeletonCard height={80}/><SkeletonCard height={80}/></div>
            ) : selectedTest.status === 'draft' ? (
              <EmptyState icon={FileTextIcon} title="Test not started" description="Start this test to collect submissions and view analytics." />
            ) : details.results.length === 0 ? (
              <EmptyState icon={UsersIcon} title="No Submissions Yet" description="Waiting for students to complete the test." />
            ) : (
              <div className="fx" style={{ flexDirection: 'column', gap: 24 }}>
                
                {/* Insights Overview */}
                <div>
                  <h3 className="h4" style={{ marginBottom: 12 }}>Overall Performance</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="card hover-lift" style={{ padding: 16, border: 'none', background: 'var(--bg-surface)' }}>
                      <div className="muted" style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>Avg Score</div>
                      <div className="sn" style={{ color: getScoreColor(stats.avg), fontSize: '2rem' }}>{stats.avg}%</div>
                    </div>
                    <div className="card hover-lift" style={{ padding: 16, border: 'none', background: 'var(--bg-surface)' }}>
                      <div className="muted" style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>Pass Rate</div>
                      <div className="sn" style={{ color: stats.passPct >= 50 ? 'var(--color-success)' : 'var(--color-error)', fontSize: '2rem' }}>{stats.passPct}%</div>
                    </div>
                    <div className="card hover-lift" style={{ padding: 16, border: 'none', background: 'var(--bg-surface)' }}>
                      <div className="muted" style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>Highest</div>
                      <div className="sn" style={{ color: 'var(--color-primary)', fontSize: '2rem' }}>{stats.high}%</div>
                    </div>
                    <div className="card hover-lift" style={{ padding: 16, border: 'none', background: 'var(--bg-surface)' }}>
                      <div className="muted" style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>Submissions</div>
                      <div className="sn" style={{ fontSize: '2rem' }}>{details.results.length}</div>
                    </div>
                  </div>
                </div>

                {/* SWOT Analysis (Topics) */}
                {details.analysis.length > 0 && (
                  <div>
                    <h3 className="h4" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUpIcon size={16}/> Concept Mastery</h3>
                    <div className="fx" style={{ flexDirection: 'column', gap: 8 }}>
                      {details.analysis.map((t, i) => (
                        <div key={i} className="fxb" style={{ padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{t.topic}</span>
                          <div className="fx" style={{ gap: 16 }}>
                            <div style={{ width: 80, height: 8, background: 'var(--bg-subtle)', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: getScoreColor(t.accuracy), width: `${t.accuracy}%`, borderRadius: 4 }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: getScoreColor(t.accuracy), width: 40, textAlign: 'right' }}>{t.accuracy}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Performers */}
                <div>
                  <h3 className="h4" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircleIcon size={16}/> Top Performers</h3>
                  <div className="fx" style={{ flexDirection: 'column', gap: 12 }}>
                    {details.results.slice(0, 5).map((r, i) => (
                      <div key={r.id} className="fxb card hover-lift" style={{ padding: '12px 16px', background: i === 0 ? 'var(--color-primary-bg)' : 'var(--bg-surface)', border: i === 0 ? '2px solid var(--color-primary-light)' : '1px solid var(--border-light)' }}>
                        <div className="fx" style={{ gap: 16 }}>
                          <span style={{ fontWeight: 800, fontSize: '1.25rem', color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'var(--text-tertiary)' }}>#{r.rank}</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{r.student_name}</span>
                        </div>
                        <span className="badge" style={{ background: 'var(--bg-app)', color: getScoreColor(r.percentage), fontSize: '0.875rem' }}>{r.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button className="btn bd w-full" style={{ justifyContent: 'center' }} onClick={() => toast('Exporting complete scoreboard...')}>
                  Download Full Scoreboard (CSV)
                </button>

              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content modal-xl" onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', height: '90vh' }}>
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <h2>Create New Test</h2>
              <button className="btn-icon" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
              <div className="fx fw" style={{ gap: 16, marginBottom: 16 }}>
                <div className="field" style={{ flex: 2, minWidth: 200 }}><label>Test Title *</label><input className="inp" value={form.title} onChange={setF('title')} placeholder="e.g. Physics Mock Test 1" /></div>
                <div className="field" style={{ flex: 1, minWidth: 150 }}><label>Assign Batch *</label>
                  <select className="sel w-full" value={form.batch_id} onChange={setF('batch_id')}>
                    <option value="" disabled>Select Batch</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="field" style={{ flex: 1, minWidth: 150 }}><label>Duration (mins)</label><input className="inp" type="number" value={form.duration_min} onChange={setF('duration_min')} /></div>
              </div>

              <div className="fx fw" style={{ gap: 16, marginBottom: 16 }}>
                <div className="field" style={{ flex: 1 }}><label>Subject</label><input className="inp" value={form.subject} onChange={setF('subject')} placeholder="e.g. Physics" /></div>
                <div className="field" style={{ flex: 1 }}><label>Chapter</label><input className="inp" value={form.chapter} onChange={setF('chapter')} placeholder="e.g. Mechanics" /></div>
                <div className="field" style={{ flex: 1 }}><label>Difficulty</label>
                  <select className="sel w-full" value={form.difficulty} onChange={setF('difficulty')}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="field" style={{ flex: 1 }}><label>Total Marks</label><input className="inp" type="number" value={form.total_marks} onChange={setF('total_marks')} /></div>
              </div>

              <div className="fx fw" style={{ gap: 16, marginBottom: 24 }}>
                <div className="field" style={{ flex: 1 }}><label>Start Date & Time (Optional)</label><input className="inp" type="datetime-local" value={form.start_date} onChange={setF('start_date')} /></div>
                <div className="field" style={{ flex: 1 }}><label>End Date & Time (Optional)</label><input className="inp" type="datetime-local" value={form.end_date} onChange={setF('end_date')} /></div>
                <div className="field" style={{ flex: 1 }}><label>Attempt Limit</label><input className="inp" type="number" min="1" value={form.attempt_limit} onChange={setF('attempt_limit')} /></div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <h3 className="h3" style={{ marginBottom: 8 }}>Questions Source</h3>
                <div className="fx" style={{ gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="radio" checked={inputType === 'pdf'} onChange={() => setInputType('pdf')} />
                    Upload PDF Document
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="radio" checked={inputType === 'text'} onChange={() => setInputType('text')} />
                    Paste Raw Text
                  </label>
                </div>
              </div>

              {inputType === 'pdf' ? (
                <div className="card" style={{ borderStyle: 'dashed', textAlign: 'center', padding: 40 }}>
                  <FileTextIcon size={48} color="var(--text-tertiary)" style={{ marginBottom: 16 }} />
                  <h3 className="h3" style={{ marginBottom: 8 }}>Upload Test Document</h3>
                  <p className="muted" style={{ marginBottom: 24, fontSize: 14 }}>Upload a PDF containing questions formatted like:<br/>"1. Question text?<br/>A) Option 1<br/>B) Option 2<br/>Ans: A"</p>
                  <input 
                    type="file" 
                    accept=".pdf" 
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    id="pdf-upload"
                  />
                  <label htmlFor="pdf-upload" className="btn bs" style={{ display: 'inline-flex', cursor: 'pointer' }}>Select PDF File</label>
                  <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                    {fileInputRef.current?.files?.[0]?.name}
                  </div>
                </div>
              ) : (
                <div className="field" style={{ height: 200, display: 'flex', flexDirection: 'column' }}>
                  <label>Paste Text Content</label>
                  <textarea 
                    className="inp" 
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: 13, resize: 'none' }} 
                    placeholder={"1. What is the capital of France?\nA) London\nB) Paris\nC) Berlin\nD) Madrid\nAns: B"}
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ flexShrink: 0, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
              <button className="btn bd" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn bp" onClick={createTest} disabled={saving}>
                {saving ? 'Processing...' : 'Save & Launch Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
