import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, FolderKanban } from "lucide-react";
import { ProjectFormDialog } from "@/components/project-form-dialog";
import {
  PROJECT_STATUSES, projectStatusClasses, statusLabel,
} from "@/lib/pm";

export const Route = createFileRoute("/_authenticated/projects/")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, tasks(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (data ?? []).filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === "all" || p.status === status;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.length ?? 0} project{data?.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New project
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mt-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PROJECT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed bg-card p-12 text-center">
            <FolderKanban className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No projects found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {data?.length === 0 ? "Create your first project to get started." : "Try a different search or filter."}
            </p>
            {data?.length === 0 && (
              <Button className="mt-4" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" /> New project
              </Button>
            )}
          </div>
        ) : (
          filtered.map((p) => (
            <Link
              key={p.id}
              to="/projects/$id"
              params={{ id: p.id }}
              className="rounded-lg border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium leading-tight">{p.name}</h3>
                <Badge variant="outline" className={projectStatusClasses(p.status)}>
                  {statusLabel(PROJECT_STATUSES, p.status)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2 min-h-[2.5rem]">
                {p.description || "No description"}
              </p>
              <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                <span>{(p.tasks as { count: number }[] | null)?.[0]?.count ?? 0} tasks</span>
                {p.end_date && <span>Due {new Date(p.end_date).toLocaleDateString()}</span>}
              </div>
            </Link>
          ))
        )}
      </div>

      <ProjectFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
