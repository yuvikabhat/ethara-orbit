import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  FolderKanban, CheckSquare, CheckCircle2, AlertTriangle, Users, TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjects, useTasks, useMembers } from "@/hooks/useData";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { useAuth } from "@/lib/auth-context";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, isAfter, parseISO } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  todo: "oklch(0.65 0.03 280)",
  in_progress: "oklch(0.62 0.22 280)",
  review: "oklch(0.78 0.15 75)",
  completed: "oklch(0.7 0.16 160)",
};

function Kpi({ icon: Icon, label, value, hint, accent }: { icon: any; label: string; value: string | number; hint?: string; accent?: string }) {
  return (
    <Card className="shadow-card border-border/60 overflow-hidden relative">
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: accent }} />
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
          <div className="h-8 w-8 rounded-lg bg-card grid place-items-center border border-border">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { profile } = useAuth();
  const { data: projects = [], isLoading: lp } = useProjects();
  const { data: tasks = [], isLoading: lt } = useTasks();
  const { data: members = [] } = useMembers();

  const stats = useMemo(() => {
    const completed = tasks.filter((t) => t.status === "completed").length;
    const overdue = tasks.filter((t) => t.due_date && t.status !== "completed" && isAfter(new Date(), parseISO(t.due_date))).length;
    const productivity = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
    return { completed, overdue, productivity };
  }, [tasks]);

  const byStatus = useMemo(() => {
    const groups = ["todo", "in_progress", "review", "completed"] as const;
    return groups.map((g) => ({ status: g.replace("_", " "), key: g, count: tasks.filter((t) => t.status === g).length }));
  }, [tasks]);

  const projectProgress = useMemo(() => projects.slice(0, 6).map((p) => {
    const projTasks = tasks.filter((t) => t.project_id === p.id);
    const done = projTasks.filter((t) => t.status === "completed").length;
    return { name: p.title.length > 14 ? p.title.slice(0, 14) + "…" : p.title, total: projTasks.length, done };
  }), [projects, tasks]);

  const myTasks = useMemo(() => tasks.filter((t) => t.assigned_to === profile?.id && t.status !== "completed").slice(0, 5), [tasks, profile]);
  const upcoming = useMemo(() => tasks
    .filter((t) => t.due_date && t.status !== "completed")
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
    .slice(0, 5), [tasks]);

  if (lp || lt) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {profile?.full_name?.split(" ")[0] || "there"}</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's what's happening across your workspace today.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={FolderKanban} label="Projects" value={projects.length} accent="radial-gradient(80% 80% at 0% 0%, oklch(0.62 0.22 280 / 0.2), transparent)" />
        <Kpi icon={CheckSquare} label="Total tasks" value={tasks.length} />
        <Kpi icon={CheckCircle2} label="Completed" value={stats.completed} accent="radial-gradient(80% 80% at 0% 0%, oklch(0.7 0.16 160 / 0.2), transparent)" />
        <Kpi icon={AlertTriangle} label="Overdue" value={stats.overdue} accent="radial-gradient(80% 80% at 0% 0%, oklch(0.62 0.24 25 / 0.2), transparent)" />
        <Kpi icon={Users} label="Members" value={members.length} />
        <Kpi icon={TrendingUp} label="Productivity" value={`${stats.productivity}%`} accent="radial-gradient(80% 80% at 0% 0%, oklch(0.78 0.15 75 / 0.2), transparent)" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card border-border/60">
          <CardHeader><CardTitle className="text-base">Tasks by status</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={byStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" />
                  <XAxis dataKey="status" stroke="oklch(0.65 0.03 280)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.65 0.03 280)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "oklch(0.18 0.025 280)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 12 }} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {byStatus.map((d) => <Cell key={d.key} fill={STATUS_COLORS[d.key]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/60">
          <CardHeader><CardTitle className="text-base">Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byStatus} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {byStatus.map((d) => <Cell key={d.key} fill={STATUS_COLORS[d.key]} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "oklch(0.18 0.025 280)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card border-border/60">
          <CardHeader><CardTitle className="text-base">Project progress</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {projectProgress.length === 0 && <p className="text-sm text-muted-foreground">No projects yet.</p>}
            {projectProgress.map((p) => {
              const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
              return (
                <div key={p.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium truncate">{p.name}</span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/60">
          <CardHeader><CardTitle className="text-base">My tasks</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {myTasks.length === 0 && <p className="text-sm text-muted-foreground">You're all caught up.</p>}
            {myTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{t.title}</span>
                <PriorityBadge value={t.priority} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/60">
          <CardHeader><CardTitle className="text-base">Upcoming deadlines</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Nothing due soon.</p>}
            {upcoming.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{t.title}</span>
                <span className="text-xs text-muted-foreground">{format(parseISO(t.due_date!), "MMM d")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_app/dashboard")({ component: DashboardPage });
