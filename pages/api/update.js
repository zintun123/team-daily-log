import { google } from "googleapis";

const SHEET_ID = "1OsR0vTeC0pozVXuZjNY_2DJ8Z-wE9xs6XS1X2c3nDjU";

async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function appendWithVerify(sheets, rows, verifyMatch) {
  if (rows.length === 0) return true;
  for (let attempt = 1; attempt <= 2; attempt++) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A:L",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rows },
    });

    await sleep(400 + Math.random() * 400);

    const check = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A:L",
    });
    const allRows = check.data.values || [];
    const found = rows.every(r => allRows.some(existing => verifyMatch(existing, r)));

    if (found) return true;
    await sleep(500 + Math.random() * 500);
  }
  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { name, date, timeOut, tasks, newTasks = [], pendingTasks = [] } = req.body;
  try {
    const sheets = await getSheets();

    const eodRows = tasks.map((t, i) => [
      date, name, "", timeOut,
      i + 1, t.name, t.category, t.phase, t.pct, t.assignedBy, t.remarks, "EOD"
    ]);

    const newTaskRows = newTasks.map((t, i) => [
      date, name, "", timeOut,
      tasks.length + i + 1, t.name, t.category, t.phase, t.pct, t.assignedBy, t.remarks, "EOD"
    ]);

    const pendingEodRows = pendingTasks.map((t, i) => [
      date, name, "", timeOut,
      i + 1, t.name, t.category, t.phase, t.pct, t.assignedBy, t.remarks, "EOD-pending"
    ]);

    const allRows = [...eodRows, ...newTaskRows, ...pendingEodRows];

    const verifyMatch = (existingRow, sentRow) =>
      existingRow[0] === sentRow[0] &&
      existingRow[1] === sentRow[1] &&
      existingRow[4] === String(sentRow[4]) &&
      existingRow[11] === sentRow[11];

    const ok = await appendWithVerify(sheets, allRows, verifyMatch);

    if (!ok) {
      return res.status(500).json({ error: "Could not confirm save. Please try again.", ok: false });
    }

    res.status(200).json({ ok: true, appended: allRows.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update" });
  }
}
