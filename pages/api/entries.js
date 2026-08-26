import { google } from "googleapis";

const SHEET_ID = "1OsR0vTeC0pozVXuZjNY_2DJ8Z-wE9xs6XS1X2c3nDjU";

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

export default async function handler(req, res) {
  const { date } = req.query;
  const targetDate = normalizeDate(date);
  try {
    const sheets = await getSheets();
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A:L",
    });
    const rows = (resp.data.values || []).slice(1).filter(r => normalizeDate(r[0]) === targetDate);

    const map = {};
    for (const r of rows) {
      const [rowDate, name, timeIn, timeOut, taskNo, taskName, category, phase, pct, assignedBy, remarks, type] = r;
      const rowType = (type || "morning").toLowerCase();
      const isPending = rowType.includes("pending");
      const isEod = rowType.includes("eod");

      if (!map[name]) map[name] = { name, timeIn: "", timeOut: "", tasks: {}, pendingTasks: {} };

      if (!isEod && timeIn) map[name].timeIn = timeIn;
      if (isEod && timeOut) map[name].timeOut = timeOut;

      const bucket = isPending ? map[name].pendingTasks : map[name].tasks;
      const key = taskNo || taskName;

      if (!bucket[key]) {
        bucket[key] = {
          taskNo, name: taskName, category, phase,
          assignedBy, remarks,
          morningPct: null, eodPct: null,
          morningRemarks: null, eodRemarks: null,
          morningCategory: null, eodCategory: null,
        };
      }

      const task = bucket[key];
      if (!isEod) {
        task.morningPct = pct !== "" ? parseFloat(pct) : null;
        task.morningRemarks = remarks;
        task.morningCategory = category;
        task.name = taskName;
        task.phase = phase;
        task.assignedBy = assignedBy;
      } else {
        task.eodPct = pct !== "" ? parseFloat(pct) : null;
        task.eodRemarks = remarks;
        task.eodCategory = category;
        if (taskName) task.name = taskName;
      }
    }

    const entries = Object.values(map).map(p => ({
      ...p,
      tasks: Object.values(p.tasks),
      pendingTasks: Object.values(p.pendingTasks)
    }));

    res.status(200).json({ entries });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load", entries: [] });
  }
}
