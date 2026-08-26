import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { date } = req.query;
  try {
    const { data: rows, error } = await supabase
      .from("daily_log")
      .select("*")
      .eq("date", date);
    if (error) throw error;

    const map = {};
    for (const r of rows || []) {
      const rowType = (r.type || "morning").toLowerCase();
      const isPending = rowType.includes("pending");
      const isEod = rowType.includes("eod");

      if (!map[r.name]) map[r.name] = { name: r.name, timeIn: "", timeOut: "", tasks: {}, pendingTasks: {} };

      if (!isEod && r.time_in) map[r.name].timeIn = r.time_in;
      if (isEod && r.time_out) map[r.name].timeOut = r.time_out;

      const bucket = isPending ? map[r.name].pendingTasks : map[r.name].tasks;
      const key = r.task_no || r.task_name;

      if (!bucket[key]) {
        bucket[key] = {
          taskNo: r.task_no, name: r.task_name, category: r.category, phase: r.phase,
          assignedBy: r.assigned_by, remarks: r.remarks,
          morningPct: null, eodPct: null,
          morningRemarks: null, eodRemarks: null,
          morningCategory: null, eodCategory: null,
        };
      }

      const task = bucket[key];
      if (!isEod) {
        task.morningPct = r.pct !== null ? r.pct : null;
        task.morningRemarks = r.remarks;
        task.morningCategory = r.category;
        task.name = r.task_name;
        task.phase = r.phase;
        task.assignedBy = r.assigned_by;
      } else {
        task.eodPct = r.pct !== null ? r.pct : null;
        task.eodRemarks = r.remarks;
        task.eodCategory = r.category;
        if (r.task_name) task.name = r.task_name;
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
