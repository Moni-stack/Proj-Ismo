export const PROJECT_STATUSES = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
] as const;

export const TASK_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
] as const;

export const TASK_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]["value"];
export type TaskStatus = (typeof TASK_STATUSES)[number]["value"];
export type TaskPriority = (typeof TASK_PRIORITIES)[number]["value"];

export function statusLabel<T extends { value: string; label: string }>(
  list: readonly T[],
  v: string,
) {
  return list.find((s) => s.value === v)?.label ?? v;
}

export function projectStatusClasses(status: string) {
  switch (status) {
    case "completed":
      return "bg-success/15 text-success border-success/30";
    case "in_progress":
      return "bg-primary/10 text-primary border-primary/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function taskStatusClasses(status: string) {
  switch (status) {
    case "completed":
      return "bg-success/15 text-success border-success/30";
    case "in_progress":
      return "bg-primary/10 text-primary border-primary/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function priorityClasses(p: string) {
  switch (p) {
    case "high":
      return "bg-destructive/10 text-destructive border-destructive/25";
    case "medium":
      return "bg-warning/15 text-warning-foreground border-warning/40";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
