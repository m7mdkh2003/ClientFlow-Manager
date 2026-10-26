import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  CheckCheck,
  Circle,
  CircleDashed,
  Clock3,
  Download,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import type {
  Client,
  Dashboard,
  Project,
  Task,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  dateKey,
  dateLabel,
  downloadCsv,
  dueState,
  emptyTaskFilters,
  filterTasks,
  initials,
  statusLabel,
  statusTone,
  type EditorState,
  type Kind,
  type RecordValue,
  type TaskFilters,
} from "@/lib/workspace";

type EditorAction = (editor: EditorState) => void;
type DeleteAction = (kind: Kind, record: RecordValue) => void;
type MoveAction = (task: Task, status: Task["status"]) => void;
type PageState = {
  loading: boolean;
  error: boolean;
  retry: () => void;
  readOnly?: boolean;
  embedded?: boolean;
};
type SearchState = { search: string; setSearch: (value: string) => void };

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function LoadingState() {
  return (
    <div
      className="skeleton-grid"
      aria-label="Loading content"
      data-testid="status-loading"
    >
      <div className="skeleton skeleton-wide" />
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton skeleton-table" />
    </div>
  );
}
export function ErrorState({ retry }: { retry: () => void }) {
  return (
    <div className="state-panel error-panel" data-testid="status-error">
      <div className="state-icon">
        <Activity size={20} />
      </div>
      <h3>We couldn’t load this just yet</h3>
      <p>
        Give it another try. Your saved records will appear when the connection
        returns.
      </p>
      <Button variant="outline" onClick={retry} data-testid="button-retry">
        Try again
      </Button>
    </div>
  );
}
export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="state-panel" data-testid="status-empty">
      <div className="empty-symbol">
        <CircleDashed size={24} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="search-box">
      <Search size={16} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        data-testid="input-search"
      />
    </label>
  );
}
export function AddButton({
  label,
  onClick,
  testId,
}: {
  label: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <Button onClick={onClick} className="add-button" data-testid={testId}>
      <Plus size={16} />
      {label}
    </Button>
  );
}
function ExportButton({
  kind,
  rows,
}: {
  kind: string;
  rows: Parameters<typeof downloadCsv>[1];
}) {
  return (
    <Button
      variant="outline"
      onClick={() => downloadCsv(`clientflow-${kind}-${dateKey()}.csv`, rows)}
      disabled={rows.length < 2}
      data-testid={`button-export-${kind}`}
    >
      <Download size={15} />
      Export CSV
    </Button>
  );
}
function MetricCard({
  label,
  value,
  icon,
  detail,
  tone,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  detail: string;
  tone: string;
}) {
  return (
    <div
      className={`metric-card ${tone}`}
      data-testid={`metric-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <div className="metric-value">{value.toString().padStart(2, "0")}</div>
      <div className="metric-detail">{detail}</div>
    </div>
  );
}

export function DashboardPage({
  dashboard,
  tasks = [],
  loading,
  error,
  retry,
  openEditor,
  onMoveTask,
  readOnly = false,
}: PageState & {
  dashboard?: Dashboard;
  tasks?: Task[];
  openEditor: EditorAction;
  onMoveTask: MoveAction;
}) {
  const [, setLocation] = useLocation();
  if (loading) return <LoadingState />;
  if (error || !dashboard) return <ErrorState retry={retry} />;
  const { todo, in_progress: inProgress, done } = dashboard.taskCounts;
  const allTasks = todo + inProgress + done;
  const progress = allTasks ? Math.round((done / allTasks) * 100) : 0;
  const overdue = tasks.filter((task) => dueState(task) === "overdue");
  const dueToday = tasks.filter((task) => dueState(task) === "today");
  const upcoming = tasks
    .filter((task) => ["today", "upcoming"].includes(dueState(task)))
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
    .slice(0, 5);
  const firstKind: Kind = !dashboard.clientCount
    ? "client"
    : !dashboard.projectCount
      ? "project"
      : "task";
  const firstLabel =
    firstKind === "client"
      ? "Add your first client"
      : firstKind === "project"
        ? "Start a project"
        : "New task";
  return (
    <>
      <PageHeading
        eyebrow={new Intl.DateTimeFormat("en", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }).format(new Date())}
        title="Your work, at a glance."
        description="Clients, deadlines, and the next steps that need your attention."
        action={
          !readOnly && (
            <AddButton
              label={firstLabel}
              onClick={() => openEditor({ kind: firstKind })}
              testId={`button-create-${firstKind}`}
            />
          )
        }
      />
      {!readOnly && allTasks === 0 && (
        <section
          className="onboarding-panel"
          aria-label="Get started"
          data-testid="onboarding"
        >
          <h2>Set up your workspace in three steps</h2>
          <ol>
            <li className={dashboard.clientCount ? "step-done" : ""}>
              <span>1</span>
              <div>
                <strong>Add a client</strong>
                <p>Keep their contact details together.</p>
                <Button
                  variant="outline"
                  onClick={() => openEditor({ kind: "client" })}
                  data-testid="button-onboarding-client"
                >
                  {dashboard.clientCount
                    ? "Add another client"
                    : "Add your first client"}
                </Button>
              </div>
            </li>
            <li className={dashboard.projectCount ? "step-done" : ""}>
              <span>2</span>
              <div>
                <strong>Create their project</strong>
                <p>Choose the client and set a deadline.</p>
                <Button
                  variant="outline"
                  disabled={!dashboard.clientCount}
                  onClick={() => openEditor({ kind: "project" })}
                  data-testid="button-onboarding-project"
                >
                  Create a project
                </Button>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Add the next task</strong>
                <p>Connect a task to the project.</p>
                <Button
                  variant="outline"
                  disabled={!dashboard.projectCount}
                  onClick={() => openEditor({ kind: "task" })}
                  data-testid="button-onboarding-task"
                >
                  Add a task
                </Button>
              </div>
            </li>
          </ol>
        </section>
      )}
      <section className="metric-row" aria-label="Workspace summary">
        <MetricCard
          label="Clients"
          value={dashboard.clientCount}
          icon={<Users size={17} />}
          detail="client relationships"
          tone="mint"
        />
        <MetricCard
          label="Projects"
          value={dashboard.projectCount}
          icon={<BriefcaseBusiness size={17} />}
          detail={`${dashboard.activeProjectCount} active right now`}
          tone="peach"
        />
        <MetricCard
          label="To do"
          value={todo}
          icon={<Circle size={17} />}
          detail={`${inProgress} already underway`}
          tone="lavender"
        />
        <MetricCard
          label="Completed"
          value={done}
          icon={<CheckCheck size={17} />}
          detail={`${progress}% of all tasks`}
          tone="gold"
        />
      </section>
      <section className="deadline-summary" aria-label="Task deadlines">
        <div className={overdue.length ? "deadline-overdue" : ""}>
          <strong data-testid="count-overdue">{overdue.length}</strong>
          <span>Overdue</span>
        </div>
        <div>
          <strong data-testid="count-today">{dueToday.length}</strong>
          <span>Due today</span>
        </div>
        <div>
          <strong>
            {tasks.filter((task) => dueState(task) === "upcoming").length}
          </strong>
          <span>Upcoming</span>
        </div>
      </section>
      {overdue.length > 0 && (
        <section className="panel attention-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">NEEDS ATTENTION</span>
              <h2>Past the due date</h2>
            </div>
            <Link href="/tasks" className="quiet-link">
              View tasks <ArrowRight size={14} />
            </Link>
          </div>
          {overdue.slice(0, 3).map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onMoveTask={onMoveTask}
              readOnly={readOnly}
            />
          ))}
        </section>
      )}
      <div className="dashboard-lower">
        <section className="panel upcoming-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">THE NEAR HORIZON</span>
              <h2>Coming up</h2>
            </div>
            <Link
              href="/tasks"
              className="quiet-link"
              data-testid="link-all-tasks"
            >
              All tasks <ArrowRight size={14} />
            </Link>
          </div>
          {upcoming.length ? (
            <div className="upcoming-list">
              {upcoming.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onMoveTask={onMoveTask}
                  compact
                  readOnly={readOnly}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No upcoming deadlines"
              text="Tasks with a due date of today or later appear here. Overdue tasks are shown separately."
            />
          )}
        </section>
        <section className="panel focus-panel">
          <div className="focus-header">
            <span className="eyebrow">WORKSPACE PROGRESS</span>
            <Activity size={17} />
          </div>
          <h2>
            One step
            <br />
            at a time.
          </h2>
          <p>See how much of your current task list is complete.</p>
          <div className="progress-caption">
            <span>Task completion</span>
            <strong>{progress}%</strong>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Task completion"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-foot">
            <span>{done} finished</span>
            <span>{allTasks} total tasks</span>
          </div>
          <div className="focus-bottom">
            <ArrowUpRight size={17} />
            <span>{inProgress} tasks in progress</span>
          </div>
        </section>
      </div>
      {!readOnly && (
        <section className="quick-actions">
          <span className="eyebrow">QUICK ACTIONS</span>
          <div className="quick-grid">
            <button
              onClick={() => openEditor({ kind: "client" })}
              className="quick-action"
              data-testid="button-quick-client"
            >
              <Users size={17} />
              <strong>Add a client</strong>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => openEditor({ kind: "project" })}
              className="quick-action"
              data-testid="button-quick-project"
            >
              <BriefcaseBusiness size={17} />
              <strong>Start a project</strong>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => setLocation("/tasks")}
              className="quick-action"
              data-testid="button-quick-task"
            >
              <CheckCheck size={17} />
              <strong>View your tasks</strong>
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}
    </>
  );
}

export function ClientsPage({
  clients,
  loading,
  error,
  retry,
  openEditor,
  onDelete,
  search,
  setSearch,
  readOnly = false,
}: PageState &
  SearchState & {
    clients: Client[];
    openEditor: EditorAction;
    onDelete: DeleteAction;
  }) {
  return (
    <>
      <PageHeading
        eyebrow="RELATIONSHIPS"
        title="Clients"
        description="Contact details, notes, and a direct path to each client’s projects."
        action={
          <div className="heading-actions">
            <ExportButton
              kind="clients"
              rows={[
                ["Name", "Company", "Email", "Phone", "Notes"],
                ...clients.map((c) => [
                  c.name,
                  c.company,
                  c.email,
                  c.phone,
                  c.notes,
                ]),
              ]}
            />
            {!readOnly && (
              <AddButton
                label="Add client"
                onClick={() => openEditor({ kind: "client" })}
                testId="button-create-client"
              />
            )}
          </div>
        }
      />
      <div className="toolbar">
        <div className="list-intro">
          <strong>{clients.length}</strong>{" "}
          {clients.length === 1 ? "client" : "clients"}
        </div>
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search clients"
        />
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState retry={retry} />
      ) : clients.length ? (
        <div className="client-grid">
          {clients.map((client, index) => (
            <article
              className={`client-card client-card-${index % 4}`}
              key={client.id}
              data-testid={`card-client-${client.id}`}
            >
              <div className="client-card-top">
                <div className={`client-avatar avatar-${index % 4}`}>
                  {initials(client.name)}
                </div>
                {!readOnly && (
                  <button
                    className="icon-button"
                    title={`Edit ${client.name}`}
                    onClick={() =>
                      openEditor({ kind: "client", record: client })
                    }
                    data-testid={`button-edit-client-${client.id}`}
                  >
                    <Pencil size={15} />
                  </button>
                )}
              </div>
              <h3 data-testid={`text-client-name-${client.id}`}>
                <Link
                  href={`/clients/${client.id}`}
                  data-testid={`link-client-${client.id}`}
                >
                  {client.name}
                </Link>
              </h3>
              <p className="client-company">
                {client.company || "Independent client"}
              </p>
              <div className="client-contact">
                {client.email && (
                  <a href={`mailto:${client.email}`}>{client.email}</a>
                )}
                {client.phone && <span>{client.phone}</span>}
                {!client.email && !client.phone && (
                  <span>No contact details yet</span>
                )}
              </div>
              {client.notes && <p className="client-note">{client.notes}</p>}
              <div className="client-card-footer">
                <Link href={`/clients/${client.id}`} className="quiet-link">
                  View details <ArrowRight size={13} />
                </Link>
                {!readOnly && (
                  <button
                    className="delete-link"
                    onClick={() => onDelete("client", client)}
                    data-testid={`button-delete-client-${client.id}`}
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={search ? "No clients found" : "Add your first client"}
          text={
            search
              ? "Try another name, company, or email."
              : "Start with a client, then create their projects and tasks."
          }
          action={
            !search &&
            !readOnly && (
              <AddButton
                label="Add your first client"
                onClick={() => openEditor({ kind: "client" })}
                testId="button-empty-create-client"
              />
            )
          }
        />
      )}
    </>
  );
}

export function ProjectsPage({
  projects,
  loading,
  error,
  retry,
  openEditor,
  onDelete,
  search,
  setSearch,
  readOnly = false,
  embedded = false,
}: PageState &
  SearchState & {
    projects: Project[];
    openEditor: EditorAction;
    onDelete: DeleteAction;
  }) {
  const actions = (
    <div className="heading-actions">
      <ExportButton
        kind="projects"
        rows={[
          ["Project", "Client", "Status", "Deadline", "Description"],
          ...projects.map((p) => [
            p.name,
            p.clientName,
            p.status,
            p.deadline?.slice(0, 10),
            p.description,
          ]),
        ]}
      />
      {!readOnly && (
        <AddButton
          label="New project"
          onClick={() => openEditor({ kind: "project" })}
          testId="button-create-project"
        />
      )}
    </div>
  );
  return (
    <>
      {!embedded ? (
        <PageHeading
          eyebrow="THE WORK ITSELF"
          title="Projects"
          description="Open a project to see its tasks, deadlines, and progress."
          action={actions}
        />
      ) : (
        <div className="section-heading">
          <h2>Projects</h2>
          {actions}
        </div>
      )}
      <div className="toolbar">
        <div className="list-intro">
          <strong>{projects.length}</strong> projects <span>·</span>{" "}
          {projects.filter((p) => p.status === "active").length} active
        </div>
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search projects"
        />
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState retry={retry} />
      ) : projects.length ? (
        <div className="project-list">
          {projects.map((project, index) => (
            <article
              className="project-row"
              key={project.id}
              data-testid={`row-project-${project.id}`}
            >
              <div
                className={`project-index project-index-${index % 4}`}
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="project-main">
                <div className="project-title-line">
                  <h3>
                    <Link
                      href={`/projects/${project.id}`}
                      data-testid={`link-project-${project.id}`}
                    >
                      {project.name}
                    </Link>
                  </h3>
                  <span className={`status-pill ${statusTone(project.status)}`}>
                    {statusLabel(project.status)}
                  </span>
                </div>
                <p>{project.description || "No project description added."}</p>
                <Link
                  href={`/clients/${project.clientId}`}
                  className="project-client-line"
                >
                  <span className="tiny-avatar">
                    {initials(project.clientName)}
                  </span>
                  {project.clientName}
                </Link>
              </div>
              <div className="project-deadline">
                <span>DEADLINE</span>
                <strong>{dateLabel(project.deadline)}</strong>
              </div>
              {!readOnly && (
                <div className="row-actions">
                  <button
                    className="icon-button"
                    title={`Edit ${project.name}`}
                    onClick={() =>
                      openEditor({ kind: "project", record: project })
                    }
                    data-testid={`button-edit-project-${project.id}`}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-button danger-hover"
                    title={`Delete ${project.name}`}
                    onClick={() => onDelete("project", project)}
                    data-testid={`button-delete-project-${project.id}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={search ? "No projects found" : "Create a project"}
          text={
            search
              ? "Try a different project or client name."
              : "Choose a client and give their work a name and deadline."
          }
          action={
            !search &&
            !readOnly && (
              <AddButton
                label="Create a project"
                onClick={() => openEditor({ kind: "project" })}
                testId="button-empty-create-project"
              />
            )
          }
        />
      )}
    </>
  );
}

export function TasksPage({
  tasks,
  projects = [],
  clients = [],
  loading,
  error,
  retry,
  openEditor,
  onDelete,
  onMoveTask,
  search,
  setSearch,
  readOnly = false,
  embedded = false,
}: PageState &
  SearchState & {
    tasks: Task[];
    projects?: Project[];
    clients?: Client[];
    openEditor: EditorAction;
    onDelete: DeleteAction;
    onMoveTask: MoveAction;
  }) {
  const [filters, setFilters] = useState<TaskFilters>({ ...emptyTaskFilters });
  const visible = filterTasks(tasks, projects, filters);
  const filtered =
    Object.entries(filters).some(
      ([key, value]) => value !== emptyTaskFilters[key as keyof TaskFilters],
    ) || Boolean(search);
  const updateFilter = (key: keyof TaskFilters, value: string) =>
    setFilters((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "clientId" ? { projectId: "all" } : {}),
    }));
  const reset = () => {
    setFilters({ ...emptyTaskFilters });
    setSearch("");
  };
  const actions = (
    <div className="heading-actions">
      <ExportButton
        kind="tasks"
        rows={[
          [
            "Task",
            "Project",
            "Client",
            "Status",
            "Priority",
            "Due date",
            "Description",
          ],
          ...visible.map((t) => [
            t.title,
            t.projectName,
            t.clientName,
            t.status,
            t.priority,
            t.dueDate?.slice(0, 10),
            t.description,
          ]),
        ]}
      />
      {!readOnly && (
        <AddButton
          label="Add task"
          onClick={() => openEditor({ kind: "task" })}
          testId="button-create-task"
        />
      )}
    </div>
  );
  return (
    <>
      {!embedded ? (
        <PageHeading
          eyebrow="TODAY, AND WHAT’S NEXT"
          title="Tasks"
          description="Filter by client, project, priority, or deadline to find your next step."
          action={actions}
        />
      ) : (
        <div className="section-heading">
          <h2>Project tasks</h2>
          {actions}
        </div>
      )}
      <div className="task-summary-strip">
        <span>
          <Circle size={15} />
          {visible.filter((t) => t.status === "todo").length} to do
        </span>
        <span>
          <Clock3 size={15} />
          {visible.filter((t) => t.status === "in_progress").length} in progress
        </span>
        <span>
          <CheckCheck size={15} />
          {visible.filter((t) => t.status === "done").length} done
        </span>
        <div className="summary-search">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search tasks"
          />
        </div>
      </div>
      <div className="task-filters" aria-label="Task filters">
        {!embedded && (
          <>
            <label>
              Client
              <select
                value={filters.clientId}
                onChange={(e) => updateFilter("clientId", e.target.value)}
                data-testid="filter-client"
              >
                <option value="all">All clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Project
              <select
                value={filters.projectId}
                onChange={(e) => updateFilter("projectId", e.target.value)}
                data-testid="filter-project"
              >
                <option value="all">All projects</option>
                {projects
                  .filter(
                    (p) =>
                      filters.clientId === "all" ||
                      String(p.clientId) === filters.clientId,
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
          </>
        )}
        <label>
          Priority
          <select
            value={filters.priority}
            onChange={(e) => updateFilter("priority", e.target.value)}
            data-testid="filter-priority"
          >
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label>
          Deadline
          <select
            value={filters.due}
            onChange={(e) => updateFilter("due", e.target.value)}
            data-testid="filter-due"
          >
            <option value="all">Any deadline</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="week">Next 7 days</option>
            <option value="undated">No due date</option>
          </select>
        </label>
        <label>
          Sort by
          <select
            value={filters.sort}
            onChange={(e) => updateFilter("sort", e.target.value)}
            data-testid="filter-sort"
          >
            <option value="due">Due date</option>
            <option value="priority">Priority</option>
            <option value="newest">Newest first</option>
          </select>
        </label>
        {filtered && (
          <Button
            variant="outline"
            onClick={reset}
            data-testid="button-reset-filters"
          >
            Reset filters
          </Button>
        )}
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState retry={retry} />
      ) : visible.length ? (
        <TaskBoard
          tasks={visible}
          openEditor={openEditor}
          onDelete={onDelete}
          onMoveTask={onMoveTask}
          readOnly={readOnly}
        />
      ) : (
        <EmptyState
          title={filtered ? "No matching tasks" : "Add your first task"}
          text={
            filtered
              ? "Try another filter or reset your search."
              : "Create a task and connect it to a project."
          }
          action={
            filtered ? (
              <Button
                variant="outline"
                onClick={reset}
                data-testid="button-empty-reset-filters"
              >
                Reset filters
              </Button>
            ) : (
              !readOnly && (
                <AddButton
                  label="Add your first task"
                  onClick={() => openEditor({ kind: "task" })}
                  testId="button-empty-create-task"
                />
              )
            )
          }
        />
      )}
    </>
  );
}
export function TaskBoard({
  tasks,
  openEditor,
  onDelete,
  onMoveTask,
  readOnly = false,
}: {
  tasks: Task[];
  openEditor: EditorAction;
  onDelete: DeleteAction;
  onMoveTask: MoveAction;
  readOnly?: boolean;
}) {
  const statuses: Task["status"][] = ["todo", "in_progress", "done"];
  return (
    <div className="task-columns">
      {statuses.map((status) => (
        <section
          className="task-column"
          key={status}
          data-testid={`column-tasks-${status}`}
        >
          <div className="task-column-heading">
            <span className={`column-mark mark-${status}`} />
            <h2>{statusLabel(status)}</h2>
            <span className="column-count">
              {tasks.filter((t) => t.status === status).length}
            </span>
          </div>
          <div className="task-column-list">
            {tasks.filter((t) => t.status === status).length ? (
              tasks
                .filter((t) => t.status === status)
                .map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() => openEditor({ kind: "task", record: task })}
                    onDelete={() => onDelete("task", task)}
                    onMoveTask={onMoveTask}
                    readOnly={readOnly}
                  />
                ))
            ) : (
              <div className="column-empty">No tasks here.</div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
export function TaskRow({
  task,
  onMoveTask,
  compact = false,
  readOnly = false,
}: {
  task: Task;
  onMoveTask: MoveAction;
  compact?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div
      className={`task-row ${compact ? "task-row-compact" : ""}`}
      data-testid={`row-task-${task.id}`}
    >
      <button
        className={`task-check ${task.status === "done" ? "task-checked" : ""}`}
        aria-label={`Mark ${task.title} ${task.status === "done" ? "to do" : "complete"}`}
        disabled={readOnly}
        onClick={() =>
          onMoveTask(task, task.status === "done" ? "todo" : "done")
        }
        data-testid={`button-advance-task-${task.id}`}
      >
        {task.status === "done" ? <Check size={13} /> : <span />}
      </button>
      <div className="task-row-content">
        <strong>{task.title}</strong>
        <Link href={`/projects/${task.projectId}`}>
          {task.projectName} · {task.clientName}
        </Link>
      </div>
      <DueLabel task={task} />
    </div>
  );
}
function DueLabel({ task }: { task: Task }) {
  const state = dueState(task);
  return (
    <span className={`task-due due-${state}`}>
      <Clock3 size={12} />
      {state === "overdue" ? "Overdue · " : state === "today" ? "Today · " : ""}
      {task.dueDate ? dateLabel(task.dueDate) : "No due date"}
    </span>
  );
}
function TaskCard({
  task,
  onEdit,
  onDelete,
  onMoveTask,
  readOnly = false,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onMoveTask: MoveAction;
  readOnly?: boolean;
}) {
  const next =
    task.status === "todo"
      ? "in_progress"
      : task.status === "in_progress"
        ? "done"
        : "todo";
  return (
    <article className="task-card" data-testid={`card-task-${task.id}`}>
      <div className="task-card-top">
        <span className={`priority-tag priority-${task.priority}`}>
          <i />
          {task.priority} priority
        </span>
        {!readOnly && (
          <div className="row-actions">
            <button
              className="icon-button"
              title="Edit task"
              onClick={onEdit}
              data-testid={`button-edit-task-${task.id}`}
            >
              <Pencil size={14} />
            </button>
            <button
              className="icon-button danger-hover"
              title="Delete task"
              onClick={onDelete}
              data-testid={`button-delete-task-${task.id}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
      <h3 data-testid={`text-task-title-${task.id}`}>{task.title}</h3>
      {task.description && (
        <p className="task-description">{task.description}</p>
      )}
      <Link
        href={`/projects/${task.projectId}`}
        className="task-linked-project"
      >
        <FileText size={13} />
        <span>{task.projectName}</span>
      </Link>
      <div className="task-card-footer">
        <div className="task-owner">
          <span className="tiny-avatar">{initials(task.clientName)}</span>
          {task.clientName}
        </div>
        <DueLabel task={task} />
      </div>
      {!readOnly && (
        <button
          className="task-move"
          onClick={() => onMoveTask(task, next)}
          data-testid={`button-move-task-${task.id}`}
        >
          <span>
            {task.status === "done"
              ? "Reopen task"
              : task.status === "todo"
                ? "Start this task"
                : "Mark complete"}
          </span>
          <ArrowRight size={14} />
        </button>
      )}
    </article>
  );
}
