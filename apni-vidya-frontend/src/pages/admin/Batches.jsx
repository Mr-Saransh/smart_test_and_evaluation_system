import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, PUT, DEL, toast, payBatchSubscription } from '../../utils/api';
import { BuildingIcon, UsersIcon, TrendingUpIcon, CurrencyIcon, UserCheckIcon, TrashIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { SkeletonCard, SkeletonTable } from '../../components/common/Skeleton';
import { formatDate, formatCurrency, getScoreColor, getAttendanceColor } from '../../utils/helpers';
import { LeaderboardView } from '../../components/common/LeaderboardView';

export function Batches() {
  const { institute, setInstitute } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrLoading, setQrLoading] = useState(false);
  const [tab, setTab] = useState('active'); // active | archived
  
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', start_date: '', end_date: '', meet_link: '', capacity: '' });
  const [saving, setSaving] = useState(false);

  // Delete Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Detail Drawer state
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Upgrade / Renew state
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeCap, setUpgradeCap] = useState(10);
  const [showRenew, setShowRenew] = useState(false);

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

  const regenQR = async () => {
    if (!institute) return;
    setQrLoading(true);
    try {
      const res = await POST(`/institutes/${institute.id}/regenerate-qr`, undefined, 'QR code regenerated');
      if (res?.qr_code_data) setInstitute({ ...institute, qr_code_data: res.qr_code_data });
    } catch { /* */ }
    setQrLoading(false);
  };

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
  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', start_date: '', end_date: '', meet_link: '', capacity: 100 }); setShow(true); };
  const openEdit = (b, e) => { e.stopPropagation(); setEditing(b); setForm({ name: b.name, description: b.description || '', start_date: b.start_date?.split('T')[0] || '', end_date: b.end_date?.split('T')[0] || '', meet_link: b.meet_link || '', capacity: b.capacity || '' }); setShow(true); };

  const save = async () => {
    if (!form.name) { toast('Batch name is required'); return; }
    setSaving(true);
    try {
      const body = { ...form, institute_id: institute.id };
      if (editing) {
        const updated = await PUT(`/batches/${editing.id}`, body, 'Batch updated');
        setShow(false); 
        load();
        if (updated && updated.id) {
          openDetails(updated);
        } else if (selectedBatch?.id === editing?.id) {
          openDetails({ id: editing.id });
        }
      } else {
        const res = await POST('/batches', body, 'Batch created');
        if (res.capacity > 0) {
          payBatchSubscription(res.id, 'creation', 0, async (success) => {
            if (success) {
              setShow(false); load();
              openDetails(res);
            } else {
              // Delete the batch since payment failed/was cancelled
              await DEL(`/batches/${res.id}`);
              toast('Batch creation cancelled (payment not completed)', 'error');
              setShow(false); load();
            }
          });
        } else {
          setShow(false); load();
        }
      }
    } catch { /* */ }
    setSaving(false);
  };

  const handleUpgrade = () => {
    setSaving(true);
    payBatchSubscription(details.id, 'upgrade', upgradeCap, (success) => {
      setSaving(false);
      if (success) { setShowUpgrade(false); load(); openDetails(details); }
    });
  };

  const handleRenew = () => {
    setSaving(true);
    payBatchSubscription(details.id, 'renewal', 0, (success) => {
      setSaving(false);
      if (success) { setShowRenew(false); load(); openDetails(details); }
    });
  };

  const archive = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Archive this batch? It will be hidden from active lists but data is preserved.')) return;
    await DEL(`/batches/${id}`, 'Batch archived'); 
    load();
    if (selectedBatch?.id === id) setSelectedBatch(null);
  };

  const restore = async (b, e) => {
    if (e) e.stopPropagation();
    try {
      await PUT(`/batches/${b.id}`, { is_active: true }, 'Batch restored');
      load();
    } catch (err) {
      // API util already shows a toast, so we just prevent the unhandled promise rejection
      console.error(err);
    }
  };

  const openDeleteModal = (b, e) => {
    if (e) e.stopPropagation();
    setBatchToDelete(b);
    setShowDeleteModal(true);
  };

  const handleDeletePermanent = async () => {
    if (!batchToDelete) return;
    setDeleting(true);
    try {
      await DEL(`/batches/${batchToDelete.id}/permanent`, 'Batch permanently deleted');
      setShowDeleteModal(false);
      setShow(false); // If edit modal was open
      const deletedId = batchToDelete.id;
      setBatchToDelete(null);
      if (selectedBatch?.id === deletedId) {
        setSelectedBatch(null);
        setDetails(null);
      }
      load();
    } catch (err) {
      toast(err.message || 'Failed to delete batch');
    } finally {
      setDeleting(false);
    }
  };

  const openDetails = async (b) => {
    if (!b || !b.id) return;
    setSelectedBatch(b);
    setLoadingDetails(true);
    try {
      const d = await GET(`/batches/details/${b.id}`);
      setDetails(d);
    } catch {
      // Gracefully clear if batch no longer exists
      setSelectedBatch(null);
      setDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(b => tab === 'active' ? b.is_active : !b.is_active);
  }, [items, tab]);

  useEffect(() => {
    if (items.length > 0) {
      const exists = selectedBatch && items.some(b => b.id === selectedBatch.id);
      if (!exists) {
        const activeBatch = items.find(b => b.is_active) || items[0];
        if (activeBatch) openDetails(activeBatch);
      }
    } else {
      setSelectedBatch(null);
      setDetails(null);
    }
  }, [items]);

  if (!institute) return <EmptyState icon={BuildingIcon} title="Set up your institute first" />;

  return (
    <div className="page-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      <div className="page-header page-header-row" style={{ marginBottom: 0 }}>
        <div><h1 className="h1">Batches</h1><p className="page-subtitle">Manage class groups and academic batches</p></div>
        <button className="btn bp" onClick={openCreate}>+ Add Batch</button>
      </div>

      {loading ? (
        <div className="card"><SkeletonCard height={300} /></div>
      ) : items.length === 0 ? (
        <EmptyState 
          icon={BuildingIcon} 
          title="No Batches Found" 
          description="Create a batch to start organizing your students." 
          actionLabel="+ Add Batch" 
          onAction={openCreate} 
        />
      ) : (
        <>
          <div className="card" style={{ padding: '16px 20px', background: 'var(--bg-surface-elevated)' }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, display: 'block' }}>Select Batch Dashboard</label>
            <div style={{ position: 'relative' }}>
              <select 
                className="sel" 
                value={selectedBatch?.id || ''} 
                onChange={(e) => {
                  const b = items.find(i => i.id === e.target.value);
                  if (b) openDetails(b);
                }}
                style={{ fontSize: 16, fontWeight: 600, padding: '12px 16px', background: 'var(--bg-subtle)', appearance: 'none', cursor: 'pointer' }}
              >
                <optgroup label="Active Batches">
                  {items.filter(b => b.is_active).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </optgroup>
                {items.filter(b => !b.is_active).length > 0 && (
                  <optgroup label="Archived Batches">
                    {items.filter(b => !b.is_active).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </optgroup>
                )}
              </select>
              <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }}>
                ▼
              </div>
            </div>
          </div>

          {selectedBatch && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              <div className="card" style={{ padding: '24px', background: 'var(--bg-surface)' }}>
                <div className="fxb" style={{ flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <h2 className="h2" style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                      {selectedBatch.name}
                      <span className="badge" style={{ background: selectedBatch.is_active ? 'var(--color-success-bg)' : 'var(--bg-subtle)', color: selectedBatch.is_active ? 'var(--color-success)' : 'var(--text-secondary)' }}>
                        {selectedBatch.is_active ? 'Active' : 'Archived'}
                      </span>
                    </h2>
                    {selectedBatch.description && <p className="muted" style={{ fontSize: '0.9rem' }}>{selectedBatch.description}</p>}
                  </div>
                  <div className="fx fw" style={{ gap: 10 }}>
                    {selectedBatch.is_active ? (
                      <>
                        <button className="btn bs" onClick={(e) => openEdit(selectedBatch, e)}>✎ Edit Batch</button>
                        <button className="btn bd" onClick={(e) => archive(selectedBatch.id, e)}>📦 Archive</button>
                        <button className="btn bdanger" onClick={(e) => openDeleteModal(selectedBatch, e)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <TrashIcon size={15} /> Delete Batch
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn bp" onClick={(e) => restore(selectedBatch, e)}>Restore Batch</button>
                        <button className="btn bdanger" onClick={(e) => openDeleteModal(selectedBatch, e)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <TrashIcon size={15} /> Delete Permanently
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {loadingDetails ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><SkeletonCard height={120}/><SkeletonCard height={120}/></div>
              ) : !details ? (
                <div className="muted card" style={{ textAlign: 'center', padding: 40 }}>Failed to load dashboard data</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, alignItems: 'start' }}>
                  
                  {/* Left Column: Subscriptions & Stats */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    
                    {details.capacity > 0 ? (
                      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', color: 'white', padding: 28, boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.4)' }}>
                        {/* Premium Glassmorphic Overlay */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent 60%)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'linear-gradient(135deg, #6366f1, #a855f7)', borderRadius: '50%', opacity: 0.4, filter: 'blur(40px)', pointerEvents: 'none' }} />
                        
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          <div className="fxb" style={{ marginBottom: 28 }}>
                            <div className="fx" style={{ gap: 12 }}>
                              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2)' }}>
                                <span style={{ fontSize: 20 }}>💎</span>
                              </div>
                              <div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)' }}>
                                  Premium Tier
                                </h3>
                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Batch Subscription</div>
                              </div>
                            </div>
                            <span style={{ background: details.payment_status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: details.payment_status === 'active' ? '#34d399' : '#fbbf24', padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 800, letterSpacing: '0.5px', border: `1px solid ${details.payment_status === 'active' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                              {details.payment_status?.toUpperCase() || 'ACTIVE'}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 24, marginBottom: 32, alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Total Capacity</div>
                              <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>{details.capacity} <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>seats</span></div>
                            </div>
                            <div style={{ height: '40px', background: 'rgba(255,255,255,0.1)' }} />
                            <div>
                              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Valid Until</div>
                              <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{details.valid_until ? formatDate(details.valid_until) : 'Unlimited'}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 12 }}>
                            <button 
                              onClick={() => { setUpgradeCap(10); setShowUpgrade(true); }}
                              style={{ flex: 1, background: 'linear-gradient(to right, #4f46e5, #7c3aed)', color: 'white', border: 'none', padding: '12px 16px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                              <span>🚀</span> Upgrade Seats
                            </button>
                            <button 
                              onClick={() => setShowRenew(true)}
                              style={{ flex: 1, background: 'rgba(255, 255, 255, 0.05)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '12px 16px', borderRadius: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }}
                              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.transform = 'translateY(0)' }}
                            >
                              Renew Plan
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white', padding: 32, boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.4)', textAlign: 'center' }}>
                        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: '50%', opacity: 0.2, filter: 'blur(40px)', pointerEvents: 'none' }} />
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <span style={{ fontSize: 28 }}>⚡</span>
                          </div>
                          <h3 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 800 }}>Enable Premium Tier</h3>
                          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 24, lineHeight: 1.5, maxWidth: 300, margin: '0 auto 24px' }}>Unlock capacity limits and streamline your fee collection seamlessly.</p>
                          <button 
                            onClick={() => { setUpgradeCap(100); setShowUpgrade(true); }}
                            style={{ background: 'linear-gradient(to right, #4f46e5, #7c3aed)', color: 'white', border: 'none', padding: '14px 28px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)' }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                          >
                            Set Capacity & Activate
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div className="card" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: 'var(--color-primary)' }} />
                        <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                          <UsersIcon size={24} style={{ color: 'var(--color-primary)' }} />
                        </div>
                        <div className="sn" style={{ fontSize: 32, lineHeight: 1, marginBottom: 8, color: 'var(--text-primary)' }}>{details.student_count || 0}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>Enrolled Students</div>
                      </div>
                      
                      <div className="card" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: getAttendanceColor(details.attendance_pct) }} />
                        <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                          <span style={{ fontSize: 24 }}>📅</span>
                        </div>
                        <div className="sn" style={{ fontSize: 32, lineHeight: 1, marginBottom: 8, color: getAttendanceColor(details.attendance_pct) }}>{details.attendance_pct || 0}%</div>
                        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>Avg. Attendance</div>
                      </div>
                    </div>

                    <div className="card" style={{ padding: 28 }}>
                      <div className="fxb" style={{ marginBottom: 24 }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-primary)' }}>
                          <div style={{ background: 'var(--color-success-bg)', padding: 8, borderRadius: 8 }}><CurrencyIcon size={18} style={{ color: 'var(--color-success)' }}/></div>
                          Financial Health
                        </h3>
                      </div>
                      
                      <div style={{ background: 'var(--bg-surface-elevated)', borderRadius: 16, padding: 20 }}>
                        <div className="fxb" style={{ marginBottom: 12 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Fee Collection Rate</span>
                          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-success)' }}>
                            {details.fee_stats.total_due > 0 ? Math.round((details.fee_stats.total_paid / details.fee_stats.total_due) * 100) : 0}%
                          </span>
                        </div>
                        <div style={{ height: 8, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
                          <div style={{ height: '100%', background: 'linear-gradient(to right, #10b981, #34d399)', width: `${details.fee_stats.total_due > 0 ? (details.fee_stats.total_paid / details.fee_stats.total_due) * 100 : 0}%`, borderRadius: 4 }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Pending Amount</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-warning)' }}>{formatCurrency(Math.max(0, details.fee_stats.total_due - details.fee_stats.total_paid))}</div>
                          </div>
                          <div style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Overdue Invoices</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-error)' }}>{details.fee_stats.overdue_count || 0}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Performers & Faculty */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="card" style={{ padding: 28 }}>
                      <div className="fxb" style={{ marginBottom: 24 }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-primary)' }}>
                          <div style={{ background: 'var(--color-primary-bg)', padding: 8, borderRadius: 8 }}><TrendingUpIcon size={18} style={{ color: 'var(--color-primary)' }}/></div>
                          Top Performers
                        </h3>
                        <button className="btn btn-sm bs" onClick={() => loadLeaderboard(details.id)} style={{ borderRadius: 8, fontWeight: 600 }}>
                          Full Leaderboard
                        </button>
                      </div>
                      
                      {details.top_performers?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {details.top_performers.map((p, i) => (
                            <div key={i} className="fxb" style={{ padding: 16, background: 'var(--bg-surface-elevated)', borderRadius: 12, border: '1px solid var(--border-light)' }}>
                              <div className="fx" style={{ gap: 12 }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'var(--bg-primary)', color: i < 3 ? 'white' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
                                  {i+1}
                                </div>
                                <span style={{ fontSize: 14, fontWeight: 600 }}>{p.full_name}</span>
                              </div>
                              <span style={{ fontSize: 14, fontWeight: 800, color: getScoreColor(p.avg_pct) }}>{p.avg_pct}%</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: 32, textAlign: 'center', background: 'var(--bg-surface-elevated)', borderRadius: 12, border: '1px dashed var(--border-color)' }}>
                          <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>📝</span>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>No test data available yet.</span>
                        </div>
                      )}
                    </div>

                    <div className="card" style={{ padding: 28 }}>
                      <div className="fxb" style={{ marginBottom: 24 }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-primary)' }}>
                          <div style={{ background: 'var(--bg-tertiary)', padding: 8, borderRadius: 8 }}><UserCheckIcon size={18} style={{ color: 'var(--text-secondary)' }}/></div>
                          Assigned Faculty
                        </h3>
                      </div>
                      
                      {details.teachers?.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                          {details.teachers.map((t, i) => (
                            <div key={i} className="fx" style={{ padding: '10px 16px', background: 'var(--bg-surface-elevated)', borderRadius: 12, border: '1px solid var(--border-light)', gap: 12 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), #a855f7)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                                {t.full_name.charAt(0)}
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.full_name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{t.subject}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: 32, textAlign: 'center', background: 'var(--bg-surface-elevated)', borderRadius: 12, border: '1px dashed var(--border-color)' }}>
                          <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>👨‍🏫</span>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>No teachers assigned to timetable.</span>
                        </div>
                      )}
                    </div>

                    <div className="card" style={{ padding: 28, textAlign: 'center' }}>
                      <h3 className="h2" style={{ marginBottom: 8 }}>Enrollment QR Code</h3>
                      <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>Scan to open student self-enrollment form</p>
                      <div style={{ width: 200, height: 200, margin: '0 auto 16px', background: '#fff', border: '1px solid var(--border-color)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                        {qrLoading ? (
                          <span className="muted" style={{ fontSize: 13 }}>Generating...</span>
                        ) : institute?.qr_code_data ? (
                          <img src={institute.qr_code_data} alt="Enrollment QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ textAlign: 'center' }}>
                            <span className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>No QR Generated</span>
                            <button className="btn bs bsm" onClick={regenQR}>Generate QR</button>
                          </div>
                        )}
                      </div>
                      <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', wordBreak: 'break-all', marginBottom: 12 }}>
                        /enroll/{institute?.enrollment_slug}
                      </div>
                      <button className="btn bs bsm w-full" style={{ justifyContent: 'center' }} onClick={regenQR} disabled={qrLoading}>
                        {qrLoading ? 'Generating...' : 'Regenerate QR Code'}
                      </button>
                    </div>

                  </div>

                </div>
              )}
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={show}
        onClose={() => setShow(false)}
        title={editing ? 'Edit Batch' : 'New Batch'}
        footer={
          <div className="fxb w-full" style={{ gap: 10, flexWrap: 'wrap' }}>
            {editing ? (
              <button 
                type="button" 
                className="btn bdanger" 
                onClick={() => { setShow(false); openDeleteModal(editing); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <TrashIcon size={15} /> Delete Batch
              </button>
            ) : <div />}
            <div className="fx" style={{ gap: 10 }}>
              <button className="btn bs" onClick={() => setShow(false)}>Cancel</button>
              <button className="btn bp" onClick={save} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update Batch' : 'Create Batch'}
              </button>
            </div>
          </div>
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
            {!editing ? (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 16, marginTop: 8 }}>
                <div className="fxb" style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Select Capacity</span>
                  <div style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--color-primary)', padding: '4px 12px', borderRadius: 20, fontWeight: 700 }}>
                    {form.capacity || 100} Students
                  </div>
                </div>
                <input 
                  className="inp" type="range" min="100" max="1000" step="10" 
                  value={form.capacity || 100} onChange={setF('capacity')} 
                  style={{ width: '100%', accentColor: 'var(--color-primary)', height: 6, cursor: 'pointer' }}
                />
                <div className="fxb" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed var(--border-color)' }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Monthly Fee (@ ₹80)</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-success)' }}>{formatCurrency((form.capacity || 100) * 80)}</span>
                </div>
              </div>
            ) : (
              <input className="inp" type="number" value={form.capacity} disabled placeholder="Use 'Upgrade Capacity' to change" />
            )}
          </div>
          <div className="field">
            <label>Google Meet Link</label>
            <input className="inp" value={form.meet_link} onChange={setF('meet_link')} placeholder="https://meet.google.com/..." />
          </div>
        </div>
      </Modal>

      {/* Delete Batch Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        title="Delete Batch"
        footer={
          <div className="fxb w-full" style={{ gap: 10, flexWrap: 'wrap' }}>
            <button className="btn bs" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
              Cancel
            </button>
            <div className="fx" style={{ gap: 10 }}>
              {batchToDelete?.is_active && (
                <button
                  type="button"
                  className="btn bd"
                  disabled={deleting}
                  onClick={async (e) => {
                    setShowDeleteModal(false);
                    await archive(batchToDelete.id, e);
                  }}
                >
                  📦 Archive Instead
                </button>
              )}
              <button
                type="button"
                className="btn bdanger"
                onClick={handleDeletePermanent}
                disabled={deleting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <TrashIcon size={16} /> {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'var(--color-error-bg)', borderRadius: 12, color: 'var(--color-error)' }}>
            <TrashIcon size={24} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Permanent Action</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>This batch will be completely removed from your institute records.</div>
            </div>
          </div>

          <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
            Are you sure you want to delete <strong>"{batchToDelete?.name}"</strong>?
          </p>

          <div className="card" style={{ background: 'var(--bg-subtle)', padding: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              <li>Enrolled students will <strong>not</strong> be deleted; they will be unassigned so you can place them into other batches.</li>
              <li>Past tests, attendance, and fee history tied to this batch will be cleaned up.</li>
              {batchToDelete?.is_active && <li>If you want to keep the data history, consider <strong>Archiving</strong> instead of deleting.</li>}
            </ul>
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

      {/* Upgrade Modal */}
      <Modal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title="✨ Upgrade Batch Capacity"
        footer={
          <>
            <button className="btn bs" onClick={() => setShowUpgrade(false)}>Cancel</button>
            <button className="btn bp" onClick={handleUpgrade} disabled={saving} style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', border: 'none' }}>
              {saving ? 'Processing...' : 'Pay & Upgrade'}
            </button>
          </>
        }
      >
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 20, marginBottom: 20, textAlign: 'center' }}>
           <h4 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>Select Additional Students</h4>
           <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1 }}>+{upgradeCap}</div>
           <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>Total New Capacity: {(details?.capacity || 0) + upgradeCap}</div>
        </div>
        
        <div className="field">
          <input 
            className="inp" 
            type="range" min="10" max="100" step="10" 
            value={upgradeCap} 
            onChange={(e) => setUpgradeCap(Number(e.target.value))} 
            style={{ width: '100%', accentColor: 'var(--color-primary)', height: 6, cursor: 'pointer' }}
          />
          <div className="fxb" style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
            <span>10</span>
            <span>100</span>
          </div>
        </div>

        <div className="fxb" style={{ marginTop: 24, padding: 16, borderTop: '1px dashed var(--border-color)' }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Total Payable Now</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-success)' }}>{formatCurrency(upgradeCap * 80)}</span>
        </div>
      </Modal>

      {/* Renew Modal */}
      <Modal
        isOpen={showRenew}
        onClose={() => setShowRenew(false)}
        title="📅 Renew Subscription"
        footer={
          <>
            <button className="btn bs" onClick={() => setShowRenew(false)}>Cancel</button>
            <button className="btn bp" onClick={handleRenew} disabled={saving}>
              {saving ? 'Processing...' : 'Pay & Renew'}
            </button>
          </>
        }
      >
        <p className="muted" style={{ marginBottom: 20 }}>Your batch subscription will be extended by 1 month.</p>
        
        <div style={{ background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24 }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>Invoice Summary</h4>
          
          <div className="fxb" style={{ marginBottom: 12 }}>
            <span style={{ color: '#475569', fontWeight: 500 }}>Total Capacity</span>
            <strong style={{ color: '#0f172a' }}>{details?.capacity || 0} Students</strong>
          </div>
          
          {(details?.deferred_capacity || 0) > 0 && (
            <div className="fxb" style={{ marginBottom: 12 }}>
              <span style={{ color: '#475569', fontWeight: 500 }}>Upgrade Credits <span style={{fontSize:11, color:'#94a3b8'}}>(Mid-month upgrades)</span></span>
              <strong style={{ color: '#10b981' }}>-{details?.deferred_capacity} Students</strong>
            </div>
          )}
          
          <div className="fxb" style={{ margin: '16px 0', padding: '16px 0', borderTop: '1px dashed #cbd5e1', borderBottom: '1px dashed #cbd5e1' }}>
            <span style={{ color: '#0f172a', fontWeight: 600, fontSize: 15 }}>Billable Capacity</span>
            <strong style={{ color: '#0f172a', fontSize: 15 }}>{(details?.capacity || 0) - (details?.deferred_capacity || 0)} Students</strong>
          </div>
          
          <div className="fxb" style={{ marginTop: 8 }}>
            <span style={{ color: '#475569', fontWeight: 600 }}>Amount Due <span style={{fontSize:12, fontWeight: 400}}>(@ ₹80/student)</span></span>
            <strong style={{ color: '#4f46e5', fontSize: 24, fontWeight: 800 }}>
              {formatCurrency(((details?.capacity || 0) - (details?.deferred_capacity || 0)) * 80)}
            </strong>
          </div>
        </div>
      </Modal>
    </div>
  );
}
