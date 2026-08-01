import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export function DashboardLayout({ children, items, view, setView, user, logout, roleLabel }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        items={items}
        view={view}
        setView={setView}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        roleLabel={roleLabel}
      />
      <div className="main-viewport">
        <Navbar
          user={user}
          logout={logout}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          roleLabel={roleLabel}
        />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
export default DashboardLayout;
