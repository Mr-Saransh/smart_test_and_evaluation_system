import React from "react";
import { CpuIcon, AlertTriangleIcon, CheckCircleIcon } from "../common/Icons";

export function AIInsightCard({ strengths = [], weaknesses = [], summary }) {
  return (
    <div className="card" style={{ border: "1.5px solid #2563EB", background: "#EFF6FF" }}>
      <div className="fx" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <div className="fx" style={{ gap: 10 }}>
          <CpuIcon size={22} color="#2563EB" />
          <h3 className="h2" style={{ marginBottom: 0, color: "#1E40AF" }}>AI Diagnostic Improvement Plan</h3>
        </div>
        <span className="badge" style={{ background: "#2563EB", color: "#FFFFFF" }}>Automated Insights</span>
      </div>
      {summary && <p style={{ fontSize: 13.5, color: "#1E3A8A", lineHeight: 1.6, marginBottom: 14 }}>{summary}</p>}
      <div style={{ display: "grid", gap: 10 }}>
        {weaknesses.length > 0 ? (
          weaknesses.map((w, idx) => (
            <div key={idx} className="fx" style={{ gap: 10, background: "#FFFFFF", padding: "10px 14px", borderRadius: 10, border: "1px solid #DBEAFE" }}>
              <AlertTriangleIcon size={18} color="#EF4444" />
              <div style={{ fontSize: 13, color: "#0F172A" }}>
                <strong>Priority Focus Area:</strong> Review <strong>{w.topic || w}</strong> ({w.accuracy ? `accuracy: ${w.accuracy}%` : "Needs practice"}).
              </div>
            </div>
          ))
        ) : (
          <div className="fx" style={{ gap: 10, background: "#FFFFFF", padding: "10px 14px", borderRadius: 10, border: "1px solid #DBEAFE" }}>
            <CheckCircleIcon size={18} color="#10B981" />
            <div style={{ fontSize: 13, color: "#0F172A" }}>
              <strong>Great Performance:</strong> High accuracy maintained across evaluated topics.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
