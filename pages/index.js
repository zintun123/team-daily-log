import { useState } from "react";

const ASSIGNED_BY = ["Lara", "Zin Zin", "Aisyah", "Toni", "Swapna", "Olive"];
const CATEGORIES = ["Active", "Pending Feedback", "Waiting Internal", "Waiting for Client"];
const MANAGER_PASSWORD = "Vdw@2026";

const todayStr = () => new Date().toLocaleDateString("en-GB");
const nowTime = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const emptyTask = () => ({ name: "", category: "Active", phase: "", pct: "", assignedBy: "", remarks: "" });

function Spinner() {
  return <div style={{ display:"inline-block", width:14, height:14, border:"2px solid #fff", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite", verticalAlign:"middle", marginRight:6 }} />;
}

const s = {
  wrap: { fontFamily:"'Segoe UI',sans-serif", minHeight:"100vh", background:"#f4f6fb", paddingBottom:40 },
  header: { background:"#1a3a5c", color:"#fff", padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" },
  logo: { fontSize:18, fontWeight:700 },
  card: { background:"#fff", borderRadius:12, boxShadow:"0 2px 12px #0001", padding:"22px 24px", margin:"22px auto", maxWidth:800 },
  label: { fontSize:13, fontWeight:600, color:"#444", marginBottom:4, display:"block" },
  input: { width:"100%", padding:"8px 11px", borderRadius:7, border:"1.5px solid #dde", fontSize:14, outline:"none", boxSizing:"border-box" },
  select: { width:"100%", padding:"8px 11px", borderRadius:7, border:"1.5px solid #dde", fontSize:14, background:"#fff", boxSizing:"border-box" },
  btn: (c) => ({ padding:"9px 20px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:700, fontSize:14, background:c||"#1a3a5c", color:"#fff" }),
  taskRow: { background:"#f8f9fd", borderRadius:9, padding:"14px 16px", marginBottom:12, border:"1px solid #e8eaf0" },
  timebtn: { padding:"7px 12px", borderRadius:7, border:"1.5px solid #1a3a5c", background:"#fff", color:"#1a3a5c", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" },
  badge: (cat) => {
    const c = { "Active":"#1a7a4a","Pending Feedback":"#b85c00","Waiting Internal":"#1a5ca8","Waiting for Client":"#7a1a8a" };
    return { display:"inline-block", padding:"2px 9px", borderRadius:12, fontSize:11, fontWeight:700, background:(c[cat]||"#555")+"22", color:c[cat]||"#555" };
  },
  pill: { padding:"6px 16px", borderRadius:20, border:"none", cursor:"pointer", fontWeight:600, fontSize:13, background:"rgba(255,255,255,0.2)", color:"#fff" }
};

export default function App() {
  const [view, setView] = useState("choose");
  const [name, setName] = useState("");
  const [date] = useState(todayStr());
  const [timeIn, setTimeIn] = useState("");
  const [timeOut, setTimeOut] = useState("");
  const [tasks, setTasks] = useState([emptyTask()]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterDate, setFilterDate] = useState(todayStr());
  const [managerUnlocked, setManagerUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState("");

  const addTask = () => setTasks(t => [...t, emptyTask()]);
  const removeTask = i => setTasks(t => t.filter((_, idx) => idx !== i));
  const updateTask = (i, f, v) => setTasks(t => t.map((r, idx) => idx === i ? { ...r, [f]: v } : r));

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!timeIn) { setError("Please log your time in."); return; }
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), date, timeIn, timeOut, tasks })
      });
      if (!res.ok) throw new Error();
      setSaved(true);
    } catch {
      setError("Could not save. Please try again.");
    }
    setSaving(false);
  };

  const checkPassword = () => {
    if (pwInput === MANAGER_PASSWORD) {
      setManagerUnlocked(true);
      setPwError("");
      setPwInput("");
      setView("manager");
      loadEntries();
    } else {
      setPwError("Incorrect password.");
    }
  };

  const loadEntries = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/entries?date=${encodeURIComponent(filterDate)}`);
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      setError("Could not load entries.");
    }
    setLoading(false);
  };

  if (view === "choose") return (
    <div style={s.wrap}>
      <div style={s.header}><span style={s.logo}>Team Daily Log</span></div>
      <div style={{ ...s.card, textAlign:"center", paddingTop:44, paddingBottom:44 }}>
        <div style={{ fontSize:22, fontWeight:700, color:"#1a3a5c", marginBottom:8 }}>Welcome</div>
        <div style={{ color:"#666", marginBottom:32 }}>Logging your day or checking the team dashboard?</div>
        <div style={{ display:"flex", gap:16, justifyContent:"center", flexWrap:"wrap" }}>
          <button style={{ ...s.btn(), padding:"14px 32px", fontSize:16 }} onClick={() => setView("staff")}>Log My Day</button>
          <button style={{ ...s.btn("#2e7d52"), padding:"14px 32px", fontSize:16 }} onClick={() => setView("managerLogin")}>Manager View</button>
        </div>
      </div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  if (view === "managerLogin") return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.logo}>Manager Dashboard</span>
        <button style={s.pill} onClick={() => { setView("choose"); setPwInput(""); setPwError(""); }}>Back</button>
      </div>
      <div style={{ ...s.card, maxWidth:420, textAlign:"center", paddingTop:40, paddingBottom:40 }}>
        <div style={{ fontSize:18, fontWeight:700, color:"#1a3a5c", marginBottom:8 }}>Manager Access</div>
        <div style={{ color:"#666", marginBottom:20, fontSize:13 }}>Enter the password to view the dashboard.</div>
        {pwError && <div style={{ background:"#fff0f0", color:"#c0392b", borderRadius:7, padding:"9px 14px", marginBottom:14, fontSize:13 }}>{pwError}</div>}
        <input
          style={{ ...s.input, marginBottom:16, textAlign:"center" }}
          type="password"
          value={pwInput}
          onChange={e => setPwInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") checkPassword(); }}
          placeholder="Password"
          autoFocus
        />
        <button style={{ ...s.btn("#2e7d52"), width:"100%", padding:"12px" }} onClick={checkPassword}>Unlock</button>
      </div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  if (view === "staff") return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.logo}>Log My Day</span>
        <button style={s.pill} onClick={() => setView("choose")}>Back</button>
      </div>
      {saved ? (
        <div style={{ ...s.card, textAlign:"center", padding:"48px 24px" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>Done!</div>
          <div style={{ fontSize:20, fontWeight:700, color:"#1a7a4a" }}>Submitted!</div>
          <div style={{ color:"#666", marginTop:8 }}>Your log for {date} is saved.</div>
          <button style={{ ...s.btn(), marginTop:24 }} onClick={() => { setSaved(false); setName(""); setTimeIn(""); setTimeOut(""); setTasks([emptyTask()]); }}>Submit Another</button>
        </div>
      ) : (
        <div style={s.card}>
          <div style={{ fontSize:17, fontWeight:700, color:"#1a3a5c", marginBottom:18 }}>Daily Log - {date}</div>
          {error && <div style={{ background:"#fff0f0", color:"#c0392b", borderRadius:7, padding:"9px 14px", marginBottom:14, fontSize:13 }}>{error}</div>}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }}>
            <div>
              <label style={s.label}>Your Name *</label>
              <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Type your name" />
            </div>
            <div>
              <label style={s.label}>Date</label>
              <input style={{ ...s.input, background:"#f4f6fb" }} value={date} readOnly />
            </div>
            <div>
              <label style={s.label}>Time In *</label>
              <div style={{ display:"flex", gap:8 }}>
                <input style={{ ...s.input, flex:1 }} value={timeIn} onChange={e => setTimeIn(e.target.value)} placeholder="e.g. 09:00" />
                <button style={s.timebtn} onClick={() => setTimeIn(nowTime())}>Now</button>
              </div>
            </div>
            <div>
              <label style={s.label}>Time Out</label>
              <div style={{ display:"flex", gap:8 }}>
                <input style={{ ...s.input, flex:1 }} value={timeOut} onChange={e => setTimeOut(e.target.value)} placeholder="Fill at end of day" />
                <button style={s.timebtn} onClick={() => setTimeOut(nowTime())}>Now</button>
              </div>
            </div>
          </div>
          <div style={{ fontSize:15, fontWeight:700, color:"#1a3a5c", marginBottom:12 }}>Tasks</div>
          {tasks.map((t, i) => (
            <div key={i} style={s.taskRow}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ fontWeight:600, fontSize:13, color:"#888" }}>Task {i+1}</span>
                {tasks.length > 1 && <button onClick={() => removeTask(i)} style={{ background:"none", border:"none", color:"#c0392b", cursor:"pointer", fontSize:18 }}>x</button>}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:10, marginBottom:10 }}>
                <div>
                  <label style={s.label}>Task Name</label>
                  <input style={s.input} value={t.name} onChange={e => updateTask(i,"name",e.target.value)} placeholder="Type task name" />
                </div>
                <div>
                  <label style={s.label}>Category</label>
                  <select style={s.select} value={t.category} onChange={e => updateTask(i,"category",e.target.value)}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10 }}>
                <div>
                  <label style={s.label}>Phase</label>
                  <input style={s.input} value={t.phase} onChange={e => updateTask(i,"phase",e.target.value)} placeholder="Alpha, Beta, STB..." />
                </div>
                <div>
                  <label style={s.label}>Completion %</label>
                  <input style={s.input} type="number" min="0" max="100" value={t.pct} onChange={e => updateTask(i,"pct",e.target.value)} placeholder="0-100" />
                </div>
                <div>
                  <label style={s.label}>Assigned By</label>
                  <select style={s.select} value={t.assignedBy} onChange={e => updateTask(i,"assignedBy",e.target.value)}>
                    <option value="">Select</option>
                    {ASSIGNED_BY.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={s.label}>Remarks</label>
                <input style={s.input} value={t.remarks} onChange={e => updateTask(i,"remarks",e.target.value)} placeholder="Notes, milestones, blockers..." />
              </div>
            </div>
          ))}
          <button style={{ ...s.btn("#4a90d9"), marginBottom:16, width:"100%" }} onClick={addTask}>+ Add Task</button>
          <button style={{ ...s.btn(), width:"100%", padding:"12px", fontSize:15 }} onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Submit Daily Log"}
          </button>
        </div>
      )}
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.logo}>Manager Dashboard</span>
        <button style={s.pill} onClick={() => { setView("choose"); setManagerUnlocked(false); }}>Back</button>
      </div>
      <div style={s.card}>
        <div style={{ display:"flex", gap:12, alignItems:"flex-end", marginBottom:20, flexWrap:"wrap" }}>
          <div>
            <label style={s.label}>Date (DD/MM/YYYY)</label>
            <input style={{ ...s.input, width:160 }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>
          <button style={s.btn()} onClick={loadEntries}>{loading ? "Loading..." : "Load"}</button>
        </div>
        {error && <div style={{ background:"#fff0f0", color:"#c0392b", borderRadius:7, padding:"9px 14px", marginBottom:14, fontSize:13 }}>{error}</div>}
        {!loading && entries.length === 0 && <div style={{ color:"#999", textAlign:"center", padding:"40px 0" }}>No entries found for {filterDate}.</div>}
        {entries.map((e, i) => (
          <div key={i} style={{ ...s.taskRow, marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <span style={{ fontSize:16, fontWeight:700, color:"#1a3a5c" }}>{e.name}</span>
              <span style={{ fontSize:13, color:"#666", background:"#f0f4fa", borderRadius:8, padding:"4px 12px" }}>
                In: {e.timeIn||"--"} | Out: {e.timeOut||"--"}
              </span>
            </div>
            {e.tasks.length > 0 ? (
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"#f0f4fa" }}>
                    {["#","Task","Category","Phase","%","Assigned By","Remarks"].map(h => (
                      <th key={h} style={{ padding:"7px 10px", textAlign:"left", fontWeight:600, color:"#444", borderBottom:"1.5px solid #e0e4f0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {e.tasks.map((t, j) => (
                    <tr key={j} style={{ borderBottom:"1px solid #eef" }}>
                      <td style={{ padding:"7px 10px", color:"#aaa" }}>{j+1}</td>
                      <td style={{ padding:"7px 10px", fontWeight:500 }}>{t.name||"--"}</td>
                      <td style={{ padding:"7px 10px" }}><span style={s.badge(t.category)}>{t.category||"--"}</span></td>
                      <td style={{ padding:"7px 10px", color:"#555" }}>{t.phase||"--"}</td>
                      <td style={{ padding:"7px 10px", fontWeight:600 }}>{t.pct!==""?t.pct+"%":"--"}</td>
                      <td style={{ padding:"7px 10px" }}>{t.assignedBy||"--"}</td>
                      <td style={{ padding:"7px 10px", color:"#666", fontSize:12 }}>{t.remarks||"--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div style={{ color:"#bbb", fontSize:13 }}>No tasks logged.</div>}
          </div>
        ))}
      </div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}
