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

export default async function handler(req, res) {
  const { date } = req.query;
  try {
    const sheets = await getSheets();
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A:L",
    });
    const rows = (resp.data.values || []).slice(1).filter(r => r[0] === date);

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
