import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Plus, Search, MoreHorizontal, Pencil, Trash2, Calendar,
} from "lucide-react";
import {
  PROJECT_STATUSES, TASK_STATUSES, TASK_PRIORITIES,
  projectStatusClasses, taskStatusClasses, priorityClasses, statusLabel,
} from "@/lib/pm";
import { ProjectFormDialog } from "@/components/project-form-dialog";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projects/$id")({
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [taskOpen, setTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editProject, setEditProject] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const project = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const tasks = useQuery({
    queryKey: ["tasks", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks").select("*").eq("project_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleTask = useMutation({
    mutationFn: async (t: { id: string; status: string }) => {
      const newStatus = t.status === "completed" ? "pending" : "completed";
      const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", id] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", id] });
      toast.success("Task deleted");
    },
  });

  const deleteProject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
      navigate({ to: "/projects" });
    },
  });

  const filteredTasks = (tasks.data ?? []).filter((t) => {
    const ms = t.name.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === "all" || t.status === statusFilter;
    const mp = priorityFilter === "all" || t.priority === priorityFilter;
    return ms && mst && mp;
  });

  if (project.isLoading) {
    return <div className="p-6 lg:p-8 max-w-6xl mx-auto"><Skeleton className="h-8 w-1/3" /></div>;
  }
  if (project.error || !project.data) {
    return (
      <div className="p-12 text-center">
        <p className="font-medium">Project not found</p>
        <Link to="/projects" className="text-sm text-primary hover:underline mt-2 inline-block">Back to projects</Link>
      </div>
    );
  }

  const p = project.data;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Projects
      </Link>

      <div className="mt-3 flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
            <Badge variant="outline" className={projectStatusClasses(p.status)}>
              {statusLabel(PROJECT_STATUSES, p.status)}
            </Badge>
          </div>
          {p.description && <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{p.description}</p>}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
            {p.start_date && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Start: {new Date(p.start_date).toLocaleDateString()}</span>}
            {p.end_date && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> End: {new Date(p.end_date).toLocaleDateString()}</span>}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditProject(true)}>
              <Pencil className="h-4 w-4" /> Edit project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setConfirmDelete(true)} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4" /> Delete project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-base font-medium">Tasks</h2>
        <Button size="sm" onClick={() => { setEditingTask(null); setTaskOpen(true); }}>
          <Plus className="h-4 w-4" /> New task
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mt-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {TASK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {TASK_PRIORITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 rounded-lg border bg-card divide-y">
        {tasks.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="p-4"><Skeleton className="h-5 w-1/3" /></div>)
        ) : filteredTasks.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {tasks.data?.length === 0 ? "No tasks yet. Add your first task." : "No tasks match the filters."}
          </div>
        ) : (
          filteredTasks.map((t) => (
            <div key={t.id} className="p-4 flex items-start gap-3 hover:bg-accent/40 transition-colors">
              <Checkbox
                checked={t.status === "completed"}
                onCheckedChange={() => toggleTask.mutate(t)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-medium ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                    {t.name}
                  </p>
                  <Badge variant="outline" className={priorityClasses(t.priority)}>{statusLabel(TASK_PRIORITIES, t.priority)}</Badge>
                  <Badge variant="outline" className={taskStatusClasses(t.status)}>{statusLabel(TASK_STATUSES, t.status)}</Badge>
                </div>
                {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
                {t.due_date && (
                  <p className="text-xs text-muted-foreground mt-1.5 inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Due {new Date(t.due_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setEditingTask(t); setTaskOpen(true); }}>
                    <Pencil className="h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => deleteTask.mutate(t.id)} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>

      <ProjectFormDialog open={editProject} onOpenChange={setEditProject} project={p} />
      <TaskFormDialog
        open={taskOpen}
        onOpenChange={(o) => { setTaskOpen(o); if (!o) setEditingTask(null); }}
        projectId={id}
        task={editingTask}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the project and all of its tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProject.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
