import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  active: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-success/15 text-success border-success/30",
  on_hold: "bg-warning/15 text-warning border-warning/30",
  todo: "bg-muted text-muted-foreground border-border",
  in_progress: "bg-primary/15 text-primary border-primary/30",
  review: "bg-warning/15 text-warning border-warning/30",
};

const priorityStyles: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-primary/10 text-primary border-primary/30",
  high: "bg-warning/15 text-warning border-warning/30",
  urgent: "bg-destructive/15 text-destructive border-destructive/30",
};

const labels: Record<string, string> = {
  in_progress: "In progress",
  on_hold: "On hold",
  todo: "To do",
  review: "Review",
  completed: "Completed",
  active: "Active",
};

export function StatusBadge({ value }: { value: string }) {
  return <Badge variant="outline" className={cn("font-medium border", statusStyles[value] ?? "")}>{labels[value] ?? value}</Badge>;
}

export function PriorityBadge({ value }: { value: string }) {
  return <Badge variant="outline" className={cn("font-medium border capitalize", priorityStyles[value] ?? "")}>{value}</Badge>;
}
