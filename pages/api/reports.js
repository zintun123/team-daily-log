import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const CUTOFF_TIME = "10:30";
const START_TIME = "09:00";

function isWeekend(dateStr) {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return false;
  const [dd, mm, yy] = parts;
  const day = new Date(`${yy}-${mm}-${dd}`).getDay();
  return day === 0 || day === 6;
}

function parseTime(t) {
  if (!t) return null;
  const clean = t.replace(/\s?(AM|PM)/i, "").trim();
  const [h, m] = clean.split(":").map(Number);
  return h * 60 + (m || 0);
}

function getAttendanceStatus(timeIn) {
  const t = parseTime(timeIn);
  if (t === null) return "unaccounted";
  const [sh, sm] = START_TIME.split(":").map(Number);
  const startMins = sh * 60 + sm;
  return t <= startMins ? "present" : "late";
}

export default async function handler(req, res) {
  try {
    const { data: rows, error } = await supabase.from("daily_log").select("*");
    if (error) throw error;

    const data = (rows || [])
      .filter(r => r.task_name)
      .map(r => ({
        date: r.date, name: r.name, timeIn: r.time_in, timeOut: r.time_out,
        taskNo: r.task_no, taskName: r.task_name, category: r.category || "Active",
        phase: r.phase, pct: Math.min(r.pct || 0, 100),
        assignedBy: r.assigned_by, remarks: r.remarks,
        type: (r.type || "morning").toLowerCase()
      }))
      .filter(r => r.name && r.name.toLowerCase() !== "this is a test");

    const progressMap = {};
    for (const r of data) {
      const key = `${r.date}|${r.name}|${r.taskNo}`;
      if (!progressMap[key]) progressMap[key] = { ...r, morningPct: null, eodPct: null };
      if (r.type === "morning") progressMap[key].morningPct = r.pct;
      else progressMap[key].eodPct = r.pct;
    }
    const progress = Object.values(progressMap).map(p => ({
      ...p,
      progressMade: p.morningPct !== null && p.eodPct !== null ? p.eodPct - p.morningPct : null,
      finalPct: p.eodPct !== null ? p.eodPct : p.morningPct
    }));

    const knownStaff = [...new Set(data.map(r => r.name))];
    const dates = [...new Set(data.map(r => r.date))].filter(d => !isWeekend(d));
    const attendance = {};
    for (const date of dates) {
      const dayRows = data.filter(r => r.date === date && r.type === "morning");
      const submitted = {};
      for (const r of dayRows) {
        if (!submitted[r.name]) submitted[r.name] = r.timeIn;
      }
      attendance[date] = knownStaff.map(name => ({
        name,
        status: submitted[name] ? getAttendanceStatus(submitted[name]) : "unaccounted",
        timeIn: submitted[name] || null
      }));
    }

    res.status(200).json({ rows: data, progress, knownStaff, attendance, cutoff: CUTOFF_TIME, startTime: START_TIME });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load", rows: [], progress: [], knownStaff: [], attendance: {} });
  }
}
