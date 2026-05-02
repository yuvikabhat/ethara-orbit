import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: Props) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 mb-10">
            <div className="h-9 w-9 rounded-xl gradient-primary grid place-items-center shadow-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Ethara</span>
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>

      {/* Right: brand panel */}
      <div className="hidden lg:block relative overflow-hidden border-l border-border">
        <div className="absolute inset-0 gradient-primary opacity-30" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.72_0.2_310/0.5),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,oklch(0.68_0.18_220/0.4),transparent_50%)]" />
        <div className="relative h-full flex flex-col justify-end p-12">
          <blockquote className="text-2xl font-medium leading-snug text-foreground max-w-md">
            "Ethara replaced three tools and made our team faster. The cleanest project workspace we've ever used."
          </blockquote>
          <div className="mt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full gradient-primary grid place-items-center text-primary-foreground font-semibold">A</div>
            <div>
              <div className="font-medium">Alex Kim</div>
              <div className="text-sm text-muted-foreground">Head of Product, Northwind</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
