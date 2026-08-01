import React from "react";
import { GraduationCapIcon, CloseIcon } from "../common/Icons";

export function Sidebar({ items = [], view, setView, mobileOpen, setMobileOpen, roleLabel }) {
  return (
    <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
      <div
        style={{
          padding: "18px 20px",
          borderBottom: "1px solid #1E293B",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div className="fx" style={{ gap: 12 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
            }}
          >
            <GraduationCapIcon size={20} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#FFFFFF", letterSpacing: "-0.01em" }}>
              Apni Vidya
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "#94A3B8",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginTop: 1,
              }}
            >
              {roleLabel || "Education ERP"}
            </div>
          </div>
        </div>

        {setMobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            style={{
              background: "transparent",
              border: "none",
              color: "#94A3B8",
              cursor: "pointer",
              padding: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Close menu"
          >
            <CloseIcon size={20} color="#94A3B8" />
          </button>
        )}
      </div>

      <div
        style={{
          flex: 1,
          padding: "14px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          overflowY: "auto",
        }}
      >
        {items.map((it) => {
          const act = view === it.id;
          return (
            <button
              key={it.id}
              className={`sb-item ${act ? "active" : ""}`}
              onClick={() => {
                setView(it.id);
                if (setMobileOpen) setMobileOpen(false);
              }}
              style={{
                padding: "10px 14px",
                minHeight: 44,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13.5,
                fontWeight: act ? 600 : 500,
                color: act ? "#FFFFFF" : "#94A3B8",
                background: act ? "#2563EB" : "transparent",
                border: "none",
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              {it.icon && <span style={{ display: "inline-flex", alignItems: "center" }}>{it.icon}</span>}
              <span>{it.l || it.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default Sidebar;
