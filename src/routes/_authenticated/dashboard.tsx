import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FolderKanban, CheckCircle2, Clock, ListTodo, Activity } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { projectStatusClasses, statusLabel, PROJECT_STATUSES } from "@/lib/pm";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [projects, tasks] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("tasks").select("status"),
      ]);
      if (projects.error) throw projects.error;
      if (tasks.error) throw tasks.error;
      return { projects: projects.data ?? [], tasks: tasks.data ?? [] };
    },
  });

  const stats = (() => {
    if (!data) return null;
    const totalProjects = data.projects.length;
    const totalTasks = data.tasks.length;
    const completedTasks = data.tasks.filter((t) => t.status === "completed").length;
    const pendingTasks = data.tasks.filter((t) => t.status === "pending").length;
    const inProgress = data.projects.filter((p) => p.status === "in_progress").length;
    return { totalProjects, totalTasks, completedTasks, pendingTasks, inProgress };
  })();

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your projects and tasks.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
        <StatCard icon={FolderKanban} label="Total Projects" value={stats?.totalProjects} loading={isLoading} />
        <StatCard icon={ListTodo} label="Total Tasks" value={stats?.totalTasks} loading={isLoading} />
        <StatCard icon={CheckCircle2} label="Completed Tasks" value={stats?.completedTasks} loading={isLoading} accent="success" />
        <StatCard icon={Clock} label="Pending Tasks" value={stats?.pendingTasks} loading={isLoading} accent="warning" />
        <StatCard icon={Activity} label="In Progress" value={stats?.inProgress} loading={isLoading} accent="primary" />
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">Recent projects</h2>
          <Link to="/projects" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        <div className="rounded-lg border bg-card divide-y">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4"><Skeleton className="h-5 w-1/3" /></div>
            ))
          ) : data?.projects.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No projects yet. <Link to="/projects" className="text-primary hover:underline">Create your first one</Link>.
            </div>
          ) : (
            data?.projects.slice(0, 5).map((p) => (
              <Link
                key={p.id}
                to="/projects/$id"
                params={{ id: p.id }}
                className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  {p.description && <p className="text-sm text-muted-foreground truncate">{p.description}</p>}
                </div>
                <Badge variant="outline" className={projectStatusClasses(p.status)}>
                  {statusLabel(PROJECT_STATUSES, p.status)}
                </Badge>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, loading, accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value?: number; loading?: boolean;
  accent?: "success" | "warning" | "primary";
}) {
  const accentClass =
    accent === "success" ? "text-success" :
    accent === "warning" ? "text-warning-foreground" :
    accent === "primary" ? "text-primary" : "text-foreground";
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accentClass}`} />
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">
        {loading ? <Skeleton className="h-7 w-12" /> : value ?? 0}
      </div>
    </div>
  );
}
