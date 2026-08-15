import React, { useState, useEffect, useCallback } from 'react';
import { GET, POST, toast } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/common/EmptyState';
import { BellIcon } from '../../components/common/Icons';

function Bd({ bg, fg, children }) {
  return <span style={{ background: bg, color: fg, padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{children}</span>;
}

export function Notifications() {
  const { institute: inst } = useAuth();
  const [batches, sB] = useState([]);
  const [log, sL] = useState([]);
  const [busy, sBy] = useState("");
  const [f, sF] = useState({ channel: "whatsapp", batch_id: "", audience: "all", message: "" });
  
  const ld = useCallback(async () => {
    if (inst) sL(await GET(`/notifications/${inst.id}`).catch(() => []));
  }, [inst]);

  useEffect(() => {
    ld();
    if (inst) GET(`/batches/${inst.id}`).then(sB).catch(() => {});
  }, [ld, inst]);

  const send = async () => {
    if (!f.message.trim()) { toast("Message can't be empty"); return; }
    sBy("send");
    const r = await POST("/notifications/send", { institute_id: inst.id, batch_id: f.batch_id || null, audience: f.audience, channel: f.channel, message: f.message }).catch(() => null);
    sBy("");
    if (r) {
      toast(r.total ? `Sent to ${r.sent} of ${r.total} recipient(s) via ${r.provider}` : "No recipients matched", "success");
      sF({ ...f, message: "" });
      ld();
    }
  };

  const remind = async (kind) => {
    sBy(kind);
    const r = await POST(`/notifications/${kind}-reminders/${inst.id}`, { channel: f.channel }).catch(() => null);
    sBy("");
    if (r) {
      toast(r.total ? `${kind === "fee" ? "Fee" : "Planner"} reminders: sent ${r.sent} of ${r.total}` : `No ${kind} reminders due`, "success");
      ld();
    }
  };

  const catColor = {
    fee_reminder: ['#FFFBEB', '#F59E0B'],
    planner_reminder: ['#EFF6FF', '#2563EB'],
    announcement: ['#ECFDF5', '#10B981'],
    custom: ["#F8FAFC", "#64748B"]
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header page-header-row">
        <div>
          <h1 className="h1">Notifications</h1>
          <p className="page-subtitle">Send SMS / WhatsApp to students and parents</p>
        </div>
      </div>
      
      <div className="g2" style={{ alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ flex: 1, minWidth: 320, padding: 24 }}>
          <h3 className="h3" style={{ marginBottom: 20 }}>Send a message</h3>
          <div className="g3" style={{ marginBottom: 16 }}>
            <div className="field">
              <label>Channel</label>
              <select className="sel w-full" value={f.channel} onChange={e => sF({ ...f, channel: e.target.value })}>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div className="field">
              <label>Batch</label>
              <select className="sel w-full" value={f.batch_id} onChange={e => sF({ ...f, batch_id: e.target.value })}>
                <option value="">All batches</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Audience</label>
              <select className="sel w-full" value={f.audience} onChange={e => sF({ ...f, audience: e.target.value })}>
                <option value="all">Students + parents</option>
                <option value="students">Students</option>
                <option value="parents">Parents</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Message</label>
            <textarea className="inp" style={{ minHeight: 100, resize: 'vertical' }} value={f.message} onChange={e => sF({ ...f, message: e.target.value })} placeholder="Type your message…" />
          </div>
          <button className="btn bp w-full" style={{ justifyContent: 'center' }} onClick={send} disabled={busy === "send"}>
            {busy === "send" ? "Sending…" : "Send now"}
          </button>
        </div>
        
        <div className="card" style={{ flex: "0 0 320px", padding: 24 }}>
          <h3 className="h3" style={{ marginBottom: 12 }}>Automated reminders</h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>Dispatch to everyone with a pending item, on the selected channel.</p>
          <button className="btn bs w-full" style={{ justifyContent: "center", marginBottom: 12, height: 44 }} onClick={() => remind("fee")} disabled={busy === "fee"}>
            {busy === "fee" ? "Sending…" : "Send fee reminders"}
          </button>
          <button className="btn bs w-full" style={{ justifyContent: "center", height: 44 }} onClick={() => remind("planner")} disabled={busy === "planner"}>
            {busy === "planner" ? "Sending…" : "Send planner reminders"}
          </button>
        </div>
      </div>
      
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)' }}>
          <h3 className="h3">Dispatch log</h3>
        </div>
        {log.length === 0 ? (
          <div style={{ padding: 20 }}>
            <EmptyState icon={BellIcon} title="No Dispatch History" description="Sent WhatsApp and SMS notifications will be recorded here." />
          </div>
        ) : (
          <div className="tblwrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Channel</th>
                  <th>Type</th>
                  <th>To</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {log.map(n => {
                  const [bg, fg] = catColor[n.category] || catColor.custom;
                  return (
                    <tr key={n.id}>
                      <td className="muted" style={{ fontSize: 12 }}>{new Date(n.created_at).toLocaleString()}</td>
                      <td style={{ textTransform: "uppercase", fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>{n.channel}</td>
                      <td><Bd bg={bg} fg={fg}>{(n.category || "").replace("_", " ")}</Bd></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{n.recipient_phone}</td>
                      <td>
                        <Bd bg={n.status === "sent" ? '#ECFDF5' : n.status === "failed" ? '#FEF2F2' : '#FFFBEB'} fg={n.status === "sent" ? '#10B981' : n.status === "failed" ? '#EF4444' : '#F59E0B'}>
                          {n.status}
                        </Bd>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
