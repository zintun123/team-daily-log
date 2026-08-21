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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { name, date, timeIn, timeOut, tasks, pendingTasks = [] } = req.body;
  try {
    const sheets = await getSheets();
    const activeRows = tasks.map((t, i) => [
      date, name, timeIn, timeOut || "",
      i + 1, t.name, t.category, t.phase, t.pct, t.assignedBy, t.remarks, "morning"
    ]);
    const pendingRows = pendingTasks.map((t, i) => [
      date, name, timeIn, timeOut || "",
      i + 1, t.name, t.category, t.phase, t.pct, t.assignedBy, t.remarks, "morning-pending"
    ]);
    const allRows = [...activeRows, ...pendingRows];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A:L",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: allRows },
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save" });
  }
}
