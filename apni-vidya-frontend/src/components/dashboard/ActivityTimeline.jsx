import React from "react";

export function ActivityTimeline({ items = [] }) {
  return (
    <div style={{ display: "grid", gap: 18, position: "relative", paddingLeft: 14, borderLeft: "2px solid #E2E8F0" }}>
      {items.map((act, i) => (
        <div key={i} style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              left: -22,
              top: 2,
              background: "#fff",
              border: "2px solid var(--primary)",
              borderRadius: "50%",
              width: 14,
              height: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 8
            }}
          />
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 2 }}>{act.t}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>
            {act.icon} {act.d}
          </div>
        </div>
      ))}
    </div>
  );
}
export default ActivityTimeline;
