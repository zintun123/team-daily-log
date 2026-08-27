import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { name } = req.query;
  if (!name) return res.status(200).json({ activeTasks: [], pendingTasks: [], fromDate: null });

  try {
    const { data: rows, error } = await supabase
      .from("daily_log")
      .select("*")
      .ilike("name", name.trim());
    if (error) throw error;

    const all = (rows || []).filter(r => r.task_name);
    if (all.length === 0) return res.status(200).json({ activeTasks: [], pendingTasks: [], fromDate: null });

    const parseDate = d => { const [dd,mm,yy] = d.split("/"); return new Date(`${yy}-${mm}-${dd}`); };
    const morningDates = [...new Set(all.filter(r => (r.type||"").toLowerCase()==="morning" || (r.type||"").toLowerCase()==="morning-pending").map(r => r.date))];
    if (morningDates.length === 0) return res.status(200).json({ activeTasks: [], pendingTasks: [], fromDate: null });
    const lastDate = morningDates.sort((a,b) => parseDate(b) - parseDate(a))[0];

    const dayRows = all.filter(r => r.date === lastDate);

    const morningActive = dayRows.filter(r => (r.type||"").toLowerCase() === "morning");
    const eodActive = dayRows.filter(r => (r.type||"").toLowerCase() === "eod");
    const unfinishedActive = morningActive
      .map(t => {
        const eod = eodActive.find(e => String(e.task_no) === String(t.task_no));
        const finalPct = eod ? eod.pct : t.pct;
        return { ...t, finalPct };
      })
      .filter(t => (t.finalPct || 0) < 100)
      .map(t => ({
        name: t.task_name, phase: t.phase || "", assignedBy: t.assigned_by || "",
        remarks: "", pct: t.finalPct || 0, category: "Active"
      }));

    const morningPending = dayRows.filter(r => (r.type||"").toLowerCase() === "morning-pending");
    const eodPending = dayRows.filter(r => (r.type||"").toLowerCase() === "eod-pending");
    const unfinishedPending = morningPending
      .filter(t => t.task_name)
      .map(t => {
        const eod = eodPending.find(e => String(e.task_no) === String(t.task_no));
        const finalCategory = eod ? eod.category : t.category;
        const finalPct = eod ? eod.pct : t.pct;
        return { ...t, finalCategory, finalPct };
      })
      .filter(t => !(t.finalCategory === "Active" && (t.finalPct || 0) >= 100))
      .map(t => ({
        name: t.task_name, phase: t.phase || "", assignedBy: t.assigned_by || "",
        remarks: "", pct: t.finalPct || 0,
        category: ["Pending Feedback","Waiting Internal","Waiting for Client"].includes(t.finalCategory) ? t.finalCategory : "Pending Feedback"
      }));

    res.status(200).json({ activeTasks: unfinishedActive, pendingTasks: unfinishedPending, fromDate: lastDate });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load", activeTasks: [], pendingTasks: [], fromDate: null });
  }
}