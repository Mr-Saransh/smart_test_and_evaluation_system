import React from "react";
import { FileTextIcon, AwardIcon } from "../common/Icons";

export function TestResultCard({ title, subject, score, maxMarks, percentage, rank }) {
  const isHigh = percentage >= 70;
  return (
    <div className="card" style={{ padding: 18, marginBottom: 10 }}>
      <div className="fx" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <div className="fx" style={{ gap: 10 }}>
          <FileTextIcon size={20} color="#2563EB" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{title}</div>
            <div className="muted" style={{ fontSize: 12 }}>{subject || "General"}</div>
          </div>
        </div>
        {rank && (
          <span className="badge" style={{ background: "#EFF6FF", color: "#2563EB" }}>
            <AwardIcon size={14} color="#2563EB" style={{ marginRight: 4 }} />
            Rank #{rank}
          </span>
        )}
      </div>
      <div className="fx" style={{ justifyContent: "space-between", fontSize: 13, borderTop: "1px solid #F1F5F9", paddingTop: 8 }}>
        <span className="muted">Score: <strong>{score} / {maxMarks}</strong></span>
        <span style={{ fontWeight: 700, color: isHigh ? "#10B981" : "#F59E0B" }}>{percentage}% Accuracy</span>
      </div>
    </div>
  );
}
