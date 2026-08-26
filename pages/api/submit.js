import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { name, date, timeIn, timeOut, tasks, pendingTasks = [] } = req.body;
  try {
    const activeRows = tasks.map((t, i) => ({
      date, name, time_in: timeIn, time_out: timeOut || "",
      task_no: i + 1, task_name: t.name, category: t.category, phase: t.phase,
      pct: t.pct === "" ? null : t.pct, assigned_by: t.assignedBy, remarks: t.remarks,
      type: "morning"
    }));
    const pendingRows = pendingTasks.map((t, i) => ({
      date, name, time_in: timeIn, time_out: timeOut || "",
      task_no: i + 1, task_name: t.name, category: t.category, phase: t.phase,
      pct: t.pct === "" ? null : t.pct, assigned_by: t.assignedBy, remarks: t.remarks,
      type: "morning-pending"
    }));
    const allRows = [...activeRows, ...pendingRows];

    if (allRows.length === 0) return res.status(200).json({ ok: true, saved: 0 });

    const { error } = await supabase.from("daily_log").insert(allRows);
    if (error) throw error;

    res.status(200).json({ ok: true, saved: allRows.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save" });
  }
}
