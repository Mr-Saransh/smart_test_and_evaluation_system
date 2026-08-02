import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET } from '../../utils/api';
import { VideoIcon } from '../../components/common/Icons';
import { EmptyState } from '../../components/common/EmptyState';

export function LiveClasses() {
  const { user, institute } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const activeClasses = batches.filter(b => b.is_active && b.meet_link);
  const isTeacher = user?.role === 'teacher' || user?.role === 'institute_admin';

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
                <a 
                  href={b.meet_link.startsWith('http') ? b.meet_link : `https://${b.meet_link}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn bp" 
                  style={{ width: '100%', justifyContent: 'center', gap: 8 }}
                >
                  <VideoIcon size={16} />
                  {isTeacher ? 'Start Class' : 'Join Class'}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
