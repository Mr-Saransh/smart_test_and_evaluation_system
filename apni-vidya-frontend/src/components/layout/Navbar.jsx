import React from "react";
import { GraduationCapIcon, LogOutIcon, FilterIcon } from "../common/Icons";

export function Navbar({ user, logout, mobileOpen, setMobileOpen, roleLabel }) {
  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "AV";

  return (
    <header className="topbar">
      <div className="fx" style={{ gap: 10 }}>
        <button
          className="hamb"
          aria-label="Toggle navigation menu"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }}
        >
          <FilterIcon size={18} color="#0F172A" />
        </button>
        <div className="fx" style={{ gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <GraduationCapIcon size={16} color="#FFFFFF" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, color: "#0F172A", letterSpacing: "-0.01em" }}>
            Apni Vidya
          </span>
        </div>
      </div>

      <div className="fx" style={{ gap: 8 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "#EFF6FF",
            color: "#2563EB",
            border: "1px solid #DBEAFE",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
          title={user?.full_name || "User"}
        >
          {initials}
        </div>
        <button
          className="btn bs bsm"
          onClick={logout}
          style={{ minHeight: 36, padding: "6px 10px", fontSize: 12 }}
          title="Sign Out"
        >
          <LogOutIcon size={14} color="#64748B" />
          <span className="desktop-only" style={{ marginLeft: 2 }}>Sign Out</span>
        </button>
      </div>
    </header>
  );
}

export default Navbar;
