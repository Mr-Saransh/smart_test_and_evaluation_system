import React from 'react';
import './Input.css';

export function Input({ label, error, className = '', ...props }) {
  return (
    <div className={`input-group ${className}`}>
      {label && <label className="input-label">{label}</label>}
      <input 
        className={`input-field ${error ? 'input-error' : ''}`} 
        {...props} 
      />
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
}

export function Select({ label, error, className = '', children, ...props }) {
  return (
    <div className={`input-group ${className}`}>
      {label && <label className="input-label">{label}</label>}
      <select 
        className={`input-field input-select ${error ? 'input-error' : ''}`} 
        {...props}
      >
        {children}
      </select>
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
}
