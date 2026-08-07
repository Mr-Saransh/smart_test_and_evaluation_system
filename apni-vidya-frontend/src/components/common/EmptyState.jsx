import React from 'react';

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, illustration = '/empty_state.png' }) {
  return (
    <div className="empty animate-fade-in" style={{ padding: '48px 24px', textAlign: 'center' }}>
      {illustration ? (
        <img 
          src={illustration} 
          alt="Empty state" 
          style={{ width: 140, height: 140, objectFit: 'contain', margin: '0 auto 24px', filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.05))', opacity: 0.9 }} 
        />
      ) : Icon ? (
        <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-lg)', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Icon size={32} color="var(--text-tertiary)" />
        </div>
      ) : null}
      
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>{title}</h3>
      {description && <p className="muted" style={{ fontSize: '0.875rem', maxWidth: 400, margin: '0 auto', marginBottom: actionLabel ? 24 : 0 }}>{description}</p>}
      
      {actionLabel && onAction && (
        <button className="btn bp" style={{ marginTop: 24, margin: '0 auto' }} onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
