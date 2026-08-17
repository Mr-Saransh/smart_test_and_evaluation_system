import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET, PUT, toast } from '../../utils/api';
import { VideoIcon, EditIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';

export function LiveClasses() {
  const { user, institute } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBatchId, setEditBatchId] = useState('');
  const [editLink, setEditLink] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      if (user.role === 'institute_admin' || user.role === 'teacher') {
        const data = await GET(`/batches/${institute.id}`);
        setBatches(data);
      } else if (user.role === 'student' && user.batch_id) {
        // Students can only see their own batch, but the API doesn't have a GET /batches/:id right now.
        // As a workaround, we can fetch all and filter, or just show from user state if it's there.
        // Wait, for student, we might need a dedicated endpoint or just rely on user state?
        // Actually, we can fetch /batches/${institute.id} because students don't have access to it?
        // Oh wait, `hasInstituteAccess` allows students!
        const data = await GET(`/batches/${user.institute_id}`);
        setBatches(data.filter(b => b.id === user.batch_id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user, institute]);

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: 24 }}>
        <div className="skeleton" style={{ height: 40, width: 200, marginBottom: 24 }}></div>
        <div className="g3">
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />)}
        </div>
      </div>
    );
  }

  const isTeacher = user?.role === 'teacher' || user?.role === 'institute_admin';
  const activeClasses = batches.filter(b => b.is_active && (isTeacher || b.meet_link));

  const handleEditLink = (batch) => {
    setEditBatchId(batch.id);
    setEditLink(batch.meet_link || '');
    setShowEditModal(true);
  };

  const submitLink = async () => {
    if (!editBatchId) return;
    setSaving(true);
    try {
      await PUT(`/batches/${editBatchId}/meet-link`, { meet_link: editLink });
      toast.success('Live class link updated');
      setShowEditModal(false);
      load();
    } catch (e) {
      toast.error('Failed to update link');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: 24 }}>
      <div className="page-header page-header-row" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="h1">Live Classes</h1>
          <p className="page-subtitle">Join your ongoing live sessions directly</p>
        </div>
      </div>

      {activeClasses.length === 0 ? (
        <EmptyState 
          icon={VideoIcon} 
          title="No Live Classes Scheduled" 
          description={isTeacher ? "Add Google Meet links to your batches to start live classes." : "Your teachers have not added any live class links yet."} 
        />
      ) : (
        <div className="g3">
          {activeClasses.map(b => (
            <div key={b.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h3 className="h3" style={{ fontSize: 18, marginBottom: 4 }}>{b.name}</h3>
                {b.description && <p className="muted" style={{ fontSize: 13 }}>{b.description}</p>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                {b.meet_link ? (
                  <a 
                    href={b.meet_link.startsWith('http') ? b.meet_link : `https://${b.meet_link}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn bp" 
                    style={{ flex: 1, justifyContent: 'center', gap: 8 }}
                  >
                    <VideoIcon size={16} />
                    {isTeacher ? 'Start Class' : 'Join Class'}
                  </a>
                ) : (
                  <div className="btn bs" style={{ flex: 1, justifyContent: 'center', opacity: 0.5 }}>
                    No Link Set
                  </div>
                )}
                {isTeacher && (
                  <button className="btn bs" onClick={() => handleEditLink(b)} title="Edit Link">
                    <EditIcon size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Link Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Set Live Class Link"
        footer={
          <div className="fx" style={{ gap: 12, justifyContent: 'flex-end', width: '100%' }}>
            <button className="btn bs" onClick={() => setShowEditModal(false)} disabled={saving}>Cancel</button>
            <button className="btn bp" onClick={submitLink} disabled={saving}>
              {saving ? 'Saving...' : 'Save Link'}
            </button>
          </div>
        }
      >
        <div className="form-group">
          <label className="lbl">Google Meet / Zoom Link</label>
          <input 
            type="text" 
            className="inp" 
            placeholder="e.g. meet.google.com/abc-defg-hij" 
            value={editLink} 
            onChange={e => setEditLink(e.target.value)}
          />
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>This link will be visible to all students in this batch.</p>
        </div>
      </Modal>
    </div>
  );
}
