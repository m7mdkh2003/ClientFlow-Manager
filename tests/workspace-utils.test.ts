import { describe, expect, it } from "vitest";
import {
  dateInDays,
  dueState,
  emptyTaskFilters,
  filterTasks,
  toCsv,
} from "../artifacts/clientflow/src/lib/workspace";
import type { Project, Task } from "../lib/api-client-react/src";
const projects = [
  { id: 1, clientId: 11 },
  { id: 2, clientId: 22 },
] as Project[];
const task = (id: number, values: Partial<Task> = {}): Task => ({
  id,
  title: `Task ${id}`,
  projectId: 1,
  projectName: "Site",
  clientName: "Client",
  description: null,
  status: "todo",
  priority: "medium",
  dueDate: null,
  createdAt: "2026-10-01T00:00:00Z",
  ...values,
});
const tasks = [
  task(1, { dueDate: "2026-10-23", priority: "high" }),
  task(2, { dueDate: "2026-10-24" }),
  task(3, { dueDate: "2026-10-25", projectId: 2 }),
  task(4, { dueDate: "2026-10-20", status: "done" }),
  task(5),
];
describe("task deadlines and filters", () => {
  it("separates overdue, today, future and completed tasks", () => {
    expect(tasks.map((t) => dueState(t, "2026-10-24"))).toEqual([
      "overdue",
      "today",
      "upcoming",
      "none",
      "none",
    ]);
  });
  it("filters by client ID and project, rather than by a display name", () => {
    expect(
      filterTasks(
        tasks,
        projects,
        { ...emptyTaskFilters, clientId: "22" },
        "2026-10-24",
      ).map((t) => t.id),
    ).toEqual([3]);
    expect(
      filterTasks(
        tasks,
        projects,
        { ...emptyTaskFilters, projectId: "2", priority: "high" },
        "2026-10-24",
      ),
    ).toEqual([]);
  });
  it("shows unfinished overdue tasks and excludes undated tasks from this week", () => {
    expect(
      filterTasks(
        tasks,
        projects,
        { ...emptyTaskFilters, due: "overdue" },
        "2026-10-24",
      ).map((t) => t.id),
    ).toEqual([1]);
    expect(
      filterTasks(
        tasks,
        projects,
        { ...emptyTaskFilters, due: "week" },
        "2026-10-24",
      ).map((t) => t.id),
    ).toEqual([2, 3]);
    expect(
      filterTasks(
        tasks,
        projects,
        { ...emptyTaskFilters, due: "undated" },
        "2026-10-24",
      ).map((t) => t.id),
    ).toEqual([5]);
  });
  it("does not mutate the source list when sorting", () => {
    const ids = tasks.map((t) => t.id);
    filterTasks(
      tasks,
      projects,
      { ...emptyTaskFilters, sort: "priority" },
      "2026-10-24",
    );
    expect(tasks.map((t) => t.id)).toEqual(ids);
  });
  it("advances dates across the end of the year", () => {
    expect(dateInDays(2, new Date(2026, 11, 30, 12))).toBe("2027-01-01");
  });
});
it("exports Unicode, commas, quotes, newlines and formula-like content safely", () => {
  const csv = toCsv([
    ["Name", "Notes"],
    ["محمد", 'Hello, "world"\nAgain'],
    ["=SUM(A1:A2)", "@formula"],
  ]);
  expect(csv).toContain('"محمد","Hello, ""world""\nAgain"');
  expect(csv).toContain('"\'=SUM(A1:A2)"');
  expect(csv).toContain('"\'@formula"');
});
