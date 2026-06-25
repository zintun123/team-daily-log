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
  const { name, date, timeOut, tasks } = req.body;
  try {
    const sheets = await getSheets();
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A:K",
    });
    const rows = resp.data.values || [];
    const updates = [];

    rows.forEach((row, idx) => {
      if (idx === 0) return;
      if (row[0] === date && row[1] === name) {
        const taskIdx = parseInt(row[4]) - 1;
        const updatedTask = tasks[taskIdx];
        if (updatedTask) {
          updates.push({ range: `Sheet1!D${idx + 1}`, values: [[timeOut]] });
          updates.push({ range: `Sheet1!G${idx + 1}`, values: [[updatedTask.category]] });
          updates.push({ range: `Sheet1!I${idx + 1}`, values: [[updatedTask.pct]] });
          updates.push({ range: `Sheet1!K${idx + 1}`, values: [[updatedTask.remarks]] });
        }
      }
    });

    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: updates,
        },
      });
    }

    res.status(200).json({ ok: true, updated: updates.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update" });
  }
}
