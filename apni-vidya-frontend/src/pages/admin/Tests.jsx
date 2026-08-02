import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, toast } from '../../utils/api';
import { FileTextIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/Skeleton';

export function Tests() {
  const { institute } = useAuth();
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreate, setShowCreate] = useState(false);
  
  const [form, setForm] = useState({ 
    title: '', subject: '', batch_id: '', duration_min: 30, 
    chapter: '', difficulty: 'medium', start_date: '', end_date: '', attempt_limit: 1
  });
  
  const [saving, setSaving] = useState(false);
  
  // Importer state
  const [inputType, setInputType] = useState('pdf'); // 'pdf' or 'text'
  const [rawText, setRawText] = useState('');
  const fileInputRef = useRef(null);

  const load = () => {
    if (!institute) return;
    Promise.all([
      GET(`/tests/institute/${institute.id}`),
      GET(`/batches/${institute.id}`)
    ]).then(([t, b]) => { setItems(t); setBatches(b); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [institute]);

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
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('av2_token')}`
          },
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
      load();
    } catch (err) {
      toast(err.message || 'Failed to create test');
    }
    setSaving(false);
  };

  const startTest = async (id) => {
    try { await POST(`/tests/${id}/status`, { status: 'active' }, 'Test started'); load(); } catch {}
  };
  const completeTest = async (id) => {
    try { await POST(`/tests/${id}/status`, { status: 'completed' }, 'Test marked completed'); load(); } catch {}
  };

  if (!institute) return <EmptyState icon={FileTextIcon} title="Set up your institute first" />;

  const statusColors = { draft: '#94a3b8', active: '#059669', completed: '#2563eb' };
  const statusBgs = { draft: '#f1f5f9', active: '#d1fae5', completed: '#dbeafe' };

  return (
    <div className="animate-fade-in">
      <div className="page-header page-header-row">
        <div><h1 className="h1">Tests & Assessments</h1><p className="page-subtitle">Create and manage online tests</p></div>
        <button className="btn bp" onClick={() => { 
          setForm({ title: '', subject: '', batch_id: '', duration_min: 30, chapter: '', difficulty: 'medium', start_date: '', end_date: '', attempt_limit: 1 }); 
          setRawText('');
          setInputType('pdf');
          if (fileInputRef.current) fileInputRef.current.value = null;
          setShowCreate(true); 
        }}>+ Create Test</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="tblwrap">
          {loading ? (
            <div style={{ padding: 20 }}><SkeletonTable /></div>
          ) : items.length === 0 ? (
            <EmptyState icon={FileTextIcon} title="No Tests Yet" description="Create a test using PDF upload or pasting text." actionLabel="+ Create Test" onAction={() => setShowCreate(true)} />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Test Name & Details</th>
                  <th>Batch</th>
                  <th>Schedule & Limits</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.title}</div>
                      <div className="muted" style={{ fontSize: 13 }}>{t.subject || 'General'} {t.chapter ? `• ${t.chapter}` : ''}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{t.duration_min} mins • {t.total_marks} marks • {t.question_count || 0} Qs</div>
                    </td>
                    <td><div style={{ fontSize: 14 }}>{t.batch_name}</div></td>
                    <td>
                      <div style={{ fontSize: 13 }}>Attempts: {t.attempt_limit}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {t.start_date ? new Date(t.start_date).toLocaleDateString() : 'No start date'} - {t.end_date ? new Date(t.end_date).toLocaleDateString() : 'No end date'}
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: statusBgs[t.status], color: statusColors[t.status] }}>
                        {t.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className="fx" style={{ gap: 8 }}>
                        {t.status === 'draft' && <button className="btn bg bsm" onClick={() => startTest(t.id)}>Start</button>}
                        {t.status === 'active' && <button className="btn bp bsm" onClick={() => completeTest(t.id)}>End</button>}
                        {t.status === 'completed' && <button className="btn bs bsm">Results</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
                    <option value="">Select Batch</option>
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
                <div className="field" style={{ flex: 1 }}><label>Attempt Limit</label><input className="inp" type="number" min="1" value={form.attempt_limit} onChange={setF('attempt_limit')} /></div>
              </div>

              <div className="fx fw" style={{ gap: 16, marginBottom: 24 }}>
                <div className="field" style={{ flex: 1 }}><label>Start Date & Time (Optional)</label><input className="inp" type="datetime-local" value={form.start_date} onChange={setF('start_date')} /></div>
                <div className="field" style={{ flex: 1 }}><label>End Date & Time (Optional)</label><input className="inp" type="datetime-local" value={form.end_date} onChange={setF('end_date')} /></div>
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
