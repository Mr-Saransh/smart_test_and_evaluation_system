import React from "react";
import { ClockIcon } from "../common/Icons";

export function ScheduleCard({ subject, batch, time, room, studentCount, onAction }) {
  return (
    <div className="fx" style={{ justifyContent: "space-between", padding: "12px 14px", borderRadius: 10, background: "#F8FAFC", border: "1px solid #E5E7EB", marginBottom: 8 }}>
      <div className="fx" style={{ gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 8, background: "#EFF6FF", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ClockIcon size={18} color="#2563EB" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{subject}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {batch} · {time} {room ? `· Room: ${room}` : ""} {studentCount ? `(${studentCount} Students)` : ""}
          </div>
        </div>
      </div>
      {onAction && (
        <button className="btn bp bsm" onClick={onAction}>
          Mark Roll Call
        </button>
      )}
    </div>
  );
}
