import React from 'react';

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="empty animate-fade-in" style={{ padding: '32px 20px' }}>
      {Icon && (
        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Icon size={24} color="var(--text-tertiary)" />
        </div>
      )}
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{title}</h3>
      {description && <p className="muted" style={{ fontSize: 13, marginBottom: actionLabel ? 16 : 0 }}>{description}</p>}
      {actionLabel && onAction && (
        <button className="btn bp bsm" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
