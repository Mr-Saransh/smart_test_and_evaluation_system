import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, PUT, DEL, toast } from '../../utils/api';
import { BuildingIcon, UsersIcon, TrendingUpIcon, CurrencyIcon, UserCheckIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { SkeletonCard, SkeletonTable } from '../../components/common/Skeleton';
import { formatDate, formatCurrency, getScoreColor, getAttendanceColor } from '../../utils/helpers';
import { LeaderboardView } from '../../components/common/LeaderboardView';

export function Batches() {
  const { institute } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active'); // active | archived
  
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', start_date: '', end_date: '', meet_link: '', capacity: '' });
  const [saving, setSaving] = useState(false);

  // Detail Drawer state
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Leaderboard Modal state
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState({ top_scorers: [], top_attendance: [] });
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState('scores');

  const load = () => {
    if (!institute) return;
    GET(`/batches/all/${institute.id}`).then(setItems).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [institute]);

  const loadLeaderboard = async (batchId) => {
    setShowLeaderboard(true);
    setLoadingLeaderboard(true);
    try {
      const res = await GET(`/leaderboard/batch/${batchId}`);
      setLeaderboardData(res || []);
    } catch (err) {
      toast('Failed to load leaderboard', 'error');
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const setF = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));
  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', start_date: '', end_date: '', meet_link: '', capacity: '' }); setShow(true); };
  const openEdit = (b, e) => { e.stopPropagation(); setEditing(b); setForm({ name: b.name, description: b.description || '', start_date: b.start_date?.split('T')[0] || '', end_date: b.end_date?.split('T')[0] || '', meet_link: b.meet_link || '', capacity: b.capacity || '' }); setShow(true); };

  const save = async () => {
    if (!form.name) { toast('Batch name is required'); return; }
    setSaving(true);
    try {
      const body = { ...form, institute_id: institute.id };
      if (editing) await PUT(`/batches/${editing.id}`, body, 'Batch updated');
      else await POST('/batches', body, 'Batch created');
      setShow(false); load();
      if (selectedBatch?.id === editing?.id) openDetails({ id: editing.id });
    } catch { /* */ }
    setSaving(false);
  };

  const archive = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Archive this batch? It will be hidden from active lists but data is preserved.')) return;
    await DEL(`/batches/${id}`, 'Batch archived'); 
    load();
    if (selectedBatch?.id === id) setSelectedBatch(null);
  };

  const restore = async (b, e) => {
    e.stopPropagation();
    await PUT(`/batches/${b.id}`, { is_active: true }, 'Batch restored');
    load();
  };

  const openDetails = async (b) => {
    setSelectedBatch(b);
    setLoadingDetails(true);
    try {
      const d = await GET(`/batches/details/${b.id}`);
      setDetails(d);
    } catch {
      toast('Failed to load details');
      setSelectedBatch(null);
    }
    setLoadingDetails(false);
  };

  const filteredItems = useMemo(() => {
    return items.filter(b => tab === 'active' ? b.is_active : !b.is_active);
  }, [items, tab]);

  if (!institute) return <EmptyState icon={BuildingIcon} title="Set up your institute first" />;

  return (
    <div className="animate-fade-in has-detail-drawer" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      
      {/* Main List Column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="page-header page-header-row">
          <div><h1 className="h1">Batches</h1><p className="page-subtitle">Manage class groups and academic batches</p></div>
          <button className="btn bp" onClick={openCreate}>+ Add Batch</button>
        </div>

        <div className="tabs" style={{ marginBottom: 24, borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 24 }}>
          <button className={`tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')} style={{ padding: '8px 0', background: 'none', border: 'none', borderBottom: tab === 'active' ? '2px solid var(--color-primary)' : '2px solid transparent', color: tab === 'active' ? 'var(--color-primary)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>
            Active ({items.filter(i=>i.is_active).length})
          </button>
          <button className={`tab ${tab === 'archived' ? 'active' : ''}`} onClick={() => setTab('archived')} style={{ padding: '8px 0', background: 'none', border: 'none', borderBottom: tab === 'archived' ? '2px solid var(--color-primary)' : '2px solid transparent', color: tab === 'archived' ? 'var(--color-primary)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>
            Archived ({items.filter(i=>!i.is_active).length})
          </button>
        </div>

        {loading ? (
          <div className="g4">{[1,2,3,4].map(i => <div key={i} style={{flex: '1 1 300px'}}><SkeletonCard height={160} /></div>)}</div>
        ) : filteredItems.length === 0 ? (
          <EmptyState 
            icon={BuildingIcon} 
            title={tab === 'active' ? "No Active Batches" : "No Archived Batches"} 
            description={tab === 'active' ? "Create a batch to start organizing your students." : "Archived batches will appear here."} 
            actionLabel={tab === 'active' ? "+ Add Batch" : undefined} 
            onAction={tab === 'active' ? openCreate : undefined} 
          />
        ) : (
          <div className="g4">
            {filteredItems.map(b => {
              const isSelected = selectedBatch?.id === b.id;
              return (
                <div key={b.id} className={`card hover-lift ${isSelected ? 'pulse-border' : ''}`} onClick={() => openDetails(b)} style={{ cursor: 'pointer', border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-light)', padding: 24, flex: '1 1 300px', display: 'flex', flexDirection: 'column' }}>
                  <div className="fxb" style={{ marginBottom: 12 }}>
                    <h3 className="h3" style={{ marginBottom: 0 }}>{b.name}</h3>
                    <span className="badge" style={{ background: b.is_active ? 'var(--color-success-bg)' : 'var(--bg-subtle)', color: b.is_active ? 'var(--color-success)' : 'var(--text-secondary)' }}>
                      {b.is_active ? 'Active' : 'Archived'}
                    </span>
                  </div>
                  {b.description && <p className="muted" style={{ fontSize: '0.8125rem', marginBottom: 20, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{b.description}</p>}
                  
                  <div className="fxb" style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
                    <div className="fx" style={{ gap: 16 }}>
                      <span className="fx muted" style={{ fontSize: '0.75rem', gap: 6, fontWeight: 600 }}><UsersIcon size={14}/> {b.student_count || 0} Students</span>
                    </div>
                    <div className="fx" style={{ gap: 8 }}>
                      {b.is_active ? (
                        <>
                          <button className="btn-icon" onClick={(e) => openEdit(b, e)} style={{ width: 28, height: 28 }}>✎</button>
                          <button className="btn-icon" onClick={(e) => archive(b.id, e)} style={{ width: 28, height: 28, color: 'var(--color-warning)' }}>📦</button>
                        </>
                      ) : (
                        <button className="btn bs bsm" onClick={(e) => restore(b, e)}>Restore</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Drawer (Side Panel) */}
      {selectedBatch && (
        <div className="glass-panel animate-fade-in detail-drawer">
          <div className="fxb" style={{ padding: '24px', background: 'var(--gradient-brand)', color: 'white' }}>
            <div>
              <h2 className="h2" style={{ marginBottom: 4, color: 'white' }}>{selectedBatch.name}</h2>
              <span style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Batch Insights</span>
            </div>
            <button className="btn-icon" style={{ color: 'white' }} onClick={() => setSelectedBatch(null)}>✕</button>
          </div>
          
          <div style={{ padding: 20 }}>
            {loadingDetails ? (
              <div className="fx" style={{ flexDirection: 'column', gap: 16 }}><SkeletonCard height={80}/><SkeletonCard height={80}/></div>
            ) : !details ? (
              <div className="muted" style={{ textAlign: 'center' }}>Failed to load details</div>
            ) : (
              <div className="fx" style={{ flexDirection: 'column', gap: 24 }}>
                
                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="card" style={{ padding: 16, background: 'var(--bg-secondary)', border: 'none' }}>
                    <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Students</div>
                    <div className="sn" style={{ fontSize: 24 }}>{details.student_count || 0}</div>
                  </div>
                  <div className="card" style={{ padding: 16, background: 'var(--bg-secondary)', border: 'none' }}>
                    <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Attendance</div>
                    <div className="sn" style={{ fontSize: 24, color: getAttendanceColor(details.attendance_pct) }}>{details.attendance_pct || 0}%</div>
                  </div>
                </div>
                
                {/* Financial Health */}
                <div>
                  <h3 className="h4" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><CurrencyIcon size={16}/> Financial Health</h3>
                  <div className="fxb" style={{ marginBottom: 8 }}>
                    <span className="muted" style={{ fontSize: 13 }}>Collection Rate</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                      {details.fee_stats.total_due > 0 ? Math.round((details.fee_stats.total_paid / details.fee_stats.total_due) * 100) : 0}%
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                    <div style={{ height: '100%', background: 'var(--color-success)', width: `${details.fee_stats.total_due > 0 ? (details.fee_stats.total_paid / details.fee_stats.total_due) * 100 : 0}%` }} />
                  </div>
                  <div className="fxb">
                    <span className="muted" style={{ fontSize: 12 }}>Pending: <strong style={{ color: 'var(--color-error)' }}>{formatCurrency(Math.max(0, details.fee_stats.total_due - details.fee_stats.total_paid))}</strong></span>
                    <span className="muted" style={{ fontSize: 12 }}>Overdue: <strong>{details.fee_stats.overdue_count || 0}</strong></span>
                  </div>
                </div>

                {/* Top Performers */}
                <div>
                  <div className="fxb" style={{ marginBottom: 12 }}>
                    <h3 className="h4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUpIcon size={16}/> Top Performers</h3>
                    <button className="btn btn-sm bs" onClick={() => loadLeaderboard(details.id)}>
                      View Leaderboard
                    </button>
                  </div>
                  {details.top_performers?.length > 0 ? (
                    <div className="fx" style={{ flexDirection: 'column', gap: 8 }}>
                      {details.top_performers.map((p, i) => (
                        <div key={i} className="fxb card" style={{ padding: '8px 12px' }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{i+1}. {p.full_name}</span>
                          <span className="badge" style={{ background: 'var(--bg-tertiary)', color: getScoreColor(p.avg_pct) }}>{p.avg_pct}%</span>
                        </div>
                      ))}
                    </div>
                  ) : <div className="muted" style={{ fontSize: 13 }}>No test data available.</div>}
                </div>

                {/* Assigned Teachers */}
                <div>
                  <h3 className="h4" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><UserCheckIcon size={16}/> Faculty</h3>
                  {details.teachers?.length > 0 ? (
                    <div className="fx" style={{ flexWrap: 'wrap', gap: 8 }}>
                      {details.teachers.map((t, i) => (
                        <span key={i} className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{t.full_name} ({t.subject})</span>
                      ))}
                    </div>
                  ) : <div className="muted" style={{ fontSize: 13 }}>No teachers assigned to timetable.</div>}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={show}
        onClose={() => setShow(false)}
        title={editing ? 'Edit Batch' : 'New Batch'}
        footer={
          <>
            <button className="btn bs" onClick={() => setShow(false)}>Cancel</button>
            <button className="btn bp" onClick={save} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update Batch' : 'Create Batch'}
            </button>
          </>
        }
      >
        <div className="field">
          <label>Batch Name *</label>
          <input className="inp" value={form.name} onChange={setF('name')} placeholder="e.g. JEE 2026 Morning" autoFocus />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea className="inp" value={form.description} onChange={setF('description')} placeholder="Brief description" rows={2}/>
        </div>
        <div className="g2">
          <div className="field">
            <label>Start Date</label>
            <input className="inp" type="date" value={form.start_date} onChange={setF('start_date')} />
          </div>
          <div className="field">
            <label>End Date</label>
            <input className="inp" type="date" value={form.end_date} onChange={setF('end_date')} />
          </div>
        </div>
        <div className="g2">
          <div className="field">
            <label>Capacity</label>
            <input className="inp" type="number" value={form.capacity} onChange={setF('capacity')} placeholder="Max students" />
          </div>
          <div className="field">
            <label>Google Meet Link</label>
            <input className="inp" value={form.meet_link} onChange={setF('meet_link')} placeholder="https://meet.google.com/..." />
          </div>
        </div>
      </Modal>

      {/* Leaderboard Modal */}
      <Modal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        title={details ? `Leaderboard: ${details.name}` : 'Leaderboard'}
        footer={<button className="btn bs" onClick={() => setShowLeaderboard(false)}>Close</button>}
      >
        <div className="tabs" style={{ marginBottom: 24, marginTop: -12 }}>
          <button className={`tab${leaderboardTab === 'scores' ? ' active' : ''}`} onClick={() => setLeaderboardTab('scores')}>Top Scorers</button>
          <button className={`tab${leaderboardTab === 'attendance' ? ' active' : ''}`} onClick={() => setLeaderboardTab('attendance')}>Top Attendance</button>
        </div>
        <LeaderboardView 
          data={leaderboardData ? (leaderboardTab === 'scores' ? leaderboardData.top_scorers?.map(s => ({...s, score_display: `${s.total_score} pts`, subtext: `${s.tests_taken} test${s.tests_taken !== 1 ? 's' : ''} taken`})) : leaderboardData.top_attendance?.map(s => ({...s, score_display: `${s.attendance_pct}%`, subtext: 'Attendance Rate'}))) : []} 
          loading={loadingLeaderboard} 
        />
      </Modal>
    </div>
  );
}
