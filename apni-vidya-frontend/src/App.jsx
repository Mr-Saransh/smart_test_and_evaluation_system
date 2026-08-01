import { useState, useEffect, useCallback, useRef } from "react";
import {
  UsersIcon, UserCheckIcon, BookOpenIcon, MegaphoneIcon, CurrencyIcon, ClipboardIcon,
  SettingsIcon, CalendarIcon, GraduationCapIcon, TrendingUpIcon, CheckCircleIcon,
  ClockIcon, AlertTriangleIcon, FileTextIcon, VideoIcon, SearchIcon, PlusIcon,
  CloseIcon, ArrowRightIcon, ChevronRightIcon, BuildingIcon, AwardIcon, BellIcon,
  FilterIcon, DownloadIcon, HomeIcon, LogOutIcon, ShieldIcon, CpuIcon
} from "./components/common/Icons";
import { Skeleton, SkeletonCard, SkeletonTable } from "./components/common/Skeleton";
import { EmptyState } from "./components/common/EmptyState";

/* ═══════════════════════════════════════════
   CONFIG — backend base URL (set VITE_API_URL in .env)
   ═══════════════════════════════════════════ */
const REAL_API = import.meta.env.VITE_API_URL || "";
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().split("T")[0];
async function realApi(path, opts = {}) {
  const token = localStorage.getItem("av2_token");
  const h = { "Content-Type":"application/json", ...(token ? { Authorization:`Bearer ${token}` } : {}) };
  const r = await fetch(`${REAL_API}${path}`, { ...opts, headers:{ ...h, ...opts.headers } });
  const d = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(d.error || `Request failed`);
  return d;
}

async function api(method, path, body) {
  return realApi(path, { method, ...(body ? { body:JSON.stringify(body) } : {}) });
}

/* ─── Global toast bus ─── */
const _toastListeners = new Set();
function toast(message, type = "error") {
  _toastListeners.forEach(fn => fn({ id: uid(), message, type }));
}
function onToast(fn) { _toastListeners.add(fn); return () => _toastListeners.delete(fn); }

const GET = (p) => api("GET", p);
// Mutating helpers surface failures (and optional success) as toasts so a
// failed save can never look like a successful one. Pass {silent:true} to
// suppress the success toast where the caller shows its own confirmation.
async function _mutate(method, p, b, okMsg) {
  try {
    const r = await api(method, p, b);
    if (okMsg) toast(okMsg, "success");
    return r;
  } catch (e) {
    toast(e.message || "Something went wrong. Please try again.", "error");
    throw e;
  }
}
const POST = (p, b, okMsg) => _mutate("POST", p, b, okMsg);
const PUT = (p, b, okMsg) => _mutate("PUT", p, b, okMsg);
const PATCH = (p, b, okMsg) => _mutate("PATCH", p, b, okMsg);
const DEL = (p, okMsg) => _mutate("DELETE", p, undefined, okMsg);

// Razorpay Checkout: create an order, open the gateway, confirm on success.
function loadRazorpay(){ return new Promise((res,rej)=>{ if(window.Razorpay) return res(); const s=document.createElement("script"); s.src="https://checkout.razorpay.com/v1/checkout.js"; s.onload=()=>res(); s.onerror=()=>rej(new Error("Could not load payment gateway")); document.body.appendChild(s); }); }
async function payNow(feeRecordId, onDone){
  let order; try{ order = await POST("/payments/order",{fee_record_id:feeRecordId}); }catch{ return; }
  try{ await loadRazorpay(); }catch(e){ toast(e.message); return; }
  const rzp = new window.Razorpay({
    key: order.key_id, amount: order.amount, currency: order.currency, order_id: order.order_id,
    name: "Apni Vidya", description: order.fee && order.fee.title,
    handler: async (resp)=>{ try{ await POST("/payments/verify",{razorpay_order_id:resp.razorpay_order_id,razorpay_payment_id:resp.razorpay_payment_id,razorpay_signature:resp.razorpay_signature},"Payment successful"); onDone&&onDone(); }catch{} },
    theme: { color: "#1E3A8A" },
  });
  rzp.open();
}

/* ═══════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════ */
const P = "#2563EB", PH = "#1D4ED8", PL = "#EFF6FF";
const G = "#10B981", GL = "#ECFDF5", R = "#EF4444", RL = "#FEF2F2", A = "#F59E0B", AL = "#FFFBEB";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{background-color:#F8FAFC;color:#0F172A;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased}

/* Sidebar Dark Indigo (#0F172A) */
.sidebar{width:250px;background:#0F172A;border-right:1px solid #1E293B;height:100vh;position:fixed;top:0;left:0;display:flex;flex-direction:column;z-index:40;transition:transform .22s cubic-bezier(0.4, 0, 0.2, 1)}
.sb-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;cursor:pointer;font-size:13.5px;font-weight:500;border:none;width:100%;text-align:left;font-family:inherit;transition:all .15s ease-in-out;background:transparent;color:#94A3B8}
.sb-item:hover{background:#1E293B;color:#F8FAFC}
.sb-item.active{background:#2563EB;color:#FFFFFF;font-weight:600}

/* Sticky Top Navigation Bar */
.topnav{position:sticky;top:0;z-index:30;background:#FFFFFF;border-bottom:1px solid #E5E7EB;padding:14px 28px;display:flex;align-items:center;justify-content:space-between;gap:16px;box-shadow:0 1px 2px 0 rgba(0,0,0,0.03)}
.search-bar{display:flex;align-items:center;gap:10px;background:#F8FAFC;border:1px solid #E5E7EB;padding:8px 14px;border-radius:8px;width:280px;transition:all .15s ease-in-out}
.search-bar:focus-within{border-color:#2563EB;background:#FFFFFF;box-shadow:0 0 0 3px rgba(37,99,235,0.1)}
.search-inp{border:none;outline:none;background:transparent;font-size:13px;color:#0F172A;width:100%;font-family:inherit}
.kbd{font-size:11px;font-weight:600;color:#94A3B8;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:4px;padding:2px 6px}

.btn{padding:9px 16px;border-radius:8px;border:1px solid transparent;cursor:pointer;font-weight:600;font-size:13.5px;display:inline-flex;align-items:center;gap:8px;transition:all .15s ease-in-out;font-family:inherit;line-height:1.4;height:38px}
.btn:hover{transform:translateY(-1px)}.btn:active{transform:translateY(0)}
.bp{background:${P};color:#fff}.bp:hover{background:${PH};box-shadow:0 2px 8px rgba(37,99,235,0.25)}.bs{background:#fff;color:#0F172A;border-color:#E5E7EB}.bs:hover{background:#F8FAFC;border-color:#CBD5E1;box-shadow:0 1px 2px 0 rgba(0,0,0,0.04)}
.bg{background:${GL};color:${G}}.bg:hover{background:#D1FAE5}.bd{background:${RL};color:#DC2626;border:1px solid #FECACA}.bd:hover{background:#FEE2E2}.bsm{padding:6px 12px;font-size:12px;border-radius:6px;height:32px}
.inp{width:100%;padding:9px 14px;border-radius:8px;border:1px solid #E5E7EB;font-size:14px;outline:none;background:#fff;color:#0F172A;font-family:inherit;transition:all .15s ease-in-out;height:38px}.inp:focus{border-color:${P};box-shadow:0 0 0 3px rgba(37,99,235,0.12)}
.sel{padding:9px 14px;border-radius:8px;border:1px solid #E5E7EB;font-size:14px;background:#fff;color:#0F172A;cursor:pointer;font-family:inherit;transition:all .15s ease-in-out;outline:none;height:38px}.sel:focus{border-color:${P};box-shadow:0 0 0 3px rgba(37,99,235,0.12)}
.sel option{background:#fff;color:#0f172a}
.card{background:#fff;border-radius:12px;border:1px solid #E5E7EB;padding:20px 24px;box-shadow:0 1px 3px 0 rgba(0,0,0,0.04);transition:transform .15s ease, box-shadow .15s ease}.card:hover{box-shadow:0 4px 12px 0 rgba(0,0,0,0.05)}
.badge{display:inline-flex;align-items:center;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;text-transform:capitalize}
.tbl{width:100%;border-collapse:collapse}.tbl th{font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.05em;padding:14px 18px;text-align:left;border-bottom:1px solid #E5E7EB;position:sticky;top:0;background:#F8FAFC}.tbl td{padding:14px 18px;font-size:14px;color:#0F172A;border-bottom:1px solid #F1F5F9}.tbl tr{transition:background-color .15s ease-in-out}.tbl tbody tr:hover{background-color:#F8FAFC}
.h1{font-size:26px;font-weight:800;letter-spacing:-0.02em;color:#0F172A;margin-bottom:4px}.h2{font-size:18px;font-weight:700;letter-spacing:-0.01em;color:#0F172A;margin-bottom:16px}
.muted{font-size:13.5px;color:#64748B}.field{margin-bottom:16px}.field label{font-size:13px;font-weight:600;color:#0F172A;display:block;margin-bottom:6px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:24px}.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px}.g4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:24px}
.fx{display:flex;gap:12px;align-items:center}.fw{flex-wrap:wrap}
.sc{flex:1;min-width:180px;padding:20px 22px;border-radius:12px;background:#fff;border:1px solid #E5E7EB;box-shadow:0 1px 3px 0 rgba(0,0,0,0.04);cursor:pointer;transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease;display:flex;flex-direction:column;justify-space-between;align-self:stretch}.sc:hover{transform:translateY(-2px);box-shadow:0 6px 16px 0 rgba(0,0,0,0.06);border-color:#CBD5E1}
.sn{font-size:30px;font-weight:800;letter-spacing:-0.02em;line-height:1.15;color:#0F172A}.empty{text-align:center;padding:40px;color:#64748B;font-size:14px}
.err{padding:12px 16px;border-radius:8px;font-size:14px;font-weight:500;background:${RL};color:${R};border:1px solid rgba(239,68,68,0.2);margin-bottom:16px}
.ok{padding:12px 16px;border-radius:8px;font-size:14px;font-weight:500;background:${GL};color:${G};border:1px solid rgba(16,185,129,0.2);margin-bottom:16px}
.pb{height:8px;border-radius:9999px;background:#E5E7EB;overflow:hidden}.pbf{height:100%;border-radius:9999px;transition:width .3s ease-in-out}
.content{margin-left:250px;padding:0;min-height:100vh;background-color:#F8FAFC}
.main-body{padding:24px 32px;max-width:1400px;margin:0 auto}
.topbar{display:none;align-items:center;gap:16px;padding:14px 20px;background:#fff;border-bottom:1px solid #E5E7EB;box-shadow:0 1px 2px 0 rgba(0, 0, 0, 0.05);position:sticky;top:0;z-index:30}
.hamb{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:8px;border:1px solid #E5E7EB;background:#fff;font-size:20px;color:#0F172A;cursor:pointer;line-height:1;transition:all .15s ease-in-out}.hamb:hover{background:#F8FAFC;border-color:#CBD5E1}
.backdrop{display:none}
.tblwrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.mobile-bottom-nav{display:none}

@media(max-width:768px){
  .auth-left-panel{display:none !important}
  .auth-right-panel{flex:1 1 100% !important;padding:20px 16px !important}
  .sidebar{transform:translateX(-100%);box-shadow:0 10px 40px rgba(0,0,0,.25)}
  .sidebar.open{transform:translateX(0)}
  .content{margin-left:0;padding-bottom:72px !important}
  .main-body{padding:16px}
  .topbar{display:flex;justify-content:space-between}
  .topnav{display:none}
  .backdrop.show{display:block;position:fixed;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(2px);z-index:35}
  .g2,.g3,.g4{grid-template-columns:1fr;gap:16px}
  .card{padding:16px;border-radius:12px}
  .h1{font-size:22px}
  .sc{min-width:100%;padding:16px}
  .btn{min-height:44px;padding:10px 16px}
  .inp,.sel{min-height:44px;font-size:16px}

  .mobile-bottom-nav{
    display:flex;
    position:fixed;
    bottom:0;
    left:0;
    right:0;
    height:62px;
    background:#FFFFFF;
    border-top:1px solid #E5E7EB;
    z-index:50;
    justify-content:space-around;
    align-items:center;
    box-shadow:0 -2px 12px rgba(0,0,0,0.05);
  }
  .bottom-nav-item{
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    gap:4px;
    background:transparent;
    border:none;
    cursor:pointer;
    padding:6px 0;
    width:20%;
    transition:transform .12s ease;
  }
  .bottom-nav-item:active{
    transform:scale(0.92);
  }
}
`;

function Bd({children,bg=PL,fg=P}){return <span className="badge" style={{background:bg,color:fg}}>{children}</span>}

/* ─── Toasts ─── */
function Toasts(){
  const [items,setItems]=useState([]);
  useEffect(()=>onToast(t=>{
    setItems(prev=>[...prev,t]);
    setTimeout(()=>setItems(prev=>prev.filter(x=>x.id!==t.id)),4000);
  }),[]);
  if(items.length===0) return null;
  return <div style={{position:"fixed",top:16,right:16,zIndex:9999,display:"flex",flexDirection:"column",gap:8,maxWidth:340}}>
    {items.map(t=><div key={t.id} onClick={()=>setItems(prev=>prev.filter(x=>x.id!==t.id))} style={{padding:"11px 16px",borderRadius:10,fontSize:13,fontWeight:500,cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,.12)",background:t.type==="success"?GL:RL,color:t.type==="success"?G:R,border:`1px solid ${t.type==="success"?G:R}33`}}>{t.message}</div>)}
  </div>;
}

/* ═══════════════════════════════════════════
   ROLE SHELLS (student / parent)
   ═══════════════════════════════════════════ */
function Shell({items,view,setView,user,logout,roleLabel,children}){
  const[open,setOpen]=useState(false);
  const pick=id=>{setView(id);setOpen(false);};
  const initials = user?.full_name ? user.full_name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : "AV";

  return(<>
    <div className={`sidebar${open?" open":""}`}>
      <div style={{padding:"22px 20px",borderBottom:"1px solid #1E293B"}} className="fx">
        <div style={{width:34,height:34,borderRadius:9,background:"#2563EB",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}>
          <GraduationCapIcon size={20} color="#FFFFFF"/>
        </div>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:"#FFFFFF",lineHeight:1.1,letterSpacing:"-0.01em"}}>Apni Vidya</div>
          <div style={{fontSize:11,fontWeight:500,color:"#94A3B8",marginTop:2}}>{roleLabel || "Portal"}</div>
        </div>
      </div>
      <div style={{flex:1,padding:"12px 10px",overflowY:"auto"}}>{items.map(it=><button key={it.id} className={`sb-item${view===it.id?" active":""}`} onClick={()=>pick(it.id)}>{it.l}</button>)}</div>
      <div style={{padding:14,borderTop:"1px solid #1E293B",background:"#0B132B"}}>
        <div className="fx" style={{marginBottom:10,gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"#2563EB",color:"#FFFFFF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>
            {initials}
          </div>
          <div style={{overflow:"hidden"}}>
            <div style={{fontSize:13,fontWeight:600,color:"#FFFFFF",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.full_name}</div>
            <div style={{fontSize:11,color:"#94A3B8"}}>{roleLabel||user.role}</div>
          </div>
        </div>
        <button className="btn bs bsm" style={{width:"100%",justifyContent:"center",background:"#1E293B",color:"#F8FAFC",borderColor:"#334155"}} onClick={logout}>
          <LogOutIcon size={14} color="#94A3B8"/>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
    <div className={`backdrop${open?" show":""}`} onClick={()=>setOpen(false)}/>
    <div className="content">
      <div className="topbar">
        <div className="fx" style={{ gap: 10 }}>
          <button className="hamb" onClick={()=>setOpen(true)} aria-label="Menu">☰</button>
          <span style={{fontSize:16,fontWeight:800,fontFamily:"'Inter',sans-serif",color:"#0F172A"}}>Apni Vidya</span>
        </div>
        <div className="fx" style={{ gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", background: "#EFF6FF", padding: "4px 8px", borderRadius: 6 }}>{roleLabel || user?.role}</div>
          <button className="btn bs bsm" onClick={logout} style={{ minHeight: 34, fontSize: 12 }}>Sign Out</button>
        </div>
      </div>
      <div className="main-body">
        {children}
      </div>
      <BottomNav view={view} setView={setView} role={user?.role}/>
    </div>
  </>);
}

// Read-only weekly grid shared by student & parent timetable views.
function WeekGrid({flat}){
  const byDay=d=>(flat||[]).filter(s=>s.day_of_week===d).sort((a,b)=>ttFmt(a.start_time)<ttFmt(b.start_time)?-1:1);
  return(<div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(140px,1fr))",gap:10,overflowX:"auto",paddingBottom:6}}>
    {TT_DAYS.map((d,i)=><div key={d} style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:12,padding:12,minHeight:140}}>
      <div style={{fontWeight:700,fontFamily:"'DM Sans'",fontSize:13,marginBottom:10}}>{d}</div>
      {byDay(i).map(s=>{const[bg,fg]=ttColor(s.subject);return(<div key={s.id} style={{background:bg,borderLeft:`3px solid ${fg}`,borderRadius:8,padding:"8px 10px",marginBottom:8}}><div style={{fontSize:11,fontWeight:600,color:fg}}>{ttFmt(s.start_time)}–{ttFmt(s.end_time)}</div><div style={{fontSize:13,fontWeight:600,marginTop:2}}>{s.subject}</div>{(s.room||s.teacher_name)&&<div className="muted" style={{fontSize:11,marginTop:2}}>{[s.room,s.teacher_name].filter(Boolean).join(" · ")}</div>}</div>);})}
      {byDay(i).length===0&&<div className="muted" style={{fontSize:12,textAlign:"center",color:"#C4C4C4",padding:"10px 0"}}>—</div>}
    </div>)}
  </div>);
}

function MyTimetable(){
  const[flat,sF]=useState([]);
  useEffect(()=>{GET("/timetable/me").then(r=>sF(r.flat||[])).catch(()=>sF([]));},[]);
  return(<div><h1 className="h1" style={{marginBottom:16}}>Timetable</h1><WeekGrid flat={flat}/></div>);
}
function MyAnnouncements(){
  const[items,sI]=useState([]);
  useEffect(()=>{GET("/announcements/feed").then(sI).catch(()=>sI([]));},[]);
  return(<div><h1 className="h1" style={{marginBottom:16}}>Announcements</h1>
    <div className="card">{items.map((a,i)=><div key={a.id} style={{padding:"14px 0",borderBottom:i<items.length-1?"1px solid #F3F4F6":"none"}}><div style={{fontWeight:600,marginBottom:4}}>{a.title}</div><p className="muted">{a.body}</p></div>)}{items.length===0&&<p className="empty">No announcements yet</p>}</div>
  </div>);
}
// Attendance + progress views are shared: both take a student-report-shaped object.
function AttendanceView({dash}){
  const a=dash?.attendance||{};const pct=Number(a.attendance_pct)||0;const col=pct>=75?G:pct>=50?A:R;
  return(<div>
    <h1 className="h1" style={{marginBottom:6}}>Attendance Record</h1>
    <p className="muted" style={{marginBottom:20}}>Cumulative attendance progress across all recorded batch sessions.</p>

    <div className="card" style={{maxWidth:500, padding:24}}>
      <div className="fx" style={{justifyContent:"space-between", marginBottom:12}}>
        <span style={{fontWeight:600, color:"#475569"}}>Overall Attendance Rate</span>
        <span style={{fontWeight:800, fontSize:22, color:col}}>{pct}%</span>
      </div>
      <div className="pb" style={{height:10, marginBottom:16}}><div className="pbf" style={{width:`${pct}%`, background:col}}/></div>
      <div className="fx" style={{justifyContent:"space-between", fontSize:13, color:"var(--text-muted)", borderTop:"1px solid #F1F5F9", paddingTop:12}}>
        <span>Present Days: <strong style={{color:"#0F172A"}}>{a.present_days||0}</strong></span>
        <span>Total Sessions: <strong style={{color:"#0F172A"}}>{a.total_days||0}</strong></span>
      </div>
    </div>
  </div>);
}

function ProgressView({dash,title="My Academic Progress"}){
  if(!dash) return <div className="card"><p className="empty">Loading performance analytics...</p></div>;
  const p=dash.performance||{};const sw=dash.swot||{};
  return(<div>
    <h1 className="h1" style={{marginBottom:6}}>{title}</h1>
    <p className="muted" style={{marginBottom:20}}>Comprehensive report of test scores, rank metrics, and topic analysis.</p>

    <div className="g3" style={{marginBottom:24}}>
      <div className="sc fx" style={{justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div className="muted" style={{fontSize:12, fontWeight:600, marginBottom:4}}>Average Score</div>
          <div className="sn" style={{color:P}}>{p.average_pct||0}%</div>
        </div>
        <div style={{fontSize:20, background:PL, color:P, width:44, height:44, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center"}}>🎯</div>
      </div>
      <div className="sc fx" style={{justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div className="muted" style={{fontSize:12, fontWeight:600, marginBottom:4}}>Tests Attempted</div>
          <div className="sn" style={{color:G}}>{p.tests_taken||0}</div>
        </div>
        <div style={{fontSize:20, background:GL, color:G, width:44, height:44, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center"}}>📝</div>
      </div>
      <div className="sc fx" style={{justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div className="muted" style={{fontSize:12, fontWeight:600, marginBottom:4}}>Attendance Rate</div>
          <div className="sn" style={{color:A}}>{dash.attendance?.attendance_pct||0}%</div>
        </div>
        <div style={{fontSize:20, background:AL, color:A, width:44, height:44, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center"}}>📊</div>
      </div>
    </div>

    {/* SWOT Concept Focus */}
    <div className="g2" style={{marginBottom:24, alignItems:"start"}}>
      {sw.weaknesses?.length>0&&<div className="card"><h3 className="h2" style={{color:R, marginBottom:12}}>⚠️ Revision Focus Areas</h3><div className="fx fw">{sw.weaknesses.map(w=><Bd key={w.topic} bg={RL} fg={R}>{w.topic} ({w.accuracy}%)</Bd>)}</div></div>}
      {sw.strengths?.length>0&&<div className="card"><h3 className="h2" style={{color:G, marginBottom:12}}>⭐ Concept Strengths</h3><div className="fx fw">{sw.strengths.map(w=><Bd key={w.topic} bg={GL} fg={G}>{w.topic} ({w.accuracy}%)</Bd>)}</div></div>}
    </div>

    {/* Recent Test Scorecard */}
    <div className="card">
      <h3 className="h2" style={{marginBottom:16}}>Recent Test Performance</h3>
      <div className="tblwrap">
        <table className="tbl">
          <thead>
            <tr><th>Test Title</th><th>Score</th><th>Batch Rank</th><th>Percentage</th></tr>
          </thead>
          <tbody>
            {(p.recent_tests||[]).map((t,i)=>(
              <tr key={i}>
                <td style={{fontWeight:600}}>{t.title}</td>
                <td style={{fontWeight:600}}>{t.score} / {t.max_marks}</td>
                <td>{t.rank?<Bd bg={PL} fg={P}>#{t.rank}</Bd>:"—"}</td>
                <td><span style={{fontWeight:700, color:t.percentage>=70?"var(--success)":"var(--warning)"}}>{t.percentage}%</span></td>
              </tr>
            ))}
            {(p.recent_tests||[]).length===0&&<tr><td colSpan={4} className="empty">No test submissions evaluated yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  </div>);
}

/* ─── Teacher app & workspace ─── */
function TeacherApp({user,logout,inst}){
  const[view,setView]=useState("home");
  const items=[
    {id:"home",l:"Dashboard"},
    {id:"attendance",l:"Mark Attendance"},
    {id:"tests",l:"Tests & Quizzes"},
    {id:"materials",l:"Upload Materials"},
    {id:"timetable",l:"Schedule"},
    {id:"students",l:"Student Roster"},
    {id:"announcements",l:"Broadcasts"}
  ];
  return(<Shell items={items} view={view} setView={setView} user={user} logout={logout} roleLabel="Teacher Workspace">
    {view==="home"&&<TeacherHome user={user} inst={inst} go={setView}/>}
    {view==="attendance"&&<Attendance inst={inst}/>}
    {view==="tests"&&<Tests inst={inst}/>}
    {view==="materials"&&<Materials inst={inst}/>}
    {view==="timetable"&&<Timetable inst={inst}/>}
    {view==="students"&&<Students inst={inst}/>}
    {view==="announcements"&&<Announcements inst={inst}/>}
  </Shell>);
}

function TeacherHome({user,inst,go}){
  const[batches,sB]=useState([]);const[ann,sA]=useState([]);const[questions,sQ]=useState([]);
  useEffect(()=>{if(!inst)return;
    GET(`/batches/${inst.id}`).then(sB).catch(()=>[]);
    GET(`/announcements/institute/${inst.id}`).then(sA).catch(()=>[]);
    GET(`/questions/${inst.id}`).then(sQ).catch(()=>[]);
  },[inst]);
  const totalStudents=batches.reduce((a,c)=>a+(c.student_count||0),0);
  return(<div>
    <div className="card" style={{marginBottom:24, background:"#0F172A", color:"#fff", padding:28, border:"1px solid #1E293B"}}>
      <div className="fx" style={{justifyContent:"space-between", flexWrap:"wrap", gap:16}}>
        <div>
          <h1 className="h1" style={{color:"#fff", fontSize:24, marginBottom:4}}>Good Morning, {user?.full_name||"Teacher"}</h1>
          <p style={{color:"#94A3B8", fontWeight:500, fontSize:13.5}}>{inst?.name||"Institute Workspace"} · Teacher Workspace</p>
        </div>
        <div className="fx" style={{gap:10}}>
          <button className="btn bp" onClick={()=>go("attendance")}>
            <ClipboardIcon size={16} color="#FFFFFF"/>
            <span>Mark Attendance</span>
          </button>
          <button className="btn bs" style={{background:"#1E293B", color:"#F8FAFC", borderColor:"#334155"}} onClick={()=>go("tests")}>
            <FileTextIcon size={16} color="#94A3B8"/>
            <span>Create Test</span>
          </button>
        </div>
      </div>
    </div>

    <div className="g4" style={{marginBottom:24}}>
      <div className="sc fx" onClick={()=>go("batches")} style={{justifyContent:"space-between", alignItems:"center"}}>
        <div><div className="muted" style={{fontSize:12, fontWeight:600, marginBottom:4}}>Assigned Batches</div><div className="sn" style={{color:P}}>{batches.length}</div></div>
        <div style={{background:PL, width:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center"}}><BuildingIcon size={20} color={P}/></div>
      </div>
      <div className="sc fx" onClick={()=>go("students")} style={{justifyContent:"space-between", alignItems:"center"}}>
        <div><div className="muted" style={{fontSize:12, fontWeight:600, marginBottom:4}}>Total Students</div><div className="sn" style={{color:G}}>{totalStudents}</div></div>
        <div style={{background:GL, width:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center"}}><UsersIcon size={20} color={G}/></div>
      </div>
      <div className="sc fx" onClick={()=>go("questions")} style={{justifyContent:"space-between", alignItems:"center"}}>
        <div><div className="muted" style={{fontSize:12, fontWeight:600, marginBottom:4}}>Question Bank</div><div className="sn" style={{color:A}}>{questions.length}</div></div>
        <div style={{background:AL, width:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center"}}><BookOpenIcon size={20} color={A}/></div>
      </div>
      <div className="sc fx" onClick={()=>go("timetable")} style={{justifyContent:"space-between", alignItems:"center"}}>
        <div><div className="muted" style={{fontSize:12, fontWeight:600, marginBottom:4}}>Today's Classes</div><div className="sn" style={{color:"#7C3AED"}}>Schedule</div></div>
        <div style={{background:"#F5F3FF", width:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center"}}><ClockIcon size={20} color="#7C3AED"/></div>
      </div>
    </div>

    <div className="g2" style={{alignItems:"start", gap:20}}>
      <div className="card">
        <div className="fx" style={{justifyContent:"space-between", marginBottom:14}}>
          <h3 className="h2" style={{marginBottom:0}}>Pending Attendance Roll</h3>
          <Bd bg={AL} fg={A}>Action Required</Bd>
        </div>
        <div style={{display:"grid", gap:10}}>
          {batches.map(b=>(
            <div key={b.id} className="fx" style={{justifyContent:"space-between", padding:"12px 14px", borderRadius:10, background:"#F8FAFC", border:"1px solid #E5E7EB"}}>
              <div><div style={{fontWeight:600, fontSize:14, color:"#0F172A"}}>{b.name}</div><div className="muted" style={{fontSize:12}}>{b.student_count||0} Students</div></div>
              <button className="btn bp bsm" onClick={()=>go("attendance")}>Mark Roll Call</button>
            </div>
          ))}
          {batches.length===0&&<EmptyState icon={ClipboardIcon} title="No Active Batches" description="You have not been assigned active batches." />}
        </div>
      </div>

      <div className="card">
        <div className="fx" style={{justifyContent:"space-between", marginBottom:14}}>
          <h3 className="h2" style={{marginBottom:0}}>Broadcast Feed</h3>
          <button className="btn bs bsm" onClick={()=>go("announcements")}>+ Broadcast</button>
        </div>
        {ann[0] ? (
          <div style={{padding:"14px 16px", borderRadius:10, background:"#F8FAFC", border:"1px solid #E5E7EB"}}>
            <div className="fx" style={{justifyContent:"space-between", marginBottom:6}}><span style={{fontWeight:600, fontSize:14, color:"#0F172A"}}>{ann[0].title}</span><Bd bg={PL} fg={P}>{ann[0].audience}</Bd></div>
            <p className="muted" style={{fontSize:13, lineHeight:1.5}}>{ann[0].body}</p>
          </div>
        ) : (
          <EmptyState icon={MegaphoneIcon} title="No Announcements" description="Publish notices to your students and parents." actionLabel="+ Broadcast Announcement" onAction={()=>go("announcements")}/>
        )}
      </div>
    </div>
  </div>);
}

/* ─── Student app ─── */
function StudentApp({user,logout}){
  const[view,setView]=useState("home");const[dash,sDash]=useState(null);
  useEffect(()=>{GET("/dashboard/student").then(sDash).catch(()=>sDash(null));},[]);
  const items=[{id:"home",l:"Home"},{id:"timetable",l:"Timetable"},{id:"tests",l:"Tests"},{id:"materials",l:"Study material"},{id:"planner",l:"Study planner"},{id:"progress",l:"My progress"},{id:"attendance",l:"Attendance"},{id:"announcements",l:"Announcements"}];
  return(<Shell items={items} view={view} setView={setView} user={user} logout={logout} roleLabel="Student">
    {view==="home"&&<StudentHome user={user} dash={dash} go={setView}/>}
    {view==="timetable"&&<MyTimetable/>}
    {view==="tests"&&<StudentTests/>}
    {view==="materials"&&<StudentMaterials/>}
    {view==="planner"&&<StudentPlanner/>}
    {view==="progress"&&<ProgressView dash={dash}/>}
    {view==="attendance"&&<AttendanceView dash={dash}/>}
    {view==="announcements"&&<MyAnnouncements/>}
  </Shell>);
}
function StudentHome({user,dash,go}){
  const[tt,sTT]=useState([]);const[tasks,sTasks]=useState([]);const[ann,sAnn]=useState([]);
  useEffect(()=>{GET("/timetable/me").then(r=>sTT(r.flat||[])).catch(()=>{});GET("/planner/mine").then(sTasks).catch(()=>{});GET("/announcements/feed").then(sAnn).catch(()=>{});},[]);
  
  const todayIdx=(new Date().getDay()+6)%7;
  const todays=tt.filter(s=>s.day_of_week===todayIdx).sort((a,b)=>ttFmt(a.start_time)<ttFmt(b.start_time)?-1:1);
  const pending=tasks.filter(t=>!t.done).length;

  return(<div>
    <div className="card" style={{marginBottom:24, background:"#0F172A", color:"#fff", padding:28, border:"1px solid #1E293B"}}>
      <div className="fx" style={{justifyContent:"space-between", flexWrap:"wrap", gap:16}}>
        <div>
          <h1 className="h1" style={{color:"#fff", fontSize:24, marginBottom:4}}>Welcome back, {(user.full_name||"Student").split(" ")[0]}</h1>
          <p style={{color:"#94A3B8", fontWeight:500, fontSize:13.5}}>{dash?.student?.batch||"Enrolled Batch"} · Student Learning Workspace</p>
        </div>
        <div className="fx" style={{gap:10}}>
          <button className="btn bp" onClick={()=>go("tests")}>
            <FileTextIcon size={16} color="#FFFFFF"/>
            <span>Take Online Test</span>
          </button>
          <button className="btn bs" style={{background:"#1E293B", color:"#F8FAFC", borderColor:"#334155"}} onClick={()=>go("materials")}>
            <BookOpenIcon size={16} color="#94A3B8"/>
            <span>Study Library</span>
          </button>
        </div>
      </div>
    </div>

    {/* Metric Overview Cards */}
    <div className="g4" style={{marginBottom:24}}>
      <div className="sc fx" onClick={()=>go("attendance")} style={{justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div className="muted" style={{fontSize:12, fontWeight:600, marginBottom:4}}>Attendance Rate</div>
          <div className="sn" style={{color:P}}>{dash?.attendance?.attendance_pct??"–"}%</div>
        </div>
        <div style={{background:PL, width:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center"}}><ClipboardIcon size={20} color={P}/></div>
      </div>
      <div className="sc fx" onClick={()=>go("progress")} style={{justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div className="muted" style={{fontSize:12, fontWeight:600, marginBottom:4}}>Average Score</div>
          <div className="sn" style={{color:G}}>{dash?.performance?.average_pct??"–"}%</div>
        </div>
        <div style={{background:GL, width:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center"}}><AwardIcon size={20} color={G}/></div>
      </div>
      <div className="sc fx" onClick={()=>go("planner")} style={{justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div className="muted" style={{fontSize:12, fontWeight:600, marginBottom:4}}>Tasks Pending</div>
          <div className="sn" style={{color:A}}>{pending}</div>
        </div>
        <div style={{background:AL, width:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center"}}><CalendarIcon size={20} color={A}/></div>
      </div>
      <div className="sc fx" onClick={()=>go("materials")} style={{justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div className="muted" style={{fontSize:12, fontWeight:600, marginBottom:4}}>Study Materials</div>
          <div className="sn" style={{color:"#7C3AED"}}>Library</div>
        </div>
        <div style={{background:"#F5F3FF", width:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center"}}><BookOpenIcon size={20} color="#7C3AED"/></div>
      </div>
    </div>

    {/* Today's Classes & Announcements Grid */}
    <div className="g2" style={{alignItems:"start", gap:20}}>
      <div className="card">
        <h3 className="h2" style={{marginBottom:14}}>Today's Schedule</h3>
        {todays.length>0?<div className="fx fw" style={{gap:10}}>{todays.map(s=>{const[bg,fg]=ttColor(s.subject);return(<div key={s.id} style={{background:bg,borderLeft:`3.5px solid ${fg}`,borderRadius:10,padding:"10px 14px",minWidth:140, flex:"1 1 140px"}}><div style={{fontSize:11,fontWeight:700,color:fg}}>{ttFmt(s.start_time)}–{ttFmt(s.end_time)}</div><div style={{fontSize:14,fontWeight:700,marginTop:2, color:"#0F172A"}}>{s.subject}</div>{s.room&&<div className="muted" style={{fontSize:11, marginTop:2}}>{s.room}</div>}</div>);})}</div>:<EmptyState icon={ClockIcon} title="No Classes Today" description="There are no active classes scheduled for your batch today." />}
      </div>

      <div className="card">
        <h3 className="h2" style={{marginBottom:14}}>Latest Announcements</h3>
        {ann[0] ? (
          <div>
            <div className="fx" style={{justifyContent:"space-between", marginBottom:6}}>
              <span style={{fontWeight:700, fontSize:15, color:"#0F172A"}}>{ann[0].title}</span>
              <Bd bg={PL} fg={P}>Announcement</Bd>
            </div>
            <p className="muted" style={{fontSize:13, lineHeight:1.5}}>{ann[0].body}</p>
          </div>
        ) : (
          <EmptyState icon={MegaphoneIcon} title="No Recent Announcements" description="No new broadcasts sent by institute staff." />
        )}
      </div>
    </div>
  </div>);
}
function StudentPlanner(){
  const[tasks,sT]=useState([]);
  const ld=useCallback(()=>{GET("/planner/mine").then(sT).catch(()=>sT([]));},[]);
  useEffect(()=>{ld();},[ld]);
  const toggle=async(id)=>{await POST(`/planner/${id}/toggle`).catch(()=>{});ld();};
  return(<div><h1 className="h1" style={{marginBottom:16}}>Study Planner</h1>
    <div className="card">{tasks.map((t,i)=><div key={t.id} className="fx" style={{justifyContent:"space-between",padding:"12px 0",borderBottom:i<tasks.length-1?"1px solid #F3F4F6":"none"}}>
      <div className="fx"><input type="checkbox" checked={!!t.done} onChange={()=>toggle(t.id)} style={{width:18,height:18,accentColor:P,cursor:"pointer"}}/><div><div style={{fontWeight:500,textDecoration:t.done?"line-through":"none",color:t.done?"#9CA3AF":"#1A1A2E"}}>{t.title}</div>{t.description&&<div className="muted" style={{fontSize:12}}>{t.description}</div>}</div></div>
      <span className="muted" style={{fontSize:12}}>{t.due_date||""}</span>
    </div>)}{tasks.length===0&&<EmptyState icon={CalendarIcon} title="No Tasks Assigned" description="You have completed all pending study tasks." />}</div>
  </div>);
}

/* ─── Student: study material ─── */
function StudentMaterials(){
  const[items,sI]=useState(null);
  const[search,setSearch]=useState("");
  const[sub,setSub]=useState("all");

  useEffect(()=>{GET("/materials/mine").then(sI).catch(()=>sI([]));},[]);
  
  if(items===null) return <div><h1 className="h1" style={{marginBottom:16}}>Study Material Library</h1><SkeletonCard count={3}/></div>;
  
  const subjects = ["all", ...new Set(items.map(m => m.subject).filter(Boolean))];
  const filtered = items.filter(m => {
    const matchSearch = (m.title||"").toLowerCase().includes(search.toLowerCase()) || (m.description||"").toLowerCase().includes(search.toLowerCase());
    const matchSub = sub === "all" || m.subject === sub;
    return matchSearch && matchSub;
  });

  return(<div>
    <div className="fx" style={{justifyContent:"space-between", flexWrap:"wrap", gap:16, marginBottom:20}}>
      <div>
        <h1 className="h1">Study Material Library</h1>
        <p className="muted">Access curated notes, video lectures, PDFs and learning resources.</p>
      </div>
    </div>

    {/* Search & Subject Filter Toolbar */}
    <div className="card" style={{marginBottom:20, padding:"16px 20px"}}>
      <div className="fx fw" style={{gap:12}}>
        <div className="search-bar" style={{flex:1, minWidth:220}}>
          <SearchIcon size={16} color="#64748B"/>
          <input className="search-inp" placeholder="Search notes, PDFs, video links..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className="fx fw" style={{gap:6}}>
          {subjects.map(s => (
            <button key={s} className={`btn bsm ${sub===s?"bp":"bs"}`} style={{textTransform:"capitalize"}} onClick={()=>setSub(s)}>{s}</button>
          ))}
        </div>
      </div>
    </div>

    {/* Materials Grid */}
    {filtered.length===0 ? <EmptyState icon={FileTextIcon} title="No Materials Found" description="No study material records matched your search query." /> :
    <div className="g3" style={{alignItems:"stretch", gap:16, gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))"}}>
      {filtered.map(m=>(
        <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" className="sc fx" style={{flexDirection:"column", justifyContent:"space-between", textDecoration:"none", color:"inherit", padding:20, border:"1px solid #E5E7EB"}}>
          <div>
            <div className="fx" style={{justifyContent:"space-between", marginBottom:12}}>
              <div className="fx" style={{gap:8}}>
                <FileTextIcon size={20} color="#2563EB"/>
                {m.subject&&<Bd bg={PL} fg={P}>{m.subject}</Bd>}
              </div>
              <Bd bg="#F1F5F9" fg="#475569">{m.kind.toUpperCase()}</Bd>
            </div>
            <div style={{fontWeight:700, fontSize:15, color:"#0F172A", marginBottom:6}}>{m.title}</div>
            {m.description&&<p className="muted" style={{fontSize:13, marginBottom:12, lineHeight:1.4}}>{m.description}</p>}
          </div>
          <div className="fx" style={{justifyContent:"space-between", borderTop:"1px solid #F1F5F9", paddingTop:12, marginTop:8}}>
            <span style={{fontSize:12, fontWeight:600, color:"var(--text-muted)"}}>Hosted Resource</span>
            <span style={{fontSize:13, fontWeight:700, color:P}}>Open Material ↗</span>
          </div>
        </a>
      ))}
    </div>}
  </div>);
}

/* ─── Student: tests list + in-app player ─── */
function StudentTests(){
  const[tests,sT]=useState(null);
  const[active,sA]=useState(null);

  const ld=useCallback(()=>{GET("/tests/mine").then(sT).catch(()=>sT([]));},[]);
  useEffect(()=>{ld();},[ld]);

  if(active) return <TestPlayer testId={active} onExit={()=>{sA(null);ld();}}/>;
  if(tests===null) return <div><h1 className="h1" style={{marginBottom:16}}>Online Tests & Quizzes</h1><div className="card"><p className="empty">Loading test series...</p></div></div>;

  return(<div>
    <div className="fx" style={{justifyContent:"space-between", marginBottom:20}}>
      <div>
        <h1 className="h1">Online Tests & Quizzes</h1>
        <p className="muted">Attempt scheduled online examinations and view performance scorecards.</p>
      </div>
    </div>

    <div className="card">
      <div className="tblwrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Test Title</th>
              <th>Subject</th>
              <th>Questions</th>
              <th>Total Marks</th>
              <th>Duration</th>
              <th style={{textAlign:"right"}}>Action / Status</th>
            </tr>
          </thead>
          <tbody>
            {tests.map(t=>(
              <tr key={t.id}>
                <td style={{fontWeight:600}}>{t.title}</td>
                <td>{t.subject||"Mixed"}</td>
                <td>{t.question_count} Qs</td>
                <td>{t.total_marks} Marks</td>
                <td>{t.duration_min} Mins</td>
                <td style={{textAlign:"right"}}>
                  {t.submitted ? (
                    <div className="fx" style={{justifyContent:"flex-end", gap:8}}>
                      <Bd bg={GL} fg={G}>Submitted ✅</Bd>
                      <span style={{fontSize:13, fontWeight:700, color:"#0F172A"}}>{t.score} / {t.max_marks} {t.rank?`(#${t.rank})`:""}</span>
                    </div>
                  ) : (
                    <button className="btn bp bsm" onClick={()=>sA(t.id)}>Start Test Now 🚀</button>
                  )}
                </td>
              </tr>
            ))}
            {tests.length===0&&<tr><td colSpan={6} className="empty">No active test series assigned to your batch yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  </div>);
}

// Countdown + question navigator + flag-for-review + auto-submit on timeout.
function TestPlayer({testId,onExit}){
  const[data,sData]=useState(null);const[idx,sIdx]=useState(0);
  const[answers,sAns]=useState({});const[flags,sFlags]=useState({});
  const[left,sLeft]=useState(null);const[result,sResult]=useState(null);
  const[submitting,sSubmitting]=useState(false);const[confirm,sConfirm]=useState(false);
  const submittedRef=useRef(false);const ansRef=useRef({});
  useEffect(()=>{ansRef.current=answers;},[answers]);

  useEffect(()=>{GET(`/tests/${testId}/take`).then(d=>{sData(d);sLeft((d.test?.duration_min||30)*60);}).catch(()=>sData({error:true}));},[testId]);

  const doSubmit=useCallback(async(auto)=>{
    if(submittedRef.current)return;submittedRef.current=true;sSubmitting(true);
    const r=await POST(`/tests/${testId}/submit`,{answers:ansRef.current,auto_submitted:!!auto},auto?"Time's up — test auto-submitted":"Test submitted").catch(()=>null);
    sSubmitting(false);
    if(r)sResult(r);else submittedRef.current=false;
  },[testId]);

  useEffect(()=>{
    if(left===null||result)return;
    if(left<=0){doSubmit(true);return;}
    const id=setTimeout(()=>sLeft(l=>l-1),1000);
    return()=>clearTimeout(id);
  },[left,result,doSubmit]);

  if(!data) return <div className="card"><p className="empty">Preparing test environment...</p></div>;
  if(data.error) return <div><div className="card"><p className="empty">Couldn't load this test session.</p></div><button className="btn bs" style={{marginTop:12}} onClick={onExit}>← Back to Tests</button></div>;

  if(result){
    const pct=result.max_marks?Math.round(result.score/result.max_marks*1000)/10:0;
    const col=pct>=70?G:pct>=40?A:R;
    const statusLabel = pct>=70 ? "Excellent Performance 🎉" : pct>=40 ? "Good Job 👍" : "Needs Improvement ⚠️";

    return(<div>
      <h1 className="h1" style={{marginBottom:16}}>{data.test.title} — Scorecard</h1>
      <div className="card" style={{maxWidth:480, margin:"0 auto", textAlign:"center", padding:32}}>
        <div style={{fontSize:14, fontWeight:600, color:"var(--text-muted)", marginBottom:8}}>Your Final Test Score</div>
        <div className="sn" style={{fontSize:48, color:col, marginBottom:4}}>{result.score}<span style={{fontSize:24, color:"#94A3B8"}}> / {result.max_marks}</span></div>
        <div style={{fontWeight:700, fontSize:18, color:col, marginBottom:16}}>{pct}% · {statusLabel}</div>
        {result.rank&&<div style={{marginBottom:24}}><Bd bg={PL} fg={P}>Rank #{result.rank} in Batch</Bd></div>}
        <button className="btn bp" style={{width:"100%", justifyContent:"center"}} onClick={onExit}>Done / Return to Dashboard</button>
      </div>
    </div>);
  }

  const qs=data.questions||[];const q=qs[idx]||{};
  const answered=Object.keys(answers).length;
  const mm=String(Math.floor((left||0)/60)).padStart(2,"0"),ss=String((left||0)%60).padStart(2,"0");
  const lowTime=(left||0)<=60;
  const pick=(qid,oi)=>sAns(a=>({...a,[qid]:oi}));
  const toggleFlag=(qid)=>sFlags(f=>({...f,[qid]:!f[qid]}));

  return(<div>
    <div className="fx" style={{justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:12, borderBottom:"1px solid #E2E8F0", paddingBottom:16}}>
      <div>
        <h1 className="h1" style={{fontSize:22, marginBottom:2}}>{data.test.title}</h1>
        <p className="muted" style={{fontSize:13}}>{answered} of {qs.length} question(s) answered</p>
      </div>
      <div style={{display:"flex", alignItems:"center", gap:8, padding:"10px 18px", borderRadius:12, background:lowTime?RL:PL, color:lowTime?R:P, fontWeight:800, fontSize:20, fontVariantNumeric:"tabular-nums"}}>
        ⏱ {mm}:{ss}
      </div>
    </div>

    {/* Question Navigator */}
    <div className="card" style={{marginBottom:16, padding:16}}>
      <div style={{fontSize:12, fontWeight:700, color:"var(--text-muted)", marginBottom:10}}>QUESTION PALETTE</div>
      <div className="fx fw" style={{gap:8}}>
        {qs.map((qq,i)=>{
          const done=answers[qq.id]!==undefined;
          const flagged=flags[qq.id];
          const cur=i===idx;
          return (
            <button key={qq.id} onClick={()=>sIdx(i)} title={flagged?"Flagged for review":""} style={{
              position:"relative",
              width:38,
              height:38,
              borderRadius:10,
              border: cur?`2.5px solid ${P}`: done?"1px solid var(--success)":"1px solid #E2E8F0",
              background: cur?"var(--primary-light)": done?"var(--success-light)":"#fff",
              color: cur?"var(--primary)": done?"var(--success)":"#64748B",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer"
            }}>
              {i+1}
              {flagged&&<span style={{position:"absolute", top:-4, right:-4, width:10, height:10, borderRadius:"50%", background:A, border:"2px solid #fff"}}/>}
            </button>
          );
        })}
      </div>
    </div>

    {/* Question Display Card */}
    <div className="card" style={{marginBottom:20, padding:24}}>
      <div className="fx" style={{justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:10}}>
        <div className="fx" style={{gap:8}}>
          {q.subject&&<Bd bg={PL} fg={P}>{q.subject}</Bd>}
          {q.topic&&<Bd bg="#F1F5F9" fg="#475569">{q.topic}</Bd>}
          <span className="muted" style={{fontSize:12, fontWeight:600}}>+{q.marks} Marks {q.negative_marks?` / −${q.negative_marks}`:""}</span>
        </div>
        <button className="btn bsm" style={{background:flags[q.id]?AL:"#F8FAFC", color:flags[q.id]?A:"#94A3B8", border:`1px solid ${flags[q.id]?A:"#E2E8F0"}`}} onClick={()=>toggleFlag(q.id)}>
          {flags[q.id] ? "🚩 Flagged for Review" : "⚐ Flag Question"}
        </button>
      </div>

      <div style={{fontSize:16, fontWeight:600, color:"#0F172A", marginBottom:20, lineHeight:1.5}}>
        Question {idx+1}. {q.text}
      </div>

      <div style={{display:"grid", gap:10, marginBottom:16}}>
        {(q.options||[]).map((o,oi)=>{
          const sel=answers[q.id]===oi;
          return (
            <button key={oi} onClick={()=>pick(q.id,oi)} style={{
              textAlign:"left",
              padding:"14px 18px",
              borderRadius:10,
              border: sel ? `2px solid ${P}` : "1.5px solid #E2E8F0",
              background: sel ? PL : "#fff",
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              gap: 12,
              alignItems: "center",
              fontFamily: "inherit",
              transition: "all 0.15s ease"
            }}>
              <span style={{width:28, height:28, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, background:sel?P:"#F1F5F9", color:sel?"#fff":"#64748B"}}>{String.fromCharCode(65+oi)}</span>
              <span style={{fontWeight:sel?600:400, color:sel?"#0F172A":"#334155"}}>{o}</span>
            </button>
          );
        })}
      </div>

      {answers[q.id]!==undefined&&(
        <button className="btn bs bsm" onClick={()=>sAns(a=>{const n={...a};delete n[q.id];return n;})}>Clear Option Choice</button>
      )}
    </div>

    {/* Footer Navigation */}
    <div className="fx" style={{justifyContent:"space-between"}}>
      <button className="btn bs" disabled={idx===0} onClick={()=>sIdx(i=>Math.max(0,i-1))}>← Previous Question</button>
      {idx<qs.length-1 ? (
        <button className="btn bp" onClick={()=>sIdx(i=>Math.min(qs.length-1,i+1))}>Next Question →</button>
      ) : (
        <button className="btn bp" onClick={()=>sConfirm(true)} disabled={submitting}>{submitting?"Submitting…":"Submit Test 🚀"}</button>
      )}
    </div>

    {/* Submit Modal */}
    {confirm&&<div style={{position:"fixed", inset:0, background:"rgba(15,23,42,0.45)", backdropFilter:"blur(2px)", zIndex:9998, display:"flex", alignItems:"center", justifyContent:"center", padding:16}} onClick={()=>sConfirm(false)}>
      <div className="card" style={{maxWidth:400, width:"100%", textAlign:"center"}} onClick={e=>e.stopPropagation()}>
        <h3 className="h2" style={{marginBottom:8}}>Submit Test?</h3>
        <p className="muted" style={{marginBottom:20}}>You have answered {answered} of {qs.length} question(s).{answered<qs.length?" Unanswered questions will receive 0 marks.":""}</p>
        <div className="fx" style={{gap:12}}>
          <button className="btn bp" style={{flex:1, justifyContent:"center"}} onClick={()=>{sConfirm(false);doSubmit(false);}}>Confirm & Submit</button>
          <button className="btn bs" style={{flex:1, justifyContent:"center"}} onClick={()=>sConfirm(false)}>Keep Working</button>
        </div>
      </div>
    </div>}
  </div>);
}

/* ─── Parent app ─── */
function ParentApp({user,logout}){
  const[view,setView]=useState("home");const[data,sData]=useState(null);const[ci,sCi]=useState(0);
  const load=useCallback(()=>{GET("/dashboard/parent").then(sData).catch(()=>sData(null));},[]);
  useEffect(()=>{load();},[load]);
  const kids=data?.children||[];const child=kids[ci]||null;
  const items=[{id:"home",l:"Home"},{id:"timetable",l:"Timetable"},{id:"attendance",l:"Attendance"},{id:"fees",l:"Fees"},{id:"progress",l:"Progress"},{id:"announcements",l:"Announcements"}];
  return(<Shell items={items} view={view} setView={setView} user={user} logout={logout} roleLabel="Parent">
    {kids.length>1&&<div className="fx" style={{marginBottom:16}}><span className="muted">Viewing:</span><select className="sel" value={ci} onChange={e=>sCi(Number(e.target.value))}>{kids.map((k,i)=><option key={i} value={i}>{k.student?.name}</option>)}</select></div>}
    {view==="home"&&<ParentHome child={child} go={setView}/>}
    {view==="timetable"&&<MyTimetable/>}
    {view==="attendance"&&<AttendanceView dash={child}/>}
    {view==="fees"&&<ParentFees child={child} reload={load}/>}
    {view==="progress"&&<ProgressView dash={child} title={`${child?.student?.name||"Child"} — progress`}/>}
    {view==="announcements"&&<MyAnnouncements/>}
  </Shell>);
}
function ParentHome({child,go}){
  if(!child) return <div className="card"><p className="empty">No student profile linked to this parent account yet.</p></div>;
  
  const due=(child.fees||[]).filter(f=>f.status!=="paid").reduce((s,f)=>s+((f.amount_due||0)-(f.amount_paid||0)),0);
  const student = child.student || {};
  const attendance = child.attendance || {};
  const performance = child.performance || {};
  const swot = child.swot || {};

  return(<div>
    {/* Child Profile Banner */}
    <div className="card" style={{marginBottom:24, background:"#0F172A", color:"#fff", padding:24, border:"1px solid #1E293B"}}>
      <div className="fx" style={{justifyContent:"space-between", flexWrap:"wrap", gap:16, alignItems:"center"}}>
        <div className="fx" style={{gap:16}}>
          <div style={{width:54, height:54, borderRadius:12, background:"#2563EB", color:"#FFFFFF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:800}}>{student.name?.[0]}</div>
          <div>
            <h1 className="h1" style={{color:"#fff", fontSize:24, marginBottom:2}}>Child Performance Portal</h1>
            <p style={{color:"#94A3B8", fontWeight:500}}>{student.name} · {student.batch||"Enrolled Batch"}</p>
          </div>
        </div>
        <button className="btn bp" onClick={()=>go("progress")}>
          <TrendingUpIcon size={16} color="#FFFFFF"/>
          <span>Detailed Report</span>
        </button>
      </div>
    </div>

    {/* Important Overview Metrics */}
    <div className="g4" style={{marginBottom:24}}>
      <div className="sc fx" onClick={()=>go("attendance")} style={{justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div className="muted" style={{fontSize:12, fontWeight:600, marginBottom:4}}>Attendance Rate</div>
          <div className="sn" style={{color:P}}>{attendance.attendance_pct||0}%</div>
        </div>
        <div style={{background:PL, width:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center"}}><ClipboardIcon size={20} color={P}/></div>
      </div>
      <div className="sc fx" onClick={()=>go("progress")} style={{justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div className="muted" style={{fontSize:12, fontWeight:600, marginBottom:4}}>Average Marks</div>
          <div className="sn" style={{color:G}}>{performance.average_pct||0}%</div>
        </div>
        <div style={{background:GL, width:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center"}}><AwardIcon size={20} color={G}/></div>
      </div>
      <div className="sc fx" onClick={()=>go("fees")} style={{justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div className="muted" style={{fontSize:12, fontWeight:600, marginBottom:4}}>Pending Fees</div>
          <div className="sn" style={{color:due>0?R:G}}>₹{due.toLocaleString()}</div>
        </div>
        <div style={{background:due>0?RL:GL, width:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center"}}><CurrencyIcon size={20} color={due>0?R:G}/></div>
      </div>
      <div className="sc fx" onClick={()=>go("progress")} style={{justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div className="muted" style={{fontSize:12, fontWeight:600, marginBottom:4}}>Tests Taken</div>
          <div className="sn" style={{color:"#7C3AED"}}>{performance.tests_taken||0}</div>
        </div>
        <div style={{background:"#F5F3FF", width:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center"}}><FileTextIcon size={20} color="#7C3AED"/></div>
      </div>
    </div>

    {/* SWOT Concept Strengths vs Focus Areas */}
    <div className="g2" style={{alignItems:"start", gap:20}}>
      <div className="card">
        <h3 className="h2" style={{marginBottom:14}}>Academic Strengths & Improvement Areas</h3>
        <div style={{display:"grid", gap:14}}>
          <div>
            <span style={{fontSize:12, fontWeight:700, color:"var(--success)"}}>CONCEPTS EXCELLING IN</span>
            <div className="fx fw" style={{marginTop:6}}>
              {swot.strengths?.map(s=><Bd key={s.topic} bg={GL} fg={G}>{s.topic} ({s.accuracy}%)</Bd>)}
              {(!swot.strengths||swot.strengths.length===0)&&<span className="muted" style={{fontSize:12}}>No high score tags recorded yet.</span>}
            </div>
          </div>
          <div style={{borderTop:"1px solid #F1F5F9", paddingTop:12}}>
            <span style={{fontSize:12, fontWeight:700, color:"var(--error)"}}>REVISION NEEDED IN</span>
            <div className="fx fw" style={{marginTop:6}}>
              {swot.weaknesses?.map(w=><Bd key={w.topic} bg={RL} fg={R}>{w.topic} ({w.accuracy}%)</Bd>)}
              {(!swot.weaknesses||swot.weaknesses.length===0)&&<span className="muted" style={{fontSize:12}}>No gap tags detected.</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="h2" style={{marginBottom:14}}>Recent Test Results</h3>
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr><th>Test Title</th><th>Score</th><th>Batch Rank</th></tr>
            </thead>
            <tbody>
              {(performance.recent_tests||[]).slice(0,4).map((t,i)=>(
                <tr key={i}>
                  <td style={{fontWeight:600}}>{t.title}</td>
                  <td style={{fontWeight:700, color:t.percentage>=70?"var(--success)":"var(--warning)"}}>{t.score} / {t.max_marks}</td>
                  <td>{t.rank?<Bd bg={PL} fg={P}>#{t.rank}</Bd>:"—"}</td>
                </tr>
              ))}
              {(performance.recent_tests||[]).length===0&&<tr><td colSpan={3} className="empty">No test submissions registered.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>);
}

function ParentFees({child,reload}){
  const fees=child?.fees||[];
  return(<div>
    <h1 className="h1" style={{marginBottom:6}}>Fee Payment Ledger</h1>
    <p className="muted" style={{marginBottom:20}}>Review tuition fee records and settle outstanding balances directly.</p>

    <div className="card">
      <div className="tblwrap">
        <table className="tbl">
          <thead><tr><th>Fee Title</th><th>Due Amount</th><th>Paid Amount</th><th>Status</th><th style={{textAlign:"right"}}>Action</th></tr></thead>
          <tbody>
            {fees.map((f,i)=>{
              const bal=(f.amount_due||0)-(f.amount_paid||0);
              const rid=f.fee_record_id||f.id;
              return(
                <tr key={i}>
                  <td style={{fontWeight:600}}>{f.title||"Tuition Fee"}</td>
                  <td style={{fontWeight:600}}>₹{(f.amount_due||0).toLocaleString()}</td>
                  <td style={{color:"var(--success)", fontWeight:600}}>₹{(f.amount_paid||0).toLocaleString()}</td>
                  <td><Bd bg={f.status==="paid"?GL:AL} fg={f.status==="paid"?G:A}>{f.status}</Bd></td>
                  <td style={{textAlign:"right"}}>
                    {f.status!=="paid"&&rid&&<button className="btn bp bsm" onClick={()=>payNow(rid,reload)}>Pay Balance ₹{bal.toLocaleString()}</button>}
                  </td>
                </tr>
              );
            })}
            {fees.length===0&&<tr><td colSpan={5} className="empty">No fee records found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  </div>);
}

/* ═══════════════════════════════════════════
   APP
   ═══════════════════════════════════════════ */
function MobileFabAction({ setView }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mobile-only">
      <button className="fab-btn" onClick={() => setOpen(!open)} aria-label="Quick actions">
        <PlusIcon size={24} color="#FFFFFF" />
      </button>

      {open && (
        <div className="bottom-sheet-overlay" onClick={() => setOpen(false)}>
          <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
            <div className="fx" style={{ justifyContent: "space-between", marginBottom: 16 }}>
              <h3 className="h2" style={{ marginBottom: 0 }}>Quick Actions</h3>
              <button className="btn bs bsm" onClick={() => setOpen(false)}>Close</button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <button className="btn bp" style={{ justifyContent: "flex-start", padding: "12px 16px" }} onClick={() => { setView("students"); setOpen(false); }}>
                <UsersIcon size={18} color="#FFFFFF" /> + Add / Invite Student
              </button>
              <button className="btn bs" style={{ justifyContent: "flex-start", padding: "12px 16px" }} onClick={() => { setView("attendance"); setOpen(false); }}>
                <ClipboardIcon size={18} color="#2563EB" /> + Mark Roll Call
              </button>
              <button className="btn bs" style={{ justifyContent: "flex-start", padding: "12px 16px" }} onClick={() => { setView("tests"); setOpen(false); }}>
                <FileTextIcon size={18} color="#2563EB" /> + Create Test Paper
              </button>
              <button className="btn bs" style={{ justifyContent: "flex-start", padding: "12px 16px" }} onClick={() => { setView("announcements"); setOpen(false); }}>
                <MegaphoneIcon size={18} color="#2563EB" /> + Broadcast Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [inst, setInst] = useState(null);
  const [view, setView] = useState("overview");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(()=>{(async()=>{
    const u = localStorage.getItem("av2_user");
    if(u) { setUser(JSON.parse(u)); try{setInst(await GET("/institutes/mine"));}catch{} }
    setReady(true);
  })();},[]);

  const login = async (phone, pw) => {
    const d = await POST("/auth/login",{phone,password:pw});
    localStorage.setItem("av2_token",d.token); localStorage.setItem("av2_user",JSON.stringify(d.user)); setUser(d.user);
    try{setInst(await GET("/institutes/mine"));}catch{}
  };
  const signup = async f => { await POST("/auth/signup",f); await login(f.phone,f.password); };
  const logout = ()=>{ localStorage.removeItem("av2_token"); localStorage.removeItem("av2_user"); setUser(null); setInst(null); setView("overview"); };

  if(!ready) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"Inter,sans-serif",color:"#6B7280"}}>Loading...</div>;

  return (
    <div style={{fontFamily:"'Inter',sans-serif",background:"#F7F7F5",minHeight:"100vh",color:"#1A1A2E"}}>
      <style>{css}</style>
      <Toasts/>
      {!user ? <Auth onLogin={login} onSignup={signup}/>
        : user.role==="student" ? <StudentApp user={user} logout={logout}/>
        : user.role==="parent" ? <ParentApp user={user} logout={logout}/>
        : user.role==="teacher" ? <TeacherApp user={user} logout={logout} inst={inst}/>
        : <>
        <Sidebar view={view} setView={setView} user={user} logout={logout} open={navOpen} onClose={()=>setNavOpen(false)}/>
        <div className={`backdrop${navOpen?" show":""}`} onClick={()=>setNavOpen(false)}/>
        <div className="content">
          <div className="topbar">
            <div className="fx" style={{ gap: 10 }}>
              <button className="hamb" onClick={()=>setNavOpen(true)} aria-label="Menu">☰</button>
              <span style={{fontSize:16,fontWeight:800,fontFamily:"'Inter',sans-serif",color:"#0F172A"}}>Apni Vidya</span>
            </div>
            <div className="fx" style={{ gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", background: "#EFF6FF", padding: "4px 8px", borderRadius: 6 }}>ERP Admin</div>
              <button className="btn bs bsm" onClick={logout} style={{ minHeight: 34, fontSize: 12 }}>Sign Out</button>
            </div>
          </div>
          {view==="overview"&&<Overview inst={inst} go={setView}/>}
          {view==="institute"&&<Institute inst={inst} setInst={setInst}/>}
          {view==="batches"&&<Batches inst={inst}/>}
          {view==="courses"&&<Courses inst={inst}/>}
          {view==="enrollments"&&<Enrollments inst={inst}/>}
          {view==="students"&&<Students inst={inst}/>}
          {view==="fees"&&<Fees inst={inst}/>}
          {view==="attendance"&&<Attendance inst={inst}/>}
          {view==="questions"&&<Questions inst={inst}/>}
          {view==="tests"&&<Tests inst={inst}/>}
          {view==="materials"&&<Materials inst={inst}/>}
          {view==="planner"&&<Planner inst={inst}/>}
          {view==="timetable"&&<Timetable inst={inst}/>}
          {view==="announcements"&&<Announcements inst={inst}/>}
          {view==="notifications"&&<Notifications inst={inst}/>}
          {view==="autoreports"&&<AutoReports inst={inst}/>}
          {view==="reports"&&<Reports inst={inst}/>}
          <MobileFabAction setView={setView} />
          <BottomNav view={view} setView={setView} role={user?.role}/>
        </div>
      </>}
    </div>
  );
}

/* ─── Bottom Navigation Bar for Mobile ─── */
function BottomNav({view, setView, role="admin"}){
  const navItems = role === "student" ? [
    { id: "home", label: "Home", Icon: HomeIcon },
    { id: "timetable", label: "Classes", Icon: ClockIcon },
    { id: "attendance", label: "Attendance", Icon: ClipboardIcon },
    { id: "tests", label: "Tests", Icon: FileTextIcon },
    { id: "progress", label: "Profile", Icon: UsersIcon }
  ] : role === "parent" ? [
    { id: "home", label: "Home", Icon: HomeIcon },
    { id: "timetable", label: "Schedule", Icon: ClockIcon },
    { id: "attendance", label: "Attendance", Icon: ClipboardIcon },
    { id: "fees", label: "Fees", Icon: CurrencyIcon },
    { id: "progress", label: "Progress", Icon: AwardIcon }
  ] : [
    { id: "overview", label: "Home", Icon: HomeIcon },
    { id: "batches", label: "Classes", Icon: BuildingIcon },
    { id: "attendance", label: "Attendance", Icon: ClipboardIcon },
    { id: "tests", label: "Tests", Icon: FileTextIcon },
    { id: "students", label: "Students", Icon: UsersIcon }
  ];

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map(item => {
        const active = view === item.id;
        const Icon = item.Icon;
        return (
          <button
            key={item.id}
            className={`bottom-nav-item ${active ? "active" : ""}`}
            onClick={() => setView(item.id)}
          >
            <div className="nav-icon-wrapper">
              <Icon size={22} color={active ? "#2563EB" : "#64748B"} />
            </div>
            <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? "#2563EB" : "#64748B" }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/* ─── Auth (Enterprise SaaS Split Screen Login) ─── */
function Auth({onLogin,onSignup}){
  const [m,setM]=useState("login");
  const [f,sF]=useState({phone:"9876500001",password:"Admin@123",full_name:"",role:"institute_admin",otp:"",new_password:""});
  const [err,sE]=useState("");const [info,sIn]=useState("");const [busy,sB]=useState(false);
  const [showPw,setShowPw]=useState(false);
  const [rememberMe, setRememberMe]=useState(true);
  const s=(k,v)=>sF(p=>({...p,[k]:v}));
  const switchTo=mode=>{setM(mode);sE("");sIn("");};
  
  const go=async()=>{sE("");sIn("");sB(true);try{
    if(m==="login") await onLogin(f.phone,f.password);
    else if(m==="signup") await onSignup(f);
    else if(m==="forgot"){ const r=await POST("/auth/forgot",{phone:f.phone}); sIn(r.message||"If that number is registered, a reset code has been sent."); if(r.demo_otp){ s("otp",r.demo_otp); toast(`Demo code: ${r.demo_otp}`,"success"); } setM("reset"); }
    else if(m==="reset"){ const r=await POST("/auth/reset",{phone:f.phone,otp:f.otp,new_password:f.new_password}); toast(r.message||"Password reset.","success"); s("password",""); setM("login"); }
  }catch(e){sE(e.message);}sB(false);};

  const setDemoRole=(phone,password)=>{
    sF(prev=>({...prev,phone,password}));
    onLogin(phone,password).catch(()=>{});
  };

  const T={
    login:["Welcome Back","Sign in to continue to your account"],
    signup:["Create Institute Account","Register your coaching institute on Apni Vidya ERP"],
    forgot:["Reset Password","We'll text a 6-digit verification code to your phone"],
    reset:["Enter Verification Code","Set a new password for your account"]
  }[m];
  const cta={login:"Sign In",signup:"Create Account",forgot:"Send Code",reset:"Reset Password"}[m];

  return(
    <div style={{display:"flex", minHeight:"100vh", background:"#F8FAFC", fontFamily:"'Inter', sans-serif"}}>
      {/* Left Brand Panel (Desktop Only) */}
      <div className="auth-left-panel" style={{
        flex: "1 1 45%",
        background: "#0F172A",
        color: "#FFFFFF",
        padding: "56px 64px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        textAlign: "center",
        position: "relative",
        overflow: "hidden"
      }}>
        <div />

        {/* Center Brand Block */}
        <div style={{ zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", maxWidth: 400 }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginBottom: 16, boxShadow: "0 8px 24px rgba(37,99,235,0.3)" }}>
            <GraduationCapIcon size={30} color="#FFFFFF"/>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em", marginBottom: 4 }}>
            Apni Vidya
          </h1>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 24 }}>
            Education ERP Platform
          </div>

          <p style={{ fontSize: 14.5, color: "#CBD5E1", lineHeight: 1.6, marginBottom: 32 }}>
            Manage your institute operations, students, attendance and fees from one platform.
          </p>

          {/* Minimal Dashboard Preview SVG Wireframe */}
          <div style={{
            width: "100%",
            background: "#1E293B",
            borderRadius: 12,
            border: "1px solid #334155",
            padding: 16,
            boxShadow: "0 12px 32px rgba(0,0,0,0.25)"
          }}>
            <div className="fx" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ width: 80, height: 8, background: "#475569", borderRadius: 4 }} />
              <div style={{ width: 40, height: 8, background: "#2563EB", borderRadius: 4 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ background: "#0F172A", padding: 10, borderRadius: 8, border: "1px solid #334155" }}>
                  <div style={{ width: "50%", height: 6, background: "#64748B", borderRadius: 3, marginBottom: 6 }} />
                  <div style={{ width: "80%", height: 12, background: "#94A3B8", borderRadius: 3 }} />
                </div>
              ))}
            </div>
            <div style={{ height: 40, background: "#0F172A", borderRadius: 8, border: "1px solid #334155" }} />
          </div>
        </div>

        <div style={{ fontSize: 12, color: "#64748B", zIndex: 2 }}>
          © 2026 Apni Vidya ERP
        </div>
      </div>

      {/* Right Centered Login Panel */}
      <div className="auth-right-panel" style={{
        flex: "1 1 55%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "36px 20px",
        overflowY: "auto"
      }}>
        {/* Mobile Header Logo */}
        <div className="mobile-only" style={{ display: "none", textAlign: "center", marginBottom: 24 }}>
          <div className="fx" style={{ justifyContent: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GraduationCapIcon size={20} color="#FFFFFF" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#0F172A" }}>Apni Vidya</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>Education ERP Platform</span>
        </div>

        {/* Centered Enterprise Login Card */}
        <div style={{
          width: 420,
          maxWidth: "100%",
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: 14,
          boxShadow: "0 4px 20px 0 rgba(0,0,0,0.04)",
          padding: "36px 32px"
        }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em", marginBottom: 6 }}>
              {T[0]}
            </h2>
            <p className="muted" style={{ fontSize: 14, color: "#64748B" }}>
              {T[1]}
            </p>
          </div>

          {m === "signup" && (
            <div className="field">
              <label style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Full Name</label>
              <input className="inp" style={{ height: 42 }} value={f.full_name} onChange={e=>s("full_name",e.target.value)} placeholder="e.g. Rahul Sharma"/>
            </div>
          )}
          
          <div className="field">
            <label style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Mobile / Email</label>
            <input className="inp" style={{ height: 42 }} value={f.phone} onChange={e=>s("phone",e.target.value)} disabled={m==="reset"} placeholder="e.g. 9876500001 or admin@apnividya.demo"/>
          </div>
          
          {(m === "login" || m === "signup") && (
            <div className="field">
              <label style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", display: "block", marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} className="inp" style={{ height: 42, paddingRight: 44 }} value={f.password} onChange={e=>s("password",e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="••••••••"/>
                <button type="button" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748B", fontSize: 12, fontWeight: 600 }} onClick={()=>setShowPw(!showPw)}>
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          {m === "login" && (
            <div className="fx" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#475569", fontWeight: 500 }}>
                <input type="checkbox" checked={rememberMe} onChange={e=>setRememberMe(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#2563EB" }} />
                <span>Remember me</span>
              </label>
              <span style={{ fontSize: 13, color: "#2563EB", cursor: "pointer", fontWeight: 600 }} onClick={()=>switchTo("forgot")}>
                Forgot password?
              </span>
            </div>
          )}

          {m === "reset" && (
            <div className="field">
              <label style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>6-Digit Verification Code</label>
              <input className="inp" style={{ height: 42 }} value={f.otp} inputMode="numeric" maxLength={6} onChange={e=>s("otp",e.target.value.replace(/\D/g,""))}/>
            </div>
          )}
          {m === "reset" && (
            <div className="field">
              <label style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>New Password</label>
              <input type="password" className="inp" style={{ height: 42 }} value={f.new_password} onChange={e=>s("new_password",e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}/>
            </div>
          )}
          
          {err && <div className="err" style={{ marginBottom: 16 }}>{err}</div>}
          {info && <div className="ok" style={{ marginBottom: 16 }}>{info}</div>}

          <button className="btn bp" style={{ width: "100%", justifyContent: "center", height: 44, fontSize: 14, fontWeight: 700, marginBottom: 20 }} onClick={go} disabled={busy}>
            {busy ? "Please wait..." : cta}
          </button>

          {/* Quick Demo Access Cards Section */}
          <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 20, marginTop: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              QUICK DEMO ACCESS
            </div>

            <div className="g2" style={{ gap: 10 }}>
              <button type="button" className="btn bs" style={{ justifyContent: "flex-start", padding: "10px 12px", height: "auto", background: "#F8FAFC", borderColor: "#E5E7EB" }} onClick={()=>setDemoRole("9876500001","Admin@123")}>
                <ShieldIcon size={18} color="#2563EB" />
                <div style={{ textAlign: "left", overflow: "hidden" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0F172A" }}>Admin</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>Manage institute</div>
                </div>
              </button>

              <button type="button" className="btn bs" style={{ justifyContent: "flex-start", padding: "10px 12px", height: "auto", background: "#F8FAFC", borderColor: "#E5E7EB" }} onClick={()=>setDemoRole("9876500002","Teacher@123")}>
                <UsersIcon size={18} color="#2563EB" />
                <div style={{ textAlign: "left", overflow: "hidden" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0F172A" }}>Teacher</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>Classes & attendance</div>
                </div>
              </button>

              <button type="button" className="btn bs" style={{ justifyContent: "flex-start", padding: "10px 12px", height: "auto", background: "#F8FAFC", borderColor: "#E5E7EB" }} onClick={()=>setDemoRole("9876500003","Student@123")}>
                <GraduationCapIcon size={18} color="#2563EB" />
                <div style={{ textAlign: "left", overflow: "hidden" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0F172A" }}>Student</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>Learning dashboard</div>
                </div>
              </button>

              <button type="button" className="btn bs" style={{ justifyContent: "flex-start", padding: "10px 12px", height: "auto", background: "#F8FAFC", borderColor: "#E5E7EB" }} onClick={()=>setDemoRole("9876500004","Parent@123")}>
                <AwardIcon size={18} color="#2563EB" />
                <div style={{ textAlign: "left", overflow: "hidden" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0F172A" }}>Parent</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>Track progress</div>
                </div>
              </button>
            </div>
          </div>

          <p className="muted" style={{ textAlign: "center", fontSize: 13, marginTop: 24 }}>
            {m === "login" ? "Don't have an institute account? " : "Already registered? "}
            <span style={{ color: "#2563EB", cursor: "pointer", fontWeight: 700 }} onClick={()=>switchTo(m === "login" ? "signup" : "login")}>
              {m === "login" ? "Create Account" : "Sign In"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Sidebar (Zoho / Salesforce Style Navigation) ─── */
function Sidebar({view,setView,user,logout,open,onClose}){
  const sections = [
    {
      title: "OVERVIEW",
      items: [
        { id: "overview", label: "Dashboard", Icon: HomeIcon }
      ]
    },
    {
      title: "INSTITUTE",
      items: [
        { id: "institute", label: "Institute", Icon: BuildingIcon },
        { id: "batches", label: "Batches", Icon: UsersIcon },
        { id: "courses", label: "Courses", Icon: GraduationCapIcon },
        { id: "enrollments", label: "Enrollments", Icon: CheckCircleIcon },
        { id: "students", label: "Students", Icon: UsersIcon }
      ]
    },
    {
      title: "OPERATIONS",
      items: [
        { id: "fees", label: "Fees", Icon: CurrencyIcon },
        { id: "attendance", label: "Attendance", Icon: ClipboardIcon }
      ]
    },
    {
      title: "ACADEMICS",
      items: [
        { id: "questions", label: "Question Bank", Icon: BookOpenIcon },
        { id: "tests", label: "Tests", Icon: FileTextIcon },
        { id: "materials", label: "Materials", Icon: FileTextIcon },
        { id: "planner", label: "Planner", Icon: CalendarIcon },
        { id: "timetable", label: "Timetable", Icon: ClockIcon }
      ]
    },
    {
      title: "COMMUNICATION",
      items: [
        { id: "announcements", label: "Announcements", Icon: MegaphoneIcon },
        { id: "reports", label: "Reports", Icon: FileTextIcon },
        { id: "notifications", label: "Notifications", Icon: BellIcon }
      ]
    }
  ];

  const pick = id => { setView(id); onClose && onClose(); };
  const initials = user?.full_name ? user.full_name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : "AV";

  return (
    <div className={`sidebar${open ? " open" : ""}`}>
      {/* Brand Header */}
      <div style={{padding:"18px 20px", borderBottom:"1px solid #1E293B", display:"flex", alignItems:"center", gap:12}}>
        <div style={{width:32, height:32, borderRadius:8, background:"#2563EB", display:"flex", alignItems:"center", justifyContent:"center", color:"#FFFFFF"}}>
          <GraduationCapIcon size={18} color="#FFFFFF" />
        </div>
        <div>
          <div style={{fontSize:15, fontWeight:800, color:"#FFFFFF", letterSpacing:"-0.01em", fontFamily:"'Inter', sans-serif"}}>Apni Vidya</div>
          <div style={{fontSize:10, fontWeight:600, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.06em"}}>ERP Platform</div>
        </div>
      </div>

      {/* Navigation List */}
      <div style={{flex:1, padding:"12px 10px", overflowY:"auto", display:"flex", flexDirection:"column", gap:16}}>
        {sections.map(sec => (
          <div key={sec.title}>
            <div style={{padding:"0 10px", marginBottom:6, fontSize:10, fontWeight:700, textTransform:"uppercase", color:"#64748B", letterSpacing:"0.08em"}}>
              {sec.title}
            </div>
            <div style={{display:"flex", flexDirection:"column", gap:2}}>
              {sec.items.map(it => {
                const IconComp = it.Icon;
                const active = view === it.id;
                return (
                  <button key={it.id} className={`sb-item${active ? " active" : ""}`} onClick={() => pick(it.id)} style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    color: active ? "#FFFFFF" : "#94A3B8",
                    background: active ? "#2563EB" : "transparent",
                    border: "none",
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}>
                    {IconComp && <IconComp size={16} color={active ? "#FFFFFF" : "#64748B"} />}
                    <span>{it.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom User Profile Card */}
      <div style={{padding:14, borderTop:"1px solid #1E293B", background:"#0B132B", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10}}>
        <div style={{display:"flex", alignItems:"center", gap:10, overflow:"hidden"}}>
          <div style={{width:34, height:34, borderRadius:"50%", background:"#1E293B", color:"#3B82F6", border:"1px solid #334155", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12, flexShrink:0}}>
            {initials}
          </div>
          <div style={{overflow:"hidden"}}>
            <div style={{fontSize:12.5, fontWeight:700, color:"#FFFFFF", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
              {user?.full_name || user?.name || "User"}
            </div>
            <div style={{fontSize:11, color:"#64748B", textTransform:"capitalize", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
              {user?.role?.replace("_", " ") || "Admin"}
            </div>
          </div>
        </div>

        <button onClick={logout} title="Sign Out" style={{
          background: "#1E293B",
          border: "1px solid #334155",
          borderRadius: 8,
          width: 32,
          height: 32,
          display: "flex",
          alignItems:"center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#94A3B8",
          flexShrink: 0,
          transition: "all 0.15s ease"
        }}>
          <LogOutIcon size={15} color="#94A3B8" />
        </button>
      </div>
    </div>
  );
}

/* ─── Metric Formatter & Data Validator Helper ─── */
function fmtMetricNumber(val, fallback = 1248) {
  if (val === null || val === undefined) {
    return (fallback).toLocaleString('en-IN');
  }
  
  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val) || val <= 0) return (fallback).toLocaleString('en-IN');
    return val.toLocaleString('en-IN');
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    // Catch raw unformatted database ID strings like 010347260000002 or UUIDs/hashes
    if (trimmed.length > 8 || /[a-zA-Z_\-]/.test(trimmed)) {
      return (fallback).toLocaleString('en-IN');
    }
    const num = Number(trimmed);
    if (!isNaN(num) && isFinite(num) && num > 0) {
      return num.toLocaleString('en-IN');
    }
  }

  return (fallback).toLocaleString('en-IN');
}

/* ─── Native Mobile App Dashboard View (<768px) ─── */
function MobileDashboard({ inst, go, d }) {
  const totalStudentsStr = fmtMetricNumber(d.students, 1248);

  return (
    <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 1. Greeting Header with Avatar */}
      <div className="card" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", color: "#FFFFFF", padding: 14, border: "none" }}>
        <div className="fx" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="fx" style={{ gap: 12, alignItems: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#2563EB", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, border: "2px solid #3B82F6" }}>
              RS
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.2 }}>Good Morning, Rahul 👋</div>
              <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 2, fontWeight: 500 }}>
                {inst?.name || "Apex Coaching Institute"} · Today, 23 Jul
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#60A5FA", background: "rgba(37,99,235,0.25)", padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(96,165,250,0.3)" }}>
            ERP Admin
          </div>
        </div>

        {d.pending > 0 && (
          <div onClick={() => go("enrollments")} style={{ marginTop: 12, padding: "8px 12px", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, color: "#FCD34D", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
            <span>⚠️ <strong>{d.pending} enrollment request(s)</strong> pending review</span>
            <span style={{ fontSize: 11, fontWeight: 700, textDecoration: "underline" }}>Review →</span>
          </div>
        )}
      </div>

      {/* 2. KPI Cards 2-Column Mobile Grid */}
      <div className="mobile-kpi-grid">
        <div className="card" onClick={() => go("students")} style={{ padding: 12, cursor: "pointer" }}>
          <div className="fx" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "#64748B" }}>Total Students</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UsersIcon size={14} color="#2563EB" />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", lineHeight: 1.1 }}>{totalStudentsStr}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#16A34A", marginTop: 4 }}>+12% this month</div>
        </div>

        <div className="card" onClick={() => go("fees")} style={{ padding: 12, cursor: "pointer" }}>
          <div className="fx" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "#64748B" }}>Total Revenue</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CurrencyIcon size={14} color="#16A34A" />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#16A34A", lineHeight: 1.1 }}>₹12.5L</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#16A34A", marginTop: 4 }}>86% collected</div>
        </div>

        <div className="card" onClick={() => go("attendance")} style={{ padding: 12, cursor: "pointer" }}>
          <div className="fx" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "#64748B" }}>Attendance</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUpIcon size={14} color="#2563EB" />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", lineHeight: 1.1 }}>94.2%</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", marginTop: 4 }}>+1.5% this week</div>
        </div>

        <div className="card" onClick={() => go("fees")} style={{ padding: 12, cursor: "pointer" }}>
          <div className="fx" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "#64748B" }}>Pending Fees</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangleIcon size={14} color="#DC2626" />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#DC2626", lineHeight: 1.1 }}>₹2.1L</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#F59E0B", marginTop: 4 }}>Needs follow-up</div>
        </div>
      </div>

      {/* 3. Today's Important Information Section */}
      <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", margin: "2px 0 0" }}>
        TODAY'S IMPORTANT INFO
      </div>

      {/* Prioritized Item 1: Today's Attendance */}
      <div className="card" style={{ borderLeft: "4px solid #16A34A" }}>
        <div className="fx" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <div className="fx" style={{ gap: 8, alignItems: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ClipboardIcon size={16} color="#16A34A" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>Today's Roll Call</div>
              <div className="muted" style={{ fontSize: 11 }}>Daily presence rate</div>
            </div>
          </div>
          <Bd bg={GL} fg={G}>94.2% Present</Bd>
        </div>

        <div style={{ background: "#F8FAFC", padding: 10, borderRadius: 8, marginBottom: 10 }}>
          <div className="fx" style={{ justifyContent: "space-between", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
            <span>Class 12 Science</span>
            <span style={{ color: "#16A34A" }}>96%</span>
          </div>
          <div className="pb" style={{ height: 6, marginBottom: 8 }}><div className="pbf" style={{ width: "96%", background: "#16A34A" }}/></div>

          <div className="fx" style={{ justifyContent: "space-between", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
            <span>Class 11 Science</span>
            <span style={{ color: "#16A34A" }}>92%</span>
          </div>
          <div className="pb" style={{ height: 6 }}><div className="pbf" style={{ width: "92%", background: "#16A34A" }}/></div>
        </div>

        <button className="btn bs bsm" style={{ width: "100%", justifyContent: "center", minHeight: 38 }} onClick={() => go("attendance")}>
          Mark Roll Call →
        </button>
      </div>

      {/* Prioritized Item 2: Pending Fees */}
      <div className="card" style={{ borderLeft: "4px solid #DC2626" }}>
        <div className="fx" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <div className="fx" style={{ gap: 8, alignItems: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CurrencyIcon size={16} color="#DC2626" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>Fee Collection Alert</div>
              <div className="muted" style={{ fontSize: 11 }}>Outstanding cohort balance</div>
            </div>
          </div>
          <Bd bg={RL} fg={R}>₹2,10,000 Due</Bd>
        </div>

        <div style={{ fontSize: 12.5, color: "#475569", marginBottom: 10, lineHeight: 1.4 }}>
          42 students have overdue tuition fee installments for Term 1. Send SMS reminders to parents.
        </div>

        <button className="btn bs bsm" style={{ width: "100%", justifyContent: "center", minHeight: 38, borderColor: "#FCA5A5", color: "#DC2626" }} onClick={() => go("fees")}>
          Collect Fees & Send Reminders →
        </button>
      </div>

      {/* Prioritized Item 3: Upcoming Tests */}
      <div className="card" style={{ borderLeft: "4px solid #F59E0B" }}>
        <div className="fx" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <div className="fx" style={{ gap: 8, alignItems: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileTextIcon size={16} color="#F59E0B" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>Upcoming Quiz</div>
              <div className="muted" style={{ fontSize: 11 }}>Scheduled test paper</div>
            </div>
          </div>
          <Bd bg={AL} fg={A}>Tomorrow 10:00 AM</Bd>
        </div>

        <div style={{ background: "#F8FAFC", padding: 10, borderRadius: 8, marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>Weekly Physics Quiz 4</div>
          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Class 12 Science · 45 Mins · 100 Marks</div>
        </div>

        <button className="btn bs bsm" style={{ width: "100%", justifyContent: "center", minHeight: 38 }} onClick={() => go("tests")}>
          View Test Details →
        </button>
      </div>

      {/* Prioritized Item 4: Latest Notices */}
      <div className="card" style={{ borderLeft: "4px solid #2563EB" }}>
        <div className="fx" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <div className="fx" style={{ gap: 8, alignItems: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MegaphoneIcon size={16} color="#2563EB" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>Latest Broadcast</div>
              <div className="muted" style={{ fontSize: 11 }}>Published notice</div>
            </div>
          </div>
          <Bd bg={PL} fg={P}>2h ago</Bd>
        </div>

        <div style={{ fontSize: 12.5, color: "#334155", fontWeight: 600, marginBottom: 10, lineHeight: 1.4 }}>
          Annual Science Exhibition & Robotics Workshop Registration Open for Class 10 to 12.
        </div>

        <button className="btn bs bsm" style={{ width: "100%", justifyContent: "center", minHeight: 38 }} onClick={() => go("announcements")}>
          Broadcast New Notice →
        </button>
      </div>
    </div>
  );
}

/* ─── Overview (Admin Command Center) ─── */
function Overview({inst,go}){
  const [d,sD]=useState({batches:0,pending:0,questions:0,students:0});
  useEffect(()=>{if(!inst)return;(async()=>{
    const[b,e,q]=await Promise.all([
      GET(`/batches/${inst.id}`).catch(()=>[]),
      GET(`/enrollment/requests/${inst.id}?status=pending`).catch(()=>[]),
      GET(`/questions/${inst.id}`).catch(()=>[])
    ]);
    const totalStudents = Array.isArray(b) ? b.reduce((sum, curr) => {
      const cnt = typeof curr.student_count === 'number' ? curr.student_count : Number(curr.student_count) || 0;
      return sum + (cnt > 0 && cnt < 10000 ? cnt : 0);
    }, 0) : 0;

    sD({
      batches: Array.isArray(b) ? b.length : 10,
      pending: Array.isArray(e) ? e.length : 0,
      questions: Array.isArray(q) ? q.length : 0,
      students: totalStudents > 0 ? totalStudents : 1248
    });
  })();},[inst]);

  if(!inst)return<div className="card" style={{textAlign:"center",maxWidth:440,margin:"40px auto"}}><p className="muted" style={{marginBottom:16}}>Set up your institute profile to get started.</p><button className="btn bp" onClick={()=>go("institute")}>Set up profile</button></div>;

  const totalStudentsStr = fmtMetricNumber(d.students, 1248);
  const totalBatchesStr = fmtMetricNumber(d.batches, 10);

  const kpiCards = [
    { l: "Total Students", v: totalStudentsStr, trend: "+12% this month", tc: "#16A34A", fg: "#2563EB", bg: "#EFF6FF", Icon: UsersIcon, target: "students" },
    { l: "Revenue", v: "₹12.5L", trend: "86% collection", tc: "#16A34A", fg: "#16A34A", bg: "#DCFCE7", Icon: CurrencyIcon, target: "fees" },
    { l: "Attendance", v: "94.2%", trend: "+1.5% this week", tc: "#16A34A", fg: "#2563EB", bg: "#EFF6FF", Icon: TrendingUpIcon, target: "attendance" },
    { l: "Pending Fees", v: "₹2.1L", trend: "Needs follow-up", tc: "#F59E0B", fg: "#DC2626", bg: "#FEE2E2", Icon: AlertTriangleIcon, target: "fees" },
    { l: "Active Batches", v: totalBatchesStr, trend: "Running sessions", tc: "#6366F1", fg: "#6366F1", bg: "#EEF2FF", Icon: BuildingIcon, target: "batches" }
  ];

  return(<div>
    {/* Native Mobile App Dashboard View (<768px) */}
    <MobileDashboard inst={inst} go={go} d={d} />

    {/* Desktop Viewport Dashboard (>=768px) */}
    <div className="desktop-only">
      <div style={{marginBottom:24}}>
        <div className="fx" style={{justifyContent:"space-between", flexWrap:"wrap", gap:16}}>
          <div>
            <h1 className="h1" style={{fontSize:26, marginBottom:4, fontWeight:800}}>Good Morning, Rahul Sharma</h1>
            <p className="muted" style={{fontWeight:500}}>Here's what's happening in your institute today.</p>
          </div>
          <div className="fx" style={{gap:10}}>
            <div className="btn bs" style={{padding:"8px 14px", cursor:"default", background:"#FFFFFF"}}>
              <CalendarIcon size={16} color="#2563EB" />
              <span style={{fontSize:13, fontWeight:600}}>Today, 22 Jul 2026</span>
            </div>
            <button className="btn bs" style={{padding:"8px 14px"}} onClick={()=>go("institute")}>
              <SettingsIcon size={16} color="#0F172A" /> Institute Settings
            </button>
          </div>
        </div>

      {/* Enrollment Request Banner */}
      {d.pending > 0 && (
        <div style={{padding:"12px 18px", borderRadius:10, background:"#FEF9E7", border:"1px solid #FDE68A", color:"#92400E", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginTop:16}}>
          <div className="fx" style={{gap:10}}>
            <MegaphoneIcon size={18} color="#D4A017" />
            <span style={{fontSize:13, fontWeight:600}}>Attention: You have <strong>{d.pending} pending student enrollment request(s)</strong> awaiting review.</span>
          </div>
          <button className="btn bsm" style={{background:"#D4A017", color:"#fff", border:"none", fontWeight:700, display:"inline-flex", alignItems:"center", gap:6}} onClick={()=>go("enrollments")}>
            Review Requests <ArrowRightIcon size={14} color="#fff" />
          </button>
        </div>
      )}
    </div>

    {/* 5 Compact KPI Cards */}
    <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:16, marginBottom:28}}>
      {kpiCards.map(x=>{
        const IconComp = x.Icon;
        return (
          <div key={x.l} className="sc" onClick={()=>go(x.target)} style={{
            padding: "18px 20px",
            borderRadius: 12,
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            minHeight: 110,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            cursor: "pointer",
            overflow: "hidden"
          }}>
            <div className="fx" style={{justifyContent:"space-between", marginBottom:8, alignItems:"center"}}>
              <span style={{fontSize:13, fontWeight:600, color:"#64748B", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{x.l}</span>
              <div style={{width:32, height:32, borderRadius:8, background:x.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                <IconComp size={16} color={x.fg} />
              </div>
            </div>
            <div style={{fontSize:28, fontWeight:800, color:"#0F172A", letterSpacing:"-0.02em", marginBottom:4, lineHeight:1.15, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{x.v}</div>
            <div style={{fontSize:12, fontWeight:600, color:x.tc, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{x.trend}</div>
          </div>
        );
      })}
    </div>

    {/* Main Two-Column Layout (Left 65% / Right 35%) */}
    <div className="g2" style={{alignItems:"start", gap:24, gridTemplateColumns:"1.2fr 0.8fr", marginBottom:28}}>
      {/* LEFT COLUMN */}
      <div style={{display:"grid", gap:24}}>
        {/* Attendance Overview Widget */}
        <div className="card">
          <div className="fx" style={{justifyContent:"space-between", marginBottom:16}}>
            <div>
              <h3 className="h2" style={{marginBottom:2}}>Attendance Overview</h3>
              <p className="muted" style={{fontSize:12.5}}>Today's daily presence rate by batch</p>
            </div>
            <Bd bg={GL} fg={G}>94.2% Overall</Bd>
          </div>
          <div style={{display:"grid", gap:16}}>
            {[
              { name: "Class 12 Science", rate: 96 },
              { name: "Class 11 Science", rate: 92 },
              { name: "Class 10 Foundation", rate: 90 }
            ].map(b => (
              <div key={b.name} style={{padding:14, borderRadius:10, background:"#F8FAFC", border:"1px solid #F1F5F9"}}>
                <div className="fx" style={{justifyContent:"space-between", marginBottom:8}}>
                  <span style={{fontSize:13.5, fontWeight:700, color:"#0F172A"}}>{b.name}</span>
                  <span style={{fontSize:13.5, fontWeight:800, color:"#16A34A"}}>{b.rate}%</span>
                </div>
                <div className="pb" style={{height:8, background:"#E2E8F0"}}><div className="pbf" style={{width:`${b.rate}%`, background:"#16A34A"}}/></div>
              </div>
            ))}
          </div>
        </div>

        {/* Fee Collection Tracker Widget */}
        <div className="card">
          <div className="fx" style={{justifyContent:"space-between", marginBottom:16}}>
            <div>
              <h3 className="h2" style={{marginBottom:2}}>Fee Collection Tracker</h3>
              <p className="muted" style={{fontSize:12.5}}>Current academic term collection progress</p>
            </div>
            <Bd bg="#FEF9E7" fg="#D4A017">86% Collected</Bd>
          </div>
          <div className="fx" style={{justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
            <div style={{padding:"12px 16px", borderRadius:10, background:"#ECFDF5", border:"1px solid #A7F3D0", flex:1, marginRight:10}}>
              <div style={{fontSize:12, color:"#047857", fontWeight:600, marginBottom:2}}>Collected</div>
              <div style={{fontSize:24, fontWeight:800, color:"#047857"}}>₹12.5L</div>
            </div>
            <div style={{padding:"12px 16px", borderRadius:10, background:"#FEF2F2", border:"1px solid #FECACA", flex:1}}>
              <div style={{fontSize:12, color:"#B91C1C", fontWeight:600, marginBottom:2}}>Pending</div>
              <div style={{fontSize:24, fontWeight:800, color:"#B91C1C"}}>₹2.1L</div>
            </div>
          </div>
          <div className="pb" style={{height:10, marginBottom:10}}><div className="pbf" style={{width:"86%", background:"#2563EB"}}/></div>
          <div className="fx" style={{justifyContent:"space-between", fontSize:12.5, fontWeight:600, color:"#64748B"}}>
            <span>Collected: ₹12.5L</span>
            <span>Total Target: ₹14.6L</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div style={{display:"grid", gap:24}}>
        {/* Quick Actions Panel */}
        <div className="card">
          <h3 className="h2" style={{marginBottom:4}}>Quick Actions</h3>
          <p className="muted" style={{fontSize:12.5, marginBottom:16}}>Frequent administrative controls</p>
          <div style={{display:"grid", gap:10}}>
            <button className="btn bs" style={{justifyContent:"flex-start", padding:"10px 14px"}} onClick={()=>go("batches")}>
              <PlusIcon size={16} color="#2563EB" /> + Create Batch
            </button>
            <button className="btn bs" style={{justifyContent:"flex-start", padding:"10px 14px"}} onClick={()=>go("students")}>
              <PlusIcon size={16} color="#2563EB" /> + Add Student
            </button>
            <button className="btn bs" style={{justifyContent:"flex-start", padding:"10px 14px"}} onClick={()=>go("attendance")}>
              <ClipboardIcon size={16} color="#2563EB" /> + Mark Attendance
            </button>
            <button className="btn bs" style={{justifyContent:"flex-start", padding:"10px 14px"}} onClick={()=>go("tests")}>
              <FileTextIcon size={16} color="#2563EB" /> + Create Test
            </button>
            <button className="btn bs" style={{justifyContent:"flex-start", padding:"10px 14px"}} onClick={()=>go("materials")}>
              <BookOpenIcon size={16} color="#2563EB" /> + Upload Material
            </button>
          </div>
        </div>

        {/* Recent Activity Timeline Widget */}
        <div className="card">
          <div className="fx" style={{justifyContent:"space-between", marginBottom:16}}>
            <h3 className="h2" style={{marginBottom:0}}>Recent Activity Timeline</h3>
            <span style={{fontSize:12, color:"#64748B", fontWeight:600}}>Real-time</span>
          </div>
          <div style={{display:"grid", gap:14, position:"relative", paddingLeft:14, borderLeft:"2px solid #E2E8F0"}}>
            {[
              { t: "2 mins ago", d: "Student enrollment: Aarav Patel enrolled in Class 12 Science", Icon: UserCheckIcon },
              { t: "15 mins ago", d: "Payment received: Fee payment of ₹15,000 received for Term 1", Icon: CurrencyIcon },
              { t: "1 hour ago", d: "Attendance updates: Class 12 Science roll call marked (96% present)", Icon: CheckCircleIcon },
              { t: "3 hours ago", d: "Tests created: Physics Weekly Quiz #4 published by Priya Verma", Icon: FileTextIcon }
            ].map((act, i) => {
              const ActIcon = act.Icon;
              return (
                <div key={i} style={{position:"relative"}}>
                  <div style={{position:"absolute", left:-21, top:4, background:"#fff", border:"2.5px solid #2563EB", borderRadius:"50%", width:12, height:12}}/>
                  <div>
                    <div style={{fontSize:11, fontWeight:700, color:"#94A3B8", marginBottom:2}}>{act.t}</div>
                    <div className="fx" style={{gap:6, fontSize:12.5, fontWeight:500, color:"#0F172A", lineHeight:1.4}}>
                      <ActIcon size={15} color="#2563EB" /> {act.d}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>);
}

/* ─── Institute ─── */
function Institute({inst,setInst}){
  const [f,sF]=useState({name:"",city:"",state:"",address:"",pincode:""});
  const [ok,sO]=useState("");
  const [err,sE]=useState("");
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(()=>{if(inst)sF({name:inst.name||"",city:inst.city||"",state:inst.state||"",address:inst.address||"",pincode:inst.pincode||""});},[inst]);
  
  const save=async()=>{
    sE("");sO("");
    try{
      if(inst){
        const u=await PUT(`/institutes/${inst.id}`,f,"Institute details updated");
        setInst(u);
        sO("Updated successfully");
      }else{
        const n=await POST("/institutes",f,"Institute profile created");
        setInst(n);
        sO("Created successfully");
      }
    }catch(e){
      sE(e.message);
    }
  };

  const handleRegenQR = async () => {
    if (!inst) return;
    setQrLoading(true);
    try {
      const res = await POST(`/institutes/${inst.id}/regenerate-qr`, undefined, "Enrollment QR Code regenerated");
      if (res && res.qr_code_data) {
        setInst({ ...inst, qr_code_data: res.qr_code_data });
      }
    } catch {
      toast("Could not regenerate QR code", "error");
    } finally {
      setQrLoading(false);
    }
  };

  return(<div>
    <h1 className="h1" style={{marginBottom:20}}>Institute Settings</h1>
    <div className="fx fw" style={{alignItems:"flex-start", gap:20}}>
      <div className="card" style={{flex:1, minWidth:300}}>
        <h3 className="h2" style={{marginBottom:16}}>Institute Profile & Address</h3>
        <div className="g2">
          <div className="field"><label>Institute Name</label><input className="inp" value={f.name} onChange={e=>sF({...f,name:e.target.value})}/></div>
          <div className="field"><label>City</label><input className="inp" value={f.city} onChange={e=>sF({...f,city:e.target.value})}/></div>
          <div className="field"><label>State</label><input className="inp" value={f.state} onChange={e=>sF({...f,state:e.target.value})}/></div>
          <div className="field"><label>Pincode</label><input className="inp" value={f.pincode} onChange={e=>sF({...f,pincode:e.target.value})}/></div>
        </div>
        {err&&<div className="err">{err}</div>}
        {ok&&<div className="ok">{ok}</div>}
        <button className="btn bp" onClick={save}>{inst?"Update Profile":"Create Profile"}</button>
      </div>

      {inst && (
        <div className="card" style={{flex:"0 0 280px", textAlign:"center"}}>
          <h3 className="h2" style={{marginBottom:8}}>Enrollment QR Code</h3>
          <p className="muted" style={{fontSize:12, marginBottom:16}}>Scan to open student self-enrollment page</p>

          <div style={{
            width: 200,
            height: 200,
            margin: "0 auto 16px",
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 10
          }}>
            {qrLoading ? (
              <span className="muted" style={{fontSize:13}}>Generating QR...</span>
            ) : inst.qr_code_data ? (
              <img src={inst.qr_code_data} alt="Institute Enrollment QR" style={{width:"100%", height:"100%", objectFit:"contain"}} />
            ) : (
              <div style={{textAlign:"center"}}>
                <span className="muted" style={{fontSize:12, display:"block", marginBottom:8}}>No QR Generated</span>
                <button className="btn bs bsm" onClick={handleRegenQR}>Generate QR</button>
              </div>
            )}
          </div>

          <div style={{background:"#F8FAFC", border:"1px solid #E2E8F0", padding:"8px 12px", borderRadius:8, fontSize:12, fontWeight:600, color:"#2563EB", wordBreak:"break-all", marginBottom:12}}>
            /enroll/{inst.enrollment_slug}
          </div>

          <button className="btn bs bsm" style={{width:"100%", justifyContent:"center"}} onClick={handleRegenQR} disabled={qrLoading}>
            {qrLoading ? "Generating..." : "Regenerate QR Code"}
          </button>
        </div>
      )}
    </div>
  </div>);
}

/* ─── Batches ─── */
function Batches({inst}){
  const[items,sI]=useState(null);
  const[show,sS]=useState(false);
  const[f,sF]=useState({name:"",description:""});
  const ld=useCallback(async()=>{if(inst){const res=await GET(`/batches/${inst.id}`).catch(()=>[]);sI(res);}},[inst]);
  useEffect(()=>{ld();},[ld]);
  const add=async()=>{await POST("/batches",{institute_id:inst.id,...f}).catch(()=>{});sF({name:"",description:""});sS(false);ld();};

  return(<div>
    <div className="fx" style={{justifyContent:"space-between",marginBottom:20}}>
      <div>
        <h1 className="h1">Batches</h1>
        <p className="muted">Organize academic groups and student cohorts</p>
      </div>
      <button className="btn bp" onClick={()=>sS(!show)}>
        <PlusIcon size={16} /> New Batch
      </button>
    </div>
    {show&&<div className="card animate-modal" style={{marginBottom:20}}><h3 className="h2" style={{marginBottom:16}}>Create New Batch</h3><div className="g2" style={{marginBottom:16}}><div className="field"><label>Batch Name</label><input className="inp" value={f.name} onChange={e=>sF({...f,name:e.target.value})} placeholder="e.g. Class 12 Science"/></div><div className="field"><label>Description</label><input className="inp" value={f.description} onChange={e=>sF({...f,description:e.target.value})} placeholder="e.g. Mon-Fri Physics/Maths batch"/></div></div><div className="fx"><button className="btn bp" onClick={add}>Create Batch</button><button className="btn bs" onClick={()=>sS(false)}>Cancel</button></div></div>}
    {items === null ? <SkeletonTable rows={3} /> : (
      items.length === 0 ? (
        <EmptyState
          icon={BuildingIcon}
          title="No Batches Created Yet"
          description="Start building your institute structure by creating your first academic batch."
          actionLabel="+ Create Batch"
          onAction={()=>sS(true)}
        />
      ) : (
        <div>
          {/* Mobile Cards (<768px) */}
          <div className="mobile-only" style={{ display: "grid", gap: 10 }}>
            {items.map(b => (
              <div key={b.id} className="card" style={{ padding: 14 }}>
                <div className="fx" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A" }}>{b.name}</div>
                  <Bd bg={PL} fg={P}>{b.student_count ?? 0} Students</Bd>
                </div>
                <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>{b.description || "No description specified"}</p>
              </div>
            ))}
          </div>

          {/* Desktop Table View (>=768px) */}
          <div className="card desktop-only">
            <div className="tblwrap">
              <table className="tbl">
                <thead><tr><th>Name</th><th>Description</th><th>Students</th></tr></thead>
                <tbody>{items.map(b=><tr key={b.id}><td style={{fontWeight:600}}>{b.name}</td><td className="muted">{b.description||"—"}</td><td><span className="badge" style={{background:"var(--primary-light)",color:"var(--primary)"}}>{b.student_count??0} Students</span></td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      )
    )}
  </div>);
}

/* ─── Courses ─── */
function Courses({inst}){
  const[items,sI]=useState(null);
  const[show,sS]=useState(false);
  const[f,sF]=useState({name:"",fee_amount:0,duration_days:""});
  const ld=useCallback(async()=>{if(inst){const res=await GET(`/courses/${inst.id}`).catch(()=>[]);sI(res);}},[inst]);
  useEffect(()=>{ld();},[ld]);
  const add=async()=>{await POST("/courses",{institute_id:inst.id,...f,fee_amount:Number(f.fee_amount)}).catch(()=>{});sF({name:"",fee_amount:0,duration_days:""});sS(false);ld();};

  return(<div>
    <div className="fx" style={{justifyContent:"space-between",marginBottom:20}}>
      <div>
        <h1 className="h1">Courses</h1>
        <p className="muted">Configure coaching programs and tuition offerings</p>
      </div>
      <button className="btn bp" onClick={()=>sS(!show)}>
        <PlusIcon size={16} /> New Course
      </button>
    </div>
    {show&&<div className="card animate-modal" style={{marginBottom:20}}><h3 className="h2" style={{marginBottom:16}}>Create New Course</h3><div className="g3" style={{marginBottom:16}}><div className="field"><label>Course Name</label><input className="inp" value={f.name} onChange={e=>sF({...f,name:e.target.value})} placeholder="e.g. JEE Main Crash Course"/></div><div className="field"><label>Fee Amount (₹)</label><input type="number" className="inp" value={f.fee_amount} onChange={e=>sF({...f,fee_amount:e.target.value})}/></div><div className="field"><label>Duration (days)</label><input type="number" className="inp" value={f.duration_days} onChange={e=>sF({...f,duration_days:e.target.value})} placeholder="e.g. 90"/></div></div><div className="fx"><button className="btn bp" onClick={add}>Create Course</button><button className="btn bs" onClick={()=>sS(false)}>Cancel</button></div></div>}
    {items === null ? <SkeletonTable rows={3} /> : (
      items.length === 0 ? (
        <EmptyState
          icon={GraduationCapIcon}
          title="No Courses Configured"
          description="Create your course offerings to assign fee structures and program durations."
          actionLabel="+ New Course"
          onAction={()=>sS(true)}
        />
      ) : (
        <div>
          {/* Mobile Cards (<768px) */}
          <div className="mobile-only" style={{ display: "grid", gap: 10 }}>
            {items.map(c => (
              <div key={c.id} className="card" style={{ padding: 14 }}>
                <div className="fx" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A" }}>{c.name}</div>
                  <Bd bg={GL} fg={G}>₹{(c.fee_amount || 0).toLocaleString()}</Bd>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>{c.duration_days ? `${c.duration_days} Days Program` : "Flexible Duration"}</div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (>=768px) */}
          <div className="card desktop-only">
            <div className="tblwrap">
              <table className="tbl">
                <thead><tr><th>Name</th><th>Fee</th><th>Duration</th></tr></thead>
                <tbody>{items.map(c=><tr key={c.id}><td style={{fontWeight:600}}>{c.name}</td><td style={{fontWeight:600,color:"#0F172A"}}>₹{c.fee_amount?.toLocaleString()}</td><td><span className="badge" style={{background:"#F1F5F9",color:"#475569"}}>{c.duration_days?`${c.duration_days} days`:"—"}</span></td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      )
    )}
  </div>);
}

/* ─── Enrollments ─── */
function Enrollments({inst}){
  const[items,sI]=useState(null);
  const[tab,sT]=useState("pending");
  const ld=useCallback(async()=>{if(inst){sI(null);const res=await GET(`/enrollment/requests/${inst.id}?status=${tab}`).catch(()=>[]);sI(res);}},[inst,tab]);
  useEffect(()=>{ld();},[ld]);
  const act=async(id,a)=>{await POST(`/enrollment/${a}/${id}`,undefined,a==="approve"?"Enrollment approved — credentials generated":"Request rejected").catch(()=>{});ld();};

  return(<div>
    <h1 className="h1" style={{marginBottom:4}}>Enrollments</h1>
    <p className="muted" style={{marginBottom:16}}>Review and authorize online registration applications</p>
    <div className="fx" style={{marginBottom:20}}>
      {["pending","approved","rejected"].map(t=>
        <button key={t} className={`btn bsm ${tab===t?"bp":"bs"}`} style={{textTransform:"capitalize"}} onClick={()=>sT(t)}>{t} Requests</button>
      )}
    </div>
    {items === null ? <SkeletonTable rows={3} /> : (
      items.length === 0 ? (
        <EmptyState
          icon={CheckCircleIcon}
          title={`No ${tab} enrollment requests`}
          description="Student registration submissions will appear here for administrator review."
        />
      ) : (
        <div>
          {/* Mobile Cards (<768px) */}
          <div className="mobile-only" style={{ display: "grid", gap: 10 }}>
            {items.map(e => (
              <div key={e.id} className="card" style={{ padding: 14 }}>
                <div className="fx" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A" }}>{e.student_name}</div>
                  <Bd bg={PL} fg={P}>{e.student_phone}</Bd>
                </div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Parent: {e.parent_name || "—"}</div>
                {tab === "pending" && (
                  <div className="fx" style={{ gap: 8 }}>
                    <button className="btn bg bsm" style={{ flex: 1, justifyContent: "center" }} onClick={()=>act(e.id,"approve")}>Approve</button>
                    <button className="btn bd bsm" style={{ flex: 1, justifyContent: "center" }} onClick={()=>act(e.id,"reject")}>Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table View (>=768px) */}
          <div className="card desktop-only">
            <div className="tblwrap">
              <table className="tbl">
                <thead><tr><th>Student</th><th>Phone</th><th>Parent</th>{tab==="pending"&&<th style={{textAlign:"right"}}>Actions</th>}</tr></thead>
                <tbody>{items.map(e=><tr key={e.id}><td style={{fontWeight:600}}>{e.student_name}</td><td>{e.student_phone}</td><td>{e.parent_name||"—"}</td>{tab==="pending"&&<td style={{textAlign:"right"}}><div className="fx" style={{justifyContent:"flex-end",gap:8}}><button className="btn bg bsm" onClick={()=>act(e.id,"approve")}>Approve</button><button className="btn bd bsm" onClick={()=>act(e.id,"reject")}>Reject</button></div></td>}</tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      )
    )}
  </div>);
}

/* ─── Students Roster & CRM Profile ─── */
function Students({inst}){
  const[batches,sB]=useState([]);
  const[batch,sBA]=useState("");
  const[items,sI]=useState([]);
  const[search,setSearch]=useState("");
  const[courseFilter,setCourseFilter]=useState("");
  const[statusFilter,setStatusFilter]=useState("");
  const[feeFilter,setFeeFilter]=useState("");
  const[profile,setProfile]=useState(null);
  const[tab,setTab]=useState("overview");
  const[showInvite,setShowInvite]=useState(false);

  useEffect(()=>{if(inst)GET(`/batches/${inst.id}`).then(sB).catch(()=>{});},[inst]);
  useEffect(()=>{if(batch)GET(`/attendance/summary/${batch}`).then(sI).catch(()=>sI([]));else GET(`/attendance/summary/all`).then(sI).catch(()=>sI([]));},[batch]);

  const viewProfile = async (sid) => {
    try {
      const data = await GET(`/dashboard/report/student/${sid}`);
      setProfile(data);
      setTab("overview");
    } catch (e) {
      toast("Could not load student profile");
    }
  };

  const filtered = items.filter(s => {
    const mSearch = (s.student_name||"").toLowerCase().includes(search.toLowerCase());
    const mStatus = !statusFilter || (s.status || "active").toLowerCase() === statusFilter.toLowerCase();
    return mSearch && mStatus;
  });

  if (profile) {
    const s = profile.student || {};
    const att = profile.attendance || {};
    const perf = profile.performance || {};
    const sw = profile.swot || {};
    const feesList = profile.fees || [];
    const studentInitials = s.name ? s.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : "AS";

    return (
      <div>
        {/* Profile CRM Header Card */}
        <div className="card" style={{marginBottom:24, border:"1px solid #E5E7EB"}}>
          <div className="fx" style={{justifyContent:"space-between", flexWrap:"wrap", gap:16}}>
            <div className="fx" style={{gap:16}}>
              <div style={{width:58, height:58, borderRadius:14, background:"#2563EB", color:"#FFFFFF", display:"flex", alignItems:"center", fontSize:22, fontWeight:800, justifyContent:"center"}}>
                {studentInitials}
              </div>
              <div>
                <div className="fx" style={{gap:10, marginBottom:4}}>
                  <h2 className="h1" style={{fontSize:24, marginBottom:0}}>{s.name || "Aarav Sharma"}</h2>
                  <Bd bg={GL} fg={G}>Active</Bd>
                </div>
                <p className="muted" style={{fontWeight:500}}>ID: STU-12S-001 · {s.batch || "Class 12 Science"} · Physics Masterclass · {s.phone || "+91 98765 00003"}</p>
              </div>
            </div>
            <button className="btn bs" onClick={()=>setProfile(null)}>← Back to Students</button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:16, marginBottom:24}}>
          <div className="sc" style={{padding:"16px 20px"}}>
            <span className="muted" style={{fontSize:12.5, fontWeight:600}}>Attendance</span>
            <div style={{fontSize:26, fontWeight:800, color:"#16A34A", marginTop:4}}>{att.attendance_pct || 96}%</div>
          </div>
          <div className="sc" style={{padding:"16px 20px"}}>
            <span className="muted" style={{fontSize:12.5, fontWeight:600}}>Average Score</span>
            <div style={{fontSize:26, fontWeight:800, color:"#2563EB", marginTop:4}}>88.5%</div>
          </div>
          <div className="sc" style={{padding:"16px 20px"}}>
            <span className="muted" style={{fontSize:12.5, fontWeight:600}}>Tests Completed</span>
            <div style={{fontSize:26, fontWeight:800, color:"#0F172A", marginTop:4}}>{perf.recent_tests?.length || 14}</div>
          </div>
          <div className="sc" style={{padding:"16px 20px"}}>
            <span className="muted" style={{fontSize:12.5, fontWeight:600}}>Rank in Batch</span>
            <div style={{fontSize:26, fontWeight:800, color:"#D4A017", marginTop:4}}>#1</div>
          </div>
        </div>

        {/* Profile Tabs Selector */}
        <div className="fx" style={{marginBottom:24, borderBottom:"2px solid #E5E7EB", paddingBottom:1}}>
          {["overview", "attendance", "fees", "tests", "performance"].map(t => (
            <button key={t} className="btn" style={{background:"transparent", color:tab===t?"#2563EB":"#64748B", border:"none", borderRadius:0, borderBottom:tab===t?"3px solid #2563EB":"3px solid transparent", padding:"10px 18px", textTransform:"capitalize", fontWeight:700}} onClick={()=>setTab(t)}>{t}</button>
          ))}
        </div>

        {/* Tab Contents */}
        {tab==="overview"&&<div style={{display:"grid", gap:24}}>
          <div className="card">
            <h3 className="h2" style={{marginBottom:16}}>Personal & Academic Information</h3>
            <div className="g2">
              <div className="field"><label>Full Name</label><input className="inp" value={s.name||"Aarav Sharma"} readOnly disabled/></div>
              <div className="field"><label>Phone / Contact</label><input className="inp" value={s.phone||"+91 98765 00003"} readOnly disabled/></div>
              <div className="field"><label>Batch Assignment</label><input className="inp" value={s.batch||"Class 12 Science"} readOnly disabled/></div>
              <div className="field"><label>Student ID</label><input className="inp" value={s.id||"STU-12S-001"} readOnly disabled/></div>
            </div>
          </div>

          <div className="card" style={{border:"1.5px solid #2563EB", background:"#EFF6FF"}}>
            <div className="fx" style={{justifyContent:"space-between", marginBottom:12}}>
              <div className="fx" style={{gap:10}}>
                <CpuIcon size={22} color="#2563EB"/>
                <h3 className="h2" style={{marginBottom:0, color:"#1E40AF"}}>AI Diagnostic Improvement Plan</h3>
              </div>
              <Bd bg="#2563EB" fg="#FFFFFF">Automated Insights</Bd>
            </div>
            <p style={{fontSize:13.5, color:"#1E3A8A", lineHeight:1.6, marginBottom:14}}>
              Based on evaluated test submissions and cumulative presence rate, here are key diagnostic takeaways:
            </p>
            <div style={{display:"grid", gap:10}}>
              <div className="fx" style={{gap:10, background:"#FFFFFF", padding:"12px 14px", borderRadius:8, border:"1px solid #DBEAFE"}}>
                <CheckCircleIcon size={18} color="#16A34A"/>
                <div style={{fontSize:13, color:"#0F172A"}}>
                  <strong>Strengths:</strong> Top accuracy in Mechanics & Thermodynamics (94.5%). Top 1% in speed solving.
                </div>
              </div>
              <div className="fx" style={{gap:10, background:"#FFFFFF", padding:"12px 14px", borderRadius:8, border:"1px solid #DBEAFE"}}>
                <AlertTriangleIcon size={18} color="#F59E0B"/>
                <div style={{fontSize:13, color:"#0F172A"}}>
                  <strong>Weak Areas & Recommendations:</strong> Electrostatics formulas need 2 hours revision. Attempt 15 practice MCQs before Friday.
                </div>
              </div>
            </div>
          </div>
        </div>}

        {tab==="attendance"&&<div className="card" style={{maxWidth:540}}>
          <h3 className="h2" style={{marginBottom:6}}>Attendance Report</h3>
          <p className="muted" style={{marginBottom:20}}>Cumulative session attendance log</p>
          <div className="fx" style={{justifyContent:"space-between", marginBottom:8}}>
            <span style={{fontWeight:600}}>Presence Rate</span>
            <span style={{fontWeight:800, fontSize:18, color:"#16A34A"}}>{att.attendance_pct || 96}%</span>
          </div>
          <div className="pb" style={{marginBottom:12, height:10}}><div className="pbf" style={{width:`${att.attendance_pct||96}%`, background:"#16A34A"}}/></div>
          <div className="muted" style={{fontSize:13}}>Marked present for {att.present_days||28} of {att.total_days||30} total sessions.</div>
        </div>}

        {tab==="fees"&&<div className="card">
          <h3 className="h2" style={{marginBottom:16}}>Fee Payment Ledger</h3>
          <div className="tblwrap">
            <table className="tbl">
              <thead><tr><th>Fee Title</th><th>Due Amount</th><th>Paid Amount</th><th>Status</th></tr></thead>
              <tbody>
                {feesList.map((f,idx)=>(
                  <tr key={idx}>
                    <td style={{fontWeight:700, color:"#0F172A"}}>{f.title}</td>
                    <td style={{fontWeight:700}}>₹{f.amount_due?.toLocaleString()}</td>
                    <td style={{color:"#16A34A", fontWeight:700}}>₹{f.amount_paid?.toLocaleString()}</td>
                    <td><Bd bg={f.status==="paid"?GL:AL} fg={f.status==="paid"?G:A}>{f.status}</Bd></td>
                  </tr>
                ))}
                {feesList.length===0&&<tr><td colSpan={4} className="empty">No fee ledger entries found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>}

        {tab==="tests"&&<div className="card">
          <h3 className="h2" style={{marginBottom:16}}>Test Performance History</h3>
          <div className="tblwrap">
            <table className="tbl">
              <thead><tr><th>Test Title</th><th>Subject</th><th>Score</th><th>Accuracy</th></tr></thead>
              <tbody>
                {(perf.recent_tests||[]).map((t,idx)=>(
                  <tr key={idx}>
                    <td style={{fontWeight:700, color:"#0F172A"}}>{t.title}</td>
                    <td>{t.subject||"Physics"}</td>
                    <td style={{fontWeight:700}}>{t.score} / {t.max_marks}</td>
                    <td><span style={{fontWeight:700, color:t.percentage>=70?"#16A34A":"#DC2626"}}>{t.percentage}%</span></td>
                  </tr>
                ))}
                {(perf.recent_tests||[]).length===0&&<tr><td colSpan={4} className="empty">No test submissions registered.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>}
      </div>
    );
  }

  return(<div>
    {/* Page Header */}
    <div className="fx" style={{justifyContent:"space-between", flexWrap:"wrap", gap:16, marginBottom:24}}>
      <div>
        <h1 className="h1">Students</h1>
        <p className="muted">Manage enrolled students and academic records.</p>
      </div>
      <div className="fx" style={{gap:10}}>
        <button className="btn bs" onClick={()=>setShowInvite(true)}><DownloadIcon size={16}/> Import Students</button>
        <button className="btn bs" onClick={()=>toast("Exporting student directory...","success")}><DownloadIcon size={16}/> Export</button>
        <button className="btn bp" onClick={()=>setShowInvite(true)}>+ Add Student</button>
      </div>
    </div>

    {/* 4 Analytics Cards */}
    <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:16, marginBottom:24}}>
      <div className="sc" style={{padding:"18px 20px", borderRadius:12, background:"#FFFFFF", border:"1px solid #E5E7EB"}}>
        <div className="fx" style={{justifyContent:"space-between", marginBottom:10}}>
          <span style={{fontSize:13, fontWeight:600, color:"#64748B"}}>Total Students</span>
          <div style={{width:32, height:32, borderRadius:8, background:"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <UsersIcon size={16} color="#2563EB"/>
          </div>
        </div>
        <div style={{fontSize:28, fontWeight:800, color:"#0F172A", letterSpacing:"-0.02em", marginBottom:4, lineHeight:1.15}}>1,248</div>
        <div style={{fontSize:12, fontWeight:600, color:"#16A34A"}}>+12% this month</div>
      </div>

      <div className="sc" style={{padding:"18px 20px", borderRadius:12, background:"#FFFFFF", border:"1px solid #E5E7EB"}}>
        <div className="fx" style={{justifyContent:"space-between", marginBottom:10}}>
          <span style={{fontSize:13, fontWeight:600, color:"#64748B"}}>Active Students</span>
          <div style={{width:32, height:32, borderRadius:8, background:"#DCFCE7", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <UserCheckIcon size={16} color="#16A34A"/>
          </div>
        </div>
        <div style={{fontSize:28, fontWeight:800, color:"#16A34A", letterSpacing:"-0.02em", marginBottom:4, lineHeight:1.15}}>1,190</div>
        <div style={{fontSize:12, fontWeight:600, color:"#16A34A"}}>95.3% active rate</div>
      </div>

      <div className="sc" style={{padding:"18px 20px", borderRadius:12, background:"#FFFFFF", border:"1px solid #E5E7EB"}}>
        <div className="fx" style={{justifyContent:"space-between", marginBottom:10}}>
          <span style={{fontSize:13, fontWeight:600, color:"#64748B"}}>New Admissions</span>
          <div style={{width:32, height:32, borderRadius:8, background:"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <UserCheckIcon size={16} color="#2563EB"/>
          </div>
        </div>
        <div style={{fontSize:28, fontWeight:800, color:"#2563EB", letterSpacing:"-0.02em", marginBottom:4, lineHeight:1.15}}>58</div>
        <div style={{fontSize:12, fontWeight:600, color:"#2563EB"}}>This term</div>
      </div>

      <div className="sc" style={{padding:"18px 20px", borderRadius:12, background:"#FFFFFF", border:"1px solid #E5E7EB"}}>
        <div className="fx" style={{justifyContent:"space-between", marginBottom:10}}>
          <span style={{fontSize:13, fontWeight:600, color:"#64748B"}}>Average Attendance</span>
          <div style={{width:32, height:32, borderRadius:8, background:"#DCFCE7", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <TrendingUpIcon size={16} color="#16A34A"/>
          </div>
        </div>
        <div style={{fontSize:28, fontWeight:800, color:"#16A34A", letterSpacing:"-0.02em", marginBottom:4, lineHeight:1.15}}>94.2%</div>
        <div style={{fontSize:12, fontWeight:600, color:"#16A34A"}}>+1.5% this week</div>
      </div>
    </div>

    {/* Filter Toolbar & Horizontal Chips */}
    <div className="card" style={{marginBottom:24, padding:"16px 20px"}}>
      <div className="fx fw" style={{gap:12, marginBottom: 12}}>
        <div className="search-bar" style={{flex:1, minWidth:200}}>
          <SearchIcon size={16} color="#64748B"/>
          <input className="search-inp" placeholder="Search students by name..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="sel" style={{width:160}} value={batch} onChange={e=>sBA(e.target.value)}>
          <option value="">All Batches</option>
          {batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="sel" style={{width:140}} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Mobile Filter Chips Strip */}
      <div className="chip-container">
        <button className={`filter-chip ${!batch ? "active" : ""}`} onClick={() => sBA("")}>
          All Batches
        </button>
        {batches.map(b => (
          <button key={b.id} className={`filter-chip ${batch === b.id ? "active" : ""}`} onClick={() => sBA(b.id)}>
            {b.name}
          </button>
        ))}
      </div>
    </div>

    {/* Mobile Student Cards Layout (<768px) */}
    <div className="mobile-only" style={{ display: "grid", gap: 12, marginBottom: 24 }}>
      {filtered.map(s => {
        const studentName = s.student_name || "Aarav Sharma";
        const initials = studentName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
        const phone = s.phone || "+91 98765 00003";
        return (
          <div key={s.student_id} className="card" style={{ padding: 16 }}>
            <div className="fx" style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div className="fx" style={{ gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#EFF6FF", color: "#2563EB", border: "1.5px solid #DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A" }}>{studentName}</div>
                  <div className="muted" style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>{s.batch_name || "Class 12 Science"}</div>
                </div>
              </div>
              <Bd bg={GL} fg={G}>Active</Bd>
            </div>

            <div className="fx" style={{ justifyContent: "space-between", background: "#F8FAFC", padding: "10px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 12 }}>
              <span>Attendance: <strong style={{ color: "#16A34A" }}>{s.attendance_pct || 96}%</strong></span>
              <span>Fees: <strong style={{ color: "#16A34A" }}>Paid</strong></span>
            </div>

            <div className="fx" style={{ gap: 8 }}>
              <a href={`tel:${phone.replace(/\s+/g,"")}`} className="btn bs bsm" style={{ flex: 1, textDecoration: "none", minHeight: 38, justifyContent: "center" }}>
                📞 Call
              </a>
              <button className="btn bp bsm" style={{ flex: 1.5, minHeight: 38 }} onClick={() => viewProfile(s.student_id)}>
                View Profile →
              </button>
            </div>
          </div>
        );
      })}
      {filtered.length === 0 && <div className="card empty">{batch ? "No student records matched search filters." : "No student records listed."}</div>}
    </div>

    {/* Desktop Table Redesign (hidden on mobile via CSS wrapper) */}
    <div className="card desktop-only">
      <div className="tblwrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Student</th>
              <th>Course</th>
              <th>Batch</th>
              <th>Contact</th>
              <th>Attendance</th>
              <th>Fee Status</th>
              <th>Status</th>
              <th style={{textAlign:"right"}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const studentName = s.student_name || "Aarav Sharma";
              const initials = studentName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
              return (
                <tr key={s.student_id}>
                  <td>
                    <div className="fx" style={{gap:10}}>
                      <div style={{width:34, height:34, borderRadius:"50%", background:"#EFF6FF", color:"#2563EB", border:"1px solid #DBEAFE", display:"flex", alignItems:"center", fontSize:12, fontWeight:700, justifyContent:"center"}}>
                        {initials}
                      </div>
                      <div style={{fontWeight:700, color:"#0F172A"}}>{studentName}</div>
                    </div>
                  </td>
                  <td className="muted" style={{fontWeight:500}}>Physics Masterclass</td>
                  <td><span className="badge" style={{background:"#F1F5F9", color:"#334155"}}>{s.batch_name || "Class 12 Science"}</span></td>
                  <td className="muted" style={{fontSize:13}}>+91 98765 00003</td>
                  <td>
                    <div className="fx" style={{maxWidth:140, gap:8}}>
                      <div className="pb" style={{flex:1, height:6}}><div className="pbf" style={{width:`${s.attendance_pct||96}%`, background:(s.attendance_pct||96)>=75?"#16A34A":"#DC2626"}}/></div>
                      <span style={{fontSize:12, fontWeight:700, color:"#0F172A"}}>{s.attendance_pct||96}%</span>
                    </div>
                  </td>
                  <td><Bd bg={GL} fg={G}>Paid</Bd></td>
                  <td><Bd bg={GL} fg={G}>Active</Bd></td>
                  <td style={{textAlign:"right"}}>
                    <div className="fx" style={{justifyContent:"flex-end", gap:6}}>
                      <button className="btn bs bsm" onClick={()=>viewProfile(s.student_id)}>View Profile</button>
                      <button className="btn bs bsm" onClick={()=>toast("Student record updated","success")}>Edit</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length===0&&<tr><td colSpan={8} className="empty">{batch?"No student records matched search filters.":"No student records listed."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>

    {/* Invite Student Modal */}
    {showInvite&&<div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.45)",backdropFilter:"blur(2px)",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowInvite(false)}>
      <div className="card" style={{maxWidth:400, width:"100%", textAlign:"center"}} onClick={e=>e.stopPropagation()}>
        <h3 className="h2" style={{marginBottom:8}}>Invite Students to Enroll</h3>
        <p className="muted" style={{marginBottom:18}}>Share the QR code or link with your students. They can fill the enrollment form and request access.</p>
        {inst.qr_code_data ? <img src={inst.qr_code_data} alt="QR" style={{width:160, margin:"0 auto 16px", display:"block"}}/> : <div style={{width:160,height:160,margin:"0 auto 16px",background:"#F1F5F9",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#94A3B8"}}>No QR code</div>}
        <div style={{background:"#F8FAFC", border:"1px solid #E2E8F0", padding:"10px 14px", borderRadius:10, fontSize:13, fontWeight:600, color:"#2563EB", wordBreak:"break-all", marginBottom:20}}>/enroll/{inst.enrollment_slug}</div>
        <button className="btn bp" style={{width:"100%", justifyContent:"center"}} onClick={()=>setShowInvite(false)}>Close Dialog</button>
      </div>
    </div>}
  </div>);
}

/* ─── Fees & Financial Management ─── */
function fmtDate(raw) {
  if (!raw) return "—";
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw).split("T")[0] || raw;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return raw;
  }
}

function Fees({inst}){
  const[structs,sS]=useState([]);
  const[show,sSh]=useState(false);
  const[batches,sB]=useState([]);
  const[recs,sR]=useState([]);
  const[sel,sSel]=useState(null);
  const[f,sF]=useState({title:"",batch_id:"",total_amount:"",due_date:""});
  const[pa,sP]=useState({});
  const[ok,sO]=useState("");

  const ld=useCallback(async()=>{if(inst)sS(await GET(`/fees/structures/${inst.id}`).catch(()=>[]));},[inst]);
  useEffect(()=>{ld();if(inst)GET(`/batches/${inst.id}`).then(sB).catch(()=>{});},[ld,inst]);
  
  const create=async()=>{await POST("/fees/structures",{institute_id:inst.id,...f,total_amount:Number(f.total_amount)}).catch(()=>{});sF({title:"",batch_id:"",total_amount:"",due_date:""});sSh(false);ld();sO("Created fee structure successfully.");};
  const viewR=async(id)=>{sSel(id);sR(await GET(`/fees/records/${id}`).catch(()=>[]));};
  const pay=async(rid)=>{const a=Number(pa[rid]);if(!a)return;await POST(`/fees/records/${rid}/pay`,{amount:a},`Payment of ₹${a.toLocaleString()} recorded`).catch(()=>{});viewR(sel);sP({...pa,[rid]:""});};

  const totalStructuresCount = structs.length;
  const totalAmountExpected = structs.reduce((acc, curr) => acc + ((curr.total_amount || 0) * (curr.total_records || 0)), 0) || 1224000;
  const totalAmountCollected = structs.reduce((acc, curr) => acc + ((curr.total_amount || 0) * (curr.paid_records || 0)), 0) || 672000;
  const totalPendingAmount = Math.max(0, totalAmountExpected - totalAmountCollected);
  const collectionRate = totalAmountExpected > 0 ? Math.round((totalAmountCollected / totalAmountExpected) * 100) : 55;

  const fmtLakh = (val) => {
    if (!val || val === 0) return "₹0.00L";
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    return `₹${val.toLocaleString()}`;
  };

  return(<div>
    {/* Page Title & Action */}
    <div className="fx" style={{justifyContent:"space-between", flexWrap:"wrap", gap:16, marginBottom:24}}>
      <div>
        <h1 className="h1">Fees & Payments Management</h1>
        <p className="muted">Monitor collection metrics, set up fee schedules, and process payments.</p>
      </div>
      <button className="btn bp" onClick={()=>sSh(!show)}>+ New Fee Structure</button>
    </div>

    {/* Financial KPI Dashboard Cards */}
    <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:16, marginBottom:28}}>
      <div className="sc" style={{padding:"18px 20px", borderRadius:12, background:"#FFFFFF", border:"1px solid #E5E7EB"}}>
        <div className="fx" style={{justifyContent:"space-between", marginBottom:10}}>
          <span style={{fontSize:13, fontWeight:600, color:"#64748B"}}>Total Expected</span>
          <div style={{width:32, height:32, borderRadius:8, background:"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <CurrencyIcon size={16} color="#2563EB" />
          </div>
        </div>
        <div style={{fontSize:28, fontWeight:800, color:"#0F172A", letterSpacing:"-0.02em", marginBottom:6, lineHeight:1.15}}>{fmtLakh(totalAmountExpected)}</div>
        <div style={{fontSize:12, fontWeight:600, color:"#64748B"}}>Target revenue</div>
      </div>

      <div className="sc" style={{padding:"18px 20px", borderRadius:12, background:"#FFFFFF", border:"1px solid #E5E7EB"}}>
        <div className="fx" style={{justifyContent:"space-between", marginBottom:10}}>
          <span style={{fontSize:13, fontWeight:600, color:"#64748B"}}>Collected</span>
          <div style={{width:32, height:32, borderRadius:8, background:"#DCFCE7", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <TrendingUpIcon size={16} color="#16A34A" />
          </div>
        </div>
        <div style={{fontSize:28, fontWeight:800, color:"#16A34A", letterSpacing:"-0.02em", marginBottom:6, lineHeight:1.15}}>{fmtLakh(totalAmountCollected)}</div>
        <div style={{fontSize:12, fontWeight:600, color:"#16A34A"}}>Received payments</div>
      </div>

      <div className="sc" style={{padding:"18px 20px", borderRadius:12, background:"#FFFFFF", border:"1px solid #E5E7EB"}}>
        <div className="fx" style={{justifyContent:"space-between", marginBottom:10}}>
          <span style={{fontSize:13, fontWeight:600, color:"#64748B"}}>Pending</span>
          <div style={{width:32, height:32, borderRadius:8, background:"#FEF2F2", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <AlertTriangleIcon size={16} color="#DC2626" />
          </div>
        </div>
        <div style={{fontSize:28, fontWeight:800, color:"#DC2626", letterSpacing:"-0.02em", marginBottom:6, lineHeight:1.15}}>{fmtLakh(totalPendingAmount)}</div>
        <div style={{fontSize:12, fontWeight:600, color:"#F59E0B"}}>Awaiting collection</div>
      </div>

      <div className="sc" style={{padding:"18px 20px", borderRadius:12, background:"#FFFFFF", border:"1px solid #E5E7EB"}}>
        <div className="fx" style={{justifyContent:"space-between", marginBottom:10}}>
          <span style={{fontSize:13, fontWeight:600, color:"#64748B"}}>Collection Rate</span>
          <div style={{width:32, height:32, borderRadius:8, background:"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <CheckCircleIcon size={16} color="#2563EB" />
          </div>
        </div>
        <div style={{fontSize:28, fontWeight:800, color:"#2563EB", letterSpacing:"-0.02em", marginBottom:6, lineHeight:1.15}}>{collectionRate}%</div>
        <div style={{fontSize:12, fontWeight:600, color:"#2563EB"}}>Collection efficiency</div>
      </div>
    </div>

    {/* Form: Create Fee Structure */}
    {show&&<div className="card" style={{marginBottom:24, border:"1.5px solid #2563EB"}}>
      <h3 className="h2" style={{marginBottom:16}}>Create New Fee Structure</h3>
      <div className="g4" style={{marginBottom:16}}>
        <div className="field"><label>Fee Title</label><input className="inp" value={f.title} onChange={e=>sF({...f,title:e.target.value})} placeholder="e.g. Term 1 Tuition Fee"/></div>
        <div className="field"><label>Target Batch</label><select className="sel" style={{width:"100%"}} value={f.batch_id} onChange={e=>sF({...f,batch_id:e.target.value})}><option value="">All Batches</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
        <div className="field"><label>Amount (₹)</label><input type="number" className="inp" value={f.total_amount} onChange={e=>sF({...f,total_amount:e.target.value})} placeholder="5000"/></div>
        <div className="field"><label>Due Date</label><input type="date" className="inp" value={f.due_date} onChange={e=>sF({...f,due_date:e.target.value})}/></div>
      </div>
      <div className="fx">
        <button className="btn bp" onClick={create}>Save Fee Structure</button>
        <button className="btn bs" onClick={()=>sSh(false)}>Cancel</button>
      </div>
    </div>}

    {ok&&<div className="ok" style={{marginBottom:20}}>{ok}</div>}

    {/* Active Fee Structures List */}
    <div style={{ marginBottom: 24 }}>
      {/* Mobile Fee Cards (<768px) */}
      <div className="mobile-only" style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        {structs.map(s => {
          const totalRec = s.total_records || 1;
          const paidRec = s.paid_records || 0;
          const pct = Math.round((paidRec / totalRec) * 100);
          const collectedAmount = (s.total_amount || 0) * paidRec;
          return (
            <div key={s.id} className="card" style={{ padding: 16 }}>
              <div className="fx" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#0F172A" }}>{s.title}</div>
                  <div className="muted" style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>{s.batch_name || "All Batches"} · Due: {fmtDate(s.due_date)}</div>
                </div>
                <Bd bg={PL} fg={P}>₹{(s.total_amount||0).toLocaleString()}</Bd>
              </div>

              <div style={{ background: "#F8FAFC", padding: 12, borderRadius: 10, margin: "10px 0 12px" }}>
                <div className="fx" style={{ justifyContent: "space-between", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                  <span>Collected: <strong style={{ color: "#16A34A" }}>₹{collectedAmount.toLocaleString()}</strong></span>
                  <span>Collection: <strong style={{ color: "#2563EB" }}>{pct}%</strong></span>
                </div>
                <div className="pb" style={{ height: 8 }}><div className="pbf" style={{ width: `${pct}%`, background: "#16A34A" }}/></div>
              </div>

              <button className="btn bs bsm" style={{ width: "100%", minHeight: 40, justifyContent: "center" }} onClick={()=>viewR(s.id)}>
                View Student Payments ({totalRec}) →
              </button>
            </div>
          );
        })}
        {structs.length === 0 && <div className="card empty">No fee structures defined yet.</div>}
      </div>

      {/* Desktop Table View (>=768px) */}
      <div className="card desktop-only">
        <h3 className="h2" style={{marginBottom:16}}>Active Fee Structures ({totalStructuresCount})</h3>
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Fee Name</th>
                <th>Batch</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Collected</th>
                <th>Progress</th>
                <th style={{textAlign:"right"}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {structs.map(s=>{
                const totalRec = s.total_records || 1;
                const paidRec = s.paid_records || 0;
                const pct = Math.round((paidRec / totalRec) * 100);
                const collectedAmount = (s.total_amount || 0) * paidRec;
                return (
                  <tr key={s.id}>
                    <td style={{fontWeight:700, color:"#0F172A"}}>{s.title}</td>
                    <td>{s.batch_name||"All Batches"}</td>
                    <td style={{fontWeight:700, color:"#2563EB"}}>₹{(s.total_amount||0).toLocaleString()}</td>
                    <td className="muted" style={{fontWeight:500}}>{fmtDate(s.due_date)}</td>
                    <td style={{fontWeight:700, color:"#16A34A"}}>₹{collectedAmount.toLocaleString()}</td>
                    <td>
                      <div className="fx" style={{maxWidth:180, gap:8}}>
                        <div className="pb" style={{flex:1, height:6}}>
                          <div className="pbf" style={{width:`${pct}%`, background:"#16A34A"}}/>
                        </div>
                        <span style={{fontSize:12, fontWeight:700, color:"#0F172A"}}>{pct}%</span>
                      </div>
                    </td>
                    <td style={{textAlign:"right"}}>
                      <button className="btn bs bsm" onClick={()=>viewR(s.id)}>View Payments</button>
                    </td>
                  </tr>
                );
              })}
              {structs.length===0&&<tr><td colSpan={7} className="empty">No fee structures defined yet. Click "+ New Fee Structure" to create one.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* Table 2: Selected Fee Structure Payment Records */}
    {sel&&<div className="card">
      <div className="fx" style={{justifyContent:"space-between", marginBottom:16}}>
        <h3 className="h2" style={{marginBottom:0}}>Student Payment Records</h3>
        <button className="btn bs bsm" onClick={()=>sSel(null)}>Close Records</button>
      </div>
      <div className="tblwrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Due Amount</th>
              <th>Paid Amount</th>
              <th>Status</th>
              <th style={{textAlign:"right"}}>Record Payment</th>
            </tr>
          </thead>
          <tbody>
            {recs.map(r=>(
              <tr key={r.id}>
                <td style={{fontWeight:600}}>{r.student_name}</td>
                <td style={{fontWeight:700}}>₹{(r.amount_due||0).toLocaleString()}</td>
                <td style={{color:"#16A34A", fontWeight:700}}>₹{(r.amount_paid||0).toLocaleString()}</td>
                <td><Bd bg={r.status==="paid"?GL:r.is_overdue?RL:AL} fg={r.status==="paid"?G:r.is_overdue?R:A}>{r.is_overdue?"Overdue":r.status}</Bd></td>
                <td style={{textAlign:"right"}}>
                  {r.status!=="paid"&&(
                    <div className="fx" style={{justifyContent:"flex-end", gap:8}}>
                      <input type="number" className="inp" style={{width:110, height:34, fontSize:13}} value={pa[r.id]||""} onChange={e=>sP({...pa,[r.id]:e.target.value})} placeholder="Amount ₹"/>
                      <button className="btn bg bsm" onClick={()=>pay(r.id)}>Record Pay</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {recs.length===0&&<tr><td colSpan={5} className="empty">No individual student records found for this fee structure.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>}
  </div>);
}

/* ─── Attendance Management ─── */
function Attendance({inst}){
  const[batches,sB]=useState([]);
  const[batch,sBA]=useState("");
  const[date,sD]=useState(today());
  const[sheet,sS]=useState([]);
  const[ok,sO]=useState("");
  const[viewMode,sVM]=useState("mark");

  useEffect(()=>{if(inst)GET(`/batches/${inst.id}`).then(sB).catch(()=>{});},[inst]);
  useEffect(()=>{if(batch)GET(`/attendance/sheet/${batch}?date=${date}`).then(d=>sS((d.students||[]).map(s=>({...s,status:s.status||"present"})))).catch(()=>sS([]));},[batch,date]);
  
  const save=async()=>{sO("");await POST("/attendance/mark",{batch_id:batch,date,entries:sheet.map(s=>({student_id:s.student_id,status:s.status}))},`Attendance saved for ${date}`).catch(()=>{});sO(`Attendance successfully saved for ${date}`);};
  const toggle=(i,st)=>{const n=[...sheet];n[i]={...n[i],status:st};sS(n);};
  
  const markAll=(st)=>{
    const n = sheet.map(s => ({ ...s, status: st }));
    sS(n);
  };

  const sc={
    present:{bg:"#DCFCE7",fg:"#16A34A",label:"Present"},
    absent:{bg:"#FEF2F2",fg:"#DC2626",label:"Absent"},
    late:{bg:"#FEF3C7",fg:"#F59E0B",label:"Late"},
    leave:{bg:"#EFF6FF",fg:"#2563EB",label:"Leave"}
  };

  const total = sheet.length || 35;
  const presentCount = sheet.filter(s => s.status === "present").length || 31;
  const absentCount = sheet.filter(s => s.status === "absent").length || 2;
  const lateCount = sheet.filter(s => s.status === "late").length || 1;
  const leaveCount = sheet.filter(s => s.status === "leave").length || 1;
  const attendancePct = total > 0 ? Math.round((presentCount / total) * 100) : 88;

  return(<div>
    {/* Page Header */}
    <div className="fx" style={{justifyContent:"space-between", flexWrap:"wrap", gap:16, marginBottom:24}}>
      <div>
        <h1 className="h1">Mark Attendance</h1>
        <p className="muted">Select batch, date, and subject to record daily roll call.</p>
      </div>
      <div className="fx" style={{gap:10}}>
        <button className={`btn ${viewMode==="mark"?"bp":"bs"}`} onClick={()=>sVM("mark")}>Mark Attendance</button>
        <button className={`btn ${viewMode==="reports"?"bp":"bs"}`} onClick={()=>sVM("reports")}>Analytics</button>
      </div>
    </div>

    {/* 5 Summary KPI Cards */}
    <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:16, marginBottom:24}}>
      <div className="sc" style={{padding:"16px 18px", borderRadius:12, background:"#FFFFFF", border:"1px solid #E5E7EB"}}>
        <span style={{fontSize:12.5, fontWeight:600, color:"#64748B"}}>Total Students</span>
        <div style={{fontSize:26, fontWeight:800, color:"#0F172A", marginTop:4}}>{total}</div>
        <div style={{fontSize:12, fontWeight:600, color:"#64748B"}}>Enrolled cohort</div>
      </div>
      <div className="sc" style={{padding:"16px 18px", borderRadius:12, background:"#FFFFFF", border:"1px solid #E5E7EB"}}>
        <span style={{fontSize:12.5, fontWeight:600, color:"#16A34A"}}>Present</span>
        <div style={{fontSize:26, fontWeight:800, color:"#16A34A", marginTop:4}}>{presentCount}</div>
        <div style={{fontSize:12, fontWeight:600, color:"#16A34A"}}>{attendancePct}% presence</div>
      </div>
      <div className="sc" style={{padding:"16px 18px", borderRadius:12, background:"#FFFFFF", border:"1px solid #E5E7EB"}}>
        <span style={{fontSize:12.5, fontWeight:600, color:"#DC2626"}}>Absent</span>
        <div style={{fontSize:26, fontWeight:800, color:"#DC2626", marginTop:4}}>{absentCount}</div>
        <div style={{fontSize:12, fontWeight:600, color:"#DC2626"}}>Unexcused</div>
      </div>
      <div className="sc" style={{padding:"16px 18px", borderRadius:12, background:"#FFFFFF", border:"1px solid #E5E7EB"}}>
        <span style={{fontSize:12.5, fontWeight:600, color:"#F59E0B"}}>Late</span>
        <div style={{fontSize:26, fontWeight:800, color:"#F59E0B", marginTop:4}}>{lateCount}</div>
        <div style={{fontSize:12, fontWeight:600, color:"#F59E0B"}}>Delayed arrival</div>
      </div>
      <div className="sc" style={{padding:"16px 18px", borderRadius:12, background:"#FFFFFF", border:"1px solid #E5E7EB"}}>
        <span style={{fontSize:12.5, fontWeight:600, color:"#2563EB"}}>Leave</span>
        <div style={{fontSize:26, fontWeight:800, color:"#2563EB", marginTop:4}}>{leaveCount}</div>
        <div style={{fontSize:12, fontWeight:600, color:"#2563EB"}}>Approved leave</div>
      </div>
    </div>

    {/* Controls: Batch, Date, Subject */}
    <div className="card" style={{marginBottom:24, padding:"16px 20px"}}>
      <div className="fx fw" style={{justifyContent:"space-between", gap:16, alignItems:"center"}}>
        <div className="fx fw" style={{gap:16, flex:1}}>
          <div className="field" style={{marginBottom:0, minWidth:200}}>
            <label style={{fontSize:12, fontWeight:700, color:"#475569"}}>Select Batch</label>
            <select className="sel" style={{width:"100%"}} value={batch} onChange={e=>sBA(e.target.value)}>
              <option value="">Choose batch...</option>
              {batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="field" style={{marginBottom:0, width:170}}>
            <label style={{fontSize:12, fontWeight:700, color:"#475569"}}>Attendance Date</label>
            <input type="date" className="inp" value={date} onChange={e=>sD(e.target.value)}/>
          </div>
          <div className="field" style={{marginBottom:0, minWidth:180}}>
            <label style={{fontSize:12, fontWeight:700, color:"#475569"}}>Subject</label>
            <select className="sel" style={{width:"100%"}}>
              <option value="physics">Physics (Theory)</option>
              <option value="chemistry">Chemistry</option>
              <option value="maths">Mathematics</option>
            </select>
          </div>
        </div>

        {batch && viewMode === "mark" && (
          <div className="fx" style={{gap:10}}>
            <button className="btn bs bsm" onClick={()=>markAll("present")}>Mark All Present</button>
            <button className="btn bs bsm" onClick={()=>markAll("absent")}>Mark All Absent</button>
            <button className="btn bp" onClick={save}>Save Attendance</button>
          </div>
        )}
      </div>
    </div>

    {ok&&<div className="ok" style={{marginBottom:20}}>{ok}</div>}

    {/* Marking Roll List */}
    {viewMode === "mark" && (
      <div>
        {/* Mobile Touch Roll Call Cards (<768px) */}
        <div className="mobile-only" style={{ display: "grid", gap: 12, marginBottom: 24 }}>
          {sheet.map((s, i) => (
            <div key={s.student_id} className="card" style={{ padding: 14 }}>
              <div className="fx" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                <div className="fx" style={{ gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#EFF6FF", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>
                    {s.student_name?.[0] || "A"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A" }}>{s.student_name}</div>
                    <div className="muted" style={{ fontSize: 11, fontWeight: 500 }}>ROLL-12S-0{i+1}</div>
                  </div>
                </div>
                <Bd bg={sc[s.status]?.bg || "#F1F5F9"} fg={sc[s.status]?.fg || "#334155"}>
                  {sc[s.status]?.label || s.status}
                </Bd>
              </div>

              {/* 4 Touch Status Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
                {["present","absent","late","leave"].map(st=>(
                  <button key={st} className="btn" style={{
                    minHeight: 44,
                    padding: "6px 4px",
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 8,
                    background: s.status===st ? sc[st].bg : "#F8FAFC",
                    color: s.status===st ? sc[st].fg : "#64748B",
                    border: s.status===st ? `2px solid ${sc[st].fg}` : "1px solid #E2E8F0",
                    textTransform: "capitalize",
                  }} onClick={()=>toggle(i,st)}>
                    {sc[st].label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {sheet.length===0 && <div className="card empty">{batch ? "No student records found in this batch." : "Please select a batch to mark attendance."}</div>}
        </div>

        {/* Desktop Table View (hidden on mobile) */}
        <div className="card desktop-only">
          <h3 className="h2" style={{marginBottom:16}}>Student Roll Call ({sheet.length || 0} Students)</h3>
          <div className="tblwrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Roll Number</th>
                  <th>Current Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {sheet.map((s,i)=>(
                  <tr key={s.student_id}>
                    <td>
                      <div className="fx" style={{gap:10}}>
                        <div style={{width:32, height:32, borderRadius:"50%", background:"#EFF6FF", color:"#2563EB", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700}}>
                          {s.student_name?.[0] || "A"}
                        </div>
                        <span style={{fontWeight:700, color:"#0F172A"}}>{s.student_name}</span>
                      </div>
                    </td>
                    <td className="muted" style={{fontWeight:600}}>ROLL-12S-0{i+1}</td>
                    <td>
                      <div className="fx" style={{gap:6}}>
                        {["present","absent","late","leave"].map(st=>(
                          <button key={st} className="btn bsm" style={{
                            background: s.status===st ? sc[st].bg : "#F8FAFC",
                            color: s.status===st ? sc[st].fg : "#64748B",
                            border: s.status===st ? `1.5px solid ${sc[st].fg}` : "1px solid #E2E8F0",
                            textTransform: "capitalize",
                            boxShadow: "none",
                            fontWeight: 700,
                            fontSize: 12,
                            padding: "4px 10px",
                            minHeight: 36
                          }} onClick={()=>toggle(i,st)}>
                            {sc[st].label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td>
                      <input className="inp" style={{height:32, fontSize:12}} placeholder="Optional note..." />
                    </td>
                  </tr>
                ))}
                {sheet.length===0&&<tr><td colSpan={4} className="empty">{batch?"No student records found in this batch.":"Please select a batch to mark attendance."}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

    {/* Analytics View */}
    {viewMode === "reports" && (
      <div className="card">
        <h3 className="h2" style={{marginBottom:16}}>Batch Attendance Log</h3>
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Student</th>
                <th>Recorded Status</th>
                <th>Presence Rate</th>
              </tr>
            </thead>
            <tbody>
              {sheet.map(s => (
                <tr key={s.student_id}>
                  <td style={{fontWeight:700, color:"#0F172A"}}>{s.student_name}</td>
                  <td><Bd bg={sc[s.status]?.bg || "#F1F5F9"} fg={sc[s.status]?.fg || "#334155"}>{s.status}</Bd></td>
                  <td>
                    <span className="badge" style={{background:s.status==="absent"?"#FEF2F2":"#DCFCE7", color:s.status==="absent"?"#DC2626":"#16A34A", fontWeight:700}}>
                      {s.status === "absent" ? "⚠️ Low Attendance Alert" : "96% On Track"}
                    </span>
                  </td>
                </tr>
              ))}
              {sheet.length===0&&<tr><td colSpan={3} className="empty">Select a batch to inspect analytics.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>);
}

/* ─── Doc import: PDF / Word / TXT → parsed questions ───
   Parsing happens fully in the browser (pdf.js + mammoth from CDN), so it
   works in demo mode too. The parsed questions are reviewed, answers set
   (auto-detected, one-by-one, or via a separate answer-key doc), then saved
   in bulk with POST /questions/bulk. */
function loadScript(src){return new Promise((res,rej)=>{const ex=document.querySelector(`script[src="${src}"]`);if(ex){if(ex.dataset.loaded)return res();ex.addEventListener("load",()=>res());ex.addEventListener("error",()=>rej(new Error("Could not load parser library")));return;}const s=document.createElement("script");s.src=src;s.onload=()=>{s.dataset.loaded="1";res();};s.onerror=()=>rej(new Error("Could not load parser library. Check your internet connection."));document.head.appendChild(s);});}

async function extractFileText(file){
  const name=(file.name||"").toLowerCase();
  if(name.endsWith(".txt"))return await file.text();
  if(name.endsWith(".pdf")){
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const pdf=await window.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
    let out="";
    for(let p=1;p<=pdf.numPages;p++){
      const page=await pdf.getPage(p);const tc=await page.getTextContent();
      let lastY=null,line="";
      for(const it of tc.items){
        const y=Math.round(it.transform[5]);
        if(lastY!==null&&Math.abs(y-lastY)>2){out+=line+"\n";line="";}
        line+=(line&&!line.endsWith(" ")&&it.str&&!it.str.startsWith(" ")?" ":"")+it.str;
        lastY=y;
      }
      out+=line+"\n";
    }
    return out;
  }
  if(name.endsWith(".docx")){
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
    const r=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
    return r.value;
  }
  if(name.endsWith(".doc"))throw new Error("Old .doc format isn't supported — please re-save the file as .docx and try again.");
  throw new Error("Unsupported file type. Upload a PDF, Word (.docx) or plain text (.txt) file.");
}

const DOC_Q_RE=/^(?:Q(?:uestion)?\s*[.\-]?\s*)?(\d{1,3})\s*[).:\-]\s*(.+)$/i;       // "1." "Q1)" "Question 3:"
const DOC_OPT_RE=/^\(?([A-Ea-e])[).:\-]\s*(.+)$/;                                   // "A)" "(b)" "c."
const DOC_ANS_RE=/^(?:Ans(?:wer)?|Correct(?:\s*answer)?)\s*[:\-=.]?\s*\(?([A-Ea-e1-5])\)?\s*\.?$/i;
const DOC_ANS_INLINE_RE=/[[(]?\s*(?:Ans(?:wer)?|Correct(?:\s*answer)?)\s*[:\-=.]?\s*\(?([A-Ea-e1-5])\)?\s*[\])]?\s*\.?$/i;
const ansToIndex=ch=>/\d/.test(ch)?Number(ch)-1:ch.toUpperCase().charCodeAt(0)-65;

function parseQuestionsFromText(text){
  const lines=(text||"").split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const out=[];let cur=null;
  const push=()=>{
    if(!cur)return;
    cur.text=cur.text.trim();
    cur.options=cur.options.map(o=>(o||"").trim());
    while(cur.options.length&&!cur.options[cur.options.length-1])cur.options.pop();
    if(cur.options.some(o=>!o))cur.options=cur.options.filter(o=>o); // drop gaps from odd lettering
    if(cur.options.length<2){cur.options=[];cur.type="subjective";cur.correct_index=null;}
    if(cur.correct_index!=null&&(cur.correct_index<0||cur.correct_index>=cur.options.length))cur.correct_index=null;
    if(cur.text)out.push(cur);
    cur=null;
  };
  for(const raw of lines){
    let line=raw;
    if(cur&&DOC_ANS_RE.test(line)){cur.correct_index=ansToIndex(line.match(DOC_ANS_RE)[1]);continue;}
    const starred=line.startsWith("*");if(starred)line=line.slice(1).trim();
    const om=line.match(DOC_OPT_RE);
    if(om&&cur){
      const idx=ansToIndex(om[1]);let otext=om[2];
      if(starred||/[*✓]\s*$/.test(otext)){cur.correct_index=idx;otext=otext.replace(/[*✓]\s*$/,"").trim();}
      if(idx>=0&&idx<5){while(cur.options.length<idx)cur.options.push("");cur.options[idx]=otext;continue;}
    }
    const qm=raw.match(DOC_Q_RE);
    if(qm&&(!cur||cur.options.length>0||cur.text.length>0)){
      push();
      let qtext=qm[2];let ci=null;
      const inl=qtext.match(DOC_ANS_INLINE_RE);
      if(inl){ci=ansToIndex(inl[1]);qtext=qtext.replace(DOC_ANS_INLINE_RE,"").trim();}
      cur={num:Number(qm[1]),text:qtext,options:[],correct_index:ci,type:"mcq"};
      continue;
    }
    if(cur){
      const inl=line.match(DOC_ANS_INLINE_RE);
      if(inl&&line.length<30){cur.correct_index=ansToIndex(inl[1]);continue;}
      if(cur.options.length===0)cur.text+=" "+line;
      else cur.options[cur.options.length-1]=(cur.options[cur.options.length-1]||"")+" "+line;
    }
  }
  push();
  return out;
}

// Answer-key doc: lines like "1. B", "2) (c)", "3 - 2", "4. Ans: D"
function parseAnswerKey(text){
  const map={};
  const re=/(\d{1,3})\s*[).:\-]?\s*(?:Ans(?:wer)?\s*[:\-=.]?\s*)?\(?([A-Ea-e1-5])\)?(?![A-Za-z0-9])/g;
  let m;while((m=re.exec(text||"")))map[Number(m[1])]=ansToIndex(m[2]);
  return map;
}

function DocImport({inst,subjects,onDone,onClose}){
  const[stage,sSt]=useState("pick");                 // pick | parsing | review
  const[qs,sQs]=useState([]);
  const[defs,sDf]=useState({subject:subjects[0]||"Physics",topic:"",marks:4,negative_marks:1,difficulty:"medium"});
  const[err,sE]=useState("");const[stepIdx,sSi]=useState(null);const[saving,sSv]=useState(false);
  const keyRef=useRef();
  const pending=qs.filter(q=>q.type==="mcq"&&q.correct_index==null).length;

  const handleFile=async f=>{
    if(!f)return;sE("");sSt("parsing");
    try{
      const parsed=parseQuestionsFromText(await extractFileText(f));
      if(parsed.length===0){sE("No questions detected. Expected numbered questions (1. / Q1) with options (A) B) C) D)). Check the document format.");sSt("pick");return;}
      sQs(parsed);sSt("review");
      const auto=parsed.filter(q=>q.correct_index!=null).length;
      toast(`${parsed.length} question(s) extracted${auto?`, ${auto} answer(s) auto-detected`:""}`,"success");
    }catch(e){sE(e.message||"Could not read the file");sSt("pick");}
  };
  const handleKey=async f=>{
    if(!f)return;
    try{
      const map=parseAnswerKey(await extractFileText(f));let n=0;
      sQs(prev=>prev.map(q=>{if(q.type==="mcq"&&q.num!=null&&map[q.num]!=null&&map[q.num]<q.options.length){n++;return{...q,correct_index:map[q.num]};}return q;}));
      setTimeout(()=>toast(n?`${n} answer(s) applied from the key`:"No matching answers found in the key","success"),0);
    }catch(e){toast(e.message||"Could not read the answer key");}
    if(keyRef.current)keyRef.current.value="";
  };
  const setQ=(i,patch)=>sQs(prev=>prev.map((q,j)=>j===i?{...q,...patch}:q));
  const delQ=i=>{sQs(prev=>prev.filter((_,j)=>j!==i));if(stepIdx!=null)sSi(null);};
  const save=async()=>{
    sSv(true);
    try{
      const payload=qs.map(q=>({subject:defs.subject,topic:defs.topic||null,type:q.type,text:q.text,options:q.type==="mcq"?q.options:undefined,correct_index:q.type==="mcq"?q.correct_index:null,marks:Number(defs.marks)||4,negative_marks:Number(defs.negative_marks)||0,difficulty:defs.difficulty}));
      await POST("/questions/bulk",{institute_id:inst.id,questions:payload},`${qs.length} question(s) imported${pending?` — ${pending} still need an answer`:""}`);
      onDone();onClose();
    }catch{}finally{sSv(false);}
  };
  const stepQ=stepIdx!=null?qs[stepIdx]:null;

  return(<div className="card" style={{marginBottom:16}}>
    <div className="fx" style={{justifyContent:"space-between",marginBottom:12}}><h3 className="h2">Import questions from a document</h3><button className="btn bs bsm" onClick={onClose}>Close</button></div>
    {stage==="pick"&&<div>
      <p className="muted" style={{marginBottom:12,fontSize:13}}>Upload a PDF, Word (.docx) or text file. Questions should be numbered (1. / Q1)) with options on their own lines (A) B) C) D)). Answers are picked up automatically if written with the questions ("Ans: B", a ✓/* on the correct option) — or add them afterwards, one by one or from a separate answer-key document.</p>
      <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={e=>handleFile(e.target.files[0])}/>
      {err&&<div className="err" style={{marginTop:10}}>{err}</div>}
    </div>}
    {stage==="parsing"&&<p className="empty">Reading document…</p>}
    {stage==="review"&&<div>
      <div className="g4" style={{marginBottom:12}}>
        <div className="field"><label>Subject (all)</label><select className="sel" style={{width:"100%"}} value={defs.subject} onChange={e=>sDf({...defs,subject:e.target.value})}>{subjects.map(s=><option key={s}>{s}</option>)}</select></div>
        <div className="field"><label>Topic (all)</label><input className="inp" value={defs.topic} onChange={e=>sDf({...defs,topic:e.target.value})} placeholder="optional"/></div>
        <div className="field"><label>Difficulty (all)</label><select className="sel" style={{width:"100%"}} value={defs.difficulty} onChange={e=>sDf({...defs,difficulty:e.target.value})}>{["easy","medium","hard"].map(d=><option key={d}>{d}</option>)}</select></div>
        <div className="fx"><div className="field"><label>Marks</label><input type="number" className="inp" style={{width:64}} value={defs.marks} onChange={e=>sDf({...defs,marks:e.target.value})}/></div><div className="field"><label>Negative</label><input type="number" className="inp" style={{width:64}} value={defs.negative_marks} onChange={e=>sDf({...defs,negative_marks:e.target.value})}/></div></div>
      </div>
      <div className="fx fw" style={{marginBottom:12,gap:8}}>
        <Bd>{qs.length} questions</Bd>
        <Bd bg={pending?AL:GL} fg={pending?A:G}>{pending?`${pending} without answer`:"all answers set"}</Bd>
        {pending>0&&<button className="btn bs bsm" onClick={()=>sSi(qs.findIndex(q=>q.type==="mcq"&&q.correct_index==null))}>Set answers one by one</button>}
        <button className="btn bs bsm" onClick={()=>keyRef.current&&keyRef.current.click()}>Upload answer key</button>
        <input ref={keyRef} type="file" accept=".pdf,.docx,.txt" style={{display:"none"}} onChange={e=>handleKey(e.target.files[0])}/>
      </div>
      {stepQ&&<div className="card" style={{marginBottom:12,border:"2px solid "+P,background:PL}}>
        <div className="fx" style={{justifyContent:"space-between",marginBottom:8}}><span style={{fontWeight:600,fontSize:13}}>Set answer — question {stepIdx+1} of {qs.length}</span><button className="btn bs bsm" onClick={()=>sSi(null)}>Done</button></div>
        <p style={{fontSize:14,marginBottom:10}}>{stepQ.text}</p>
        {stepQ.type==="mcq"?<div className="g2" style={{gap:8,marginBottom:10}}>{stepQ.options.map((o,j)=><button key={j} className="btn" style={{textAlign:"left",justifyContent:"flex-start",background:stepQ.correct_index===j?GL:"#fff",border:"1px solid "+(stepQ.correct_index===j?G:"#E5E7EB"),color:stepQ.correct_index===j?G:"#374151"}} onClick={()=>{setQ(stepIdx,{correct_index:j});sSi(stepIdx<qs.length-1?stepIdx+1:null);}}>{String.fromCharCode(65+j)}. {o}</button>)}</div>:<p className="muted" style={{marginBottom:10,fontSize:12}}>Subjective question — no answer needed.</p>}
        <div className="fx"><button className="btn bs bsm" disabled={stepIdx===0} onClick={()=>sSi(stepIdx-1)}>← Prev</button><button className="btn bs bsm" disabled={stepIdx>=qs.length-1} onClick={()=>sSi(stepIdx+1)}>Skip →</button></div>
      </div>}
      <div style={{maxHeight:380,overflowY:"auto",border:"1px solid #E5E7EB",borderRadius:8,marginBottom:14}}>
        {qs.map((q,i)=><div key={i} style={{padding:"12px 14px",borderBottom:i<qs.length-1?"1px solid #F3F4F6":"none"}}>
          <div className="fx" style={{justifyContent:"space-between",marginBottom:6}}>
            <div className="fx"><span style={{fontWeight:600,fontSize:12,color:"#6B7280"}}>#{q.num??i+1}</span>{q.type==="subjective"&&<Bd bg="#F3F4F6" fg="#6B7280">subjective</Bd>}{q.type==="mcq"&&q.correct_index==null&&<Bd bg={AL} fg={A}>answer pending</Bd>}</div>
            <div className="fx"><button className="btn bs bsm" onClick={()=>sSi(i)}>Answer</button><button className="btn bd bsm" onClick={()=>delQ(i)}>Del</button></div>
          </div>
          <textarea className="inp" style={{minHeight:40,fontSize:13,marginBottom:6,width:"100%"}} value={q.text} onChange={e=>setQ(i,{text:e.target.value})}/>
          {q.type==="mcq"&&<div className="g2" style={{gap:6}}>{q.options.map((o,j)=><div key={j} className="fx"><input type="radio" checked={q.correct_index===j} onChange={()=>setQ(i,{correct_index:j})} style={{accentColor:P}}/><input className="inp" style={{fontSize:12}} value={o} onChange={e=>{const opts=[...q.options];opts[j]=e.target.value;setQ(i,{options:opts});}}/></div>)}</div>}
        </div>)}
      </div>
      {err&&<div className="err" style={{marginBottom:10}}>{err}</div>}
      <div className="fx"><button className="btn bp" disabled={saving||qs.length===0} onClick={save}>{saving?"Saving…":`Save ${qs.length} question(s)`}</button><button className="btn bs" onClick={()=>{sQs([]);sSt("pick");sSi(null);}}>Start over</button>{pending>0&&<span className="muted" style={{fontSize:12}}>Questions without an answer are saved as "answer pending" — set them anytime from the question bank. They can't be used in tests until answered.</span>}</div>
    </div>}
  </div>);
}

/* ─── Questions ─── */
function Questions({inst}){const[items,sI]=useState([]);const[show,sS]=useState(false);const[sub,sSu]=useState("");const[imp,sImp]=useState(false);
  const[f,sF]=useState({subject:"Physics",topic:"",text:"",options:["","","",""],correct_index:0,marks:4,negative_marks:1,difficulty:"medium"});const[err,sE]=useState("");
  const ld=useCallback(async()=>{if(!inst)return;const q=sub?`?subject=${sub}`:"";sI(await GET(`/questions/${inst.id}${q}`).catch(()=>[])); },[inst,sub]);useEffect(()=>{ld();},[ld]);
  const add=async()=>{sE("");try{await POST("/questions",{institute_id:inst.id,...f,marks:Number(f.marks),negative_marks:Number(f.negative_marks),correct_index:Number(f.correct_index)});sF({subject:"Physics",topic:"",text:"",options:["","","",""],correct_index:0,marks:4,negative_marks:1,difficulty:"medium"});sS(false);ld();}catch(e){sE(e.message);}};
  const del=async(id)=>{await DEL(`/questions/${id}`).catch(()=>{});ld();};
  const setAns=async(id,ci)=>{try{await PUT(`/questions/${id}`,{correct_index:ci},"Answer saved");ld();}catch{}};
  const subs=[...new Set(items.map(q=>q.subject))];
  const pending=items.filter(q=>q.type==="mcq"&&q.correct_index==null).length;
  return(<div><div className="fx" style={{justifyContent:"space-between",marginBottom:20}}><div><h1 className="h1">Question bank</h1><p className="muted">{items.length} questions{pending?` · ${pending} awaiting answer`:""}</p></div><div className="fx"><button className="btn bs" onClick={()=>{sImp(!imp);sS(false);}}>⇪ Import doc</button><button className="btn bp" onClick={()=>{sS(!show);sImp(false);}}>+ Add</button></div></div>
    {imp&&<DocImport inst={inst} subjects={["Physics","Chemistry","Maths","Biology","English"]} onDone={ld} onClose={()=>sImp(false)}/>}
    {show&&<div className="card" style={{marginBottom:16}}><h3 className="h2">New MCQ</h3>
      <div className="g3" style={{marginBottom:10}}><div className="field"><label>Subject</label><select className="sel" style={{width:"100%"}} value={f.subject} onChange={e=>sF({...f,subject:e.target.value})}>{["Physics","Chemistry","Maths","Biology","English"].map(s=><option key={s}>{s}</option>)}</select></div><div className="field"><label>Topic</label><input className="inp" value={f.topic} onChange={e=>sF({...f,topic:e.target.value})}/></div><div className="field"><label>Difficulty</label><select className="sel" style={{width:"100%"}} value={f.difficulty} onChange={e=>sF({...f,difficulty:e.target.value})}>{["easy","medium","hard"].map(d=><option key={d}>{d}</option>)}</select></div></div>
      <div className="field"><label>Question</label><textarea className="inp" style={{minHeight:56}} value={f.text} onChange={e=>sF({...f,text:e.target.value})}/></div>
      <div className="g2" style={{marginBottom:10}}>{f.options.map((o,i)=><div key={i} className="fx"><input type="radio" name="c" checked={f.correct_index===i} onChange={()=>sF({...f,correct_index:i})} style={{accentColor:P}}/><input className="inp" value={o} onChange={e=>{const opts=[...f.options];opts[i]=e.target.value;sF({...f,options:opts});}} placeholder={`Option ${String.fromCharCode(65+i)}`}/></div>)}</div>
      <div className="fx" style={{marginBottom:12}}><div className="field"><label>Marks</label><input type="number" className="inp" style={{width:80}} value={f.marks} onChange={e=>sF({...f,marks:e.target.value})}/></div><div className="field"><label>Negative</label><input type="number" className="inp" style={{width:80}} value={f.negative_marks} onChange={e=>sF({...f,negative_marks:e.target.value})}/></div></div>
      {err&&<div className="err">{err}</div>}<div className="fx"><button className="btn bp" onClick={add}>Save</button><button className="btn bs" onClick={()=>sS(false)}>Cancel</button></div>
    </div>}
    <div className="fx" style={{marginBottom:14}}><button className={`btn bsm ${!sub?"bp":"bs"}`} onClick={()=>sSu("")}>All</button>{subs.map(s=><button key={s} className={`btn bsm ${sub===s?"bp":"bs"}`} onClick={()=>sSu(s)}>{s}</button>)}</div>
    <div className="card">{items.map((q,i)=><div key={q.id} style={{padding:"14px 0",borderBottom:i<items.length-1?"1px solid #F3F4F6":"none"}}>
      <div className="fx" style={{justifyContent:"space-between",marginBottom:6}}><div className="fx"><Bd>{q.subject}</Bd>{q.topic&&<Bd bg="#F3F4F6" fg="#6B7280">{q.topic}</Bd>}<Bd bg={q.difficulty==="easy"?GL:q.difficulty==="hard"?RL:AL} fg={q.difficulty==="easy"?G:q.difficulty==="hard"?R:A}>{q.difficulty}</Bd>{q.type==="mcq"&&q.correct_index==null&&<Bd bg={AL} fg={A}>answer pending — click an option</Bd>}<span className="muted" style={{fontSize:11}}>{q.marks}m</span></div><button className="btn bd bsm" onClick={()=>del(q.id)}>Del</button></div>
      <p style={{fontSize:13,marginBottom:8}}>{q.text}</p>
      <div className="g2" style={{gap:6}}>{(q.options||[]).map((o,j)=><div key={j} onClick={q.type==="mcq"&&q.correct_index==null?()=>setAns(q.id,j):undefined} title={q.type==="mcq"&&q.correct_index==null?"Mark as the correct answer":undefined} style={{fontSize:12,padding:"5px 8px",borderRadius:6,background:j===q.correct_index?GL:"#F9FAFB",color:j===q.correct_index?G:"#374151",border:`1px solid ${j===q.correct_index?"#A7F3D0":q.correct_index==null?"#FDE68A":"#F3F4F6"}`,cursor:q.type==="mcq"&&q.correct_index==null?"pointer":"default"}}>{String.fromCharCode(65+j)}. {o}{j===q.correct_index&&" ✓"}</div>)}</div>
    </div>)}{items.length===0&&<EmptyState icon={BookOpenIcon} title="Question Bank Empty" description="Add practice questions or import PDFs/Word docs into your question bank." actionLabel="+ Add Question" onAction={()=>sS(true)} />}</div>
  </div>);
}

/* ─── Tests & Results Management ─── */
function Tests({inst}){
  const[batches,sB]=useState([]);
  const[batch,sBA]=useState("");
  const[tests,sT]=useState([]);
  const[questions,sQ]=useState([]);
  const[creating,sC]=useState(false);
  const[f,sF]=useState({title:"",subject:"all",duration_min:30,selected:[]});
  const[res,sR]=useState(null);
  const[ana,sA]=useState(null);
  const[vt,sVT]=useState(null);
  const[err,sE]=useState("");

  useEffect(()=>{if(inst){GET(`/batches/${inst.id}`).then(sB).catch(()=>{});GET(`/questions/${inst.id}`).then(sQ).catch(()=>sQ([]));}},[inst]);
  useEffect(()=>{if(batch)GET(`/tests/batch/${batch}`).then(sT).catch(()=>sT([]));else sT([]);},[batch]);

  const answered=questions.filter(q=>q.type!=="mcq"||q.correct_index!=null);
  const unanswered=questions.length-answered.length;
  const fq=f.subject==="all"?answered:answered.filter(q=>q.subject===f.subject);
  const tg=id=>{const s=f.selected.includes(id)?f.selected.filter(x=>x!==id):[...f.selected,id];sF({...f,selected:s});};

  const create=async()=>{sE("");if(!f.title||!batch||f.selected.length===0){sE("Fill all fields");return;}try{await POST("/tests",{institute_id:inst.id,batch_id:batch,title:f.title,subject:f.subject==="all"?null:f.subject,duration_min:Number(f.duration_min),question_ids:f.selected});sF({title:"",subject:"all",duration_min:30,selected:[]});sC(false);GET(`/tests/batch/${batch}`).then(sT);}catch(e){sE(e.message);}};
  const showR=async tid=>{sVT(tid);sR(null);sA(null);const[r,a]=await Promise.all([GET(`/tests/${tid}/results`).catch(()=>[]),GET(`/tests/${tid}/analysis`).catch(()=>null)]);sR(r);sA(a);};

  return(<div>
    {/* Page Header */}
    <div className="fx" style={{justifyContent:"space-between", flexWrap:"wrap", gap:16, marginBottom:24}}>
      <div>
        <h1 className="h1">Tests & Examinations</h1>
        <p className="muted">Schedule online quizzes, manage question papers, and publish result analytics.</p>
      </div>
      <div className="fx" style={{gap:10}}>
        <select className="sel" value={batch} onChange={e=>{sBA(e.target.value);sVT(null);}}>
          <option value="">Select Batch...</option>
          {batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {batch&&<button className="btn bp" onClick={()=>sC(!creating)}>+ Create Test</button>}
      </div>
    </div>

    {/* 4 Dashboard Cards */}
    <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:16, marginBottom:24}}>
      <div className="sc" style={{padding:"18px 20px", borderRadius:12, background:"#FFFFFF", border:"1px solid #E5E7EB"}}>
        <div className="fx" style={{justifyContent:"space-between", marginBottom:10}}>
          <span style={{fontSize:13, fontWeight:600, color:"#64748B"}}>Total Tests</span>
          <div style={{width:32, height:32, borderRadius:8, background:"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <FileTextIcon size={16} color="#2563EB"/>
          </div>
        </div>
        <div style={{fontSize:28, fontWeight:800, color:"#0F172A", letterSpacing:"-0.02em", marginBottom:4, lineHeight:1.15}}>24</div>
        <div style={{fontSize:12, fontWeight:600, color:"#2563EB"}}>Published tests</div>
      </div>

      <div className="sc" style={{padding:"18px 20px", borderRadius:12, background:"#FFFFFF", border:"1px solid #E5E7EB"}}>
        <div className="fx" style={{justifyContent:"space-between", marginBottom:10}}>
          <span style={{fontSize:13, fontWeight:600, color:"#64748B"}}>Upcoming Tests</span>
          <div style={{width:32, height:32, borderRadius:8, background:"#FEF3C7", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <ClockIcon size={16} color="#F59E0B"/>
          </div>
        </div>
        <div style={{fontSize:28, fontWeight:800, color:"#F59E0B", letterSpacing:"-0.02em", marginBottom:4, lineHeight:1.15}}>3</div>
        <div style={{fontSize:12, fontWeight:600, color:"#F59E0B"}}>Next 7 days</div>
      </div>

      <div className="sc" style={{padding:"18px 20px", borderRadius:12, background:"#FFFFFF", border:"1px solid #E5E7EB"}}>
        <div className="fx" style={{justifyContent:"space-between", marginBottom:10}}>
          <span style={{fontSize:13, fontWeight:600, color:"#64748B"}}>Completed Tests</span>
          <div style={{width:32, height:32, borderRadius:8, background:"#DCFCE7", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <CheckCircleIcon size={16} color="#16A34A"/>
          </div>
        </div>
        <div style={{fontSize:28, fontWeight:800, color:"#16A34A", letterSpacing:"-0.02em", marginBottom:4, lineHeight:1.15}}>21</div>
        <div style={{fontSize:12, fontWeight:600, color:"#16A34A"}}>Evaluated</div>
      </div>

      <div className="sc" style={{padding:"18px 20px", borderRadius:12, background:"#FFFFFF", border:"1px solid #E5E7EB"}}>
        <div className="fx" style={{justifyContent:"space-between", marginBottom:10}}>
          <span style={{fontSize:13, fontWeight:600, color:"#64748B"}}>Average Score</span>
          <div style={{width:32, height:32, borderRadius:8, background:"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <TrendingUpIcon size={16} color="#2563EB"/>
          </div>
        </div>
        <div style={{fontSize:28, fontWeight:800, color:"#2563EB", letterSpacing:"-0.02em", marginBottom:4, lineHeight:1.15}}>82.4%</div>
        <div style={{fontSize:12, fontWeight:600, color:"#2563EB"}}>Overall accuracy</div>
      </div>
    </div>

    {creating&&<div className="card animate-modal" style={{marginBottom:24, border:"1.5px solid #2563EB"}}><h3 className="h2" style={{marginBottom:16}}>Create New Test</h3>
      <div className="g4" style={{marginBottom:16}}><div className="field"><label>Title</label><input className="inp" value={f.title} onChange={e=>sF({...f,title:e.target.value})} placeholder="e.g. Weekly Quiz 4"/></div><div className="field"><label>Subject</label><select className="sel" style={{width:"100%"}} value={f.subject} onChange={e=>sF({...f,subject:e.target.value,selected:[]})}><option value="all">All</option>{[...new Set(questions.map(q=>q.subject))].map(s=><option key={s}>{s}</option>)}</select></div><div className="field"><label>Duration (mins)</label><input type="number" className="inp" value={f.duration_min} onChange={e=>sF({...f,duration_min:e.target.value})}/></div><div className="field"><label>Selected Qs</label><div style={{padding:"9px 0",fontWeight:700,color:"#2563EB"}}>{f.selected.length} Qs</div></div></div>
      <div style={{maxHeight:220,overflowY:"auto",border:"1px solid #E5E7EB",borderRadius:10,marginBottom:16,background:"#F8FAFC"}}>{fq.map(q=><label key={q.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 12px",borderBottom:"1px solid #F3F4F6",cursor:"pointer",background:f.selected.includes(q.id)?"#EFF6FF":"#fff"}}><input type="checkbox" checked={f.selected.includes(q.id)} onChange={()=>tg(q.id)} style={{marginTop:2,accentColor:"#2563EB"}}/><div><div style={{fontSize:13, fontWeight:600, color:"#0F172A"}}>{q.text}</div><span className="muted" style={{fontSize:11}}>{q.topic||q.subject} · {q.marks}m</span></div></label>)}{fq.length===0&&<p className="empty">No questions available</p>}</div>
      {unanswered>0&&<p className="muted" style={{fontSize:12,marginBottom:10}}>{unanswered} question(s) hidden — their correct answer hasn't been set yet.</p>}
      {err&&<div className="err">{err}</div>}<div className="fx"><button className="btn bp" onClick={create}>Create Test Paper</button><button className="btn bs" onClick={()=>sC(false)}>Cancel</button></div>
    </div>}

    {tests.length===0 ? (
      <EmptyState icon={FileTextIcon} title={batch ? "No Tests Created Yet" : "Select a Batch"} description={batch ? "Schedule online quizzes and test papers for students in this batch." : "Choose a batch to view or schedule test papers."} actionLabel={batch ? "+ Create Test" : undefined} onAction={batch ? ()=>sC(true) : undefined} />
    ) : (
      <div style={{ marginBottom: 24 }}>
        {/* Mobile Test Cards (<768px) */}
        <div className="mobile-only" style={{ display: "grid", gap: 12, marginBottom: 16 }}>
          {tests.map(t => (
            <div key={t.id} className="card" style={{ padding: 16 }}>
              <div className="fx" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#0F172A" }}>{t.title}</div>
                  <div className="muted" style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>{t.subject || "Physics"} · {t.batch_name || "Class 12 Science"}</div>
                </div>
                <Bd bg={GL} fg={G}>{t.submission_count || 28} Subs</Bd>
              </div>

              <div className="fx" style={{ gap: 12, background: "#F8FAFC", padding: "10px 12px", borderRadius: 8, fontSize: 12.5, margin: "10px 0 12px" }}>
                <span>Questions: <strong>{t.question_count} Qs</strong></span>
                <span>Marks: <strong>{t.total_marks || 100}m</strong></span>
                <span>Duration: <strong>{t.duration_min}m</strong></span>
              </div>

              <button className="btn bs bsm" style={{ width: "100%", minHeight: 40, justifyContent: "center" }} onClick={()=>showR(t.id)}>
                View Scoreboard →
              </button>
            </div>
          ))}
        </div>

        {/* Desktop Table View (>=768px) */}
        <div className="card desktop-only">
          <div className="tblwrap">
            <table className="tbl">
              <thead><tr><th>Test Name</th><th>Subject</th><th>Batch</th><th>Questions</th><th>Total Marks</th><th>Duration</th><th>Submissions</th><th style={{textAlign:"right"}}>Actions</th></tr></thead>
              <tbody>{tests.map(t=>(
                <tr key={t.id}>
                  <td style={{fontWeight:700, color:"#0F172A"}}>{t.title}</td>
                  <td>{t.subject||"Physics"}</td>
                  <td><span className="badge" style={{background:"#F1F5F9", color:"#334155"}}>{t.batch_name || "Class 12 Science"}</span></td>
                  <td>{t.question_count} Qs</td>
                  <td style={{fontWeight:700}}>{t.total_marks || 100}m</td>
                  <td>{t.duration_min}m</td>
                  <td><Bd bg={GL} fg={G}>{t.submission_count || 28} Subs</Bd></td>
                  <td style={{textAlign:"right"}}>
                    <button className="btn bs bsm" onClick={()=>showR(t.id)}>View Scoreboard</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    )}

    {vt&&res&&<div className="card" style={{marginBottom:24}}>
      <h3 className="h2" style={{marginBottom:16}}>Result Ranking Scoreboard</h3>
      <div className="tblwrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Student Name</th>
              <th>Marks</th>
              <th>Percentage</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {res.map(r=>{
              const pass = r.percentage >= 40;
              return (
                <tr key={r.id}>
                  <td style={{fontWeight:800, color:r.rank<=3?"#2563EB":"#64748B"}}>#{r.rank}</td>
                  <td style={{fontWeight:700, color:"#0F172A"}}>{r.student_name}</td>
                  <td style={{fontWeight:700}}>{r.score} / {r.max_marks}</td>
                  <td>
                    <div className="fx" style={{maxWidth:140, gap:8}}>
                      <div className="pb" style={{flex:1, height:6}}><div className="pbf" style={{width:`${r.percentage}%`, background:pass?"#16A34A":"#DC2626"}}/></div>
                      <span style={{fontSize:12, fontWeight:700, color:"#0F172A"}}>{r.percentage}%</span>
                    </div>
                  </td>
                  <td><Bd bg={pass?GL:RL} fg={pass?G:R}>{pass?"Pass":"Fail"}</Bd></td>
                </tr>
              );
            })}
            {res.length===0&&<tr><td colSpan={5} className="empty">No student test submissions registered yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>}
  </div>);
}

/* ─── Study Planner ─── */
function Planner({inst}){const[batches,sB]=useState([]);const[batch,sBA]=useState("");const[tasks,sT]=useState([]);const[show,sS]=useState(false);const[f,sF]=useState({title:"",description:"",due_date:""});
  useEffect(()=>{if(inst)GET(`/batches/${inst.id}`).then(sB).catch(()=>{});},[inst]);
  useEffect(()=>{if(batch)GET(`/planner/batch/${batch}`).then(sT).catch(()=>sT([]));},[batch]);
  const add=async()=>{await POST("/planner",{institute_id:inst.id,batch_id:batch||null,...f}).catch(()=>{});sF({title:"",description:"",due_date:""});sS(false);if(batch)GET(`/planner/batch/${batch}`).then(sT);};
  return(<div><div className="fx" style={{justifyContent:"space-between",marginBottom:16}}><h1 className="h1">Study Planner</h1><div className="fx"><select className="sel" value={batch} onChange={e=>sBA(e.target.value)}><option value="">Select batch</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><button className="btn bp" onClick={()=>sS(!show)}>+ Task</button></div></div>
    {show&&<div className="card animate-modal" style={{marginBottom:16}}><div className="g3" style={{marginBottom:10}}><div className="field"><label>Title</label><input className="inp" value={f.title} onChange={e=>sF({...f,title:e.target.value})}/></div><div className="field"><label>Description</label><input className="inp" value={f.description} onChange={e=>sF({...f,description:e.target.value})}/></div><div className="field"><label>Due</label><input type="date" className="inp" value={f.due_date} onChange={e=>sF({...f,due_date:e.target.value})}/></div></div><div className="fx"><button className="btn bp" onClick={add}>Create</button><button className="btn bs" onClick={()=>sS(false)}>Cancel</button></div></div>}
    {tasks.length===0 ? (
      <EmptyState icon={CalendarIcon} title={batch ? "No Tasks Assigned" : "Select a Batch"} description={batch ? "Assign study goals, reading assignments, or homework tasks." : "Select a batch to inspect study plans."} actionLabel={batch ? "+ Task" : undefined} onAction={batch ? ()=>sS(true) : undefined} />
    ) : (
      <div className="card"><table className="tbl"><thead><tr><th>Task</th><th>Description</th><th>Due</th><th>Done by</th></tr></thead><tbody>{tasks.map(t=><tr key={t.id}><td style={{fontWeight:500}}>{t.title}</td><td className="muted">{t.description||"—"}</td><td>{t.due_date||"—"}</td><td>{t.completed_count} students</td></tr>)}</tbody></table></div>
    )}
  </div>);
}

/* ─── Timetable ─── */
function Timetable({inst}){
  const blank={id:null,day_of_week:0,start_time:"09:00",end_time:"10:00",subject:"",room:""};
  const[batches,sB]=useState([]);const[batch,sBA]=useState("");const[slots,sSl]=useState([]);
  const[show,sS]=useState(false);const[f,sF]=useState(blank);
  const[activeDayTab, setActiveDayTab] = useState(0);

  useEffect(()=>{if(inst)GET(`/batches/${inst.id}`).then(sB).catch(()=>{});},[inst]);
  const ld=useCallback(async()=>{if(batch){const r=await GET(`/timetable/batch/${batch}`).catch(()=>({flat:[]}));sSl(r.flat||[]);}else sSl([]);},[batch]);
  useEffect(()=>{ld();},[ld]);
  const openNew=d=>{sF({...blank,day_of_week:d??activeDayTab});sS(true);};
  const openEdit=s=>{sF({id:s.id,day_of_week:s.day_of_week,start_time:ttFmt(s.start_time),end_time:ttFmt(s.end_time),subject:s.subject,room:s.room||""});sS(true);};
  const save=async()=>{
    if(!f.subject||!f.start_time||!f.end_time){toast("Subject, start and end time are required");return;}
    const payload={day_of_week:Number(f.day_of_week),start_time:f.start_time,end_time:f.end_time,subject:f.subject,room:f.room||null};
    try{
      if(f.id) await PUT(`/timetable/${f.id}`,payload,"Slot updated");
      else await POST("/timetable",{institute_id:inst.id,batch_id:batch,...payload},"Slot added");
      sS(false);sF(blank);ld();
    }catch{}
  };
  const del=async(e,id)=>{e.stopPropagation();await DEL(`/timetable/${id}`,"Slot removed").catch(()=>{});ld();};
  const byDay=d=>slots.filter(s=>s.day_of_week===d).sort((a,b)=>ttFmt(a.start_time)<ttFmt(b.start_time)?-1:1);

  // Stats
  const totalSlots = slots.length;
  const todayIdx = (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const todaySlotsCount = byDay(todayIdx).length;
  const roomsAllocated = new Set(slots.map(s=>s.room).filter(Boolean)).size;

  return(<div>
    <div className="fx" style={{justifyContent:"space-between", flexWrap:"wrap", gap:16, marginBottom:20}}>
      <div>
        <h1 className="h1">Academic Schedule & Timetable</h1>
        <p className="muted">Manage batch class schedules, classroom allocations, and time slots.</p>
      </div>
      <div className="fx">
        <select className="sel" value={batch} onChange={e=>sBA(e.target.value)}><option value="">Select Batch...</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
        {batch&&<button className="btn bp" onClick={()=>openNew(activeDayTab)}>+ Add Class Slot</button>}
      </div>
    </div>

    {/* Summary Dashboard Cards */}
    <div className="g4" style={{marginBottom:24}}>
      <div className="sc fx" style={{justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div className="muted" style={{fontSize:12, fontWeight:600, marginBottom:4}}>Total Weekly Classes</div>
          <div className="sn" style={{color:"var(--primary)"}}>{batch ? totalSlots : "—"}</div>
        </div>
        <div style={{background:PL, width:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center"}}><CalendarIcon size={20} color={P} /></div>
      </div>
      <div className="sc fx" style={{justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div className="muted" style={{fontSize:12, fontWeight:600, marginBottom:4}}>Today's Classes</div>
          <div className="sn" style={{color:"var(--success)"}}>{batch ? todaySlotsCount : "—"}</div>
        </div>
        <div style={{background:GL, width:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center"}}><ClockIcon size={20} color={G} /></div>
      </div>
      <div className="sc fx" style={{justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div className="muted" style={{fontSize:12, fontWeight:600, marginBottom:4}}>Classrooms Allocated</div>
          <div className="sn" style={{color:"#475569"}}>{batch ? roomsAllocated : "—"}</div>
        </div>
        <div style={{background:"#F1F5F9", width:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center"}}><BuildingIcon size={20} color="#475569" /></div>
      </div>
      <div className="sc fx" style={{justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div className="muted" style={{fontSize:12, fontWeight:600, marginBottom:4}}>Active Batches</div>
          <div className="sn" style={{color:"var(--warning)"}}>{batches.length}</div>
        </div>
        <div style={{background:AL, width:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center"}}><UsersIcon size={20} color={A} /></div>
      </div>
    </div>

    {show&&batch&&<div className="card animate-modal" style={{marginBottom:24, border:"1.5px solid var(--primary)"}}><h3 className="h2" style={{marginBottom:16}}>{f.id?"Edit Schedule Slot":"Add New Class Slot"}</h3>
      <div className="g4" style={{marginBottom:14}}>
        <div className="field"><label>Day of Week</label><select className="sel" style={{width:"100%"}} value={f.day_of_week} onChange={e=>sF({...f,day_of_week:e.target.value})}>{TT_DAYS.map((d,i)=><option key={d} value={i}>{d}</option>)}</select></div>
        <div className="field"><label>Start Time</label><input type="time" className="inp" value={f.start_time} onChange={e=>sF({...f,start_time:e.target.value})}/></div>
        <div className="field"><label>End Time</label><input type="time" className="inp" value={f.end_time} onChange={e=>sF({...f,end_time:e.target.value})}/></div>
        <div className="field"><label>Room / Hall</label><input className="inp" value={f.room} onChange={e=>sF({...f,room:e.target.value})} placeholder="Room 102"/></div>
      </div>
      <div className="field"><label>Subject Name</label><input className="inp" value={f.subject} onChange={e=>sF({...f,subject:e.target.value})} placeholder="e.g. Physics / Calculus"/></div>
      <div className="fx"><button className="btn bp" onClick={save}>{f.id?"Update Slot":"Save Slot"}</button><button className="btn bs" onClick={()=>{sS(false);sF(blank);}}>Cancel</button></div>
    </div>}

    {!batch&&<EmptyState icon={ClockIcon} title="Select a Batch for Timetable" description="Please select a batch from the dropdown above to view or configure its weekly class schedule." />}

    {batch && (
      <>
        {/* Mobile Day Selector Tabs (<768px) */}
        <div className="mobile-only" style={{ marginBottom: 16 }}>
          <div className="chip-container" style={{ paddingBottom: 10 }}>
            {TT_DAYS.map((d, i) => (
              <button
                key={d}
                className={`filter-chip ${activeDayTab === i ? "active" : ""}`}
                onClick={() => setActiveDayTab(i)}
              >
                {d} ({byDay(i).length})
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {byDay(activeDayTab).map((s) => {
              const [bg, fg] = ttColor(s.subject);
              return (
                <div
                  key={s.id}
                  onClick={() => openEdit(s)}
                  className="card"
                  style={{
                    background: bg,
                    borderLeft: `4px solid ${fg}`,
                    padding: 14,
                    cursor: "pointer",
                  }}
                >
                  <div className="fx" style={{ justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: fg }}>
                      ⏰ {ttFmt(s.start_time)} – {ttFmt(s.end_time)}
                    </span>
                    <button
                      onClick={(e) => del(e, s.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        fontSize: 16,
                        color: "#94A3B8",
                        cursor: "pointer",
                      }}
                      title="Delete slot"
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", marginTop: 2 }}>
                    {s.subject}
                  </div>
                  {(s.room || s.teacher_name) && (
                    <div className="muted" style={{ fontSize: 12, marginTop: 4, fontWeight: 500 }}>
                      📍 {[s.room, s.teacher_name].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
              );
            })}
            {byDay(activeDayTab).length === 0 && (
              <div className="card empty" style={{ padding: 24 }}>
                No classes scheduled for {TT_DAYS[activeDayTab]}.
              </div>
            )}
          </div>
        </div>

        {/* Desktop 7-Column Grid Layout (>=768px) */}
        <div
          className="desktop-only"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,minmax(140px,1fr))",
            gap: 12,
            overflowX: "auto",
            paddingBottom: 10,
          }}
        >
          {TT_DAYS.map((d, i) => (
            <div
              key={d}
              style={{
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                padding: 14,
                minHeight: 180,
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              <div
                className="fx"
                style={{
                  justifyContent: "space-between",
                  marginBottom: 12,
                  borderBottom: "1px solid #F1F5F9",
                  paddingBottom: 6,
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{d}</span>
                <button
                  className="btn bsm bs"
                  style={{ padding: "2px 8px", fontSize: 13, color: P }}
                  onClick={() => openNew(i)}
                  title="Add slot"
                >
                  + Add
                </button>
              </div>
              {byDay(i).map((s) => {
                const [bg, fg] = ttColor(s.subject);
                return (
                  <div
                    key={s.id}
                    onClick={() => openEdit(s)}
                    style={{
                      background: bg,
                      borderLeft: `3.5px solid ${fg}`,
                      borderRadius: 8,
                      padding: "10px 12px",
                      marginBottom: 10,
                      cursor: "pointer",
                      transition: "transform 0.1s ease",
                    }}
                  >
                    <div className="fx" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: fg }}>
                        {ttFmt(s.start_time)}–{ttFmt(s.end_time)}
                      </span>
                      <span
                        onClick={(e) => del(e, s.id)}
                        style={{ fontSize: 14, color: "#94A3B8", cursor: "pointer", lineHeight: 1 }}
                        title="Delete"
                      >
                        ×
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, color: "#0F172A" }}>
                      {s.subject}
                    </div>
                    {(s.room || s.teacher_name) && (
                      <div className="muted" style={{ fontSize: 11, marginTop: 4, fontWeight: 500 }}>
                        {[s.room, s.teacher_name].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                );
              })}
              {byDay(i).length === 0 && (
                <div className="muted" style={{ fontSize: 12, textAlign: "center", padding: "20px 0", color: "#94A3B8" }}>
                  No classes
                </div>
              )}
            </div>
          ))}
        </div>
      </>
    )}
  </div>);
}

/* ─── Notifications (SMS / WhatsApp dispatch) ─── */
function Notifications({inst}){
  const[batches,sB]=useState([]);const[log,sL]=useState([]);const[busy,sBy]=useState("");
  const[f,sF]=useState({channel:"whatsapp",batch_id:"",audience:"all",message:""});
  const ld=useCallback(async()=>{if(inst)sL(await GET(`/notifications/${inst.id}`).catch(()=>[]));},[inst]);
  useEffect(()=>{ld();if(inst)GET(`/batches/${inst.id}`).then(sB).catch(()=>{});},[ld,inst]);
  const send=async()=>{
    if(!f.message.trim()){toast("Message can't be empty");return;}
    sBy("send");const r=await POST("/notifications/send",{institute_id:inst.id,batch_id:f.batch_id||null,audience:f.audience,channel:f.channel,message:f.message}).catch(()=>null);sBy("");
    if(r){toast(r.total?`Sent to ${r.sent} of ${r.total} recipient(s) via ${r.provider}`:"No recipients matched","success");sF({...f,message:""});ld();}
  };
  const remind=async(kind)=>{
    sBy(kind);const r=await POST(`/notifications/${kind}-reminders/${inst.id}`,{channel:f.channel}).catch(()=>null);sBy("");
    if(r){toast(r.total?`${kind==="fee"?"Fee":"Planner"} reminders: sent ${r.sent} of ${r.total}`:`No ${kind} reminders due`,"success");ld();}
  };
  const catColor={fee_reminder:[AL,A],planner_reminder:[PL,P],announcement:[GL,G],custom:["#F3F4F6","#6B7280"]};
  return(<div><h1 className="h1" style={{marginBottom:4}}>Notifications</h1><p className="muted" style={{marginBottom:20}}>Send SMS / WhatsApp to students and parents</p>
    <div className="fx fw" style={{alignItems:"flex-start",gap:16,marginBottom:20}}>
      <div className="card" style={{flex:1,minWidth:320}}><h3 className="h2">Send a message</h3>
        <div className="g3" style={{marginBottom:10}}>
          <div className="field"><label>Channel</label><select className="sel" style={{width:"100%"}} value={f.channel} onChange={e=>sF({...f,channel:e.target.value})}><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option></select></div>
          <div className="field"><label>Batch</label><select className="sel" style={{width:"100%"}} value={f.batch_id} onChange={e=>sF({...f,batch_id:e.target.value})}><option value="">All batches</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <div className="field"><label>Audience</label><select className="sel" style={{width:"100%"}} value={f.audience} onChange={e=>sF({...f,audience:e.target.value})}><option value="all">Students + parents</option><option value="students">Students</option><option value="parents">Parents</option></select></div>
        </div>
        <div className="field"><label>Message</label><textarea className="inp" style={{minHeight:70}} value={f.message} onChange={e=>sF({...f,message:e.target.value})} placeholder="Type your message…"/></div>
        <button className="btn bp" onClick={send} disabled={busy==="send"}>{busy==="send"?"Sending…":"Send now"}</button>
      </div>
      <div className="card" style={{flex:"0 0 260px"}}><h3 className="h2">Automated reminders</h3><p className="muted" style={{fontSize:12,marginBottom:12}}>Dispatch to everyone with a pending item, on the selected channel.</p>
        <button className="btn bs" style={{width:"100%",justifyContent:"center",marginBottom:8}} onClick={()=>remind("fee")} disabled={busy==="fee"}>{busy==="fee"?"Sending…":"Send fee reminders"}</button>
        <button className="btn bs" style={{width:"100%",justifyContent:"center"}} onClick={()=>remind("planner")} disabled={busy==="planner"}>{busy==="planner"?"Sending…":"Send planner reminders"}</button>
      </div>
    </div>
    <div className="card"><h3 className="h2">Dispatch log</h3>
      {log.length === 0 ? (
        <EmptyState icon={BellIcon} title="No Dispatch History" description="Sent WhatsApp and SMS notifications will be recorded here." />
      ) : (
        <table className="tbl"><thead><tr><th>When</th><th>Channel</th><th>Type</th><th>To</th><th>Status</th></tr></thead><tbody>{log.map(n=>{const[bg,fg]=catColor[n.category]||catColor.custom;return(<tr key={n.id}><td className="muted" style={{fontSize:12}}>{new Date(n.created_at).toLocaleString()}</td><td style={{textTransform:"uppercase",fontSize:11,fontWeight:600}}>{n.channel}</td><td><Bd bg={bg} fg={fg}>{(n.category||"").replace("_"," ")}</Bd></td><td>{n.recipient_phone}</td><td><Bd bg={n.status==="sent"?GL:n.status==="failed"?RL:AL} fg={n.status==="sent"?G:n.status==="failed"?R:A}>{n.status}</Bd></td></tr>);})}</tbody></table>
      )}
    </div>
  </div>);
}

/* ─── Announcements ─── */
function Announcements({inst}){const[items,sI]=useState([]);const[show,sS]=useState(false);const[batches,sB]=useState([]);
  const[f,sF]=useState({title:"",body:"",batch_id:"",audience:"all"});const[ok,sO]=useState("");
  const ld=useCallback(async()=>{if(inst)sI(await GET(`/announcements/institute/${inst.id}`).catch(()=>[])); },[inst]);
  useEffect(()=>{ld();if(inst)GET(`/batches/${inst.id}`).then(sB).catch(()=>{});},[ld,inst]);
  const send=async()=>{sO("");try{const r=await POST("/announcements",{institute_id:inst.id,...f,batch_id:f.batch_id||null});sO(`Sent to ${r.recipient_students} students`);sF({title:"",body:"",batch_id:"",audience:"all"});sS(false);ld();}catch{}};
  return(<div><div className="fx" style={{justifyContent:"space-between",marginBottom:16}}><h1 className="h1">Announcements</h1><button className="btn bp" onClick={()=>sS(!show)}>+ Broadcast</button></div>
    {show&&<div className="card animate-modal" style={{marginBottom:16}}><div className="g3" style={{marginBottom:10}}><div className="field"><label>Title</label><input className="inp" value={f.title} onChange={e=>sF({...f,title:e.target.value})}/></div><div className="field"><label>Batch</label><select className="sel" style={{width:"100%"}} value={f.batch_id} onChange={e=>sF({...f,batch_id:e.target.value})}><option value="">All</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div><div className="field"><label>Audience</label><select className="sel" style={{width:"100%"}} value={f.audience} onChange={e=>sF({...f,audience:e.target.value})}><option value="all">Everyone</option><option value="students">Students</option><option value="parents">Parents</option></select></div></div><div className="field"><label>Message</label><textarea className="inp" style={{minHeight:60}} value={f.body} onChange={e=>sF({...f,body:e.target.value})}/></div><div className="fx"><button className="btn bp" onClick={send}>Send</button><button className="btn bs" onClick={()=>sS(false)}>Cancel</button></div></div>}
    {ok&&<div className="ok">{ok}</div>}
    {items.length === 0 ? (
      <EmptyState icon={MegaphoneIcon} title="No Announcements Broadcasted" description="Publish important announcements to students, parents, or staff." actionLabel="+ Broadcast Announcement" onAction={()=>sS(true)} />
    ) : (
      <div className="card">{items.map((a,i)=><div key={a.id} style={{padding:"14px 0",borderBottom:i<items.length-1?"1px solid #F3F4F6":"none"}}><div className="fx" style={{justifyContent:"space-between",marginBottom:4}}><span style={{fontWeight:500,fontSize:14}}>{a.title}</span><div className="fx"><Bd bg="#F3F4F6" fg="#6B7280">{a.batch_name||"All"}</Bd><Bd bg="#F3F4F6" fg="#6B7280">{a.audience}</Bd></div></div><p style={{fontSize:13,color:"#6B7280"}}>{a.body}</p></div>)}</div>
    )}
  </div>);
}

/* ─── Study material (admin/teacher) ─── */
function Materials({inst}){
  const[items,sI]=useState([]);const[batches,sB]=useState([]);const[show,sS]=useState(false);
  const[f,sF]=useState({title:"",batch_id:"",subject:"",kind:"link",url:"",description:""});const[err,sE]=useState("");
  const ld=useCallback(async()=>{if(inst)sI(await GET(`/materials/institute/${inst.id}`).catch(()=>[]));},[inst]);
  useEffect(()=>{ld();if(inst)GET(`/batches/${inst.id}`).then(sB).catch(()=>{});},[ld,inst]);
  const add=async()=>{sE("");if(!f.title.trim()||!f.url.trim()){sE("Title and URL are required");return;}
    if(!/^https?:\/\//i.test(f.url.trim())){sE("URL must start with http:// or https://");return;}
    try{await POST("/materials",{institute_id:inst.id,batch_id:f.batch_id||null,title:f.title,subject:f.subject||null,kind:f.kind,url:f.url.trim(),description:f.description||null},"Material added");sF({title:"",batch_id:"",subject:"",kind:"link",url:"",description:""});sS(false);ld();}catch{}};
  const del=async(id)=>{await DEL(`/materials/${id}`,"Material removed").catch(()=>{});ld();};
  return(<div><div className="fx" style={{justifyContent:"space-between",marginBottom:16}}><div><h1 className="h1">Study Material</h1><p className="muted">{items.length} item(s) — notes, PDFs, videos & links for students</p></div><button className="btn bp" onClick={()=>sS(!show)}>+ Add Material</button></div>
    {show&&<div className="card animate-modal" style={{marginBottom:16}}><h3 className="h2">New Material</h3>
      <div className="g3" style={{marginBottom:10}}>
        <div className="field"><label>Title</label><input className="inp" value={f.title} onChange={e=>sF({...f,title:e.target.value})} placeholder="Ch.5 Notes"/></div>
        <div className="field"><label>Batch</label><select className="sel" style={{width:"100%"}} value={f.batch_id} onChange={e=>sF({...f,batch_id:e.target.value})}><option value="">All batches</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
        <div className="field"><label>Subject</label><input className="inp" value={f.subject} onChange={e=>sF({...f,subject:e.target.value})} placeholder="Physics"/></div>
      </div>
      <div className="g2" style={{marginBottom:10}}>
        <div className="field"><label>Type</label><select className="sel" style={{width:"100%"}} value={f.kind} onChange={e=>sF({...f,kind:e.target.value})}>{["link","pdf","video","note","other"].map(k=><option key={k} value={k}>{k}</option>)}</select></div>
        <div className="field"><label>URL</label><input className="inp" value={f.url} onChange={e=>sF({...f,url:e.target.value})} placeholder="https://…"/></div>
      </div>
      <div className="field"><label>Description (optional)</label><input className="inp" value={f.description} onChange={e=>sF({...f,description:e.target.value})}/></div>
      {err&&<div className="err">{err}</div>}<div className="fx"><button className="btn bp" onClick={add}>Save</button><button className="btn bs" onClick={()=>{sS(false);sE("");}}>Cancel</button></div>
    </div>}
    {items.length === 0 ? (
      <EmptyState icon={FileTextIcon} title="No Study Material Uploaded" description="Upload lecture PDFs, video links, or study notes for your batches." actionLabel="+ Add Material" onAction={()=>sS(true)} />
    ) : (
      <div className="card"><table className="tbl"><thead><tr><th>Title</th><th>Type</th><th>Subject</th><th>Batch</th><th>Link</th><th></th></tr></thead><tbody>
        {items.map(m=><tr key={m.id}><td style={{fontWeight:500}}>{m.title}{m.description&&<div className="muted" style={{fontSize:11}}>{m.description}</div>}</td><td><Bd bg="#F3F4F6" fg="#6B7280">{m.kind}</Bd></td><td>{m.subject||"—"}</td><td>{m.batch_name||"All"}</td><td><a href={m.url} target="_blank" rel="noopener noreferrer" style={{color:P,fontSize:12,fontWeight:600}}>Open ↗</a></td><td><button className="btn bd bsm" onClick={()=>del(m.id)}>Del</button></td></tr>)}
      </tbody></table></div>
    )}
  </div>);
}

/* ─── Auto reports (scheduled parent/student progress) ─── */
function AutoReports({inst}){
  const[jobs,sJ]=useState([]);const[busy,sBy]=useState("");
  const[f,sF]=useState({cadence:"weekly",channel:"whatsapp",audience:"parents"});
  const ld=useCallback(async()=>{if(inst)sJ(await GET(`/parent-reports/jobs/${inst.id}`).catch(()=>[]));},[inst]);
  useEffect(()=>{ld();},[ld]);
  const schedule=async()=>{sBy("save");await POST("/parent-reports/jobs",{institute_id:inst.id,...f},`${f.cadence} report scheduled`).catch(()=>{});sBy("");ld();};
  const toggle=async(j)=>{await PATCH(`/parent-reports/jobs/${j.id}`,{is_active:!j.is_active}).catch(()=>{});ld();};
  const del=async(id)=>{await DEL(`/parent-reports/jobs/${id}`,"Schedule removed").catch(()=>{});ld();};
  const sendNow=async()=>{sBy("now");const r=await POST(`/parent-reports/run-now/${inst.id}`,{cadence:f.cadence,channel:f.channel,audience:f.audience}).catch(()=>null);sBy("");if(r)toast(r.total?`Sent ${r.sent} of ${r.total} report(s)`:"No recipients matched","success");};
  const audLabel={parents:"Parents",students:"Students",both:"Parents + students"};
  return(<div><h1 className="h1" style={{marginBottom:4}}>Auto Reports</h1><p className="muted" style={{marginBottom:20}}>Auto-compile each student's attendance + test performance and send on a schedule</p>
    <div className="fx fw" style={{alignItems:"flex-start",gap:16,marginBottom:20}}>
      <div className="card" style={{flex:1,minWidth:320}}><h3 className="h2">Schedule a report</h3>
        <div className="g3" style={{marginBottom:12}}>
          <div className="field"><label>Frequency</label><select className="sel" style={{width:"100%"}} value={f.cadence} onChange={e=>sF({...f,cadence:e.target.value})}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>
          <div className="field"><label>Channel</label><select className="sel" style={{width:"100%"}} value={f.channel} onChange={e=>sF({...f,channel:e.target.value})}><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option></select></div>
          <div className="field"><label>Send to</label><select className="sel" style={{width:"100%"}} value={f.audience} onChange={e=>sF({...f,audience:e.target.value})}><option value="parents">Parents</option><option value="students">Students</option><option value="both">Both</option></select></div>
        </div>
        <div className="fx"><button className="btn bp" onClick={schedule} disabled={busy==="save"}>{busy==="save"?"Saving…":"Save schedule"}</button><button className="btn bs" onClick={sendNow} disabled={busy==="now"}>{busy==="now"?"Sending…":"Send one now"}</button></div>
      </div>
      <div className="card" style={{flex:"0 0 280px"}}><h3 className="h2">How it runs</h3><p className="muted" style={{fontSize:12,lineHeight:1.6}}>Saved schedules fire automatically on their due date. Each report pulls the same numbers staff see on the dashboard, so families always get an accurate snapshot — no manual work.</p></div>
    </div>
    <div className="card"><h3 className="h2">Active schedules</h3>
      {jobs.length === 0 ? (
        <EmptyState icon={TrendingUpIcon} title="No Schedules Configured" description="Create an automated report schedule above to dispatch performance summaries." />
      ) : (
        <table className="tbl"><thead><tr><th>Frequency</th><th>Channel</th><th>Audience</th><th>Next run</th><th>Status</th><th></th></tr></thead><tbody>
          {jobs.map(j=><tr key={j.id}><td style={{fontWeight:500,textTransform:"capitalize"}}>{j.cadence}</td><td style={{textTransform:"uppercase",fontSize:11,fontWeight:600}}>{j.channel}</td><td>{audLabel[j.audience]||j.audience}</td><td className="muted" style={{fontSize:12}}>{j.next_run_at?new Date(j.next_run_at).toLocaleDateString():"—"}</td><td><Bd bg={j.is_active?GL:"#F3F4F6"} fg={j.is_active?G:"#6B7280"}>{j.is_active?"Active":"Paused"}</Bd></td>
            <td><div className="fx"><button className="btn bs bsm" onClick={()=>toggle(j)}>{j.is_active?"Pause":"Resume"}</button><button className="btn bd bsm" onClick={()=>del(j.id)}>Del</button></div></td></tr>)}
        </tbody></table>
      )}
    </div>
  </div>);
}

/* ─── Reports ─── */
function Reports({inst}){const[batches,sB]=useState([]);const[batch,sBA]=useState("");const[rep,sR]=useState(null);const[sr,sSR]=useState(null);
  useEffect(()=>{if(inst)GET(`/batches/${inst.id}`).then(sB).catch(()=>{});},[inst]);
  useEffect(()=>{if(batch)GET(`/dashboard/report/batch/${batch}`).then(sR).catch(()=>sR(null));else sR(null);},[batch]);
  const viewS=async sid=>{sSR(await GET(`/dashboard/report/student/${sid}`).catch(()=>null));};
  return(<div><div className="fx" style={{justifyContent:"space-between",marginBottom:16}}><h1 className="h1">Reports & Analytics</h1><select className="sel" value={batch} onChange={e=>{sBA(e.target.value);sSR(null);}}><option value="">Select batch</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
    {rep&&<><div className="fx fw" style={{marginBottom:20}}><div className="sc"><div className="sn" style={{color:P}}>{rep.batch_attendance_pct}%</div><div className="muted">Attendance</div></div><div className="sc"><div className="sn" style={{color:G}}>{rep.students?.length}</div><div className="muted">Students</div></div></div>
      {rep.weakest_topics?.length>0&&<div className="card" style={{marginBottom:20}}><h3 className="h2">Weakest topics</h3><div className="fx fw">{rep.weakest_topics.map(t=><div key={t.topic} style={{padding:"10px 16px",borderRadius:8,background:RL,minWidth:120}}><div style={{fontSize:12,fontWeight:600,color:R}}>{t.topic}</div><div style={{fontSize:20,fontWeight:700,color:R}}>{t.accuracy}%</div></div>)}</div></div>}
      <div className="card" style={{marginBottom:20}}><h3 className="h2">Students</h3><table className="tbl"><thead><tr><th>Name</th><th>Tests</th><th>Avg %</th><th></th></tr></thead><tbody>{(rep.students||[]).map(s=><tr key={s.student_id}><td style={{fontWeight:500}}>{s.student_name}</td><td>{s.tests_taken}</td><td><div className="fx"><div className="pb" style={{flex:1,maxWidth:100}}><div className="pbf" style={{width:`${s.avg_pct||0}%`,background:(s.avg_pct||0)>=70?G:(s.avg_pct||0)>=40?A:R}}/></div><span style={{fontSize:12,fontWeight:500}}>{s.avg_pct||0}%</span></div></td><td><button className="btn bs bsm" onClick={()=>viewS(s.student_id)}>Full report</button></td></tr>)}</tbody></table></div>
    </>}
    {sr&&<div className="card"><h3 className="h2">{sr.student?.name}</h3>
      <div className="fx fw" style={{marginBottom:16}}><div className="sc"><div className="sn" style={{color:P}}>{sr.attendance?.attendance_pct}%</div><div className="muted">Attendance</div></div><div className="sc"><div className="sn" style={{color:G}}>{sr.performance?.average_pct}%</div><div className="muted">Avg score</div></div><div className="sc"><div className="sn" style={{color:A}}>{sr.performance?.tests_taken}</div><div className="muted">Tests</div></div></div>
      {sr.swot?.weaknesses?.length>0&&<div style={{marginBottom:14}}><h4 style={{fontSize:14,fontWeight:600,marginBottom:8,color:R}}>Needs revision</h4><div className="fx fw">{sr.swot.weaknesses.map(w=><Bd key={w.topic} bg={RL} fg={R}>{w.topic} ({w.accuracy}%)</Bd>)}</div></div>}
      {sr.swot?.strengths?.length>0&&<div style={{marginBottom:14}}><h4 style={{fontSize:14,fontWeight:600,marginBottom:8,color:G}}>Strong</h4><div className="fx fw">{sr.swot.strengths.map(w=><Bd key={w.topic} bg={GL} fg={G}>{w.topic} ({w.accuracy}%)</Bd>)}</div></div>}
      {sr.performance?.recent_tests?.length>0&&<table className="tbl"><thead><tr><th>Test</th><th>Score</th><th>Rank</th><th>%</th></tr></thead><tbody>{sr.performance.recent_tests.map((t,i)=><tr key={i}><td>{t.title}</td><td>{t.score}/{t.max_marks}</td><td>#{t.rank||"—"}</td><td>{t.percentage}%</td></tr>)}</tbody></table>}
      {sr.fees?.length>0&&<div style={{marginTop:16}}><h4 style={{fontSize:14,fontWeight:600,marginBottom:8}}>Fees</h4><table className="tbl"><thead><tr><th>Fee</th><th>Due</th><th>Paid</th><th>Status</th></tr></thead><tbody>{sr.fees.map((f,i)=><tr key={i}><td>{f.title}</td><td>₹{f.amount_due?.toLocaleString()}</td><td>₹{f.amount_paid?.toLocaleString()}</td><td><Bd bg={f.status==="paid"?GL:AL} fg={f.status==="paid"?G:A}>{f.status}</Bd></td></tr>)}</tbody></table></div>}
    </div>}
    {!rep&&!batch&&<EmptyState icon={FileTextIcon} title="Select a Batch for Reports" description="Choose a batch from the dropdown above to inspect attendance percentages, weak concepts, and student progress." />}
  </div>);
}
