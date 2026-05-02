import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, MoreVertical, Trash2, Users, Calendar } from "lucide-react";
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
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjects, useTasks } from "@/hooks/useData";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  title: z.string().trim().min(2, "Title is required").max(120),
  description: z.string().max(1000).optional(),
  status: z.enum(["active", "completed", "on_hold"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  due_date: z.string().optional(),
});
type Values = z.infer<typeof schema>;

function ProjectsPage() {
  const { isAdmin, user } = useAuth();
  const { data: projects = [], isLoading } = useProjects();
  const { data: tasks = [] } = useTasks();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { status: "active", priority: "medium" },
  });

  const create = useMutation({
    mutationFn: async (v: Values) => {
      const { error } = await supabase.from("projects").insert({
        title: v.title,
        description: v.description || null,
        status: v.status,
        priority: v.priority,
        due_date: v.due_date || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Project created"); qc.invalidateQueries({ queryKey: ["projects"] }); setOpen(false); form.reset({ status: "active", priority: "medium" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Project deleted"); qc.invalidateQueries({ queryKey: ["projects"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => projects.filter((p) => p.title.toLowerCase().includes(search.toLowerCase())), [projects, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">{projects.length} projects in your workspace</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Input placeholder="Search projects…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-64" />
          {isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Plus className="h-4 w-4" /> New project</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create new project</DialogTitle></DialogHeader>
                <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input {...form.register("title")} placeholder="Website redesign" />
                    {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea {...form.register("description")} rows={3} placeholder="Brief overview…" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select defaultValue="active" onValueChange={(v) => form.setValue("status", v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="on_hold">On hold</SelectItem>
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
                  </div>
                  <div className="space-y-2">
                    <Label>Due date</Label>
                    <Input type="date" {...form.register("due_date")} />
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

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 rounded-2xl bg-card animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="py-16 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl gradient-primary grid place-items-center shadow-glow mb-4"><Plus className="h-5 w-5 text-primary-foreground" /></div>
            <h3 className="font-medium">No projects yet</h3>
            <p className="text-sm text-muted-foreground mt-1">{isAdmin ? "Create your first project to get started." : "Ask an admin to add you to a project."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const projTasks = tasks.filter((t) => t.project_id === p.id);
            const done = projTasks.filter((t) => t.status === "completed").length;
            const pct = projTasks.length ? Math.round((done / projTasks.length) * 100) : 0;
            return (
              <Card key={p.id} className="shadow-card border-border/60 hover:border-primary/40 transition group">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold tracking-tight truncate">{p.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2 min-h-[2.5em]">{p.description || "No description"}</p>
                    </div>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 h-7 w-7 grid place-items-center rounded hover:bg-accent transition"><MoreVertical className="h-4 w-4" /></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => remove.mutate(p.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={p.status} />
                    <PriorityBadge value={p.priority} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5"><span className="text-muted-foreground">Progress</span><span className="font-medium">{pct}%</span></div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full gradient-primary rounded-full" style={{ width: `${pct}%` }} /></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {projTasks.length} tasks</span>
                    {p.due_date && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {format(parseISO(p.due_date), "MMM d")}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_app/projects")({ component: ProjectsPage });
