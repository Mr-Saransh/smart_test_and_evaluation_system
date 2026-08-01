import React from "react";

export function AnalyticsChartCard({ title, items = [] }) {
  return (
    <div className="card">
      <h3 className="h2" style={{ marginBottom: 14 }}>{title}</h3>
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((item, idx) => (
          <div key={idx}>
            <div className="fx" style={{ justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: "#0F172A" }}>{item.label}</span>
              <span style={{ fontWeight: 700, color: item.color || "#2563EB" }}>{item.value}%</span>
            </div>
            <div className="pb" style={{ height: 8 }}>
              <div className="pbf" style={{ width: `${item.value}%`, background: item.color || "#2563EB" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
