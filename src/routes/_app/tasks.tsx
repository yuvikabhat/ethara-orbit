import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, MoreVertical, GripVertical } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useProjects, useTasks, useMembers, type TaskRow } from "@/hooks/useData";
import { PriorityBadge } from "@/components/Badges";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const COLUMNS: { key: TaskRow["status"]; label: string; accent: string }[] = [
  { key: "todo", label: "To do", accent: "from-muted-foreground/10" },
  { key: "in_progress", label: "In progress", accent: "from-primary/20" },
  { key: "review", label: "Review", accent: "from-warning/20" },
  { key: "completed", label: "Completed", accent: "from-success/20" },
];

const schema = z.object({
  title: z.string().trim().min(2, "Title is required").max(140),
  description: z.string().max(2000).optional(),
  project_id: z.string().min(1, "Pick a project"),
  assigned_to: z.string().optional(),
  status: z.enum(["todo", "in_progress", "review", "completed"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  due_date: z.string().optional(),
});
type Values = z.infer<typeof schema>;

function initials(s?: string | null) {
  return (s || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function TaskCard({ task, member, onDelete, isAdmin, onDragStart }: {
  task: TaskRow; member?: { full_name: string | null }; onDelete: () => void; isAdmin: boolean; onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group rounded-xl border border-border/60 bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/40 transition"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-snug">{task.title}</div>
          {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
          <div className="flex items-center justify-between gap-2 mt-3">
            <PriorityBadge value={task.priority} />
            <div className="flex items-center gap-2">
              {task.due_date && <span className="text-[10px] text-muted-foreground">{format(parseISO(task.due_date), "MMM d")}</span>}
              {member && <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px] gradient-primary text-primary-foreground">{initials(member.full_name)}</AvatarFallback></Avatar>}
            </div>
          </div>
        </div>
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 h-6 w-6 grid place-items-center rounded hover:bg-accent transition">
              <MoreVertical className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

function TasksPage() {
  const { isAdmin, user } = useAuth();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [], isLoading } = useTasks();
  const { data: members = [] } = useMembers();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filterProject, setFilterProject] = useState<string>("all");
  const [view, setView] = useState<"kanban" | "table" | "mine">("kanban");

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { status: "todo", priority: "medium" },
  });

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("tasks-rt").on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    }).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [qc]);

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const visible = useMemo(() => {
    let rows = tasks;
    if (filterProject !== "all") rows = rows.filter((t) => t.project_id === filterProject);
    if (view === "mine") rows = rows.filter((t) => t.assigned_to === user?.id);
    return rows;
  }, [tasks, filterProject, view, user]);

  const create = useMutation({
    mutationFn: async (v: Values) => {
      const { error } = await supabase.from("tasks").insert({
        ...v,
        description: v.description || null,
        assigned_to: v.assigned_to || null,
        due_date: v.due_date || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Task created"); qc.invalidateQueries({ queryKey: ["tasks"] }); setOpen(false); form.reset({ status: "todo", priority: "medium" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskRow["status"] }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Task deleted"); qc.invalidateQueries({ queryKey: ["tasks"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const onDrop = (e: React.DragEvent, status: TaskRow["status"]) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const task = tasks.find((t) => t.id === id);
    if (task && task.status !== status) updateStatus.mutate({ id, status });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">Drag tasks between columns to update status</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Plus className="h-4 w-4" /> New task</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create task</DialogTitle></DialogHeader>
                <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input {...form.register("title")} placeholder="Design login screen" />
                    {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea {...form.register("description")} rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Project</Label>
                      <Select onValueChange={(v) => form.setValue("project_id", v)}>
                        <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                        <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                      </Select>
                      {form.formState.errors.project_id && <p className="text-xs text-destructive">{form.formState.errors.project_id.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Assignee</Label>
                      <Select onValueChange={(v) => form.setValue("assigned_to", v)}>
                        <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                        <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select defaultValue="todo" onValueChange={(v) => form.setValue("status", v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">To do</SelectItem>
                          <SelectItem value="in_progress">In progress</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select defaultValue="medium" onValueChange={(v) => form.setValue("priority", v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Due</Label>
                      <Input type="date" {...form.register("due_date")} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={create.isPending} className="gradient-primary text-primary-foreground">Create</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as any)}>
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="mine">My tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {COLUMNS.map((c) => <div key={c.key} className="h-96 rounded-2xl bg-card animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {COLUMNS.map((col) => {
                const items = visible.filter((t) => t.status === col.key);
                return (
                  <div
                    key={col.key}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDrop(e, col.key)}
                    className={cn("rounded-2xl border border-border/60 bg-gradient-to-b to-card/30 p-3 min-h-[200px]", col.accent)}
                  >
                    <div className="flex items-center justify-between px-1 pb-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{col.label}</h3>
                      <span className="text-xs text-muted-foreground bg-card rounded px-1.5 py-0.5 border border-border">{items.length}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((t) => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          member={t.assigned_to ? memberMap.get(t.assigned_to) : undefined}
                          onDelete={() => remove.mutate(t.id)}
                          isAdmin={isAdmin}
                          onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                        />
                      ))}
                      {items.length === 0 && <div className="text-xs text-muted-foreground/60 text-center py-6">Drop tasks here</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <Card className="shadow-card border-border/60 overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr><th className="p-3">Task</th><th className="p-3">Status</th><th className="p-3">Priority</th><th className="p-3">Assignee</th><th className="p-3">Due</th></tr>
                  </thead>
                  <tbody>
                    {visible.map((t) => {
                      const m = t.assigned_to ? memberMap.get(t.assigned_to) : undefined;
                      return (
                        <tr key={t.id} className="border-b border-border/50 hover:bg-accent/40 transition">
                          <td className="p-3 font-medium">{t.title}</td>
                          <td className="p-3"><Select value={t.status} onValueChange={(v) => updateStatus.mutate({ id: t.id, status: v as any })}>
                            <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todo">To do</SelectItem>
                              <SelectItem value="in_progress">In progress</SelectItem>
                              <SelectItem value="review">Review</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select></td>
                          <td className="p-3"><PriorityBadge value={t.priority} /></td>
                          <td className="p-3 text-muted-foreground">{m?.full_name || m?.email || "—"}</td>
                          <td className="p-3 text-muted-foreground">{t.due_date ? format(parseISO(t.due_date), "MMM d, yyyy") : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {visible.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No tasks.</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mine" className="mt-4">
          <Card className="shadow-card border-border/60">
            <CardContent className="p-4 space-y-2">
              {visible.length === 0 && <div className="text-sm text-muted-foreground py-8 text-center">Nothing assigned to you.</div>}
              {visible.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{projects.find((p) => p.id === t.project_id)?.title}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge value={t.priority} />
                    <Select value={t.status} onValueChange={(v) => updateStatus.mutate({ id: t.id, status: v as any })}>
                      <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To do</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute("/_app/tasks")({ component: TasksPage });
