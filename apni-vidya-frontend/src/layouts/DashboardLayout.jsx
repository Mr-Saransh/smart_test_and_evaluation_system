import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCapIcon, LogOutIcon, SearchIcon, BellIcon } from '../components/common/Icons';
import { NAV_ITEMS, ROLE_LABELS, MOBILE_NAV, ROLE_HOME, flatNavItems } from '../utils/constants';
import { getInitials } from '../utils/helpers';
import './DashboardLayout.css';

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const [darkMode, setDarkMode] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const role = user?.role;
  const rawNavItems = NAV_ITEMS[role] || [];
  const isGrouped = rawNavItems.length > 0 && rawNavItems[0]?.items;
  const allFlatItems = flatNavItems(role);
  const roleLabel = ROLE_LABELS[role] || 'Portal';
  const initials = getInitials(user?.full_name);
  const mobileNavIds = MOBILE_NAV[role] || [];

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : '');
  };

  const toggleCollapse = () => {
    const val = !isCollapsed;
    setIsCollapsed(val);
    localStorage.setItem('sidebar_collapsed', val);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (path) => {
    if (path === (ROLE_HOME[role] || '/admin')) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  /* ─── Sidebar nav rendering ─── */
  const renderNavItems = (items) => items.map(item => (
    <button
      key={item.id}
      className={`sb-item${isActive(item.path) ? ' active' : ''}`}
      onClick={() => navigate(item.path)}
      title={item.label}
    >
      <item.icon size={17} />
      <span className="nav-label">{item.label}</span>
    </button>
  ));

  const renderGroupedNav = () => rawNavItems.map((section, idx) => (
    <div key={section.group || idx}>
      {section.group && (
        <div className="sidebar-group-label">{section.group}</div>
      )}
      {renderNavItems(section.items)}
    </div>
  ));

  const renderFlatNav = () => renderNavItems(rawNavItems);

  return (
    <div className="app-layout">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Desktop Sidebar / Mobile Slide-over */}
      <aside className={`sidebar${isCollapsed ? ' collapsed' : ''}${isMobileMenuOpen ? ' mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <GraduationCapIcon size={18} color="#fff" />
            </div>
            <div>
              <div className="sidebar-logo-text">Apni Vidya</div>
              <div className="sidebar-logo-sub">{roleLabel}</div>
            </div>
          </div>
          <button
            onClick={toggleCollapse}
            className="btn-icon desktop-collapse-btn"
            style={{ width: 28, height: 28 }}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isCollapsed ? <path d="M5 12h14M12 5l7 7-7 7" /> : <path d="M19 12H5M12 19l-7-7 7-7" />}
            </svg>
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="btn-icon mobile-close-btn"
            style={{ width: 28, height: 28 }}
            title="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          {isGrouped ? renderGroupedNav() : renderFlatNav()}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div style={{ overflow: 'hidden' }}>
              <div className="sidebar-user-name">{user?.full_name}</div>
              <div className="sidebar-user-role">{roleLabel}</div>
            </div>
          </div>
          <button className="btn w-full" style={{ background: 'rgba(255,255,255,.06)', color: '#CBD5E1', border: '1px solid rgba(255,255,255,.08)', justifyContent: 'center' }} onClick={handleLogout} title="Sign Out">
            <LogOutIcon size={14} color="#94A3B8" />
            <span className="logout-text">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`main-content-area${isCollapsed ? ' collapsed' : ''}`}>
        
        {/* Desktop Top Nav */}
        <header className="topnav">
          <div className="search-bar">
            <SearchIcon size={16} color="var(--text-tertiary)" />
            <input className="search-inp" placeholder="Search across workspace..." />
          </div>
          <div className="fx" style={{ gap: 14 }}>
            <button className="btn-icon" onClick={toggleDark} title="Toggle dark mode">
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button className="btn-icon" title="Notifications">
              <BellIcon size={18} />
            </button>
            <div className="fx" style={{ gap: 10, cursor: 'pointer' }} onClick={() => navigate(allFlatItems.find(n => n.id === 'profile' || n.id === 'settings')?.path || '#')}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>{user?.full_name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{roleLabel}</span>
              </div>
              <div className="sidebar-avatar" style={{ border: 'none', background: 'var(--gradient-brand)', color: 'white', width: 36, height: 36 }}>
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Header */}
        <div className="topbar-mobile">
          <div className="fx" style={{ gap: 10 }}>
            <button className="btn-icon" onClick={() => setIsMobileMenuOpen(true)} style={{ width: 36, height: 36 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div className="fx" style={{ gap: 8 }}>
              <div className="sidebar-logo-icon" style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)' }}>
                <GraduationCapIcon size={15} color="#fff" />
              </div>
              <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Apni Vidya</span>
            </div>
          </div>
          <div className="fx" style={{ gap: 10 }}>
            <button className="btn-icon" onClick={toggleDark} style={{ width: 32, height: 32 }}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div className="sidebar-avatar" style={{ width: 30, height: 30, fontSize: '0.7rem', border: 'none', background: 'var(--gradient-brand)', color: 'white' }}>
              {initials}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="page-content">
          <Outlet />
        </div>

        {/* Mobile Floating Bottom Nav */}
        <nav className="mobile-bottom-nav">
          {allFlatItems.filter(n => mobileNavIds.includes(n.id)).slice(0, 5).map(item => {
            const active = isActive(item.path);
            return (
              <button
                key={item.id}
                className={`bottom-nav-item${active ? ' active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <item.icon size={active ? 22 : 20} />
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
