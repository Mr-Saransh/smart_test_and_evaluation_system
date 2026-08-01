import React from "react";
import { CurrencyIcon } from "../common/Icons";

export function FeeSummaryCard({ due = 0, paid = 0, total = 0, onPay }) {
  const isPaid = due <= 0;
  const fg = isPaid ? "#10B981" : "#EF4444";

  return (
    <div className="card">
      <div className="fx" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Fee Ledger Summary</div>
          <div className="sn" style={{ color: fg }}>{isPaid ? "Paid in Full" : `₹${due.toLocaleString()} Due`}</div>
        </div>
        <div style={{ background: isPaid ? "#ECFDF5" : "#FEF2F2", width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CurrencyIcon size={22} color={fg} />
        </div>
      </div>
      <div className="fx" style={{ justifyContent: "space-between", fontSize: 13, marginBottom: 12 }}>
        <span className="muted">Paid: <strong>₹{paid.toLocaleString()}</strong></span>
        <span className="muted">Total: <strong>₹{total.toLocaleString()}</strong></span>
      </div>
      {!isPaid && onPay && (
        <button className="btn bp bsm" style={{ width: "100%", justifyContent: "center" }} onClick={onPay}>
          Pay Outstanding Balance ₹{due.toLocaleString()}
        </button>
      )}
    </div>
  );
}
