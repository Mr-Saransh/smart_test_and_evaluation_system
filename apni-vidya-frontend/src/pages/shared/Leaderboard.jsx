import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GET } from '../../utils/api';
import { AwardIcon, UsersIcon, CheckCircleIcon } from '../../components/common/Icons';
import { LeaderboardView } from '../../components/common/LeaderboardView';

export function Leaderboard() {
  const { institute } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('all'); // 'all' for institute-wide
  const [batchLeaderboard, setBatchLeaderboard] = useState([]);
  const [loadingBatchLb, setLoadingBatchLb] = useState(false);

  const [tab, setTab] = useState('scores');

  useEffect(() => {
    if (!institute) return;
    
    // Load institute leaderboard
    setLoading(true);
    GET(`/leaderboard/${institute.id}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
      
    // Load batches for dropdown
    GET(`/batches/all/${institute.id}`)
      .then(res => setBatches(res || []))
      .catch(() => {});
  }, [institute]);

  useEffect(() => {
    if (selectedBatch === 'all') return;
    setLoadingBatchLb(true);
    GET(`/leaderboard/batch/${selectedBatch}`)
      .then(res => setBatchLeaderboard(res || []))
      .catch(() => {})
      .finally(() => setLoadingBatchLb(false));
  }, [selectedBatch]);

  if (!institute) {
    return (
      <div className="empty">
        <h1 className="h1">Institute Required</h1>
        <p className="muted">Please join an institute to view the leaderboard.</p>
      </div>
    );
  }

  if (loading && selectedBatch === 'all') {
    return (
      <div className="g3">
        <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
      </div>
    );
  }

  const formatInstituteData = (rawData, type) => {
    if (!rawData) return [];
    return rawData.map((s, idx) => ({
      ...s,
      rank: idx + 1,
      score_display: type === 'scores' ? `${s.avg_score}%` : `${s.attendance_pct}%`,
      subtext: s.batch_name
    }));
  };

  const currentInstituteData = data ? (tab === 'scores' ? formatInstituteData(data.top_scorers, 'scores') : formatInstituteData(data.top_attendance, 'attendance')) : [];

  return (
    <div className="animate-fade-in" style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="h1">{selectedBatch === 'all' ? 'Institute Leaderboard' : 'Batch Leaderboard'}</h1>
          <p className="page-subtitle">Top performers and most consistent students</p>
        </div>
        <div>
          <select 
            className="inp" 
            style={{ width: 250 }} 
            value={selectedBatch} 
            onChange={e => setSelectedBatch(e.target.value)}
          >
            <option value="all">Institute Overall (All Batches)</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab${tab === 'scores' ? ' active' : ''}`} onClick={() => setTab('scores')}>Top Scorers</button>
        <button className={`tab${tab === 'attendance' ? ' active' : ''}`} onClick={() => setTab('attendance')}>Top Attendance</button>
      </div>

      {selectedBatch === 'all' ? (
        <LeaderboardView data={currentInstituteData} loading={loading} />
      ) : (
        <LeaderboardView 
          data={batchLeaderboard ? (tab === 'scores' ? batchLeaderboard.top_scorers?.map(s => ({...s, score_display: `${s.total_score} pts`, subtext: `${s.tests_taken} test${s.tests_taken !== 1 ? 's' : ''} taken`})) : batchLeaderboard.top_attendance?.map(s => ({...s, score_display: `${s.attendance_pct}%`, subtext: 'Attendance Rate'}))) : []} 
          loading={loadingBatchLb} 
        />
      )}
    </div>
  );
}
