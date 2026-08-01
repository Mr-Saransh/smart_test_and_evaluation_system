import React from 'react';
import './Table.css';

export function Table({ children, className = '' }) {
  return (
    <div className={`table-container ${className}`}>
      <table className="table">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }) {
  return <thead className="table-head">{children}</thead>;
}

export function TableBody({ children }) {
  return <tbody className="table-body">{children}</tbody>;
}

export function TableRow({ children, className = '', ...props }) {
  return <tr className={`table-row ${className}`} {...props}>{children}</tr>;
}

export function TableHeader({ children, className = '', ...props }) {
  return <th className={`table-header ${className}`} {...props}>{children}</th>;
}

export function TableCell({ children, className = '', ...props }) {
  return <td className={`table-cell ${className}`} {...props}>{children}</td>;
}
