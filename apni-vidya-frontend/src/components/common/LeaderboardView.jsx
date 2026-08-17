import React from 'react';
import './LeaderboardView.css';
import { EmptyState } from './EmptyState';
import { TrophyIcon } from './Icons';

export function LeaderboardView({ data = [], loading = false }) {
  if (loading) {
    return (
      <div className="fx-c" style={{ padding: '2rem' }}>
        <div className="spinner"></div>
        <p className="muted" style={{ marginTop: 12 }}>Calculating rankings...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState 
        icon={<TrophyIcon size={48} />}
        title="No Leaderboard Data"
        desc="No tests have been completed by this batch yet."
      />
    );
  }

  // Sort by rank just in case
  const sorted = [...data].sort((a, b) => a.rank - b.rank);
  
  // Extract top 3
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  // We want to display the podium in order: 2nd, 1st, 3rd
  const rank1 = top3.find(s => s.rank === 1);
  const rank2 = top3.find(s => s.rank === 2);
  const rank3 = top3.find(s => s.rank === 3);

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
  };

  const renderPodiumItem = (student, rankClass) => {
    if (!student) return <div className={`podium-item ${rankClass}`} style={{ opacity: 0 }}></div>;
    
    return (
      <div className={`podium-item ${rankClass}`}>
        <div className="podium-avatar">
          {getInitials(student.full_name)}
        </div>
        <div className="podium-name" title={student.full_name}>{student.full_name}</div>
        <div className="podium-score">
          {student.score_display || `${student.total_score} pts`}
        </div>
        <div className="podium-base">
          {student.rank}
        </div>
      </div>
    );
  };

  return (
    <div className="leaderboard-container">
      {/* Podium */}
      {top3.length > 0 && (
        <div className="podium-container">
          {renderPodiumItem(rank2 || (top3.length > 1 ? top3[1] : null), 'rank-2')}
          {renderPodiumItem(rank1 || top3[0], 'rank-1')}
          {renderPodiumItem(rank3 || (top3.length > 2 ? top3[2] : null), 'rank-3')}
        </div>
      )}

      {/* List */}
      {rest.length > 0 && (
        <div className="leaderboard-list">
          {rest.map((student, i) => (
            <div 
              key={student.student_id} 
              className="leaderboard-row"
              style={{ animationDelay: `${0.1 * (i + 1)}s` }}
            >
              <div className="row-left">
                <div className="row-rank">#{student.rank}</div>
                <div className="row-avatar">
                  {getInitials(student.full_name)}
                </div>
                <div className="row-info">
                  <span className="row-name">{student.full_name}</span>
                  <span className="row-tests">
                    {student.subtext || `${student.tests_taken} test${student.tests_taken !== 1 ? 's' : ''} taken`}
                  </span>
                </div>
              </div>
              <div className="row-score">
                {student.score_display || `${student.total_score} pts`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
