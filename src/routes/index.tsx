import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  ShieldCheck,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Live Dashboard",
    description:
      "Get a real-time overview of all tasks, completion rates, and overdue items at a glance.",
  },
  {
    icon: FolderKanban,
    title: "Project Management",
    description:
      "Organise work into projects, invite team members, and track progress per project.",
  },
  {
    icon: CheckSquare,
    title: "Task Tracking",
    description:
      "Create tasks, set priorities and due dates, and move them through status stages instantly.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Invite colleagues, assign tasks to specific members, and manage team membership.",
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Access",
    description:
      "Admins control the workspace. Members work within their scope. Fine-grained permissions built in.",
  },
  {
    icon: BarChart3,
    title: "Progress Analytics",
    description:
      "Visual bar and pie charts show task distribution by status and per-project completion.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 mr-auto">
            <Logo size={30} className="shrink-0" />
            <span className="font-semibold tracking-tight">Ethara</span>
          </Link>
          <ThemeToggle />
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link to="/signup">
            <Button size="sm" className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              Get started
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,oklch(0.62_0.22_280/0.25),transparent)]" />
          </div>
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight">
              Ship faster with{" "}
              <span className="gradient-primary bg-clip-text text-transparent">
                team-wide clarity
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Ethara brings projects, tasks, and your team together in one
              workspace. Assign work, track progress, and hit every deadline
              — from day one.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/signup">
                <Button
                  size="lg"
                  className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90 h-12 px-8 text-base gap-2"
                >
                  Start for free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-base border-border/70 hover:bg-accent"
                >
                  Sign in to workspace
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-20 border-t border-border/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center">
              Everything your team needs
            </h2>
            <p className="mt-3 text-muted-foreground text-center max-w-xl mx-auto">
              Built around the way real teams work — no bloat, just the right
              tools at the right time.
            </p>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-border/60 bg-card p-6 shadow-card"
                >
                  <div className="h-10 w-10 rounded-xl gradient-primary grid place-items-center mb-4 shadow-glow">
                    <Icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-base">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA banner ── */}
        <section className="py-20 border-t border-border/40">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Ready to get organised?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Create your workspace in seconds. The first user becomes admin.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/signup">
                <Button
                  size="lg"
                  className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90 h-12 px-8 gap-2"
                >
                  Create free workspace <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo size={20} className="shrink-0" />
            <span>Ethara — Team Task Manager</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link to="/signup" className="hover:text-foreground transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) throw redirect({ to: "/dashboard" });
  },
  component: LandingPage,
});
