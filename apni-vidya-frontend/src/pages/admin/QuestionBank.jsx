import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, DEL, toast } from '../../utils/api';
import { BookOpenIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/Skeleton';

export function QuestionBank() {
  const { institute } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showImport, setShowImport] = useState(false);
  const [showReview, setShowReview] = useState(false);
  
  // Importer state
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [chapter, setChapter] = useState('');
  const [importing, setImporting] = useState(false);

  // PDF
  const fileInputRef = useRef(null);
  const [extractedQuestions, setExtractedQuestions] = useState([]);

  const load = () => {
    if (!institute) return;
    GET(`/questions/${institute.id}`).then(setItems).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [institute]);

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setImporting(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/questions/upload-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');
      
      setExtractedQuestions(data.questions);
      setShowImport(false);
      setShowReview(true);
      toast(`Extracted ${data.questions.length} questions`);
    } catch (err) {
      toast(err.message || 'Error extracting PDF');
    } finally {
      setImporting(false);
      e.target.value = null; // reset
    }
  };

  const handleReviewSave = async () => {
    if (!subject) { toast('Subject is required'); return; }
    
    setImporting(true);
    try {
      const toInsert = extractedQuestions.map(q => ({
        ...q,
        institute_id: institute.id,
        subject, topic, chapter
      }));

      await POST('/questions/bulk', { questions: toInsert }, `Saved ${toInsert.length} questions`);
      setShowReview(false);
      setExtractedQuestions([]);
      load();
    } catch (err) {
      toast(err.message || 'Save failed');
    } finally {
      setImporting(false);
    }
  };

  const updateExtracted = (idx, field, value) => {
    const qList = [...extractedQuestions];
    qList[idx][field] = value;
    setExtractedQuestions(qList);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this question? Tests containing it will still retain the snapshot.')) return;
    await DEL(`/questions/${id}`, 'Question deleted'); load();
  };

  if (!institute) return <EmptyState icon={BookOpenIcon} title="Set up your institute first" />;

  return (
    <div className="animate-fade-in">
      <div className="page-header page-header-row">
        <div><h1 className="h1">Question Bank</h1><p className="page-subtitle">Central repository for test questions</p></div>
        <div className="fx" style={{ gap: 10 }}>
          <button className="btn bd" onClick={() => fileInputRef.current?.click()}>
            {importing ? 'Extracting...' : 'Upload PDF'}
          </button>
          <input type="file" accept="application/pdf" ref={fileInputRef} style={{ display: 'none' }} onChange={handlePdfUpload} />
          <button className="btn bp" onClick={() => setShowImport(true)}>Bulk Import</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="tblwrap">
          {loading ? (
            <div style={{ padding: 20 }}><SkeletonTable /></div>
          ) : items.length === 0 ? (
            <EmptyState icon={BookOpenIcon} title="Question Bank Empty" description="Import questions to start creating tests." actionLabel="Import Questions" onAction={() => setShowImport(true)} />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Subject & Topic</th>
                  <th style={{ width: '50%' }}>Question</th>
                  <th>Details</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map(q => (
                  <tr key={q.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{q.subject}</div>
                      <div className="muted" style={{ fontSize: 13 }}>{q.topic || 'General'} {q.chapter ? `• ${q.chapter}` : ''}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{q.text}</div>
                      {q.type === 'mcq' && q.options && (
                        <div className="fx fw" style={{ gap: 8, fontSize: 12 }}>
                          {q.options.map((opt, i) => (
                            <span key={i} style={{ color: i === q.correct_index ? 'var(--color-success)' : 'var(--text-muted)', fontWeight: i === q.correct_index ? 600 : 400 }}>
                              {String.fromCharCode(65 + i)}. {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{q.marks} Marks</div>
                      <div className="muted" style={{ fontSize: 12 }}>{q.difficulty}</div>
                    </td>
                    <td>
                      <button className="btn bd bsm" onClick={() => remove(q.id)}>Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Import Options</h2>
              <button className="btn-icon" onClick={() => setShowImport(false)}>✕</button>
            </div>
            <div className="empty" style={{ padding: 40 }}>
               <h3>Use "Upload PDF" button to extract from PDF</h3>
               <p className="muted">Bulk Text import has been replaced by the new automated PDF workflow.</p>
               <button className="btn bp mt-4" onClick={() => { setShowImport(false); fileInputRef.current?.click(); }}>Select PDF File</button>
            </div>
          </div>
        </div>
      )}

      {showReview && (
        <div className="modal-overlay">
          <div className="modal-content modal-xl" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>Review Extracted Questions</h2>
              <button className="btn-icon" onClick={() => setShowReview(false)}>✕</button>
            </div>
            
            <div className="g3 mb-4">
              <div className="field"><label>Subject *</label><input className="inp" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Physics" /></div>
              <div className="field"><label>Chapter</label><input className="inp" value={chapter} onChange={e=>setChapter(e.target.value)} placeholder="e.g. Kinematics" /></div>
              <div className="field"><label>Topic (Optional)</label><input className="inp" value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. Motion" /></div>
            </div>

            <div className="card-list" style={{ marginBottom: 20 }}>
              {extractedQuestions.map((q, idx) => (
                <div key={idx} className="card" style={{ padding: 16 }}>
                  <div className="field">
                    <label>Question {idx + 1}</label>
                    <textarea className="inp" value={q.text} onChange={e => updateExtracted(idx, 'text', e.target.value)} />
                  </div>
                  <div className="g2">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="fx" style={{ gap: 8, alignItems: 'center' }}>
                        <input type="radio" checked={q.correct_index === oIdx} onChange={() => updateExtracted(idx, 'correct_index', oIdx)} />
                        <input className="inp" style={{ flex: 1 }} value={opt} onChange={e => {
                          const newOpts = [...q.options];
                          newOpts[oIdx] = e.target.value;
                          updateExtracted(idx, 'options', newOpts);
                        }} />
                      </div>
                    ))}
                  </div>
                  <div className="fxb mt-4">
                    <div className="field" style={{ width: 120 }}>
                      <label>Difficulty</label>
                      <select className="inp" value={q.difficulty} onChange={e => updateExtracted(idx, 'difficulty', e.target.value)}>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <button className="btn bd" onClick={() => {
                      const list = [...extractedQuestions];
                      list.splice(idx, 1);
                      setExtractedQuestions(list);
                    }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="fxb mt-4">
              <button className="btn bd" onClick={() => setShowReview(false)}>Cancel</button>
              <button className="btn bp" onClick={handleReviewSave} disabled={importing}>
                {importing ? 'Saving...' : 'Save Finalized Question Bank'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
