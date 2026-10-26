import { Link } from "wouter";
import { ArrowLeft, Pencil } from "lucide-react";
import type { Client, Project, Task } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  AddButton,
  EmptyState,
  PageHeading,
  ProjectsPage,
  TasksPage,
} from "./workspace-pages";
import {
  dateLabel,
  statusLabel,
  statusTone,
  type EditorState,
  type Kind,
  type RecordValue,
} from "@/lib/workspace";

type DetailsProps = {
  search: string;
  setSearch: (value: string) => void;
  openEditor: (editor: EditorState) => void;
  onDelete: (kind: Kind, record: RecordValue) => void;
  readOnly?: boolean;
};
export function ClientDetail({
  client,
  projects,
  search,
  setSearch,
  openEditor,
  onDelete,
  readOnly = false,
}: DetailsProps & { client?: Client; projects: Project[] }) {
  if (!client)
    return (
      <EmptyState
        title="Client not found"
        text="This client may have been removed or may belong to another workspace."
        action={
          <Link href="/clients" className="quiet-link">
            Back to clients
          </Link>
        }
      />
    );
  const linked = projects.filter((project) => project.clientId === client.id);
  const matching = linked.filter((project) =>
    `${project.name} ${project.status}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const scopedEditor = (editor: EditorState) =>
    openEditor({
      ...editor,
      defaults: { ...editor.defaults, clientId: client.id },
    });
  return (
    <div data-testid={`detail-client-${client.id}`}>
      <Link href="/clients" className="back-link">
        <ArrowLeft size={15} />
        All clients
      </Link>
      <PageHeading
        eyebrow="CLIENT DETAILS"
        title={client.name}
        description={client.company || "Independent client"}
        action={
          !readOnly && (
            <Button
              variant="outline"
              onClick={() => openEditor({ kind: "client", record: client })}
              data-testid="button-edit-current-client"
            >
              <Pencil size={15} />
              Edit client
            </Button>
          )
        }
      />
      <section className="detail-panel" aria-label="Client information">
        <dl>
          <div>
            <dt>Email</dt>
            <dd>
              {client.email ? (
                <a href={`mailto:${client.email}`}>{client.email}</a>
              ) : (
                "Not provided"
              )}
            </dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{client.phone || "Not provided"}</dd>
          </div>
          <div>
            <dt>Client since</dt>
            <dd>{dateLabel(client.createdAt)}</dd>
          </div>
          <div>
            <dt>Projects</dt>
            <dd>{linked.length}</dd>
          </div>
        </dl>
        {client.notes && (
          <div className="detail-notes">
            <h2>Notes</h2>
            <p>{client.notes}</p>
          </div>
        )}
      </section>
      <ProjectsPage
        embedded
        projects={matching}
        search={search}
        setSearch={setSearch}
        loading={false}
        error={false}
        retry={() => {}}
        openEditor={scopedEditor}
        onDelete={onDelete}
        readOnly={readOnly}
      />
    </div>
  );
}
export function ProjectDetail({
  project,
  tasks,
  clients,
  projects,
  search,
  setSearch,
  openEditor,
  onDelete,
  onMoveTask,
  readOnly = false,
}: DetailsProps & {
  project?: Project;
  tasks: Task[];
  clients: Client[];
  projects: Project[];
  onMoveTask: (task: Task, status: Task["status"]) => void;
}) {
  if (!project)
    return (
      <EmptyState
        title="Project not found"
        text="This project may have been removed or may belong to another workspace."
        action={
          <Link href="/projects" className="quiet-link">
            Back to projects
          </Link>
        }
      />
    );
  const linked = tasks.filter((task) => task.projectId === project.id);
  const matching = linked.filter((task) =>
    `${task.title} ${task.description ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const complete = linked.filter((task) => task.status === "done").length;
  const progress = linked.length
    ? Math.round((complete / linked.length) * 100)
    : 0;
  const scopedEditor = (editor: EditorState) =>
    openEditor({
      ...editor,
      defaults: { ...editor.defaults, projectId: project.id },
    });
  return (
    <div data-testid={`detail-project-${project.id}`}>
      <Link href="/projects" className="back-link">
        <ArrowLeft size={15} />
        All projects
      </Link>
      <PageHeading
        eyebrow="PROJECT DETAILS"
        title={project.name}
        description={`Work for ${project.clientName}`}
        action={
          !readOnly && (
            <Button
              variant="outline"
              onClick={() => openEditor({ kind: "project", record: project })}
              data-testid="button-edit-current-project"
            >
              <Pencil size={15} />
              Edit project
            </Button>
          )
        }
      />
      <section className="detail-panel" aria-label="Project information">
        <dl>
          <div>
            <dt>Client</dt>
            <dd>
              <Link href={`/clients/${project.clientId}`}>
                {project.clientName}
              </Link>
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span className={`status-pill ${statusTone(project.status)}`}>
                {statusLabel(project.status)}
              </span>
            </dd>
          </div>
          <div>
            <dt>Deadline</dt>
            <dd>{dateLabel(project.deadline)}</dd>
          </div>
          <div>
            <dt>Task completion</dt>
            <dd data-testid="project-progress">
              {complete} of {linked.length} · {progress}%
            </dd>
          </div>
        </dl>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Project task completion"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        {project.description && (
          <div className="detail-notes">
            <h2>Project brief</h2>
            <p>{project.description}</p>
          </div>
        )}
      </section>
      <TasksPage
        embedded
        tasks={matching}
        clients={clients}
        projects={projects}
        search={search}
        setSearch={setSearch}
        loading={false}
        error={false}
        retry={() => {}}
        openEditor={scopedEditor}
        onDelete={onDelete}
        onMoveTask={onMoveTask}
        readOnly={readOnly}
      />
    </div>
  );
}
