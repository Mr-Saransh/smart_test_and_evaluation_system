import React from 'react';

export function Skeleton({ width = '100%', height = '20px', style = {} }) {
  return <div className="skeleton" style={{ width, height, ...style }} />;
}

export function SkeletonCard({ height = 100 }) {
  return <div className="skeleton" style={{ height, borderRadius: 12 }} />;
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div>
      <div className="skeleton" style={{ height: 40, borderRadius: 8, marginBottom: 8 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 48, borderRadius: 6, marginBottom: 6 }} />
      ))}
    </div>
  );
}
