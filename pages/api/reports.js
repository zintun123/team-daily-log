import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const CUTOFF_TIME = "10:30";
const START_TIME = "09:00";

const NAME_MAP = {
  "swapna": "Swapna",
  "swapna kodukulla": "Swapna",
  "zin zin": "Zin Zin",
  "zz": "Zin Zin",
  "toni": "Toni Angeles",
  "toni angeles": "Toni Angeles",
  "brian": "Brian Keith Villanueva",
  "brian keith villanueva": "Brian Keith Villanueva",
  "lara": "Lara",
  "lara lai": "Lara",
};

function normalizeName(raw) {
  if (!raw) return "";
  const trimmed = raw.trim().replace(/\s+/g, " ");
  const key = trimmed.toLowerCase();
  if (NAME_MAP[key]) return NAME_MAP[key];
  return trimmed.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

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

async function fetchAllRows() {
  const pageSize = 1000;
  let allRows = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("daily_log")
      .select("*")
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    allRows = allRows.concat(data || []);
    if (!data || data.length < pageSize) break;
    offset += pageSize;
  }
  return allRows;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  try {
    const rows = await fetchAllRows();

    const data = (rows || [])
      .filter(r => r.task_name)
      .map(r => ({
        date: r.date, name: normalizeName(r.name), timeIn: r.time_in, timeOut: r.time_out,
        taskNo: r.task_no, taskName: r.task_name, category: r.category || "Active",
        phase: r.phase, pct: Math.min(r.pct || 0, 100),
        assignedBy: r.assigned_by, remarks: r.remarks,
        type: (r.type || "morning").toLowerCase()
      }))
      .filter(r => r.name && r.name.toLowerCase() !== "this is a test");

    const activeMap = {};
    for (const r of data) {
      if (r.type !== "morning" && r.type !== "eod") continue;
      const key = `${r.date}|${r.name}|${r.taskNo}`;
      if (!activeMap[key]) activeMap[key] = { date: r.date, name: r.name, taskNo: r.taskNo, taskName: "", phase: "", assignedBy: "", morningPct: null, eodPct: null, morningRemarks: "", eodRemarks: "" };
      const entry = activeMap[key];
      if (r.type === "morning") {
        entry.morningPct = r.pct; entry.taskName = r.taskName; entry.phase = r.phase;
        entry.assignedBy = r.assignedBy; entry.morningRemarks = r.remarks;
      } else {
        entry.eodPct = r.pct; entry.eodRemarks = r.remarks;
        if (r.taskName) entry.taskName = r.taskName;
      }
    }
    const activeSummary = Object.values(activeMap).map(t => {
      const finalPct = t.eodPct !== null ? t.eodPct : t.morningPct;
      const status = t.eodPct === null ? "no_eod" : finalPct >= 100 ? "completed" : finalPct > 0 ? "in_progress" : "not_started";
      return { ...t, finalPct, status, remarks: t.eodRemarks || t.morningRemarks };
    });

    const pendingMap = {};
    for (const r of data) {
      if (r.type !== "morning-pending" && r.type !== "eod-pending") continue;
      const key = `${r.date}|${r.name}|${r.taskNo}`;
      if (!pendingMap[key]) pendingMap[key] = { date: r.date, name: r.name, taskNo: r.taskNo, taskName: "", phase: "", assignedBy: "", morningPct: null, eodPct: null, morningCategory: null, eodCategory: null, morningRemarks: "", eodRemarks: "" };
      const entry = pendingMap[key];
      if (r.type === "morning-pending") {
        entry.morningPct = r.pct; entry.taskName = r.taskName; entry.phase = r.phase;
        entry.assignedBy = r.assignedBy; entry.morningCategory = r.category; entry.morningRemarks = r.remarks;
      } else {
        entry.eodPct = r.pct; entry.eodCategory = r.category; entry.eodRemarks = r.remarks;
        if (r.taskName) entry.taskName = r.taskName;
      }
    }
    const pendingSummary = Object.values(pendingMap).map(t => {
      const finalPct = t.eodPct !== null ? t.eodPct : t.morningPct;
      const finalCategory = t.eodCategory || t.morningCategory;
      let resolvedStatus = "pending";
      if (finalCategory === "Active" && finalPct >= 100) resolvedStatus = "completed";
      else if (finalCategory === "Active") resolvedStatus = "approved";
      return { ...t, finalPct, finalCategory, resolvedStatus, remarks: t.eodRemarks || t.morningRemarks };
    });

    const stillPending = pendingSummary.filter(t => t.resolvedStatus === "pending");

    const knownStaff = [...new Set(data.map(r => r.name))].sort();
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

    res.status(200).json({
      rows: data, knownStaff, attendance, cutoff: CUTOFF_TIME, startTime: START_TIME,
      activeSummary, pendingSummary, stillPending
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load", rows: [], knownStaff: [], attendance: {}, activeSummary: [], pendingSummary: [], stillPending: [] });
  }
}
