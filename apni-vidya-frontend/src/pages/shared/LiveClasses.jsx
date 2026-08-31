import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, PUT, toast } from '../../utils/api';
import { VideoIcon, EditIcon, CopyIcon, ClockIcon, CalendarIcon, CheckCircleIcon, SparklesIcon, UsersIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { formatTime, formatDate, getMondayBasedDayIndex } from '../../utils/helpers';
import { TT_DAYS, getSubjectColor } from '../../utils/constants';

function detectPlatform(url) {
  if (!url) return { name: 'Online Meeting', color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' };
  const lower = url.toLowerCase();
  if (lower.includes('meet.google.com') || lower.includes('google.com/meet')) {
    return { name: 'Google Meet', color: '#00897b', bg: '#e0f2f1', icon: '📹' };
  }
  if (lower.includes('zoom.us') || lower.includes('zoomgov.com')) {
    return { name: 'Zoom Meeting', color: '#2d8cff', bg: '#e8f4fd', icon: '🎥' };
  }
  if (lower.includes('teams.microsoft.com') || lower.includes('teams.live.com')) {
    return { name: 'Microsoft Teams', color: '#6264a7', bg: '#edeafc', icon: '👥' };
  }
  if (lower.includes('webex.com')) {
    return { name: 'Cisco Webex', color: '#00b0b9', bg: '#e0f7f8', icon: '🌐' };
  }
  return { name: 'Live Classroom', color: 'var(--color-primary)', bg: 'var(--color-primary-bg)', icon: '🔴' };
}

export function LiveClasses({ embedded = false }) {
  const { user, institute } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBatchId, setEditBatchId] = useState('');
  const [editBatchName, setEditBatchName] = useState('');
  const [editLink, setEditLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const todayIdx = getMondayBasedDayIndex();

  const load = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      if (user?.role === 'institute_admin' || user?.role === 'teacher') {
        const instId = institute?.id || user?.institute_id;
        if (instId) {
          const data = await GET(`/batches/${instId}`);
          setBatches(Array.isArray(data) ? data : []);
        } else {
          const mine = await GET('/batches/mine').catch(() => []);
          setBatches(Array.isArray(mine) ? mine : []);
        }
      } else {
        // Student / Parent
        const data = await GET('/batches/mine').catch(() => []);
        if (Array.isArray(data) && data.length > 0) {
          setBatches(data);
        } else if (user?.institute_id) {
          // Fallback to institute batches filtered by user's batch
          const fallback = await GET(`/batches/${user.institute_id}`).catch(() => []);
          if (Array.isArray(fallback)) {
            setBatches(user.batch_id ? fallback.filter(b => b.id === user.batch_id) : fallback);
          }
        }
      }
    } catch (e) {
      console.error('[LiveClasses] failed to load batches:', e);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user, institute]);

  const copyToClipboard = (link, batchName) => {
    if (!link) return;
    const fullLink = link.startsWith('http') ? link : `https://${link}`;
    navigator.clipboard.writeText(fullLink);
    toast.success(`Meeting link for "${batchName || 'Live Class'}" copied to clipboard!`);
  };

  const handleEditLink = (batch) => {
    setEditBatchId(batch.id);
    setEditBatchName(batch.name || 'Batch');
    setEditLink(batch.meet_link || '');
    setShowEditModal(true);
  };

  const submitLink = async () => {
    if (!editBatchId) return;
    setSaving(true);
    try {
      const cleanLink = editLink.trim();
      await PUT(`/batches/${editBatchId}/meet-link`, { meet_link: cleanLink });
      toast.success('Live class link updated successfully!');
      setShowEditModal(false);
      load();
    } catch (e) {
      toast.error('Failed to update live class link');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: embedded ? 0 : 24 }}>
        {!embedded && <div className="skeleton" style={{ height: 40, width: 220, marginBottom: 24 }} />}
        <div className="g2" style={{ gap: 20 }}>
          <div className="skeleton" style={{ height: 240, borderRadius: 'var(--radius-xl)' }} />
          <div className="skeleton" style={{ height: 240, borderRadius: 'var(--radius-xl)' }} />
        </div>
      </div>
    );
  }

  const isStaff = user?.role === 'teacher' || user?.role === 'institute_admin';
  const isStudent = user?.role === 'student' || user?.role === 'parent';

  // Filtered batches for staff search
  const filteredBatches = batches.filter(b => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return b.name?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q);
  });

  /* ─────────────────────────────────────────────────────────────
     STUDENT / PARENT LIVE CLASS ROOM VIEW
  ───────────────────────────────────────────────────────────── */
  if (isStudent) {
    const studentBatch = batches[0];
    const meetLink = studentBatch?.meet_link;
    const hasLiveLink = Boolean(meetLink && meetLink.trim());
    const platform = detectPlatform(meetLink);
    const todaySlots = studentBatch?.today_slots || [];

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const isSlotHappeningNow = (slot) => {
      if (!slot?.start_time || !slot?.end_time) return false;
      const [sh, sm] = slot.start_time.split(':').map(Number);
      const [eh, em] = slot.end_time.split(':').map(Number);
      return nowMinutes >= sh * 60 + sm && nowMinutes < eh * 60 + em;
    };

    return (
      <div className="animate-fade-in" style={{ padding: embedded ? 0 : 24 }}>
        {!embedded && (
          <div className="page-header page-header-row" style={{ marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 className="h1">Live Classes & Online Lectures</h1>
              <p className="page-subtitle">Join ongoing video classes, connect with instructors, and access today's schedule</p>
            </div>
            <button 
              className="btn bs bsm" 
              onClick={() => load(true)} 
              disabled={refreshing}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              🔄 {refreshing ? 'Checking...' : 'Refresh Status'}
            </button>
          </div>
        )}

        <div className="g2" style={{ alignItems: 'start', gap: 24 }}>
          {/* Main Live Class Card */}
          <div 
            className="glass-panel" 
            style={{ 
              gridColumn: '1 / -1', 
              padding: 32, 
              borderRadius: 'var(--radius-xl)',
              background: hasLiveLink 
                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)' 
                : 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
              border: hasLiveLink ? '1px solid rgba(255,255,255,0.15)' : '1px solid var(--border-light)',
              color: hasLiveLink ? '#fff' : 'var(--text-primary)',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: hasLiveLink ? '0 12px 32px rgba(0, 0, 0, 0.2)' : 'none'
            }}
          >
            {/* Background glowing ambient light */}
            {hasLiveLink && (
              <div 
                style={{ 
                  position: 'absolute', 
                  top: -80, 
                  right: -80, 
                  width: 260, 
                  height: 260, 
                  background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(0,0,0,0) 70%)', 
                  borderRadius: '50%',
                  pointerEvents: 'none'
                }} 
              />
            )}

            <div className="fxb" style={{ alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div className="fx" style={{ gap: 10, marginBottom: 8 }}>
                  {hasLiveLink ? (
                    <span 
                      className="badge" 
                      style={{ 
                        background: '#10b981', 
                        color: '#fff', 
                        fontWeight: 700, 
                        letterSpacing: '0.05em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 0 12px rgba(16, 185, 129, 0.6)'
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'pulse 1.2s infinite' }} />
                      LIVE SESSION READY
                    </span>
                  ) : (
                    <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      SESSION STANDBY
                    </span>
                  )}
                  {hasLiveLink && (
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                      {platform.icon} {platform.name}
                    </span>
                  )}
                </div>
                <h2 className="h1" style={{ color: hasLiveLink ? '#fff' : 'var(--text-primary)', marginBottom: 6, fontSize: '1.75rem' }}>
                  {studentBatch?.name || 'Your Academic Batch'}
                </h2>
                <p style={{ color: hasLiveLink ? 'rgba(255,255,255,0.75)' : 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                  {studentBatch?.institute_name || institute?.name || 'Apni Vidya Institute'} 
                  {studentBatch?.teacher_name ? ` • Instructor: ${studentBatch.teacher_name}` : ''}
                </p>
              </div>

              {!embedded && (
                <button 
                  className="btn bs bsm" 
                  onClick={() => load(true)} 
                  disabled={refreshing}
                  style={{ 
                    background: hasLiveLink ? 'rgba(255,255,255,0.1)' : 'var(--bg-secondary)', 
                    color: hasLiveLink ? '#fff' : 'var(--text-primary)',
                    border: hasLiveLink ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border-color)',
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  🔄 {refreshing ? 'Updating...' : 'Refresh Link'}
                </button>
              )}
            </div>

            {hasLiveLink ? (
              <div>
                <div 
                  style={{ 
                    padding: '16px 20px', 
                    borderRadius: 'var(--radius-lg)', 
                    background: 'rgba(255,255,255,0.08)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    marginBottom: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ minWidth: 200, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>
                      Classroom Link
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#6ee7b7', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      {meetLink}
                    </div>
                  </div>
                  <button 
                    className="btn bs bsm"
                    onClick={() => copyToClipboard(meetLink, studentBatch?.name)}
                    style={{ 
                      background: 'rgba(255,255,255,0.15)', 
                      color: '#fff', 
                      border: '1px solid rgba(255,255,255,0.25)', 
                      backdropFilter: 'blur(8px)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <CopyIcon size={14} /> Copy Link
                  </button>
                </div>

                <div className="fx" style={{ gap: 14, flexWrap: 'wrap' }}>
                  <a 
                    href={meetLink.startsWith('http') ? meetLink : `https://${meetLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn bp"
                    style={{ 
                      padding: '12px 28px', 
                      fontSize: '1.05rem', 
                      fontWeight: 700, 
                      gap: 10,
                      boxShadow: '0 4px 20px rgba(79, 70, 229, 0.4)',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                    }}
                  >
                    <VideoIcon size={20} />
                    Join Live Class
                  </a>
                </div>
              </div>
            ) : (
              <div 
                style={{ 
                  padding: 24, 
                  background: 'var(--bg-tertiary)', 
                  borderRadius: 'var(--radius-lg)', 
                  border: '1px dashed var(--border-color)',
                  marginTop: 12 
                }}
              >
                <div className="fx" style={{ gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-primary-bg)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <VideoIcon size={22} />
                  </div>
                  <div>
                    <h3 className="h3" style={{ fontSize: '1rem', marginBottom: 2 }}>No Active Meeting Link Set</h3>
                    <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                      Your teacher hasn't published a meeting URL for this batch yet. The join button will automatically activate here once class starts.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Today's Schedule Card */}
          <div className="card" style={{ padding: 24, borderRadius: 'var(--radius-xl)' }}>
            <div className="fxb" style={{ marginBottom: 16 }}>
              <div className="fx" style={{ gap: 8 }}>
                <CalendarIcon size={18} color="var(--color-primary)" />
                <h3 className="h3" style={{ margin: 0, fontSize: '1.05rem' }}>Today's Lecture Schedule</h3>
              </div>
              <span className="badge" style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary)', fontWeight: 600 }}>
                {TT_DAYS[todayIdx]}
              </span>
            </div>

            {todaySlots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)' }}>
                <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>No timetable slots scheduled for today.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {todaySlots.map(slot => {
                  const [bg, fg] = getSubjectColor(slot.subject);
                  const isCurrent = isSlotHappeningNow(slot);
                  return (
                    <div 
                      key={slot.id} 
                      className={`card ${isCurrent ? 'pulse-border' : ''}`}
                      style={{ 
                        padding: 14, 
                        borderRadius: 10, 
                        borderLeft: `4px solid ${fg}`, 
                        background: bg,
                        position: 'relative'
                      }}
                    >
                      <div className="fxb" style={{ marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: fg }}>{slot.subject}</span>
                        {isCurrent && (
                          <span className="badge" style={{ background: fg, color: '#fff', fontSize: '0.65rem', fontWeight: 800 }}>
                            NOW IN SESSION
                          </span>
                        )}
                      </div>
                      <div className="fxb" style={{ fontSize: '0.8rem', color: fg, opacity: 0.9 }}>
                        <span className="fx" style={{ gap: 4 }}>
                          <ClockIcon size={12} /> {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                        </span>
                        {slot.teacher_name && <span>👨‍🏫 {slot.teacher_name}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Classroom Etiquette & Guidelines */}
          <div className="card" style={{ padding: 24, borderRadius: 'var(--radius-xl)' }}>
            <div className="fx" style={{ gap: 8, marginBottom: 16 }}>
              <SparklesIcon size={18} color="var(--color-warning)" />
              <h3 className="h3" style={{ margin: 0, fontSize: '1.05rem' }}>Live Class Guidelines</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.875rem' }}>
              <div className="fx" style={{ gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.1rem' }}>🎧</span>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Mute on Entry:</strong>
                  <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '0.8rem' }}>Keep your microphone muted upon joining to minimize background noise.</p>
                </div>
              </div>
              <div className="fx" style={{ gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.1rem' }}>💬</span>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Ask Doubts in Chat:</strong>
                  <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '0.8rem' }}>Use the meeting chat box or raise hand feature before unmuting.</p>
                </div>
              </div>
              <div className="fx" style={{ gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.1rem' }}>🌐</span>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Stable Connection:</strong>
                  <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '0.8rem' }}>Connect over strong Wi-Fi or 4G/5G data for crystal clear audio & video.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     TEACHER / INSTITUTE ADMIN MANAGEMENT VIEW
  ───────────────────────────────────────────────────────────── */
  return (
    <div className="animate-fade-in" style={{ padding: embedded ? 0 : 24 }}>
      {!embedded && (
        <div className="page-header page-header-row" style={{ marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="h1">Live Classes Management</h1>
            <p className="page-subtitle">Configure Google Meet / Zoom links for academic batches and launch live sessions</p>
          </div>
          <button 
            className="btn bs bsm" 
            onClick={() => load(true)} 
            disabled={refreshing}
          >
            🔄 {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      )}

      {/* Search Filter for Admins / Teachers */}
      {batches.length > 3 && (
        <div style={{ marginBottom: 20, maxWidth: 360 }}>
          <input 
            type="text" 
            className="inp" 
            placeholder="Search batches by name..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
      )}

      {filteredBatches.length === 0 ? (
        <EmptyState 
          icon={VideoIcon} 
          title="No Batches Found" 
          description="Create batches in the Batches tab to configure live class links." 
        />
      ) : (
        <div className="g3" style={{ gap: 20 }}>
          {filteredBatches.map(b => {
            const hasLink = Boolean(b.meet_link && b.meet_link.trim());
            const platform = detectPlatform(b.meet_link);
            const fullLink = hasLink ? (b.meet_link.startsWith('http') ? b.meet_link : `https://${b.meet_link}`) : '';

            return (
              <div 
                key={b.id} 
                className="card card-hover" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 16,
                  padding: 24,
                  borderRadius: 'var(--radius-xl)',
                  border: hasLink ? '1px solid var(--color-primary-light)' : '1px solid var(--border-light)'
                }}
              >
                <div>
                  <div className="fxb" style={{ marginBottom: 8 }}>
                    <h3 className="h3" style={{ fontSize: '1.15rem', marginBottom: 0 }}>{b.name}</h3>
                    {hasLink ? (
                      <span className="badge" style={{ background: platform.bg, color: platform.color, fontWeight: 700 }}>
                        {platform.name}
                      </span>
                    ) : (
                      <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                        No Link Set
                      </span>
                    )}
                  </div>
                  {b.description && <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>{b.description}</p>}
                </div>

                <div className="fx" style={{ gap: 12, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                  <span className="fx" style={{ gap: 4 }}>
                    <UsersIcon size={14} /> {b.student_count || 0} Students
                  </span>
                </div>

                {hasLink ? (
                  <div 
                    style={{ 
                      padding: '10px 12px', 
                      borderRadius: 8, 
                      background: 'var(--bg-secondary)', 
                      fontSize: '0.8rem', 
                      fontFamily: 'monospace',
                      color: 'var(--text-secondary)',
                      wordBreak: 'break-all',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.meet_link}
                    </span>
                    <button 
                      className="btn-icon" 
                      onClick={() => copyToClipboard(b.meet_link, b.name)}
                      title="Copy Link"
                      style={{ flexShrink: 0, width: 24, height: 24 }}
                    >
                      <CopyIcon size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="muted" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                    Click "Set Link" below to add a Google Meet or Zoom URL.
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 8 }}>
                  {hasLink ? (
                    <a 
                      href={fullLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn bp" 
                      style={{ flex: 1, justifyContent: 'center', gap: 8 }}
                    >
                      <VideoIcon size={16} />
                      Start Class
                    </a>
                  ) : (
                    <button 
                      className="btn bp" 
                      onClick={() => handleEditLink(b)}
                      style={{ flex: 1, justifyContent: 'center', gap: 8 }}
                    >
                      <VideoIcon size={16} />
                      Set Meet Link
                    </button>
                  )}
                  <button 
                    className="btn bs" 
                    onClick={() => handleEditLink(b)} 
                    title="Edit Link"
                    style={{ padding: '8px 12px' }}
                  >
                    <EditIcon size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Set Link Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Set Live Class Link for "${editBatchName}"`}
        footer={
          <div className="fx" style={{ gap: 12, justifyContent: 'flex-end', width: '100%' }}>
            <button className="btn bs" onClick={() => setShowEditModal(false)} disabled={saving}>Cancel</button>
            <button className="btn bp" onClick={submitLink} disabled={saving}>
              {saving ? 'Saving...' : 'Save & Publish Link'}
            </button>
          </div>
        }
      >
        <div className="form-group">
          <label className="lbl">Meeting URL (Google Meet, Zoom, MS Teams, etc.)</label>
          <input 
            type="text" 
            className="inp" 
            placeholder="https://meet.google.com/abc-defg-hij" 
            value={editLink} 
            onChange={e => setEditLink(e.target.value)}
            autoFocus
          />
          <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
            💡 <strong>Tip:</strong> Paste your Google Meet (<code style={{ background: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: 4 }}>meet.google.com/...</code>) or Zoom meeting link. Enrolled students will see this link in real time.
          </div>
        </div>
      </Modal>
    </div>
  );
}

