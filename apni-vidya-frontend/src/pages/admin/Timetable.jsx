import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, DEL, toast } from '../../utils/api';
import { CalendarIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { TT_DAYS, getSubjectColor } from '../../utils/constants';
import { formatTime, getMondayBasedDayIndex } from '../../utils/helpers';
import { SkeletonCard } from '../../components/common/Skeleton';

export function Timetable() {
  const { institute, user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ day_of_week: 0, start_time: '09:00', end_time: '10:00', subject: '', teacher_id: '', room: '' });
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === 'institute_admin';
  const isTeacher = user?.role === 'teacher';
  const canEdit = isAdmin || isTeacher;
  const todayIdx = getMondayBasedDayIndex();

  useEffect(() => {
    if (institute) {
      GET(`/batches/${institute.id}`).then(b => {
        setBatches(b);
        if (b.length > 0) setBatchId(b[0].id);
      }).catch(() => {});
      if (canEdit) {
        GET(`/teachers/${institute.id}`).then(setTeachers).catch(() => []);
      }
    }
  }, [institute]);

  useEffect(() => {
    if (!batchId) { setSlots([]); return; }
    setLoading(true);
    GET(`/timetable/batch/${batchId}`)
      .then(res => setSlots(res.flat || []))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [batchId]);

  const setF = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const saveSlot = async () => {
    if (!form.subject || !form.start_time || !form.end_time) { toast('Subject and times are required'); return; }
    setSaving(true);
    try {
      const body = {
        institute_id: institute.id,
        batch_id: batchId,
        day_of_week: Number(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
        subject: form.subject,
        teacher_id: form.teacher_id || null,
        room: form.room || null,
      };
      await POST('/timetable', body, 'Slot added');
      setShowForm(false);
      setForm({ day_of_week: 0, start_time: '09:00', end_time: '10:00', subject: '', teacher_id: '', room: '' });
      const res = await GET(`/timetable/batch/${batchId}`);
      setSlots(res.flat || []);
    } catch { /* toast handled by POST */ }
    setSaving(false);
  };

  const removeSlot = async (id) => {
    if (!window.confirm('Remove this slot?')) return;
    try {
      await DEL(`/timetable/${id}`, 'Slot removed');
      const res = await GET(`/timetable/batch/${batchId}`);
      setSlots(res.flat || []);
    } catch { /* toast handled */ }
  };

  // Group slots by day_of_week (integer 0-6)
  const schedule = useMemo(() => {
    const map = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    slots.forEach(s => {
      const day = typeof s.day_of_week === 'number' ? s.day_of_week : 0;
      if (map[day]) map[day].push(s);
    });
    Object.keys(map).forEach(d => {
      map[d].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
    });
    return map;
  }, [slots]);

  // Today's summary
  const todaySlots = schedule[todayIdx] || [];

  // Current class detection
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isCurrentSlot = (s) => {
    if (s.day_of_week !== todayIdx) return false;
    const [sh, sm] = (s.start_time || '0:0').split(':').map(Number);
    const [eh, em] = (s.end_time || '0:0').split(':').map(Number);
    return nowMinutes >= sh * 60 + sm && nowMinutes < eh * 60 + em;
  };

  if (!institute) return <EmptyState icon={CalendarIcon} title="Set up your institute first" />;

  return (
    <div className="animate-fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1 className="h1">Timetable</h1>
          <p className="page-subtitle">Manage weekly class schedules by batch</p>
        </div>
        {canEdit && (
          <button className="btn bp" onClick={() => { setForm({ day_of_week: todayIdx, start_time: '09:00', end_time: '10:00', subject: '', teacher_id: '', room: '' }); setShowForm(true); }} disabled={!batchId}>
            + Add Slot
          </button>
        )}
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 24 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Select Batch</label>
        <select className="sel" value={batchId} onChange={e => setBatchId(e.target.value)} style={{ minWidth: 300 }}>
          {batches.length === 0 && <option value="">No batches found</option>}
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Today's Summary */}
      {todaySlots.length > 0 && !loading && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: 20, background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-light)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 10 }}>
            📅 Today — {TT_DAYS[todayIdx]} · {todaySlots.length} class{todaySlots.length > 1 ? 'es' : ''}
          </div>
          <div className="fx fw" style={{ gap: 10 }}>
            {todaySlots.map(s => {
              const [bg, fg] = getSubjectColor(s.subject);
              const isCurrent = isCurrentSlot(s);
              return (
                <div key={s.id} className={isCurrent ? 'pulse-border' : ''} style={{
                  padding: '8px 14px', borderRadius: 10, background: bg,
                  border: isCurrent ? `2px solid ${fg}` : `1px solid transparent`,
                  display: 'flex', gap: 10, alignItems: 'center',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: fg, whiteSpace: 'nowrap' }}>
                    {formatTime(s.start_time)}–{formatTime(s.end_time)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: fg }}>{s.subject}</div>
                  {isCurrent && <span style={{ fontSize: 10, fontWeight: 700, color: fg, background: 'rgba(255,255,255,0.5)', padding: '2px 6px', borderRadius: 4 }}>NOW</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="g3"><SkeletonCard height={400} /></div>
      ) : !batchId ? (
        <EmptyState icon={CalendarIcon} title="Select a Batch" description="Choose a batch to view and manage its timetable." />
      ) : slots.length === 0 ? (
        <EmptyState
          icon={CalendarIcon}
          title="No Classes Scheduled"
          description="Start by adding class slots to this batch's weekly timetable."
          actionLabel={canEdit ? '+ Add First Slot' : undefined}
          onAction={canEdit ? () => setShowForm(true) : undefined}
        />
      ) : (
        <div className="card" style={{ padding: 20, overflowX: 'auto' }}>
          <div style={{ minWidth: 840, display: 'flex', gap: 12 }}>
            {TT_DAYS.map((day, dayIdx) => {
              const isToday = dayIdx === todayIdx;
              return (
                <div key={day} style={{ flex: 1, minWidth: 120 }}>
                  <div style={{
                    padding: '10px 0', borderBottom: isToday ? '3px solid var(--color-primary)' : '2px solid var(--border-color)',
                    marginBottom: 12, textAlign: 'center', fontWeight: 700, fontSize: 13,
                    color: isToday ? 'var(--color-primary)' : 'var(--text-secondary)',
                    background: isToday ? 'var(--color-primary-bg)' : 'transparent', borderRadius: isToday ? '8px 8px 0 0' : 0,
                  }}>
                    {day.slice(0, 3)}
                    {isToday && <span style={{ display: 'block', fontSize: 10, fontWeight: 500, opacity: 0.7 }}>Today</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(schedule[dayIdx] || []).length === 0 ? (
                      <div className="empty" style={{ padding: '24px 0', fontSize: 11, color: 'var(--text-tertiary)' }}>—</div>
                    ) : (
                      (schedule[dayIdx] || []).map(s => {
                        const [bg, fg] = getSubjectColor(s.subject);
                        const isCurrent = isCurrentSlot(s);
                        return (
                          <div key={s.id} className={isCurrent ? 'pulse-border' : ''} style={{
                            width: '100%', padding: '10px 12px', borderRadius: 10, background: bg,
                            borderLeft: `3px solid ${fg}`, position: 'relative',
                            boxShadow: isCurrent ? `0 0 12px ${fg}33` : 'none',
                            transition: 'all var(--transition-fast)',
                          }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: fg, marginBottom: 4, lineHeight: 1.2 }}>{s.subject}</div>
                            <div style={{ fontSize: 11, color: fg, opacity: 0.85, marginBottom: 2, fontWeight: 500 }}>
                              {formatTime(s.start_time)} – {formatTime(s.end_time)}
                            </div>
                            {s.teacher_name && <div style={{ fontSize: 11, color: fg, opacity: 0.8 }}>👨‍🏫 {s.teacher_name}</div>}
                            {s.room && <div style={{ fontSize: 11, color: fg, opacity: 0.8 }}>📍 {s.room}</div>}
                            {isCurrent && (
                              <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: fg, animation: 'pulse 1.5s infinite' }} />
                            )}
                            {canEdit && (
                              <button
                                className="btn-icon slot-delete-btn"
                                style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, fontSize: 12, background: 'rgba(255,255,255,0.6)', border: 'none', color: fg, opacity: 0, transition: 'opacity 0.2s' }}
                                onClick={() => removeSlot(s.id)}
                                title="Remove slot"
                              >✕</button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
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

            <div className="modal-body">
              <div className="field">
                <label>Day of Week *</label>
                <select className="sel w-full" value={form.day_of_week} onChange={setF('day_of_week')}>
                  {TT_DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                </select>
              </div>

              <div className="g2">
                <div className="field"><label>Start Time *</label><input className="inp" type="time" value={form.start_time} onChange={setF('start_time')} /></div>
                <div className="field"><label>End Time *</label><input className="inp" type="time" value={form.end_time} onChange={setF('end_time')} /></div>
              </div>

              <div className="field"><label>Subject *</label><input className="inp" value={form.subject} onChange={setF('subject')} placeholder="e.g. Physics" /></div>

              <div className="g2">
                <div className="field">
                  <label>Teacher (Optional)</label>
                  <select className="sel w-full" value={form.teacher_id} onChange={setF('teacher_id')}>
                    <option value="">— None —</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}{t.subject ? ` (${t.subject})` : ''}</option>)}
                  </select>
                </div>
                <div className="field"><label>Room (Optional)</label><input className="inp" value={form.room} onChange={setF('room')} placeholder="e.g. Room 101" /></div>
              </div>
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
