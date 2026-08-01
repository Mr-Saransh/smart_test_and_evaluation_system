import { useState, useEffect, useCallback, useRef } from "react";

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
    theme: { color: "#4F46E5" },
  });
  rzp.open();
}

/* ═══════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════ */
const P = "#4F46E5", PH = "#4338CA", PL = "#EEF2FF";
const G = "#059669", GL = "#ECFDF5", R = "#DC2626", RL = "#FEE2E2", A = "#D97706", AL = "#FFFBEB";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Sans:wght@500;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
.sb-item{display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:8px;cursor:pointer;font-size:13px;border:none;width:100%;text-align:left;font-family:inherit;transition:all .12s;background:transparent;color:#6B7280}
.sb-item:hover{background:#F3F4F6;color:#1A1A2E}.sb-item.active{background:${PL};color:${P};font-weight:600}
.btn{padding:9px 18px;border-radius:8px;border:none;cursor:pointer;font-weight:600;font-size:13px;display:inline-flex;align-items:center;gap:7px;transition:all .12s;font-family:inherit}
.bp{background:${P};color:#fff}.bp:hover{background:${PH}}.bs{background:#F3F4F6;color:#374151}.bs:hover{background:#E5E7EB}
.bg{background:${GL};color:${G}}.bd{background:${RL};color:${R}}.bsm{padding:6px 12px;font-size:12px}
.inp{width:100%;padding:9px 13px;border-radius:8px;border:1px solid #D1D5DB;font-size:14px;outline:none;font-family:inherit}.inp:focus{border-color:${P}}
.sel{padding:9px 13px;border-radius:8px;border:1px solid #D1D5DB;font-size:14px;background:#fff;color:#111827;cursor:pointer;font-family:inherit}
.sel option{background:#fff;color:#111827}
.card{background:#fff;border-radius:12px;border:1px solid #EBEBEB;padding:24px}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
.tbl{width:100%;border-collapse:collapse}.tbl th{font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:.04em;padding:10px 14px;text-align:left;border-bottom:1px solid #E5E7EB}.tbl td{padding:11px 14px;font-size:13px;border-bottom:1px solid #F3F4F6}
.h1{font-size:22px;font-weight:700;font-family:'DM Sans',sans-serif}.h2{font-size:16px;font-weight:600;margin-bottom:14px}
.muted{font-size:13px;color:#6B7280}.field{margin-bottom:14px}.field label{font-size:12px;font-weight:500;display:block;margin-bottom:5px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}.g4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px}
.fx{display:flex;gap:10px;align-items:center}.fw{flex-wrap:wrap}
.sc{flex:1;min-width:140px;padding:18px 20px;border-radius:12px;background:#fff;border:1px solid #EBEBEB;cursor:pointer}
.sn{font-size:26px;font-weight:700;font-family:'DM Sans'}.empty{text-align:center;padding:28px;color:#9CA3AF;font-size:13px}
.err{padding:8px 14px;border-radius:8px;font-size:13px;background:${RL};color:${R};margin-bottom:14px}
.ok{padding:8px 14px;border-radius:8px;font-size:13px;background:${GL};color:${G};margin-bottom:14px}
.pb{height:6px;border-radius:3px;background:#F3F4F6;overflow:hidden}.pbf{height:100%;border-radius:3px;transition:width .3s}
.sidebar{width:230px;background:#fff;border-right:1px solid #EBEBEB;height:100vh;position:fixed;top:0;left:0;display:flex;flex-direction:column;z-index:40;transition:transform .22s ease}
.content{margin-left:230px;padding:22px 28px;min-height:100vh}
.topbar{display:none;align-items:center;gap:12px;padding:11px 14px;background:#fff;border-bottom:1px solid #EBEBEB;position:sticky;top:0;z-index:30}
.hamb{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:9px;border:1px solid #E5E7EB;background:#fff;font-size:18px;cursor:pointer;line-height:1}
.backdrop{display:none}
.tblwrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
@media(max-width:768px){
  .sidebar{transform:translateX(-100%);box-shadow:0 10px 40px rgba(0,0,0,.18)}
  .sidebar.open{transform:translateX(0)}
  .content{margin-left:0;padding:16px}
  .topbar{display:flex}
  .backdrop.show{display:block;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:35}
  .g2,.g3,.g4{grid-template-columns:1fr}
  .card{padding:16px;overflow-x:auto}
  .h1{font-size:19px}
  .sc{min-width:120px}
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
  return(<>
    <div className={`sidebar${open?" open":""}`}>
      <div style={{padding:"16px 18px",borderBottom:"1px solid #EBEBEB"}} className="fx"><div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,#4F46E5,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:13,fontFamily:"'DM Sans'"}}>A</div><span style={{fontSize:15,fontWeight:700,fontFamily:"'DM Sans'"}}>Apni Vidya</span></div>
      <div style={{flex:1,padding:"6px 8px",overflowY:"auto"}}>{items.map(it=><button key={it.id} className={`sb-item${view===it.id?" active":""}`} onClick={()=>pick(it.id)}>{it.l}</button>)}</div>
      <div style={{padding:14,borderTop:"1px solid #EBEBEB"}}><div style={{fontSize:13,fontWeight:500}}>{user.full_name}</div><div className="muted" style={{fontSize:12,marginBottom:8}}>{roleLabel||user.role}</div><button className="btn bs bsm" style={{width:"100%",justifyContent:"center"}} onClick={logout}>Sign out</button></div>
    </div>
    <div className={`backdrop${open?" show":""}`} onClick={()=>setOpen(false)}/>
    <div className="content">
      <div className="topbar"><button className="hamb" onClick={()=>setOpen(true)} aria-label="Menu">☰</button><span style={{fontSize:15,fontWeight:700,fontFamily:"'DM Sans'"}}>Apni Vidya</span></div>
      {children}
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
  return(<div><h1 className="h1" style={{marginBottom:16}}>Attendance</h1>
    <div className="card" style={{maxWidth:440}}><div className="fx" style={{justifyContent:"space-between",marginBottom:10}}><span className="muted">Overall attendance</span><span style={{fontWeight:700,fontSize:20,color:col}}>{pct}%</span></div>
      <div className="pb"><div className="pbf" style={{width:`${pct}%`,background:col}}/></div>
      <p className="muted" style={{fontSize:12,marginTop:12}}>Present {a.present_days||0} of {a.total_days||0} marked days</p></div>
  </div>);
}
function ProgressView({dash,title="My progress"}){
  if(!dash) return <div className="card"><p className="empty">Loading…</p></div>;
  const p=dash.performance||{};const sw=dash.swot||{};
  return(<div><h1 className="h1" style={{marginBottom:16}}>{title}</h1>
    <div className="fx fw" style={{marginBottom:20}}>
      <div className="sc"><div className="sn" style={{color:P}}>{p.average_pct||0}%</div><div className="muted">Average score</div></div>
      <div className="sc"><div className="sn" style={{color:G}}>{p.tests_taken||0}</div><div className="muted">Tests taken</div></div>
      <div className="sc"><div className="sn" style={{color:A}}>{dash.attendance?.attendance_pct||0}%</div><div className="muted">Attendance</div></div>
    </div>
    {sw.weaknesses?.length>0&&<div className="card" style={{marginBottom:16}}><h3 className="h2" style={{color:R}}>Focus areas</h3><div className="fx fw">{sw.weaknesses.map(w=><Bd key={w.topic} bg={RL} fg={R}>{w.topic} ({w.accuracy}%)</Bd>)}</div></div>}
    {sw.strengths?.length>0&&<div className="card" style={{marginBottom:16}}><h3 className="h2" style={{color:G}}>Strengths</h3><div className="fx fw">{sw.strengths.map(w=><Bd key={w.topic} bg={GL} fg={G}>{w.topic} ({w.accuracy}%)</Bd>)}</div></div>}
    <div className="card"><h3 className="h2">Recent tests</h3><table className="tbl"><thead><tr><th>Test</th><th>Score</th><th>Rank</th><th>%</th></tr></thead><tbody>{(p.recent_tests||[]).map((t,i)=><tr key={i}><td style={{fontWeight:500}}>{t.title}</td><td>{t.score}/{t.max_marks}</td><td>#{t.rank||"—"}</td><td>{t.percentage}%</td></tr>)}{(p.recent_tests||[]).length===0&&<tr><td colSpan={4} className="empty">No tests taken yet</td></tr>}</tbody></table></div>
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
    <h1 className="h1" style={{marginBottom:4}}>Hi, {(user.full_name||"").split(" ")[0]} 👋</h1><p className="muted" style={{marginBottom:22}}>{dash?.student?.batch||""}</p>
    <div className="fx fw" style={{marginBottom:22}}>
      <div className="sc" onClick={()=>go("attendance")}><div className="sn" style={{color:P}}>{dash?.attendance?.attendance_pct??"–"}%</div><div className="muted">Attendance</div></div>
      <div className="sc" onClick={()=>go("progress")}><div className="sn" style={{color:G}}>{dash?.performance?.average_pct??"–"}%</div><div className="muted">Avg score</div></div>
      <div className="sc" onClick={()=>go("planner")}><div className="sn" style={{color:A}}>{pending}</div><div className="muted">Tasks to do</div></div>
    </div>
    <div className="card" style={{marginBottom:16}}><h3 className="h2">Today's classes</h3>{todays.length>0?<div className="fx fw">{todays.map(s=>{const[bg,fg]=ttColor(s.subject);return(<div key={s.id} style={{background:bg,borderLeft:`3px solid ${fg}`,borderRadius:8,padding:"8px 12px",minWidth:130}}><div style={{fontSize:11,fontWeight:600,color:fg}}>{ttFmt(s.start_time)}–{ttFmt(s.end_time)}</div><div style={{fontSize:13,fontWeight:600}}>{s.subject}</div>{s.room&&<div className="muted" style={{fontSize:11}}>{s.room}</div>}</div>);})}</div>:<p className="empty">No classes scheduled today 🎉</p>}</div>
    {ann[0]&&<div className="card"><h3 className="h2">Latest announcement</h3><div style={{fontWeight:600,marginBottom:4}}>{ann[0].title}</div><p className="muted">{ann[0].body}</p></div>}
  </div>);
}
function StudentPlanner(){
  const[tasks,sT]=useState([]);
  const ld=useCallback(()=>{GET("/planner/mine").then(sT).catch(()=>sT([]));},[]);
  useEffect(()=>{ld();},[ld]);
  const toggle=async(id)=>{await POST(`/planner/${id}/toggle`).catch(()=>{});ld();};
  return(<div><h1 className="h1" style={{marginBottom:16}}>Study planner</h1>
    <div className="card">{tasks.map((t,i)=><div key={t.id} className="fx" style={{justifyContent:"space-between",padding:"12px 0",borderBottom:i<tasks.length-1?"1px solid #F3F4F6":"none"}}>
      <div className="fx"><input type="checkbox" checked={!!t.done} onChange={()=>toggle(t.id)} style={{width:18,height:18,accentColor:P,cursor:"pointer"}}/><div><div style={{fontWeight:500,textDecoration:t.done?"line-through":"none",color:t.done?"#9CA3AF":"#1A1A2E"}}>{t.title}</div>{t.description&&<div className="muted" style={{fontSize:12}}>{t.description}</div>}</div></div>
      <span className="muted" style={{fontSize:12}}>{t.due_date||""}</span>
    </div>)}{tasks.length===0&&<p className="empty">No tasks assigned yet</p>}</div>
  </div>);
}

/* ─── Student: study material ─── */
const MAT_ICON={pdf:"📄",video:"🎬",note:"📝",link:"🔗",other:"📎"};
function StudentMaterials(){
  const[items,sI]=useState(null);
  useEffect(()=>{GET("/materials/mine").then(sI).catch(()=>sI([]));},[]);
  if(items===null) return <div><h1 className="h1" style={{marginBottom:16}}>Study material</h1><div className="card"><p className="empty">Loading…</p></div></div>;
  return(<div><h1 className="h1" style={{marginBottom:16}}>Study material</h1>
    {items.length===0?<div className="card"><p className="empty">No material shared yet</p></div>:
    <div className="fx fw" style={{alignItems:"stretch",gap:12}}>{items.map(m=><a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" className="card" style={{flex:"1 1 260px",minWidth:240,textDecoration:"none",color:"inherit",display:"block"}}>
      <div className="fx" style={{justifyContent:"space-between",marginBottom:8}}><div className="fx" style={{gap:8}}><span style={{fontSize:20}}>{MAT_ICON[m.kind]||"📎"}</span>{m.subject&&<Bd>{m.subject}</Bd>}</div><Bd bg="#F3F4F6" fg="#6B7280">{m.kind}</Bd></div>
      <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>{m.title}</div>
      {m.description&&<p className="muted" style={{fontSize:12,marginBottom:8}}>{m.description}</p>}
      <span style={{fontSize:12,fontWeight:600,color:P}}>Open ↗</span>
    </a>)}</div>}
  </div>);
}

/* ─── Student: tests list + in-app player ─── */
function StudentTests(){
  const[tests,sT]=useState(null);const[active,sA]=useState(null);
  const ld=useCallback(()=>{GET("/tests/mine").then(sT).catch(()=>sT([]));},[]);
  useEffect(()=>{ld();},[ld]);
  if(active) return <TestPlayer testId={active} onExit={()=>{sA(null);ld();}}/>;
  if(tests===null) return <div><h1 className="h1" style={{marginBottom:16}}>Tests</h1><div className="card"><p className="empty">Loading…</p></div></div>;
  return(<div><h1 className="h1" style={{marginBottom:16}}>Tests</h1>
    <div className="card"><table className="tbl"><thead><tr><th>Test</th><th>Subject</th><th>Qs</th><th>Marks</th><th>Time</th><th></th></tr></thead><tbody>
      {tests.map(t=><tr key={t.id}><td style={{fontWeight:500}}>{t.title}</td><td>{t.subject||"Mixed"}</td><td>{t.question_count}</td><td>{t.total_marks}</td><td>{t.duration_min}m</td>
        <td>{t.submitted?<div className="fx" style={{gap:8}}><Bd bg={GL} fg={G}>Done</Bd><span style={{fontSize:12,fontWeight:600}}>{t.score}/{t.max_marks}{t.rank?` · #${t.rank}`:""}</span></div>:<button className="btn bp bsm" onClick={()=>sA(t.id)}>Start test</button>}</td>
      </tr>)}
      {tests.length===0&&<tr><td colSpan={6} className="empty">No tests assigned yet</td></tr>}
    </tbody></table></div>
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
    if(r)sResult(r);else submittedRef.current=false; // allow retry if the call failed
  },[testId]);

  // Tick the countdown once per second; auto-submit at zero.
  useEffect(()=>{
    if(left===null||result)return;
    if(left<=0){doSubmit(true);return;}
    const id=setTimeout(()=>sLeft(l=>l-1),1000);
    return()=>clearTimeout(id);
  },[left,result,doSubmit]);

  if(!data) return <div className="card"><p className="empty">Loading test…</p></div>;
  if(data.error) return <div><div className="card"><p className="empty">Couldn't load this test.</p></div><button className="btn bs" style={{marginTop:12}} onClick={onExit}>← Back</button></div>;

  if(result){const pct=result.max_marks?Math.round(result.score/result.max_marks*1000)/10:0;const col=pct>=70?G:pct>=40?A:R;
    return(<div><h1 className="h1" style={{marginBottom:16}}>{data.test.title}</h1>
      <div className="card" style={{maxWidth:440,textAlign:"center"}}>
        <div style={{fontSize:13,color:"#6B7280",marginBottom:6}}>Your score</div>
        <div className="sn" style={{fontSize:42,color:col}}>{result.score}<span style={{fontSize:22,color:"#9CA3AF"}}>/{result.max_marks}</span></div>
        <div style={{fontWeight:600,color:col,marginBottom:10}}>{pct}%</div>
        {result.rank&&<Bd bg={PL} fg={P}>Rank #{result.rank} in batch</Bd>}
        <div style={{marginTop:18}}><button className="btn bp" onClick={onExit}>Done</button></div>
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
    <div className="fx" style={{justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10}}>
      <div><h1 className="h1" style={{marginBottom:2}}>{data.test.title}</h1><p className="muted" style={{fontSize:12}}>{answered} of {qs.length} answered</p></div>
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:10,background:lowTime?RL:PL,color:lowTime?R:P,fontWeight:700,fontFamily:"'DM Sans'",fontSize:18,fontVariantNumeric:"tabular-nums"}}>⏱ {mm}:{ss}</div>
    </div>
    {/* Navigator */}
    <div className="card" style={{marginBottom:14,padding:14}}>
      <div className="fx fw" style={{gap:7}}>{qs.map((qq,i)=>{const done=answers[qq.id]!==undefined;const flagged=flags[qq.id];const cur=i===idx;
        return <button key={qq.id} onClick={()=>sIdx(i)} title={flagged?"Flagged for review":""} style={{position:"relative",width:34,height:34,borderRadius:8,border:cur?`2px solid ${P}`:"1px solid #E5E7EB",background:done?PL:"#fff",color:done?P:"#6B7280",fontWeight:600,fontSize:13,cursor:"pointer"}}>{i+1}{flagged&&<span style={{position:"absolute",top:-4,right:-4,width:9,height:9,borderRadius:"50%",background:A,border:"1.5px solid #fff"}}/>}</button>;})}</div>
    </div>
    {/* Question */}
    <div className="card" style={{marginBottom:14}}>
      <div className="fx" style={{justifyContent:"space-between",marginBottom:10}}><div className="fx" style={{gap:8}}>{q.subject&&<Bd>{q.subject}</Bd>}{q.topic&&<Bd bg="#F3F4F6" fg="#6B7280">{q.topic}</Bd>}<span className="muted" style={{fontSize:12}}>+{q.marks}{q.negative_marks?` / −${q.negative_marks}`:""}</span></div>
        <button className="btn bsm" style={{background:flags[q.id]?AL:"#F9FAFB",color:flags[q.id]?A:"#9CA3AF",border:`1px solid ${flags[q.id]?A:"#E5E7EB"}`}} onClick={()=>toggleFlag(q.id)}>{flags[q.id]?"🚩 Flagged":"⚐ Flag"}</button></div>
      <div style={{fontSize:15,fontWeight:500,marginBottom:14}}>{idx+1}. {q.text}</div>
      <div style={{display:"grid",gap:8}}>{(q.options||[]).map((o,oi)=>{const sel=answers[q.id]===oi;
        return <button key={oi} onClick={()=>pick(q.id,oi)} style={{textAlign:"left",padding:"11px 14px",borderRadius:9,border:sel?`2px solid ${P}`:"1px solid #E5E7EB",background:sel?PL:"#fff",cursor:"pointer",fontSize:14,display:"flex",gap:10,alignItems:"center",fontFamily:"inherit"}}>
          <span style={{width:24,height:24,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,background:sel?P:"#F3F4F6",color:sel?"#fff":"#6B7280"}}>{String.fromCharCode(65+oi)}</span>
          <span>{o}</span></button>;})}</div>
      {answers[q.id]!==undefined&&<button className="btn bs bsm" style={{marginTop:12}} onClick={()=>sAns(a=>{const n={...a};delete n[q.id];return n;})}>Clear answer</button>}
    </div>
    {/* Footer nav */}
    <div className="fx" style={{justifyContent:"space-between"}}>
      <button className="btn bs" disabled={idx===0} onClick={()=>sIdx(i=>Math.max(0,i-1))}>← Previous</button>
      {idx<qs.length-1?<button className="btn bp" onClick={()=>sIdx(i=>Math.min(qs.length-1,i+1))}>Next →</button>
        :<button className="btn bp" onClick={()=>sConfirm(true)} disabled={submitting}>{submitting?"Submitting…":"Submit test"}</button>}
    </div>
    {confirm&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>sConfirm(false)}>
      <div className="card" style={{maxWidth:360}} onClick={e=>e.stopPropagation()}><h3 className="h2">Submit test?</h3>
        <p className="muted" style={{marginBottom:16}}>You've answered {answered} of {qs.length} question(s).{answered<qs.length?" Unanswered questions score zero.":""} This can't be undone.</p>
        <div className="fx"><button className="btn bp" onClick={()=>{sConfirm(false);doSubmit(false);}}>Yes, submit</button><button className="btn bs" onClick={()=>sConfirm(false)}>Keep working</button></div>
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
  if(!child) return <div className="card"><p className="empty">No child is linked to this account yet</p></div>;
  const due=(child.fees||[]).filter(f=>f.status!=="paid").reduce((s,f)=>s+((f.amount_due||0)-(f.amount_paid||0)),0);
  return(<div>
    <h1 className="h1" style={{marginBottom:4}}>{child.student?.name}</h1><p className="muted" style={{marginBottom:22}}>{child.student?.batch||""}</p>
    <div className="fx fw">
      <div className="sc" onClick={()=>go("attendance")}><div className="sn" style={{color:P}}>{child.attendance?.attendance_pct||0}%</div><div className="muted">Attendance</div></div>
      <div className="sc" onClick={()=>go("progress")}><div className="sn" style={{color:G}}>{child.performance?.average_pct||0}%</div><div className="muted">Avg score</div></div>
      <div className="sc" onClick={()=>go("fees")}><div className="sn" style={{color:due>0?R:G}}>₹{due.toLocaleString()}</div><div className="muted">Fees due</div></div>
    </div>
  </div>);
}
function ParentFees({child,reload}){
  const fees=child?.fees||[];
  return(<div><h1 className="h1" style={{marginBottom:16}}>Fees</h1>
    <div className="card"><table className="tbl"><thead><tr><th>Fee</th><th>Due</th><th>Paid</th><th>Status</th><th></th></tr></thead><tbody>{fees.map((f,i)=>{const bal=(f.amount_due||0)-(f.amount_paid||0);const rid=f.fee_record_id||f.id;return(<tr key={i}><td style={{fontWeight:500}}>{f.title||"Fee"}</td><td>₹{(f.amount_due||0).toLocaleString()}</td><td>₹{(f.amount_paid||0).toLocaleString()}</td><td><Bd bg={f.status==="paid"?GL:AL} fg={f.status==="paid"?G:A}>{f.status}</Bd></td><td>{f.status!=="paid"&&rid&&<button className="btn bp bsm" onClick={()=>payNow(rid,reload)}>Pay ₹{bal.toLocaleString()}</button>}</td></tr>);})}{fees.length===0&&<tr><td colSpan={5} className="empty">No fee records</td></tr>}</tbody></table></div>
  </div>);
}

/* ═══════════════════════════════════════════
   APP
   ═══════════════════════════════════════════ */
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
        : <>
        <Sidebar view={view} setView={setView} user={user} logout={logout} open={navOpen} onClose={()=>setNavOpen(false)}/>
        <div className={`backdrop${navOpen?" show":""}`} onClick={()=>setNavOpen(false)}/>
        <div className="content">
          <div className="topbar"><button className="hamb" onClick={()=>setNavOpen(true)} aria-label="Menu">☰</button><span style={{fontSize:15,fontWeight:700,fontFamily:"'DM Sans'"}}>Apni Vidya</span></div>
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
        </div>
      </>}
    </div>
  );
}

/* ─── Auth ─── */
function Auth({onLogin,onSignup}){
  const [m,setM]=useState("login");
  const [f,sF]=useState({phone:"9876543210",password:"admin123",full_name:"",role:"institute_admin",otp:"",new_password:""});
  const [err,sE]=useState("");const [info,sIn]=useState("");const [busy,sB]=useState(false);
  const s=(k,v)=>sF(p=>({...p,[k]:v}));
  const switchTo=mode=>{setM(mode);sE("");sIn("");};
  const go=async()=>{sE("");sIn("");sB(true);try{
    if(m==="login") await onLogin(f.phone,f.password);
    else if(m==="signup") await onSignup(f);
    else if(m==="forgot"){ const r=await POST("/auth/forgot",{phone:f.phone}); sIn(r.message||"If that number is registered, a reset code has been sent."); if(r.demo_otp){ s("otp",r.demo_otp); toast(`Demo code: ${r.demo_otp}`,"success"); } setM("reset"); }
    else if(m==="reset"){ const r=await POST("/auth/reset",{phone:f.phone,otp:f.otp,new_password:f.new_password}); toast(r.message||"Password reset.","success"); s("password",""); setM("login"); }
  }catch(e){sE(e.message);}sB(false);};
  const T={login:["Welcome back","Sign in to your institute"],signup:["Create account","Set up your institute"],forgot:["Reset password","We'll text a 6-digit code to your phone"],reset:["Enter the code","Then choose a new password"]}[m];
  const cta={login:"Sign in",signup:"Create account",forgot:"Send code",reset:"Reset password"}[m];
  return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:24}}>
    <div style={{width:380,maxWidth:"100%"}}>
      <div className="fx" style={{marginBottom:28}}><div style={{width:34,height:34,borderRadius:9,background:"linear-gradient(135deg,#4F46E5,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:16,fontFamily:"'DM Sans'"}}>A</div><span style={{fontSize:19,fontWeight:700,fontFamily:"'DM Sans'"}}>Apni Vidya</span></div>
      <h1 className="h1" style={{marginBottom:6}}>{T[0]}</h1>
      <p className="muted" style={{marginBottom:24}}>{T[1]}</p>
      {m==="signup"&&<div className="field"><label>Full name</label><input className="inp" value={f.full_name} onChange={e=>s("full_name",e.target.value)}/></div>}
      <div className="field"><label>Phone</label><input className="inp" value={f.phone} onChange={e=>s("phone",e.target.value)} disabled={m==="reset"}/></div>
      {(m==="login"||m==="signup")&&<div className="field"><label>Password</label><input type="password" className="inp" value={f.password} onChange={e=>s("password",e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}/></div>}
      {m==="reset"&&<div className="field"><label>6-digit code</label><input className="inp" value={f.otp} inputMode="numeric" maxLength={6} onChange={e=>s("otp",e.target.value.replace(/\D/g,""))}/></div>}
      {m==="reset"&&<div className="field"><label>New password</label><input type="password" className="inp" value={f.new_password} onChange={e=>s("new_password",e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}/></div>}
      {err&&<div className="err">{err}</div>}
      {info&&<div className="ok">{info}</div>}
      <button className="btn bp" style={{width:"100%",justifyContent:"center",marginBottom:14}} onClick={go} disabled={busy}>{busy?"Wait...":cta}</button>
      {m==="login"&&<p className="muted" style={{textAlign:"center",marginBottom:8}}><span style={{color:P,cursor:"pointer",fontWeight:500}} onClick={()=>switchTo("forgot")}>Forgot password?</span></p>}
      {(m==="login"||m==="signup")&&<p className="muted" style={{textAlign:"center"}}>{m==="login"?"New? ":"Have account? "}<span style={{color:P,cursor:"pointer",fontWeight:500}} onClick={()=>switchTo(m==="login"?"signup":"login")}>{m==="login"?"Create account":"Sign in"}</span></p>}
      {(m==="forgot"||m==="reset")&&<p className="muted" style={{textAlign:"center"}}><span style={{color:P,cursor:"pointer",fontWeight:500}} onClick={()=>switchTo("login")}>Back to sign in</span></p>}
    </div>
  </div>);
}

/* ─── Sidebar ─── */
function Sidebar({view,setView,user,logout,open,onClose}){
  const items=[{id:"overview",l:"Overview"},0,{id:"institute",l:"Institute"},{id:"batches",l:"Batches"},{id:"courses",l:"Courses"},{id:"enrollments",l:"Enrollments"},{id:"students",l:"Students"},0,{id:"fees",l:"Fees"},{id:"attendance",l:"Attendance"},0,{id:"questions",l:"Question bank"},{id:"tests",l:"Tests"},{id:"materials",l:"Study material"},{id:"planner",l:"Study planner"},{id:"timetable",l:"Timetable"},0,{id:"announcements",l:"Announcements"},{id:"notifications",l:"Notifications"},{id:"autoreports",l:"Auto reports"},{id:"reports",l:"Reports"}];
  const pick=id=>{setView(id);onClose&&onClose();};
  return(<div className={`sidebar${open?" open":""}`}>
    <div style={{padding:"16px 18px",borderBottom:"1px solid #EBEBEB"}} className="fx"><div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,#4F46E5,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:13,fontFamily:"'DM Sans'"}}>A</div><span style={{fontSize:15,fontWeight:700,fontFamily:"'DM Sans'"}}>Apni Vidya</span></div>
    <div style={{flex:1,padding:"6px 8px",overflowY:"auto"}}>{items.map((it,i)=>it===0?<div key={i} style={{height:1,background:"#EBEBEB",margin:"6px 8px"}}/>:<button key={it.id} className={`sb-item${view===it.id?" active":""}`} onClick={()=>pick(it.id)}>{it.l}</button>)}</div>
    <div style={{padding:14,borderTop:"1px solid #EBEBEB"}}><div style={{fontSize:13,fontWeight:500}}>{user.full_name}</div><div className="muted" style={{fontSize:12,marginBottom:8}}>{user.role}</div><button className="btn bs bsm" style={{width:"100%",justifyContent:"center"}} onClick={logout}>Sign out</button></div>
  </div>);
}

/* ─── Overview ─── */
function Overview({inst,go}){
  const [d,sD]=useState({});
  useEffect(()=>{if(!inst)return;(async()=>{const[b,e,q]=await Promise.all([GET(`/batches/${inst.id}`).catch(()=>[]),GET(`/enrollment/requests/${inst.id}?status=pending`).catch(()=>[]),GET(`/questions/${inst.id}`).catch(()=>[])]);sD({batches:b.length,pending:e.length,questions:q.length});})();},[inst]);
  if(!inst)return<div className="card"><p className="muted">Set up your institute first.</p><button className="btn bp" style={{marginTop:12}} onClick={()=>go("institute")}>Set up</button></div>;
  return(<div>
    <h1 className="h1" style={{marginBottom:4}}>Dashboard</h1><p className="muted" style={{marginBottom:22}}>{inst.name}</p>
    <div className="fx fw" style={{marginBottom:24}}>
      {[{l:"Batches",v:d.batches??"-",fg:P,t:"batches"},{l:"Pending enrollments",v:d.pending??"-",fg:A,t:"enrollments"},{l:"Questions",v:d.questions??"-",fg:"#7C3AED",t:"questions"}].map(x=><div key={x.l} className="sc" onClick={()=>go(x.t)}><div className="sn" style={{color:x.fg}}>{x.v}</div><div className="muted">{x.l}</div></div>)}
    </div>
    <div className="card"><h3 className="h2">Quick actions</h3><div className="fx fw">
      <button className="btn bp" onClick={()=>go("tests")}>Create test</button><button className="btn bs" onClick={()=>go("questions")}>Add questions</button><button className="btn bs" onClick={()=>go("attendance")}>Mark attendance</button><button className="btn bs" onClick={()=>go("announcements")}>Announcement</button>
    </div></div>
  </div>);
}

/* ─── Institute ─── */
function Institute({inst,setInst}){
  const [f,sF]=useState({name:"",city:"",state:"",address:"",pincode:""});const[ok,sO]=useState("");const[err,sE]=useState("");
  useEffect(()=>{if(inst)sF({name:inst.name||"",city:inst.city||"",state:inst.state||"",address:inst.address||"",pincode:inst.pincode||""});},[inst]);
  const save=async()=>{sE("");sO("");try{if(inst){const u=await PUT(`/institutes/${inst.id}`,f);setInst(u);sO("Updated");}else{const n=await POST("/institutes",f);setInst(n);sO("Created");}}catch(e){sE(e.message);}};
  return(<div><h1 className="h1" style={{marginBottom:20}}>Institute</h1><div className="fx fw" style={{alignItems:"flex-start",gap:20}}>
    <div className="card" style={{flex:1,minWidth:300}}><h3 className="h2">Details</h3><div className="g2"><div className="field"><label>Name</label><input className="inp" value={f.name} onChange={e=>sF({...f,name:e.target.value})}/></div><div className="field"><label>City</label><input className="inp" value={f.city} onChange={e=>sF({...f,city:e.target.value})}/></div><div className="field"><label>State</label><input className="inp" value={f.state} onChange={e=>sF({...f,state:e.target.value})}/></div><div className="field"><label>Pincode</label><input className="inp" value={f.pincode} onChange={e=>sF({...f,pincode:e.target.value})}/></div></div>
      {err&&<div className="err">{err}</div>}{ok&&<div className="ok">{ok}</div>}<button className="btn bp" onClick={save}>{inst?"Update":"Create"}</button></div>
    {inst&&<div className="card" style={{flex:"0 0 250px",textAlign:"center"}}><h3 className="h2">QR code</h3>{inst.qr_code_data?<img src={inst.qr_code_data} alt="QR" style={{width:170,margin:"0 auto 12px",display:"block"}}/>:<div style={{width:170,height:170,margin:"0 auto 12px",background:"#F3F4F6",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,color:"#D1D5DB"}}>QR</div>}<p className="muted" style={{fontSize:12}}>/enroll/{inst.enrollment_slug}</p></div>}
  </div></div>);
}

/* ─── Batches ─── */
function Batches({inst}){const[items,sI]=useState([]);const[show,sS]=useState(false);const[f,sF]=useState({name:"",description:""});
  const ld=useCallback(async()=>{if(inst)sI(await GET(`/batches/${inst.id}`).catch(()=>[]));},[inst]);useEffect(()=>{ld();},[ld]);
  const add=async()=>{await POST("/batches",{institute_id:inst.id,...f}).catch(()=>{});sF({name:"",description:""});sS(false);ld();};
  return(<div><div className="fx" style={{justifyContent:"space-between",marginBottom:20}}><h1 className="h1">Batches</h1><button className="btn bp" onClick={()=>sS(!show)}>+ New batch</button></div>
    {show&&<div className="card" style={{marginBottom:16}}><div className="g2" style={{marginBottom:10}}><div className="field"><label>Name</label><input className="inp" value={f.name} onChange={e=>sF({...f,name:e.target.value})}/></div><div className="field"><label>Description</label><input className="inp" value={f.description} onChange={e=>sF({...f,description:e.target.value})}/></div></div><div className="fx"><button className="btn bp" onClick={add}>Create</button><button className="btn bs" onClick={()=>sS(false)}>Cancel</button></div></div>}
    <div className="card"><table className="tbl"><thead><tr><th>Name</th><th>Description</th><th>Students</th></tr></thead><tbody>{items.map(b=><tr key={b.id}><td style={{fontWeight:500}}>{b.name}</td><td className="muted">{b.description||"—"}</td><td>{b.student_count??0}</td></tr>)}{items.length===0&&<tr><td colSpan={3} className="empty">No batches</td></tr>}</tbody></table></div>
  </div>);
}

/* ─── Courses ─── */
function Courses({inst}){const[items,sI]=useState([]);const[show,sS]=useState(false);const[f,sF]=useState({name:"",fee_amount:0,duration_days:""});
  const ld=useCallback(async()=>{if(inst)sI(await GET(`/courses/${inst.id}`).catch(()=>[]));},[inst]);useEffect(()=>{ld();},[ld]);
  const add=async()=>{await POST("/courses",{institute_id:inst.id,...f,fee_amount:Number(f.fee_amount)}).catch(()=>{});sF({name:"",fee_amount:0,duration_days:""});sS(false);ld();};
  return(<div><div className="fx" style={{justifyContent:"space-between",marginBottom:20}}><h1 className="h1">Courses</h1><button className="btn bp" onClick={()=>sS(!show)}>+ New</button></div>
    {show&&<div className="card" style={{marginBottom:16}}><div className="g3" style={{marginBottom:10}}><div className="field"><label>Name</label><input className="inp" value={f.name} onChange={e=>sF({...f,name:e.target.value})}/></div><div className="field"><label>Fee ₹</label><input type="number" className="inp" value={f.fee_amount} onChange={e=>sF({...f,fee_amount:e.target.value})}/></div><div className="field"><label>Duration (days)</label><input type="number" className="inp" value={f.duration_days} onChange={e=>sF({...f,duration_days:e.target.value})}/></div></div><div className="fx"><button className="btn bp" onClick={add}>Create</button><button className="btn bs" onClick={()=>sS(false)}>Cancel</button></div></div>}
    <div className="card"><table className="tbl"><thead><tr><th>Name</th><th>Fee</th><th>Duration</th></tr></thead><tbody>{items.map(c=><tr key={c.id}><td style={{fontWeight:500}}>{c.name}</td><td>₹{c.fee_amount?.toLocaleString()}</td><td>{c.duration_days?`${c.duration_days}d`:"—"}</td></tr>)}{items.length===0&&<tr><td colSpan={3} className="empty">No courses</td></tr>}</tbody></table></div>
  </div>);
}

/* ─── Enrollments ─── */
function Enrollments({inst}){const[items,sI]=useState([]);const[tab,sT]=useState("pending");
  const ld=useCallback(async()=>{if(inst)sI(await GET(`/enrollment/requests/${inst.id}?status=${tab}`).catch(()=>[]));},[inst,tab]);useEffect(()=>{ld();},[ld]);
  const act=async(id,a)=>{await POST(`/enrollment/${a}/${id}`,undefined,a==="approve"?"Enrollment approved — credentials generated":"Request rejected").catch(()=>{});ld();};
  return(<div><h1 className="h1" style={{marginBottom:16}}>Enrollments</h1><div className="fx" style={{marginBottom:16}}>{["pending","approved","rejected"].map(t=><button key={t} className={`btn bsm ${tab===t?"bp":"bs"}`} style={{textTransform:"capitalize"}} onClick={()=>sT(t)}>{t}</button>)}</div>
    <div className="card"><table className="tbl"><thead><tr><th>Student</th><th>Phone</th><th>Parent</th>{tab==="pending"&&<th>Actions</th>}</tr></thead><tbody>{items.map(e=><tr key={e.id}><td style={{fontWeight:500}}>{e.student_name}</td><td>{e.student_phone}</td><td>{e.parent_name||"—"}</td>{tab==="pending"&&<td><div className="fx"><button className="btn bg bsm" onClick={()=>act(e.id,"approve")}>Approve</button><button className="btn bd bsm" onClick={()=>act(e.id,"reject")}>Reject</button></div></td>}</tr>)}{items.length===0&&<tr><td colSpan={4} className="empty">No {tab} requests</td></tr>}</tbody></table></div>
  </div>);
}

/* ─── Students ─── */
function Students({inst}){const[batches,sB]=useState([]);const[batch,sBA]=useState("");const[items,sI]=useState([]);
  useEffect(()=>{if(inst)GET(`/batches/${inst.id}`).then(sB).catch(()=>{});},[inst]);
  useEffect(()=>{if(batch)GET(`/attendance/summary/${batch}`).then(sI).catch(()=>sI([]));else sI([]);},[batch]);
  return(<div><div className="fx" style={{justifyContent:"space-between",marginBottom:20}}><h1 className="h1">Students</h1><select className="sel" value={batch} onChange={e=>sBA(e.target.value)}><option value="">Select batch</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
    <div className="card"><table className="tbl"><thead><tr><th>Name</th><th>Present / Total</th><th>Attendance</th></tr></thead><tbody>{items.map(s=><tr key={s.student_id}><td style={{fontWeight:500}}>{s.student_name}</td><td>{s.present_days}/{s.total_days}</td><td><div className="fx"><div className="pb" style={{flex:1,maxWidth:100}}><div className="pbf" style={{width:`${s.attendance_pct}%`,background:s.attendance_pct>=75?G:s.attendance_pct>=50?A:R}}/></div><span style={{fontSize:12,fontWeight:500}}>{s.attendance_pct}%</span></div></td></tr>)}{items.length===0&&<tr><td colSpan={3} className="empty">{batch?"No students":"Select a batch"}</td></tr>}</tbody></table></div>
  </div>);
}

/* ─── Fees ─── */
function Fees({inst}){const[structs,sS]=useState([]);const[show,sSh]=useState(false);const[batches,sB]=useState([]);
  const[recs,sR]=useState([]);const[sel,sSel]=useState(null);const[f,sF]=useState({title:"",batch_id:"",total_amount:"",due_date:""});const[pa,sP]=useState({});const[ok,sO]=useState("");
  const ld=useCallback(async()=>{if(inst)sS(await GET(`/fees/structures/${inst.id}`).catch(()=>[]));},[inst]);
  useEffect(()=>{ld();if(inst)GET(`/batches/${inst.id}`).then(sB).catch(()=>{});},[ld,inst]);
  const create=async()=>{await POST("/fees/structures",{institute_id:inst.id,...f,total_amount:Number(f.total_amount)}).catch(()=>{});sF({title:"",batch_id:"",total_amount:"",due_date:""});sSh(false);ld();sO("Created");};
  const viewR=async(id)=>{sSel(id);sR(await GET(`/fees/records/${id}`).catch(()=>[]));};
  const pay=async(rid)=>{const a=Number(pa[rid]);if(!a)return;await POST(`/fees/records/${rid}/pay`,{amount:a},`Payment of ₹${a.toLocaleString()} recorded`).catch(()=>{});viewR(sel);sP({...pa,[rid]:""});};
  return(<div><div className="fx" style={{justifyContent:"space-between",marginBottom:20}}><h1 className="h1">Fees</h1><button className="btn bp" onClick={()=>sSh(!show)}>+ New structure</button></div>
    {show&&<div className="card" style={{marginBottom:16}}><div className="g4" style={{marginBottom:10}}><div className="field"><label>Title</label><input className="inp" value={f.title} onChange={e=>sF({...f,title:e.target.value})}/></div><div className="field"><label>Batch</label><select className="sel" style={{width:"100%"}} value={f.batch_id} onChange={e=>sF({...f,batch_id:e.target.value})}><option value="">All</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div><div className="field"><label>Amount ₹</label><input type="number" className="inp" value={f.total_amount} onChange={e=>sF({...f,total_amount:e.target.value})}/></div><div className="field"><label>Due date</label><input type="date" className="inp" value={f.due_date} onChange={e=>sF({...f,due_date:e.target.value})}/></div></div><div className="fx"><button className="btn bp" onClick={create}>Create</button><button className="btn bs" onClick={()=>sSh(false)}>Cancel</button></div></div>}
    {ok&&<div className="ok">{ok}</div>}
    <div className="card" style={{marginBottom:20}}><table className="tbl"><thead><tr><th>Title</th><th>Batch</th><th>Amount</th><th>Due</th><th>Paid/Total</th><th></th></tr></thead><tbody>{structs.map(s=><tr key={s.id}><td style={{fontWeight:500}}>{s.title}</td><td>{s.batch_name||"All"}</td><td>₹{s.total_amount?.toLocaleString()}</td><td>{s.due_date||"—"}</td><td>{s.paid_records}/{s.total_records}</td><td><button className="btn bs bsm" onClick={()=>viewR(s.id)}>Records</button></td></tr>)}{structs.length===0&&<tr><td colSpan={6} className="empty">No fee structures</td></tr>}</tbody></table></div>
    {sel&&<div className="card"><h3 className="h2">Records</h3><table className="tbl"><thead><tr><th>Student</th><th>Due</th><th>Paid</th><th>Status</th><th>Pay</th></tr></thead><tbody>{recs.map(r=><tr key={r.id}><td style={{fontWeight:500}}>{r.student_name}</td><td>₹{r.amount_due?.toLocaleString()}</td><td>₹{r.amount_paid?.toLocaleString()}</td><td><Bd bg={r.status==="paid"?GL:r.is_overdue?RL:AL} fg={r.status==="paid"?G:r.is_overdue?R:A}>{r.is_overdue?"Overdue":r.status}</Bd></td><td>{r.status!=="paid"&&<div className="fx"><input type="number" className="inp" style={{width:80}} value={pa[r.id]||""} onChange={e=>sP({...pa,[r.id]:e.target.value})}/><button className="btn bg bsm" onClick={()=>pay(r.id)}>Pay</button></div>}</td></tr>)}</tbody></table></div>}
  </div>);
}

/* ─── Attendance ─── */
function Attendance({inst}){const[batches,sB]=useState([]);const[batch,sBA]=useState("");const[date,sD]=useState(today());const[sheet,sS]=useState([]);const[ok,sO]=useState("");
  useEffect(()=>{if(inst)GET(`/batches/${inst.id}`).then(sB).catch(()=>{});},[inst]);
  useEffect(()=>{if(batch)GET(`/attendance/sheet/${batch}?date=${date}`).then(d=>sS((d.students||[]).map(s=>({...s,status:s.status||"present"})))).catch(()=>sS([]));},[batch,date]);
  const save=async()=>{sO("");await POST("/attendance/mark",{batch_id:batch,date,entries:sheet.map(s=>({student_id:s.student_id,status:s.status}))},`Attendance saved for ${date}`).catch(()=>{});sO(`Saved for ${date}`);};
  const toggle=(i,st)=>{const n=[...sheet];n[i]={...n[i],status:st};sS(n);};
  const sc={present:{bg:GL,fg:G},absent:{bg:RL,fg:R},late:{bg:AL,fg:A}};
  return(<div><h1 className="h1" style={{marginBottom:16}}>Attendance</h1><div className="fx" style={{marginBottom:16}}><select className="sel" value={batch} onChange={e=>sBA(e.target.value)}><option value="">Select batch</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><input type="date" className="inp" style={{width:160}} value={date} onChange={e=>sD(e.target.value)}/>{batch&&<button className="btn bp" onClick={save}>Save</button>}</div>
    {ok&&<div className="ok">{ok}</div>}
    <div className="card"><table className="tbl"><thead><tr><th>Student</th><th>Status</th></tr></thead><tbody>{sheet.map((s,i)=><tr key={s.student_id}><td style={{fontWeight:500}}>{s.student_name}</td><td><div className="fx">{["present","absent","late"].map(st=><button key={st} className="btn bsm" style={{background:s.status===st?sc[st].bg:"#F9FAFB",color:s.status===st?sc[st].fg:"#9CA3AF",border:s.status===st?`1.5px solid ${sc[st].fg}`:"1.5px solid transparent",textTransform:"capitalize"}} onClick={()=>toggle(i,st)}>{st}</button>)}</div></td></tr>)}{sheet.length===0&&<tr><td colSpan={2} className="empty">{batch?"No students":"Select batch"}</td></tr>}</tbody></table></div>
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
    </div>)}{items.length===0&&<p className="empty">No questions</p>}</div>
  </div>);
}

/* ─── Tests ─── */
function Tests({inst}){const[batches,sB]=useState([]);const[batch,sBA]=useState("");const[tests,sT]=useState([]);const[questions,sQ]=useState([]);
  const[creating,sC]=useState(false);const[f,sF]=useState({title:"",subject:"all",duration_min:30,selected:[]});
  const[res,sR]=useState(null);const[ana,sA]=useState(null);const[vt,sVT]=useState(null);const[err,sE]=useState("");
  useEffect(()=>{if(inst){GET(`/batches/${inst.id}`).then(sB).catch(()=>{});GET(`/questions/${inst.id}`).then(sQ).catch(()=>sQ([]));}},[inst]);
  useEffect(()=>{if(batch)GET(`/tests/batch/${batch}`).then(sT).catch(()=>sT([]));else sT([]);},[batch]);
  // Questions imported without an answer can't be auto-graded, so they're not offered for tests.
  const answered=questions.filter(q=>q.type!=="mcq"||q.correct_index!=null);
  const unanswered=questions.length-answered.length;
  const fq=f.subject==="all"?answered:answered.filter(q=>q.subject===f.subject);
  const tg=id=>{const s=f.selected.includes(id)?f.selected.filter(x=>x!==id):[...f.selected,id];sF({...f,selected:s});};
  const create=async()=>{sE("");if(!f.title||!batch||f.selected.length===0){sE("Fill all fields");return;}try{await POST("/tests",{institute_id:inst.id,batch_id:batch,title:f.title,subject:f.subject==="all"?null:f.subject,duration_min:Number(f.duration_min),question_ids:f.selected});sF({title:"",subject:"all",duration_min:30,selected:[]});sC(false);GET(`/tests/batch/${batch}`).then(sT);}catch(e){sE(e.message);}};
  const showR=async tid=>{sVT(tid);sR(null);sA(null);const[r,a]=await Promise.all([GET(`/tests/${tid}/results`).catch(()=>[]),GET(`/tests/${tid}/analysis`).catch(()=>null)]);sR(r);sA(a);};
  return(<div><div className="fx" style={{justifyContent:"space-between",marginBottom:16}}><h1 className="h1">Tests</h1><div className="fx"><select className="sel" value={batch} onChange={e=>{sBA(e.target.value);sVT(null);}}><option value="">Select batch</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>{batch&&<button className="btn bp" onClick={()=>sC(!creating)}>+ Create</button>}</div></div>
    {creating&&<div className="card" style={{marginBottom:16}}><h3 className="h2">Create test</h3>
      <div className="g4" style={{marginBottom:14}}><div className="field"><label>Title</label><input className="inp" value={f.title} onChange={e=>sF({...f,title:e.target.value})}/></div><div className="field"><label>Subject</label><select className="sel" style={{width:"100%"}} value={f.subject} onChange={e=>sF({...f,subject:e.target.value,selected:[]})}><option value="all">All</option>{[...new Set(questions.map(q=>q.subject))].map(s=><option key={s}>{s}</option>)}</select></div><div className="field"><label>Duration</label><input type="number" className="inp" value={f.duration_min} onChange={e=>sF({...f,duration_min:e.target.value})}/></div><div className="field"><label>Selected</label><div style={{padding:"9px 0",fontWeight:600,color:P}}>{f.selected.length} Qs</div></div></div>
      <div style={{maxHeight:220,overflowY:"auto",border:"1px solid #E5E7EB",borderRadius:8,marginBottom:14}}>{fq.map(q=><label key={q.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 12px",borderBottom:"1px solid #F3F4F6",cursor:"pointer",background:f.selected.includes(q.id)?PL:"#fff"}}><input type="checkbox" checked={f.selected.includes(q.id)} onChange={()=>tg(q.id)} style={{marginTop:2,accentColor:P}}/><div><div style={{fontSize:12}}>{q.text}</div><span className="muted" style={{fontSize:11}}>{q.topic||q.subject} · {q.marks}m</span></div></label>)}{fq.length===0&&<p className="empty">No questions</p>}</div>
      {unanswered>0&&<p className="muted" style={{fontSize:12,marginBottom:10}}>{unanswered} question(s) hidden — their correct answer hasn't been set yet (Question bank → click an option).</p>}
      {err&&<div className="err">{err}</div>}<div className="fx"><button className="btn bp" onClick={create}>Create</button><button className="btn bs" onClick={()=>sC(false)}>Cancel</button></div>
    </div>}
    <div className="card" style={{marginBottom:20}}><table className="tbl"><thead><tr><th>Test</th><th>Subject</th><th>Qs</th><th>Marks</th><th>Dur</th><th>Subs</th><th></th></tr></thead><tbody>{tests.map(t=><tr key={t.id}><td style={{fontWeight:500}}>{t.title}</td><td>{t.subject||"Mixed"}</td><td>{t.question_count}</td><td>{t.total_marks}</td><td>{t.duration_min}m</td><td>{t.submission_count}</td><td><button className="btn bs bsm" onClick={()=>showR(t.id)}>Results</button></td></tr>)}{tests.length===0&&<tr><td colSpan={7} className="empty">{batch?"No tests":"Select batch"}</td></tr>}</tbody></table></div>
    {vt&&res&&<div className="card" style={{marginBottom:20}}><h3 className="h2">Scoreboard</h3><table className="tbl"><thead><tr><th>#</th><th>Student</th><th>Score</th><th>%</th></tr></thead><tbody>{res.map(r=><tr key={r.id}><td style={{fontWeight:600,color:r.rank<=3?P:"#6B7280"}}>#{r.rank}</td><td style={{fontWeight:500}}>{r.student_name}</td><td>{r.score}/{r.max_marks}</td><td><div className="fx"><div className="pb" style={{flex:1,maxWidth:100}}><div className="pbf" style={{width:`${r.percentage}%`,background:r.percentage>=70?G:r.percentage>=40?A:R}}/></div><span style={{fontSize:12,fontWeight:500}}>{r.percentage}%</span></div></td></tr>)}{res.length===0&&<tr><td colSpan={4} className="empty">No submissions</td></tr>}</tbody></table></div>}
    {vt&&ana&&<div className="card"><h3 className="h2">SWOT / Concept gaps</h3><p className="muted" style={{marginBottom:14}}>Below {ana.threshold}% = needs revision</p><div className="fx fw">{(ana.all||[]).map(t=><div key={t.topic} style={{padding:"12px 16px",borderRadius:10,background:t.flag==="strong"?GL:RL,border:`1px solid ${t.flag==="strong"?G:R}22`,minWidth:140}}><div style={{fontSize:12,fontWeight:600,color:t.flag==="strong"?G:R}}>{t.topic}</div><div className="sn" style={{color:t.flag==="strong"?G:R}}>{t.accuracy}%</div><div className="muted" style={{fontSize:11}}>{t.correct}/{t.attempts} correct</div></div>)}{(ana.all||[]).length===0&&<p className="empty">No data</p>}</div></div>}
  </div>);
}

/* ─── Study Planner ─── */
function Planner({inst}){const[batches,sB]=useState([]);const[batch,sBA]=useState("");const[tasks,sT]=useState([]);const[show,sS]=useState(false);const[f,sF]=useState({title:"",description:"",due_date:""});
  useEffect(()=>{if(inst)GET(`/batches/${inst.id}`).then(sB).catch(()=>{});},[inst]);
  useEffect(()=>{if(batch)GET(`/planner/batch/${batch}`).then(sT).catch(()=>sT([]));},[batch]);
  const add=async()=>{await POST("/planner",{institute_id:inst.id,batch_id:batch||null,...f}).catch(()=>{});sF({title:"",description:"",due_date:""});sS(false);if(batch)GET(`/planner/batch/${batch}`).then(sT);};
  return(<div><div className="fx" style={{justifyContent:"space-between",marginBottom:16}}><h1 className="h1">Study planner</h1><div className="fx"><select className="sel" value={batch} onChange={e=>sBA(e.target.value)}><option value="">Select batch</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><button className="btn bp" onClick={()=>sS(!show)}>+ Task</button></div></div>
    {show&&<div className="card" style={{marginBottom:16}}><div className="g3" style={{marginBottom:10}}><div className="field"><label>Title</label><input className="inp" value={f.title} onChange={e=>sF({...f,title:e.target.value})}/></div><div className="field"><label>Description</label><input className="inp" value={f.description} onChange={e=>sF({...f,description:e.target.value})}/></div><div className="field"><label>Due</label><input type="date" className="inp" value={f.due_date} onChange={e=>sF({...f,due_date:e.target.value})}/></div></div><div className="fx"><button className="btn bp" onClick={add}>Create</button><button className="btn bs" onClick={()=>sS(false)}>Cancel</button></div></div>}
    <div className="card"><table className="tbl"><thead><tr><th>Task</th><th>Description</th><th>Due</th><th>Done by</th></tr></thead><tbody>{tasks.map(t=><tr key={t.id}><td style={{fontWeight:500}}>{t.title}</td><td className="muted">{t.description||"—"}</td><td>{t.due_date||"—"}</td><td>{t.completed_count} students</td></tr>)}{tasks.length===0&&<tr><td colSpan={4} className="empty">{batch?"No tasks":"Select batch"}</td></tr>}</tbody></table></div>
  </div>);
}

/* ─── Timetable ─── */
const TT_DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const TT_PALETTE=[[PL,P],[GL,G],[AL,A],["#FEF2F2",R],["#F5F3FF","#7C3AED"],["#ECFEFF","#0891B2"]];
const ttColor=s=>TT_PALETTE[[...(s||"x")].reduce((a,c)=>a+c.charCodeAt(0),0)%TT_PALETTE.length];
const ttFmt=t=>(t||"").slice(0,5);
function Timetable({inst}){
  const blank={id:null,day_of_week:0,start_time:"09:00",end_time:"10:00",subject:"",room:""};
  const[batches,sB]=useState([]);const[batch,sBA]=useState("");const[slots,sSl]=useState([]);
  const[show,sS]=useState(false);const[f,sF]=useState(blank);
  useEffect(()=>{if(inst)GET(`/batches/${inst.id}`).then(sB).catch(()=>{});},[inst]);
  const ld=useCallback(async()=>{if(batch){const r=await GET(`/timetable/batch/${batch}`).catch(()=>({flat:[]}));sSl(r.flat||[]);}else sSl([]);},[batch]);
  useEffect(()=>{ld();},[ld]);
  const openNew=d=>{sF({...blank,day_of_week:d??0});sS(true);};
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
  return(<div><div className="fx" style={{justifyContent:"space-between",marginBottom:16}}><h1 className="h1">Timetable</h1>
    <div className="fx"><select className="sel" value={batch} onChange={e=>sBA(e.target.value)}><option value="">Select batch</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>{batch&&<button className="btn bp" onClick={()=>openNew(0)}>+ Add slot</button>}</div></div>
    {show&&batch&&<div className="card" style={{marginBottom:16}}><h3 className="h2">{f.id?"Edit slot":"New slot"}</h3>
      <div className="g4" style={{marginBottom:10}}>
        <div className="field"><label>Day</label><select className="sel" style={{width:"100%"}} value={f.day_of_week} onChange={e=>sF({...f,day_of_week:e.target.value})}>{TT_DAYS.map((d,i)=><option key={d} value={i}>{d}</option>)}</select></div>
        <div className="field"><label>Start</label><input type="time" className="inp" value={f.start_time} onChange={e=>sF({...f,start_time:e.target.value})}/></div>
        <div className="field"><label>End</label><input type="time" className="inp" value={f.end_time} onChange={e=>sF({...f,end_time:e.target.value})}/></div>
        <div className="field"><label>Room</label><input className="inp" value={f.room} onChange={e=>sF({...f,room:e.target.value})}/></div>
      </div>
      <div className="field"><label>Subject</label><input className="inp" value={f.subject} onChange={e=>sF({...f,subject:e.target.value})} placeholder="e.g. Physics"/></div>
      <div className="fx"><button className="btn bp" onClick={save}>{f.id?"Update":"Add"}</button><button className="btn bs" onClick={()=>{sS(false);sF(blank);}}>Cancel</button></div>
    </div>}
    {!batch&&<div className="card"><p className="empty">Select a batch to view its weekly timetable</p></div>}
    {batch&&<div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(150px,1fr))",gap:10,overflowX:"auto",paddingBottom:6}}>
      {TT_DAYS.map((d,i)=><div key={d} style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:12,padding:12,minHeight:160}}>
        <div className="fx" style={{justifyContent:"space-between",marginBottom:10}}><span style={{fontWeight:700,fontFamily:"'DM Sans'",fontSize:13}}>{d}</span><button className="sb-item" style={{width:"auto",padding:"2px 8px",fontSize:16,color:P}} onClick={()=>openNew(i)} title="Add slot">+</button></div>
        {byDay(i).map(s=>{const[bg,fg]=ttColor(s.subject);return(<div key={s.id} onClick={()=>openEdit(s)} style={{background:bg,borderLeft:`3px solid ${fg}`,borderRadius:8,padding:"8px 10px",marginBottom:8,cursor:"pointer"}}>
          <div className="fx" style={{justifyContent:"space-between",alignItems:"flex-start"}}><span style={{fontSize:11,fontWeight:600,color:fg}}>{ttFmt(s.start_time)}–{ttFmt(s.end_time)}</span><span onClick={e=>del(e,s.id)} style={{fontSize:13,color:"#9CA3AF",cursor:"pointer",lineHeight:1}} title="Delete">×</span></div>
          <div style={{fontSize:13,fontWeight:600,marginTop:2}}>{s.subject}</div>
          {(s.room||s.teacher_name)&&<div className="muted" style={{fontSize:11,marginTop:2}}>{[s.room,s.teacher_name].filter(Boolean).join(" · ")}</div>}
        </div>);})}
        {byDay(i).length===0&&<div className="muted" style={{fontSize:12,textAlign:"center",padding:"14px 0",color:"#C4C4C4"}}>—</div>}
      </div>)}
    </div>}
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
    <div className="card"><h3 className="h2">Dispatch log</h3><table className="tbl"><thead><tr><th>When</th><th>Channel</th><th>Type</th><th>To</th><th>Status</th></tr></thead><tbody>{log.map(n=>{const[bg,fg]=catColor[n.category]||catColor.custom;return(<tr key={n.id}><td className="muted" style={{fontSize:12}}>{new Date(n.created_at).toLocaleString()}</td><td style={{textTransform:"uppercase",fontSize:11,fontWeight:600}}>{n.channel}</td><td><Bd bg={bg} fg={fg}>{(n.category||"").replace("_"," ")}</Bd></td><td>{n.recipient_phone}</td><td><Bd bg={n.status==="sent"?GL:n.status==="failed"?RL:AL} fg={n.status==="sent"?G:n.status==="failed"?R:A}>{n.status}</Bd></td></tr>);})}{log.length===0&&<tr><td colSpan={5} className="empty">No messages sent yet</td></tr>}</tbody></table></div>
  </div>);
}

/* ─── Announcements ─── */
function Announcements({inst}){const[items,sI]=useState([]);const[show,sS]=useState(false);const[batches,sB]=useState([]);
  const[f,sF]=useState({title:"",body:"",batch_id:"",audience:"all"});const[ok,sO]=useState("");
  const ld=useCallback(async()=>{if(inst)sI(await GET(`/announcements/institute/${inst.id}`).catch(()=>[])); },[inst]);
  useEffect(()=>{ld();if(inst)GET(`/batches/${inst.id}`).then(sB).catch(()=>{});},[ld,inst]);
  const send=async()=>{sO("");try{const r=await POST("/announcements",{institute_id:inst.id,...f,batch_id:f.batch_id||null});sO(`Sent to ${r.recipient_students} students`);sF({title:"",body:"",batch_id:"",audience:"all"});sS(false);ld();}catch{}};
  return(<div><div className="fx" style={{justifyContent:"space-between",marginBottom:16}}><h1 className="h1">Announcements</h1><button className="btn bp" onClick={()=>sS(!show)}>+ Broadcast</button></div>
    {show&&<div className="card" style={{marginBottom:16}}><div className="g3" style={{marginBottom:10}}><div className="field"><label>Title</label><input className="inp" value={f.title} onChange={e=>sF({...f,title:e.target.value})}/></div><div className="field"><label>Batch</label><select className="sel" style={{width:"100%"}} value={f.batch_id} onChange={e=>sF({...f,batch_id:e.target.value})}><option value="">All</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div><div className="field"><label>Audience</label><select className="sel" style={{width:"100%"}} value={f.audience} onChange={e=>sF({...f,audience:e.target.value})}><option value="all">Everyone</option><option value="students">Students</option><option value="parents">Parents</option></select></div></div><div className="field"><label>Message</label><textarea className="inp" style={{minHeight:60}} value={f.body} onChange={e=>sF({...f,body:e.target.value})}/></div><div className="fx"><button className="btn bp" onClick={send}>Send</button><button className="btn bs" onClick={()=>sS(false)}>Cancel</button></div></div>}
    {ok&&<div className="ok">{ok}</div>}
    <div className="card">{items.map((a,i)=><div key={a.id} style={{padding:"14px 0",borderBottom:i<items.length-1?"1px solid #F3F4F6":"none"}}><div className="fx" style={{justifyContent:"space-between",marginBottom:4}}><span style={{fontWeight:500,fontSize:14}}>{a.title}</span><div className="fx"><Bd bg="#F3F4F6" fg="#6B7280">{a.batch_name||"All"}</Bd><Bd bg="#F3F4F6" fg="#6B7280">{a.audience}</Bd></div></div><p style={{fontSize:13,color:"#6B7280"}}>{a.body}</p></div>)}{items.length===0&&<p className="empty">No announcements</p>}</div>
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
  return(<div><div className="fx" style={{justifyContent:"space-between",marginBottom:16}}><div><h1 className="h1">Study material</h1><p className="muted">{items.length} item(s) — notes, PDFs, videos & links for students</p></div><button className="btn bp" onClick={()=>sS(!show)}>+ Add material</button></div>
    {show&&<div className="card" style={{marginBottom:16}}><h3 className="h2">New material</h3>
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
      <p className="muted" style={{fontSize:11,marginTop:10}}>Tip: host the file on Drive, YouTube, Cloudinary or your site, then paste the share link here.</p>
    </div>}
    <div className="card"><table className="tbl"><thead><tr><th>Title</th><th>Type</th><th>Subject</th><th>Batch</th><th>Link</th><th></th></tr></thead><tbody>
      {items.map(m=><tr key={m.id}><td style={{fontWeight:500}}>{m.title}{m.description&&<div className="muted" style={{fontSize:11}}>{m.description}</div>}</td><td><Bd bg="#F3F4F6" fg="#6B7280">{m.kind}</Bd></td><td>{m.subject||"—"}</td><td>{m.batch_name||"All"}</td><td><a href={m.url} target="_blank" rel="noopener noreferrer" style={{color:P,fontSize:12,fontWeight:600}}>Open ↗</a></td><td><button className="btn bd bsm" onClick={()=>del(m.id)}>Del</button></td></tr>)}
      {items.length===0&&<tr><td colSpan={6} className="empty">No material yet</td></tr>}
    </tbody></table></div>
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
  return(<div><h1 className="h1" style={{marginBottom:4}}>Auto reports</h1><p className="muted" style={{marginBottom:20}}>Auto-compile each student's attendance + test performance and send on a schedule</p>
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
    <div className="card"><h3 className="h2">Active schedules</h3><table className="tbl"><thead><tr><th>Frequency</th><th>Channel</th><th>Audience</th><th>Next run</th><th>Status</th><th></th></tr></thead><tbody>
      {jobs.map(j=><tr key={j.id}><td style={{fontWeight:500,textTransform:"capitalize"}}>{j.cadence}</td><td style={{textTransform:"uppercase",fontSize:11,fontWeight:600}}>{j.channel}</td><td>{audLabel[j.audience]||j.audience}</td><td className="muted" style={{fontSize:12}}>{j.next_run_at?new Date(j.next_run_at).toLocaleDateString():"—"}</td><td><Bd bg={j.is_active?GL:"#F3F4F6"} fg={j.is_active?G:"#6B7280"}>{j.is_active?"Active":"Paused"}</Bd></td>
        <td><div className="fx"><button className="btn bs bsm" onClick={()=>toggle(j)}>{j.is_active?"Pause":"Resume"}</button><button className="btn bd bsm" onClick={()=>del(j.id)}>Del</button></div></td></tr>)}
      {jobs.length===0&&<tr><td colSpan={6} className="empty">No schedules yet</td></tr>}
    </tbody></table></div>
  </div>);
}

/* ─── Reports ─── */
function Reports({inst}){const[batches,sB]=useState([]);const[batch,sBA]=useState("");const[rep,sR]=useState(null);const[sr,sSR]=useState(null);
  useEffect(()=>{if(inst)GET(`/batches/${inst.id}`).then(sB).catch(()=>{});},[inst]);
  useEffect(()=>{if(batch)GET(`/dashboard/report/batch/${batch}`).then(sR).catch(()=>sR(null));else sR(null);},[batch]);
  const viewS=async sid=>{sSR(await GET(`/dashboard/report/student/${sid}`).catch(()=>null));};
  return(<div><div className="fx" style={{justifyContent:"space-between",marginBottom:16}}><h1 className="h1">Reports</h1><select className="sel" value={batch} onChange={e=>{sBA(e.target.value);sSR(null);}}><option value="">Select batch</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
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
    {!rep&&!batch&&<div className="card"><p className="empty">Select a batch</p></div>}
  </div>);
}
