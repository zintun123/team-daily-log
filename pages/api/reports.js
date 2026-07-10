import { google } from "googleapis";

const SHEET_ID = "1OsR0vTeC0pozVXuZjNY_2DJ8Z-wE9xs6XS1X2c3nDjU";
const CUTOFF_TIME = "10:30";

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

function parseTime(t) {
  if (!t) return null;
  const clean = t.replace(/\s?(AM|PM)/i, "").trim();
  const [h, m] = clean.split(":").map(Number);
  return h * 60 + (m || 0);
}

function isLate(timeIn) {
  const t = parseTime(timeIn);
  if (t === null) return false;
  const [ch, cm] = CUTOFF_TIME.split(":").map(Number);
  return t > ch * 60 + cm;
}

export default async function handler(req, res) {
  try {
    const sheets = await getSheets();
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A:K",
    });
    const rows = (resp.data.values || []).slice(1);
    const data = rows
      .filter(r => r[5])
      .map(r => ({
        date: r[0]||"", name: normName(r[1]||""), timeIn: r[2]||"", timeOut: r[3]||"",
        taskNo: r[4]||"", taskName: r[5]||"", category: r[6]||"Active",
        phase: r[7]||"", pct: Math.min(parseFloat(r[8])||0, 100),
        assignedBy: r[9]||"", remarks: r[10]||""
      }))
      .filter(r => r.name && r.name.toLowerCase() !== "this is a test");

    const knownStaff = [...new Set(data.map(r => r.name))];
    const dates = [...new Set(data.map(r => r.date))];
    const attendance = {};
    for (const date of dates) {
      const dayRows = data.filter(r => r.date === date);
      const submitted = {};
      for (const r of dayRows) {
        if (!submitted[r.name]) submitted[r.name] = r.timeIn;
      }
      attendance[date] = knownStaff.map(name => ({
        name,
        status: submitted[name]
          ? isLate(submitted[name]) ? "late" : "present"
          : "unaccounted",
        timeIn: submitted[name] || null
      }));
    }

    res.status(200).json({ rows: data, knownStaff, attendance, cutoff: CUTOFF_TIME });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load", rows: [], knownStaff: [], attendance: {} });
  }
}
