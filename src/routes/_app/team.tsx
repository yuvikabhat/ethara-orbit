import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useMembers, useTasks } from "@/hooks/useData";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

function initials(s?: string | null) {
  return (s || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function TeamPage() {
  const { isAdmin, user } = useAuth();
  const { data: members = [], isLoading } = useMembers();
  const { data: tasks = [] } = useTasks();
  const qc = useQueryClient();

  const workload = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    for (const t of tasks) {
      if (!t.assigned_to) continue;
      const cur = map.get(t.assigned_to) ?? { total: 0, done: 0 };
      cur.total++;
      if (t.status === "completed") cur.done++;
      map.set(t.assigned_to, cur);
    }
    return map;
  }, [tasks]);

  const changeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "member" }) => {
      // Delete existing roles, insert new — simplest approach with our unique constraint
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["members"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">{members.length} members in your workspace</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-card animate-pulse" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {members.map((m) => {
            const w = workload.get(m.id) ?? { total: 0, done: 0 };
            const pct = w.total ? Math.round((w.done / w.total) * 100) : 0;
            return (
              <Card key={m.id} className="shadow-card border-border/60">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarFallback className="gradient-primary text-primary-foreground font-semibold">{initials(m.full_name || m.email)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{m.full_name || "Unnamed"}</h3>
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">{m.role || "—"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{m.email}</p>
                      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{w.total} tasks</span>
                        <span>·</span>
                        <span>{w.done} done</span>
                        <span>·</span>
                        <span className="text-primary font-medium">{pct}%</span>
                      </div>
                    </div>
                  </div>

                  {isAdmin && m.id !== user?.id && (
                    <div className="mt-4 pt-4 border-t border-border/60">
                      <Select value={m.role ?? "member"} onValueChange={(v) => changeRole.mutate({ userId: m.id, role: v as any })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_app/team")({ component: TeamPage });
