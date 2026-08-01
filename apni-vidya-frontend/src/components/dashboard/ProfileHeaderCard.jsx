import React from "react";

export function ProfileHeaderCard({ name, subtitle, role, batch, phone, initials, actionButton }) {
  const displayInitials = initials || (name ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "AV");
  return (
    <div className="card" style={{ marginBottom: 24, background: "#0F172A", color: "#fff", padding: 24, border: "1px solid #1E293B" }}>
      <div className="fx" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
        <div className="fx" style={{ gap: 16 }}>
          <div style={{ width: 54, height: 54, borderRadius: 12, background: "#2563EB", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800 }}>
            {displayInitials}
          </div>
          <div>
            <h1 className="h1" style={{ color: "#fff", fontSize: 24, marginBottom: 2 }}>{name}</h1>
            <p style={{ color: "#94A3B8", fontWeight: 500, fontSize: 13.5 }}>
              {subtitle || `${batch || "Enrolled Batch"} ${phone ? `· Phone: ${phone}` : ""}`}
            </p>
          </div>
        </div>
        {actionButton}
      </div>
    </div>
  );
}
