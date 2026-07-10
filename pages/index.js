import { useState, useMemo } from "react";

const ASSIGNED_BY = ["Lara", "Zin Zin", "Aisyah", "Toni", "Swapna", "Olive"];
const CATEGORIES = ["Active", "Pending Feedback", "Waiting Internal", "Waiting for Client"];
const MANAGER_PASSWORD = "Vdw@2026";
const CAT_COLORS = { "Active":"#1a7a4a","Pending Feedback":"#b85c00","Waiting Internal":"#1a5ca8","Waiting for Client":"#7a1a8a" };
const KNOWN_NAMES = ["Toni","Swapna","Kathleen","Laylan","Nuraisyah","Eloissa","Brian","Zin Zin"];

const todayStr = () => new Date().toLocaleDateString("en-GB");
const nowTime = () => new Date().toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });
const emptyTask = () => ({ name:"", category:"Active", phase:"", pct:"", assignedBy:"", remarks:"" });

const badge = (cat) => ({ display:"inline-block", padding:"2px 8px", borderRadius:10, fontSize:11, fontWeight:700,
  background:(CAT_COLORS[cat]||"#555")+"22", color:CAT_COLORS[cat]||"#555" });

function Spinner() {
  return <div style={{ display:"inline-block", width:14, height:14, border:"2px solid #fff", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite", verticalAlign:"middle", marginRight:6 }} />;
}

const s = {
  wrap: { fontFamily:"'Segoe UI',sans-serif", minHeight:"100vh", background:"#f4f6fb", paddingBottom:40 },
  header: { background:"#1a3a5c", color:"#fff", padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" },
  logo: { fontSize:18, fontWeight:700 },
  card: { background:"#fff", borderRadius:12, boxShadow:"0 2px 12px #0001", padding:"22px 24px", margin:"16px 24px" },
  label: { fontSize:13, fontWeight:600, color:"#444", marginBottom:4, display:"block" },
  input: { width:"100%", padding:"8px 11px", borderRadius:7, border:"1.5px solid #dde", fontSize:14, outline:"none", boxSizing:"border-box" },
  select: { width:"100%", padding:"8px 11px", borderRadius:7, border:"1.5px solid #dde", fontSize:14, background:"#fff", boxSizing:"border-box" },
  btn: (c) => ({ padding:"9px 20px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:700, fontSize:14, background:c||"#1a3a5c", color:"#fff" }),
  taskRow: { background:"#f8f9fd", borderRadius:9, padding:"14px 16px", marginBottom:12, border:"1px solid #e8eaf0" },
  timebtn: { padding:"7px 12px", borderRadius:7, border:"1.5px solid #1a3a5c", background:"#fff", color:"#1a3a5c", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" },
  pill: { padding:"6px 16px", borderRadius:20, border:"none", cursor:"pointer", fontWeight:600, fontSize:13, background:"rgba(255,255,255,0.2)", color:"#fff" },
  tab: (a) => ({ padding:"10px 18px", border:"none", cursor:"pointer", fontWeight:700, fontSize:13, background:"none",
    color:a?"#1a3a5c":"#888", borderBottom:a?"3px solid #1a3a5c":"3px solid transparent", marginBottom:-2 }),
  th: { padding:"8px 12px", textAlign:"left", fontWeight:600, color:"#444", fontSize:12, borderBottom:"1.5px solid #e0e4f0", background:"#f8f9fd" },
  td: { padding:"8px 12px", fontSize:13, borderBottom:"1px solid #f0f2f8" },
  statCard: (c) => ({ background:c||"#1a3a5c", borderRadius:12, padding:"16px 20px", color:"#fff", flex:1, minWidth:120 }),
};

export default function App() {
  const [view, setView] = useState("choose");
  const [name, setName] = useState("");
  const [date] = useState(todayStr());
  const [timeIn, setTimeIn] = useState("");
  const [tasks, setTasks] = useState([emptyTask()]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [eodName, setEodName] = useState("");
  const [eodFound, setEodFound] = useState(null);
  const [eodTimeOut, setEodTimeOut] = useState("");
  const [eodTasks, setEodTasks] = useState([]);
  const [eodNewTasks, setEodNewTasks] = useState([]);
  const [eodSaving, setEodSaving] = useState(false);
  const [eodSaved, setEodSaved] = useState(false);
  const [eodError, setEodError] = useState("");
  const [eodSearching, setEodSearching] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterDate, setFilterDate] = useState(todayStr());
  const [managerUnlocked, setManagerUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState("");
  const [mgrError, setMgrError] = useState("");
  const [rptTab, setRptTab] = useState("daily");
  const [rptRows, setRptRows] = useState([]);
  const [rptLoading, setRptLoading] = useState(false);
  const [rptDate, setRptDate] = useState(todayStr());
  const [attendance, setAttendance] = useState({});
  const [knownStaff, setKnownStaff] = useState([]);
  const [cutoff, setCutoff] = useState("10:30");

  const addTask = () => setTasks(t => [...t, emptyTask()]);
  const removeTask = i => setTasks(t => t.filter((_, idx) => idx !== i));
  const updateTask = (i, f, v) => setTasks(t => t.map((r, idx) => idx === i ? { ...r, [f]: v } : r));
  const updateEodTask = (i, f, v) => setEodTasks(t => t.map((r, idx) => idx === i ? { ...r, [f]: v } : r));
  const updateEodNewTask = (i, f, v) => setEodNewTasks(t => t.map((r, idx) => idx === i ? { ...r, [f]: v } : r));
  const removeEodNewTask = i => setEodNewTasks(t => t.filter((_, idx) => idx !== i));

  const checkPassword = () => {
    if (pwInput === MANAGER_PASSWORD) { setManagerUnlocked(true); setPwError(""); setPwInput(""); setView("manager"); loadEntries(); }
    else setPwError("Incorrect password.");
  };

  const handleMorningSubmit = async () => {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!timeIn) { setError("Please log your time in."); return; }
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/submit", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name:name.trim(), date, timeIn, timeOut:"", tasks }) });
      if (!res.ok) throw new Error();
      setSaved(true);
    } catch { setError("Could not save. Please try again."); }
    setSaving(false);
  };

  const handleEodLookup = async () => {
    if (!eodName.trim()) { setEodError("Please enter your name."); return; }
    setEodError(""); setEodSearching(true); setEodFound(null);
    try {
      const res = await fetch(`/api/entries?date=${encodeURIComponent(todayStr())}`);
      const data = await res.json();
      const match = (data.entries||[]).find(e => e.name.toLowerCase() === eodName.trim().toLowerCase());
      if (match) { setEodFound(match); setEodTasks(match.tasks.map(t=>({...t}))); setEodTimeOut(match.timeOut||""); setEodNewTasks([]); }
      else setEodError("No morning log found. Check your name or submit a morning log first.");
    } catch { setEodError("Could not find your log. Please try again."); }
    setEodSearching(false);
  };

  const handleEodSubmit = async () => {
    if (!eodTimeOut) { setEodError("Please enter your time out."); return; }
    setEodError(""); setEodSaving(true);
    try {
      const res = await fetch("/api/update", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name:eodFound.name, date:todayStr(), timeOut:eodTimeOut, tasks:eodTasks, newTasks:eodNewTasks }) });
      if (!res.ok) throw new Error();
      setEodSaved(true);
    } catch { setEodError("Could not save. Please try again."); }
    setEodSaving(false);
  };

  const loadEntries = async () => {
    setLoading(true); setMgrError("");
    try {
      const res = await fetch(`/api/entries?date=${encodeURIComponent(filterDate)}`);
      const data = await res.json();
      setEntries(data.entries||[]);
    } catch { setMgrError("Could not load entries."); }
    setLoading(false);
  };

  const loadReports = async () => {
    setRptLoading(true);
    try {
      const res = await fetch("/api/reports");
      const data = await res.json();
      setRptRows(data.rows||[]);
      setAttendance(data.attendance||{});
      setKnownStaff(data.knownStaff||[]);
      setCutoff(data.cutoff||"10:30");
    } catch {}
    setRptLoading(false);
  };

  const rptDates = useMemo(() => [...new Set(rptRows.map(r=>r.date))].sort((a,b)=>{
    const p = d => { const [dd,mm,yy]=d.split("/"); return new Date(`${yy}-${mm}-${dd}`); };
    return p(a)-p(b);
  }), [rptRows]);

  const byPerson = useMemo(() => {
    const m = {};
    for (const r of rptRows) {
      if (!m[r.name]) m[r.name] = { name:r.name, tasks:[], days:new Set() };
      m[r.name].tasks.push(r); m[r.name].days.add(r.date);
    }
    return Object.values(m).sort((a,b)=>b.tasks.length-a.tasks.length);
  }, [rptRows]);

  const catCounts = useMemo(() => rptRows.reduce((m,r)=>{ m[r.category]=(m[r.category]||0)+1; return m; }, {}), [rptRows]);
  const stuckTasks = useMemo(() => rptRows.filter(r=>r.pct===0&&r.taskName), [rptRows]);
  const pendingFeedback = useMemo(() => rptRows.filter(r=>r.category==="Pending Feedback"&&r.taskName), [rptRows]);

  if (view === "choose") return (
    <div style={s.wrap}>
      <div style={s.header}><span style={s.logo}>📋 Team Daily Log</span></div>
      <div style={{ ...s.card, textAlign:"center", paddingTop:44, paddingBottom:44 }}>
        <div style={{ fontSize:22, fontWeight:700, color:"#1a3a5c", marginBottom:8 }}>Welcome</div>
        <div style={{ color:"#666", marginBottom:32 }}>What would you like to do?</div>
        <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
          <button style={{ ...s.btn(), padding:"14px 24px", fontSize:15 }} onClick={() => setView("morning")}>🌅 Morning Log</button>
          <button style={{ ...s.btn("#e67e22"), padding:"14px 24px", fontSize:15 }} onClick={() => setView("eod")}>🌆 End of Day Update</button>
          <button style={{ ...s.btn("#2e7d52"), padding:"14px 24px", fontSize:15 }} onClick={() => setView("managerLogin")}>📊 Manager View</button>
        </div>
        <div style={{ marginTop:24, fontSize:12, color:"#aaa" }}>Morning Log: submit at start of day | End of Day: update time out and task progress</div>
      </div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  if (view === "morning") return (
    <div style={s.wrap}>
      <div style={s.header}><span style={s.logo}>🌅 Morning Log</span><button style={s.pill} onClick={() => setView("choose")}>← Back</button></div>
      {saved ? (
        <div style={{ ...s.card, textAlign:"center", padding:"48px 24px" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
          <div style={{ fontSize:20, fontWeight:700, color:"#1a7a4a" }}>Morning log submitted!</div>
          <div style={{ color:"#666", marginTop:8 }}>Come back at end of day to update your time out and task progress.</div>
          <button style={{ ...s.btn(), marginTop:24 }} onClick={() => { setSaved(false); setName(""); setTimeIn(""); setTasks([emptyTask()]); }}>Submit Another</button>
        </div>
      ) : (
        <div style={s.card}>
          <div style={{ fontSize:17, fontWeight:700, color:"#1a3a5c", marginBottom:4 }}>Morning Log — {date}</div>
          <div style={{ fontSize:12, color:"#aaa", marginBottom:18 }}>Fill this in when you start your day</div>
          {error && <div style={{ background:"#fff0f0", color:"#c0392b", borderRadius:7, padding:"9px 14px", marginBottom:14, fontSize:13 }}>{error}</div>}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }}>
            <div><label style={s.label}>Your Name *</label><input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Type your name" /></div>
            <div><label style={s.label}>Date</label><input style={{ ...s.input, background:"#f4f6fb" }} value={date} readOnly /></div>
            <div style={{ gridColumn:"1 / -1" }}>
              <label style={s.label}>Time In *</label>
              <div style={{ display:"flex", gap:8 }}>
                <input style={{ ...s.input, flex:1 }} value={timeIn} onChange={e => setTimeIn(e.target.value)} placeholder="e.g. 09:00" />
                <button style={s.timebtn} onClick={() => setTimeIn(nowTime())}>Now</button>
              </div>
            </div>
          </div>
          <div style={{ fontSize:15, fontWeight:700, color:"#1a3a5c", marginBottom:12 }}>Tasks for Today</div>
          {tasks.map((t, i) => (
            <div key={i} style={s.taskRow}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ fontWeight:600, fontSize:13, color:"#888" }}>Task {i+1}</span>
                {tasks.length > 1 && <button onClick={() => removeTask(i)} style={{ background:"none", border:"none", color:"#c0392b", cursor:"pointer", fontSize:18 }}>×</button>}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:10, marginBottom:10 }}>
                <div><label style={s.label}>Task Name</label><input style={s.input} value={t.name} onChange={e => updateTask(i,"name",e.target.value)} placeholder="Type task name" /></div>
                <div><label style={s.label}>Category</label><select style={s.select} value={t.category} onChange={e => updateTask(i,"category",e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10 }}>
                <div><label style={s.label}>Phase</label><input style={s.input} value={t.phase} onChange={e => updateTask(i,"phase",e.target.value)} placeholder="Alpha, Beta, STB..." /></div>
                <div><label style={s.label}>Completion %</label><input style={s.input} type="number" min="0" max="100" value={t.pct} onChange={e => updateTask(i,"pct",e.target.value)} placeholder="0-100" /></div>
                <div><label style={s.label}>Assigned By</label><select style={s.select} value={t.assignedBy} onChange={e => updateTask(i,"assignedBy",e.target.value)}><option value="">Select</option>{ASSIGNED_BY.map(a=><option key={a}>{a}</option>)}</select></div>
              </div>
              <div><label style={s.label}>Remarks</label><input style={s.input} value={t.remarks} onChange={e => updateTask(i,"remarks",e.target.value)} placeholder="Notes, milestones, blockers..." /></div>
            </div>
          ))}
          <button style={{ ...s.btn("#4a90d9"), marginBottom:16, width:"100%" }} onClick={addTask}>+ Add Task</button>
          <button style={{ ...s.btn(), width:"100%", padding:"12px", fontSize:15 }} onClick={handleMorningSubmit} disabled={saving}>
            {saving ? <><Spinner />Saving...</> : "Submit Morning Log"}
          </button>
        </div>
      )}
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  if (view === "eod") return (
    <div style={s.wrap}>
      <div style={s.header}><span style={s.logo}>🌆 End of Day Update</span><button style={s.pill} onClick={() => { setView("choose"); setEodFound(null); setEodName(""); setEodError(""); setEodSaved(false); setEodNewTasks([]); }}>← Back</button></div>
      {eodSaved ? (
        <div style={{ ...s.card, textAlign:"center", padding:"48px 24px" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
          <div style={{ fontSize:20, fontWeight:700, color:"#1a7a4a" }}>End of day updated!</div>
          <div style={{ color:"#666", marginTop:8 }}>Your time out and task progress have been saved. See you tomorrow!</div>
        </div>
      ) : !eodFound ? (
        <div style={s.card}>
          <div style={{ fontSize:17, fontWeight:700, color:"#1a3a5c", marginBottom:4 }}>End of Day Update — {todayStr()}</div>
          <div style={{ fontSize:12, color:"#aaa", marginBottom:18 }}>We'll find your morning log and let you update it</div>
          {eodError && <div style={{ background:"#fff0f0", color:"#c0392b", borderRadius:7, padding:"9px 14px", marginBottom:14, fontSize:13 }}>{eodError}</div>}
          <label style={s.label}>Your Name</label>
          <div style={{ display:"flex", gap:8 }}>
            <input style={{ ...s.input, flex:1 }} value={eodName} onChange={e => setEodName(e.target.value)} placeholder="Type your name exactly as used this morning" onKeyDown={e => e.key==="Enter"&&handleEodLookup()} />
            <button style={{ ...s.btn(), whiteSpace:"nowrap" }} onClick={handleEodLookup} disabled={eodSearching}>{eodSearching ? <><Spinner />Searching...</> : "Find My Log"}</button>
          </div>
        </div>
      ) : (
        <div style={s.card}>
          <div style={{ fontSize:17, fontWeight:700, color:"#1a3a5c", marginBottom:4 }}>Update Log — {eodFound.name}</div>
          <div style={{ fontSize:12, color:"#aaa", marginBottom:18 }}>Time in: <b>{eodFound.timeIn}</b> — add your time out and update task progress</div>
          {eodError && <div style={{ background:"#fff0f0", color:"#c0392b", borderRadius:7, padding:"9px 14px", marginBottom:14, fontSize:13 }}>{eodError}</div>}
          <div style={{ marginBottom:20 }}>
            <label style={s.label}>Time Out *</label>
            <div style={{ display:"flex", gap:8 }}>
              <input style={{ ...s.input, flex:1 }} value={eodTimeOut} onChange={e => setEodTimeOut(e.target.value)} placeholder="e.g. 18:00" />
              <button style={s.timebtn} onClick={() => setEodTimeOut(nowTime())}>Now</button>
            </div>
          </div>
          <div style={{ fontSize:15, fontWeight:700, color:"#1a3a5c", marginBottom:4 }}>Update Existing Tasks</div>
          <div style={{ fontSize:12, color:"#aaa", marginBottom:12 }}>Update progress on tasks you logged this morning</div>
          {eodTasks.map((t, i) => (
            <div key={i} style={s.taskRow}>
              <div style={{ fontWeight:600, fontSize:14, color:"#1a3a5c", marginBottom:10 }}>{t.name||`Task ${i+1}`} <span style={badge(t.category)}>{t.category}</span></div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                <div><label style={s.label}>Completion %</label><input style={s.input} type="number" min="0" max="100" value={t.pct} onChange={e => updateEodTask(i,"pct",e.target.value)} placeholder="0-100" /></div>
                <div><label style={s.label}>Category (update if changed)</label><select style={s.select} value={t.category} onChange={e => updateEodTask(i,"category",e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
              </div>
              <div><label style={s.label}>End of Day Remarks</label><input style={s.input} value={t.remarks} onChange={e => updateEodTask(i,"remarks",e.target.value)} placeholder="Progress update, blockers, next steps..." /></div>
            </div>
          ))}
          <div style={{ fontSize:15, fontWeight:700, color:"#1a3a5c", marginBottom:4, marginTop:24 }}>Additional Tasks</div>
          <div style={{ fontSize:12, color:"#aaa", marginBottom:12 }}>Add any new tasks that came up during the day</div>
          {eodNewTasks.map((t, i) => (
            <div key={i} style={{ ...s.taskRow, border:"1.5px dashed #c0d0e8" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ fontWeight:600, fontSize:13, color:"#888" }}>New Task {i+1}</span>
                <button onClick={() => removeEodNewTask(i)} style={{ background:"none", border:"none", color:"#c0392b", cursor:"pointer", fontSize:18 }}>×</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:10, marginBottom:10 }}>
                <div><label style={s.label}>Task Name</label><input style={s.input} value={t.name} onChange={e => updateEodNewTask(i,"name",e.target.value)} placeholder="Type task name" /></div>
                <div><label style={s.label}>Category</label><select style={s.select} value={t.category} onChange={e => updateEodNewTask(i,"category",e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10 }}>
                <div><label style={s.label}>Phase</label><input style={s.input} value={t.phase} onChange={e => updateEodNewTask(i,"phase",e.target.value)} placeholder="Alpha, Beta, STB..." /></div>
                <div><label style={s.label}>Completion %</label><input style={s.input} type="number" min="0" max="100" value={t.pct} onChange={e => updateEodNewTask(i,"pct",e.target.value)} placeholder="0-100" /></div>
                <div><label style={s.label}>Assigned By</label><select style={s.select} value={t.assignedBy} onChange={e => updateEodNewTask(i,"assignedBy",e.target.value)}><option value="">Select</option>{ASSIGNED_BY.map(a=><option key={a}>{a}</option>)}</select></div>
              </div>
              <div><label style={s.label}>Remarks</label><input style={s.input} value={t.remarks} onChange={e => updateEodNewTask(i,"remarks",e.target.value)} placeholder="Notes, progress, blockers..." /></div>
            </div>
          ))}
          <button style={{ ...s.btn("#4a90d9"), marginBottom:16, width:"100%" }} onClick={() => setEodNewTasks(t=>[...t, emptyTask()])}>+ Add New Task</button>
          <button style={{ ...s.btn(), width:"100%", padding:"12px", fontSize:15 }} onClick={handleEodSubmit} disabled={eodSaving}>{eodSaving ? <><Spinner />Saving...</> : "Save End of Day Update"}</button>
        </div>
      )}
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  if (view === "managerLogin") return (
    <div style={s.wrap}>
      <div style={s.header}><span style={s.logo}>Manager Dashboard</span><button style={s.pill} onClick={() => { setView("choose"); setPwInput(""); setPwError(""); }}>← Back</button></div>
      <div style={{ ...s.card, maxWidth:420, textAlign:"center", paddingTop:40, paddingBottom:40 }}>
        <div style={{ fontSize:18, fontWeight:700, color:"#1a3a5c", marginBottom:8 }}>Manager Access</div>
        <div style={{ color:"#666", marginBottom:20, fontSize:13 }}>Enter the password to view the dashboard.</div>
        {pwError && <div style={{ background:"#fff0f0", color:"#c0392b", borderRadius:7, padding:"9px 14px", marginBottom:14, fontSize:13 }}>{pwError}</div>}
        <input style={{ ...s.input, marginBottom:16, textAlign:"center" }} type="password" value={pwInput} onChange={e => setPwInput(e.target.value)} onKeyDown={e => e.key==="Enter"&&checkPassword()} placeholder="Password" autoFocus />
        <button style={{ ...s.btn("#2e7d52"), width:"100%", padding:"12px" }} onClick={checkPassword}>Unlock</button>
      </div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.logo}>📊 Manager Dashboard</span>
        <button style={s.pill} onClick={() => { setView("choose"); setManagerUnlocked(false); }}>← Back</button>
      </div>
      <div style={{ display:"flex", gap:4, padding:"0 24px", borderBottom:"2px solid #e0e4f0", background:"#fff" }}>
        {[["daily","📅 Daily View"],["reports","📈 Reports"]].map(([id,label]) => (
          <button key={id} style={s.tab(rptTab===id)} onClick={() => { setRptTab(id); if(id==="reports"&&rptRows.length===0) loadReports(); }}>{label}</button>
        ))}
      </div>

      {rptTab === "daily" && (
        <>
          <div style={{ padding:"16px 24px 0", display:"flex", gap:12, alignItems:"flex-end", flexWrap:"wrap" }}>
            <div><label style={s.label}>Date (DD/MM/YYYY)</label><input style={{ ...s.input, width:160 }} value={filterDate} onChange={e => setFilterDate(e.target.value)} /></div>
            <button style={s.btn()} onClick={loadEntries}>{loading ? <><Spinner />Loading...</> : "Load"}</button>
            <a href="https://docs.google.com/spreadsheets/d/1OsR0vTeC0pozVXuZjNY_2DJ8Z-wE9xs6XS1X2c3nDjU" target="_blank" rel="noreferrer" style={{ ...s.btn("#34a853"), textDecoration:"none", display:"inline-flex", alignItems:"center" }}>📊 Open Sheet</a>
          </div>
          {mgrError && <div style={{ ...s.card, background:"#fff0f0", color:"#c0392b" }}>{mgrError}</div>}
          {!loading && entries.length === 0 && <div style={{ ...s.card, color:"#999", textAlign:"center", padding:"40px" }}>No entries found for {filterDate}.</div>}
          {entries.map((e, i) => (
            <div key={i} style={s.card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <span style={{ fontSize:16, fontWeight:700, color:"#1a3a5c" }}>{e.name}</span>
                <span style={{ fontSize:13, color:"#666", background:"#f0f4fa", borderRadius:8, padding:"4px 12px" }}>🕐 In: <b>{e.timeIn||"—"}</b> &nbsp;|&nbsp; Out: <b>{e.timeOut||"—"}</b></span>
              </div>
              {e.tasks.length > 0 ? (
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead><tr>{["#","Task","Category","Phase","%","Assigned By","Remarks"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>{e.tasks.map((t,j)=>(
                    <tr key={j}>
                      <td style={s.td}>{j+1}</td>
                      <td style={{ ...s.td, fontWeight:500 }}>{t.name||"—"}</td>
                      <td style={s.td}><span style={badge(t.category)}>{t.category||"—"}</span></td>
                      <td style={{ ...s.td, color:"#555" }}>{t.phase||"—"}</td>
                      <td style={{ ...s.td, fontWeight:700, color:t.pct>=100?"#1a7a4a":t.pct>0?"#b85c00":"#aaa" }}>{t.pct!==""?t.pct+"%":"—"}</td>
                      <td style={s.td}>{t.assignedBy||"—"}</td>
                      <td style={{ ...s.td, color:"#666", fontSize:12 }}>{t.remarks||"—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              ) : <div style={{ color:"#bbb", fontSize:13 }}>No tasks logged.</div>}
            </div>
          ))}
        </>
      )}

      {rptTab === "reports" && (
        <>
          {rptLoading && <div style={{ ...s.card, textAlign:"center", color:"#888" }}><Spinner />Loading report data...</div>}
          {!rptLoading && rptRows.length === 0 && (
            <div style={{ ...s.card, textAlign:"center" }}>
              <button style={{ ...s.btn(), marginTop:8 }} onClick={loadReports}>Load Reports</button>
            </div>
          )}
          {rptRows.length > 0 && (
            <>
              <div style={{ display:"flex", gap:4, padding:"12px 24px 0", flexWrap:"wrap" }}>
                {[["daily","📅 Daily Health"],["workload","⚖️ Workload"],["pipeline","🔄 Pipeline"],["monthly","📈 Monthly"]].map(([id,label]) => (
                  <button key={id} style={{ padding:"8px 14px", border:"1.5px solid #dde", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:12,
                    background:rptDate===id?"#1a3a5c":"#fff", color:rptDate===id?"#fff":"#555" }}
                    onClick={() => setRptDate(id)}>{label}</button>
                ))}
                <button style={{ ...s.btn("#4a90d9"), fontSize:12, padding:"8px 14px", marginLeft:"auto" }} onClick={loadReports}>🔄 Refresh</button>
              </div>

              {rptDate === "daily" && (() => {
                const latestDate = rptDates[rptDates.length-1];
                const todayAttendance = attendance[latestDate] || [];
                const present = todayAttendance.filter(a=>a.status==="present");
                const late = todayAttendance.filter(a=>a.status==="late");
                const unaccounted = todayAttendance.filter(a=>a.status==="unaccounted");
                const todayPeople = (() => {
                  const rows = rptRows.filter(r=>r.date===latestDate);
                  const m = {};
                  for (const r of rows) {
                    if (!m[r.name]) m[r.name] = { name:r.name, timeIn:r.timeIn, timeOut:r.timeOut, tasks:[] };
                    if (r.timeOut) m[r.name].timeOut = r.timeOut;
                    if (r.taskName) m[r.name].tasks.push(r);
                  }
                  return Object.values(m);
                })();
                return (
                  <>
                    <div style={{ padding:"12px 24px 4px", fontSize:12, color:"#888" }}>Latest date: <b>{latestDate}</b> &nbsp;|&nbsp; Cutoff: <b>{cutoff} AM</b> &nbsp;|&nbsp; Tracking <b>{knownStaff.length}</b> staff</div>
                    <div style={{ display:"flex", gap:12, padding:"8px 24px 12px", flexWrap:"wrap" }}>
                      {[["#1a7a4a",present.length,"✅ On Time"],["#b85c00",late.length,"🕐 Late"],["#c0392b",unaccounted.length,"🔴 Unaccounted"],
                        ["#1a3a5c",rptRows.filter(r=>r.date===latestDate&&r.pct>=100).length,"Tasks Done"]
                      ].map(([c,n,l])=>(
                        <div key={l} style={s.statCard(c)}><div style={{ fontSize:28, fontWeight:800 }}>{n}</div><div style={{ fontSize:12, opacity:0.85 }}>{l}</div></div>
                      ))}
                    </div>
                    <div style={s.card}>
                      <div style={{ fontWeight:700, color:"#1a3a5c", marginBottom:12 }}>📋 Attendance — {latestDate}</div>
                      <table style={{ width:"100%", borderCollapse:"collapse" }}>
                        <thead><tr>{["Name","Time In","Status"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                        <tbody>
                          {todayAttendance.sort((a,b)=>{ const o={"present":0,"late":1,"unaccounted":2}; return o[a.status]-o[b.status]; }).map((a,i)=>(
                            <tr key={i}>
                              <td style={{ ...s.td, fontWeight:600 }}>{a.name}</td>
                              <td style={s.td}>{a.timeIn||"—"}</td>
                              <td style={s.td}>
                                {a.status==="present" && <span style={{ ...badge("Active"), padding:"3px 10px" }}>✅ On Time</span>}
                                {a.status==="late" && <span style={{ ...badge("Pending Feedback"), padding:"3px 10px" }}>🕐 Late (after {cutoff})</span>}
                                {a.status==="unaccounted" && <span style={{ ...badge("Waiting for Client"), padding:"3px 10px" }}>🔴 Unaccounted</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {todayPeople.map((p,i)=>(
                      <div key={i} style={s.card}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                          <span style={{ fontSize:15, fontWeight:700, color:"#1a3a5c" }}>{p.name}</span>
                          <span style={{ fontSize:12, color:"#666", background:"#f0f4fa", borderRadius:8, padding:"3px 10px" }}>🕐 In: <b>{p.timeIn||"—"}</b> | Out: <b>{p.timeOut||"—"}</b></span>
                        </div>
                        <table style={{ width:"100%", borderCollapse:"collapse" }}>
                          <thead><tr>{["Task","Cat","Phase","%","By","Remarks"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                          <tbody>{p.tasks.map((t,j)=>(
                            <tr key={j}>
                              <td style={s.td}>{t.taskName}</td>
                              <td style={s.td}><span style={badge(t.category)}>{t.category}</span></td>
                              <td style={{ ...s.td, color:"#555" }}>{t.phase||"—"}</td>
                              <td style={{ ...s.td, fontWeight:700, color:t.pct>=100?"#1a7a4a":t.pct>0?"#b85c00":"#aaa" }}>{t.pct}%</td>
                              <td style={s.td}>{t.assignedBy||"—"}</td>
                              <td style={{ ...s.td, fontSize:12, color:"#666" }}>{t.remarks||"—"}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    ))}
                  </>
                );
              })()}

              {rptDate === "workload" && (
                <>
                  <div style={s.card}>
                    <div style={{ fontWeight:700, color:"#1a3a5c", marginBottom:16 }}>Workload by Team Member</div>
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead><tr>{["Name","Days","Total Tasks","Avg/Day","Done","In Progress","Pending"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>{byPerson.map((p,i)=>{
                        const comp=p.tasks.filter(t=>t.pct>=100).length;
                        const inProg=p.tasks.filter(t=>t.pct>0&&t.pct<100).length;
                        const pend=p.tasks.filter(t=>["Pending Feedback","Waiting Internal","Waiting for Client"].includes(t.category)).length;
                        const color=p.tasks.length>15?"#c0392b":p.tasks.length>8?"#b85c00":"#1a7a4a";
                        return <tr key={i}>
                          <td style={{ ...s.td, fontWeight:600 }}>{p.name}</td>
                          <td style={s.td}>{p.days.size}</td>
                          <td style={{ ...s.td, fontWeight:700, color }}>{p.tasks.length}</td>
                          <td style={s.td}>{(p.tasks.length/p.days.size).toFixed(1)}</td>
                          <td style={{ ...s.td, color:"#1a7a4a", fontWeight:600 }}>{comp}</td>
                          <td style={{ ...s.td, color:"#b85c00", fontWeight:600 }}>{inProg}</td>
                          <td style={{ ...s.td, color:"#7a1a8a", fontWeight:600 }}>{pend}</td>
                        </tr>;
                      })}</tbody>
                    </table>
                  </div>
                  <div style={s.card}>
                    <div style={{ fontWeight:700, color:"#1a3a5c", marginBottom:16 }}>Tasks by Assigner</div>
                    {Object.entries(rptRows.reduce((m,r)=>{ const k=r.assignedBy||"Unassigned"; m[k]=(m[k]||0)+1; return m; },{}))
                      .sort((a,b)=>b[1]-a[1]).map(([k,v],i)=>(
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                        <div style={{ width:100, fontSize:13, fontWeight:600 }}>{k}</div>
                        <div style={{ flex:1, height:14, background:"#f0f2f8", borderRadius:8, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${Math.min(v*5,100)}%`, background:"#1a3a5c", borderRadius:8 }} />
                        </div>
                        <span style={{ fontSize:13, fontWeight:700, color:"#1a3a5c", width:30 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {rptDate === "pipeline" && (
                <>
                  <div style={{ display:"flex", gap:12, padding:"12px 24px", flexWrap:"wrap" }}>
                    {Object.entries(catCounts).map(([cat,count])=>(
                      <div key={cat} style={s.statCard(CAT_COLORS[cat]||"#555")}><div style={{ fontSize:28, fontWeight:800 }}>{count}</div><div style={{ fontSize:11, opacity:0.85 }}>{cat}</div></div>
                    ))}
                  </div>
                  <div style={s.card}>
                    <div style={{ fontWeight:700, color:"#b85c00", marginBottom:12 }}>⏳ Pending Feedback ({pendingFeedback.length})</div>
                    {pendingFeedback.length===0?<div style={{ color:"#aaa" }}>None</div>:
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead><tr>{["Date","Who","Task","Phase","%"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>{pendingFeedback.map((t,i)=><tr key={i}>
                        <td style={s.td}>{t.date}</td><td style={{ ...s.td, fontWeight:600 }}>{t.name}</td>
                        <td style={s.td}>{t.taskName}</td><td style={s.td}>{t.phase||"—"}</td>
                        <td style={{ ...s.td, fontWeight:700 }}>{t.pct}%</td>
                      </tr>)}</tbody>
                    </table>}
                  </div>
                  <div style={s.card}>
                    <div style={{ fontWeight:700, color:"#c0392b", marginBottom:12 }}>🔴 Tasks at 0% ({stuckTasks.length})</div>
                    {stuckTasks.length===0?<div style={{ color:"#aaa" }}>None</div>:
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead><tr>{["Date","Who","Task","Category","By"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>{stuckTasks.map((t,i)=><tr key={i}>
                        <td style={s.td}>{t.date}</td><td style={{ ...s.td, fontWeight:600 }}>{t.name}</td>
                        <td style={s.td}>{t.taskName}</td><td style={s.td}><span style={badge(t.category)}>{t.category}</span></td>
                        <td style={s.td}>{t.assignedBy||"—"}</td>
                      </tr>)}</tbody>
                    </table>}
                  </div>
                </>
              )}

              {rptDate === "monthly" && (
                <>
                  <div style={{ display:"flex", gap:12, padding:"12px 24px", flexWrap:"wrap" }}>
                    {[["#1a3a5c",rptRows.length,"Total Tasks"],["#1a7a4a",rptRows.filter(r=>r.pct>=100).length,"Completed"],
                      ["#b85c00",rptRows.filter(r=>r.pct>0&&r.pct<100).length,"In Progress"],["#c0392b",rptRows.filter(r=>r.pct===0).length,"Not Started"]
                    ].map(([c,n,l])=>(
                      <div key={l} style={s.statCard(c)}><div style={{ fontSize:28, fontWeight:800 }}>{n}</div><div style={{ fontSize:12, opacity:0.85 }}>{l}</div></div>
                    ))}
                  </div>
                  <div style={s.card}>
                    <div style={{ fontWeight:700, color:"#1a3a5c", marginBottom:16 }}>Completion Rate by Person</div>
                    {byPerson.map((p,i)=>{
                      const comp=p.tasks.filter(t=>t.pct>=100).length;
                      const rate=Math.round(comp/p.tasks.length*100);
                      const color=rate>=75?"#1a7a4a":rate>=50?"#b85c00":"#c0392b";
                      return <div key={i} style={{ marginBottom:14 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontWeight:600, fontSize:13 }}>{p.name}</span>
                          <span style={{ fontSize:12, color, fontWeight:700 }}>{comp}/{p.tasks.length} ({rate}%)</span>
                        </div>
                        <div style={{ height:10, background:"#f0f2f8", borderRadius:8, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${rate}%`, background:color, borderRadius:8 }} />
                        </div>
                      </div>;
                    })}
                  </div>
                  <div style={s.card}>
                    <div style={{ fontWeight:700, color:"#1a3a5c", marginBottom:16 }}>Submissions by Day</div>
                    {rptDates.map((d,i)=>{
                      const submitters=[...new Set(rptRows.filter(r=>r.date===d).map(r=>r.name))];
                      const tasks=rptRows.filter(r=>r.date===d).length;
                      return <div key={i} style={{ marginBottom:12, paddingBottom:12, borderBottom:"1px solid #f0f2f8" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                          <span style={{ fontWeight:600, fontSize:13 }}>{d}</span>
                          <span style={{ fontSize:12, color:"#888" }}>{submitters.length} staff · {tasks} tasks</span>
                        </div>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          {submitters.map(n=><span key={n} style={{ fontSize:11, fontWeight:600, background:"#e8eef8", color:"#1a3a5c", padding:"2px 8px", borderRadius:8 }}>{n}</span>)}
                        </div>
                      </div>;
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}
