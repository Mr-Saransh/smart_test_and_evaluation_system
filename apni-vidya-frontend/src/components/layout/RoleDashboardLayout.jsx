import React from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { MobileBottomNavigation } from "./MobileBottomNavigation";

export function RoleDashboardLayout({ user, view, setView, logout, children, roleLabel }) {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#F8FAFC", minHeight: "100vh", color: "#0F172A" }}>
      <Sidebar view={view} setView={setView} user={user} logout={logout} roleLabel={roleLabel} />
      <div className="content">
        <Navbar user={user} view={view} />
        <main className="main-body">
          {children}
        </main>
        <MobileBottomNavigation view={view} setView={setView} role={user?.role} />
      </div>
    </div>
  );
}
