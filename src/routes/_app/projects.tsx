import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, MoreVertical, Trash2, Users, Calendar, UserPlus, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useProjects, useTasks, useMembers, type MemberRow } from "@/hooks/useData";
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

function initials(m: MemberRow) {
  const s = m.full_name || m.email || "U";
  return s.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
}

function ManageMembersDialog({
  projectId,
  projectTitle,
  open,
  onOpenChange,
  members,
}: {
  projectId: string;
  projectTitle: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: MemberRow[];
}) {
  const qc = useQueryClient();
  const { data: assignments = [] } = useQuery({
    queryKey: ["project_members", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select("id, user_id")
        .eq("project_id", projectId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const assignedIds = useMemo(() => new Set(assignments.map((a) => a.user_id)), [assignments]);

  const add = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("project_members").insert({ project_id: projectId, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["project_members", projectId] }); toast.success("Member added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeAssignment = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from("project_members").delete().eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["project_members", projectId] }); toast.success("Member removed"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage members · {projectTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[420px] overflow-y-auto -mx-1 px-1">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No team members yet. Invite people from Team.</p>
          ) : members.map((m) => {
            const assignment = assignments.find((a) => a.user_id === m.id);
            const isAssigned = !!assignment;
            return (
              <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-8 w-8"><AvatarFallback className="text-xs gradient-primary text-primary-foreground">{initials(m)}</AvatarFallback></Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{m.full_name || m.email}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.email} · {m.role ?? "member"}</div>
                  </div>
                </div>
                {isAssigned ? (
                  <Button variant="ghost" size="sm" onClick={() => removeAssignment.mutate(assignment!.id)} disabled={removeAssignment.isPending}>
                    <X className="h-4 w-4" /> Remove
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => add.mutate(m.id)} disabled={add.isPending}>
                    <UserPlus className="h-4 w-4" /> Add
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectsPage() {
  const { isAdmin, user } = useAuth();
  const { data: projects = [], isLoading } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: members = [] } = useMembers();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [manageFor, setManageFor] = useState<{ id: string; title: string } | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { status: "active", priority: "medium" },
  });

  // Auto-include creator
  useEffect(() => {
    if (open && user && !selectedMemberIds.includes(user.id)) {
      setSelectedMemberIds((prev) => [...prev, user.id]);
    }
  }, [open, user]);

  const create = useMutation({
    mutationFn: async (v: Values) => {
      const { data: project, error } = await supabase.from("projects").insert({
        title: v.title,
        description: v.description || null,
        status: v.status,
        priority: v.priority,
        due_date: v.due_date || null,
        created_by: user?.id ?? null,
      }).select("id").single();
      if (error) throw error;
      if (selectedMemberIds.length > 0 && project) {
        const rows = selectedMemberIds.map((uid) => ({ project_id: project.id, user_id: uid }));
        const { error: mErr } = await supabase.from("project_members").insert(rows);
        if (mErr) throw mErr;
      }
    },
    onSuccess: () => {
      toast.success("Project created");
      qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      setSelectedMemberIds([]);
      form.reset({ status: "active", priority: "medium" });
    },
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

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

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
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSelectedMemberIds([]); }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Plus className="h-4 w-4" /> New project</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Team members</Label>
                      <span className="text-xs text-muted-foreground">{selectedMemberIds.length} selected</span>
                    </div>
                    <div className="rounded-lg border border-border/60 max-h-48 overflow-y-auto divide-y divide-border/60">
                      {members.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-3">No team members available.</p>
                      ) : members.map((m) => {
                        const checked = selectedMemberIds.includes(m.id);
                        const isMe = m.id === user?.id;
                        return (
                          <label key={m.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent/50 transition">
                            <Checkbox checked={checked} onCheckedChange={() => toggleMember(m.id)} />
                            <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px] gradient-primary text-primary-foreground">{initials(m)}</AvatarFallback></Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{m.full_name || m.email} {isMe && <span className="text-xs text-muted-foreground">(you)</span>}</div>
                              <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                            </div>
                          </label>
                        );
                      })}
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
                          <DropdownMenuItem onClick={() => setManageFor({ id: p.id, title: p.title })}><UserPlus className="mr-2 h-4 w-4" /> Manage members</DropdownMenuItem>
                          <DropdownMenuSeparator />
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
                  {isAdmin && (
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setManageFor({ id: p.id, title: p.title })}>
                      <UserPlus className="h-4 w-4" /> Manage members
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {manageFor && (
        <ManageMembersDialog
          projectId={manageFor.id}
          projectTitle={manageFor.title}
          open={!!manageFor}
          onOpenChange={(v) => { if (!v) setManageFor(null); }}
          members={members}
        />
      )}
    </div>
  );
}

export const Route = createFileRoute("/_app/projects")({ component: ProjectsPage });
