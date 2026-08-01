import React, { useState, useEffect } from 'react';
import { GET } from '../../utils/api';
import { SkeletonTable } from '../../components/common/Skeleton';
import { BuildingIcon, UsersIcon, FileTextIcon } from '../../components/common/Icons';

export function Overview() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    GET('/superadmin/metrics').then(setMetrics).catch(() => {});
  }, []);

  if (!metrics) return <div style={{ padding: 20 }}><SkeletonTable /></div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="h1">Super Admin Dashboard</h1>
        <p className="page-subtitle">Platform-wide overview and metrics</p>
      </div>
      
      <div className="g3" style={{ marginBottom: 32 }}>
        <div className="card sc">
          <div className="fx" style={{ gap: 12, marginBottom: 8 }}>
            <BuildingIcon />
            <div className="muted" style={{ fontWeight: 600 }}>Total Institutes</div>
          </div>
          <div className="sn">{metrics.institutes}</div>
        </div>
        <div className="card sc">
          <div className="fx" style={{ gap: 12, marginBottom: 8 }}>
            <UsersIcon />
            <div className="muted" style={{ fontWeight: 600 }}>Total Students</div>
          </div>
          <div className="sn">{metrics.students}</div>
        </div>
        <div className="card sc">
          <div className="fx" style={{ gap: 12, marginBottom: 8 }}>
            <FileTextIcon />
            <div className="muted" style={{ fontWeight: 600 }}>Active Tests</div>
          </div>
          <div className="sn">{metrics.activeTests}</div>
        </div>
      </div>
    </div>
  );
}
