import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { PROJECT_STATUSES } from "@/lib/pm";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(1, "Required").max(120),
  description: z.string().max(2000).optional(),
  status: z.enum(["not_started", "in_progress", "completed"]),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
}).refine((d) => !d.start_date || !d.end_date || d.end_date >= d.start_date, {
  path: ["end_date"], message: "End date must be after start date",
});

type FormValues = z.infer<typeof schema>;

export function ProjectFormDialog({
  open, onOpenChange, project,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  project?: { id: string; name: string; description: string | null; status: string; start_date: string | null; end_date: string | null };
}) {
  const qc = useQueryClient();
  const editing = !!project;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", description: "", status: "not_started", start_date: "", end_date: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: project?.name ?? "",
        description: project?.description ?? "",
        status: (project?.status as any) ?? "not_started",
        start_date: project?.start_date ?? "",
        end_date: project?.end_date ?? "",
      });
    }
  }, [open, project, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        name: values.name,
        description: values.description || null,
        status: values.status,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
      };
      if (editing) {
        const { error } = await supabase.from("projects").update(payload).eq("id", project!.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("projects").insert({ ...payload, user_id: u.user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (project) qc.invalidateQueries({ queryKey: ["project", project.id] });
      toast.success(editing ? "Project updated" : "Project created");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Something went wrong"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update your project details." : "Create a new project to organize your tasks."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Project name</Label>
            <Input {...form.register("name")} placeholder="e.g. Website redesign" />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea {...form.register("description")} rows={3} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.watch("status")}
              onValueChange={(v) => form.setValue("status", v as any)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input type="date" {...form.register("start_date")} />
            </div>
            <div className="space-y-1.5">
              <Label>End date</Label>
              <Input type="date" {...form.register("end_date")} />
              {form.formState.errors.end_date && (
                <p className="text-xs text-destructive">{form.formState.errors.end_date.message}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
