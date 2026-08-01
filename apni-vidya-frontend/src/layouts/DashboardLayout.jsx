import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCapIcon, LogOutIcon, CloseIcon, SearchIcon, BellIcon } from '../components/common/Icons';
import { NAV_ITEMS, ROLE_LABELS, MOBILE_NAV, ROLE_HOME } from '../utils/constants';
import { getInitials } from '../utils/helpers';

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');

  const role = user?.role;
  const navItems = NAV_ITEMS[role] || [];
  const roleLabel = ROLE_LABELS[role] || 'Portal';
  const initials = getInitials(user?.full_name);
  const mobileNavIds = MOBILE_NAV[role] || [];

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : '');
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const isActive = (path) => {
    if (path === (ROLE_HOME[role] || '/admin')) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="sidebar-logo">
              <div className="sidebar-logo-icon">
                <GraduationCapIcon size={20} color="#fff" />
              </div>
              <div>
                <div className="sidebar-logo-text">Apni Vidya</div>
                <div className="sidebar-logo-sub">{roleLabel}</div>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4, display: sidebarOpen ? 'flex' : 'none' }}
              aria-label="Close menu"
            >
              <CloseIcon size={20} color="#94a3b8" />
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`sb-item${isActive(item.path) ? ' active' : ''}`}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div style={{ overflow: 'hidden' }}>
              <div className="sidebar-user-name">{user?.full_name}</div>
              <div className="sidebar-user-role">{roleLabel}</div>
            </div>
          </div>
          <button className="btn bs bsm" style={{ width: '100%', justifyContent: 'center', background: '#1e293b', color: '#f8fafc', borderColor: '#334155' }} onClick={handleLogout}>
            <LogOutIcon size={14} color="#94a3b8" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      <div className={`backdrop${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="main-content-area">
        {/* Desktop Top Nav */}
        <header className="topnav">
          <div className="topnav-left">
            <div className="search-bar">
              <SearchIcon size={16} color="var(--text-tertiary)" />
              <input className="search-inp" placeholder="Search..." />
            </div>
          </div>
          <div className="topnav-right">
            <button className="btn-icon" onClick={toggleDark} title="Toggle dark mode" style={{ fontSize: 16 }}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button className="btn-icon" title="Notifications">
              <BellIcon size={18} />
            </button>
            <div className="fx" style={{ gap: 8, cursor: 'pointer' }} onClick={() => navigate(navItems.find(n => n.id === 'profile' || n.id === 'settings')?.path || '#')}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--color-primary-light)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                {initials}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>{user?.full_name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{roleLabel}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Top Bar */}
        <div className="topbar-mobile">
          <div className="fx" style={{ gap: 10 }}>
            <button className="hamb" onClick={() => setSidebarOpen(true)} aria-label="Menu">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div className="fx" style={{ gap: 6 }}>
              <GraduationCapIcon size={20} color="var(--color-primary)" />
              <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em' }}>Apni Vidya</span>
            </div>
          </div>
          <div className="fx" style={{ gap: 8 }}>
            <button className="btn-icon" onClick={toggleDark} style={{ width: 34, height: 34, fontSize: 14 }}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              {initials}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="page-content">
          <Outlet />
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="mobile-bottom-nav">
          {navItems.filter(n => mobileNavIds.includes(n.id)).slice(0, 5).map(item => {
            const active = isActive(item.path);
            return (
              <button
                key={item.id}
                className={`bottom-nav-item${active ? ' active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <item.icon size={22} color={active ? 'var(--color-primary)' : 'var(--text-muted)'} />
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
