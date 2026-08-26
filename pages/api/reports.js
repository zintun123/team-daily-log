import { google } from "googleapis";

const SHEET_ID = "1OsR0vTeC0pozVXuZjNY_2DJ8Z-wE9xs6XS1X2c3nDjU";
const CUTOFF_TIME = "10:30";
const START_TIME = "09:00";

async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

function normName(n) {
  const map = {
    "zz":"Zin Zin","zin zin":"Zin Zin",
    "swapna":"Swapna","swapna kodukulla":"Swapna",
    "brian keith villanueva":"Brian",
    "laylan":"Laylan",
    "nuraisyah":"Nuraisyah","toni angeles":"Toni",
    "eloissa de vera":"Eloissa","kathleen":"Kathleen",
    "lara lai":"Lara","lara":"Lara",
  };
  return map[n.toLowerCase()] || n;
}

function normalizeDate(d) {
  if (!d) return "";
  if (/^\d+(\.\d+)?$/.test(d)) {
    const serial = parseFloat(d);
    const epoch = new Date(1899, 11, 30);
    const dt = new Date(epoch.getTime() + serial * 86400000);
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const yy = dt.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }
  const slashParts = d.split("/");
  if (slashParts.length === 3) {
    const [a, b, c] = slashParts;
    const dd = a.padStart(2, "0");
    const mm = b.padStart(2, "0");
    const yy = c.length === 4 ? c : `20${c}`;
    return `${dd}/${mm}/${yy}`;
  }
  const isoParts = d.split("-");
  if (isoParts.length === 3 && isoParts[0].length === 4) {
    const [yy, mm, dd] = isoParts;
    return `${dd.padStart(2,"0")}/${mm.padStart(2,"0")}/${yy}`;
  }
  return d.trim();
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

export default async function handler(req, res) {
  try {
    const sheets = await getSheets();
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A:L",
    });
    const rows = (resp.data.values || []).slice(1);
    const data = rows
      .filter(r => r[5])
      .map(r => ({
        date: normalizeDate(r[0]||""), name: normName(r[1]||""), timeIn: r[2]||"", timeOut: r[3]||"",
        taskNo: r[4]||"", taskName: r[5]||"", category: r[6]||"Active",
        phase: r[7]||"", pct: Math.min(parseFloat(r[8])||0, 100),
        assignedBy: r[9]||"", remarks: r[10]||"",
        type: (r[11]||"morning").toLowerCase()
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
