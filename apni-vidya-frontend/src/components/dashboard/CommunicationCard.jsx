import React from "react";
import { MegaphoneIcon } from "../common/Icons";

export function CommunicationCard({ title, audience, body, date }) {
  return (
    <div className="card" style={{ marginBottom: 12, padding: "14px 16px" }}>
      <div className="fx" style={{ justifyContent: "space-between", marginBottom: 6 }}>
        <div className="fx" style={{ gap: 8 }}>
          <MegaphoneIcon size={18} color="#2563EB" />
          <span style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{title}</span>
        </div>
        {audience && <span className="badge" style={{ background: "#EFF6FF", color: "#2563EB" }}>{audience}</span>}
      </div>
      <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 4 }}>{body}</p>
      {date && <div className="muted" style={{ fontSize: 11, textAlign: "right" }}>{date}</div>}
    </div>
  );
}
