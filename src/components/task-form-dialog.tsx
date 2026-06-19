import { useEffect } from "react";
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
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/pm";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(1, "Required").max(160),
  description: z.string().max(2000).optional(),
  status: z.enum(["pending", "in_progress", "completed"]),
  priority: z.enum(["low", "medium", "high"]),
  due_date: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function TaskFormDialog({
  open, onOpenChange, projectId, task,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  task?: { id: string; name: string; description: string | null; status: string; priority: string; due_date: string | null } | null;
}) {
  const qc = useQueryClient();
  const editing = !!task;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", description: "", status: "pending", priority: "medium", due_date: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: task?.name ?? "",
        description: task?.description ?? "",
        status: (task?.status as any) ?? "pending",
        priority: (task?.priority as any) ?? "medium",
        due_date: task?.due_date ?? "",
      });
    }
  }, [open, task, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        name: values.name,
        description: values.description || null,
        status: values.status,
        priority: values.priority,
        due_date: values.due_date || null,
      };
      if (editing) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", task!.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("tasks").insert({
          ...payload, project_id: projectId, user_id: u.user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(editing ? "Task updated" : "Task created");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Something went wrong"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update task details." : "Add a task to this project."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Task name</Label>
            <Input {...form.register("name")} placeholder="e.g. Design landing page" />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea {...form.register("description")} rows={3} placeholder="Optional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.watch("priority")} onValueChange={(v) => form.setValue("priority", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Due date</Label>
            <Input type="date" {...form.register("due_date")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
