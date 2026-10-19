import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { useForm } from 'react-hook-form';
import {
  Activity, ArrowRight, ArrowUpRight, BriefcaseBusiness, Check,
  CheckCheck, Circle, CircleDashed, Clock3, Command, FileText,
  LayoutDashboard, Menu, MoreHorizontal, Pencil, Plus, Search, Trash2, Users, X,
} from 'lucide-react';
import {
  getGetClientsQueryKey, getGetDashboardQueryKey, getGetProjectsQueryKey,
  getGetTasksQueryKey, useCreateClient, useCreateProject, useCreateTask,
  useDeleteClient, useDeleteProject, useDeleteTask, useGetClients, useGetDashboard,
  useGetProjects, useGetTasks, useUpdateClient, useUpdateProject, useUpdateTask,
} from '@workspace/api-client-react';
import type { Client, Dashboard, Project, Task } from '@workspace/api-client-react';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
type Kind = 'client' | 'project' | 'task';
type RecordValue = Client | Project | Task;
type Field = { name: string; label: string; type?: string; required?: boolean; options?: { value: string; label: string }[]; placeholder?: string };

const navigation = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/projects', label: 'Projects', icon: BriefcaseBusiness },
  { href: '/tasks', label: 'Tasks', icon: CheckCheck },
];

const dateLabel = (value?: string | null) => value
  ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`))
  : 'No date set';
const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const statusLabel = (status: string) => status === 'in_progress' ? 'In progress' : status.charAt(0).toUpperCase() + status.slice(1);
const statusTone = (status: string) => status === 'active' || status === 'in_progress' ? 'tone-teal' : status === 'completed' || status === 'done' ? 'tone-olive' : 'tone-sand';
const fieldSets: Record<Kind, Field[]> = {
  client: [
    { name: 'name', label: 'Client name', required: true, placeholder: 'e.g. Mara Chen' },
    { name: 'company', label: 'Company', placeholder: 'Studio or business' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'name@company.com' },
    { name: 'phone', label: 'Phone', placeholder: '+1 (555) 000-0000' },
    { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'A few details worth remembering…' },
  ],
  project: [
    { name: 'name', label: 'Project name', required: true, placeholder: 'e.g. Brand refresh' },
    { name: 'clientId', label: 'Client', required: true, type: 'select' },
    { name: 'status', label: 'Status', type: 'select', options: [{ value: 'planning', label: 'Planning' }, { value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }] },
    { name: 'deadline', label: 'Deadline', type: 'date' },
    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'What does this project need to accomplish?' },
  ],
  task: [
    { name: 'title', label: 'Task', required: true, placeholder: 'e.g. Share first-round concepts' },
    { name: 'projectId', label: 'Project', required: true, type: 'select' },
    { name: 'priority', label: 'Priority', type: 'select', options: [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }] },
    { name: 'status', label: 'Status', type: 'select', options: [{ value: 'todo', label: 'To do' }, { value: 'in_progress', label: 'In progress' }, { value: 'done', label: 'Done' }] },
    { name: 'dueDate', label: 'Due date', type: 'date' },
    { name: 'description', label: 'Details', type: 'textarea', placeholder: 'Add a little context…' },
  ],
};

function AppContent() {
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [editor, setEditor] = useState<{ kind: Kind; record?: RecordValue } | null>(null);
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const clientsQuery = useGetClients();
  const projectsQuery = useGetProjects();
  const tasksQuery = useGetTasks();
  const dashboardQuery = useGetDashboard();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const clients = clientsQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const invalidateAll = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getGetClientsQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getGetProjectsQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }),
  ]);
  const announce = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3200);
  };
  const filteredClients = useMemo(() => clients.filter((item) => `${item.name} ${item.company ?? ''} ${item.email ?? ''}`.toLowerCase().includes(search.toLowerCase())), [clients, search]);
  const filteredProjects = useMemo(() => projects.filter((item) => `${item.name} ${item.clientName} ${item.status}`.toLowerCase().includes(search.toLowerCase())), [projects, search]);
  const filteredTasks = useMemo(() => tasks.filter((item) => `${item.title} ${item.projectName} ${item.clientName} ${item.status}`.toLowerCase().includes(search.toLowerCase())), [tasks, search]);

  const submit = (kind: Kind, record: RecordValue | undefined, values: Record<string, string>) => {
    const done = (message: string) => {
      void invalidateAll();
      setEditor(null);
      announce(message);
    };
    const emptyToNull = (value: string | undefined) => value?.trim() || null;
    if (kind === 'client') {
      const payload = { name: values.name.trim(), company: emptyToNull(values.company), email: emptyToNull(values.email), phone: emptyToNull(values.phone), notes: emptyToNull(values.notes) };
      if (record) updateClient.mutate({ id: record.id, data: payload }, { onSuccess: () => done('Client details saved'), onError: () => announce('Could not save this client. Try again.') });
      else createClient.mutate({ data: payload }, { onSuccess: () => done('Client added to your list'), onError: () => announce('Could not add this client. Try again.') });
    } else if (kind === 'project') {
      const payload = { name: values.name.trim(), clientId: Number(values.clientId), status: values.status as 'planning' | 'active' | 'completed', deadline: emptyToNull(values.deadline), description: emptyToNull(values.description) };
      if (record) updateProject.mutate({ id: record.id, data: payload }, { onSuccess: () => done('Project details saved'), onError: () => announce('Could not save this project. Try again.') });
      else createProject.mutate({ data: payload }, { onSuccess: () => done('Project created'), onError: () => announce('Could not create this project. Try again.') });
    } else {
      const payload = { title: values.title.trim(), projectId: Number(values.projectId), status: values.status as 'todo' | 'in_progress' | 'done', priority: values.priority as 'low' | 'medium' | 'high', dueDate: emptyToNull(values.dueDate), description: emptyToNull(values.description) };
      if (record) updateTask.mutate({ id: record.id, data: payload }, { onSuccess: () => done('Task updated'), onError: () => announce('Could not save this task. Try again.') });
      else createTask.mutate({ data: payload }, { onSuccess: () => done('Task added to your list'), onError: () => announce('Could not add this task. Try again.') });
    }
  };

  const remove = (kind: Kind, record: RecordValue) => {
    if (!window.confirm(`Delete “${'name' in record ? record.name : record.title}”? This cannot be undone.`)) return;
    const onSuccess = () => { void invalidateAll(); announce(`${kind[0].toUpperCase()}${kind.slice(1)} deleted`); };
    const onError = () => announce(`Could not delete this ${kind}. Try again.`);
    if (kind === 'client') deleteClient.mutate({ id: record.id }, { onSuccess, onError });
    if (kind === 'project') deleteProject.mutate({ id: record.id }, { onSuccess, onError });
    if (kind === 'task') deleteTask.mutate({ id: record.id }, { onSuccess, onError });
  };

  const moveTask = (task: Task, status: Task['status']) => {
    updateTask.mutate({ id: task.id, data: { status } }, {
      onSuccess: () => { void invalidateAll(); announce(status === 'done' ? 'Task marked complete' : `Task moved to ${statusLabel(status).toLowerCase()}`); },
      onError: () => announce('Could not update the task. Try again.'),
    });
  };

  const pageName = location === '/' ? 'Overview' : location.slice(1).replace(/^\w/, (s) => s.toUpperCase());
  const routeError = location === '/clients' ? clientsQuery.isError : location === '/projects' ? projectsQuery.isError : location === '/tasks' ? tasksQuery.isError : dashboardQuery.isError;
  const retry = () => {
    if (location === '/clients') void clientsQuery.refetch();
    else if (location === '/projects') void projectsQuery.refetch();
    else if (location === '/tasks') void tasksQuery.refetch();
    else void dashboardQuery.refetch();
  };

  return (
    <div className="app-frame">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><Command size={19} strokeWidth={2.4} /></div>
          <span>clientflow<span className="brand-period">.</span></span>
          <button className="mobile-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)} data-testid="button-close-navigation"><X size={18} /></button>
        </div>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link href={href} key={href} className={`nav-link ${location === href ? 'nav-active' : ''}`} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${label.toLowerCase()}`}>
              <Icon size={17} strokeWidth={1.9} /><span>{label}</span>
              {href === '/tasks' && tasks.length > 0 && <span className="nav-count">{tasks.filter((task) => task.status !== 'done').length}</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-orbit"><Activity size={15} /></span>
            <p>Good work, in good order.</p>
            <span>Your day, at a glance.</span>
          </div>
          <div className="profile-strip"><div className="profile-avatar">Y</div><div><strong>Your workspace</strong><span>Independent practice</span></div><MoreHorizontal size={17} /></div>
        </div>
      </aside>
      {mobileOpen && <button aria-label="Close menu" className="mobile-scrim" onClick={() => setMobileOpen(false)} data-testid="button-dismiss-navigation" />}
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)} data-testid="button-open-navigation"><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong data-testid="text-current-page">{pageName}</strong></div>
          <div className="topbar-right"><span className="today-stamp">{new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}</span><div className="today-dot" /></div>
        </header>
        {notice && <div className="notice" role="status" data-testid="status-feedback"><Check size={16} />{notice}</div>}
        <div className="content-wrap">
          {location === '/' ? (
            <DashboardPage dashboard={dashboardQuery.data} loading={dashboardQuery.isLoading} error={dashboardQuery.isError} retry={retry} openEditor={setEditor} onMoveTask={moveTask} />
          ) : location === '/clients' ? (
            <ClientsPage clients={filteredClients} loading={clientsQuery.isLoading} error={clientsQuery.isError} retry={retry} openEditor={setEditor} onDelete={remove} search={search} setSearch={setSearch} />
          ) : location === '/projects' ? (
            <ProjectsPage projects={filteredProjects} loading={projectsQuery.isLoading} error={projectsQuery.isError} retry={retry} openEditor={setEditor} onDelete={remove} search={search} setSearch={setSearch} />
          ) : location === '/tasks' ? (
            <TasksPage tasks={filteredTasks} loading={tasksQuery.isLoading} error={tasksQuery.isError} retry={retry} openEditor={setEditor} onDelete={remove} onMoveTask={moveTask} search={search} setSearch={setSearch} />
          ) : <NotFound />}
        </div>
      </main>
      {editor && <EditorModal key={`${editor.kind}-${editor.record?.id ?? 'new'}`} editor={editor} clients={clients} projects={projects} busy={createClient.isPending || updateClient.isPending || createProject.isPending || updateProject.isPending || createTask.isPending || updateTask.isPending} onClose={() => setEditor(null)} onSubmit={(values) => submit(editor.kind, editor.record, values)} />}
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function LoadingState() {
  return <div className="skeleton-grid" aria-label="Loading content" data-testid="status-loading"><div className="skeleton skeleton-wide" /><div className="skeleton" /><div className="skeleton" /><div className="skeleton skeleton-table" /></div>;
}
function ErrorState({ retry }: { retry: () => void }) {
  return <div className="state-panel error-panel" data-testid="status-error"><div className="state-icon"><Activity size={20} /></div><h3>We couldn’t load this just yet</h3><p>Your work is safe. Give it another try.</p><Button variant="outline" onClick={retry} data-testid="button-retry">Try again</Button></div>;
}
function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return <div className="state-panel" data-testid="status-empty"><div className="empty-symbol"><CircleDashed size={24} /></div><h3>{title}</h3><p>{text}</p>{action}</div>;
}
function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="search-box"><Search size={16} /><input aria-label={placeholder} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} data-testid="input-search" /></label>;
}
function AddButton({ label, onClick, testId }: { label: string; onClick: () => void; testId: string }) {
  return <Button onClick={onClick} className="add-button" data-testid={testId}><Plus size={16} />{label}</Button>;
}

function DashboardPage({ dashboard, loading, error, retry, openEditor, onMoveTask }: {
  dashboard?: Dashboard; loading: boolean; error: boolean; retry: () => void;
  openEditor: (editor: { kind: Kind; record?: RecordValue }) => void; onMoveTask: (task: Task, status: Task['status']) => void;
}) {
  const [, setLocation] = useLocation();
  if (loading) return <LoadingState />;
  if (error || !dashboard) return <ErrorState retry={retry} />;
  const active = dashboard.activeProjectCount;
  const todo = dashboard.taskCounts.todo;
  const inProgress = dashboard.taskCounts.in_progress;
  const done = dashboard.taskCounts.done;
  const allTasks = todo + inProgress + done;
  const progress = allTasks ? Math.round((done / allTasks) * 100) : 0;
  const today = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  return (
    <>
      <PageHeading eyebrow={today} title="A little more in flow." description="Here’s what’s moving across your independent practice." action={<AddButton label="New task" onClick={() => openEditor({ kind: 'task' })} testId="button-create-task" />} />
      <section className="welcome-band">
        <div className="welcome-copy"><span className="welcome-kicker">YOUR WORK, IN VIEW</span><h2>Make room for the<br /><em>next good thing.</em></h2><p>A clear view of your clients, projects, and the work that matters today.</p><Link href="/tasks" className="welcome-link" data-testid="link-view-tasks">See your tasks <ArrowRight size={15} /></Link></div>
        <div className="welcome-art" aria-hidden="true"><div className="art-disc disc-one" /><div className="art-disc disc-two" /><div className="art-ring" /><div className="art-note"><span>IN MOTION</span><strong>{active.toString().padStart(2, '0')}</strong><small>active projects</small></div><div className="art-star">+</div><div className="art-line" /></div>
      </section>
      <section className="metric-row" aria-label="Practice summary">
        <MetricCard label="Clients" value={dashboard.clientCount} icon={<Users size={17} />} detail="people in your corner" tone="mint" />
        <MetricCard label="Projects" value={dashboard.projectCount} icon={<BriefcaseBusiness size={17} />} detail={`${active} active right now`} tone="peach" />
        <MetricCard label="To do" value={todo} icon={<Circle size={17} />} detail={`${inProgress} already underway`} tone="lavender" />
        <MetricCard label="Completed" value={done} icon={<CheckCheck size={17} />} detail={`${progress}% of all tasks`} tone="gold" />
      </section>
      <div className="dashboard-lower">
        <section className="panel upcoming-panel">
          <div className="panel-heading"><div><span className="eyebrow">THE NEAR HORIZON</span><h2>Coming up</h2></div><Link href="/tasks" className="quiet-link" data-testid="link-all-tasks">All tasks <ArrowRight size={14} /></Link></div>
          {dashboard.upcomingTasks?.length ? <div className="upcoming-list">{dashboard.upcomingTasks.slice(0, 5).map((task) => <TaskRow key={task.id} task={task} onMoveTask={onMoveTask} compact />)}</div> : <EmptyState title="A little breathing room" text="No upcoming tasks on the horizon. Add a task when you’re ready." action={<Button variant="outline" onClick={() => openEditor({ kind: 'task' })} data-testid="button-empty-create-task">Add a task</Button>} />}
        </section>
        <section className="panel focus-panel">
          <div className="focus-header"><span className="eyebrow">PRACTICE PULSE</span><div className="pulse-icon"><Activity size={17} /></div></div>
          <h2>Progress, not<br />perfection.</h2><p>Small steps add up. Keep the momentum gentle and steady.</p>
          <div className="progress-caption"><span>Task completion</span><strong>{progress}%</strong></div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          <div className="progress-foot"><span>{done} finished</span><span>{allTasks} total tasks</span></div>
          <div className="focus-bottom"><span className="focus-ornament"><ArrowUpRight size={17} /></span><span>Every checked-off task is forward motion.</span></div>
        </section>
      </div>
      <section className="quick-actions"><span className="eyebrow">A GOOD PLACE TO START</span><div className="quick-grid">
        <button onClick={() => openEditor({ kind: 'client' })} className="quick-action" data-testid="button-quick-client"><span className="quick-icon quick-icon-mint"><Users size={17} /></span><span><strong>Add a client</strong><small>Start a new relationship</small></span><ArrowRight size={16} /></button>
        <button onClick={() => openEditor({ kind: 'project' })} className="quick-action" data-testid="button-quick-project"><span className="quick-icon quick-icon-peach"><BriefcaseBusiness size={17} /></span><span><strong>Start a project</strong><small>Give the work a home</small></span><ArrowRight size={16} /></button>
        <button onClick={() => setLocation('/tasks')} className="quick-action" data-testid="button-quick-task"><span className="quick-icon quick-icon-gold"><CheckCheck size={17} /></span><span><strong>Find your next step</strong><small>See everything in motion</small></span><ArrowRight size={16} /></button>
      </div></section>
    </>
  );
}

function MetricCard({ label, value, icon, detail, tone }: { label: string; value: number; icon: ReactNode; detail: string; tone: string }) {
  return <div className={`metric-card ${tone}`} data-testid={`metric-${label.toLowerCase().replace(/\s/g, '-')}`}><div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><div className="metric-value">{value.toString().padStart(2, '0')}</div><div className="metric-detail">{detail}</div></div>;
}

function ClientsPage({ clients, loading, error, retry, openEditor, onDelete, search, setSearch }: {
  clients: Client[]; loading: boolean; error: boolean; retry: () => void; openEditor: (editor: { kind: Kind; record?: RecordValue }) => void;
  onDelete: (kind: Kind, record: RecordValue) => void; search: string; setSearch: (value: string) => void;
}) {
  return <>
    <PageHeading eyebrow="RELATIONSHIPS" title="Clients" description="The people behind the work. Keep every detail close." action={<AddButton label="Add client" onClick={() => openEditor({ kind: 'client' })} testId="button-create-client" />} />
    <div className="toolbar"><div className="list-intro"><strong>{clients.length}</strong> {clients.length === 1 ? 'relationship' : 'relationships'} <span>·</span> all in one place</div><SearchBox value={search} onChange={setSearch} placeholder="Search clients" /></div>
    {loading ? <LoadingState /> : error ? <ErrorState retry={retry} /> : clients.length ? <div className="client-grid">{clients.map((client, index) => <article className={`client-card client-card-${index % 4}`} key={client.id} data-testid={`card-client-${client.id}`}><div className="client-card-top"><div className={`client-avatar avatar-${index % 4}`} data-testid={`avatar-client-${client.id}`}>{initials(client.name)}</div><button className="icon-button" title={`Edit ${client.name}`} onClick={() => openEditor({ kind: 'client', record: client })} data-testid={`button-edit-client-${client.id}`}><Pencil size={15} /></button></div><h3 data-testid={`text-client-name-${client.id}`}>{client.name}</h3><p className="client-company" data-testid={`text-client-company-${client.id}`}>{client.company || 'Independent client'}</p><div className="client-contact">{client.email && <a href={`mailto:${client.email}`} data-testid={`link-client-email-${client.id}`}>{client.email}</a>}{client.phone && <span data-testid={`text-client-phone-${client.id}`}>{client.phone}</span>}{!client.email && !client.phone && <span className="no-contact">No contact details yet</span>}</div>{client.notes && <p className="client-note" data-testid={`text-client-notes-${client.id}`}>{client.notes}</p>}<div className="client-card-footer"><span data-testid={`text-client-created-${client.id}`}>CLIENT SINCE {dateLabel(client.createdAt)}</span><button className="delete-link" onClick={() => onDelete('client', client)} data-testid={`button-delete-client-${client.id}`}><Trash2 size={14} /> Remove</button></div></article>)}</div> : <EmptyState title={search ? 'No clients found' : 'A new relationship starts here'} text={search ? 'Try another name, company, or email.' : 'Add the people you work with to keep every conversation and project connected.'} action={!search && <AddButton label="Add your first client" onClick={() => openEditor({ kind: 'client' })} testId="button-empty-create-client" />} />}
  </>;
}

function ProjectsPage({ projects, loading, error, retry, openEditor, onDelete, search, setSearch }: {
  projects: Project[]; loading: boolean; error: boolean; retry: () => void; openEditor: (editor: { kind: Kind; record?: RecordValue }) => void;
  onDelete: (kind: Kind, record: RecordValue) => void; search: string; setSearch: (value: string) => void;
}) {
  const tally = { active: projects.filter((p) => p.status === 'active').length, planning: projects.filter((p) => p.status === 'planning').length, completed: projects.filter((p) => p.status === 'completed').length };
  return <>
    <PageHeading eyebrow="THE WORK ITSELF" title="Projects" description="Every brief, build, and bright idea—with its client close by." action={<AddButton label="New project" onClick={() => openEditor({ kind: 'project' })} testId="button-create-project" />} />
    <div className="project-overview"><div className="project-overview-title"><span className="eyebrow">PROJECT SNAPSHOT</span><strong>{projects.length} <small>total</small></strong></div><div className="project-status-key"><span><i className="key-dot key-active" />{tally.active} active</span><span><i className="key-dot key-planning" />{tally.planning} planning</span><span><i className="key-dot key-completed" />{tally.completed} completed</span></div><div className="project-mini-bars">{projects.slice(0, 13).map((p) => <i key={p.id} className={`mini-bar ${p.status}`} title={`${p.name} · ${statusLabel(p.status)}`} />)}{projects.length === 0 && <span className="bar-empty">Your project rhythm will show here.</span>}</div></div>
    <div className="toolbar"><div className="list-intro">Your portfolio <span>·</span> every project, every client</div><SearchBox value={search} onChange={setSearch} placeholder="Search projects" /></div>
    {loading ? <LoadingState /> : error ? <ErrorState retry={retry} /> : projects.length ? <div className="project-list">{projects.map((project, i) => <article className="project-row" key={project.id} data-testid={`row-project-${project.id}`}><div className={`project-index project-index-${i % 4}`} aria-hidden="true">{String(i + 1).padStart(2, '0')}</div><div className="project-main"><div className="project-title-line"><h3 data-testid={`text-project-name-${project.id}`}>{project.name}</h3><span className={`status-pill ${statusTone(project.status)}`} data-testid={`status-project-${project.id}`}>{statusLabel(project.status)}</span></div><p data-testid={`text-project-description-${project.id}`}>{project.description || 'No project description added.'}</p><div className="project-client-line"><span className="tiny-avatar" data-testid={`avatar-project-client-${project.id}`}>{initials(project.clientName)}</span><span data-testid={`text-project-client-${project.id}`}>{project.clientName}</span></div></div><div className="project-deadline"><span>DEADLINE</span><strong data-testid={`text-project-deadline-${project.id}`}>{dateLabel(project.deadline)}</strong></div><div className="row-actions"><button className="icon-button" title={`Edit ${project.name}`} onClick={() => openEditor({ kind: 'project', record: project })} data-testid={`button-edit-project-${project.id}`}><Pencil size={15} /></button><button className="icon-button danger-hover" title={`Delete ${project.name}`} onClick={() => onDelete('project', project)} data-testid={`button-delete-project-${project.id}`}><Trash2 size={15} /></button></div></article>)}</div> : <EmptyState title={search ? 'No projects found' : 'Give the work a home'} text={search ? 'Try a different project or client name.' : 'Projects keep the brief, client, and important dates moving together.'} action={!search && <AddButton label="Create a project" onClick={() => openEditor({ kind: 'project' })} testId="button-empty-create-project" />} />}
  </>;
}

function TasksPage({ tasks, loading, error, retry, openEditor, onDelete, onMoveTask, search, setSearch }: {
  tasks: Task[]; loading: boolean; error: boolean; retry: () => void; openEditor: (editor: { kind: Kind; record?: RecordValue }) => void;
  onDelete: (kind: Kind, record: RecordValue) => void; onMoveTask: (task: Task, status: Task['status']) => void; search: string; setSearch: (value: string) => void;
}) {
  const statuses: Task['status'][] = ['todo', 'in_progress', 'done'];
  const taskGroups = statuses.map((status) => ({ status, tasks: tasks.filter((task) => task.status === status) }));
  return <>
    <PageHeading eyebrow="TODAY, AND WHAT’S NEXT" title="Tasks" description="A steady list of next steps, connected to the work they move forward." action={<AddButton label="Add task" onClick={() => openEditor({ kind: 'task' })} testId="button-create-task" />} />
    <div className="task-summary-strip"><span><Circle size={15} />{tasks.filter((t) => t.status === 'todo').length} to do</span><span><Clock3 size={15} />{tasks.filter((t) => t.status === 'in_progress').length} in progress</span><span><CheckCheck size={15} />{tasks.filter((t) => t.status === 'done').length} done</span><div className="summary-search"><SearchBox value={search} onChange={setSearch} placeholder="Search tasks" /></div></div>
    {loading ? <LoadingState /> : error ? <ErrorState retry={retry} /> : tasks.length ? <div className="task-columns">{taskGroups.map(({ status, tasks: group }) => <section className="task-column" key={status} data-testid={`column-tasks-${status}`}><div className="task-column-heading"><span className={`column-mark mark-${status}`} /><h2>{statusLabel(status)}</h2><span className="column-count">{group.length}</span></div><div className="task-column-list">{group.length ? group.map((task) => <TaskCard key={task.id} task={task} onEdit={() => openEditor({ kind: 'task', record: task })} onDelete={() => onDelete('task', task)} onMoveTask={onMoveTask} />) : <div className="column-empty">{status === 'done' ? 'Finished work lands here.' : 'Nothing here for now.'}</div>}</div></section>)}</div> : <EmptyState title={search ? 'No tasks found' : 'The first step is a small one'} text={search ? 'Try searching another task, client, or project.' : 'Add a task and connect it to a project. Your next move will be easy to find.'} action={!search && <AddButton label="Add your first task" onClick={() => openEditor({ kind: 'task' })} testId="button-empty-create-task" />} />}
  </>;
}

function TaskRow({ task, onMoveTask, compact = false }: { task: Task; onMoveTask: (task: Task, status: Task['status']) => void; compact?: boolean }) {
  const next = task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'todo';
  return <div className={`task-row ${compact ? 'task-row-compact' : ''}`} data-testid={`row-task-${task.id}`}><button className={`task-check ${task.status === 'done' ? 'task-checked' : ''}`} aria-label={`Move ${task.title} to ${statusLabel(next)}`} onClick={() => onMoveTask(task, next)} data-testid={`button-advance-task-${task.id}`}>{task.status === 'done' ? <Check size={13} /> : <span />}</button><div className="task-row-content"><strong data-testid={`text-task-title-${task.id}`}>{task.title}</strong><span>{task.projectName} <i>·</i> {task.clientName}</span></div><span className="task-row-date">{dateLabel(task.dueDate)}</span></div>;
}

function TaskCard({ task, onEdit, onDelete, onMoveTask }: { task: Task; onEdit: () => void; onDelete: () => void; onMoveTask: (task: Task, status: Task['status']) => void }) {
  const next = task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'todo';
  return <article className="task-card" data-testid={`card-task-${task.id}`}><div className="task-card-top"><span className={`priority-tag priority-${task.priority}`}><i />{task.priority} priority</span><div className="row-actions"><button className="icon-button" title="Edit task" onClick={onEdit} data-testid={`button-edit-task-${task.id}`}><Pencil size={14} /></button><button className="icon-button danger-hover" title="Delete task" onClick={onDelete} data-testid={`button-delete-task-${task.id}`}><Trash2 size={14} /></button></div></div><h3 data-testid={`text-task-title-${task.id}`}>{task.title}</h3>{task.description && <p className="task-description">{task.description}</p>}<div className="task-linked-project"><FileText size={13} /><span>{task.projectName}</span></div><div className="task-card-footer"><div className="task-owner"><span className="tiny-avatar">{initials(task.clientName)}</span>{task.clientName}</div><span className="task-due">{task.dueDate ? <><Clock3 size={12} />{dateLabel(task.dueDate)}</> : 'No due date'}</span></div><button className="task-move" onClick={() => onMoveTask(task, next)} data-testid={`button-move-task-${task.id}`}><span>{task.status === 'done' ? 'Reopen task' : task.status === 'todo' ? 'Start this task' : 'Mark complete'}</span><ArrowRight size={14} /></button></article>;
}

function EditorModal({ editor, clients, projects, busy, onClose, onSubmit }: {
  editor: { kind: Kind; record?: RecordValue }; clients: Client[]; projects: Project[]; busy: boolean;
  onClose: () => void; onSubmit: (values: Record<string, string>) => void;
}) {
  const { kind, record } = editor;
  const form = useForm<Record<string, string>>({ defaultValues: {} });
  useEffect(() => {
    const defaults: Record<string, string> = {};
    fieldSets[kind].forEach(({ name }) => {
      const value = record ? (record as unknown as Record<string, unknown>)[name] : undefined;
      defaults[name] = value == null ? (name === 'status' ? kind === 'task' ? 'todo' : 'planning' : name === 'priority' ? 'medium' : '') : String(value).slice(0, name === 'deadline' || name === 'dueDate' ? 10 : undefined);
    });
    form.reset(defaults);
  }, [form, kind, record]);
  const projectOptions = kind === 'project' ? clients.map((client) => ({ value: String(client.id), label: client.company ? `${client.name} · ${client.company}` : client.name })) : projects.map((project) => ({ value: String(project.id), label: `${project.name} · ${project.clientName}` }));
  const isSubmitting = busy || form.formState.isSubmitting;
  const handleSubmit = form.handleSubmit((values) => onSubmit(values));
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="editor-dialog" role="dialog" aria-modal="true" aria-labelledby="editor-title"><div className="dialog-top"><div><span className="eyebrow">{record ? 'MAKE AN UPDATE' : 'ADD TO YOUR WORKSPACE'}</span><h2 id="editor-title">{record ? 'Edit' : 'New'} {kind}</h2></div><button className="icon-button dialog-close" aria-label="Close dialog" onClick={onClose} data-testid="button-close-editor"><X size={18} /></button></div>
    <Form {...form}><form onSubmit={handleSubmit} className="editor-form" data-testid={`form-${kind}`}>
      {fieldSets[kind].map((field) => {
        const options = field.name === 'clientId' || field.name === 'projectId' ? projectOptions : field.options;
        const disabled = (field.name === 'clientId' && clients.length === 0) || (field.name === 'projectId' && projects.length === 0);
        return <div className={`form-field ${field.type === 'textarea' ? 'form-field-wide' : ''}`} key={field.name}><label htmlFor={`${kind}-${field.name}`}>{field.label}{field.required && <span className="required-mark"> *</span>}</label>
          {field.type === 'textarea' ? <Textarea id={`${kind}-${field.name}`} placeholder={field.placeholder} {...form.register(field.name, { required: field.required ? `${field.label} is required` : false })} data-testid={`input-${kind}-${field.name}`} /> :
            options ? <select id={`${kind}-${field.name}`} className="field-select" disabled={disabled} {...form.register(field.name, { required: field.required ? `${field.label} is required` : false })} data-testid={`select-${kind}-${field.name}`}><option value="">{disabled ? `Add a ${field.name === 'clientId' ? 'client' : 'project'} first` : `Choose ${field.label.toLowerCase()}`}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> :
              <Input id={`${kind}-${field.name}`} type={field.type || 'text'} placeholder={field.placeholder} {...form.register(field.name, { required: field.required ? `${field.label} is required` : false })} data-testid={`input-${kind}-${field.name}`} />}
          {form.formState.errors[field.name] && <span className="field-error">{String(form.formState.errors[field.name]?.message)}</span>}
        </div>;
      })}
      <div className="dialog-actions"><Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-editor">Cancel</Button><Button className="add-button" type="submit" disabled={isSubmitting || ((kind === 'project' && clients.length === 0) || (kind === 'task' && projects.length === 0))} data-testid={`button-submit-${kind}`}>{isSubmitting ? 'Saving…' : record ? 'Save changes' : `Create ${kind}`}</Button></div>
    </form></Form></section></div>;
}

function Root() {
  return <QueryClientProvider client={queryClient}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Switch><Route path="/" component={AppContent} /><Route path="/clients" component={AppContent} /><Route path="/projects" component={AppContent} /><Route path="/tasks" component={AppContent} /><Route component={NotFound} /></Switch></WouterRouter></QueryClientProvider>;
}

export default Root;
