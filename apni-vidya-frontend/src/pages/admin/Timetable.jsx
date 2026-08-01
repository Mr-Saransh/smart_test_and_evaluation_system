import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, DEL, toast } from '../../utils/api';
import { CalendarIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { TT_DAYS, getSubjectColor } from '../../utils/constants';
import { formatTime, ttFmt } from '../../utils/helpers';

export function Timetable() {
  const { institute } = useAuth();
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ day_of_week: 'Monday', start_time: '09:00', end_time: '10:00', subject: '', teacher_name: '', room: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (institute) {
      GET(`/batches/${institute.id}`).then(b => {
        setBatches(b);
        if (b.length > 0) setBatchId(b[0].id);
      }).catch(() => {});
    }
  }, [institute]);

  useEffect(() => {
    if (!batchId) { setSlots([]); return; }
    setLoading(true);
    GET(`/timetable/${batchId}`)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [batchId]);

  const setF = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const saveSlot = async () => {
    if (!form.subject || !form.start_time || !form.end_time) { toast('Subject and times are required'); return; }
    setSaving(true);
    try {
      const body = { ...form, institute_id: institute.id, batch_id: batchId };
      await POST('/timetable/slots', body, 'Slot added');
      setShowForm(false);
      // reload
      const res = await GET(`/timetable/${batchId}`);
      setSlots(res);
    } catch { /* */ }
    setSaving(false);
  };

  const removeSlot = async (id) => {
    if (!window.confirm('Remove this slot?')) return;
    await DEL(`/timetable/slots/${id}`, 'Slot removed');
    const res = await GET(`/timetable/${batchId}`);
    setSlots(res);
  };

  if (!institute) return <EmptyState icon={CalendarIcon} title="Set up your institute first" />;

  // Group slots by day
  const schedule = {};
  TT_DAYS.forEach(d => schedule[d] = []);
  slots.forEach(s => {
    if (schedule[s.day_of_week]) schedule[s.day_of_week].push(s);
  });
  // Sort slots in each day by start time
  TT_DAYS.forEach(d => {
    schedule[d].sort((a, b) => a.start_time.localeCompare(b.start_time));
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header page-header-row">
        <div><h1 className="h1">Timetable</h1><p className="page-subtitle">Manage weekly class schedules by batch</p></div>
        <button className="btn bp" onClick={() => { setForm({ day_of_week: 'Monday', start_time: '09:00', end_time: '10:00', subject: '', teacher_name: '', room: '' }); setShowForm(true); }} disabled={!batchId}>
          + Add Slot
        </button>
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 24 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Select Batch to View Schedule</label>
        <select className="sel" value={batchId} onChange={e => setBatchId(e.target.value)} style={{ minWidth: 300 }}>
          {batches.length === 0 && <option value="">No batches found</option>}
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="card"><div className="skeleton" style={{ height: 400, borderRadius: 8 }} /></div>
      ) : !batchId ? (
        <EmptyState icon={CalendarIcon} title="Select a Batch" description="Choose a batch to view and manage its timetable." />
      ) : (
        <div className="card" style={{ padding: 24, overflowX: 'auto' }}>
          <div style={{ minWidth: 800, display: 'flex', gap: 16 }}>
            {TT_DAYS.map(day => (
              <div key={day} style={{ flex: 1, minWidth: 140 }}>
                <div style={{ padding: '12px 0', borderBottom: '2px solid var(--border-color)', marginBottom: 16, textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {day}
                </div>
                <div className="fx" style={{ flexDirection: 'column', gap: 12 }}>
                  {schedule[day].length === 0 ? (
                    <div className="empty" style={{ padding: '20px 0', fontSize: 12, fontStyle: 'italic' }}>No classes</div>
                  ) : (
                    schedule[day].map(s => {
                      const [bg, fg] = getSubjectColor(s.subject);
                      return (
                        <div key={s.id} style={{ width: '100%', padding: 12, borderRadius: 10, background: bg, border: `1px solid ${bg}`, position: 'relative', group: 'slot' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: fg, marginBottom: 4, lineHeight: 1.2 }}>{s.subject}</div>
                          <div style={{ fontSize: 11, color: fg, opacity: 0.8, marginBottom: 2 }}>{formatTime(s.start_time)} - {formatTime(s.end_time)}</div>
                          {s.teacher_name && <div style={{ fontSize: 11, color: fg, opacity: 0.9 }}>👨‍🏫 {s.teacher_name}</div>}
                          {s.room && <div style={{ fontSize: 11, color: fg, opacity: 0.9 }}>📍 {s.room}</div>}
                          <button 
                            className="btn-icon" 
                            style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, fontSize: 14, background: 'rgba(255,255,255,0.5)', border: 'none', color: fg }}
                            onClick={() => removeSlot(s.id)}
                            title="Remove slot"
                          >✕</button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Class Slot</h2>
              <button className="btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            
            <div className="field">
              <label>Day of Week *</label>
              <select className="sel w-full" value={form.day_of_week} onChange={setF('day_of_week')}>
                {TT_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            
            <div className="g2">
              <div className="field"><label>Start Time *</label><input className="inp" type="time" value={form.start_time} onChange={setF('start_time')} /></div>
              <div className="field"><label>End Time *</label><input className="inp" type="time" value={form.end_time} onChange={setF('end_time')} /></div>
            </div>

            <div className="field"><label>Subject *</label><input className="inp" value={form.subject} onChange={setF('subject')} placeholder="e.g. Physics" /></div>
            
            <div className="g2">
              <div className="field"><label>Teacher (Optional)</label><input className="inp" value={form.teacher_name} onChange={setF('teacher_name')} placeholder="Teacher name" /></div>
              <div className="field"><label>Room (Optional)</label><input className="inp" value={form.room} onChange={setF('room')} placeholder="e.g. Room 101" /></div>
            </div>

            <div className="modal-footer">
              <button className="btn bs" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn bp" onClick={saveSlot} disabled={saving}>{saving ? 'Saving...' : 'Add Slot'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
