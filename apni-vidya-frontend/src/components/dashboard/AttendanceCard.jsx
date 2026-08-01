import React from "react";
import { ClipboardIcon } from "../common/Icons";

export function AttendanceCard({ pct = 0, presentDays = 0, totalDays = 0, onClick }) {
  const isGood = pct >= 75;
  const statusColor = isGood ? "#10B981" : "#EF4444";

  return (
    <div className="card" onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      <div className="fx" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Attendance Rate</div>
          <div className="sn" style={{ color: statusColor }}>{pct}%</div>
        </div>
        <div style={{ background: isGood ? "#ECFDF5" : "#FEF2F2", width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ClipboardIcon size={22} color={statusColor} />
        </div>
      </div>
      <div className="pb" style={{ marginBottom: 8, height: 8 }}>
        <div className="pbf" style={{ width: `${pct}%`, background: statusColor }} />
      </div>
      <div className="muted" style={{ fontSize: 12, fontWeight: 500 }}>
        Present for {presentDays} of {totalDays} session(s)
      </div>
    </div>
  );
}
