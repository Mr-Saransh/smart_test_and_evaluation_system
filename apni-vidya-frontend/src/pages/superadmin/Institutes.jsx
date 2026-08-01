import React, { useState, useEffect } from 'react';
import { GET, PUT, toast } from '../../utils/api';
import { SkeletonTable } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { BuildingIcon } from '../../components/common/Icons';

export function Institutes() {
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    GET('/superadmin/institutes').then(setInstitutes).catch(() => {}).finally(() => setLoading(false));
  };
  
  useEffect(load, []);

  const toggleStatus = async (id, currentStatus) => {
    try {
      await PUT(`/superadmin/institutes/${id}/status`, { is_active: !currentStatus }, 'Institute status updated');
      load();
    } catch (e) {
      // toast already shown
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1 className="h1">Institutes</h1>
          <p className="page-subtitle">Manage all onboarded coaching institutes</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="tblwrap">
          {loading ? (
            <div style={{ padding: 20 }}><SkeletonTable /></div>
          ) : institutes.length === 0 ? (
            <EmptyState icon={BuildingIcon} title="No Institutes Found" />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Institute Name</th>
                  <th>Admin Contact</th>
                  <th>Stats</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {institutes.map(inst => (
                  <tr key={inst.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{inst.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{inst.city || 'No city'}, {inst.state || 'No state'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{inst.admin_name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{inst.admin_phone}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>
                        {inst.student_count} Students<br/>
                        {inst.teacher_count} Teachers
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: inst.is_active ? '#d1fae5' : '#fee2e2', color: inst.is_active ? '#059669' : '#dc2626' }}>
                        {inst.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td>
                      <button className="btn bd bsm" onClick={() => toggleStatus(inst.id, inst.is_active)}>
                        {inst.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
