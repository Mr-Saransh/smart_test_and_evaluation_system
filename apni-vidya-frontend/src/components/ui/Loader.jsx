import React from 'react';
import './Loader.css';

export function Loader({ size = 'md', center = false }) {
  const loader = <div className={`loader loader-${size}`}></div>;
  
  if (center) {
    return <div className="loader-container">{loader}</div>;
  }
  
  return loader;
}

export function PageLoader() {
  return (
    <div className="page-loader">
      <Loader size="lg" />
    </div>
  );
}
