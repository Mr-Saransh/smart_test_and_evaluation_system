import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, POST, toast } from '../../utils/api';
import { UserCheckIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/Skeleton';
import { formatDate } from '../../utils/helpers';
import { STATUS_CONFIG } from '../../utils/constants';

export function Enrollments() {
  const { institute } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [processing, setProcessing] = useState(null);

  const load = () => {
    if (!institute) return;
    GET(`/enrollment/requests/${institute.id}`).then(setItems).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [institute]);

  const handleAction = async (id, action) => {
    setProcessing(id);
    try {
      await POST(`/enrollment/request/${id}/${action}`, undefined, `Request ${action}d`);
      load();
    } catch { /* */ }
    setProcessing(null);
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
      <div className="page-header page-header-row">
        <div><h1 className="h1">Enrollment Requests</h1><p className="page-subtitle">Review and approve self-enrollments</p></div>
        <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🔗 /enroll/{institute.enrollment_slug}</span>
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
    </div>
  );
}
