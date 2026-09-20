import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, toast } from '../../utils/api';
import { UserCheckIcon, CheckCircleIcon, CopyIcon, DownloadIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/Skeleton';
import { Modal } from '../../components/common/Modal';
import { formatDate } from '../../utils/helpers';
import { STATUS_CONFIG } from '../../utils/constants';

export function Enrollments() {
  const { institute, setInstitute } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [processing, setProcessing] = useState(null);
  const [approvedResult, setApprovedResult] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);

  const [batches, setBatches] = useState([]);
  const [selectedBatches, setSelectedBatches] = useState({});
  const [qrBatchFilter, setQrBatchFilter] = useState('');

  const load = () => {
    if (!institute) return;
    GET(`/enrollment/requests/${institute.id}`).then(data => {
      setItems(data || []);
      const map = {};
      (data || []).forEach(r => { map[r.id] = r.batch_id || ''; });
      setSelectedBatches(map);
    }).catch(() => {}).finally(() => setLoading(false));

    GET(`/batches/${institute.id}`).then(data => setBatches(data || [])).catch(() => []);
  };
  useEffect(load, [institute]);

  const handleAction = async (id, action) => {
    setProcessing(id);
    try {
      const body = action === 'approve' ? { batch_id: selectedBatches[id] || undefined } : undefined;
      const res = await POST(`/enrollment/request/${id}/${action}`, body, `Request ${action}d`);
      if (action === 'approve' && res?.credentials) {
        setApprovedResult(res);
      }
      load();
    } catch { /* */ }
    setProcessing(null);
  };

  const copyText = (text, label = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text);
    toast(label, 'success');
  };

  const copyAllCredentials = () => {
    if (!approvedResult?.credentials) return;
    let text = `Apni Vidya - Student Credentials\n`;
    text += `Institute: ${institute?.name || 'Apni Vidya'}\n`;
    text += `Student Phone/Login: ${approvedResult.credentials.student?.phone}\n`;
    text += `Temporary Password: ${approvedResult.credentials.student?.temp_password}\n`;
    if (approvedResult.credentials.parent) {
      text += `\nParent Phone/Login: ${approvedResult.credentials.parent?.phone}\n`;
      text += `Parent Temp Password: ${approvedResult.credentials.parent?.temp_password}\n`;
    }
    text += `Login URL: ${window.location.origin}/login\n`;
    copyText(text, 'All credentials copied to clipboard!');
  };

  const regenQR = async () => {
    if (!institute) return;
    setQrLoading(true);
    try {
      const res = await POST(`/institutes/${institute.id}/qr`);
      if (res?.qr_code_data) setInstitute({ ...institute, qr_code_data: res.qr_code_data });
      toast('QR code regenerated', 'success');
    } catch { /* */ }
    setQrLoading(false);
  };

  const downloadQR = () => {
    if (!institute?.qr_code_data) return;
    const a = document.createElement('a');
    a.href = institute.qr_code_data;
    a.download = `${institute.enrollment_slug || 'enrollment'}-qr.png`;
    a.click();
    toast('QR Code downloaded', 'success');
  };

  if (!institute) return <EmptyState icon={UserCheckIcon} title="Set up your institute first" />;

  const filtered = items.filter(i => i.status === tab);

  // Group requests batch-wise so admins/teachers see each batch's queue
  // separately instead of one long mixed list.
  const groups = [];
  const groupIndex = {};
  filtered.forEach(r => {
    const key = r.batch_id || 'unassigned';
    if (!(key in groupIndex)) {
      groupIndex[key] = groups.length;
      groups.push({ key, batchName: r.batch_name || 'No Batch Specified', rows: [] });
    }
    groups[groupIndex[key]].rows.push(r);
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header page-header-row" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="h1">Enrollment Requests</h1>
          <p className="page-subtitle">Review and approve student self-enrollments</p>
        </div>
        <div className="fx" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn bs bsm"
            onClick={() => {
              const url = `${window.location.origin}/enroll/${institute.enrollment_slug}`;
              copyText(url, 'Enrollment URL copied!');
            }}
            title="Copy Public Enrollment Link"
          >
            <CopyIcon size={14} style={{ marginRight: 4 }} /> Copy Link
          </button>
          <a
            href={`/enroll/${institute.enrollment_slug}`}
            target="_blank"
            rel="noreferrer"
            className="btn bs bsm"
            title="Open Public Enrollment Page"
          >
            Open Form ↗
          </a>
          <button
            className="btn bp bsm"
            onClick={() => setShowQRModal(true)}
            title="View & Download QR Code"
          >
            📱 View QR & Links
          </button>
        </div>
      </div>

      <div className="tabs">
        {['pending', 'approved', 'rejected'].map(t => (
          <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({items.filter(i => i.status === t).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ padding: 20 }}><SkeletonTable rows={4} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={UserCheckIcon} title={`No ${tab} requests`} description={`There are no enrollment requests in the ${tab} queue.`} />
      ) : (
        groups.map(g => (
          <div key={g.key} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
            <div className="fxb" style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
              <h3 className="h3" style={{ marginBottom: 0 }}>{g.batchName}</h3>
              <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>{g.rows.length} {g.rows.length === 1 ? 'request' : 'requests'}</span>
            </div>
            <div className="tblwrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Student Details</th>
                    <th>Parent Details</th>
                    <th>Assigned Batch</th>
                    <th>Status</th>
                    {tab === 'pending' && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map(r => (
                    <tr key={r.id}>
                      <td><div className="muted" style={{ fontSize: 13 }}>{formatDate(r.created_at)}</div></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.student_name}</div>
                        <div className="muted" style={{ fontSize: 13 }}>{r.student_phone}</div>
                      </td>
                      <td>
                        {r.parent_name ? (
                          <>
                            <div style={{ fontWeight: 500 }}>{r.parent_name}</div>
                            <div className="muted" style={{ fontSize: 13 }}>{r.parent_phone}</div>
                          </>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td>
                        {tab === 'pending' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <select
                              className="sel bsm"
                              value={selectedBatches[r.id] ?? r.batch_id ?? ''}
                              onChange={(e) => setSelectedBatches(prev => ({ ...prev, [r.id]: e.target.value }))}
                              style={{ fontSize: 12, padding: '4px 8px', maxWidth: 180 }}
                              title="Admin can change batch assignment before approving"
                            >
                              <option value="">No Batch</option>
                              {batches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                            {selectedBatches[r.id] && selectedBatches[r.id] !== r.batch_id && (
                              <span style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600 }}>
                                ✏️ Changed from {r.batch_name || 'None'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{r.batch_name || <span className="muted">—</span>}</span>
                        )}
                      </td>
                      <td>
                        <span className="badge" style={{ background: STATUS_CONFIG[r.status]?.bg, color: STATUS_CONFIG[r.status]?.fg }}>
                          {STATUS_CONFIG[r.status]?.label}
                        </span>
                      </td>
                      {tab === 'pending' && (
                        <td>
                          <div className="fx" style={{ gap: 8 }}>
                            <button className="btn bg bsm" onClick={() => handleAction(r.id, 'approve')} disabled={processing === r.id}>Approve</button>
                            <button className="btn bd bsm" onClick={() => handleAction(r.id, 'reject')} disabled={processing === r.id}>Reject</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* Approved Credentials Modal */}
      <Modal
        isOpen={Boolean(approvedResult)}
        onClose={() => setApprovedResult(null)}
        title="Enrollment Approved — Login Credentials"
        maxWidth={500}
        footer={
          <div className="fx" style={{ gap: 10, width: '100%' }}>
            <button className="btn bs" style={{ flex: 1 }} onClick={copyAllCredentials}>
              <CopyIcon size={15} style={{ marginRight: 6 }} /> Copy All
            </button>
            <button className="btn bp" style={{ flex: 1 }} onClick={() => setApprovedResult(null)}>
              Done
            </button>
          </div>
        }
      >
        {approvedResult && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--color-success-bg)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <CheckCircleIcon size={28} />
              </div>
              <h3 className="h3" style={{ margin: 0 }}>Student Admitted Successfully!</h3>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                Share these temporary credentials with the student and parent.
              </p>
            </div>

            {/* Student Credential Box */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px' }}>
                🎓 Student Credentials
              </div>
              <div className="fxb" style={{ marginBottom: 6 }}>
                <span className="muted" style={{ fontSize: 13 }}>Mobile / Login ID:</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{approvedResult.credentials?.student?.phone}</span>
              </div>
              <div className="fxb" style={{ alignItems: 'center' }}>
                <span className="muted" style={{ fontSize: 13 }}>Temp Password:</span>
                <div className="fx" style={{ gap: 8, alignItems: 'center' }}>
                  <code style={{ background: '#fff', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: 6, fontWeight: 700, color: 'var(--color-primary)', fontSize: 14 }}>
                    {approvedResult.credentials?.student?.temp_password}
                  </code>
                  <button
                    className="btn bs bsm"
                    onClick={() => copyText(approvedResult.credentials?.student?.temp_password, 'Student password copied!')}
                    title="Copy Password"
                    style={{ padding: '4px 8px' }}
                  >
                    <CopyIcon size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Parent Credential Box if present */}
            {approvedResult.credentials?.parent && (
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-warning)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px' }}>
                  👨‍👩‍👦 Parent Credentials
                </div>
                <div className="fxb" style={{ marginBottom: 6 }}>
                  <span className="muted" style={{ fontSize: 13 }}>Parent Mobile:</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{approvedResult.credentials?.parent?.phone}</span>
                </div>
                <div className="fxb" style={{ alignItems: 'center' }}>
                  <span className="muted" style={{ fontSize: 13 }}>Temp Password:</span>
                  <div className="fx" style={{ gap: 8, alignItems: 'center' }}>
                    <code style={{ background: '#fff', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: 6, fontWeight: 700, color: 'var(--color-warning)', fontSize: 14 }}>
                      {approvedResult.credentials?.parent?.temp_password}
                    </code>
                    <button
                      className="btn bs bsm"
                      onClick={() => copyText(approvedResult.credentials?.parent?.temp_password, 'Parent password copied!')}
                      title="Copy Password"
                      style={{ padding: '4px 8px' }}
                    >
                      <CopyIcon size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: 'var(--color-primary-bg)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--color-primary-light)' }}>
              <span style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 500 }}>
                💡 Students and parents will be prompted to set their own permanent password on their first login.
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* QR Code & Link Modal */}
      <Modal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title="Student Self-Enrollment (QR & Links)"
        maxWidth={480}
        footer={
          <div className="fx" style={{ gap: 10, width: '100%' }}>
            {institute?.qr_code_data && (
              <button className="btn bs" style={{ flex: 1 }} onClick={downloadQR}>
                <DownloadIcon size={15} style={{ marginRight: 6 }} /> Download QR
              </button>
            )}
            <button className="btn bp" style={{ flex: 1 }} onClick={() => setShowQRModal(false)}>
              Close
            </button>
          </div>
        }
      >
        <div style={{ textAlign: 'center' }}>
          <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
            Students scan the QR or open the link to register. You can share a generic institute link or a direct batch-specific link.
          </p>

          {/* Batch Selector for Link */}
          {batches.length > 0 && (
            <div style={{ textAlign: 'left', marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
                Select Target Batch for Link:
              </label>
              <select
                className="sel w-full"
                value={qrBatchFilter}
                onChange={(e) => setQrBatchFilter(e.target.value)}
                style={{ fontSize: 13 }}
              >
                <option value="">🌐 General Institute Link (Student chooses batch from dropdown)</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>📚 {b.name} (Direct Batch Link)</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ width: 200, height: 200, margin: '0 auto 14px', background: '#fff', border: '1px solid var(--border-color)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            {qrLoading ? (
              <span className="muted" style={{ fontSize: 13 }}>Generating QR...</span>
            ) : institute?.qr_code_data ? (
              <img src={institute.qr_code_data} alt="Enrollment QR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ textAlign: 'center' }}>
                <span className="muted" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>No QR Code Found</span>
                <button className="btn bs bsm" onClick={regenQR}>Generate QR</button>
              </div>
            )}
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', wordBreak: 'break-all', marginBottom: 14 }}>
            {qrBatchFilter 
              ? `${window.location.origin}/enroll/${institute?.enrollment_slug}?batch=${qrBatchFilter}`
              : `${window.location.origin}/enroll/${institute?.enrollment_slug}`
            }
          </div>

          <div className="fx" style={{ gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn bs bsm"
              onClick={() => {
                const url = qrBatchFilter 
                  ? `${window.location.origin}/enroll/${institute?.enrollment_slug}?batch=${qrBatchFilter}`
                  : `${window.location.origin}/enroll/${institute?.enrollment_slug}`;
                copyText(url, qrBatchFilter ? 'Batch enrollment link copied!' : 'General enrollment link copied!');
              }}
            >
              <CopyIcon size={14} style={{ marginRight: 4 }} /> {qrBatchFilter ? 'Copy Batch Link' : 'Copy General Link'}
            </button>
            <a
              href={qrBatchFilter 
                ? `/enroll/${institute?.enrollment_slug}?batch=${qrBatchFilter}`
                : `/enroll/${institute?.enrollment_slug}`
              }
              target="_blank"
              rel="noreferrer"
              className="btn bs bsm"
            >
              Open Form ↗
            </a>
            {!qrBatchFilter && (
              <button
                className="btn bs bsm"
                onClick={regenQR}
                disabled={qrLoading}
              >
                {qrLoading ? 'Generating...' : 'Regenerate'}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
