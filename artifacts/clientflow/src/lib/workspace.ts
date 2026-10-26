import type { Client, Project, Task } from "@workspace/api-client-react";

export type Kind = "client" | "project" | "task";
export type RecordValue = Client | Project | Task;
export type EditorState = {
  kind: Kind;
  record?: RecordValue;
  defaults?: { clientId?: number; projectId?: number };
};

export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dateInDays(days: number, today = new Date()): string {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}
export const dateLabel = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(`${value.slice(0, 10)}T12:00:00`))
    : "No date set";
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
export const statusLabel = (status: string) =>
  status === "in_progress"
    ? "In progress"
    : status === "todo"
      ? "To do"
      : status.charAt(0).toUpperCase() + status.slice(1);
export const statusTone = (status: string) =>
  status === "active" || status === "in_progress"
    ? "tone-teal"
    : status === "completed" || status === "done"
      ? "tone-olive"
      : "tone-sand";

export function dueState(
  task: Pick<Task, "status" | "dueDate">,
  today = dateKey(),
): "overdue" | "today" | "upcoming" | "none" {
  if (task.status === "done" || !task.dueDate) return "none";
  const date = task.dueDate.slice(0, 10);
  return date < today ? "overdue" : date === today ? "today" : "upcoming";
}

export type TaskFilters = {
  projectId: string;
  clientId: string;
  priority: string;
  due: string;
  sort: string;
};
export const emptyTaskFilters: TaskFilters = {
  projectId: "all",
  clientId: "all",
  priority: "all",
  due: "all",
  sort: "due",
};
export function filterTasks(
  tasks: Task[],
  projects: Project[],
  filters: TaskFilters,
  today = dateKey(),
): Task[] {
  const clientByProject = new Map(
    projects.map((project) => [project.id, project.clientId]),
  );
  const weekEnd = dateInDays(7, new Date(`${today}T12:00:00`));
  const priorities = { high: 0, medium: 1, low: 2 };
  return tasks
    .filter((task) => {
      if (
        filters.projectId !== "all" &&
        String(task.projectId) !== filters.projectId
      )
        return false;
      if (
        filters.clientId !== "all" &&
        String(clientByProject.get(task.projectId)) !== filters.clientId
      )
        return false;
      if (filters.priority !== "all" && task.priority !== filters.priority)
        return false;
      if (filters.due === "overdue" && dueState(task, today) !== "overdue")
        return false;
      if (filters.due === "today" && dueState(task, today) !== "today")
        return false;
      if (filters.due === "undated" && task.dueDate) return false;
      if (
        filters.due === "week" &&
        (task.status === "done" ||
          !task.dueDate ||
          task.dueDate.slice(0, 10) < today ||
          task.dueDate.slice(0, 10) > weekEnd)
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      if (filters.sort === "priority")
        return (
          priorities[a.priority] - priorities[b.priority] ||
          (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")
        );
      if (filters.sort === "newest")
        return b.createdAt.localeCompare(a.createdAt) || b.id - a.id;
      return (
        (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
        priorities[a.priority] - priorities[b.priority] ||
        a.id - b.id
      );
    });
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = String(value ?? "");
            // Keep user-entered spreadsheet formulas as plain text on export.
            if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
            return `"${text.replaceAll('"', '""')}"`;
          })
          .join(","),
      )
      .join("\r\n")
  );
}
export function downloadCsv(
  filename: string,
  rows: Parameters<typeof toCsv>[0],
) {
  const url = URL.createObjectURL(
    new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
