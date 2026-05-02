import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
});
const passwordSchema = z.object({
  password: z.string().min(8, "At least 8 characters").max(100),
});

function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const pf = useForm<{ full_name: string }>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: profile?.full_name || "" },
  });

  const pwf = useForm<{ password: string }>({ resolver: zodResolver(passwordSchema) });

  const saveProfile = async ({ full_name }: { full_name: string }) => {
    if (!profile) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ full_name }).eq("id", profile.id);
    setSavingProfile(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
    await refreshProfile();
  };

  const savePassword = async ({ password }: { password: string }) => {
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    pwf.reset();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile and account</p>
      </div>

      <Card className="shadow-card border-border/60">
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={pf.handleSubmit(saveProfile)} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email || ""} disabled className="opacity-60" />
            </div>
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input {...pf.register("full_name")} />
              {pf.formState.errors.full_name && <p className="text-xs text-destructive">{pf.formState.errors.full_name.message}</p>}
            </div>
            <Button type="submit" disabled={savingProfile} className="gradient-primary text-primary-foreground">
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-card border-border/60">
        <CardHeader><CardTitle className="text-base">Password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={pwf.handleSubmit(savePassword)} className="space-y-4">
            <div className="space-y-2">
              <Label>New password</Label>
              <Input type="password" autoComplete="new-password" {...pwf.register("password")} />
              {pwf.formState.errors.password && <p className="text-xs text-destructive">{pwf.formState.errors.password.message}</p>}
            </div>
            <Button type="submit" disabled={savingPassword} variant="outline">
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });
