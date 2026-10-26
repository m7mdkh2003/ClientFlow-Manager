import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRef } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ClerkProvider,
  Show,
  SignIn,
  SignUp,
  useClerk,
  useUser,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import {
  Link,
  Redirect,
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from "wouter";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  CheckCheck,
  Circle,
  CircleDashed,
  Clock3,
  Command,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  getGetClientsQueryKey,
  getGetDashboardQueryKey,
  getGetProjectsQueryKey,
  getGetTasksQueryKey,
  useCreateClient,
  useCreateProject,
  useCreateTask,
  useDeleteClient,
  useDeleteProject,
  useDeleteTask,
  useGetClients,
  useGetDashboard,
  useGetProjects,
  useGetTasks,
  useUpdateClient,
  useUpdateProject,
  useUpdateTask,
} from "@workspace/api-client-react";
import type {
  Client,
  Dashboard,
  Project,
  Task,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/not-found";
import DemoPage from "@/pages/demo";
import { ClientDetail, ProjectDetail } from "@/components/workspace-details";
import { EditorModal } from "@/components/record-editor";
import {
  DashboardPage,
  ClientsPage,
  ProjectsPage,
  TasksPage,
  LoadingState,
  ErrorState,
} from "@/components/workspace-pages";
import {
  initials,
  statusLabel,
  type EditorState,
  type Kind,
  type RecordValue,
} from "@/lib/workspace";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#28483f",
    colorForeground: "#2b4038",
    colorMutedForeground: "#79857c",
    colorDanger: "#b64e44",
    colorBackground: "#fbf9f2",
    colorInput: "#f8f5ec",
    colorInputForeground: "#344840",
    colorNeutral: "#e2ddcf",
    fontFamily: "DM Sans, sans-serif",
    borderRadius: "0.7rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#fbf9f2] rounded-2xl w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#263c37] font-bold",
    headerSubtitle: "text-[#79857c]",
    socialButtonsBlockButtonText: "text-[#344840] font-semibold",
    formFieldLabel: "text-[#40564b] font-medium",
    footerActionLink: "text-[#426c5c] font-semibold",
    footerActionText: "text-[#79857c]",
    dividerText: "text-[#89938a]",
    identityPreviewEditButton: "text-[#426c5c]",
    formFieldSuccessText: "text-[#426c5c]",
    alertText: "text-[#8b453d]",
    logoBox: "rounded-xl",
    logoImage: "object-contain",
    socialButtonsBlockButton:
      "border-[#e5dfd2] bg-[#f8f5ec] hover:bg-[#f0ede4]",
    formButtonPrimary: "bg-[#28483f] hover:bg-[#355d50] text-[#f7f1e4]",
    formFieldInput: "border-[#e2ddcf] bg-[#f8f5ec] text-[#344840]",
    footerAction: "text-[#79857c]",
    dividerLine: "bg-[#e5dfd2]",
    alert: "border-[#ead4cb] bg-[#fbefea]",
    otpCodeFieldInput: "border-[#e2ddcf] bg-[#f8f5ec] text-[#344840]",
    formFieldRow: "text-[#40564b]",
    main: "text-[#2b4038]",
  },
};
const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/projects", label: "Projects", icon: BriefcaseBusiness },
  { href: "/tasks", label: "Tasks", icon: CheckCheck },
];

function AppContent() {
  const queryClient = useQueryClient();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [location] = useLocation();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [searches, setSearches] = useState<Record<string, string>>({});
  const search = searches[location] ?? "";
  const setSearch = (value: string) =>
    setSearches((previous) => ({ ...previous, [location]: value }));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notice, setNotice] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const noticeTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);
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
  const invalidateAll = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetClientsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetProjectsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }),
    ]);
  const announce = (message: string, tone: "success" | "error" = "success") => {
    window.clearTimeout(noticeTimer.current);
    setNotice({ message, tone });
    noticeTimer.current = window.setTimeout(() => setNotice(null), 5000);
  };
  const filteredClients = useMemo(
    () =>
      clients.filter((item) =>
        `${item.name} ${item.company ?? ""} ${item.email ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [clients, search],
  );
  const filteredProjects = useMemo(
    () =>
      projects.filter((item) =>
        `${item.name} ${item.clientName} ${item.status}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [projects, search],
  );
  const filteredTasks = useMemo(
    () =>
      tasks.filter((item) =>
        `${item.title} ${item.projectName} ${item.clientName} ${item.status}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [tasks, search],
  );

  const submit = (
    kind: Kind,
    record: RecordValue | undefined,
    values: Record<string, string>,
  ) => {
    const done = (message: string) => {
      void invalidateAll();
      setEditor(null);
      announce(message);
    };
    const emptyToNull = (value: string | undefined) => value?.trim() || null;
    if (kind === "client") {
      const payload = {
        name: values.name.trim(),
        company: emptyToNull(values.company),
        email: emptyToNull(values.email),
        phone: emptyToNull(values.phone),
        notes: emptyToNull(values.notes),
      };
      if (record)
        updateClient.mutate(
          { id: record.id, data: payload },
          {
            onSuccess: () => done("Client details saved"),
            onError: () =>
              announce("Could not save this client. Try again.", "error"),
          },
        );
      else
        createClient.mutate(
          { data: payload },
          {
            onSuccess: () => done("Client added to your list"),
            onError: () =>
              announce("Could not add this client. Try again.", "error"),
          },
        );
    } else if (kind === "project") {
      const payload = {
        name: values.name.trim(),
        clientId: Number(values.clientId),
        status: values.status as "planning" | "active" | "completed",
        deadline: emptyToNull(values.deadline),
        description: emptyToNull(values.description),
      };
      if (record)
        updateProject.mutate(
          { id: record.id, data: payload },
          {
            onSuccess: () => done("Project details saved"),
            onError: () =>
              announce("Could not save this project. Try again.", "error"),
          },
        );
      else
        createProject.mutate(
          { data: payload },
          {
            onSuccess: () => done("Project created"),
            onError: () =>
              announce("Could not create this project. Try again.", "error"),
          },
        );
    } else {
      const payload = {
        title: values.title.trim(),
        projectId: Number(values.projectId),
        status: values.status as "todo" | "in_progress" | "done",
        priority: values.priority as "low" | "medium" | "high",
        dueDate: emptyToNull(values.dueDate),
        description: emptyToNull(values.description),
      };
      if (record)
        updateTask.mutate(
          { id: record.id, data: payload },
          {
            onSuccess: () => done("Task updated"),
            onError: () =>
              announce("Could not save this task. Try again.", "error"),
          },
        );
      else
        createTask.mutate(
          { data: payload },
          {
            onSuccess: () => done("Task added to your list"),
            onError: () =>
              announce("Could not add this task. Try again.", "error"),
          },
        );
    }
  };

  const remove = (kind: Kind, record: RecordValue) => {
    if (
      !window.confirm(
        `Delete “${"name" in record ? record.name : record.title}”? This cannot be undone.`,
      )
    )
      return;
    const onSuccess = () => {
      void invalidateAll();
      announce(`${kind[0].toUpperCase()}${kind.slice(1)} deleted`);
    };
    const onError = (error: unknown) => {
      const failure = error as { status?: number; data?: { error?: string } };
      announce(
        failure.status === 409 && failure.data?.error
          ? failure.data.error
          : `Could not delete this ${kind}. Try again.`,
        "error",
      );
    };
    if (kind === "client")
      deleteClient.mutate({ id: record.id }, { onSuccess, onError });
    if (kind === "project")
      deleteProject.mutate({ id: record.id }, { onSuccess, onError });
    if (kind === "task")
      deleteTask.mutate({ id: record.id }, { onSuccess, onError });
  };

  const moveTask = (task: Task, status: Task["status"]) => {
    updateTask.mutate(
      { id: task.id, data: { status } },
      {
        onSuccess: () => {
          void invalidateAll();
          announce(
            status === "done"
              ? "Task marked complete"
              : `Task moved to ${statusLabel(status).toLowerCase()}`,
          );
        },
        onError: () =>
          announce("Could not update the task. Try again.", "error"),
      },
    );
  };

  const clientId = location.match(/^\/clients\/(\d+)$/)?.[1];
  const projectId = location.match(/^\/projects\/(\d+)$/)?.[1];
  const pageName = clientId
    ? "Client details"
    : projectId
      ? "Project details"
      : location === "/"
        ? "Overview"
        : location.slice(1).replace(/^\w/, (value) => value.toUpperCase());
  const retry = () => {
    void Promise.all([
      clientsQuery.refetch(),
      projectsQuery.refetch(),
      tasksQuery.refetch(),
      dashboardQuery.refetch(),
    ]);
  };
  const detailLoading =
    clientsQuery.isLoading || projectsQuery.isLoading || tasksQuery.isLoading;
  const detailError =
    clientsQuery.isError || projectsQuery.isError || tasksQuery.isError;

  return (
    <div className="app-frame">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark">
            <Command size={19} strokeWidth={2.4} />
          </div>
          <span>
            clientflow<span className="brand-period">.</span>
          </span>
          <button
            className="mobile-close"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            data-testid="button-close-navigation"
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              href={href}
              key={href}
              className={`nav-link ${location === href || (href !== "/" && location.startsWith(`${href}/`)) ? "nav-active" : ""}`}
              onClick={() => setMobileOpen(false)}
              data-testid={`link-nav-${label.toLowerCase()}`}
            >
              <Icon size={17} strokeWidth={1.9} />
              <span>{label}</span>
              {href === "/tasks" && tasks.length > 0 && (
                <span className="nav-count">
                  {tasks.filter((task) => task.status !== "done").length}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-orbit">
              <Activity size={15} />
            </span>
            <p>Good work, in good order.</p>
            <span>Your day, at a glance.</span>
          </div>
          <div className="profile-strip">
            <div className="profile-avatar">
              {initials(
                user?.fullName ||
                  user?.primaryEmailAddress?.emailAddress ||
                  "Y",
              )}
            </div>
            <div>
              <strong>
                {user?.fullName ||
                  user?.primaryEmailAddress?.emailAddress ||
                  "Your workspace"}
              </strong>
              <span>Independent practice</span>
            </div>
            <button
              className="profile-logout"
              type="button"
              aria-label="Log out"
              title="Log out"
              onClick={() => signOut({ redirectUrl: basePath || "/" })}
              data-testid="button-logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      {mobileOpen && (
        <button
          aria-label="Close menu"
          className="mobile-scrim"
          onClick={() => setMobileOpen(false)}
          data-testid="button-dismiss-navigation"
        />
      )}
      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            data-testid="button-open-navigation"
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong data-testid="text-current-page">{pageName}</strong>
          </div>
          <div className="topbar-right">
            <span className="today-stamp">
              {new Intl.DateTimeFormat("en", {
                weekday: "short",
                month: "short",
                day: "numeric",
              }).format(new Date())}
            </span>
            <div className="today-dot" />
          </div>
        </header>
        {notice && (
          <div
            className={`notice notice-${notice.tone}`}
            role={notice.tone === "error" ? "alert" : "status"}
            data-testid="status-feedback"
          >
            {notice.tone === "error" ? (
              <AlertCircle size={16} />
            ) : (
              <Check size={16} />
            )}
            <span>{notice.message}</span>
          </div>
        )}
        <div className="content-wrap">
          {location === "/" ? (
            <DashboardPage
              dashboard={dashboardQuery.data}
              tasks={tasks}
              loading={dashboardQuery.isLoading || detailLoading}
              error={dashboardQuery.isError || detailError}
              retry={retry}
              openEditor={setEditor}
              onMoveTask={moveTask}
            />
          ) : location === "/clients" ? (
            <ClientsPage
              clients={filteredClients}
              loading={clientsQuery.isLoading}
              error={clientsQuery.isError}
              retry={retry}
              openEditor={setEditor}
              onDelete={remove}
              search={search}
              setSearch={setSearch}
            />
          ) : location === "/projects" ? (
            <ProjectsPage
              projects={filteredProjects}
              loading={projectsQuery.isLoading || clientsQuery.isLoading}
              error={projectsQuery.isError || clientsQuery.isError}
              retry={retry}
              openEditor={setEditor}
              onDelete={remove}
              search={search}
              setSearch={setSearch}
            />
          ) : location === "/tasks" ? (
            <TasksPage
              tasks={filteredTasks}
              projects={projects}
              clients={clients}
              loading={detailLoading}
              error={detailError}
              retry={retry}
              openEditor={setEditor}
              onDelete={remove}
              onMoveTask={moveTask}
              search={search}
              setSearch={setSearch}
            />
          ) : clientId || projectId ? (
            detailLoading ? (
              <LoadingState />
            ) : detailError ? (
              <ErrorState retry={retry} />
            ) : clientId ? (
              <ClientDetail
                client={clients.find(
                  (client) => client.id === Number(clientId),
                )}
                projects={projects}
                search={search}
                setSearch={setSearch}
                openEditor={setEditor}
                onDelete={remove}
              />
            ) : (
              <ProjectDetail
                project={projects.find(
                  (project) => project.id === Number(projectId),
                )}
                tasks={tasks}
                clients={clients}
                projects={projects}
                search={search}
                setSearch={setSearch}
                openEditor={setEditor}
                onDelete={remove}
                onMoveTask={moveTask}
              />
            )
          ) : (
            <NotFound />
          )}
        </div>
      </main>
      {editor && (
        <EditorModal
          key={`${editor.kind}-${editor.record?.id ?? "new"}`}
          editor={editor}
          clients={clients}
          projects={projects}
          busy={
            createClient.isPending ||
            updateClient.isPending ||
            createProject.isPending ||
            updateProject.isPending ||
            createTask.isPending ||
            updateTask.isPending
          }
          onClose={() => setEditor(null)}
          onSubmit={(values) => submit(editor.kind, editor.record, values)}
        />
      )}
    </div>
  );
}

function PublicWelcome() {
  return (
    <main className="public-entry">
      <header className="public-top">
        <div className="public-brand">
          <span className="brand-mark">
            <Command size={19} strokeWidth={2.4} />
          </span>
          <span>
            clientflow<span className="brand-period">.</span>
          </span>
        </div>
        <div className="public-actions">
          <Link className="public-signin" href="/sign-in">
            Sign in
          </Link>
          <Link className="public-signup" href="/sign-up">
            Create your workspace <ArrowRight size={15} />
          </Link>
        </div>
      </header>
      <section className="public-hero">
        <div className="public-hero-copy">
          <span className="public-kicker">A CLEARER KIND OF INDEPENDENT</span>
          <h1>
            Good work,
            <br />
            <em>in good order.</em>
          </h1>
          <p>
            Manage your clients, projects, and tasks in one place. Keep track of
            deadlines and see exactly what needs your attention.
          </p>
          <div className="public-hero-actions">
            <Link className="public-primary-cta" href="/sign-up">
              Start your workspace <ArrowRight size={16} />
            </Link>
            <Link
              className="public-secondary-cta"
              href="/demo"
              data-testid="link-public-demo"
            >
              Explore the demo <ArrowRight size={15} />
            </Link>
          </div>
          <div className="public-proof">
            <span className="proof-mark">
              <Check size={13} />
            </span>
            <span>
              Clients, projects, task boards, and CSV exports. Try the demo
              without an account.
            </span>
          </div>
        </div>
        <div className="public-hero-art" aria-hidden="true">
          <div className="public-orbit orbit-a" />
          <div className="public-orbit orbit-b" />
          <div className="public-sun" />
          <div className="public-card public-card-main">
            <span>THIS WEEK</span>
            <strong>
              Make space
              <br />
              for the work.
            </strong>
            <i>
              <span />
              <span />
              <span />
            </i>
            <small>02 projects in motion</small>
          </div>
          <div className="public-card public-card-note">
            <span>UP NEXT</span>
            <strong>
              Send the first
              <br />
              round to Mara
            </strong>
            <small>Today · Brand refresh</small>
          </div>
          <div className="public-art-plus">+</div>
          <div className="public-art-line" />
        </div>
      </section>
      <footer className="public-footer">
        <span>
          CLIENTFLOW <i>·</i> YOUR PRACTICE, IN VIEW
        </span>
        <span>Built for the work you do on your own.</span>
      </footer>
    </main>
  );
}

function HomeRoute() {
  return (
    <>
      <Show when="signed-in">
        <AppContent />
      </Show>
      <Show when="signed-out">
        <PublicWelcome />
      </Show>
    </>
  );
}

function ProtectedWorkspace() {
  return (
    <>
      <Show when="signed-in">
        <AppContent />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function SignInPage() {
  return (
    <main className="auth-page">
      <div className="auth-backdrop">
        <span className="auth-orbit auth-orbit-one" />
        <span className="auth-orbit auth-orbit-two" />
      </div>
      <Link className="auth-back-brand" href="/">
        <span className="brand-mark">
          <Command size={18} strokeWidth={2.4} />
        </span>
        <span>
          clientflow<span className="brand-period">.</span>
        </span>
      </Link>
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </main>
  );
}

function SignUpPage() {
  return (
    <main className="auth-page">
      <div className="auth-backdrop">
        <span className="auth-orbit auth-orbit-one" />
        <span className="auth-orbit auth-orbit-two" />
      </div>
      <Link className="auth-back-brand" href="/">
        <span className="brand-mark">
          <Command size={18} strokeWidth={2.4} />
        </span>
        <span>
          clientflow<span className="brand-period">.</span>
        </span>
      </Link>
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </main>
  );
}

function WorkspaceQueryProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const client = useMemo(() => new QueryClient(), [user?.id]);
  useEffect(() => () => client.clear(), [client]);
  return (
    <QueryClientProvider key={user?.id ?? "signed-out"} client={client}>
      {children}
    </QueryClientProvider>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  if (!clerkPubKey)
    throw new Error(
      "Configure VITE_CLERK_PUBLISHABLE_KEY before using your private workspace.",
    );

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to return to your ClientFlow workspace.",
          },
        },
        signUp: {
          start: {
            title: "Make room for good work",
            subtitle: "Create your independent practice workspace.",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <WorkspaceQueryProvider>
        <Switch>
          <Route path="/" component={HomeRoute} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/clients" component={ProtectedWorkspace} />
          <Route path="/projects" component={ProtectedWorkspace} />
          <Route path="/clients/:id" component={ProtectedWorkspace} />
          <Route path="/projects/:id" component={ProtectedWorkspace} />
          <Route path="/tasks" component={ProtectedWorkspace} />
          <Route component={NotFound} />
        </Switch>
      </WorkspaceQueryProvider>
    </ClerkProvider>
  );
}

function Root() {
  return (
    <WouterRouter base={basePath}>
      <Switch>
        <Route path="/demo/*?" component={DemoPage} />
        <Route>
          <ClerkProviderWithRoutes />
        </Route>
      </Switch>
    </WouterRouter>
  );
}

export default Root;
