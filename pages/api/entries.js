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
      range: "Sheet1!A:K",
    });
    const rows = (resp.data.values || []).slice(1);
    const filtered = rows.filter(r => r[0] === date);
    const map = {};
    for (const r of filtered) {
      const [rowDate, name, timeIn, timeOut, taskNo, taskName, category, phase, pct, assignedBy, remarks] = r;
      if (!map[name]) map[name] = { name, timeIn, timeOut, tasks: [] };
      if (timeOut) map[name].timeOut = timeOut;
      if (taskName) map[name].tasks.push({ taskNo, name: taskName, category, phase, pct, assignedBy, remarks });
    }
    res.status(200).json({ entries: Object.values(map) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load", entries: [] });
  }
}
