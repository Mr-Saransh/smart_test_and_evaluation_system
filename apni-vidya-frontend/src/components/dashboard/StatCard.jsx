import React from "react";

export function StatCard({ label, value, icon, fg = "var(--primary)", trend, tc, onClick, style = {} }) {
  return (
    <div
      className="sc fx"
      onClick={onClick}
      style={{
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px 24px",
        cursor: onClick ? "pointer" : "default",
        ...style
      }}
    >
      <div>
        <div className="muted" style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
          {label}
        </div>
        <div className="sn" style={{ color: "#0F172A", marginBottom: 4 }}>
          {value}
        </div>
        {trend && <div style={{ fontSize: 11, fontWeight: 600, color: tc || fg }}>{trend}</div>}
      </div>
      {icon && (
        <div
          style={{
            fontSize: 22,
            background: `${fg}12`,
            color: fg,
            padding: 12,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48
          }}
        >
          {icon}
        </div>
      )}
    </div>
  );
}
export default StatCard;
