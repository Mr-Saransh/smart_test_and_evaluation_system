import React, { useState, useEffect, useMemo } from 'react';
import { GET, PUT, toast } from '../../utils/api';
import { SkeletonTable } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { 
  BuildingIcon, UsersIcon, UserCheckIcon, SearchIcon, 
  ShieldIcon 
} from '../../components/common/Icons';
import { formatDate } from '../../utils/helpers';
import './UserMonitor.css';

const ROLE_CONFIG = {
  all: { label: 'All Users', icon: '👥' },
  institute_admin: { label: 'Institutes', icon: '🏛️', color: 'inst', badge: 'Institute Admin' },
  student: { label: 'Students', icon: '🎓', color: 'stu', badge: 'Student' },
  teacher: { label: 'Teachers', icon: '👨‍🏫', color: 'tea', badge: 'Teacher' },
  parent: { label: 'Parents', icon: '👨‍👩‍👧', color: 'par', badge: 'Parent' },
  super_admin: { label: 'Super Admin', icon: '👑', color: 'super', badge: 'Master Admin' }
};

export function Overview() {
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [m, u] = await Promise.all([
        GET('/superadmin/metrics'),
        GET('/superadmin/users')
      ]);
      setMetrics(m);
      setUsers(u || []);
    } catch (err) {
      console.error('Failed to load superadmin monitor data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (user) => {
    const nextStatus = !user.is_active;
    setTogglingId(user.id);
    try {
      await PUT(`/superadmin/users/${user.id}/status`, { is_active: nextStatus });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: nextStatus } : u));
      if (selectedUser && selectedUser.id === user.id) {
        setSelectedUser(prev => ({ ...prev, is_active: nextStatus }));
      }
      toast(nextStatus ? 'User account activated' : 'User account deactivated', 'success');
    } catch (err) {
      toast(err.message || 'Failed to update user status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  // Filtered list based on role tab, search text, and status filter
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Role filter
      if (activeTab !== 'all' && user.role !== activeTab) {
        return false;
      }
      // Status filter
      if (statusFilter === 'active' && !user.is_active) return false;
      if (statusFilter === 'inactive' && user.is_active) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = user.full_name?.toLowerCase().includes(q);
        const matchPhone = user.phone?.toLowerCase().includes(q);
        const matchEmail = user.email?.toLowerCase().includes(q);
        const matchInst = user.institute_name?.toLowerCase().includes(q);
        const matchBatch = user.batch_name?.toLowerCase().includes(q);
        const matchRoll = user.roll_number?.toLowerCase().includes(q);
        const matchSub = user.subject?.toLowerCase().includes(q);
        const matchParent = user.parent_name?.toLowerCase().includes(q);
        const matchChildren = user.children_names?.toLowerCase().includes(q);
        return matchName || matchPhone || matchEmail || matchInst || matchBatch || matchRoll || matchSub || matchParent || matchChildren;
      }
      return true;
    });
  }, [users, activeTab, statusFilter, searchQuery]);

  // Count per role
  const counts = useMemo(() => {
    const res = { all: users.length, institute_admin: 0, student: 0, teacher: 0, parent: 0 };
    users.forEach(u => {
      if (res[u.role] !== undefined) res[u.role]++;
    });
    return res;
  }, [users]);

  // Export filtered users to CSV
  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      toast('No data to export', 'error');
      return;
    }
    const headers = ['User ID', 'Full Name', 'Role', 'Phone', 'Email', 'Affiliation / Institute', 'Details', 'Status', 'Registered At'];
    const rows = filteredUsers.map(u => [
      u.id,
      `"${(u.full_name || '').replace(/"/g, '""')}"`,
      u.role,
      `"${u.phone || ''}"`,
      `"${u.email || ''}"`,
      `"${(u.institute_name || '').replace(/"/g, '""')}"`,
      `"${(u.roll_number ? `Roll: ${u.roll_number} ` : '') + (u.batch_name ? `Batch: ${u.batch_name} ` : '') + (u.subject ? `Subject: ${u.subject} ` : '') + (u.children_names ? `Child: ${u.children_names}` : '')}".trim()`,
      u.is_active ? 'Active' : 'Inactive',
      u.created_at ? new Date(u.created_at).toISOString().slice(0, 10) : ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ApniVidya_Monitored_Users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Exported monitored users to CSV', 'success');
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast(`Copied ${label} to clipboard`, 'success');
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <SkeletonTable />
      </div>
    );
  }

  return (
    <div className="monitor-container animate-fade-in">
      {/* Top Header */}
      <div className="monitor-header-row">
        <div>
          <h1 className="h1" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            System User Monitor
            <span className="badge" style={{ background: '#ede9fe', color: '#5b21b6', fontSize: 12 }}>
              Master Admin
            </span>
          </h1>
          <p className="page-subtitle">
            Surveillance and account management for Institutes, Students, Teachers, and Parents.
          </p>
          <div className="monitor-live-pill">
            <span className="pulse-beacon" />
            Live Sync • {users.length} Total Users Monitored
          </div>
        </div>

        <div className="monitor-header-actions">
          <button 
            type="button"
            className="btn bd bsm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            title="Refresh database records"
          >
            {refreshing ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <button 
            type="button"
            className="btn btn-p bsm"
            onClick={handleExportCSV}
            title="Download CSV report"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="monitor-metrics-grid">
        <div 
          className={`monitor-metric-card ${activeTab === 'institute_admin' ? 'active-card' : ''}`}
          onClick={() => setActiveTab('institute_admin')}
        >
          <div className="metric-card-top">
            <div className="metric-label">Institutes</div>
            <div className="metric-icon-wrap metric-icon-inst">🏛️</div>
          </div>
          <div className="metric-number">{metrics?.institutes ?? counts.institute_admin}</div>
          <div className="metric-sub">Coaching centers & schools</div>
        </div>

        <div 
          className={`monitor-metric-card ${activeTab === 'student' ? 'active-card' : ''}`}
          onClick={() => setActiveTab('student')}
        >
          <div className="metric-card-top">
            <div className="metric-label">Students</div>
            <div className="metric-icon-wrap metric-icon-stu">🎓</div>
          </div>
          <div className="metric-number">{metrics?.students ?? counts.student}</div>
          <div className="metric-sub">Enrolled learners</div>
        </div>

        <div 
          className={`monitor-metric-card ${activeTab === 'teacher' ? 'active-card' : ''}`}
          onClick={() => setActiveTab('teacher')}
        >
          <div className="metric-card-top">
            <div className="metric-label">Teachers</div>
            <div className="metric-icon-wrap metric-icon-tea">👨‍🏫</div>
          </div>
          <div className="metric-number">{metrics?.teachers ?? counts.teacher}</div>
          <div className="metric-sub">Subject instructors</div>
        </div>

        <div 
          className={`monitor-metric-card ${activeTab === 'parent' ? 'active-card' : ''}`}
          onClick={() => setActiveTab('parent')}
        >
          <div className="metric-card-top">
            <div className="metric-label">Parents</div>
            <div className="metric-icon-wrap metric-icon-par">👨‍👩‍👧</div>
          </div>
          <div className="metric-number">{metrics?.parents ?? counts.parent}</div>
          <div className="metric-sub">Linked guardians</div>
        </div>

        <div 
          className={`monitor-metric-card ${activeTab === 'all' ? 'active-card' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <div className="metric-card-top">
            <div className="metric-label">Total Accounts</div>
            <div className="metric-icon-wrap metric-icon-all">👥</div>
          </div>
          <div className="metric-number">{metrics?.totalUsers ?? users.length}</div>
          <div className="metric-sub">Across all user types</div>
        </div>
      </div>

      {/* Tabs and Filtering Controls */}
      <div className="monitor-controls-card">
        {/* Role Tabs */}
        <div className="monitor-tabs-row">
          <button
            type="button"
            className={`monitor-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span>👥 All Users</span>
            <span className="tab-badge">{counts.all}</span>
          </button>
          <button
            type="button"
            className={`monitor-tab-btn ${activeTab === 'institute_admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('institute_admin')}
          >
            <span>🏛️ Institutes</span>
            <span className="tab-badge">{counts.institute_admin}</span>
          </button>
          <button
            type="button"
            className={`monitor-tab-btn ${activeTab === 'student' ? 'active' : ''}`}
            onClick={() => setActiveTab('student')}
          >
            <span>🎓 Students</span>
            <span className="tab-badge">{counts.student}</span>
          </button>
          <button
            type="button"
            className={`monitor-tab-btn ${activeTab === 'teacher' ? 'active' : ''}`}
            onClick={() => setActiveTab('teacher')}
          >
            <span>👨‍🏫 Teachers</span>
            <span className="tab-badge">{counts.teacher}</span>
          </button>
          <button
            type="button"
            className={`monitor-tab-btn ${activeTab === 'parent' ? 'active' : ''}`}
            onClick={() => setActiveTab('parent')}
          >
            <span>👨‍👩‍👧 Parents</span>
            <span className="tab-badge">{counts.parent}</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="monitor-filters-row">
          <div className="monitor-search-wrap">
            <span className="search-icon-left">
              <SearchIcon size={16} />
            </span>
            <input
              type="text"
              className="monitor-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, email, institute, roll no, batch, or subject..."
            />
            {searchQuery && (
              <button 
                type="button" 
                className="search-clear-btn" 
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              className="monitor-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <span className="muted" style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
              Showing {filteredUsers.length} of {users.length}
            </span>
          </div>
        </div>
      </div>

      {/* Monitored Users Table */}
      <div className="monitor-table-card card" style={{ padding: 0 }}>
        <div className="tblwrap">
          {filteredUsers.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="No Users Found"
              message={searchQuery ? 'No accounts matched your search terms.' : 'No users registered under this category.'}
            />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>User Details</th>
                  <th style={{ minWidth: 130 }}>Role</th>
                  <th style={{ minWidth: 200 }}>Contact Info</th>
                  <th style={{ minWidth: 220 }}>Affiliation & Details</th>
                  <th style={{ minWidth: 120 }}>Status</th>
                  <th style={{ minWidth: 120, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const roleCfg = ROLE_CONFIG[u.role] || { color: 'inst', badge: u.role };
                  const initial = (u.full_name || 'U').charAt(0).toUpperCase();

                  return (
                    <tr key={u.id}>
                      {/* User Column */}
                      <td>
                        <div className="user-avatar-cell">
                          <div className={`user-avatar-circle avatar-${roleCfg.color}`}>
                            {initial}
                          </div>
                          <div>
                            <div className="user-name-text">{u.full_name || 'Unnamed User'}</div>
                            <div className="user-id-sub" title={u.id}>
                              ID: {u.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td>
                        <span className={`role-pill role-pill-${u.role}`}>
                          {roleCfg.icon} {roleCfg.badge}
                        </span>
                      </td>

                      {/* Contact Column */}
                      <td>
                        <div className="contact-row">
                          <span>📞</span>
                          <a href={`tel:${u.phone}`} className="contact-link">
                            {u.phone || 'No phone'}
                          </a>
                          {u.phone && (
                            <button 
                              type="button" 
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: 0, opacity: 0.7 }}
                              onClick={() => copyToClipboard(u.phone, 'phone')}
                              title="Copy phone"
                            >
                              📋
                            </button>
                          )}
                        </div>
                        {u.email && (
                          <div className="contact-row">
                            <span>✉️</span>
                            <a href={`mailto:${u.email}`} className="contact-link" style={{ fontSize: 12 }}>
                              {u.email}
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Affiliation & Details Column */}
                      <td>
                        {u.institute_name && (
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                            🏛️ {u.institute_name}
                          </div>
                        )}

                        {/* Student Specifics */}
                        {u.role === 'student' && (
                          <div style={{ marginTop: 2 }}>
                            {u.batch_name && (
                              <span className="tag-badge tag-badge-accent">
                                📚 {u.batch_name}
                              </span>
                            )}
                            {u.roll_number && (
                              <span className="tag-badge">
                                Roll: {u.roll_number}
                              </span>
                            )}
                            {u.parent_name && (
                              <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                                Guardian: {u.parent_name} {u.parent_phone ? `(${u.parent_phone})` : ''}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Teacher Specifics */}
                        {u.role === 'teacher' && (
                          <div style={{ marginTop: 2 }}>
                            {u.subject && (
                              <span className="tag-badge tag-badge-accent">
                                🔬 Subject: {u.subject}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Institute Admin Specifics */}
                        {u.role === 'institute_admin' && (
                          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                            📍 {u.city ? `${u.city}, ${u.state || ''}` : 'Location pending'}
                          </div>
                        )}

                        {/* Parent Specifics */}
                        {u.role === 'parent' && (
                          <div style={{ marginTop: 2 }}>
                            {u.children_names ? (
                              <span className="tag-badge tag-badge-accent">
                                👶 Child: {u.children_names}
                              </span>
                            ) : (
                              <span className="muted" style={{ fontSize: 12 }}>No linked student</span>
                            )}
                          </div>
                        )}

                        {!u.institute_name && !u.batch_name && !u.subject && !u.children_names && (
                          <span className="muted" style={{ fontSize: 12 }}>Platform account</span>
                        )}
                      </td>

                      {/* Status Column */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className={`status-pill ${u.is_active ? 'status-active' : 'status-inactive'}`}>
                            <span className="status-dot" />
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            type="button"
                            className="btn bd bsm"
                            onClick={() => setSelectedUser(u)}
                            title="Inspect full details"
                          >
                            👁️ Inspect
                          </button>
                          <button
                            type="button"
                            className="btn bd bsm"
                            style={{
                              borderColor: u.is_active ? '#fca5a5' : '#86efac',
                              color: u.is_active ? '#dc2626' : '#16a34a'
                            }}
                            disabled={togglingId === u.id}
                            onClick={() => handleToggleStatus(u)}
                            title={u.is_active ? 'Deactivate account' : 'Activate account'}
                          >
                            {togglingId === u.id ? '...' : (u.is_active ? 'Disable' : 'Enable')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      <Modal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title="User Account Details"
        maxWidth={580}
      >
        {selectedUser && (
          <div>
            {/* Header Banner */}
            <div className="user-detail-header">
              <div className={`user-detail-avatar avatar-${ROLE_CONFIG[selectedUser.role]?.color || 'inst'}`}>
                {(selectedUser.full_name || 'U').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                  {selectedUser.full_name || 'Unnamed User'}
                </h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                  <span className={`role-pill role-pill-${selectedUser.role}`}>
                    {ROLE_CONFIG[selectedUser.role]?.icon} {ROLE_CONFIG[selectedUser.role]?.badge}
                  </span>
                  <span className={`status-pill ${selectedUser.is_active ? 'status-active' : 'status-inactive'}`}>
                    <span className="status-dot" />
                    {selectedUser.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="detail-section">
              <div className="detail-section-title">Contact Information</div>
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-item-label">Mobile Number</div>
                  <div className="detail-item-value">
                    {selectedUser.phone ? (
                      <a href={`tel:${selectedUser.phone}`} style={{ color: '#4f46e5' }}>
                        {selectedUser.phone}
                      </a>
                    ) : 'Not provided'}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">Email Address</div>
                  <div className="detail-item-value">
                    {selectedUser.email ? (
                      <a href={`mailto:${selectedUser.email}`} style={{ color: '#4f46e5' }}>
                        {selectedUser.email}
                      </a>
                    ) : 'Not provided'}
                  </div>
                </div>
              </div>
            </div>

            {/* Affiliation & Academic Details */}
            <div className="detail-section">
              <div className="detail-section-title">Affiliation & Role Specifics</div>
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-item-label">Institute Name</div>
                  <div className="detail-item-value">{selectedUser.institute_name || 'None / Platform Admin'}</div>
                </div>

                {selectedUser.role === 'institute_admin' && (
                  <div className="detail-item">
                    <div className="detail-item-label">Center Location</div>
                    <div className="detail-item-value">
                      {selectedUser.city ? `${selectedUser.city}, ${selectedUser.state || ''}` : 'Not set'}
                    </div>
                  </div>
                )}

                {selectedUser.role === 'student' && (
                  <>
                    <div className="detail-item">
                      <div className="detail-item-label">Assigned Batch</div>
                      <div className="detail-item-value">{selectedUser.batch_name || 'Unassigned'}</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-item-label">Roll Number</div>
                      <div className="detail-item-value">{selectedUser.roll_number || 'None'}</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-item-label">Guardian / Parent</div>
                      <div className="detail-item-value">
                        {selectedUser.parent_name ? `${selectedUser.parent_name} (${selectedUser.parent_phone || 'No phone'})` : 'Not linked'}
                      </div>
                    </div>
                  </>
                )}

                {selectedUser.role === 'teacher' && (
                  <div className="detail-item">
                    <div className="detail-item-label">Subject Specialization</div>
                    <div className="detail-item-value">{selectedUser.subject || 'General Faculty'}</div>
                  </div>
                )}

                {selectedUser.role === 'parent' && (
                  <div className="detail-item">
                    <div className="detail-item-label">Linked Student(s)</div>
                    <div className="detail-item-value">{selectedUser.children_names || 'No child profile linked'}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata Section */}
            <div className="detail-section">
              <div className="detail-section-title">Account Metadata</div>
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-item-label">System User ID</div>
                  <div className="detail-item-value" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                    {selectedUser.id}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">Registration Date</div>
                  <div className="detail-item-value">
                    {selectedUser.created_at ? formatDate(selectedUser.created_at) : 'Unknown'}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Action Controls */}
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className={`btn ${selectedUser.is_active ? 'btn-danger' : 'btn-p'}`}
                style={{
                  background: selectedUser.is_active ? '#ef4444' : '#10b981',
                  borderColor: 'transparent',
                  color: '#fff'
                }}
                disabled={togglingId === selectedUser.id}
                onClick={() => handleToggleStatus(selectedUser)}
              >
                {togglingId === selectedUser.id ? 'Updating...' : (selectedUser.is_active ? '🚫 Deactivate Account' : '✅ Activate Account')}
              </button>

              <button
                type="button"
                className="btn bd"
                onClick={() => setSelectedUser(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Overview;
