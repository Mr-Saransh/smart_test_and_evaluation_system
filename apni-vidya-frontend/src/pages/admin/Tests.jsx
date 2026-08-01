import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, toast } from '../../utils/api';
import { FileTextIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/Skeleton';

export function Tests() {
  const { institute } = useAuth();
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreate, setShowCreate] = useState(false);
  
  // Update initial form state to include new fields
  const [form, setForm] = useState({ 
    title: '', subject: '', batch_id: '', duration_min: 30, 
    course_id: '', chapter: '', difficulty: '', number_of_questions: 0,
    start_date: '', end_date: '', attempt_limit: 1
  });
  
  const [selectedQs, setSelectedQs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [selectionMode, setSelectionMode] = useState('manual'); // 'manual' or 'auto'

  const load = () => {
    if (!institute) return;
    Promise.all([
      GET(`/tests/institute/${institute.id}`),
      GET(`/batches/${institute.id}`),
      GET(`/questions/${institute.id}`)
    ]).then(([t, b, q]) => { setItems(t); setBatches(b); setQuestions(q); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [institute]);

  const setF = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const toggleQ = (qId) => {
    setSelectedQs(prev => prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]);
  };

  const createTest = async () => {
    if (!form.title || !form.batch_id) {
      toast('Title and batch are required'); return;
    }
    if (selectionMode === 'manual' && selectedQs.length === 0) {
      toast('At least 1 question must be selected'); return;
    }
    if (selectionMode === 'auto' && (!form.number_of_questions || form.number_of_questions <= 0)) {
      toast('Number of questions must be greater than 0'); return;
    }

    setSaving(true);
    try {
      const payload = { 
        ...form, 
        institute_id: institute.id, 
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      };

      if (selectionMode === 'manual') {
        payload.question_ids = selectedQs;
        payload.number_of_questions = null;
      } else {
        payload.question_ids = [];
        // number_of_questions is already in payload
      }

      await POST('/tests', payload, 'Test created');
      setShowCreate(false); load();
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
          setForm({ title: '', subject: '', batch_id: '', duration_min: 30, course_id: '', chapter: '', difficulty: '', number_of_questions: 10, start_date: '', end_date: '', attempt_limit: 1 }); 
          setSelectedQs([]); setSelectionMode('manual'); setShowCreate(true); 
        }}>+ Create Test</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="tblwrap">
          {loading ? (
            <div style={{ padding: 20 }}><SkeletonTable /></div>
          ) : items.length === 0 ? (
            <EmptyState icon={FileTextIcon} title="No Tests Yet" description="Create a test using questions from your Question Bank." actionLabel="+ Create Test" onAction={() => setShowCreate(true)} />
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
            
            <div className="fx fw" style={{ gap: 16, marginBottom: 12, flexShrink: 0 }}>
              <div className="field" style={{ flex: 2, minWidth: 200 }}><label>Test Title *</label><input className="inp" value={form.title} onChange={setF('title')} placeholder="e.g. Physics Mock Test 1" /></div>
              <div className="field" style={{ flex: 1, minWidth: 150 }}><label>Assign Batch *</label>
                <select className="sel w-full" value={form.batch_id} onChange={setF('batch_id')}>
                  <option value="">Select Batch</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="field" style={{ flex: 1, minWidth: 150 }}><label>Duration (mins)</label><input className="inp" type="number" value={form.duration_min} onChange={setF('duration_min')} /></div>
            </div>

            <div className="fx fw" style={{ gap: 16, marginBottom: 20, flexShrink: 0 }}>
              <div className="field" style={{ flex: 1 }}><label>Subject</label><input className="inp" value={form.subject} onChange={setF('subject')} placeholder="Filter by subject" /></div>
              <div className="field" style={{ flex: 1 }}><label>Chapter</label><input className="inp" value={form.chapter} onChange={setF('chapter')} placeholder="Filter by chapter" /></div>
              <div className="field" style={{ flex: 1 }}><label>Difficulty</label>
                <select className="sel w-full" value={form.difficulty} onChange={setF('difficulty')}>
                  <option value="">Any</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="field" style={{ flex: 1 }}><label>Attempt Limit</label><input className="inp" type="number" min="1" value={form.attempt_limit} onChange={setF('attempt_limit')} /></div>
            </div>

            <div className="fx fw" style={{ gap: 16, marginBottom: 20, flexShrink: 0 }}>
              <div className="field" style={{ flex: 1 }}><label>Start Date & Time (Optional)</label><input className="inp" type="datetime-local" value={form.start_date} onChange={setF('start_date')} /></div>
              <div className="field" style={{ flex: 1 }}><label>End Date & Time (Optional)</label><input className="inp" type="datetime-local" value={form.end_date} onChange={setF('end_date')} /></div>
            </div>

            <div style={{ flexShrink: 0, marginBottom: 12 }}>
              <label style={{ marginRight: 16, fontWeight: 600 }}>Question Selection Mode:</label>
              <label style={{ marginRight: 16 }}><input type="radio" checked={selectionMode === 'manual'} onChange={() => setSelectionMode('manual')} /> Manual Select</label>
              <label><input type="radio" checked={selectionMode === 'auto'} onChange={() => setSelectionMode('auto')} /> Auto Random Pick</label>
            </div>

            {selectionMode === 'auto' ? (
              <div className="field" style={{ marginBottom: 20 }}>
                <label>Number of Questions to Pick</label>
                <input className="inp" type="number" min="1" value={form.number_of_questions} onChange={setF('number_of_questions')} />
                <div className="field-hint">The system will randomly select this many questions from the Question Bank matching the Subject, Chapter, and Difficulty filters above.</div>
              </div>
            ) : (
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                <div className="fxb" style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                  <h3 className="h3">Select Questions from Bank ({selectedQs.length} selected)</h3>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                  {questions.length === 0 ? (
                    <EmptyState title="Question Bank Empty" description="Add questions to the Question Bank first before creating a test." />
                  ) : (
                    <div className="g2">
                      {questions
                        .filter(q => (!form.subject || q.subject.toLowerCase().includes(form.subject.toLowerCase())) && 
                                     (!form.chapter || (q.chapter && q.chapter.toLowerCase().includes(form.chapter.toLowerCase()))) &&
                                     (!form.difficulty || q.difficulty === form.difficulty))
                        .map(q => (
                        <div key={q.id} className="card fx" style={{ padding: 12, gap: 12, cursor: 'pointer', border: selectedQs.includes(q.id) ? '2px solid var(--color-primary)' : '1px solid var(--border-color)' }} onClick={() => toggleQ(q.id)}>
                          <input type="checkbox" checked={selectedQs.includes(q.id)} readOnly style={{ marginTop: 4 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{q.text}</div>
                            <div className="fxb muted" style={{ fontSize: 11 }}>
                              <span>{q.subject} {q.chapter ? `• ${q.chapter}` : ''}</span>
                              <span>{q.marks}M • {q.difficulty}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="modal-footer" style={{ flexShrink: 0, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
              <button className="btn bd" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn bp" onClick={createTest} disabled={saving}>{saving ? 'Creating...' : 'Create Test'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
